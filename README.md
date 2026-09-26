# 🎱 Green Baize — Snooker Club Management System

A production-ready full-stack Snooker & Billiards Club Management System built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **NextAuth.js**, **Vercel Postgres**, and **Vercel KV**.

Engineered specifically for daily snooker club operations: real-time table floor management, live match timers, player ledgers, café touchscreen POS, loans & recoveries, operational expenses, void authorizations, and comprehensive financial reports.

---

## 🚀 Live Demo Credentials

| Role | Username / Staff ID | PIN / Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `1234` | Full access (KPIs, Cash Collect, Staff Setup, Void Approvals, Financial Reports, Settings) |
| **Employee** | `emp786` | `7860` | Operational access (Live Board, Start/End Game, Player Bills, Café POS, Loans, Expenses, My Summary) |

*The login page also provides 1-click Demo buttons for instant testing.*

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom Dark Luxury Bililard theme (`#07110c` felt background, `#f59e0b` amber gold accents, `#10b981` emerald green, `#ef4444` ruby red alerts)
- **Primary Database**: Vercel Postgres / PostgreSQL (System of record for tables, games, player tabs, loans, inventory, employees, and audit trail). *Includes offline/local zero-config database fallback for instant local dev without requiring a live remote DB connection.*
- **Ephemeral State**: Vercel KV (Redis) for low-latency live table statuses and timers without hammering PostgreSQL.
- **Authentication**: NextAuth.js with Credentials provider and role-based JWT sessions (`admin` & `employee`).
- **Data Export**: SheetJS (`xlsx`) for 1-click Excel export across all logs, ledgers, and financial reports.
- **Auditing**: Full tamper-evident audit trail tracking every key action with timestamp and actor name.

---

## 📂 Core Modules & Features

### 1. 📊 Executive Dashboard (Admin)
- Day-by-day date picker with Prev, Next, Today, and Clear filters.
- 14 real-time KPI cards: Games Count, Active Now, Free/Cancelled, Cash in Hand, Online Transfers, Game Sale, Game Pending, Café Sale, Café Pending, Loan Balance, Loan Recovered, Expenses, Discounts, and Gross Sales.
- **Revenue by Table** interactive visual breakdown.
- **Games by Hour** peak traffic visualizer.
- **Top Players** leaderboard & **Shift by Employee** revenue breakdown.
- **Pending Player Bills** panel with quick checkout shortcuts.
- **Café Summary** widget & full **Game Entries Table** with Excel export and row-level Void requests.

### 2. 🎱 Real-Time Live Board
- Responsive grid of 6 professional tournament tables (Shender Steel Block, Riley Aristocrat, Xingpai Star, Wiraka M1, Joy Q8, Sovereign Masters VIP).
- Live animated match timers calculating duration down to the second.
- Real-time bill counter preview based on match rates.
- Instant **Start Game** and **End / Finalize** modals.
- Real-time sync accelerated by Vercel KV.

### 3. 🎮 Start / End Game Station
- **Start Game Terminal**:
  - Match modes: Single (2 players), Double (4 players), Century (per-minute solo practice), Final (Best-of-N series).
  - Ball count rate selector (15-ball, 10-ball, 6-ball, Century break).
  - Auto-computed rates, custom rate overrides, player names, and start time adjusters.
- **End Active Game Terminal**:
  - Live elapsed duration calculator.
  - Loser selection for automatic bill payer assignment.
  - Payment options: Cash, Online (JazzCash/Easypaisa/Bank), Split Cash+Online, Add to Player Tab, or Free.
  - Discount adjustments and celebration confetti animations on match completion.

### 4. 📅 Today's Games Log
- Filterable registry by date range, table, match type, employee, payment status, and player name.
- Summary metrics strip (Games Count, Total, Cash, Online, Pending, Active).
- Row-level Void Request and Edit buttons.
- 1-click Excel `.xlsx` download.

### 5. 🧾 Player Bills & Ledgers
- Searchable player tabs showing total games played, table charges, café tab, discounts, paid amount, and remaining balance.
- Inline phone number editing (`+ Add phone`).
- **Complete Checkout Flow**:
  - Settle partial or full balance with Cash or Online.
  - **Convert to Loan**: Automatically convert any unpaid balance into a traceable customer loan record and mark the tab cleared!

### 6. 🤝 Loans & Credit Ledger
- Outstanding balance summary cards and **Outstanding Per Person** quick-glance panel.
- Add loan record with customer name, phone, date, and reason.
- Repay loan modal for partial or full recovery with audit logging.
- Admin-only deletion with security logs.

### 7. 💸 Expenses & Extra Revenue
- Operational expense ledger (Electricity & Generator fuel, Rent, Cloth & Chalk maintenance, Staff food, Salaries).
- Extra revenue ledger (Cue locker rent, Tournament entries, Club memberships).

### 8. ☕ Café POS & Inventory
- **Touchscreen-ready POS**: Searchable category menu (Beverages, Hot Drinks/Karak Chai, Snacks, Cigarettes, Fast Food).
- Link order directly to active player bill or select "Walk-in customer".
- Real-time stock decrementing on order placement.
- **Inventory Management (Admin)**: Add items, auto-computed profit margins (cost vs sale price), low-stock warning indicators, and Restock modal.
- **Owner Cash Collect (Admin only)**: Reconcile and collect the café cash drawer with confirmation. *Disabled/marked "By Owner" for staff accounts.*

### 9. 🛡️ Two-Step Void Requests Queue
- Employees submit game cancellations with a mandatory reason note.
- Admins review the approval queue and can **Approve** (which automatically cancels the game, reverses linked ledger charges, and logs the event) or **Reject** with feedback.

### 10. 👥 Staff & Tables Setup
- **Employees**: Add/edit staff accounts, assign Admin/Employee roles, reset 4-digit PINs, activate/deactivate accounts.
- **Tables & Rates**: Set table names, brands, active status, and custom rate tables for 15-ball, 10-ball, 6-ball, and Century breaks.

### 11. 📈 Financial Reports & Audit Log
- Profit & Loss statement across any custom date range.
- Tamper-evident Audit Trail tracking timestamps, actors, and operations.

### 12. 🔒 Terminal Quick Lock
- **Quick Session Lock**: Instant PIN-pad overlay to lock station counter during matches without logging out.

---

## ⚡ Getting Started Locally

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd "Snooker 2.0"
npm install
```

### 2. Environment Setup
The project includes a `.env.example` file. For local testing, default `.env.local` works out of the box with zero external configuration needed:

```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

### Step 1: Push to GitHub / Git Provider
```bash
git add .
git commit -m "Initial commit of Snooker Club Management System"
git push origin main
```

### Step 2: Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
2. Select your repository and click **Deploy**.

### Step 3: Connect Vercel Storage Integrations
1. In your Vercel project dashboard, navigate to the **Storage** tab.
2. Click **Create Database** -> **Postgres** (or Neon). Connect it to your project.
   - Vercel automatically populates `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc.
3. Click **Create Database** -> **KV** (or Upstash Redis). Connect it to your project.
   - Vercel automatically populates `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. In the **Environment Variables** tab, ensure you add:
   ```env
   NEXTAUTH_SECRET="your-generated-secret-key-here"
   NEXTAUTH_URL="https://your-app-domain.vercel.app"
   ```

### Step 4: Run Database Schema
Execute `schema.sql` inside the Vercel Postgres query console (or using `psql $POSTGRES_URL < schema.sql`).

---

## 📄 License
Commercial operations software license for Green Baize Snooker Lounge. Built for high reliability, fast counter operations, and financial auditing.
