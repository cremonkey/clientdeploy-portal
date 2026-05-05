'use client';

import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Project {
  id: number; name: string; slug: string; domain: string | null;
  type: string; framework: string | null; status: string;
  last_deployment: { status: string; time: string } | null;
  can_deploy: boolean;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<number | null>(null);

  useEffect(() => {
    projectsApi.list().then(({ data }) => setProjects(data.projects)).finally(() => setLoading(false));
  }, []);

  const handleDeploy = async (id: number) => {
    setDeploying(id);
    try {
      await projectsApi.deploy(id);
      const { data } = await projectsApi.list();
      setProjects(data.projects);
    } catch (err: any) { alert(err.response?.data?.message || 'Deploy failed'); }
    finally { setDeploying(null); }
  };

  if (loading) return <div className="h-8 w-40 rounded-xl bg-surface-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-sm text-surface-200/40 mt-1">Manage your websites and applications</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white group-hover:text-brand-500 transition-colors">{p.name}</h3>
                {p.domain && <p className="text-xs text-surface-200/40 mt-0.5">{p.domain}</p>}
              </div>
              <span className={`badge ${p.status === 'active' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-neutral'}`}>{p.status}</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Link href={`/projects/${p.id}`} className="btn-secondary flex-1 text-center text-xs py-2">Details</Link>
              {p.can_deploy && (
                <button onClick={() => handleDeploy(p.id)} disabled={deploying === p.id} className="btn-primary text-xs py-2 px-4">
                  {deploying === p.id ? '⏳' : '🚀'} Deploy
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
