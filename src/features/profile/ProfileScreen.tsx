import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { VerificationBadge } from '../../components/common/VerificationBadge.tsx';
import {
  ShieldCheck,
  Package,
  Heart,
  ShoppingBag,
  ExternalLink,
  LogOut,
  Code2,
  FileCheck2,
  AlertCircle,
  Building2,
  GraduationCap,
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { user, logout, switchUser } = useAuth();
  const {
    products,
    favourites,
    orders,
    setActiveTab,
    openVerificationModal,
    openExpoViewer,
    openAddProduct,
    openProductDetails,
  } = useMarketplace();

  if (!user) return null;

  const myListings = products.filter((p) => p.sellerId === user.id);
  const mySoldItems = myListings.filter((p) => p.availabilityStatus === 'SOLD');

  return (
    <div className="pb-8 space-y-4">
      {/* Top Header */}
      <div className="pt-4 px-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Student Profile
        </h2>
        <p className="text-xs text-slate-500">Verified Campus Bazaar Identity</p>
      </div>

      {/* Digital Student Identity Card (Card Motif) */}
      <div className="px-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-5 shadow-xl border border-emerald-800/40 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-sm">
                CB
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
                  {user.institutionName || 'Apex Institute of Technology'}
                </div>
                <div className="text-[10px] text-slate-400">Student Identity Card</div>
              </div>
            </div>

            <VerificationBadge
              status={user.verificationStatus}
              isVerified={user.isVerified}
              isSuspended={user.isSuspended}
              size="sm"
            />
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-white/20 overflow-hidden shrink-0">
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate">{user.fullName}</h3>
              <div className="text-xs text-emerald-300 font-mono tracking-wide">
                Roll #{user.rollNumber}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {user.department} · Year {user.yearOfStudy}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>{user.email}</span>
            <span>{user.phone}</span>
          </div>
        </div>
      </div>

      {/* Verification Notice / Call to Action */}
      {!user.isVerified && (
        <div className="px-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>
                {user.verificationStatus === 'REJECTED'
                  ? 'ID Verification Rejected'
                  : 'Verification Under Review'}
              </span>
            </div>
            {user.rejectionReason && (
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Reason: "{user.rejectionReason}"
              </p>
            )}
            <button
              onClick={openVerificationModal}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-xs transition"
            >
              {user.verificationStatus === 'REJECTED' ? 'Resubmit Student ID' : 'Update Verification Document'}
            </button>
          </div>
        </div>
      )}

      {/* Activity Statistics Strip */}
      <div className="px-4 grid grid-cols-3 gap-2 text-center">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {myListings.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">My Listings</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {mySoldItems.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Items Sold</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {favourites.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Favourites</div>
        </div>
      </div>

      {/* My Active Listings Section */}
      {myListings.length > 0 && (
        <div className="px-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              My Posted Listings ({myListings.length})
            </h3>
          </div>
          <div className="space-y-2">
            {myListings.map((p) => (
              <div
                key={p.id}
                onClick={() => openProductDetails(p)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'}
                    alt={p.title}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{p.price}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.availabilityStatus === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : p.availabilityStatus === 'RESERVED'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {p.availabilityStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Options */}
      <div className="px-4 space-y-1.5">
        <button
          onClick={openAddProduct}
          className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Post New Item</div>
              <div className="text-[10px] text-slate-500">Sell textbooks, gadgets, hostel items</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Order History & Escrow</div>
              <div className="text-[10px] text-slate-500">View purchases and sales handovers</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {user.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin_dashboard')}
            className="w-full p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between hover:bg-purple-100/60 transition active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-purple-950 dark:text-purple-200">
                  Campus Admin Console
                </div>
                <div className="text-[10px] text-purple-700/80 dark:text-purple-400">
                  Student verifications, product moderation & fees
                </div>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
          </button>
        )}

        <button
          onClick={logout}
          className="w-full p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Sign Out of Account</span>
          </div>
        </button>
      </div>
    </div>
  );
};
