// ============================================================
// STAFF PERMISSIONS DATA — StayHub
//
// Authoritative capabilities and role definitions for hotel staff.
// Payroll is strictly excluded per operational guidelines.
// ============================================================

import { ModulePermission, RoleCapability } from "./types";

export const ROLE_CAPABILITIES: RoleCapability[] = [
  {
    roleCode: "HOTEL_OWNER",
    roleName: "Hotel Owner",
    department: "Executive Management",
    summary: "Full commercial & administrative authority over the property, staff, and financial folios.",
    canDo: [
      "Access all operational boards and analytics dashboards",
      "Manage staff accounts, designations, and department assignments",
      "Authorize folio discounts, refunds, and tax adjustments",
      "View property revenue, occupancy trends, and business performance",
      "Configure room categories, rates, and QR access points",
      "Acknowledge, reassign, or override any operational or guest request",
    ],
    cannotDo: [
      "Cannot access other tenant organizations (strict multi-tenant isolation)",
    ],
  },
  {
    roleCode: "GENERAL_MANAGER",
    roleName: "General Manager",
    department: "Executive Management",
    summary: "Operational director managing daily hotel activities, shift oversight, and department coordination.",
    canDo: [
      "Oversee all front desk, housekeeping, and maintenance queues",
      "Acknowledge and dispatch real-time emergency and guest alerts",
      "Approve inventory restock orders and room maintenance work orders",
      "Manage staff assignments, schedules, and active statuses",
      "Review daily revenue audits, guest feedback, and inspection logs",
    ],
    cannotDo: [
      "Cannot alter property organization ownership settings",
    ],
  },
  {
    roleCode: "FRONT_DESK",
    roleName: "Front Desk Supervisor",
    department: "Front Office",
    summary: "Supervises front office operations, room allocations, guest check-ins, and reception billing.",
    canDo: [
      "Check-in, check-out, and assign rooms to arriving guests",
      "Generate guest keycards and digital QR access passes",
      "Acknowledge incoming QR guest requests and dispatch to team",
      "Post room charges, incidental fees, and process guest payments",
      "Manage walk-in reservations and room stay modifications",
    ],
    cannotDo: [
      "Cannot delete or modify historical financial invoices",
      "Cannot reconfigure department structures or system API keys",
    ],
  },
  {
    roleCode: "RECEPTIONIST",
    roleName: "Front Desk Agent / Receptionist",
    department: "Front Office",
    summary: "Front-line guest reception, check-in registration, and inquiries handling.",
    canDo: [
      "Process guest check-ins and check-outs",
      "View room availability calendar and floor maps",
      "Acknowledge and route guest service requests",
      "Add room service / minibar charges to active guest stay folios",
      "Issue printed QR tokens for guest self-service portal",
    ],
    cannotDo: [
      "Cannot void finalized invoices or issue cash refunds without GM approval",
      "Cannot modify staff profiles or department assignments",
    ],
  },
  {
    roleCode: "HOUSEKEEPING",
    roleName: "Housekeeping Staff / Room Attendant",
    department: "Housekeeping & Environmental",
    summary: "Responsible for room turnovers, cleaning inspections, linen changes, and housekeeping requests.",
    canDo: [
      "View assigned room cleaning roster and priorities (Clean, Dirty, Inspecting)",
      "Acknowledge housekeeping QR requests (towels, toiletries, extra pillows, cleaning)",
      "Mark rooms as Cleaned, Inspected, or Out of Order for maintenance",
      "Report room damages and lost-and-found items directly to front desk",
      "Update room linen counts and cleaning completion timestamps",
    ],
    cannotDo: [
      "Cannot access guest billing folios or payment details",
      "Cannot check-in or check-out guests",
      "Cannot modify room pricing or reservation rates",
    ],
  },
  {
    roleCode: "MAINTENANCE",
    roleName: "Maintenance Technician / Engineering",
    department: "Engineering & Facilities",
    summary: "Handles physical repairs, HVAC, plumbing, electrical issues, and preventive equipment maintenance.",
    canDo: [
      "Receive and acknowledge maintenance requests from guests and staff",
      "Create, update, and resolve work orders (Plumbing, Electrical, HVAC, Furniture)",
      "Place rooms Out of Order (OOO) during critical repairs",
      "Log repair notes, parts used, and labor duration",
      "View equipment inspection checklists and maintenance history",
    ],
    cannotDo: [
      "Cannot access guest financial data or billing transactions",
      "Cannot modify reservation dates or room rate structures",
    ],
  },
  {
    roleCode: "RESTAURANT_STAFF",
    roleName: "Restaurant / F&B Dining Staff",
    department: "Food & Beverage",
    summary: "Manages dining tables, orders, in-room dining dispatch, and Point of Sale (POS) operations.",
    canDo: [
      "Take dine-in table orders and in-room dining orders via POS",
      "Acknowledge digital food and beverage orders from guest QR portal",
      "Charge food & beverage orders directly to guest room folios",
      "View live table availability and dining occupancy",
      "Settle restaurant checks with cash, card, or room charge",
    ],
    cannotDo: [
      "Cannot modify room reservations or check-in guests",
      "Cannot alter master restaurant menu prices without manager role",
    ],
  },
  {
    roleCode: "KITCHEN_STAFF",
    roleName: "Kitchen Staff / Chef",
    department: "Food & Beverage",
    summary: "Kitchen Display System (KDS) operations, food prep, order line management, and station routing.",
    canDo: [
      "View live Kitchen Display System (KDS) order cards with elapsed timers",
      "Acknowledge incoming kitchen food orders with acoustic buzzers",
      "Mark tickets as In Prep, Ready for Pickup, or Served",
      "Filter orders by prep station (Grill, Salad, Bakery, Hot Line)",
      "Update kitchen item 86/out-of-stock availability status",
    ],
    cannotDo: [
      "Cannot access guest billing folios or collect payments",
      "Cannot modify guest reservations or room statuses",
    ],
  },
  {
    roleCode: "ACCOUNTANT",
    roleName: "Finance & Accounting Officer",
    department: "Finance & Accounts",
    summary: "Financial audits, invoice reconciliation, tax reporting, payment ledger balances.",
    canDo: [
      "View and export revenue, expense, and tax summary reports",
      "Audit guest stay folios, payment transactions, and gateway payouts",
      "Reconcile POS dining bills and room charge postings",
      "Review inventory consumption costs and vendor purchase invoices",
      "Generate GST / VAT fiscal tax compliance statements",
    ],
    cannotDo: [
      "Cannot modify active room key assignments or operational room statuses",
      "Cannot alter kitchen orders or guest service assignments",
    ],
  },
];

export const MODULE_PERMISSIONS: ModulePermission[] = [
  // Front Desk
  {
    module: "Front Desk",
    feature: "Guest Check-In / Check-Out",
    description: "Perform guest arrival check-in, keycard issuing, and departure check-out.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "RECEPTIONIST"],
  },
  {
    module: "Front Desk",
    feature: "Room Allocation & Upgrades",
    description: "Assign specific rooms or upgrade room categories during stay.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK"],
  },

  // Housekeeping
  {
    module: "Housekeeping",
    feature: "Room Status Updates",
    description: "Mark rooms Clean, Dirty, Inspected, or In Progress.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "HOUSEKEEPING"],
  },
  {
    module: "Housekeeping",
    feature: "Housekeeping Request Dispatch",
    description: "Acknowledge and fulfill guest requests for towels, cleaning, and amenities.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "HOUSEKEEPING"],
  },

  // Maintenance
  {
    module: "Maintenance",
    feature: "Work Order Management",
    description: "Create, assign, and resolve physical repair and maintenance tickets.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "MAINTENANCE"],
  },
  {
    module: "Maintenance",
    feature: "Out-of-Order (OOO) Flagging",
    description: "Mark rooms out-of-order to block booking during repairs.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "MAINTENANCE"],
  },

  // Restaurant & KDS
  {
    module: "Restaurant & KDS",
    feature: "POS Order Entry & Room Charging",
    description: "Create dining orders and post charges directly to guest room folios.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "RESTAURANT_STAFF"],
  },
  {
    module: "Restaurant & KDS",
    feature: "Kitchen Display (KDS) Order Fulfillment",
    description: "Acknowledge kitchen orders, update prep progress, and notify service staff.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "KITCHEN_STAFF", "RESTAURANT_STAFF"],
  },

  // Guest QR Requests & Alerts
  {
    module: "Guest Experience",
    feature: "Real-Time Alert Acknowledgement",
    description: "Receive loud acoustic buzzers and acknowledge guest QR requests.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "RESTAURANT_STAFF", "KITCHEN_STAFF"],
  },
  {
    module: "Guest Experience",
    feature: "QR Code Generation & Print Passes",
    description: "Generate and print room QR table and tent cards for guests.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "RECEPTIONIST"],
  },

  // Billing & Folios
  {
    module: "Billing & Folios",
    feature: "Folio Charges & Invoicing",
    description: "Post room charges, generate final tax invoices, and collect card/cash.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "ACCOUNTANT"],
  },
  {
    module: "Billing & Folios",
    feature: "Discounts & Invoice Voids",
    description: "Authorize special discounts, waive fees, or void erroneous invoices.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER"],
  },

  // Staff Administration
  {
    module: "Staff Management",
    feature: "Employee Records & Directory",
    description: "View staff list, designations, departments, and active statuses.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER", "FRONT_DESK", "ACCOUNTANT"],
  },
  {
    module: "Staff Management",
    feature: "Staff Profile Creation & Role Assignment",
    description: "Add new employees, assign security roles, and toggle employment status.",
    allowedRoles: ["HOTEL_OWNER", "GENERAL_MANAGER"],
  },
];
