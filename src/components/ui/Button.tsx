import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'sm',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#42D9F5] disabled:opacity-50 disabled:cursor-not-allowed select-none shrink-0 cursor-pointer';

  const sizeStyles = {
    xs: 'px-2 py-1 text-[11px] rounded gap-1.5',
    sm: 'px-3 py-1.5 text-xs rounded-md gap-2',
    md: 'px-4 py-2 text-sm rounded-md gap-2'
  };

  const variantStyles = {
    primary:
      'bg-[#42D9F5] hover:bg-[#38c4de] active:bg-[#2ab3cd] text-[#080B10] font-semibold shadow-xs border border-[#42D9F5]/40',
    secondary:
      'border border-[#283242] bg-[#121822] hover:bg-[#171F2B] hover:border-[#3a475d] text-[#F1F4F8] active:bg-[#171F2B]',
    destructive:
      'border border-[#F87171]/40 bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] active:bg-[#F87171]/30',
    success:
      'border border-[#34D399]/40 bg-[#34D399]/10 hover:bg-[#34D399]/20 text-[#34D399] active:bg-[#34D399]/30',
    ghost:
      'text-[#9AA6B7] hover:text-[#F1F4F8] hover:bg-[#171F2B] active:bg-[#121822]'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
