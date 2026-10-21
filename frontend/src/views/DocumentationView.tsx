import React from 'react';
import {
  BookOpen,
  Compass,
  Cpu,
  Layers,
  Terminal,
  Zap,
  CheckCircle2
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Editorial Header */}
      <div className="border-b border-[#383E38] pb-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#777F77] mb-1">
          TECHNICAL SPECIFICATION & RESEARCH NOTES
        </div>
        <h1 className="text-xl font-semibold text-[#F0EEE7] tracking-tight">
          SIMULACRA Reinforcement Learning Architecture & Formulation
        </h1>
        <p className="text-xs text-[#A6ADA4] mt-1 leading-relaxed">
          Comprehensive specification of the Gymnasium environment contracts, potential-based reward shaping theorems, and reproducibility guarantees implemented across SIMULACRA.
        </p>
      </div>

      {/* Section 1: Potential-Based Reward Shaping */}
      <section className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#383E38] pb-2.5">
          <Zap className="w-4 h-4 text-[#D6BD88]" />
          <h2 className="text-xs font-semibold text-[#F0EEE7] uppercase font-mono tracking-wider">
            1. Potential-Based Reward Shaping (Ng et al., 1999)
          </h2>
        </div>

        <p className="text-xs text-[#A6ADA4] leading-relaxed">
          Standard distance heuristics often introduce positive reward loops, encouraging agents to oscillate back and forth (reward hacking). To prevent this, SIMULACRA implements mathematically proven <strong>Potential-Based Reward Shaping</strong>:
        </p>

        <div className="p-4 rounded-[3px] bg-[#171918] border border-[#383E38] font-mono text-xs text-[#A8C9A5] space-y-1.5">
          <div className="text-[#777F77]">// Reward Function Decomposition:</div>
          <div>R(s, a, s') = R_base(s, a, s') + F(s, s')</div>
          <div className="text-[#777F77]">// Potential Function Formulation:</div>
          <div>Φ(s) = - EuclideanDistance(agent_pos, goal_pos)</div>
          <div>F(s, s') = w_progress * (Φ(s') - Φ(s)) = w_progress * (Dist(s) - Dist(s'))</div>
        </div>

        <p className="text-xs text-[#777F77] leading-relaxed">
          <strong>Theorem (Policy Invariance):</strong> Any policy π* optimal under R(s, a, s') + F(s, s') is strictly identical to the optimal policy under R_base(s, a, s'). The shaping accelerates gradient updates without altering the true shortest-path objective.
        </p>
      </section>

      {/* Section 2: Environment Contracts */}
      <section className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#383E38] pb-2.5">
          <Compass className="w-4 h-4 text-[#A8C9A5]" />
          <h2 className="text-xs font-semibold text-[#F0EEE7] uppercase font-mono tracking-wider">
            2. Gymnasium Environment Contracts (`VisualNavigation-v0`)
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <h3 className="font-semibold text-[#F0EEE7]">Observation Space: Box(11,) in [-1.0, 1.0]</h3>
          <p className="text-[#A6ADA4]">
            The state representation is strictly normalized, providing invariant scale across grid dimensions:
          </p>

          <div className="overflow-x-auto rounded-[3px] border border-[#383E38] font-mono text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-[#171918] text-[#777F77] border-b border-[#383E38]">
                <tr>
                  <th className="p-2">Index</th>
                  <th className="p-2">Feature Name</th>
                  <th className="p-2">Normalized Bounds</th>
                  <th className="p-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#383E38] text-[#A6ADA4]">
                <tr>
                  <td className="p-2 text-[#A8C9A5]">[0, 1]</td>
                  <td className="p-2 text-[#F0EEE7]">agent_x, agent_y</td>
                  <td className="p-2">[0.0, 1.0]</td>
                  <td className="p-2 text-[#777F77]">Normalized agent coordinates</td>
                </tr>
                <tr>
                  <td className="p-2 text-[#A8C9A5]">[2, 3]</td>
                  <td className="p-2 text-[#F0EEE7]">goal_x, goal_y</td>
                  <td className="p-2">[0.0, 1.0]</td>
                  <td className="p-2 text-[#777F77]">Normalized target beacon coordinates</td>
                </tr>
                <tr>
                  <td className="p-2 text-[#A8C9A5]">[4, 5]</td>
                  <td className="p-2 text-[#F0EEE7]">delta_x, delta_y</td>
                  <td className="p-2">[-1.0, 1.0]</td>
                  <td className="p-2 text-[#777F77]">Relative displacement vector (goal - agent)</td>
                </tr>
                <tr>
                  <td className="p-2 text-[#A8C9A5]">[6]</td>
                  <td className="p-2 text-[#F0EEE7]">norm_distance</td>
                  <td className="p-2">[0.0, 1.0]</td>
                  <td className="p-2 text-[#777F77]">Euclidean distance / max diagonal</td>
                </tr>
                <tr>
                  <td className="p-2 text-[#A8C9A5]">[7-10]</td>
                  <td className="p-2 text-[#F0EEE7]">obstacle raycasts</td>
                  <td className="p-2">&#123;0.0, 1.0&#125;</td>
                  <td className="p-2 text-[#777F77]">1-step proximity: UP, DOWN, LEFT, RIGHT</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold text-[#F0EEE7] pt-2">Action Space: Discrete(4)</h3>
          <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
            <div className="p-2 rounded-[2px] bg-[#171918] border border-[#383E38]">0: UP (y - 1)</div>
            <div className="p-2 rounded-[2px] bg-[#171918] border border-[#383E38]">1: DOWN (y + 1)</div>
            <div className="p-2 rounded-[2px] bg-[#171918] border border-[#383E38]">2: LEFT (x - 1)</div>
            <div className="p-2 rounded-[2px] bg-[#171918] border border-[#383E38]">3: RIGHT (x + 1)</div>
          </div>
        </div>
      </section>

      {/* Section 3: Reproducibility Protocol */}
      <section className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#383E38] pb-2.5">
          <Cpu className="w-4 h-4 text-[#91AFC4]" />
          <h2 className="text-xs font-semibold text-[#F0EEE7] uppercase font-mono tracking-wider">
            3. Reproducibility & Evaluation Isolation Protocol
          </h2>
        </div>

        <ul className="space-y-2 text-xs text-[#A6ADA4] list-disc pl-4 leading-relaxed">
          <li>
            <strong className="text-[#F0EEE7]">Separation of Training & Evaluation Seeds:</strong> Training rollouts utilize the experiment seed, while benchmarking runs execute on distinct evaluation seeds (e.g. 500, 1000). Evaluation episodes are strictly prevented from leaking into policy training data.
          </li>
          <li>
            <strong className="text-[#F0EEE7]">Deterministic Heuristic Ceiling:</strong> The $A^*$ shortest-path heuristic computes the optimal trajectory under Manhattan distance, establishing a mathematical ceiling against which learned policies can be measured.
          </li>
          <li>
            <strong className="text-[#F0EEE7]">Atomic Checkpoint Serialization:</strong> Weights are stored as PyTorch/SB3 `.zip` archives with metadata JSON capturing Python/NumPy/Torch RNG states and exact hyperparameters for 100% reproducible reproduction.
          </li>
        </ul>
      </section>
    </div>
  );
};
