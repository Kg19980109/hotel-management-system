import { createHash, randomBytes } from "crypto";

export type QrType = "ROOM" | "HOTEL_GENERAL" | "RESTAURANT_TABLE" | "OTHER";
export type SessionType = "VERIFIED_STAY" | "PUBLIC_HOTEL";
export type VerificationMethod = "CONFIRMATION_CODE" | "LASTNAME_CONFIRMATION" | "PUBLIC_ACCESS" | "FRONT_DESK_DIRECT";

export interface GuestQrCode {
  id: string;
  property_id: string;
  qr_type: QrType;
  room_id: string | null;
  restaurant_table_id: string | null;
  name: string;
  token_hash: string;
  raw_token?: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  room?: {
    id: string;
    room_number: string;
    room_type_id: string | null;
  } | null;
  restaurant_table?: {
    id: string;
    table_number: string;
    restaurant_id: string;
  } | null;
}

export interface GuestSession {
  id: string;
  property_id: string;
  qr_code_id: string | null;
  room_id: string | null;
  guest_id: string | null;
  stay_id: string | null;
  session_type: SessionType;
  session_token_hash: string;
  verification_method: VerificationMethod;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  created_ip_hash: string | null;
  user_agent_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestQrResolutionResult {
  valid: boolean;
  error?: string;
  qr_type?: QrType;
  qr_id?: string;
  property_id?: string;
  property_name?: string;
  property_code?: string;
  address?: string;
  city?: string;
  phone?: string;
  front_desk_phone?: string;
  email?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  check_in_time?: string;
  check_out_time?: string;
  wifi_ssid?: string | null;
  wifi_password?: string | null;
  // Room specific
  room_id?: string;
  room_number?: string;
  room_type?: string;
  has_active_stay?: boolean;
}

export interface GuestVerifiedSessionContext {
  valid: boolean;
  error?: string;
  session_id?: string;
  session_type?: SessionType;
  property_id?: string;
  property_name?: string;
  phone?: string;
  front_desk_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  wifi_ssid?: string | null;
  wifi_password?: string | null;
  amenities?: string[];
  // Safe Stay Context
  room_id?: string;
  room_number?: string;
  room_type?: string;
  guest_first_name?: string;
  guest_last_name?: string;
  check_in_date?: string;
  expected_check_out_date?: string;
  adults?: number;
  children?: number;
  check_in_time?: string;
  check_out_time?: string;
}

/**
 * Generate a cryptographically secure opaque token
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}

/**
 * Compute SHA-256 hash of a token for secure database storage
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
