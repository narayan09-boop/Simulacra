import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, NavTab } from './components/Navigation';
import { OverviewView } from './views/OverviewView';
import { SimulationLabView } from './views/SimulationLabView';
import { TrainingCenterView } from './views/TrainingCenterView';
import { ExperimentsView } from './views/ExperimentsView';
import { PolicyComparisonView } from './views/PolicyComparisonView';
import { EnvironmentBuilderView } from './views/EnvironmentBuilderView';
import { DocumentationView } from './views/DocumentationView';
import { NewExperimentModal } from './components/NewExperimentModal';
import { Experiment, SimulationSnapshot, MetricPoint, EnvironmentConfig } from './types';
import { fetchExperiments, previewEnvironment } from './services/api';
import { useTelemetry } from './services/websocket';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);

  // Live WebSocket state
  const [liveSnapshot, setLiveSnapshot] = useState<SimulationSnapshot | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<MetricPoint[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialEnvConfigForModal, setInitialEnvConfigForModal] = useState<EnvironmentConfig | null>(null);

  // Load experiments on start
  const refreshExperiments = useCallback(async () => {
    try {
      const data = await fetchExperiments();
      setExperiments(data);
      if (!activeExperiment && data.length > 0) {
        setActiveExperiment(data[0]);
      } else if (activeExperiment) {
        const updated = data.find((e) => e.id === activeExperiment.id);
        if (updated) setActiveExperiment(updated);
      }
    } catch (e) {
      console.error('Failed to load experiments', e);
    }
  }, [activeExperiment]);

  useEffect(() => {
    refreshExperiments();
  }, [refreshExperiments]);

  // Telemetry Callbacks
  const handleSnapshot = useCallback((snap: SimulationSnapshot) => {
    setLiveSnapshot(snap);
  }, []);

  const handleMetric = useCallback((metric: any) => {
    setLiveMetrics((prev) => [...prev.slice(-300), metric]);
  }, []);

  const handleJobStatus = useCallback((statusData: { experiment_id: string; status: string }) => {
    setActiveExperiment((prev) => {
      if (prev && prev.id === statusData.experiment_id) {
        return { ...prev, status: statusData.status as any };
      }
      return prev;
    });
    refreshExperiments();
  }, [refreshExperiments]);

  const handleCheckpoint = useCallback((_data: any) => {
    refreshExperiments();
  }, [refreshExperiments]);

  // Hook into live WebSocket
  const { status: connectionStatus, lastLatency } = useTelemetry({
    experimentId: activeExperiment?.id,
    onSnapshot: handleSnapshot,
    onMetric: handleMetric,
    onJobStatus: handleJobStatus,
    onCheckpoint: handleCheckpoint
  });

  // Default initial snapshot if none exists
  useEffect(() => {
    if (!liveSnapshot) {
      const cfg = activeExperiment?.env_config || {
        width: 10,
        height: 10,
        obstacle_density: 0.15,
        max_steps: 100
      };
      previewEnvironment(cfg, 42).then((snap) => setLiveSnapshot(snap)).catch(() => null);
    }
  }, [activeExperiment, liveSnapshot]);

  const handleDeployToSimLab = (config: EnvironmentConfig) => {
    previewEnvironment(config, 42).then((snap) => {
      setLiveSnapshot(snap);
      setCurrentTab('sim_lab');
    });
  };

  const handleDeployToTraining = (config: EnvironmentConfig) => {
    setInitialEnvConfigForModal(config);
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#171918] text-[#F0EEE7]">
      {/* Workstation Sidebar */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        connectionStatus={connectionStatus}
        latency={lastLatency}
        activeExperiment={activeExperiment}
        experiments={experiments}
        onSelectExperiment={setActiveExperiment}
        onNewExperimentClick={() => {
          setInitialEnvConfigForModal(null);
          setIsModalOpen(true);
        }}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewView
              onNavigate={setCurrentTab}
              onSelectExperiment={setActiveExperiment}
              onNewExperimentModal={() => {
                setInitialEnvConfigForModal(null);
                setIsModalOpen(true);
              }}
            />
          )}

          {currentTab === 'sim_lab' && (
            <SimulationLabView
              activeExperiment={activeExperiment}
              liveSnapshot={liveSnapshot}
            />
          )}

          {currentTab === 'training' && (
            <TrainingCenterView
              activeExperiment={activeExperiment}
              liveSnapshot={liveSnapshot}
              liveMetrics={liveMetrics}
              onRefreshExperiment={refreshExperiments}
              onNavigateComparison={() => setCurrentTab('comparison')}
            />
          )}

          {currentTab === 'experiments' && (
            <ExperimentsView
              onSelectExperiment={setActiveExperiment}
              onNavigate={setCurrentTab}
              onNewExperimentModal={() => {
                setInitialEnvConfigForModal(null);
                setIsModalOpen(true);
              }}
            />
          )}

          {currentTab === 'comparison' && (
            <PolicyComparisonView
              activeExperiment={activeExperiment}
              experiments={experiments}
            />
          )}

          {currentTab === 'builder' && (
            <EnvironmentBuilderView
              onDeployToSimLab={handleDeployToSimLab}
              onDeployToTraining={handleDeployToTraining}
            />
          )}

          {currentTab === 'docs' && <DocumentationView />}
        </main>
      </div>

      {/* New Experiment Modal */}
      <NewExperimentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEnvConfig={initialEnvConfigForModal}
        onExperimentCreated={(newExp) => {
          setActiveExperiment(newExp);
          refreshExperiments();
          setCurrentTab('training');
        }}
      />
    </div>
  );
};

export default App;
