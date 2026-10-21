from typing import List
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Checkpoint
from app.schemas import CheckpointSummary

router = APIRouter(prefix="/checkpoints", tags=["Checkpoints"])

@router.get("", response_model=List[CheckpointSummary])
def list_checkpoints(experiment_id: str = None, db: Session = Depends(get_db)):
    query = db.query(Checkpoint)
    if experiment_id:
        query = query.filter(Checkpoint.experiment_id == experiment_id)
    return query.order_by(Checkpoint.created_at.desc()).all()

@router.get("/{checkpoint_id}/download")
def download_checkpoint(checkpoint_id: str, db: Session = Depends(get_db)):
    ckpt = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
    if not ckpt or not Path(ckpt.file_path).exists():
        raise HTTPException(status_code=404, detail="Checkpoint file not found")
    return FileResponse(
        path=ckpt.file_path,
        filename=Path(ckpt.file_path).name,
        media_type="application/octet-stream"
    )
