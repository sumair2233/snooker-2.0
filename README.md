# CueZone 2.0 — Snooker & Game Club Management System

A high-performance, real-time snooker club and gaming lounge management application featuring multi-table live timers, employee operation portals, café POS and stock tracking, player credit (khata) management, and detailed revenue reporting.

## Features

- **Live Board & Table Management**: Real-time table status cards, running timers, per-minute and per-hour tiered rates (Century, 15-ball, 10-ball, 6-ball, 1-ball), game style previews (Snooker, PS5 Controller, Table Tennis, Carrom, Chess, Ludo).
- **Admin Management Portal** (15 Navigation Views): Real-time KPI dashboard, Today's Games, Player Bills, Khata Loans, Expenses, Daily Shift Revenue / Cash Collect, Café Inventory & Reports, Employee Management, Table/Game Configuration, Void Request Approvals, and Audit Logs.
- **Employee Counter Portal**: Table checkout, split payment handling (Cash, Online / EasyPaisa / JazzCash, Loan / Khata, Plus Balance Offset, Discounts), itemized bill generation, shift handover summary, and counter screen lock.
- **Café POS & Inventory**: Automatic stock deduction on checkout, cancellation stock restoration, restock tracking, and direct counter sales.
- **Universal Storage Architecture**:
  - **Local Mode**: Uses embedded SQLite (`cuezone.db`) for offline resilience at the counter.
  - **Cloud Mode**: Connects to Turso Cloud SQLite (`@libsql/client`) for serverless deployment on Vercel with zero data loss.
- **Serverless-Ready**: Includes `cookie-session` stateless authentication and `vercel.json` rewrite configuration.

## Demo Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admindemo` | `admindemo` |
| **Employee** | `emp786` | `emp786` |

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Seed initial tables, users, and café inventory
npm run seed

# 3. Start local development server
npm start
```

Access the app at `http://localhost:3000`.

## Vercel + Turso Cloud Deployment

1. Create a free database on [turso.tech](https://turso.tech) named `cuezone`.
2. Seed your Turso cloud database:
   ```bash
   $env:TURSO_DATABASE_URL="libsql://cuezone-[username].turso.io"
   $env:TURSO_AUTH_TOKEN="your-turso-token"
   npm run turso:push
   ```
3. Deploy to Vercel and add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the Vercel Environment Variables dashboard.
