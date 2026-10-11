# Student Organization System (SOS)

## Complete Architecture & Operational Flowcharts

This document provides a deep, comprehensive breakdown of how the Student Organization System works end-to-end, detailing every architectural layer, database model, security control, and business workflow accompanied by Mermaid flowcharts.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer (React 19 + Vite)"]
        UI["Modern UI (Tailwind CSS + Glassmorphism)"]
        State["State Layer (TanStack Query + AuthContext + CartContext)"]
        ClientAPI["Axios API Client (withCredentials + CSRF Interceptor)"]
    end

    subgraph Security["Security & Session Gateway"]
        CORS["CORS Protection"]
        Helmet["Helmet Security Headers"]
        RateLimit["Rate Limiting"]
        Session["Redis Session Store (HttpOnly Cookies)"]
        CSRF["CSRF Synchronised Protection (x-csrf-token)"]
        RBAC["Role-Based Access Control (requireAuth + requireRoles)"]
    end

    subgraph Backend["Express REST API (v1)"]
        AuthCtrl["Auth Controller & Service"]
        EventCtrl["Event & Ticketing Service"]
        CheckinCtrl["Check-in Scanner Service"]
        MerchCtrl["Merchandise & Order Service"]
        PaymentCtrl["Payment & Webhook Service"]
        LoyaltyCtrl["Loyalty & Points Engine"]
        TreasuryCtrl["Ledger & Financial Service"]
        CommCtrl["Communication & Notification Service"]
    end

    subgraph Persistence["Data & Infrastructure"]
        Prisma["Prisma ORM (Client 6.x)"]
        DB[("Neon Serverless PostgreSQL")]
        RedisCache[("Redis Memory Store")]
    end

    UI --> State --> ClientAPI
    ClientAPI -- "HTTPS + Cookies + CSRF" --> CORS --> Helmet --> RateLimit --> Session --> CSRF --> RBAC
    RBAC --> AuthCtrl & EventCtrl & CheckinCtrl & MerchCtrl & PaymentCtrl & LoyaltyCtrl & TreasuryCtrl & CommCtrl
    AuthCtrl & EventCtrl & CheckinCtrl & MerchCtrl & PaymentCtrl & LoyaltyCtrl & TreasuryCtrl & CommCtrl --> Prisma
    Prisma --> DB
    Session --> RedisCache
```

---

## 2. Authentication & User Onboarding Flow

### 5-Point Strict Password Validation & Registration

Every new student account must fulfill 5 cryptographic password requirements before account creation:

1. **Length**: 8 to 16 characters inclusive.
2. **Lowercase letter**: `[a-z]`
3. **Uppercase letter**: `[A-Z]`
4. **Numeric character**: `[0-9]`
5. **Special character**: Exactly from `$ @ # % ^ & * ? - + =`

```mermaid
sequenceDiagram
    autonumber
    actor User as Student User
    participant FE as React Frontend (AuthPages.jsx)
    participant API as Express API (/api/v1/auth)
    participant Argon as Argon2id Hasher
    participant DB as Neon PostgreSQL
    participant Session as Redis Session Store

    User->>FE: Enters email, name, password
    FE->>FE: Live Checklist Validation (8-16 chars, a-z, A-Z, 0-9, special set)
    Note over FE: Displays interactive green/blue indicators
    User->>FE: Submits Register Form
    FE->>API: GET /auth/csrf (Fetch CSRF token)
    API-->>FE: Returns { csrfToken }
    FE->>API: POST /auth/register (Headers: x-csrf-token, Body: details)
    API->>API: Server-side Zod validation (isPasswordCompliant)
    API->>DB: Check if email already registered
    alt Email exists
        API-->>FE: 409 Conflict ("Email already in use")
    else Unique email
        API->>Argon: Hash password with Argon2id
        Argon-->>API: Returns secure hash
        API->>DB: Transaction: Create User + Initialize LoyaltyAccount (balance: 0)
        DB-->>API: Created user record
        API->>Session: Create session (userId, role: 'MEMBER', absoluteExpiry: 12h)
        API-->>FE: 201 Created (Set-Cookie: session_id HttpOnly)
        FE->>FE: Updates AuthContext & redirects to Member Dashboard
    end
```

---

## 3. Event Ticketing & QR Code Check-in Flow

```mermaid
flowchart TD
    subgraph Booking["1. Ticket Booking & Payment"]
        A["User browses Events"] --> B["Selects Event & Ticket Tier (Member / General)"]
        B --> C["Review Quote (Automatic Member Discounts + Points Redemption)"]
        C --> D["POST /api/v1/tickets/book"]
        D --> E["Booking created in status: PENDING_PAYMENT"]
        E --> F["Payment processed / Mock Confirm"]
        F --> G["POST /api/v1/payments/mock-confirm"]
        G --> H["Booking updated to CONFIRMED"]
        H --> I["Prisma generates unique UUID Ticket records (status: VALID)"]
        H --> J["Financial Ledger logs TICKET_INCOME"]
    end

    subgraph Delivery["2. Ticket Delivery"]
        I --> K["Member views My Tickets (/member/tickets)"]
        K --> L["QR Code rendered via QRCodeSVG (value: ticket.code)"]
    end

    subgraph DoorCheckin["3. Door Scanning & Verification"]
        M["Door Volunteer opens Check-in Scanner (/manager/checkin)"]
        M --> N["Camera scans attendee QR code"]
        N --> O["POST /api/v1/check-ins/scan { code }"]
        O --> P{"Ticket Exists & Valid?"}
        P -- "No / Not Found" --> Q["Return Error: Invalid ticket"]
        P -- "Already USED" --> R["Return Warning: Already checked in at HH:MM"]
        P -- "Valid" --> S["Update Ticket status: USED"]
        S --> T["Create CheckIn audit log"]
        S --> U["Award Attendee +5 Loyalty Points bonus"]
        U --> V["Scanner shows Green Verified: Attendee Name + Event + Tier"]
    end
```

---

## 4. Merchandise Store, Inventory & Ledger Flow

Merchandise orders enforce atomic transaction safety so stock quantities never oversell:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Club Member
    participant Cart as Cart Context
    participant OrderSvc as Order Service
    participant PricingSvc as Pricing Service
    participant PaySvc as Payment Service
    participant Ledger as Ledger Service
    participant DB as Neon PostgreSQL

    Customer->>Cart: Adds Hoodie (Size M, Qty 2) to cart
    Cart->>PricingSvc: Calculates Quote (Merch discount -15% + Loyalty points)
    Customer->>OrderSvc: POST /api/v1/orders/checkout
    OrderSvc->>DB: prisma.$transaction starts
    OrderSvc->>DB: SELECT ProductVariant FOR UPDATE (checks live stock)
    alt Insufficient Stock
        OrderSvc-->>Customer: 409 Conflict ("Insufficient stock for variant")
    else Stock Available
        OrderSvc->>DB: Deduct stock quantity (stockQuantity -= 2)
        OrderSvc->>DB: Create Order (status: PENDING_PAYMENT)
        OrderSvc->>DB: Create OrderItems
        OrderSvc-->>Customer: Returns { orderId, totalInPaise }
    end
    Customer->>PaySvc: POST /api/v1/payments/mock-confirm { orderId }
    PaySvc->>OrderSvc: confirmOrder(orderId)
    OrderSvc->>DB: Update Order status: CONFIRMED
    PaySvc->>Ledger: logTransaction({ category: 'MERCHANDISE_SALES', amountInPaise })
    Ledger->>DB: INSERT into FinancialTransaction
    PaySvc-->>Customer: 200 OK (Payment Confirmed, Receipt rendered)
```

---

## 5. Treasury & Financial Transparency Flow

Every rupee received or disbursed is immutably logged into the financial ledger with automated categorizations:

```mermaid
flowchart LR
    subgraph Inflows["Revenue Inflows (+)"]
        Tkt["TICKET_INCOME<br/>(Event Pass Sales)"]
        Merch["MERCHANDISE_SALES<br/>(Store Orders)"]
        Dues["MEMBERSHIP_DUES<br/>(Annual & Semester Plans)"]
        Fund["FUNDRAISER_INCOME<br/>(Donations & Bake Sales)"]
    end

    subgraph Ledger["Double-Entry Financial Ledger"]
        TxTable[("FinancialTransaction Table<br/>- category<br/>- amountInPaise<br/>- referenceType<br/>- referenceId")]
    end

    subgraph Outflows["Disbursements (-)"]
        Exp["EXPENSE<br/>(Club Operating Costs)"]
        Reim["REIMBURSEMENT<br/>(Volunteer Claims)"]
        Ref["REFUND<br/>(Cancellations)"]
    end

    subgraph Dashboard["Treasurer Oversight (/treasury)"]
        Sum["Summary Metrics<br/>• Opening Balance<br/>• Total Receipts<br/>• Total Payments<br/>• Closing Balance = Opening + In - Out"]
        Queue["Reimbursement Queue<br/>Approve / Reject Claims"]
        Audit["Interactive Filterable Audit Table"]
    end

    Tkt & Merch & Dues & Fund --> TxTable
    Exp & Reim & Ref --> TxTable
    TxTable --> Sum & Audit
    Queue -- "On Approve + Pay" --> Reim
```

---

## 6. Volunteer Kanban & Reimbursement Workflow

```mermaid
stateDiagram-v2
    [*] --> Assigned: Task created in Fundraiser
    Assigned --> InProgress: Volunteer starts work
    InProgress --> Completed: Volunteer marks complete

    state "Expense Reimbursement" as ExpenseFlow {
        [*] --> Submitted: Volunteer uploads receipt + amount
        Submitted --> UnderReview: Visible in Treasurer Queue
        UnderReview --> Approved: Treasurer approves claim
        UnderReview --> Rejected: Treasurer rejects with feedback
        Approved --> Paid: Payout batch processed
        Paid --> [*]: FinancialTransaction logged (category: REIMBURSEMENT)
    }

    Completed --> ExpenseFlow: Optional expense incurred
```

---

## 7. Role-Based Access Control (RBAC) Matrix

| Route Group     | Path                                         | Minimum Required Role          | Purpose                                           |
| :-------------- | :------------------------------------------- | :----------------------------- | :------------------------------------------------ |
| **Public**      | `/api/v1/events`                             | Any / Guest                    | Browse calendar and ticket pricing                |
| **Public**      | `/api/v1/products`                           | Any / Guest                    | Browse merchandise catalog and variants           |
| **Public**      | `/api/v1/communication/announcements`        | Any / Guest                    | View published club announcements                 |
| **Auth**        | `/api/v1/auth/register`, `/login`            | Public                         | Account registration & session authentication     |
| **Member**      | `/api/v1/tickets/me`                         | `MEMBER`                       | View user's tickets and QR codes                  |
| **Member**      | `/api/v1/orders/me`                          | `MEMBER`                       | View order history and delivery statuses          |
| **Member**      | `/api/v1/memberships/me`                     | `MEMBER`                       | View active plan status, renewal, tier perks      |
| **Member**      | `/api/v1/loyalty/me`                         | `MEMBER`                       | View points balance, earned, and transaction logs |
| **Volunteer**   | `/api/v1/fundraisers`                        | `VOLUNTEER`                    | View tasks, change status (todo -> doing -> done) |
| **Volunteer**   | `/api/v1/expenses`                           | `VOLUNTEER`                    | Submit receipt claims for tasks                   |
| **Check-in**    | `/api/v1/check-ins/scan`                     | `EVENT_MANAGER` / `CLUB_ADMIN` | Scan attendee QR codes at event entry             |
| **Treasury**    | `/api/v1/ledger`                             | `TREASURER` / `CLUB_ADMIN`     | View financial records and club balance           |
| **Treasury**    | `/api/v1/expenses/:id/review`                | `TREASURER` / `CLUB_ADMIN`     | Approve or reject volunteer reimbursements        |
| **Admin**       | `/api/v1/events` (POST)                      | `CLUB_ADMIN` / `EVENT_MANAGER` | Create new events and ticket tiers                |
| **Admin**       | `/api/v1/communication/announcements` (POST) | `CLUB_ADMIN`                   | Publish broadcast announcements to members        |
| **Super Admin** | `/api/v1/health/detailed`                    | `SUPER_ADMIN`                  | Real-time system health, database & redis status  |

---

## 8. Development & Production Operations

### Commands Summary

```bash
# Start backend server
npm run dev

# Start frontend application (Vite)
npm run frontend:dev

# Build frontend production bundle
npm run frontend:build

# Run complete Vitest suite (9 test suites, 26 integration tests)
npm test

# Check code formatting (Prettier)
npm run format:check

# Format code automatically (Prettier)
npm run format

# Run linter (ESLint)
npm run lint

# Seed database with demo accounts, events, and merchandise
npm run db:seed
```
