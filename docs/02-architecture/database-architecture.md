# Database Architecture

## Strategy
We use a single relational PostgreSQL database (Supabase) structured for multi-tenancy.

## Multi-Tenancy Implementation
- `organization_id` at the root of tenant data.
- `property_id` for hotel-specific data.
- Use Row Level Security (RLS) to enforce isolation at the database level.
- Strong foreign keys and constraints.

## Best Practices
- UUIDs for primary keys to prevent enumeration.
- Timestamps (`created_at`, `updated_at`) on all tables.
- Soft-deletes where auditing or historical reference is needed (e.g., deleted bookings).\n