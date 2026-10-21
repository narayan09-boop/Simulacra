import React, { useState } from 'react';
import { X, Sparkles, Sliders, Play, PlusCircle } from 'lucide-react';
import { EnvironmentConfig, Hyperparameters, Experiment } from '../types';
import { createExperiment } from '../services/api';

interface NewExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExperimentCreated: (exp: Experiment) => void;
  initialEnvConfig?: EnvironmentConfig | null;
}

export const NewExperimentModal: React.FC<NewExperimentModalProps> = ({
  isOpen,
  onClose,
  onExperimentCreated,
  initialEnvConfig
}) => {
  const [name, setName] = useState('PPO Navigation Benchmark');
  const [description, setDescription] = useState('Spatial navigation with obstacle avoidance');
  const [totalTimesteps, setTotalTimesteps] = useState(5000);
  const [seed, setSeed] = useState(42);

  // Environment Config
  const [width, setWidth] = useState(initialEnvConfig?.width || 10);
  const [height, setHeight] = useState(initialEnvConfig?.height || 10);
  const [density, setDensity] = useState(initialEnvConfig?.obstacle_density ?? 0.15);
  const [maxSteps, setMaxSteps] = useState(initialEnvConfig?.max_steps || 100);

  // Hyperparameters
  const [lr, setLr] = useState(0.0003);
  const [nSteps, setNSteps] = useState(128);
  const [batchSize, setBatchSize] = useState(32);
  const [nEpochs, setNEpochs] = useState(4);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const exp = await createExperiment({
        name,
        description,
        algorithm: 'PPO',
        env_id: 'VisualNavigation-v0',
        env_config: {
          width,
          height,
          obstacles: initialEnvConfig?.obstacles || null,
          obstacle_density: density,
          max_steps: maxSteps,
          goal_reward: 10.0,
          step_penalty: -0.05,
          collision_penalty: -0.5,
          progress_reward_weight: 1.0
        },
        hyperparameters: {
          learning_rate: lr,
          n_steps: nSteps,
          batch_size: batchSize,
          n_epochs: nEpochs,
          gamma: 0.99,
          gae_lambda: 0.95,
          clip_range: 0.2,
          ent_coef: 0.01,
          vf_coef: 0.5,
          max_grad_norm: 0.5
        },
        seed,
        total_timesteps: totalTimesteps
      });

      onExperimentCreated(exp);
      onClose();
    } catch (err) {
      console.error('Failed to create experiment', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Configure New RL Experiment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* General */}
          <div className="space-y-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Experiment Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          {/* Grid Environment Specs */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">
              Environment Specification
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Grid Size (WxH)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Obstacle Density ({Math.round(density * 100)}%)</label>
                <input
                  type="range"
                  min={0.0}
                  max={0.4}
                  step={0.05}
                  value={density}
                  onChange={(e) => setDensity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 mt-2"
                />
              </div>
            </div>
          </div>

          {/* PPO Hyperparameters */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider block font-bold">
              PPO Hyperparameters & Budget
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Total Timestep Budget</label>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={totalTimesteps}
                  onChange={(e) => setTotalTimesteps(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Random Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Learning Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lr}
                  onChange={(e) => setLr(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Rollout Steps (n_steps)</label>
                <input
                  type="number"
                  value={nSteps}
                  onChange={(e) => setNSteps(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 shadow-md shadow-cyan-950/40 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Initializing...' : 'Create & Launch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
