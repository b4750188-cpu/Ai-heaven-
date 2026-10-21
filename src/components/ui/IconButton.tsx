import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for accessible screen readers (aria-label)
  variant?: 'ghost' | 'secondary' | 'primary' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'ghost',
      size = 'sm',
      active = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      xs: 'h-7 w-7 text-xs rounded',
      sm: 'h-8 w-8 text-xs rounded-md',
      md: 'h-9 w-9 text-sm rounded-md',
      lg: 'h-10 w-10 text-base rounded-lg'
    };

    const variantStyles = {
      ghost: active
        ? 'bg-[#171F2B] text-[#42D9F5] border border-[#283242]'
        : 'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#121822] active:bg-[#171F2B]',
      secondary: active
        ? 'bg-[#171F2B] text-[#42D9F5] border border-[#42D9F5]/40'
        : 'border border-[#283242] bg-[#121822] text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#171F2B] hover:border-[#3a475d]',
      primary:
        'bg-[#42D9F5] text-[#080B10] hover:bg-[#38c4de] active:bg-[#2ab3cd] shadow-xs',
      destructive:
        'border border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171] hover:bg-[#F87171]/20'
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={`inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5] disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer shrink-0 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
