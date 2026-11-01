import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  GraduationCap,
} from 'lucide-react';

interface LoginScreenProps {
  onOpenRegister: () => void;
  onOpenForgotPassword: () => void;
  onContinueAsGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onOpenRegister,
  onOpenForgotPassword,
  onContinueAsGuest,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your college email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const ok = await login(email.trim(), password);
      if (!ok) {
        setErrorMessage('Invalid credentials or account suspended.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col justify-center items-center px-4 py-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Erode Sengunthar Engineering College</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Campus <span className="text-emerald-600 dark:text-emerald-400">Bazaar</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            College-exclusive marketplace for textbooks, electronics, and campus essentials
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Student Sign In</h2>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Campus Auth
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                College Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@esec.ac.in or registered email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-3.5 py-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px]">Remember on this device</span>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Register & Explore Footers */}
        <div className="text-center space-y-3">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            New student on campus?{' '}
            <button
              onClick={onOpenRegister}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Register Student ID</span>
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {onContinueAsGuest && (
            <button
              onClick={onContinueAsGuest}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
            >
              Browse Campus Catalog as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
