# StayHub Guest Service Requests Architecture (Phase 15)

## 1. Overview & Objectives
The Guest Service Requests module provides in-house guests with an instant digital channel to submit on-demand hotel service requests across Housekeeping, Concierge, Front Desk, Maintenance, Laundry, Spa, Transport, and In-Room Dining directly from the mobile Guest Portal.

Hotel staff receive these requests on a centralized, real-time board (`/guest-requests`), allowing departmental routing, staff assignment, status progression, and direct communication back to the guest.

---

## 2. Request Lifecycle & State Machine

```
      +-----------------------------------------+
      |                SUBMITTED                | <--- Guest creates request
      +--------------------+--------------------+
                           |
                           v
      +-----------------------------------------+
      |              ACKNOWLEDGED               | <--- Staff reviews request
      +--------------------+--------------------+
                           |
                           v
      +-----------------------------------------+
      |                ASSIGNED                 | <--- Assigned to department or staff member
      +--------------------+--------------------+
                           |
                           v
      +-----------------------------------------+
      |               IN_PROGRESS               | <--- Staff begins execution
      +--------------------+--------------------+
                           |
                           v
      +-----------------------------------------+
      |                COMPLETED                | <--- Staff marks finished (+ guest note)
      +-----------------------------------------+

  Alternative Terminal Transitions:
  - SUBMITTED / ACKNOWLEDGED / ASSIGNED -> CANCELLED (By Guest or Staff)
  - SUBMITTED / ACKNOWLEDGED / ASSIGNED -> REJECTED (By Staff)
```

---

## 3. Database Schema

### `public.guest_service_requests`
- `id` (UUID, Primary Key)
- `property_id` (UUID, Foreign Key -> `properties`, NOT NULL)
- `guest_id` (UUID, Foreign Key -> `guests`, NOT NULL)
- `stay_id` (UUID, Foreign Key -> `stays`, NOT NULL)
- `room_id` (UUID, Foreign Key -> `rooms`, NOT NULL)
- `category` (VARCHAR 50, NOT NULL: `HOUSEKEEPING`, `FRONT_DESK`, `CONCIERGE`, `MAINTENANCE`, `LAUNDRY`, `SPA`, `TRANSPORT`, `ROOM_SERVICE`, `OTHER`)
- `request_type` (VARCHAR 100, NOT NULL)
- `title` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `priority` (VARCHAR 20, NOT NULL DEFAULT 'MEDIUM': `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'SUBMITTED': `SUBMITTED`, `ACKNOWLEDGED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `REJECTED`)
- `assigned_to` (UUID, Foreign Key -> `profiles`, NULLABLE)
- `assigned_department` (VARCHAR 50, NULLABLE)
- `requested_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `started_at`, `completed_at`, `cancelled_at` (TIMESTAMPTZ, NULLABLE)
- `guest_visible_notes` (TEXT, NULLABLE) - Safe notes sent to guest
- `staff_notes` (TEXT, NULLABLE) - Internal operational notes hidden from guest
- `created_by`, `updated_by` (UUID, Foreign Key -> `profiles`, NULLABLE)
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

### `public.guest_service_request_events`
Immutable timeline audit log tracking every lifecycle change.
- `id` (UUID, Primary Key)
- `property_id` (UUID, Foreign Key -> `properties`, NOT NULL)
- `request_id` (UUID, Foreign Key -> `guest_service_requests` ON DELETE CASCADE, NOT NULL)
- `event_type` (VARCHAR 50, NOT NULL)
- `from_status`, `to_status` (VARCHAR 50)
- `actor_type` (VARCHAR 20, NOT NULL: `GUEST`, `STAFF`, `SYSTEM`)
- `actor_profile_id` (UUID, Foreign Key -> `profiles`, NULLABLE)
- `event_note` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

---

## 4. Security & Isolation Controls

1. **Server-Side Identity Binding**:
   Guests cannot pass arbitrary `guest_id`, `stay_id`, `room_id`, or `property_id`. The server RPC `create_guest_service_request` looks up the record in `guest_sessions` by `p_session_token_hash` and validates `stays.status = 'CHECKED_IN'`.
2. **Guest Privacy Safeguards**:
   - `get_guest_service_requests` and `get_guest_service_request_detail` omit `staff_notes`, internal staff profiles, and staff-only events.
   - Guests only see `guest_visible_notes` set by staff upon resolution.
3. **Database Consistency Triggers**:
   - `trg_check_guest_service_request_tenant`: Verifies `guest_id`, `stay_id`, and `room_id` belong to the same `property_id`.
   - `trg_prevent_guest_srv_req_events_mutation`: Blocks direct `UPDATE` or mutation on historical event rows.
4. **Staff Property Boundaries & RBAC**:
   - Staff operations (`staff_acknowledge_guest_request`, `staff_assign_guest_request`, etc.) require active property membership.
   - Assigning staff validates that `assigned_to` belongs to an active membership in the same `property_id`.
