import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const VerificationStatusCard: React.FC = () => {
  const { user } = useAuth();
  const { openVerificationModal } = useMarketplace();

  if (!user || user.role === 'admin') return null;

  if (user.isVerified) {
    return (
      <div className="mx-4 my-2 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-semibold text-emerald-900 dark:text-emerald-200">
              Verified Student Account
            </div>
            <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
              Roll #{user.rollNumber} · {user.department}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          Full Access
        </span>
      </div>
    );
  }

  if (user.verificationStatus === 'REJECTED') {
    return (
      <div className="mx-4 my-2 p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-xs space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-900 dark:text-rose-200">
              Student Verification Rejected
            </div>
            <div className="text-[11px] text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
              <strong>Admin Reason:</strong> "{user.rejectionReason || 'Uploaded ID card was not readable or expired.'}"
            </div>
          </div>
        </div>
        <button
          onClick={openVerificationModal}
          className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95"
        >
          <span>Resubmit Valid Student ID</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // PENDING state
  return (
    <div className="mx-4 my-2 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs space-y-2">
      <div className="flex items-start gap-2">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
        <div className="flex-1">
          <div className="font-bold text-amber-900 dark:text-amber-200">
            Verification In Progress
          </div>
          <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            Your ID (Roll #{user.rollNumber}) is awaiting administrator approval. You can browse, but purchasing and selling require verification.
          </div>
        </div>
      </div>
      <button
        onClick={openVerificationModal}
        className="w-full py-1.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
      >
        <span>View or Update Submitted ID</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
