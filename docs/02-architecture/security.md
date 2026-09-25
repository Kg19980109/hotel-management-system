# Security Model

## Principles
1. **Never trust the client**: All validation must happen server-side.
2. **Least Privilege**: Users and service roles only get the access they explicitly need.
3. **Data Isolation**: Strict multi-tenant boundaries.

## Secrets Management
- No secrets in the browser.
- `SUPABASE_SERVICE_ROLE_KEY` remains securely on the server.
- Environment variables injected securely during build/runtime.\n