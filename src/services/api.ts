import {
  Profile,
  Institution,
  Category,
  Product,
  Order,
  OrderStatus,
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
  createdAt: '2026-11-01T00:00:00Z',
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
  private currentUserId: string = '';
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('institutions').select('*');
        if (!error && data && data.length > 0) {
          const institutions: Institution[] = data.map((i: any) => ({
            id: i.id,
            name: i.name,
            code: i.code,
            domain: i.domain,
            address: i.address || DEFAULT_INSTITUTION.address,
            isActive: i.is_active ?? true,
            createdAt: i.created_at || DEFAULT_INSTITUTION.createdAt,
          }));
          return { institutions };
        }
      } catch {
        // Fall through
      }
    }
    try {
      const res = await this.request<{ success: boolean; institutions: Institution[] }>('/api/institutions');
      if (res?.institutions?.length) return res;
    } catch {
      // Graceful fallback
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
    const cleanRollNumber = params.rollNumber.trim().toUpperCase();

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // POST to /api/register — handled by:
    //   • Local dev:  vite.config.ts devRegisterApiPlugin() middleware (no email sent)
    //   • Vercel:     api/register.js serverless function (no email sent)
    // Both paths use the service role key server-side.
    // No email confirmation → no free-tier email rate limit errors.
    let response: Response;
    try {
      response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password: params.password,
          fullName: params.fullName,
          rollNumber: cleanRollNumber,
          phone: params.phone || '',
          department: params.department,
          yearOfStudy: params.yearOfStudy,
          institutionId: params.institutionId || DEFAULT_INSTITUTION.id,
        }),
      });
    } catch (netErr: any) {
      throw new Error(`Cannot reach registration service: ${netErr.message}`);
    }

    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new Error('Invalid response from registration service. Please try again.');
    }

    if (!response.ok) {
      throw new Error(result?.error || `Registration failed (${response.status})`);
    }

    const userId = result.userId;

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
      rollNumber: cleanRollNumber,
      role: 'user',
      isVerified: false,
      isSuspended: false,
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Registration Submitted! Pending Campus Admin Approval.',
      profile: newProfile,
    };
  }

  private async registerLegacy(params: any): Promise<{ success: boolean; message: string; profile: Profile }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async login(email: string, password?: string): Promise<{ success: boolean; profile: Profile }> {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Direct Supabase Auth
    if (isSupabaseConfigured() && supabase) {
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
        throw new Error(authErr.message);
      }

      if (authData?.user) {
        // Query user profile from Supabase profiles table
        const { data: sbProfile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profErr) {
          throw new Error('Failed to load user profile: ' + profErr.message);
        }

        if (!sbProfile) {
          throw new Error('Profile record not found for this account. Please contact campus admin.');
        }

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

    // 2. Fallback to backend API
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: trimmedEmail, password }),
    });
  }

  async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[Supabase] signOut error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campus_bazaar_user_id');
    }
    this.currentUserId = '';
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
          const { data: sbProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentId)
            .maybeSingle();

          if (sbProfile && !error) {
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || this.getUserId();
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              roll_number: params.rollNumber.toUpperCase(),
              avatar_url: params.documentUrl,
              verification_status: 'PENDING',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          const verification: StudentVerification = {
            id: userId,
            studentId: userId,
            studentName: 'Student',
            institutionId: DEFAULT_INSTITUTION.id,
            institutionName: DEFAULT_INSTITUTION.name,
            rollNumber: params.rollNumber.toUpperCase(),
            collegeEmail: session?.user?.email || '',
            department: 'Engineering',
            yearOfStudy: 1,
            documentUrl: params.documentUrl,
            documentType: params.documentType || 'STUDENT_ID_CARD',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return { success: true, message: 'Verification submitted', verification };
        }
      } catch (e) {
        console.warn('[Supabase] submitVerification error:', e);
      }
    }
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

  // --- ORDERS & PAYMENTS ---
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

  async getSellerContact(orderId: string): Promise<{ success: boolean; contact: SellerContactDetails }> {
    return this.request(`/api/orders/${orderId}/seller-contact`);
  }

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

  async updateOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; order: Order }> {
    return this.request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async reportRentalPayment(
    orderId: string,
    data: { paymentMethod: string; referenceId: string; notes?: string }
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/orders/${orderId}/rental-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestOrderCompletion(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/orders/${orderId}/request-completion`, {
      method: 'POST',
    });
  }

  async confirmOrderCompletion(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/orders/${orderId}/confirm-completion`, {
      method: 'POST',
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

  async getMessages(conversationId: string): Promise<{
    success: boolean;
    conversation: Conversation;
    messages: Message[];
  }> {
    return this.getConversation(conversationId);
  }

  async startConversation(productId: string, initialMessage?: string): Promise<{ success: boolean; conversation: Conversation }> {
    return this.request('/api/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ productId, initialMessage }),
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
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profiles, error } = await supabase.from('profiles').select('role, is_verified, verification_status');
        if (!error && profiles) {
          const totalStudents = profiles.filter((p: any) => p.role === 'user').length;
          const pendingVerifications = profiles.filter(
            (p: any) => p.role === 'user' && p.verification_status === 'PENDING'
          ).length;
          const verifiedStudents = profiles.filter((p: any) => p.role === 'user' && p.is_verified).length;
          const rejectedVerifications = profiles.filter(
            (p: any) => p.role === 'user' && p.verification_status === 'REJECTED'
          ).length;
          return {
            success: true,
            metrics: {
              totalStudents,
              verifiedStudents,
              pendingVerifications,
              rejectedVerifications,
              totalListings: 0,
              activeListings: 0,
              soldListings: 0,
              totalOrders: 0,
              totalGmv: 0,
              totalCommission: 0,
              activeSellersCount: 0,
            },
          };
        }
      } catch (e) {
        console.warn('[Supabase] getAdminMetrics error:', e);
      }
    }
    return this.request('/api/admin/metrics');
  }

  async getAdminVerifications(status?: string): Promise<{ success: boolean; verifications: StudentVerification[] }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .eq('role', 'user')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('verification_status', status);
        }

        const { data, error } = await query;
        if (!error && data) {
          const verifications: StudentVerification[] = data.map((p: any) => ({
            id: p.id,
            studentId: p.id,
            studentName: p.full_name || 'Student',
            institutionId: p.institution_id || DEFAULT_INSTITUTION.id,
            institutionName: DEFAULT_INSTITUTION.name,
            rollNumber: p.roll_number || 'UNKNOWN',
            collegeEmail: p.email,
            department: p.department || 'Engineering',
            yearOfStudy: p.year_of_study || 1,
            documentUrl: p.avatar_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
            documentType: 'STUDENT_ID_CARD',
            status: (p.verification_status as any) || (p.is_verified ? 'VERIFIED' : 'PENDING'),
            rejectionReason: p.rejection_reason,
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          }));
          return { success: true, verifications };
        }
      } catch (e) {
        console.warn('[Supabase] getAdminVerifications error:', e);
      }
    }
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/admin/verifications${q}`);
  }

  async approveVerification(id: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          verification_status: 'VERIFIED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
      return { success: true, message: 'Student verification approved successfully.' };
    }
    return this.request(`/api/admin/verifications/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectVerification(id: string, reason: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: false,
          verification_status: 'REJECTED',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
      return { success: true, message: 'Student verification rejected.' };
    }
    return this.request(`/api/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reviewBookingAdmin(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    });
  }

  async getAdminUsers(query?: string): Promise<{ success: boolean; users: Profile[] }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let q = supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (query?.trim()) {
          const clean = query.trim();
          q = q.or(`full_name.ilike.%${clean}%,roll_number.ilike.%${clean}%,email.ilike.%${clean}%`);
        }

        const { data, error } = await q;
        if (!error && data) {
          const users: Profile[] = data.map((sbProfile: any) => ({
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
          }));
          return { success: true, users };
        }
      } catch (e) {
        console.warn('[Supabase] getAdminUsers error:', e);
      }
    }
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.request(`/api/admin/users${q}`);
  }

  async toggleSuspendUser(id: string): Promise<{ success: boolean; message: string; isSuspended: boolean }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: curr } = await supabase.from('profiles').select('is_suspended').eq('id', id).single();
        const nextState = !curr?.is_suspended;
        const { error } = await supabase
          .from('profiles')
          .update({ is_suspended: nextState, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) {
          return { success: true, message: nextState ? 'User suspended' : 'User reinstated', isSuspended: nextState };
        }
      } catch (e) {
        console.warn('[Supabase] toggleSuspendUser error:', e);
      }
    }
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
