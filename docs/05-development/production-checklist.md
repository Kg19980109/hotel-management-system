# StayHub Production Deployment Checklist

Use this exhaustive checklist before promoting StayHub to live production environments.

---

## 1. Infrastructure & Hosting (Vercel)
- [ ] Vercel project linked and configured with Next.js 16 App Router preset.
- [ ] Production custom domain (e.g. `https://stayhub.app`) configured with valid SSL/TLS certificate.
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain.
- [ ] Serverless Function timeout and memory settings configured appropriately for report exports.
- [ ] Security headers verified in `next.config.ts` (HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

---

## 2. Database & Supabase Configuration
- [ ] Supabase production project created with PostgreSQL 15+.
- [ ] All migrations (01 through 22) applied deterministically via migration runner.
- [ ] PostgreSQL Row-Level Security (RLS) enabled on all 73 public database tables.
- [ ] Composite performance indexes verified (281 public indexes active).
- [ ] Automated Point-in-Time Recovery (PITR) and daily backups enabled in Supabase dashboard.
- [ ] Connection pooling (PgBouncer or Supabase Supavisor) enabled for high-concurrency workloads.

---

## 3. Environment Variables & Secrets
- [ ] `.env.production` configured on Vercel with production secrets (never committed to git).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` populated server-side only; verified not prefixed with `NEXT_PUBLIC_`.
- [ ] `DATABASE_URL` configured for migrations and administrative tooling.
- [ ] AI Provider API key configured (`AI_PROVIDER=gemini`, `AI_API_KEY`).
- [ ] Email provider credentials configured (`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`).
- [ ] SMS / WhatsApp provider configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`).
- [ ] Payment gateway webhooks configured (`STRIPE_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).

---

## 4. Multi-Tenant Security & Access Control
- [ ] Cross-tenant attack tests passing (`scripts/test_production_hardening.js`).
- [ ] Centralized RBAC permissions matrix active on all server actions and API routes.
- [ ] Admin / Owner onboarding flow verified with organization and property creation RPC.
- [ ] Guest QR portal session token signing verified with HMAC secret.

---

## 5. Public Booking & SEO
- [ ] Public booking routes (`/book/[propertySlug]`) verified with test hotel slugs.
- [ ] Rate limiting active for public searches and reservation checkout.
- [ ] Double-booking prevention verified against database constraints.
- [ ] `src/app/robots.ts` and `src/app/sitemap.ts` compiled and verified.
- [ ] Canonical URLs and Open Graph tags present on public hotel pages.

---

## 6. Observability & Monitoring
- [ ] Structured JSON logging active with secret and PII redaction.
- [ ] Error tracking / APM (e.g. Sentry or Datadog) connected if configured.
- [ ] Correlation IDs attached to incoming requests and error responses.
- [ ] Notification delivery audit log monitored for retry bounds and failed provider responses.

---

## 7. Verification & Build Integrity
- [ ] Full regression test suite passing: `node scripts/run_all_tests.js` (766/766 tests).
- [ ] Production build clean: `npm run build` (0 TypeScript / Turbopack errors).
- [ ] ESLint clean: `npm run lint` (0 lint errors).
