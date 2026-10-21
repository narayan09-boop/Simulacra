import os
import psutil
import torch
import stable_baselines3
import gymnasium
from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "system": {
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "gymnasium_version": gymnasium.__version__,
            "sb3_version": stable_baselines3.__version__,
            "cpu_count": os.cpu_count(),
            "memory_usage_percent": psutil.virtual_memory().percent
        }
    }
