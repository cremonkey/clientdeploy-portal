import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  description?: string;
  loading?: boolean;
  href?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, description, loading, href }) => {
  const CardContent = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-400 group-hover:text-surface-300 transition-colors">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20 group-hover:text-brand-300 transition-all">
          {icon}
        </div>
      </div>
      
      {(trend || description) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend.isUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {trend.isUp ? '↑' : '↓'} {trend.value}%
            </span>
          )}
          {description && <span className="text-xs text-surface-500">{description}</span>}
        </div>
      )}

      {/* Background Glow Effect */}
      <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-all" />
    </>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium group relative overflow-hidden"
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-24 bg-surface-800 rounded animate-pulse" />
          <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
        </div>
      ) : (
        href ? (
          <Link href={href}>
            {CardContent}
          </Link>
        ) : (
          CardContent
        )
      )}
    </motion.div>
  );
};
