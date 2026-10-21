import time
import logging
import threading
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.sim.env import VisualNavigationEnv
from app.rl.ppo_trainer import build_ppo_model, TelemetryCallback
from app.services.experiment_service import ExperimentService
from app.services.connection_manager import ws_manager
from app.config import settings

logger = logging.getLogger("simulacra.job_manager")

class TrainingJob:
    def __init__(self, experiment_id: str, total_timesteps: int):
        self.experiment_id = experiment_id
        self.total_timesteps = total_timesteps
        self.thread: Optional[threading.Thread] = None
        self.pause_event = threading.Event()
        self.cancel_event = threading.Event()
        self.status: str = "queued"  # queued, running, paused, completed, cancelled, failed
        self.error_message: Optional[str] = None
        self.current_timestep: int = 0

class JobManager:
    """
    Manages background training worker threads, prevents duplicate jobs,
    handles pause/resume/cancellation, and dispatches live telemetry events.
    """
    def __init__(self):
        self._jobs: Dict[str, TrainingJob] = {}
        self._lock = threading.Lock()

    def get_job(self, experiment_id: str) -> Optional[TrainingJob]:
        with self._lock:
            return self._jobs.get(experiment_id)

    def is_job_active(self, experiment_id: str) -> bool:
        job = self.get_job(experiment_id)
        return job is not None and job.status in ["queued", "running", "paused"]

    def start_job(self, experiment_id: str) -> bool:
        with self._lock:
            if experiment_id in self._jobs and self._jobs[experiment_id].status in ["running", "paused"]:
                return False  # Already active
                
            db: Session = SessionLocal()
            try:
                exp = ExperimentService.get_experiment(db, experiment_id)
                if not exp:
                    return False
                job = TrainingJob(experiment_id, exp.total_timesteps)
                self._jobs[experiment_id] = job
                
                ExperimentService.update_experiment_status(db, experiment_id, "running")
            finally:
                db.close()

            # Launch background worker
            thread = threading.Thread(
                target=self._run_training_worker,
                args=(job,),
                daemon=True,
                name=f"worker-{experiment_id[:8]}"
            )
            job.thread = thread
            job.status = "running"
            thread.start()

            ws_manager.threadsafe_broadcast(
                "job_status",
                {"experiment_id": experiment_id, "status": "running"},
                experiment_id=experiment_id
            )
            return True

    def pause_job(self, experiment_id: str) -> bool:
        job = self.get_job(experiment_id)
        if not job or job.status != "running":
            return False
            
        job.pause_event.set()
        job.status = "paused"
        
        db: Session = SessionLocal()
        try:
            ExperimentService.update_experiment_status(db, experiment_id, "paused")
        finally:
            db.close()
            
        ws_manager.threadsafe_broadcast(
            "job_status",
            {"experiment_id": experiment_id, "status": "paused"},
            experiment_id=experiment_id
        )
        return True

    def resume_job(self, experiment_id: str) -> bool:
        job = self.get_job(experiment_id)
        if not job or job.status != "paused":
            return False
            
        job.pause_event.clear()
        job.status = "running"
        
        db: Session = SessionLocal()
        try:
            ExperimentService.update_experiment_status(db, experiment_id, "running")
        finally:
            db.close()
            
        ws_manager.threadsafe_broadcast(
            "job_status",
            {"experiment_id": experiment_id, "status": "running"},
            experiment_id=experiment_id
        )
        return True

    def stop_job(self, experiment_id: str) -> bool:
        job = self.get_job(experiment_id)
        if not job or job.status not in ["running", "paused"]:
            return False
            
        job.cancel_event.set()
        job.pause_event.clear()  # Unblock if currently paused so thread can exit
        job.status = "cancelled"
        
        db: Session = SessionLocal()
        try:
            ExperimentService.update_experiment_status(db, experiment_id, "cancelled")
        finally:
            db.close()
            
        ws_manager.threadsafe_broadcast(
            "job_status",
            {"experiment_id": experiment_id, "status": "cancelled"},
            experiment_id=experiment_id
        )
        return True

    def _run_training_worker(self, job: TrainingJob):
        exp_id = job.experiment_id
        logger.info(f"Starting training worker for experiment {exp_id}")
        
        db: Session = SessionLocal()
        try:
            exp = ExperimentService.get_experiment(db, exp_id)
            if not exp:
                job.status = "failed"
                return

            env_cfg = exp.env_config or {}
            hp = exp.hyperparameters or {}
            seed = exp.seed or 42
            total_steps = exp.total_timesteps or 5000

            # Construct environment
            agent_start = tuple(env_cfg["agent_start"].values()) if env_cfg.get("agent_start") else None
            goal_pos = tuple(env_cfg["goal_pos"].values()) if env_cfg.get("goal_pos") else None
            obstacles = [tuple(o.values() if isinstance(o, dict) else o) for o in env_cfg.get("obstacles", [])] if env_cfg.get("obstacles") else None

            env = VisualNavigationEnv(
                width=int(env_cfg.get("width", 10)),
                height=int(env_cfg.get("height", 10)),
                agent_start=agent_start,
                goal_pos=goal_pos,
                obstacles=obstacles,
                obstacle_density=float(env_cfg.get("obstacle_density", 0.15)),
                max_steps=int(env_cfg.get("max_steps", 100)),
                goal_reward=float(env_cfg.get("goal_reward", 10.0)),
                step_penalty=float(env_cfg.get("step_penalty", -0.05)),
                collision_penalty=float(env_cfg.get("collision_penalty", -0.5)),
                progress_reward_weight=float(env_cfg.get("progress_reward_weight", 1.0))
            )

            # Build model
            model = build_ppo_model(env, hp, seed=seed)

            def handle_snapshot(snapshot: Dict[str, Any]):
                ws_manager.threadsafe_broadcast("snapshot", snapshot, experiment_id=exp_id)

            def handle_metric(metric_data: Dict[str, Any]):
                # Broadcast real-time metric event
                ws_manager.threadsafe_broadcast("metric_update", metric_data, experiment_id=exp_id)
                # Persist to database
                db_metric: Session = SessionLocal()
                try:
                    ExperimentService.record_metric(db_metric, metric_data)
                    ExperimentService.update_experiment_status(
                        db_metric,
                        exp_id,
                        job.status,
                        current_timesteps=metric_data.get("timestep", 0)
                    )
                finally:
                    db_metric.close()

            def handle_checkpoint(file_path: str, timestep: int):
                db_ckpt: Session = SessionLocal()
                try:
                    ckpt = ExperimentService.create_checkpoint_record(
                        db_ckpt,
                        exp_id,
                        f"Step {timestep}",
                        timestep,
                        file_path
                    )
                    ws_manager.threadsafe_broadcast(
                        "checkpoint_saved",
                        {"checkpoint_id": ckpt.id, "timestep": timestep, "file_path": file_path},
                        experiment_id=exp_id
                    )
                finally:
                    db_ckpt.close()

            callback = TelemetryCallback(
                experiment_id=exp_id,
                env=env,
                on_snapshot=handle_snapshot,
                on_metric=handle_metric,
                on_checkpoint=handle_checkpoint,
                pause_event=job.pause_event,
                cancel_event=job.cancel_event,
                snapshot_interval_steps=2,
                checkpoint_interval_steps=max(500, total_steps // 5)
            )

            # Run PPO training
            model.learn(total_timesteps=total_steps, callback=callback)

            # Save final checkpoint if not cancelled
            if not job.cancel_event.is_set():
                final_ckpt_path = str(settings.CHECKPOINTS_DIR / f"{exp_id}_final.zip")
                model.save(final_ckpt_path)
                handle_checkpoint(final_ckpt_path, total_steps)
                
                job.status = "completed"
                ExperimentService.update_experiment_status(db, exp_id, "completed", current_timesteps=total_steps)
                ws_manager.threadsafe_broadcast(
                    "job_status",
                    {"experiment_id": exp_id, "status": "completed", "timesteps": total_steps},
                    experiment_id=exp_id
                )
            else:
                job.status = "cancelled"
                ExperimentService.update_experiment_status(db, exp_id, "cancelled")

        except Exception as e:
            logger.exception(f"Error during training job for experiment {exp_id}: {e}")
            job.status = "failed"
            job.error_message = str(e)
            ExperimentService.update_experiment_status(db, exp_id, "failed", error_message=str(e))
            ws_manager.threadsafe_broadcast(
                "job_status",
                {"experiment_id": exp_id, "status": "failed", "error": str(e)},
                experiment_id=exp_id
            )
        finally:
            db.close()

job_manager = JobManager()
