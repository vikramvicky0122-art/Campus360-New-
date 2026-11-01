import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { StudentVerification } from '../../types/index.ts';
import {
  ShieldCheck,
  XCircle,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Building,
} from 'lucide-react';

export const VerificationQueueScreen: React.FC = () => {
  const [verifications, setVerifications] = useState<StudentVerification[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [inspectDoc, setInspectDoc] = useState<StudentVerification | null>(null);
  const [rejectingItem, setRejectingItem] = useState<StudentVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('ID card photo is blurred or expired.');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchVerifications = async () => {
    try {
      const res = await api.getAdminVerifications(statusFilter !== 'all' ? statusFilter : undefined);
      if (res.success) {
        setVerifications(res.verifications);
      }
    } catch (err) {
      console.error('Failed to fetch verification queue:', err);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [statusFilter]);

  const [errorMessage, setErrorMessage] = useState('');

  const handleApprove = async (id: string) => {
    try {
      setIsActionLoading(true);
      setErrorMessage('');
      const res = await api.approveVerification(id);
      if (res.success) {
        await fetchVerifications();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    try {
      setIsActionLoading(true);
      setErrorMessage('');
      const res = await api.rejectVerification(rejectingItem.id, rejectionReason);
      if (res.success) {
        setRejectingItem(null);
        await fetchVerifications();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Rejection failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Sticky Filter Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Student Verification Queue
            </h2>
            <p className="text-[11px] text-slate-500">
              Admin Inspection & Roll Number Verification
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {['PENDING', 'VERIFIED', 'REJECTED', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Verification Queue List */}
      <div className="px-4 space-y-3">
        {verifications.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Queue is clear
            </h4>
            <p className="text-xs text-slate-500">No {statusFilter.toLowerCase()} verification requests found.</p>
          </div>
        ) : (
          verifications.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.studentName}
                  </h4>
                  <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                    Roll #{item.rollNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.department} · Year {item.yearOfStudy}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : item.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {/* Institution and Email */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.institutionName}</span>
                </div>
                <div>Email: <strong className="text-slate-900 dark:text-white">{item.collegeEmail}</strong></div>
                {item.rejectionReason && (
                  <div className="text-rose-600 dark:text-rose-400 pt-1 font-medium">
                    Rejection Note: "{item.rejectionReason}"
                  </div>
                )}
              </div>

              {/* Document Preview Trigger & Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setInspectDoc(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inspect ID Document</span>
                </button>

                {item.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRejectingItem(item)}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ID Document Inspection Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Student ID Document Inspection
                </h3>
                <p className="text-[10px] text-slate-500">Roll #{inspectDoc.rollNumber}</p>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[16/10] bg-slate-950">
              <img
                src={inspectDoc.documentUrl}
                alt="Student ID Document"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Verify that the photograph is clear, roll number <strong>{inspectDoc.rollNumber}</strong> matches institutional records, and the academic semester is currently valid.
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setInspectDoc(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close Preview
              </button>
              {inspectDoc.status === 'PENDING' && (
                <button
                  onClick={() => {
                    handleApprove(inspectDoc.id);
                    setInspectDoc(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Approve Student
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal (Reason Required) */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Reject Verification</span>
              </h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="p-1 rounded-full text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide a clear reason for rejecting <strong>{rejectingItem.studentName}</strong> (Roll #{rejectingItem.rollNumber}). This reason will be displayed on the student's dashboard.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. ID card expired or photo is blurred..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isActionLoading || !rejectionReason.trim()}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
