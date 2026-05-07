'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  Trash, 
  ExternalLink, 
  Clock, 
  ShieldAlert, 
  Server,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';
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

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsApi.list();
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

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
      case 'deployment': return <Server className="h-4 w-4" />;
      case 'ticket': return <MessageSquare className="h-4 w-4" />;
      default: return <ShieldAlert className="h-4 w-4" />;
    }
  };

  const getLink = (notif: Notification) => {
    if (notif.data.type === 'deployment') return `/projects/${notif.data.project_id}`;
    if (notif.data.type === 'ticket') return `/support/${notif.data.ticket_id}`;
    return '#';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
      >
        <Bell className="h-5 w-5 text-surface-400 group-hover:text-brand-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-brand-500 rounded-full border-2 border-surface-950 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 glass overflow-hidden rounded-2xl border border-white/10 shadow-2xl z-50"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">
                  {unreadCount} Unread Messages
                </p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-widest"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-6 w-6 text-surface-600" />
                  </div>
                  <p className="text-sm text-surface-500">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`relative p-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors group ${!notif.read_at ? 'bg-brand-500/[0.02]' : ''}`}
                  >
                    {!notif.read_at && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                    )}
                    
                    <div className="flex gap-4">
                      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
                        notif.data.type === 'deployment' ? 'bg-brand-500/10 text-brand-400' :
                        notif.data.type === 'ticket' ? 'bg-success/10 text-success' :
                        'bg-surface-800 text-surface-400'
                      }`}>
                        {getIcon(notif.data.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-xs leading-relaxed ${!notif.read_at ? 'font-bold text-white' : 'text-surface-300'}`}>
                            {notif.data.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[10px] text-surface-500 font-medium">
                            <Clock className="h-3 w-3" />
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                          <Link 
                            href={getLink(notif)}
                            onClick={() => {
                              setIsOpen(false);
                              if (!notif.read_at) markAsRead(notif.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase"
                          >
                            View details
                            <ChevronRight className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-white/[0.02] border-t border-white/5">
              <Link 
                href="/notifications" 
                className="block text-center text-[10px] font-bold text-surface-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
