# Aura360 (LifeSync)

<div align="center">

![Aura360 Logo](https://img.shields.io/badge/Aura360-LifeSync-teal?style=for-the-badge)

**Your unified dashboard for productivity, wellness, and personal growth**

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square&logo=supabase)](https://supabase.com/)
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
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Storage
  - Real-time subscriptions
  - Row Level Security (RLS)

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
- **Supabase Account** ([Sign up here](https://supabase.com))
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
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Get these values from your [Supabase project settings](https://app.supabase.com).

4. **Set up the database**
   
   Run the SQL scripts in the `scripts/` folder in your Supabase SQL editor:
   ```bash
   # In Supabase SQL Editor, run in order:
   01-create-schema.sql
   02-seed-data.sql (optional - for demo data)
   create-storage-bucket.sql
   update-fashion-schema.sql
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
│   ├── supabase/                 # Supabase client setup
│   ├── types/                    # TypeScript type definitions
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

### Supabase Configuration

1. **Create a new Supabase project** at [app.supabase.com](https://app.supabase.com)

2. **Run database migrations**
   
   Navigate to SQL Editor in Supabase and run the scripts in order:
   - `scripts/01-create-schema.sql` - Creates all tables and relationships
   - `scripts/02-seed-data.sql` - (Optional) Seeds demo data
   - `scripts/create-storage-bucket.sql` - Sets up file storage
   - `scripts/update-fashion-schema.sql` - Fashion module enhancements

3. **Configure Row Level Security (RLS)**
   
   The schema files include RLS policies to ensure users can only access their own data.

4. **Set up Storage**
   
   Storage buckets are created for:
   - Fashion item images
   - Profile pictures
   - Other user uploads

### Database Tables

- `users` - User profiles and preferences
- `notes` - Note entries
- `transactions` - Financial transactions
- `fitness` - Workout and measurement logs
- `meals` - Food intake logs
- `fashion` - Wardrobe and wishlist items
- `skincare` - Skincare products and routines
- `saved_items` - Bookmarked content
- `time_logs` - Activity time tracking

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: OpenAI for AI features (future)
# OPENAI_API_KEY=your-openai-key
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
