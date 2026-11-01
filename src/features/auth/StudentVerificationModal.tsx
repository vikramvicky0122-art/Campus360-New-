import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, Upload, Camera, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StudentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentVerificationModal: React.FC<StudentVerificationModalProps> = ({ isOpen, onClose }) => {
  const { user, submitVerification, refreshUser } = useAuth();
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [documentUrl, setDocumentUrl] = useState(
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      setErrorMessage('Please enter your institutional roll number.');
      return;
    }
    if (!documentUrl) {
      setErrorMessage('Please upload or select your student ID card image.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const ok = await submitVerification(rollNumber.trim(), documentUrl);
      if (ok) {
        setIsSuccess(true);
        await refreshUser();
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCardOptions = [
    {
      name: 'Current Semester Smart Card',
      url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
    },
    {
      name: 'College Library Pass',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
    },
    {
      name: 'Department Fee Receipt',
      url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Verification</h3>
              <p className="text-[11px] text-slate-500">College-Exclusive Identity Check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Request Submitted!</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your college verification request has been queued for administrator review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                College Roll / Registration Number
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 2024CS1042"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Must match your physical student ID card. Duplicate roll numbers are rejected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student ID Card Image
              </label>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[16/10] flex items-center justify-center group">
                <img
                  src={documentUrl}
                  alt="Student ID Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-3 opacity-90 group-hover:opacity-100 transition">
                  <Camera className="w-6 h-6 mb-1 text-blue-300" />
                  <span className="text-xs font-semibold">Document Attached</span>
                  <span className="text-[10px] opacity-80">{user?.institutionName}</span>
                </div>
              </div>

              {/* Sample card picker */}
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {sampleCardOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDocumentUrl(opt.url)}
                    className={`px-2 py-1 rounded-lg text-[10px] whitespace-nowrap font-medium border transition ${
                      documentUrl === opt.url
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>College Trust Guarantee:</strong> Only verified students of your university can purchase items or list products. Private documents are accessible exclusively to authorized campus admins.
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Document...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Submit for Admin Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
