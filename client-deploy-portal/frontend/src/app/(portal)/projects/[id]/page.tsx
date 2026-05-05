'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { projectsApi } from '@/lib/api';
import { motion } from 'framer-motion';

interface ProjectDetail {
  id: number; name: string; slug: string; domain: string | null; type: string;
  framework: string | null; repository_url: string | null; branch: string;
  status: string; description: string | null; last_deployed_at: string | null;
  last_deployment_status: string | null; can_deploy: boolean; can_restart: boolean;
  domains: Array<{ id: number; domain: string; type: string; ssl_status: string }>;
}

interface Dep {
  id: number; status: string; branch: string; commit_hash: string;
  triggered_by: string; trigger_type: string; started_at: string;
  finished_at: string; duration: string; created_at: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [deployments, setDeployments] = useState<Dep[]>([]);
  const [logs, setLogs] = useState('');
  const [tab, setTab] = useState<'overview' | 'deployments' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    Promise.all([
      projectsApi.get(Number(id)).then(({ data }) => setProject(data.project)),
      projectsApi.deployments(Number(id)).then(({ data }) => setDeployments(data.data || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  const loadLogs = async () => {
    setTab('logs');
    const { data } = await projectsApi.logs(Number(id));
    setLogs(data.logs || 'No logs available');
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await projectsApi.deploy(Number(id));
      const { data } = await projectsApi.get(Number(id));
      setProject(data.project);
      const depData = await projectsApi.deployments(Number(id));
      setDeployments(depData.data.data || []);
    } catch (err: any) { alert(err.response?.data?.message || 'Deploy failed'); }
    finally { setDeploying(false); }
  };

  if (loading) return <div className="h-64 rounded-2xl bg-surface-800 animate-pulse" />;
  if (!project) return <p className="text-white">Project not found</p>;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'deployments', label: 'Deployments' },
    { key: 'logs', label: 'Logs', onClick: loadLogs },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-surface-200/40 mt-1">{project.domain || project.slug}</p>
        </div>
        <div className="flex gap-2">
          {project.can_deploy && (
            <button onClick={handleDeploy} disabled={deploying} className="btn-primary">
              {deploying ? '⏳ Deploying...' : '🚀 Deploy Now'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-800 pb-px">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={t.key === 'logs' ? loadLogs : () => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key ? 'text-brand-500 border-b-2 border-brand-500' : 'text-surface-200/50 hover:text-white'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card space-y-4">
            <h3 className="font-semibold text-white">Project Info</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Status', project.status],
                ['Type', project.type],
                ['Framework', project.framework],
                ['Branch', project.branch],
                ['Repository', project.repository_url || 'Not connected'],
                ['Last Deploy', project.last_deployed_at ? new Date(project.last_deployed_at).toLocaleString() : 'Never'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-surface-200/50">{k}</dt>
                  <dd className="text-white font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Domains</h3>
            {project.domains.length ? (
              <div className="space-y-2">
                {project.domains.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/50">
                    <span className="text-sm text-white">{d.domain}</span>
                    <div className="flex gap-2">
                      <span className="badge badge-neutral">{d.type}</span>
                      <span className={`badge ${d.ssl_status === 'active' ? 'badge-success' : 'badge-warning'}`}>SSL: {d.ssl_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-surface-200/30">No domains configured</p>}
          </div>
        </motion.div>
      )}

      {tab === 'deployments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
          <h3 className="font-semibold text-white mb-4">Deployment History</h3>
          <div className="space-y-2">
            {deployments.map(d => (
              <div key={d.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-800/50">
                <div className="flex items-center gap-3">
                  <div className={`status-dot ${d.status === 'success' ? 'status-dot-online' : d.status === 'failed' ? 'status-dot-failed' : 'status-dot-deploying'}`} />
                  <div>
                    <p className="text-sm text-white">{d.branch} • {d.commit_hash || 'N/A'}</p>
                    <p className="text-xs text-surface-200/40">by {d.triggered_by || 'system'} • {d.trigger_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-info'}`}>{d.status}</span>
                  {d.duration && <span className="text-xs text-surface-200/30">{d.duration}</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="log-viewer"><pre className="whitespace-pre-wrap">{logs}</pre></div>
        </motion.div>
      )}
    </div>
  );
}
