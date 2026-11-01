import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  Heart,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const ProductDetailsModal: React.FC = () => {
  const { user } = useAuth();
  const {
    selectedProduct,
    closeProductDetails,
    openCheckout,
    toggleFavourite,
    isFavourited,
    openVerificationModal,
    openChatConversation,
    refreshProducts,
  } = useMarketplace();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!selectedProduct) return null;

  const isFav = isFavourited(selectedProduct.id);
  const isSeller = user?.id === selectedProduct.sellerId;
  const isAvailable = selectedProduct.availabilityStatus === 'AVAILABLE';

  const discountPercent = selectedProduct.originalPrice
    ? Math.round(
        ((selectedProduct.originalPrice - selectedProduct.price) /
          selectedProduct.originalPrice) *
          100
      )
    : 0;

  const handleBuyNow = () => {
    setActionError('');

    // Check verified student
    if (!user?.isVerified) {
      setActionError('Verification Required: Only verified students can make purchases.');
      return;
    }

    if (isSeller) {
      setActionError('Security Policy: You cannot purchase your own product listing.');
      return;
    }

    if (!isAvailable) {
      setActionError('This item is already sold or reserved.');
      return;
    }

    closeProductDetails();
    openCheckout(selectedProduct);
  };

  const handleStartChat = async () => {
    try {
      setIsStartingChat(true);
      setActionError('');
      const res = await api.startConversation(selectedProduct.id, `Hi ${selectedProduct.sellerName}, is this still available?`);
      if (res.success && res.conversation) {
        closeProductDetails();
        openChatConversation(res.conversation.id);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to start chat with seller.');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedProduct) return;
    try {
      setIsDeleting(true);
      setActionError('');
      try {
        await api.adminDeleteProduct(selectedProduct.id);
      } catch (adminErr) {
        await api.deleteProduct(selectedProduct.id);
      }
      await refreshProducts();
      setIsConfirmDeleteOpen(false);
      closeProductDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = isSeller || user?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Top Action Bar */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shrink-0">
          <button
            onClick={closeProductDetails}
            className="p-1 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
            {selectedProduct.categoryName}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleFavourite(selectedProduct.id)}
              className="p-1.5 rounded-full text-slate-500 hover:text-rose-500 transition"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={closeProductDetails}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Product Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-6">
          {/* Image Gallery */}
          <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={selectedProduct.images[activeImageIndex] || selectedProduct.images[0]}
              alt={selectedProduct.title}
              className="w-full h-full object-cover"
            />

            {selectedProduct.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === 0 ? selectedProduct.images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white backdrop-blur-xs hover:bg-black/60 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) =>
                      prev === selectedProduct.images.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white backdrop-blur-xs hover:bg-black/60 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-y-1/2 flex gap-1">
                  {selectedProduct.images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        activeImageIndex === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-xs font-semibold text-white">
              {selectedProduct.condition}
            </div>

            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-medium text-white flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{selectedProduct.viewCount} views</span>
            </div>
          </div>

          <div className="px-4 space-y-3">
            {actionError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
                {!user?.isVerified && (
                  <button
                    onClick={() => {
                      closeProductDetails();
                      openVerificationModal();
                    }}
                    className="underline font-bold text-rose-900 dark:text-rose-200 ml-2 text-[11px]"
                  >
                    Verify ID
                  </button>
                )}
              </div>
            )}

            {/* Price & Savings */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{selectedProduct.price}
                </span>
                {selectedProduct.originalPrice && (
                  <>
                    <span className="text-xs text-slate-400 line-through tabular-nums">
                      ₹{selectedProduct.originalPrice}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                {selectedProduct.title}
              </h2>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Description
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedProduct.description}
              </p>
            </div>

            {/* Seller Information Card with Privacy Protection */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {isSeller ? 'Your Listing' : 'Student Seller'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ID Verified Student
                </span>
              </div>

              {isSeller || user?.role === 'admin' ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    {selectedProduct.sellerName ? selectedProduct.sellerName.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedProduct.sellerName} (Owner View)
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedProduct.department} · {selectedProduct.sellerRollNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {selectedProduct.institutionName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Seller Identity & Contact Protected</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Verified {selectedProduct.department} student at {selectedProduct.institutionName}.
                    Full name, phone, WhatsApp & campus pickup spot are <strong>unlocked automatically once your booking is approved by campus administration</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Handover & Two-Stage Protection */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Two-Stage Safe Campus Rental</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Stage 1: Pay 10% platform booking fee to request. Stage 2: Admin reviews booking and unlocks direct seller contact to coordinate handover.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="px-3.5 py-3 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
              title={isSeller ? "Delete Your Listing" : "Remove Listing as Admin"}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isSeller ? 'Delete' : 'Remove (Admin)'}</span>
            </button>
          )}

          <button
            onClick={handleBuyNow}
            disabled={!isAvailable || isSeller}
            className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] ${
              !isAvailable
                ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                : isSeller
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20'
            }`}
          >
            {isSeller ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Your Own Listing</span>
              </>
            ) : !isAvailable ? (
              <span>Rented / Reserved</span>
            ) : (
              <>
                <span>Book Rental · Pay ₹{Math.round(selectedProduct.price * 0.1)} Fee</span>
              </>
            )}
          </button>
        </div>

        {/* In-App Delete Confirmation Modal */}
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Delete Listing</span>
                </div>
                <button
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently remove <strong>"{selectedProduct.title}"</strong> from the marketplace? This action cannot be undone.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteListing}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
