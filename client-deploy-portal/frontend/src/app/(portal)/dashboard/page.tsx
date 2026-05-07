'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  Box, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight, 
  Terminal as TerminalIcon,
  ExternalLink,
  AlertCircle,
  LifeBuoy
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    total_projects: number;
    online_projects: number;
    failed_deployments_7d: number;
    avg_deployment_duration?: string;
    success_rate?: number;
    open_tickets?: number;
  };
  projects_requiring_attention: Array<{
    id: number;
    name: string;
    status: string;
    last_error?: string;
  }>;
  recent_deployments: Array<{
    id: number;
    project_name: string;
    status: string;
    branch: string;
    commit_hash: string;
    triggered_at: string;
    duration: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 card-premium animate-pulse" />)}
        </div>
        <div className="h-64 card-premium animate-pulse" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      {/* Header with quick action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-surface-500">System Overview</h2>
          <p className="text-surface-400 mt-1">Real-time infrastructure and project status.</p>
        </div>
        <Link href="/projects/new" className="btn-primary flex items-center gap-2 px-6">
          <Box className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Projects" 
          value={stats?.total_projects ?? 0} 
          icon={<Box className="h-5 w-5" />}
          description={`${stats?.online_projects ?? 0} running smoothly`}
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats?.success_rate ?? 98}%`} 
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={{ value: 2.4, isUp: true }}
        />
        <StatCard 
          title="Avg. Build Time" 
          value={stats?.avg_deployment_duration ?? '1m 42s'} 
          icon={<Clock className="h-5 w-5" />}
          description="Across all environments"
        />
        <StatCard 
          title="Open Tickets" 
          value={stats?.open_tickets ?? 0} 
          icon={<LifeBuoy className="h-5 w-5" />}
          description="Awaiting response"
          href="/support"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Deployments Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TerminalIcon className="h-5 w-5 text-brand-400" />
              Recent Activity
            </h3>
            <Link href="/deployments" className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-wider">
              View All History
            </Link>
          </div>

          <div className="card-premium overflow-hidden p-0 border-white/5 bg-surface-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Project</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Commit</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-surface-500">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.recent_deployments.map((dep, i) => (
                    <tr key={dep.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">{dep.project_name}</span>
                          <span className="text-[10px] text-surface-500 font-medium">{dep.branch}</span>
                        </div>
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
                        {dep.duration}
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

        {/* Critical Issues / Sidebar */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Attention Required
          </h3>
          
          <div className="space-y-3">
            {data?.projects_requiring_attention.map((proj) => (
              <div key={proj.id} className="card-premium p-4 border-warning/10 bg-warning/5 hover:bg-warning/10 transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-warning transition-colors">{proj.name}</h4>
                    <p className="text-xs text-surface-500 line-clamp-1">{proj.last_error || 'Unknown deployment failure'}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-surface-600 group-hover:text-warning transition-transform" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={proj.status} />
                  <span className="text-[10px] font-bold text-warning uppercase tracking-tighter">Fix Now</span>
                </div>
              </div>
            ))}
            {!data?.projects_requiring_attention.length && (
              <div className="card-premium p-8 text-center bg-success/5 border-success/10">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-success">All Systems Nominal</p>
                <p className="text-[10px] text-surface-500 mt-1">No critical issues detected in the last 24 hours.</p>
              </div>
            )}
          </div>

          {/* Quick Links Card */}
          <div className="card-premium p-5 bg-gradient-to-br from-brand-500/10 to-transparent border-brand-500/10">
            <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">Support & Resources</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center justify-between text-sm text-surface-300 hover:text-white group">
                Knowledge Base
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </a>
              <a href="#" className="flex items-center justify-between text-sm text-surface-300 hover:text-white group">
                Coolify Documentation
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </a>
              <a href="#" className="flex items-center justify-between text-sm text-surface-300 hover:text-white group">
                Contact Support
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
