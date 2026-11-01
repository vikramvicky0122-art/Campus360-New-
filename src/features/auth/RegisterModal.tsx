import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Institution } from '../../types/index.ts';
import { X, UserPlus, CheckCircle2, AlertCircle, Loader2, Clock, ShieldCheck } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const { register } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [rollNumber, setRollNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsRegistered(false);
      setResendStatus('');
      api.getInstitutions().then((res) => {
        if (res.institutions?.length) {
          setInstitutions(res.institutions);
          setInstitutionId(res.institutions[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !rollNumber || !phone || !institutionId) {
      setError('Please fill in all required registration fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register({
        fullName,
        email,
        phone,
        institutionId,
        department,
        yearOfStudy,
        rollNumber: rollNumber.trim(),
        password,
      });

      if (res.success) {
        setRegisteredEmail(email);
        setIsRegistered(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendStatus('');
    try {
      const res = await api.resendVerificationEmail(registeredEmail);
      if (res.success) {
        setResendStatus('Verification email resent! Check your inbox.');
      } else {
        setResendStatus(res.message || 'Failed to resend');
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Error resending verification');
    } finally {
      setResending(false);
    }
  };

  const departments = [
    'Computer Science & Engineering',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Electrical & Electronics',
    'Civil Engineering',
    'Biotechnology',
    'Information Technology',
    'Business & Management Studies',
    'Architecture & Design',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Registration</h3>
              <p className="text-[11px] text-slate-500">Campus-Exclusive Marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isRegistered ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Registration Submitted!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Role: <span className="font-semibold text-emerald-600">user</span> · Erode Sengunthar Engineering College
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pending Campus Admin Approval</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Your student account for <span className="font-mono font-bold">{registeredEmail}</span> has been created. No email verification link is required! Once the campus administrator approves your registration in the Admin Dashboard, you can log in immediately.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Vikram Sharma"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                College Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@esec.ac.in or college email"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="2024CS1090"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                College / Institution
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Year
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Register Student Account</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
