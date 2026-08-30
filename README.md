# 🎮 Apex Top-Up — Free Fire Automation & B2B SaaS Platform

A high-speed, enterprise-grade B2B diamond top-up gateway and management SaaS for Garena Free Fire. Features automated UniPin voucher redemption, live player nickname validation, multi-worker execution queue, and an admin dashboard.

---

## 🔐 Default Access Credentials

Use these credentials on the unified login portal at [`/login`](http://localhost:3000/login):

### 👑 1. Master Admin Account
* **Login URL:** `http://localhost:3000/login`
* **Email:** `admin@apex-topup.com`
* **Password:** `admin123`
* **Access Route:** `/admin` (Master Controller, User Management, API Key Generator, Provider Gateway, System Settings)

---

### 👤 2. Client / Reseller Account
* **Login URL:** `http://localhost:3000/login`
* **Email:** `client@apex-topup.com`
* **Password:** `password123`
* **Access Route:** `/userDashboard` (Real Quota Balance Tracker, Live UID Resolver Tester, Instant Top-Up Playground)

---

## ⚡ Core Features

1. **Sub-Second Top-Up Automation Engine**:
   * **UniPin Voucher Automation** (`BDMB` & `UPBD` regex mapping to 25, 50, 115, 240, 610, 1240, 2530 Diamonds, Weekly & Monthly Memberships).
   * **UniPin Direct Wallet Balance** (100+ Diamonds batch redemption).
   * **Garena Shells / BDGamesBazar** pipeline.

2. **Live Garena Player UID Validator**:
   * Resolves player nicknames (e.g. UID `4005814084` -> `md_PARVEZ_9`) in ~1.2 seconds with in-memory caching.

3. **Strict 2-Tier Role Hierarchy & Authentication**:
   * **ADMIN:** Full system access, quota allocation, user status toggles (Active/Suspended), API key generation with custom expiration.
   * **USER:** Real-time quota monitoring, webhook configuration, interactive playground.

4. **100% Mobile & Desktop Responsive**:
   * Optimized with slide-over drawers, mobile dropdowns, and responsive tables.

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js 18+ or 20+
* MongoDB Atlas or Local MongoDB instance

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/coderhabiba/free-fire-top-up-boot-with-dashboard.git
cd free-fire-top-up-boot-with-dashboard

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://127.0.0.1:6379 # Optional (direct in-memory fallback enabled)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Header |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/validate-uid` | Resolve Free Fire Player In-Game Nickname | `X-API-Key` |
| `POST` | `/api/topup` | Execute Instant Automated Diamond Top-Up | `X-API-Key` |
| `POST` | `/api/process-order` | Downstream Buyer & Reseller Top-Up API | `X-API-KEY` |
| `GET` | `/api/user/my-key` | Fetch logged-in user's assigned API key & quota | Session Cookie |

---

## 🛡️ License
Proprietary B2B Software. All rights reserved © 2026 Apex Top-Up.
