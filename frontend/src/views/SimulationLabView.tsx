import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Cpu,
  Layers,
  Terminal
} from 'lucide-react';
import { SimulationCanvas } from '../components/SimulationCanvas';
import { SimulationSnapshot, Experiment } from '../types';
import { startManualSession, stepManualSession } from '../services/api';

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

  // Initialize manual session on demand
  const initManualSession = useCallback(async () => {
    try {
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
    }
  }, [activeExperiment, manualSessionId]);

  useEffect(() => {
    if (mode === 'manual' && !manualSnapshot) {
      initManualSession();
    }
  }, [mode, manualSnapshot, initManualSession]);

  const handleManualAction = async (action: number) => {
    if (mode !== 'manual') return;
    try {
      const snap = await stepManualSession(manualSessionId, action);
      setManualSnapshot(snap);
    } catch (e) {
      console.error('Manual step error', e);
    }
  };

  // Keyboard navigation for manual pilot
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
      {/* Top Workstation Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1E211F] border border-[#383E38] p-3 rounded-[4px]">
        <div className="flex items-center space-x-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#171918] p-0.5 rounded-[4px] border border-[#383E38] text-xs font-mono">
            <button
              onClick={() => setMode('stream')}
              className={`px-3 py-1 rounded-[3px] transition-colors ${
                mode === 'stream'
                  ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                  : 'text-[#777F77] hover:text-[#F0EEE7]'
              }`}
            >
              LIVE TELEMETRY
            </button>
            <button
              onClick={() => {
                setMode('manual');
                if (!manualSnapshot) initManualSession();
              }}
              className={`px-3 py-1 rounded-[3px] transition-colors ${
                mode === 'manual'
                  ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                  : 'text-[#777F77] hover:text-[#F0EEE7]'
              }`}
            >
              MANUAL PILOT
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-[#777F77] font-mono">
            <span>Dimensions: {currentSnapshot?.width || 10}x{currentSnapshot?.height || 10}</span>
            <span>•</span>
            <span>Obstacles: {currentSnapshot?.obstacles.length || 0}</span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setShowTrajectory(!showTrajectory)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] border font-mono transition-colors ${
              showTrajectory
                ? 'bg-[#2C382D] border-[#A8C9A5] text-[#A8C9A5]'
                : 'bg-[#171918] border-[#383E38] text-[#777F77]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Trail {showTrajectory ? 'ON' : 'OFF'}</span>
          </button>

          {mode === 'manual' && (
            <button
              onClick={initManualSession}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-[4px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] font-mono transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-[#A6ADA4]" />
              <span>Reset State</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Simulation Instrument (2 cols) & Telemetry Inspector (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Simulation Canvas Instrument */}
        <div className="lg:col-span-2 bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 flex flex-col justify-between min-h-[500px]">
          <div className="relative flex-1 w-full min-h-[440px] rounded-[3px] overflow-hidden bg-[#171918] border border-[#383E38] p-2 flex items-center justify-center">
            <SimulationCanvas
              snapshot={currentSnapshot}
              showTrajectory={showTrajectory}
              className="w-full h-full"
            />

            {/* Overlaid Status Indicators */}
            <div className="absolute top-3 left-3 flex items-center space-x-2">
              {currentSnapshot?.is_success ? (
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-[3px] bg-[#2C382D] border border-[#86A98A] text-[#86A98A] text-[11px] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TARGET REACHED (+{currentSnapshot.reward_components.goal})</span>
                </div>
              ) : currentSnapshot?.truncated ? (
                <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-[3px] bg-[#3A3324] border border-[#D6B16C] text-[#D6B16C] text-[11px] font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>MAX STEPS REACHED</span>
                </div>
              ) : null}
            </div>

            {/* Timestep & Cumulative Return Badges */}
            <div className="absolute bottom-3 left-3 bg-[#1E211F]/90 px-2 py-0.5 rounded-[3px] border border-[#383E38] text-[10px] font-mono text-[#A6ADA4]">
              Step: <span className="text-[#F0EEE7] font-semibold">{currentSnapshot?.step_in_episode || 0}</span> / {activeExperiment?.env_config.max_steps || 100}
            </div>

            <div className="absolute bottom-3 right-3 bg-[#1E211F]/90 px-2 py-0.5 rounded-[3px] border border-[#383E38] text-[10px] font-mono text-[#A6ADA4]">
              Episode Return: <span className="text-[#D6BD88] font-semibold tabular-nums">{currentSnapshot?.cumulative_return ?? '0.00'}</span>
            </div>
          </div>

          {/* Manual Pilot D-Pad */}
          {mode === 'manual' && (
            <div className="mt-4 p-3.5 rounded-[3px] bg-[#171918] border border-[#383E38] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#A6ADA4] space-y-0.5">
                <span className="font-semibold text-[#F0EEE7] font-mono text-xs">MANUAL CONTROL INTERFACE:</span>
                <p className="text-[11px] text-[#777F77]">
                  Use keyboard <kbd className="px-1 py-0.2 rounded bg-[#252A26] text-[#A8C9A5] font-mono text-[10px] border border-[#383E38]">W</kbd> <kbd className="px-1 py-0.2 rounded bg-[#252A26] text-[#A8C9A5] font-mono text-[10px] border border-[#383E38]">A</kbd> <kbd className="px-1 py-0.2 rounded bg-[#252A26] text-[#A8C9A5] font-mono text-[10px] border border-[#383E38]">S</kbd> <kbd className="px-1 py-0.2 rounded bg-[#252A26] text-[#A8C9A5] font-mono text-[10px] border border-[#383E38]">D</kbd> or the D-pad to test transitions and collisions.
                </p>
              </div>

              {/* D-Pad Buttons */}
              <div className="grid grid-cols-3 gap-1 w-28">
                <div />
                <button
                  onClick={() => handleManualAction(0)}
                  className="p-1.5 rounded-[3px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] flex items-center justify-center transition-colors cursor-pointer"
                  title="UP (y - 1)"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#A8C9A5]" />
                </button>
                <div />

                <button
                  onClick={() => handleManualAction(2)}
                  className="p-1.5 rounded-[3px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] flex items-center justify-center transition-colors cursor-pointer"
                  title="LEFT (x - 1)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#A8C9A5]" />
                </button>
                <button
                  onClick={() => handleManualAction(1)}
                  className="p-1.5 rounded-[3px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] flex items-center justify-center transition-colors cursor-pointer"
                  title="DOWN (y + 1)"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-[#A8C9A5]" />
                </button>
                <button
                  onClick={() => handleManualAction(3)}
                  className="p-1.5 rounded-[3px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] border border-[#383E38] flex items-center justify-center transition-colors cursor-pointer"
                  title="RIGHT (x + 1)"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#A8C9A5]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Technical Observation & Reward Equation Inspector */}
        <div className="space-y-4">
          {/* Action & Reward Breakdown Card */}
          <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
                STEP TELEMETRY & REWARD
              </span>
              <Terminal className="w-3.5 h-3.5 text-[#777F77]" />
            </div>

            {/* Current Action Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-[3px] bg-[#171918] border border-[#383E38]">
              <span className="text-xs text-[#777F77] font-mono">Last Executed Action:</span>
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-[3px] bg-[#252A26] text-[#A8C9A5] border border-[#383E38] font-mono font-medium text-xs">
                {currentSnapshot?.action_name === 'UP' && <ArrowUp className="w-3 h-3" />}
                {currentSnapshot?.action_name === 'DOWN' && <ArrowDown className="w-3 h-3" />}
                {currentSnapshot?.action_name === 'LEFT' && <ArrowLeft className="w-3 h-3" />}
                {currentSnapshot?.action_name === 'RIGHT' && <ArrowRight className="w-3 h-3" />}
                <span>{currentSnapshot?.action_name || 'NONE'}</span>
              </div>
            </div>

            {/* Inspectable Reward Equation Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="text-[9px] font-mono text-[#777F77] uppercase tracking-wider">
                REWARD EQUATION DECOMPOSITION:
              </div>

              <div className="space-y-1.5 p-3 rounded-[3px] bg-[#171918] border border-[#383E38] font-mono text-[11px]">
                <div className="flex justify-between items-center text-[#A6ADA4]">
                  <span>Goal Terminal (R_goal):</span>
                  <span className={currentSnapshot?.reward_components.goal ? 'text-[#86A98A] font-medium' : 'text-[#777F77]'}>
                    +{currentSnapshot?.reward_components.goal?.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#A6ADA4]">
                  <span>Step Cost (R_step):</span>
                  <span className="text-[#CB817B]">
                    {currentSnapshot?.reward_components.step?.toFixed(2) || '-0.05'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#A6ADA4]">
                  <span>Collision Penalty (R_coll):</span>
                  <span className={currentSnapshot?.reward_components.collision ? 'text-[#CB817B] font-medium' : 'text-[#777F77]'}>
                    {currentSnapshot?.reward_components.collision?.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#A6ADA4]">
                  <span>Progress Shaping (ΔΦ):</span>
                  <span className={(currentSnapshot?.reward_components.progress || 0) >= 0 ? 'text-[#A8C9A5]' : 'text-[#D6B16C]'}>
                    {(currentSnapshot?.reward_components.progress || 0) >= 0 ? '+' : ''}
                    {currentSnapshot?.reward_components.progress?.toFixed(3) || '0.000'}
                  </span>
                </div>

                <div className="border-t border-[#383E38] pt-1.5 flex justify-between items-center font-medium">
                  <span className="text-[#F0EEE7]">Step Return (R_t):</span>
                  <span className={(currentSnapshot?.last_reward || 0) >= 0 ? 'text-[#86A98A]' : 'text-[#CB817B]'}>
                    {currentSnapshot?.last_reward?.toFixed(3) || '0.000'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observation Space Vector Inspector */}
          <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777F77]">
                OBSERVATION VECTOR (BOX 11)
              </span>
              <Compass className="w-3.5 h-3.5 text-[#777F77]" />
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-1.5 rounded-[3px] bg-[#171918] border border-[#383E38]">
                <span className="text-[#777F77]">Agent Position [x, y]:</span>
                <span className="text-[#D6BD88] font-medium">
                  [{currentSnapshot?.agent_pos[0]}, {currentSnapshot?.agent_pos[1]}]
                </span>
              </div>

              <div className="flex justify-between p-1.5 rounded-[3px] bg-[#171918] border border-[#383E38]">
                <span className="text-[#777F77]">Goal Position [x, y]:</span>
                <span className="text-[#86A98A] font-medium">
                  [{currentSnapshot?.goal_pos[0]}, {currentSnapshot?.goal_pos[1]}]
                </span>
              </div>

              <div className="flex justify-between p-1.5 rounded-[3px] bg-[#171918] border border-[#383E38]">
                <span className="text-[#777F77]">Displacement Vector [Δx, Δy]:</span>
                <span className="text-[#F0EEE7]">
                  [
                  {currentSnapshot ? (currentSnapshot.goal_pos[0] - currentSnapshot.agent_pos[0]) : 0},{' '}
                  {currentSnapshot ? (currentSnapshot.goal_pos[1] - currentSnapshot.agent_pos[1]) : 0}
                  ]
                </span>
              </div>

              <div className="p-2 rounded-[3px] bg-[#171918] border border-[#383E38] space-y-1">
                <div className="text-[9px] text-[#777F77] uppercase tracking-wider">Proximity Sensors (1-step raycasts):</div>
                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className="p-1 rounded-[2px] bg-[#252A26] border border-[#383E38]">
                    <span className="block text-[#777F77]">UP</span>
                    <span className="text-[#F0EEE7]">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] && y === currentSnapshot.agent_pos[1] - 1) || (currentSnapshot?.agent_pos[1] === 0) ? 'BLOCKED' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded-[2px] bg-[#252A26] border border-[#383E38]">
                    <span className="block text-[#777F77]">DOWN</span>
                    <span className="text-[#F0EEE7]">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] && y === currentSnapshot.agent_pos[1] + 1) || (currentSnapshot?.agent_pos[1] === (currentSnapshot?.height || 10) - 1) ? 'BLOCKED' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded-[2px] bg-[#252A26] border border-[#383E38]">
                    <span className="block text-[#777F77]">LEFT</span>
                    <span className="text-[#F0EEE7]">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] - 1 && y === currentSnapshot.agent_pos[1]) || (currentSnapshot?.agent_pos[0] === 0) ? 'BLOCKED' : 'FREE'}
                    </span>
                  </div>
                  <div className="p-1 rounded-[2px] bg-[#252A26] border border-[#383E38]">
                    <span className="block text-[#777F77]">RIGHT</span>
                    <span className="text-[#F0EEE7]">
                      {currentSnapshot?.obstacles.some(([x, y]) => x === currentSnapshot.agent_pos[0] + 1 && y === currentSnapshot.agent_pos[1]) || (currentSnapshot?.agent_pos[0] === (currentSnapshot?.width || 10) - 1) ? 'BLOCKED' : 'FREE'}
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
