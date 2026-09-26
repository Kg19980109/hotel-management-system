-- ============================================================
-- STAYHUB MIGRATION 18: QR REQUEST DISPATCH, REALTIME & ALERTING
-- Phase 23: QR Request Dispatch, Realtime Staff Alerting & Buzzer
-- ============================================================

-- 1. ADD ACKNOWLEDGED COLUMNS TO GUEST SERVICE REQUESTS
ALTER TABLE public.guest_service_requests
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guest_service_requests_acknowledged 
ON public.guest_service_requests(property_id, status, acknowledged_at);

-- 2. UPDATE staff_acknowledge_guest_request RPC TO POPULATE ACKNOWLEDGED FIELDS
CREATE OR REPLACE FUNCTION public.staff_acknowledge_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status NOT IN ('SUBMITTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request cannot be acknowledged from status ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'ACKNOWLEDGED',
        acknowledged_at = now(),
        acknowledged_by = v_caller_id,
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'ACKNOWLEDGED',
        v_old_status,
        'ACKNOWLEDGED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        p_notes
    );

    RETURN jsonb_build_object('success', true, 'status', 'ACKNOWLEDGED', 'acknowledged_at', now());
END;
$$;

-- 3. ENABLE REPLICA IDENTITY FULL FOR REALTIME PAYLOAD COMPLETENESS
ALTER TABLE public.guest_service_requests REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_orders REPLICA IDENTITY FULL;
ALTER TABLE public.housekeeping_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_work_orders REPLICA IDENTITY FULL;

-- 4. ADD OPERATIONAL TABLES TO SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_service_requests;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_tickets;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_orders;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_work_orders;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END;
$$;
