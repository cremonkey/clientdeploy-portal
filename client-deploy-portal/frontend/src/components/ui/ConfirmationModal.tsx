'use client';

import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'brand';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'brand',
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button 
            onClick={onClose}
            className="btn-secondary px-6 text-xs font-bold"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-glow ${
              variant === 'danger' 
                ? 'bg-danger text-white hover:bg-danger/80' 
                : 'bg-brand-500 text-white hover:bg-brand-400'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={`h-12 w-12 rounded-xl shrink-0 flex items-center justify-center ${
          variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-brand-500/10 text-brand-400'
        }`}>
          {variant === 'danger' ? <Trash2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
        </div>
        <div className="space-y-2">
          <p className="text-white font-bold">{title}</p>
          <p className="text-sm text-surface-400 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
