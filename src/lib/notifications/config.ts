// ============================================================
// STAYHUB NOTIFICATION CONFIGURATION (Phase 21)
// Server-only configuration for notification channels & limits
// ============================================================

export interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailProvider: string;
  smsProvider: string;
  whatsappProvider: string;
  maxRetryAttempts: number;
  retryBackoffMs: number;
  defaultSenderEmail: string;
  defaultSenderName: string;
}

export function getNotificationConfig(): NotificationConfig {
  return {
    emailEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true" || !!process.env.RESEND_API_KEY || !!process.env.SENDGRID_API_KEY,
    smsEnabled: process.env.ENABLE_SMS_NOTIFICATIONS === "true" || !!process.env.TWILIO_AUTH_TOKEN,
    whatsappEnabled: process.env.ENABLE_WHATSAPP_NOTIFICATIONS === "true" || !!process.env.WHATSAPP_API_TOKEN,
    emailProvider: process.env.EMAIL_PROVIDER || "mock",
    smsProvider: process.env.SMS_PROVIDER || "mock",
    whatsappProvider: process.env.WHATSAPP_PROVIDER || "mock",
    maxRetryAttempts: 3,
    retryBackoffMs: 1000,
    defaultSenderEmail: process.env.NOTIFICATION_SENDER_EMAIL || "notifications@stayhub.app",
    defaultSenderName: process.env.NOTIFICATION_SENDER_NAME || "StayHub Hospitality",
  };
}
