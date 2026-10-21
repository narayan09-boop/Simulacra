import React from 'react';
import {
  Activity,
  PlayCircle,
  Cpu,
  FolderGit2,
  GitCompare,
  Grid,
  BookOpen,
  Wifi,
  WifiOff,
  Radio
} from 'lucide-react';
import { ConnectionStatus } from '../services/websocket';
import { Experiment } from '../types';

export type NavTab =
  | 'overview'
  | 'sim_lab'
  | 'training'
  | 'experiments'
  | 'comparison'
  | 'builder'
  | 'docs';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  connectionStatus: ConnectionStatus;
  latency: number;
  activeExperiment: Experiment | null;
  onNewExperimentClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  connectionStatus,
  latency,
  activeExperiment,
  onNewExperimentClick
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'sim_lab', label: 'Simulation Lab', icon: PlayCircle },
    { id: 'training', label: 'Training Center', icon: Cpu },
    { id: 'experiments', label: 'Experiments', icon: FolderGit2 },
    { id: 'comparison', label: 'Policy Comparison', icon: GitCompare },
    { id: 'builder', label: 'Environment Builder', icon: Grid },
    { id: 'docs', label: 'Documentation', icon: BookOpen },
  ] as const;

  return (
    <header className="bg-slate-950/90 backdrop-blur border-b border-slate-800/80 sticky top-0 z-50 px-5 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono tracking-widest text-sm font-bold text-slate-100 uppercase">
                SIMULACRA
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans tracking-tight">
              Interactive AI Simulation & Reinforcement Learning Lab
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Active Exp & Telemetry Status */}
        <div className="flex items-center space-x-3">
          {activeExperiment && (
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-mono text-slate-500">Exp:</span>
              <span className="text-slate-200 font-medium truncate max-w-[120px]">
                {activeExperiment.name}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  activeExperiment.status === 'running'
                    ? 'bg-emerald-400 animate-pulse'
                    : activeExperiment.status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
            </div>
          )}

          {/* Connection Status Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live</span>
                {latency > 0 && (
                  <span className="text-slate-500 text-[10px] border-l border-slate-800 pl-1.5">
                    {latency}ms
                  </span>
                )}
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">Connecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Offline</span>
              </>
            )}
          </div>

          {/* New Experiment CTA */}
          <button
            onClick={onNewExperimentClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-md shadow-cyan-950/40 transition-all duration-150 cursor-pointer"
          >
            <span>+ New Experiment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
