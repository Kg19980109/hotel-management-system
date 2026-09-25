-- ==============================================================================
-- STAYHUB — PHASE 11: MAINTENANCE MANAGEMENT & WORK ORDER OPERATIONS
-- Migration: 20260925000013_create_maintenance_management.sql
-- ==============================================================================

-- 1. Create Maintenance Assets table
CREATE TABLE IF NOT EXISTS public.maintenance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL DEFAULT 'OTHER',
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'OUT_OF_SERVICE', 'IN_REPAIR', 'DISPOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_assets_property ON public.maintenance_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_room ON public.maintenance_assets(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_status ON public.maintenance_assets(status);

-- 2. Create Maintenance Work Orders table
CREATE TABLE IF NOT EXISTS public.maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'FURNITURE',
        'LIGHTING', 'DOOR_LOCK', 'TV', 'WIFI_NETWORK', 'CIVIL', 'SAFETY', 'OTHER'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'CANCELLED'
    )),
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_property_status ON public.maintenance_work_orders(property_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_property_priority ON public.maintenance_work_orders(property_id, priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_room ON public.maintenance_work_orders(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_asset ON public.maintenance_work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_assigned_to ON public.maintenance_work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_scheduled_for ON public.maintenance_work_orders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_created_at ON public.maintenance_work_orders(created_at);

-- 3. Create Maintenance Work Order Events (Audit Timeline)
CREATE TABLE IF NOT EXISTS public.maintenance_work_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.maintenance_work_orders(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'CREATED', 'ASSIGNED', 'STARTED', 'PUT_ON_HOLD', 'RESUMED',
        'RESOLVED', 'CLOSED', 'CANCELLED', 'REOPENED', 'NOTE_ADDED', 'PRIORITY_CHANGED'
    )),
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_events_work_order ON public.maintenance_work_order_events(work_order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_property ON public.maintenance_work_order_events(property_id);

-- 4. Create Maintenance Schedules (Preventive Maintenance)
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.maintenance_assets(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    next_due_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    last_generated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property ON public.maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due ON public.maintenance_schedules(property_id, next_due_at) WHERE active = true;

-- ==============================================================================
-- 5. Tenant Consistency Triggers
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_maintenance_asset_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_room_property_id UUID;
BEGIN
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_property_id FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_property_id IS NULL OR v_room_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Maintenance asset room (ID: %) does not belong to property (ID: %)', NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_maintenance_asset_tenant ON public.maintenance_assets;
CREATE TRIGGER trg_check_maintenance_asset_tenant
    BEFORE INSERT OR UPDATE ON public.maintenance_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.check_maintenance_asset_tenant_consistency();

CREATE OR REPLACE FUNCTION public.check_maintenance_work_order_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_room_property_id UUID;
    v_asset_property_id UUID;
    v_assigned_has_membership BOOLEAN;
    v_reported_has_membership BOOLEAN;
BEGIN
    -- 1. Room consistency
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_property_id FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_property_id IS NULL OR v_room_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Work order room (ID: %) does not belong to property (ID: %)', NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    -- 2. Asset consistency
    IF NEW.asset_id IS NOT NULL THEN
        SELECT property_id INTO v_asset_property_id FROM public.maintenance_assets WHERE id = NEW.asset_id;
        IF v_asset_property_id IS NULL OR v_asset_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Work order asset (ID: %) does not belong to property (ID: %)', NEW.asset_id, NEW.property_id;
        END IF;
    END IF;

    -- 3. Assigned user membership
    IF NEW.assigned_to IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.property_memberships 
            WHERE user_id = NEW.assigned_to 
              AND property_id = NEW.property_id
        ) INTO v_assigned_has_membership;
        
        IF NOT v_assigned_has_membership THEN
            RAISE EXCEPTION 'Assigned technician (ID: %) is not a member of property (ID: %)', NEW.assigned_to, NEW.property_id;
        END IF;
    END IF;

    -- 4. Reported by membership
    IF NEW.reported_by IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.property_memberships 
            WHERE user_id = NEW.reported_by 
              AND property_id = NEW.property_id
        ) INTO v_reported_has_membership;
        
        -- Allow if super admin or member
        IF NOT v_reported_has_membership AND NOT public.is_platform_super_admin(NEW.reported_by) THEN
            RAISE EXCEPTION 'Reporting user (ID: %) is not a member of property (ID: %)', NEW.reported_by, NEW.property_id;
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_maintenance_work_order_tenant ON public.maintenance_work_orders;
CREATE TRIGGER trg_check_maintenance_work_order_tenant
    BEFORE INSERT OR UPDATE ON public.maintenance_work_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.check_maintenance_work_order_tenant_consistency();

CREATE OR REPLACE FUNCTION public.check_maintenance_event_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_work_order_property_id UUID;
BEGIN
    SELECT property_id INTO v_work_order_property_id FROM public.maintenance_work_orders WHERE id = NEW.work_order_id;
    IF v_work_order_property_id IS NULL OR v_work_order_property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Maintenance event work order (ID: %) does not belong to property (ID: %)', NEW.work_order_id, NEW.property_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_maintenance_event_tenant ON public.maintenance_work_order_events;
CREATE TRIGGER trg_check_maintenance_event_tenant
    BEFORE INSERT OR UPDATE ON public.maintenance_work_order_events
    FOR EACH ROW
    EXECUTE FUNCTION public.check_maintenance_event_tenant_consistency();

CREATE OR REPLACE FUNCTION public.check_maintenance_schedule_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_room_property_id UUID;
    v_asset_property_id UUID;
BEGIN
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_property_id FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_property_id IS NULL OR v_room_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Maintenance schedule room (ID: %) does not belong to property (ID: %)', NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    IF NEW.asset_id IS NOT NULL THEN
        SELECT property_id INTO v_asset_property_id FROM public.maintenance_assets WHERE id = NEW.asset_id;
        IF v_asset_property_id IS NULL OR v_asset_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Maintenance schedule asset (ID: %) does not belong to property (ID: %)', NEW.asset_id, NEW.property_id;
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_maintenance_schedule_tenant ON public.maintenance_schedules;
CREATE TRIGGER trg_check_maintenance_schedule_tenant
    BEFORE INSERT OR UPDATE ON public.maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.check_maintenance_schedule_tenant_consistency();

-- ==============================================================================
-- 6. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Assets Policies
DROP POLICY IF EXISTS maintenance_assets_select_policy ON public.maintenance_assets;
CREATE POLICY maintenance_assets_select_policy ON public.maintenance_assets
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS maintenance_assets_insert_policy ON public.maintenance_assets;
CREATE POLICY maintenance_assets_insert_policy ON public.maintenance_assets
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    );

DROP POLICY IF EXISTS maintenance_assets_update_policy ON public.maintenance_assets;
CREATE POLICY maintenance_assets_update_policy ON public.maintenance_assets
    FOR UPDATE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    )
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    );

DROP POLICY IF EXISTS maintenance_assets_delete_policy ON public.maintenance_assets;
CREATE POLICY maintenance_assets_delete_policy ON public.maintenance_assets
    FOR DELETE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    );

-- Work Orders Policies
DROP POLICY IF EXISTS maintenance_work_orders_select_policy ON public.maintenance_work_orders;
CREATE POLICY maintenance_work_orders_select_policy ON public.maintenance_work_orders
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS maintenance_work_orders_insert_policy ON public.maintenance_work_orders;
CREATE POLICY maintenance_work_orders_insert_policy ON public.maintenance_work_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY[
            'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT', 'RESTAURANT_STAFF'
        ])
    );

DROP POLICY IF EXISTS maintenance_work_orders_update_policy ON public.maintenance_work_orders;
CREATE POLICY maintenance_work_orders_update_policy ON public.maintenance_work_orders
    FOR UPDATE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY[
            'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE'
        ])
    )
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY[
            'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE'
        ])
    );

DROP POLICY IF EXISTS maintenance_work_orders_delete_policy ON public.maintenance_work_orders;
CREATE POLICY maintenance_work_orders_delete_policy ON public.maintenance_work_orders
    FOR DELETE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    );

-- Work Order Events Policies
DROP POLICY IF EXISTS maintenance_events_select_policy ON public.maintenance_work_order_events;
CREATE POLICY maintenance_events_select_policy ON public.maintenance_work_order_events
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS maintenance_events_insert_policy ON public.maintenance_work_order_events;
CREATE POLICY maintenance_events_insert_policy ON public.maintenance_work_order_events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY[
            'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE'
        ])
    );

-- Maintenance Schedules Policies
DROP POLICY IF EXISTS maintenance_schedules_select_policy ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_select_policy ON public.maintenance_schedules
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS maintenance_schedules_insert_policy ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_insert_policy ON public.maintenance_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    );

DROP POLICY IF EXISTS maintenance_schedules_update_policy ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_update_policy ON public.maintenance_schedules
    FOR UPDATE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    )
    WITH CHECK (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'])
    );

DROP POLICY IF EXISTS maintenance_schedules_delete_policy ON public.maintenance_schedules;
CREATE POLICY maintenance_schedules_delete_policy ON public.maintenance_schedules
    FOR DELETE TO authenticated
    USING (
        public.user_belongs_to_property(auth.uid(), property_id) AND
        public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    );

-- ==============================================================================
-- 7. ATOMIC MAINTENANCE RPC FUNCTIONS
-- ==============================================================================

-- 1. Create Maintenance Work Order
CREATE OR REPLACE FUNCTION public.create_maintenance_work_order(
    p_property_id UUID,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_category VARCHAR(50) DEFAULT 'OTHER',
    p_priority VARCHAR(20) DEFAULT 'NORMAL',
    p_room_id UUID DEFAULT NULL,
    p_asset_id UUID DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL,
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
    p_reported_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_is_authorized BOOLEAN;
    v_work_order_id UUID;
    v_initial_status VARCHAR(50) := 'OPEN';
    v_reported_by UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        v_user_id := p_reported_by;
    END IF;

    -- Verify caller belongs to property
    IF NOT public.user_belongs_to_property(v_user_id, p_property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    -- Authorization check for creating work orders
    SELECT public.user_has_property_role(v_user_id, p_property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT', 'RESTAURANT_STAFF'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: User role cannot report maintenance work orders';
    END IF;

    v_reported_by := COALESCE(p_reported_by, v_user_id);
    IF p_assigned_to IS NOT NULL THEN
        v_initial_status := 'ASSIGNED';
    END IF;

    -- Insert work order
    INSERT INTO public.maintenance_work_orders (
        property_id,
        room_id,
        asset_id,
        title,
        description,
        category,
        priority,
        status,
        reported_by,
        assigned_to,
        reported_at,
        scheduled_for
    ) VALUES (
        p_property_id,
        p_room_id,
        p_asset_id,
        p_title,
        p_description,
        p_category,
        p_priority,
        v_initial_status,
        v_reported_by,
        p_assigned_to,
        now(),
        p_scheduled_for
    ) RETURNING id INTO v_work_order_id;

    -- Log initial event
    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        p_property_id,
        v_work_order_id,
        'CREATED',
        NULL,
        v_initial_status,
        v_user_id,
        COALESCE(p_description, 'Work order reported')
    );

    IF p_assigned_to IS NOT NULL THEN
        INSERT INTO public.maintenance_work_order_events (
            property_id,
            work_order_id,
            event_type,
            from_status,
            to_status,
            performed_by,
            notes
        ) VALUES (
            p_property_id,
            v_work_order_id,
            'ASSIGNED',
            'OPEN',
            'ASSIGNED',
            v_user_id,
            'Assigned upon creation'
        );
    END IF;

    SELECT json_build_object(
        'success', true,
        'work_order_id', v_work_order_id,
        'status', v_initial_status
    )::jsonb INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Assign Maintenance Work Order
CREATE OR REPLACE FUNCTION public.assign_maintenance_work_order(
    p_work_order_id UUID,
    p_assigned_to UUID,
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
    v_assigned_has_membership BOOLEAN;
    v_new_status VARCHAR(50);
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    -- Verify assignment permissions (HOTEL_OWNER, GENERAL_MANAGER, FRONT_DESK, MAINTENANCE supervisor)
    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: User role cannot assign maintenance work orders';
    END IF;

    IF v_wo.status IN ('CLOSED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Cannot assign closed or cancelled work order';
    END IF;

    -- Verify assigned user has property membership
    SELECT EXISTS (
        SELECT 1 FROM public.property_memberships
        WHERE user_id = p_assigned_to AND property_id = v_wo.property_id
    ) INTO v_assigned_has_membership;

    IF NOT v_assigned_has_membership THEN
        RAISE EXCEPTION 'Assigned technician is not a member of property';
    END IF;

    v_new_status := CASE 
        WHEN v_wo.status = 'OPEN' THEN 'ASSIGNED'
        ELSE v_wo.status 
    END;

    UPDATE public.maintenance_work_orders
    SET assigned_to = p_assigned_to,
        scheduled_for = COALESCE(p_scheduled_for, scheduled_for),
        status = v_new_status,
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'ASSIGNED',
        v_wo.status,
        v_new_status,
        v_user_id,
        COALESCE(p_notes, 'Technician assigned')
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', v_new_status,
        'assigned_to', p_assigned_to
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Start Maintenance Work Order
CREATE OR REPLACE FUNCTION public.start_maintenance_work_order(
    p_work_order_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only maintenance staff and managers can start work orders';
    END IF;

    IF v_wo.status NOT IN ('OPEN', 'ASSIGNED', 'ON_HOLD') THEN
        RAISE EXCEPTION 'Work order cannot be started from current status %', v_wo.status;
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'IN_PROGRESS',
        started_at = COALESCE(started_at, now()),
        assigned_to = COALESCE(assigned_to, v_user_id),
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'STARTED',
        v_wo.status,
        'IN_PROGRESS',
        v_user_id,
        COALESCE(p_notes, 'Maintenance work started')
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'IN_PROGRESS'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Hold Maintenance Work Order
CREATE OR REPLACE FUNCTION public.hold_maintenance_work_order(
    p_work_order_id UUID,
    p_reason TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only maintenance staff and managers can put work orders on hold';
    END IF;

    IF v_wo.status <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Only in-progress work orders can be put on hold';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Hold reason is required';
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'ON_HOLD',
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'PUT_ON_HOLD',
        'IN_PROGRESS',
        'ON_HOLD',
        v_user_id,
        p_reason
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'ON_HOLD'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Resume Maintenance Work Order
CREATE OR REPLACE FUNCTION public.resume_maintenance_work_order(
    p_work_order_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only maintenance staff and managers can resume work orders';
    END IF;

    IF v_wo.status <> 'ON_HOLD' THEN
        RAISE EXCEPTION 'Only on-hold work orders can be resumed';
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'IN_PROGRESS',
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'RESUMED',
        'ON_HOLD',
        'IN_PROGRESS',
        v_user_id,
        COALESCE(p_notes, 'Maintenance work resumed')
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'IN_PROGRESS'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Resolve Maintenance Work Order
CREATE OR REPLACE FUNCTION public.resolve_maintenance_work_order(
    p_work_order_id UUID,
    p_resolution_notes TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only maintenance staff and managers can resolve work orders';
    END IF;

    IF v_wo.status NOT IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') THEN
        RAISE EXCEPTION 'Work order cannot be resolved from current status %', v_wo.status;
    END IF;

    IF p_resolution_notes IS NULL OR TRIM(p_resolution_notes) = '' THEN
        RAISE EXCEPTION 'Resolution notes are required to resolve a work order';
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'RESOLVED',
        resolved_at = now(),
        resolution_notes = p_resolution_notes,
        updated_at = now()
    WHERE id = p_work_order_id;

    -- Update asset status if attached
    IF v_wo.asset_id IS NOT NULL THEN
        UPDATE public.maintenance_assets
        SET status = 'OPERATIONAL',
            updated_at = now()
        WHERE id = v_wo.asset_id;
    END IF;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'RESOLVED',
        v_wo.status,
        'RESOLVED',
        v_user_id,
        p_resolution_notes
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'RESOLVED'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Close Maintenance Work Order
CREATE OR REPLACE FUNCTION public.close_maintenance_work_order(
    p_work_order_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only management can administratively close work orders';
    END IF;

    IF v_wo.status NOT IN ('RESOLVED', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') THEN
        RAISE EXCEPTION 'Work order cannot be closed from current status %', v_wo.status;
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'CLOSED',
        closed_at = now(),
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'CLOSED',
        v_wo.status,
        'CLOSED',
        v_user_id,
        COALESCE(p_notes, 'Work order closed administratively')
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'CLOSED'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Cancel Maintenance Work Order
CREATE OR REPLACE FUNCTION public.cancel_maintenance_work_order(
    p_work_order_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: User role cannot cancel maintenance work orders';
    END IF;

    IF v_wo.status IN ('CLOSED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Cannot cancel an already closed or cancelled work order';
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'CANCELLED',
        cancelled_at = now(),
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'CANCELLED',
        v_wo.status,
        'CANCELLED',
        v_user_id,
        COALESCE(p_reason, 'Work order cancelled')
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'CANCELLED'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Reopen Maintenance Work Order
CREATE OR REPLACE FUNCTION public.reopen_maintenance_work_order(
    p_work_order_id UUID,
    p_reason TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Only management can reopen work orders';
    END IF;

    IF v_wo.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Only resolved, closed, or cancelled work orders can be reopened';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Reopening reason is required';
    END IF;

    UPDATE public.maintenance_work_orders
    SET status = 'OPEN',
        resolved_at = NULL,
        closed_at = NULL,
        cancelled_at = NULL,
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'REOPENED',
        v_wo.status,
        'OPEN',
        v_user_id,
        p_reason
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'status', 'OPEN'
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update Priority & Add Note Functions
CREATE OR REPLACE FUNCTION public.update_maintenance_work_order_priority(
    p_work_order_id UUID,
    p_priority VARCHAR(20),
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    SELECT public.user_has_property_role(v_user_id, v_wo.property_id, ARRAY[
        'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'MAINTENANCE'
    ]) OR public.is_platform_super_admin(v_user_id) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: User role cannot change priority';
    END IF;

    IF p_priority NOT IN ('LOW', 'NORMAL', 'HIGH', 'URGENT') THEN
        RAISE EXCEPTION 'Invalid priority %', p_priority;
    END IF;

    UPDATE public.maintenance_work_orders
    SET priority = p_priority,
        updated_at = now()
    WHERE id = p_work_order_id;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'PRIORITY_CHANGED',
        v_wo.status,
        v_wo.status,
        v_user_id,
        COALESCE(p_notes, 'Priority changed to ' || p_priority)
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id,
        'priority', p_priority
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_maintenance_work_order_note(
    p_work_order_id UUID,
    p_notes TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_wo RECORD;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    SELECT * INTO v_wo FROM public.maintenance_work_orders WHERE id = p_work_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance work order not found';
    END IF;

    IF NOT public.user_belongs_to_property(v_user_id, v_wo.property_id) AND NOT public.is_platform_super_admin(v_user_id) THEN
        RAISE EXCEPTION 'Access denied: User does not belong to property';
    END IF;

    IF p_notes IS NULL OR TRIM(p_notes) = '' THEN
        RAISE EXCEPTION 'Note text cannot be empty';
    END IF;

    INSERT INTO public.maintenance_work_order_events (
        property_id,
        work_order_id,
        event_type,
        from_status,
        to_status,
        performed_by,
        notes
    ) VALUES (
        v_wo.property_id,
        p_work_order_id,
        'NOTE_ADDED',
        v_wo.status,
        v_wo.status,
        v_user_id,
        p_notes
    );

    RETURN json_build_object(
        'success', true,
        'work_order_id', p_work_order_id
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Explicit Management Room Operational Status Override (OUT_OF_ORDER / OUT_OF_SERVICE)
CREATE OR REPLACE FUNCTION public.set_room_maintenance_status(
    p_property_id UUID,
    p_room_id UUID,
    p_operational_status VARCHAR(50),
    p_reason TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_is_manager BOOLEAN;
    v_room RECORD;
    v_has_active_stay BOOLEAN;
BEGIN
    v_user_id := COALESCE(p_performed_by, auth.uid());

    -- Verify room exists and belongs to property
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND property_id = p_property_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room (ID: %) does not belong to property (ID: %)', p_room_id, p_property_id;
    END IF;

    -- Only management can take a room out of order or out of service
    SELECT public.user_has_property_role(v_user_id, p_property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER']) 
        OR public.is_platform_super_admin(v_user_id) INTO v_is_manager;

    IF NOT v_is_manager THEN
        RAISE EXCEPTION 'Unauthorized: Only Hotel Owners and General Managers can change room maintenance operational status';
    END IF;

    IF p_operational_status NOT IN ('AVAILABLE', 'DIRTY', 'OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN
        RAISE EXCEPTION 'Invalid operational status % for maintenance override', p_operational_status;
    END IF;

    -- Check if room has an active CHECKED_IN stay
    SELECT EXISTS (
        SELECT 1 FROM public.stays
        WHERE room_id = p_room_id 
          AND status = 'CHECKED_IN'
    ) INTO v_has_active_stay;

    IF v_has_active_stay AND p_operational_status = 'AVAILABLE' THEN
        RAISE EXCEPTION 'Room has an active CHECKED_IN stay and cannot be marked AVAILABLE';
    END IF;

    UPDATE public.rooms
    SET status = p_operational_status,
        updated_at = now()
    WHERE id = p_room_id;

    RETURN json_build_object(
        'success', true,
        'room_id', p_room_id,
        'status', p_operational_status
    )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
