-- ==============================================================================
-- STAYHUB — PHASE 21: NOTIFICATIONS, INTEGRATIONS & ONLINE BOOKING SCHEMA
-- ==============================================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'IN_APP',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_property_category ON public.notifications(property_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_idempotency ON public.notifications(idempotency_key);

-- 2. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    category_preferences JSONB NOT NULL DEFAULT '{
        "BOOKINGS": true,
        "PAYMENTS": true,
        "HOUSEKEEPING": true,
        "MAINTENANCE": true,
        "RESTAURANT": true,
        "INVENTORY": true,
        "STAFF": true,
        "GUEST_SERVICES": true,
        "SYSTEM": true
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, property_id)
);

-- 3. PROPERTY INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.property_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    provider_id VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    is_configured BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(property_id, provider_id)
);

-- 4. PROPERTY ONLINE BOOKING SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.property_online_booking_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    booking_slug VARCHAR(100) NOT NULL UNIQUE,
    public_hotel_name VARCHAR(255) NOT NULL,
    public_description TEXT,
    public_phone VARCHAR(50),
    public_email VARCHAR(255),
    public_address TEXT,
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    booking_terms TEXT,
    cancellation_policy TEXT,
    max_booking_window_days INTEGER NOT NULL DEFAULT 365,
    min_lead_time_hours INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_online_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Staff can view integrations" ON public.property_integrations
    FOR SELECT USING (true);

CREATE POLICY "Staff can manage integrations" ON public.property_integrations
    FOR ALL USING (true);

CREATE POLICY "Public can view online booking settings" ON public.property_online_booking_settings
    FOR SELECT USING (is_enabled = true);

CREATE POLICY "Staff can manage online booking settings" ON public.property_online_booking_settings
    FOR ALL USING (true);
