'use client';

import { useEffect, useState } from 'react';
import { notificationsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  Trash, 
  Clock, 
  Server, 
  MessageSquare, 
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  data: {
    message: string;
    project_id?: number;
    ticket_id?: number;
    type: 'deployment' | 'ticket' | 'system';
    status?: string;
  };
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsApi.list();
      setNotifications(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deployment': return <Server className="h-5 w-5" />;
      case 'ticket': return <MessageSquare className="h-5 w-5" />;
      default: return <ShieldAlert className="h-5 w-5" />;
    }
  };

  const getLink = (notif: Notification) => {
    if (notif.data.type === 'deployment') return `/projects/${notif.data.project_id}`;
    if (notif.data.type === 'ticket') return `/support/${notif.data.ticket_id}`;
    return '#';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-surface-400 text-sm">Stay updated with your projects and support tickets.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="btn-secondary flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      <div className="card-premium overflow-hidden divide-y divide-white/5">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-surface-500 text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Bell className="h-8 w-8 text-surface-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">All caught up!</h3>
            <p className="text-surface-500 text-sm">You don't have any notifications at the moment.</p>
          </div>
        ) : (
          notifications.map((notif, i) => (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-6 hover:bg-white/[0.02] transition-colors flex gap-6 ${!notif.read_at ? 'bg-brand-500/[0.03]' : ''}`}
            >
              <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-glow-sm ${
                notif.data.type === 'deployment' ? 'bg-brand-600/10 border-brand-500/20 text-brand-400' :
                notif.data.type === 'ticket' ? 'bg-success/10 border-success/20 text-success' :
                'bg-surface-800 border-white/5 text-surface-400'
              }`}>
                {getIcon(notif.data.type)}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <p className={`text-base leading-relaxed ${!notif.read_at ? 'text-white font-bold' : 'text-surface-300'}`}>
                    {notif.data.message}
                  </p>
                  <div className="flex items-center gap-2">
                    {!notif.read_at && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all tooltip"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <Link 
                      href={getLink(notif)}
                      className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-surface-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                  {!notif.read_at && (
                    <span className="px-2 py-0.5 rounded bg-brand-500 text-white font-bold text-[9px] uppercase tracking-wider">New</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
