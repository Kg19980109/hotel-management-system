// ============================================================
// STAYHUB GUEST CRM SERVER ACTIONS (Phase 9)
// ============================================================

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasGuestPermission, GuestPermission } from "./permissions";
import {
  CreateGuestInput,
  UpdateGuestInput,
  PreferenceType,
} from "./types";

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionAuthResult {
  userId: string;
  roleCode: string;
}

/**
 * Internal helper to authenticate and verify user membership and role in property
 */
async function authenticateGuestSession(
  propertyId: string,
  requiredPermission?: GuestPermission
): Promise<{ auth?: SessionAuthResult; error?: string }> {
  if (!propertyId) {
    return { error: "Property context is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required to perform guest operations." };
  }

  const { data: membership, error: memberError } = await supabase
    .from("property_memberships")
    .select(`
      id,
      status,
      roles:role_id (
        code
      )
    `)
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .eq("status", "active")
    .maybeSingle();

  if (memberError || !membership) {
    return { error: "Access denied. You do not have an active membership for this property." };
  }

  const roleObj = membership.roles as unknown as { code?: string } | null;
  const roleCode = roleObj?.code || "RECEPTIONIST";

  if (requiredPermission && !hasGuestPermission([roleCode], requiredPermission)) {
    return {
      error: `Access denied. Your role (${roleCode}) lacks the ${requiredPermission} permission.`,
    };
  }

  return { auth: { userId: user.id, roleCode } };
}

/**
 * Create a new guest profile
 */
export async function createGuestAction(
  input: CreateGuestInput
): Promise<ActionResponse<{ guestId: string }>> {
  const authRes = await authenticateGuestSession(input.propertyId, "GUEST_CREATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("guests")
      .insert({
        property_id: input.propertyId,
        title: input.title || null,
        first_name: input.firstName.trim(),
        middle_name: input.middleName?.trim() || null,
        last_name: input.lastName.trim(),
        preferred_name: input.preferredName?.trim() || null,
        gender: input.gender || null,
        preferred_language: input.preferredLanguage || "en",
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        alternate_phone: input.alternatePhone?.trim() || null,
        country_code: input.countryCode?.trim() || null,
        nationality: input.nationality?.trim() || null,
        date_of_birth: input.dateOfBirth || null,
        address_line_1: input.addressLine1?.trim() || null,
        address_line_2: input.addressLine2?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        postal_code: input.postalCode?.trim() || null,
        country: input.country?.trim() || null,
        id_document_type: input.idDocumentType || null,
        id_document_number: input.idDocumentNumber?.trim() || null,
        id_document_country: input.idDocumentCountry?.trim() || null,
        company_name: input.companyName?.trim() || null,
        job_title: input.jobTitle?.trim() || null,
        notes: input.notes?.trim() || null,
        marketing_consent: input.marketingConsent || false,
        status: input.status || "ACTIVE",
        created_by: authRes.auth?.userId,
        updated_by: authRes.auth?.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("createGuestAction error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/guests");
    revalidatePath("/bookings/new");
    return { success: true, data: { guestId: data.id } };
  } catch (err: unknown) {
    console.error("createGuestAction exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create guest." };
  }
}

/**
 * Update an existing guest profile
 */
export async function updateGuestAction(
  input: UpdateGuestInput
): Promise<ActionResponse<{ guestId: string }>> {
  const authRes = await authenticateGuestSession(input.propertyId, "GUEST_UPDATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authRes.auth?.userId,
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.firstName !== undefined) updatePayload.first_name = input.firstName.trim();
    if (input.middleName !== undefined) updatePayload.middle_name = input.middleName?.trim() || null;
    if (input.lastName !== undefined) updatePayload.last_name = input.lastName.trim();
    if (input.preferredName !== undefined) updatePayload.preferred_name = input.preferredName?.trim() || null;
    if (input.gender !== undefined) updatePayload.gender = input.gender;
    if (input.preferredLanguage !== undefined) updatePayload.preferred_language = input.preferredLanguage;
    if (input.email !== undefined) updatePayload.email = input.email?.trim() || null;
    if (input.phone !== undefined) updatePayload.phone = input.phone?.trim() || null;
    if (input.alternatePhone !== undefined) updatePayload.alternate_phone = input.alternatePhone?.trim() || null;
    if (input.countryCode !== undefined) updatePayload.country_code = input.countryCode?.trim() || null;
    if (input.nationality !== undefined) updatePayload.nationality = input.nationality?.trim() || null;
    if (input.dateOfBirth !== undefined) updatePayload.date_of_birth = input.dateOfBirth || null;
    if (input.addressLine1 !== undefined) updatePayload.address_line_1 = input.addressLine1?.trim() || null;
    if (input.addressLine2 !== undefined) updatePayload.address_line_2 = input.addressLine2?.trim() || null;
    if (input.city !== undefined) updatePayload.city = input.city?.trim() || null;
    if (input.state !== undefined) updatePayload.state = input.state?.trim() || null;
    if (input.postalCode !== undefined) updatePayload.postal_code = input.postalCode?.trim() || null;
    if (input.country !== undefined) updatePayload.country = input.country?.trim() || null;
    if (input.idDocumentType !== undefined) updatePayload.id_document_type = input.idDocumentType || null;
    if (input.idDocumentNumber !== undefined) updatePayload.id_document_number = input.idDocumentNumber?.trim() || null;
    if (input.idDocumentCountry !== undefined) updatePayload.id_document_country = input.idDocumentCountry?.trim() || null;
    if (input.companyName !== undefined) updatePayload.company_name = input.companyName?.trim() || null;
    if (input.jobTitle !== undefined) updatePayload.job_title = input.jobTitle?.trim() || null;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
    if (input.marketingConsent !== undefined) updatePayload.marketing_consent = input.marketingConsent;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { error } = await supabase
      .from("guests")
      .update(updatePayload)
      .eq("property_id", input.propertyId)
      .eq("id", input.id);

    if (error) {
      console.error("updateGuestAction error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/guests");
    revalidatePath(`/guests/${input.id}`);
    return { success: true, data: { guestId: input.id } };
  } catch (err: unknown) {
    console.error("updateGuestAction exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update guest." };
  }
}

/**
 * Soft Deactivate a guest
 */
export async function deactivateGuestAction(
  propertyId: string,
  guestId: string
): Promise<ActionResponse<{ guestId: string }>> {
  const authRes = await authenticateGuestSession(propertyId, "GUEST_DEACTIVATE");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("guests")
      .update({
        status: "INACTIVE",
        updated_at: new Date().toISOString(),
        updated_by: authRes.auth?.userId,
      })
      .eq("property_id", propertyId)
      .eq("id", guestId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/guests");
    revalidatePath(`/guests/${guestId}`);
    return { success: true, data: { guestId } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to deactivate guest." };
  }
}

/**
 * Add a guest preference
 */
export async function addGuestPreferenceAction(
  propertyId: string,
  guestId: string,
  preferenceType: PreferenceType,
  preferenceValue: string,
  notes?: string
): Promise<ActionResponse<{ preferenceId: string }>> {
  const authRes = await authenticateGuestSession(propertyId, "GUEST_MANAGE_PREFERENCES");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("guest_preferences")
      .insert({
        property_id: propertyId,
        guest_id: guestId,
        preference_type: preferenceType,
        preference_value: preferenceValue.trim(),
        notes: notes?.trim() || null,
        created_by: authRes.auth?.userId,
        updated_by: authRes.auth?.userId,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guests/${guestId}`);
    return { success: true, data: { preferenceId: data.id } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add preference." };
  }
}

/**
 * Delete a guest preference
 */
export async function deleteGuestPreferenceAction(
  propertyId: string,
  guestId: string,
  preferenceId: string
): Promise<ActionResponse<{ success: boolean }>> {
  const authRes = await authenticateGuestSession(propertyId, "GUEST_MANAGE_PREFERENCES");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("guest_preferences")
      .delete()
      .eq("property_id", propertyId)
      .eq("guest_id", guestId)
      .eq("id", preferenceId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guests/${guestId}`);
    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete preference." };
  }
}

/**
 * Add an internal guest note
 */
export async function addGuestNoteAction(
  propertyId: string,
  guestId: string,
  note: string,
  isPinned = false
): Promise<ActionResponse<{ noteId: string }>> {
  const authRes = await authenticateGuestSession(propertyId, "GUEST_MANAGE_NOTES");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("guest_notes")
      .insert({
        property_id: propertyId,
        guest_id: guestId,
        note: note.trim(),
        is_pinned: isPinned,
        created_by: authRes.auth?.userId,
        updated_by: authRes.auth?.userId,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guests/${guestId}`);
    return { success: true, data: { noteId: data.id } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add note." };
  }
}

/**
 * Delete an internal guest note
 */
export async function deleteGuestNoteAction(
  propertyId: string,
  guestId: string,
  noteId: string
): Promise<ActionResponse<{ success: boolean }>> {
  const authRes = await authenticateGuestSession(propertyId, "GUEST_MANAGE_NOTES");
  if (authRes.error) {
    return { success: false, error: authRes.error };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("guest_notes")
      .delete()
      .eq("property_id", propertyId)
      .eq("guest_id", guestId)
      .eq("id", noteId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/guests/${guestId}`);
    return { success: true, data: { success: true } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete note." };
  }
}
