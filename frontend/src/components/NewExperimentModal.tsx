import React, { useState } from 'react';
import { X, Plus, Sliders, Play, Layers } from 'lucide-react';
import { EnvironmentConfig, Experiment } from '../types';
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-[1px] bg-[#A8C9A5]" />
            <h2 className="text-xs font-semibold text-[#F0EEE7] font-mono uppercase tracking-wider">
              CONFIGURE REINFORCEMENT LEARNING EXPERIMENT
            </h2>
          </div>
          <button onClick={onClose} className="text-[#777F77] hover:text-[#F0EEE7]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* General Parameters */}
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] text-[#A6ADA4] font-mono uppercase tracking-wider block mb-1">
                Experiment Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#171918] border border-[#383E38] rounded-[3px] px-2.5 py-1.5 text-[#F0EEE7] focus:outline-none focus:border-[#A8C9A5] font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#A6ADA4] font-mono uppercase tracking-wider block mb-1">
                Research Hypothesis / Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#171918] border border-[#383E38] rounded-[3px] px-2.5 py-1.5 text-[#F0EEE7] focus:outline-none focus:border-[#A8C9A5] font-mono"
              />
            </div>
          </div>

          {/* Grid Environment Specs */}
          <div className="p-3.5 rounded-[3px] bg-[#171918] border border-[#383E38] space-y-2.5">
            <span className="text-[9px] font-mono text-[#A8C9A5] uppercase tracking-wider block font-semibold">
              ENVIRONMENT CONFIGURATION
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">Dimensions (WxH)</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                  />
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">
                  Obstacle Density ({Math.round(density * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.0}
                  max={0.4}
                  step={0.05}
                  value={density}
                  onChange={(e) => setDensity(parseFloat(e.target.value))}
                  className="w-full accent-[#A8C9A5] mt-2"
                />
              </div>
            </div>
          </div>

          {/* PPO Hyperparameters */}
          <div className="p-3.5 rounded-[3px] bg-[#171918] border border-[#383E38] space-y-2.5">
            <span className="text-[9px] font-mono text-[#D6BD88] uppercase tracking-wider block font-semibold">
              PPO HYPERPARAMETERS & BUDGET
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">Timesteps Budget</label>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={totalTimesteps}
                  onChange={(e) => setTotalTimesteps(parseInt(e.target.value))}
                  className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">RNG Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value))}
                  className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">Learning Rate (lr)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lr}
                  onChange={(e) => setLr(parseFloat(e.target.value))}
                  className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#777F77] font-mono block mb-1">Rollout Steps (n_steps)</label>
                <input
                  type="number"
                  value={nSteps}
                  onChange={(e) => setNSteps(parseInt(e.target.value))}
                  className="w-full bg-[#1E211F] border border-[#383E38] rounded-[2px] px-2 py-1 text-[#F0EEE7] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-[#383E38]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-[3px] text-xs text-[#777F77] hover:text-[#F0EEE7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-[3px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <span>{loading ? 'Initializing Run...' : 'Launch Training Run'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
