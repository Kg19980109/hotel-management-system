"use server";

// ============================================================
// STAFF MANAGEMENT SERVER ACTIONS — StayHub
//
// Payroll is strictly excluded per operational guidelines.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import {
  CreateStaffInput,
  UpdateStaffInput,
  UpdateMyProfileInput,
  StaffProfileDetails,
} from "./types";
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
    .select("role:roles(id, code, name), status")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return { error: "Access denied: No active membership for this property." };
  }

  const roleObj = membership.role as unknown as { id?: string; code?: string; name?: string } | null;
  const roleCode = roleObj?.code || "STAFF";

  return { userId: user.id, roleCode, roleId: roleObj?.id };
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
        const fullName = `${input.first_name.trim()} ${input.last_name.trim()}`;

        // 1. Check or create Auth User
        const { data: uList } = await adminSupabase.auth.admin.listUsers();
        let targetUser = uList?.users?.find((u) => u.email?.toLowerCase() === staffEmail.toLowerCase()) || null;

        if (!targetUser) {
          const { data: newUser } = await adminSupabase.auth.admin.createUser({
            email: staffEmail,
            password: "StayHub@2026",
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              designation: input.designation?.trim() || "Staff",
            },
          });
          targetUser = newUser?.user || null;
        } else {
          // Ensure password is set to default if needed
          await adminSupabase.auth.admin.updateUserById(targetUser.id, {
            password: "StayHub@2026",
            user_metadata: {
              ...targetUser.user_metadata,
              full_name: fullName,
            },
          });
        }

        if (targetUser) {
          // 2. Ensure Profile
          const { data: existingProfile } = await adminSupabase
            .from("profiles")
            .select("id")
            .or(`auth_user_id.eq.${targetUser.id},email.eq.${staffEmail}`)
            .maybeSingle();

          let profileId = existingProfile?.id;
          if (!profileId) {
            const { data: newProfile } = await adminSupabase
              .from("profiles")
              .insert({
                auth_user_id: targetUser.id,
                email: staffEmail,
                full_name: fullName,
                status: "active",
              })
              .select("id")
              .single();
            profileId = newProfile?.id;
          } else {
            await adminSupabase
              .from("profiles")
              .update({
                auth_user_id: targetUser.id,
                full_name: fullName,
                status: "active",
              })
              .eq("id", profileId);
          }

          if (profileId) {
            await adminSupabase
              .from("staff_members")
              .update({ profile_id: profileId })
              .eq("id", data.id);
          }

          // 3. Resolve role ID
          let targetRoleId = input.role_id;
          if (!targetRoleId) {
            // Determine role by department or default
            const { data: allRoles } = await adminSupabase
              .from("roles")
              .select("id, code");
            
            // Check department code/name
            let targetCode = "STAFF";
            if (input.department_id) {
              const { data: dept } = await adminSupabase
                .from("staff_departments")
                .select("department_code, name")
                .eq("id", input.department_id)
                .maybeSingle();
              const deptCode = dept?.department_code?.toUpperCase() || "";
              const deptName = dept?.name?.toUpperCase() || "";
              if (deptCode.includes("HK") || deptName.includes("HOUSEKEEP")) targetCode = "HOUSEKEEPING";
              else if (deptCode.includes("FD") || deptName.includes("FRONT")) targetCode = "FRONT_DESK";
              else if (deptCode.includes("MAINT") || deptName.includes("ENGINEER")) targetCode = "MAINTENANCE";
              else if (deptCode.includes("FB") || deptName.includes("BEVERAGE") || deptName.includes("FOOD")) targetCode = "RESTAURANT_STAFF";
              else if (deptCode.includes("KIT") || deptName.includes("CHEF")) targetCode = "KITCHEN_STAFF";
              else if (deptCode.includes("MGT") || deptCode.includes("EXEC")) targetCode = "GENERAL_MANAGER";
            }
            const foundRole = allRoles?.find((r) => r.code === targetCode) || allRoles?.find((r) => r.code === "STAFF");
            targetRoleId = foundRole?.id;
          }

          // 4. Ensure property membership
          if (targetRoleId) {
            const { data: existingMembership } = await adminSupabase
              .from("property_memberships")
              .select("id")
              .eq("property_id", propertyId)
              .eq("user_id", targetUser.id)
              .maybeSingle();

            if (existingMembership) {
              await adminSupabase
                .from("property_memberships")
                .update({
                  role_id: targetRoleId,
                  status: "active",
                })
                .eq("id", existingMembership.id);
            } else {
              await adminSupabase
                .from("property_memberships")
                .insert({
                  property_id: propertyId,
                  user_id: targetUser.id,
                  role_id: targetRoleId,
                  status: "active",
                });
            }
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
    let user = uList?.users?.find((u) => u.email?.toLowerCase() === staffEmail.toLowerCase());

    if (!user) {
      // Create user with the password
      const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: staffEmail,
        password: newPassword,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      user = newUser?.user || undefined;
    } else {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
    }

    if (user) {
      // Ensure profile and property membership exist
      const { data: staffMember } = await adminSupabase
        .from("staff_members")
        .select("id, first_name, last_name, department_id")
        .eq("property_id", propertyId)
        .eq("email", staffEmail)
        .maybeSingle();

      const fullName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : staffEmail.split("@")[0];

      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("id")
        .or(`auth_user_id.eq.${user.id},email.eq.${staffEmail}`)
        .maybeSingle();

      let profileId = existingProfile?.id;
      if (!profileId) {
        const { data: newProfile } = await adminSupabase
          .from("profiles")
          .insert({
            auth_user_id: user.id,
            email: staffEmail,
            full_name: fullName,
            status: "active",
          })
          .select("id")
          .single();
        profileId = newProfile?.id;
      }

      if (profileId && staffMember) {
        await adminSupabase
          .from("staff_members")
          .update({ profile_id: profileId })
          .eq("id", staffMember.id);
      }

      // Check membership
      const { data: existingMembership } = await adminSupabase
        .from("property_memberships")
        .select("id")
        .eq("property_id", propertyId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingMembership) {
        // Find default role
        const { data: roles } = await adminSupabase
          .from("roles")
          .select("id, code");
        const defaultRole = roles?.find((r) => r.code === "HOUSEKEEPING") || roles?.find((r) => r.code === "STAFF") || roles?.[0];
        if (defaultRole) {
          await adminSupabase.from("property_memberships").insert({
            property_id: propertyId,
            user_id: user.id,
            role_id: defaultRole.id,
            status: "active",
          });
        }
      }
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

/**
 * Updates granular role permission overrides for a specific property.
 * Includes strict privilege escalation prevention.
 */
export async function updatePropertyRolePermissionsAction(
  propertyId: string,
  roleId: string,
  grantedPermissionIds: string[]
): Promise<{ success: boolean; overridesCount?: number; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const allowedManagers = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER"];
    if (!auth.roleCode || !allowedManagers.includes(auth.roleCode)) {
      return {
        success: false,
        error: "Access denied: Only Property Managers, Owners, and Admins can configure role permissions.",
      };
    }

    const supabase = await createClient();

    // 1. Fetch target role to prevent privilege escalation
    const { data: targetRole, error: roleErr } = await supabase
      .from("roles")
      .select("id, code, name")
      .eq("id", roleId)
      .single();

    if (roleErr || !targetRole) {
      return { success: false, error: "Target role not found." };
    }

    // Privilege Escalation Protection:
    // General Manager cannot edit Super Admin or Hotel Owner roles
    if (auth.roleCode === "GENERAL_MANAGER") {
      if (targetRole.code === "SUPER_ADMIN" || targetRole.code === "HOTEL_OWNER") {
        return {
          success: false,
          error: "Privilege violation: General Managers cannot alter Administrator or Owner role access.",
        };
      }
    }

    if (auth.roleCode === "HOTEL_OWNER") {
      if (targetRole.code === "SUPER_ADMIN") {
        return {
          success: false,
          error: "Privilege violation: Hotel Owners cannot alter Super Administrator permissions.",
        };
      }
    }

    // 2. Fetch master permissions list to validate IDs
    const { data: allPerms, error: permsErr } = await supabase
      .from("permissions")
      .select("id, key");

    if (permsErr || !allPerms) {
      return { success: false, error: "Failed to validate permission catalog." };
    }

    const validPermIds = new Set(allPerms.map((p) => p.id));
    const sanitizedGrantedSet = new Set(
      grantedPermissionIds.filter((id) => validPermIds.has(id))
    );

    // 3. Fetch default permissions for target role
    const { data: defaultPerms, error: defErr } = await supabase
      .from("role_default_permissions")
      .select("permission_id")
      .eq("role_id", roleId);

    if (defErr) {
      return { success: false, error: "Failed to fetch role baseline permissions." };
    }

    const defaultPermIds = new Set((defaultPerms || []).map((p) => p.permission_id));

    // 4. Compute delta overrides
    const overridesToInsert: {
      property_id: string;
      role_id: string;
      permission_id: string;
      granted: boolean;
      updated_by: string;
    }[] = [];

    for (const perm of allPerms) {
      const isGrantedTarget = sanitizedGrantedSet.has(perm.id);
      const isDefault = defaultPermIds.has(perm.id);

      if (isGrantedTarget !== isDefault) {
        overridesToInsert.push({
          property_id: propertyId,
          role_id: roleId,
          permission_id: perm.id,
          granted: isGrantedTarget,
          updated_by: auth.userId || "",
        });
      }
    }

    // 5. Transactional replacement of property_role_permissions for this (property, role)
    const { error: delErr } = await supabase
      .from("property_role_permissions")
      .delete()
      .eq("property_id", propertyId)
      .eq("role_id", roleId);

    if (delErr) {
      console.error("Error clearing existing property role overrides:", delErr);
      return { success: false, error: delErr.message };
    }

    if (overridesToInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("property_role_permissions")
        .insert(overridesToInsert);

      if (insErr) {
        console.error("Error writing property role overrides:", insErr);
        return { success: false, error: insErr.message };
      }
    }

    revalidatePath("/staff");
    return { success: true, overridesCount: overridesToInsert.length };
  } catch (err) {
    console.error("Unexpected error in updatePropertyRolePermissionsAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update role permissions",
    };
  }
}

/**
 * Resets all custom permission overrides for a role in a property back to system defaults.
 */
export async function resetPropertyRolePermissionsAction(
  propertyId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const allowedManagers = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER"];
    if (!auth.roleCode || !allowedManagers.includes(auth.roleCode)) {
      return {
        success: false,
        error: "Access denied: Only Property Managers, Owners, and Admins can reset role permissions.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("property_role_permissions")
      .delete()
      .eq("property_id", propertyId)
      .eq("role_id", roleId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset role permissions",
    };
  }
}

/**
 * Assigns or updates a staff member's system role for the active property.
 */
export async function updateStaffRoleAction(
  propertyId: string,
  staffMemberId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAuth(propertyId);
    if (auth.error) {
      return { success: false, error: auth.error };
    }

    const allowedManagers = ["SUPER_ADMIN", "HOTEL_OWNER", "GENERAL_MANAGER"];
    if (!auth.roleCode || !allowedManagers.includes(auth.roleCode)) {
      return {
        success: false,
        error: "Access denied: Only Property Managers, Owners, and Admins can assign staff roles.",
      };
    }

    const supabase = await createClient();

    // 1. Fetch staff member
    const { data: staff, error: staffErr } = await supabase
      .from("staff_members")
      .select("id, profile_id, email")
      .eq("property_id", propertyId)
      .eq("id", staffMemberId)
      .single();

    if (staffErr || !staff) {
      return { success: false, error: "Staff record not found." };
    }

    // 2. Fetch target role
    const { data: targetRole, error: roleErr } = await supabase
      .from("roles")
      .select("id, code, name")
      .eq("id", roleId)
      .single();

    if (roleErr || !targetRole) {
      return { success: false, error: "Target role not found." };
    }

    // Privilege Escalation Check: General Manager cannot assign Super Admin or Hotel Owner
    if (auth.roleCode === "GENERAL_MANAGER") {
      if (targetRole.code === "SUPER_ADMIN" || targetRole.code === "HOTEL_OWNER") {
        return {
          success: false,
          error: "Privilege violation: Cannot assign Administrator or Owner role.",
        };
      }
    }

    // 3. Resolve user_id from profile or auth admin
    let userId: string | null = null;
    if (staff.profile_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("auth_user_id")
        .eq("id", staff.profile_id)
        .single();
      userId = prof?.auth_user_id || null;
    }

    if (!userId && staff.email) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminSupabase = createAdminClient();
      const { data: uList } = await adminSupabase.auth.admin.listUsers();
      const u = uList?.users?.find((x) => x.email?.toLowerCase() === staff.email?.toLowerCase());
      userId = u?.id || null;
    }

    if (userId) {
      // Upsert property membership
      const { error: memErr } = await supabase
        .from("property_memberships")
        .upsert(
          {
            property_id: propertyId,
            user_id: userId,
            role_id: roleId,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "property_id,user_id" }
        );

      if (memErr) {
        return { success: false, error: memErr.message };
      }
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update staff role",
    };
  }
}

// ============================================================
// PHASE 6 — STAFF PROFILE + SELF-SERVICE ACCOUNT ACTIONS
// ============================================================

/**
 * Loads the current authenticated user's profile, staff employment record
 * (for the specified/active property context), active role, property memberships,
 * and effective permissions summary.
 */
export async function getMyProfileAction(
  propertyId?: string
): Promise<{ success: boolean; data?: StaffProfileDetails; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return { success: false, error: "Authentication required. Please sign in." };
    }

    // 1. Fetch user's profile record
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id, auth_user_id, full_name, email, phone, avatar_url, status, created_at")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const profileData = {
      id: profileRow?.id || user.id,
      auth_user_id: user.id,
      full_name:
        profileRow?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Staff Member",
      email: user.email || profileRow?.email || "",
      phone: profileRow?.phone || null,
      avatar_url: profileRow?.avatar_url || null,
      status: profileRow?.status || "active",
      created_at: profileRow?.created_at || user.created_at,
    };

    // 2. Fetch all property memberships for this user
    const { data: rawMemberships } = await supabase
      .from("property_memberships")
      .select(`
        id,
        property_id,
        status,
        properties:property_id (
          id,
          name
        ),
        roles:role_id (
          id,
          code,
          name,
          description
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active");

    const allProperties = (rawMemberships || []).map((m) => {
      const prop = m.properties as unknown as { id?: string; name?: string } | null;
      const role = m.roles as unknown as { id?: string; code?: string; name?: string } | null;
      return {
        property_id: m.property_id,
        property_name: prop?.name || "Property",
        role_code: role?.code || "STAFF",
        role_name: role?.name || "Staff",
        status: m.status,
      };
    });

    // 3. Resolve active property context
    const targetPropertyId =
      propertyId || (allProperties.length > 0 ? allProperties[0].property_id : undefined);

    let activeMembership: StaffProfileDetails["membership"] = null;
    let staffData: StaffProfileDetails["staff"] = null;
    let permissionsList: StaffProfileDetails["permissions"] = [];

    if (targetPropertyId) {
      const matched = (rawMemberships || []).find(
        (m) => m.property_id === targetPropertyId
      );
      if (matched) {
        const prop = matched.properties as unknown as { id?: string; name?: string } | null;
        const role = matched.roles as unknown as {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
        } | null;
        activeMembership = {
          id: matched.id,
          property_id: matched.property_id,
          property_name: prop?.name || "Active Property",
          role_id: role?.id || "",
          role_code: role?.code || "STAFF",
          role_name: role?.name || "Staff",
          role_description: role?.description || null,
          status: matched.status,
        };
      }

      // 4. Fetch staff_members record scoped to this property
      let staffQuery = supabase
        .from("staff_members")
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          display_name,
          phone,
          email,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          department_id,
          designation,
          employment_type,
          employment_status,
          joining_date,
          is_active,
          department:staff_departments(id, name, department_code)
        `)
        .eq("property_id", targetPropertyId);

      if (profileRow?.id) {
        staffQuery = staffQuery.or(`profile_id.eq.${profileRow.id},email.eq.${user.email}`);
      } else if (user.email) {
        staffQuery = staffQuery.eq("email", user.email);
      }

      const { data: staffRow } = await staffQuery.maybeSingle();

      if (staffRow) {
        const dept = staffRow.department as unknown as {
          id?: string;
          name?: string;
          department_code?: string;
        } | null;

        staffData = {
          id: staffRow.id,
          employee_code: staffRow.employee_code,
          first_name: staffRow.first_name,
          last_name: staffRow.last_name,
          display_name: staffRow.display_name,
          phone: staffRow.phone,
          email: staffRow.email,
          address: staffRow.address,
          emergency_contact_name: staffRow.emergency_contact_name,
          emergency_contact_phone: staffRow.emergency_contact_phone,
          department: dept ? {
            id: dept.id || "",
            name: dept.name || "",
            department_code: dept.department_code || "",
          } : null,
          designation: staffRow.designation,
          employment_type: staffRow.employment_type,
          employment_status: staffRow.employment_status,
          joining_date: staffRow.joining_date,
          is_active: staffRow.is_active,
        };
      }

      // 5. Fetch effective permissions
      const isSuperAdminOrOwner =
        activeMembership?.role_code === "SUPER_ADMIN" ||
        activeMembership?.role_code === "HOTEL_OWNER";

      const { data: allPerms } = await supabase
        .from("permissions")
        .select("id, key, module, name, description, display_order")
        .order("display_order", { ascending: true });

      if (isSuperAdminOrOwner) {
        permissionsList = (allPerms || []).map((p) => ({
          key: p.key,
          module: p.module,
          name: p.name,
          description: p.description,
          granted: true,
        }));
      } else if (activeMembership?.role_id) {
        const { data: rolePerms } = await supabase
          .from("property_role_permissions")
          .select("permission_id, granted")
          .eq("property_id", targetPropertyId)
          .eq("role_id", activeMembership.role_id);

        const grantedSet = new Set(
          (rolePerms || []).filter((rp) => rp.granted).map((rp) => rp.permission_id)
        );

        permissionsList = (allPerms || []).map((p) => ({
          key: p.key,
          module: p.module,
          name: p.name,
          description: p.description,
          granted: grantedSet.has(p.id),
        }));
      }
    }

    return {
      success: true,
      data: {
        profile: profileData,
        staff: staffData,
        membership: activeMembership,
        allProperties,
        permissions: permissionsList,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load staff profile",
    };
  }
}

/**
 * Self-service update of user's personal profile information.
 * Derives user identity strictly from auth session.
 * Rejects any attempt to modify manager-controlled fields (role, department, employee code, etc.).
 */
export async function updateMyProfileAction(
  propertyId: string,
  input: UpdateMyProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return { success: false, error: "Authentication required. Please sign in." };
    }

    // 1. Sanitize & validate permitted self-service fields
    const fullName = input.full_name?.trim();
    const displayName = input.display_name?.trim() || fullName;
    const phone = input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : undefined;
    const avatarUrl =
      input.avatar_url !== undefined
        ? input.avatar_url
          ? input.avatar_url.trim()
          : null
        : undefined;
    const address =
      input.address !== undefined ? (input.address ? input.address.trim() : null) : undefined;
    const emergencyName =
      input.emergency_contact_name !== undefined
        ? input.emergency_contact_name
          ? input.emergency_contact_name.trim()
          : null
        : undefined;
    const emergencyPhone =
      input.emergency_contact_phone !== undefined
        ? input.emergency_contact_phone
          ? input.emergency_contact_phone.trim()
          : null
        : undefined;

    // 2. Fetch or create profile record
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (fullName !== undefined) profileUpdates.full_name = fullName;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (avatarUrl !== undefined) profileUpdates.avatar_url = avatarUrl;

    if (profileRow) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", profileRow.id);

      if (profErr) {
        return { success: false, error: profErr.message };
      }
    } else {
      // Upsert profile
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          auth_user_id: user.id,
          full_name: fullName || user.user_metadata?.full_name || "User",
          email: user.email || "",
          phone: phone || null,
          avatar_url: avatarUrl || null,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" }
      );
      if (upsertErr) {
        return { success: false, error: upsertErr.message };
      }
    }

    // 3. Update staff_members record for this property context if exists
    if (propertyId) {
      let staffQuery = supabase
        .from("staff_members")
        .select("id")
        .eq("property_id", propertyId);

      if (profileRow?.id) {
        staffQuery = staffQuery.or(`profile_id.eq.${profileRow.id},email.eq.${user.email}`);
      } else if (user.email) {
        staffQuery = staffQuery.eq("email", user.email);
      }

      const { data: staffRow } = await staffQuery.maybeSingle();

      if (staffRow) {
        const staffUpdates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (displayName !== undefined) staffUpdates.display_name = displayName;
        if (phone !== undefined) staffUpdates.phone = phone;
        if (address !== undefined) staffUpdates.address = address;
        if (emergencyName !== undefined) staffUpdates.emergency_contact_name = emergencyName;
        if (emergencyPhone !== undefined) staffUpdates.emergency_contact_phone = emergencyPhone;

        const { error: staffErr } = await supabase
          .from("staff_members")
          .update(staffUpdates)
          .eq("id", staffRow.id);

        if (staffErr) {
          return { success: false, error: staffErr.message };
        }
      }
    }

    revalidatePath("/staff/profile");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile",
    };
  }
}

/**
 * Updates the user's password securely via Supabase Auth.
 * Requires authenticated session. Never logs or exposes passwords.
 */
export async function updateMyPasswordAction(
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (!user || authErr) {
      return { success: false, error: "Authentication required. Please sign in." };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update password",
    };
  }
}


