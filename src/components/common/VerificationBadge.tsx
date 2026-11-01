import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { VerificationStatus } from '../../types/index.ts';

interface VerificationBadgeProps {
  status?: VerificationStatus;
  isVerified?: boolean;
  isSuspended?: boolean;
  size?: 'sm' | 'md';
  showText?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status = 'PENDING',
  isVerified = false,
  isSuspended = false,
  size = 'md',
  showText = true,
}) => {
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        <ShieldAlert className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {showText && <span>Suspended</span>}
      </span>
    );
  }

  if (isVerified || status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {showText && <span>Verified Student</span>}
      </span>
    );
  }

  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        <AlertCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {showText && <span>Verification Rejected</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Clock className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {showText && <span>Verification Pending</span>}
    </span>
  );
};
