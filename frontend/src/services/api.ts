import {
  Experiment,
  MetricPoint,
  SimulationSnapshot,
  EnvironmentConfig,
  EvaluationResponse,
  PolicyComparisonResponse,
  SystemHealth,
  CheckpointSummary
} from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchEnvironments(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/environments`);
  if (!res.ok) throw new Error('Failed to fetch environments');
  return res.json();
}

export async function previewEnvironment(
  config: Partial<EnvironmentConfig>,
  seed: number = 42
): Promise<SimulationSnapshot> {
  const res = await fetch(`${API_BASE}/environments/preview?seed=${seed}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to generate preview');
  return res.json();
}

export async function startManualSession(
  sessionId: string,
  config: Partial<EnvironmentConfig>,
  seed: number = 42
): Promise<SimulationSnapshot> {
  const res = await fetch(`${API_BASE}/environments/manual/start?session_id=${sessionId}&seed=${seed}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to start manual session');
  return res.json();
}

export async function stepManualSession(
  sessionId: string,
  action: number
): Promise<SimulationSnapshot> {
  const res = await fetch(`${API_BASE}/environments/manual/step?session_id=${sessionId}&action=${action}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to step manual session');
  return res.json();
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error('Failed to fetch experiments');
  return res.json();
}

export async function createExperiment(data: any): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create experiment');
  return res.json();
}

export async function getExperiment(id: string): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments/${id}`);
  if (!res.ok) throw new Error('Failed to get experiment');
  return res.json();
}

export async function deleteExperiment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/experiments/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete experiment');
}

export async function getExperimentMetrics(id: string, limit: number = 1000): Promise<MetricPoint[]> {
  const res = await fetch(`${API_BASE}/experiments/${id}/metrics?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to get metrics');
  return res.json();
}

export async function exportExperiment(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/experiments/${id}/export`);
  if (!res.ok) throw new Error('Failed to export experiment');
  return res.json();
}

export async function startTraining(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/training/${id}/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start training');
  return res.json();
}

export async function pauseTraining(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/training/${id}/pause`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to pause training');
  return res.json();
}

export async function resumeTraining(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/training/${id}/resume`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resume training');
  return res.json();
}

export async function stopTraining(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/training/${id}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop training');
  return res.json();
}

export async function getTrainingStatus(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/training/${id}/status`);
  if (!res.ok) throw new Error('Failed to get training status');
  return res.json();
}

export async function runEvaluation(data: {
  policy_type: string;
  checkpoint_id?: string;
  num_episodes?: number;
  seed?: number;
  env_config?: Partial<EnvironmentConfig>;
}): Promise<EvaluationResponse> {
  const res = await fetch(`${API_BASE}/evaluations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to run evaluation');
  return res.json();
}

export async function comparePolicies(data: {
  experiment_id?: string;
  checkpoint_id?: string;
  policies?: string[];
  num_episodes?: number;
  seed?: number;
  env_config?: Partial<EnvironmentConfig>;
}): Promise<PolicyComparisonResponse> {
  const res = await fetch(`${API_BASE}/evaluations/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to compare policies');
  return res.json();
}

export async function fetchCheckpoints(experimentId?: string): Promise<CheckpointSummary[]> {
  const url = experimentId ? `${API_BASE}/checkpoints?experiment_id=${experimentId}` : `${API_BASE}/checkpoints`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch checkpoints');
  return res.json();
}
