import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import React from 'react';
import { VerificationStatus } from '../../types/resource';

interface Props {
  status: VerificationStatus;
  trustScore?: number;
  isDemoData?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const VerificationBadge: React.FC<Props> = ({
  status,
  trustScore,
  isDemoData,
  size = 'md'
}) => {
  const isSm = size === 'sm';

  if (isDemoData) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-amber-400 font-medium ${isSm ? 'text-[11px]' : 'text-xs'}`}>
        <AlertTriangle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>DEMO DATA (Unverified Sandbox)</span>
      </span>
    );
  }

  if (status === 'verified') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-emerald-400 font-medium ${isSm ? 'text-[11px]' : 'text-xs'}`}>
        <ShieldCheck className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Server-Verified</span>
        {trustScore !== undefined && (
          <span className="text-neutral-400 font-normal">
            ({trustScore}/100)
          </span>
        )}
      </span>
    );
  }

  if (status === 'community_verified') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-cyan-400 font-medium ${isSm ? 'text-[11px]' : 'text-xs'}`}>
        <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Community Verified</span>
        {trustScore !== undefined && (
          <span className="text-neutral-400 font-normal">
            ({trustScore}/100)
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-neutral-400 font-medium ${isSm ? 'text-[11px]' : 'text-xs'}`}>
      <Clock className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>Pending Verification</span>
    </span>
  );
};
