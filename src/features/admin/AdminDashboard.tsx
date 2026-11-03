import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { AdminMetrics } from '../../types/index.ts';
import {
  Users,
  ShieldCheck,
  Clock,
  Package,
  ShoppingBag,
  IndianRupee,
  ArrowRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { setActiveTab } = useMarketplace();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminMetrics();
      if (res.success) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="pb-8 space-y-4">
      {/* Top Header */}
      <div className="pt-3 px-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Admin Dashboard
        </h2>
        <p className="text-xs text-slate-500">
          Campus360 Operations, Student Verification & Financial Control
        </p>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="px-4 grid grid-cols-2 gap-2.5">
        <div
          onClick={() => setActiveTab('admin_verifications')}
          className="p-3.5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-500/20 transition space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Pending Verifications
            </span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {metrics?.pendingVerifications ?? 0}
          </div>
          <div className="text-[10px] text-amber-700/80 dark:text-amber-400 flex items-center gap-1 font-semibold">
            <span>Review Queue</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('admin_users')}
          className="p-3.5 rounded-3xl bg-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200 cursor-pointer hover:bg-teal-500/20 transition space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              Verified Students
            </span>
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {metrics?.verifiedStudents ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {metrics?.totalStudents ?? 0}
            </span>
          </div>
          <div className="text-[10px] text-teal-700/80 dark:text-teal-400 font-semibold">
            Active College Accounts
          </div>
        </div>

        <div
          onClick={() => setActiveTab('admin_payments')}
          className="p-3.5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 cursor-pointer hover:bg-emerald-500/20 transition space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Platform Commission
            </span>
            <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold tabular-nums">
            ₹{metrics?.totalCommission?.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-semibold">
            5% Fee Collected
          </div>
        </div>

        <div
          onClick={() => setActiveTab('admin_payments')}
          className="p-3.5 rounded-3xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-950 dark:text-emerald-200 cursor-pointer hover:bg-emerald-600/20 transition space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Marketplace GMV
            </span>
            <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold tabular-nums">
            ₹{metrics?.totalGmv?.toFixed(2) ?? '0.00'}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-semibold">
            {metrics?.totalOrders ?? 0} Orders Processed
          </div>
        </div>
      </div>

      {/* Secondary Metrics Rail */}
      <div className="px-4">
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Listing Moderation & Engagement
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                {metrics?.totalListings ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">Total Listings</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {metrics?.activeListings ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">Available Deals</div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-base font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                {metrics?.activeSellersCount ?? 0}
              </div>
              <div className="text-[10px] text-slate-500">Active Sellers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Admin Actions */}
      <div className="px-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Administrative Actions
        </h3>

        <div className="space-y-1.5">
          <button
            onClick={() => setActiveTab('admin_verifications')}
            className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Student Verification Queue ({metrics?.pendingVerifications ?? 0} Pending)
                </div>
                <div className="text-[10px] text-slate-500">Inspect roll numbers & student ID cards</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveTab('admin_moderation')}
            className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Marketplace Product Moderation
                </div>
                <div className="text-[10px] text-slate-500">Review and take down unauthorized items</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => setActiveTab('admin_payments')}
            className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  YouPI-PG Payment Audit Trail
                </div>
                <div className="text-[10px] text-slate-500">Verify gateway reference IDs & escrow balances</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
