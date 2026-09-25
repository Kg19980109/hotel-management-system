"use server";

// ============================================================
// STAYHUB INTEGRATIONS SERVER ACTIONS (Phase 21)
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { INTEGRATION_CATALOG, getIntegrationById } from "./registry";
import { hasIntegrationPermission } from "./permissions";
import type { IntegrationDefinition, PropertyIntegrationConfig, IntegrationStatus } from "./types";

interface AuthCheckResult {
  userId: string;
  roleCode: string;
}

async function checkIntegrationAuth(
  propertyId: string,
  permission: "INTEGRATIONS_VIEW" | "INTEGRATIONS_MANAGE"
): Promise<{ error?: string; user?: AuthCheckResult }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required." };
    }

    const { data: membership } = await supabase
      .from("property_memberships")
      .select("role:roles(code), status")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let roleCode = "GENERAL_MANAGER";
    if (membership?.role) {
      roleCode = (membership.role as unknown as { code: string })?.code || "GENERAL_MANAGER";
    }

    if (!hasIntegrationPermission(roleCode, permission)) {
      return { error: `Access denied. Role ${roleCode} cannot access integrations.` };
    }

    return { user: { userId: user.id, roleCode } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify integration session.";
    return { error: message };
  }
}

/**
 * Fetch integration catalog and property-specific configuration status
 */
export async function fetchPropertyIntegrationsAction(propertyId: string): Promise<{
  error: string | null;
  catalog: IntegrationDefinition[];
  configurations: Record<string, PropertyIntegrationConfig>;
}> {
  const auth = await checkIntegrationAuth(propertyId, "INTEGRATIONS_VIEW");
  if (auth.error) {
    return { error: auth.error, catalog: [], configurations: {} };
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("property_integrations")
      .select("*")
      .eq("property_id", propertyId);

    const configMap: Record<string, PropertyIntegrationConfig> = {};

    (data || []).forEach((row: Record<string, unknown>) => {
      // Sanitize secrets before returning to UI
      const integrationId = String(row.integration_id || "");
      const def = getIntegrationById(integrationId);
      const sanitizedConfig: Record<string, unknown> = {};
      const rowConfig = (row.config as Record<string, unknown>) || {};

      if (def) {
        def.fields.forEach((f) => {
          if (rowConfig[f.key]) {
            if (f.isSecret) {
              sanitizedConfig[f.key] = "••••••••••••";
            } else {
              sanitizedConfig[f.key] = rowConfig[f.key];
            }
          }
        });
      }

      configMap[integrationId] = {
        id: String(row.id || ""),
        propertyId: String(row.property_id || ""),
        integrationId,
        status: (row.status as IntegrationStatus) || "INACTIVE",
        config: sanitizedConfig,
        isEnabled: Boolean(row.is_enabled || false),
        lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : undefined,
        createdAt: String(row.created_at || ""),
        updatedAt: String(row.updated_at || ""),
      };
    });

    return {
      error: null,
      catalog: INTEGRATION_CATALOG,
      configurations: configMap,
    };
  } catch {
    return {
      error: null,
      catalog: INTEGRATION_CATALOG,
      configurations: {},
    };
  }
}

/**
 * Save or toggle property integration configuration
 */
export async function savePropertyIntegrationAction(
  propertyId: string,
  integrationId: string,
  isEnabled: boolean,
  configValues: Record<string, string>
): Promise<{ error: string | null; success: boolean }> {
  const auth = await checkIntegrationAuth(propertyId, "INTEGRATIONS_MANAGE");
  if (auth.error) {
    return { error: auth.error, success: false };
  }

  const def = getIntegrationById(integrationId);
  if (!def) {
    return { error: "Unknown integration", success: false };
  }

  try {
    const supabase = await createClient();
    const status: IntegrationStatus = isEnabled ? "ACTIVE" : "INACTIVE";
    const timestamp = new Date().toISOString();

    await supabase.from("property_integrations").upsert(
      {
        property_id: propertyId,
        integration_id: integrationId,
        is_enabled: isEnabled,
        status,
        config: configValues,
        updated_at: timestamp,
      },
      { onConflict: "property_id,integration_id" }
    );

    return { error: null, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update integration.";
    return { error: message, success: false };
  }
}
