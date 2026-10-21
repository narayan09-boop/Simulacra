import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sliders,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Maximize2
} from 'lucide-react';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { SimulationSnapshot, Experiment } from '../types';
import { previewEnvironment, startManualSession, stepManualSession } from '../services/api';

interface SimulationLabViewProps {
  activeExperiment: Experiment | null;
  liveSnapshot: SimulationSnapshot | null;
}

export const SimulationLabView: React.FC<SimulationLabViewProps> = ({
  activeExperiment,
  liveSnapshot
}) => {
  const [mode, setMode] = useState<'stream' | 'manual'>('stream');
  const [manualSnapshot, setManualSnapshot] = useState<SimulationSnapshot | null>(null);
  const [manualSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [manualLoading, setManualLoading] = useState(false);

  // Initialize manual session on mount or switch
  const initManualSession = useCallback(async () => {
    try {
      setManualLoading(true);
      const cfg = activeExperiment?.env_config || {
        width: 10,
        height: 10,
        obstacle_density: 0.15,
        max_steps: 100
      };
      const snap = await startManualSession(manualSessionId, cfg, 42);
      setManualSnapshot(snap);
    } catch (e) {
      console.error('Failed to start manual session', e);
    } finally {
      setManualLoading(false);
    }
  }, [activeExperiment, manualSessionId]);

  useEffect(() => {
    if (mode === 'manual' && !manualSnapshot) {
      initManualSession();
    }
  }, [mode, manualSnapshot, initManualSession]);

  // Handle manual action
  const handleManualAction = async (action: number) => {
    if (mode !== 'manual') return;
    try {
      const snap = await stepManualSession(manualSessionId, action);
      setManualSnapshot(snap);
    } catch (e) {
      console.error('Manual step error', e);
    }
  };

  // Keyboard navigation listener in manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'manual') return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleManualAction(0);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleManualAction(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleManualAction(2);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleManualAction(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  const currentSnapshot = mode === 'manual' ? manualSnapshot : (liveSnapshot || manualSnapshot);

  return (
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setMode('stream')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                mode === 'stream'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Telemetry Feed
            </button>
            <button
              onClick={() => {
                setMode('manual');
                if (!manualSnapshot) initManualSession();
              }}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Pilot Mode
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>Grid: {currentSnapshot?.width || 10}x{currentSnapshot?.height || 10}</span>
            <span>•</span>
            <span>Obstacles: {currentSnapshot?.obstacles.length || 0}</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowTrajectory(!showTrajectory)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              showTrajectory
                ? 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Trail {showTrajectory ? 'On' : 'Off'}</span>
          </button>

          {mode === 'manual' && (
            <button
              onClick={initManualSession}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Env</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Simulation Canvas (2 cols) & Telemetry Inspector (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Simulation Canvas Box */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[500px]">
          <div className="relative flex-1 w-full min-h-[440px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 p-2">
            <SimulationCanvas
              snapshot={currentSnapshot}
              showTrajectory={showTrajectory}
              className="w-full h-full"
            />

            {/* Overlaid Status Banner */}
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              {currentSnapshot?.is_success ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 text-xs font-mono shadow-lg animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Goal Reached! (+{currentSnapshot.reward_components.goal})</span>
                </div>
              ) : currentSnapshot?.truncated ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-600/60 text-amber-300 text-xs font-mono shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Max Steps Truncation</span>
                </div>
              ) : null}
            </div>

            {/* Timestep Badge */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400">
              Step: <span className="text-white font-semibold">{currentSnapshot?.step_in_episode || 0}</span> / {activeExperiment?.env_config.max_steps || 100}
            </div>

            {/* Cumulative Return Badge */}
            <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400">
              Episode Return: <span className="text-cyan-400 font-semibold">{currentSnapshot?.cumulative_return ?? '0.00'}</span>
            </div>
          </div>

          {/* Manual Pilot D-Pad Controls if Manual Mode is Active */}
          {mode === 'manual' && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-200">Manual Pilot Controls:</span>
                <p className="text-[11px] text-slate-400">
                  Use keyboard <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">W</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">A</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">S</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px]">D</kbd> or the D-pad to step through genuine transition dynamics.
                </p>
              </div>

              {/* D-Pad Buttons */}
              <div className="grid grid-cols-3 gap-1.5 w-32">
                <div />
                <button
                  onClick={() => handleManualAction(0)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="UP (y - 1)"
                >
                  <ArrowUp className="w-4 h-4 text-cyan-400" />
                </button>
                <div />

                <button
                  onClick={() => handleManualAction(2)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="LEFT (x - 1)"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleManualAction(1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="DOWN (y + 1)"
                >
                  <ArrowDown className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleManualAction(3)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="RIGHT (x + 1)"
                >
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Telemetry & Reward Equation Inspector */}
        <div className="space-y-4">
          {/* Action & Reward Breakdown Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Step Telemetry & Reward
              </h3>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>

            {/* Current Action Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono">Last Action:</span>
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono font-bold text-xs">
                {currentSnapshot?.action_name === 'UP' && <ArrowUp className="w-3.5 h-3.5" />}
                {currentSnapshot?.action_name === 'DOWN' && <ArrowDown className="w-3.5 h-3.5" />}
                {currentSnapshot?.action_name === 'LEFT' && <ArrowLeft className="w-3.5 h-3.5" />}
                {currentSnapshot?.action_name === 'RIGHT' && <ArrowRight className="w-3.5 h-3.5" />}
                <span>{currentSnapshot?.action_name || 'NONE'}</span>
              </div>
            </div>

            {/* Inspectable Reward Equation Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Reward Equation Breakdown:
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Goal Terminal Reward:</span>
                  <span className={currentSnapshot?.reward_components.goal ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    +{currentSnapshot?.reward_components.goal?.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Step Time Penalty:</span>
                  <span className="text-rose-400">
                    {currentSnapshot?.reward_components.step?.toFixed(2) || '-0.05'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Collision Penalty:</span>
                  <span className={currentSnapshot?.reward_components.collision ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                    {currentSnapshot?.reward_components.collision?.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Progress Shaping (ΔΦ):</span>
                  <span className={(currentSnapshot?.reward_components.progress || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'}>
                    {(currentSnapshot?.reward_components.progress || 0) >= 0 ? '+' : ''}
                    {currentSnapshot?.reward_components.progress?.toFixed(3) || '0.000'}
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center font-bold">
                  <span className="text-slate-200">Total Step Reward:</span>
                  <span className={(currentSnapshot?.last_reward || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {currentSnapshot?.last_reward?.toFixed(3) || '0.000'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observation Space Vector Inspector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Observation Space (Box 11)
              </h3>
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/60">
                <span className="text-slate-400">Agent Pos (x, y):</span>
                <span className="text-cyan-400 font-bold">
                  [{currentSnapshot?.agent_pos[0]}, {currentSnapshot?.agent_pos[1]}]
                </span>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/60">
                <span className="text-slate-400">Goal Pos (x, y):</span>
                <span className="text-emerald-400 font-bold">
                  [{currentSnapshot?.goal_pos[0]}, {currentSnapshot?.goal_pos[1]}]
                </span>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800/60">
                <span className="text-slate-400">Goal Delta Vector:</span>
                <span className="text-slate-200">
                  [
                  {currentSnapshot ? (currentSnapshot.goal_pos[0] - currentSnapshot.agent_pos[0]) : 0},{' '}
                  {currentSnapshot ? (currentSnapshot.goal_pos[1] - currentSnapshot.agent_pos[1]) : 0}
                  ]
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800/60 space-y-1">
                <div className="text-[11px] text-slate-400">Proximity Sensors (1-step raycasts):</div>
                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="block text-slate-500">UP</span>
                    <span className="text-slate-200 font-bold">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] && y === currentSnapshot.agent_pos[1] - 1) || (currentSnapshot?.agent_pos[1] === 0) ? 'WALL' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="block text-slate-500">DOWN</span>
                    <span className="text-slate-200 font-bold">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] && y === currentSnapshot.agent_pos[1] + 1) || (currentSnapshot?.agent_pos[1] === (currentSnapshot?.height || 10) - 1) ? 'WALL' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="block text-slate-500">LEFT</span>
                    <span className="text-slate-200 font-bold">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] - 1 && y === currentSnapshot.agent_pos[1]) || (currentSnapshot?.agent_pos[0] === 0) ? 'WALL' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <span className="block text-slate-500">RIGHT</span>
                    <span className="text-slate-200 font-bold">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] + 1 && y === currentSnapshot.agent_pos[1]) || (currentSnapshot?.agent_pos[0] === (currentSnapshot?.width || 10) - 1) ? 'WALL' : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
