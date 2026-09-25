# StayHub AI Business Buddy Architecture (Phase 20)

## 1. Overview & Objectives
The **StayHub AI Business Buddy** provides authenticated, read-only operational intelligence and business metrics to authorized hotel managers and staff. It enables conversational analysis across occupancy, ADR, RevPAR, food & beverage sales, kitchen turnaround, housekeeping workloads, room status, maintenance, inventory, suppliers, staff attendance, expenses, and guest folios.

---

## 2. Core Architectural Principles & Security Guardrails

### Strict Read-Only Boundary
For Phase 20, the AI Business Buddy operates strictly as a **read-only intelligence and analytics layer**. The AI cannot:
- Create, cancel, or modify reservations/bookings
- Issue payments, charges, or refunds
- Modify room or inventory statuses
- Approve expenses or shifts
- Execute autonomous database mutations

### Zero Arbitrary SQL & No Direct Database Access
- The AI model is never provided with arbitrary SQL generation or execution capabilities.
- All operations flow through 17 typed, permission-checked, property-scoped business tools calling authoritative StayHub reporting functions.
- Supabase service-role credentials and API keys are strictly confined to the server environment and never exposed to the client.

### Multi-Tenant & Property Isolation
- Server-side sessions resolve the user's active property (`propertyId`) and role (`roleCode`).
- Cross-tenant data leaks and multi-property escalation are prevented at the server action and tool level.
- Multi-property users can only view properties where active memberships exist.

### Prompt Injection Defense
- System instructions enforce strict role boundaries and mandate that database content is treated as untrusted data.
- Built-in regex guards intercept and neutralize prompt injection attempts (e.g. `ignore previous instructions`, `DROP TABLE`, `reveal API key`).

---

## 3. Provider Abstraction
The system utilizes a pluggable `AIProvider` interface:

```typescript
export interface AIProvider {
  name: string;
  generateResponse(
    messages: ChatMessage[],
    context: AIExecutionContext,
    tools: AIToolDefinition[]
  ): Promise<AIChatResponse>;
}
```

### Supported Providers
1. **Google Gemini Provider**: (`gemini-1.5-flash`) via structured function declarations and system instructions.
2. **OpenAI Provider**: (`gpt-4o-mini`) via tool calling abstractions.
3. **Rule-Based Smart Fallback Provider**: Deterministic hospitality intelligence engine that operates offline without external API keys, ensuring complete testability and zero-downtime reliability.

---

## 4. Controlled Business Tools (17 Tools)

| Tool Name | Display Name | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `get_hotel_overview` | Hotel Overview | `REPORTS_VIEW` | Executive overview: Occupancy %, ADR, RevPAR, arrivals/departures |
| `get_occupancy_metrics` | Occupancy Metrics | `REPORT_OCCUPANCY` | Detailed occupancy breakdown, room nights sold vs sellable |
| `get_room_status_summary` | Room Status | `REPORT_ROOMS` | Clean, dirty, inspecting, out-of-order room breakdown |
| `get_revenue_metrics` | Revenue Metrics | `REPORT_REVENUE` | Total revenue, room revenue, F&B revenue, other revenue |
| `get_folio_summary` | Folio Summary | `REPORT_FINANCIALS` | Guest folio charges, settlements, and outstanding balances |
| `get_reservation_summary`| Reservations | `REPORT_RESERVATIONS`| Total bookings, confirmations, cancellations, no-shows |
| `get_front_desk_summary` | Front Desk | `REPORT_FRONT_DESK` | In-house guests, pending check-ins, departures |
| `get_guest_summary` | Guests CRM | `REPORT_GUESTS` | Total guest profiles, repeat guests %, VIP counts |
| `get_restaurant_summary` | Restaurant POS | `REPORT_RESTAURANT` | Dining sales, order volume, top menu items |
| `get_kitchen_summary` | Kitchen KDS | `REPORT_KITCHEN` | KDS tickets, delayed orders, avg prep duration |
| `get_housekeeping_summary`| Housekeeping | `REPORT_HOUSEKEEPING`| Cleaning tasks, inspection turnaround, pending dirty rooms |
| `get_maintenance_summary`| Maintenance | `REPORT_MAINTENANCE` | Open work orders, urgent tickets, resolved maintenance |
| `get_inventory_summary` | Inventory | `REPORT_INVENTORY` | Total stock valuation, low stock alerts, stockout items |
| `get_supplier_summary` | Suppliers | `REPORT_SUPPLIERS` | Active vendors, pending POs, open PO valuation |
| `get_staff_summary` | Staff & Shifts | `REPORT_STAFF` | Clocked-in staff count, active shifts, leave status |
| `get_expense_summary` | Expenses | `REPORT_EXPENSES` | Total expenses, approved vs pending reimbursement |
| `get_guest_service_summary`| Guest Services| `REPORT_GUEST_SERVICES`| QR portal service requests, completion rates, open tickets |

---

## 5. UI & Interaction Flow
- **Route**: `/ai`
- **Native Aesthetic**: Deep navy sidebar & header, light slate backgrounds, gold and indigo accents, rounded-2xl cards.
- **Components**:
  - Top header with current property context, model indicator, and conversation reset.
  - Interactive conversation view with user messages, Markdown rendering, KPI pills, and source report attribution.
  - Context drawer with property information, operational snapshot, and role-filtered suggested questions.
  - Quick action chips for common queries (Occupancy, Revenue, Housekeeping, Dining).
