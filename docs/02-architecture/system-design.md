# System Design

## Architecture Pattern
Modular monolith architecture implemented in Next.js.

## Components
1. **Web App (Dashboard)**: Desktop/tablet optimized for staff.
2. **Web App (Guest Portal)**: Mobile-optimized PWA-style web app accessed via QR codes.
3. **API Services**: Structured standard REST/RPC endpoints internally within Next.js.
4. **Database (Supabase PostgreSQL)**: Core transactional storage.
5. **AI Layer**: Secure abstraction layer wrapping LLM calls with authorized tools.\n