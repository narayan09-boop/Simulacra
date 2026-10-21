import abc
import heapq
from typing import Tuple, List, Optional, Set, Dict, Any
import numpy as np
from app.sim.env import (
    ACTION_UP, ACTION_DOWN, ACTION_LEFT, ACTION_RIGHT,
    ACTION_DELTAS
)

class BasePolicy(abc.ABC):
    @abc.abstractmethod
    def predict(self, obs: np.ndarray, deterministic: bool = True) -> Tuple[int, Optional[Dict[str, Any]]]:
        """Returns action and optional info dict."""
        pass

class RandomPolicy(BasePolicy):
    """Uniform random action selection baseline."""
    def __init__(self, seed: Optional[int] = None):
        self.rng = np.random.default_rng(seed)

    def predict(self, obs: np.ndarray, deterministic: bool = True) -> Tuple[int, Optional[Dict[str, Any]]]:
        action = int(self.rng.integers(0, 4))
        return action, None

class HeuristicPolicy(BasePolicy):
    """
    A* heuristic pathfinding baseline that navigates towards the goal
    while avoiding obstacles and grid boundaries.
    """
    def __init__(self, env=None):
        self.env = env

    def _a_star(
        self,
        start: Tuple[int, int],
        goal: Tuple[int, int],
        obstacles: Set[Tuple[int, int]],
        width: int,
        height: int
    ) -> Optional[int]:
        if start == goal:
            return ACTION_UP
            
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from: Dict[Tuple[int, int], Optional[Tuple[Tuple[int, int], int]]] = {start: None}
        cost_so_far: Dict[Tuple[int, int], int] = {start: 0}
        
        while frontier:
            _, current = heapq.heappop(frontier)
            if current == goal:
                break
                
            cx, cy = current
            # Check 4 cardinal neighbors
            for action, (dx, dy) in ACTION_DELTAS.items():
                nx, ny = cx + dx, cy + dy
                neighbor = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and neighbor not in obstacles:
                    new_cost = cost_so_far[current] + 1
                    if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                        cost_so_far[neighbor] = new_cost
                        priority = new_cost + abs(nx - goal[0]) + abs(ny - goal[1])
                        heapq.heappush(frontier, (priority, neighbor))
                        came_from[neighbor] = (current, action)
                        
        if goal not in came_from:
            # Fallback to greedy 1-step reduction if goal is unreachable
            best_action = ACTION_UP
            best_dist = float("inf")
            cx, cy = start
            for action, (dx, dy) in ACTION_DELTAS.items():
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in obstacles:
                    d = abs(nx - goal[0]) + abs(ny - goal[1])
                    if d < best_dist:
                        best_dist = d
                        best_action = action
            return best_action

        # Reconstruct first action taken from start
        curr = goal
        while came_from[curr] is not None and came_from[curr][0] != start:
            curr = came_from[curr][0]
            
        if came_from[curr] is not None:
            return came_from[curr][1]
        return ACTION_UP

    def predict(self, obs: np.ndarray, deterministic: bool = True) -> Tuple[int, Optional[Dict[str, Any]]]:
        if self.env is not None:
            action = self._a_star(
                self.env.agent_pos,
                self.env.goal_pos,
                self.env.obstacles,
                self.env.width,
                self.env.height
            )
            return action if action is not None else 0, None
        
        # If env instance is not attached, infer from obs vector:
        # [0]: ax, [1]: ay, [2]: gx, [3]: gy, [4]: dx, [5]: dy, [6]: dist, [7-10]: obs_up, obs_down, obs_left, obs_right
        delta_x = obs[4]
        delta_y = obs[5]
        obs_up = obs[7] > 0.5
        obs_down = obs[8] > 0.5
        obs_left = obs[9] > 0.5
        obs_right = obs[10] > 0.5
        
        # Greedy direction picking non-blocked action
        actions = []
        if delta_y < 0 and not obs_up:
            actions.append((abs(delta_y), ACTION_UP))
        if delta_y > 0 and not obs_down:
            actions.append((abs(delta_y), ACTION_DOWN))
        if delta_x < 0 and not obs_left:
            actions.append((abs(delta_x), ACTION_LEFT))
        if delta_x > 0 and not obs_right:
            actions.append((abs(delta_x), ACTION_RIGHT))
            
        if actions:
            actions.sort(key=lambda x: x[0], reverse=True)
            return actions[0][1], None
            
        # If preferred directions are blocked, pick any non-blocked
        for act, blocked in [(ACTION_UP, obs_up), (ACTION_RIGHT, obs_right), (ACTION_DOWN, obs_down), (ACTION_LEFT, obs_left)]:
            if not blocked:
                return act, None
                
        return ACTION_UP, None
