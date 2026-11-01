import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Category, Order, Conversation, Notification, YouPiCreateOrderResponse, RazorpayOrderData } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

export type StudentNavTab = 'home' | 'marketplace' | 'sell' | 'orders' | 'messages' | 'profile';
export type AdminNavTab =
  | 'admin_dashboard'
  | 'admin_verifications'
  | 'admin_users'
  | 'admin_moderation'
  | 'admin_payments'
  | 'admin_settings';

interface MarketplaceContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  products: Product[];
  categories: Category[];
  favourites: Product[];
  orders: Order[];
  conversations: Conversation[];
  notifications: Notification[];
  unreadNotifCount: number;
  unreadMessageCount: number;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCondition: string;
  setSelectedCondition: (cond: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  refreshProducts: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  toggleFavourite: (productId: string) => Promise<void>;
  isFavourited: (productId: string) => boolean;

  // Modals state
  selectedProduct: Product | null;
  openProductDetails: (product: Product) => void;
  closeProductDetails: () => void;

  checkoutProduct: Product | null;
  openCheckout: (product: Product) => void;
  closeCheckout: () => void;

  youPiOrderData: { order: Order; youPiOrder: YouPiCreateOrderResponse } | null;
  setYouPiOrderData: (data: { order: Order; youPiOrder: YouPiCreateOrderResponse } | null) => void;

  razorpayOrderData: RazorpayOrderData | null;
  setRazorpayOrderData: (data: RazorpayOrderData | null) => void;

  completedOrder: Order | null;
  openPaymentSuccess: (order: Order) => void;
  closePaymentSuccess: () => void;

  isAddProductOpen: boolean;
  openAddProduct: () => void;
  closeAddProduct: () => void;

  isVerificationModalOpen: boolean;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;

  activeConversationId: string | null;
  openChatConversation: (convId: string) => void;
  closeChatConversation: () => void;

  isExpoViewerOpen: boolean;
  openExpoViewer: () => void;
  closeExpoViewer: () => void;

  // View frame toggle (Mobile Frame vs Full Viewport)
  isDeviceFrameActive: boolean;
  setIsDeviceFrameActive: (active: boolean) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favourites, setFavourites] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [youPiOrderData, setYouPiOrderData] = useState<{
    order: Order;
    youPiOrder: YouPiCreateOrderResponse;
  } | null>(null);
  const [razorpayOrderData, setRazorpayOrderData] = useState<RazorpayOrderData | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isExpoViewerOpen, setIsExpoViewerOpen] = useState<boolean>(false);

  // Default device frame: on large screens, true; on mobile, false
  const [isDeviceFrameActive, setIsDeviceFrameActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const refreshProducts = useCallback(async () => {
    try {
      const res = await api.getProducts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        condition: selectedCondition !== 'all' ? selectedCondition : undefined,
        search: searchQuery || undefined,
        sort: sortBy,
      });
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [selectedCategory, selectedCondition, searchQuery, sortBy]);

  const refreshCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const refreshFavourites = async () => {
    try {
      const res = await api.getFavourites();
      if (res.success) {
        setFavourites(res.favourites);
      }
    } catch (err) {
      console.error('Failed to fetch favourites:', err);
    }
  };

  const refreshOrders = async () => {
    try {
      const res = await api.getOrders();
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const refreshConversations = async () => {
    try {
      const res = await api.getConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const refreshNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        refreshProducts(),
        refreshCategories(),
        refreshFavourites(),
        refreshOrders(),
        refreshConversations(),
        refreshNotifications(),
      ]);
      setIsLoading(false);
    };
    init();
  }, [user?.id, refreshProducts]);

  // Sync tab if user changes role to admin
  useEffect(() => {
    if (user?.role === 'admin' && !activeTab.startsWith('admin_')) {
      setActiveTab('admin_dashboard');
    } else if (user?.role === 'user' && activeTab.startsWith('admin_')) {
      setActiveTab('home');
    }
  }, [user?.role, activeTab]);

  const toggleFavourite = async (productId: string) => {
    try {
      const res = await api.toggleFavourite(productId);
      if (res.success) {
        await refreshFavourites();
      }
    } catch (err) {
      console.error('Failed to toggle favourite:', err);
    }
  };

  const isFavourited = (productId: string) => {
    return favourites.some((f) => f.id === productId);
  };

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;
  const unreadMessageCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <MarketplaceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        products,
        categories,
        favourites,
        orders,
        conversations,
        notifications,
        unreadNotifCount,
        unreadMessageCount,
        isLoading,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        selectedCondition,
        setSelectedCondition,
        sortBy,
        setSortBy,
        refreshProducts,
        refreshOrders,
        refreshConversations,
        refreshNotifications,
        toggleFavourite,
        isFavourited,

        selectedProduct,
        openProductDetails: (p) => setSelectedProduct(p),
        closeProductDetails: () => setSelectedProduct(null),

        checkoutProduct,
        openCheckout: (p) => setCheckoutProduct(p),
        closeCheckout: () => setCheckoutProduct(null),

        youPiOrderData,
        setYouPiOrderData,

        razorpayOrderData,
        setRazorpayOrderData,

        completedOrder,
        openPaymentSuccess: (o) => setCompletedOrder(o),
        closePaymentSuccess: () => setCompletedOrder(null),

        isAddProductOpen,
        openAddProduct: () => setIsAddProductOpen(true),
        closeAddProduct: () => setIsAddProductOpen(false),

        isVerificationModalOpen,
        openVerificationModal: () => setIsVerificationModalOpen(true),
        closeVerificationModal: () => setIsVerificationModalOpen(false),

        activeConversationId,
        openChatConversation: (cId) => setActiveConversationId(cId),
        closeChatConversation: () => setActiveConversationId(null),

        isExpoViewerOpen,
        openExpoViewer: () => setIsExpoViewerOpen(true),
        closeExpoViewer: () => setIsExpoViewerOpen(false),

        isDeviceFrameActive,
        setIsDeviceFrameActive,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
