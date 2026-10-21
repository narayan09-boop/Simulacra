from typing import List, Dict, Any, Optional
import numpy as np
from app.sim.env import VisualNavigationEnv
from app.rl.base import BasePolicy

def evaluate_policy(
    policy: BasePolicy,
    env: VisualNavigationEnv,
    num_episodes: int = 10,
    base_seed: int = 1000,
    max_steps_override: Optional[int] = None
) -> Dict[str, Any]:
    """
    Evaluates a frozen policy on a set of deterministic evaluation seeds.
    Does NOT leak into training.
    """
    returns = []
    lengths = []
    successes = []
    episodes_data = []

    original_max_steps = env.max_steps
    if max_steps_override is not None:
        env.max_steps = max_steps_override

    for ep_idx in range(num_episodes):
        ep_seed = base_seed + ep_idx
        obs, info = env.reset(seed=ep_seed)
        
        ep_return = 0.0
        ep_len = 0
        done = False
        trajectory = [list(env.agent_pos)]
        
        while not done:
            action, _ = policy.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(int(action))
            
            ep_return += reward
            ep_len += 1
            trajectory.append(list(env.agent_pos))
            done = terminated or truncated

        returns.append(ep_return)
        lengths.append(ep_len)
        successes.append(info.get("is_success", False))
        
        # Save trajectory for the first few episodes for frontend rendering
        if ep_idx < 5:
            episodes_data.append({
                "episode": ep_idx + 1,
                "return_val": round(float(ep_return), 3),
                "length": ep_len,
                "success": bool(info.get("is_success", False)),
                "trajectory": trajectory
            })

    if max_steps_override is not None:
        env.max_steps = original_max_steps

    returns_arr = np.array(returns)
    lengths_arr = np.array(lengths)

    return {
        "num_episodes": num_episodes,
        "success_rate": float(np.mean(successes)),
        "mean_return": round(float(np.mean(returns_arr)), 3),
        "std_return": round(float(np.std(returns_arr)), 3),
        "mean_length": round(float(np.mean(lengths_arr)), 1),
        "episodes": episodes_data
    }
