import pytest
import numpy as np
from app.sim.env import VisualNavigationEnv, ACTION_UP, ACTION_DOWN, ACTION_LEFT, ACTION_RIGHT

def test_env_initialization():
    env = VisualNavigationEnv(width=8, height=8, max_steps=50)
    assert env.width == 8
    assert env.height == 8
    assert env.action_space.n == 4
    assert env.observation_space.shape == (11,)

def test_env_reset_determinism():
    env1 = VisualNavigationEnv(width=10, height=10, obstacle_density=0.2)
    env2 = VisualNavigationEnv(width=10, height=10, obstacle_density=0.2)
    
    obs1, info1 = env1.reset(seed=123)
    obs2, info2 = env2.reset(seed=123)
    
    np.testing.assert_allclose(obs1, obs2, rtol=1e-5)
    assert env1.obstacles == env2.obstacles
    assert info1["agent_pos"] == info2["agent_pos"]
    assert info1["goal_pos"] == info2["goal_pos"]

def test_goal_termination_and_reward():
    # 4x4 grid: Start at (0, 0), Goal at (0, 1), no obstacles
    env = VisualNavigationEnv(
        width=4,
        height=4,
        agent_start=(0, 0),
        goal_pos=(0, 1),
        obstacles=[],
        goal_reward=10.0,
        step_penalty=-0.1,
        progress_reward_weight=1.0
    )
    obs, info = env.reset(seed=1)
    assert info["agent_pos"] == [0, 0]
    
    # Take DOWN action -> should reach goal (0, 1)
    obs, reward, terminated, truncated, info = env.step(ACTION_DOWN)
    assert terminated is True
    assert truncated is False
    assert info["is_success"] is True
    assert info["agent_pos"] == [0, 1]
    assert info["reward_breakdown"]["goal"] == 10.0
    assert reward > 9.0  # Goal reward + progress - step

def test_collision_handling():
    # Start at (0, 0), move LEFT into wall
    env = VisualNavigationEnv(
        width=5,
        height=5,
        agent_start=(0, 0),
        goal_pos=(4, 4),
        obstacles=[],
        collision_penalty=-1.0
    )
    env.reset(seed=42)
    obs, reward, terminated, truncated, info = env.step(ACTION_LEFT)
    
    # Boundary collision: should stay at (0, 0)
    assert info["collided"] is True
    assert info["agent_pos"] == [0, 0]
    assert info["reward_breakdown"]["collision"] == -1.0

def test_obstacle_collision():
    # Obstacle at (1, 0)
    env = VisualNavigationEnv(
        width=5,
        height=5,
        agent_start=(0, 0),
        goal_pos=(4, 4),
        obstacles=[(1, 0)],
        collision_penalty=-0.5
    )
    env.reset(seed=42)
    obs, reward, terminated, truncated, info = env.step(ACTION_RIGHT)
    assert info["collided"] is True
    assert info["agent_pos"] == [0, 0]

def test_truncation():
    env = VisualNavigationEnv(
        width=5,
        height=5,
        agent_start=(0, 0),
        goal_pos=(4, 4),
        obstacles=[],
        max_steps=3
    )
    env.reset(seed=42)
    _, _, term1, trunc1, _ = env.step(ACTION_RIGHT)
    assert not term1 and not trunc1
    _, _, term2, trunc2, _ = env.step(ACTION_RIGHT)
    assert not term2 and not trunc2
    _, _, term3, trunc3, _ = env.step(ACTION_RIGHT)
    assert trunc3 is True
    assert term3 is False
