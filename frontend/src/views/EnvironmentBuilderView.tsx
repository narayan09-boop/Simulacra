import React, { useState, useEffect } from 'react';
import {
  Grid,
  Sliders,
  PlayCircle,
  PlusCircle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { EnvironmentConfig, SimulationSnapshot } from '../types';
import { previewEnvironment } from '../services/api';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { NavTab } from '../components/Navigation';

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

  // Sync goal if grid dimensions shrink
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

  // Generate preview snapshot whenever environment definition changes
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
    const totalCells = width * height;
    const targetCount = Math.floor(totalCells * density);
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-teal-950 border border-teal-800/60 text-teal-400">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Interactive Environment Builder</h1>
            <p className="text-xs text-slate-400">
              Visually design custom obstacle terrains, set coordinates, and calibrate potential reward weights.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDeployToSimLab(currentConfig)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 transition-all cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Test in Sim Lab</span>
          </button>
          <button
            onClick={() => onDeployToTraining(currentConfig)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 transition-all cursor-pointer shadow-md shadow-cyan-950/40"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Train Agent on this World</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas (2 cols) & Configuration Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Canvas */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">Active Tool:</span>
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTool('obstacle')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeTool === 'obstacle'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Toggle Obstacle (#)
                </button>
                <button
                  onClick={() => setActiveTool('agent')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeTool === 'agent'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Place Agent (A)
                </button>
                <button
                  onClick={() => setActiveTool('goal')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    activeTool === 'goal'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Place Goal (G)
                </button>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Click any cell in the canvas to apply tool
            </span>
          </div>

          <div className="w-full h-96 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
            <SimulationCanvas
              snapshot={previewSnapshot}
              interactive={true}
              onCellClick={handleCellClick}
            />
          </div>

          {/* Quick Generators */}
          <div className="flex items-center justify-between text-xs pt-2">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-mono">Random Obstacle Fill:</span>
              <button
                onClick={() => handleProceduralGenerate(0.1)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                10% Light
              </button>
              <button
                onClick={() => handleProceduralGenerate(0.2)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                20% Medium
              </button>
              <button
                onClick={() => handleProceduralGenerate(0.3)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                30% Dense
              </button>
            </div>

            <button
              onClick={() => setObstacles([])}
              className="text-rose-400 hover:text-rose-300 font-mono text-[11px]"
            >
              Clear All Obstacles
            </button>
          </div>
        </div>

        {/* Right: Dimension & Reward Shaping Controls */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Environment Parameters
            </h3>
          </div>

          {/* Grid Dimensions */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Grid Width:</span>
                <span className="text-cyan-400 font-bold">{width}</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Grid Height:</span>
                <span className="text-cyan-400 font-bold">{height}</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Max Episode Steps:</span>
                <span className="text-cyan-400 font-bold">{maxSteps}</span>
              </div>
              <input
                type="range"
                min={15}
                max={200}
                value={maxSteps}
                onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Reward Shaping Parameters */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Reward Function Weights:
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Goal Terminal Reward:</span>
                <span className="text-emerald-400 font-bold">+{goalReward.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={goalReward}
                onChange={(e) => setGoalReward(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Step Penalty (Time cost):</span>
                <span className="text-rose-400 font-bold">{stepPenalty.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={-0.01}
                step={0.01}
                value={stepPenalty}
                onChange={(e) => setStepPenalty(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Collision Penalty:</span>
                <span className="text-rose-500 font-bold">{collisionPenalty.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-2.0}
                max={0.0}
                step={0.1}
                value={collisionPenalty}
                onChange={(e) => setCollisionPenalty(parseFloat(e.target.value))}
                className="w-full accent-rose-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Potential Progress (ΔΦ) Weight:</span>
                <span className="text-cyan-400 font-bold">{progressWeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={3.0}
                step={0.1}
                value={progressWeight}
                onChange={(e) => setProgressWeight(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
