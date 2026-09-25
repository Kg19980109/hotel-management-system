# StayHub Database Schema & Entities (Phase 4)

## 1. Tenancy & Identity Tables

### `public.organizations`
Represents the parent corporate entity or hospitality group.
- `id` (UUID, Primary Key, gen_random_uuid())
- `name` (VARCHAR 255, NOT NULL)
- `slug` (VARCHAR 255, UNIQUE, NOT NULL)
- `legal_name` (VARCHAR 255)
- `email` (VARCHAR 255)
- `phone` (VARCHAR 50)
- `status` (VARCHAR 50, DEFAULT 'active')
- `created_by` (UUID, FOREIGN KEY references auth.users(id))
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.properties`
Represents an individual hotel, resort, or boutique property.
- `id` (UUID, Primary Key, gen_random_uuid())
- `organization_id` (UUID, FOREIGN KEY references public.organizations(id) ON DELETE CASCADE)
- `name` (VARCHAR 255, NOT NULL)
- `slug` (VARCHAR 255, NOT NULL)
- `property_code` (VARCHAR 50)
- `description` (TEXT)
- `address_line_1` (VARCHAR 255, NOT NULL)
- `address_line_2` (VARCHAR 255)
- `city` (VARCHAR 100, NOT NULL)
- `state` (VARCHAR 100, NOT NULL)
- `postal_code` (VARCHAR 20, NOT NULL)
- `country` (VARCHAR 100, DEFAULT 'India')
- `phone` (VARCHAR 50)
- `email` (VARCHAR 255)
- `timezone` (VARCHAR 100, DEFAULT 'Asia/Kolkata')
- `currency` (VARCHAR 10, DEFAULT 'INR')
- `check_in_time` (VARCHAR 20, DEFAULT '14:00')
- `check_out_time` (VARCHAR 20, DEFAULT '11:00')
- `status` (VARCHAR 50, DEFAULT 'active')
- `created_by` (UUID, FOREIGN KEY references auth.users(id))
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (organization_id, slug)`

### `public.profiles`
Application profile record linked 1-to-1 with Supabase `auth.users`.
- `id` (UUID, Primary Key, gen_random_uuid())
- `auth_user_id` (UUID, UNIQUE, FOREIGN KEY references auth.users(id) ON DELETE CASCADE)
- `full_name` (VARCHAR 255, NOT NULL)
- `email` (VARCHAR 255, NOT NULL)
- `phone` (VARCHAR 50)
- `avatar_url` (TEXT)
- `status` (VARCHAR 50, DEFAULT 'active')
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.roles`
Platform and property role definitions.
- `id` (UUID, Primary Key, gen_random_uuid())
- `code` (VARCHAR 50, UNIQUE, NOT NULL)
- `name` (VARCHAR 100, NOT NULL)
- `description` (TEXT)
- `is_system` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ, DEFAULT now())

### `public.property_memberships`
Mapping between user accounts, properties, and assigned roles.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `user_id` (UUID, FOREIGN KEY references auth.users(id) ON DELETE CASCADE)
- `role_id` (UUID, FOREIGN KEY references public.roles(id) ON DELETE RESTRICT)
- `status` (VARCHAR 50, DEFAULT 'active')
- `created_by` (UUID, FOREIGN KEY references auth.users(id))
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (property_id, user_id, role_id)`

---

## 2. Performance Indexes
- `idx_organizations_slug` on `organizations(slug)`
- `idx_properties_organization_id` on `properties(organization_id)`
- `idx_properties_status` on `properties(status)`
- `idx_profiles_auth_user_id` on `profiles(auth_user_id)`
- `idx_profiles_email` on `profiles(email)`
- `idx_property_memberships_property_id` on `property_memberships(property_id)`
- `idx_property_memberships_user_id` on `property_memberships(user_id)`
- `idx_property_memberships_role_id` on `property_memberships(role_id)`
- `idx_property_memberships_composite` on `property_memberships(user_id, property_id, status)`

---

## 3. Room Management & Inventory Entities (Phase 6)

### `public.floors`
Represents physical or logical building levels for a hotel property.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `name` (VARCHAR 100, NOT NULL, e.g. "Ground Floor", "Level 1", "Penthouse")
- `floor_number` (INTEGER, NULLABLE for flexible naming)
- `description` (TEXT, NULLABLE)
- `status` (VARCHAR 50, DEFAULT 'active')
- `sort_order` (INTEGER, DEFAULT 0)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints:
  - `uq_floors_property_name`: `UNIQUE(property_id, name)`
  - `uq_floors_property_number`: `UNIQUE(property_id, floor_number)` (Partial index where `floor_number IS NOT NULL`)
- Indexes:
  - `idx_floors_property_id` on `floors(property_id)`
  - `idx_floors_sort_order` on `floors(property_id, sort_order)`

### `public.room_types`
Represents room category classifications, base pricing, and shared accommodation specs.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `name` (VARCHAR 150, NOT NULL, e.g. "Deluxe King", "Executive Suite")
- `code` (VARCHAR 50, NOT NULL, e.g. "DLX", "STE")
- `description` (TEXT, NULLABLE)
- `max_occupancy` (INTEGER, NOT NULL DEFAULT 2, CHECK `max_occupancy > 0`)
- `base_rate` (NUMERIC(12,2), NOT NULL DEFAULT 0.00, CHECK `base_rate >= 0`)
- `currency` (VARCHAR 10, NOT NULL DEFAULT 'INR')
- `bed_configuration` (VARCHAR 100, NULLABLE, e.g. "1 King Bed", "2 Queen Beds")
- `amenities` (JSONB, NOT NULL DEFAULT '[]'::jsonb)
- `size_sqft` (NUMERIC(8,2), NULLABLE)
- `size_sqm` (NUMERIC(8,2), NULLABLE)
- `status` (VARCHAR 50, DEFAULT 'active')
- `is_active` (BOOLEAN, DEFAULT true)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints:
  - `uq_room_types_property_code`: `UNIQUE(property_id, code)`
  - `chk_room_types_base_rate`: `CHECK (base_rate >= 0)`
  - `chk_room_types_occupancy`: `CHECK (max_occupancy > 0)`
- Indexes:
  - `idx_room_types_property_id` on `room_types(property_id)`
  - `idx_room_types_property_code` on `room_types(property_id, code)`
  - `idx_room_types_is_active` on `room_types(property_id, is_active)`

### `public.rooms`
Represents individual physical hotel rooms, inventory status, and operational states.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `floor_id` (UUID, NULLABLE, FOREIGN KEY references public.floors(id) ON DELETE SET NULL)
- `room_type_id` (UUID, NOT NULL, FOREIGN KEY references public.room_types(id) ON DELETE RESTRICT)
- `room_number` (VARCHAR 50, NOT NULL, e.g. "101", "204B")
- `room_name` (VARCHAR 100, NULLABLE, e.g. "The Royal Pavilion")
- `status` (VARCHAR 50, NOT NULL DEFAULT 'AVAILABLE', e.g. AVAILABLE, OCCUPIED, DIRTY, CLEANING, INSPECTED, OUT_OF_ORDER, OUT_OF_SERVICE)
- `housekeeping_status` (VARCHAR 50, NOT NULL DEFAULT 'CLEAN', e.g. CLEAN, DIRTY, CLEANING, INSPECTION_PENDING)
- `availability_status` (VARCHAR 50, NOT NULL DEFAULT 'AVAILABLE', e.g. AVAILABLE, RESERVED, BLOCKED)
- `max_occupancy` (INTEGER, NULLABLE, custom override over room type base capacity)
- `floor_label` (VARCHAR 50, NULLABLE)
- `view_type` (VARCHAR 100, NULLABLE, e.g. "Sea View", "Garden View", "City Skyline")
- `notes` (TEXT, NULLABLE)
- `is_active` (BOOLEAN, NOT NULL DEFAULT true)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints:
  - `uq_rooms_property_number`: `UNIQUE(property_id, room_number)`
  - `chk_rooms_occupancy`: `CHECK (max_occupancy IS NULL OR max_occupancy > 0)`
- Cross-Tenant Consistency Triggers:
  - `trg_check_room_tenant_consistency` executes `fn_check_room_tenant_consistency()` on INSERT/UPDATE, strictly enforcing that `floor_id` and `room_type_id` belong to the exact same `property_id`.
- Indexes:
  - `idx_rooms_property_id` on `rooms(property_id)`
  - `idx_rooms_property_status` on `rooms(property_id, status)`
  - `idx_rooms_property_floor_id` on `rooms(property_id, floor_id)`
  - `idx_rooms_property_room_type_id` on `rooms(property_id, room_type_id)`
  - `idx_rooms_property_is_active` on `rooms(property_id, is_active)`
  - `idx_rooms_housekeeping_status` on `rooms(property_id, housekeeping_status)`

## 3. Booking Management & Reservation Ledger (Phase 7)

### `public.guests` (Extended in Phase 9 for Guest CRM)
Property-scoped Master Guest Profile and CRM identity record.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `title` (VARCHAR 20, NULLABLE, e.g. "Mr", "Ms", "Mrs", "Dr", "Prof")
- `first_name` (VARCHAR 100, NOT NULL)
- `middle_name` (VARCHAR 100, NULLABLE)
- `last_name` (VARCHAR 100, NOT NULL)
- `preferred_name` (VARCHAR 100, NULLABLE)
- `gender` (VARCHAR 20, NULLABLE, e.g. "Male", "Female", "Other", "Prefer not to say")
- `date_of_birth` (DATE, NULLABLE)
- `nationality` (VARCHAR 100, NULLABLE)
- `preferred_language` (VARCHAR 10, DEFAULT 'en')
- `email` (VARCHAR 255, NULLABLE)
- `phone` (VARCHAR 50, NULLABLE)
- `alternate_phone` (VARCHAR 50, NULLABLE)
- `country_code` (VARCHAR 10, NULLABLE)
- `address_line_1` (VARCHAR 255, NULLABLE)
- `address_line_2` (VARCHAR 255, NULLABLE)
- `city` (VARCHAR 100, NULLABLE)
- `state` (VARCHAR 100, NULLABLE)
- `postal_code` (VARCHAR 20, NULLABLE)
- `country` (VARCHAR 100, DEFAULT 'India')
- `id_document_type` (VARCHAR 50, NULLABLE, CHECK `id_document_type IN ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'OTHER')`)
- `id_document_number` (VARCHAR 100, NULLABLE)
- `id_document_country` (VARCHAR 100, NULLABLE)
- `company_name` (VARCHAR 255, NULLABLE)
- `job_title` (VARCHAR 100, NULLABLE)
- `notes` (TEXT, NULLABLE)
- `marketing_consent` (BOOLEAN, NOT NULL DEFAULT false)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'ACTIVE', CHECK `status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'active', 'inactive', 'blocked')`)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Indexes:
  - `idx_guests_property_id` on `guests(property_id)`
  - `idx_guests_property_email` on `guests(property_id, email)`
  - `idx_guests_property_phone` on `guests(property_id, phone)`
  - `idx_guests_property_names` on `guests(property_id, last_name, first_name)`
  - `idx_guests_property_status` on `guests(property_id, status)`

### `public.guest_preferences` (Phase 9)
Structured guest preferences across room selection, dietary requirements, bed setups, floor levels, amenities, and communications.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE CASCADE)
- `preference_type` (VARCHAR 50, NOT NULL, CHECK `preference_type IN ('ROOM', 'BED', 'FLOOR', 'SMOKING', 'DIETARY', 'COMMUNICATION', 'ACCESSIBILITY', 'AMENITY', 'OTHER')`)
- `preference_value` (VARCHAR 255, NOT NULL)
- `notes` (TEXT, NULLABLE)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Cross-Tenant Trigger:
  - `trg_check_guest_preference_tenant_consistency` executes `check_guest_preference_tenant_consistency()` ensuring `guest.property_id = preference.property_id`.
- Indexes:
  - `idx_guest_preferences_guest_id` on `guest_preferences(guest_id)`
  - `idx_guest_preferences_property_id` on `guest_preferences(property_id)`

### `public.guest_notes` (Phase 9)
Private operational staff notes attached to guest profiles. Strictly internal hotel operations data, isolated by RLS and never exposed to customer-facing portals.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE CASCADE)
- `note` (TEXT, NOT NULL)
- `is_pinned` (BOOLEAN, NOT NULL DEFAULT false)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Cross-Tenant Trigger:
  - `trg_check_guest_note_tenant_consistency` executes `check_guest_note_tenant_consistency()` ensuring `guest.property_id = note.property_id`.
- Indexes:
  - `idx_guest_notes_guest_id` on `guest_notes(guest_id)`
  - `idx_guest_notes_property_id` on `guest_notes(property_id)`

### `public.reservations`
Represents hotel reservation contracts and booking commitments.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `confirmation_number` (VARCHAR 50, NOT NULL)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'CONFIRMED', CHECK `status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED')`)
- `booking_source` (VARCHAR 50, NOT NULL DEFAULT 'DIRECT', CHECK `booking_source IN ('DIRECT', 'WALK_IN', 'PHONE', 'EMAIL', 'WEBSITE', 'OTA', 'CORPORATE', 'TRAVEL_AGENT', 'OTHER')`)
- `booked_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `check_in_date` (DATE, NOT NULL)
- `check_out_date` (DATE, NOT NULL)
- `adults` (INTEGER, NOT NULL DEFAULT 1, CHECK `adults >= 1`)
- `children` (INTEGER, NOT NULL DEFAULT 0, CHECK `children >= 0`)
- `special_requests` (TEXT, NULLABLE)
- `internal_notes` (TEXT, NULLABLE)
- `primary_guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE RESTRICT)
- `total_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0.00, CHECK `total_amount >= 0`)
- `currency` (VARCHAR 10, NOT NULL DEFAULT 'INR')
- `cancellation_reason` (TEXT, NULLABLE)
- `cancelled_at` (TIMESTAMPTZ, NULLABLE)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints:
  - `uq_reservations_property_confirmation`: `UNIQUE(property_id, confirmation_number)`
  - `chk_reservations_dates`: `CHECK (check_in_date < check_out_date)`
  - `chk_reservations_adults`: `CHECK (adults >= 1)`
  - `chk_reservations_children`: `CHECK (children >= 0)`
  - `chk_reservations_total_amount`: `CHECK (total_amount >= 0)`
- Cross-Tenant Consistency Triggers:
  - `trg_check_reservation_tenant_consistency` executes `fn_check_reservation_tenant_consistency()` to ensure `primary_guest_id` belongs to the exact same `property_id`.
  - `trg_sync_reservation_to_rooms` executes `fn_sync_reservation_to_rooms()` on dates/status updates to propagate dates and cancellation flag to child rooms.
- Server-side generator:
  - `generate_reservation_confirmation_number(p_property_id UUID)` returns human-friendly formatted codes like `STH-26-000001` using a server sequence.
- Indexes:
  - `idx_reservations_property_id` on `reservations(property_id)`
  - `idx_reservations_property_conf` on `reservations(property_id, confirmation_number)`
  - `idx_reservations_property_status` on `reservations(property_id, status)`
  - `idx_reservations_property_dates` on `reservations(property_id, check_in_date, check_out_date)`
  - `idx_reservations_primary_guest` on `reservations(property_id, primary_guest_id)`

### `public.reservation_rooms`
Represents individual room line-items inside a reservation, allowing multi-room bookings and decoupling requested room type from physical room allocation.
- `id` (UUID, Primary Key, gen_random_uuid())
- `reservation_id` (UUID, NOT NULL, FOREIGN KEY references public.reservations(id) ON DELETE CASCADE)
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `room_type_id` (UUID, NOT NULL, FOREIGN KEY references public.room_types(id) ON DELETE RESTRICT)
- `room_id` (UUID, NULLABLE, FOREIGN KEY references public.rooms(id) ON DELETE SET NULL)
- `adults` (INTEGER, NOT NULL DEFAULT 1, CHECK `adults >= 1`)
- `children` (INTEGER, NOT NULL DEFAULT 0, CHECK `children >= 0`)
- `nightly_rate` (NUMERIC(12,2), NOT NULL DEFAULT 0.00, CHECK `nightly_rate >= 0`)
- `total_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0.00, CHECK `total_amount >= 0`)
- `currency` (VARCHAR 10, NOT NULL DEFAULT 'INR')
- `check_in_date` (DATE, NOT NULL)
- `check_out_date` (DATE, NOT NULL)
- `is_cancelled` (BOOLEAN, NOT NULL DEFAULT false)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- PostgreSQL Concurrency & Exclusion Constraints:
  - `uq_no_overlapping_room_bookings`:
    `EXCLUDE USING gist (room_id WITH =, daterange(check_in_date, check_out_date, '[)') WITH &&) WHERE (room_id IS NOT NULL AND NOT is_cancelled)`
    Guarantees at the database engine level using `btree_gist` that two active reservations can never be assigned the same physical room for overlapping stay date intervals `[check_in, check_out)`.
  - Back-to-back stays (`check_in_date = prior.check_out_date`) do NOT overlap and are permitted seamlessly.
- Cross-Tenant Consistency Triggers:
  - `trg_check_reservation_room_tenant_consistency` executes `fn_check_reservation_room_tenant_consistency()` ensuring parent reservation, room type, and assigned physical room all strictly belong to the same `property_id`.
- Indexes:
  - `idx_res_rooms_reservation_id` on `reservation_rooms(reservation_id)`
  - `idx_res_rooms_property_id` on `reservation_rooms(property_id)`
  - `idx_res_rooms_room_id` on `reservation_rooms(room_id)`
  - `idx_res_rooms_room_type_id` on `reservation_rooms(room_type_id)`
  - `idx_res_rooms_dates` on `reservation_rooms(property_id, check_in_date, check_out_date)`

## 5. Front Desk & Stay Lifecycle Tables (Phase 8)

### `public.stays`
Represents the actual in-house guest physical occupancy lifecycle. Strictly decoupled from commercial reservations and physical room inventory.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `reservation_id` (UUID, NOT NULL, FOREIGN KEY references public.reservations(id) ON DELETE CASCADE)
- `reservation_room_id` (UUID, NULLABLE, FOREIGN KEY references public.reservation_rooms(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE RESTRICT)
- `room_id` (UUID, NOT NULL, FOREIGN KEY references public.rooms(id) ON DELETE RESTRICT)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'EXPECTED', CHECK status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'))
- `actual_check_in_at` (TIMESTAMPTZ, NULLABLE)
- `actual_check_out_at` (TIMESTAMPTZ, NULLABLE)
- `expected_check_out_date` (DATE, NOT NULL)
- `adults` (INTEGER, NOT NULL DEFAULT 1, CHECK `adults >= 1`)
- `children` (INTEGER, NOT NULL DEFAULT 0, CHECK `children >= 0`)
- `notes` (TEXT, NULLABLE)
- `check_in_by` (UUID, NULLABLE, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `check_out_by` (UUID, NULLABLE, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT now())
- `updated_at` (TIMESTAMPTZ, DEFAULT now())
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `updated_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)

#### Integrity & Lifecycle Constraints:
- `chk_stays_checkout_requires_checkin`: `CHECK (actual_check_out_at IS NULL OR actual_check_in_at IS NOT NULL)`
- `chk_stays_checkout_after_checkin`: `CHECK (actual_check_out_at IS NULL OR actual_check_in_at IS NULL OR actual_check_out_at >= actual_check_in_at)`

#### Partial Unique Indexes:
- `idx_stays_unique_active_room`:
  `CREATE UNIQUE INDEX idx_stays_unique_active_room ON public.stays (room_id) WHERE (status = 'CHECKED_IN');`
  Guarantees at the database level that no physical room can ever have more than one simultaneously active `CHECKED_IN` stay.
- `idx_stays_unique_active_reservation_room`:
  `CREATE UNIQUE INDEX idx_stays_unique_active_reservation_room ON public.stays (reservation_room_id) WHERE (status = 'CHECKED_IN');`
  Guarantees that a single reservation room item cannot be checked into multiple stays concurrently.

#### Cross-Tenant Triggers:
- `trg_check_stay_tenant_consistency` executes `check_stay_tenant_consistency()` ensuring:
  - `stay.property_id = reservation.property_id`
  - `stay.property_id = guest.property_id`
  - `stay.property_id = room.property_id`
  - `stay.property_id = reservation_room.property_id`

#### Room Occupancy Invariant Trigger:
- `trg_check_room_occupancy_invariant`:
  Defined as a `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` on `public.rooms`.
  Enforces the core operational invariant: A room can only be in status `OCCUPIED` if there is an active `CHECKED_IN` stay record associated with it. Directly setting a room to `OCCUPIED` without a corresponding active stay is rejected at transaction commit.

#### Atomic RPCs:
1. `public.check_in_reservation_room(p_reservation_room_id UUID, p_room_id UUID, p_property_id UUID, p_adults INTEGER, p_children INTEGER, p_notes TEXT, p_is_early BOOLEAN) RETURNS JSONB`
   - Validates caller role and property membership.
   - Validates reservation is `CONFIRMED`.
   - Validates room is active, not `OUT_OF_ORDER`, not `OUT_OF_SERVICE`, and not already `OCCUPIED`.
   - Validates early arrival against current date; requires `p_is_early = true` if arriving before scheduled check-in date.
   - Updates `reservation_rooms.room_id` atomically.
   - Inserts stay record with `status = 'CHECKED_IN'`, `actual_check_in_at = now()`.
   - Transitions room status to `OCCUPIED`.
2. `public.check_out_stay(p_stay_id UUID, p_property_id UUID) RETURNS JSONB`
   - Validates caller role and property membership.
   - Validates stay is in status `CHECKED_IN`.
   - Updates stay to `status = 'CHECKED_OUT'`, sets `actual_check_out_at = now()`.
   - Transitions physical room status to `DIRTY` (starting housekeeping cycle; never directly `AVAILABLE`).
   - Automatically checks if all reservation rooms under the parent reservation are completed; if so, sets reservation `status = 'COMPLETED'`.
3. `public.mark_reservation_no_show(p_reservation_id UUID, p_property_id UUID, p_reason TEXT) RETURNS JSONB`
   - Sets reservation `status = 'NO_SHOW'`.
   - Sets `reservation_rooms.is_cancelled = true`, releasing PostgreSQL GiST exclusion constraint and freeing physical room inventory.
   - Sets any unfulfilled stays to `status = 'NO_SHOW'`.

---

## 6. Housekeeping Management Entities (Phase 10)

### `public.housekeeping_tasks`
Represents operational room cleaning, turndown, deep clean, and inspection tasks.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `room_id` (UUID, NOT NULL, FOREIGN KEY references public.rooms(id) ON DELETE CASCADE)
- `task_type` (VARCHAR 50, NOT NULL DEFAULT 'CLEANING', CHECK IN ('CLEANING', 'DEEP_CLEAN', 'TURNDOWN', 'INSPECTION', 'LINEN_CHANGE', 'TOUCHUP'))
- `status` (VARCHAR 50, NOT NULL DEFAULT 'PENDING', CHECK IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING', 'COMPLETED', 'CANCELLED'))
- `priority` (VARCHAR 20, NOT NULL DEFAULT 'NORMAL', CHECK IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
- `assigned_to` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `scheduled_for` (DATE, NOT NULL DEFAULT CURRENT_DATE)
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `cancelled_at` (TIMESTAMPTZ)
- `notes` (TEXT)
- `created_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `completed_by` (UUID, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### Partial Unique Indexes:
- `idx_unique_active_housekeeping_task`:
  `CREATE UNIQUE INDEX idx_unique_active_housekeeping_task ON public.housekeeping_tasks (room_id, task_type) WHERE (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING'));`
  Enforces idempotency and prevents duplicate open tasks for the same room and task type.

### `public.housekeeping_inspections`
Supervisor quality control inspection audit records.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `housekeeping_task_id` (UUID, NOT NULL, FOREIGN KEY references public.housekeeping_tasks(id) ON DELETE CASCADE)
- `room_id` (UUID, NOT NULL, FOREIGN KEY references public.rooms(id) ON DELETE CASCADE)
- `inspector_id` (UUID, NOT NULL, FOREIGN KEY references auth.users(id))
- `result` (VARCHAR 20, NOT NULL, CHECK IN ('PASSED', 'FAILED'))
- `notes` (TEXT)
- `inspected_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### Cross-Tenant and Invariant Triggers:
- `trg_check_housekeeping_task_tenant`: Enforces that the room belongs to the same property and that assigned staff has active membership in the property.
- `trg_check_housekeeping_inspection_tenant`: Enforces that the inspection, task, room, and inspector all belong to the same property.

#### Atomic Operational RPCs:
1. `public.create_housekeeping_task(p_property_id, p_room_id, p_task_type, p_priority, p_assigned_to, p_notes, p_scheduled_for)`:
   - Idempotently creates or reuses active task for room.
2. `public.assign_housekeeping_task(p_task_id, p_property_id, p_assigned_to, p_priority)`:
   - Assigns task to staff member and updates priority.
3. `public.start_housekeeping_task(p_task_id, p_property_id)`:
   - Sets task to `IN_PROGRESS`, `started_at = now()`, transitions room operational and housekeeping status to `CLEANING` (if not `OCCUPIED`).
4. `public.complete_housekeeping_task(p_task_id, p_property_id, p_notes)`:
   - Sets task to `INSPECTION_PENDING`, `completed_at = now()`, transitions room operational status to `INSPECTED` and housekeeping status to `INSPECTION_PENDING`.
5. `public.pass_housekeeping_inspection(p_task_id, p_property_id, p_notes)`:
   - Logs inspection record as `PASSED`, sets task to `COMPLETED`, transitions room housekeeping status to `CLEAN` and operational status to `AVAILABLE` (unless room is currently `OCCUPIED`, `OUT_OF_ORDER`, or `OUT_OF_SERVICE`).
6. `public.fail_housekeeping_inspection(p_task_id, p_property_id, p_notes)`:
   - Logs inspection record as `FAILED`, returns task to `IN_PROGRESS` with `priority = 'HIGH'` for re-clean, sets room operational and housekeeping status to `DIRTY` (never `AVAILABLE`).

---

### 7. Maintenance Management (Phase 11)

#### `public.maintenance_assets`
Physical hotel equipment and assets (AC units, elevators, water heaters, kitchen appliances, generators) tracked for servicing.

- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `room_id` (UUID, FK -> rooms, NULL for property-wide facilities)
- `name` (VARCHAR 255, NOT NULL)
- `asset_type` (VARCHAR 100, NOT NULL)
- `serial_number` (VARCHAR 100)
- `status` (VARCHAR 50, DEFAULT 'OPERATIONAL', CHECK IN ('OPERATIONAL', 'DEGRADED', 'OUT_OF_SERVICE', 'IN_REPAIR', 'DECOMMISSIONED'))
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### `public.maintenance_work_orders`
Operational tickets for equipment failures, repairs, defects, and facility maintenance.

- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `room_id` (UUID, FK -> rooms, NULL for facility-wide areas)
- `asset_id` (UUID, FK -> maintenance_assets, NULL)
- `title` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `category` (VARCHAR 50, NOT NULL, CHECK IN ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'FURNITURE', 'LIGHTING', 'DOOR_LOCK', 'TV', 'WIFI_NETWORK', 'CIVIL', 'SAFETY', 'OTHER'))
- `priority` (VARCHAR 20, NOT NULL DEFAULT 'NORMAL', CHECK IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
- `status` (VARCHAR 30, NOT NULL DEFAULT 'OPEN', CHECK IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'CANCELLED'))
- `reported_by` (UUID, FK -> profiles, NOT NULL)
- `assigned_to` (UUID, FK -> profiles, NULL)
- `reported_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `scheduled_for` (TIMESTAMPTZ, NULL)
- `started_at` (TIMESTAMPTZ, NULL)
- `resolved_at` (TIMESTAMPTZ, NULL)
- `closed_at` (TIMESTAMPTZ, NULL)
- `resolution_notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### `public.maintenance_work_order_events`
Immutable audit log tracking all status transitions, technician assignments, hold reasons, and operational notes.

- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `work_order_id` (UUID, FK -> maintenance_work_orders, NOT NULL)
- `event_type` (VARCHAR 50, NOT NULL, CHECK IN ('CREATED', 'ASSIGNED', 'STARTED', 'PUT_ON_HOLD', 'RESUMED', 'RESOLVED', 'CLOSED', 'CANCELLED', 'REOPENED', 'PRIORITY_CHANGED', 'NOTE_ADDED'))
- `from_status` (VARCHAR 30, NULL)
- `to_status` (VARCHAR 30, NULL)
- `performed_by` (UUID, FK -> profiles, NOT NULL)
- `notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### `public.maintenance_schedules`
Lightweight preventive maintenance schedules.

- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `asset_id` (UUID, FK -> maintenance_assets, NULL)
- `room_id` (UUID, FK -> rooms, NULL)
- `title` (VARCHAR 255, NOT NULL)
- `description` (TEXT, NULL)
- `frequency` (VARCHAR 50, NOT NULL, CHECK IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'))
- `next_due_at` (TIMESTAMPTZ, NOT NULL)
- `active` (BOOLEAN, NOT NULL DEFAULT true)
- `created_by` (UUID, FK -> profiles, NOT NULL)
- `updated_by` (UUID, FK -> profiles, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### Cross-Tenant and Invariant Triggers:
- `trg_check_maintenance_asset_tenant`: Enforces that `asset.room_id` belongs to the same property.
- `trg_check_maintenance_work_order_tenant`: Enforces that `room_id`, `asset_id`, `assigned_to`, and `reported_by` all match `work_order.property_id`.
- `trg_check_maintenance_event_tenant`: Enforces matching property ID on audit event stream.
- `trg_check_maintenance_schedule_tenant`: Enforces matching property ID on preventive schedules.

#### Atomic Maintenance RPCs:
1. `create_maintenance_work_order(...)`: Creates work order, records initial `CREATED` event, and auto-transitions to `ASSIGNED` if technician specified.
2. `assign_maintenance_work_order(...)`: Assigns technician and updates due date.
3. `start_maintenance_work_order(...)`: Transitions to `IN_PROGRESS` and logs start timestamp.
4. `hold_maintenance_work_order(...)`: Transitions to `ON_HOLD` requiring mandatory hold justification.
5. `resume_maintenance_work_order(...)`: Transitions back to `IN_PROGRESS`.
6. `resolve_maintenance_work_order(...)`: Transitions to `RESOLVED`, requiring mandatory resolution notes. **Crucially: Does NOT overwrite occupied stays to AVAILABLE.**
7. `close_maintenance_work_order(...)`: Administratively closes ticket.
8. `reopen_maintenance_work_order(...)`: Reopens closed/cancelled ticket back to `OPEN`.
9. `cancel_maintenance_work_order(...)`: Cancels work order.
10. `update_maintenance_work_order_priority(...)`: Updates operational priority.
541: 11. `add_maintenance_work_order_note(...)`: Appends internal note to audit log.
542: 12. `set_room_maintenance_status(...)`: Management-authorized override to transition rooms to `OUT_OF_ORDER` / `OUT_OF_SERVICE` or back to service.
543: 
---

## 9. Restaurant POS & Operations Entities (Phase 12)

### `public.restaurants`
Represents a food & beverage dining outlet operated by the hotel property.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `name` (VARCHAR 255, NOT NULL)
- `code` (VARCHAR 50, NOT NULL)
- `description` (TEXT)
- `currency` (VARCHAR 10, DEFAULT 'INR')
- `timezone` (VARCHAR 100, DEFAULT 'Asia/Kolkata')
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (property_id, code)`

### `public.restaurant_areas`
Represents physical dining sections within a restaurant outlet (e.g. Main Dining, Terrace, Sky Bar).
- `id` (UUID, PK)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `name` (VARCHAR 100, NOT NULL)
- `description` (TEXT)
- `display_order` (INTEGER, DEFAULT 0)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.restaurant_tables`
Represents dining tables within a dining area.
- `id` (UUID, PK)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `area_id` (UUID, FK -> restaurant_areas, NOT NULL)
- `table_number` (VARCHAR 50, NOT NULL)
- `display_name` (VARCHAR 100)
- `capacity` (INTEGER, DEFAULT 2, CHECK capacity >= 1)
- `status` (VARCHAR 50, DEFAULT 'AVAILABLE', CHECK status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE'))
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (restaurant_id, table_number)`

### `public.menu_categories`
Represents restaurant-specific menu sections (e.g. Starters, Main Course, Desserts).
- `id` (UUID, PK)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `name` (VARCHAR 100, NOT NULL)
- `description` (TEXT)
- `display_order` (INTEGER, DEFAULT 0)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.menu_items`
Food & beverage menu items with strict decimal pricing.
- `id` (UUID, PK)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `category_id` (UUID, FK -> menu_categories, NOT NULL)
- `name` (VARCHAR 255, NOT NULL)
- `short_name` (VARCHAR 100)
- `description` (TEXT)
- `sku` (VARCHAR 100)
- `price` (NUMERIC(12,2), NOT NULL, CHECK price >= 0)
- `currency` (VARCHAR 10, DEFAULT 'INR')
- `is_available` (BOOLEAN, DEFAULT true)
- `is_active` (BOOLEAN, DEFAULT true)
- `display_order` (INTEGER, DEFAULT 0)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.restaurant_orders`
Restaurant POS orders ledger capturing transaction type, dining table, and server-validated totals.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `table_id` (UUID, FK -> restaurant_tables, NULL for takeaway)
- `order_number` (VARCHAR 50, UNIQUE, NOT NULL)
- `order_type` (VARCHAR 50, NOT NULL, CHECK order_type IN ('DINE_IN', 'TAKEAWAY', 'ROOM_SERVICE', 'DELIVERY'))
- `status` (VARCHAR 50, NOT NULL, CHECK status IN ('DRAFT', 'OPEN', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'))
- `guest_id` (UUID, FK -> guests, NULL)
- `stay_id` (UUID, FK -> stays, NULL)
- `created_by` (UUID, FK -> profiles, NOT NULL)
- `assigned_to` (UUID, FK -> profiles, NULL)
- `notes` (TEXT)
- `subtotal` (NUMERIC(12,2), NOT NULL DEFAULT 0, CHECK subtotal >= 0)
- `discount_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0, CHECK discount_amount >= 0)
- `tax_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0, CHECK tax_amount >= 0)
- `service_charge_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0, CHECK service_charge_amount >= 0)
- `total_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0, CHECK total_amount >= 0)
- `currency` (VARCHAR 10, DEFAULT 'INR')
- `completed_at`, `cancelled_at` (TIMESTAMPTZ, NULL)
- `cancelled_by` (UUID, FK -> profiles, NULL)
- `cancellation_reason` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.restaurant_order_items`
Snapshot line items preserving sold item name and price against future menu edits.
- `id` (UUID, PK)
- `order_id` (UUID, FK -> restaurant_orders ON DELETE CASCADE, NOT NULL)
- `menu_item_id` (UUID, FK -> menu_items ON DELETE RESTRICT, NOT NULL)
- `item_name` (VARCHAR 255, NOT NULL) - **Immutable Snapshot**
- `unit_price` (NUMERIC(12,2), NOT NULL) - **Immutable Snapshot**
- `quantity` (INTEGER, NOT NULL DEFAULT 1, CHECK quantity >= 1)
- `discount_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0)
- `tax_amount` (NUMERIC(12,2), NOT NULL DEFAULT 0)
- `line_total` (NUMERIC(12,2), NOT NULL)
- `notes` (TEXT)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'PENDING', CHECK status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'SERVED'))
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.restaurant_order_events`
Audit trail recording all order lifecycle events and status transitions.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `order_id` (UUID, FK -> restaurant_orders ON DELETE CASCADE, NOT NULL)
- `event_type` (VARCHAR 50, NOT NULL)
- `from_status`, `to_status` (VARCHAR 50)
- `performed_by` (UUID, FK -> profiles, NOT NULL)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT now())

#### Cross-Tenant Consistency Triggers:
- `trg_check_restaurant_table_tenant`: Ensures table `area_id` belongs to the same restaurant.
- `trg_check_menu_item_tenant`: Ensures menu item `category_id` belongs to the same restaurant.
- `trg_check_restaurant_order_tenant`: Ensures order `property_id`, `restaurant_id`, `table_id`, `guest_id`, and `stay_id` are 100% property and restaurant consistent.
- `trg_check_restaurant_order_item_tenant`: Ensures order line item references a valid menu item from the same restaurant.
- `trg_check_restaurant_order_event_tenant`: Ensures audit events match order property bounds.

#### Atomic Restaurant RPCs:
1. `generate_restaurant_order_number()`: Atomic `POS-YY-XXXXXX` sequence generation.
2. `create_restaurant_order(...)`: Validates items, snapshots prices, computes financial totals, creates order & items, marks table `OCCUPIED`, and creates audit record.
3. `confirm_restaurant_order(...)`: Transitions order from `OPEN` to `CONFIRMED`.
4. `complete_restaurant_order(...)`: Completes order, updates `completed_at`, and frees table back to `AVAILABLE`.
5. `cancel_restaurant_order(...)`: Cancels order with mandatory reason, updates `cancelled_at`, and frees table back to `AVAILABLE`.
6. `set_restaurant_table_status(...)`: Sets table status (`AVAILABLE`, `CLEANING`, `OUT_OF_SERVICE`, etc.).

## 10. Kitchen Display System (KDS) & Kitchen Production (Phase 13)

### `public.kitchen_stations`
Represents physical kitchen prep/production stations (e.g., Hot Kitchen, Cold Kitchen, Bar, Bakery, Dessert) configured per restaurant.
- `id` (UUID, PK)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `name` (VARCHAR 100, NOT NULL)
- `code` (VARCHAR 50, NOT NULL)
- `description` (TEXT)
- `display_order` (INTEGER, DEFAULT 0)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (restaurant_id, code)`

### `public.menu_item_kitchen_stations`
Configures production station routing for menu items.
- `id` (UUID, PK)
- `menu_item_id` (UUID, FK -> menu_items ON DELETE CASCADE, NOT NULL)
- `kitchen_station_id` (UUID, FK -> kitchen_stations ON DELETE CASCADE, NOT NULL)
- `is_primary` (BOOLEAN, DEFAULT true)
- `display_order` (INTEGER, DEFAULT 0)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())
- Constraints: `UNIQUE (menu_item_id, kitchen_station_id)`

### `public.kitchen_tickets`
Represents kitchen production tickets generated when restaurant POS orders are confirmed.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `restaurant_id` (UUID, FK -> restaurants, NOT NULL)
- `restaurant_order_id` (UUID, FK -> restaurant_orders ON DELETE CASCADE, NOT NULL)
- `ticket_number` (VARCHAR 50, UNIQUE, NOT NULL) - e.g. `KDS-26-000001`
- `status` (VARCHAR 50, NOT NULL DEFAULT 'QUEUED', CHECK status IN ('QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'))
- `priority` (VARCHAR 50, NOT NULL DEFAULT 'NORMAL', CHECK priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
- `fired_at` (TIMESTAMPTZ, DEFAULT now())
- `started_at` (TIMESTAMPTZ, NULL)
- `ready_at` (TIMESTAMPTZ, NULL)
- `completed_at` (TIMESTAMPTZ, NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.kitchen_ticket_items`
Individual line items on kitchen production tickets with station routing and preparation lifecycles.
- `id` (UUID, PK)
- `kitchen_ticket_id` (UUID, FK -> kitchen_tickets ON DELETE CASCADE, NOT NULL)
- `restaurant_order_item_id` (UUID, FK -> restaurant_order_items ON DELETE RESTRICT, NOT NULL)
- `station_id` (UUID, FK -> kitchen_stations ON DELETE SET NULL, NULL for unrouted)
- `item_name` (VARCHAR 255, NOT NULL) - **Immutable Production Snapshot**
- `quantity` (INTEGER, NOT NULL, CHECK quantity >= 1) - **Immutable Production Snapshot**
- `notes` (TEXT)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'QUEUED', CHECK status IN ('QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REMAKE'))
- `started_at` (TIMESTAMPTZ, NULL)
- `ready_at` (TIMESTAMPTZ, NULL)
- `completed_at` (TIMESTAMPTZ, NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.kitchen_ticket_events`
Immutable audit event stream for all kitchen ticket and item production state transitions.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `kitchen_ticket_id` (UUID, FK -> kitchen_tickets ON DELETE CASCADE, NOT NULL)
- `kitchen_ticket_item_id` (UUID, FK -> kitchen_ticket_items ON DELETE SET NULL, NULL for ticket-level events)
- `event_type` (VARCHAR 50, NOT NULL) - e.g. `TICKET_CREATED`, `ITEM_STARTED`, `ITEM_READY`, `TICKET_READY`, `ITEM_COMPLETED`, `TICKET_COMPLETED`, `ITEM_REQUEUED`, `ITEM_REMADE`, `PRIORITY_CHANGED`, `TICKET_CANCELLED`, `ITEM_CANCELLED`
- `from_status`, `to_status` (VARCHAR 50)
- `performed_by` (UUID, FK -> profiles, NOT NULL)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT now())

#### Cross-Tenant Consistency Triggers:
- `trg_check_menu_item_kitchen_station_tenant`: Ensures `menu_item.restaurant_id = kitchen_station.restaurant_id`.
- `trg_check_kitchen_ticket_tenant`: Ensures `kitchen_ticket.property_id` & `restaurant_id` match `restaurant_order.property_id` & `restaurant_id`.
- `trg_check_kitchen_ticket_item_tenant`: Ensures ticket items belong to the same restaurant as the ticket and station.
- `trg_check_kitchen_ticket_event_tenant`: Enforces tenant consistency for all kitchen audit records.

#### Atomic Kitchen RPCs:
1. `generate_kitchen_ticket_number()`: Atomic `KDS-YY-XXXXXX` sequence generation.
2. `create_or_fire_kitchen_ticket(p_order_id, p_property_id, p_performed_by, p_priority)`: Idempotent ticket creation & station routing upon order confirmation.
3. `start_kitchen_ticket_item(p_ticket_item_id, p_property_id, p_performed_by)`: Transitions item to `IN_PROGRESS` and syncs ticket state.
4. `ready_kitchen_ticket_item(p_ticket_item_id, p_property_id, p_performed_by)`: Transitions item to `READY` and recalculates ticket readiness.
5. `complete_kitchen_ticket_item(p_ticket_item_id, p_property_id, p_performed_by)`: Transitions item to `COMPLETED` and marks ticket `COMPLETED` when all active items finish.
6. `requeue_kitchen_ticket_item(p_ticket_item_id, p_property_id, p_performed_by, p_notes)`: Transitions item from `IN_PROGRESS` back to `QUEUED`.
7. `remake_kitchen_ticket_item(p_ticket_item_id, p_property_id, p_performed_by, p_reason)`: Marks item `REMAKE`, resets timestamps, and syncs ticket status.
8. `update_kitchen_ticket_priority(p_ticket_id, p_property_id, p_priority, p_performed_by)`: Updates ticket priority level (`LOW`, `NORMAL`, `HIGH`, `URGENT`).

## 11. QR Guest Portal & Secure Guest Sessions (Phase 14)

### `public.guest_qr_codes`
Represents physical QR access points across hotel guest rooms and public hotel directories.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `qr_type` (VARCHAR 50, NOT NULL, CHECK `qr_type IN ('ROOM', 'HOTEL_GENERAL', 'RESTAURANT_TABLE', 'OTHER')`)
- `room_id` (UUID, FK -> rooms, NULLABLE)
- `restaurant_table_id` (UUID, FK -> restaurant_tables, NULLABLE)
- `name` (VARCHAR 255, NOT NULL)
- `token_hash` (VARCHAR 64, NOT NULL UNIQUE) - **SHA-256 Hashed Token** (Raw token is never stored in DB)
- `is_active` (BOOLEAN, NOT NULL DEFAULT true)
- `expires_at` (TIMESTAMPTZ, NULLABLE)
- `created_by`, `updated_by` (UUID, FK -> profiles, NULLABLE)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

### `public.guest_sessions`
Temporary, high-entropy guest portal sessions bound to verified stays and property boundaries.
- `id` (UUID, PK)
- `property_id` (UUID, FK -> properties, NOT NULL)
- `qr_code_id` (UUID, FK -> guest_qr_codes, NULLABLE)
- `room_id` (UUID, FK -> rooms, NULLABLE)
- `guest_id` (UUID, FK -> guests, NULLABLE)
- `stay_id` (UUID, FK -> stays, NULLABLE)
- `session_type` (VARCHAR 50, NOT NULL DEFAULT 'VERIFIED_STAY', CHECK `session_type IN ('VERIFIED_STAY', 'PUBLIC_HOTEL')`)
- `session_token_hash` (VARCHAR 64, NOT NULL UNIQUE) - **SHA-256 Hashed Token**
- `verification_method` (VARCHAR 50, NOT NULL DEFAULT 'CONFIRMATION_CODE', CHECK `verification_method IN ('CONFIRMATION_CODE', 'LASTNAME_CONFIRMATION', 'PUBLIC_ACCESS', 'FRONT_DESK_DIRECT')`)
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `last_seen_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `revoked_at` (TIMESTAMPTZ, NULLABLE)
- `created_ip_hash` (VARCHAR 64, NULLABLE)
- `user_agent_summary` (TEXT, NULLABLE)
- `created_at`, `updated_at` (TIMESTAMPTZ, DEFAULT now())

#### Cross-Tenant Consistency Triggers:
- `trg_check_guest_qr_code_tenant`: Ensures assigned `room_id` or `restaurant_table_id` belongs to the specified `property_id`.
- `trg_check_guest_session_tenant`: Ensures `stay_id`, `guest_id`, and `room_id` are strictly consistent with `session.property_id`.

#### Atomic Guest Portal RPCs:
1. `create_guest_qr_code(...)`: Creates a new access point with hashed token.
2. `rotate_guest_qr_code(...)`: Atomically rotates QR token hash, invalidating previous code.
3. `deactivate_guest_qr_code(...)`: Deactivates QR access point.
4. `resolve_guest_qr_access(p_token_hash)`: Resolves QR type and room context with zero guest PII disclosure.
5. `verify_and_create_guest_session(...)`: Validates confirmation number against current checked-in stay and issues a guest session.
6. `validate_guest_session(p_session_token_hash)`: Validates session token and active checked-in status; returns only guest-safe context.
7. `revoke_guest_session(p_session_id, p_property_id)`: Revokes active guest session.

## 12. QR Food Ordering & Guest Services (Phase 15)

### `public.restaurant_orders` (Extended)
- `room_id` (UUID, FOREIGN KEY references public.rooms(id), NULLABLE) - Explicitly links room service orders to the destination room.
- `order_type` supports `ROOM_SERVICE` in addition to `DINE_IN`, `TAKEAWAY`, `DELIVERY`.

### `public.guest_service_requests`
Represents guest-initiated service requests submitted via the mobile Guest Portal.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE RESTRICT)
- `stay_id` (UUID, NOT NULL, FOREIGN KEY references public.stays(id) ON DELETE CASCADE)
- `room_id` (UUID, NOT NULL, FOREIGN KEY references public.rooms(id) ON DELETE RESTRICT)
- `category` (VARCHAR 50, NOT NULL, CHECK `category IN ('HOUSEKEEPING', 'FRONT_DESK', 'CONCIERGE', 'MAINTENANCE', 'LAUNDRY', 'SPA', 'TRANSPORT', 'ROOM_SERVICE', 'OTHER')`)
- `request_type` (VARCHAR 100, NOT NULL)
- `title` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `priority` (VARCHAR 20, NOT NULL DEFAULT 'MEDIUM', CHECK `priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'SUBMITTED', CHECK `status IN ('SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED')`)
- `assigned_to` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id) ON DELETE SET NULL)
- `assigned_department` (VARCHAR 50, NULLABLE)
- `requested_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `started_at` (TIMESTAMPTZ, NULLABLE)
- `completed_at` (TIMESTAMPTZ, NULLABLE)
- `cancelled_at` (TIMESTAMPTZ, NULLABLE)
- `guest_visible_notes` (TEXT, NULLABLE)
- `staff_notes` (TEXT, NULLABLE)
- `created_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `updated_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

### `public.guest_service_request_events`
Immutable event history tracking all operational and lifecycle state transitions for guest service requests.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `request_id` (UUID, NOT NULL, FOREIGN KEY references public.guest_service_requests(id) ON DELETE CASCADE)
- `event_type` (VARCHAR 50, NOT NULL)
- `from_status` (VARCHAR 50, NULLABLE)
- `to_status` (VARCHAR 50, NULLABLE)
- `actor_type` (VARCHAR 20, NOT NULL CHECK `actor_type IN ('GUEST', 'STAFF', 'SYSTEM')`)
- `actor_profile_id` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id) ON DELETE SET NULL)
- `event_note` (TEXT, NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

#### Cross-Tenant Consistency Triggers:
- `trg_check_guest_service_request_tenant`: Enforces that `guest_id`, `stay_id`, and `room_id` belong to the same `property_id`.
- `trg_prevent_guest_srv_req_events_mutation`: Strict immutability trigger preventing modification or direct row deletion of audit timeline events.

#### Atomic Phase 15 RPCs:
1. `create_guest_food_order(...)`: Validates session, calculates authoritative prices, creates POS order & items, and routes to KDS.
2. `get_guest_food_orders(...)`: Returns room service order history for the active session.
3. `get_guest_food_order_detail(...)`: Returns items and preparation status for an order within the active session.
4. `create_guest_service_request(...)`: Validates session and creates a new guest service request with audit event.
5. `get_guest_service_requests(...)`: Returns active and past requests submitted during the active guest session.
6. `get_guest_service_request_detail(...)`: Returns sanitized details and notes for a request belonging to the session.
7. `cancel_guest_service_request(...)`: Allows guest to cancel open requests prior to completion.
8. `staff_acknowledge_guest_request(...)`: Staff acknowledgement transition (`SUBMITTED` -> `ACKNOWLEDGED`).
9. `staff_assign_guest_request(...)`: Staff assignment to target department and staff member.
10. `staff_start_guest_request(...)`: Staff begins work (`ASSIGNED`/`ACKNOWLEDGED` -> `IN_PROGRESS`).
11. `staff_complete_guest_request(...)`: Staff completes request and attaches optional guest-visible completion message.
12. `staff_cancel_guest_request(...)`: Staff cancellation transition.
13. `staff_reject_guest_request(...)`: Staff rejection transition.

## 13. Billing, Payments & Guest Folios (Phase 16)

### `public.guest_folios`
Master financial ledger folio for active stays.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `stay_id` (UUID, NOT NULL, FOREIGN KEY references public.stays(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE RESTRICT)
- `reservation_id` (UUID, NULLABLE, FOREIGN KEY references public.reservations(id) ON DELETE SET NULL)
- `folio_number` (VARCHAR 50, NOT NULL, UNIQUE, e.g. `FOL-26-000101`)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'OPEN', CHECK `status IN ('OPEN', 'SETTLED', 'CLOSED', 'VOID')`)
- `currency` (VARCHAR 3, NOT NULL DEFAULT 'INR')
- `opened_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `closed_at` (TIMESTAMPTZ, NULLABLE)
- `created_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `updated_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())

### `public.folio_charges`
Individual charge line items posted to a guest folio.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `folio_id` (UUID, NOT NULL, FOREIGN KEY references public.guest_folios(id) ON DELETE CASCADE)
- `stay_id` (UUID, NOT NULL, FOREIGN KEY references public.stays(id) ON DELETE CASCADE)
- `charge_type` (VARCHAR 50, NOT NULL, CHECK `charge_type IN ('ROOM', 'RESTAURANT', 'ROOM_SERVICE', 'LAUNDRY', 'SPA', 'MINIBAR', 'PARKING', 'LATE_CHECKOUT', 'EARLY_CHECKIN', 'DAMAGE', 'MISCELLANEOUS', 'MANUAL')`)
- `source_id` (UUID, NULLABLE)
- `description` (TEXT, NOT NULL)
- `quantity` (NUMERIC 10,2, NOT NULL DEFAULT 1.00)
- `unit_price` (NUMERIC 12,2, NOT NULL)
- `subtotal` (NUMERIC 12,2, NOT NULL)
- `discount_amount` (NUMERIC 12,2, NOT NULL DEFAULT 0.00)
- `tax_rate` (NUMERIC 5,2, NOT NULL DEFAULT 0.00)
- `tax_amount` (NUMERIC 12,2, NOT NULL DEFAULT 0.00)
- `total_amount` (NUMERIC 12,2, NOT NULL)
- `charge_date` (DATE, NOT NULL DEFAULT CURRENT_DATE)
- `posted_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `posted_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `voided_at` (TIMESTAMPTZ, NULLABLE)
- `void_reason` (TEXT, NULLABLE)
- `voided_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))

### `public.folio_payments`
Payment transactions recorded against a guest folio.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `folio_id` (UUID, NOT NULL, FOREIGN KEY references public.guest_folios(id) ON DELETE CASCADE)
- `stay_id` (UUID, NOT NULL, FOREIGN KEY references public.stays(id) ON DELETE CASCADE)
- `guest_id` (UUID, NOT NULL, FOREIGN KEY references public.guests(id) ON DELETE RESTRICT)
- `payment_reference` (VARCHAR 50, NOT NULL, UNIQUE, e.g. `PAY-26-000101`)
- `payment_method` (VARCHAR 50, NOT NULL, CHECK `payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE', 'WALLET', 'OTHER')`)
- `amount` (NUMERIC 12,2, NOT NULL, CHECK `amount > 0`)
- `currency` (VARCHAR 3, NOT NULL DEFAULT 'INR')
- `status` (VARCHAR 50, NOT NULL DEFAULT 'COMPLETED', CHECK `status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED')`)
- `paid_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `received_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))
- `notes` (TEXT, NULLABLE)

### `public.folio_refunds`
Refund records linked to prior completed payments.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `folio_id` (UUID, NOT NULL, FOREIGN KEY references public.guest_folios(id) ON DELETE CASCADE)
- `payment_id` (UUID, NOT NULL, FOREIGN KEY references public.folio_payments(id) ON DELETE RESTRICT)
- `refund_reference` (VARCHAR 50, NOT NULL, UNIQUE, e.g. `REF-26-000101`)
- `amount` (NUMERIC 12,2, NOT NULL, CHECK `amount > 0`)
- `reason` (TEXT, NOT NULL)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'COMPLETED', CHECK `status IN ('COMPLETED', 'REJECTED')`)
- `refunded_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `processed_by` (UUID, NULLABLE, FOREIGN KEY references public.profiles(id))

### `public.invoices` & `public.invoice_items`
Snapshot printable tax invoices and frozen item lines.
- `invoices`: `invoice_number` (`INV-YY-XXXXXX`), `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `paid_amount`, `balance_due`, `billing_name`, `billing_email`, `billing_address`.
- `invoice_items`: snapshot of charge description, quantity, price, discount, tax, total.

### `public.folio_events`
Append-only financial audit log with row-level trigger `trg_prevent_folio_events_mutation` blocking all mutations.

#### Phase 16 Atomic Stored Procedures:
1. `get_folio_balance(p_folio_id, p_property_id)`: Calculates gross charges, net payments, and balance due.
2. `get_or_create_stay_folio(p_stay_id, p_property_id)`: Resolves or creates primary stay folio.
3. `post_room_charges_for_stay(p_stay_id, p_property_id)`: Idempotently posts calculated room rate charges with GST.
4. `post_restaurant_order_to_folio(p_order_id, p_stay_id, p_property_id)`: Posts completed restaurant order as a folio charge line.
5. `post_manual_folio_charge(...)`: Posts custom incidental charges.
6. `void_folio_charge(p_charge_id, p_property_id, p_reason)`: Voids charge without deleting row.
7. `record_folio_payment(...)`: Records payment and transitions folio to SETTLED if balance <= 0.
8. `refund_folio_payment(...)`: Processes partial/full refund validated against payment total.
9. `generate_invoice(...)`: Generates immutable tax invoice snapshot.
10. `void_invoice(p_invoice_id, p_property_id, p_reason)`: Marks invoice as VOID.
11. `get_guest_folio(p_session_token_hash)`: Guest-safe folio query for verified mobile QR session.
12. `check_out_stay(p_stay_id, p_property_id, p_allow_unpaid_override)`: Enforces zero balance checkout rule, transitions room to DIRTY, and auto-generates cleaning task.

---

## 10. Reporting & Analytics Layer (Phase 19)

Reporting reads directly from authoritative operational tables with property scoping and RLS:
- **Occupancy & Utilization**: `public.rooms`, `public.stays`, `public.reservations`
- **Room Performance**: `public.rooms`, `public.room_types`, `public.folio_charges`
- **Reservations & Demographics**: `public.reservations`, `public.guests`
- **Front Desk Operations**: `public.stays`, `public.rooms`, `public.guests`
- **Revenue & Financial Ledger**: `public.guest_folios`, `public.folio_charges`, `public.folio_payments`, `public.folio_refunds`, `public.invoices`
- **Restaurant & Kitchen**: `public.restaurant_orders`, `public.restaurant_order_items`, `public.kitchen_tickets`, `public.kitchen_ticket_items`
- **Housekeeping & Inspections**: `public.housekeeping_tasks`, `public.housekeeping_inspections`
- **Maintenance & Work Orders**: `public.maintenance_work_orders`
- **Inventory & Suppliers**: `public.inventory_items`, `public.inventory_stock_movements`, `public.suppliers`, `public.purchase_orders`
- **Staff & Expenses**: `public.staff_members`, `public.staff_attendance`, `public.staff_expenses`
- **Guest Services**: `public.guest_service_requests`

---

## 11. AI Business Buddy & Audit Layer (Phase 20)

### `public.ai_audit_logs`
Tracks AI intelligence queries, tool executions, and audit records with strict property isolation:
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `user_id` (UUID, NOT NULL, FOREIGN KEY references auth.users(id) ON DELETE CASCADE)
- `role_code` (VARCHAR 50, NOT NULL)
- `prompt_summary` (VARCHAR 255, NOT NULL)
- `tools_used` (TEXT[], NOT NULL DEFAULT '{}')
- `status` (VARCHAR 50, NOT NULL DEFAULT 'success')
- `duration_ms` (INTEGER, NOT NULL DEFAULT 0)
- `provider` (VARCHAR 50, NOT NULL DEFAULT 'rule-based')
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- RLS Policy: Authenticated property members can insert and view their property audit records. Sensitive prompts and PII are omitted.

---

## 12. Notifications, Integrations & Online Booking Entities (Phase 21)

### `public.notifications`
Centralized notifications table capturing operational alerts, guest notifications, and system events.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `organization_id` (UUID, NOT NULL, FOREIGN KEY references public.organizations(id) ON DELETE CASCADE)
- `user_id` (UUID, NULLABLE, FOREIGN KEY references auth.users(id) ON DELETE SET NULL)
- `recipient_email` (VARCHAR 255, NULLABLE)
- `recipient_phone` (VARCHAR 50, NULLABLE)
- `category` (VARCHAR 50, NOT NULL, CHECK `category IN ('BOOKING', 'CHECK_IN', 'CHECK_OUT', 'PAYMENT', 'INVOICE', 'FOLIO', 'HOUSEKEEPING', 'MAINTENANCE', 'RESTAURANT', 'KITCHEN', 'GUEST_SERVICE', 'INVENTORY', 'STAFF', 'SYSTEM')`)
- `event_type` (VARCHAR 100, NOT NULL)
- `title` (VARCHAR 255, NOT NULL)
- `message` (TEXT, NOT NULL)
- `data` (JSONB, DEFAULT '{}'::jsonb)
- `priority` (VARCHAR 20, NOT NULL DEFAULT 'NORMAL', CHECK `priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')`)
- `status` (VARCHAR 30, NOT NULL DEFAULT 'SENT', CHECK `status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')`)
- `channels` (TEXT[], NOT NULL DEFAULT '{"IN_APP"}')
- `read` (BOOLEAN, NOT NULL DEFAULT false)
- `read_at` (TIMESTAMPTZ, NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `sent_at` (TIMESTAMPTZ, NULLABLE)
- `idempotency_key` (VARCHAR 255, NULLABLE)
- Indexes:
  - `idx_notifications_property_id` on `notifications(property_id)`
  - `idx_notifications_user_read` on `notifications(user_id, read)`
  - `idx_notifications_idempotency` on `notifications(idempotency_key)` WHERE `idempotency_key IS NOT NULL`

### `public.notification_preferences`
Staff user channel preferences by notification category.
- `id` (UUID, Primary Key, gen_random_uuid())
- `user_id` (UUID, NOT NULL, FOREIGN KEY references auth.users(id) ON DELETE CASCADE)
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `category` (VARCHAR 50, NOT NULL)
- `email_enabled` (BOOLEAN, NOT NULL DEFAULT true)
- `sms_enabled` (BOOLEAN, NOT NULL DEFAULT false)
- `whatsapp_enabled` (BOOLEAN, NOT NULL DEFAULT false)
- `in_app_enabled` (BOOLEAN, NOT NULL DEFAULT true)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- Constraints: `UNIQUE (user_id, property_id, category)`

### `public.property_integrations`
Property-specific external integration configurations with server-masked secrets.
- `id` (UUID, Primary Key, gen_random_uuid())
- `property_id` (UUID, NOT NULL, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `integration_id` (VARCHAR 100, NOT NULL)
- `status` (VARCHAR 50, NOT NULL DEFAULT 'INACTIVE', CHECK `status IN ('ACTIVE', 'INACTIVE', 'CONFIGURED', 'ERROR', 'CONNECTED')`)
- `config` (JSONB, NOT NULL DEFAULT '{}'::jsonb)
- `is_enabled` (BOOLEAN, NOT NULL DEFAULT false)
- `last_sync_at` (TIMESTAMPTZ, NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- Constraints: `UNIQUE (property_id, integration_id)`

### `public.property_online_booking_settings`
Property settings for the public direct online booking portal.
- `property_id` (UUID, Primary Key, FOREIGN KEY references public.properties(id) ON DELETE CASCADE)
- `is_enabled` (BOOLEAN, NOT NULL DEFAULT true)
- `public_description` (TEXT, NULLABLE)
- `public_phone` (VARCHAR 50, NULLABLE)
- `public_email` (VARCHAR 255, NULLABLE)
- `cancellation_policy` (TEXT, NOT NULL DEFAULT 'Free cancellation up to 48 hours prior to check-in.')
- `booking_terms` (TEXT, NOT NULL DEFAULT 'Guests must be at least 18 years old.')
- `amenities` (TEXT[], NOT NULL DEFAULT '{"Free Wi-Fi", "Swimming Pool", "Fitness Center", "Spa & Wellness", "Fine Dining", "24/7 Room Service"}')
- `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())
- `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT now())