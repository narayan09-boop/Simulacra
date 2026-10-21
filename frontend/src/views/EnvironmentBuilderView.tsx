import React, { useState, useEffect } from 'react';
import {
  Grid,
  PlaySquare,
  Plus,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { EnvironmentConfig, SimulationSnapshot } from '../types';
import { previewEnvironment } from '../services/api';
import { SimulationCanvas } from '../components/SimulationCanvas';

interface EnvironmentBuilderViewProps {
  onDeployToSimLab: (config: EnvironmentConfig) => void;
  onDeployToTraining: (config: EnvironmentConfig) => void;
}

export const EnvironmentBuilderView: React.FC<EnvironmentBuilderViewProps> = ({
  onDeployToSimLab,
  onDeployToTraining
}) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [maxSteps, setMaxSteps] = useState(60);
  const [goalReward, setGoalReward] = useState(10.0);
  const [stepPenalty, setStepPenalty] = useState(-0.05);
  const [collisionPenalty, setCollisionPenalty] = useState(-0.5);
  const [progressWeight, setProgressWeight] = useState(1.0);

  const [agentStart, setAgentStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [goalPos, setGoalPos] = useState<{ x: number; y: number }>({ x: 9, y: 9 });
  const [obstacles, setObstacles] = useState<{ x: number; y: number }[]>([]);

  const [activeTool, setActiveTool] = useState<'obstacle' | 'agent' | 'goal'>('obstacle');
  const [previewSnapshot, setPreviewSnapshot] = useState<SimulationSnapshot | null>(null);

  // Sync goal and obstacles if grid dimensions shrink
  useEffect(() => {
    setGoalPos((prev) => ({
      x: Math.min(prev.x, width - 1),
      y: Math.min(prev.y, height - 1)
    }));
    setAgentStart((prev) => ({
      x: Math.min(prev.x, width - 1),
      y: Math.min(prev.y, height - 1)
    }));
    setObstacles((prev) =>
      prev.filter((o) => o.x < width && o.y < height)
    );
  }, [width, height]);

  // Generate preview snapshot
  useEffect(() => {
    const cfg: EnvironmentConfig = {
      width,
      height,
      agent_start: agentStart,
      goal_pos: goalPos,
      obstacles: obstacles,
      obstacle_density: 0,
      max_steps: maxSteps,
      goal_reward: goalReward,
      step_penalty: stepPenalty,
      collision_penalty: collisionPenalty,
      progress_reward_weight: progressWeight
    };

    previewEnvironment(cfg, 42)
      .then((snap) => setPreviewSnapshot(snap))
      .catch((e) => console.error(e));
  }, [width, height, agentStart, goalPos, obstacles, maxSteps, goalReward, stepPenalty, collisionPenalty, progressWeight]);

  const handleCellClick = (x: number, y: number) => {
    if (activeTool === 'agent') {
      if (x === goalPos.x && y === goalPos.y) return;
      setAgentStart({ x, y });
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
    } else if (activeTool === 'goal') {
      if (x === agentStart.x && y === agentStart.y) return;
      setGoalPos({ x, y });
      setObstacles((prev) => prev.filter((o) => !(o.x === x && o.y === y)));
    } else if (activeTool === 'obstacle') {
      if ((x === agentStart.x && y === agentStart.y) || (x === goalPos.x && y === goalPos.y)) {
        return;
      }
      setObstacles((prev) => {
        const exists = prev.some((o) => o.x === x && o.y === y);
        if (exists) {
          return prev.filter((o) => !(o.x === x && o.y === y));
        } else {
          return [...prev, { x, y }];
        }
      });
    }
  };

  const handleProceduralGenerate = (density: number) => {
    const newObstacles: { x: number; y: number }[] = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        if ((x === agentStart.x && y === agentStart.y) || (x === goalPos.x && y === goalPos.y)) {
          continue;
        }
        if (Math.random() < density) {
          newObstacles.push({ x, y });
        }
      }
    }
    setObstacles(newObstacles);
  };

  const currentConfig: EnvironmentConfig = {
    width,
    height,
    agent_start: agentStart,
    goal_pos: goalPos,
    obstacles,
    obstacle_density: 0,
    max_steps: maxSteps,
    goal_reward: goalReward,
    step_penalty: stepPenalty,
    collision_penalty: collisionPenalty,
    progress_reward_weight: progressWeight
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#383E38] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#777F77] mb-1">
            ENVIRONMENT WORKBENCH / SPATIAL DESIGNER
          </div>
          <h1 className="text-xl font-semibold text-[#F0EEE7] tracking-tight">
            Environment Architecture & Reward Shaping Studio
          </h1>
          <p className="text-xs text-[#A6ADA4] mt-1">
            Interactively design custom obstacle maps, set initial coordinates, and configure potential based reward parameters.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDeployToSimLab(currentConfig)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] transition-colors"
          >
            <PlaySquare className="w-3.5 h-3.5 text-[#A8C9A5]" />
            <span>Test in Sim Lab</span>
          </button>
          <button
            onClick={() => onDeployToTraining(currentConfig)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deploy to Training</span>
          </button>
        </div>
      </div>

      {/* Studio Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Canvas Editor */}
        <div className="lg:col-span-2 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase text-[#777F77]">EDITOR TOOL:</span>
              <div className="flex items-center space-x-1 bg-[#171918] p-0.5 rounded-[3px] border border-[#383E38] text-xs font-mono">
                <button
                  onClick={() => setActiveTool('obstacle')}
                  className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                    activeTool === 'obstacle'
                      ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                      : 'text-[#777F77] hover:text-[#F0EEE7]'
                  }`}
                >
                  TOGGLE BARRIER (#)
                </button>
                <button
                  onClick={() => setActiveTool('agent')}
                  className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                    activeTool === 'agent'
                      ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                      : 'text-[#777F77] hover:text-[#F0EEE7]'
                  }`}
                >
                  SET AGENT (A)
                </button>
                <button
                  onClick={() => setActiveTool('goal')}
                  className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                    activeTool === 'goal'
                      ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                      : 'text-[#777F77] hover:text-[#F0EEE7]'
                  }`}
                >
                  SET GOAL (G)
                </button>
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#777F77]">
              Click cells in canvas to apply tool
            </span>
          </div>

          <div className="w-full h-96 bg-[#171918] rounded-[3px] overflow-hidden border border-[#383E38] relative">
            <SimulationCanvas
              snapshot={previewSnapshot}
              interactive={true}
              onCellClick={handleCellClick}
            />
          </div>

          {/* Quick Generators */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#383E38]">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-[#777F77] font-mono uppercase">PROCEDURAL FILL:</span>
              <button
                onClick={() => handleProceduralGenerate(0.1)}
                className="px-2 py-0.5 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A6ADA4] font-mono text-[10px]"
              >
                10% Light
              </button>
              <button
                onClick={() => handleProceduralGenerate(0.2)}
                className="px-2 py-0.5 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A6ADA4] font-mono text-[10px]"
              >
                20% Medium
              </button>
              <button
                onClick={() => handleProceduralGenerate(0.3)}
                className="px-2 py-0.5 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A6ADA4] font-mono text-[10px]"
              >
                30% Dense
              </button>
            </div>

            <button
              onClick={() => setObstacles([])}
              className="text-[#CB817B] hover:text-[#e09893] font-mono text-[10px] flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Barriers</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Parameters & Weights */}
        <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-4">
          <div className="border-b border-[#383E38] pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
              SPATIAL & REWARD PARAMETERS
            </span>
          </div>

          {/* Grid Dimensions */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Grid Width:</span>
                <span className="text-[#F0EEE7] font-medium tabular-nums">{width}</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="w-full accent-[#A8C9A5]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Grid Height:</span>
                <span className="text-[#F0EEE7] font-medium tabular-nums">{height}</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full accent-[#A8C9A5]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Max Episode Steps:</span>
                <span className="text-[#F0EEE7] font-medium tabular-nums">{maxSteps}</span>
              </div>
              <input
                type="range"
                min={15}
                max={200}
                value={maxSteps}
                onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                className="w-full accent-[#A8C9A5]"
              />
            </div>
          </div>

          {/* Reward Shaping Parameters */}
          <div className="pt-3 border-t border-[#383E38] space-y-3">
            <div className="text-[9px] font-mono text-[#777F77] uppercase tracking-wider">
              REWARD EQUATION COEFFICIENTS:
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Goal Terminal (+R_goal):</span>
                <span className="text-[#86A98A] font-medium tabular-nums">+{goalReward.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={goalReward}
                onChange={(e) => setGoalReward(parseFloat(e.target.value))}
                className="w-full accent-[#86A98A]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Step Penalty (Time cost):</span>
                <span className="text-[#CB817B] font-medium tabular-nums">{stepPenalty.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={-0.01}
                step={0.01}
                value={stepPenalty}
                onChange={(e) => setStepPenalty(parseFloat(e.target.value))}
                className="w-full accent-[#CB817B]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Collision Penalty:</span>
                <span className="text-[#CB817B] font-medium tabular-nums">{collisionPenalty.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-2.0}
                max={0.0}
                step={0.1}
                value={collisionPenalty}
                onChange={(e) => setCollisionPenalty(parseFloat(e.target.value))}
                className="w-full accent-[#CB817B]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#A6ADA4]">Progress Shaping Weight (w_Φ):</span>
                <span className="text-[#D6BD88] font-medium tabular-nums">{progressWeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={3.0}
                step={0.1}
                value={progressWeight}
                onChange={(e) => setProgressWeight(parseFloat(e.target.value))}
                className="w-full accent-[#D6BD88]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
