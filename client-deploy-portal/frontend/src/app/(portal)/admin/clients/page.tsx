'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  ExternalLink, 
  Shield, 
  Building2, 
  Mail,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Client {
  id: number;
  company_name: string;
  contact_email: string;
  status: 'active' | 'inactive' | 'suspended';
  projects_count: number;
  users_count: number;
  created_at: string;
}

export default function ClientsAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    try {
      const { data } = await adminApi.getClients();
      setClients(data.data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      company_name: formData.get('company_name'),
      contact_email: formData.get('contact_email'),
      status: formData.get('status'),
    };

    try {
      if (editingClient) {
        await adminApi.updateClient(editingClient.id, data);
      } else {
        await adminApi.createClient(data);
      }
      setIsModalOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to save client', err);
    }
  };

  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusMap = {
    active: { icon: CheckCircle2, class: 'text-success bg-success/10 border-success/20' },
    inactive: { icon: AlertTriangle, class: 'text-warning bg-warning/10 border-warning/20' },
    suspended: { icon: XCircle, class: 'text-danger bg-danger/10 border-danger/20' },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Management</h1>
          <p className="text-surface-400">Manage agency clients, their projects, and access.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 shadow-glow w-fit"
        >
          <Plus className="h-4 w-4" />
          Add New Client
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6 border-l-4 border-brand-500">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Total Clients</p>
          <p className="text-3xl font-bold text-white">{clients.length}</p>
        </div>
        <div className="card-premium p-6 border-l-4 border-success">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Active Projects</p>
          <p className="text-3xl font-bold text-white">
            {clients.reduce((acc, c) => acc + c.projects_count, 0)}
          </p>
        </div>
        <div className="card-premium p-6 border-l-4 border-brand-400">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Total Users</p>
          <p className="text-3xl font-bold text-white">
            {clients.reduce((acc, c) => acc + c.users_count, 0)}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input 
              type="text" 
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium w-full pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest text-center">Projects</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest text-center">Users</th>
                <th className="px-6 py-4 text-xs font-bold text-surface-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">No clients found.</td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const StatusIcon = statusMap[client.status].icon;
                  return (
                    <motion.tr 
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-surface-800 flex items-center justify-center text-brand-400">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{client.company_name}</p>
                            <p className="text-xs text-surface-500">{client.contact_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusMap[client.status].class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-white">
                          <Box className="h-3 w-3 text-brand-400" />
                          {client.projects_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-white">
                          <Users className="h-3 w-3 text-brand-400" />
                          {client.users_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingClient(client);
                              setIsModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button className="p-2 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
      >
        <form onSubmit={handleSaveClient} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Company Name</label>
              <input 
                name="company_name"
                defaultValue={editingClient?.company_name}
                required
                className="input-premium w-full"
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Contact Email</label>
              <input 
                name="contact_email"
                type="email"
                defaultValue={editingClient?.contact_email}
                required
                className="input-premium w-full"
                placeholder="contact@acme.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-surface-500">Account Status</label>
              <select 
                name="status"
                defaultValue={editingClient?.status || 'active'}
                className="input-premium w-full appearance-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="flex-[2] btn-primary shadow-glow">
              {editingClient ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
