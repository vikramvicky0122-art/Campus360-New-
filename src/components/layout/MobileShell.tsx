import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import {
  Home,
  ShoppingBag,
  Plus,
  Package,
  User,
  LayoutDashboard,
  ShieldCheck,
  Users,
  ShieldAlert,
  IndianRupee,
  Sliders,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  MapPin,
  GraduationCap,
} from 'lucide-react';

interface MobileShellProps {
  children: React.ReactNode;
  onOpenNotifications: () => void;
  onOpenRegister?: () => void;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  onOpenNotifications,
}) => {
  const { user, activeRole } = useAuth();
  const {
    activeTab,
    setActiveTab,
    unreadNotifCount,
    unreadMessageCount,
    openAddProduct,
  } = useMarketplace();

  // Dark mode toggle
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  interface TabItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAction?: boolean;
    badge?: number;
  }

  const studentTabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'marketplace', label: 'Categories', icon: ShoppingBag },
    { id: 'sell', label: 'Sell', icon: Plus, isAction: true },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'profile', label: 'Profile', icon: User, badge: unreadMessageCount },
  ];

  const adminTabs: TabItem[] = [
    { id: 'admin_dashboard', label: 'Metrics', icon: LayoutDashboard },
    { id: 'admin_verifications', label: 'Verify', icon: ShieldCheck },
    { id: 'admin_users', label: 'Students', icon: Users },
    { id: 'admin_moderation', label: 'Moderate', icon: ShieldAlert },
    { id: 'admin_payments', label: 'Ledger', icon: IndianRupee },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const currentTabs = activeRole === 'admin' ? adminTabs : studentTabs;

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col antialiased text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* Native-style Top App Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Brand Icon */}
          <div
            onClick={() => setActiveTab('home')}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/25 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            CB
          </div>

          <div
            onClick={() => setActiveTab('home')}
            className="cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                Campus
              </span>
              <span className="font-extrabold text-sm tracking-tight text-emerald-600 dark:text-emerald-400">
                Bazaar
              </span>
              {user?.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              <GraduationCap className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">
                {user?.institutionName || 'Erode Sengunthar Engineering College'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* User Profile Avatar shortcut */}
          <button
            onClick={() => setActiveTab('profile')}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/50 hover:border-emerald-500 active:scale-95 transition"
            aria-label="My Profile"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Main Full-Screen Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-0 sm:px-4 py-2 pb-24 overflow-x-hidden">
        {children}
      </main>

      {/* Fixed Bottom Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 px-3 py-1.5 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pb-safe transition-colors">
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          // Center "Sell" Action Button
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => openAddProduct()}
                className="flex flex-col items-center justify-center -mt-6 group focus:outline-none"
                aria-label="Sell Product"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-4 border-white dark:border-slate-900 group-hover:scale-105 active:scale-95 transition-transform duration-200">
                  <Plus className="w-6 h-6 stroke-[2.75]" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 transition-all duration-150 active:scale-95 focus:outline-none ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-2'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[62px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
