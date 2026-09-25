# AI Architecture

## StayHub AI Buddy
The AI Buddy provides natural language querying over authorized hotel data.

## Security Constraints
- The AI MUST NOT have raw SQL access.
- It accesses data exclusively through authorized application service tools.

## Architecture Flow
User → AI Interface → AI Orchestrator → Permission Layer → Approved Business Tools → Application Services → Database

## Example Tools
- `getHotelSummary()`
- `getOccupancy()`
- `getRevenue()`
- `getBookings()`\n