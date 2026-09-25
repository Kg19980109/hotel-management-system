-- ==============================================================================
-- STAYHUB — PHASE 10: HOUSEKEEPING MANAGEMENT & ROOM CLEANING OPERATIONS
-- Migration: 20260925000012_create_housekeeping_management.sql
-- ==============================================================================

-- 1. Create Housekeeping Tasks table
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL DEFAULT 'CLEANING' CHECK (task_type IN ('CLEANING', 'DEEP_CLEAN', 'TURNDOWN', 'INSPECTION', 'LINEN_CHANGE', 'TOUCHUP')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scheduled_for DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index to enforce that there cannot be multiple active/open tasks of the same type for the same room
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_housekeeping_task 
ON public.housekeeping_tasks (room_id, task_type) 
WHERE (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING'));

-- Indexes for performance & query filtering
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_property_status ON public.housekeeping_tasks(property_id, status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_property_scheduled ON public.housekeeping_tasks(property_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room ON public.housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_assigned_to ON public.housekeeping_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_priority ON public.housekeeping_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_created_at ON public.housekeeping_tasks(created_at);

-- 2. Create Housekeeping Inspections table
CREATE TABLE IF NOT EXISTS public.housekeeping_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    housekeeping_task_id UUID NOT NULL REFERENCES public.housekeeping_tasks(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES auth.users(id),
    result VARCHAR(20) NOT NULL CHECK (result IN ('PASSED', 'FAILED')),
    notes TEXT,
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housekeeping_inspections_property ON public.housekeeping_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_inspections_task ON public.housekeeping_inspections(housekeeping_task_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_inspections_room ON public.housekeeping_inspections(room_id);

-- 3. Cross-Tenant and Assignment Integrity Triggers
CREATE OR REPLACE FUNCTION public.check_housekeeping_task_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_room_property_id UUID;
    v_assigned_has_membership BOOLEAN;
BEGIN
    -- Verify room belongs to the exact same property
    SELECT property_id INTO v_room_property_id FROM public.rooms WHERE id = NEW.room_id;
    IF v_room_property_id IS NULL OR v_room_property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Housekeeping task room (ID: %) does not belong to property (ID: %)', NEW.room_id, NEW.property_id;
    END IF;

    -- Verify assigned staff belongs to the same property
    IF NEW.assigned_to IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.property_memberships 
            WHERE user_id = NEW.assigned_to 
              AND property_id = NEW.property_id
        ) INTO v_assigned_has_membership;
        
        IF NOT v_assigned_has_membership THEN
            RAISE EXCEPTION 'Assigned user (ID: %) is not a member of property (ID: %)', NEW.assigned_to, NEW.property_id;
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_housekeeping_task_tenant ON public.housekeeping_tasks;
CREATE TRIGGER trg_check_housekeeping_task_tenant
    BEFORE INSERT OR UPDATE ON public.housekeeping_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_housekeeping_task_tenant_consistency();

CREATE OR REPLACE FUNCTION public.check_housekeeping_inspection_tenant_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_task_property_id UUID;
    v_task_room_id UUID;
    v_room_property_id UUID;
    v_inspector_has_membership BOOLEAN;
BEGIN
    -- Verify task exists and belongs to same property and room
    SELECT property_id, room_id INTO v_task_property_id, v_task_room_id 
    FROM public.housekeeping_tasks 
    WHERE id = NEW.housekeeping_task_id;

    IF v_task_property_id IS NULL OR v_task_property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Inspection task does not belong to property (ID: %)', NEW.property_id;
    END IF;

    IF v_task_room_id <> NEW.room_id THEN
        RAISE EXCEPTION 'Inspection room (ID: %) does not match task room (ID: %)', NEW.room_id, v_task_room_id;
    END IF;

    SELECT property_id INTO v_room_property_id FROM public.rooms WHERE id = NEW.room_id;
    IF v_room_property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Inspection room does not belong to property (ID: %)', NEW.property_id;
    END IF;

    -- Verify inspector has property membership
    SELECT EXISTS (
        SELECT 1 FROM public.property_memberships 
        WHERE user_id = NEW.inspector_id 
          AND property_id = NEW.property_id
    ) INTO v_inspector_has_membership;

    IF NOT v_inspector_has_membership THEN
        RAISE EXCEPTION 'Inspector (ID: %) is not a member of property (ID: %)', NEW.inspector_id, NEW.property_id;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_housekeeping_inspection_tenant ON public.housekeeping_inspections;
CREATE TRIGGER trg_check_housekeeping_inspection_tenant
    BEFORE INSERT OR UPDATE ON public.housekeeping_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.check_housekeeping_inspection_tenant_consistency();

-- 4. Enable RLS
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for housekeeping_tasks
DROP POLICY IF EXISTS "Users can view housekeeping tasks for their properties" ON public.housekeeping_tasks;
CREATE POLICY "Users can view housekeeping tasks for their properties" ON public.housekeeping_tasks
    FOR SELECT USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS "Authorized staff can insert housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Authorized staff can insert housekeeping tasks" ON public.housekeeping_tasks
    FOR INSERT WITH CHECK (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    );

DROP POLICY IF EXISTS "Authorized staff can update housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Authorized staff can update housekeeping tasks" ON public.housekeeping_tasks
    FOR UPDATE USING (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    )
    WITH CHECK (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    );

DROP POLICY IF EXISTS "Property admins can delete housekeeping tasks" ON public.housekeeping_tasks;
CREATE POLICY "Property admins can delete housekeeping tasks" ON public.housekeeping_tasks
    FOR DELETE USING (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER']
        )
    );

-- RLS Policies for housekeeping_inspections
DROP POLICY IF EXISTS "Users can view inspections for their properties" ON public.housekeeping_inspections;
CREATE POLICY "Users can view inspections for their properties" ON public.housekeeping_inspections
    FOR SELECT USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS "Authorized staff can insert inspections" ON public.housekeeping_inspections;
CREATE POLICY "Authorized staff can insert inspections" ON public.housekeeping_inspections
    FOR INSERT WITH CHECK (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    );

DROP POLICY IF EXISTS "Authorized staff can update inspections" ON public.housekeeping_inspections;
CREATE POLICY "Authorized staff can update inspections" ON public.housekeeping_inspections
    FOR UPDATE USING (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    )
    WITH CHECK (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'HOUSEKEEPER']
        )
    );

DROP POLICY IF EXISTS "Property admins can delete inspections" ON public.housekeeping_inspections;
CREATE POLICY "Property admins can delete inspections" ON public.housekeeping_inspections
    FOR DELETE USING (
        public.user_has_property_role(
            auth.uid(),
            property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER']
        )
    );

-- 5. Atomic Operational RPCs

-- Create/Request Housekeeping Task (Idempotent)
CREATE OR REPLACE FUNCTION public.create_housekeeping_task(
    p_property_id UUID,
    p_room_id UUID,
    p_task_type VARCHAR DEFAULT 'CLEANING',
    p_priority VARCHAR DEFAULT 'NORMAL',
    p_assigned_to UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_scheduled_for DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_existing_task_id UUID;
    v_new_task_id UUID;
    v_task_record RECORD;
    v_initial_status VARCHAR(50);
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;
    
    -- Check if active task of this type already exists for this room
    SELECT id, status INTO v_existing_task_id, v_initial_status
    FROM public.housekeeping_tasks
    WHERE room_id = p_room_id
      AND task_type = p_task_type
      AND status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING')
    LIMIT 1;

    IF v_existing_task_id IS NOT NULL THEN
        -- If priority upgrade requested or assignment updated
        IF p_priority IN ('URGENT', 'HIGH') OR p_assigned_to IS NOT NULL THEN
            UPDATE public.housekeeping_tasks
            SET 
                priority = CASE WHEN p_priority IN ('URGENT', 'HIGH') THEN p_priority ELSE priority END,
                assigned_to = COALESCE(p_assigned_to, assigned_to),
                status = CASE WHEN assigned_to IS NULL AND p_assigned_to IS NOT NULL AND status = 'PENDING' THEN 'ASSIGNED' ELSE status END,
                updated_at = now()
            WHERE id = v_existing_task_id;
        END IF;

        SELECT * INTO v_task_record FROM public.housekeeping_tasks WHERE id = v_existing_task_id;
        RETURN jsonb_build_object(
            'success', true,
            'action', 'reused_existing',
            'task_id', v_existing_task_id,
            'status', v_task_record.status,
            'priority', v_task_record.priority
        );
    END IF;

    -- Determine initial status
    v_initial_status := CASE WHEN p_assigned_to IS NOT NULL THEN 'ASSIGNED' ELSE 'PENDING' END;

    INSERT INTO public.housekeeping_tasks (
        property_id,
        room_id,
        task_type,
        status,
        priority,
        assigned_to,
        scheduled_for,
        notes,
        created_by
    ) VALUES (
        p_property_id,
        p_room_id,
        p_task_type,
        v_initial_status,
        p_priority,
        p_assigned_to,
        p_scheduled_for,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_new_task_id;

    RETURN jsonb_build_object(
        'success', true,
        'action', 'created',
        'task_id', v_new_task_id,
        'status', v_initial_status,
        'priority', p_priority
    );
END;
$$;

-- Assign Task
CREATE OR REPLACE FUNCTION public.assign_housekeeping_task(
    p_task_id UUID,
    p_property_id UUID,
    p_assigned_to UUID,
    p_priority VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_task RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;

    SELECT * INTO v_task FROM public.housekeeping_tasks 
    WHERE id = p_task_id AND property_id = p_property_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Housekeeping task not found or unauthorized';
    END IF;

    IF v_task.status IN ('COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Cannot reassign completed or cancelled task';
    END IF;

    UPDATE public.housekeeping_tasks
    SET 
        assigned_to = p_assigned_to,
        priority = COALESCE(p_priority, priority),
        status = CASE WHEN status = 'PENDING' AND p_assigned_to IS NOT NULL THEN 'ASSIGNED' ELSE status END,
        updated_at = now()
    WHERE id = p_task_id;

    RETURN jsonb_build_object('success', true, 'task_id', p_task_id);
END;
$$;

-- Start Cleaning
CREATE OR REPLACE FUNCTION public.start_housekeeping_task(
    p_task_id UUID,
    p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task RECORD;
    v_room RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;

    SELECT * INTO v_task FROM public.housekeeping_tasks 
    WHERE id = p_task_id AND property_id = p_property_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Housekeeping task not found or unauthorized';
    END IF;

    IF v_task.status IN ('COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Task is already %', v_task.status;
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_task.room_id;

    -- Update Task State
    UPDATE public.housekeeping_tasks
    SET 
        status = 'IN_PROGRESS',
        started_at = COALESCE(started_at, now()),
        assigned_to = COALESCE(assigned_to, v_user_id),
        updated_at = now()
    WHERE id = p_task_id;

    -- Update Room State safely
    -- If the room is NOT OCCUPIED, sync operational status to CLEANING
    IF v_room.status NOT IN ('OCCUPIED') THEN
        UPDATE public.rooms
        SET 
            housekeeping_status = 'CLEANING',
            status = CASE 
                WHEN status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN status 
                ELSE 'CLEANING' 
            END,
            updated_at = now()
        WHERE id = v_task.room_id;
    ELSE
        -- For occupied stay turndown/stayover cleaning, keep housekeeping_status synced
        UPDATE public.rooms
        SET 
            housekeeping_status = 'CLEANING',
            updated_at = now()
        WHERE id = v_task.room_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'status', 'IN_PROGRESS');
END;
$$;

-- Complete Cleaning (Awaiting Inspection)
CREATE OR REPLACE FUNCTION public.complete_housekeeping_task(
    p_task_id UUID,
    p_property_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task RECORD;
    v_room RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;

    SELECT * INTO v_task FROM public.housekeeping_tasks 
    WHERE id = p_task_id AND property_id = p_property_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Housekeeping task not found or unauthorized';
    END IF;

    IF v_task.status IN ('COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Task is already %', v_task.status;
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_task.room_id;

    -- Update Task State
    UPDATE public.housekeeping_tasks
    SET 
        status = 'INSPECTION_PENDING',
        completed_at = now(),
        completed_by = v_user_id,
        notes = CASE 
            WHEN p_notes IS NOT NULL AND p_notes <> '' THEN COALESCE(notes || E'\n' || p_notes, p_notes)
            ELSE notes 
        END,
        updated_at = now()
    WHERE id = p_task_id;

    -- Update Room State
    IF v_room.status NOT IN ('OCCUPIED') THEN
        UPDATE public.rooms
        SET 
            housekeeping_status = 'INSPECTION_PENDING',
            status = CASE 
                WHEN status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN status 
                ELSE 'INSPECTED' -- Transition to pending-inspection operational state
            END,
            updated_at = now()
        WHERE id = v_task.room_id;
    ELSE
        UPDATE public.rooms
        SET 
            housekeeping_status = 'INSPECTION_PENDING',
            updated_at = now()
        WHERE id = v_task.room_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'status', 'INSPECTION_PENDING');
END;
$$;

-- Pass Inspection
CREATE OR REPLACE FUNCTION public.pass_housekeeping_inspection(
    p_task_id UUID,
    p_property_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task RECORD;
    v_room RECORD;
    v_has_active_stay BOOLEAN;
    v_inspection_id UUID;
    v_new_room_status VARCHAR(50);
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;

    SELECT * INTO v_task FROM public.housekeeping_tasks 
    WHERE id = p_task_id AND property_id = p_property_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Housekeeping task not found or unauthorized';
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_task.room_id;

    -- Check if room has active CHECKED_IN stay
    SELECT EXISTS (
        SELECT 1 FROM public.stays 
        WHERE room_id = v_task.room_id AND status = 'CHECKED_IN'
    ) INTO v_has_active_stay;

    -- Record Inspection
    INSERT INTO public.housekeeping_inspections (
        property_id,
        housekeeping_task_id,
        room_id,
        inspector_id,
        result,
        notes
    ) VALUES (
        p_property_id,
        p_task_id,
        v_task.room_id,
        v_user_id,
        'PASSED',
        p_notes
    ) RETURNING id INTO v_inspection_id;

    -- Update Task State to COMPLETED
    UPDATE public.housekeeping_tasks
    SET 
        status = 'COMPLETED',
        updated_at = now()
    WHERE id = p_task_id;

    -- Determine Room status safely:
    -- Invariant: Occupied room stays OCCUPIED.
    -- Invariant: Out of order stays OUT_OF_ORDER.
    -- Invariant: Out of service stays OUT_OF_SERVICE.
    -- Only vacant dirty/cleaning room becomes AVAILABLE.
    IF v_has_active_stay OR v_room.status = 'OCCUPIED' THEN
        v_new_room_status := 'OCCUPIED';
    ELSIF v_room.status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN
        v_new_room_status := v_room.status;
    ELSE
        v_new_room_status := 'AVAILABLE';
    END IF;

    UPDATE public.rooms
    SET 
        housekeeping_status = 'CLEAN',
        status = v_new_room_status,
        updated_at = now()
    WHERE id = v_task.room_id;

    RETURN jsonb_build_object(
        'success', true,
        'inspection_id', v_inspection_id,
        'task_id', p_task_id,
        'result', 'PASSED',
        'room_status', v_new_room_status,
        'housekeeping_status', 'CLEAN'
    );
END;
$$;

-- Fail Inspection (Re-clean Workflow)
CREATE OR REPLACE FUNCTION public.fail_housekeeping_inspection(
    p_task_id UUID,
    p_property_id UUID,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task RECORD;
    v_room RECORD;
    v_inspection_id UUID;
    v_new_room_status VARCHAR(50);
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL AND NOT public.user_belongs_to_property(v_user_id, p_property_id) THEN
        RAISE EXCEPTION 'Unauthorized: user does not have access to property %', p_property_id;
    END IF;

    IF p_notes IS NULL OR trim(p_notes) = '' THEN
        RAISE EXCEPTION 'A reason or note is required when failing an inspection';
    END IF;

    SELECT * INTO v_task FROM public.housekeeping_tasks 
    WHERE id = p_task_id AND property_id = p_property_id;

    IF v_task.id IS NULL THEN
        RAISE EXCEPTION 'Housekeeping task not found or unauthorized';
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_task.room_id;

    -- Record Failed Inspection
    INSERT INTO public.housekeeping_inspections (
        property_id,
        housekeeping_task_id,
        room_id,
        inspector_id,
        result,
        notes
    ) VALUES (
        p_property_id,
        p_task_id,
        v_task.room_id,
        v_user_id,
        'FAILED',
        p_notes
    ) RETURNING id INTO v_inspection_id;

    -- Return Task to IN_PROGRESS with elevated priority for re-clean
    UPDATE public.housekeeping_tasks
    SET 
        status = 'IN_PROGRESS',
        priority = 'HIGH',
        notes = COALESCE(notes || E'\n[INSPECTION FAILED]: ' || p_notes, '[INSPECTION FAILED]: ' || p_notes),
        updated_at = now()
    WHERE id = p_task_id;

    -- Set room status back to DIRTY (never AVAILABLE)
    IF v_room.status NOT IN ('OCCUPIED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN
        v_new_room_status := 'DIRTY';
    ELSE
        v_new_room_status := v_room.status;
    END IF;

    UPDATE public.rooms
    SET 
        housekeeping_status = 'DIRTY',
        status = v_new_room_status,
        updated_at = now()
    WHERE id = v_task.room_id;

    RETURN jsonb_build_object(
        'success', true,
        'inspection_id', v_inspection_id,
        'task_id', p_task_id,
        'result', 'FAILED',
        'room_status', v_new_room_status,
        'housekeeping_status', 'DIRTY'
    );
END;
$$;

-- 6. Integrate with Phase 8 check_out_stay (Trigger Idempotent Housekeeping Task Creation)
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
    v_active_task_exists BOOLEAN;
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
    IF v_stay.room_id IS NOT NULL THEN
        UPDATE public.rooms
        SET 
            status = 'DIRTY',
            housekeeping_status = 'DIRTY',
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_stay.room_id;

        -- 5. PHASE 10: Automatic Idempotent Housekeeping Task Creation
        SELECT EXISTS (
            SELECT 1 FROM public.housekeeping_tasks
            WHERE room_id = v_stay.room_id
              AND task_type = 'CLEANING'
              AND status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING')
        ) INTO v_active_task_exists;

        IF NOT v_active_task_exists THEN
            INSERT INTO public.housekeeping_tasks (
                property_id,
                room_id,
                task_type,
                status,
                priority,
                scheduled_for,
                notes,
                created_by
            ) VALUES (
                p_property_id,
                v_stay.room_id,
                'CLEANING',
                'PENDING',
                'NORMAL',
                CURRENT_DATE,
                'Automatic checkout cleaning task generated',
                v_user_id
            );
        END IF;
    END IF;

    -- 6. Multi-room Parent Reservation Completion Check
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
