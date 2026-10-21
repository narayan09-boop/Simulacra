import math
from typing import Optional, Tuple, Dict, Any, List, Set
from collections import deque
import gymnasium as gym
from gymnasium import spaces
import numpy as np

# Action Constants
ACTION_UP = 0
ACTION_DOWN = 1
ACTION_LEFT = 2
ACTION_RIGHT = 3
ACTION_NAMES = {
    ACTION_UP: "UP",
    ACTION_DOWN: "DOWN",
    ACTION_LEFT: "LEFT",
    ACTION_RIGHT: "RIGHT"
}

# Offsets for (dx, dy)
ACTION_DELTAS = {
    ACTION_UP: (0, -1),
    ACTION_DOWN: (0, 1),
    ACTION_LEFT: (-1, 0),
    ACTION_RIGHT: (1, 0)
}

class VisualNavigationEnv(gym.Env):
    """
    SIMULACRA Visual Navigation Environment.
    A 2D discrete grid world for reinforcement learning agent navigation research.
    
    Observation Space:
        Box(11,) in [-1.0, 1.0]:
        [0]: agent_x / width
        [1]: agent_y / height
        [2]: goal_x / width
        [3]: goal_y / height
        [4]: (goal_x - agent_x) / width
        [5]: (goal_y - agent_y) / height
        [6]: euclidean_distance / max_diagonal
        [7]: obstacle_up (1.0 if boundary/obstacle directly up, 0.0 otherwise)
        [8]: obstacle_down (1.0 if boundary/obstacle directly down, 0.0 otherwise)
        [9]: obstacle_left (1.0 if boundary/obstacle directly left, 0.0 otherwise)
        [10]: obstacle_right (1.0 if boundary/obstacle directly right, 0.0 otherwise)

    Action Space:
        Discrete(4): 0=UP, 1=DOWN, 2=LEFT, 3=RIGHT
    """
    metadata = {"render_modes": ["ansi", "rgb_array"], "render_fps": 10}

    def __init__(
        self,
        width: int = 10,
        height: int = 10,
        agent_start: Optional[Tuple[int, int]] = None,
        goal_pos: Optional[Tuple[int, int]] = None,
        obstacles: Optional[List[Tuple[int, int]]] = None,
        obstacle_density: float = 0.15,
        max_steps: int = 100,
        goal_reward: float = 10.0,
        step_penalty: float = -0.05,
        collision_penalty: float = -0.5,
        progress_reward_weight: float = 1.0,
        render_mode: Optional[str] = None
    ):
        super().__init__()
        self.width = max(4, min(50, width))
        self.height = max(4, min(50, height))
        self.max_diagonal = math.sqrt(self.width ** 2 + self.height ** 2)
        
        self.fixed_agent_start = agent_start
        self.fixed_goal_pos = goal_pos
        self.fixed_obstacles = [tuple(obs) for obs in obstacles] if obstacles is not None else None
        self.obstacle_density = max(0.0, min(0.6, obstacle_density))
        self.max_steps = max(1, max_steps)
        
        # Reward coefficients
        self.goal_reward = goal_reward
        self.step_penalty = step_penalty
        self.collision_penalty = collision_penalty
        self.progress_reward_weight = progress_reward_weight
        
        self.render_mode = render_mode
        
        # Gym Spaces
        self.action_space = spaces.Discrete(4)
        self.observation_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(11,),
            dtype=np.float32
        )
        
        # Runtime State
        self.agent_pos: Tuple[int, int] = (0, 0)
        self.goal_pos: Tuple[int, int] = (self.width - 1, self.height - 1)
        self.obstacles: Set[Tuple[int, int]] = set()
        self.step_count: int = 0
        self.cumulative_return: float = 0.0
        self.trajectory: List[Tuple[int, int]] = []
        self.last_action: Optional[int] = None
        self.last_reward_breakdown: Dict[str, float] = {
            "goal": 0.0,
            "step": 0.0,
            "collision": 0.0,
            "progress": 0.0,
            "total": 0.0
        }

    def _euclidean_dist(self, p1: Tuple[int, int], p2: Tuple[int, int]) -> float:
        return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

    def _manhattan_dist(self, p1: Tuple[int, int], p2: Tuple[int, int]) -> int:
        return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])

    def _is_obstacle_at(self, x: int, y: int) -> bool:
        if x < 0 or x >= self.width or y < 0 or y >= self.height:
            return True
        return (x, y) in self.obstacles

    def _get_obs(self) -> np.ndarray:
        ax, ay = self.agent_pos
        gx, gy = self.goal_pos
        
        # Normalized coordinates and deltas
        norm_ax = ax / (self.width - 1) if self.width > 1 else 0.0
        norm_ay = ay / (self.height - 1) if self.height > 1 else 0.0
        norm_gx = gx / (self.width - 1) if self.width > 1 else 0.0
        norm_gy = gy / (self.height - 1) if self.height > 1 else 0.0
        
        delta_x = (gx - ax) / self.width
        delta_y = (gy - ay) / self.height
        
        curr_dist = self._euclidean_dist(self.agent_pos, self.goal_pos)
        norm_dist = curr_dist / self.max_diagonal
        
        # Local 1-step raycasts
        obs_up = 1.0 if self._is_obstacle_at(ax, ay - 1) else 0.0
        obs_down = 1.0 if self._is_obstacle_at(ax, ay + 1) else 0.0
        obs_left = 1.0 if self._is_obstacle_at(ax - 1, ay) else 0.0
        obs_right = 1.0 if self._is_obstacle_at(ax + 1, ay) else 0.0
        
        return np.array([
            norm_ax,
            norm_ay,
            norm_gx,
            norm_gy,
            delta_x,
            delta_y,
            norm_dist,
            obs_up,
            obs_down,
            obs_left,
            obs_right
        ], dtype=np.float32)

    def _ensure_path_exists(self, start: Tuple[int, int], goal: Tuple[int, int]):
        """Verifies reachability via BFS; carves path if blocked by procedural obstacles."""
        visited = set()
        queue = deque([start])
        visited.add(start)
        
        while queue:
            curr = queue.popleft()
            if curr == goal:
                return  # Reachable
            cx, cy = curr
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                nx, ny = cx + dx, cy + dy
                neighbor = (nx, ny)
                if 0 <= nx < self.width and 0 <= ny < self.height:
                    if neighbor not in self.obstacles and neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
        
        # If no path, carve an L-shaped path between start and goal by removing obstacles
        curr_x, curr_y = start
        target_x, target_y = goal
        while curr_x != target_x:
            curr_x += 1 if target_x > curr_x else -1
            self.obstacles.discard((curr_x, curr_y))
        while curr_y != target_y:
            curr_y += 1 if target_y > curr_y else -1
            self.obstacles.discard((curr_x, curr_y))

    def reset(
        self,
        *,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        
        # Seeded generation for agent, goal, obstacles
        if self.fixed_agent_start is not None:
            self.agent_pos = (self.fixed_agent_start[0], self.fixed_agent_start[1])
        else:
            self.agent_pos = (0, 0)
            
        if self.fixed_goal_pos is not None:
            self.goal_pos = (self.fixed_goal_pos[0], self.fixed_goal_pos[1])
        else:
            self.goal_pos = (self.width - 1, self.height - 1)
            
        self.obstacles = set()
        if self.fixed_obstacles is not None:
            for obs in self.fixed_obstacles:
                if 0 <= obs[0] < self.width and 0 <= obs[1] < self.height:
                    if obs != self.agent_pos and obs != self.goal_pos:
                        self.obstacles.add((obs[0], obs[1]))
        elif self.obstacle_density > 0:
            num_cells = self.width * self.height
            target_obstacles = int(num_cells * self.obstacle_density)
            all_cells = [
                (x, y) for x in range(self.width) for y in range(self.height)
                if (x, y) != self.agent_pos and (x, y) != self.goal_pos
            ]
            if all_cells:
                # Use self.np_random for gym determinism
                chosen_indices = self.np_random.choice(
                    len(all_cells),
                    size=min(target_obstacles, len(all_cells)),
                    replace=False
                )
                self.obstacles = {all_cells[i] for i in chosen_indices}
            
            # Guarantee path existence
            self._ensure_path_exists(self.agent_pos, self.goal_pos)
            
        self.step_count = 0
        self.cumulative_return = 0.0
        self.trajectory = [self.agent_pos]
        self.last_action = None
        self.last_reward_breakdown = {
            "goal": 0.0,
            "step": 0.0,
            "collision": 0.0,
            "progress": 0.0,
            "total": 0.0
        }
        
        obs = self._get_obs()
        info = {
            "step_count": 0,
            "agent_pos": list(self.agent_pos),
            "goal_pos": list(self.goal_pos),
            "distance_to_goal": self._euclidean_dist(self.agent_pos, self.goal_pos),
            "is_success": False,
            "collided": False,
            "reward_breakdown": self.last_reward_breakdown
        }
        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        if not self.action_space.contains(action):
            raise ValueError(f"Invalid action {action} for discrete action space {self.action_space}")
        
        self.step_count += 1
        self.last_action = action
        
        dx, dy = ACTION_DELTAS[action]
        curr_x, curr_y = self.agent_pos
        next_x, next_y = curr_x + dx, curr_y + dy
        
        prev_dist = self._euclidean_dist(self.agent_pos, self.goal_pos)
        
        collided = False
        # Check boundary collision
        if next_x < 0 or next_x >= self.width or next_y < 0 or next_y >= self.height:
            collided = True
            new_pos = (curr_x, curr_y)
        # Check obstacle collision
        elif (next_x, next_y) in self.obstacles:
            collided = True
            new_pos = (curr_x, curr_y)
        else:
            new_pos = (next_x, next_y)
            
        self.agent_pos = new_pos
        self.trajectory.append(self.agent_pos)
        
        curr_dist = self._euclidean_dist(self.agent_pos, self.goal_pos)
        
        # Reward calculation: potential-based progress shaping preserves optimality
        r_step = self.step_penalty
        r_coll = self.collision_penalty if collided else 0.0
        r_progress = self.progress_reward_weight * (prev_dist - curr_dist)
        
        # Reached goal check
        terminated = False
        is_success = False
        r_goal = 0.0
        
        if self.agent_pos == self.goal_pos:
            terminated = True
            is_success = True
            r_goal = self.goal_reward
            
        truncated = False
        if not terminated and self.step_count >= self.max_steps:
            truncated = True
            
        step_reward = float(r_step + r_coll + r_progress + r_goal)
        self.cumulative_return += step_reward
        
        self.last_reward_breakdown = {
            "goal": float(r_goal),
            "step": float(r_step),
            "collision": float(r_coll),
            "progress": float(round(r_progress, 4)),
            "total": float(round(step_reward, 4))
        }
        
        obs = self._get_obs()
        info = {
            "step_count": self.step_count,
            "agent_pos": list(self.agent_pos),
            "goal_pos": list(self.goal_pos),
            "distance_to_goal": float(curr_dist),
            "is_success": is_success,
            "collided": collided,
            "reward_breakdown": self.last_reward_breakdown
        }
        
        return obs, step_reward, terminated, truncated, info

    def get_snapshot(self, episode: int = 0) -> Dict[str, Any]:
        """Provides a complete JSON-serializable snapshot of the simulation state."""
        return {
            "timestep": self.step_count,
            "episode": episode,
            "step_in_episode": self.step_count,
            "agent_pos": list(self.agent_pos),
            "goal_pos": list(self.goal_pos),
            "obstacles": [list(o) for o in sorted(self.obstacles)],
            "width": self.width,
            "height": self.height,
            "action_taken": self.last_action,
            "action_name": ACTION_NAMES.get(self.last_action, "NONE") if self.last_action is not None else "NONE",
            "last_reward": self.last_reward_breakdown["total"],
            "reward_components": self.last_reward_breakdown,
            "terminated": self.agent_pos == self.goal_pos,
            "truncated": self.step_count >= self.max_steps,
            "is_success": self.agent_pos == self.goal_pos,
            "cumulative_return": round(self.cumulative_return, 4),
            "trajectory": [list(p) for p in self.trajectory]
        }

    def render(self) -> Optional[str]:
        if self.render_mode == "ansi":
            lines = []
            for y in range(self.height):
                row = []
                for x in range(self.width):
                    pt = (x, y)
                    if pt == self.agent_pos:
                        row.append("A")
                    elif pt == self.goal_pos:
                        row.append("G")
                    elif pt in self.obstacles:
                        row.append("#")
                    else:
                        row.append(".")
                lines.append(" ".join(row))
            return "\n".join(lines)
        return None
