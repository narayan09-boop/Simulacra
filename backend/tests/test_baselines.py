import pytest
from app.sim.env import VisualNavigationEnv
from app.rl.base import RandomPolicy, HeuristicPolicy
from app.rl.evaluator import evaluate_policy

def test_random_policy_execution():
    env = VisualNavigationEnv(width=6, height=6, max_steps=20)
    policy = RandomPolicy(seed=42)
    
    result = evaluate_policy(policy, env, num_episodes=5, base_seed=100)
    assert result["num_episodes"] == 5
    assert len(result["episodes"]) == 5
    assert "mean_return" in result
    assert "success_rate" in result

def test_heuristic_policy_finds_path():
    # 5x5 grid without obstacles: Heuristic A* must achieve 100% success rate!
    env = VisualNavigationEnv(
        width=5,
        height=5,
        agent_start=(0, 0),
        goal_pos=(4, 4),
        obstacles=[],
        max_steps=20
    )
    policy = HeuristicPolicy(env=env)
    
    result = evaluate_policy(policy, env, num_episodes=5, base_seed=200)
    assert result["success_rate"] == 1.0
    assert result["mean_length"] == 8.0  # Manhattan distance from (0,0) to (4,4) is 4 + 4 = 8 steps!
    assert result["mean_return"] > 0
