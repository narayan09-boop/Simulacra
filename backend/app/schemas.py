from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import datetime

class Position(BaseModel):
    x: int
    y: int

class EnvironmentConfig(BaseModel):
    width: int = Field(default=10, ge=4, le=50)
    height: int = Field(default=10, ge=4, le=50)
    agent_start: Optional[Position] = None  # None for random or fixed default (0,0)
    goal_pos: Optional[Position] = None    # None for random or fixed default (width-1, height-1)
    obstacles: Optional[List[Position]] = None  # Explicit obstacle coordinates
    obstacle_density: float = Field(default=0.15, ge=0.0, le=0.6)  # Used when obstacles is None
    max_steps: int = Field(default=100, ge=10, le=1000)
    
    # Reward shaping weights
    goal_reward: float = Field(default=10.0)
    step_penalty: float = Field(default=-0.05)
    collision_penalty: float = Field(default=-0.5)
    progress_reward_weight: float = Field(default=1.0)  # Potential-based distance shaping

class Hyperparameters(BaseModel):
    learning_rate: float = Field(default=3e-4, gt=0, le=0.1)
    n_steps: int = Field(default=128, ge=16, le=2048)  # SB3 rollout buffer size
    batch_size: int = Field(default=32, ge=8, le=512)
    n_epochs: int = Field(default=4, ge=1, le=20)
    gamma: float = Field(default=0.99, ge=0.8, le=0.9999)
    gae_lambda: float = Field(default=0.95, ge=0.8, le=1.0)
    clip_range: float = Field(default=0.2, gt=0, le=0.5)
    ent_coef: float = Field(default=0.01, ge=0.0, le=0.2)
    vf_coef: float = Field(default=0.5, gt=0, le=1.0)
    max_grad_norm: float = Field(default=0.5, gt=0, le=5.0)

class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = ""
    algorithm: str = Field(default="PPO")
    env_id: str = Field(default="VisualNavigation-v0")
    env_config: EnvironmentConfig = Field(default_factory=EnvironmentConfig)
    hyperparameters: Hyperparameters = Field(default_factory=Hyperparameters)
    seed: int = Field(default=42, ge=0)
    total_timesteps: int = Field(default=5000, ge=100, le=500000)

class CheckpointSummary(BaseModel):
    id: str
    name: str
    timestep: int
    created_at: datetime.datetime
    file_path: str

    model_config = ConfigDict(from_attributes=True)

class MetricPoint(BaseModel):
    timestep: int
    episode: Optional[int] = None
    episode_return: Optional[float] = None
    rolling_return: Optional[float] = None
    episode_length: Optional[int] = None
    is_success: Optional[bool] = None
    policy_loss: Optional[float] = None
    value_loss: Optional[float] = None
    entropy: Optional[float] = None
    approx_kl: Optional[float] = None
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ExperimentResponse(BaseModel):
    id: str
    name: str
    description: str
    status: str
    algorithm: str
    env_id: str
    env_config: Dict[str, Any]
    hyperparameters: Dict[str, Any]
    seed: int
    total_timesteps: int
    current_timesteps: int
    error_message: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    checkpoints: List[CheckpointSummary] = []

    model_config = ConfigDict(from_attributes=True)

class SimulationSnapshot(BaseModel):
    timestep: int
    episode: int
    step_in_episode: int
    agent_pos: List[int]
    goal_pos: List[int]
    obstacles: List[List[int]]
    width: int
    height: int
    action_taken: Optional[int] = None
    action_name: Optional[str] = None
    last_reward: float = 0.0
    reward_components: Dict[str, float] = {}
    terminated: bool = False
    truncated: bool = False
    is_success: bool = False
    cumulative_return: float = 0.0
    trajectory: List[List[int]] = []

class TelemetryEvent(BaseModel):
    type: str  # snapshot, metric_update, job_status, evaluation_result, checkpoint_saved, error
    timestamp: float
    experiment_id: Optional[str] = None
    payload: Dict[str, Any]

class EvaluationRequest(BaseModel):
    policy_type: str = "ppo"  # ppo, random, heuristic
    checkpoint_id: Optional[str] = None
    num_episodes: int = Field(default=10, ge=1, le=100)
    seed: Optional[int] = None
    env_config: Optional[EnvironmentConfig] = None

class TrajectoryStep(BaseModel):
    step: int
    agent_pos: List[int]
    action: int
    reward: float

class EvaluationEpisodeResult(BaseModel):
    episode: int
    return_val: float
    length: int
    success: bool
    trajectory: List[List[int]]

class EvaluationResponse(BaseModel):
    id: str
    experiment_id: Optional[str]
    checkpoint_id: Optional[str]
    policy_type: str
    num_episodes: int
    success_rate: float
    mean_return: float
    std_return: float
    mean_length: float
    episodes: List[EvaluationEpisodeResult] = []
    created_at: datetime.datetime

class PolicyComparisonRequest(BaseModel):
    experiment_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    policies: List[str] = Field(default=["ppo", "random", "heuristic"])
    num_episodes: int = Field(default=10, ge=1, le=50)
    seed: int = 100
    env_config: Optional[EnvironmentConfig] = None

class PolicyComparisonResult(BaseModel):
    policy_name: str
    success_rate: float
    mean_return: float
    std_return: float
    mean_length: float
    sample_trajectory: List[List[int]]

class PolicyComparisonResponse(BaseModel):
    num_episodes: int
    seed: int
    results: List[PolicyComparisonResult]
