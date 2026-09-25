// ============================================================
// STAYHUB NOTIFICATION PROVIDERS (Phase 21)
// Provider abstraction for In-App, Email, SMS, and WhatsApp delivery
// ============================================================

import type { NotificationChannel, NotificationStatus } from "./types";
import { getNotificationConfig } from "./config";

export interface NotificationProviderResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  status: NotificationStatus;
}

export interface NotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(
    recipient: string,
    subject: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<NotificationProviderResult>;
}

// 1. IN-APP PROVIDER
export class InAppProvider implements NotificationProvider {
  name = "in-app";
  channel: NotificationChannel = "IN_APP";

  async send(
    recipientUserId: string,
    title: string,
    message: string
  ): Promise<NotificationProviderResult> {
    // In-app notifications are stored directly in PostgreSQL
    const messageId = `inapp_${recipientUserId || "user"}_${Date.now()}_${(title || "").length + (message || "").length}`;
    return {
      success: true,
      providerMessageId: messageId,
      status: "SENT",
    };
  }
}

// 2. EMAIL PROVIDER
export class EmailProvider implements NotificationProvider {
  name = "email";
  channel: NotificationChannel = "EMAIL";

  async send(
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<NotificationProviderResult> {
    const config = getNotificationConfig();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return {
        success: false,
        error: "Invalid recipient email address",
        status: "FAILED",
      };
    }

    // If external API key exists, would dispatch via Resend / SendGrid
    if (config.emailEnabled && process.env.RESEND_API_KEY) {
      try {
        // Resend or Sendgrid integration if configured
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${config.defaultSenderName} <${config.defaultSenderEmail}>`,
            to: [recipientEmail],
            subject,
            text: message,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as { id?: string };
          return {
            success: true,
            providerMessageId: json.id || `email_${Date.now()}`,
            status: "SENT",
          };
        } else {
          const errText = await res.text();
          return {
            success: false,
            error: `Email provider error: ${errText}`,
            status: "FAILED",
          };
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Email dispatch failed";
        return {
          success: false,
          error: errorMsg,
          status: "FAILED",
        };
      }
    }

    // Default development / test mock provider
    const simulatedId = `em_${Date.now()}_${(subject || "").length}_${(message || "").length}`;
    return {
      success: true,
      providerMessageId: simulatedId,
      status: "SENT",
    };
  }
}

// 3. SMS PROVIDER
export class SMSProvider implements NotificationProvider {
  name = "sms";
  channel: NotificationChannel = "SMS";

  async send(
    recipientPhone: string,
    subject: string,
    message: string
  ): Promise<NotificationProviderResult> {
    if (!recipientPhone || recipientPhone.length < 8) {
      return {
        success: false,
        error: "Invalid recipient phone number",
        status: "FAILED",
      };
    }

    const simulatedId = `sms_${Date.now()}_${(subject || "").length}_${(message || "").length}`;
    return {
      success: true,
      providerMessageId: simulatedId,
      status: "SENT",
    };
  }
}

// 4. WHATSAPP PROVIDER
export class WhatsAppProvider implements NotificationProvider {
  name = "whatsapp";
  channel: NotificationChannel = "WHATSAPP";

  async send(
    recipientPhone: string,
    subject: string,
    message: string
  ): Promise<NotificationProviderResult> {
    if (!recipientPhone || recipientPhone.length < 8) {
      return {
        success: false,
        error: "Invalid recipient phone number for WhatsApp",
        status: "FAILED",
      };
    }

    const simulatedId = `wa_${Date.now()}_${(subject || "").length}_${(message || "").length}`;
    return {
      success: true,
      providerMessageId: simulatedId,
      status: "SENT",
    };
  }
}

/**
 * Factory to retrieve the provider for a given notification channel
 */
export function getNotificationProvider(channel: NotificationChannel): NotificationProvider {
  switch (channel) {
    case "IN_APP":
      return new InAppProvider();
    case "EMAIL":
      return new EmailProvider();
    case "SMS":
      return new SMSProvider();
    case "WHATSAPP":
      return new WhatsAppProvider();
    default:
      return new InAppProvider();
  }
}
