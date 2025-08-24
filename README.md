# HustleDesk

African-first micro-business management platform for hustlers and small shops in Nairobi and East Africa.

## Features

- **Quick Sales & Expenses**: Record transactions in <10 seconds
- **M-Pesa Native**: STK push payments and C2B webhook reconciliation
- **Multi-tenant**: Organizations with outlets and role-based access
- **Offline-first Mobile**: SQLite with background sync
- **Invoices & Receipts**: PDF generation with WhatsApp sharing
- **Reports & Dashboard**: Daily profit summaries and top products/customers

## Tech Stack

- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Mobile**: React Native (Expo), SQLite for offline storage
- **Backend**: Supabase (Postgres + Storage + Functions)
- **Auth**: Clerk with App Router integration
- **Payments**: M-Pesa Daraja API, Stripe for international
- **Hosting**: Vercel (web), Supabase (backend), Expo EAS (mobile)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- Clerk account

### Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd hustledesk
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your keys

# Run development servers
pnpm dev
```

### Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# M-Pesa Daraja (optional for development)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENV=sandbox
```

## Project Structure

```
hustledesk/
├── apps/
│   ├── web/                 # Next.js web application
│   └── mobile/              # React Native mobile app
├── packages/
│   ├── ui/                  # Shared web UI components
│   ├── ui-native/           # Shared mobile UI components
│   ├── shared/              # Shared types and utilities
│   ├── config/              # Shared configurations
│   └── api-client/          # Typed API client
├── infra/
│   ├── supabase/           # Database migrations and seeds
│   ├── scripts/            # Operational scripts
│   └── docs/               # Architecture documentation
└── .github/workflows/      # CI/CD pipelines
```

## Development

```bash
# Start all development servers
pnpm dev

# Start specific app
pnpm --filter @hustledesk/web dev
pnpm --filter @hustledesk/mobile dev

# Build all apps
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

## Database Setup

1. Create a new Supabase project
2. Run the SQL migrations in `infra/supabase/migrations/`
3. Set up Row Level Security (RLS) policies
4. Configure webhooks for real-time features

## Deployment

### Web Application (Vercel)
- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push to main branch

### Mobile Application (Expo EAS)
- Configure `eas.json` for build profiles
- Run `eas build` for app store builds
- Use `eas submit` for app store submission

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@hustledesk.co or join our community Discord.
# HUSTLEDESK
