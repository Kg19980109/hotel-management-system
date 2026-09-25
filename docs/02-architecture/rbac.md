# RBAC Strategy

## Design
- **Roles**: Predefined set of standard roles (`SUPER_ADMIN`, `HOTEL_OWNER`, etc.).
- **Permissions**: Atomic permissions mapped to roles.
- **Assignment**: Users are assigned roles contextually (e.g., User A is `GENERAL_MANAGER` for Property X, but has no access to Property Y).

## Enforcement
- API routes check `requirePermission(user, 'CREATE_BOOKING')`.
- UI conditionally renders elements based on the same permission logic.\n