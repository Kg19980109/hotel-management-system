# Supabase Strategy

## Database Connectivity
- Supabase is the primary PostgreSQL database.
- Connection is established securely using `DATABASE_URL` or `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- Server-side connections will use the service role key or robust authenticated sessions.

## Features Utilized
- **Database**: Relational data, views, and functions.
- **Row Level Security (RLS)**: Enforcing tenant isolation.
- **Storage** (Future): For guest documents, room images.
- **Auth** (Future): For user identity and session management.

## State
Currently, the database connection has been safely tested. The public schema is currently empty.\n