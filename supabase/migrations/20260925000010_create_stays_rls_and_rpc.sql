-- ============================================================
-- STAYHUB MIGRATION 10: STAYS RLS POLICIES & ATOMIC FRONT DESK RPC
-- Phase 8: Atomic Check-in, Check-out, and No-Show Transactions
-- ============================================================

-- 1. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES FOR STAYS
DROP POLICY IF EXISTS "Users can view stays for their properties" ON public.stays;
CREATE POLICY "Users can view stays for their properties"
ON public.stays FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS "Authorized staff can insert stays" ON public.stays;
CREATE POLICY "Authorized staff can insert stays"
ON public.stays FOR INSERT
WITH CHECK (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    )
);

DROP POLICY IF EXISTS "Authorized staff can update stays" ON public.stays;
CREATE POLICY "Authorized staff can update stays"
ON public.stays FOR UPDATE
USING (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    )
)
WITH CHECK (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    )
);

DROP POLICY IF EXISTS "Property admins can delete stays" ON public.stays;
CREATE POLICY "Property admins can delete stays"
ON public.stays FOR DELETE
USING (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER']
    )
);

-- ============================================================
-- 3. ATOMIC CHECK-IN RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_in_reservation_room(
    p_reservation_room_id UUID,
    p_room_id UUID,
    p_property_id UUID,
    p_adults INTEGER DEFAULT NULL,
    p_children INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_is_early BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_res_room RECORD;
    v_res RECORD;
    v_room RECORD;
    v_prop_today DATE;
    v_stay_id UUID;
    v_stay_record RECORD;
BEGIN
    -- 1. Authentication & Role Validation
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to perform check-in';
    END IF;

    v_has_role := public.user_has_property_role(
        v_user_id,
        p_property_id,
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    );

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Unauthorized: front desk check-in permissions required';
    END IF;

    -- 2. Fetch & Validate Reservation Room Item
    SELECT * INTO v_res_room
    FROM public.reservation_rooms
    WHERE id = p_reservation_room_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation room item not found for property %', p_property_id;
    END IF;

    -- 3. Fetch & Validate Parent Reservation
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = v_res_room.reservation_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent reservation not found';
    END IF;

    IF v_res.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION 'Cannot check in reservation with status % (must be CONFIRMED)', v_res.status;
    END IF;

    -- 4. Check If Already Checked In
    IF EXISTS (
        SELECT 1 FROM public.stays
        WHERE reservation_room_id = p_reservation_room_id AND status = 'CHECKED_IN'
    ) THEN
        RAISE EXCEPTION 'Reservation room item is already checked in';
    END IF;

    -- 5. Fetch & Validate Physical Room
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Physical room % does not belong to property %', p_room_id, p_property_id;
    END IF;

    IF NOT v_room.is_active THEN
        RAISE EXCEPTION 'Room % is deactivated and cannot be occupied', v_room.room_number;
    END IF;

    IF v_room.status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN
        RAISE EXCEPTION 'Room % is % and cannot be checked into', v_room.room_number, v_room.status;
    END IF;

    IF v_room.status = 'OCCUPIED' THEN
        RAISE EXCEPTION 'Room % is currently occupied by another guest', v_room.room_number;
    END IF;

    -- Double-check via stays table for safety
    IF EXISTS (
        SELECT 1 FROM public.stays
        WHERE room_id = p_room_id AND status = 'CHECKED_IN'
    ) THEN
        RAISE EXCEPTION 'Room % has an existing active checked-in stay', v_room.room_number;
    END IF;

    -- 6. Date Eligibility & Early Check-In Validation
    v_prop_today := CURRENT_DATE;

    IF v_prop_today < v_res_room.check_in_date AND NOT p_is_early THEN
        RAISE EXCEPTION 'Check-in is scheduled for %. Early check-in requires explicit authorization',
            v_res_room.check_in_date;
    END IF;

    -- 7. Update reservation_rooms with final physical room assignment
    UPDATE public.reservation_rooms
    SET 
        room_id = p_room_id,
        updated_at = now()
    WHERE id = p_reservation_room_id;

    -- 8. Create Stay Record Atomically
    INSERT INTO public.stays (
        property_id,
        reservation_id,
        reservation_room_id,
        guest_id,
        room_id,
        status,
        actual_check_in_at,
        expected_check_out_date,
        adults,
        children,
        notes,
        check_in_by,
        created_by,
        updated_by
    ) VALUES (
        p_property_id,
        v_res.id,
        p_reservation_room_id,
        v_res.primary_guest_id,
        p_room_id,
        'CHECKED_IN',
        now(),
        v_res_room.check_out_date,
        COALESCE(p_adults, v_res_room.adults, 1),
        COALESCE(p_children, v_res_room.children, 0),
        p_notes,
        v_user_id,
        v_user_id,
        v_user_id
    )
    RETURNING * INTO v_stay_record;

    -- 9. Transition Room Status to OCCUPIED
    UPDATE public.rooms
    SET 
        status = 'OCCUPIED',
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = p_room_id;

    RETURN to_jsonb(v_stay_record);
END;
$$;

-- ============================================================
-- 4. ATOMIC CHECK-OUT RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_out_stay(
    p_stay_id UUID,
    p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_stay RECORD;
    v_uncompleted_rooms_count INTEGER;
BEGIN
    -- 1. Authentication & Role Validation
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to perform check-out';
    END IF;

    v_has_role := public.user_has_property_role(
        v_user_id,
        p_property_id,
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    );

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Unauthorized: front desk check-out permissions required';
    END IF;

    -- 2. Fetch & Validate Stay
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stay record % not found for property %', p_stay_id, p_property_id;
    END IF;

    IF v_stay.status <> 'CHECKED_IN' THEN
        RAISE EXCEPTION 'Cannot check out stay with status % (must be CHECKED_IN)', v_stay.status;
    END IF;

    -- 3. Update Stay to CHECKED_OUT
    UPDATE public.stays
    SET 
        status = 'CHECKED_OUT',
        actual_check_out_at = now(),
        check_out_by = v_user_id,
        updated_by = v_user_id,
        updated_at = now()
    WHERE id = p_stay_id;

    -- 4. Transition Room Status to DIRTY (Housekeeping Lifecycle Start)
    UPDATE public.rooms
    SET 
        status = 'DIRTY',
        housekeeping_status = 'DIRTY',
        updated_by = v_user_id,
        updated_at = now()
    WHERE id = v_stay.room_id;

    -- 5. Multi-room Parent Reservation Completion Check
    -- Check if any other reservation room under this reservation is still active
    SELECT count(*) INTO v_uncompleted_rooms_count
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = v_stay.reservation_id
      AND rr.is_cancelled = false
      AND NOT EXISTS (
          SELECT 1 FROM public.stays s 
          WHERE s.reservation_room_id = rr.id AND s.status = 'CHECKED_OUT'
      );

    IF v_uncompleted_rooms_count = 0 THEN
        UPDATE public.reservations
        SET 
            status = 'COMPLETED',
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_stay.reservation_id;
    END IF;

    -- Return updated stay
    SELECT * INTO v_stay FROM public.stays WHERE id = p_stay_id;
    RETURN to_jsonb(v_stay);
END;
$$;

-- ============================================================
-- 5. ATOMIC NO-SHOW RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_reservation_no_show(
    p_reservation_id UUID,
    p_property_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_res RECORD;
BEGIN
    -- 1. Authentication & Role Validation
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to mark reservation as no-show';
    END IF;

    v_has_role := public.user_has_property_role(
        v_user_id,
        p_property_id,
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    );

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Unauthorized: front desk permissions required';
    END IF;

    -- 2. Fetch & Validate Reservation
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = p_reservation_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found for property %', p_reservation_id, p_property_id;
    END IF;

    IF v_res.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION 'Cannot mark reservation with status % as NO_SHOW (must be CONFIRMED)', v_res.status;
    END IF;

    -- 3. Update Reservation to NO_SHOW
    UPDATE public.reservations
    SET 
        status = 'NO_SHOW',
        cancellation_reason = COALESCE(p_reason, 'Guest did not arrive for scheduled reservation'),
        cancelled_at = now(),
        updated_by = v_user_id,
        updated_at = now()
    WHERE id = p_reservation_id;

    -- 4. Mark reservation_rooms as cancelled to immediately release physical inventory
    UPDATE public.reservation_rooms
    SET 
        is_cancelled = true,
        updated_at = now()
    WHERE reservation_id = p_reservation_id;

    -- 5. If any expected stay exists, update to NO_SHOW
    UPDATE public.stays
    SET 
        status = 'NO_SHOW',
        updated_by = v_user_id,
        updated_at = now()
    WHERE reservation_id = p_reservation_id AND status = 'EXPECTED';

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', p_reservation_id,
        'status', 'NO_SHOW'
    );
END;
$$;
