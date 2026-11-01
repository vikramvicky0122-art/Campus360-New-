import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import {
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  User,
  Package,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { Order } from '../../types/index.ts';

export const OrderPaymentLedgerScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'all' | 'active' | 'completed'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Safety check failed / item conflict');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const ordersRes = await api.getAdminOrders();
      if (ordersRes.success) {
        setOrders(ordersRes.orders);
      }
      const txRes = await api.getAdminTransactions();
      if (txRes.success) {
        setTotalCommission(txRes.totalCommissionCollected);
      }
    } catch (err) {
      console.error('Failed to load admin ledger:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingApprovals = orders.filter(
    (o) => o.adminReviewStatus === 'PENDING' && (o.bookingFeeStatus === 'PAID' || o.status === 'PENDING_ADMIN_APPROVAL')
  );

  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId);
    setActionMessage(null);
    try {
      const res = await api.reviewBookingAdmin(orderId, 'APPROVE');
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Booking approved! Seller contact details are now unlocked for the buyer.`,
        });
        await loadData();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to approve booking' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Approval error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalOrder) return;
    setProcessingId(rejectModalOrder.id);
    setActionMessage(null);
    try {
      const res = await api.reviewBookingAdmin(rejectModalOrder.id, 'REJECT', rejectionReason);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Booking rejected. Stage 1 booking fee marked for refund.`,
        });
        setRejectModalOrder(null);
        await loadData();
      } else {
        setActionMessage({ type: 'error', text: res.message || 'Failed to reject booking' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Rejection error' });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'pending') {
      return (
        order.adminReviewStatus === 'PENDING' &&
        (order.bookingFeeStatus === 'PAID' || order.status === 'PENDING_ADMIN_APPROVAL')
      );
    }
    if (activeFilter === 'active') {
      return order.status === 'ACTIVE' || order.status === 'APPROVED';
    }
    if (activeFilter === 'completed') {
      return order.status === 'COMPLETED';
    }
    return true; // 'all'
  });

  return (
    <div className="pb-8 space-y-4">
      {/* Commission Overview KPI */}
      <div className="pt-3 px-4">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white space-y-2 shadow-lg shadow-emerald-600/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Campus360 Two-Stage Financial Ledger
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">
              Razorpay TEST MODE
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight tabular-nums">
                ₹{totalCommission.toFixed(2)}
              </div>
              <div className="text-xs text-emerald-100">
                Stage 1 Platform Booking Fees Retained (Escrow)
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="px-4">
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
              activeFilter === 'pending'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Review Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`py-2 px-1 rounded-xl transition ${
              activeFilter === 'active'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`py-2 px-1 rounded-xl transition ${
              activeFilter === 'completed'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`py-2 px-1 rounded-xl transition ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({orders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No orders in this view
            </div>
            <div className="text-[11px] text-slate-400">
              {activeFilter === 'pending'
                ? 'No rental bookings currently awaiting admin approval.'
                : 'Transactions will appear here once bookings are placed.'}
            </div>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPendingReview =
              order.adminReviewStatus === 'PENDING' &&
              (order.bookingFeeStatus === 'PAID' || order.status === 'PENDING_ADMIN_APPROVAL');

            return (
              <div
                key={order.id}
                className={`p-4 rounded-3xl border transition shadow-xs space-y-3 ${
                  isPendingReview
                    ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        #{order.orderNumber}
                      </span>
                      {isPendingReview && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 animate-pulse">
                          Awaiting Admin Approval
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {order.productTitle}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : order.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : order.status === 'APPROVED'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          : order.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Parties Details (Visible to Admin) */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-[11px] border border-slate-200 dark:border-slate-700">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Buyer</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.buyerName}
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      {order.buyerRollNumber || 'Verified User'}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Seller</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {order.sellerName}
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      {order.sellerRollNumber || 'Verified User'}
                    </div>
                  </div>
                </div>

                {/* Two-Stage Financial Summary */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <span>Stage 1 Platform Fee:</span>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ₹{order.bookingFeeAmount ?? order.platformCommission} (
                      {order.bookingFeeStatus || 'PAID'})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Stage 2 Rental Balance:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      ₹{order.rentalAmountPayable ?? order.sellerNetAmount} (
                      {order.rentalPaymentStatus || 'PENDING'})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>Razorpay Test Order:</span>
                    <span className="font-mono">{order.razorpayOrderId || order.gatewayOrderId || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Payment Ref ID:</span>
                    <span className="font-mono">
                      {order.razorpayPaymentId || order.paymentReferenceId || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Admin Approval Actions (when Pending) */}
                {isPendingReview && (
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => handleApprove(order.id)}
                      disabled={processingId === order.id}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{processingId === order.id ? 'Approving...' : 'Approve Booking'}</span>
                    </button>

                    <button
                      onClick={() => setRejectModalOrder(order)}
                      disabled={processingId === order.id}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 border border-rose-200 dark:border-rose-800 active:scale-95 disabled:opacity-50 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject & Refund</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reject Rental Booking
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Rejecting booking #{rejectModalOrder.orderNumber} for &quot;{rejectModalOrder.productTitle}&quot;.
              The Stage 1 platform booking fee will be flagged for refund.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="State reason for rejecting this booking..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectModalOrder(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={processingId === rejectModalOrder.id}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50"
              >
                {processingId === rejectModalOrder.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
