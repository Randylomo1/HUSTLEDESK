# HustleDesk Setup Guide

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **pnpm** - Install globally: `npm install -g pnpm`
3. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
4. **Clerk Account** - Sign up at [clerk.com](https://clerk.com)

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your keys:
```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your actual keys:

```bash
# Clerk Authentication (provided in PRD)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJlc2VudC1jYXJkaW5hbC03Ny5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_O6IUom242yuwzWeTCQxVHnh8GleS5UPosVpqPl1KRZ

# Supabase (get from your Supabase project)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor in your Supabase dashboard
3. Run the migration files in order:
   - `infra/supabase/migrations/2025-08-24-0001-init.sql`
   - `infra/supabase/migrations/2025-08-24-0002-indexes.sql`
   - `infra/supabase/migrations/2025-08-24-0003-rls-policies.sql`

### 4. Configure Clerk

1. Create a new Clerk application
2. In your Clerk dashboard:
   - Go to "Configure" → "Paths"
   - Set sign-in path: `/sign-in`
   - Set sign-up path: `/sign-up`
   - Set after sign-in redirect: `/dashboard`
   - Set after sign-up redirect: `/onboarding`

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at http://localhost:3000

## Project Structure

```
hustledesk/
├── apps/
│   ├── web/                 # Next.js web application
│   └── mobile/              # React Native mobile app (coming soon)
├── packages/
│   ├── shared/              # Shared types and utilities
│   ├── config/              # Shared configurations
│   └── ui/                  # Shared UI components (coming soon)
├── infra/
│   └── supabase/           # Database migrations
└── docs/                   # Documentation
```

## Development Workflow

1. **Database Changes**: Add new migrations to `infra/supabase/migrations/`
2. **Shared Code**: Update types and schemas in `packages/shared/`
3. **API Routes**: Add new endpoints in `apps/web/src/app/api/`
4. **UI Pages**: Create new pages in `apps/web/src/app/`

## Testing the Setup

1. Visit http://localhost:3000
2. Click "Sign Up" to create an account
3. Complete the onboarding flow
4. Try creating a product and recording a sale

## Troubleshooting

### Common Issues

1. **Clerk Authentication Errors**
   - Verify your Clerk keys are correct
   - Check that middleware.ts is properly configured

2. **Supabase Connection Errors**
   - Verify your Supabase URL and keys
   - Ensure RLS policies are applied correctly

3. **Build Errors**
   - Run `pnpm clean` and `pnpm install` to reset
   - Check TypeScript errors in the terminal

### Getting Help

- Check the console for error messages
- Verify all environment variables are set
- Ensure database migrations have been applied

## Next Steps

Once the basic setup is working:

1. Add your first products
2. Record test sales and expenses
3. Explore the dashboard and reports
4. Set up M-Pesa integration (optional)
5. Configure WhatsApp messaging (optional)

## Production Deployment

For production deployment:

1. **Vercel** (Web App)
   - Connect your GitHub repository
   - Set environment variables in Vercel dashboard
   - Deploy automatically on push to main

2. **Supabase** (Database)
   - Your Supabase project is production-ready
   - Consider upgrading to a paid plan for better performance

3. **Domain Setup**
   - Configure custom domain in Vercel
   - Update NEXT_PUBLIC_APP_URL environment variable
