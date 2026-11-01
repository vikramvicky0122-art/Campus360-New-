-- ====================================================================
-- Campus Bazaar: Seed Data for Initial College Environment
-- ====================================================================

-- 1. Institutions
INSERT INTO public.institutions (id, name, code, domain, address, is_active)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Apex Institute of Technology', 'AIT', 'ait.edu', 'Sector 62, Knowledge Park, Tech City', true),
    ('a0000000-0000-0000-0000-000000000002', 'National College of Engineering', 'NCE', 'nce.ac.in', 'University Road, Campus North', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Categories
INSERT INTO public.categories (id, name, slug, icon, description, display_order)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Electronics', 'electronics', 'Laptop', 'Laptops, tablets, calculators, headphones and chargers', 1),
    ('c0000000-0000-0000-0000-000000000002', 'Books', 'books', 'BookOpen', 'Engineering, medical, law, literature and reference books', 2),
    ('c0000000-0000-0000-0000-000000000003', 'Study Materials', 'study-materials', 'FileText', 'Lecture notes, drafting kits, lab coats, and workshop gear', 3),
    ('c0000000-0000-0000-0000-000000000004', 'Clothing', 'clothing', 'Shirt', 'Hoodies, college merchandise, jackets and formal wear', 4),
    ('c0000000-0000-0000-0000-000000000005', 'Accessories', 'accessories', 'Watch', 'Bags, backpacks, watches, glasses, and student essentials', 5),
    ('c0000000-0000-0000-0000-000000000006', 'Sports Equipment', 'sports-equipment', 'Trophy', 'Badminton rackets, cricket kits, gym gear and cycles', 6),
    ('c0000000-0000-0000-0000-000000000007', 'Hostel Essentials', 'hostel-essentials', 'Home', 'Mattresses, kettles, bedsheets, buckets, extension cords', 7),
    ('c0000000-0000-0000-0000-000000000008', 'Furniture', 'furniture', 'Armchair', 'Study chairs, mini tables, book organizers, shoe racks', 8),
    ('c0000000-0000-0000-0000-000000000009', 'Others', 'others', 'Package', 'Miscellaneous campus items and hobbies', 9)
ON CONFLICT (slug) DO NOTHING;

-- 3. Platform Settings
INSERT INTO public.platform_settings (id, commission_percentage, allowed_domains, maintenance_mode, support_email, currency)
VALUES (
    's0000000-0000-0000-0000-000000000001',
    5.00,
    '["ait.edu", "nce.ac.in", "campus.edu", "edu", "ac.in"]'::jsonb,
    false,
    'admin@campusbazaar.edu',
    'INR'
) ON CONFLICT DO NOTHING;
