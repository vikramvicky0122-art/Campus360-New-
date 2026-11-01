import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import { Product } from '../../types/index.ts';
import {
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const ProductModerationScreen: React.FC = () => {
  const { products, refreshProducts, openProductDetails } = useMarketplace();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);
      setErrorMessage('');
      // Try admin endpoint first, then standard endpoint
      try {
        await api.adminDeleteProduct(productToDelete.id);
      } catch (adminErr) {
        await api.deleteProduct(productToDelete.id);
      }
      await refreshProducts();
      setToastMessage(`Listing "${productToDelete.title}" was permanently removed.`);
      setProductToDelete(null);
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove listing. Ensure admin session is active.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pb-8 space-y-4">
      {/* Top Header */}
      <div className="pt-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Marketplace Moderation
            </h2>
            <p className="text-[11px] text-slate-500">
              Inspect listings across campus and remove prohibited or spam items
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
            {products.length} Active Listings
          </span>
        </div>
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="mx-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Products List */}
      <div className="px-4 space-y-3">
        {products.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">All clean!</h4>
            <p className="text-xs text-slate-500">No product listings currently found.</p>
          </div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between gap-3"
            >
              <img
                src={p.images[0]}
                alt={p.title}
                className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-slate-100"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ₹{p.price}
                  </span>
                  <span className="text-[10px] text-slate-400">· {p.condition}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase ${
                      p.availabilityStatus === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {p.availabilityStatus}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {p.title}
                </h4>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Seller: {p.sellerName} ({p.sellerRollNumber}) · {p.department}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openProductDetails(p)}
                  className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                  title="Preview Listing"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProductToDelete(p)}
                  className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Remove Listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* In-App Delete Confirmation Modal (NO window.confirm!) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Remove Inappropriate Listing</span>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <img
                src={productToDelete.images[0]}
                alt={productToDelete.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {productToDelete.title}
                </div>
                <div className="text-[10px] text-slate-500">
                  ₹{productToDelete.price} · Seller: {productToDelete.sellerName}
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[11px]">{errorMessage}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              As a campus administrator, are you sure you want to remove this item? It will be permanently removed from the college marketplace immediately.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
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
  );
};
