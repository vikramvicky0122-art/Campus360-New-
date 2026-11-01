# Campus Bazaar - Full-Stack College Marketplace

A college-exclusive marketplace web and mobile application built for verified students to buy, sell, and escrow-transact with emerald/white styling.

## 🚀 Importing into Antigravity

Antigravity supports opening or importing standard Node.js/TypeScript repositories. Follow these steps:

### 1. Extract the ZIP
Extract `campus-bazaar.zip` into your desired project directory:
```bash
unzip campus-bazaar.zip -d campus-bazaar
cd campus-bazaar
```

### 2. Import into Antigravity
- In **Antigravity**, click **Open Workspace** (or **Import Project / Repository**).
- Select the `campus-bazaar` directory.
- Alternatively, if pushing to GitHub first, you can use Antigravity's **Clone from Git Repository** option.

### 3. Install Dependencies
Open the integrated terminal in Antigravity and run:
```bash
npm install
```

### 4. Environment Setup
Copy the example environment variables:
```bash
cp .env.example .env
```
Configure your keys if needed:
- `GEMINI_API_KEY`: For AI assistant or features
- `SUPABASE_URL` / `SUPABASE_ANON_KEY`: If using Supabase directly
- `YOUPI_MERCHANT_KEY`: If using live YouPI payment gateway

### 5. Run Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

---

## 📱 Project Structure
- `/src`: Frontend React + Tailwind CSS client application
  - `/features/auth`: Student sign-up, login, forgot password modal, and session management
  - `/features/marketplace`: Browse listings, category filters, search, sort, and detail view
  - `/features/selling`: Add/edit listing, image uploader, active listings, marked sold
  - `/features/buying`: Campus pickup escrow checkout, YouPI payment gateway modal, order tracking
  - `/features/admin`: Admin dashboard, student verification approvals/rejections, listing moderation, deletion, and transaction ledger
  - `/features/expo`: Expo React Native source code viewer and mobile architecture specs
- `/server.ts` & `/server/`: Express backend API with Supabase schema, YouPI webhook verification, and mock store fallbacks
- `/expo-src/`: Expo Router + React Native mobile application source code (ready to build with EAS)
- `/supabase/`: PostgreSQL schema, tables, and Row-Level Security (RLS) policies
