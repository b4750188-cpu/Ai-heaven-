import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  statusBadge?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  statusBadge,
  className = ''
}) => {
  return (
    <div
      className={`rounded-xl border border-dashed border-[#283242] bg-[#0D1118]/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="p-3 bg-[#121822] text-[#9AA6B7] border border-[#283242] rounded-xl mb-1">
        {icon}
      </div>
      {statusBadge}
      <h3 className="text-sm font-semibold text-[#F1F4F8] font-mono tracking-tight">{title}</h3>
      <p className="text-xs text-[#9AA6B7] max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
