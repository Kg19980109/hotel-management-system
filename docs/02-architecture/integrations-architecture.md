# Integrations & Services Architecture (Phase 21)

## 1. Overview
StayHub provides a secure, server-side registry and configuration foundation for external hospitality services including payment gateways, communications, OTAs, accounting systems, and smart electronic locks.

## 2. Integration Catalog
The built-in registry includes:
- **Stripe**: Credit card and international payment processing.
- **Razorpay**: UPI, cards, and Indian regional payment solutions.
- **Resend**: Transactional guest & operational email delivery.
- **Twilio**: Transactional SMS & international phone messaging.
- **WhatsApp Cloud API**: Direct guest concierge and automated confirmations.
- **SiteMinder**: Two-way OTA channel manager sync.
- **QuickBooks Online**: Automated folio revenue and invoice journal entry sync.
- **SALTO Space / KS**: Electronic smart keycard and mobile key generation.

## 3. Credential Security & Secret Masking
- All sensitive fields (API keys, client secrets, auth tokens) are marked with `isSecret: true`.
- When fetched by authorized hotel managers, secret values are masked (`••••••••••••`) before returning to the browser.
- Secrets are never exposed to AI agents, frontend bundles, or client-side storage.
- Integration management requires `INTEGRATIONS_MANAGE` RBAC permission (`SUPER_ADMIN`, `HOTEL_OWNER`, `GENERAL_MANAGER`).
