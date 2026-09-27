-- Enable realtime for core operational tables
BEGIN;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Drop from publication first to avoid errors if they already exist, then add
-- (A safe pattern is just to ALTER PUBLICATION ... ADD TABLE, but we can do a loop or just catch errors)

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'public.restaurant_orders',
        'public.restaurant_order_items',
        'public.restaurant_order_events',
        'public.menu_categories',
        'public.menu_items',
        'public.restaurant_tables',
        'public.reservations',
        'public.stays',
        'public.rooms',
        'public.guest_folios',
        'public.folio_charges'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', t);
        EXCEPTION WHEN duplicate_object THEN
            -- ignore if it's already there
        END;
    END LOOP;
END $$;

COMMIT;
