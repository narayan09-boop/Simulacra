import pytest
import os
from pathlib import Path
from stable_baselines3 import PPO
from app.sim.env import VisualNavigationEnv
from app.rl.ppo_trainer import build_ppo_model, TelemetryCallback, PPOPolicyWrapper
from app.rl.evaluator import evaluate_policy
from app.config import settings

def test_ppo_build_and_short_train(tmp_path):
    env = VisualNavigationEnv(width=5, height=5, max_steps=15)
    params = {
        "learning_rate": 0.001,
        "n_steps": 64,
        "batch_size": 32,
        "n_epochs": 2
    }
    model = build_ppo_model(env, params, seed=42)
    assert model is not None
    
    snapshots_received = []
    metrics_received = []
    
    callback = TelemetryCallback(
        experiment_id="test_exp",
        env=env,
        on_snapshot=lambda snap: snapshots_received.append(snap),
        on_metric=lambda met: metrics_received.append(met),
        snapshot_interval_steps=2
    )
    
    # Run short training of 128 timesteps
    model.learn(total_timesteps=128, callback=callback)
    
    assert len(snapshots_received) > 0
    assert len(metrics_received) > 0
    
    # Save checkpoint
    save_file = tmp_path / "test_model.zip"
    model.save(str(save_file))
    assert save_file.exists()
    
    # Reload model
    loaded_model = PPO.load(str(save_file))
    wrapper = PPOPolicyWrapper(loaded_model)
    
    # Evaluate reloaded model
    eval_result = evaluate_policy(wrapper, env, num_episodes=3, base_seed=50)
    assert eval_result["num_episodes"] == 3
    assert "mean_return" in eval_result
    assert "success_rate" in eval_result
