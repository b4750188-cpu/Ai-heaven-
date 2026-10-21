import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-mono font-medium text-[#9AA6B7]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3 text-[#9AA6B7] pointer-events-none">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-md border bg-[#0D1118] text-[#F1F4F8] placeholder-[#9AA6B7]/60 text-xs font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[#42D9F5] focus:border-[#42D9F5] disabled:opacity-50 disabled:cursor-not-allowed ${
              leadingIcon ? 'pl-9' : 'pl-3'
            } ${trailingIcon ? 'pr-9' : 'pr-3'} py-2 ${
              error ? 'border-[#F87171] focus:ring-[#F87171]' : 'border-[#283242]'
            } ${className}`}
            {...props}
          />
          {trailingIcon && (
            <div className="absolute right-3 text-[#9AA6B7]">
              {trailingIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] font-mono text-[#F87171]">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-[#9AA6B7]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
