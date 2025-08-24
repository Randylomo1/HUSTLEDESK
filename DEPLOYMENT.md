# HustleDesk Deployment Guide

## Production Deployment Checklist

### 1. Environment Setup

Create production environment files with real credentials:

```bash
# apps/web/.env.local (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
CLERK_SECRET_KEY=sk_live_your_production_key

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# M-Pesa Production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_SHORTCODE=your_production_shortcode
MPESA_PASSKEY=your_production_passkey
MPESA_ENV=production

NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Database Migration

1. **Supabase Production Setup**:
   - Create production Supabase project
   - Apply all migrations in order:
     ```sql
     -- Run these in Supabase SQL Editor
     -- 1. infra/supabase/migrations/2025-08-24-0001-init.sql
     -- 2. infra/supabase/migrations/2025-08-24-0002-indexes.sql
     -- 3. infra/supabase/migrations/2025-08-24-0003-rls-policies.sql
     ```
   - Enable Row Level Security on all tables
   - Set up database backups (daily recommended)

2. **Database Functions** (add to Supabase):
   ```sql
   -- Function to increment customer balance
   CREATE OR REPLACE FUNCTION increment_customer_balance(customer_id UUID, amount INTEGER)
   RETURNS VOID AS $$
   BEGIN
     UPDATE core.customers 
     SET balance_cents = balance_cents + amount,
         last_activity_at = NOW()
     WHERE id = customer_id;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

### 3. Vercel Deployment

1. **Connect Repository**:
   - Link GitHub repository to Vercel
   - Set root directory to `apps/web`
   - Framework preset: Next.js

2. **Environment Variables**:
   ```bash
   # Add these in Vercel dashboard
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   MPESA_CONSUMER_KEY=...
   MPESA_CONSUMER_SECRET=...
   MPESA_SHORTCODE=...
   MPESA_PASSKEY=...
   MPESA_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **Build Settings**:
   ```bash
   # Build Command
   cd ../.. && pnpm build --filter=@hustledesk/web
   
   # Install Command
   cd ../.. && pnpm install
   
   # Output Directory
   .next
   ```

### 4. M-Pesa Production Setup

1. **Safaricom Developer Portal**:
   - Create production app
   - Get production credentials
   - Configure webhook URLs:
     - STK Callback: `https://your-domain.com/api/mpesa/stk/webhook`
     - C2B Callback: `https://your-domain.com/api/mpesa/c2b/webhook`

2. **Test M-Pesa Integration**:
   ```bash
   # Test STK Push
   curl -X POST https://your-domain.com/api/orgs/[orgId]/invoices/[invoiceId]/stk \
     -H "Content-Type: application/json" \
     -d '{"phone": "254712345678"}'
   ```

### 5. Domain & SSL

1. **Custom Domain**:
   - Add domain in Vercel dashboard
   - Update DNS records as instructed
   - SSL certificate auto-generated

2. **Update Environment**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
   ```

### 6. Monitoring & Analytics

1. **Vercel Analytics**:
   - Enable in Vercel dashboard
   - Monitor performance metrics

2. **Error Tracking**:
   ```bash
   # Optional: Add Sentry
   npm install @sentry/nextjs
   ```

3. **Database Monitoring**:
   - Enable Supabase monitoring
   - Set up alerts for high usage

### 7. Security Checklist

- [ ] All environment variables secured
- [ ] RLS policies enabled on all tables
- [ ] Webhook endpoints secured
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Database backups enabled

### 8. Performance Optimization

1. **Database Indexes**:
   - All performance indexes applied
   - Query performance monitored

2. **Caching**:
   ```typescript
   // Add to API routes
   export const revalidate = 60; // Cache for 60 seconds
   ```

3. **Image Optimization**:
   ```typescript
   // next.config.js
   images: {
     domains: ['your-supabase-project.supabase.co'],
     formats: ['image/webp', 'image/avif'],
   }
   ```

### 9. Backup Strategy

1. **Database Backups**:
   - Supabase automatic daily backups
   - Point-in-time recovery enabled

2. **Code Backups**:
   - GitHub repository with branches
   - Tagged releases for versions

### 10. Launch Checklist

- [ ] All migrations applied
- [ ] Environment variables set
- [ ] M-Pesa webhooks configured
- [ ] Domain and SSL working
- [ ] Test user flows working
- [ ] Error monitoring active
- [ ] Performance metrics baseline
- [ ] Backup strategy confirmed

## Post-Launch Monitoring

### Key Metrics to Track

1. **Business Metrics**:
   - User signups per day
   - Organizations created
   - Sales recorded
   - M-Pesa transaction success rate

2. **Technical Metrics**:
   - API response times
   - Error rates
   - Database performance
   - Webhook success rates

3. **User Experience**:
   - Page load times
   - Mobile responsiveness
   - Feature adoption rates

### Scaling Considerations

1. **Database Scaling**:
   - Monitor connection usage
   - Consider read replicas for reporting
   - Optimize slow queries

2. **API Scaling**:
   - Vercel auto-scales
   - Monitor function execution times
   - Consider edge functions for global users

3. **Storage Scaling**:
   - Monitor Supabase storage usage
   - Implement file cleanup policies
   - Consider CDN for static assets

## Troubleshooting Common Issues

### M-Pesa Integration
- Verify webhook URLs are accessible
- Check transaction logs in database
- Validate phone number formats

### Authentication Issues
- Verify Clerk configuration
- Check middleware setup
- Validate JWT tokens

### Database Performance
- Monitor slow queries
- Check index usage
- Optimize RLS policies

### Deployment Issues
- Verify build process
- Check environment variables
- Monitor function logs
