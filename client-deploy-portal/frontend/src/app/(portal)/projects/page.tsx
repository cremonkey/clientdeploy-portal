'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { projectsApi } from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Box,
  Rocket,
  ExternalLink,
  Globe,
  Search,
  ArrowRight,
  Plus,
  LayoutGrid,
  List,
  ArrowUpDown,
  MoreVertical,
  Activity,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  fqdn?: string | null;
  type?: string;
  framework: string | null;
  status: string;
  repository_url?: string | null;
  repository_branch?: string | null;
  last_deployment?: {
    id?: number;
    status: string;
    time: string;
    commit_hash?: string | null;
    duration?: number | null;
  } | null;
  can_deploy: boolean;
}

const ADMIN_ROLES = ['super_admin', 'agency_admin'];

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const canCreateProject = user ? ADMIN_ROLES.includes(user.role) : false;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_deploy' | 'status'>('last_deploy');

  const fetchProjects = async () => {
    try {
      setError(null);
      const response = await projectsApi.list();
      setProjects(response.data.data || []);
    } catch (error: any) {
      console.error('Projects fetch failed:', error);
      setError(error?.response?.data?.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeploy = async (id: number) => {
    setDeploying(id);

    try {
      await projectsApi.deploy(id);
      await fetchProjects();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Deploy failed.');
    } finally {
      setDeploying(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const domain = project.fqdn || project.domain || '';
        const branch = project.repository_branch || '';

        const matchesSearch =
          project.name.toLowerCase().includes(search.toLowerCase()) ||
          domain.toLowerCase().includes(search.toLowerCase()) ||
          branch.toLowerCase().includes(search.toLowerCase());

        const matchesFramework =
          filterFramework === 'all' ||
          project.framework?.toLowerCase() === filterFramework.toLowerCase();

        const matchesStatus =
          filterStatus === 'all' ||
          project.status.toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesFramework && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }

        if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }

        const aTime = a.last_deployment?.time
          ? new Date(a.last_deployment.time).getTime()
          : 0;

        const bTime = b.last_deployment?.time
          ? new Date(b.last_deployment.time).getTime()
          : 0;

        return bTime - aTime;
      });
  }, [projects, search, filterFramework, filterStatus, sortBy]);

  const frameworks = useMemo(
    () => Array.from(new Set(projects.map((p) => p.framework).filter(Boolean))),
    [projects],
  );

  const statuses = useMemo(
    () => Array.from(new Set(projects.map((p) => p.status).filter(Boolean))),
    [projects],
  );

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-surface-800 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-surface-800 rounded-xl animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 card-premium animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-10 text-center border-red-500/20 bg-red-500/5">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Projects Error</h2>
        <p className="text-sm text-surface-400 mt-2">{error}</p>
        <button onClick={fetchProjects} className="btn-primary mt-6 px-6">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Project Workspace
          </h1>
          <p className="text-surface-500 mt-1">
            Manage and monitor all your active deployments from one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-surface-900/50 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'grid'
                  ? 'bg-brand-500 text-white shadow-glow-sm'
                  : 'text-surface-500 hover:text-white',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-md transition-all',
                viewMode === 'table'
                  ? 'bg-brand-500 text-white shadow-glow-sm'
                  : 'text-surface-500 hover:text-white',
              )}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {canCreateProject && (
            <Link href="/projects/new" className="btn-primary flex items-center gap-2 px-6 h-11">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 group-focus-within:text-brand-400 transition-colors" />

          <input
            type="text"
            placeholder="Search by name, domain, or branch..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-premium pl-11 w-full"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            value={filterFramework}
            onChange={(event) => setFilterFramework(event.target.value)}
            className="input-premium w-full appearance-none"
          >
            <option value="all">All Frameworks</option>
            {frameworks.map((framework) => (
              <option key={framework} value={framework!}>
                {framework}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="input-premium w-full appearance-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'name' | 'last_deploy' | 'status')}
            className="input-premium w-full appearance-none"
          >
            <option value="last_deploy">Sort by Latest Deploy</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => {
              const domain = project.fqdn || project.domain;
              const branch = project.repository_branch || 'main';

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  className="card-premium group hover:border-brand-500/30 transition-all flex flex-col p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                          <Box className="h-4 w-4 text-brand-400" />
                        </div>

                        <h3 className="font-bold text-white text-lg group-hover:text-brand-400 transition-colors">
                          {project.name}
                        </h3>
                      </div>

                      {domain && (
                        <a
                          href={`https://${domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-surface-500 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                        >
                          <Globe className="h-3 w-3" />
                          {domain}
                        </a>
                      )}
                    </div>

                    <StatusBadge status={project.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">
                        Framework
                      </p>
                      <p className="text-xs text-white font-semibold">
                        {project.framework || 'Other'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">
                        Branch
                      </p>
                      <p className="text-xs text-white font-semibold flex items-center gap-1.5">
                        <Activity className="h-3 w-3 text-brand-400" />
                        {branch}
                      </p>
                    </div>
                  </div>

                  {project.last_deployment && (
                    <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">
                            Last Deployment
                          </p>

                          <p className="text-xs text-white font-semibold">
                            {new Date(project.last_deployment.time).toLocaleString()}
                          </p>
                        </div>

                        <StatusBadge status={project.last_deployment.status} />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex items-center gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex-1 btn-secondary h-10 text-xs font-bold flex items-center justify-center gap-2 group/btn"
                    >
                      Manage
                      <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>

                    {project.can_deploy && (
                      <button
                        onClick={() => handleDeploy(project.id)}
                        disabled={deploying === project.id}
                        className="btn-primary h-10 px-4 text-xs font-bold flex items-center justify-center gap-2 group/deploy disabled:opacity-50"
                      >
                        {deploying === project.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deploying
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 group-hover/deploy:-translate-y-1 transition-transform" />
                            Deploy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="card-premium overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Project
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Framework
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Domain
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Branch
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Last Deploy
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {filteredProjects.map((project) => {
                    const domain = project.fqdn || project.domain;
                    const branch = project.repository_branch || 'main';

                    return (
                      <tr key={project.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                              <Box className="h-4 w-4 text-brand-400" />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-white">{project.name}</p>
                              <p className="text-[10px] text-surface-500 lowercase">
                                #{project.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={project.status} />
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-surface-300 font-medium">
                            {project.framework || 'Other'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {domain ? (
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-400 hover:text-brand-300"
                            >
                              {domain}
                            </a>
                          ) : (
                            <span className="text-xs text-surface-600">No domain</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-surface-400 font-mono">{branch}</span>
                        </td>

                        <td className="px-6 py-4">
                          {project.last_deployment ? (
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={project.last_deployment.status} />
                              <span className="text-[10px] text-surface-500">
                                {new Date(project.last_deployment.time).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-surface-600">No deployments</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/projects/${project.id}`}
                              className="p-2 rounded-lg bg-white/5 border border-white/5 text-surface-400 hover:text-white transition-all"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>

                            {project.can_deploy && (
                              <button
                                onClick={() => handleDeploy(project.id)}
                                disabled={deploying === project.id}
                                className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:text-white transition-all disabled:opacity-50"
                              >
                                {deploying === project.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Rocket className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-surface-400 hover:text-white transition-all">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="card-premium py-20 text-center bg-surface-900/50 border-white/5">
          <Box className="h-16 w-16 text-surface-800 mx-auto mb-4" />

          <h3 className="text-lg font-bold text-white">No projects found</h3>

          <p className="text-surface-500 mt-1 max-w-sm mx-auto">
            {search
              ? `No projects matching "${search}" were found.`
              : 'Your workspace is empty. Create your first project to get started.'}
          </p>

          {!search && canCreateProject && (
            <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2 px-8 mt-6">
              <Plus className="h-4 w-4" />
              Create Project
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
