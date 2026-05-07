'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Bell, 
  Globe, 
  Shield, 
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: 'UTC',
  });
  
  // Password State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const { data } = await authApi.updateProfile(profileData);
      setUser(data.user);
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.password_confirmation) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await authApi.updatePassword(passwordData);
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
      setStatus({ type: 'success', message: 'Password changed successfully!' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'password', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Settings Navigation */}
      <div className="flex items-center gap-1 bg-surface-900/50 p-1 rounded-xl border border-white/5 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setStatus(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-500 text-white shadow-glow' 
                  : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card-premium p-8"
              >
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-2xl font-bold text-white border-4 border-surface-900 shadow-xl">
                        {user?.name?.charAt(0)}
                      </div>
                      <button type="button" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white uppercase tracking-wider">
                        Change
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Your Avatar</h3>
                      <p className="text-xs text-surface-500">JPG, GIF or PNG. Max size of 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Full Name</label>
                      <input 
                        type="text" 
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="input-premium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Email Address</label>
                      <input 
                        type="email" 
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="input-premium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Timezone</label>
                      <select 
                        value={profileData.timezone}
                        onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                        className="input-premium w-full appearance-none"
                      >
                        <option value="UTC">UTC (Greenwich Mean Time)</option>
                        <option value="EST">EST (Eastern Standard Time)</option>
                        <option value="PST">PST (Pacific Standard Time)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary px-8 flex items-center gap-2 shadow-glow"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card-premium p-8"
              >
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Current Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="input-premium w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">New Password</label>
                      <input 
                        type="password" 
                        required
                        value={passwordData.password}
                        onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                        className="input-premium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Confirm Password</label>
                      <input 
                        type="password" 
                        required
                        value={passwordData.password_confirmation}
                        onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                        className="input-premium w-full"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary px-8 flex items-center gap-2 shadow-glow"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card-premium p-8 space-y-8"
              >
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-brand-400" />
                    Email Notifications
                  </h3>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'deploy_success', label: 'Deployment Success', desc: 'Get notified when your project is successfully deployed.' },
                      { id: 'deploy_fail', label: 'Deployment Failure', desc: 'Get notified immediately if a deployment fails.' },
                      { id: 'ticket_reply', label: 'Support Ticket Replies', desc: 'Get notified when a staff member replies to your ticket.' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">{item.label}</p>
                          <p className="text-[10px] text-surface-500">{item.desc}</p>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-surface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 shadow-glow-sm"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {status && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                status.type === 'success' 
                  ? 'bg-success/10 border-success/20 text-success' 
                  : 'bg-danger/10 border-danger/20 text-danger'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p className="text-xs font-bold">{status.message}</p>
            </motion.div>
          )}

          <div className="card-premium p-6 space-y-4">
            <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">2FA Enabled</span>
                <span className="text-[10px] font-bold text-danger px-1.5 py-0.5 rounded bg-danger/10 border border-danger/20 uppercase">Off</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">Last Password Change</span>
                <span className="text-xs text-white">3 months ago</span>
              </div>
            </div>
            <button className="w-full btn-secondary text-[10px] font-bold py-2.5">
              Setup Two-Factor
            </button>
          </div>

          <div className="card-premium p-6 space-y-4">
            <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language
            </h3>
            <select className="input-premium w-full text-xs font-bold">
              <option>English (United States)</option>
              <option>Spanish (Coming Soon)</option>
              <option>French (Coming Soon)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
