# Skyline Student Association — Student Organization System (SOS)

A modern, full-stack, enterprise-grade Student Organization Management Platform designed for university clubs, societies, and student associations. Features role-based dashboards, secure event ticketing with laptop QR check-in, live Razorpay payment processing, Nodemailer email broadcasting, and double-entry financial ledger accounting.

---

## 🌟 Key Features

### 👥 Multi-Tier Role-Based Dashboards
- **Super Admin**: Platform-wide control, club lifecycle management, member authority matrix, and system cache/cron controls.
- **Club Administrator**: Member roster, event creation, announcement broadcast dispatcher, and inventory management.
- **Event Manager**: Event lifecycle, ticket quota rules, attendee roster, and live check-in monitoring.
- **Treasurer**: Reimbursement claims audit, receipt inspection, transaction ledger, and fundraiser tracking.
- **Volunteer**: Assigned task board, door check-in access, and expense claim submissions.
- **Member / Student**: Club discovery, membership plans, tickets, orders, loyalty points, and notification center.

### 🎫 Smart QR Check-In Console (Laptop-Optimized)
- **Screenshot Drag & Drop / Clipboard Paste (`Ctrl+V` / `Cmd+V`)**: Decodes attendee QR screenshots directly from file or clipboard without needing a mobile rear camera.
- **1-Click Fuzzy Search Check-In**: Instant search by attendee name, email, or booking reference with direct green check-in action.
- **Handheld Barcode Gun Support**: Automatically captures and submits inputs from USB/Bluetooth handheld barcode scanners on `Enter`.
- **Webcam Switcher & Mirror Toggle**: Seamless support for external USB webcams with mirroring inversion.
- **Real-Time Door Audio Feedback**: Web Audio synthesized audio chimes for instant verification (valid vs. duplicate/denied).

### 💳 Razorpay Payments Integration
- Secure server-side order generation and HMAC-SHA256 signature verification.
- Integrated across:
  - **Club Memberships**: Multi-tier dues with automatic club access grants.
  - **Event Tickets**: Capacity-locked ticket tiers with instant QR ticket generation.
  - **Merchandise & Stock**: Cart checkout with loyalty points redemption and stock deduction.

### 📧 Nodemailer Email Engine
- **Password Reset**: Mobile-responsive, dark-mode email template with 1-hour secure expiration and fallback links.
- **Announcement Broadcasting**: Branded club broadcast emails sent to targeted members with unsubscribe filtering.
- **Resilient Fallback**: Auto-initializes an **Ethereal test inbox** (`https://ethereal.email`) if SMTP credentials are missing, ensuring local testing never crashes.

### ⚡ Real-Time Push & Communications
- **Socket.IO Real-Time Notifications**: Instant updates for announcements, new assignments, and claims.
- **Meta WhatsApp Cloud API**: Template-driven mobile dispatch for critical event alerts.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19 · Vite 6 · Tailwind CSS 4 · TanStack Query v5 · React Hook Form · Lucide Icons · Sonner |
| **Backend** | Node.js (v22+ LTS) · Express 5 · Prisma ORM 6 · PostgreSQL (Neon Serverless) |
| **Caching & Queues**| Upstash Redis · Redis Session Store · BullMQ |
| **Email & Messaging**| Nodemailer (Gmail / SMTP / Ethereal) · Meta WhatsApp Cloud API |
| **Payments** | Razorpay Node.js SDK (Checkout.js Modal) |
| **Storage & Media** | Cloudinary API · Local Multer fallback |
| **Security** | Argon2id password hashing · Express Session · CSRF Synchronised Protection · Helmet · Rate Limiting |
| **Testing** | Vitest · Supertest |

---

## 📁 Repository Structure

```
Skyline_Student_Association/
├── frontend/                     # React 19 + Vite 6 client application
│   ├── src/
│   │   ├── api/                  # Axios HTTP client & API modules
│   │   ├── components/           # UI primitives, dialogs & QR console
│   │   ├── context/              # AuthContext, CartContext, ConfirmContext
│   │   ├── layouts/              # DashboardLayout, PublicLayout, AuthLayout
│   │   ├── pages/                # Admin, Manager, Member, Treasury, Volunteer views
│   │   └── utils/                # Socket.IO client, Web Audio sound synthesizers
│   └── vite.config.js
├── server/                       # Node.js + Express 5 backend API
│   ├── prisma/                   # Schema, migrations & database seeders
│   ├── src/
│   │   ├── config/               # Environment & database configuration
│   │   ├── controllers/          # API request controllers
│   │   ├── middleware/           # Auth, CSRF, rate limiters, error handlers
│   │   ├── routes/               # Express route declarations
│   │   ├── secrets/              # Vault & API credential accessors
│   │   ├── services/             # Business logic (checkin, auth, payments, email)
│   │   └── utils/                # Nodemailer transporter, logger, JWT
│   └── vitest.config.js
├── tests/                        # Integration and unit test suites
└── docker-compose.yml            # Local PostgreSQL and Redis services
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20` or `v22` LTS
- **npm**: `v10` or higher
- **PostgreSQL**: Local instance or free [Neon](https://neon.tech) cloud database
- **Redis** *(Optional)*: Local Redis or free [Upstash](https://upstash.com) Redis

### 1. Installation
Clone the repository and install dependencies for both workspaces:

```bash
git clone https://github.com/himani2005tuli-wq/Skyline_Student_Association.git
cd Skyline_Student_Association

# Install all monorepo dependencies
npm install
cd server && npm install && cd ../frontend && npm install && cd ..
```

### 2. Configure Environment Variables

Create your backend `.env` inside the `server/` directory:

```bash
cp server/.env.example server/.env  # or create server/.env
```

Key environment variables in `server/.env`:

```env
# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require"

# Redis (Set REDIS_ENABLED=false to run in-memory without Redis)
REDIS_URL="redis://localhost:6379"
REDIS_ENABLED=true

# Security Secrets
JWT_SECRET="your-super-secret-jwt-key"
SESSION_SECRET="your-super-secret-session-key"
CSRF_SECRET="students-best-portal-1.0"

# Nodemailer / SMTP Email
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-google-app-password"
EMAIL_FROM_EMAIL="your-email@gmail.com"
EMAIL_FROM_NAME="Skyline Student Association"

# Razorpay Payments
PAYMENT_PROVIDER=razorpay
PAYMENT_KEY_ID="rzp_test_yourKeyId"
PAYMENT_KEY_SECRET="yourKeySecret"
```

> **Note on Frontend**: The frontend defaults to connecting to `http://localhost:3000` via Vite's proxy. For production, set `VITE_BACKEND_URL=https://your-api-domain.com`.

### 3. Run Database Migrations & Seed Baseline Data

```bash
cd server

# Generate Prisma Client & apply schema
npx prisma generate
npx prisma db push

# Seed sample clubs, events, users, and plans
npm run db:seed
cd ..
```

### 4. Start the Development Servers

You can launch both servers simultaneously or in separate terminal tabs:

**Terminal 1 (Backend API on http://localhost:3000):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend Client on http://localhost:5173):**
```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## 🔑 Default Seeded Accounts (For Testing)

All seed accounts use the default password: **`Password@123`**

| Role | Email | Description |
| :--- | :--- | :--- |
| **Super Admin** | `admin@campus.test` | Full platform administrative control |
| **Club Admin** | `clubadmin@campus.test` | Technical Society Club Administrator |
| **Event Manager** | `events.tech@campus.test` | Event creation & ticket gate operations |
| **Treasurer** | `treasurer.tech@campus.test` | Expense claim audits & financial ledgers |
| **Volunteer** | `volunteer.tech@campus.test` | Assigned door duties & task execution |
| **Member** | `member.tech@campus.test` | Active student club member |

---

## 🧪 Running Tests

Run the test suite from the `server/` directory:

```bash
cd server
npm test
```

Unit tests for the secrets vault:
```bash
npx vitest run src/secrets/secrets.test.js
```

---

## 🚢 Production Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_BACKEND_URL=https://your-backend-api.onrender.com`

### Backend (Render / Railway / AWS / Docker)
- **Root Directory**: `server`
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `node src/server.js` (or `npm start`)
- **Environment Variables**: Add your live database URL, secrets, and SMTP credentials in your hosting dashboard.

---

## 📄 License

Private — Developed for the **Skyline Student Association**.
