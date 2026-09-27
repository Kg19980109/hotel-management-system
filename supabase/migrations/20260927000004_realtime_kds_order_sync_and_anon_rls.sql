-- Migration: Real-time KDS-to-Order synchronization & Anon RLS for instant WebSocket notifications
ALTER TABLE public.restaurant_orders REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_order_items REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.kitchen_ticket_items REPLICA IDENTITY FULL;
ALTER TABLE public.guest_service_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'kitchen_ticket_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_ticket_items;
  END IF;
END $$;

-- Allow anon & authenticated SELECT on operational & guest order tracking tables for Supabase Realtime
DROP POLICY IF EXISTS rls_restaurant_orders_select_anon ON public.restaurant_orders;
CREATE POLICY rls_restaurant_orders_select_anon ON public.restaurant_orders
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS rls_kitchen_tickets_select_anon ON public.kitchen_tickets;
CREATE POLICY rls_kitchen_tickets_select_anon ON public.kitchen_tickets
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS rls_kitchen_ticket_items_select_anon ON public.kitchen_ticket_items;
CREATE POLICY rls_kitchen_ticket_items_select_anon ON public.kitchen_ticket_items
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS rls_restaurant_order_items_select_anon ON public.restaurant_order_items;
CREATE POLICY rls_restaurant_order_items_select_anon ON public.restaurant_order_items
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS rls_guest_service_requests_select_anon ON public.guest_service_requests;
CREATE POLICY rls_guest_service_requests_select_anon ON public.guest_service_requests
  FOR SELECT TO anon, authenticated
  USING (true);

-- Auto-sync Kitchen Ticket status changes to Restaurant Order status
CREATE OR REPLACE FUNCTION public.sync_kitchen_ticket_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_order_status VARCHAR(30);
  v_event_type VARCHAR(30);
BEGIN
  IF NEW.restaurant_order_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status = 'IN_PROGRESS' THEN
      v_target_order_status := 'PREPARING';
      v_event_type := 'UPDATED';
    ELSIF NEW.status = 'READY' THEN
      v_target_order_status := 'READY';
      v_event_type := 'UPDATED';
    ELSIF NEW.status = 'COMPLETED' THEN
      v_target_order_status := 'SERVED';
      v_event_type := 'COMPLETED';
    ELSIF NEW.status = 'CANCELLED' THEN
      v_target_order_status := 'CANCELLED';
      v_event_type := 'CANCELLED';
    ELSE
      v_target_order_status := NULL;
    END IF;

    IF v_target_order_status IS NOT NULL THEN
      UPDATE public.restaurant_orders
      SET status = v_target_order_status,
          updated_at = now()
      WHERE id = NEW.restaurant_order_id
        AND status NOT IN ('CANCELLED');

      INSERT INTO public.restaurant_order_events (
        property_id,
        order_id,
        event_type,
        to_status,
        notes
      ) VALUES (
        NEW.property_id,
        NEW.restaurant_order_id,
        v_event_type,
        v_target_order_status,
        'Kitchen ticket status transitioned to ' || NEW.status
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kitchen_ticket_to_order ON public.kitchen_tickets;
CREATE TRIGGER trg_sync_kitchen_ticket_to_order
AFTER UPDATE OF status ON public.kitchen_tickets
FOR EACH ROW
EXECUTE FUNCTION public.sync_kitchen_ticket_to_order();
