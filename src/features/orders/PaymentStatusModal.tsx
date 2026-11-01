import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import {
  CheckCircle2,
  Package,
  MapPin,
  MessageSquare,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';

export const PaymentStatusModal: React.FC = () => {
  const {
    completedOrder,
    closePaymentSuccess,
    setActiveTab,
    openChatConversation,
    conversations,
  } = useMarketplace();

  if (!completedOrder) return null;

  const handleOpenChat = () => {
    closePaymentSuccess();
    const existing = conversations.find((c) => c.productId === completedOrder.productId);
    if (existing) {
      openChatConversation(existing.id);
    } else {
      setActiveTab('messages');
    }
  };

  const handleGoToOrders = () => {
    closePaymentSuccess();
    setActiveTab('orders');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col text-center space-y-4">
        {/* Success Icon */}
        <div className="relative mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
            UPI
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Payment Verified via YouPI-PG
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            Order #{completedOrder.orderNumber}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Funds of ₹{completedOrder.totalAmount.toFixed(2)} are safely held in campus escrow.
          </p>
        </div>

        {/* Details Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Gateway Ref ID:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white text-[11px]">
              {completedOrder.paymentReferenceId || 'UPI_REF_984729104'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-[11px]">
                {completedOrder.handoverLocation}
              </div>
              <div className="text-[10px] text-slate-500">Scheduled campus pickup point</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Seller:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {completedOrder.sellerName} ({completedOrder.sellerDepartment})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleOpenChat}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Coordinate Handover with Seller</span>
          </button>

          <button
            onClick={handleGoToOrders}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <Package className="w-4 h-4" />
            <span>View Order Status & Escrow</span>
          </button>
        </div>
      </div>
    </div>
  );
};
