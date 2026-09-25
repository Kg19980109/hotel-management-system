# Database Principles

1. **Normalized Relational Design**: Avoid massive JSON blobs unless for flexible metadata. 
2. **Foreign Keys**: Enforce referential integrity strictly.
3. **Timestamps**: Every table needs `created_at` and `updated_at`.
4. **UUIDs**: Use UUIDv4 for primary keys to obfuscate IDs and prevent enumeration.
5. **Soft Deletes**: Use `deleted_at` timestamps for critical entities (Bookings, Guests) to preserve history.
6. **Data Types**: Use precise numeric types (e.g., `DECIMAL` or integer cents) for money. Use `TIMESTAMPTZ` for robust timezone handling.
7. **Indexes**: Preemptively plan indexes for foreign keys and common query paths (e.g., booking dates).\n