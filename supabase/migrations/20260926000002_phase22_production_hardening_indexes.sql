-- ==============================================================================
-- STAYHUB — PHASE 22: PRODUCTION HARDENING & PERFORMANCE OPTIMIZATION INDEXES
-- ==============================================================================

-- 1. High-volume reservation and stay availability searches
CREATE INDEX IF NOT EXISTS idx_reservations_property_dates_status
  ON reservations (property_id, check_in_date, check_out_date, status);

CREATE INDEX IF NOT EXISTS idx_stays_property_dates_status
  ON stays (property_id, actual_check_in_at, actual_check_out_at, status);

CREATE INDEX IF NOT EXISTS idx_rooms_property_status_room_type
  ON rooms (property_id, status, room_type_id);

-- 2. Folio & financial billing transactions
CREATE INDEX IF NOT EXISTS idx_guest_folios_property_stay_status
  ON guest_folios (property_id, stay_id, status);

CREATE INDEX IF NOT EXISTS idx_folio_charges_folio_property
  ON folio_charges (folio_id, property_id);

CREATE INDEX IF NOT EXISTS idx_folio_payments_folio_property
  ON folio_payments (folio_id, property_id);

-- 3. Housekeeping and Maintenance task scheduling
CREATE INDEX IF NOT EXISTS idx_housekeeping_property_status_assigned
  ON housekeeping_tasks (property_id, status, assigned_to);

CREATE INDEX IF NOT EXISTS idx_maintenance_property_status_priority
  ON maintenance_work_orders (property_id, status, priority);

-- 4. Restaurant POS & Kitchen Display System orders
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_property_status
  ON restaurant_orders (property_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_property_status
  ON kitchen_tickets (property_id, status, created_at);

-- 5. Staff, attendance, and shift lookups
CREATE INDEX IF NOT EXISTS idx_staff_attendance_property_date
  ON staff_attendance (property_id, attendance_date);

-- 6. Notifications fast retrieval for unread in-app alerts
CREATE INDEX IF NOT EXISTS idx_notifications_user_property_read
  ON notifications (user_id, property_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_status_retries
  ON notifications (status, retry_count)
  WHERE status IN ('PENDING', 'PROCESSING', 'FAILED');

-- 7. Online booking slug lookup
CREATE INDEX IF NOT EXISTS idx_online_booking_slug
  ON property_online_booking_settings (booking_slug)
  WHERE is_enabled = true;
