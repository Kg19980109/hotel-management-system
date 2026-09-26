"use server";

// ============================================================
// STAFF MANAGEMENT SERVER ACTIONS — StayHub
//
// Payroll is strictly excluded per operational guidelines.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { CreateStaffInput, UpdateStaffInput } from "./types";
import { revalidatePath } from "next/cache";

async function verifyAuth(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required. Please sign in." };
  }

  const { data: membership } = await supabase
    .from("property_memberships")
    .select("role:roles(code), status")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    return { error: "Access denied: No active membership for this property." };
  }

  return { userId: user.id };
}

export async function createStaffMemberAction(
  propertyId: string,
  input: CreateStaffInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const supabase = await createClient();

    // Auto-generate employee code if missing
    let employeeCode = input.employee_code?.trim();
    if (!employeeCode) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      employeeCode = `EMP-${randomSuffix}`;
    }

    const displayName = `${input.first_name.trim()} ${input.last_name.trim()}${
      input.designation ? ` (${input.designation.trim()})` : ""
    }`;

    const { data, error } = await supabase
      .from("staff_members")
      .insert({
        property_id: propertyId,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        display_name: displayName,
        employee_code: employeeCode,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        department_id: input.department_id || null,
        designation: input.designation?.trim() || null,
        employment_type: input.employment_type || "FULL_TIME",
        employment_status: "ACTIVE",
        is_active: true,
        notes: input.notes?.trim() || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating staff member:", error);
      return { success: false, error: error.message };
    }

    // Auto-provision Auth account if email provided
    if (input.email?.trim()) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();
        const staffEmail = input.email.trim();

        // Check if user already exists
        const { data: uList } = await adminSupabase.auth.admin.listUsers();
        let targetUser = uList?.users?.find((u) => u.email?.toLowerCase() === staffEmail.toLowerCase()) || null;

        if (!targetUser) {
          const { data: newUser } = await adminSupabase.auth.admin.createUser({
            email: staffEmail,
            password: "StayHub@2026",
            email_confirm: true,
            user_metadata: {
              full_name: `${input.first_name.trim()} ${input.last_name.trim()}`,
              designation: input.designation?.trim() || "Staff",
            },
          });
          targetUser = newUser?.user || null;
        }

        if (targetUser) {
          // Ensure profile
          const { data: prof } = await adminSupabase
            .from("profiles")
            .upsert(
              {
                auth_user_id: targetUser.id,
                email: staffEmail,
                full_name: `${input.first_name.trim()} ${input.last_name.trim()}`,
                status: "active",
              },
              { onConflict: "email" }
            )
            .select()
            .single();

          if (prof) {
            await adminSupabase
              .from("staff_members")
              .update({ profile_id: prof.id })
              .eq("id", data.id);
          }

          // Link membership with role if provided
          if (input.role_id) {
            await adminSupabase.from("property_memberships").upsert(
              {
                property_id: propertyId,
                user_id: targetUser.id,
                role_id: input.role_id,
                status: "active",
              },
              { onConflict: "property_id,user_id" }
            );
          }
        }
      } catch (authErr) {
        console.warn("Could not auto-provision staff auth user:", authErr);
      }
    }

    revalidatePath("/staff");
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error in createStaffMemberAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create staff member",
    };
  }
}

export async function resetStaffPasswordAction(
  propertyId: string,
  staffEmail: string,
  newPassword = "StayHub@2026"
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminSupabase = createAdminClient();

    const { data: uList } = await adminSupabase.auth.admin.listUsers();
    const user = uList?.users?.find((u) => u.email?.toLowerCase() === staffEmail.toLowerCase());

    if (!user) {
      // Create user with the password
      await adminSupabase.auth.admin.createUser({
        email: staffEmail,
        password: newPassword,
        email_confirm: true,
      });
    } else {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset password",
    };
  }
}

export async function updateStaffMemberAction(
  propertyId: string,
  staffId: string,
  input: UpdateStaffInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    };

    if (input.first_name !== undefined) updatePayload.first_name = input.first_name.trim();
    if (input.last_name !== undefined) updatePayload.last_name = input.last_name.trim();
    if (input.email !== undefined) updatePayload.email = input.email?.trim() || null;
    if (input.phone !== undefined) updatePayload.phone = input.phone?.trim() || null;
    if (input.department_id !== undefined) updatePayload.department_id = input.department_id || null;
    if (input.designation !== undefined) updatePayload.designation = input.designation?.trim() || null;
    if (input.employment_type !== undefined) updatePayload.employment_type = input.employment_type;
    if (input.employment_status !== undefined) updatePayload.employment_status = input.employment_status;
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;

    if (input.first_name || input.last_name || input.designation) {
      const firstName = input.first_name || "";
      const lastName = input.last_name || "";
      const desig = input.designation ? ` (${input.designation})` : "";
      updatePayload.display_name = `${firstName} ${lastName}${desig}`.trim();
    }

    const { error } = await supabase
      .from("staff_members")
      .update(updatePayload)
      .eq("property_id", propertyId)
      .eq("id", staffId);

    if (error) {
      console.error("Error updating staff member:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateStaffMemberAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update staff member",
    };
  }
}

export async function toggleStaffActiveAction(
  propertyId: string,
  staffId: string,
  currentActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("staff_members")
      .update({
        is_active: !currentActive,
        employment_status: !currentActive ? "ACTIVE" : "ON_LEAVE",
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      })
      .eq("property_id", propertyId)
      .eq("id", staffId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle active status",
    };
  }
}

export async function createStaffDepartmentAction(
  propertyId: string,
  name: string,
  code: string,
  description?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("staff_departments")
      .insert({
        property_id: propertyId,
        name: name.trim(),
        department_code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/staff");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create department",
    };
  }
}
