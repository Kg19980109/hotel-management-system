-- ============================================================
-- STAYHUB MIGRATION: DIRECT ROOM ASSIGNMENT & POS CHECKOUT ENGINE
-- 1. assign_room_and_check_in_guest RPC
-- 2. search_active_room_folio RPC
-- ============================================================

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
    p_check_out_date DATE DEFAULT CURRENT_DATE + 1,
    p_rate_per_night NUMERIC DEFAULT 0,
    p_adults INTEGER DEFAULT 1,
    p_children INTEGER DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_guest_id UUID;
    v_guest_first_name TEXT;
    v_guest_last_name TEXT;
    v_room RECORD;
    v_prop_currency TEXT;
    v_conf_number TEXT;
    v_res_id UUID;
    v_res_room_id UUID;
    v_stay_id UUID;
    v_folio_res JSONB;
    v_folio_id UUID;
    v_folio_number TEXT;
    v_nights INTEGER;
    v_total_room_cost NUMERIC(12,2);
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Property validation
    SELECT COALESCE(currency, 'INR') INTO v_prop_currency
    FROM public.properties
    WHERE id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found';
    END IF;

    -- 2. Validate Room
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

    -- 3. Resolve or Create Guest Profile
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

        -- Try to match existing guest by phone or email if provided
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
                NULLIF(p_id_document_type, ''),
                NULLIF(p_id_document_number, ''),
                'ACTIVE',
                v_user_id
            ) RETURNING id INTO v_guest_id;
        END IF;
    END IF;

    -- 4. Calculate Nights & Amounts
    v_nights := GREATEST(1, (p_check_out_date - p_check_in_date));
    v_total_room_cost := COALESCE(p_rate_per_night, 0) * v_nights;

    -- 5. Generate Walk-in Reservation & Room
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
        'CONFIRMED',
        'WALK_IN',
        NOW(),
        p_check_in_date,
        p_check_out_date,
        COALESCE(p_adults, 1),
        COALESCE(p_children, 0),
        p_notes,
        v_total_room_cost,
        v_prop_currency,
        v_user_id
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

    -- 6. Create Active Stay
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
        v_user_id,
        v_user_id
    ) RETURNING id INTO v_stay_id;

    -- 7. Update Room Status to OCCUPIED
    UPDATE public.rooms
    SET status = 'OCCUPIED',
        updated_at = NOW()
    WHERE id = p_room_id;

    -- 8. Auto-create Stay Folio
    v_folio_res := public.get_or_create_stay_folio(
        p_stay_id := v_stay_id,
        p_property_id := p_property_id,
        p_performed_by := v_user_id
    );

    IF (v_folio_res->>'success')::boolean IS TRUE THEN
        v_folio_id := (v_folio_res->'folio'->>'id')::uuid;
        v_folio_number := v_folio_res->'folio'->>'folio_number';

        -- 9. Post Initial Room Charge to Folio if rate > 0
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
                v_user_id
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

CREATE OR REPLACE FUNCTION public.search_active_room_folio(
    p_property_id UUID,
    p_query TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_clean_query TEXT := TRIM(p_query);
    v_stay RECORD;
    v_folio RECORD;
    v_charges JSONB;
    v_payments JSONB;
    v_charges_subtotal NUMERIC(12,2) := 0;
    v_taxes_total NUMERIC(12,2) := 0;
    v_discounts_total NUMERIC(12,2) := 0;
    v_payments_total NUMERIC(12,2) := 0;
    v_balance_due NUMERIC(12,2) := 0;
    v_balance_res JSONB;
BEGIN
    IF v_clean_query IS NULL OR v_clean_query = '' THEN
        RETURN jsonb_build_object('found', false, 'message', 'Query is empty');
    END IF;

    -- Find active stay by Room Number OR Guest Name OR Phone OR Confirmation Number
    SELECT 
        s.id AS stay_id,
        s.property_id,
        s.guest_id,
        s.room_id,
        s.status AS stay_status,
        s.actual_check_in_at,
        s.expected_check_out_date,
        s.adults,
        s.children,
        r.room_number,
        r.room_name,
        rt.name AS room_type_name,
        g.first_name,
        g.last_name,
        g.phone,
        g.email,
        res.confirmation_number
    INTO v_stay
    FROM public.stays s
    JOIN public.rooms r ON r.id = s.room_id
    LEFT JOIN public.room_types rt ON rt.id = r.room_type_id
    JOIN public.guests g ON g.id = s.guest_id
    LEFT JOIN public.reservations res ON res.id = s.reservation_id
    WHERE s.property_id = p_property_id
      AND s.status = 'CHECKED_IN'
      AND (
          r.room_number ILIKE v_clean_query
          OR TRIM(g.first_name || ' ' || COALESCE(g.last_name, '')) ILIKE '%' || v_clean_query || '%'
          OR g.phone ILIKE '%' || v_clean_query || '%'
          OR res.confirmation_number ILIKE v_clean_query
      )
    ORDER BY s.actual_check_in_at DESC
    LIMIT 1;

    IF v_stay.stay_id IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', 'No active checked-in stay found for: ' || v_clean_query
        );
    END IF;

    -- Get or create folio for this stay
    PERFORM public.get_or_create_stay_folio(
        p_stay_id := v_stay.stay_id,
        p_property_id := p_property_id,
        p_performed_by := auth.uid()
    );

    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE stay_id = v_stay.stay_id AND property_id = p_property_id
    LIMIT 1;

    IF v_folio.id IS NOT NULL THEN
        -- Get itemized charges
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', fc.id,
            'charge_type', fc.charge_type,
            'source_type', fc.source_type,
            'description', fc.description,
            'quantity', fc.quantity,
            'unit_price', fc.unit_price,
            'subtotal', fc.subtotal,
            'discount_amount', fc.discount_amount,
            'tax_amount', fc.tax_amount,
            'total_amount', fc.total_amount,
            'charge_date', fc.charge_date,
            'posted_at', fc.posted_at
        ) ORDER BY fc.posted_at ASC), '[]'::jsonb)
        INTO v_charges
        FROM public.folio_charges fc
        WHERE fc.folio_id = v_folio.id AND fc.voided_at IS NULL;

        -- Get recorded payments
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', fp.id,
            'payment_method', fp.payment_method,
            'amount', fp.amount,
            'currency', fp.currency,
            'payment_reference', fp.payment_reference,
            'notes', fp.notes,
            'paid_at', fp.paid_at
        ) ORDER BY fp.paid_at ASC), '[]'::jsonb)
        INTO v_payments
        FROM public.folio_payments fp
        WHERE fp.folio_id = v_folio.id AND fp.status = 'COMPLETED';

        -- Get accurate folio balance
        v_balance_res := public.get_folio_balance(
            p_folio_id := v_folio.id,
            p_property_id := p_property_id
        );

        v_charges_subtotal := COALESCE((v_balance_res->>'charges_subtotal')::numeric, 0);
        v_taxes_total := COALESCE((v_balance_res->>'taxes_total')::numeric, 0);
        v_discounts_total := COALESCE((v_balance_res->>'discounts_total')::numeric, 0);
        v_payments_total := COALESCE((v_balance_res->>'net_payments')::numeric, 0);
        v_balance_due := COALESCE((v_balance_res->>'balance_due')::numeric, 0);
    ELSE
        v_charges := '[]'::jsonb;
        v_payments := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'stay', jsonb_build_object(
            'id', v_stay.stay_id,
            'room_id', v_stay.room_id,
            'room_number', v_stay.room_number,
            'room_name', v_stay.room_name,
            'room_type', v_stay.room_type_name,
            'guest_id', v_stay.guest_id,
            'guest_name', TRIM(v_stay.first_name || ' ' || COALESCE(v_stay.last_name, '')),
            'first_name', v_stay.first_name,
            'last_name', v_stay.last_name,
            'phone', v_stay.phone,
            'email', v_stay.email,
            'confirmation_number', v_stay.confirmation_number,
            'check_in_at', v_stay.actual_check_in_at,
            'expected_check_out_date', v_stay.expected_check_out_date,
            'adults', v_stay.adults,
            'children', v_stay.children
        ),
        'folio', jsonb_build_object(
            'id', v_folio.id,
            'folio_number', v_folio.folio_number,
            'status', v_folio.status,
            'currency', COALESCE(v_folio.currency, 'INR'),
            'charges_subtotal', v_charges_subtotal,
            'taxes_total', v_taxes_total,
            'discounts_total', v_discounts_total,
            'net_payments', v_payments_total,
            'balance_due', v_balance_due
        ),
        'charges', v_charges,
        'payments', v_payments
    );
END;
$$;

-- ============================================================
-- Fix profile resolution in record_folio_payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_folio_payment(
    p_folio_id uuid,
    p_property_id uuid,
    p_payment_method character varying,
    p_amount numeric,
    p_notes text DEFAULT NULL::text,
    p_performed_by uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_folio RECORD;
    v_balance_info JSONB;
    v_payment_ref VARCHAR(50);
    v_payment RECORD;
    v_profile_id UUID := NULL;
BEGIN
    -- Resolve profile id from auth_user_id or id
    IF p_performed_by IS NOT NULL THEN
        SELECT id INTO v_profile_id
        FROM public.profiles
        WHERE auth_user_id = p_performed_by OR id = p_performed_by
        LIMIT 1;
    END IF;

    IF v_profile_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT id INTO v_profile_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
        LIMIT 1;
    END IF;

    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
    END IF;

    IF v_folio.status IN ('CLOSED', 'VOID') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot record payment for a closed or voided folio');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero');
    END IF;

    v_payment_ref := public.generate_payment_reference();

    INSERT INTO public.folio_payments (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        payment_reference,
        payment_method,
        amount,
        currency,
        status,
        paid_at,
        received_by,
        notes
    ) VALUES (
        p_property_id,
        p_folio_id,
        v_folio.stay_id,
        v_folio.guest_id,
        v_payment_ref,
        p_payment_method,
        ROUND(p_amount, 2),
        v_folio.currency,
        'COMPLETED',
        now(),
        v_profile_id,
        p_notes
    ) RETURNING * INTO v_payment;

    -- Recalculate balance
    v_balance_info := public.get_folio_balance(p_folio_id, p_property_id);

    -- If balance is now <= 0, mark folio as SETTLED
    IF (v_balance_info->>'balance_due')::numeric <= 0 THEN
        UPDATE public.guest_folios
        SET status = 'SETTLED', updated_at = now(), updated_by = v_profile_id
        WHERE id = p_folio_id AND status = 'OPEN';
    END IF;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        p_folio_id,
        'PAYMENT_RECORDED',
        'STAFF',
        v_profile_id,
        jsonb_build_object(
            'payment_id', v_payment.id,
            'payment_reference', v_payment_ref,
            'amount', v_payment.amount,
            'method', p_payment_method,
            'balance_due', (v_balance_info->>'balance_due')::numeric
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment', to_jsonb(v_payment),
        'balance', v_balance_info
    );
END;
$$;

-- ============================================================
-- Fix profile resolution in generate_invoice
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invoice(
    p_folio_id uuid,
    p_property_id uuid,
    p_billing_name character varying DEFAULT NULL::character varying,
    p_billing_email character varying DEFAULT NULL::character varying,
    p_billing_address text DEFAULT NULL::text,
    p_performed_by uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_folio RECORD;
    v_balance_info JSONB;
    v_invoice_num VARCHAR(50);
    v_invoice RECORD;
    v_guest RECORD;
    v_charge RECORD;
    v_profile_id UUID := NULL;
BEGIN
    -- Resolve profile id from auth_user_id or id
    IF p_performed_by IS NOT NULL THEN
        SELECT id INTO v_profile_id
        FROM public.profiles
        WHERE auth_user_id = p_performed_by OR id = p_performed_by
        LIMIT 1;
    END IF;

    IF v_profile_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT id INTO v_profile_id
        FROM public.profiles
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
        LIMIT 1;
    END IF;

    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
    END IF;

    IF v_folio.status = 'VOID' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot generate invoice for a voided folio');
    END IF;

    -- Fetch guest for default billing info
    SELECT * INTO v_guest
    FROM public.guests
    WHERE id = v_folio.guest_id;

    v_balance_info := public.get_folio_balance(p_folio_id, p_property_id);
    v_invoice_num := public.generate_invoice_number(p_property_id);

    INSERT INTO public.invoices (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        invoice_number,
        status,
        currency,
        subtotal,
        tax_amount,
        total_amount,
        paid_amount,
        balance_due,
        billing_name,
        billing_email,
        billing_address,
        issued_at,
        created_by
    ) VALUES (
        p_property_id,
        p_folio_id,
        v_folio.stay_id,
        v_folio.guest_id,
        v_invoice_num,
        CASE WHEN (v_balance_info->>'balance_due')::numeric <= 0 THEN 'PAID' ELSE 'ISSUED' END,
        v_folio.currency,
        (v_balance_info->>'charges_subtotal')::numeric,
        (v_balance_info->>'taxes_total')::numeric,
        (v_balance_info->>'gross_charges')::numeric,
        (v_balance_info->>'net_payments')::numeric,
        (v_balance_info->>'balance_due')::numeric,
        COALESCE(p_billing_name, v_guest.first_name || ' ' || COALESCE(v_guest.last_name, '')),
        COALESCE(p_billing_email, v_guest.email),
        COALESCE(p_billing_address, v_guest.address_line_1),
        now(),
        v_profile_id
    ) RETURNING * INTO v_invoice;

    -- Copy folio charges to invoice line items
    FOR v_charge IN 
        SELECT * FROM public.folio_charges 
        WHERE folio_id = p_folio_id AND voided_at IS NULL 
    LOOP
        INSERT INTO public.invoice_items (
            property_id,
            invoice_id,
            description,
            quantity,
            unit_price,
            subtotal,
            tax_amount,
            total_amount
        ) VALUES (
            p_property_id,
            v_invoice.id,
            v_charge.description,
            v_charge.quantity,
            v_charge.unit_price,
            v_charge.subtotal,
            v_charge.tax_amount,
            v_charge.total_amount
        );
    END LOOP;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        p_folio_id,
        'INVOICE_GENERATED',
        'STAFF',
        v_profile_id,
        jsonb_build_object(
            'invoice_id', v_invoice.id,
            'invoice_number', v_invoice_num,
            'total_amount', v_invoice.total_amount,
            'balance_due', v_invoice.balance_due
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice', to_jsonb(v_invoice)
    );
END;
$$;
