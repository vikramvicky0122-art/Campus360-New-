export type UserRole = 'user' | 'admin';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type ProductCondition = 'New' | 'Like New' | 'Good' | 'Used';

export type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'REMOVED';

export type BookingStage =
  | 'STAGE_1_BOOKING_FEE'
  | 'STAGE_2_ADMIN_APPROVAL'
  | 'STAGE_3_RENTAL_PAYMENT'
  | 'STAGE_4_ACTIVE_COMPLETION';

export type OrderStatus =
  | 'REQUESTED'
  | 'FEE_PENDING'
  | 'FEE_PAID'
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SELLER_DETAILS_REVEALED'
  | 'RENTAL_PAYMENT_PENDING'
  | 'RENTAL_PAYMENT_REPORTED'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'COMPLETION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PAID'
  | 'ACCEPTED'
  | 'READY_FOR_HANDOVER';

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface Institution {
  id: string;
  name: string;
  code: string;
  domain: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  institutionId: string;
  institutionName?: string;
  department: string;
  yearOfStudy: number;
  rollNumber: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentVerification {
  id: string;
  studentId: string;
  studentName: string;
  institutionId: string;
  institutionName: string;
  rollNumber: string;
  collegeEmail: string;
  department: string;
  yearOfStudy: number;
  documentUrl: string;
  documentType: string;
  status: VerificationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  displayOrder: number;
  productCount?: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerDepartment: string;
  sellerRollNumber: string;
  sellerIsVerified: boolean;
  categoryId: string;
  categoryName: string;
  institutionId: string;
  institutionName: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  condition: ProductCondition;
  department: string;
  availabilityStatus: AvailabilityStatus;
  images: string[];
  viewCount: number;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Favourite {
  id: string;
  studentId: string;
  productId: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  productId: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  buyerRollNumber: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerDepartment: string;
  sellerRollNumber?: string;
  totalAmount: number;
  platformCommission: number;
  sellerNetAmount: number;
  status: OrderStatus;
  handoverLocation: string;
  handoverNotes?: string;
  paymentReferenceId?: string;
  gatewayOrderId?: string;
  sellerSettlementStatus?: 'PENDING_SETTLEMENT' | 'SETTLED' | 'CANCELLED';
  commissionRate?: number;
  paymentProvider?: 'YouPI-PG' | 'RAZORPAY_TEST' | 'RAZORPAY';
  bookingStage?: BookingStage;
  bookingFeeAmount?: number;
  rentalAmount?: number;
  rentalAmountPayable?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  bookingFeePaymentId?: string;
  bookingFeeStatus?: 'PENDING' | 'PAID' | 'REFUND_PENDING' | 'REFUNDED';
  adminReviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  sellerDetailsRevealedAt?: string;
  rentalPaymentStatus?: 'PENDING' | 'REPORTED' | 'PAID';
  rentalPaymentMethod?: string;
  rentalPaymentReference?: string;
  rentalPaymentReportedAt?: string;
  completionRequestedBySellerAt?: string;
  completionConfirmedByBuyerAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  buyerId: string;
  amount: number;
  currency: string;
  provider: 'YouPI-PG' | 'RAZORPAY_TEST' | 'RAZORPAY' | 'DIRECT_SETTLEMENT';
  gatewayOrderId: string;
  paymentReferenceId: string;
  status: PaymentStatus;
  idempotencyKey: string;
  method: string;
  upiId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  transactionType: 'PAYMENT' | 'COMMISSION_FEE' | 'SELLER_CREDIT' | 'REFUND';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  description: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'VERIFICATION' | 'ORDER' | 'PAYMENT' | 'MESSAGE' | 'SYSTEM';
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  commissionPercentage: number;
  allowedDomains: string[];
  maintenanceMode: boolean;
  supportEmail: string;
  currency: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminMetrics {
  totalStudents: number;
  verifiedStudents: number;
  pendingVerifications: number;
  rejectedVerifications: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  totalOrders: number;
  totalGmv: number;
  totalCommission: number;
  activeSellersCount: number;
}

export interface YouPiCreateOrderRequest {
  productId: string;
  buyerId: string;
  amount: number;
  handoverLocation: string;
  handoverNotes?: string;
  idempotencyKey?: string;
}

export interface YouPiCreateOrderResponse {
  success: boolean;
  gatewayOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
  merchantId: string;
  upiIntentUrl: string;
  qrPayload: string;
  signature: string;
  platformCommission: number;
  sellerNetAmount: number;
  status: PaymentStatus;
}

export interface YouPiVerifyPaymentRequest {
  gatewayOrderId: string;
  paymentReferenceId: string;
  orderId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  signature: string;
  upiId?: string;
  method?: string;
}

export interface YouPiVerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  message: string;
  order: Order;
  payment: Payment;
}

// Razorpay Test Mode Interfaces
export interface RazorpayCreateOrderRequest {
  productId: string;
  handoverLocation: string;
  handoverNotes?: string;
  idempotencyKey?: string;
}

export interface RazorpayCreateOrderResponse {
  success: boolean;
  order: Order;
  razorpayOrder: {
    id: string; // Razorpay Order ID: order_xxx
    amount: number; // in paise (e.g. 100000)
    amountInRupees: number; // e.g. 1000
    currency: string; // 'INR'
    keyId: string; // RAZORPAY_KEY_ID (public test key)
    platformCommission: number; // e.g. 100 (10%)
    sellerNetAmount: number; // e.g. 900
    commissionPercent: number; // 10.0
    status: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    productTitle: string;
  };
}

export interface RazorpayVerifyPaymentRequest {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  status?: 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

export interface RazorpayVerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  message: string;
  order: Order;
  payment: Payment;
}

export interface RazorpayOrderData {
  order: Order;
  razorpayOrder: RazorpayCreateOrderResponse['razorpayOrder'];
}

export interface SellerContactDetails {
  sellerId: string;
  fullName: string;
  phone: string;
  email: string;
  whatsapp?: string;
  rollNumber: string;
  department: string;
  institutionName: string;
  handoverLocation: string;
  handoverNotes?: string;
  revealedAt: string;
  bookingId: string;
}

export interface BookingHistoryItem {
  id: string;
  orderId: string;
  changedBy: string;
  fromStatus?: string;
  toStatus?: string;
  oldStatus?: string;
  newStatus: string;
  notes?: string;
  createdAt: string;
  timestamp?: string;
}
