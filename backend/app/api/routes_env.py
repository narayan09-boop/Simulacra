from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.schemas import EnvironmentConfig, SimulationSnapshot
from app.sim.env import VisualNavigationEnv, ACTION_NAMES

router = APIRouter(prefix="/environments", tags=["Environments"])

# Registry of supported environments
REGISTERED_ENVIRONMENTS = [
    {
        "id": "VisualNavigation-v0",
        "name": "Visual Navigation Lab",
        "description": "Configurable 2D grid world for agent spatial reasoning, obstacle negotiation, and path optimization.",
        "observation_space": "Box(11,) Normalized state, goal vector, distance, and 4-directional obstacle proximity",
        "action_space": "Discrete(4) [0: UP, 1: DOWN, 2: LEFT, 3: RIGHT]",
        "default_config": EnvironmentConfig().model_dump()
    }
]

@router.get("")
def list_environments():
    return REGISTERED_ENVIRONMENTS

@router.post("/preview")
def preview_environment(config: EnvironmentConfig, seed: Optional[int] = 42):
    """Generates an initial state snapshot of an environment configuration for instant visualization."""
    agent_start = (config.agent_start.x, config.agent_start.y) if config.agent_start else None
    goal_pos = (config.goal_pos.x, config.goal_pos.y) if config.goal_pos else None
    obstacles = [(o.x, o.y) for o in config.obstacles] if config.obstacles is not None else None

    env = VisualNavigationEnv(
        width=config.width,
        height=config.height,
        agent_start=agent_start,
        goal_pos=goal_pos,
        obstacles=obstacles,
        obstacle_density=config.obstacle_density,
        max_steps=config.max_steps,
        goal_reward=config.goal_reward,
        step_penalty=config.step_penalty,
        collision_penalty=config.collision_penalty,
        progress_reward_weight=config.progress_reward_weight
    )
    env.reset(seed=seed)
    return env.get_snapshot()

# In-memory session store for interactive manual play mode
manual_sessions: Dict[str, VisualNavigationEnv] = {}

@router.post("/manual/start")
def start_manual_session(session_id: str, config: EnvironmentConfig, seed: Optional[int] = 42):
    agent_start = (config.agent_start.x, config.agent_start.y) if config.agent_start else None
    goal_pos = (config.goal_pos.x, config.goal_pos.y) if config.goal_pos else None
    obstacles = [(o.x, o.y) for o in config.obstacles] if config.obstacles is not None else None

    env = VisualNavigationEnv(
        width=config.width,
        height=config.height,
        agent_start=agent_start,
        goal_pos=goal_pos,
        obstacles=obstacles,
        obstacle_density=config.obstacle_density,
        max_steps=config.max_steps,
        goal_reward=config.goal_reward,
        step_penalty=config.step_penalty,
        collision_penalty=config.collision_penalty,
        progress_reward_weight=config.progress_reward_weight
    )
    env.reset(seed=seed)
    manual_sessions[session_id] = env
    return env.get_snapshot()

@router.post("/manual/step")
def step_manual_session(session_id: str, action: int):
    if session_id not in manual_sessions:
        raise HTTPException(status_code=404, detail="Manual play session not found")
    if action not in [0, 1, 2, 3]:
        raise HTTPException(status_code=400, detail="Action must be between 0 and 3")
        
    env = manual_sessions[session_id]
    obs, reward, terminated, truncated, info = env.step(action)
    return env.get_snapshot()
