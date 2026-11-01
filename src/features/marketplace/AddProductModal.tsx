import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import {
  X,
  Upload,
  Plus,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
} from 'lucide-react';

export const AddProductModal: React.FC = () => {
  const { user } = useAuth();
  const {
    isAddProductOpen,
    closeAddProduct,
    categories,
    refreshProducts,
    openVerificationModal,
  } = useMarketplace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-1');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [condition, setCondition] = useState('Like New');
  const [department, setDepartment] = useState(user?.department || 'Computer Science');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isAddProductOpen) return null;

  const commissionPercent = 5.0;
  const numPrice = Number(price) || 0;
  const platformFee = Number(((numPrice * commissionPercent) / 100).toFixed(2));
  const sellerReceives = Number((numPrice - platformFee).toFixed(2));

  const sampleImages = [
    { name: 'Textbook / Notes', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600' },
    { name: 'Calculator / Gadget', url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600' },
    { name: 'Hostel Kettle', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600' },
    { name: 'Study Desk', url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600' },
    { name: 'Sports Racket', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600' },
    { name: 'Engineering Drafter', url: 'https://images.unsplash.com/photo-1581291518655-9523c932dedb?w=600' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check verified status
    if (!user?.isVerified) {
      setError('Only verified students can list items for sale.');
      return;
    }

    if (!title.trim() || !description.trim() || numPrice <= 0) {
      setError('Please provide a title, description, and valid price.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createProduct({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        price: numPrice,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        condition,
        department,
        images,
      });

      if (res.success) {
        setSuccess(true);
        await refreshProducts();
        setTimeout(() => {
          setSuccess(false);
          closeAddProduct();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to list product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">List Item for Sale</h3>
            <p className="text-[11px] text-slate-500">College Campus Marketplace</p>
          </div>
          <button
            onClick={closeAddProduct}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Check Notice */}
        {!user?.isVerified ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Student Verification Required
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
              To protect our college community against fraud, only students with an approved student ID card can list products on Campus Bazaar.
            </p>
            <button
              onClick={() => {
                closeAddProduct();
                openVerificationModal();
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition active:scale-95"
            >
              Verify My Student ID
            </button>
          </div>
        ) : success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Product Listed!</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Your item is now live and discoverable by students across campus.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Casio fx-991EX Scientific Calculator"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="New">New (Unopened)</option>
                  <option value="Like New">Like New (Mint)</option>
                  <option value="Good">Good (Working)</option>
                  <option value="Used">Used (Acceptable)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="500"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Original Price (₹, Opt)
                </label>
                <input
                  type="number"
                  min="1"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="1200"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>
            </div>

            {/* Platform Commission Calculation Card (Section 7 Requirement) */}
            {numPrice > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Product Listing Price:</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    ₹{numPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3 text-blue-500" />
                    Campus Bazaar Platform Fee (5.0%):
                  </span>
                  <span className="tabular-nums">- ₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span>You Receive at Handover:</span>
                  <span className="tabular-nums text-sm">₹{sellerReceives.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description & Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Mention edition, semester, working condition, and preferred campus pickup spots..."
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Images Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Image
              </label>
              <div className="flex gap-2 items-center mb-2">
                <img
                  src={images[0]}
                  alt="Preview"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="text-[11px] text-slate-500">
                  Select an authentic college asset image or click below:
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {sampleImages.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImages([s.url])}
                    className={`px-2 py-1 rounded-lg text-[10px] whitespace-nowrap border transition ${
                      images[0] === s.url
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Listing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Publish Product Listing</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
