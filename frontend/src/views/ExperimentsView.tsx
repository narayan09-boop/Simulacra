import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Download,
  Trash2,
  Code,
  X,
  FileJson,
  PlaySquare,
  Cpu
} from 'lucide-react';
import { Experiment } from '../types';
import { fetchExperiments, deleteExperiment, exportExperiment } from '../services/api';
import { NavTab } from '../components/Navigation';

interface ExperimentsViewProps {
  onSelectExperiment: (exp: Experiment) => void;
  onNavigate: (tab: NavTab) => void;
  onNewExperimentModal: () => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  onSelectExperiment,
  onNavigate,
  onNewExperimentModal
}) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedForDetails, setSelectedForDetails] = useState<Experiment | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchExperiments();
      setExperiments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experiment and its checkpoints?')) return;
    try {
      await deleteExperiment(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async (id: string, name: string) => {
    try {
      const data = await exportExperiment(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulacra_experiment_${name.toLowerCase().replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export experiment', e);
    }
  };

  const filtered = experiments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#383E38] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#777F77] mb-1">
            RESEARCH DATASET / EXPERIMENT REGISTRY
          </div>
          <h1 className="text-xl font-semibold text-[#F0EEE7] tracking-tight">
            Experiment Archive & Reproducibility Database
          </h1>
          <p className="text-xs text-[#A6ADA4] mt-1">
            Versioned records of policy checkpoints, hyperparameters, seeds, and training curves.
          </p>
        </div>

        <button
          onClick={onNewExperimentModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918] transition-colors cursor-pointer"
        >
          <span>+ New Experiment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#777F77] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter experiments by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1E211F] border border-[#383E38] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#F0EEE7] placeholder-[#777F77] focus:outline-none focus:border-[#A8C9A5] font-mono"
          />
        </div>

        <div className="flex items-center space-x-1 bg-[#1E211F] p-0.5 rounded-[4px] border border-[#383E38] text-xs font-mono">
          {['all', 'running', 'completed', 'paused', 'created'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-[3px] uppercase tracking-wider text-[10px] transition-colors ${
                statusFilter === st
                  ? 'bg-[#2C382D] text-[#A8C9A5] font-semibold'
                  : 'text-[#777F77] hover:text-[#F0EEE7]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Experiment Technical Data Table */}
      <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#777F77] font-mono">
            Loading database records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#777F77] font-mono space-y-1">
            <Database className="w-6 h-6 mx-auto text-[#4A5149]" />
            <p>No matching experiments found in database.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#171918] border-b border-[#383E38] text-[#777F77] font-mono uppercase text-[9px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Experiment Identifier & Name</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Timesteps</th>
                <th className="py-2.5 px-3.5">Environment Grid</th>
                <th className="py-2.5 px-3.5">Checkpoints</th>
                <th className="py-2.5 px-3.5">Created</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#383E38] font-sans">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#252A26] transition-colors">
                  <td className="py-2.5 px-3.5">
                    <span className="font-medium text-[#F0EEE7] block">{exp.name}</span>
                    <span className="text-[10px] text-[#777F77] font-mono truncate max-w-xs block">
                      {exp.id}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5">
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-medium ${
                        exp.status === 'running'
                          ? 'bg-[#2C382D] text-[#86A98A] border border-[#86A98A]/50'
                          : exp.status === 'paused'
                          ? 'bg-[#3A3324] text-[#D6B16C] border border-[#D6B16C]/50'
                          : exp.status === 'completed'
                          ? 'bg-[#22292E] text-[#91AFC4] border border-[#91AFC4]/50'
                          : 'bg-[#252A26] text-[#777F77]'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>

                  <td className="py-2.5 px-3.5 font-mono text-[#F0EEE7] tabular-nums">
                    {exp.current_timesteps.toLocaleString()} / {exp.total_timesteps.toLocaleString()}
                  </td>

                  <td className="py-2.5 px-3.5 font-mono text-[#A6ADA4] text-[11px]">
                    {exp.env_config.width}x{exp.env_config.height} Grid (obs: {Math.round(exp.env_config.obstacle_density * 100)}%)
                  </td>

                  <td className="py-2.5 px-3.5 text-[#A6ADA4] font-mono">
                    {exp.checkpoints.length} saved
                  </td>

                  <td className="py-2.5 px-3.5 text-[#777F77] text-[10px] font-mono">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </td>

                  <td className="py-2.5 px-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => setSelectedForDetails(exp)}
                        className="p-1 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A6ADA4]"
                        title="Inspect Raw Specification"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleExport(exp.id, exp.name)}
                        className="p-1 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#A8C9A5]"
                        title="Download Reproduction JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('training');
                        }}
                        className="px-2 py-0.5 rounded-[2px] bg-[#252A26] hover:bg-[#2B302B] text-[#F0EEE7] font-mono text-[11px]"
                      >
                        Train
                      </button>

                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('sim_lab');
                        }}
                        className="px-2 py-0.5 rounded-[2px] bg-[#2C382D] hover:bg-[#344436] text-[#A8C9A5] font-mono text-[11px] border border-[#383E38]"
                      >
                        Sim
                      </button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 rounded-[2px] bg-[#252A26] hover:bg-[#3A2424] text-[#777F77] hover:text-[#CB817B]"
                        title="Delete Run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* JSON Specification Modal */}
      {selectedForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1E211F] border border-[#383E38] rounded-[4px] max-w-2xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#383E38] pb-2.5">
              <div className="flex items-center space-x-2">
                <FileJson className="w-4 h-4 text-[#A8C9A5]" />
                <h3 className="text-xs font-semibold text-[#F0EEE7] font-mono">
                  {selectedForDetails.name}: Specification
                </h3>
              </div>
              <button
                onClick={() => setSelectedForDetails(null)}
                className="text-[#777F77] hover:text-[#F0EEE7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#171918] p-3 rounded-[3px] border border-[#383E38] text-[11px] font-mono text-[#A8C9A5]">
              <pre>{JSON.stringify(selectedForDetails, null, 2)}</pre>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#383E38]">
              <button
                onClick={() => handleExport(selectedForDetails.id, selectedForDetails.name)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-[3px] text-xs font-medium bg-[#A8C9A5] hover:bg-[#BED7B9] text-[#171918]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Reproduction JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
