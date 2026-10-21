import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  TrendingUp,
  Download,
  Clock,
  Compass,
  Layers,
  Activity
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
  getExperimentMetrics
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
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'returns' | 'losses' | 'success'>('returns');

  // Load existing metrics
  useEffect(() => {
    if (!activeExperiment) return;
    async function loadMetrics() {
      try {
        const data = await getExperimentMetrics(activeExperiment!.id, 1000);
        setMetrics(data);
      } catch (e) {
        console.error('Failed to load metrics', e);
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
      <div className="py-24 text-center bg-[#1E211F] border border-[#383E38] rounded-[4px] p-8 space-y-3">
        <Compass className="w-8 h-8 text-[#777F77] mx-auto" />
        <h2 className="text-sm font-medium text-[#F0EEE7]">No Experiment Selected</h2>
        <p className="text-xs text-[#777F77] max-w-sm mx-auto">
          Select an existing experiment from the sidebar context switcher or launch a new run.
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
      {/* Top Header: Experiment Context & Controls */}
      <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base font-semibold text-[#F0EEE7] tracking-tight">{activeExperiment.name}</h1>
            <span
              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-medium ${
                activeExperiment.status === 'running'
                  ? 'bg-[#2C382D] text-[#86A98A] border border-[#86A98A]/60'
                  : activeExperiment.status === 'paused'
                  ? 'bg-[#3A3324] text-[#D6B16C] border border-[#D6B16C]/60'
                  : activeExperiment.status === 'completed'
                  ? 'bg-[#22292E] text-[#91AFC4] border border-[#91AFC4]/60'
                  : 'bg-[#252A26] text-[#777F77] border border-[#383E38]'
              }`}
            >
              {activeExperiment.status}
            </span>
          </div>
          <div className="text-[11px] text-[#777F77] flex items-center space-x-2 font-mono">
            <span>Algorithm: {activeExperiment.algorithm}</span>
            <span>•</span>
            <span>Seed: {activeExperiment.seed}</span>
            <span>•</span>
            <span>{activeExperiment.env_config.width}x{activeExperiment.env_config.height} Grid</span>
          </div>
        </div>

        {/* Training Action Controls */}
        <div className="flex items-center space-x-2">
          {activeExperiment.status === 'created' && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors cursor-pointer disabled:opacity-50"
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#D6B16C] border border-[#383E38] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#CB817B] border border-[#383E38] transition-colors cursor-pointer disabled:opacity-50"
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#CB817B] border border-[#383E38] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          {activeExperiment.status === 'completed' && (
            <button
              onClick={onNavigateComparison}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#A8C9A5] border border-[#383E38] transition-colors cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Benchmark Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Metric Header Row */}
      <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-3.5 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-[#777F77] uppercase tracking-wider text-[10px]">
            Timestep Budget Progress:
          </span>
          <span className="text-[#F0EEE7] font-medium tabular-nums">
            {activeExperiment.current_timesteps.toLocaleString()} / {activeExperiment.total_timesteps.toLocaleString()} steps ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-[2px] bg-[#171918] overflow-hidden border border-[#383E38]">
          <div
            className="h-full bg-[#A8C9A5] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Analytical Charts (2 cols) & Mini Simulation + Checkpoints (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Analytical Telemetry */}
        <div className="lg:col-span-2 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5">
            <div className="flex items-center space-x-1 bg-[#171918] p-0.5 rounded-[3px] border border-[#383E38] text-xs font-mono">
              <button
                onClick={() => setActiveTab('returns')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  activeTab === 'returns'
                    ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                    : 'text-[#777F77] hover:text-[#F0EEE7]'
                }`}
              >
                EPISODE RETURN
              </button>
              <button
                onClick={() => setActiveTab('success')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  activeTab === 'success'
                    ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                    : 'text-[#777F77] hover:text-[#F0EEE7]'
                }`}
              >
                SUCCESS RATE
              </button>
              <button
                onClick={() => setActiveTab('losses')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  activeTab === 'losses'
                    ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                    : 'text-[#777F77] hover:text-[#F0EEE7]'
                }`}
              >
                PPO LOSSES
              </button>
            </div>

            <span className="text-[10px] font-mono text-[#777F77]">
              {metrics.length} telemetry records
            </span>
          </div>

          {/* Chart Canvas */}
          <div className="h-80 w-full pt-1">
            {metrics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-[#777F77] font-mono space-y-2">
                <Clock className="w-5 h-5 text-[#4A5149]" />
                <span>Awaiting telemetry batches from worker...</span>
              </div>
            ) : activeTab === 'returns' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#252A26" />
                  <XAxis
                    dataKey="timestep"
                    stroke="#777F77"
                    fontSize={10}
                    tickFormatter={(v) => `${v}`}
                    fontFamily="IBM Plex Mono"
                  />
                  <YAxis stroke="#777F77" fontSize={10} fontFamily="IBM Plex Mono" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E211F', borderColor: '#383E38', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10, fontFamily: 'IBM Plex Mono' }} />
                  <Line
                    type="monotone"
                    dataKey="episode_return"
                    stroke="#D6BD88"
                    dot={false}
                    strokeWidth={1}
                    opacity={0.4}
                    connectNulls={true}
                    name="Episode Return (Raw)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rolling_return"
                    stroke="#A8C9A5"
                    dot={false}
                    strokeWidth={2}
                    connectNulls={true}
                    name="Rolling Return (25 ep mean)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : activeTab === 'success' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#252A26" />
                  <XAxis dataKey="timestep" stroke="#777F77" fontSize={10} fontFamily="IBM Plex Mono" />
                  <YAxis stroke="#777F77" fontSize={10} domain={[0, 1]} fontFamily="IBM Plex Mono" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E211F', borderColor: '#383E38', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10, fontFamily: 'IBM Plex Mono' }} />
                  <Line
                    type="stepAfter"
                    dataKey="is_success"
                    stroke="#86A98A"
                    dot={false}
                    strokeWidth={1.5}
                    connectNulls={true}
                    name="Goal Success Flag (1=Success, 0=Truncated)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.filter((m) => m.policy_loss !== null || m.value_loss !== null)}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#252A26" />
                  <XAxis dataKey="timestep" stroke="#777F77" fontSize={10} fontFamily="IBM Plex Mono" />
                  <YAxis stroke="#777F77" fontSize={10} fontFamily="IBM Plex Mono" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E211F', borderColor: '#383E38', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10, fontFamily: 'IBM Plex Mono' }} />
                  <Line
                    type="monotone"
                    dataKey="policy_loss"
                    stroke="#CB817B"
                    dot={false}
                    strokeWidth={1.2}
                    connectNulls={true}
                    name="Policy Loss"
                  />
                  <Line
                    type="monotone"
                    dataKey="value_loss"
                    stroke="#D6BD88"
                    dot={false}
                    strokeWidth={1.2}
                    connectNulls={true}
                    name="Value Loss"
                  />
                  <Line
                    type="monotone"
                    dataKey="entropy"
                    stroke="#91AFC4"
                    dot={false}
                    strokeWidth={1.2}
                    connectNulls={true}
                    name="Policy Entropy"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Live Training Simulation Canvas Mini & Saved Checkpoints */}
        <div className="space-y-4">
          {/* Mini Canvas */}
          <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
                LIVE TRAINING SIMULATION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#86A98A]" />
            </div>

            <div className="w-full h-52 bg-[#171918] rounded-[3px] overflow-hidden border border-[#383E38]">
              <SimulationCanvas snapshot={liveSnapshot} showTrajectory={true} />
            </div>

            <div className="text-[10px] font-mono text-[#A6ADA4] flex justify-between">
              <span>Step: {liveSnapshot?.step_in_episode || 0}</span>
              <span className="text-[#D6BD88]">Return: {liveSnapshot?.cumulative_return ?? '0.00'}</span>
            </div>
          </div>

          {/* Checkpoints Card */}
          <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
                SAVED CHECKPOINTS
              </span>
              <span className="text-[10px] font-mono text-[#A8C9A5]">
                {activeExperiment.checkpoints.length} saved
              </span>
            </div>

            {activeExperiment.checkpoints.length === 0 ? (
              <p className="text-[11px] text-[#777F77] font-mono py-4 text-center">
                Checkpoints are saved automatically during training rollouts.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeExperiment.checkpoints.map((ckpt) => (
                  <div
                    key={ckpt.id}
                    className="p-2 rounded-[3px] bg-[#171918] border border-[#383E38] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-[#F0EEE7] font-mono text-xs">
                        Step {ckpt.timestep.toLocaleString()}
                      </span>
                      <span className="block text-[9px] text-[#777F77] font-mono">
                        {new Date(ckpt.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <a
                      href={`/api/v1/checkpoints/${ckpt.id}/download`}
                      className="px-2 py-0.5 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A8C9A5] border border-[#383E38] flex items-center space-x-1"
                      download
                    >
                      <Download className="w-3 h-3" />
                      <span className="text-[10px] font-mono">.zip</span>
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
