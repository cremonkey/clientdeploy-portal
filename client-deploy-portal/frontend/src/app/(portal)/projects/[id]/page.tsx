'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsApi } from '@/lib/api';
import { echo } from '@/lib/echo';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  Rocket, 
  Terminal as TerminalIcon, 
  Settings, 
  Globe, 
  History, 
  Info,
  ExternalLink,
  Github,
  Copy,
  AlertCircle,
  RotateCcw,
  Shield,
  Box,
  XCircle,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  CheckCircle2,
  Trash2,
  RefreshCw,
  GitBranch
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { TerminalLogs } from '@/components/ui/TerminalLogs';

interface ProjectDetail {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  type: string;
  framework: string | null;
  repository_url: string | null;
  repository_branch: string;
  status: string;
  description: string | null;
  last_deployed_at: string | null;
  last_deployment_status: string | null;
  can_deploy: boolean;
  can_restart: boolean;
  domains: Array<{ id: number; domain: string; type: string; ssl_status: string }>;
  environment_variables?: Array<{ id: number; key: string; value: string; is_secret: boolean }>;
}

interface Dep {
  id: number;
  status: string;
  branch: string;
  commit_hash: string;
  triggered_by: string;
  trigger_type: string;
  duration: number | string | null;
  created_at: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [deployments, setDeployments] = useState<Dep[]>([]);
  const [logs, setLogs] = useState('');
  const [isSummary, setIsSummary] = useState(false);
  const [tab, setTab] = useState<'overview' | 'deployments' | 'logs' | 'env' | 'domains' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  // Env Var State
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<{ id?: number; key: string; value: string; is_secret: boolean } | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [showSecretValue, setShowSecretValue] = useState<number | null>(null);

  // Domain State
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);
  const [newDomain, setNewDomain] = useState({ domain: '', type: 'primary' });

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'brand';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'brand'
  });

  // Settings State
  const [settingsData, setSettingsData] = useState({
    name: '',
    repository_branch: '',
    description: ''
  });

  useEffect(() => {
    Promise.all([
      projectsApi.get(Number(id)).then(({ data }) => {
        setProject(data.project);
        setSettingsData({
          name: data.project.name,
          repository_branch: data.project.repository_branch || 'main',
          description: data.project.description || ''
        });
      }),
      projectsApi.deployments(Number(id)).then(({ data }) => setDeployments(data.deployments || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const statusChannel = echo.private(`projects.${id}`)
      .listen('DeploymentUpdated', (e: any) => {
        setProject(prev => prev ? { ...prev, status: e.status, last_deployment_status: e.status } : null);
        setDeployments(prev => {
          const exists = prev.find(d => d.id === e.deployment.id);
          if (exists) {
            return prev.map(d => d.id === e.deployment.id ? { ...d, ...e.deployment } : d);
          }
          return [e.deployment, ...prev];
        });
      });

    const logsChannel = echo.private(`projects.${id}.logs`)
      .listen('LogReceived', (e: any) => {
        setLogs(prev => {
          const combined = prev + '\n' + e.log;
          const lines = combined.split('\n');
          if (lines.length > 2000) {
            return lines.slice(-2000).join('\n');
          }
          return combined;
        });
      });

    return () => {
      echo.leave(`projects.${id}`);
      echo.leave(`projects.${id}.logs`);
    };
  }, [id]);

  const loadLogs = async () => {
    setTab('logs');
    try {
      const { data } = await projectsApi.logs(Number(id));
      setLogs(data.logs);
      setIsSummary(!!data.is_summary);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs('ERROR: Failed to fetch runtime logs. The application might be offline or starting up.');
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await projectsApi.deploy(Number(id));
      setTimeout(() => {
        projectsApi.get(Number(id)).then(({ data }) => setProject(data.project));
        projectsApi.deployments(Number(id)).then(({ data }) => setDeployments(data.deployments || []));
      }, 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsData.name.length < 3) {
      alert('Project name must be at least 3 characters');
      return;
    }
    setLoading(true);
    try {
      await projectsApi.update(Number(id), settingsData);
      const { data } = await projectsApi.get(Number(id));
      setProject(data.project);
      alert('Project settings updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnv) return;
    setEnvLoading(true);
    try {
      if (editingEnv.id) {
        await projectsApi.env.update(Number(id), editingEnv.id, editingEnv);
      } else {
        await projectsApi.env.create(Number(id), editingEnv);
      }
      const { data } = await projectsApi.get(Number(id));
      setProject(data.project);
      setIsEnvModalOpen(false);
      setEditingEnv(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save variable');
    } finally {
      setEnvLoading(false);
    }
  };

  const handleDeleteEnv = async (envId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Variable',
      message: 'Are you sure you want to delete this environment variable? This will take effect on the next deployment.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await projectsApi.env.delete(Number(id), envId);
          const { data } = await projectsApi.get(Number(id));
          setProject(data.project);
        } catch (err: any) {
          alert(err.response?.data?.message || 'Failed to delete variable');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainLoading(true);
    try {
      await projectsApi.domains.create(Number(id), newDomain);
      const { data } = await projectsApi.get(Number(id));
      setProject(data.project);
      setIsDomainModalOpen(false);
      setNewDomain({ domain: '', type: 'primary' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add domain');
    } finally {
      setDomainLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Domain',
      message: 'Are you sure you want to remove this domain? Traffic to this domain will no longer reach your application.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await projectsApi.domains.delete(Number(id), domainId);
          const { data } = await projectsApi.get(Number(id));
          setProject(data.project);
        } catch (err: any) {
          alert(err.response?.data?.message || 'Failed to delete domain');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setLoading(true);
    try {
      await projectsApi.delete(Number(id));
      router.push('/projects');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Deletion failed');
      setLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-20 card-premium animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 card-premium animate-pulse" />
          <div className="h-96 card-premium animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-16 w-16 text-danger mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-white">Project Not Found</h2>
      <p className="text-surface-500 mt-2">The project you are looking for does not exist or has been removed.</p>
    </div>
  );

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'deployments', label: 'History', icon: History },
    { id: 'logs', label: 'Live Logs', icon: TerminalIcon },
    { id: 'env', label: 'Environment', icon: Shield },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Box className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-4 mt-1">
              {project.domain && (
                <a href={`https://${project.domain}`} target="_blank" className="text-sm font-medium text-surface-400 hover:text-brand-400 flex items-center gap-1.5 transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                  {project.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="text-surface-600">•</span>
              <div className="flex items-center gap-1.5 text-sm text-surface-500">
                <GitBranch className="h-3.5 w-3.5" />
                {project.repository_branch}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-secondary px-5 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Restart
          </button>
          <button 
            onClick={handleDeploy}
            disabled={deploying || !project.can_deploy}
            className="btn-primary px-8 flex items-center gap-2 shadow-glow"
          >
            {deploying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : <Rocket className="h-4 w-4" />}
            Deploy Branch
          </button>
        </div>
      </div>

      {/* Inner Tabs */}
      <div className="flex items-center gap-1 bg-surface-900/50 p-1 rounded-xl border border-white/5 w-fit">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => t.id === 'logs' ? loadLogs() : setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-500 text-white shadow-glow' 
                  : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="card-premium p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Info className="h-5 w-5 text-brand-400" />
                    Project Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Framework</p>
                      <p className="text-sm font-medium text-white">{project.framework || 'Automatic'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Environment</p>
                      <p className="text-sm font-medium text-white capitalize">{project.type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Repository</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate max-w-[200px]">{project.repository_url || 'Not linked'}</p>
                        <button 
                          onClick={() => project.repository_url && copyToClipboard(project.repository_url)}
                          className="text-surface-500 hover:text-white transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Last Deployed</p>
                      <p className="text-sm font-medium text-white">
                        {project.last_deployed_at ? new Date(project.last_deployed_at).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-premium p-6 border-brand-500/10">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-brand-400" />
                    Network & Domains
                  </h3>
                  <div className="space-y-3">
                    {project.domains.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-500/20 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-surface-800 flex items-center justify-center text-surface-400 group-hover:text-brand-400 transition-colors">
                            <Globe className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-white">{d.domain}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-surface-800 text-surface-400">{d.type}</span>
                          <StatusBadge status={d.ssl_status === 'active' ? 'success' : 'warning'} className="!text-[10px]" />
                        </div>
                      </div>
                    ))}
                    {!project.domains.length && (
                      <div className="py-10 text-center text-surface-500 text-sm italic">
                        No custom domains assigned to this project
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="card-premium p-6 bg-gradient-to-br from-brand-500/5 to-transparent">
                  <h3 className="text-lg font-bold text-white mb-4">Instance Health</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-400">Status</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
                      <div className="h-full bg-success w-[100%] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <p className="text-xs text-surface-500 leading-relaxed">
                      Project is running optimally in <span className="text-white font-bold">{project.type}</span> mode with full SSL coverage.
                    </p>
                  </div>
                </div>

                <div className="card-premium p-6 border-danger/10 bg-danger/5">
                  <h3 className="text-xs font-bold text-danger uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Danger Zone
                  </h3>
                  <p className="text-xs text-surface-500 mb-4">Deleting this project will permanently remove all associated resources and data.</p>
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full btn-secondary !border-danger/20 !text-danger hover:!bg-danger/10 text-xs font-bold py-3 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'deployments' && (
            <motion.div
              key="deployments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-premium p-0 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Source</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Trigger</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Duration</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {deployments.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-surface-500">#{d.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{d.branch}</span>
                            <span className="text-[10px] font-mono text-brand-400">{d.commit_hash?.substring(0, 7) || 'HEAD'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-white capitalize">{d.trigger_type}</span>
                            <span className="text-[10px] text-surface-500">by {d.triggered_by}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-surface-400">
                          {d.duration ? (typeof d.duration === 'number' ? `${d.duration}s` : d.duration) : '--'}
                        </td>
                        <td className="px-6 py-4 text-xs text-surface-500 font-medium">
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {!deployments.length && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-surface-500 italic">
                          No deployment history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-[600px]"
            >
              <TerminalLogs 
                logs={logs} 
                onClear={() => setLogs('')} 
                isSummary={isSummary}
                className="h-full" 
                onRefresh={() => {
                  setLogs('');
                  loadLogs();
                }}
              />
            </motion.div>
          )}

          {tab === 'env' && (
            <motion.div
              key="env"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-premium p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-brand-400" />
                    Configuration Variables
                  </h3>
                  <p className="text-xs text-surface-500">Variables are injected into your environment at build and runtime.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingEnv({ key: '', value: '', is_secret: false });
                    setIsEnvModalOpen(true);
                  }}
                  className="btn-primary !h-10 px-4 text-xs font-bold flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Variable
                </button>
              </div>

              <div className="space-y-3">
                {project.environment_variables?.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-500/20 transition-all group">
                    <div className="flex items-center gap-8 flex-1">
                      <div className="w-48 shrink-0">
                        <code className="text-sm font-bold text-brand-400 truncate block">{ev.key}</code>
                      </div>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <code className="text-sm text-surface-500 font-mono truncate max-w-md">
                          {ev.is_secret && showSecretValue !== ev.id ? '••••••••••••••••' : ev.value}
                        </code>
                        {ev.is_secret && (
                          <button 
                            onClick={() => setShowSecretValue(showSecretValue === ev.id ? null : ev.id)}
                            className="p-1 rounded hover:bg-white/5 text-surface-600 hover:text-surface-400"
                          >
                            {showSecretValue === ev.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => copyToClipboard(ev.value)}
                        className="p-2 rounded-lg hover:bg-white/5 text-surface-500 hover:text-white transition-all"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingEnv(ev);
                          setIsEnvModalOpen(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/5 text-surface-500 hover:text-brand-400 transition-all"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEnv(ev.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-surface-500 hover:text-danger transition-all"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {!project.environment_variables?.length && (
                  <div className="py-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-surface-900 border border-white/5 rounded-2xl flex items-center justify-center text-surface-700 mx-auto">
                      <Shield className="h-8 w-8" />
                    </div>
                    <p className="text-surface-500 text-sm">No environment variables defined for this project.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'domains' && (
            <motion.div
              key="domains"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-premium p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-brand-400" />
                    Custom Domains
                  </h3>
                  <p className="text-xs text-surface-500">Configure public access points for your application.</p>
                </div>
                <button 
                  onClick={() => setIsDomainModalOpen(true)}
                  className="btn-primary !h-10 px-4 text-xs font-bold flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Domain
                </button>
              </div>

              <div className="space-y-4">
                {project.domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-500/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-surface-800 flex items-center justify-center text-surface-400 group-hover:text-brand-400 transition-colors">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">{d.domain}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-surface-800 text-surface-400">{d.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-surface-500 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            SSL {d.ssl_status}
                          </span>
                          <span className="text-[10px] text-surface-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {d.ssl_status === 'active' ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => copyToClipboard(d.domain)}
                        className="p-2 rounded-lg hover:bg-white/5 text-surface-500 hover:text-white transition-all"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDomain(d.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-surface-500 hover:text-danger transition-all"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {!project.domains.length && (
                  <div className="py-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-surface-900 border border-white/5 rounded-2xl flex items-center justify-center text-surface-700 mx-auto">
                      <Globe className="h-8 w-8" />
                    </div>
                    <p className="text-surface-500 text-sm">No custom domains assigned yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="md:col-span-2 space-y-6">
                <div className="card-premium p-6">
                  <h3 className="text-lg font-bold text-white mb-6">General Settings</h3>
                  <form onSubmit={handleUpdateSettings} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Project Name</label>
                      <input 
                        type="text"
                        value={settingsData.name}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, name: e.target.value }))}
                        className="input-premium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Default Branch</label>
                      <input 
                        type="text"
                        value={settingsData.repository_branch}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, repository_branch: e.target.value }))}
                        className="input-premium w-full font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Description</label>
                      <textarea 
                        value={settingsData.description}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, description: e.target.value }))}
                        className="input-premium w-full resize-none h-24"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="btn-primary px-8 text-xs font-bold">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <div className="card-premium p-6 border-danger/10">
                  <h3 className="text-sm font-bold text-danger uppercase tracking-widest mb-4">Danger Zone</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-danger/5 border border-danger/10">
                      <p className="text-xs text-surface-400 leading-relaxed">
                        Once you delete a project, there is no going back. Please be certain.
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="w-full btn-secondary !border-danger/20 !text-danger hover:!bg-danger/10 text-xs font-bold py-3 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Env Var Modal */}
      <Modal
        isOpen={isEnvModalOpen}
        onClose={() => {
          setIsEnvModalOpen(false);
          setEditingEnv(null);
        }}
        title={editingEnv?.id ? 'Edit Variable' : 'Add New Variable'}
        footer={
          <>
            <button 
              onClick={() => setIsEnvModalOpen(false)}
              className="btn-secondary px-6 text-xs font-bold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEnv}
              disabled={envLoading || !editingEnv?.key || !editingEnv?.value}
              className="btn-primary px-8 text-xs font-bold shadow-glow"
            >
              {envLoading ? 'Saving...' : 'Save Variable'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveEnv} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Key</label>
            <input 
              type="text" 
              required
              placeholder="API_KEY"
              value={editingEnv?.key || ''}
              onChange={(e) => setEditingEnv(prev => ({ ...prev!, key: e.target.value }))}
              className="input-premium w-full font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Value</label>
            <textarea 
              required
              placeholder="your-secret-value"
              rows={3}
              value={editingEnv?.value || ''}
              onChange={(e) => setEditingEnv(prev => ({ ...prev!, value: e.target.value }))}
              className="input-premium w-full font-mono resize-none py-3"
            />
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <input 
              type="checkbox" 
              id="is_secret"
              checked={editingEnv?.is_secret || false}
              onChange={(e) => setEditingEnv(prev => ({ ...prev!, is_secret: e.target.checked }))}
              className="h-4 w-4 rounded border-white/10 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900"
            />
            <label htmlFor="is_secret" className="text-sm font-medium text-surface-300 cursor-pointer select-none">
              Mark as secret (values are masked in the UI)
            </label>
          </div>
        </form>
      </Modal>

      {/* Domain Modal */}
      <Modal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        title="Add Custom Domain"
        footer={
          <>
            <button 
              onClick={() => setIsDomainModalOpen(false)}
              className="btn-secondary px-6 text-xs font-bold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveDomain}
              disabled={domainLoading || !newDomain.domain}
              className="btn-primary px-8 text-xs font-bold shadow-glow"
            >
              {domainLoading ? 'Adding...' : 'Add Domain'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDomain} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Domain Name</label>
            <input 
              type="text" 
              required
              placeholder="app.example.com"
              value={newDomain.domain}
              onChange={(e) => setNewDomain(prev => ({ ...prev, domain: e.target.value }))}
              className="input-premium w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Domain Type</label>
            <select 
              value={newDomain.type}
              onChange={(e) => setNewDomain(prev => ({ ...prev, type: e.target.value }))}
              className="input-premium w-full appearance-none"
            >
              <option value="primary">Primary (Canonical)</option>
              <option value="alias">Alias (Mirror)</option>
              <option value="redirect">Redirect (301 to Primary)</option>
            </select>
          </div>
          <div className="p-4 rounded-xl bg-info/5 border border-info/10">
            <p className="text-[10px] text-info leading-relaxed">
              <strong>Note:</strong> SSL certificates are automatically provisioned once DNS verification passes. This typically takes 5-10 minutes.
            </p>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}
