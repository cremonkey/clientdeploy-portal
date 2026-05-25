'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, adminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import {
  Rocket,
  Box,
  Github,
  Code,
  ArrowLeft,
  Terminal,
  Globe,
  Settings2,
  ChevronRight,
  Info,
  ShieldOff,
  Building2,
  Link2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const ROLES_THAT_CAN_CREATE = ['super_admin', 'agency_admin'];

interface Client {
  id: number;
  company_name: string;
  slug: string;
  status: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: 'static',
    framework: '',
    repository_url: '',
    branch: 'main',
    coolify_application_uuid: '',
    build_command: '',
    install_command: '',
    start_command: '',
    publish_directory: '',
    base_directory: '',
  });

  useEffect(() => {
    adminApi.getClients()
      .then((res) => setClients(res.data.data || []))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setError('Please select a client for this project.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        client_id: Number(formData.client_id),
        repository_branch: formData.branch,
      };
      const { data } = await projectsApi.create(payload);
      router.push(`/projects/${data.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err.response?.data?.message || 'Failed to create project.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (user && !ROLES_THAT_CAN_CREATE.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-danger/10 border border-danger/20">
          <ShieldOff className="h-8 w-8 text-danger" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
          <p className="text-surface-400 mt-2">
            Only administrators can create new projects. Contact your agency admin to add a project to your account.
          </p>
        </div>
        <Link href="/projects" className="btn-secondary inline-flex items-center gap-2 px-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const projectTypes = [
    { id: 'static', label: 'Static Site', icon: Globe, description: 'React, Vue, Next.js (Export), or HTML' },
    { id: 'node', label: 'Node.js', icon: Code, description: 'Express, NestJS, or Next.js (SSR)' },
    { id: 'php', label: 'PHP / Laravel', icon: Box, description: 'Standard PHP or Laravel applications' },
    { id: 'docker', label: 'Docker', icon: Terminal, description: 'Any application with a Dockerfile' },
  ];

  const canSubmit = !loading && !!formData.name && !!formData.repository_url && !!formData.client_id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm font-medium text-surface-500">
        <Link href="/projects" className="hover:text-brand-400 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Projects
        </Link>
        <ChevronRight className="h-3 w-3 opacity-30" />
        <span className="text-white">Deploy New Project</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Deploy New Project</h1>
        <p className="text-surface-500">Connect a client repository and link it to a Coolify application.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-3"
          >
            <Info className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Client Assignment — required */}
            <div className="card-premium p-6 space-y-4 border-brand-500/20 bg-brand-500/[0.03]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-400" />
                Client Assignment
                <span className="ml-auto text-[10px] font-bold text-danger uppercase tracking-widest">Required</span>
              </h3>

              {clientsLoading ? (
                <div className="flex items-center gap-3 text-surface-500 text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clients…
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-surface-500">
                  No active clients found.{' '}
                  <Link href="/admin/clients" className="text-brand-400 hover:text-brand-300">
                    Create a client first.
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
                    Assign to Client
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="input-premium w-full appearance-none"
                  >
                    <option value="">— Select a client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} ({c.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-surface-600">
                    This client will own the project and all its deployments.
                  </p>
                </div>
              )}
            </div>

            {/* Project Identity */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-brand-400" />
                Project Settings
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="my-awesome-app"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-premium w-full"
                  />
                  <p className="text-[10px] text-surface-600">Used as the internal identifier and default slug.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Source Repository</label>
                  <div className="relative">
                    <Github className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/username/repo"
                      value={formData.repository_url}
                      onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
                      className="input-premium w-full pl-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Branch</label>
                    <input
                      type="text"
                      required
                      placeholder="main"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="input-premium w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Framework (Optional)</label>
                    <select
                      value={formData.framework}
                      onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
                      className="input-premium w-full appearance-none"
                    >
                      <option value="">Auto-detect</option>
                      <option value="nextjs">Next.js</option>
                      <option value="react">React</option>
                      <option value="vue">Vue</option>
                      <option value="laravel">Laravel</option>
                      <option value="express">Express</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Coolify Integration */}
            <div className="card-premium p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Link2 className="h-5 w-5 text-brand-400" />
                Coolify Integration
              </h3>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
                  Coolify Application UUID
                </label>
                <input
                  type="text"
                  placeholder="e.g. abc123de-f456-7890-ghij-klmnopqrstuv"
                  value={formData.coolify_application_uuid}
                  onChange={(e) => setFormData({ ...formData, coolify_application_uuid: e.target.value })}
                  className="input-premium w-full font-mono text-sm"
                />
                <p className="text-[10px] text-surface-600">
                  Find this in Coolify → your application → Settings. Required to trigger deployments and fetch logs.
                </p>
              </div>
            </div>

            {/* Build Configuration */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-brand-400" />
                Build Configuration
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Install Command</label>
                  <input
                    type="text"
                    placeholder="npm install"
                    value={formData.install_command}
                    onChange={(e) => setFormData({ ...formData, install_command: e.target.value })}
                    className="input-premium w-full font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Build Command</label>
                  <input
                    type="text"
                    placeholder="npm run build"
                    value={formData.build_command}
                    onChange={(e) => setFormData({ ...formData, build_command: e.target.value })}
                    className="input-premium w-full font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Start Command</label>
                    <input
                      type="text"
                      placeholder="npm start"
                      value={formData.start_command}
                      onChange={(e) => setFormData({ ...formData, start_command: e.target.value })}
                      className="input-premium w-full font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Publish Directory</label>
                    <input
                      type="text"
                      placeholder="dist or .next"
                      value={formData.publish_directory}
                      onChange={(e) => setFormData({ ...formData, publish_directory: e.target.value })}
                      className="input-premium w-full font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Base Directory</label>
                  <input
                    type="text"
                    placeholder="/ or ./app"
                    value={formData.base_directory}
                    onChange={(e) => setFormData({ ...formData, base_directory: e.target.value })}
                    className="input-premium w-full font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Environment Type */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Environment</h3>
              <div className="space-y-3">
                {projectTypes.map((t) => {
                  const Icon = t.icon;
                  const isActive = formData.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.id })}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                        isActive
                          ? 'bg-brand-500/10 border-brand-500 shadow-glow-sm'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className={`mt-1 p-2 rounded-lg ${isActive ? 'bg-brand-500 text-white' : 'bg-surface-800 text-surface-400'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-surface-300'}`}>{t.label}</p>
                        <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary & Submit */}
            <div className="card-premium p-6 bg-gradient-to-br from-brand-600/20 to-transparent border-brand-500/20 space-y-4">
              {formData.client_id && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-surface-400 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600">Assigning to</p>
                  <p className="text-white font-semibold">
                    {clients.find((c) => String(c.id) === formData.client_id)?.company_name}
                  </p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-medium leading-relaxed">
                The project will be created and linked to the selected client's workspace immediately.
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full btn-primary h-12 shadow-glow flex items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    Create Project
                  </>
                )}
              </button>
              <Link
                href="/projects"
                className="w-full btn-secondary h-12 flex items-center justify-center font-bold text-sm"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
