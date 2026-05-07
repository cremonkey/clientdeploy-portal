'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Box, 
  LifeBuoy, 
  Settings, 
  LogOut, 
  Users,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Box },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminItems = [
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'agency_admin';

  return (
    <aside className="fixed inset-y-0 left-0 w-64 glass border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-glow">
          <Terminal className="text-white h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white leading-tight">ClientDeploy</span>
          <span className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-8">
        <div>
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-surface-500">Main Menu</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      : 'text-surface-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-brand-400' : 'group-hover:text-white'}`} />
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="ml-auto h-1 w-1 rounded-full bg-brand-400" 
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div>
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-surface-500">Administration</p>
            <nav className="space-y-1">
              {adminItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                        : 'text-surface-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-brand-400' : 'group-hover:text-white'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="h-10 w-10 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold border border-brand-500/20">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-500 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
