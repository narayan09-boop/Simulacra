import React, { useEffect, useState } from 'react';
import {
  Compass,
  Cpu,
  Layers,
  ArrowRight,
  Server,
  PlaySquare,
  Database,
  Sliders,
  CheckCircle2,
  Clock
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
        description: `Reference benchmark (${w}x${h} grid, ${steps} steps budget)`,
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
        seed: 42,
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
      {/* Editorial Header Section */}
      <div className="border-b border-[#383E38] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#777F77] mb-1">
            RESEARCH WORKSTATION / OVERVIEW
          </div>
          <h1 className="text-xl font-semibold text-[#F0EEE7] tracking-tight">
            Spatial Navigation & Reinforcement Learning Lab
          </h1>
          <p className="text-xs text-[#A6ADA4] mt-1 max-w-2xl">
            Empirical platform for evaluating policy optimization dynamics, observing spatial reasoning in real time, and benchmarking autonomous agents under verified seeds.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('sim_lab')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] transition-colors"
          >
            <PlaySquare className="w-3.5 h-3.5 text-[#A8C9A5]" />
            <span>Open Simulation</span>
          </button>
          <button
            onClick={onNewExperimentModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors"
          >
            <span>+ Create Run</span>
          </button>
        </div>
      </div>

      {/* Hardware & Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[4px] bg-[#1E211F] border border-[#383E38]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#777F77]">
            Active Jobs
          </div>
          <div className="text-2xl font-mono font-medium text-[#F0EEE7] mt-1 tabular-nums">
            {activeJobs.length}
          </div>
          <div className="text-[10px] text-[#A6ADA4] font-mono mt-1">
            {activeJobs.length > 0 ? 'Background workers active' : 'All training workers idle'}
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] bg-[#1E211F] border border-[#383E38]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#777F77]">
            Saved Benchmarks
          </div>
          <div className="text-2xl font-mono font-medium text-[#F0EEE7] mt-1 tabular-nums">
            {experiments.length}
          </div>
          <div className="text-[10px] text-[#A6ADA4] font-mono mt-1">
            {completedJobs.length} completed evaluation runs
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] bg-[#1E211F] border border-[#383E38]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#777F77]">
            Compute Target
          </div>
          <div className="text-2xl font-mono font-medium text-[#A8C9A5] mt-1 uppercase">
            {health?.system.device || 'CPU'}
          </div>
          <div className="text-[10px] text-[#A6ADA4] font-mono mt-1 truncate">
            PyTorch {health?.system.torch_version || '2.x'} ({health?.system.cpu_count || 4} threads)
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] bg-[#1E211F] border border-[#383E38]">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#777F77]">
            Framework Stack
          </div>
          <div className="text-2xl font-mono font-medium text-[#D6BD88] mt-1">
            SB3 2.9
          </div>
          <div className="text-[10px] text-[#A6ADA4] font-mono mt-1 truncate">
            Gymnasium v{health?.system.gymnasium_version || '0.29'}
          </div>
        </div>
      </div>

      {/* Main Grid: Reference Benchmarks & Experiment Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Standard Reference Presets */}
        <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#777F77]">
                STANDARD BENCHMARK PRESETS
              </span>
              <Sliders className="w-3.5 h-3.5 text-[#777F77]" />
            </div>

            <p className="text-xs text-[#A6ADA4] mb-3">
              Curated navigation environments calibrated with potential based progress rewards:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleQuickPreset('Standard Navigation 8x8', 8, 8, 0.12, 3000)}
                className="w-full text-left p-3 rounded-[3px] bg-[#171918] border border-[#383E38] hover:border-[#A8C9A5] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F0EEE7]">
                    Standard Navigation (8x8)
                  </span>
                  <span className="text-[10px] font-mono text-[#A8C9A5]">
                    3,000 steps
                  </span>
                </div>
                <p className="text-[11px] text-[#777F77] mt-1 font-mono">
                  8x8 grid • 12% obstacle density • Fast convergence
                </p>
              </button>

              <button
                onClick={() => handleQuickPreset('Obstacle Course 12x12', 12, 12, 0.22, 6000)}
                className="w-full text-left p-3 rounded-[3px] bg-[#171918] border border-[#383E38] hover:border-[#A8C9A5] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F0EEE7]">
                    Obstacle Course (12x12)
                  </span>
                  <span className="text-[10px] font-mono text-[#A8C9A5]">
                    6,000 steps
                  </span>
                </div>
                <p className="text-[11px] text-[#777F77] mt-1 font-mono">
                  12x12 grid • 22% density • Spatial detour testing
                </p>
              </button>

              <button
                onClick={() => handleQuickPreset('Dense Maze 15x15', 15, 15, 0.28, 10000)}
                className="w-full text-left p-3 rounded-[3px] bg-[#171918] border border-[#383E38] hover:border-[#A8C9A5] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F0EEE7]">
                    Dense Maze (15x15)
                  </span>
                  <span className="text-[10px] font-mono text-[#A8C9A5]">
                    10,000 steps
                  </span>
                </div>
                <p className="text-[11px] text-[#777F77] mt-1 font-mono">
                  15x15 grid • 28% density • Deep value estimation
                </p>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-[#383E38] text-[10px] text-[#777F77] font-mono">
            *All presets guarantee path reachability via BFS flood fill.
          </div>
        </div>

        {/* Right: Experiment Registry Table */}
        <div className="lg:col-span-2 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#777F77]">
                RECENT EXPERIMENT RUNS
              </span>
              <button
                onClick={() => onNavigate('experiments')}
                className="text-xs font-mono text-[#A8C9A5] hover:text-[#BED7B9] flex items-center space-x-1"
              >
                <span>View All ({experiments.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs font-mono text-[#777F77]">
                Retrieving experiment records...
              </div>
            ) : experiments.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#777F77] space-y-1">
                <Database className="w-6 h-6 mx-auto text-[#4A5149]" />
                <p>No experiment records in database.</p>
                <p className="text-[11px] text-[#777F77]">Launch a preset or create a custom run to begin.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#383E38]/80 text-xs">
                {experiments.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="py-2.5 flex items-center justify-between hover:bg-[#252A26] px-2 rounded-[3px] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-[#F0EEE7]">{exp.name}</span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                            exp.status === 'running'
                              ? 'bg-[#2C382D] text-[#86A98A] border border-[#4A5149]'
                              : exp.status === 'paused'
                              ? 'bg-[#3A3324] text-[#D6B16C] border border-[#524833]'
                              : exp.status === 'completed'
                              ? 'bg-[#22292E] text-[#91AFC4] border border-[#333E46]'
                              : 'bg-[#252A26] text-[#777F77]'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#777F77] font-mono flex items-center space-x-2">
                        <span>{exp.algorithm}</span>
                        <span>•</span>
                        <span>
                          {exp.current_timesteps.toLocaleString()} / {exp.total_timesteps.toLocaleString()} steps
                        </span>
                        <span>•</span>
                        <span>{exp.env_config.width}x{exp.env_config.height} Grid</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('training');
                        }}
                        className="px-2 py-1 text-xs rounded-[3px] bg-[#252A26] hover:bg-[#2B302B] text-[#A6ADA4] border border-[#383E38]"
                      >
                        Train
                      </button>
                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('sim_lab');
                        }}
                        className="px-2 py-1 text-xs rounded-[3px] bg-[#2C382D] hover:bg-[#344436] text-[#A8C9A5] border border-[#383E38]"
                      >
                        Simulate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#383E38] text-[10px] text-[#777F77] font-mono flex justify-between">
            <span>Database: SQLite 3 (`simulacra.db`)</span>
            <span>All checkpoints stored atomically</span>
          </div>
        </div>
      </div>
    </div>
  );
};
