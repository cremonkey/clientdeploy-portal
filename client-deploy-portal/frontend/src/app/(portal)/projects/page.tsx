'use client';

import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  Box, 
  Rocket, 
  ExternalLink, 
  Github, 
  Globe, 
  Search, 
  Filter,
  ArrowRight,
  Plus,
  LayoutGrid,
  List,
  ArrowUpDown,
  MoreVertical,
  Activity,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  type: string;
  framework: string | null;
  status: string;
  repository_url?: string;
  last_deployment?: { 
    status: string; 
    time: string;
    commit_hash?: string;
  } | null;
  can_deploy: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterFramework, setFilterFramework] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_deploy'>('last_deploy');

  useEffect(() => {
    projectsApi.list()
      .then(({ data }) => setProjects(data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDeploy = async (id: number) => {
    setDeploying(id);
    try {
      await projectsApi.deploy(id);
      setTimeout(() => {
        projectsApi.list().then(({ data }) => setProjects(data.projects));
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Deploy failed');
    } finally {
      setDeploying(null);
    }
  };

  const filteredProjects = projects
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.domain?.toLowerCase().includes(search.toLowerCase());
      const matchesFramework = filterFramework === 'all' || p.framework?.toLowerCase() === filterFramework.toLowerCase();
      const matchesStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFramework && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // Default to API sort (likely latest)
    });

  const frameworks = Array.from(new Set(projects.map(p => p.framework).filter(Boolean)));
  const statuses = Array.from(new Set(projects.map(p => p.status)));

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-surface-800 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-surface-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 card-premium animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Project Workspace</h1>
          <p className="text-surface-500 mt-1">Manage and monitor all your active deployments from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-surface-900/50 rounded-lg border border-white/5">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-brand-500 text-white shadow-glow-sm" : "text-surface-500 hover:text-white")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-2 rounded-md transition-all", viewMode === 'table' ? "bg-brand-500 text-white shadow-glow-sm" : "text-surface-500 hover:text-white")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link href="/projects/new" className="btn-primary flex items-center gap-2 px-6 h-11">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 group-focus-within:text-brand-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search by name, domain, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-premium pl-11 w-full"
          />
        </div>
        
        <div className="lg:col-span-2">
          <select 
            value={filterFramework}
            onChange={(e) => setFilterFramework(e.target.value)}
            className="input-premium w-full appearance-none"
          >
            <option value="all">All Frameworks</option>
            {frameworks.map(f => <option key={f} value={f!}>{f}</option>)}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-premium w-full appearance-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="lg:col-span-3">
          <button className="w-full btn-secondary h-11 flex items-center justify-between px-4 group">
            <span className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-surface-500" />
              <span className="text-sm">Sort by: {sortBy === 'name' ? 'Name' : 'Latest'}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-surface-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Projects Content */}
      {filteredProjects.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p, i) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="card-premium group hover:border-brand-500/30 transition-all flex flex-col p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                        <Box className="h-4 w-4 text-brand-400" />
                      </div>
                      <h3 className="font-bold text-white text-lg group-hover:text-brand-400 transition-colors">{p.name}</h3>
                    </div>
                    {p.domain && (
                      <a 
                        href={`https://${p.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-surface-500 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                      >
                        <Globe className="h-3 w-3" />
                        {p.domain}
                      </a>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">Framework</p>
                    <p className="text-xs text-white font-semibold">{p.framework || 'Other'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-1">Branch</p>
                    <p className="text-xs text-white font-semibold flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-brand-400" />
                      main
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex items-center gap-2">
                  <Link 
                    href={`/projects/${p.id}`} 
                    className="flex-1 btn-secondary h-10 text-xs font-bold flex items-center justify-center gap-2 group/btn"
                  >
                    Manage
                    <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                  
                  {p.can_deploy && (
                    <button 
                      onClick={() => handleDeploy(p.id)} 
                      disabled={deploying === p.id}
                      className="btn-primary h-10 px-4 text-xs font-bold flex items-center justify-center gap-2 group/deploy"
                    >
                      {deploying === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4 group-hover/deploy:-translate-y-1 transition-transform" />
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card-premium overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Project</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Framework</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Domain</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                            <Box className="h-4 w-4 text-brand-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-surface-500 lowercase">main branch</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-surface-300 font-medium">{p.framework || 'Other'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-surface-500">{p.domain || 'no-domain.com'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/projects/${p.id}`} className="p-2 rounded-lg bg-white/5 border border-white/5 text-surface-400 hover:text-white transition-all">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-surface-400 hover:text-white transition-all">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
            {search ? `No projects matching "${search}" were found.` : 'Your workspace is empty. Create your first project to get started.'}
          </p>
          {!search && (
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
