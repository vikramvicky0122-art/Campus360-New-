import {
  Profile,
  Institution,
  Category,
  Product,
  Order,
  Conversation,
  Message,
  Notification,
  AdminMetrics,
  StudentVerification,
  PlatformSettings,
  YouPiCreateOrderResponse,
  YouPiVerifyPaymentResponse,
  RazorpayCreateOrderResponse,
  RazorpayVerifyPaymentResponse,
  RazorpayCreateOrderRequest,
  RazorpayVerifyPaymentRequest,
  SellerContactDetails,
  BookingHistoryItem,
} from '../types/index.ts';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';

const DEFAULT_INSTITUTION: Institution = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Erode Sengunthar Engineering College',
  code: 'ESEC',
  domain: 'esec.ac.in',
  address: 'Thudupathi, Perundurai, Erode, Tamil Nadu 638057',
  isActive: true,
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    icon: 'Laptop',
    description: 'Laptops, calculators, headphones, chargers',
    displayOrder: 1,
  },
  {
    id: 'cat-2',
    name: 'Books',
    slug: 'books',
    icon: 'BookOpen',
    description: 'Textbooks, semester guides, reference manuals',
    displayOrder: 2,
  },
  {
    id: 'cat-3',
    name: 'Study Materials',
    slug: 'study-materials',
    icon: 'FileText',
    description: 'Mini drafters, lab coats, drawing sheets',
    displayOrder: 3,
  },
  {
    id: 'cat-4',
    name: 'Clothing',
    slug: 'clothing',
    icon: 'Shirt',
    description: 'College hoodies, jackets, lab aprons',
    displayOrder: 4,
  },
  {
    id: 'cat-5',
    name: 'Accessories',
    slug: 'accessories',
    icon: 'Watch',
    description: 'Bags, backpacks, calculators, essentials',
    displayOrder: 5,
  },
  {
    id: 'cat-6',
    name: 'Sports Equipment',
    slug: 'sports-equipment',
    icon: 'Trophy',
    description: 'Rackets, balls, gym gear, campus cycles',
    displayOrder: 6,
  },
];

class ApiService {
  private currentUserId: string = 'user-aarav';
  private apiBaseUrl: string = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    ''
  ).replace(/\/$/, '');

  public setUserId(id: string) {
    this.currentUserId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('campus_bazaar_user_id', id);
    }
  }

  public getUserId(): string {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('campus_bazaar_user_id');
      if (saved) return saved;
    }
    return this.currentUserId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const url = isAbsolute ? endpoint : `${this.apiBaseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': this.getUserId(),
      ...(options.headers as Record<string, string>),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: any) {
      throw new Error(`Network request failed: ${err.message || 'Cannot reach server'}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      if (text.trim().startsWith('<')) {
        throw new Error(
          `Server returned HTML instead of JSON for ${endpoint}. Verify your backend URL or internet connection.`
        );
      }
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected non-JSON response from server for ${endpoint}`);
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  // --- INSTITUTIONS ---
  async getInstitutions(): Promise<{ institutions: Institution[] }> {
    try {
      const res = await this.request<{ success: boolean; institutions: Institution[] }>('/api/institutions');
      if (res?.institutions?.length) return res;
    } catch {
      // Graceful fallback for mobile APK without local server
    }
    return { institutions: [DEFAULT_INSTITUTION] };
  }

  // --- AUTH ---
  async register(params: {
    fullName: string;
    email: string;
    phone: string;
    institutionId: string;
    department: string;
    yearOfStudy: number;
    rollNumber: string;
    password?: string;
  }): Promise<{ success: boolean; message: string; profile: Profile }> {
    const trimmedEmail = params.email.trim().toLowerCase();

    // 1. Direct Supabase Auth for mobile & production
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: params.password || 'Campus360#DefaultPassword',
          options: {
            data: {
              full_name: params.fullName,
              roll_number: params.rollNumber.toUpperCase(),
              phone: params.phone || '',
              department: params.department,
              year_of_study: params.yearOfStudy,
            },
          },
        });

        if (authErr) {
          if (authErr.message.toLowerCase().includes('already registered')) {
            throw new Error('An account with this email already exists.');
          }
          throw new Error(authErr.message);
        }

        const userId = authData.user?.id || `user-${Date.now()}`;

        // Upsert profile in Supabase profiles table
        await supabase.from('profiles').upsert({
          id: userId,
          email: trimmedEmail,
          full_name: params.fullName,
          phone: params.phone,
          institution_id: params.institutionId || DEFAULT_INSTITUTION.id,
          department: params.department,
          year_of_study: params.yearOfStudy,
          roll_number: params.rollNumber.toUpperCase(),
          role: 'user',
          is_verified: false,
          verification_status: 'PENDING',
          updated_at: new Date().toISOString(),
        });

        const newProfile: Profile = {
          id: userId,
          email: trimmedEmail,
          fullName: params.fullName,
          phone: params.phone,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          institutionId: params.institutionId || DEFAULT_INSTITUTION.id,
          institutionName: DEFAULT_INSTITUTION.name,
          department: params.department,
          yearOfStudy: params.yearOfStudy,
          rollNumber: params.rollNumber.toUpperCase(),
          role: 'user',
          isVerified: false,
          isSuspended: false,
          verificationStatus: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.setUserId(userId);
        return {
          success: true,
          message: 'Student account registered successfully. Verification is pending campus admin approval.',
          profile: newProfile,
        };
      } catch (err: any) {
        if (
          err.message.includes('already exists') ||
          err.message.includes('password') ||
          err.message.includes('rate limit')
        ) {
          throw err;
        }
        console.warn('[Supabase Auth] Fallback to backend API register:', err.message);
      }
    }

    // 2. Fallback to backend server if reachable
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async login(email: string, password?: string): Promise<{ success: boolean; profile: Profile }> {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Direct Supabase Auth (works seamlessly on real Android APK anywhere)
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password || '',
        });

        if (authErr) {
          const msg = authErr.message.toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid grant')) {
            throw new Error('Invalid email or password. Please verify your credentials.');
          }
          if (msg.includes('email not confirmed')) {
            throw new Error('Account pending admin approval or email confirmation.');
          }
          console.warn('[Supabase Auth] signIn error:', authErr.message);
        } else if (authData?.user) {
          // Query user profile from Supabase
          const { data: sbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (sbProfile) {
            if (sbProfile.is_suspended) {
              throw new Error('Your account has been suspended by campus administration.');
            }
            if (
              sbProfile.role === 'user' &&
              (!sbProfile.is_verified || sbProfile.verification_status !== 'VERIFIED')
            ) {
              if (sbProfile.verification_status === 'REJECTED') {
                throw new Error(
                  `Registration Rejected: ${sbProfile.rejection_reason || 'Please contact administration.'}`
                );
              }
              throw new Error(
                'Account Pending Approval: Your registration is awaiting campus admin approval. You can log in as soon as the admin approves your account.'
              );
            }

            const profile: Profile = {
              id: sbProfile.id,
              email: sbProfile.email,
              fullName: sbProfile.full_name || 'Student User',
              phone: sbProfile.phone || '',
              avatarUrl:
                sbProfile.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              institutionId: sbProfile.institution_id || DEFAULT_INSTITUTION.id,
              institutionName: DEFAULT_INSTITUTION.name,
              department: sbProfile.department || 'Computer Science & Engineering',
              yearOfStudy: sbProfile.year_of_study || 1,
              rollNumber: sbProfile.roll_number || 'UNKNOWN',
              role: sbProfile.role === 'admin' ? 'admin' : 'user',
              isVerified: sbProfile.is_verified ?? false,
              isSuspended: sbProfile.is_suspended ?? false,
              verificationStatus: (sbProfile.verification_status as any) || 'PENDING',
              createdAt: sbProfile.created_at || new Date().toISOString(),
              updatedAt: sbProfile.updated_at || new Date().toISOString(),
            };

            this.setUserId(profile.id);
            return { success: true, profile };
          }
        }
      } catch (err: any) {
        if (
          err.message.includes('Invalid email or password') ||
          err.message.includes('Account Pending Approval') ||
          err.message.includes('Registration Rejected') ||
          err.message.includes('suspended')
        ) {
          throw err;
        }
        console.warn('[Supabase Auth] Fallback to backend API login:', err.message);
      }
    }

    // 2. Fallback to backend API
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: trimmedEmail, password }),
    });
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        if (!error) {
          return { success: true, message: 'Password reset link sent to your email.' };
        }
      } catch {
        // Fallback
      }
    }
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getMe(): Promise<{ success: boolean; profile: Profile }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentId = session?.user?.id || this.getUserId();
        if (currentId) {
          const { data: sbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentId)
            .maybeSingle();

          if (sbProfile) {
            const profile: Profile = {
              id: sbProfile.id,
              email: sbProfile.email,
              fullName: sbProfile.full_name || 'Student User',
              phone: sbProfile.phone || '',
              avatarUrl:
                sbProfile.avatar_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              institutionId: sbProfile.institution_id || DEFAULT_INSTITUTION.id,
              institutionName: DEFAULT_INSTITUTION.name,
              department: sbProfile.department || 'Computer Science & Engineering',
              yearOfStudy: sbProfile.year_of_study || 1,
              rollNumber: sbProfile.roll_number || 'UNKNOWN',
              role: sbProfile.role === 'admin' ? 'admin' : 'user',
              isVerified: sbProfile.is_verified ?? false,
              isSuspended: sbProfile.is_suspended ?? false,
              verificationStatus: (sbProfile.verification_status as any) || 'PENDING',
              createdAt: sbProfile.created_at || new Date().toISOString(),
              updatedAt: sbProfile.updated_at || new Date().toISOString(),
            };
            return { success: true, profile };
          }
        }
      } catch (e) {
        console.warn('[Supabase] getMe fallback:', e);
      }
    }

    return this.request('/api/auth/me');
  }

  // --- VERIFICATION ---
  async submitVerification(params: {
    rollNumber: string;
    documentUrl: string;
    documentType?: string;
  }): Promise<{ success: boolean; message: string; verification: StudentVerification }> {
    return this.request('/api/verification/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getVerificationStatus(): Promise<{
    success: boolean;
    verificationStatus: string;
    isVerified: boolean;
    verification: StudentVerification | null;
    rejectionReason?: string;
  }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentId = session?.user?.id || this.getUserId();
        if (currentId) {
          const { data: sbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentId)
            .maybeSingle();

          if (sbProfile) {
            return {
              success: true,
              verificationStatus: sbProfile.verification_status || 'PENDING',
              isVerified: sbProfile.is_verified ?? false,
              verification: null,
              rejectionReason: sbProfile.rejection_reason,
            };
          }
        }
      } catch {
        // Fallback
      }
    }
    return this.request('/api/verification/status');
  }

  // --- PRODUCTS ---
  async getProducts(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    sort?: string;
    institutionId?: string;
  }): Promise<{ success: boolean; count: number; products: Product[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    try {
      return await this.request(`/api/products${query}`);
    } catch {
      // Return empty array gracefully if backend is offline on mobile
      return { success: true, count: 0, products: [] };
    }
  }

  async getProduct(id: string): Promise<{ success: boolean; product: Product }> {
    return this.request(`/api/products/${id}`);
  }

  async createProduct(params: {
    title: string;
    description: string;
    categoryId: string;
    price: number;
    originalPrice?: number;
    condition: string;
    department?: string;
    images: string[];
  }): Promise<{ success: boolean; message: string; product: Product }> {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async editProduct(id: string, params: Partial<Product>): Promise<{ success: boolean; product: Product }> {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  async adminDeleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-role': 'admin',
      },
    });
  }

  async getCategories(): Promise<{ success: boolean; categories: Category[] }> {
    try {
      const res = await this.request<{ success: boolean; categories: Category[] }>('/api/categories');
      if (res?.categories?.length) return res;
    } catch {
      // Fallback
    }
    return { success: true, categories: DEFAULT_CATEGORIES };
  }

  // --- FAVOURITES ---
  async getFavourites(): Promise<{ success: boolean; favourites: Product[] }> {
    try {
      return await this.request('/api/favourites');
    } catch {
      return { success: true, favourites: [] };
    }
  }

  async toggleFavourite(productId: string): Promise<{ success: boolean; isFavourited: boolean }> {
    return this.request('/api/favourites/toggle', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  // --- ORDERS & YOUPI-PG PAYMENTS ---
  async createPaymentOrder(params: {
    productId: string;
    handoverLocation: string;
    handoverNotes?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; order: Order; youPiOrder: YouPiCreateOrderResponse }> {
    return this.request('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async verifyPayment(params: {
    gatewayOrderId: string;
    orderId: string;
    paymentReferenceId: string;
    signature: string;
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
    upiId?: string;
    method?: string;
  }): Promise<YouPiVerifyPaymentResponse> {
    return this.request('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- RAZORPAY TEST MODE PAYMENTS ---
  async createRazorpayOrder(params: RazorpayCreateOrderRequest): Promise<RazorpayCreateOrderResponse> {
    return this.request('/api/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async verifyRazorpayPayment(params: RazorpayVerifyPaymentRequest): Promise<RazorpayVerifyPaymentResponse> {
    return this.request('/api/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- SELLER CONTACT PRIVACY & ESCROW ---
  async getSellerContactDetails(orderId: string): Promise<{ success: boolean; sellerContact: SellerContactDetails }> {
    return this.request(`/api/orders/${orderId}/seller-contact`);
  }

  async getBookingHistory(orderId: string): Promise<{ success: boolean; bookingHistory: BookingHistoryItem[] }> {
    return this.request(`/api/orders/${orderId}/booking-history`);
  }

  async confirmHandoverRelease(orderId: string): Promise<{ success: boolean; message: string; order: Order }> {
    return this.request(`/api/orders/${orderId}/confirm-handover`, {
      method: 'POST',
    });
  }

  async raiseDispute(orderId: string, reason: string): Promise<{ success: boolean; message: string; order: Order }> {
    return this.request(`/api/orders/${orderId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // --- ORDERS ---
  async getOrders(): Promise<{ success: boolean; orders: Order[] }> {
    try {
      return await this.request('/api/orders');
    } catch {
      return { success: true, orders: [] };
    }
  }

  async cancelOrder(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/orders/${id}/cancel`, {
      method: 'POST',
    });
  }

  // --- CHAT & CONVERSATIONS ---
  async getConversations(): Promise<{ success: boolean; conversations: Conversation[] }> {
    try {
      return await this.request('/api/conversations');
    } catch {
      return { success: true, conversations: [] };
    }
  }

  async getConversation(id: string): Promise<{
    success: boolean;
    conversation: Conversation;
    messages: Message[];
  }> {
    return this.request(`/api/conversations/${id}`);
  }

  async startConversation(productId: string): Promise<{ success: boolean; conversation: Conversation }> {
    return this.request('/api/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  async sendMessage(
    conversationId: string,
    messageText: string
  ): Promise<{ success: boolean; message: Message }> {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messageText }),
    });
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<{ success: boolean; notifications: Notification[] }> {
    try {
      return await this.request('/api/notifications');
    } catch {
      return { success: true, notifications: [] };
    }
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request('/api/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // --- ADMIN ---
  async getAdminMetrics(): Promise<{ success: boolean; metrics: AdminMetrics }> {
    return this.request('/api/admin/metrics');
  }

  async getAdminVerifications(status?: string): Promise<{ success: boolean; verifications: StudentVerification[] }> {
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/admin/verifications${q}`);
  }

  async approveVerification(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/verifications/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectVerification(id: string, reason: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getAdminUsers(query?: string): Promise<{ success: boolean; users: Profile[] }> {
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.request(`/api/admin/users${q}`);
  }

  async toggleSuspendUser(id: string): Promise<{ success: boolean; message: string; isSuspended: boolean }> {
    return this.request(`/api/admin/users/${id}/toggle-suspend`, {
      method: 'POST',
    });
  }

  async getAdminOrders(): Promise<{ success: boolean; orders: (Order & { payment: any })[] }> {
    return this.request('/api/admin/orders');
  }

  async getAdminTransactions(): Promise<{
    success: boolean;
    transactions: any[];
    totalCommissionCollected: number;
  }> {
    return this.request('/api/admin/transactions');
  }

  async getAdminSettings(): Promise<{ success: boolean; settings: PlatformSettings }> {
    return this.request('/api/admin/settings');
  }

  async updateAdminSettings(settings: Partial<PlatformSettings>): Promise<{ success: boolean; settings: PlatformSettings }> {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiService();
