# Aura360 (LifeSync)

Unified personal management app built with Next.js App Router, TypeScript, and Neon Postgres.

Aura360 brings multiple life modules into one workspace-scoped dashboard: Notes, Finance, Fitness, Food, Fashion, Skincare, Saved Items, Time Logs, and Profile.

## Current Status

Last updated: 2026-03-19

Implemented now:
- NextAuth v5 authentication (Credentials + Google OAuth)
- Protected dashboard and module pages
- CRUD APIs for core modules
- Multi-tenant data model using workspace and user scoping
- Cloudinary upload flows for images
- Finance transaction and import workflows

Partially implemented / intentionally limited:
- Password reset pages are present but currently disabled in UI
- Settings page is mostly informational (limited persistence)
- `/api/scrape-product` currently returns mock/test data path
- Role-based workspace authorization is scaffolded, not fully enforced

## Tech Stack

- Next.js 16.1.1 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Radix UI + shadcn/ui patterns
- NextAuth 5 (beta)
- Drizzle ORM
- Neon Serverless Postgres
- Zod
- Cloudinary
- Sonner

## Modules

- Notes: create, edit, pin, organize notes
- Finance: transactions, balances, share parsing, import flows
- Fitness: workout and measurement tracking
- Food: meal and nutrition logging
- Fashion: wardrobe, wishlist, drag/drop workflows, uploads
- Skincare: products and routine tracking
- Saved Items: save and categorize content links/resources
- Time Logs: activity and productivity tracking
- Profile: profile data, avatar/cover image flows

## Routes Overview

Public routes:
- `/`
- `/auth/login`
- `/auth/sign-up`
- `/auth/sign-up-success`
- `/auth/forgot-password` (disabled UI)
- `/auth/reset-password` (disabled UI)
- `/auth/error`
- `/share`

Protected routes:
- `/dashboard`
- `/dashboard/finance`
- `/dashboard/finance/import`
- `/dashboard/fashion`
- `/dashboard/fitness`
- `/dashboard/food`
- `/dashboard/notes`
- `/dashboard/time`
- `/dashboard/skincare`
- `/dashboard/saved`
- `/dashboard/profile`
- `/dashboard/settings`

## API Surface

Auth and profile:
- `/api/auth/[...nextauth]` (GET, POST)
- `/api/auth/register` (POST)
- `/api/auth/verify-email` (GET)
- `/api/profile` (GET, PATCH, POST)
- `/api/profile/avatar` (POST, DELETE)
- `/api/profile/cover` (POST, DELETE)

Core modules:
- `/api/notes` (GET, POST, PATCH, DELETE)
- `/api/fashion` (GET, POST, PATCH, DELETE)
- `/api/fitness` (GET, POST, PATCH, DELETE)
- `/api/food` (GET, POST, PATCH, DELETE)
- `/api/time` (GET, POST, PATCH, DELETE)
- `/api/skincare` (GET, POST, PATCH, DELETE)
- `/api/saved` (GET, POST, PATCH, DELETE)

Finance:
- `/api/finance/transactions` (GET, POST)
- `/api/finance/transactions/[id]` (PATCH, DELETE)
- `/api/finance/transactions/bulk` (POST)
- `/api/finance/balances` (GET, PUT)
- `/api/finance/excel-import` (GET, POST)
- `/api/finance/bulk-import` (POST)
- `/api/finance/share-transaction` (GET, POST)

Other:
- `/api/fashion/upload` (POST)
- `/api/fashion/upload-image` (POST)
- `/api/scrape-product` (GET, currently mock flow)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Neon Postgres database

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment variables

Create `.env.local` in the project root:

```env
# Required
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=your-auth-secret

# Optional (feature-dependent)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

SMTP_EMAIL=your-smtp-email
SMTP_PASSWORD=your-smtp-password

NEXT_PUBLIC_APP_URL=http://localhost:3000
VERCEL_URL=your-vercel-url

# Planned / optional integration
OPENAI_API_KEY=your-openai-key
```

### 3) Push database schema

```bash
pnpm db:push
```

Optional:

```bash
pnpm db:studio
```

### 4) Start development server

```bash
pnpm dev
```

Open http://localhost:3000

## Scripts

- `pnpm dev` - start dev server
- `pnpm build` - build production app
- `pnpm start` - run production server
- `pnpm lint` - run lint checks
- `pnpm db:generate` - generate Drizzle artifacts
- `pnpm db:push` - push schema to database
- `pnpm db:studio` - open Drizzle Studio

## Project Structure

```text
lifesync-app/
  app/
    api/
    auth/
    dashboard/
    share/
  components/
    fashion/
    finance/
    fitness/
    food/
    notes/
    profile/
    saved/
    skincare/
    time/
    ui/
  hooks/
  lib/
    db/
    services/
    types/
    utils/
  public/
  scripts/
```

## Architecture Notes

- Multi-tenant pattern: most domain data is scoped by `workspaceId` and `userId`
- Auth middleware protects dashboard and non-public routes
- Audit logging utility is used for many mutation paths
- Finance includes both transaction APIs and wallet ledger/balance services

## Known Gaps / Backlog Priorities

- Enforce role-based authorization for workspace roles
- Add API rate limiting for sensitive and high-traffic endpoints
- Standardize finance writes around a single ledger source of truth
- Re-implement or remove disabled password-reset UX
- Replace mocked scrape-product path with production implementation
- Add automated integration tests for auth, finance, and tenant isolation

## Notes for Contributors

- Prefer workspace-scoped and user-scoped queries in all routes/services
- Keep route handlers aligned with existing API contracts
- Validate request payloads with Zod where possible
- Avoid introducing schema changes without corresponding migration scripts

## License

No license file is currently defined in this repository.# Aura360 (LifeSync)

<div align="center">

![Aura360 Logo](https://img.shields.io/badge/Aura360-LifeSync-teal?style=for-the-badge)

**Your unified dashboard for productivity, wellness, and personal growth**

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![NeonDB](https://img.shields.io/badge/NeonDB-Serverless_Postgres-green?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-c5f74f?style=flat-square)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.9-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 About

**Aura360** (formerly LifeSync) is a comprehensive personal management application that brings together all aspects of your life into one unified dashboard. Track your notes, finances, fitness goals, meals, fashion wardrobe, skincare routines, saved content, and time logs—all in one beautiful, intuitive interface.

Built with modern web technologies, Aura360 provides a seamless experience across devices with real-time synchronization, secure authentication, and an elegant dark mode.

---

## ✨ Features

### 🎯 Core Features
- **Unified Dashboard**: Access all life management modules from one central hub
- **User Authentication**: Secure sign-up, login, password reset, and session management
- **Dark Mode**: System-aware theme with manual toggle option
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Sync**: Data synchronization across all your devices
- **Drag & Drop**: Intuitive interfaces for organizing fashion items and more

### 📦 Available Modules

1. **📝 Notes**
   - Quick capture thoughts and ideas
   - Organize with categories and tags
   - Rich text editing

2. **💰 Finance**
   - Track income and expenses
   - Categorize transactions
   - View financial summaries and trends
   - Budget management

3. **💪 Fitness**
   - Log workouts and exercises
   - Track body measurements
   - View fitness statistics
   - Progress tracking over time

4. **🍽️ Food**
   - Meal tracking and logging
   - Nutritional information
   - Meal history and patterns
   - Dietary insights

5. **🔖 Saved Items**
   - Save articles, videos, and links
   - Organize by categories
   - Quick access to saved content
   - Web scraping for metadata

6. **👔 Fashion**
   - **My Wardrobe**: Manage owned clothing items
   - **Need to Buy**: Wishlist with buying links and budgets
   - **Fashion Sense**: AI-powered style recommendations
   - Drag-and-drop organization
   - Filter by occasion, season, color, and brand
   - Image upload for items

7. **✨ Skincare**
   - Track skincare products
   - Manage routines (AM/PM)
   - Product effectiveness notes
   - Expiration tracking

8. **⏰ Time Logs**
   - Activity tracking
   - Time management insights
   - Productivity analytics
   - Daily/weekly summaries

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15.2.4](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://reactjs.org/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS 4.1.9](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable component library
- **[Lucide React](https://lucide.dev/)** - Beautiful icons

### Backend & Database
- **[NeonDB](https://neon.tech/)** - Serverless PostgreSQL
  - Edge-compatible database
  - Auto-scaling and branching
  - Connection pooling
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM
  - Type-safe queries
  - Schema migrations
  - Edge runtime support
- **[NextAuth.js v5](https://next-auth.js.org/)** - Authentication
  - Credentials & OAuth
  - Session management
- **[Cloudinary](https://cloudinary.com/)** - Image storage & CDN

### Key Libraries
- **[@dnd-kit](https://dndkit.com/)** - Drag and drop functionality
- **[React Hook Form](https://react-hook-form.com/)** - Form management
- **[Zod](https://zod.dev/)** - Schema validation
- **[Recharts](https://recharts.org/)** - Data visualization
- **[date-fns](https://date-fns.org/)** - Date utilities
- **[Axios](https://axios-http.com/)** - HTTP client
- **[Cheerio](https://cheerio.js.org/)** - Web scraping
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme management

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **pnpm** (recommended) or npm
- **NeonDB Account** ([Sign up here](https://neon.tech))
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ARUN-L-KUMAR/Aura360.git
   cd Aura360
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database (Required)
   DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
   
   # NextAuth (Required)
   NEXTAUTH_SECRET=your-nextauth-secret  # Generate: openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000
   
   # Cloudinary (Required for image uploads)
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

   Get these values from your [NeonDB dashboard](https://console.neon.tech).

4. **Set up the database**
   
   Run the SQL scripts in the `scripts/` folder in your Supabase SQL editor:
   ```bash
   # Push database schema
   pnpm db:push
   
   # (Optional) Open Drizzle Studio
   pnpm db:studio
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
lifesync-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── scrape-product/       # Web scraping endpoint
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/                # Main application
│   │   ├── notes/
│   │   ├── finance/
│   │   ├── fitness/
│   │   ├── food/
│   │   ├── fashion/
│   │   ├── skincare/
│   │   ├── saved/
│   │   ├── time/
│   │   ├── profile/
│   │   └── settings/
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── fashion/                  # Fashion module components
│   ├── finance/                  # Finance module components
│   ├── fitness/                  # Fitness module components
│   ├── food/                     # Food module components
│   ├── notes/                    # Notes module components
│   ├── saved/                    # Saved items components
│   ├── skincare/                 # Skincare module components
│   ├── time/                     # Time logs components
│   └── profile/                  # Profile components
├── lib/                          # Utilities
│   ├── db/                       # Database (Drizzle ORM)
│   │   ├── index.ts              # Database client
│   │   └── schema.ts             # Database schema
│   ├── services/                 # Business logic services
│   ├── types/                    # TypeScript type definitions
│   ├── auth.ts                   # NextAuth configuration
│   ├── cloudinary.ts             # Image upload helpers
│   └── utils.ts                  # Helper functions
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
├── scripts/                      # Database scripts
│   ├── 01-create-schema.sql
│   ├── 02-seed-data.sql
│   ├── create-storage-bucket.sql
│   └── update-fashion-schema.sql
├── styles/                       # Additional styles
├── .env.local                    # Environment variables (create this)
├── components.json               # shadcn/ui config
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── tailwind.config.js            # Tailwind CSS config
```

---

## 🎮 Modules

### Notes Module
Create, edit, and organize your thoughts with a simple note-taking interface.

**Key Features:**
- Rich text editing
- Quick capture
- Search and filter
- Categories/tags

### Finance Module
Complete financial tracking with income, expenses, and budgeting.

**Key Features:**
- Transaction logging
- Category management
- Financial summaries
- Expense analytics

### Fitness Module
Track your workouts and body measurements to achieve your fitness goals.

**Key Features:**
- Workout logging
- Body measurements
- Progress charts
- Exercise library

### Food Module
Monitor your meals and nutrition intake.

**Key Features:**
- Meal logging
- Nutritional tracking
- Meal history
- Dietary insights

### Fashion Module
Comprehensive wardrobe management with AI-powered recommendations.

**Key Features:**
- **My Wardrobe**: Catalog owned items with details
- **Need to Buy**: Wishlist with buying links
- **Fashion Sense**: AI style suggestions
- Drag-and-drop organization
- Filter by occasion, season, color
- Image upload support

### Skincare Module
Manage your skincare products and routines.

**Key Features:**
- Product database
- AM/PM routines
- Product effectiveness tracking
- Expiration reminders

### Saved Items Module
Bookmark and organize content from across the web.

**Key Features:**
- Save links, articles, videos
- Automatic metadata extraction
- Category organization
- Quick access

### Time Logs Module
Track how you spend your time throughout the day.

**Key Features:**
- Activity logging
- Time analytics
- Productivity insights
- Daily/weekly summaries

---

## 🗄️ Database Setup

### NeonDB Configuration

1. **Create a new NeonDB project** at [console.neon.tech](https://console.neon.tech)

2. **Run database migrations**
   
   Push your schema to the database:
   ```bash
   # Generate migration files
   pnpm db:generate
   
   # Push schema to NeonDB
   pnpm db:push
   
   # View database in Drizzle Studio (optional)
   pnpm db:studio
   ```

3. **Multi-tenant Architecture**
   
   The database uses workspace-based multi-tenancy:
   - Each user gets a personal workspace on signup
   - All data is scoped to workspaces
   - Future: Team workspaces with role-based access

4. **Image Storage**
   
   Images are stored in Cloudinary:
   - Fashion item photos
   - Profile pictures
   - Food logs

### Database Tables

**Authentication & Multi-tenancy:**
- `users` - User accounts and profiles
- `accounts` - OAuth provider accounts
- `sessions` - Active user sessions
- `workspaces` - Workspace/tenant management
- `workspace_members` - User-workspace relationships

**Finance Module:**
- `wallet_ledger` - Immutable transaction ledger
- `wallet_balances` - Current balances per payment method
- `transactions` - Legacy transaction table

**Other Modules:**
- `notes` - Note entries
- `fitness` - Workout and measurement logs
- `food` - Meal logs
- `fashion_items` - Wardrobe and wishlist items
- `skincare` - Skincare products and routines
- `saved_items` - Bookmarked content
- `time_logs` - Activity time tracking

**System Tables:**
- `audit_logs` - Activity tracking
- `notifications` - User notifications

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require

# NextAuth (Required)
NEXTAUTH_SECRET=your-secret-key  # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Cloudinary (Required for uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional: Analytics
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Next.js Config

The `next.config.mjs` file includes:
- ESLint and TypeScript build error handling
- Image optimization settings
- Environment-specific configurations

### Tailwind Config

Customized theme with:
- Extended color palette
- Custom animations
- Dark mode support
- Responsive breakpoints

---

## 💻 Development

### Available Scripts

```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Development Guidelines

1. **Component Structure**: Follow the modular component structure in `/components`
2. **Type Safety**: Use TypeScript types from `/lib/types`
3. **Styling**: Use Tailwind CSS utility classes
4. **State Management**: Use React hooks and Context where needed
5. **API Routes**: Place in `/app/api` directory
6. **Database Queries**: Use Supabase client from `/lib/supabase`

### Adding a New Module

1. Create page in `/app/dashboard/[module-name]/page.tsx`
2. Create components in `/components/[module-name]/`
3. Add database table and types
4. Update dashboard navigation
5. Implement RLS policies

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables
   - Deploy

3. **Configure Environment Variables**
   
   Add the same variables from `.env.local` in Vercel dashboard.

### Other Deployment Options

- **Netlify**: Similar to Vercel
- **Railway**: Full-stack deployment
- **Docker**: Use the provided Dockerfile (if available)
- **Self-hosted**: Build and serve with Node.js

### Production Checklist

- [ ] Set up production Supabase project
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Set up storage buckets
- [ ] Configure custom domain (optional)
- [ ] Enable analytics (Vercel Analytics included)
- [ ] Set up error monitoring (optional)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add some amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Arun L Kumar**
- GitHub: [@ARUN-L-KUMAR](https://github.com/ARUN-L-KUMAR)
- Repository: [Aura360](https://github.com/ARUN-L-KUMAR/Aura360)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Backend platform
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Vercel](https://vercel.com/) - Hosting platform
- [Radix UI](https://www.radix-ui.com/) - Accessible components

---

## 📧 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check existing documentation
- Review the FAQ section (coming soon)

---

<div align="center">

Made with ❤️ by Arun L Kumar

**[⬆ Back to Top](#aura360-lifesync)**

</div>
