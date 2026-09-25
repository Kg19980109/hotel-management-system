import { createClient } from "@/lib/supabase/client";
import {
  GuestQrCode,
  GuestSession,
  GuestQrResolutionResult,
  GuestVerifiedSessionContext,
  hashToken,
} from "./types";

/**
 * Fetch staff-accessible list of QR access points for the active property
 */
export async function getGuestQrCodes(propertyId: string): Promise<GuestQrCode[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("guest_qr_codes")
    .select(`
      *,
      room:rooms(id, room_number, room_type_id),
      restaurant_table:restaurant_tables(id, table_number, restaurant_id)
    `)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching guest QR codes:", error);
    return [];
  }

  return (data || []) as GuestQrCode[];
}

/**
 * Fetch staff-accessible list of active/recent guest sessions for a property
 */
export async function getGuestSessions(propertyId: string): Promise<GuestSession[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("guest_sessions")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching guest sessions:", error);
    return [];
  }

  return (data || []) as GuestSession[];
}

/**
 * Public resolver for QR access from raw opaque token
 */
export async function resolveGuestQrAccess(rawToken: string): Promise<GuestQrResolutionResult> {
  const supabase = createClient();
  const tokenHash = hashToken(rawToken);

  const { data, error } = await supabase.rpc("resolve_guest_qr_access", {
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    return {
      valid: false,
      error: error?.message || "QR code is invalid or expired.",
    };
  }

  return data as GuestQrResolutionResult;
}

/**
 * Public/Guest validator for session from raw opaque session token
 */
export async function validateGuestSessionToken(rawSessionToken: string): Promise<GuestVerifiedSessionContext> {
  const supabase = createClient();
  const sessionTokenHash = hashToken(rawSessionToken);

  const { data, error } = await supabase.rpc("validate_guest_session", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data) {
    return {
      valid: false,
      error: error?.message || "Guest session is invalid or expired.",
    };
  }

  return data as GuestVerifiedSessionContext;
}

/**
 * Fetch public restaurants for a property (without internal operational notes)
 */
export async function getPublicRestaurants(propertyId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, code, description, currency, timezone, is_active")
    .eq("property_id", propertyId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching public restaurants:", error);
    return [];
  }

  return data || [];
}
