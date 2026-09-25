// ============================================================
// STAYHUB INTEGRATIONS TYPES (Phase 21)
// ============================================================

export type IntegrationCategory =
  | "PAYMENT_GATEWAY"
  | "COMMUNICATION"
  | "CHANNEL_MANAGER"
  | "ACCOUNTING"
  | "POS"
  | "HARDWARE"
  | "CALENDAR";

export type IntegrationStatus = "ACTIVE" | "INACTIVE" | "CONFIG_REQUIRED" | "DISABLED";

export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "boolean" | "select";
  required: boolean;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  isSecret?: boolean;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  fields: IntegrationField[];
  docsUrl?: string;
  isAvailable: boolean;
}

export interface PropertyIntegrationConfig {
  id: string;
  propertyId: string;
  integrationId: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  isEnabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationPermission = "INTEGRATIONS_VIEW" | "INTEGRATIONS_MANAGE";
