import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'xs' | 'sm';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = ''
}) => {
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs'
  };

  const variantStyles = {
    neutral: 'bg-[#121822] text-[#9AA6B7] border-[#283242]',
    default: 'bg-[#171F2B] text-[#F1F4F8] border-[#283242]',
    success: 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30',
    warning: 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30',
    danger: 'bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30',
    info: 'bg-[#42D9F5]/10 text-[#42D9F5] border-[#42D9F5]/30'
  };

  const dotColors = {
    neutral: 'bg-[#9AA6B7]',
    default: 'bg-[#F1F4F8]',
    success: 'bg-[#34D399]',
    warning: 'bg-[#FBBF24]',
    danger: 'bg-[#F87171]',
    info: 'bg-[#42D9F5]'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-mono font-medium tracking-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
