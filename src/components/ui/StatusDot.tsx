import React from 'react';

export interface StatusDotProps {
  status: 'online' | 'offline' | 'degraded' | 'syncing' | 'standby';
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  label,
  pulse,
  className = ''
}) => {
  const statusColors = {
    online: 'bg-[#34D399]',
    offline: 'bg-[#9AA6B7]',
    degraded: 'bg-[#FBBF24]',
    syncing: 'bg-[#42D9F5]',
    standby: 'bg-[#8A83FF]'
  };

  const shouldPulse = pulse !== undefined ? pulse : status === 'syncing';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${className}`}>
      <span className="relative flex h-2 w-2">
        {shouldPulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColors[status]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${statusColors[status]}`}
        />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
};
