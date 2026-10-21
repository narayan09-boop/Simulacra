from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ExperimentCreate, ExperimentResponse, MetricPoint
from app.services.experiment_service import ExperimentService

router = APIRouter(prefix="/experiments", tags=["Experiments"])

@router.get("", response_model=List[ExperimentResponse])
def list_experiments(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return ExperimentService.list_experiments(db, skip=skip, limit=limit)

@router.post("", response_model=ExperimentResponse)
def create_experiment(payload: ExperimentCreate, db: Session = Depends(get_db)):
    return ExperimentService.create_experiment(db, payload)

@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    exp = ExperimentService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp

@router.delete("/{experiment_id}")
def delete_experiment(experiment_id: str, db: Session = Depends(get_db)):
    success = ExperimentService.delete_experiment(db, experiment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {"status": "deleted", "id": experiment_id}

@router.get("/{experiment_id}/metrics", response_model=List[MetricPoint])
def get_experiment_metrics(experiment_id: str, limit: int = 2000, db: Session = Depends(get_db)):
    return ExperimentService.get_metrics_for_experiment(db, experiment_id, limit=limit)

@router.get("/{experiment_id}/export")
def export_experiment(experiment_id: str, db: Session = Depends(get_db)):
    export_data = ExperimentService.export_experiment(db, experiment_id)
    if not export_data:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return export_data
