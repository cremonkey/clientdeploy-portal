'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.login(email, password);
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-600/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow mb-6"
          >
            <Terminal className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white tracking-tight">ClientDeploy</h1>
          <p className="text-surface-400 mt-2 font-medium">Enterprise Deployment Management</p>
        </div>

        {/* Login Form Card */}
        <div className="card-premium p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-surface-500 ml-1">Email Address</label>
              <div className="relative group">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-premium pl-11"
                  placeholder="name@agency.com"
                />
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 group-focus-within:text-brand-400 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-widest text-surface-500 ml-1">Password</label>
              <div className="relative group">
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-premium pl-11"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 group-focus-within:text-brand-400 transition-colors" />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-base font-bold shadow-glow relative overflow-hidden group/btn"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Terminal className="h-5 w-5" />
                    </motion.div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Access Portal
                    <Zap className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button className="text-sm font-medium text-surface-400 hover:text-brand-400 transition-colors flex items-center justify-center gap-2 mx-auto">
              <Shield className="h-3 w-3" />
              Forgot access credentials?
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-surface-600 text-xs font-bold uppercase tracking-[0.2em]">
            Secure Infrastructure &copy; {new Date().getFullYear()} Creative Monkey
          </p>
          <div className="flex gap-6 opacity-30">
            <div className="h-8 w-20 bg-surface-800 rounded animate-pulse" />
            <div className="h-8 w-20 bg-surface-800 rounded animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
