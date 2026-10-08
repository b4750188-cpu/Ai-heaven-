import { X } from 'lucide-react';
import React from 'react';

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'md'
}) => {
  if (!isOpen) return null;

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Container */}
      <div
        className={`relative z-10 w-full ${widthStyles[width]} border-l border-slate-800 bg-[#0B0F19] p-6 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200`}
      >
        {/* Panel Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-100 font-mono tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};
