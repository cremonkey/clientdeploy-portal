'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ticketsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Clock, 
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface Reply {
  id: number;
  message: string;
  created_at: string;
  user: {
    name: string;
    avatar: string | null;
    role: string;
  };
}

interface TicketDetail {
  id: number;
  subject: string;
  message: string;
  status: string;
  priority: string;
  updated_at: string;
  created_at: string;
  project?: { name: string };
  replies: Reply[];
  createdBy: { name: string; avatar: string | null };
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      const { data } = await ticketsApi.get(Number(id));
      setTicket(data.ticket);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    
    setSubmitting(true);
    try {
      await ticketsApi.reply(Number(id), replyMessage);
      setReplyMessage('');
      loadTicket();
    } catch (err) {
      alert('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="h-20 card-premium animate-pulse" />
        <div className="space-y-6">
          <div className="h-40 card-premium animate-pulse" />
          <div className="h-24 card-premium animate-pulse ml-12" />
        </div>
      </div>
    );
  }

  if (!ticket) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-16 w-16 text-danger mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
      <Link href="/support" className="btn-secondary mt-6">Back to Support</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link href="/support" className="w-fit flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-400 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Link>
        
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{ticket.subject}</h1>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                {ticket.project?.name || 'General Support'}
              </span>
              <span className="h-1 w-1 rounded-full bg-surface-700" />
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Opened {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-xl border font-bold text-[11px] uppercase tracking-widest ${
            ticket.priority === 'urgent' ? 'bg-danger/10 text-danger border-danger/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
            ticket.priority === 'high' ? 'bg-warning/10 text-warning border-warning/20' :
            'bg-surface-900 text-surface-400 border-white/5'
          }`}>
            {ticket.priority} Priority
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-6">
        {/* Original Message */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-6 border-brand-500/10 bg-brand-500/[0.02]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center text-surface-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{ticket.createdBy.name}</p>
              <p className="text-[10px] text-surface-500 font-bold uppercase">Ticket Creator</p>
            </div>
          </div>
          <div className="text-surface-300 text-sm leading-relaxed whitespace-pre-wrap">
            {ticket.message}
          </div>
        </motion.div>

        {/* Replies */}
        <div className="space-y-6">
          {ticket.replies.map((reply, i) => (
            <motion.div 
              key={reply.id}
              initial={{ opacity: 0, x: reply.user.role === 'client' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex flex-col ${reply.user.role === 'client' ? 'items-start pr-12' : 'items-end pl-12'}`}
            >
              <div className={`max-w-full p-6 rounded-2xl border ${
                reply.user.role === 'client' 
                  ? 'bg-surface-900 border-white/5 text-surface-300' 
                  : 'bg-brand-600/10 border-brand-500/20 text-white shadow-glow-sm'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    reply.user.role === 'client' ? 'bg-surface-800 text-surface-400' : 'bg-brand-500 text-white'
                  }`}>
                    {reply.user.role === 'client' ? <User className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {reply.user.name} 
                      {reply.user.role !== 'client' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-brand-500 text-white uppercase">Staff</span>}
                    </p>
                    <p className="text-[9px] text-surface-500 font-bold uppercase">{new Date(reply.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {reply.message}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Reply Input */}
      {ticket.status !== 'resolved' && (
        <div className="sticky bottom-8 z-10">
          <form onSubmit={handleSendReply} className="card-premium p-2 bg-surface-900/90 backdrop-blur-md border-white/10 shadow-2xl flex items-end gap-2">
            <textarea 
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={1}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white px-4 py-3 min-h-[48px] max-h-32 resize-none scrollbar-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={submitting || !replyMessage.trim()}
              className="h-12 w-12 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:bg-surface-800 disabled:text-surface-600 text-white flex items-center justify-center transition-all shadow-glow"
            >
              {submitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Clock className="h-5 w-5" />
                </motion.div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
