import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.ts';
import { youPiGateway } from './youpi.ts';
import { razorpayService } from './razorpay.ts';
import type { Product, Order, Payment, Transaction, Conversation, Message, Notification, StudentVerification, Profile } from '../src/types/index.ts';
import { getSupabaseServerClient, isSupabaseConfigured } from './supabase.ts';
import { loadPersistedProducts, savePersistedProducts, loadPersistedOrders, savePersistedOrders } from './storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Express {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Normalize request URLs so both /api/products and /products match
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Auto-sync Supabase authenticated profiles into in-memory store
  app.use(async (req, res, next) => {
    const userId = req.headers['x-user-id'] as string;
    if (userId && !db.profiles.some(p => p.id === userId)) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (p) {
            db.profiles.push({
              id: p.id,
              email: p.email,
              fullName: p.full_name || 'Student User',
              phone: p.phone || '',
              avatarUrl: p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              institutionId: p.institution_id || 'inst-1',
              institutionName: 'Erode Sengunthar Engineering College',
              department: p.department || 'General',
              yearOfStudy: p.year_of_study || 1,
              rollNumber: p.roll_number || 'UNKNOWN',
              role: (p.role === 'admin' ? 'admin' : 'user'),
              isVerified: Boolean(p.is_verified || p.verification_status === 'VERIFIED'),
              isSuspended: Boolean(p.is_suspended),
              verificationStatus: p.verification_status || (p.is_verified ? 'VERIFIED' : 'PENDING'),
              createdAt: p.created_at || new Date().toISOString(),
              updatedAt: p.updated_at || new Date().toISOString(),
            });
          }
        } catch (_) {}
      }
    }
    next();
  });


  // Helper auth extraction (supports session simulation via header 'x-user-id' or token)
  const getUserFromRequest = (req: express.Request) => {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      let found = db.profiles.find((p) => p.id === userId);
      if (found) {
        if (req.headers['x-user-name']) found.fullName = req.headers['x-user-name'] as string;
        if (req.headers['x-user-email']) found.email = req.headers['x-user-email'] as string;
        if (req.headers['x-user-roll']) found.rollNumber = req.headers['x-user-roll'] as string;
        if (req.headers['x-user-department']) found.department = req.headers['x-user-department'] as string;
        return found;
      }

      // If a userId was passed from an authenticated session, guarantee that it has an active profile
      // with their actual userId so listings and orders are never assigned to the wrong account!
      const fallbackUser: Profile = {
        id: userId,
        email: (req.headers['x-user-email'] as string) || `student-${userId.slice(0, 8)}@esec.ac.in`,
        fullName: (req.headers['x-user-name'] as string) || 'Verified Student Seller',
        phone: '+91 98000 00000',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        institutionId: '00000000-0000-0000-0000-000000000001',
        institutionName: 'Erode Sengunthar Engineering College',
        department: (req.headers['x-user-department'] as string) || 'Computer Science & Engineering',
        yearOfStudy: 1,
        rollNumber: (req.headers['x-user-roll'] as string) || 'STUDENT',
        role: 'user' as const,
        isVerified: true,
        isSuspended: false,
        verificationStatus: 'VERIFIED' as const,
        rejectionReason: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.profiles.push(fallbackUser);
      return fallbackUser;
    }
    // Default to verified student Aarav only when no x-user-id is supplied at all
    return db.profiles.find((p) => p.id === 'user-aarav') || null;
  };

  // Section 2: Admin authorization middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = getUserFromRequest(req);
    const isAdmin = user?.role === 'admin' || req.headers['x-admin-role'] === 'admin' || user?.id === 'user-admin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin authorization required.' });
    }
    next();
  };

  // Static files in /public (like campus-bazaar.zip)
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.zip')) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="campus-bazaar.zip"');
      } else if (filePath.endsWith('.tar.gz')) {
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', 'attachment; filename="campus-bazaar.tar.gz"');
      }
    },
  }));

  // --- DOWNLOAD ZIP FOR ANTIGRAVITY & EXPORT ---
  app.get('/api/download/project-zip', (req, res) => {
    const zipPath = path.join(__dirname, '..', 'public', 'campus-bazaar.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="campus-bazaar.zip"');
    res.sendFile(zipPath, (err) => {
      if (err) {
        console.error('Error sending project zip:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not deliver project zip archive' });
        }
      }
    });
  });

  app.get('/api/download/project-tar', (req, res) => {
    const tarPath = path.join(__dirname, '..', 'public', 'campus-bazaar.tar.gz');
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="campus-bazaar.tar.gz"');
    res.sendFile(tarPath, (err) => {
      if (err) {
        console.error('Error sending project tar:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not deliver project tar archive' });
        }
      }
    });
  });

  // --- INSTITUTIONS ---
  app.get('/api/institutions', (req, res) => {
    res.json({ success: true, institutions: db.institutions.filter((i) => i.isActive) });
  });

  // --- AUTHENTICATION ---
  app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    const {
      fullName,
      email,
      phone,
      institutionId,
      department,
      yearOfStudy,
      rollNumber,
      password,
    } = req.body;

    if (!fullName || !email || !rollNumber) {
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    }

    const institution = db.institutions.find((i) => i.id === institutionId || i.code === 'ESEC') || db.institutions[0];

    // Check duplicate email in local store
    const existingEmail = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check duplicate roll number in the SAME institution (Section 3 Requirement)
    const existingRoll = db.profiles.find(
      (p) => p.institutionId === institutionId && p.rollNumber.toLowerCase() === rollNumber.toLowerCase()
    );
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: `Roll number '${rollNumber}' is already registered at ${institution.name}.`,
      });
    }

    let authUserId = `user-${Date.now()}`;
    const supabase = getSupabaseServerClient();

    // If Supabase credentials are configured, create account in Supabase Auth & public.profiles
    if (supabase) {
      try {
        let authData: any = null;
        let authErr: any = null;

        // Use admin.createUser with email_confirm: true so NO email verification link is sent
        try {
          const adminCreateRes = await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password || 'Campus360#DefaultPassword',
            email_confirm: true, // Auto-confirm: No email verification link sent to student!
            user_metadata: {
              full_name: fullName,
              roll_number: rollNumber.toUpperCase(),
              phone: phone || '',
              institution_id: institutionId,
              department,
              year_of_study: Number(yearOfStudy) || 1,
              role: 'user',
            },
          });
          authData = adminCreateRes.data;
          authErr = adminCreateRes.error;
        } catch {
          // Fallback to standard signUp
          const signUpRes = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: password || 'Campus360#DefaultPassword',
            options: {
              data: {
                full_name: fullName,
                roll_number: rollNumber.toUpperCase(),
                phone: phone || '',
                institution_id: institutionId,
                department,
                year_of_study: Number(yearOfStudy) || 1,
                role: 'user',
              },
            },
          });
          authData = signUpRes.data;
          authErr = signUpRes.error;
        }

        if (authErr) {
          if (authErr.message.toLowerCase().includes('already registered')) {
            return res.status(400).json({
              success: false,
              message: 'An account with this email already exists in Supabase Auth.',
            });
          }
          console.warn('[Supabase Auth] registration warning:', authErr.message);
        }

        if (authData?.user) {
          authUserId = authData.user.id;
          // Sync profile to Supabase public.profiles
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: authUserId,
            email: email.toLowerCase(),
            full_name: fullName,
            phone: phone || '',
            institution_id: institutionId,
            department,
            year_of_study: Number(yearOfStudy) || 1,
            roll_number: rollNumber.toUpperCase(),
            role: 'user',
            is_verified: false,
            verification_status: 'PENDING',
            updated_at: new Date().toISOString(),
          });
          if (profileErr) {
            console.warn('[Supabase DB] profiles upsert warning:', profileErr.message);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] registration exception:', err.message);
      }
    }

    const newProfile = {
      id: authUserId,
      email: email.toLowerCase(),
      fullName,
      phone: phone || '+91 90000 00000',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      institutionId,
      institutionName: institution.name,
      department,
      yearOfStudy: Number(yearOfStudy) || 1,
      rollNumber: rollNumber.toUpperCase(),
      role: 'user' as const, // Strict: Public registrations are ALWAYS role 'user' (never admin)
      isVerified: false,
      isSuspended: false,
      verificationStatus: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // Create an automatic initial pending verification record
    const newVerification: StudentVerification = {
      id: `verif-${Date.now()}`,
      studentId: newProfile.id,
      studentName: newProfile.fullName,
      institutionId: institution.id,
      institutionName: institution.name,
      rollNumber: newProfile.rollNumber,
      collegeEmail: newProfile.email,
      department: newProfile.department,
      yearOfStudy: newProfile.yearOfStudy,
      documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
      documentType: 'STUDENT_ID_CARD',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.studentVerifications.push(newVerification);
    db.savePersistentData();

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully. Verification is pending.',
      profile: newProfile,
      supabaseConnected: isSupabaseConfigured(),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        if (password) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
          });
          if (signInErr) {
            console.warn('[Supabase Auth] signInWithPassword error:', signInErr.message);
          }
        }

        // Fetch from Supabase profiles
        const { data: sbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (sbProfile) {
          let profile = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
          if (!profile) {
            profile = {
              id: sbProfile.id,
              email: sbProfile.email,
              fullName: sbProfile.full_name || sbProfile.fullName || 'Student User',
              phone: sbProfile.phone || '',
              avatarUrl: sbProfile.avatar_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
              institutionId: sbProfile.institution_id || 'inst-1',
              institutionName: 'Erode Sengunthar Engineering College',
              department: sbProfile.department || 'Computer Science & Engineering',
              yearOfStudy: sbProfile.year_of_study || 1,
              rollNumber: sbProfile.roll_number || 'UNKNOWN',
              role: sbProfile.role === 'admin' ? 'admin' : 'user',
              isVerified: sbProfile.is_verified || false,
              isSuspended: sbProfile.is_suspended || false,
              verificationStatus: sbProfile.verification_status || 'PENDING',
              createdAt: sbProfile.created_at || new Date().toISOString(),
              updatedAt: sbProfile.updated_at || new Date().toISOString(),
            };
            db.profiles.push(profile);
          }

          if (profile.isSuspended) {
            return res.status(403).json({
              success: false,
              message: 'Your account has been suspended by campus administration. Contact support@campusbazaar.edu',
            });
          }

          // Students (role === 'user') must be approved by admin before login
          if (profile.role === 'user' && (!profile.isVerified || profile.verificationStatus !== 'VERIFIED')) {
            if (profile.verificationStatus === 'REJECTED') {
              return res.status(403).json({
                success: false,
                message: `Registration Rejected: ${profile.rejectionReason || 'Please contact administration.'}`,
              });
            }
            return res.status(403).json({
              success: false,
              message: 'Account Pending Approval: Your registration is awaiting campus admin approval. You can log in as soon as the admin approves your account.',
            });
          }

          return res.json({
            success: true,
            profile,
            source: 'supabase',
          });
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] Login fallback to local store:', err.message);
      }
    }

    const profile = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) {
      return res.status(404).json({ success: false, message: 'No student or admin account found with this email.' });
    }

    if (profile.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by campus administration. Contact support@campusbazaar.edu',
      });
    }

    // Students (role === 'user') must be approved by admin before login
    if (profile.role === 'user' && (!profile.isVerified || profile.verificationStatus !== 'VERIFIED')) {
      if (profile.verificationStatus === 'REJECTED') {
        return res.status(403).json({
          success: false,
          message: `Registration Rejected: ${profile.rejectionReason || 'Please contact administration.'}`,
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Account Pending Approval: Your registration is awaiting campus admin approval. You can log in as soon as the admin approves your account.',
      });
    }

    res.json({
      success: true,
      profile,
      source: 'local',
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const profile = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) {
      return res.status(404).json({ success: false, message: 'No registered student account found with this email.' });
    }
    res.json({
      success: true,
      message: `Password reset instructions have been dispatched to ${profile.email}.`,
    });
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: email.toLowerCase(),
        });
      } catch (err: any) {
        console.warn('[Supabase Auth] resend exception:', err.message);
      }
    }
    res.json({
      success: true,
      message: `Verification link successfully resent to ${email}. Please check your inbox and click the confirmation link.`,
    });
  });

  app.get('/api/auth/supabase-status', (req, res) => {
    res.json({
      configured: isSupabaseConfigured(),
      message: isSupabaseConfigured()
        ? 'Connected to live Supabase backend'
        : 'Running in local fallback mode (enter Supabase keys in .env to connect)',
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    res.json({ success: true, profile: user });
  });

  // --- STUDENT VERIFICATION ---
  app.post('/api/verification/submit', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { rollNumber, documentUrl, documentType } = req.body;
    if (!rollNumber || !documentUrl) {
      return res.status(400).json({ success: false, message: 'Roll number and ID card image are required.' });
    }

    // Check duplicate roll number in same college
    const existing = db.profiles.find(
      (p) => p.id !== user.id && p.institutionId === user.institutionId && p.rollNumber.toLowerCase() === rollNumber.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Roll number '${rollNumber}' is already claimed by another student.`,
      });
    }

    // Update profile
    user.rollNumber = rollNumber.toUpperCase();
    user.verificationStatus = 'PENDING';
    user.updatedAt = new Date().toISOString();

    // Check if verification record already exists
    let verif = db.studentVerifications.find((v) => v.studentId === user.id);
    if (verif) {
      verif.rollNumber = user.rollNumber;
      verif.documentUrl = documentUrl;
      verif.documentType = documentType || 'STUDENT_ID_CARD';
      verif.status = 'PENDING';
      verif.rejectionReason = undefined;
      verif.updatedAt = new Date().toISOString();
    } else {
      verif = {
        id: `verif-${Date.now()}`,
        studentId: user.id,
        studentName: user.fullName,
        institutionId: user.institutionId,
        institutionName: user.institutionName || 'Erode Sengunthar Engineering College',
        rollNumber: user.rollNumber,
        collegeEmail: user.email,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        documentUrl,
        documentType: documentType || 'STUDENT_ID_CARD',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.studentVerifications.push(verif);
    }

    res.json({ success: true, message: 'Verification details submitted for admin review.', verification: verif });
  });

  app.get('/api/verification/status', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const verif = db.studentVerifications.find((v) => v.studentId === user.id);
    res.json({
      success: true,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified,
      verification: verif || null,
      rejectionReason: user.rejectionReason || verif?.rejectionReason,
    });
  });

  // --- MARKETPLACE PRODUCTS ---
  app.get('/api/products', async (req, res) => {
    // Load persisted products from cloud/disk so all accounts and reloaded sessions see newly published items
    db.products = await loadPersistedProducts(db.products);

    const { category, search, minPrice, maxPrice, condition, sort, institutionId } = req.query;

    let items = db.products.filter((p) => p.availabilityStatus !== 'REMOVED');

    if (category && category !== 'all') {
      items = items.filter((p) => p.categoryId === category || p.categoryName.toLowerCase() === String(category).toLowerCase());
    }

    if (institutionId) {
      items = items.filter((p) => p.institutionId === institutionId);
    }

    if (condition && condition !== 'all') {
      items = items.filter((p) => p.condition === condition);
    }

    if (minPrice) {
      items = items.filter((p) => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      items = items.filter((p) => p.price <= Number(maxPrice));
    }

    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    if (sort === 'lowest_price') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'highest_price') {
      items.sort((a, b) => b.price - a.price);
    } else {
      // Newest first by default
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Part 1: Seller Privacy - Sanitize public listing output so seller personal details are not leaked
    const user = getUserFromRequest(req);
    const sanitizedProducts = items.map((p) => {
      const isOwner = user && user.id === p.sellerId;
      const isAdmin = user && user.role === 'admin';
      if (isOwner || isAdmin) {
        return p;
      }
      return {
        ...p,
        sellerName: 'Verified Student Seller',
        sellerRollNumber: '', // Redacted for privacy
      };
    });

    res.json({ success: true, count: sanitizedProducts.length, products: sanitizedProducts });
  });

  app.get('/api/products/:id', async (req, res) => {
    let product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      db.products = await loadPersistedProducts(db.products);
      product = db.products.find((p) => p.id === req.params.id);
    }
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    // Increment view count
    product.viewCount += 1;

    const user = getUserFromRequest(req);
    const isOwner = Boolean(user && user.id === product.sellerId);
    const isAdmin = Boolean(user && user.role === 'admin');
    const isApprovedBuyer = Boolean(
      user &&
        db.orders.some(
          (o) =>
            o.productId === product.id &&
            o.buyerId === user.id &&
            (o.adminReviewStatus === 'APPROVED' || o.status === 'APPROVED' || o.status === 'SELLER_DETAILS_REVEALED')
        )
    );

    // Get seller profile
    const seller = db.profiles.find((p) => p.id === product.sellerId);

    // Part 1: Seller Privacy - Only authorized owner, admin, or approved buyer can see private contact details
    const safeSeller = (isOwner || isAdmin || isApprovedBuyer) && seller
      ? {
          id: seller.id,
          fullName: seller.fullName,
          phone: seller.phone,
          email: seller.email,
          whatsapp: seller.phone,
          department: seller.department,
          yearOfStudy: seller.yearOfStudy,
          isVerified: seller.isVerified,
          avatarUrl: seller.avatarUrl,
          isContactUnlocked: true,
        }
      : {
          id: product.sellerId,
          fullName: 'Campus Verified Student',
          phone: '', // REDACTED
          email: '', // REDACTED
          whatsapp: '', // REDACTED
          department: product.department,
          yearOfStudy: seller?.yearOfStudy || 1,
          isVerified: seller?.isVerified || false,
          avatarUrl: '',
          isContactUnlocked: false,
        };

    res.json({
      success: true,
      product: {
        ...product,
        sellerName: (isOwner || isAdmin || isApprovedBuyer) ? product.sellerName : 'Verified Student Seller',
        sellerRollNumber: (isOwner || isAdmin || isApprovedBuyer) ? product.sellerRollNumber : '',
        seller: safeSeller,
      },
    });
  });

  app.post('/api/products', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // CRITICAL: Section 2 & 4 Requirement: Only verified students can list products
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Access Restricted: Only verified college students can post listings on Campus Bazaar.',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const { title, description, categoryId, price, originalPrice, condition, department, images } = req.body;

    if (!title || !description || !categoryId || !price) {
      return res.status(400).json({ success: false, message: 'Please provide all required product details.' });
    }

    if (Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Product price must be greater than zero.' });
    }

    const category = db.categories.find((c) => c.id === categoryId || c.slug === categoryId);

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sellerId: user.id,
      sellerName: user.fullName,
      sellerDepartment: user.department,
      sellerRollNumber: user.rollNumber,
      sellerIsVerified: true,
      categoryId: category ? category.id : 'cat-9',
      categoryName: category ? category.name : 'Others',
      institutionId: user.institutionId,
      institutionName: user.institutionName || 'Erode Sengunthar Engineering College',
      title,
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      condition: condition || 'Good',
      department: department || user.department,
      availabilityStatus: 'AVAILABLE',
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      viewCount: 1,
      isFeatured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Load latest products, prepend new product, and save persistently to cloud storage and disk
    db.products = await loadPersistedProducts(db.products);
    db.products.unshift(newProduct);
    await savePersistedProducts(db.products);

    res.status(201).json({ success: true, message: 'Product listed successfully!', product: newProduct });
  });

  app.put('/api/products/:id', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    db.products = await loadPersistedProducts(db.products);
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (product.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only edit your own listings.' });
    }

    const { title, description, price, originalPrice, condition, availabilityStatus } = req.body;
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = Number(price);
    if (originalPrice !== undefined) product.originalPrice = Number(originalPrice);
    if (condition) product.condition = condition;
    if (availabilityStatus) product.availabilityStatus = availabilityStatus;
    product.updatedAt = new Date().toISOString();

    await savePersistedProducts(db.products);

    res.json({ success: true, message: 'Product updated successfully.', product });
  });

  app.delete('/api/products/:id', async (req, res) => {
    const user = getUserFromRequest(req);
    db.products = await loadPersistedProducts(db.products);
    const productIndex = db.products.findIndex((p) => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = db.products[productIndex];
    const isAdmin = user?.role === 'admin' || req.headers['x-admin-role'] === 'admin';

    if (!isAdmin && user && product.sellerId !== user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own listings.' });
    }

    // Permanently remove from products list
    const [removed] = db.products.splice(productIndex, 1);
    await savePersistedProducts(db.products);
    res.json({ success: true, message: 'Product successfully removed from marketplace.', removedId: removed?.id });
  });

  app.delete('/api/admin/products/:id', async (req, res) => {
    db.products = await loadPersistedProducts(db.products);
    const productIndex = db.products.findIndex((p) => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in marketplace.' });
    }
    const [removed] = db.products.splice(productIndex, 1);
    await savePersistedProducts(db.products);
    res.json({ success: true, message: 'Product listing permanently removed by administrator.', removedId: removed?.id });
  });

  // --- CATEGORIES ---
  app.get('/api/categories', (req, res) => {
    const categoriesWithCount = db.categories.map((c) => ({
      ...c,
      productCount: db.products.filter((p) => p.categoryId === c.id && p.availabilityStatus === 'AVAILABLE').length,
    }));
    res.json({ success: true, categories: categoriesWithCount });
  });

  // --- FAVOURITES ---
  app.get('/api/favourites', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const favProductIds = db.favourites.filter((f) => f.studentId === user.id).map((f) => f.productId);
    const favProducts = db.products.filter((p) => favProductIds.includes(p.id));
    res.json({ success: true, favourites: favProducts });
  });

  app.post('/api/favourites/toggle', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId } = req.body;
    const existingIndex = db.favourites.findIndex((f) => f.studentId === user.id && f.productId === productId);

    if (existingIndex >= 0) {
      db.favourites.splice(existingIndex, 1);
      res.json({ success: true, isFavourited: false });
    } else {
      db.favourites.push({
        id: `fav-${Date.now()}`,
        studentId: user.id,
        productId,
        createdAt: new Date().toISOString(),
      });
      res.json({ success: true, isFavourited: true });
    }
  });

  // --- BUYING & YOUPI-PG PAYMENT WORKFLOW ---
  app.post('/api/payments/create-order', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Section 2 & 5 Requirement: Only verified students can make purchases
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Verification Required: You must be a verified student to purchase items on Campus Bazaar.',
      });
    }

    db.products = await loadPersistedProducts(db.products);
    db.orders = await loadPersistedOrders(db.orders);

    const { productId, handoverLocation, handoverNotes, idempotencyKey } = req.body;

    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Section 6 Requirement: Prevent sellers from purchasing their own products
    if (product.sellerId === user.id) {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: You cannot purchase your own listed product.',
      });
    }

    // Section 6 Requirement: Prevent two buyers from purchasing the same already-sold product
    if (product.availabilityStatus !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
        message: 'This product has already been reserved or sold to another student.',
      });
    }

    // Commission Calculation (e.g. 5%)
    const commissionPercent = db.settings.commissionPercentage || 5.0;
    const totalAmount = product.price;
    const platformCommission = Number(((totalAmount * commissionPercent) / 100).toFixed(2));
    const sellerNetAmount = Number((totalAmount - platformCommission).toFixed(2));

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `CB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    // Create pending order
    const seller = db.profiles.find((p) => p.id === product.sellerId);
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      productId: product.id,
      productTitle: product.title,
      productImage: product.images[0] || '',
      buyerId: user.id,
      buyerName: user.fullName,
      buyerRollNumber: user.rollNumber,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerPhone: seller?.phone || '+91 98000 00000',
      sellerDepartment: product.department,
      totalAmount,
      platformCommission,
      sellerNetAmount,
      status: 'FEE_PENDING',
      handoverLocation: handoverLocation || 'Campus Central Library',
      handoverNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.orders.push(newOrder);
    await savePersistedOrders(db.orders);
    await savePersistedOrders(db.orders);

    // Call YouPI-PG Gateway integration module to create payment order
    const youPiOrder = youPiGateway.createOrder({
      orderId,
      amount: totalAmount,
      currency: 'INR',
      studentRoll: user.rollNumber,
      productTitle: product.title,
      idempotencyKey,
    }) as any;

    newOrder.gatewayOrderId = youPiOrder.gatewayOrderId;

    res.json({
      success: true,
      order: newOrder,
      youPiOrder: {
        ...youPiOrder,
        platformCommission,
        sellerNetAmount,
        commissionPercent,
      },
    });
  });

  app.post('/api/payments/verify', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    db.products = await loadPersistedProducts(db.products);
    db.orders = await loadPersistedOrders(db.orders);

    const { gatewayOrderId, orderId, paymentReferenceId, signature, status, upiId, method } = req.body;

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order reference not found' });
    }

    const product = db.products.find((p) => p.id === order.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify through YouPI-PG Gateway module with HMAC check
    const verification = youPiGateway.verifyPayment({
      gatewayOrderId,
      orderId,
      paymentReferenceId,
      amount: order.totalAmount,
      status: status || 'SUCCESS',
      signature,
    });

    if (!verification.isValid || status !== 'SUCCESS') {
      order.status = 'CANCELLED';
      order.updatedAt = new Date().toISOString();
      await savePersistedOrders(db.orders);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed on YouPI-PG gateway. Transaction was declined or cancelled.',
      });
    }

    // Idempotency check: Don't process twice
    const existingPayment = db.payments.find((p) => p.orderId === order.id && p.status === 'SUCCESS');
    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Payment already verified and confirmed.',
        order,
        payment: existingPayment,
      });
    }

    // 1. Mark Order as PAID
    order.status = 'PAID';
    order.paymentReferenceId = verification.paymentReferenceId;
    order.gatewayOrderId = gatewayOrderId;
    order.updatedAt = new Date().toISOString();

    // 2. Mark Product as RESERVED / SOLD
    product.availabilityStatus = 'SOLD';
    product.updatedAt = new Date().toISOString();

    await savePersistedOrders(db.orders);
    await savePersistedProducts(db.products);

    // 3. Record Payment
    const paymentRecord: Payment = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      buyerId: user.id,
      amount: order.totalAmount,
      currency: 'INR',
      provider: 'YouPI-PG',
      gatewayOrderId,
      paymentReferenceId: verification.paymentReferenceId,
      status: 'SUCCESS',
      idempotencyKey: `idemp_${order.id}`,
      method: method || 'UPI_INTENT',
      upiId: upiId || 'student@upi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.payments.push(paymentRecord);

    // 4. Record Double-Entry Transactions (Payment Collection + Platform Fee + Seller Escrow Credit)
    db.transactions.push({
      id: `txn-${Date.now()}-1`,
      paymentId: paymentRecord.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionType: 'PAYMENT',
      amount: order.totalAmount,
      status: 'COMPLETED',
      description: `YouPI-PG UPI Collection: ₹${order.totalAmount} for Order #${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });

    db.transactions.push({
      id: `txn-${Date.now()}-2`,
      paymentId: paymentRecord.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionType: 'COMMISSION_FEE',
      amount: order.platformCommission,
      status: 'COMPLETED',
      description: `Campus Bazaar Platform Fee (${db.settings.commissionPercentage}%): ₹${order.platformCommission}`,
      createdAt: new Date().toISOString(),
    });

    db.transactions.push({
      id: `txn-${Date.now()}-3`,
      paymentId: paymentRecord.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionType: 'SELLER_CREDIT',
      amount: order.sellerNetAmount,
      status: 'PENDING',
      description: `Escrow hold for seller ${order.sellerName}: ₹${order.sellerNetAmount} (Handover release)`,
      createdAt: new Date().toISOString(),
    });

    // 5. Notify Seller of the new order
    db.notifications.push({
      id: `notif-${Date.now()}-seller`,
      userId: order.sellerId,
      title: 'New Order Confirmed! 🎉',
      message: `${user.fullName} purchased "${order.productTitle}" for ₹${order.totalAmount}. Payment verified via YouPI-PG. Please accept and coordinate campus handover!`,
      type: 'ORDER',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 6. Notify Buyer
    db.notifications.push({
      id: `notif-${Date.now()}-buyer`,
      userId: user.id,
      title: 'Payment Successful 💳',
      message: `Your payment of ₹${order.totalAmount} was verified. Reference: ${verification.paymentReferenceId}. Seller has been notified.`,
      type: 'PAYMENT',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Payment verified successfully on YouPI-PG gateway!',
      order,
      payment: paymentRecord,
    });
  });

  // Webhook for YouPI-PG Asynchronous IPN
  app.post('/api/payments/webhook', (req, res) => {
    const signature = req.headers['x-youpi-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    const isValid = youPiGateway.verifySignature(rawBody, signature);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, data } = req.body;
    // Process async gateway callback if needed
    res.json({ received: true, event });
  });

  // Centralized audit logger for booking state transitions
  function recordBookingHistory(params: {
    orderId: string;
    changedBy: string;
    oldStatus?: string;
    newStatus: string;
    notes?: string;
  }) {
    const now = new Date().toISOString();
    db.bookingHistory.push({
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: params.orderId,
      changedBy: params.changedBy,
      fromStatus: params.oldStatus as any,
      toStatus: params.newStatus as any,
      oldStatus: params.oldStatus as any,
      newStatus: params.newStatus as any,
      notes: params.notes,
      createdAt: now,
      timestamp: now,
    });
  }

  // --- RAZORPAY TEST MODE PAYMENT WORKFLOW ---
  app.post('/api/razorpay/create-order', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Verification Required: You must be a verified student to book or purchase items on Campus360.',
      });
    }

    db.products = await loadPersistedProducts(db.products);
    db.orders = await loadPersistedOrders(db.orders);

    const { productId, handoverLocation, handoverNotes } = req.body;

    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product listing not found.' });
    }

    if (product.sellerId === user.id) {
      return res.status(400).json({
        success: false,
        message: 'Security Restriction: You cannot book or purchase your own listing.',
      });
    }

    if (product.availabilityStatus !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Listing is no longer available (already reserved or rented).',
      });
    }

    // Part 2: Two-Stage Payment Calculation
    // Stage 1: Booking fee / Platform commission (10%)
    // Stage 2: Rental amount paid directly between buyer & seller (90%)
    const totalAmount = Number(product.price);
    const commissionPercent = Number(process.env.CAMPUS_COMMISSION_PERCENT || db.settings.commissionPercentage || 10.0);
    const bookingFeeAmount = Math.round(totalAmount * (commissionPercent / 100) * 100) / 100;
    const rentalAmount = Math.round((totalAmount - bookingFeeAmount) * 100) / 100;

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `CB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const seller = db.profiles.find((p) => p.id === product.sellerId);

    // Call Razorpay Service to create Razorpay Order FOR STAGE 1 BOOKING FEE ONLY
    const razorpayOrder = await razorpayService.createOrder({
      amount: bookingFeeAmount,
      orderId,
      studentRoll: user.rollNumber,
      notes: {
        productTitle: product.title,
        buyerEmail: user.email,
        sellerId: product.sellerId,
        paymentType: 'BOOKING_FEE_STAGE_1',
      },
    });

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      productId: product.id,
      productTitle: product.title,
      productImage: product.images[0] || '',
      buyerId: user.id,
      buyerName: user.fullName,
      buyerRollNumber: user.rollNumber,
      sellerId: seller?.id || product.sellerId,
      sellerName: seller?.fullName || product.sellerName,
      sellerPhone: seller?.phone || '9876543210',
      sellerDepartment: seller?.department || product.department,
      totalAmount,
      platformCommission: bookingFeeAmount,
      sellerNetAmount: rentalAmount,
      status: 'FEE_PENDING',
      bookingStage: 'STAGE_1_BOOKING_FEE',
      bookingFeeAmount,
      rentalAmount,
      bookingFeeStatus: 'PENDING',
      adminReviewStatus: 'PENDING',
      rentalPaymentStatus: 'PENDING',
      handoverLocation: handoverLocation || 'Campus Central Library Ground Floor Entrance',
      handoverNotes,
      gatewayOrderId: razorpayOrder.razorpayOrderId,
      sellerSettlementStatus: 'PENDING_SETTLEMENT',
      commissionRate: commissionPercent,
      paymentProvider: 'RAZORPAY_TEST',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.orders.push(newOrder);
    await savePersistedOrders(db.orders);

    // Audit history entry
    recordBookingHistory({
      orderId: newOrder.id,
      changedBy: user.id,
      oldStatus: 'REQUESTED',
      newStatus: 'FEE_PENDING',
      notes: `Booking request created. Stage 1 booking fee: ₹${bookingFeeAmount}. Rental balance: ₹${rentalAmount}.`,
    });

    // Note: RAZORPAY_KEY_SECRET is NEVER returned in the response
    res.json({
      success: true,
      order: newOrder,
      razorpayOrder: {
        id: razorpayOrder.razorpayOrderId,
        amount: razorpayOrder.amountInPaise,
        amountInRupees: bookingFeeAmount,
        rentalAmount,
        totalProductPrice: totalAmount,
        currency: razorpayOrder.currency,
        keyId: razorpayService.getKeyId(),
        platformCommission: bookingFeeAmount,
        sellerNetAmount: rentalAmount,
        commissionPercent,
        status: 'created',
        studentName: user.fullName,
        studentEmail: user.email,
        studentPhone: user.phone,
        productTitle: product.title,
      },
    });
  });

  app.post('/api/razorpay/verify-payment', async (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { orderId, status = 'SUCCESS' } = req.body;
    const razorpay_order_id = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const razorpay_signature = req.body.razorpay_signature || req.body.razorpaySignature;

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order reference not found.' });
    }

    const product = db.products.find((p) => p.id === order.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Associated product not found.' });
    }

    // 1. Idempotency Check: Prevent duplicate payment verification
    const existingPayment = db.payments.find(
      (p) => (p.orderId === order.id || p.paymentReferenceId === razorpay_payment_id) && p.status === 'SUCCESS'
    );
    if (existingPayment) {
      return res.json({
        success: true,
        verified: true,
        message: 'Payment already verified (idempotent request).',
        order,
        payment: existingPayment,
      });
    }

    // 2. Server-side signature verification using HMAC-SHA256
    const verification = razorpayService.verifySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    if (!verification.isValid || status !== 'SUCCESS') {
      order.status = 'CANCELLED';
      order.bookingFeeStatus = 'PENDING';
      order.sellerSettlementStatus = 'CANCELLED';
      order.updatedAt = new Date().toISOString();

      recordBookingHistory({
        orderId: order.id,
        changedBy: user.id,
        oldStatus: order.status,
        newStatus: 'CANCELLED',
        notes: 'Payment verification failed or user cancelled Razorpay test modal.',
      });

      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Payment verification failed: Razorpay signature is invalid or transaction was cancelled.',
      });
    }

    // 3. Mark as verified to prevent duplicates
    razorpayService.markAsVerified(razorpay_payment_id);

    // 4. Update Order to Stage 2: PENDING_ADMIN_APPROVAL
    const oldStatus = order.status;
    order.status = 'PENDING_ADMIN_APPROVAL';
    order.bookingStage = 'STAGE_2_ADMIN_APPROVAL';
    order.bookingFeeStatus = 'PAID';
    order.bookingFeePaymentId = razorpay_payment_id;
    order.paymentReferenceId = razorpay_payment_id;
    order.gatewayOrderId = razorpay_order_id;
    order.sellerSettlementStatus = 'PENDING_SETTLEMENT';
    order.adminReviewStatus = 'PENDING';
    order.updatedAt = new Date().toISOString();

    // 5. Reserve product so others cannot double-book
    product.availabilityStatus = 'RESERVED';
    product.updatedAt = new Date().toISOString();

    await savePersistedOrders(db.orders);
    await savePersistedProducts(db.products);

    // 6. Record Payment record for Stage 1 Booking Fee
    const paymentRecord: Payment = {
      id: `pay-rzp-${Date.now()}`,
      orderId: order.id,
      buyerId: user.id,
      amount: order.bookingFeeAmount || order.platformCommission,
      currency: 'INR',
      provider: 'RAZORPAY_TEST',
      gatewayOrderId: razorpay_order_id,
      paymentReferenceId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'SUCCESS',
      idempotencyKey: `rzp_${razorpay_payment_id}`,
      method: 'RAZORPAY_TEST_BOOKING_FEE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rawResponse: {
        mode: 'TEST_MODE',
        gateway: 'Razorpay Test Checkout',
        stage: 'STAGE_1_BOOKING_FEE',
        verifiedAt: new Date().toISOString(),
        verifiedServerSide: true,
      },
    };
    db.payments.push(paymentRecord);

    // 7. Record Accounting Ledger Transaction (Commission Fee)
    db.transactions.push({
      id: `txn-comm-${Date.now()}`,
      paymentId: paymentRecord.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionType: 'COMMISSION_FEE',
      amount: order.platformCommission,
      status: 'COMPLETED',
      description: `Campus360 Booking Fee (${order.commissionRate || 10}%) on Order #${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });

    // 8. Audit log
    recordBookingHistory({
      orderId: order.id,
      changedBy: user.id,
      oldStatus,
      newStatus: 'PENDING_ADMIN_APPROVAL',
      notes: `Booking fee of ₹${order.bookingFeeAmount} verified via Razorpay Test Mode. Booking submitted for admin review.`,
    });

    // 9. Notifications
    db.notifications.push({
      id: `notif-buyer-${Date.now()}`,
      userId: order.buyerId,
      title: 'Booking Fee Paid (Test Mode) 🎉',
      message: `Your booking fee of ₹${order.bookingFeeAmount} for "${order.productTitle}" was verified. Sent to campus admin for approval.`,
      type: 'PAYMENT',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    db.notifications.push({
      id: `notif-seller-${Date.now()}`,
      userId: order.sellerId,
      title: 'New Booking Request 📦',
      message: `A student booked "${order.productTitle}" and paid the booking fee. Admin review is pending.`,
      type: 'ORDER',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      verified: true,
      orderStatus: 'PENDING_ADMIN_APPROVAL',
      paymentStatus: 'SUCCESS',
      message: 'Razorpay Test Mode booking fee verified! Awaiting campus admin review.',
      order,
      payment: paymentRecord,
    });
  });

  // --- PART 1 & 2: SELLER CONTACT REVEAL (FOR APPROVED BUYERS ONLY) ---
  app.get('/api/orders/:id/seller-contact', async (req, res) => {
    db.orders = await loadPersistedOrders(db.orders);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order reference not found' });

    const isBuyer = user.id === order.buyerId;
    const isAdmin = user.role === 'admin' || req.headers['x-admin-role'] === 'admin' || user.id === 'user-admin';

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Security Restriction: You are not authorized to view seller details for this booking.',
      });
    }

    const isApproved =
      order.adminReviewStatus === 'APPROVED' ||
      ['APPROVED', 'SELLER_DETAILS_REVEALED', 'RENTAL_PAYMENT_PENDING', 'RENTAL_PAYMENT_REPORTED', 'ACTIVE', 'RETURN_REQUESTED', 'COMPLETED'].includes(order.status);

    if (!isApproved && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Seller contact is protected. Details unlock only after admin approval.',
      });
    }

    const seller = db.profiles.find((p) => p.id === order.sellerId);
    const sellerName = seller?.fullName || order.sellerName || 'Verified Student Seller';
    const sellerPhone = seller?.phone || order.sellerPhone || '+91 98000 00000';
    const sellerDept = seller?.department || order.sellerDepartment || 'Computer Science & Engineering';
    const sellerEmail = seller?.email || `student-${order.sellerId.slice(0, 8)}@esec.ac.in`;
    const sellerRoll = seller?.rollNumber || 'STUDENT';

    // Mark revealed timestamp
    if (!order.sellerDetailsRevealedAt) {
      order.sellerDetailsRevealedAt = new Date().toISOString();
      order.updatedAt = new Date().toISOString();
      await savePersistedOrders(db.orders);
    }

    const contact = {
      sellerId: order.sellerId,
      fullName: sellerName,
      phone: sellerPhone,
      email: sellerEmail,
      whatsapp: sellerPhone,
      whatsApp: sellerPhone,
      rollNumber: sellerRoll,
      department: sellerDept,
      institutionName: seller?.institutionName || 'Erode Sengunthar Engineering College',
      handoverLocation: order.handoverLocation,
      pickupAddress: order.handoverLocation,
      handoverNotes: order.handoverNotes,
      revealedAt: order.sellerDetailsRevealedAt,
      bookingId: order.id,
    };

    res.json({
      success: true,
      contact,
      sellerContact: contact,
    });
  });

  // --- PART 2: ADMIN REVIEW OF BOOKINGS (STAGE 2) ---
  const handleAdminOrderReview = async (req: express.Request, res: express.Response) => {
    db.orders = await loadPersistedOrders(db.orders);
    db.products = await loadPersistedProducts(db.products);

    const admin = getUserFromRequest(req);
    const action = ((req.body.action || req.body.decision || '') as string).toUpperCase();
    const rejectionReason = req.body.rejectionReason || req.body.reason || req.body.notes;

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const product = db.products.find((p) => p.id === order.productId);
    const oldStatus = order.status;

    if (action === 'APPROVE') {
      order.status = 'APPROVED';
      order.adminReviewStatus = 'APPROVED';
      order.approvedBy = admin?.id || 'admin';
      order.approvedAt = new Date().toISOString();
      order.sellerDetailsRevealedAt = new Date().toISOString();
      order.bookingStage = 'STAGE_3_RENTAL_PAYMENT';
      order.rentalPaymentStatus = 'PENDING';
      order.updatedAt = new Date().toISOString();

      recordBookingHistory({
        orderId: order.id,
        changedBy: admin?.id || 'admin',
        oldStatus,
        newStatus: 'APPROVED',
        notes: 'Admin approved booking. Seller private contact details revealed to buyer.',
      });

      db.notifications.push({
        id: `notif-approved-${Date.now()}`,
        userId: order.buyerId,
        title: 'Booking Approved! 🔓',
        message: `Admin approved your booking for "${order.productTitle}". Seller contact details are now unlocked! Arrange handover and rental payment.`,
        type: 'ORDER',
        relatedId: order.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      await savePersistedOrders(db.orders);

      return res.json({ success: true, message: 'Booking approved. Seller details unlocked.', order });
    } else if (action === 'REJECT') {
      order.status = 'REJECTED';
      order.adminReviewStatus = 'REJECTED';
      order.rejectionReason = rejectionReason || 'Declined by campus administration.';
      order.bookingFeeStatus = 'REFUND_PENDING';
      order.updatedAt = new Date().toISOString();

      if (product) {
        product.availabilityStatus = 'AVAILABLE';
        product.updatedAt = new Date().toISOString();
        await savePersistedProducts(db.products);
      }

      recordBookingHistory({
        orderId: order.id,
        changedBy: admin?.id || 'admin',
        oldStatus,
        newStatus: 'REJECTED',
        notes: `Admin rejected booking: ${order.rejectionReason}. Booking fee marked REFUND_PENDING.`,
      });

      db.notifications.push({
        id: `notif-rejected-${Date.now()}`,
        userId: order.buyerId,
        title: 'Booking Request Declined ❌',
        message: `Your booking for "${order.productTitle}" was declined: ${order.rejectionReason}. Booking fee refund is initiated.`,
        type: 'ORDER',
        relatedId: order.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      await savePersistedOrders(db.orders);

      return res.json({ success: true, message: 'Booking rejected.', order });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT.' });
    }
  };

  app.post('/api/admin/orders/:id/review', requireAdmin, handleAdminOrderReview);
  app.put('/api/admin/orders/:id/review', requireAdmin, handleAdminOrderReview);

  // --- PART 2 & 3: REPORT RENTAL AMOUNT PAYMENT (STAGE 3) ---
  app.post('/api/orders/:id/report-rental-payment', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (order.adminReviewStatus !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Rental payment can only be reported after admin approval.' });
    }

    const { paymentMethod = 'UPI', referenceId, notes } = req.body;
    const oldStatus = order.status;

    order.rentalPaymentStatus = 'PAID';
    order.rentalPaymentMethod = paymentMethod;
    order.rentalPaymentReference = referenceId || `RENT_REF_${Date.now()}`;
    order.rentalPaymentReportedAt = new Date().toISOString();
    order.status = 'ACTIVE';
    order.bookingStage = 'STAGE_4_ACTIVE_COMPLETION';
    order.updatedAt = new Date().toISOString();

    // Record rental payment
    db.payments.push({
      id: `pay-rent-${Date.now()}`,
      orderId: order.id,
      buyerId: order.buyerId,
      amount: order.rentalAmount || order.sellerNetAmount,
      currency: 'INR',
      provider: 'DIRECT_SETTLEMENT',
      gatewayOrderId: order.rentalPaymentReference || `RENT_${order.id}`,
      paymentReferenceId: order.rentalPaymentReference || `RENT_REF_${Date.now()}`,
      status: 'SUCCESS',
      idempotencyKey: `rent_${order.id}_${Date.now()}`,
      method: `${paymentMethod} (DEMO PAYMENT)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rawResponse: {
        demo: true,
        type: 'STAGE_2_RENTAL_AMOUNT',
        notes: notes || 'Direct rental settlement reported between students',
      },
    });

    recordBookingHistory({
      orderId: order.id,
      changedBy: user.id,
      oldStatus,
      newStatus: 'ACTIVE',
      notes: `Rental amount of ₹${order.rentalAmount} reported via ${paymentMethod} (Ref: ${order.rentalPaymentReference}). Rental is now ACTIVE.`,
    });

    res.json({ success: true, message: 'Rental payment recorded. Rental is now ACTIVE.', order });
  });

  // --- PART 3: LIFECYCLE COMPLETION STEPPER (SELLER REQUEST -> BUYER CONFIRM) ---
  const handleRequestCompletion = async (req: express.Request, res: express.Response) => {
    db.orders = await loadPersistedOrders(db.orders);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the seller can request rental return/completion.' });
    }

    const oldStatus = order.status;
    order.status = 'RETURN_REQUESTED';
    order.completionRequestedBySellerAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    recordBookingHistory({
      orderId: order.id,
      changedBy: user.id,
      oldStatus,
      newStatus: 'RETURN_REQUESTED',
      notes: 'Seller requested rental return and completion confirmation from buyer.',
    });

    db.notifications.push({
      id: `notif-return-${Date.now()}`,
      userId: order.buyerId,
      title: 'Rental Return Requested 🤝',
      message: `Seller for "${order.productTitle}" requested return confirmation. Please inspect item handover and confirm completion.`,
      type: 'ORDER',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await savePersistedOrders(db.orders);

    res.json({ success: true, message: 'Return requested. Awaiting buyer confirmation.', order });
  };

  app.post('/api/orders/:id/request-completion', handleRequestCompletion);
  app.put('/api/orders/:id/request-completion', handleRequestCompletion);

  const handleConfirmCompletion = async (req: express.Request, res: express.Response) => {
    db.orders = await loadPersistedOrders(db.orders);
    db.products = await loadPersistedProducts(db.products);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.buyerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the buyer can confirm return and completion.' });
    }

    const oldStatus = order.status;
    order.status = 'COMPLETED';
    order.completionConfirmedByBuyerAt = new Date().toISOString();
    order.completedAt = new Date().toISOString();
    order.sellerSettlementStatus = 'SETTLED';
    order.updatedAt = new Date().toISOString();

    // Make product available again
    const product = db.products.find((p) => p.id === order.productId);
    if (product) {
      product.availabilityStatus = 'AVAILABLE';
      product.updatedAt = new Date().toISOString();
      await savePersistedProducts(db.products);
    }

    recordBookingHistory({
      orderId: order.id,
      changedBy: user.id,
      oldStatus,
      newStatus: 'COMPLETED',
      notes: 'Buyer confirmed return handover. Rental successfully COMPLETED.',
    });

    db.notifications.push({
      id: `notif-complete-${Date.now()}`,
      userId: order.sellerId,
      title: 'Rental Completed! 🌟',
      message: `Buyer confirmed return handover for "${order.productTitle}". Rental is now marked COMPLETED.`,
      type: 'ORDER',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    await savePersistedOrders(db.orders);

    res.json({ success: true, message: 'Rental confirmed and COMPLETED!', order });
  };

  app.post('/api/orders/:id/confirm-completion', handleConfirmCompletion);
  app.put('/api/orders/:id/confirm-completion', handleConfirmCompletion);

  app.put('/api/admin/orders/:id/resolve-dispute', requireAdmin, (req, res) => {
    const admin = getUserFromRequest(req);
    const { status, resolutionNotes } = req.body;

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (status === 'COMPLETED') {
      order.sellerSettlementStatus = 'SETTLED';
      const product = db.products.find((p) => p.id === order.productId);
      if (product) product.availabilityStatus = 'AVAILABLE';
    } else if (status === 'CANCELLED' || status === 'REFUNDED') {
      const product = db.products.find((p) => p.id === order.productId);
      if (product) product.availabilityStatus = 'AVAILABLE';
    }

    recordBookingHistory({
      orderId: order.id,
      changedBy: admin?.id || 'admin',
      oldStatus,
      newStatus: status,
      notes: `Admin dispute resolution: ${resolutionNotes}`,
    });

    res.json({ success: true, message: `Dispute resolved to ${status}`, order });
  });

  app.get('/api/orders/:id/history', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const history = db.bookingHistory.filter((h) => h.orderId === order.id);
    res.json({ success: true, history });
  });

  // --- ORDERS ---
  app.get('/api/orders', async (req, res) => {
    db.orders = await loadPersistedOrders(db.orders);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const roleFilter = req.query.role as string; // 'buyer' or 'seller'
    let userOrders = db.orders.filter((o) => o.buyerId === user.id || o.sellerId === user.id);

    if (roleFilter === 'buyer') {
      userOrders = db.orders.filter((o) => o.buyerId === user.id);
    } else if (roleFilter === 'seller') {
      userOrders = db.orders.filter((o) => o.sellerId === user.id);
    }

    userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, orders: userOrders });
  });

  app.get('/api/orders/:id', async (req, res) => {
    db.orders = await loadPersistedOrders(db.orders);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payment = db.payments.find((p) => p.orderId === order.id);

    res.json({ success: true, order, payment: payment || null });
  });

  app.put('/api/orders/:id/status', async (req, res) => {
    db.orders = await loadPersistedOrders(db.orders);
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { status, handoverNotes } = req.body;

    // Permissions: seller can ACCEPT, READY_FOR_HANDOVER, CANCEL. Buyer/Seller can complete.
    if (order.sellerId !== user.id && order.buyerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    order.status = status;
    if (handoverNotes) order.handoverNotes = handoverNotes;
    if (status === 'COMPLETED') {
      order.completedAt = new Date().toISOString();
      // Release seller escrow credit
      const sellerCreditTxn = db.transactions.find((t) => t.orderId === order.id && t.transactionType === 'SELLER_CREDIT');
      if (sellerCreditTxn) {
        sellerCreditTxn.status = 'COMPLETED';
      }
    }
    await savePersistedOrders(db.orders);
    order.updatedAt = new Date().toISOString();

    // Notify counterpart
    const targetUserId = user.id === order.buyerId ? order.sellerId : order.buyerId;
    db.notifications.push({
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      title: `Order Status Update: ${status} 📦`,
      message: `Order #${order.orderNumber} for "${order.productTitle}" is now: ${status.replace(/_/g, ' ')}.`,
      type: 'ORDER',
      relatedId: order.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, message: `Order updated to ${status}`, order });
  });

  // --- IN-APP STUDENT MESSAGING ---
  app.get('/api/conversations', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userConversations = db.conversations
      .filter((c) => c.buyerId === user.id || c.sellerId === user.id)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    res.json({ success: true, conversations: userConversations });
  });

  app.post('/api/conversations/start', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId, initialMessage } = req.body;
    const product = db.products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let conv = db.conversations.find((c) => c.productId === productId && c.buyerId === user.id);
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.images[0] || '',
        buyerId: user.id,
        buyerName: user.fullName,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        lastMessageText: initialMessage || 'Hi, is this still available?',
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      db.conversations.unshift(conv);

      if (initialMessage) {
        db.messages.push({
          id: `msg-${Date.now()}`,
          conversationId: conv.id,
          senderId: user.id,
          senderName: user.fullName,
          receiverId: product.sellerId,
          messageText: initialMessage,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.json({ success: true, conversation: conv });
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const messages = db.messages
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Mark as read
    messages.forEach((m) => {
      if (m.receiverId === user.id) m.isRead = true;
    });

    res.json({ success: true, conversation: conv, messages });
  });

  app.post('/api/conversations/:id/messages', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const { messageText } = req.body;
    if (!messageText || !messageText.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    const receiverId = user.id === conv.buyerId ? conv.sellerId : conv.buyerId;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conv.id,
      senderId: user.id,
      senderName: user.fullName,
      receiverId,
      messageText: messageText.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(newMsg);
    conv.lastMessageText = newMsg.messageText;
    conv.lastMessageAt = newMsg.createdAt;

    res.json({ success: true, message: newMsg });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userNotifs = db.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications: userNotifs });
  });

  app.put('/api/notifications/mark-all-read', (req, res) => {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    db.notifications.forEach((n) => {
      if (n.userId === user.id) n.isRead = true;
    });

    res.json({ success: true });
  });

  // --- ADMIN DASHBOARD & CAPABILITIES ---
  // Section 2.B & 9: Only authorized admins
  app.get('/api/admin/metrics', requireAdmin, (req, res) => {
    const metrics = db.getAdminMetrics();
    res.json({ success: true, metrics });
  });

  app.get('/api/admin/verifications', requireAdmin, (req, res) => {
    const { status } = req.query;
    let list = db.studentVerifications;
    if (status) {
      list = list.filter((v) => v.status === status);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, verifications: list });
  });

  app.post('/api/admin/verifications/:id/approve', requireAdmin, async (req, res) => {
    const admin = getUserFromRequest(req);
    const verif = db.studentVerifications.find((v) => v.id === req.params.id);
    if (!verif) return res.status(404).json({ success: false, message: 'Verification record not found' });

    verif.status = 'VERIFIED';
    verif.reviewedBy = admin?.id;
    verif.reviewedAt = new Date().toISOString();
    verif.updatedAt = new Date().toISOString();

    const student = db.profiles.find((p) => p.id === verif.studentId);
    if (student) {
      student.isVerified = true;
      student.verificationStatus = 'VERIFIED';
      student.updatedAt = new Date().toISOString();

      // Sync approval directly to live Supabase database
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          await supabase.from('profiles').update({
            is_verified: true,
            verification_status: 'VERIFIED',
            updated_at: new Date().toISOString(),
          }).eq('id', student.id);
        } catch (e: any) {
          console.warn('[Supabase Sync] Error updating verified profile:', e.message);
        }
      }

      // Send congratulations notification
      db.notifications.push({
        id: `notif-${Date.now()}`,
        userId: student.id,
        title: 'Student ID Verified! 🎓✨',
        message: 'Congratulations! Your student verification was approved by administration. You can now log in and access Campus Bazaar.',
        type: 'VERIFICATION',
        relatedId: verif.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      db.savePersistentData();
    }

    res.json({ success: true, message: 'Student successfully verified and approved for login.', verification: verif });
  });

  app.post('/api/admin/verifications/:id/reject', requireAdmin, async (req, res) => {
    const admin = getUserFromRequest(req);
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const verif = db.studentVerifications.find((v) => v.id === req.params.id);
    if (!verif) return res.status(404).json({ success: false, message: 'Verification record not found' });

    verif.status = 'REJECTED';
    verif.rejectionReason = reason.trim();
    verif.reviewedBy = admin?.id;
    verif.reviewedAt = new Date().toISOString();
    verif.updatedAt = new Date().toISOString();

    const student = db.profiles.find((p) => p.id === verif.studentId);
    if (student) {
      student.isVerified = false;
      student.verificationStatus = 'REJECTED';
      student.rejectionReason = reason.trim();
      student.updatedAt = new Date().toISOString();

      // Sync rejection to live Supabase database
      const supabase = getSupabaseServerClient();
      if (supabase) {
        try {
          await supabase.from('profiles').update({
            is_verified: false,
            verification_status: 'REJECTED',
            rejection_reason: reason.trim(),
            updated_at: new Date().toISOString(),
          }).eq('id', student.id);
        } catch (e: any) {
          console.warn('[Supabase Sync] Error updating rejected profile:', e.message);
        }
      }
      student.verificationStatus = 'REJECTED';
      student.rejectionReason = reason.trim();
      student.updatedAt = new Date().toISOString();

      // Notify student with reason
      db.notifications.push({
        id: `notif-${Date.now()}`,
        userId: student.id,
        title: 'Verification Request Update ⚠️',
        message: `Your student ID verification was rejected: "${reason.trim()}". Please submit updated credentials.`,
        type: 'VERIFICATION',
        relatedId: verif.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Verification request rejected.', verification: verif });
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const { query } = req.query;
    let list = db.profiles;
    if (query) {
      const q = String(query).toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.rollNumber.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q)
      );
    }
    res.json({ success: true, users: list });
  });

  app.post('/api/admin/users/:id/toggle-suspend', requireAdmin, (req, res) => {
    const student = db.profiles.find((p) => p.id === req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'User not found' });

    student.isSuspended = !student.isSuspended;
    student.updatedAt = new Date().toISOString();
    db.savePersistentData();

    res.json({
      success: true,
      message: `Student account ${student.isSuspended ? 'suspended' : 'reactivated'}.`,
      isSuspended: student.isSuspended,
    });
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    db.orders = await loadPersistedOrders(db.orders);
    const ordersWithDetails = db.orders.map((o) => {
      const payment = db.payments.find((p) => p.orderId === o.id);
      return {
        ...o,
        payment: payment || null,
      };
    });
    res.json({ success: true, orders: ordersWithDetails });
  });

  app.get('/api/admin/transactions', requireAdmin, (req, res) => {
    res.json({
      success: true,
      transactions: db.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      totalCommissionCollected: db.transactions
        .filter((t) => t.transactionType === 'COMMISSION_FEE')
        .reduce((sum, t) => sum + t.amount, 0),
    });
  });

  app.get('/api/admin/settings', requireAdmin, (req, res) => {
    res.json({ success: true, settings: db.settings });
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const { commissionPercentage, maintenanceMode, supportEmail } = req.body;
    if (commissionPercentage !== undefined) {
      db.settings.commissionPercentage = Number(commissionPercentage);
    }
    if (maintenanceMode !== undefined) {
      db.settings.maintenanceMode = Boolean(maintenanceMode);
    }
    if (supportEmail) {
      db.settings.supportEmail = supportEmail;
    }
    db.settings.updatedAt = new Date().toISOString();
    res.json({ success: true, message: 'Settings saved.', settings: db.settings });
  });

  return app;
}

export const app = createApp();
export default app;
