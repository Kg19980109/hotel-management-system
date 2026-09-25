# QR System Architecture

## QR Types
1. Room QR (tied to a specific room)
2. Restaurant Table QR
3. General Hotel QR

## Data Security
- QR codes MUST NOT contain private guest information or PII.
- QR codes contain secure, unguessable identifiers/tokens (UUIDs).

## Flow
QR Code Scanned → Resolves to Room UUID → System identifies active Guest Session for Current Booking → Guest accesses Services.\n