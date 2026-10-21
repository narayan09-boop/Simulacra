import React from 'react';
import {
  Compass,
  PlaySquare,
  Cpu,
  Database,
  GitCompare,
  Grid,
  BookOpen,
  Wifi,
  WifiOff,
  Plus,
  Layers,
  ChevronRight
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
  experiments: Experiment[];
  onSelectExperiment: (exp: Experiment) => void;
  onNewExperimentClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  connectionStatus,
  latency,
  activeExperiment,
  experiments,
  onSelectExperiment,
  onNewExperimentClick
}) => {
  const navSections = [
    {
      label: 'WORKSPACE',
      items: [
        { id: 'overview' as NavTab, label: 'Overview', icon: Compass },
        { id: 'sim_lab' as NavTab, label: 'Simulation Lab', icon: PlaySquare },
        { id: 'training' as NavTab, label: 'Training Center', icon: Cpu },
      ]
    },
    {
      label: 'RESEARCH & DATA',
      items: [
        { id: 'experiments' as NavTab, label: 'Experiments', icon: Database },
        { id: 'comparison' as NavTab, label: 'Policy Comparison', icon: GitCompare },
      ]
    },
    {
      label: 'CONFIGURATION',
      items: [
        { id: 'builder' as NavTab, label: 'Environment Builder', icon: Grid },
        { id: 'docs' as NavTab, label: 'Documentation', icon: BookOpen },
      ]
    }
  ];

  const currentTabLabel =
    navSections.flatMap((s) => s.items).find((i) => i.id === currentTab)?.label || 'Overview';

  return (
    <>
      {/* Left Sidebar */}
      <aside className="w-60 bg-[#1E211F] border-r border-[#383E38] flex flex-col justify-between select-none shrink-0 h-screen sticky top-0">
        <div className="flex flex-col">
          {/* Logo / Header */}
          <div className="px-5 py-4 border-b border-[#383E38]">
            <div className="flex items-center space-x-2.5">
              <div className="w-5 h-5 bg-[#A8C9A5] rounded-[3px] flex items-center justify-center text-[#171918] font-bold text-xs">
                S
              </div>
              <span className="font-mono tracking-wider font-semibold text-sm text-[#F0EEE7]">
                SIMULACRA
              </span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#252A26] text-[#A6ADA4] border border-[#383E38]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-[#777F77] font-mono mt-1">
              AI Simulation & RL Lab
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-5">
            {navSections.map((section) => (
              <div key={section.label} className="space-y-1">
                <div className="px-2.5 pb-1 text-[9px] font-mono uppercase tracking-widest text-[#777F77]">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors duration-100 ${
                        isActive
                          ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold border-l-2 border-[#A8C9A5]'
                          : 'text-[#A6ADA4] hover:text-[#F0EEE7] hover:bg-[#252A26]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#A8C9A5]' : 'text-[#777F77]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Active Experiment & Connection Status */}
        <div className="p-3 border-t border-[#383E38] bg-[#171918]/60 space-y-2">
          {/* Active Exp Indicator */}
          {activeExperiment && (
            <div className="p-2 rounded-[4px] bg-[#252A26] border border-[#383E38] text-[11px]">
              <div className="flex items-center justify-between text-[#777F77] text-[9px] font-mono uppercase tracking-wider mb-0.5">
                <span>Active Context</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeExperiment.status === 'running'
                      ? 'bg-[#86A98A]'
                      : activeExperiment.status === 'paused'
                      ? 'bg-[#D6B16C]'
                      : 'bg-[#777F77]'
                  }`}
                />
              </div>
              <div className="font-medium text-[#F0EEE7] truncate">
                {activeExperiment.name}
              </div>
              <div className="text-[10px] text-[#A6ADA4] font-mono mt-0.5">
                {activeExperiment.current_timesteps.toLocaleString()} / {activeExperiment.total_timesteps.toLocaleString()} steps
              </div>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[#A6ADA4]">
            <div className="flex items-center space-x-1.5">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 text-[#86A98A]" />
                  <span className="text-[#86A98A]">Telemetry Online</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Wifi className="w-3 h-3 text-[#D6B16C] animate-pulse" />
                  <span className="text-[#D6B16C]">Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-[#CB817B]" />
                  <span className="text-[#CB817B]">Disconnected</span>
                </>
              )}
            </div>
            {latency > 0 && connectionStatus === 'connected' && (
              <span className="text-[#777F77]">{latency}ms</span>
            )}
          </div>
        </div>
      </aside>

      {/* Top Application Bar */}
      <header className="h-12 bg-[#1E211F] border-b border-[#383E38] flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Breadcrumb Context */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#777F77] font-mono">SIMULACRA</span>
          <ChevronRight className="w-3 h-3 text-[#4A5149]" />
          <span className="text-[#F0EEE7] font-medium">{currentTabLabel}</span>
        </div>

        {/* Experiment Context Switcher & New Experiment Button */}
        <div className="flex items-center space-x-3">
          {experiments.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[10px] font-mono uppercase text-[#777F77] hidden sm:inline">
                Selected Run:
              </span>
              <select
                value={activeExperiment?.id || ''}
                onChange={(e) => {
                  const found = experiments.find((exp) => exp.id === e.target.value);
                  if (found) onSelectExperiment(found);
                }}
                className="bg-[#252A26] border border-[#383E38] rounded-[4px] px-2.5 py-1 text-xs text-[#F0EEE7] font-mono focus:outline-none focus:border-[#A8C9A5]"
              >
                {experiments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} ({exp.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onNewExperimentClick}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors duration-100 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Experiment</span>
          </button>
        </div>
      </header>
    </>
  );
};
