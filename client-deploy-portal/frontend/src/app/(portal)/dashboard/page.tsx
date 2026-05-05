'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { motion } from 'framer-motion';

interface DashboardData {
  stats: {
    total_projects: number;
    online_projects: number;
    failed_deployments_7d: number;
    open_tickets: number;
  };
  last_deployment: { status: string; project: string; time: string } | null;
  recent_deployments: Array<{
    id: number; project_name: string; status: string; branch: string;
    commit_hash: string; triggered_at: string; duration: string;
  }>;
}

const statusColors: Record<string, string> = {
  success: 'badge-success', failed: 'badge-danger', queued: 'badge-neutral',
  building: 'badge-info', deploying: 'badge-info', running: 'badge-success',
};

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
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-xl bg-surface-200 dark:bg-surface-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  const statCards = [
    { label: 'Total Projects', value: stats?.total_projects ?? 0, icon: '📦', color: 'from-brand-500/10 to-brand-500/5' },
    { label: 'Online', value: stats?.online_projects ?? 0, icon: '🟢', color: 'from-success/10 to-success/5' },
    { label: 'Failed (7d)', value: stats?.failed_deployments_7d ?? 0, icon: '🔴', color: 'from-danger/10 to-danger/5' },
    { label: 'Open Tickets', value: stats?.open_tickets ?? 0, icon: '🎫', color: 'from-warning/10 to-warning/5' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-surface-700/60 dark:text-surface-200/40 mt-1">Overview of your projects and deployments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={`card bg-gradient-to-br ${stat.color}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-700/60 dark:text-surface-200/50">{stat.label}</p>
                <p className="text-3xl font-bold text-brand-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Deployments */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-brand-900 dark:text-white mb-4">Recent Deployments</h2>

        {!data?.recent_deployments?.length ? (
          <div className="text-center py-12 text-surface-700/40 dark:text-surface-200/30">
            <svg className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm">No deployments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recent_deployments.map((dep, i) => (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`status-dot status-dot-${dep.status === 'success' ? 'online' : dep.status === 'failed' ? 'failed' : 'deploying'}`} />
                  <div>
                    <p className="text-sm font-medium text-brand-900 dark:text-white">{dep.project_name}</p>
                    <p className="text-xs text-surface-700/50 dark:text-surface-200/40">
                      {dep.branch} • {dep.commit_hash || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${statusColors[dep.status] || 'badge-neutral'}`}>{dep.status}</span>
                  {dep.duration && <span className="text-xs text-surface-700/40 dark:text-surface-200/30">{dep.duration}</span>}
                  <span className="text-xs text-surface-700/40 dark:text-surface-200/30">
                    {new Date(dep.triggered_at).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
