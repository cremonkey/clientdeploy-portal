import React from 'react';

export type StatusType = 'queued' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled' | 'active' | 'running' | 'stopped' | 'ready';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const s = status.toLowerCase();

  const config: Record<string, { label: string; classes: string; dot: string }> = {
    success: { label: 'Success', classes: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
    active: { label: 'Active', classes: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
    running: { label: 'Running', classes: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
    failed: { label: 'Failed', classes: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger' },
    error: { label: 'Error', classes: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger' },
    deploying: { label: 'Deploying', classes: 'bg-brand-500/10 text-brand-400 border-brand-500/20', dot: 'bg-brand-400 animate-pulse' },
    building: { label: 'Building', classes: 'bg-brand-500/10 text-brand-400 border-brand-500/20', dot: 'bg-brand-400 animate-pulse' },
    queued: { label: 'Queued', classes: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
    pending: { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
    cancelled: { label: 'Cancelled', classes: 'bg-surface-800 text-surface-400 border-surface-700', dot: 'bg-surface-600' },
    stopped: { label: 'Stopped', classes: 'bg-surface-800 text-surface-400 border-surface-700', dot: 'bg-surface-600' },
    ready: { label: 'Ready', classes: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  };

  const { label, classes, dot } = config[s] || { label: status, classes: 'bg-surface-800 text-surface-400 border-surface-700', dot: 'bg-surface-600' };

  return (
    <span className={`badge-premium px-2.5 py-0.5 ${classes} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} mr-2`} />
      {label}
    </span>
  );
};
