# Aura360 / LifeSync - Current Implementation Summary

Last updated: 2026-03-19
Workspace: lifesync-app

## 1) Project Snapshot

Aura360 (repository folder name: lifesync-app) is a multi-module personal life management web app built with Next.js App Router and TypeScript.

What is currently implemented:
- Auth system with NextAuth v5 (Credentials + Google OAuth)
- Protected dashboard with module pages
- CRUD APIs for all main modules (notes, fashion, fitness, food, time, skincare, saved)
- Advanced finance workflows (transaction CRUD, bulk import paths, share parsing, balances)
- Multi-tenant data model using workspaceId + userId scoping
- Audit logging utility used by many mutation routes
- Cloudinary uploads for profile and module images

What is currently partial/incomplete:
- Password reset UX is intentionally disabled/deprecated in UI
- Role-based authorization is scaffolded but not enforced
- Product scraping route uses mock response path (real scraping disabled)
- Settings page is mostly informational UI and not backed by dedicated settings APIs

## 2) Core Architecture

### Frontend and runtime
- Framework: Next.js 16.1.1, App Router
- UI: React 19 + Tailwind CSS 4 + Radix/shadcn patterns
- Global providers in root layout:
  - NextAuth session provider
  - Theme provider (system/light/dark)
  - Sonner toaster
  - Vercel analytics

### Backend and data
- Database: PostgreSQL (Neon serverless)
- ORM: Drizzle ORM with large centralized schema in lib/db/schema.ts
- API: Route Handlers in app/api/**/route.ts
- Validation style: Zod used in several routes (not consistently everywhere)

### Multi-tenant pattern
All domain tables include workspaceId and userId. Most reads/writes scope by both values.

### Auth and request protection
- Middleware redirects unauthenticated users away from protected routes
- Public routes include landing/auth pages and /api/auth*
- Protected requests use session context from server-side auth helper

## 3) Tech Stack (actual from package.json)

- next: 16.1.1
- react/react-dom: 19
- typescript: 5
- next-auth: 5.0.0-beta.25
- drizzle-orm: 0.45.1
- @neondatabase/serverless: 1.0.2
- zod: 3.25.67
- cloudinary: 2.5.1
- bcryptjs: 2.4.3
- cheerio: 1.1.2
- puppeteer: 24.26.1
- openai: 6.6.0 (installed, currently not actively wired for product features)

## 4) Runtime Entry Points

### Root app
- app/layout.tsx: global metadata, fonts, auth/theme providers, analytics, toaster
- app/page.tsx: marketing landing page with session-aware redirect to /dashboard when authenticated
- app/share/page.tsx: Web Share Target style intake page that parses shared text and opens finance share modal

### Dashboard shell
- app/dashboard/layout.tsx: shared dashboard container + navbar
- app/dashboard/page.tsx: server-side aggregate counts and recent transactions

## 5) UI Route Map (current pages)

Public routes:
- /
- /auth/login
- /auth/sign-up
- /auth/sign-up-success
- /auth/forgot-password (deprecated/disabled UI)
- /auth/reset-password (deprecated/disabled UI)
- /auth/error
- /share

Protected routes:
- /dashboard
- /dashboard/finance
- /dashboard/finance/import
- /dashboard/fashion
- /dashboard/fitness
- /dashboard/food
- /dashboard/notes
- /dashboard/time
- /dashboard/skincare
- /dashboard/saved
- /dashboard/profile
- /dashboard/settings

## 6) API Route Surface (implemented methods)

Auth and profile:
- /api/auth/[...nextauth]: GET, POST
- /api/auth/register: POST
- /api/auth/verify-email: GET
- /api/profile: GET, PATCH, POST
- /api/profile/avatar: POST, DELETE
- /api/profile/cover: POST, DELETE

Core modules:
- /api/notes: GET, POST, PATCH, DELETE
- /api/fashion: GET, POST, PATCH, DELETE
- /api/fitness: GET, POST, PATCH, DELETE
- /api/food: GET, POST, PATCH, DELETE
- /api/time: GET, POST, PATCH, DELETE
- /api/skincare: GET, POST, PATCH, DELETE
- /api/saved: GET, POST, PATCH, DELETE

Finance:
- /api/finance/transactions: GET, POST
- /api/finance/transactions/[id]: PATCH, DELETE
- /api/finance/transactions/bulk: POST
- /api/finance/balances: GET, PUT
- /api/finance/excel-import: GET, POST
- /api/finance/bulk-import: POST
- /api/finance/share-transaction: GET, POST

Other:
- /api/fashion/upload: POST
- /api/fashion/upload-image: POST
- /api/scrape-product: GET (currently mock-response flow)

## 7) Module-by-Module Implementation Status

### Notes
Status: Implemented
- Server page fetches scoped notes sorted by pinned/updated
- API supports full CRUD with Zod validation
- Audit hooks present for create/update/delete
- UI manager components for note lifecycle

### Finance
Status: Implemented, but with mixed architectural patterns
- Rich client page with overview/history/reports tabs
- Transaction CRUD endpoints implemented
- Additional import paths: excel-import and bulk import route(s)
- Share parser endpoint extracts amount/date/category from shared text
- Balances endpoint stores/retrieves wallet balances
- Wallet service exists for immutable-ledger style operations

Important nuance:
- The wallet ledger service exists, but transaction route logic directly inserts transactions and does not consistently route all finance writes through ledger service methods.
- This means ledger intent is present, but full enforcement appears partial.

### Fashion
Status: Implemented with good breadth
- Server page fetch + client manager
- CRUD API with metadata support
- Image upload/delete flows using Cloudinary utilities
- Drag/drop and wardrobe/wishlist workflows in component layer
- AI outfit generation hooks are TODO placeholders

### Fitness
Status: Implemented
- Server fetch + stats + log UI
- Full CRUD API
- Supports workout and measurement style entries

### Food
Status: Implemented
- Meal and nutrition tracking UI
- Full CRUD API
- Schema supports macro fields and meal type enum

### Time
Status: Implemented
- Time log list + add/edit workflows
- Full CRUD API
- Tracks activity/category/duration/productivity

### Skincare
Status: Implemented
- Product + routine views
- Full CRUD API
- Supports image URL and routine categorization

### Saved Items
Status: Implemented
- Saved items list/add workflows
- Full CRUD API
- Supports typed saved content (article/video/product/etc.)

### Profile
Status: Implemented
- Server-rendered profile page and update flows
- API for profile GET/PATCH and avatar upload
- Separate avatar/cover routes also exist

### Settings
Status: Partial
- Page includes appearance/notification/privacy informational cards and theme toggle
- No dedicated settings persistence API in current implementation
- Some copy references legacy infrastructure terminology

### Auth pages
Status: Mostly implemented with one major gap
- Login/sign-up/verification flows implemented
- Forgot/reset password pages intentionally disabled and marked deprecated

## 8) Authentication and Security Behavior

### Implemented
- NextAuth with Credentials + Google provider
- Credentials flow uses bcrypt and checks emailVerified before login
- OAuth sign-in can auto-create users/workspaces
- Middleware enforces auth for non-public routes
- Session includes user id + workspace id and is used by server helpers

### Gaps / risks
- requireWorkspaceAdmin helper is TODO and does not check workspace_members role yet
- No explicit rate limiting layer on API routes
- next.config.mjs has typescript.ignoreBuildErrors = true
- next.config.mjs has images.unoptimized = true
- Some routes rely on broad try/catch + console logging only

## 9) Database Model and Data Design

Primary schema characteristics:
- Large unified schema in lib/db/schema.ts
- Multi-tenant scoping columns across domain tables
- Postgres enums used for several domain types
- JSONB metadata columns used across modules for flexibility
- Arrays used for tags/attachments style fields

Major table groups:
- Auth and identity: users, accounts, sessions, verification_tokens
- Tenancy: workspaces, workspace_members
- Finance: transactions, wallet_ledger, wallet_balances, subscriptions, bookings
- Modules: notes, fashion_items, fitness, food, time_logs, saved_items, skincare
- Governance/telemetry: notifications, analytics, audit_logs

Design patterns:
- Audit logging utility exists and is integrated in multiple mutation routes
- Ledger and balance snapshot service exists for finance
- Most route queries apply workspace and user filters

## 10) Integrations and External Dependencies in Use

Actively used:
- Neon PostgreSQL via @neondatabase/serverless
- Cloudinary for image upload/delete
- Gmail SMTP via nodemailer wrapper in lib/resend.ts for verification/reset mail
- Google OAuth via NextAuth provider

Installed but currently partial/not fully production-wired:
- Puppeteer + Cheerio in scrape-product route (real scraping path commented out)
- OpenAI package present, with commented references and TODOs in fashion features

## 11) Environment Variables Referenced

Required for core operation:
- DATABASE_URL
- AUTH_SECRET

Optional/feature-dependent:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- SMTP_EMAIL
- SMTP_PASSWORD
- NEXT_PUBLIC_APP_URL
- VERCEL_URL
- (commented/planned) OPENAI_API_KEY

## 12) Developer Workflow and Commands

From package.json:
- pnpm dev
- pnpm build
- pnpm start
- pnpm lint
- pnpm db:generate
- pnpm db:push
- pnpm db:studio

Repository includes many SQL/TS scripts for schema setup, migration adjustments, debug/seed flows, and finance data processing.

## 13) Important Code Realities and Inconsistencies

- README version badges are out of date versus actual package.json (example: Next.js)
- Settings page text still mentions Supabase despite Neon/Drizzle architecture
- Password reset pages are intentionally disabled but still present in route tree
- Middleware injects x-user-id/x-workspace-id headers for API requests, but many handlers derive context from session helper instead of these headers
- Finance supports multiple import routes, suggesting active evolution and possible overlap

## 14) Production-Readiness Assessment (Current State)

Strong areas:
- Broad feature coverage across modules
- Working auth and route protection
- Multi-tenant data scoping model
- Rich UI implementation with module-specific components

Needs hardening:
- Enforce role-based authorization (workspace_members roles)
- Remove ignoreBuildErrors for stricter release safety
- Add API rate limiting and abuse controls
- Standardize finance write path around ledger if immutability is a strict requirement
- Replace mock scrape-product flow with production implementation or remove endpoint
- Implement/test password reset or remove related public routes
- Add automated tests (no dedicated test suite detected in current codebase)

## 15) Suggested Priority Backlog

1. Security and authorization
- Implement requireWorkspaceAdmin role checks and enforce on sensitive routes
- Add API throttling/rate limiting for auth/import endpoints

2. Reliability
- Enable strict TS build validation in CI/release path
- Add integration tests for auth + finance CRUD + workspace isolation

3. Product consistency
- Unify finance transaction/ledger behavior and document source of truth
- Resolve deprecated auth reset UX (implement or remove)

4. Cleanup
- Update stale docs and settings copy
- Remove debug-only code paths and dead integrations

## 16) High-Value Files to Review First

- lib/db/schema.ts
- lib/auth.ts
- lib/auth-helpers.ts
- middleware.ts
- app/dashboard/page.tsx
- app/dashboard/finance/page.tsx
- app/api/finance/transactions/route.ts
- app/api/finance/transactions/[id]/route.ts
- app/api/finance/share-transaction/route.ts
- app/api/notes/route.ts
- app/api/fashion/route.ts
- app/api/profile/route.ts
- lib/services/wallet.ts
- lib/audit.ts
- app/api/scrape-product/route.ts

---

This summary is based on currently implemented code paths in the workspace, not only on README claims.
