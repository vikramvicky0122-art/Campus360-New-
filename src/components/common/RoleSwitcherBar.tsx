import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import {
  Users,
  Smartphone,
  Maximize2,
  Code2,
  ChevronDown,
  Check,
  ShieldCheck,
  UserPlus,
  LogIn,
  LogOut,
  FolderArchive,
  Download,
} from 'lucide-react';
import { AntigravityExportModal } from '../../features/export/AntigravityExportModal.tsx';

interface RoleSwitcherBarProps {
  onOpenRegister: () => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({ onOpenRegister }) => {
  const { user, switchUser, openLoginScreen, logout } = useAuth();
  const { isDeviceFrameActive, setIsDeviceFrameActive, openExpoViewer } = useMarketplace();
  const [isOpen, setIsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <div className="w-full bg-slate-900 text-slate-100 border-b border-emerald-950/60 text-xs py-2 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2 z-50">
      {/* Brand & Active Persona */}
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400">Campus</span> Bazaar
        </span>
        <span className="text-slate-600">|</span>

        {/* Persona Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-xl border border-slate-700/80 transition"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-200">
              {user ? `${user.fullName} (${user.role === 'admin' ? 'Admin' : user.verificationStatus})` : 'Guest / Sign In'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Test Persona</span>
                <span className="text-emerald-400 text-[9px]">1-Tap Demo</span>
              </div>
              <div className="space-y-1 mt-1">
                {DEMO_USERS.map((demo) => {
                  const isCurrent = user?.id === demo.id;
                  return (
                    <button
                      key={demo.id}
                      onClick={() => {
                        switchUser(demo.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition ${
                        isCurrent
                          ? 'bg-emerald-950/60 text-white border border-emerald-500/50'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          {demo.name}
                          {demo.role === 'admin' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {demo.roll} · {demo.status}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      openLoginScreen();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-emerald-400 hover:bg-slate-800 font-semibold text-xs transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Open Sign In Page (Credentials)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenRegister();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-300 hover:bg-slate-800 font-medium text-xs transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Register New Student Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Frame Toggles, Expo Code, Login Button */}
      <div className="flex items-center gap-2">
        {user ? (
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition font-medium"
            title="Sign out and visit Login page"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={openLoginScreen}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition font-semibold"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 text-teal-200 transition font-medium"
          title="Download ZIP archive & instructions for Antigravity"
        >
          <FolderArchive className="w-3.5 h-3.5 text-teal-300" />
          <span>Antigravity ZIP</span>
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition font-semibold"
          title="Download Verified ZIP or Get Direct Link"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download .ZIP</span>
        </button>

        <button
          onClick={openExpoViewer}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 transition font-medium"
          title="Inspect React Native & Expo Source Code"
        >
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Expo Android Code</span>
        </button>

        <button
          onClick={() => setIsDeviceFrameActive(!isDeviceFrameActive)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition font-medium ${
            isDeviceFrameActive
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
          }`}
          title="Toggle Mobile Bezel Shell"
        >
          {isDeviceFrameActive ? (
            <>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pixel Frame</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </>
          )}
        </button>
      </div>

      <AntigravityExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
