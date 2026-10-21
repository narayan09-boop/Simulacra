import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Search,
  Download,
  Trash2,
  PlayCircle,
  Cpu,
  Clock,
  Code,
  X,
  FileJson,
  CheckCircle2
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
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-teal-950 border border-teal-800/60 text-teal-400">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Experiment Repository</h1>
            <p className="text-xs text-slate-400">
              Persistent, versioned records of simulation runs, seeds, checkpoints, and evaluations.
            </p>
          </div>
        </div>

        <button
          onClick={onNewExperimentModal}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 cursor-pointer shadow-md shadow-cyan-950/40"
        >
          <span>+ New Experiment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search experiments by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          {['all', 'running', 'completed', 'paused', 'created'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Experiment List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono">
            Loading experiments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No matching experiments found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Experiment Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timesteps</th>
                <th className="py-3 px-4">Grid Setup</th>
                <th className="py-3 px-4">Checkpoints</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/30 transition-all">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-200 block">{exp.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs block">
                      {exp.id}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                        exp.status === 'running'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : exp.status === 'paused'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : exp.status === 'completed'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-300">
                    {exp.current_timesteps.toLocaleString()} / {exp.total_timesteps.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {exp.env_config.width}x{exp.env_config.height} Grid (obs: {exp.env_config.obstacle_density * 100}%)
                  </td>

                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {exp.checkpoints.length} saved
                  </td>

                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedForDetails(exp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="View JSON Details"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleExport(exp.id, exp.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                        title="Export JSON for Reproduction"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('training');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
                      >
                        Train
                      </button>

                      <button
                        onClick={() => {
                          onSelectExperiment(exp);
                          onNavigate('sim_lab');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-medium border border-cyan-800/60"
                      >
                        Sim Lab
                      </button>

                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                        title="Delete Experiment"
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

      {/* Details Modal */}
      {selectedForDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileJson className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  {selectedForDetails.name} — Specification
                </h3>
              </div>
              <button
                onClick={() => setSelectedForDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300">
              <pre>{JSON.stringify(selectedForDetails, null, 2)}</pre>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleExport(selectedForDetails.id, selectedForDetails.name)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Reproduction JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
