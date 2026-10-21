from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.job_manager import job_manager
from app.services.experiment_service import ExperimentService

router = APIRouter(prefix="/training", tags=["Training"])

@router.post("/{experiment_id}/start")
def start_training(experiment_id: str, db: Session = Depends(get_db)):
    exp = ExperimentService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
        
    started = job_manager.start_job(experiment_id)
    if not started:
        raise HTTPException(status_code=400, detail="Training job is already running or cannot be started")
        
    return {"status": "started", "experiment_id": experiment_id}

@router.post("/{experiment_id}/pause")
def pause_training(experiment_id: str):
    paused = job_manager.pause_job(experiment_id)
    if not paused:
        raise HTTPException(status_code=400, detail="Job cannot be paused in current state")
    return {"status": "paused", "experiment_id": experiment_id}

@router.post("/{experiment_id}/resume")
def resume_training(experiment_id: str):
    resumed = job_manager.resume_job(experiment_id)
    if not resumed:
        raise HTTPException(status_code=400, detail="Job cannot be resumed in current state")
    return {"status": "resumed", "experiment_id": experiment_id}

@router.post("/{experiment_id}/stop")
def stop_training(experiment_id: str):
    stopped = job_manager.stop_job(experiment_id)
    if not stopped:
        raise HTTPException(status_code=400, detail="Job is not active or cannot be stopped")
    return {"status": "cancelled", "experiment_id": experiment_id}

@router.get("/{experiment_id}/status")
def get_training_status(experiment_id: str, db: Session = Depends(get_db)):
    job = job_manager.get_job(experiment_id)
    if job:
        return {
            "experiment_id": experiment_id,
            "status": job.status,
            "total_timesteps": job.total_timesteps,
            "error_message": job.error_message
        }
    exp = ExperimentService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {
        "experiment_id": experiment_id,
        "status": exp.status,
        "total_timesteps": exp.total_timesteps,
        "current_timesteps": exp.current_timesteps,
        "error_message": exp.error_message
    }
