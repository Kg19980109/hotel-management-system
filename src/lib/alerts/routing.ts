// ============================================================
// STAYHUB OPERATIONAL REQUEST ROUTING UTILITY
// Maps QR request categories to operational departments and staff roles
// ============================================================

export type OperationalDepartment =
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "FRONT_DESK"
  | "CONCIERGE"
  | "RESTAURANT"
  | "KITCHEN"
  | "GENERAL_OPERATIONS";

/**
 * Deterministically maps request category to destination hotel department.
 */
export function getDepartmentForCategory(category: string): OperationalDepartment {
  switch (category.toUpperCase()) {
    case "HOUSEKEEPING":
    case "LAUNDRY":
      return "HOUSEKEEPING";

    case "MAINTENANCE":
      return "MAINTENANCE";

    case "ROOM_SERVICE":
    case "FOOD":
    case "DINING":
      return "RESTAURANT";

    case "FRONT_DESK":
    case "CHECK_OUT":
      return "FRONT_DESK";

    case "CONCIERGE":
    case "TRANSPORT":
    case "SPA":
      return "CONCIERGE";

    case "OTHER":
    default:
      return "GENERAL_OPERATIONS";
  }
}

/**
 * Checks whether a given staff role should be alerted for a given request category.
 * Property managers & Owners have global property-wide visibility.
 */
export function isRequestRelevantForRole(
  roleCode: string | null | undefined,
  category: string
): boolean {
  // If role is not yet loaded or not specified, deliver alert to prevent missing operational events
  if (!roleCode) return true;

  const normalizedRole = roleCode.toUpperCase();
  const normalizedCategory = category.toUpperCase();

  // Management roles receive all property-wide alerts
  if (
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "HOTEL_OWNER" ||
    normalizedRole === "GENERAL_MANAGER" ||
    normalizedRole === "ADMIN"
  ) {
    return true;
  }

  // Department-specific alerting
  switch (normalizedRole) {
    case "HOUSEKEEPING":
      return normalizedCategory === "HOUSEKEEPING" || normalizedCategory === "LAUNDRY";

    case "MAINTENANCE":
      return normalizedCategory === "MAINTENANCE";

    case "FRONT_DESK":
    case "RECEPTIONIST":
      return true; // Front Desk staff receive all property-wide alerts, service requests & food orders

    case "RESTAURANT_STAFF":
    case "KITCHEN_STAFF":
    case "CHEF":
    case "COOK":
    case "WAITER":
    case "RESTAURANT":
    case "KITCHEN":
      return (
        normalizedCategory === "ROOM_SERVICE" ||
        normalizedCategory === "FOOD" ||
        normalizedCategory === "DINING"
      );

    default:
      return true;
  }
}

/**
 * Provides the direct target staff URL for inspecting/managing the request.
 */
export function getDepartmentQueueHref(category: string, requestId?: string): string {
  if (requestId) {
    return `/guest-requests/${requestId}`;
  }
  const cat = category.toUpperCase();
  if (cat === "HOUSEKEEPING" || cat === "LAUNDRY") {
    return "/housekeeping";
  }
  if (cat === "MAINTENANCE") {
    return "/maintenance";
  }
  return "/guest-requests";
}
