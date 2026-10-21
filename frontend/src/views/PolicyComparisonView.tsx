import React, { useState } from 'react';
import {
  GitCompare,
  Play,
  Layers,
  Award,
  Clock,
  Sliders,
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

  // Trajectories with consistent scientific colors
  const comparisonTrajectories = comparisonResults
    ? comparisonResults.results.map((r) => {
        let color = '#A8C9A5'; // Muted Sage for PPO
        if (r.policy_name.includes('Heuristic')) color = '#D6BD88'; // Warm Brass for A*
        if (r.policy_name.includes('Random')) color = '#91AFC4'; // Slate Blue for Random
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
      <div className="border-b border-[#383E38] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#777F77] mb-1">
            BENCHMARK ARENA / POLICY EVALUATION
          </div>
          <h1 className="text-xl font-semibold text-[#F0EEE7] tracking-tight">
            Policy Comparison & Empirical Baselines
          </h1>
          <p className="text-xs text-[#A6ADA4] mt-1">
            Benchmark trained neural network policies against deterministic $A^*$ and random baselines on identical test seeds.
          </p>
        </div>

        {/* Experiment Run Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#777F77] font-mono">Trained Run:</span>
          <select
            value={selectedExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="bg-[#1E211F] border border-[#383E38] rounded-[4px] px-2.5 py-1 text-xs text-[#F0EEE7] font-mono focus:outline-none focus:border-[#A8C9A5]"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Benchmark Controls Bar */}
      <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-0.5">
            <label className="text-[9px] text-[#777F77] font-mono uppercase tracking-wider block">
              Evaluation Sample Size:
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={numEpisodes}
              onChange={(e) => setNumEpisodes(Math.max(1, parseInt(e.target.value) || 10))}
              className="bg-[#171918] border border-[#383E38] rounded-[3px] px-2 py-0.5 text-xs text-[#F0EEE7] w-20 font-mono"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] text-[#777F77] font-mono uppercase tracking-wider block">
              Controlled Test Seed:
            </label>
            <input
              type="number"
              value={evalSeed}
              onChange={(e) => setEvalSeed(parseInt(e.target.value) || 500)}
              className="bg-[#171918] border border-[#383E38] rounded-[3px] px-2 py-0.5 text-xs text-[#F0EEE7] w-24 font-mono"
            />
          </div>

          <div className="text-[10px] text-[#777F77] font-mono self-end pb-0.5">
            *Fixed seeds ensure identical obstacle coordinates and start/goal positions.
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] cursor-pointer disabled:opacity-50 transition-colors"
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

      {/* Results Arena: Multi-Trajectory Visual Overlay & Statistical Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Trajectory Overlay */}
        <div className="lg:col-span-1 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
              TRAJECTORY OVERLAY (SEED {evalSeed})
            </span>
            <Layers className="w-3.5 h-3.5 text-[#777F77]" />
          </div>

          <div className="w-full h-72 bg-[#171918] rounded-[3px] overflow-hidden border border-[#383E38] relative">
            <SimulationCanvas
              snapshot={previewSnapshot}
              comparisonTrajectories={comparisonTrajectories}
            />
          </div>

          {/* Color Legend */}
          <div className="space-y-1.5 pt-2 border-t border-[#383E38] text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-1 rounded-[1px] bg-[#A8C9A5]" />
              <span className="text-[#A6ADA4]">PPO Learned Policy (Sage)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-1 rounded-[1px] bg-[#D6BD88]" />
              <span className="text-[#A6ADA4]">Heuristic A* Optimal (Brass)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-1 rounded-[1px] bg-[#91AFC4]" />
              <span className="text-[#A6ADA4]">Uniform Random Baseline (Slate)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Statistical Table */}
        <div className="lg:col-span-2 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
              STATISTICAL EVALUATION METRICS ({numEpisodes} EPISODES)
            </span>
            <Award className="w-3.5 h-3.5 text-[#777F77]" />
          </div>

          {!comparisonResults ? (
            <div className="py-24 text-center text-xs text-[#777F77] font-mono space-y-1">
              <GitCompare className="w-6 h-6 mx-auto text-[#4A5149]" />
              <p>Click "Run Comparative Benchmark" to execute evaluation under test seed {evalSeed}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {comparisonResults.results.map((res) => (
                  <div
                    key={res.policy_name}
                    className="p-3 rounded-[3px] bg-[#171918] border border-[#383E38] space-y-1"
                  >
                    <span className="text-[11px] font-medium text-[#F0EEE7] block truncate">
                      {res.policy_name}
                    </span>
                    <div className="text-xl font-mono font-medium text-[#A8C9A5] tabular-nums">
                      {(res.success_rate * 100).toFixed(0)}%
                    </div>
                    <span className="text-[9px] text-[#777F77] uppercase font-mono block">
                      Success Rate
                    </span>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-[3px] border border-[#383E38]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#171918] text-[#777F77] font-mono uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Policy Candidate</th>
                      <th className="py-2 px-3">Success Rate</th>
                      <th className="py-2 px-3">Mean Return</th>
                      <th className="py-2 px-3">Std Dev (σ)</th>
                      <th className="py-2 px-3">Mean Episode Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383E38] font-mono text-[11px]">
                    {comparisonResults.results.map((r) => (
                      <tr key={r.policy_name} className="hover:bg-[#252A26]">
                        <td className="py-2.5 px-3 font-medium text-[#F0EEE7]">{r.policy_name}</td>
                        <td className="py-2.5 px-3 text-[#A8C9A5] tabular-nums">
                          {(r.success_rate * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-[#F0EEE7] tabular-nums">{r.mean_return.toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-[#777F77] tabular-nums">±{r.std_return.toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-[#A6ADA4] tabular-nums">{r.mean_length.toFixed(1)} steps</td>
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
