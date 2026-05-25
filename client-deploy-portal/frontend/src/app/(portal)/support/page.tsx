'use client';

import { useEffect, useState } from 'react';
import { ticketsApi, projectsApi } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

interface Ticket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  updated_at: string;
  project?: { name: string } | null;
  replies_count?: number;
}

interface ProjectOption {
  id: number;
  name: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    project_id: '',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);

  const normalizeTickets = (response: any): Ticket[] => {
    const payload = response?.data;

    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.tickets)) return payload.tickets;
    if (Array.isArray(payload)) return payload;

    return [];
  };

  const normalizeProjects = (response: any): ProjectOption[] => {
    const payload = response?.data;

    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.projects)) return payload.projects;
    if (Array.isArray(payload)) return payload;

    return [];
  };

  const loadTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ticketsApi.list();
      setTickets(normalizeTickets(response));
    } catch (err: any) {
      console.error('Tickets fetch failed:', err);
      setError(err?.response?.data?.message || 'Failed to load support tickets.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);

    try {
      const response = await projectsApi.list();
      setProjects(normalizeProjects(response));
    } catch (err) {
      console.error('Projects fetch failed:', err);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    loadProjects();
  }, []);

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      await ticketsApi.create({
        ...newTicket,
        project_id: newTicket.project_id ? Number(newTicket.project_id) : undefined,
      });

      setIsModalOpen(false);
      setNewTicket({
        subject: '',
        message: '',
        project_id: '',
        priority: 'medium',
      });

      await loadTickets();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-surface-800 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-surface-800 rounded-xl animate-pulse" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 card-premium animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-10 text-center border-red-500/20 bg-red-500/5">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Support Error</h2>
        <p className="text-sm text-surface-400 mt-2">{error}</p>

        <button onClick={loadTickets} className="btn-primary mt-6 px-6">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <LifeBuoy className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Support Tickets
            </h1>
            <p className="text-sm text-surface-500">
              Need help? Our engineers are ready to assist you.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-6 h-12 shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Open New Ticket
        </button>
      </div>

      <div className="card-premium p-0 overflow-hidden">
        {tickets.length > 0 ? (
          <div className="divide-y divide-white/5">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 h-10 w-10 rounded-xl flex items-center justify-center border ${
                      ticket.status === 'open'
                        ? 'bg-success/5 border-success/20 text-success'
                        : 'bg-surface-800 border-white/5 text-surface-500'
                    }`}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-3">
                      {ticket.subject}

                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${
                          ticket.priority === 'urgent'
                            ? 'bg-danger/10 text-danger border border-danger/20'
                            : ticket.priority === 'high'
                              ? 'bg-warning/10 text-warning border border-warning/20'
                              : 'bg-surface-800 text-surface-400 border border-white/5'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-surface-500">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        {ticket.project?.name || 'General Support'}
                      </span>

                      <span className="h-1 w-1 rounded-full bg-surface-700" />

                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Updated{' '}
                        {ticket.updated_at
                          ? new Date(ticket.updated_at).toLocaleDateString()
                          : 'recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <StatusBadge status={ticket.status} />
                  <ChevronRight className="h-5 w-5 text-surface-700 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-surface-900 border border-white/5 rounded-3xl flex items-center justify-center text-surface-700 mx-auto">
              <LifeBuoy className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No active tickets</h3>
              <p className="text-surface-500 text-sm max-w-xs mx-auto">
                Everything looks clear! If you encounter any issues, feel free to open a ticket.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-secondary !h-10 px-6 text-xs font-bold"
            >
              Open Your First Ticket
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Open New Support Ticket"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary px-6 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              onClick={handleCreateTicket}
              disabled={submitting || !newTicket.subject.trim() || !newTicket.message.trim()}
              className="btn-primary px-8 text-xs font-bold shadow-glow disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Submit Ticket'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
              Subject
            </label>

            <input
              type="text"
              required
              placeholder="How can we help you?"
              value={newTicket.subject}
              onChange={(event) =>
                setNewTicket({ ...newTicket, subject: event.target.value })
              }
              className="input-premium w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
                Related Project
              </label>

              <select
                value={newTicket.project_id}
                onChange={(event) =>
                  setNewTicket({ ...newTicket, project_id: event.target.value })
                }
                className="input-premium w-full appearance-none"
                disabled={projectsLoading}
              >
                <option value="">
                  {projectsLoading ? 'Loading projects...' : 'General Support'}
                </option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
                Priority
              </label>

              <select
                value={newTicket.priority}
                onChange={(event) =>
                  setNewTicket({ ...newTicket, priority: event.target.value })
                }
                className="input-premium w-full appearance-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-surface-500">
              Message
            </label>

            <textarea
              required
              rows={5}
              placeholder="Describe your issue in detail..."
              value={newTicket.message}
              onChange={(event) =>
                setNewTicket({ ...newTicket, message: event.target.value })
              }
              className="input-premium w-full resize-none py-3"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
