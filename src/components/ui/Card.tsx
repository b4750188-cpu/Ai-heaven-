import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'elevated' | 'interactive' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'standard',
  padding = 'md',
  className = '',
  ...props
}) => {
  const variantStyles = {
    standard: 'bg-[#121822] border border-[#283242] text-[#F1F4F8]',
    elevated: 'bg-[#171F2B] border border-[#283242] text-[#F1F4F8] shadow-xs',
    interactive:
      'bg-[#121822] border border-[#283242] text-[#F1F4F8] hover:border-[#42D9F5]/40 hover:bg-[#171F2B] transition-colors cursor-pointer',
    flat: 'bg-[#0D1118] border border-[#283242]/70 text-[#F1F4F8]'
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8'
  };

  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
