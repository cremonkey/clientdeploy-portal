'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TerminalLogs } from '@/components/ui/TerminalLogs';
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  History,
  Info,
  Loader2,
  Rocket,
  Settings,
  Shield,
  Terminal as TerminalIcon,
  Trash2,
} from 'lucide-react';

interface ProjectDetail {
  id: number;
  name: string;
  slug?: string;
  domain: string | null;
  fqdn?: string | null;
  type?: string;
  framework: string | null;
  repository_url: string | null;
  repository_branch: string | null;
  coolify_application_uuid?: string | null;
  status: string;
  description: string | null;
  last_deployed_at: string | null;
  last_deployment_status: string | null;
  can_deploy: boolean;
  can_restart?: boolean;
  domains?: Array<{
    id: number;
    domain: string;
    type: string;
    ssl_status: string;
  }>;
  environment_variables?: Array<{
    id: number;
    key: string;
    value?: string;
    is_secret: boolean;
  }>;
}

interface Deployment {
  id: number;
  status: string;
  branch: string | null;
  commit_hash: string | null;
  triggered_by: string | null;
  trigger_type?: string | null;
  duration: number | string | null;
  created_at: string;
}

type Tab = 'overview' | 'deployments' | 'logs' | 'domains' | 'env' | 'settings';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = Number(params.id);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [logs, setLogs] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');

  const normalizeProject = (response: any): ProjectDetail | null => {
    return response?.data?.data || response?.data?.project || response?.data || null;
  };

  const normalizeDeployments = (response: any): Deployment[] => {
    return response?.data?.data || response?.data?.deployments || [];
  };

  const normalizeLogs = (response: any): string => {
    return response?.data?.data?.logs || response?.data?.logs || '';
  };

  const loadProject = async () => {
    const response = await projectsApi.get(projectId);
    const nextProject = normalizeProject(response);
    setProject(nextProject);
  };

  const loadDeployments = async () => {
    const response = await projectsApi.deployments(projectId);
    setDeployments(normalizeDeployments(response));
  };

  const loadAll = async () => {
    try {
      setError(null);
      await Promise.all([loadProject(), loadDeployments()]);
    } catch (error: any) {
      console.error('Project details load failed:', error);
      setError(error?.response?.data?.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  const handleDeploy = async () => {
    if (!project?.can_deploy) return;

    setDeploying(true);

    try {
      await projectsApi.deploy(projectId);
      await loadAll();
      setTab('deployments');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Deploy failed.');
    } finally {
      setDeploying(false);
    }
  };

  const handleLoadLogs = async () => {
    setTab('logs');
    setLogsLoading(true);

    try {
      const response = await projectsApi.logs(projectId);
      setLogs(normalizeLogs(response) || 'No logs available for this project.');
    } catch (error: any) {
      console.error('Logs load failed:', error);
      setLogs(error?.response?.data?.message || 'Failed to load logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== 'DELETE') return;

    try {
      await projectsApi.delete(projectId);
      router.push('/projects');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Project deletion failed.');
    }
  };

  const copyToClipboard = async (text?: string | null) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-24 card-premium animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 card-premium animate-pulse" />
          <div className="h-96 card-premium animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card-premium p-10 text-center border-red-500/20 bg-red-500/5">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="text-sm text-surface-400 mt-2">
          {error || 'The project does not exist or you do not have access.'}
        </p>
        <Link href="/projects" className="btn-primary inline-flex mt-6 px-6">
          Back to Projects
        </Link>
      </div>
    );
  }

  const domain = project.fqdn || project.domain;
  const branch = project.repository_branch || 'main';

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'deployments', label: 'Deployments', icon: History },
    { id: 'logs', label: 'Logs', icon: TerminalIcon },
    { id: 'domains', label: 'Domains', icon: Globe },
    { id: 'env', label: 'Environment', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between gap-4">
        <Link href="/projects" className="text-sm text-surface-400 hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="flex items-center gap-3">
          {domain && (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary h-10 px-4 flex items-center gap-2 text-xs"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Site
            </a>
          )}

          {project.can_deploy && (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="btn-primary h-10 px-5 flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Deploy
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="card-premium p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Box className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>

              <p className="text-surface-500 mt-2 max-w-2xl">
                {project.description || 'No project description provided.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-surface-400">
                {domain && (
                  <button
                    onClick={() => copyToClipboard(domain)}
                    className="flex items-center gap-1.5 hover:text-brand-400"
                  >
                    <Globe className="h-4 w-4" />
                    {domain}
                    <Copy className="h-3 w-3" />
                  </button>
                )}

                <span className="flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4" />
                  {branch}
                </span>

                <span>{project.framework || 'Other'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => item.id === 'logs' ? handleLoadLogs() : setTab(item.id)}
              className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                active
                  ? 'border-brand-400 text-white'
                  : 'border-transparent text-surface-500 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-premium p-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Project Metadata</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Project ID" value={`#${project.id}`} />
              <InfoRow label="Status" value={project.status} />
              <InfoRow label="Framework" value={project.framework || 'Other'} />
              <InfoRow label="Branch" value={branch} />
              <InfoRow label="Domain" value={domain || 'No domain'} />
              <InfoRow label="Last Deployed" value={project.last_deployed_at || 'Never'} />
              <InfoRow label="Last Deployment Status" value={project.last_deployment_status || 'Unknown'} />
              <InfoRow label="Coolify UUID" value={project.coolify_application_uuid || 'Not set'} copy />
            </div>
          </div>

          <div className="card-premium p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Quick Actions</h2>

            <button
              onClick={handleDeploy}
              disabled={!project.can_deploy || deploying}
              className="btn-primary w-full h-11 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Deploy Project
            </button>

            <button
              onClick={handleLoadLogs}
              className="btn-secondary w-full h-11 flex items-center justify-center gap-2"
            >
              <TerminalIcon className="h-4 w-4" />
              View Logs
            </button>

            {domain && (
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full h-11 flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Visit Site
              </a>
            )}
          </div>
        </div>
      )}

      {tab === 'deployments' && (
        <div className="card-premium overflow-hidden p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Branch</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Commit</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Triggered By</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {deployments.map((deployment) => (
                <tr key={deployment.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <StatusBadge status={deployment.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">{deployment.branch || branch}</td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-brand-300">
                      {deployment.commit_hash?.slice(0, 7) || 'manual'}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-400">
                    {deployment.triggered_by || 'System'}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-400">
                    {deployment.duration ? `${deployment.duration}s` : '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500">
                    {new Date(deployment.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}

              {!deployments.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-surface-500">
                    No deployments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card-premium p-0 overflow-hidden">
          {logsLoading ? (
            <div className="p-10 flex items-center justify-center gap-3 text-surface-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading logs...
            </div>
          ) : (
            <TerminalLogs logs={logs || 'No logs loaded.'} />
          )}
        </div>
      )}

      {tab === 'domains' && (
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Domains</h2>

          {domain && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{domain}</p>
                <p className="text-xs text-surface-500">Primary domain</p>
              </div>
              <StatusBadge status="active" />
            </div>
          )}

          {!domain && (
            <p className="text-sm text-surface-500">No domains configured yet.</p>
          )}
        </div>
      )}

      {tab === 'env' && (
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Environment Variables</h2>

          {project.environment_variables?.length ? (
            <div className="space-y-2">
              {project.environment_variables.map((env) => (
                <div key={env.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono text-white">{env.key}</p>
                    <p className="text-xs text-surface-500">
                      {env.is_secret ? 'Secret value hidden' : env.value || 'Empty value'}
                    </p>
                  </div>
                  <StatusBadge status={env.is_secret ? 'secret' : 'plain'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500">
              No environment variables configured yet.
            </p>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="card-premium p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Project Settings</h2>
            <p className="text-sm text-surface-500">
              Settings editing will be enabled after the project module is fully stabilized.
            </p>
          </div>

          <div className="card-premium p-6 border-red-500/20 bg-red-500/5 space-y-4">
            <h2 className="text-lg font-bold text-red-300 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </h2>

            <p className="text-sm text-surface-400">
              Type DELETE to permanently delete this project.
            </p>

            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="Type DELETE"
              className="input-premium max-w-sm"
            />

            <button
              onClick={handleDeleteProject}
              disabled={deleteConfirm !== 'DELETE'}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
            >
              Delete Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  copy = false,
}: {
  label: string;
  value: string;
  copy?: boolean;
}) {
  const handleCopy = async () => {
    if (!copy) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">
        {label}
      </p>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white font-medium break-all">{value}</p>

        {copy && (
          <button onClick={handleCopy} className="text-surface-500 hover:text-brand-400">
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
