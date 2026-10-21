import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  PlayCircle,
  FolderGit2,
  GitCompare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Server,
  Layers
} from 'lucide-react';
import { Experiment, SystemHealth } from '../types';
import { fetchHealth, fetchExperiments, createExperiment } from '../services/api';
import { NavTab } from '../components/Navigation';

interface OverviewViewProps {
  onNavigate: (tab: NavTab) => void;
  onSelectExperiment: (exp: Experiment) => void;
  onNewExperimentModal: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onSelectExperiment,
  onNewExperimentModal
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [h, exps] = await Promise.all([
          fetchHealth().catch(() => null),
          fetchExperiments().catch(() => [])
        ]);
        setHealth(h);
        setExperiments(exps);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeJobs = experiments.filter((e) => e.status === 'running' || e.status === 'paused');
  const completedJobs = experiments.filter((e) => e.status === 'completed');

  const handleQuickPreset = async (presetName: string, w: number, h: number, density: number, steps: number) => {
    try {
      const newExp = await createExperiment({
        name: presetName,
        description: `Preset initialized from Overview (${w}x${h} grid, ${steps} steps budget)`,
        algorithm: 'PPO',
        env_id: 'VisualNavigation-v0',
        env_config: {
          width: w,
          height: h,
          obstacle_density: density,
          max_steps: 60,
          goal_reward: 10.0,
          step_penalty: -0.05,
          collision_penalty: -0.5,
          progress_reward_weight: 1.0
        },
        hyperparameters: {
          learning_rate: 0.0003,
          n_steps: 128,
          batch_size: 32,
          n_epochs: 4
        },
        seed: Math.floor(Math.random() * 1000),
        total_timesteps: steps
      });
      onSelectExperiment(newExp);
      onNavigate('training');
    } catch (e) {
      console.error('Failed to create preset', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 lg:p-8">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive AI Simulation & RL Platform</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Train, Observe & Benchmark Autonomous Agents
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            SIMULACRA provides an end-to-end laboratory for spatial navigation reinforcement learning.
            Run genuine PPO optimization, observe step-by-step telemetry over WebSockets, inspect potential-based reward shaping, and reproduce benchmarks with mathematical rigor.
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => onNavigate('sim_lab')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Open Simulation Lab</span>
            </button>
            <button
              onClick={onNewExperimentModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <span>Create Experiment</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* System & Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Jobs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span>Active Jobs</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {activeJobs.length}
          </div>
          <div className="text-xs text-slate-400">
            {activeJobs.length > 0 ? 'Background workers training' : 'No active training threads'}
          </div>
        </div>

        {/* Total Experiments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span>Total Experiments</span>
            <FolderGit2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {experiments.length}
          </div>
          <div className="text-xs text-slate-400">
            {completedJobs.length} completed benchmarks saved
          </div>
        </div>

        {/* Compute Engine */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span>Compute Device</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono uppercase">
            {health?.system.device || 'CPU'}
          </div>
          <div className="text-xs text-slate-400">
            PyTorch {health?.system.torch_version || '2.x'} ({health?.system.cpu_count || 4} cores)
          </div>
        </div>

        {/* RL Environment */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider">
            <span>Gymnasium</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            v{health?.system.gymnasium_version || '0.29'}
          </div>
          <div className="text-xs text-slate-400">
            Stable-Baselines3 v{health?.system.sb3_version || '2.9'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Presets & Recent Experiments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Launch Presets */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Quick Research Presets
            </h2>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-400">
            Launch verified reinforcement learning environments with calibrated potential-based reward shaping:
          </p>

          <div className="space-y-3">
            {/* Preset 1 */}
            <div
              onClick={() => handleQuickPreset('Standard Navigation 8x8', 8, 8, 0.12, 3000)}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-300">
                  Standard Navigation 8x8
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-700">
                  3k steps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                8x8 grid with light procedural obstacles. Fast convergence benchmark.
              </p>
            </div>

            {/* Preset 2 */}
            <div
              onClick={() => handleQuickPreset('Obstacle Course 12x12', 12, 12, 0.22, 6000)}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-teal-300">
                  Obstacle Course 12x12
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-700">
                  6k steps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                12x12 labyrinth with dense barriers. Evaluates spatial avoidance.
              </p>
            </div>

            {/* Preset 3 */}
            <div
              onClick={() => handleQuickPreset('High-Density Maze 15x15', 15, 15, 0.28, 10000)}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300">
                  High-Density Maze 15x15
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                  10k steps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Complex terrain requiring deep value estimation and non-greedy paths.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Recent Experiments */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Recent Experiments
            </h2>
            <button
              onClick={() => onNavigate('experiments')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View all ({experiments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono">
              Loading experiment records...
            </div>
          ) : experiments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No experiments created yet.</p>
              <p className="text-[11px] text-slate-500">
                Launch a preset or create a custom experiment to begin training.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {experiments.slice(0, 5).map((exp) => (
                <div
                  key={exp.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/20 px-2 rounded-lg transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200">{exp.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          exp.status === 'running'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : exp.status === 'paused'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            : exp.status === 'completed'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                      <span>{exp.algorithm}</span>
                      <span>•</span>
                      <span>
                        {exp.current_timesteps.toLocaleString()} / {exp.total_timesteps.toLocaleString()} steps
                      </span>
                      <span>•</span>
                      <span>{exp.env_config.width}x{exp.env_config.height} Grid</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onSelectExperiment(exp);
                        onNavigate('training');
                      }}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                    >
                      Training
                    </button>
                    <button
                      onClick={() => {
                        onSelectExperiment(exp);
                        onNavigate('sim_lab');
                      }}
                      className="px-2.5 py-1 text-xs rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 transition-all cursor-pointer"
                    >
                      Sim Lab
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
