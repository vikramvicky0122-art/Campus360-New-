import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  IndianRupee,
  Lock,
  BadgeCheck,
  Info,
} from 'lucide-react';

// --- Razorpay Global Script Loader ---
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Razorpay Checkout options type
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
    animation?: boolean;
  };
}

type PaymentState = 'IDLE' | 'LOADING_SCRIPT' | 'OPENING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'VERIFYING';

export const RazorpayCheckoutModal: React.FC = () => {
  const { user } = useAuth();
  const {
    razorpayOrderData,
    setRazorpayOrderData,
    openPaymentSuccess,
    refreshOrders,
    refreshProducts,
  } = useMarketplace();

  const [paymentState, setPaymentState] = useState<PaymentState>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    if (!razorpayOrderData) return;
    loadRazorpayScript().then((loaded) => {
      setScriptLoaded(loaded);
      if (!loaded) {
        setPaymentState('FAILED');
        setErrorMessage('Failed to load Razorpay checkout script. Please check your internet connection.');
      }
    });
  }, [razorpayOrderData]);

  const handleClose = useCallback(() => {
    setRazorpayOrderData(null);
    setPaymentState('IDLE');
    setErrorMessage('');
  }, [setRazorpayOrderData]);

  const handleVerifyPayment = useCallback(
    async (params: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      if (!razorpayOrderData) return;
      setPaymentState('VERIFYING');
      setErrorMessage('');

      try {
        const res = await api.verifyRazorpayPayment({
          orderId: razorpayOrderData.order.id,
          razorpay_order_id: params.razorpay_order_id,
          razorpay_payment_id: params.razorpay_payment_id,
          razorpay_signature: params.razorpay_signature,
          status: 'SUCCESS',
        });

        if (res.success && res.verified) {
          setPaymentState('SUCCESS');
          await Promise.all([refreshOrders(), refreshProducts()]);
          setTimeout(() => {
            setRazorpayOrderData(null);
            openPaymentSuccess(res.order);
          }, 1500);
        } else {
          setPaymentState('FAILED');
          setErrorMessage(res.message || 'Server-side signature verification failed. No money was deducted.');
        }
      } catch (err: any) {
        setPaymentState('FAILED');
        setErrorMessage(err.message || 'Payment verification request failed. Please contact support.');
      }
    },
    [razorpayOrderData, refreshOrders, refreshProducts, setRazorpayOrderData, openPaymentSuccess]
  );

  const openRazorpayCheckout = useCallback(() => {
    if (!razorpayOrderData || !scriptLoaded) return;
    const { order, razorpayOrder } = razorpayOrderData;

    setPaymentState('OPENING');
    setErrorMessage('');

    const options: RazorpayOptions = {
      key: razorpayOrder.keyId,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency || 'INR',
      name: '🎓 Campus360 Marketplace',
      description: `[TEST MODE] ${razorpayOrder.productTitle}`,
      order_id: razorpayOrder.id,
      prefill: {
        name: user?.fullName || razorpayOrder.studentName,
        email: user?.email || razorpayOrder.studentEmail,
        contact: user?.phone || razorpayOrder.studentPhone || '9000000000',
      },
      notes: {
        orderId: order.id,
        platform: 'Campus360 Prototype',
        mode: 'TEST_MODE — No real money processed',
      },
      theme: { color: '#10b981' }, // emerald-500
      handler: async (response) => {
        // This fires after Razorpay test checkout succeeds
        // Send all 3 IDs to backend for HMAC-SHA256 verification (never trust frontend alone)
        await handleVerifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          setPaymentState('CANCELLED');
          setErrorMessage('Payment window was closed. You can retry or cancel the booking.');
        },
        escape: true,
        confirm_close: true,
        animation: true,
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setPaymentState('FAILED');
        setErrorMessage(
          response.error?.description ||
            response.error?.reason ||
            'Payment failed at Razorpay. No money was charged.'
        );
      });
      rzp.open();
    } catch (err: any) {
      setPaymentState('FAILED');
      setErrorMessage('Could not initialize Razorpay checkout. Please try again.');
    }
  }, [razorpayOrderData, scriptLoaded, user, handleVerifyPayment]);

  // Demo / offline simulation (for local dev without real Razorpay keys)
  const simulateDemoPayment = useCallback(
    async (outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED') => {
      if (!razorpayOrderData) return;
      const { razorpayOrder } = razorpayOrderData;

      if (outcome !== 'SUCCESS') {
        setPaymentState(outcome);
        setErrorMessage(
          outcome === 'CANCELLED'
            ? 'Demo payment cancelled. You can retry.'
            : 'Demo payment declined (simulated failure). No money was charged.'
        );
        return;
      }

      const demoPaymentId = `pay_demo_${Date.now()}`;
      const demoSignature = `demo_sig_${Date.now()}`;

      await handleVerifyPayment({
        razorpay_order_id: razorpayOrder.id,
        razorpay_payment_id: demoPaymentId,
        razorpay_signature: demoSignature,
      });
    },
    [razorpayOrderData, handleVerifyPayment]
  );

  if (!razorpayOrderData) return null;

  const { order, razorpayOrder } = razorpayOrderData;
  const isDemoMode =
    razorpayOrder.keyId === 'rzp_test_campus360_demo' || razorpayOrder.keyId.endsWith('_demo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-y-auto no-scrollbar">

        {/* ── TEST MODE BANNER ── */}
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 rounded-t-3xl">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            TEST MODE · Demo / Prototype Only · No Real Payments
          </span>
        </div>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Razorpay Checkout</h3>
            <p className="text-[11px] text-slate-500">Campus360 Secure Payment Gateway</p>
          </div>
          {paymentState !== 'VERIFYING' && paymentState !== 'SUCCESS' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── ORDER SUMMARY: TWO-STAGE PAYMENT BREAKDOWN ── */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="font-bold text-slate-900 dark:text-white truncate">{order.productTitle}</div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Total Item Rental:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  ₹{(order.totalAmount || razorpayOrder.amountInRupees * 10).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-200/50">
                <span>Stage 1: Booking Fee (Paid Now):</span>
                <span className="tabular-nums font-bold">
                  ₹{razorpayOrder.amountInRupees.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Stage 2: Rental Amount (Paid at Handover):</span>
                <span className="tabular-nums font-medium">
                  ₹{(order.rentalAmount || (order.totalAmount ? order.totalAmount - razorpayOrder.amountInRupees : razorpayOrder.amountInRupees * 9)).toFixed(2)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Payable Now (Test Mode):</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ₹{razorpayOrder.amountInRupees.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ── ORDER ID STRIP ── */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Razorpay Order:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">{razorpayOrder.id}</span>
          </div>

          {/* ── SUCCESS STATE ── */}
          {paymentState === 'SUCCESS' && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Payment Verified!</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Signature verified server-side. Booking confirmed!
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFYING STATE ── */}
          {paymentState === 'VERIFYING' && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Verifying Signature…</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  HMAC-SHA256 check happening server-side. Do not close.
                </div>
              </div>
            </div>
          )}

          {/* ── FAILED / CANCELLED STATE ── */}
          {(paymentState === 'FAILED' || paymentState === 'CANCELLED') && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    {paymentState === 'CANCELLED' ? 'Payment Cancelled' : 'Payment Failed'}
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                    {errorMessage || 'Something went wrong. No amount was charged.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── IDLE / OPENING STATES ── */}
          {(paymentState === 'IDLE' || paymentState === 'LOADING_SCRIPT' || paymentState === 'OPENING') && !isDemoMode && (
            <button
              onClick={openRazorpayCheckout}
              disabled={!scriptLoaded || paymentState === 'OPENING'}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition active:scale-[0.98] disabled:opacity-50"
            >
              {!scriptLoaded || paymentState === 'OPENING' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Razorpay…</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{razorpayOrder.amountInRupees} with Razorpay</span>
                </>
              )}
            </button>
          )}

          {/* ── DEMO MODE BUTTONS (no live credentials) ── */}
          {(paymentState === 'IDLE' || paymentState === 'LOADING_SCRIPT' || paymentState === 'OPENING') && isDemoMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2 border border-amber-200 dark:border-amber-800">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Demo mode: Real Razorpay credentials not set. Use simulation buttons below to test all payment flows.</span>
              </div>
              <button
                onClick={() => simulateDemoPayment('SUCCESS')}
                className="w-full py-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-[0.98]"
              >
                <BadgeCheck className="w-4 h-4" />
                <span>Simulate: Payment SUCCESS ✓</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => simulateDemoPayment('FAILED')}
                  className="py-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 hover:bg-rose-200 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-800 transition"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Simulate FAILED</span>
                </button>
                <button
                  onClick={() => simulateDemoPayment('CANCELLED')}
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Simulate CANCELLED</span>
                </button>
              </div>
            </div>
          )}

          {/* ── RETRY after failure/cancel ── */}
          {(paymentState === 'FAILED' || paymentState === 'CANCELLED') && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPaymentState('IDLE');
                  setErrorMessage('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Payment
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel Booking
              </button>
            </div>
          )}

          {/* ── SECURITY TRUST STRIP ── */}
          {paymentState !== 'SUCCESS' && paymentState !== 'VERIFYING' && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Payment processed in <strong>Razorpay Test Mode</strong>. Signature is verified server-side using HMAC-SHA256.
                Secret key is never exposed to client. <strong>No real money</strong> is charged in test mode.
              </span>
            </div>
          )}

          {/* ── SELLER SETTLEMENT INFO ── */}
          {paymentState !== 'SUCCESS' && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[10px] text-slate-600 dark:text-slate-300">
              <IndianRupee className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>
                Seller will receive <strong>₹{razorpayOrder.sellerNetAmount.toFixed(2)}</strong> (after {razorpayOrder.commissionPercent}% Campus360 fee).
                Settlement is <strong>Pending</strong> until handover is confirmed. No automatic bank transfer occurs in this prototype.
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

