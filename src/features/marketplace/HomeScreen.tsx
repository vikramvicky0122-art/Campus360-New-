import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { VerificationStatusCard } from '../auth/VerificationStatusCard.tsx';
import {
  Search,
  ShieldCheck,
  Package,
  Heart,
  ChevronRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Laptop,
  BookOpen,
  FileText,
  Shirt,
  Watch,
  Trophy,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    products,
    categories,
    setActiveTab,
    setSelectedCategory,
    setSearchQuery,
    openProductDetails,
    toggleFavourite,
    isFavourited,
    openAddProduct,
  } = useMarketplace();

  const featuredProducts = products.filter(
    (p) => p.isFeatured && p.availabilityStatus === 'AVAILABLE'
  );
  const recentProducts = products.filter(
    (p) => p.availabilityStatus === 'AVAILABLE'
  ).slice(0, 8);

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'electronics':
        return <Laptop className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'books':
        return <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'study-materials':
        return <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'clothing':
        return <Shirt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'accessories':
        return <Watch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'sports-equipment':
        return <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar Trigger */}
      <div className="px-4 pt-1">
        <div
          onClick={() => setActiveTab('marketplace')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shadow-xs active:scale-[0.99] transition"
        >
          <Search className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            Search textbooks, electronics, drafters, hostel gear...
          </span>
        </div>
      </div>

      {/* Verification Status Card */}
      <VerificationStatusCard />

      {/* Campus Hero Card */}
      <div className="px-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 shadow-lg shadow-emerald-600/20">
          <div className="relative z-10 space-y-2 max-w-[280px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-emerald-100">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Campus Direct Handover</span>
            </div>
            <h2 className="text-lg font-extrabold leading-snug">
              Buy & Sell Inside {user?.institutionName ? 'Your Campus' : 'Campus'}
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Zero delivery fees. Direct student handovers at library or hostel gates with UPI escrow protection.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('marketplace')}
                className="px-3.5 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 active:scale-95 transition shadow-sm cursor-pointer"
              >
                Browse Items
              </button>
              <button
                onClick={openAddProduct}
                className="px-3.5 py-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-800/80 text-white font-semibold text-xs border border-white/25 active:scale-95 transition cursor-pointer"
              >
                + Sell Item
              </button>
            </div>
          </div>

          {/* Decorative Campus Graphic */}
          <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-2 bottom-2 opacity-15 pointer-events-none">
            <Package className="w-24 h-24 stroke-1 text-white" />
          </div>
        </div>
      </div>

      {/* Quick Category Rail */}
      <div className="space-y-2">
        <div className="px-4 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Categories
          </h3>
          <button
            onClick={() => setActiveTab('marketplace')}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveTab('marketplace');
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition">
                {getCategoryIcon(cat.slug)}
              </div>
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[68px] text-center">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Campus Products */}
      {featuredProducts.length > 0 && (
        <div className="space-y-2.5 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Featured Campus Listings
              </h3>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Verified Sellers
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((p) => {
              const fav = isFavourited(p.id);
              const discount = p.originalPrice
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => openProductDetails(p)}
                  className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md active:scale-[0.98] transition cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-[9px] font-bold text-white">
                      {p.condition}
                    </div>

                    {discount > 0 && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-[9px] font-black text-white">
                        {discount}% OFF
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(p.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-600 dark:text-slate-300 hover:text-rose-500 transition shadow-xs"
                      aria-label="Favorite"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          fav ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                          ₹{p.price}
                        </span>
                        {p.originalPrice && (
                          <span className="text-[10px] text-slate-400 line-through tabular-nums">
                            ₹{p.originalPrice}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                        {p.title}
                      </h4>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="truncate max-w-[85px]">{p.department}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-bold shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Listings */}
      <div className="space-y-2.5 px-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Recent Campus Deals
          </h3>
          <button
            onClick={() => setActiveTab('marketplace')}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            View all ({products.length})
          </button>
        </div>

        <div className="space-y-2">
          {recentProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => openProductDetails(p)}
              className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-[0.99] transition cursor-pointer flex items-center gap-3 shadow-xs"
            >
              <img
                src={p.images?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                alt={p.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums">
                    ₹{p.price}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {p.condition}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {p.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="truncate">{p.sellerName}</span>
                  <span>·</span>
                  <span className="truncate">{p.department}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Handover Guide */}
      <div className="px-4 pt-1">
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-200">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Campus Pickup & Handover Spots</span>
          </div>
          <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
            Safe meeting zones: Central Library Ground Floor, Student Canteen Plaza, Hostel Block B Front Gate, or Sports Complex.
          </p>
        </div>
      </div>
    </div>
  );
};
