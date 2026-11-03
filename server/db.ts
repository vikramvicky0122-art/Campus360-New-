import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Profile,
  Institution,
  StudentVerification,
  Category,
  Product,
  Order,
  Payment,
  Transaction,
  Conversation,
  Message,
  Notification,
  PlatformSettings,
  AdminMetrics,
  BookingHistoryItem,
} from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory Database Store simulating Supabase PostgreSQL Engine
class Campus360Database {
  public institutions: Institution[] = [];
  public profiles: Profile[] = [];
  public studentVerifications: StudentVerification[] = [];
  public categories: Category[] = [];
  public products: Product[] = [];
  public favourites: { id: string; studentId: string; productId: string; createdAt: string }[] = [];
  public orders: Order[] = [];
  public payments: Payment[] = [];
  public transactions: Transaction[] = [];
  public conversations: Conversation[] = [];
  public messages: Message[] = [];
  public notifications: Notification[] = [];
  public bookingHistory: BookingHistoryItem[] = [];
  public settings: PlatformSettings = {
    id: 's0000000-0000-0000-0000-000000000001',
    commissionPercentage: 10.0,
    allowedDomains: ['esec.ac.in', 'ait.edu', 'nce.ac.in', 'campus.edu', 'edu', 'ac.in'],
    maintenanceMode: false,
    supportEmail: 'admin@Campus360.edu',
    currency: 'INR',
    updatedBy: 'Campus Admin',
    updatedAt: new Date().toISOString(),
  };

  constructor() {
    this.seed();
    this.loadPersistentData();
  }

  public savePersistentData() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, 'persistent_users.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            profiles: this.profiles,
            studentVerifications: this.studentVerifications,
          },
          null,
          2
        )
      );
    } catch (e) {
      // Ignore disk write errors in restricted environments
    }
  }

  public loadPersistentData() {
    try {
      const filePath = path.join(__dirname, '..', 'data', 'persistent_users.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.profiles)) {
          for (const p of parsed.profiles) {
            const idx = this.profiles.findIndex((existing) => existing.id === p.id || existing.email === p.email);
            if (idx >= 0) {
              this.profiles[idx] = p;
            } else {
              this.profiles.push(p);
            }
          }
        }
        if (Array.isArray(parsed.studentVerifications)) {
          for (const v of parsed.studentVerifications) {
            const idx = this.studentVerifications.findIndex((existing) => existing.id === v.id);
            if (idx >= 0) {
              this.studentVerifications[idx] = v;
            } else {
              this.studentVerifications.push(v);
            }
          }
        }
      }
    } catch (e) {
      // Ignore disk read errors
    }
  }

  private seed() {
    // 1. Institutions
    this.institutions = [
      {
        id: 'inst-1',
        name: 'Erode Sengunthar Engineering College',
        code: 'ESEC',
        domain: 'esec.ac.in',
        address: 'Thudupathi, Perundurai, Erode, Tamil Nadu 638057',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'inst-2',
        name: 'National College of Engineering',
        code: 'NCE',
        domain: 'nce.ac.in',
        address: 'Sector 14, University Enclave',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // 2. Categories
    this.categories = [
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
        description: 'Rackets, balls, gym gloves, campus cycles',
        displayOrder: 6,
      },
      {
        id: 'cat-7',
        name: 'Hostel Essentials',
        slug: 'hostel-essentials',
        icon: 'Home',
        description: 'Electric kettles, study lamps, extension boards',
        displayOrder: 7,
      },
      {
        id: 'cat-8',
        name: 'Furniture',
        slug: 'furniture',
        icon: 'Armchair',
        description: 'Bed study tables, chairs, shelf organizers',
        displayOrder: 8,
      },
      {
        id: 'cat-9',
        name: 'Others',
        slug: 'others',
        icon: 'Package',
        description: 'Campus gear, stationery, musical instruments',
        displayOrder: 9,
      },
    ];

    // 3. Profiles
    this.profiles = [
      {
        id: 'user-admin',
        email: 'admin@Campus360.edu',
        fullName: 'Campus Administrator',
        phone: '+91 98765 43210',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        department: 'Academic Administration',
        yearOfStudy: 4,
        rollNumber: 'ADMIN-001',
        role: 'admin',
        isVerified: true,
        isSuspended: false,
        verificationStatus: 'VERIFIED',
        createdAt: '2025-01-10T08:00:00Z',
        updatedAt: '2025-01-10T08:00:00Z',
      },
      {
        id: 'user-aarav',
        email: 'aarav.patel@esec.ac.in',
        fullName: 'Aarav Patel',
        phone: '+91 98111 22334',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        department: 'Computer Science & Engineering',
        yearOfStudy: 3,
        rollNumber: '2023CS1042',
        role: 'user',
        isVerified: true,
        isSuspended: false,
        verificationStatus: 'VERIFIED',
        createdAt: '2025-02-01T10:00:00Z',
        updatedAt: '2025-02-02T12:00:00Z',
      },
      {
        id: 'user-neha',
        email: 'neha.sharma@esec.ac.in',
        fullName: 'Neha Sharma',
        phone: '+91 98222 33445',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        department: 'Electronics & Communication',
        yearOfStudy: 4,
        rollNumber: '2022EC1099',
        role: 'user',
        isVerified: true,
        isSuspended: false,
        verificationStatus: 'VERIFIED',
        createdAt: '2025-02-05T11:30:00Z',
        updatedAt: '2025-02-06T14:20:00Z',
      },
      {
        id: 'user-dev',
        email: 'dev.malhotra@esec.ac.in',
        fullName: 'Dev Malhotra',
        phone: '+91 98333 44556',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        department: 'Mechanical Engineering',
        yearOfStudy: 2,
        rollNumber: '2024ME2045',
        role: 'user',
        isVerified: false,
        isSuspended: false,
        verificationStatus: 'PENDING',
        createdAt: '2025-03-01T09:15:00Z',
        updatedAt: '2025-03-01T09:15:00Z',
      },
      {
        id: 'user-rohan',
        email: 'rohan.das@esec.ac.in',
        fullName: 'Rohan Das',
        phone: '+91 98444 55667',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        department: 'Electrical Engineering',
        yearOfStudy: 4,
        rollNumber: '2021EE1008',
        role: 'user',
        isVerified: false,
        isSuspended: false,
        verificationStatus: 'REJECTED',
        rejectionReason: 'ID card expired (Academic Year 2023-24). Please upload your current semester fee slip or new smart card.',
        createdAt: '2025-02-20T16:00:00Z',
        updatedAt: '2025-02-21T11:00:00Z',
      },
    ];

    // 4. Student Verifications
    this.studentVerifications = [
      {
        id: 'verif-1',
        studentId: 'user-aarav',
        studentName: 'Aarav Patel',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        rollNumber: '2023CS1042',
        collegeEmail: 'aarav.patel@esec.ac.in',
        department: 'Computer Science & Engineering',
        yearOfStudy: 3,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        documentType: 'STUDENT_ID_CARD',
        status: 'VERIFIED',
        reviewedBy: 'user-admin',
        reviewedAt: '2025-02-02T12:00:00Z',
        createdAt: '2025-02-01T10:15:00Z',
        updatedAt: '2025-02-02T12:00:00Z',
      },
      {
        id: 'verif-2',
        studentId: 'user-neha',
        studentName: 'Neha Sharma',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        rollNumber: '2022EC1099',
        collegeEmail: 'neha.sharma@esec.ac.in',
        department: 'Electronics & Communication',
        yearOfStudy: 4,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        documentType: 'STUDENT_ID_CARD',
        status: 'VERIFIED',
        reviewedBy: 'user-admin',
        reviewedAt: '2025-02-06T14:20:00Z',
        createdAt: '2025-02-05T11:45:00Z',
        updatedAt: '2025-02-06T14:20:00Z',
      },
      {
        id: 'verif-3',
        studentId: 'user-dev',
        studentName: 'Dev Malhotra',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        rollNumber: '2024ME2045',
        collegeEmail: 'dev.malhotra@esec.ac.in',
        department: 'Mechanical Engineering',
        yearOfStudy: 2,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        documentType: 'STUDENT_ID_CARD',
        status: 'PENDING',
        createdAt: '2025-03-01T09:20:00Z',
        updatedAt: '2025-03-01T09:20:00Z',
      },
      {
        id: 'verif-4',
        studentId: 'user-rohan',
        studentName: 'Rohan Das',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        rollNumber: '2021EE1008',
        collegeEmail: 'rohan.das@esec.ac.in',
        department: 'Electrical Engineering',
        yearOfStudy: 4,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
        documentType: 'STUDENT_ID_CARD',
        status: 'REJECTED',
        rejectionReason: 'ID card expired (Academic Year 2023-24). Please upload your current semester fee slip or new smart card.',
        reviewedBy: 'user-admin',
        reviewedAt: '2025-02-21T11:00:00Z',
        createdAt: '2025-02-20T16:15:00Z',
        updatedAt: '2025-02-21T11:00:00Z',
      },
    ];

    // 5. Products
    this.products = [
      {
        id: 'prod-1',
        sellerId: 'user-aarav',
        sellerName: 'Aarav Patel',
        sellerDepartment: 'Computer Science',
        sellerRollNumber: '2023CS1042',
        sellerIsVerified: true,
        categoryId: 'cat-1',
        categoryName: 'Electronics',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Casio FX-991EX ClassWiz Scientific Calculator',
        description: 'Authentic 552 functions calculator, approved for university end-semester exams. Natural textbook display, pristine condition with original sliding protective cover. Battery replaced last month.',
        price: 850,
        originalPrice: 1495,
        condition: 'Like New',
        department: 'Computer Science',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600',
          'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600',
        ],
        viewCount: 142,
        isFeatured: true,
        createdAt: '2025-02-15T09:00:00Z',
        updatedAt: '2025-02-15T09:00:00Z',
      },
      {
        id: 'prod-2',
        sellerId: 'user-neha',
        sellerName: 'Neha Sharma',
        sellerDepartment: 'Electronics & Comm.',
        sellerRollNumber: '2022EC1099',
        sellerIsVerified: true,
        categoryId: 'cat-3',
        categoryName: 'Study Materials',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Mini Drafter & Engineering Drawing Sheet Tube',
        description: 'Complete 1st year engineering graphics set. Heavy-duty clamp mini drafter with scratch-free acrylic scale + waterproof extendable sheet tube. Smooth knobs, perfectly calibrated angles.',
        price: 450,
        originalPrice: 950,
        condition: 'Good',
        department: 'Electronics & Communication',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1581291518655-9523c932dedb?w=600',
        ],
        viewCount: 88,
        isFeatured: false,
        createdAt: '2025-02-18T14:30:00Z',
        updatedAt: '2025-02-18T14:30:00Z',
      },
      {
        id: 'prod-3',
        sellerId: 'user-aarav',
        sellerName: 'Aarav Patel',
        sellerDepartment: 'Computer Science',
        sellerRollNumber: '2023CS1042',
        sellerIsVerified: true,
        categoryId: 'cat-2',
        categoryName: 'Books',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Higher Engineering Mathematics - B.S. Grewal (44th Edition)',
        description: 'Standard textbook for Engineering Math I, II, & III. Includes solved gate examination questions. Clean pages with minimal pencil highlights in vector calculus chapter.',
        price: 380,
        originalPrice: 750,
        condition: 'Good',
        department: 'Applied Sciences',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
        ],
        viewCount: 115,
        isFeatured: true,
        createdAt: '2025-02-20T10:15:00Z',
        updatedAt: '2025-02-20T10:15:00Z',
      },
      {
        id: 'prod-4',
        sellerId: 'user-neha',
        sellerName: 'Neha Sharma',
        sellerDepartment: 'Electronics & Comm.',
        sellerRollNumber: '2022EC1099',
        sellerIsVerified: true,
        categoryId: 'cat-7',
        categoryName: 'Hostel Essentials',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Prestige 1.5L Stainless Steel Electric Kettle',
        description: 'Perfect for late-night Maggi, tea, and warm water during winter exams. 1500W rapid boil, automatic shut-off safety sensor, 360-degree swivel power base. 100% working.',
        price: 580,
        originalPrice: 1195,
        condition: 'Like New',
        department: 'Hostel Block B',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600',
        ],
        viewCount: 96,
        isFeatured: true,
        createdAt: '2025-02-22T17:40:00Z',
        updatedAt: '2025-02-22T17:40:00Z',
      },
      {
        id: 'prod-5',
        sellerId: 'user-aarav',
        sellerName: 'Aarav Patel',
        sellerDepartment: 'Computer Science',
        sellerRollNumber: '2023CS1042',
        sellerIsVerified: true,
        categoryId: 'cat-6',
        categoryName: 'Sports Equipment',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Yonex Nanoray 70 Light Racket + 3 Mavis 350 Shuttles',
        description: 'Ultra-light graphite badminton racket (77g), strung with BG65 at 24 lbs tension. Ideal for campus sports complex. Comes with full zippered thermal head cover and 3 tournament nylon shuttles.',
        price: 1100,
        originalPrice: 2490,
        condition: 'Like New',
        department: 'Sports Complex',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600',
        ],
        viewCount: 64,
        isFeatured: false,
        createdAt: '2025-02-24T12:00:00Z',
        updatedAt: '2025-02-24T12:00:00Z',
      },
      {
        id: 'prod-6',
        sellerId: 'user-neha',
        sellerName: 'Neha Sharma',
        sellerDepartment: 'Electronics & Comm.',
        sellerRollNumber: '2022EC1099',
        sellerIsVerified: true,
        categoryId: 'cat-8',
        categoryName: 'Furniture',
        institutionId: 'inst-1',
        institutionName: 'Erode Sengunthar Engineering College',
        title: 'Ergonomic Foldable Bed Study Table with Cup Holder',
        description: 'Sturdy MDF wood surface with anti-slip aluminum alloy legs. Features built-in tablet/iPad slot and cup holder. Fits easily on hostel single beds for study sessions.',
        price: 390,
        originalPrice: 850,
        condition: 'Good',
        department: 'Hostel Block A',
        availabilityStatus: 'AVAILABLE',
        images: [
          'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600',
        ],
        viewCount: 77,
        isFeatured: false,
        createdAt: '2025-02-25T15:20:00Z',
        updatedAt: '2025-02-25T15:20:00Z',
      },
    ];

    // 6. Favourites
    this.favourites = [
      { id: 'fav-1', studentId: 'user-aarav', productId: 'prod-2', createdAt: new Date().toISOString() },
      { id: 'fav-2', studentId: 'user-neha', productId: 'prod-1', createdAt: new Date().toISOString() },
    ];

    // 7. Orders & Payments sample
    const sampleOrderId = 'ord-1001';
    const sampleOrderNumber = 'CB-20250228-001';
    this.orders = [
      {
        id: sampleOrderId,
        orderNumber: sampleOrderNumber,
        productId: 'prod-1',
        productTitle: 'Casio FX-991EX ClassWiz Scientific Calculator',
        productImage: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600',
        buyerId: 'user-neha',
        buyerName: 'Neha Sharma',
        buyerRollNumber: '2022EC1099',
        sellerId: 'user-aarav',
        sellerName: 'Aarav Patel',
        sellerPhone: '+91 98111 22334',
        sellerDepartment: 'Computer Science',
        totalAmount: 850,
        platformCommission: 42.5,
        sellerNetAmount: 807.5,
        status: 'PAID',
        handoverLocation: 'Central Library Ground Floor Entrance',
        handoverNotes: 'Can meet after 4:00 PM post labs',
        paymentReferenceId: 'UPI_REF_987410293847',
        gatewayOrderId: 'YPI_1740700000_4821',
        createdAt: '2025-02-28T10:30:00Z',
        updatedAt: '2025-02-28T10:35:00Z',
      },
    ];

    this.payments = [
      {
        id: 'pay-1001',
        orderId: sampleOrderId,
        buyerId: 'user-neha',
        amount: 850,
        currency: 'INR',
        provider: 'YouPI-PG',
        gatewayOrderId: 'YPI_1740700000_4821',
        paymentReferenceId: 'UPI_REF_987410293847',
        status: 'SUCCESS',
        idempotencyKey: 'idemp_sample_order_1001',
        method: 'UPI_INTENT',
        upiId: 'nehasharma@okaxis',
        createdAt: '2025-02-28T10:32:00Z',
        updatedAt: '2025-02-28T10:35:00Z',
      },
    ];

    this.transactions = [
      {
        id: 'txn-1',
        paymentId: 'pay-1001',
        orderId: sampleOrderId,
        orderNumber: sampleOrderNumber,
        transactionType: 'PAYMENT',
        amount: 850,
        status: 'COMPLETED',
        description: 'YouPI-PG UPI Collection from Neha Sharma for Order #CB-20250228-001',
        createdAt: '2025-02-28T10:35:00Z',
      },
      {
        id: 'txn-2',
        paymentId: 'pay-1001',
        orderId: sampleOrderId,
        orderNumber: sampleOrderNumber,
        transactionType: 'COMMISSION_FEE',
        amount: 42.5,
        status: 'COMPLETED',
        description: 'Campus360 5.0% platform fee on Order #CB-20250228-001',
        createdAt: '2025-02-28T10:35:00Z',
      },
      {
        id: 'txn-3',
        paymentId: 'pay-1001',
        orderId: sampleOrderId,
        orderNumber: sampleOrderNumber,
        transactionType: 'SELLER_CREDIT',
        amount: 807.5,
        status: 'PENDING',
        description: 'Escrow credit held for seller Aarav Patel pending student handover',
        createdAt: '2025-02-28T10:35:00Z',
      },
    ];

    // 8. Conversations & Messages
    const convId = 'conv-101';
    this.conversations = [
      {
        id: convId,
        productId: 'prod-1',
        productTitle: 'Casio FX-991EX ClassWiz Scientific Calculator',
        productPrice: 850,
        productImage: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600',
        buyerId: 'user-neha',
        buyerName: 'Neha Sharma',
        sellerId: 'user-aarav',
        sellerName: 'Aarav Patel',
        lastMessageText: 'Great, see you by 4:15 PM near the library reading room!',
        lastMessageAt: '2025-02-28T11:00:00Z',
        unreadCount: 0,
        createdAt: '2025-02-28T09:40:00Z',
      },
    ];

    this.messages = [
      {
        id: 'msg-1',
        conversationId: convId,
        senderId: 'user-neha',
        senderName: 'Neha Sharma',
        receiverId: 'user-aarav',
        messageText: 'Hi Aarav, is this calculator still available? Does it have the solar strip working properly?',
        isRead: true,
        createdAt: '2025-02-28T09:40:00Z',
      },
      {
        id: 'msg-2',
        conversationId: convId,
        senderId: 'user-aarav',
        senderName: 'Aarav Patel',
        receiverId: 'user-neha',
        messageText: 'Hey Neha! Yes, both solar and battery are 100% fine. Tested it in digital logic exam last semester.',
        isRead: true,
        createdAt: '2025-02-28T09:42:00Z',
      },
      {
        id: 'msg-3',
        conversationId: convId,
        senderId: 'user-neha',
        senderName: 'Neha Sharma',
        receiverId: 'user-aarav',
        messageText: 'Awesome! Just completed payment on YouPI-PG. Can we meet near Central Library ground floor?',
        isRead: true,
        createdAt: '2025-02-28T10:36:00Z',
      },
      {
        id: 'msg-4',
        conversationId: convId,
        senderId: 'user-aarav',
        senderName: 'Aarav Patel',
        receiverId: 'user-neha',
        messageText: 'Great, see you by 4:15 PM near the library reading room!',
        isRead: true,
        createdAt: '2025-02-28T11:00:00Z',
      },
    ];

    // 9. Notifications
    this.notifications = [
      {
        id: 'notif-1',
        userId: 'user-aarav',
        title: 'New Order Received! 🛍️',
        message: 'Neha Sharma purchased your Casio Calculator. Payment verified on YouPI-PG. Coordinate handover!',
        type: 'ORDER',
        relatedId: sampleOrderId,
        isRead: false,
        createdAt: '2025-02-28T10:35:00Z',
      },
      {
        id: 'notif-2',
        userId: 'user-neha',
        title: 'Payment Successful 💳',
        message: 'Your payment of ₹850 via YouPI-PG was verified. Reference: UPI_REF_987410293847.',
        type: 'PAYMENT',
        relatedId: sampleOrderId,
        isRead: true,
        createdAt: '2025-02-28T10:35:00Z',
      },
      {
        id: 'notif-3',
        userId: 'user-dev',
        title: 'Verification In Progress ⏳',
        message: 'Your student verification request for roll 2024ME2045 is under admin review.',
        type: 'VERIFICATION',
        relatedId: 'verif-3',
        isRead: false,
        createdAt: '2025-03-01T09:20:00Z',
      },
    ];
  }

  // --- QUERY METHODS ---

  public getAdminMetrics(): AdminMetrics {
    const totalStudents = this.profiles.filter((p) => p.role === 'user').length;
    const verifiedStudents = this.profiles.filter((p) => p.role === 'user' && p.isVerified).length;
    const pendingVerifications = this.studentVerifications.filter((v) => v.status === 'PENDING').length;
    const rejectedVerifications = this.studentVerifications.filter((v) => v.status === 'REJECTED').length;
    const totalListings = this.products.length;
    const activeListings = this.products.filter((p) => p.availabilityStatus === 'AVAILABLE').length;
    const soldListings = this.products.filter((p) => p.availabilityStatus === 'SOLD').length;
    const totalOrders = this.orders.length;
    const totalGmv = this.orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0);
    const totalCommission = this.orders.reduce(
      (sum, o) => sum + (o.status !== 'CANCELLED' ? o.platformCommission : 0),
      0
    );
    const activeSellersCount = new Set(this.products.map((p) => p.sellerId)).size;

    return {
      totalStudents,
      verifiedStudents,
      pendingVerifications,
      rejectedVerifications,
      totalListings,
      activeListings,
      soldListings,
      totalOrders,
      totalGmv,
      totalCommission,
      activeSellersCount,
    };
  }
}

export const db = new Campus360Database();
