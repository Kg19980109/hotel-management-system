
CREATE OR REPLACE FUNCTION public.assign_room_and_check_in_guest(
    p_property_id UUID,
    p_room_id UUID,
    p_guest_id UUID DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_id_document_type TEXT DEFAULT NULL,
    p_id_document_number TEXT DEFAULT NULL,
    p_check_in_date DATE DEFAULT CURRENT_DATE,
    p_check_out_date DATE DEFAULT (CURRENT_DATE + 1),
    p_rate_per_night NUMERIC(12,2) DEFAULT 0,
    p_adults INTEGER DEFAULT 1,
    p_children INTEGER DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user_id UUID;
    v_profile_id UUID := NULL;
    v_prop_currency VARCHAR(3);
    v_room RECORD;
    v_guest_id UUID;
    v_guest_first_name TEXT;
    v_guest_last_name TEXT;
    v_conf_number TEXT;
    v_res_id UUID;
    v_res_room_id UUID;
    v_stay_id UUID;
    v_folio_res JSONB;
    v_folio_id UUID;
    v_folio_number TEXT;
    v_nights INTEGER;
    v_total_room_cost NUMERIC(12,2);
    v_norm_doc_type VARCHAR(50) := NULL;
BEGIN
    -- 1. Resolve auth_user_id and profile_id
    v_auth_user_id := auth.uid();

    IF p_performed_by IS NOT NULL THEN
        SELECT id, auth_user_id INTO v_profile_id, v_auth_user_id
        FROM public.profiles
        WHERE id = p_performed_by
        LIMIT 1;

        IF v_profile_id IS NULL THEN
            SELECT id, auth_user_id INTO v_profile_id, v_auth_user_id
            FROM public.profiles
            WHERE auth_user_id = p_performed_by
            LIMIT 1;
            
            IF v_auth_user_id IS NULL THEN
                v_auth_user_id := p_performed_by;
            END IF;
        END IF;
    END IF;

    IF v_profile_id IS NULL THEN
        IF v_auth_user_id IS NOT NULL THEN
            SELECT id INTO v_profile_id
            FROM public.profiles
            WHERE auth_user_id = v_auth_user_id
            LIMIT 1;
        ELSIF auth.uid() IS NOT NULL THEN
            v_auth_user_id := auth.uid();
            SELECT id INTO v_profile_id
            FROM public.profiles
            WHERE auth_user_id = v_auth_user_id
            LIMIT 1;
        END IF;
    END IF;

    -- 2. Property validation
    SELECT COALESCE(currency, 'INR') INTO v_prop_currency
    FROM public.properties
    WHERE id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found';
    END IF;

    -- 3. Validate Room
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found for this property';
    END IF;

    -- Check if room is already occupied
    IF EXISTS (
        SELECT 1 FROM public.stays
        WHERE room_id = p_room_id AND status = 'CHECKED_IN'
    ) THEN
        RAISE EXCEPTION 'Room % is currently occupied by an active guest', v_room.room_number;
    END IF;

    -- Normalize document type
    IF p_id_document_type IS NOT NULL AND TRIM(p_id_document_type) <> '' THEN
        IF UPPER(p_id_document_type) LIKE '%PASS%' THEN
            v_norm_doc_type := 'PASSPORT';
        ELSIF UPPER(p_id_document_type) LIKE '%DRIV%' THEN
            v_norm_doc_type := 'DRIVERS_LICENSE';
        ELSIF UPPER(p_id_document_type) LIKE '%NAT%' OR UPPER(p_id_document_type) LIKE '%AAD%' THEN
            v_norm_doc_type := 'NATIONAL_ID';
        ELSE
            v_norm_doc_type := 'OTHER';
        END IF;
    END IF;

    -- 4. Resolve or Create Guest Profile
    IF p_guest_id IS NOT NULL THEN
        SELECT id, first_name, last_name INTO v_guest_id, v_guest_first_name, v_guest_last_name
        FROM public.guests
        WHERE id = p_guest_id AND property_id = p_property_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Guest profile not found';
        END IF;
    ELSE
        IF (p_first_name IS NULL OR TRIM(p_first_name) = '') AND (p_last_name IS NULL OR TRIM(p_last_name) = '') THEN
            RAISE EXCEPTION 'Guest name is required for new room assignment';
        END IF;

        IF p_phone IS NOT NULL AND TRIM(p_phone) <> '' THEN
            SELECT id, first_name, last_name INTO v_guest_id, v_guest_first_name, v_guest_last_name
            FROM public.guests
            WHERE property_id = p_property_id AND phone = TRIM(p_phone)
            LIMIT 1;
        ELSIF p_email IS NOT NULL AND TRIM(p_email) <> '' THEN
            SELECT id, first_name, last_name INTO v_guest_id, v_guest_first_name, v_guest_last_name
            FROM public.guests
            WHERE property_id = p_property_id AND LOWER(email) = LOWER(TRIM(p_email))
            LIMIT 1;
        END IF;

        IF v_guest_id IS NULL THEN
            v_guest_first_name := COALESCE(TRIM(p_first_name), 'Guest');
            v_guest_last_name := COALESCE(TRIM(p_last_name), '');

            INSERT INTO public.guests (
                property_id,
                first_name,
                last_name,
                phone,
                email,
                id_document_type,
                id_document_number,
                status,
                created_by
            ) VALUES (
                p_property_id,
                v_guest_first_name,
                v_guest_last_name,
                NULLIF(TRIM(p_phone), ''),
                NULLIF(LOWER(TRIM(p_email)), ''),
                v_norm_doc_type,
                NULLIF(p_id_document_number, ''),
                'ACTIVE',
                v_auth_user_id
            ) RETURNING id INTO v_guest_id;
        END IF;
    END IF;

    -- 5. Calculate Nights & Amounts
    v_nights := GREATEST(1, (p_check_out_date - p_check_in_date));
    v_total_room_cost := COALESCE(p_rate_per_night, 0) * v_nights;

    -- 6. Generate Direct Assignment Reservation with status CHECKED_IN
    v_conf_number := 'RES-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

    INSERT INTO public.reservations (
        property_id,
        primary_guest_id,
        confirmation_number,
        status,
        booking_source,
        booked_at,
        check_in_date,
        check_out_date,
        adults,
        children,
        special_requests,
        total_amount,
        currency,
        created_by
    ) VALUES (
        p_property_id,
        v_guest_id,
        v_conf_number,
        'CHECKED_IN',
        'WALK_IN',
        NOW(),
        p_check_in_date,
        p_check_out_date,
        COALESCE(p_adults, 1),
        COALESCE(p_children, 0),
        p_notes,
        v_total_room_cost,
        v_prop_currency,
        v_auth_user_id
    ) RETURNING id INTO v_res_id;

    INSERT INTO public.reservation_rooms (
        reservation_id,
        property_id,
        room_type_id,
        room_id,
        check_in_date,
        check_out_date,
        adults,
        children,
        nightly_rate,
        total_amount,
        currency
    ) VALUES (
        v_res_id,
        p_property_id,
        v_room.room_type_id,
        p_room_id,
        p_check_in_date,
        p_check_out_date,
        COALESCE(p_adults, 1),
        COALESCE(p_children, 0),
        COALESCE(p_rate_per_night, 0),
        v_total_room_cost,
        v_prop_currency
    ) RETURNING id INTO v_res_room_id;

    -- 7. Create Active Stay
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
        created_by
    ) VALUES (
        p_property_id,
        v_res_id,
        v_res_room_id,
        v_guest_id,
        p_room_id,
        'CHECKED_IN',
        NOW(),
        p_check_out_date,
        COALESCE(p_adults, 1),
        COALESCE(p_children, 0),
        p_notes,
        v_auth_user_id,
        v_auth_user_id
    ) RETURNING id INTO v_stay_id;

    -- 8. Update Room Status to OCCUPIED
    UPDATE public.rooms
    SET status = 'OCCUPIED',
        updated_by = v_auth_user_id,
        updated_at = NOW()
    WHERE id = p_room_id;

    -- 9. Auto-create Stay Folio
    v_folio_res := public.get_or_create_stay_folio(
        p_stay_id := v_stay_id,
        p_property_id := p_property_id,
        p_performed_by := v_profile_id
    );

    IF (v_folio_res->>'success')::boolean IS TRUE THEN
        v_folio_id := (v_folio_res->'folio'->>'id')::uuid;
        v_folio_number := v_folio_res->'folio'->>'folio_number';

        -- 10. Post Initial Room Charge to Folio if rate > 0
        IF COALESCE(p_rate_per_night, 0) > 0 THEN
            INSERT INTO public.folio_charges (
                property_id,
                folio_id,
                stay_id,
                guest_id,
                charge_type,
                source_type,
                source_id,
                description,
                quantity,
                unit_price,
                subtotal,
                discount_amount,
                tax_amount,
                total_amount,
                currency,
                charge_date,
                posted_at,
                created_by
            ) VALUES (
                p_property_id,
                v_folio_id,
                v_stay_id,
                v_guest_id,
                'ROOM',
                'STAY',
                v_stay_id,
                'Room ' || v_room.room_number || ' Stay Charges (' || v_nights || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ')',
                v_nights,
                COALESCE(p_rate_per_night, 0),
                v_total_room_cost,
                0,
                0,
                v_total_room_cost,
                v_prop_currency,
                p_check_in_date,
                NOW(),
                v_profile_id
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'stay_id', v_stay_id,
        'guest_id', v_guest_id,
        'guest_name', TRIM(v_guest_first_name || ' ' || COALESCE(v_guest_last_name, '')),
        'room_id', p_room_id,
        'room_number', v_room.room_number,
        'confirmation_number', v_conf_number,
        'folio_id', v_folio_id,
        'folio_number', v_folio_number,
        'check_in_date', p_check_in_date,
        'check_out_date', p_check_out_date,
        'rate_per_night', p_rate_per_night,
        'total_amount', v_total_room_cost
    );
END;
$$;
  