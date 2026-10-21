import React, { useState } from 'react';
import {
  GitCompare,
  Play,
  RotateCcw,
  Award,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { Experiment, PolicyComparisonResponse, SimulationSnapshot } from '../types';
import { comparePolicies, previewEnvironment } from '../services/api';
import { SimulationCanvas } from '../components/SimulationCanvas';

interface PolicyComparisonViewProps {
  activeExperiment: Experiment | null;
  experiments: Experiment[];
}

export const PolicyComparisonView: React.FC<PolicyComparisonViewProps> = ({
  activeExperiment,
  experiments
}) => {
  const [selectedExpId, setSelectedExpId] = useState<string>(activeExperiment?.id || (experiments[0]?.id || ''));
  const [numEpisodes, setNumEpisodes] = useState(10);
  const [evalSeed, setEvalSeed] = useState(500);
  const [loading, setLoading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<PolicyComparisonResponse | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<SimulationSnapshot | null>(null);

  const selectedExp = experiments.find((e) => e.id === selectedExpId) || activeExperiment;

  const handleRunComparison = async () => {
    setLoading(true);
    try {
      const envCfg = selectedExp?.env_config || {
        width: 10,
        height: 10,
        obstacle_density: 0.15,
        max_steps: 60
      };

      // 1. Fetch base env snapshot for canvas rendering
      const snap = await previewEnvironment(envCfg, evalSeed);
      setPreviewSnapshot(snap);

      // 2. Run multi-policy evaluation on identical seeds
      const res = await comparePolicies({
        experiment_id: selectedExpId || undefined,
        policies: ['ppo', 'heuristic', 'random'],
        num_episodes: numEpisodes,
        seed: evalSeed,
        env_config: envCfg
      });

      setComparisonResults(res);
    } catch (e) {
      console.error('Failed to run comparison', e);
    } finally {
      setLoading(false);
    }
  };

  // Trajectories to pass to canvas
  const comparisonTrajectories = comparisonResults
    ? comparisonResults.results.map((r) => {
        let color = '#06b6d4'; // Cyan for PPO
        if (r.policy_name.includes('Heuristic')) color = '#10b981'; // Emerald for A*
        if (r.policy_name.includes('Random')) color = '#f59e0b'; // Amber for Random
        return {
          name: r.policy_name,
          color,
          points: r.sample_trajectory
        };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Policy Comparison & Baselines</h1>
            <p className="text-xs text-slate-400">
              Benchmark trained PPO models against Heuristic (A*) and Random baselines under identical evaluation seeds.
            </p>
          </div>
        </div>

        {/* Experiment Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">Experiment:</span>
          <select
            value={selectedExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Benchmark Configuration Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-mono block">Evaluation Episodes:</label>
            <input
              type="number"
              min={1}
              max={50}
              value={numEpisodes}
              onChange={(e) => setNumEpisodes(Math.max(1, parseInt(e.target.value) || 10))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-white w-24 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-mono block">Controlled Test Seed:</label>
            <input
              type="number"
              value={evalSeed}
              onChange={(e) => setEvalSeed(parseInt(e.target.value) || 500)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-white w-28 font-mono"
            />
          </div>

          <div className="text-xs text-slate-500 self-end pb-1 font-mono">
            *Seeds ensure identical obstacle generation & starting state
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 cursor-pointer shadow-md shadow-cyan-950/40 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Policies...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Comparative Benchmark</span>
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trajectory Overlay Canvas */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase">
              Trajectory Overlay (Seed {evalSeed})
            </h3>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="w-full h-72 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
            <SimulationCanvas
              snapshot={previewSnapshot}
              comparisonTrajectories={comparisonTrajectories}
            />
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1 rounded bg-cyan-400" />
              <span className="text-slate-300">Cyan: PPO Learned Policy</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1 rounded bg-emerald-400" />
              <span className="text-slate-300">Emerald: Heuristic (A* Shortest Path)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1 rounded bg-amber-400" />
              <span className="text-slate-300">Amber: Uniform Random Baseline</span>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Benchmark Results Table */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase">
              Statistical Evaluation Metrics ({numEpisodes} episodes)
            </h3>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>

          {!comparisonResults ? (
            <div className="py-24 text-center text-xs text-slate-500 font-mono space-y-2">
              <GitCompare className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Click "Run Comparative Benchmark" to execute frozen policy evaluation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {comparisonResults.results.map((res) => (
                  <div
                    key={res.policy_name}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <span className="text-xs font-bold text-slate-200 block truncate">
                      {res.policy_name}
                    </span>
                    <div className="text-2xl font-bold font-mono text-cyan-400">
                      {(res.success_rate * 100).toFixed(0)}%
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Success Rate
                    </span>
                  </div>
                ))}
              </div>

              {/* Detailed Metrics Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Policy</th>
                      <th className="py-2.5 px-4">Success Rate</th>
                      <th className="py-2.5 px-4">Mean Return</th>
                      <th className="py-2.5 px-4">Return Std (σ)</th>
                      <th className="py-2.5 px-4">Mean Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {comparisonResults.results.map((r) => (
                      <tr key={r.policy_name} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-200">{r.policy_name}</td>
                        <td className="py-3 px-4 text-cyan-400 font-semibold">
                          {(r.success_rate * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-slate-300">{r.mean_return.toFixed(3)}</td>
                        <td className="py-3 px-4 text-slate-400">±{r.std_return.toFixed(3)}</td>
                        <td className="py-3 px-4 text-slate-300">{r.mean_length.toFixed(1)} steps</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
