'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Copy, 
  ChevronDown, 
  Search, 
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Download,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalLogsProps {
  logs: string;
  title?: string;
  onClear?: () => void;
  className?: string;
  isSummary?: boolean;
  onRefresh?: () => void;
}

export const TerminalLogs = ({ 
  logs, 
  title = 'Terminal Logs', 
  onClear, 
  className,
  isSummary = false,
  onRefresh
}: TerminalLogsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    // You could trigger a toast here
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseLogLevel = (line: string) => {
    if (line.includes('ERROR') || line.includes('ERR')) return 'text-danger';
    if (line.includes('WARN')) return 'text-warning';
    if (line.includes('SUCCESS')) return 'text-success';
    if (line.includes('INFO')) return 'text-brand-400';
    if (line.includes('DEBUG')) return 'text-surface-500';
    return 'text-surface-300';
  };

  const filteredLogs = logs.split('\n').filter(line => 
    line.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn(
      "flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0B] shadow-2xl transition-all duration-300",
      isMaximized ? "fixed inset-4 z-[100]" : "relative h-[500px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-900/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10" />
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className={cn(
            "flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
            isSummary ? "text-brand-400" : "text-surface-400"
          )}>
            {isSummary ? <Copy className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
            {isSummary ? 'Deployment Summary' : title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative group hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-surface-500 group-focus-within:text-brand-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-lg py-1 pl-8 pr-3 text-[10px] text-white focus:outline-none focus:border-brand-500/50 w-32 focus:w-48 transition-all"
            />
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button 
            onClick={handleCopy}
            title="Copy logs"
            className="p-1.5 rounded-lg text-surface-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button 
            onClick={handleDownload}
            title="Download logs"
            className="p-1.5 rounded-lg text-surface-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <Download className="h-4 w-4" />
          </button>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              title="Refresh logs"
              className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          )}
          {onClear && (
            <button 
              onClick={onClear}
              title="Clear logs"
              className="p-1.5 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Logs View */}
      <div 
        ref={scrollRef}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
          setAutoScroll(isAtBottom);
        }}
        className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed custom-scrollbar selection:bg-brand-500/30"
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((line, i) => (
            <div key={i} className="flex gap-4 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
              <span className="text-surface-700 select-none min-w-[2.5rem] text-right">{i + 1}</span>
              <span className={cn("whitespace-pre-wrap break-all", parseLogLevel(line))}>
                {line}
              </span>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-surface-600 italic">
            {search ? 'No matches found in logs' : 'Waiting for output...'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900/50 border-t border-white/5 text-[10px] text-surface-500 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className={cn("h-1.5 w-1.5 rounded-full", logs ? "bg-success" : "bg-warning")} />
            {logs ? 'Streaming' : 'Idle'}
          </span>
          <span>{filteredLogs.length} Lines</span>
        </div>
        
        <button 
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
            autoScroll ? "text-brand-400 bg-brand-500/10" : "text-surface-500 hover:text-white"
          )}
        >
          <ChevronDown className={cn("h-3 w-3", autoScroll && "animate-bounce")} />
          Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
