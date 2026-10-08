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
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed select-none shrink-0';

  const sizeStyles = {
    xs: 'px-2 py-1 text-[11px] rounded gap-1.5',
    sm: 'px-3 py-1.5 text-xs rounded-md gap-2',
    md: 'px-4 py-2 text-sm rounded-md gap-2'
  };

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs border border-blue-500/30',
    secondary:
      'border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700 text-slate-200 active:bg-slate-800',
    destructive:
      'border border-rose-800/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 active:bg-rose-900',
    success:
      'border border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 active:bg-emerald-900',
    ghost:
      'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:bg-slate-800'
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
