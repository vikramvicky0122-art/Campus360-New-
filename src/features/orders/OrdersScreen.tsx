import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  Package,
  Clock,
  CheckCircle2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Truck,
  RotateCcw,
  Lock,
  Unlock,
  Phone,
  Mail,
  Send,
  CreditCard,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { OrderStatus, SellerContactDetails } from '../../types/index.ts';

export const OrdersScreen: React.FC = () => {
  const { user } = useAuth();
  const { orders, refreshOrders, openChatConversation, conversations } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Unlocked Seller Contact Modal State
  const [unlockedContact, setUnlockedContact] = useState<SellerContactDetails | null>(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);

  // Rental Payment Reporting Modal State
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null);
  const [rentalMethod, setRentalMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [rentalReference, setRentalReference] = useState('');
  const [rentalNotes, setRentalNotes] = useState('');
  const [isSubmittingRentalPayment, setIsSubmittingRentalPayment] = useState(false);

  const myPurchases = orders.filter((o) => o.buyerId === user?.id);
  const mySales = orders.filter((o) => o.sellerId === user?.id);
  const displayedOrders = activeTab === 'purchases' ? myPurchases : mySales;

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsUpdating(true);
      setErrorMessage('');
      await api.updateOrderStatus(orderId, newStatus);
      await refreshOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewSellerContact = async (orderId: string) => {
    try {
      setIsLoadingContact(true);
      setErrorMessage('');
      const res = await api.getSellerContact(orderId);
      if (res.success && res.contact) {
        setUnlockedContact(res.contact);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not fetch seller contact details.');
    } finally {
      setIsLoadingContact(false);
    }
  };

  const handleReportRentalPaymentSubmit = async () => {
    if (!reportingOrderId) return;
    try {
      setIsSubmittingRentalPayment(true);
      setErrorMessage('');
      await api.reportRentalPayment(reportingOrderId, {
        paymentMethod: rentalMethod,
        referenceId: rentalReference || `DEMO_RENT_${Date.now()}`,
        notes: rentalNotes,
      });
      setReportingOrderId(null);
      setRentalReference('');
      setRentalNotes('');
      await refreshOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record rental payment.');
    } finally {
      setIsSubmittingRentalPayment(false);
    }
  };

  const handleRequestCompletion = async (orderId: string) => {
    try {
      setIsUpdating(true);
      setErrorMessage('');
      await api.requestOrderCompletion(orderId);
      await refreshOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request rental completion.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCompletion = async (orderId: string) => {
    try {
      setIsUpdating(true);
      setErrorMessage('');
      await api.confirmOrderCompletion(orderId);
      await refreshOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm rental completion.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: OrderStatus, adminReviewStatus?: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'FEE_PENDING':
        return {
          label: 'Stage 1: Fee Pending',
          color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'PENDING_ADMIN_APPROVAL':
        return {
          label: 'Fee Paid · Awaiting Admin',
          color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'APPROVED':
      case 'SELLER_DETAILS_REVEALED':
      case 'RENTAL_PAYMENT_PENDING':
        return {
          label: 'Approved · Contact Unlocked',
          color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'RENTAL_PAYMENT_REPORTED':
      case 'ACTIVE':
        return {
          label: 'Rental Active',
          color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        };
      case 'RETURN_REQUESTED':
        return {
          label: 'Return Confirmation Pending',
          color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'COMPLETED':
        return {
          label: 'Completed & Settled',
          color: 'text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
        };
      case 'REJECTED':
        return {
          label: 'Declined by Admin',
          color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
      case 'PAID':
        return {
          label: 'Paid (Escrow)',
          color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          label: String(status).replace(/_/g, ' '),
          color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const openCounterpartChat = (order: any) => {
    const existing = conversations.find((c) => c.productId === order.productId);
    if (existing) {
      openChatConversation(existing.id);
    } else {
      api.startConversation(order.productId, `Hi, regarding Order #${order.orderNumber}...`).then((res) => {
        if (res.success && res.conversation) {
          openChatConversation(res.conversation.id);
        }
      });
    }
  };

  return (
    <div className="pb-8 space-y-3">
      {/* Top Segmented Tab Switcher */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'purchases'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            My Bookings ({myPurchases.length})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'sales'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Seller Rentals ({mySales.length})
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Orders List */}
      <div className="px-4 space-y-3">
        {displayedOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No {activeTab === 'purchases' ? 'bookings' : 'rental orders'} yet
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {activeTab === 'purchases'
                ? 'Browse products listed by verified students and book securely via two-stage campus escrow.'
                : 'When students book your listings, orders will appear here for handover and return.'}
            </p>
          </div>
        ) : (
          displayedOrders.map((order) => {
            const isBuyer = order.buyerId === user?.id;
            const isSeller = order.sellerId === user?.id;
            const badge = getStatusBadge(order.status, order.adminReviewStatus);
            const isApproved =
              order.adminReviewStatus === 'APPROVED' ||
              ['APPROVED', 'SELLER_DETAILS_REVEALED', 'RENTAL_PAYMENT_PENDING', 'RENTAL_PAYMENT_REPORTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED'].includes(order.status);
            const isFeePaid = order.bookingFeeStatus === 'PAID' || order.status === 'PAID' || isApproved;

            return (
              <div
                key={order.id}
                className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                {/* Header Strip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      · {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Product Detail */}
                <div className="flex items-center gap-3">
                  <img
                    src={order.productImage}
                    alt={order.productTitle}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {order.productTitle}
                    </h4>
                    <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {isBuyer ? (
                        isApproved ? (
                          <span className="text-emerald-600 font-semibold">
                            Seller: {order.sellerName}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            🔒 Seller Contact Locked (Approval Pending)
                          </span>
                        )
                      ) : (
                        `Buyer: ${order.buyerName} (Roll #${order.buyerRollNumber})`
                      )}
                    </div>
                  </div>
                </div>

                {/* TWO-STAGE PAYMENT TRACKING STRIP */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Stage 1: Platform Booking Fee:</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                      ₹{(order.bookingFeeAmount || order.platformCommission).toFixed(2)}{' '}
                      <span className={isFeePaid ? 'text-emerald-600' : 'text-amber-600'}>
                        ({isFeePaid ? '✓ Paid' : 'Pending'})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Stage 2: Rental Balance:</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                      ₹{(order.rentalAmount || order.sellerNetAmount).toFixed(2)}{' '}
                      <span
                        className={
                          order.rentalPaymentStatus === 'PAID'
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }
                      >
                        ({order.rentalPaymentStatus === 'PAID' ? '✓ Paid' : 'Due at Handover'})
                      </span>
                    </span>
                  </div>
                </div>

                {/* BUYER VIEW: PRIVACY-PROTECTED SELLER CONTACT CARD */}
                {isBuyer && (
                  <div>
                    {isApproved ? (
                      <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Seller Details Unlocked</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                            Admin Approved
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {order.sellerName} ({order.sellerDepartment})
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>Meetup Spot: {order.handoverLocation}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleViewSellerContact(order.id)}
                          disabled={isLoadingContact}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>View Full Seller Contact (Call / WhatsApp)</span>
                        </button>
                      </div>
                    ) : order.status === 'REJECTED' ? (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs space-y-1">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Booking Declined by Campus Administration</span>
                        </div>
                        <div className="text-[11px] text-rose-700 dark:text-rose-400">
                          Reason: {order.rejectionReason || 'Item unavailable or verification issue.'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold pt-1">
                          Booking fee refund status: <strong>REFUND PENDING (Test Mode)</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Seller Details Protected</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Your Stage 1 booking fee is verified. Once campus admin reviews & approves your request, seller phone, WhatsApp, and handover instructions will unlock here.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 3: RENTAL PAYMENT REPORTING BUTTON */}
                {isApproved && order.rentalPaymentStatus !== 'PAID' && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Stage 2: Rental Balance (₹{(order.rentalAmount || order.sellerNetAmount).toFixed(2)})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isBuyer ? 'Arrange payment with seller at handover' : 'Report payment once received from student'}
                      </div>
                    </div>
                    <button
                      onClick={() => setReportingOrderId(order.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition shrink-0"
                    >
                      Report Payment (Demo)
                    </button>
                  </div>
                )}

                {/* STAGE 4: RETURN / COMPLETION STEPPER */}
                {order.status === 'ACTIVE' && isSeller && (
                  <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-2">
                    <div className="text-xs text-teal-900 dark:text-teal-200">
                      <strong>Rental currently Active.</strong> When item is returned, request completion.
                    </div>
                    <button
                      onClick={() => handleRequestCompletion(order.id)}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shrink-0 shadow-xs"
                    >
                      Request Completion
                    </button>
                  </div>
                )}

                {order.status === 'RETURN_REQUESTED' && isBuyer && (
                  <div className="p-3 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                    <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Seller Requested Return Confirmation</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Please confirm that you have handed back "{order.productTitle}" to the seller.
                    </p>
                    <button
                      onClick={() => handleConfirmCompletion(order.id)}
                      disabled={isUpdating}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Return & Mark Completed</span>
                    </button>
                  </div>
                )}

                {order.status === 'COMPLETED' && (
                  <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Rental completed. Escrow settlement finalized.</span>
                  </div>
                )}

                {/* Counterpart Chat link */}
                {isApproved && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => openCounterpartChat(order)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chat with {isBuyer ? 'Seller' : 'Buyer'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── UNLOCKED SELLER CONTACT MODAL ── */}
      {unlockedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-emerald-600 text-sm">
                <Unlock className="w-4 h-4" />
                <span>Unlocked Seller Details</span>
              </div>
              <button
                onClick={() => setUnlockedContact(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {unlockedContact.fullName}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Roll #{unlockedContact.rollNumber} · {unlockedContact.department}
                </div>
                <div className="text-slate-400 text-[10px]">
                  {unlockedContact.institutionName}
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={`tel:${unlockedContact.phone}`}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {unlockedContact.phone}</span>
                </a>

                <a
                  href={`https://wa.me/${unlockedContact.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp Seller</span>
                </a>

                <a
                  href={`mailto:${unlockedContact.email}`}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email: {unlockedContact.email}</span>
                </a>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Agreed Handover Spot:
                </div>
                <div>{unlockedContact.handoverLocation}</div>
                {unlockedContact.handoverNotes && (
                  <div className="text-[10px] italic">"{unlockedContact.handoverNotes}"</div>
                )}
              </div>
            </div>

            <button
              onClick={() => setUnlockedContact(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT RENTAL PAYMENT MODAL ── */}
      {reportingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Report Stage 2 Rental Payment</span>
              </div>
              <button
                onClick={() => setReportingOrderId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              For this college prototype, confirm the rental amount settlement arranged directly between buyer and seller.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRentalMethod('UPI')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      rentalMethod === 'UPI'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    UPI / QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalMethod('CASH')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      rentalMethod === 'CASH'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Cash at Handover
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference ID / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={rentalReference}
                  onChange={(e) => setRentalReference(e.target.value)}
                  placeholder="e.g. UPI-9837492817 or Cash Receipt"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Handover Notes
                </label>
                <input
                  type="text"
                  value={rentalNotes}
                  onChange={(e) => setRentalNotes(e.target.value)}
                  placeholder="e.g. Paid upon meeting at central library entrance"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportingOrderId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportRentalPaymentSubmit}
                disabled={isSubmittingRentalPayment}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSubmittingRentalPayment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Record (Demo)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
