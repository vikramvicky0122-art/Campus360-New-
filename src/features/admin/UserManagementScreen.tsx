import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Profile } from '../../types/index.ts';
import { VerificationBadge } from '../../components/common/VerificationBadge.tsx';
import {
  Search,
  Users,
  ShieldAlert,
  ShieldCheck,
  Building,
  GraduationCap,
  Ban,
  CheckCircle,
  X,
} from 'lucide-react';

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.getAdminUsers(searchQuery);
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleSuspend = async (userId: string) => {
    try {
      setIsUpdating(true);
      setErrorMessage('');
      const res = await api.toggleSuspendUser(userId);
      if (res.success) {
        await fetchUsers();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Student User Management
          </h2>
          <p className="text-[11px] text-slate-500">
            Search students across name, email, roll number, or department
          </p>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, roll '2023CS...', or email..."
            className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="px-4 space-y-3">
        {users.map((student) => (
          <div
            key={student.id}
            className={`p-4 rounded-3xl border transition space-y-3 ${
              student.isSuspended
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-sm text-blue-700 dark:text-blue-300 shrink-0">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {student.fullName}
                  </h4>
                  <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                    Roll #{student.rollNumber}
                  </div>
                </div>
              </div>

              <VerificationBadge
                status={student.verificationStatus}
                isVerified={student.isVerified}
                isSuspended={student.isSuspended}
                size="sm"
              />
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{student.institutionName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {student.department} · Year {student.yearOfStudy}
                </span>
              </div>
              <div>Email: <strong className="text-slate-900 dark:text-white">{student.email}</strong></div>
              <div>Contact: {student.phone}</div>
            </div>

            {/* Admin Actions */}
            {student.role !== 'admin' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => handleToggleSuspend(student.id)}
                  disabled={isUpdating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    student.isSuspended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {student.isSuspended ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Reactivate Student Account</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Suspend Student</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
