'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi } from '@/lib/api';
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
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'static',
    framework: '',
    repository_url: '',
    branch: 'main',
    build_command: '',
    publish_directory: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await projectsApi.create(formData);
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const projectTypes = [
    { id: 'static', label: 'Static Site', icon: Globe, description: 'React, Vue, Next.js (Export), or HTML' },
    { id: 'node', label: 'Node.js', icon: Code, description: 'Express, NestJS, or Next.js (SSR)' },
    { id: 'php', label: 'PHP / Laravel', icon: Box, description: 'Standard PHP or Laravel applications' },
    { id: 'docker', label: 'Docker', icon: Terminal, description: 'Any application with a Dockerfile' },
  ];

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
        <p className="text-surface-500">Connect your repository and launch your application in minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium flex items-center gap-3"
          >
            <Info className="h-4 w-4" />
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                  <p className="text-[10px] text-surface-600">This will be used as the internal identifier and default slug.</p>
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

            {/* Build Configuration */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-brand-400" />
                Build Configuration
              </h3>
              
              <div className="space-y-4">
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
            </div>
          </div>

          <div className="space-y-6">
            {/* Project Type Picker */}
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

            {/* Action Card */}
            <div className="card-premium p-6 bg-gradient-to-br from-brand-600/20 to-transparent border-brand-500/20">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-medium leading-relaxed">
                  Your project will be deployed to a high-performance edge instance automatically.
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !formData.name || !formData.repository_url}
                  className="w-full btn-primary h-12 shadow-glow flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Rocket className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      <span>Create Project</span>
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
        </div>
      </form>
    </div>
  );
}
