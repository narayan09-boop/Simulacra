import os
import time
import threading
from collections import deque
from typing import Optional, Callable, Dict, Any
from pathlib import Path

import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback

from app.sim.env import VisualNavigationEnv
from app.config import settings

class PPOPolicyWrapper:
    """Wraps SB3 PPO model to adhere to BasePolicy interface."""
    def __init__(self, model: PPO):
        self.model = model

    def predict(self, obs: np.ndarray, deterministic: bool = True):
        return self.model.predict(obs, deterministic=deterministic)

class TelemetryCallback(BaseCallback):
    """
    SB3 Callback that monitors training steps, emits live simulation snapshots,
    aggregates rolling episode metrics and loss values, and respects pause/cancellation.
    """
    def __init__(
        self,
        experiment_id: str,
        env: VisualNavigationEnv,
        on_snapshot: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_metric: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_checkpoint: Optional[Callable[[str, int], None]] = None,
        pause_event: Optional[threading.Event] = None,
        cancel_event: Optional[threading.Event] = None,
        snapshot_interval_steps: int = 2,
        checkpoint_interval_steps: int = 1000,
        verbose: int = 0
    ):
        super().__init__(verbose)
        self.experiment_id = experiment_id
        self.sim_env = env
        self.on_snapshot = on_snapshot
        self.on_metric = on_metric
        self.on_checkpoint = on_checkpoint
        self.pause_event = pause_event
        self.cancel_event = cancel_event
        
        self.snapshot_interval = snapshot_interval_steps
        self.checkpoint_interval = checkpoint_interval_steps
        
        # Tracking buffers
        self.rolling_returns = deque(maxlen=25)
        self.rolling_lengths = deque(maxlen=25)
        self.rolling_successes = deque(maxlen=25)
        
        self.episode_count = 0
        self.last_snapshot_time = 0.0
        self.last_saved_checkpoint_step = 0

    def _on_step(self) -> bool:
        # Check cancellation
        if self.cancel_event is not None and self.cancel_event.is_set():
            return False  # Signals SB3 to halt training immediately
            
        # Check pause
        if self.pause_event is not None and self.pause_event.is_set():
            while self.pause_event.is_set():
                if self.cancel_event is not None and self.cancel_event.is_set():
                    return False
                time.sleep(0.1)

        # Collect step info from env
        # Note: in SB3, locals['infos'] contains info dict for each sub-env
        infos = self.locals.get("infos", [])
        if infos:
            info = infos[0]
            step_count = self.num_timesteps
            
            # Emit throttled simulation snapshot for canvas rendering
            curr_time = time.time()
            if (step_count % self.snapshot_interval == 0 or info.get("is_success", False)) and (curr_time - self.last_snapshot_time > 0.04):
                self.last_snapshot_time = curr_time
                if self.on_snapshot:
                    snapshot = self.sim_env.get_snapshot(episode=self.episode_count)
                    snapshot["timestep"] = step_count
                    self.on_snapshot(snapshot)

            # Check for episode termination/truncation
            dones = self.locals.get("dones", [False])
            if dones[0]:
                self.episode_count += 1
                ep_return = self.sim_env.cumulative_return
                ep_len = self.sim_env.step_count
                is_success = bool(info.get("is_success", False))
                
                self.rolling_returns.append(ep_return)
                self.rolling_lengths.append(ep_len)
                self.rolling_successes.append(1.0 if is_success else 0.0)
                
                rolling_ret = float(np.mean(self.rolling_returns)) if self.rolling_returns else ep_return
                rolling_succ = float(np.mean(self.rolling_successes)) if self.rolling_successes else (1.0 if is_success else 0.0)
                
                if self.on_metric:
                    metric_data = {
                        "experiment_id": self.experiment_id,
                        "timestep": step_count,
                        "episode": self.episode_count,
                        "episode_return": round(float(ep_return), 3),
                        "rolling_return": round(float(rolling_ret), 3),
                        "episode_length": ep_len,
                        "is_success": is_success,
                        "success_rate": round(float(rolling_succ), 3),
                        "timestamp": time.time()
                    }
                    self.on_metric(metric_data)

        # Periodic checkpoint
        if self.on_checkpoint and (self.num_timesteps - self.last_saved_checkpoint_step >= self.checkpoint_interval):
            self.last_saved_checkpoint_step = self.num_timesteps
            ckpt_path = str(settings.CHECKPOINTS_DIR / f"{self.experiment_id}_step_{self.num_timesteps}.zip")
            self.model.save(ckpt_path)
            self.on_checkpoint(ckpt_path, self.num_timesteps)

        return True

    def _on_rollout_end(self) -> None:
        """Invoked when PPO collects a batch and updates policy/value networks."""
        # Extract losses from SB3 logger if available
        logger = self.model.logger
        if logger is not None and hasattr(logger, "name_to_value"):
            loss = logger.name_to_value.get("train/loss", None)
            policy_loss = logger.name_to_value.get("train/policy_gradient_loss", None)
            value_loss = logger.name_to_value.get("train/value_loss", None)
            entropy = logger.name_to_value.get("train/entropy_loss", None)
            approx_kl = logger.name_to_value.get("train/approx_kl", None)
            
            if self.on_metric and (policy_loss is not None or value_loss is not None):
                loss_metric = {
                    "experiment_id": self.experiment_id,
                    "timestep": self.num_timesteps,
                    "episode": self.episode_count,
                    "policy_loss": round(float(policy_loss), 5) if policy_loss is not None else None,
                    "value_loss": round(float(value_loss), 5) if value_loss is not None else None,
                    "entropy": round(float(entropy), 5) if entropy is not None else None,
                    "approx_kl": round(float(approx_kl), 5) if approx_kl is not None else None,
                    "timestamp": time.time()
                }
                self.on_metric(loss_metric)

def build_ppo_model(
    env: VisualNavigationEnv,
    hyperparameters: Dict[str, Any],
    seed: int = 42,
    device: str = "cpu"
) -> PPO:
    """Builds and configures a clean PPO policy network."""
    lr = float(hyperparameters.get("learning_rate", 3e-4))
    n_steps = int(hyperparameters.get("n_steps", 128))
    batch_size = int(hyperparameters.get("batch_size", 32))
    n_epochs = int(hyperparameters.get("n_epochs", 4))
    gamma = float(hyperparameters.get("gamma", 0.99))
    gae_lambda = float(hyperparameters.get("gae_lambda", 0.95))
    clip_range = float(hyperparameters.get("clip_range", 0.2))
    ent_coef = float(hyperparameters.get("ent_coef", 0.01))
    vf_coef = float(hyperparameters.get("vf_coef", 0.5))
    max_grad_norm = float(hyperparameters.get("max_grad_norm", 0.5))
    
    # Simple, high-performance MLP policy for navigation
    policy_kwargs = dict(
        net_arch=dict(pi=[64, 64], vf=[64, 64]),
        activation_fn=torch.nn.Tanh
    )
    
    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=lr,
        n_steps=n_steps,
        batch_size=batch_size,
        n_epochs=n_epochs,
        gamma=gamma,
        gae_lambda=gae_lambda,
        clip_range=clip_range,
        ent_coef=ent_coef,
        vf_coef=vf_coef,
        max_grad_norm=max_grad_norm,
        policy_kwargs=policy_kwargs,
        seed=seed,
        device=device,
        verbose=0
    )
    return model
