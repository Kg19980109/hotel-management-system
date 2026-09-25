# StayHub Multi-Tenancy Architecture

## 1. Tenancy Model Overview

StayHub implements an enterprise multi-tenant architecture designed to support hospitality holding groups operating multiple independent hotels and resorts with absolute data isolation:

```
USER (auth.users)
  ↓
APPLICATION USER PROFILE (public.profiles)
  ↓
ORGANIZATION (public.organizations)
  ↓
PROPERTY / HOTEL (public.properties)
  ↓
PROPERTY MEMBERSHIP (public.property_memberships)
  ↓
ROLE (public.roles)
  ↓
RLS-PROTECTED DATA
```

## 2. Multi-Property Membership Matrix
- A single user can belong to multiple hotel properties within or across organizations.
- A user can hold different roles in different properties (e.g., `HOTEL_OWNER` in Hotel Royal Kolkata, and `GENERAL_MANAGER` in Hotel Royal Digha).
- Property access is strictly governed by `public.property_memberships`.
- The active property context (`stayhub_active_property_id`) is stored in an HTTP-only secure cookie and validated against actual database memberships on every server request.

## 3. Strict Tenant Isolation Guarantees
1. **Database-Level RLS**: Every table enforces PostgreSQL Row Level Security. Cross-tenant reads and writes return zero rows or throw permission violations.
2. **Non-Recursive Helper Functions**:
   - `public.user_belongs_to_property(user_id, property_id)`
   - `public.user_belongs_to_organization(user_id, org_id)`
   - `public.user_has_property_role(user_id, property_id, roles[])`
   - `public.is_platform_super_admin(user_id)`
3. **Atomic Onboarding**: Multi-table tenant initialization (`organizations` → `properties` → `profiles` → `property_memberships`) runs inside a transactional `SECURITY DEFINER` RPC (`create_hotel_onboarding`). Roles cannot be self-assigned or escalated from the browser.