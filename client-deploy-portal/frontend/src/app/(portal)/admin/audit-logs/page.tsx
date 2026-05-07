'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Terminal, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldAlert,
  Download,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  action: string;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  ip_address: string;
  created_at: string;
  user?: { name: string; email: string };
  client?: { company_name: string };
  project?: { name: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getAuditLogs(p);
      setLogs(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const severityStyles = {
    info: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(search.toLowerCase()) || 
                         log.action.toLowerCase().includes(search.toLowerCase()) ||
                         log.user?.name.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severity === 'all' || log.severity === severity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">System Audit Logs</h1>
          <p className="text-surface-400">Track all administrative and security actions across the portal.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input-premium !py-2 !px-4 text-xs font-bold bg-surface-900"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
          <button 
            onClick={() => {
              const token = localStorage.getItem('token');
              window.open(`${process.env.NEXT_PUBLIC_API_URL}/admin/audit-logs/export?token=${token}`, '_blank');
            }}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4 hover:border-brand-500/50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={() => fetchLogs()}
            className="btn-secondary flex items-center gap-2 !py-2 !px-4"
          >
            <Activity className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="card-premium overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input 
              type="text" 
              placeholder="Search logs, users, or actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-premium w-full pl-10 text-sm py-2"
            />
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-bold text-surface-500">
            <span>Showing {filteredLogs.length} entries</span>
            <span className="text-surface-700">|</span>
            <span>Total {meta.total} records</span>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
              <p className="text-sm text-surface-500 font-medium">Synchronizing audit data...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-32 text-center">
              <ShieldAlert className="h-12 w-12 text-surface-700 mx-auto mb-4 opacity-20" />
              <p className="text-surface-500 text-sm font-medium">No audit entries found matching your criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-white/[0.01] transition-all flex flex-col md:flex-row md:items-center gap-6 group"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityStyles[log.severity]}`}>
                      {log.severity}
                    </span>
                    <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                      {log.action.replace('.', ' / ')}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium group-hover:text-brand-400 transition-colors">{log.description}</p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <div className="h-5 w-5 rounded-full bg-surface-800 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      {log.user?.name || 'System Auto'}
                    </div>
                    {log.client && (
                      <div className="flex items-center gap-1.5 text-xs text-surface-500">
                        <Terminal className="h-3.5 w-3.5" />
                        {log.client.company_name}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-surface-600 font-mono">
                      <Info className="h-3.5 w-3.5" />
                      {log.ip_address}
                    </div>
                  </div>
                </div>
                
                <div>
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="btn-secondary py-2 px-5 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all shadow-glow hover:shadow-brand-500/10"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary py-1.5 px-4 disabled:opacity-30 flex items-center gap-2 text-xs font-bold"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(meta.last_page, 5) }).map((_, i) => (
              <button 
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  page === i + 1 ? 'bg-brand-500 text-white shadow-glow' : 'text-surface-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button 
            disabled={page === meta.last_page}
            onClick={() => setPage(page + 1)}
            className="btn-secondary py-1.5 px-4 disabled:opacity-30 flex items-center gap-2 text-xs font-bold"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Activity Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Action Type</p>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${selectedLog.severity === 'danger' ? 'bg-danger' : selectedLog.severity === 'warning' ? 'bg-warning' : 'bg-brand-500'}`} />
                  {selectedLog.action}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Timestamp</p>
                <p className="text-sm font-medium text-white">{format(new Date(selectedLog.created_at), 'MMMM dd, yyyy HH:mm:ss')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Initiated By</p>
                <p className="text-sm font-medium text-white">{selectedLog.user?.name || 'System Process'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">IP Address</p>
                <p className="text-sm font-mono text-white">{selectedLog.ip_address}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Description</p>
              <div className="p-4 rounded-xl bg-surface-900 border border-white/5 text-sm text-surface-300 leading-relaxed">
                {selectedLog.description}
              </div>
            </div>

            {/* Changes Payload */}
            {(selectedLog as any).changes && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="h-3 w-3" />
                  Data Changes
                </p>
                <div className="card-premium p-0 bg-surface-950 overflow-hidden">
                  <div className="bg-white/[0.03] px-4 py-2 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-surface-500 uppercase">Payload Diff</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(JSON.stringify((selectedLog as any).changes, null, 2))}
                      className="text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-4 text-[11px] font-mono text-surface-400 overflow-x-auto custom-scrollbar leading-normal">
                    {JSON.stringify((selectedLog as any).changes, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Metadata Payload */}
            {(selectedLog as any).metadata && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  Context Metadata
                </p>
                <div className="card-premium p-4 bg-surface-900 border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries((selectedLog as any).metadata).map(([key, value]) => (
                      <div key={key} className="space-y-0.5">
                        <p className="text-[9px] font-bold text-surface-600 uppercase">{key}</p>
                        <p className="text-xs font-mono text-surface-300 truncate">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
