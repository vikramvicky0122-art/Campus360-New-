import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseServerClient } from './supabase.ts';
import type { Product, Order, Conversation, Message } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUCKET_NAME = 'marketplace-data';

// Helper to ensure bucket exists
let bucketChecked = false;
async function ensureBucket() {
  if (bucketChecked) return;
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn('[Storage] ensureBucket warning:', err);
  }
}

// Local filesystem helpers
function getLocalFilePath(filename: string): string {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (_) {}
  }
  return path.join(dataDir, filename);
}

function sanitizeProduct(p: any): Product {
  return {
    ...p,
    images: Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
    categoryName: p.categoryName || 'General',
    condition: p.condition || 'Good',
    availabilityStatus: p.availabilityStatus || 'AVAILABLE',
    price: Number(p.price) || 0,
  };
}

// ---------------- PRODUCTS ----------------
export async function loadPersistedProducts(fallbackSeed: Product[]): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await ensureBucket();
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download('products.json');
      if (data && !error) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with fallback seed so initial seed items are never lost
          const existingIds = new Set(parsed.map((p: Product) => p.id));
          const merged = [...parsed];
          for (const seed of fallbackSeed) {
            if (!existingIds.has(seed.id)) {
              merged.push(seed);
            }
          }
          return merged.map(sanitizeProduct);
        }
      }
    } catch (err) {
      console.warn('[Storage] loadPersistedProducts cloud error:', err);
    }
  }

  // Fallback to local disk
  try {
    const localPath = getLocalFilePath('persistent_products.json');
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(sanitizeProduct);
      }
    }
  } catch (_) {}

  return fallbackSeed.map(sanitizeProduct);
}

export async function savePersistedProducts(products: Product[]): Promise<void> {
  // 1. Save to local disk
  try {
    const localPath = getLocalFilePath('persistent_products.json');
    fs.writeFileSync(localPath, JSON.stringify(products, null, 2), 'utf-8');
  } catch (_) {}

  // 2. Save to Supabase Storage
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await ensureBucket();
      await supabase.storage.from(BUCKET_NAME).upload(
        'products.json',
        Buffer.from(JSON.stringify(products, null, 2)),
        { contentType: 'application/json', upsert: true }
      );
    } catch (err) {
      console.warn('[Storage] savePersistedProducts cloud upload warning:', err);
    }
  }
}

// ---------------- ORDERS ----------------
export async function loadPersistedOrders(fallbackSeed: Order[]): Promise<Order[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await ensureBucket();
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download('orders.json');
      if (data && !error) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((o: Order) => o.id));
          const merged = [...parsed];
          for (const seed of fallbackSeed) {
            if (!existingIds.has(seed.id)) {
              merged.push(seed);
            }
          }
          return merged;
        }
      }
    } catch (err) {
      console.warn('[Storage] loadPersistedOrders cloud error:', err);
    }
  }

  try {
    const localPath = getLocalFilePath('persistent_orders.json');
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const existingIds = new Set(parsed.map((o: Order) => o.id));
        const merged = [...parsed];
        for (const seed of fallbackSeed) {
          if (!existingIds.has(seed.id)) {
            merged.push(seed);
          }
        }
        return merged;
      }
    }
  } catch (_) {}

  return fallbackSeed;
}

export async function savePersistedOrders(orders: Order[]): Promise<void> {
  try {
    const localPath = getLocalFilePath('persistent_orders.json');
    fs.writeFileSync(localPath, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (_) {}

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await ensureBucket();
      await supabase.storage.from(BUCKET_NAME).upload(
        'orders.json',
        Buffer.from(JSON.stringify(orders, null, 2)),
        { contentType: 'application/json', upsert: true }
      );
    } catch (err) {
      console.warn('[Storage] savePersistedOrders cloud upload warning:', err);
    }
  }
}

