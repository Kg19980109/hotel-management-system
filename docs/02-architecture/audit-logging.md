# Audit Logging

## Purpose
Track critical actions within the system for security, compliance, and dispute resolution.

## Events to Log
- Booking creations, modifications, cancellations.
- Room status changes.
- Payments, refunds, manual discounts.
- Staff role/permission changes.
- Settings modifications.
- AI actions and queries.

## Structure
- Store in a dedicated `AuditLogs` table.
- Include `timestamp`, `user_id`, `action_type`, `resource_id`, `old_value`, `new_value`, and `ip_address` (where applicable).
- Never log sensitive information (e.g., raw passwords, full credit card numbers).\n