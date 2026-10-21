import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.services.connection_manager import ws_manager
from app.api.routes_health import router as health_router
from app.api.routes_env import router as env_router
from app.api.routes_experiments import router as exp_router
from app.api.routes_training import router as training_router
from app.api.routes_eval import router as eval_router
from app.api.routes_checkpoints import router as ckpt_router
from app.api.routes_ws import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("simulacra")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and provide asyncio loop to ws_manager
    logger.info("Initializing SIMULACRA persistence and database...")
    init_db()
    ws_manager.set_loop(asyncio.get_running_loop())
    logger.info("SIMULACRA backend ready.")
    yield
    logger.info("Shutting down SIMULACRA backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SIMULACRA — Interactive AI Simulation, Reinforcement Learning & Agent Research Platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development mode permits all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
api_prefix = settings.API_V1_STR
app.include_router(health_router, prefix=api_prefix)
app.include_router(env_router, prefix=api_prefix)
app.include_router(exp_router, prefix=api_prefix)
app.include_router(training_router, prefix=api_prefix)
app.include_router(eval_router, prefix=api_prefix)
app.include_router(ckpt_router, prefix=api_prefix)
app.include_router(ws_router)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
