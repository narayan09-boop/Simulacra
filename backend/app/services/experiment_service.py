import uuid
import json
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Experiment, Checkpoint, MetricRecord, EvaluationResult
from app.schemas import ExperimentCreate, EnvironmentConfig, Hyperparameters

class ExperimentService:
    @staticmethod
    def create_experiment(db: Session, exp_in: ExperimentCreate) -> Experiment:
        exp_id = str(uuid.uuid4())
        db_exp = Experiment(
            id=exp_id,
            name=exp_in.name,
            description=exp_in.description or "",
            algorithm=exp_in.algorithm,
            env_id=exp_in.env_id,
            env_config=exp_in.env_config.model_dump(),
            hyperparameters=exp_in.hyperparameters.model_dump(),
            seed=exp_in.seed,
            total_timesteps=exp_in.total_timesteps,
            current_timesteps=0,
            status="created"
        )
        db.add(db_exp)
        db.commit()
        db.refresh(db_exp)
        return db_exp

    @staticmethod
    def get_experiment(db: Session, experiment_id: str) -> Optional[Experiment]:
        return db.query(Experiment).filter(Experiment.id == experiment_id).first()

    @staticmethod
    def list_experiments(db: Session, skip: int = 0, limit: int = 50) -> List[Experiment]:
        return db.query(Experiment).order_by(Experiment.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def delete_experiment(db: Session, experiment_id: str) -> bool:
        db_exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not db_exp:
            return False
        db.delete(db_exp)
        db.commit()
        return True

    @staticmethod
    def update_experiment_status(
        db: Session,
        experiment_id: str,
        status: str,
        current_timesteps: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Optional[Experiment]:
        db_exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not db_exp:
            return None
        db_exp.status = status
        db_exp.updated_at = datetime.datetime.utcnow()
        if current_timesteps is not None:
            db_exp.current_timesteps = current_timesteps
        if error_message is not None:
            db_exp.error_message = error_message
        db.commit()
        db.refresh(db_exp)
        return db_exp

    @staticmethod
    def record_metric(db: Session, metric_data: Dict[str, Any]) -> MetricRecord:
        record = MetricRecord(
            experiment_id=metric_data["experiment_id"],
            timestep=metric_data.get("timestep", 0),
            episode=metric_data.get("episode"),
            episode_return=metric_data.get("episode_return"),
            rolling_return=metric_data.get("rolling_return"),
            episode_length=metric_data.get("episode_length"),
            is_success=metric_data.get("is_success"),
            policy_loss=metric_data.get("policy_loss"),
            value_loss=metric_data.get("value_loss"),
            entropy=metric_data.get("entropy"),
            approx_kl=metric_data.get("approx_kl"),
            timestamp=datetime.datetime.utcnow()
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_metrics_for_experiment(db: Session, experiment_id: str, limit: int = 1000) -> List[MetricRecord]:
        return db.query(MetricRecord).filter(
            MetricRecord.experiment_id == experiment_id
        ).order_by(MetricRecord.timestep.asc()).limit(limit).all()

    @staticmethod
    def create_checkpoint_record(
        db: Session,
        experiment_id: str,
        name: str,
        timestep: int,
        file_path: str,
        metadata_json: Optional[Dict[str, Any]] = None
    ) -> Checkpoint:
        ckpt_id = str(uuid.uuid4())
        ckpt = Checkpoint(
            id=ckpt_id,
            experiment_id=experiment_id,
            name=name,
            timestep=timestep,
            file_path=file_path,
            metadata_json=metadata_json or {},
            created_at=datetime.datetime.utcnow()
        )
        db.add(ckpt)
        db.commit()
        db.refresh(ckpt)
        return ckpt

    @staticmethod
    def get_checkpoints_for_experiment(db: Session, experiment_id: str) -> List[Checkpoint]:
        return db.query(Checkpoint).filter(
            Checkpoint.experiment_id == experiment_id
        ).order_by(Checkpoint.timestep.desc()).all()

    @staticmethod
    def export_experiment(db: Session, experiment_id: str) -> Optional[Dict[str, Any]]:
        exp = ExperimentService.get_experiment(db, experiment_id)
        if not exp:
            return None
        metrics = ExperimentService.get_metrics_for_experiment(db, experiment_id, limit=5000)
        checkpoints = ExperimentService.get_checkpoints_for_experiment(db, experiment_id)
        
        return {
            "experiment": {
                "id": exp.id,
                "name": exp.name,
                "description": exp.description,
                "status": exp.status,
                "algorithm": exp.algorithm,
                "env_id": exp.env_id,
                "env_config": exp.env_config,
                "hyperparameters": exp.hyperparameters,
                "seed": exp.seed,
                "total_timesteps": exp.total_timesteps,
                "current_timesteps": exp.current_timesteps,
                "created_at": exp.created_at.isoformat() if exp.created_at else None,
                "updated_at": exp.updated_at.isoformat() if exp.updated_at else None,
            },
            "metrics": [
                {
                    "timestep": m.timestep,
                    "episode": m.episode,
                    "episode_return": m.episode_return,
                    "rolling_return": m.rolling_return,
                    "episode_length": m.episode_length,
                    "is_success": m.is_success,
                    "policy_loss": m.policy_loss,
                    "value_loss": m.value_loss,
                    "entropy": m.entropy,
                    "approx_kl": m.approx_kl,
                    "timestamp": m.timestamp.isoformat() if m.timestamp else None
                }
                for m in metrics
            ],
            "checkpoints": [
                {
                    "id": c.id,
                    "name": c.name,
                    "timestep": c.timestep,
                    "file_path": c.file_path,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                }
                for c in checkpoints
            ]
        }
