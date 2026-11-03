import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient.ts';
import {
  X,
  Upload,
  Plus,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Percent,
  ImagePlus,
  Trash2,
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
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAddProductOpen) return null;

  const commissionPercent = 5.0;
  const numPrice = Number(price) || 0;
  const platformFee = Number(((numPrice * commissionPercent) / 100).toFixed(2));
  const sellerReceives = Number((numPrice - platformFee).toFixed(2));

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');

    try {
      const newImages: string[] = [];
      for (let i = 0; i < Math.min(files.length, 4 - images.length); i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setError('Each image must be under 5MB');
          continue;
        }

        if (isSupabaseConfigured() && supabase) {
          const ext = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const filePath = `products/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            // If bucket doesn't exist, try marketplace-data bucket
            const { error: fallbackError } = await supabase.storage
              .from('marketplace-data')
              .upload(`images/${fileName}`, file, { cacheControl: '3600', upsert: false });

            if (fallbackError) {
              console.error('Upload error:', fallbackError);
              // Fallback to base64 data URL
              const dataUrl = await fileToDataUrl(file);
              newImages.push(dataUrl);
            } else {
              const { data: urlData } = supabase.storage
                .from('marketplace-data')
                .getPublicUrl(`images/${fileName}`);
              newImages.push(urlData.publicUrl);
            }
          } else {
            const { data: urlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            newImages.push(urlData.publicUrl);
          }
        } else {
          // No Supabase — fallback to data URL
          const dataUrl = await fileToDataUrl(file);
          newImages.push(dataUrl);
        }
      }
      setImages((prev) => [...prev, ...newImages].slice(0, 4));
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

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
        images: images.length > 0 ? images : [FALLBACK_IMAGE],
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
              To protect our college community against fraud, only students with an approved student ID card can list products on Campus360.
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
                    Campus360 Platform Fee (5.0%):
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

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Photos (up to 4)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="grid grid-cols-4 gap-2 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${idx + 1}`}
                      className="w-full aspect-square rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-500 hover:border-emerald-400 transition"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-[9px]">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {images.length === 0 && (
                <p className="text-[10px] text-slate-400">
                  No photos added — a default placeholder will be used
                </p>
              )}
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
