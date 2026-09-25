// ============================================================
// STAYHUB PUBLIC BOOKING VALIDATION & ANTI-ABUSE (Phase 21)
// ============================================================

import type { AvailabilitySearchParams, PublicBookingSubmission } from "./types";
import { calculateStayNights } from "./pricing";

// Simple in-memory rate limiter: max 40 requests per 10 minutes per IP/client
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(clientKey: string, maxRequests = 40, windowMs = 600000): { isAllowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientKey);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientKey, { count: 1, resetTime: now + windowMs });
    return { isAllowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { isAllowed: false, remaining: 0 };
  }

  entry.count++;
  return { isAllowed: true, remaining: maxRequests - entry.count };
}

export function sanitizePublicString(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>?/gm, "")
    .trim();
}

/**
 * Validate availability search parameters
 */
export function validateAvailabilitySearchParams(
  params: Partial<AvailabilitySearchParams>
): { isValid: boolean; error?: string; validatedParams?: AvailabilitySearchParams } {
  if (!params.checkInDate || !params.checkOutDate) {
    return { isValid: false, error: "Check-in and check-out dates are required." };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.checkInDate) || !dateRegex.test(params.checkOutDate)) {
    return { isValid: false, error: "Dates must be in YYYY-MM-DD format." };
  }

  const checkIn = new Date(params.checkInDate);
  const checkOut = new Date(params.checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { isValid: false, error: "Invalid calendar dates provided." };
  }

  if (checkOut <= checkIn) {
    return { isValid: false, error: "Check-out date must be after check-in date." };
  }

  const nights = calculateStayNights(params.checkInDate, params.checkOutDate);
  if (nights > 30) {
    return { isValid: false, error: "Maximum online booking stay duration is 30 nights." };
  }

  const adults = Math.max(1, Number(params.adults) || 1);
  const children = Math.max(0, Number(params.children) || 0);
  const roomsCount = Math.max(1, Math.min(10, Number(params.roomsCount) || 1));

  return {
    isValid: true,
    validatedParams: {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults,
      children,
      roomsCount,
    },
  };
}

/**
 * Validate customer booking submission payload
 */
export function validateBookingSubmission(
  submission: Partial<PublicBookingSubmission>,
  roomTypeCapacity?: { maxOccupancy: number; maxAdults: number; maxChildren: number }
): { isValid: boolean; error?: string } {
  if (!submission.propertySlug) {
    return { isValid: false, error: "Property identifier is missing." };
  }

  if (!submission.roomTypeId) {
    return { isValid: false, error: "Please select a room type." };
  }

  const datesCheck = validateAvailabilitySearchParams({
    checkInDate: submission.checkInDate,
    checkOutDate: submission.checkOutDate,
    adults: submission.adults,
    children: submission.children,
    roomsCount: submission.roomsCount,
  });

  if (!datesCheck.isValid) {
    return { isValid: false, error: datesCheck.error };
  }

  // Validate Guest Contact Details
  const firstName = sanitizePublicString(submission.guestFirstName || "");
  const lastName = sanitizePublicString(submission.guestLastName || "");
  const email = (submission.guestEmail || "").trim().toLowerCase();
  const phone = (submission.guestPhone || "").trim();

  if (!firstName || firstName.length < 2) {
    return { isValid: false, error: "Please enter a valid first name." };
  }

  if (!lastName || lastName.length < 2) {
    return { isValid: false, error: "Please enter a valid last name." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { isValid: false, error: "Please provide a valid email address for your confirmation." };
  }

  if (!phone || phone.length < 8) {
    return { isValid: false, error: "Please provide a valid phone number." };
  }

  if (!submission.agreedToTerms) {
    return { isValid: false, error: "You must agree to the hotel booking terms and cancellation policy." };
  }

  // Capacity validation if room type details provided
  if (roomTypeCapacity) {
    const totalGuests = (submission.adults || 1) + (submission.children || 0);
    const maxAllowed = roomTypeCapacity.maxOccupancy * (submission.roomsCount || 1);
    if (totalGuests > maxAllowed) {
      return {
        isValid: false,
        error: `Selected room capacity exceeded. Max ${maxAllowed} guests for ${submission.roomsCount} room(s).`,
      };
    }
  }

  return { isValid: true };
}
