import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  ShieldCheck,
  QrCode,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const YouPiPaymentModal: React.FC = () => {
  const { youPiOrderData, setYouPiOrderData, openPaymentSuccess, refreshOrders, refreshProducts } =
    useMarketplace();

  const [activeTab, setActiveTab] = useState<'apps' | 'qr' | 'upi_id'>('apps');
  const [selectedApp, setSelectedApp] = useState<string>('gpay');
  const [customUpiId, setCustomUpiId] = useState<string>('student@okhdfcbank');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [gatewayStatus, setGatewayStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(899); // 15 mins countdown

  useEffect(() => {
    if (!youPiOrderData) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [youPiOrderData]);

  if (!youPiOrderData) return null;

  const { order, youPiOrder } = youPiOrderData;

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyUpiLink = () => {
    navigator.clipboard.writeText(youPiOrder.upiIntentUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleVerifyPayment = async (simulatedStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED') => {
    try {
      setIsProcessing(true);
      setGatewayStatus('PROCESSING');
      setErrorMessage('');

      // Simulated network/bank authentication latency
      await new Promise((r) => setTimeout(r, 1200));

      const paymentRef = `UPI_REF_${Date.now()}`;
      // In production, backend checks HMAC signature with merchant secret key
      const res = await api.verifyPayment({
        gatewayOrderId: youPiOrder.gatewayOrderId,
        orderId: order.id,
        paymentReferenceId: paymentRef,
        signature: youPiOrder.signature,
        status: simulatedStatus,
        upiId: activeTab === 'upi_id' ? customUpiId : `${selectedApp}@upi`,
        method: activeTab === 'qr' ? 'UPI_QR' : 'UPI_INTENT',
      });

      if (res.success && res.verified) {
        setGatewayStatus('SUCCESS');
        await refreshOrders();
        await refreshProducts();
        setTimeout(() => {
          setYouPiOrderData(null);
          openPaymentSuccess(res.order);
        }, 800);
      } else {
        setGatewayStatus('FAILED');
        setErrorMessage(res.message || 'Payment was declined by issuing bank or cancelled by user.');
      }
    } catch (err: any) {
      setGatewayStatus('FAILED');
      setErrorMessage(err.message || 'Verification failed on payment gateway.');
    } finally {
      setIsProcessing(false);
    }
  };

  const upiApps = [
    { id: 'gpay', name: 'Google Pay', iconBg: 'bg-white text-slate-800 border-slate-200' },
    { id: 'phonepe', name: 'PhonePe', iconBg: 'bg-purple-600 text-white' },
    { id: 'paytm', name: 'Paytm UPI', iconBg: 'bg-blue-500 text-white' },
    { id: 'cred', name: 'CRED UPI', iconBg: 'bg-black text-white' },
    { id: 'bhim', name: 'BHIM UPI', iconBg: 'bg-emerald-600 text-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Gateway Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-xs">
                Y
              </div>
              <div>
                <div className="font-bold text-xs tracking-wide flex items-center gap-1.5">
                  YouPI-PG Gateway
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-sm bg-amber-400 text-slate-950">
                    TEST SANDBOX
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  NPCI UPI Gateway · Mid: {youPiOrder.merchantId}
                </div>
              </div>
            </div>

            <button
              onClick={() => setYouPiOrderData(null)}
              className="p-1 rounded-full text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Amount to Pay</div>
              <div className="text-2xl font-bold tracking-tight text-white tabular-nums">
                ₹{order.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Order Expires In</div>
              <div className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                {formatTimer(secondsRemaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'apps'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>UPI Apps</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'qr'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
          <button
            onClick={() => setActiveTab('upi_id')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'upi_id'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>UPI ID / VPA</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Transaction Failed</div>
                <div className="text-[11px] mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select UPI App on this device:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {upiApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      selectedApp === app.id
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${app.iconBg}`}
                      >
                        {app.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {app.name}
                        </div>
                        <div className="text-[10px] text-slate-500">Fast 1-click UPI authorization</div>
                      </div>
                    </div>
                    {selectedApp === app.id && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
              </div>

              {/* Dynamic QR Display */}
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
                <svg
                  className="w-44 h-44"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  {/* Position detection markers */}
                  <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="4" />
                  <rect x="9" y="9" width="17" height="17" fill="white" rx="2" />
                  <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                  <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="4" />
                  <rect x="74" y="9" width="17" height="17" fill="white" rx="2" />
                  <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="1" />

                  <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="4" />
                  <rect x="9" y="74" width="17" height="17" fill="white" rx="2" />
                  <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="1" />

                  {/* Simulated matrix pixels */}
                  <rect x="35" y="8" width="8" height="8" fill="#0f172a" />
                  <rect x="47" y="14" width="6" height="6" fill="#0f172a" />
                  <rect x="56" y="8" width="8" height="8" fill="#0f172a" />
                  <rect x="35" y="22" width="6" height="6" fill="#0f172a" />
                  <rect x="45" y="24" width="8" height="8" fill="#0f172a" />
                  <rect x="58" y="22" width="6" height="6" fill="#0f172a" />

                  <rect x="8" y="38" width="8" height="8" fill="#0f172a" />
                  <rect x="22" y="44" width="6" height="6" fill="#0f172a" />
                  <rect x="34" y="36" width="10" height="10" fill="#2563eb" rx="2" />
                  <rect x="48" y="40" width="8" height="8" fill="#0f172a" />
                  <rect x="62" y="38" width="6" height="6" fill="#0f172a" />
                  <rect x="76" y="42" width="8" height="8" fill="#0f172a" />
                  <rect x="88" y="38" width="6" height="6" fill="#0f172a" />

                  <rect x="36" y="54" width="6" height="6" fill="#0f172a" />
                  <rect x="48" y="56" width="8" height="8" fill="#0f172a" />
                  <rect x="60" y="52" width="6" height="6" fill="#0f172a" />
                  <rect x="74" y="56" width="8" height="8" fill="#0f172a" />

                  <rect x="36" y="72" width="8" height="8" fill="#0f172a" />
                  <rect x="48" y="78" width="6" height="6" fill="#0f172a" />
                  <rect x="60" y="70" width="8" height="8" fill="#0f172a" />
                  <rect x="76" y="76" width="6" height="6" fill="#0f172a" />
                  <rect x="86" y="84" width="8" height="8" fill="#0f172a" />
                </svg>
              </div>

              <button
                onClick={copyUpiLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'UPI Intent String Copied!' : 'Copy UPI Intent Link'}</span>
              </button>
            </div>
          )}

          {activeTab === 'upi_id' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter Your UPI Virtual Payment Address (VPA)
                </label>
                <input
                  type="text"
                  value={customUpiId}
                  onChange={(e) => setCustomUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  A collect request will be sent to your UPI application.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div>Merchant: <strong>Campus Bazaar PG</strong></div>
                <div>VPA: <strong>campusbazaar@youpi</strong></div>
                <div>Gateway Ref: <strong>{youPiOrder.gatewayOrderId}</strong></div>
              </div>
            </div>
          )}

          {/* Test Sandbox Simulator Controls (Section 7 Requirement) */}
          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
            <div className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-amber-600" />
              <span>YouPI-PG Sandbox Outcome Tester</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleVerifyPayment('SUCCESS')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] text-center shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                Test Success
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPayment('FAILED')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] text-center shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                Test Decline
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPayment('CANCELLED')}
                disabled={isProcessing}
                className="py-1.5 px-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] text-center shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                Test Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Security & Action Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2.5">
          <button
            onClick={() => handleVerifyPayment('SUCCESS')}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying with YouPI-PG Gateway...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹{order.totalAmount.toFixed(2)} Securely</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit Encrypted UPI Flow · Campus Bazaar Escrow Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
