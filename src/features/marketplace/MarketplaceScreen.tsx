import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import {
  Search,
  X,
  SlidersHorizontal,
  Heart,
  ShieldCheck,
  PackageX,
} from 'lucide-react';

export const MarketplaceScreen: React.FC = () => {
  const {
    products,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCondition,
    setSelectedCondition,
    sortBy,
    setSortBy,
    openProductDetails,
    toggleFavourite,
    isFavourited,
  } = useMarketplace();

  const conditions = ['all', 'New', 'Like New', 'Good', 'Used'];

  return (
    <div className="w-full space-y-3">
      {/* Sticky Filter & Search Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-1 pb-2.5 px-4 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search textbooks, gadgets, hostel items..."
            className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Condition & Sort Control Strip */}
        <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
          {/* Condition Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {conditions.map((cond) => (
              <button
                key={cond}
                onClick={() => setSelectedCondition(cond)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                  selectedCondition === cond
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {cond === 'all' ? 'Any Condition' : cond}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="lowest_price">Price: Low</option>
              <option value="highest_price">Price: High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Results Grid */}
      <div className="px-4">
        {products.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 mx-auto flex items-center justify-center">
              <PackageX className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No products found</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Try adjusting your search terms or clearing category filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedCondition('all');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm cursor-pointer active:scale-95 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => {
              const fav = isFavourited(p.id);
              const isAvailable = p.availabilityStatus === 'AVAILABLE';
              const discount = p.originalPrice
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => openProductDetails(p)}
                  className={`group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md active:scale-[0.98] transition cursor-pointer flex flex-col ${
                    !isAvailable ? 'opacity-60' : ''
                  }`}
                >
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-[9px] font-bold text-white">
                        {p.condition}
                      </span>
                      {!isAvailable && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-[9px] font-bold text-white">
                          {p.availabilityStatus}
                        </span>
                      )}
                    </div>

                    {discount > 0 && isAvailable && (
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
                      aria-label="Save to favourites"
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
        )}
      </div>
    </div>
  );
};
