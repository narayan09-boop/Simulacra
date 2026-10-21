import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Sliders,
  TrendingUp,
  Award,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Experiment, MetricPoint, SimulationSnapshot } from '../types';
import {
  startTraining,
  pauseTraining,
  resumeTraining,
  stopTraining,
  getExperimentMetrics,
  getTrainingStatus
} from '../services/api';
import { SimulationCanvas } from '../components/SimulationCanvas';

interface TrainingCenterViewProps {
  activeExperiment: Experiment | null;
  liveSnapshot: SimulationSnapshot | null;
  liveMetrics: MetricPoint[];
  onRefreshExperiment: () => void;
  onNavigateComparison: () => void;
}

export const TrainingCenterView: React.FC<TrainingCenterViewProps> = ({
  activeExperiment,
  liveSnapshot,
  liveMetrics,
  onRefreshExperiment,
  onNavigateComparison
}) => {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'returns' | 'losses' | 'success'>('returns');

  // Load existing metrics from database when experiment changes
  useEffect(() => {
    if (!activeExperiment) return;
    async function loadMetrics() {
      setLoadingMetrics(true);
      try {
        const data = await getExperimentMetrics(activeExperiment!.id, 1000);
        setMetrics(data);
      } catch (e) {
        console.error('Failed to load metrics', e);
      } finally {
        setLoadingMetrics(false);
      }
    }
    loadMetrics();
  }, [activeExperiment]);

  // Merge live incoming metrics
  useEffect(() => {
    if (liveMetrics.length > 0) {
      setMetrics((prev) => {
        const merged = [...prev];
        liveMetrics.forEach((m) => {
          if (!merged.some((existing) => existing.timestep === m.timestep && existing.episode === m.episode)) {
            merged.push(m);
          }
        });
        return merged.sort((a, b) => a.timestep - b.timestep);
      });
    }
  }, [liveMetrics]);

  if (!activeExperiment) {
    return (
      <div className="py-24 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-4">
        <Compass className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-base font-semibold text-slate-200">No Experiment Selected</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Select an existing experiment from the Overview or Experiments tab, or launch a new research run.
        </p>
      </div>
    );
  }

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await startTraining(activeExperiment.id);
      onRefreshExperiment();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await pauseTraining(activeExperiment.id);
      onRefreshExperiment();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeTraining(activeExperiment.id);
      onRefreshExperiment();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await stopTraining(activeExperiment.id);
      onRefreshExperiment();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((activeExperiment.current_timesteps / activeExperiment.total_timesteps) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Experiment Header & Live Training Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-white tracking-tight">{activeExperiment.name}</h1>
            <span
              className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded-full font-semibold ${
                activeExperiment.status === 'running'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 animate-pulse'
                  : activeExperiment.status === 'paused'
                  ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                  : activeExperiment.status === 'completed'
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-700/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {activeExperiment.status}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center space-x-3 font-mono">
            <span>Algorithm: {activeExperiment.algorithm}</span>
            <span>•</span>
            <span>Seed: {activeExperiment.seed}</span>
            <span>•</span>
            <span>{activeExperiment.env_config.width}x{activeExperiment.env_config.height} Grid</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeExperiment.status === 'created' && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Training</span>
            </button>
          )}

          {activeExperiment.status === 'running' && (
            <>
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          {activeExperiment.status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          {activeExperiment.status === 'completed' && (
            <button
              onClick={onNavigateComparison}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Benchmark Against Baselines</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Timestep Budget Progress:</span>
          <span className="text-cyan-400 font-bold">
            {activeExperiment.current_timesteps.toLocaleString()} / {activeExperiment.total_timesteps.toLocaleString()} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Analytical Charts (2 cols) & Live Sim Canvas (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recharts Telemetry Suite */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          {/* Chart Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('returns')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'returns'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Episode Return
              </button>
              <button
                onClick={() => setActiveTab('success')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'success'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Success Rate
              </button>
              <button
                onClick={() => setActiveTab('losses')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === 'losses'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PPO Losses
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              {metrics.length} telemetry records
            </span>
          </div>

          {/* Chart Display Area */}
          <div className="h-80 w-full pt-2">
            {metrics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 font-mono space-y-2">
                <Clock className="w-6 h-6 text-slate-600 animate-spin" />
                <span>Awaiting training telemetry samples...</span>
              </div>
            ) : activeTab === 'returns' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestep"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="episode_return"
                    stroke="#06b6d4"
                    dot={false}
                    strokeWidth={1}
                    opacity={0.5}
                    name="Episode Return"
                  />
                  <Line
                    type="monotone"
                    dataKey="rolling_return"
                    stroke="#10b981"
                    dot={false}
                    strokeWidth={2.5}
                    name="Rolling Mean (25 ep)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : activeTab === 'success' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestep" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="stepAfter"
                    dataKey="is_success"
                    stroke="#14b8a6"
                    dot={false}
                    strokeWidth={2}
                    name="Goal Success Flag (1=Success, 0=Truncated)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.filter((m) => m.policy_loss !== null || m.value_loss !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestep" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="policy_loss"
                    stroke="#f43f5e"
                    dot={false}
                    strokeWidth={1.5}
                    name="Policy Gradient Loss"
                  />
                  <Line
                    type="monotone"
                    dataKey="value_loss"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={1.5}
                    name="Value Function Loss"
                  />
                  <Line
                    type="monotone"
                    dataKey="entropy"
                    stroke="#8b5cf6"
                    dot={false}
                    strokeWidth={1.5}
                    name="Policy Entropy"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Col: Live Training Simulation Canvas Mini & Checkpoints */}
        <div className="space-y-4">
          {/* Mini Canvas */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 font-mono uppercase">
                Active Training Simulation
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="w-full h-52 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
              <SimulationCanvas snapshot={liveSnapshot} showTrajectory={true} />
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Step: {liveSnapshot?.step_in_episode || 0}</span>
              <span className="text-cyan-400">Return: {liveSnapshot?.cumulative_return ?? '0.00'}</span>
            </div>
          </div>

          {/* Checkpoints Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 font-mono uppercase">
                Saved Checkpoints
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {activeExperiment.checkpoints.length} saved
              </span>
            </div>

            {activeExperiment.checkpoints.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono py-4 text-center">
                Checkpoints are generated periodically as the agent trains.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeExperiment.checkpoints.map((ckpt) => (
                  <div
                    key={ckpt.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 font-mono">
                        Step {ckpt.timestep.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {new Date(ckpt.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <a
                      href={`/api/v1/checkpoints/${ckpt.id}/download`}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 flex items-center space-x-1"
                      download
                    >
                      <Download className="w-3 h-3" />
                      <span className="text-[10px]">Model.zip</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
