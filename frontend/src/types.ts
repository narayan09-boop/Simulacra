export interface Position {
  x: number;
  y: number;
}

export interface EnvironmentConfig {
  width: number;
  height: number;
  agent_start?: Position | null;
  goal_pos?: Position | null;
  obstacles?: Position[] | null;
  obstacle_density: number;
  max_steps: number;
  goal_reward: number;
  step_penalty: number;
  collision_penalty: number;
  progress_reward_weight: number;
}

export interface Hyperparameters {
  learning_rate: number;
  n_steps: number;
  batch_size: number;
  n_epochs: number;
  gamma: number;
  gae_lambda: number;
  clip_range: number;
  ent_coef: number;
  vf_coef: number;
  max_grad_norm: number;
}

export interface CheckpointSummary {
  id: string;
  name: string;
  timestep: number;
  created_at: string;
  file_path: string;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  algorithm: string;
  env_id: string;
  env_config: EnvironmentConfig;
  hyperparameters: Hyperparameters;
  seed: number;
  total_timesteps: number;
  current_timesteps: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  checkpoints: CheckpointSummary[];
}

export interface MetricPoint {
  timestep: number;
  episode?: number | null;
  episode_return?: number | null;
  rolling_return?: number | null;
  episode_length?: number | null;
  is_success?: boolean | null;
  policy_loss?: number | null;
  value_loss?: number | null;
  entropy?: number | null;
  approx_kl?: number | null;
  timestamp: string;
}

export interface SimulationSnapshot {
  timestep: number;
  episode: number;
  step_in_episode: number;
  agent_pos: [number, number];
  goal_pos: [number, number];
  obstacles: [number, number][];
  width: number;
  height: number;
  action_taken?: number | null;
  action_name?: string | null;
  last_reward: number;
  reward_components: {
    goal: number;
    step: number;
    collision: number;
    progress: number;
    total: number;
  };
  terminated: boolean;
  truncated: boolean;
  is_success: boolean;
  cumulative_return: number;
  trajectory: [number, number][];
}

export interface TelemetryEvent {
  type: 'snapshot' | 'metric_update' | 'job_status' | 'checkpoint_saved' | 'error' | 'subscribed' | 'pong';
  experiment_id?: string;
  timestamp: number;
  payload: any;
}

export interface EvaluationEpisodeResult {
  episode: number;
  return_val: number;
  length: number;
  success: boolean;
  trajectory: [number, number][];
}

export interface EvaluationResponse {
  id: string;
  experiment_id?: string | null;
  checkpoint_id?: string | null;
  policy_type: string;
  num_episodes: number;
  success_rate: number;
  mean_return: number;
  std_return: number;
  mean_length: number;
  episodes: EvaluationEpisodeResult[];
  created_at: string;
}

export interface PolicyComparisonResult {
  policy_name: string;
  success_rate: number;
  mean_return: number;
  std_return: number;
  mean_length: number;
  sample_trajectory: [number, number][];
}

export interface PolicyComparisonResponse {
  num_episodes: number;
  seed: number;
  results: PolicyComparisonResult[];
}

export interface SystemHealth {
  status: string;
  app_name: string;
  version: string;
  system: {
    torch_version: string;
    cuda_available: boolean;
    device: string;
    gymnasium_version: string;
    sb3_version: string;
    cpu_count: number;
    memory_usage_percent: number;
  };
}
