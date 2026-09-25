// ============================================================
// STAYHUB ONLINE BOOKING PRICING (Phase 21)
// Controlled pricing calculations with safe decimal arithmetic
// ============================================================

import type { PublicBookingPricing } from "./types";

/**
 * Calculates number of nights between two YYYY-MM-DD date strings
 */
export function calculateStayNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Calculates exact room subtotal, taxes, discounts, and total amount
 */
export function calculateBookingPricing(
  baseNightlyRate: number,
  checkInDate: string,
  checkOutDate: string,
  roomsCount = 1,
  currency = "USD",
  taxRatePercent = 18,
  discountAmount = 0
): PublicBookingPricing {
  const nights = calculateStayNights(checkInDate, checkOutDate);
  const validRate = Number((Math.max(0, Number(baseNightlyRate) || 0)).toFixed(2));
  const validRooms = Math.max(1, Math.floor(roomsCount));
  
  // Safe decimal calculations
  const grossSubtotal = Number((validRate * nights * validRooms).toFixed(2));
  const validDiscount = Math.min(grossSubtotal, Math.max(0, Number(discountAmount) || 0));
  const roomSubtotal = Number((grossSubtotal - validDiscount).toFixed(2));
  
  const taxAmount = Number(((roomSubtotal * taxRatePercent) / 100).toFixed(2));
  const totalAmount = Number((roomSubtotal + taxAmount).toFixed(2));

  return {
    nightlyRate: validRate,
    nights,
    roomsCount: validRooms,
    roomSubtotal,
    discountAmount: validDiscount,
    taxRatePercent,
    taxAmount,
    totalAmount,
    currency,
  };
}
