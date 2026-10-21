import React from 'react';
import {
  BookOpen,
  Code,
  Layers,
  Sparkles,
  CheckCircle2,
  Cpu,
  Compass,
  Zap
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono uppercase">
          <BookOpen className="w-4 h-4" />
          <span>Scientific Computing & Reinforcement Learning Specification</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          SIMULACRA Research Lab Architecture & Mathematics
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          This document details the reinforcement learning formulation, Gymnasium environment contracts, potential-based reward shaping theory, and reproducibility guarantees implemented in SIMULACRA.
        </p>
      </div>

      {/* Section 1: Potential-Based Reward Shaping */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono">
            1. Potential-Based Reward Shaping (Ng et al., 1999)
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Standard distance heuristics often introduce positive reward cycles, causing agents to oscillate back and forth (reward hacking). To prevent this, SIMULACRA implements mathematically proven <strong>Potential-Based Reward Shaping</strong>:
        </p>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 space-y-2">
          <div className="text-slate-400">// Reward Equation:</div>
          <div>R(s, a, s') = R_base(s, a, s') + F(s, s')</div>
          <div className="text-slate-400">// Potential Function:</div>
          <div>Φ(s) = - EuclideanDistance(agent_pos, goal_pos)</div>
          <div>F(s, s') = w_progress * (Φ(s') - Φ(s)) = w_progress * (Dist(s) - Dist(s'))</div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          <strong>Theorem (Policy Invariance):</strong> Any policy π* optimal under R(s, a, s') + F(s, s') is strictly identical to the optimal policy under R_base(s, a, s'). The shaping accelerates gradient updates without altering the true shortest-path objective.
        </p>
      </div>

      {/* Section 2: Observation & Action Spaces */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono">
            2. Gymnasium Environment Contracts
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <h3 className="font-semibold text-slate-200">Observation Space: Box(11,) in [-1.0, 1.0]</h3>
          <p className="text-slate-400">
            The state representation is strictly normalized, providing invariant scale across grid dimensions:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-2.5">Index</th>
                  <th className="p-2.5">Feature</th>
                  <th className="p-2.5">Normalized Range</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="p-2.5 text-cyan-400">[0, 1]</td>
                  <td className="p-2.5">agent_x, agent_y</td>
                  <td className="p-2.5">[0.0, 1.0]</td>
                  <td className="p-2.5 text-slate-400">Current agent grid coordinates</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-cyan-400">[2, 3]</td>
                  <td className="p-2.5">goal_x, goal_y</td>
                  <td className="p-2.5">[0.0, 1.0]</td>
                  <td className="p-2.5 text-slate-400">Target beacon grid coordinates</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-cyan-400">[4, 5]</td>
                  <td className="p-2.5">delta_x, delta_y</td>
                  <td className="p-2.5">[-1.0, 1.0]</td>
                  <td className="p-2.5 text-slate-400">Relative displacement vector (goal - agent)</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-cyan-400">[6]</td>
                  <td className="p-2.5">norm_distance</td>
                  <td className="p-2.5">[0.0, 1.0]</td>
                  <td className="p-2.5 text-slate-400">Euclidean distance / max diagonal</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-cyan-400">[7-10]</td>
                  <td className="p-2.5">obstacle raycasts</td>
                  <td className="p-2.5">&#123;0.0, 1.0&#125;</td>
                  <td className="p-2.5 text-slate-400">1-step boundary/obstacle proximity: UP, DOWN, LEFT, RIGHT</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold text-slate-200 pt-2">Action Space: Discrete(4)</h3>
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">0: UP (y - 1)</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">1: DOWN (y + 1)</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">2: LEFT (x - 1)</div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">3: RIGHT (x + 1)</div>
          </div>
        </div>
      </div>

      {/* Section 3: Reproducibility & Seeding */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase font-mono">
            3. Reproducibility Protocol & Evaluation Isolation
          </h2>
        </div>

        <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
          <li>
            <strong>Independent Seed Strategy:</strong> Training runs use experiment seeds (e.g. 42), while policy benchmarks use explicitly controlled evaluation seeds (e.g. 1000, 1001...). Evaluation episodes are strictly prevented from leaking into training rollouts.
          </li>
          <li>
            <strong>Deterministic Baselines:</strong> The Heuristic A* baseline computes the optimal shortest path under Manhattan distance, guaranteeing an empirical performance ceiling for each environment.
          </li>
          <li>
            <strong>Model Versioning:</strong> Checkpoints are saved as PyTorch / Stable-Baselines3 zip archives with metadata JSON describing hyperparameter configurations, timestamps, and git hashes.
          </li>
        </ul>
      </div>
    </div>
  );
};
