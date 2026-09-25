# StayHub Reporting Metrics & Calculation Specifications (Phase 19)

## 1. Executive Summary
This document provides exact mathematical definitions, database source tables, timezone treatments, currency considerations, and known limitations for all operational, financial, and departmental metrics in the StayHub Hotel Management SaaS.

---

## 2. Core Hotel Metrics

### 2.1 Occupancy Rate
- **Name**: Occupancy Percentage (`occupancyRate`)
- **Definition**: The proportion of sellable rooms that are occupied by paying guests over a specified date range.
- **Formula**:
  $$\text{Occupancy Rate (\%)} = \left(\frac{\text{Occupied Room Nights}}{\text{Sellable Room Nights}}\right) \times 100$$
  where $\text{Sellable Room Nights} = (\text{Total Active Rooms} - \text{Out of Order (OOO)} - \text{Out of Service (OOS)}) \times \text{Days in Period}$.
- **Source Tables**: `public.rooms`, `public.stays`, `public.reservations`
- **Timezone Treatment**: Dates evaluated in property local timezone (`properties.timezone`).
- **Currency Treatment**: Non-monetary ratio.
- **Known Limitations**: Does not count complimentary/house-use rooms unless entered as active stays.

### 2.2 Average Daily Rate (ADR)
- **Name**: Average Daily Rate (`adr`)
- **Definition**: The average rental revenue earned per paid occupied room in a given period.
- **Formula**:
  $$\text{ADR} = \frac{\text{Authoritative Room Revenue}}{\text{Room Nights Sold}}$$
- **Source Tables**: `public.folio_charges` (where `charge_type = 'ROOM'`), `public.stays`
- **Timezone Treatment**: Charge `created_at` timestamp adjusted to property timezone.
- **Currency Treatment**: Property currency (`properties.currency`). Cross-property consolidation requires currency normalization.
- **Known Limitations**: Strictly excludes F&B, taxes, service charges, and non-room fees.

### 2.3 Revenue Per Available Room (RevPAR)
- **Name**: Revenue Per Available Room (`revPar`)
- **Definition**: Total room revenue divided by the total number of sellable (available) room nights.
- **Formula**:
  $$\text{RevPAR} = \frac{\text{Authoritative Room Revenue}}{\text{Sellable Room Nights}} = \text{ADR} \times \left(\frac{\text{Occupancy Rate}}{100}\right)$$
- **Source Tables**: `public.folio_charges`, `public.rooms`
- **Timezone Treatment**: Evaluated using property reporting days.
- **Currency Treatment**: Property currency (`properties.currency`).
- **Known Limitations**: Out of order and out of service rooms reduce available room nights according to hotel rules.

### 2.4 Average Length of Stay (ALOS)
- **Name**: Average Length of Stay (`alos`)
- **Definition**: Average duration in nights of guest reservations.
- **Formula**:
  $$\text{ALOS} = \frac{\sum (\text{Check-Out Date} - \text{Check-In Date})}{\text{Total Bookings}}$$
- **Source Tables**: `public.reservations`, `public.stays`
- **Timezone Treatment**: Local check-in and check-out dates.
- **Currency Treatment**: Non-monetary metric.
- **Known Limitations**: Long-stay residential guests (>30 days) can skew short-term hotel ALOS averages.

### 2.5 Booking Lead Time
- **Name**: Booking Lead Time (`leadTime`)
- **Definition**: Average number of days between the booking creation date and the arrival check-in date.
- **Formula**:
  $$\text{Lead Time} = \frac{\sum (\text{Check-In Date} - \text{Booking Created Date})}{\text{Total Bookings}}$$
- **Source Tables**: `public.reservations`
- **Timezone Treatment**: Calendar difference calculated using property timezone.
- **Currency Treatment**: Non-monetary metric.

---

## 3. Financial & Revenue Metrics

### 3.1 Net Revenue
- **Name**: Net Revenue (`netRevenue`)
- **Definition**: Total posted gross charges minus applied ledger discounts.
- **Formula**:
  $$\text{Net Revenue} = \text{Gross Charges} - \text{Discounts}$$
- **Source Tables**: `public.folio_charges` (`amount`, `discount_amount`)
- **Timezone Treatment**: Charge posting timestamp converted to hotel local date.
- **Currency Treatment**: Property currency (`INR`, `USD`, `EUR`).
- **Known Limitations**: Taxes and cash settlements (payments) are not revenue.

### 3.2 Outstanding Folios Balance
- **Name**: Outstanding Folio Balance (`outstandingBalance`)
- **Definition**: Total unpaid balances across all active or open guest folios.
- **Formula**:
  $$\text{Outstanding Balance} = (\text{Net Charges} + \text{Taxes}) - \text{Completed Payments} + \text{Refunds}$$
- **Source Tables**: `public.folio_charges`, `public.folio_payments`, `public.folio_refunds`, `public.guest_folios`
- **Timezone Treatment**: Instantaneous state at query execution.
- **Currency Treatment**: Calculated in folio currency.

---

## 4. Operational & Departmental Metrics

### 4.1 Staff Attendance Rate
- **Name**: Staff Attendance Rate (`attendanceRate`)
- **Formula**:
  $$\text{Attendance Rate (\%)} = \left(\frac{\text{Present Shifts} + \text{Late Shifts}}{\text{Total Scheduled Shifts}}\right) \times 100$$
- **Source Tables**: `public.staff_attendance`, `public.staff_members`

### 4.2 Housekeeping Inspection Pass Rate
- **Name**: Inspection Pass Rate (`inspectionPassRate`)
- **Formula**:
  $$\text{Pass Rate (\%)} = \left(\frac{\text{Passed Inspections}}{\text{Total Inspections Conducted}}\right) \times 100$$
- **Source Tables**: `public.housekeeping_inspections`

### 4.3 KDS Average Preparation Duration
- **Name**: Average Prep Time (`avgPrepTimeMinutes`)
- **Formula**:
  $$\text{Avg Prep Time} = \frac{\sum (\text{Ticket Ready Timestamp} - \text{Ticket Created Timestamp})}{\text{Total Completed Tickets}}$$
- **Source Tables**: `public.kitchen_tickets` (`prep_time_seconds`, `created_at`, `completed_at`)

### 4.4 Maintenance Resolution Time
- **Name**: Average Resolution Time (`averageResolutionTimeHours`)
- **Formula**:
  $$\text{Avg Resolution Time} = \frac{\sum (\text{Work Order Resolved At} - \text{Work Order Created At})}{\text{Total Resolved Work Orders}}$$
- **Source Tables**: `public.maintenance_work_orders` (`created_at`, `resolved_at`)
