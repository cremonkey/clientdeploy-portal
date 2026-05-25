'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Box,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Terminal as TerminalIcon,
  ExternalLink,
  AlertCircle,
  LifeBuoy,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    total_projects: number;
    online_projects: number;
    failed_deployments_7d: number;
    open_tickets: number;
    success_rate: number;
    average_duration: number;
  };

  latest_deployment: {
    id: number;
    status: string;
    project_id: number;
    project_name: string;
    project_slug: string;
    triggered_at: string;
  } | null;

  projects_requiring_attention: Array<{
    id: number;
    name: string;
    status: string;
    latest_deployment_status?: string | null;
  }>;

  recent_deployments: Array<{
    id: number;
    project_id: number;
    project_name: string;
    project_slug: string;
    status: string;
    branch: string;
    commit_hash: string | null;
    triggered_by: string;
    triggered_at: string;
    duration: number | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .get()
      .then((response) => {
        setData(response.data.data);
      })
      .catch((error) => {
        console.error('Dashboard fetch failed:', error);
        setError('Failed to load dashboard data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 card-premium animate-pulse" />
          ))}
        </div>
        <div className="h-64 card-premium animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-8 text-center border-red-500/20 bg-red-500/5">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Dashboard Error</h2>
        <p className="text-sm text-surface-400 mt-2">{error}</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-surface-500">
            System Overview
          </h2>
          <p className="text-surface-400 mt-1">
            Real-time infrastructure and project status.
          </p>
        </div>

        <Link href="/projects/new" className="btn-primary flex items-center gap-2 px-6">
          <Box className="h-4 w-4" />
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Projects"
          value={stats?.total_projects ?? 0}
          icon={<Box className="h-5 w-5" />}
          description={`${stats?.online_projects ?? 0} running smoothly`}
        />

        <StatCard
          title="Success Rate"
          value={`${stats?.success_rate ?? 100}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description={`${stats?.failed_deployments_7d ?? 0} failed in the last 7 days`}
        />

        <StatCard
          title="Avg. Build Time"
          value={stats?.average_duration ? `${stats.average_duration}s` : '0s'}
          icon={<Clock className="h-5 w-5" />}
          description="Across recent deployments"
        />

        <StatCard
          title="Open Tickets"
          value={stats?.open_tickets ?? 0}
          icon={<LifeBuoy className="h-5 w-5" />}
          description="Awaiting response"
          href="/support"
        />
      </div>

      {data?.latest_deployment && (
        <div className="card-premium p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-surface-500 font-bold">
              Latest Deployment
            </p>

            <h3 className="text-lg font-bold text-white mt-1">
              {data.latest_deployment.project_name}
            </h3>

            <p className="text-xs text-surface-400 mt-1">
              {new Date(data.latest_deployment.triggered_at).toLocaleString()}
            </p>
          </div>

          <StatusBadge status={data.latest_deployment.status} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TerminalIcon className="h-5 w-5 text-brand-400" />
              Recent Activity
            </h3>

            <Link
              href="/projects"
              className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-wider"
            >
              View All History
            </Link>
          </div>

          <div className="card-premium overflow-hidden p-0 border-white/5 bg-surface-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Project
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Commit
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                      Duration
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {data?.recent_deployments.map((dep) => (
                    <tr key={dep.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/projects/${dep.project_id}`} className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                            {dep.project_name}
                          </span>
                          <span className="text-[10px] text-surface-500 font-medium">
                            {dep.branch}
                          </span>
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <code className="text-[11px] px-2 py-1 bg-surface-800 rounded border border-white/5 text-brand-300">
                          {dep.commit_hash?.substring(0, 7) || 'manual'}
                        </code>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={dep.status} />
                      </td>

                      <td className="px-6 py-4 text-xs text-surface-400 font-medium font-mono">
                        {dep.duration ? `${dep.duration}s` : '--'}
                      </td>
                    </tr>
                  ))}

                  {!data?.recent_deployments.length && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-surface-500 italic text-sm">
                        No recent activity recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Attention Required
          </h3>

          <div className="space-y-3">
            {data?.projects_requiring_attention.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card-premium p-4 border-warning/10 bg-warning/5 hover:bg-warning/10 transition-all cursor-pointer group block"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-warning transition-colors">
                      {project.name}
                    </h4>

                    <p className="text-xs text-surface-500 line-clamp-1">
                      Latest deployment status:{' '}
                      {project.latest_deployment_status ?? 'unknown'}
                    </p>
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-warning transition-transform" />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={project.latest_deployment_status ?? project.status} />
                  <span className="text-[10px] font-bold text-warning uppercase tracking-tighter">
                    Review
                  </span>
                </div>
              </Link>
            ))}

            {!data?.projects_requiring_attention.length && (
              <div className="card-premium p-8 text-center bg-success/5 border-success/10">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-success">All Systems Nominal</p>
                <p className="text-[10px] text-surface-500 mt-1">
                  No critical issues detected.
                </p>
              </div>
            )}
          </div>

          <div className="card-premium p-5 bg-gradient-to-br from-brand-500/10 to-transparent border-brand-500/10">
            <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">
              Support & Resources
            </h4>

            <div className="space-y-3">
              <Link
                href="/support"
                className="flex items-center justify-between text-sm text-surface-300 hover:text-white group"
              >
                Support Center
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between text-sm text-surface-300 hover:text-white group"
              >
                Portal Settings
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>

              <Link
                href="/projects"
                className="flex items-center justify-between text-sm text-surface-300 hover:text-white group"
              >
                Manage Projects
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
