import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { user } = useAuth();
  const {
    checkoutProduct,
    closeCheckout,
    setYouPiOrderData,
    setRazorpayOrderData,
    openVerificationModal,
  } = useMarketplace();

  const [handoverLocation, setHandoverLocation] = useState('Central Library Ground Floor Entrance');
  const [handoverNotes, setHandoverNotes] = useState('Can meet between 3:00 PM and 5:00 PM');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCreatingRazorpay, setIsCreatingRazorpay] = useState(false);
  const [error, setError] = useState('');

  if (!checkoutProduct) return null;

  const campusLocations = [
    'Central Library Ground Floor Entrance',
    'Student Canteen / Food Court Plaza',
    'Hostel Block A Front Gate',
    'Hostel Block B Common Room',
    'Campus Sports Complex & Gym',
    'Main University Gate Security Desk',
  ];

  const handleProceedToPayment = async () => {
    setError('');

    // Section 2 & 5: Check verified student
    if (!user?.isVerified) {
      setError('Verification Required: You must be a verified student to purchase products.');
      return;
    }

    // Section 6: Prevent sellers from buying their own product
    if (checkoutProduct.sellerId === user.id) {
      setError('Security Restriction: You cannot buy your own listed item.');
      return;
    }

    try {
      setIsCreatingOrder(true);
      const res = await api.createPaymentOrder({
        productId: checkoutProduct.id,
        handoverLocation,
        handoverNotes,
        idempotencyKey: `idemp_${Date.now()}_${checkoutProduct.id}`,
      });

      if (res.success && res.order && res.youPiOrder) {
        setYouPiOrderData({ order: res.order, youPiOrder: res.youPiOrder });
        closeCheckout();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate YouPI-PG payment.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePayWithRazorpay = async () => {
    setError('');

    if (!user?.isVerified) {
      setError('Verification Required: You must be a verified student to purchase products.');
      return;
    }

    if (checkoutProduct.sellerId === user.id) {
      setError('Security Restriction: You cannot buy your own listed item.');
      return;
    }

    try {
      setIsCreatingRazorpay(true);
      const res = await api.createRazorpayOrder({
        productId: checkoutProduct.id,
        handoverLocation,
        handoverNotes,
      });

      if (res.success && res.order && res.razorpayOrder) {
        setRazorpayOrderData({ order: res.order, razorpayOrder: res.razorpayOrder });
        closeCheckout();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create Razorpay order.');
    } finally {
      setIsCreatingRazorpay(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Order Confirmation</h3>
            <p className="text-[11px] text-slate-500">Campus Pickup & YouPI-PG Gateway</p>
          </div>
          <button
            onClick={closeCheckout}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {!user?.isVerified && (
              <button
                onClick={() => {
                  closeCheckout();
                  openVerificationModal();
                }}
                className="underline font-bold text-rose-900 dark:text-rose-200 ml-2"
              >
                Verify Now
              </button>
            )}
          </div>
        )}

        {/* Product Summary */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <img
            src={checkoutProduct.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
            alt={checkoutProduct.title}
            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
          />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              {checkoutProduct.categoryName} · {checkoutProduct.condition}
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {checkoutProduct.title}
            </h4>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              ₹{checkoutProduct.price}
            </div>
          </div>
        </div>

        {/* Campus Handover Spot Selection */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Select Campus Handover Spot</span>
          </div>

          <select
            value={handoverLocation}
            onChange={(e) => setHandoverLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {campusLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Handover Time / Notes for Seller
            </label>
            <input
              type="text"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="e.g. Free after 4:00 PM near reading room"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Two-Stage Payment Breakdown */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Total Item Rental:</span>
            <span className="text-sm tabular-nums">₹{checkoutProduct.price.toFixed(2)}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
            <div className="flex items-center justify-between text-blue-900 dark:text-blue-300 font-bold">
              <span>Stage 1: Platform Booking Fee (10%):</span>
              <span className="tabular-nums">₹{(checkoutProduct.price * 0.1).toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400">
              Paid now via Razorpay Test Mode to confirm booking request.
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between font-semibold">
              <span>Stage 2: Rental Balance (90%):</span>
              <span className="tabular-nums">₹{(checkoutProduct.price * 0.9).toFixed(2)}</span>
            </div>
            <div className="text-[10px]">
              Arranged & paid directly to student seller at campus meetup after admin approves booking.
            </div>
          </div>
        </div>

        {/* Seller Privacy & Security Protection Banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Seller Privacy Protection:</strong> Seller contact and exact meeting spot unlock automatically in your dashboard once campus administration approves the booking.
          </span>
        </div>

        {/* CTA — Payment Gateway Selection */}
        <div className="mt-4 pt-2 space-y-2.5">
          {/* PRIMARY: Razorpay Test Mode for Stage 1 Booking Fee */}
          <button
            onClick={handlePayWithRazorpay}
            disabled={isCreatingRazorpay || isCreatingOrder}
            className="w-full py-3 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isCreatingRazorpay ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Razorpay Order…</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay ₹{(checkoutProduct.price * 0.1).toFixed(2)} Booking Fee (Razorpay Test Mode)</span>
              </>
            )}
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-[10px] text-slate-400 font-medium">or simulated UPI</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* SECONDARY: Original YouPI-PG UPI */}
          <button
            onClick={handleProceedToPayment}
            disabled={isCreatingOrder || isCreatingRazorpay}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isCreatingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to YouPI-PG...</span>
              </>
            ) : (
              <>
                <span>Alternative: YouPI-PG Demo Checkout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
