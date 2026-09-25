# Multi-Tenancy Strategy

## Overview
StayHub is a SaaS platform. Hotel A must NEVER be able to see Hotel B's data under any circumstances.

## Security Layers
1. **Application Level**: All API queries must include and filter by `organization_id` and/or `property_id` matching the current user's session token.
2. **Database Level**: Supabase Row Level Security (RLS) policies will enforce tenant isolation, ensuring that even if an application bug omits a filter, the database will block unauthorized access.\n