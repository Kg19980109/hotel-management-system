"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  generateSecureToken,
  hashToken,
  QrType,
  GuestVerifiedSessionContext,
} from "./types";
import { hasGuestPortalPermission, GuestPortalPermission } from "./permissions";

const GUEST_SESSION_COOKIE_NAME = "stayhub_guest_session";

/**
 * Server-side authorization check for staff operations
 */
async function checkStaffAuth(
  propertyId: string,
  requiredPermission?: GuestPortalPermission
): Promise<{ error?: string; userId?: string; roleCode?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required. Please sign in." };
  }

  // Fetch membership & role
  const { data: membership } = await supabase
    .from("property_memberships")
    .select("role:roles(code), status")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !membership.role) {
    return { error: "Access denied: No active membership for this property." };
  }

  const roleCode = (membership.role as unknown as { code: string })?.code;

  if (requiredPermission && !hasGuestPortalPermission(roleCode, requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks '${requiredPermission}' permission.`,
    };
  }

  return { userId: user.id, roleCode };
}

/**
 * Staff Action: Create a new Guest QR Code access point
 */
export async function createGuestQrCodeAction(formData: {
  propertyId: string;
  qrType: QrType;
  name: string;
  roomId?: string | null;
  restaurantTableId?: string | null;
  expiresAt?: string | null;
}) {
  const auth = await checkStaffAuth(formData.propertyId, "GUEST_QR_CREATE");
  if (auth.error) return { success: false, error: auth.error };

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_guest_qr_code", {
    p_property_id: formData.propertyId,
    p_qr_type: formData.qrType,
    p_name: formData.name,
    p_token_hash: tokenHash,
    p_room_id: formData.roomId || null,
    p_restaurant_table_id: formData.restaurantTableId || null,
    p_expires_at: formData.expiresAt || null,
    p_created_by: auth.userId,
    p_raw_token: rawToken,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to create QR code.",
    };
  }

  revalidatePath("/qr-services");
  return {
    success: true,
    qrCode: data.qr_code,
    rawToken, // Returned once upon creation for initial QR URL generation / preview
  };
}

/**
 * Staff Action: Rotate a Guest QR Code's token
 */
export async function rotateGuestQrCodeAction(qrId: string, propertyId: string) {
  const auth = await checkStaffAuth(propertyId, "GUEST_QR_ROTATE");
  if (auth.error) return { success: false, error: auth.error };

  const newRawToken = generateSecureToken(32);
  const newTokenHash = hashToken(newRawToken);

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rotate_guest_qr_code", {
    p_qr_id: qrId,
    p_property_id: propertyId,
    p_new_token_hash: newTokenHash,
    p_updated_by: auth.userId,
    p_new_raw_token: newRawToken,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to rotate QR code.",
    };
  }

  revalidatePath("/qr-services");
  return {
    success: true,
    qrCode: data.qr_code,
    rawToken: newRawToken,
  };
}

/**
 * Staff Action: Deactivate a Guest QR Code
 */
export async function deactivateGuestQrCodeAction(qrId: string, propertyId: string) {
  const auth = await checkStaffAuth(propertyId, "GUEST_QR_REVOKE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("deactivate_guest_qr_code", {
    p_qr_id: qrId,
    p_property_id: propertyId,
    p_updated_by: auth.userId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to deactivate QR code.",
    };
  }

  revalidatePath("/qr-services");
  return { success: true };
}

/**
 * Staff Action: Revoke an active Guest Session
 */
export async function revokeGuestSessionAction(sessionId: string, propertyId: string) {
  const auth = await checkStaffAuth(propertyId, "GUEST_SESSION_REVOKE");
  if (auth.error) return { success: false, error: auth.error };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("revoke_guest_session", {
    p_session_id: sessionId,
    p_property_id: propertyId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Failed to revoke guest session.",
    };
  }

  revalidatePath("/qr-services");
  return { success: true };
}

/**
 * Public Guest Action: Verify Stay and Create Guest Session
 */
export async function verifyStayAndCreateSessionAction(formData: {
  rawToken: string;
  confirmationNumber: string;
  lastName?: string;
  expiresHours?: number;
}) {
  const rawSessionToken = generateSecureToken(32);
  const sessionTokenHash = hashToken(rawSessionToken);
  const tokenHash = hashToken(formData.rawToken);

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verify_and_create_guest_session", {
    p_token_hash: tokenHash,
    p_confirmation_number: formData.confirmationNumber,
    p_last_name: formData.lastName || null,
    p_session_token_hash: sessionTokenHash,
    p_expires_hours: formData.expiresHours || 24,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Unable to verify stay details with the provided information.",
    };
  }

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: (formData.expiresHours || 24) * 60 * 60,
  });

  return {
    success: true,
    sessionType: data.session_type,
    sessionId: data.session_id,
  };
}

/**
 * Public Guest Action: Instant Seamless Unlock for In-Room QR Code (Demo & Frictionless Mode)
 * Directly grants in-room guest session without requiring reservation confirmation number
 */
export async function unlockSeamlessRoomSessionAction(rawToken: string) {
  return verifyStayAndCreateSessionAction({
    rawToken,
    confirmationNumber: "AUTO",
  });
}

/**
 * Public Guest Action: Establish a Public Hotel Session from General QR
 */
export async function establishPublicHotelSessionAction(rawToken: string) {
  const rawSessionToken = generateSecureToken(32);
  const sessionTokenHash = hashToken(rawSessionToken);
  const tokenHash = hashToken(rawToken);

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("verify_and_create_guest_session", {
    p_token_hash: tokenHash,
    p_confirmation_number: "PUBLIC",
    p_session_token_hash: sessionTokenHash,
    p_expires_hours: 24,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || "Unable to establish hotel session.",
    };
  }

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return {
    success: true,
    sessionType: data.session_type,
    sessionId: data.session_id,
  };
}

/**
 * Helper to fetch active Guest Verified Session Context directly from cookie
 */
export async function getActiveGuestSession(): Promise<GuestVerifiedSessionContext | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const supabase = await createClient();
  const sessionTokenHash = hashToken(sessionCookie.value);

  const { data, error } = await supabase.rpc("validate_guest_session", {
    p_session_token_hash: sessionTokenHash,
  });

  if (error || !data || !data.valid) {
    return null;
  }

  return data as GuestVerifiedSessionContext;
}

/**
 * Helper to get the raw active session token from cookie
 */
export async function getActiveGuestSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(GUEST_SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

/**
 * Public Guest Action: Log out / Clear Guest Portal Session
 */
export async function clearGuestSessionAction() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE_NAME);
  return { success: true };
}
