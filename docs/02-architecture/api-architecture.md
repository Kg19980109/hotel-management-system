# API Architecture

## API Conventions
Internal APIs will follow RESTful principles grouped by domain:
- `/api/auth`
- `/api/hotels`
- `/api/rooms`
- `/api/bookings`
- `/api/guests`
- `/api/housekeeping`
- `/api/maintenance`
- `/api/restaurants`
- `/api/orders`
- `/api/kitchen`
- `/api/guest-services`
- `/api/inventory`
- `/api/staff`
- `/api/billing`
- `/api/reports`
- `/api/ai`

## Structure
- **Validation**: Strict schema validation (e.g., Zod).
- **Authorization**: Middleware/checks on every route for RBAC and tenant matching.
- **Errors**: Standardized JSON error formats (`{ error: "message", code: 400 }`).
- **Pagination**: Offset/limit or cursor-based for lists.\n