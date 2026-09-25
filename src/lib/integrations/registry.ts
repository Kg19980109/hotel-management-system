// ============================================================
// STAYHUB INTEGRATION REGISTRY (Phase 21)
// Standard catalog of supported external services & hardware
// ============================================================

import type { IntegrationDefinition } from "./types";

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  // 1. Payment Gateways
  {
    id: "stripe",
    name: "stripe",
    displayName: "Stripe",
    description: "Accept international cards, Apple Pay, Google Pay, and online deposits.",
    category: "PAYMENT_GATEWAY",
    icon: "CreditCard",
    fields: [
      { key: "publishable_key", label: "Publishable Key", type: "text", required: true },
      { key: "secret_key", label: "Secret Key", type: "password", required: true, isSecret: true },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", required: false, isSecret: true },
    ],
    isAvailable: true,
  },
  {
    id: "razorpay",
    name: "razorpay",
    displayName: "Razorpay",
    description: "Accept UPI, Indian cards, Net Banking, and payment links.",
    category: "PAYMENT_GATEWAY",
    icon: "Wallet",
    fields: [
      { key: "key_id", label: "Key ID", type: "text", required: true },
      { key: "key_secret", label: "Key Secret", type: "password", required: true, isSecret: true },
    ],
    isAvailable: true,
  },

  // 2. Communications
  {
    id: "resend",
    name: "resend",
    displayName: "Resend Email",
    description: "Transactional email provider for booking confirmations, invoices, and reminders.",
    category: "COMMUNICATION",
    icon: "Mail",
    fields: [
      { key: "api_key", label: "API Key", type: "password", required: true, isSecret: true },
      { key: "sender_email", label: "Sender Email", type: "text", required: true },
      { key: "sender_name", label: "Sender Name", type: "text", required: true },
    ],
    isAvailable: true,
  },
  {
    id: "twilio",
    name: "twilio",
    displayName: "Twilio SMS",
    description: "Global SMS delivery for guest verification and check-in alerts.",
    category: "COMMUNICATION",
    icon: "MessageSquare",
    fields: [
      { key: "account_sid", label: "Account SID", type: "text", required: true },
      { key: "auth_token", label: "Auth Token", type: "password", required: true, isSecret: true },
      { key: "from_phone", label: "From Phone Number", type: "text", required: true },
    ],
    isAvailable: true,
  },
  {
    id: "whatsapp",
    name: "whatsapp",
    displayName: "WhatsApp Business",
    description: "Automated WhatsApp guest concierge and service updates.",
    category: "COMMUNICATION",
    icon: "Send",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", required: true },
      { key: "api_token", label: "API Token", type: "password", required: true, isSecret: true },
    ],
    isAvailable: true,
  },

  // 3. Channel Managers & OTAs (Foundation)
  {
    id: "siteminder",
    name: "siteminder",
    displayName: "SiteMinder",
    description: "Two-way rate and inventory sync with Booking.com, Expedia, and Agoda.",
    category: "CHANNEL_MANAGER",
    icon: "Globe",
    fields: [
      { key: "hotel_code", label: "Hotel Code", type: "text", required: true },
      { key: "api_key", label: "API Key", type: "password", required: true, isSecret: true },
    ],
    isAvailable: false,
  },

  // 4. Accounting & Invoicing
  {
    id: "quickbooks",
    name: "quickbooks",
    displayName: "QuickBooks Online",
    description: "Sync invoices, payments, and staff expenses into general ledger.",
    category: "ACCOUNTING",
    icon: "Receipt",
    fields: [
      { key: "realm_id", label: "Company ID", type: "text", required: true },
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", required: true, isSecret: true },
    ],
    isAvailable: false,
  },

  // 5. Hardware & Door Locks
  {
    id: "salto_locks",
    name: "salto_locks",
    displayName: "SALTO Smart Locks",
    description: "Digital mobile room keys and automated RFID keycard encoder integration.",
    category: "HARDWARE",
    icon: "Lock",
    fields: [
      { key: "server_url", label: "SALTO Server URL", type: "text", required: true },
      { key: "api_key", label: "API Token", type: "password", required: true, isSecret: true },
    ],
    isAvailable: false,
  },
];

export function getIntegrationById(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_CATALOG.find((item) => item.id === id);
}

export function getIntegrationsByCategory(category: string): IntegrationDefinition[] {
  return INTEGRATION_CATALOG.filter((item) => item.category === category);
}
