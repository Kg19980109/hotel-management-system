-- ============================================================
-- STAYHUB MIGRATION 04: ATOMIC HOTEL ONBOARDING RPC
-- Phase 4: Atomic onboarding transaction with hardcoded HOTEL_OWNER role
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_hotel_onboarding(
    -- User profile info
    p_full_name VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL,
    -- Organization info
    p_org_name VARCHAR(255) DEFAULT NULL,
    p_org_email VARCHAR(255) DEFAULT NULL,
    p_org_phone VARCHAR(50) DEFAULT NULL,
    -- Hotel info
    p_hotel_name VARCHAR(255) DEFAULT NULL,
    p_hotel_code VARCHAR(50) DEFAULT NULL,
    p_address_line_1 VARCHAR(255) DEFAULT NULL,
    p_address_line_2 VARCHAR(255) DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL,
    p_state VARCHAR(100) DEFAULT NULL,
    p_postal_code VARCHAR(20) DEFAULT NULL,
    p_country VARCHAR(100) DEFAULT 'India',
    p_hotel_phone VARCHAR(50) DEFAULT NULL,
    p_hotel_email VARCHAR(255) DEFAULT NULL,
    p_timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    p_currency VARCHAR(10) DEFAULT 'INR',
    p_check_in_time VARCHAR(20) DEFAULT '14:00',
    p_check_out_time VARCHAR(20) DEFAULT '11:00'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_email VARCHAR(255);
    v_profile_id UUID;
    v_org_id UUID;
    v_org_slug VARCHAR(255);
    v_property_id UUID;
    v_property_slug VARCHAR(255);
    v_role_id UUID;
    v_base_slug VARCHAR(255);
BEGIN
    -- 1. Ensure user is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated: onboarding requires a signed-in user';
    END IF;

    -- Extract user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found in authentication registry';
    END IF;

    -- 2. Upsert user profile
    INSERT INTO public.profiles (
        auth_user_id,
        full_name,
        email,
        phone,
        status,
        updated_at
    )
    VALUES (
        v_user_id,
        COALESCE(TRIM(p_full_name), 'Hotel Administrator'),
        v_user_email,
        p_phone,
        'active',
        now()
    )
    ON CONFLICT (auth_user_id) 
    DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now()
    RETURNING id INTO v_profile_id;

    -- 3. Prepare organization slug
    v_base_slug := lower(regexp_replace(COALESCE(NULLIF(TRIM(p_org_name), ''), 'stayhub-org'), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    v_org_slug := v_base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

    -- 4. Create Organization
    INSERT INTO public.organizations (
        name,
        slug,
        email,
        phone,
        status,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        COALESCE(NULLIF(TRIM(p_org_name), ''), 'My Hospitality Group'),
        v_org_slug,
        COALESCE(p_org_email, v_user_email),
        p_org_phone,
        'active',
        v_user_id,
        now(),
        now()
    )
    RETURNING id INTO v_org_id;

    -- 5. Prepare property slug
    v_base_slug := lower(regexp_replace(COALESCE(NULLIF(TRIM(p_hotel_name), ''), 'grand-hotel'), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    v_property_slug := v_base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

    -- 6. Create Property
    INSERT INTO public.properties (
        organization_id,
        name,
        slug,
        property_code,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        country,
        phone,
        email,
        timezone,
        currency,
        check_in_time,
        check_out_time,
        status,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        v_org_id,
        COALESCE(NULLIF(TRIM(p_hotel_name), ''), 'Grand StayHub Resort'),
        v_property_slug,
        COALESCE(NULLIF(TRIM(p_hotel_code), ''), 'PROP-1'),
        COALESCE(NULLIF(TRIM(p_address_line_1), ''), 'Main Boulevard'),
        p_address_line_2,
        COALESCE(NULLIF(TRIM(p_city), ''), 'Kolkata'),
        COALESCE(NULLIF(TRIM(p_state), ''), 'West Bengal'),
        COALESCE(NULLIF(TRIM(p_postal_code), ''), '700001'),
        COALESCE(NULLIF(TRIM(p_country), ''), 'India'),
        p_hotel_phone,
        COALESCE(p_hotel_email, v_user_email),
        COALESCE(p_timezone, 'Asia/Kolkata'),
        COALESCE(p_currency, 'INR'),
        COALESCE(p_check_in_time, '14:00'),
        COALESCE(p_check_out_time, '11:00'),
        'active',
        v_user_id,
        now(),
        now()
    )
    RETURNING id INTO v_property_id;

    -- 7. Fetch the HOTEL_OWNER role ID (guaranteed server-side, non-bypassable)
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = 'HOTEL_OWNER';

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Internal error: system role HOTEL_OWNER does not exist';
    END IF;

    -- 8. Create Property Membership for the authenticated user as HOTEL_OWNER
    INSERT INTO public.property_memberships (
        property_id,
        user_id,
        role_id,
        status,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        v_property_id,
        v_user_id,
        v_role_id,
        'active',
        v_user_id,
        now(),
        now()
    );

    -- 9. Return structured success payload
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'property_id', v_property_id,
        'profile_id', v_profile_id,
        'role', 'HOTEL_OWNER',
        'property_name', COALESCE(NULLIF(TRIM(p_hotel_name), ''), 'Grand StayHub Resort')
    );
END;
$$;
