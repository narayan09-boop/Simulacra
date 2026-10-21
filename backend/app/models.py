import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    status = Column(String(32), default="created")  # created, running, paused, completed, failed, cancelled
    algorithm = Column(String(32), default="PPO")
    env_id = Column(String(64), default="VisualNavigation-v0")
    
    env_config = Column(JSON, default=dict)
    hyperparameters = Column(JSON, default=dict)
    seed = Column(Integer, default=42)
    
    total_timesteps = Column(Integer, default=10000)
    current_timesteps = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    metrics = relationship("MetricRecord", back_populates="experiment", cascade="all, delete-orphan")
    checkpoints = relationship("Checkpoint", back_populates="experiment", cascade="all, delete-orphan")
    evaluations = relationship("EvaluationResult", back_populates="experiment", cascade="all, delete-orphan")

class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(String(36), primary_key=True, index=True)
    experiment_id = Column(String(36), ForeignKey("experiments.id", ondelete="CASCADE"), index=True)
    name = Column(String(128), nullable=False)
    timestep = Column(Integer, nullable=False)
    file_path = Column(String(512), nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experiment = relationship("Experiment", back_populates="checkpoints")

class MetricRecord(Base):
    __tablename__ = "metric_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(String(36), ForeignKey("experiments.id", ondelete="CASCADE"), index=True)
    timestep = Column(Integer, index=True)
    episode = Column(Integer, nullable=True)
    episode_return = Column(Float, nullable=True)
    rolling_return = Column(Float, nullable=True)
    episode_length = Column(Integer, nullable=True)
    is_success = Column(Boolean, nullable=True)
    
    # Loss telemetry
    policy_loss = Column(Float, nullable=True)
    value_loss = Column(Float, nullable=True)
    entropy = Column(Float, nullable=True)
    approx_kl = Column(Float, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    experiment = relationship("Experiment", back_populates="metrics")

class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(36), primary_key=True, index=True)
    experiment_id = Column(String(36), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=True)
    checkpoint_id = Column(String(36), ForeignKey("checkpoints.id", ondelete="SET NULL"), nullable=True)
    policy_type = Column(String(32), nullable=False)  # ppo, random, heuristic
    
    num_episodes = Column(Integer, default=10)
    success_rate = Column(Float, default=0.0)
    mean_return = Column(Float, default=0.0)
    std_return = Column(Float, default=0.0)
    mean_length = Column(Float, default=0.0)
    
    trajectories = Column(JSON, default=list)  # Sample episodes path history for side-by-side rendering
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experiment = relationship("Experiment", back_populates="evaluations")
