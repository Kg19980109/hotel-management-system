# StayHub Architecture: Guest CRM & Profile Management (Phase 9)

## 1. Executive Summary

Phase 9 establishes the **Guest CRM & Guest Profile Management Engine** in StayHub. It transforms the initial minimal guest record into a comprehensive, property-scoped hotel CRM without introducing competing tables or fragmenting guest data.

The system empowers hotel staff to manage guest identity, contact details, corporate affiliations, identity documents, room preferences, and internal operational notes, while providing instant access to full reservation and stay histories.

---

## 2. Core Architectural Principles

### 2.1 Single Guest Domain (`public.guests`)
There is strictly **one master guest domain** in the StayHub database: `public.guests`.
- No duplicate master tables (`customers`, `guest_profiles`, `hotel_guests`).
- All past and future modules (Bookings, Front Desk, Housekeeping, Restaurant POS, Folios) reference `public.guests(id)`.
- `reservations.primary_guest_id` and `stays.guest_id` reference `guests.id` with `ON DELETE RESTRICT`.

### 2.2 Property-Scoped CRM & Strict Multi-Tenancy
Guest CRM records are strictly property-scoped:
- A user with access to Property A cannot access, query, search, or mutate guests of Property B.
- Email addresses are NOT globally unique across the platform because two independent properties may have guests with identical email addresses.
- All child tables (`public.guest_preferences`, `public.guest_notes`) are protected by both PostgreSQL Row Level Security (RLS) policies and database consistency triggers.

---

## 3. Data Model & Schema Additions

### 3.1 Extended `public.guests`
The existing `public.guests` table was extended with 17 operational fields:
- **Personal Details**: `title`, `middle_name`, `preferred_name`, `gender`, `date_of_birth`, `nationality`, `preferred_language`.
- **Contact Channels**: `email`, `phone`, `alternate_phone`, `country_code`.
- **Physical Address**: `address_line_1`, `address_line_2`, `city`, `state`, `postal_code`, `country`.
- **Identity Documents**: `id_document_type` (`PASSPORT`, `DRIVERS_LICENSE`, `NATIONAL_ID`, `OTHER`), `id_document_number`, `id_document_country`.
- **Corporate Affiliation**: `company_name`, `job_title`.
- **Operational & Compliance**: `marketing_consent`, `notes`, `status` (`ACTIVE`, `INACTIVE`, `BLOCKED`).

### 3.2 Child Tables & Consistency Triggers

```
┌──────────────────────────────────────────────┐
│                public.guests                 │
│  (id, property_id, first_name, last_name...) │
└──────┬────────────────────────────────┬──────┘
       │ 1:N                            │ 1:N
       ▼                                ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│  public.guest_preferences │    │     public.guest_notes    │
│  - preference_type        │    │  - note (TEXT)            │
│  - preference_value       │    │  - is_pinned (BOOLEAN)    │
│  - notes                  │    │  - created_by, updated_by │
└───────────────────────────┘    └───────────────────────────┘
```

#### Cross-Tenant Consistency Triggers:
1. `trg_check_guest_preference_tenant_consistency` executes `check_guest_preference_tenant_consistency()` ensuring `preference.property_id = guest.property_id`.
2. `trg_check_guest_note_tenant_consistency` executes `check_guest_note_tenant_consistency()` ensuring `note.property_id = guest.property_id`.

---

## 4. Duplicate Guest Detection Engine

Guest duplication is prevented via an interactive warning mechanism rather than silent automatic merging.

### 4.1 Matching Signals
When creating or editing a guest, `checkDuplicateGuests()` matches candidates within the active property on:
1. **Case-Insensitive Email**: `LOWER(email) = LOWER(inputEmail)`
2. **Exact Phone Number**: `phone = inputPhone`
3. **Full Name Matching**: `first_name ILIKE inputFirst AND last_name ILIKE inputLast`

### 4.2 Operator Flow
- If matches are found, the operator is presented with the `DuplicateWarningModal`.
- **Action A**: "Use Existing" — links the booking or context to the existing guest profile.
- **Action B**: "Proceed Creating New Profile Anyway" — explicitly creates a separate profile with the operator's intentional confirmation.
- **Action C**: "Cancel" — returns to the form.

---

## 5. Privacy & Data Protection Model

1. **Identity Document Numbers**: Stored as text metadata only. Not exposed in guest list views, front desk tables, or dashboard summaries. Rendered only on the authorized `/guests/[guestId]` detail page.
2. **Internal Guest Notes**: Filtered strictly for authenticated property staff with `GUEST_MANAGE_NOTES` permission. Never exposed to future guest QR portals or public booking APIs.
3. **Soft Deactivation**: Historical guest records with reservations or stays are NEVER hard deleted (`ON DELETE RESTRICT`). Soft deactivation sets `status = 'INACTIVE'`.

---

## 6. Real-Time History & Statistics Calculation

Guest statistics are computed server-side from actual transactional records:
- **Total Visits**: `stays.length || reservations.length`
- **Total Stays & Completed Stays**: Evaluated from `public.stays` (`status = 'CHECKED_OUT'`).
- **Total Nights**: Sum of `(check_out_date - check_in_date)` for non-cancelled reservations.
- **Returning Guest**: Documented as any guest with `completedStays > 0` or more than 1 historical reservation.
- **Current Stay**: Identified in real-time if an active stay exists with `status = 'CHECKED_IN'`.
- **Upcoming Reservation**: Identified if a future confirmed booking exists with `check_in_date >= today`.

---

## 7. Cross-Module Integration

1. **Bookings (`/bookings/new`)**:
   - Integrated `GuestLookup` (`GuestCombobox`) component.
   - Allows typing to search CRM for existing guests or entering new guest contact details.
   - `createBookingAction` accepts optional `guestId`, locking the reservation directly to `guests.id`.
2. **Booking Details (`/bookings/[bookingId]`)**:
   - Guest profile card directly links guest name to `/guests/[guestId]`.
3. **Front Desk (`/front-desk`)**:
   - Arrivals, Departures, and In-House tables link guest names to `/guests/[guestId]`.
   - Added direct "View Guest Profile" action buttons.
4. **Stay Details (`/front-desk/stays/[stayId]`)**:
   - Guest Information card links directly to `/guests/[guestId]`.
