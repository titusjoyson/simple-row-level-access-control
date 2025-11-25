# Use Cases & Corner Cases

This document outlines key scenarios for the RBAC/RLS system, demonstrating how the logic handles complex edge cases.

## 1. The "Power User" (Full + Restricted Access)
**Scenario**: A user has two roles:
- `ADMIN` (Full Access to Revenue KPI)
- `ANALYST` (Restricted Access to Revenue KPI)

**Logic**: The system should prioritize `FULL` access.
**Result**: User sees ALL data.

```javascript
// Sample Verification Logic
const perms = db.prepare(`SELECT access_type FROM permissions ...`).all();
if (perms.some(p => p.access_type === 'FULL')) return { type: 'FULL' };
```

## 2. The "Expired Scope" (Temporal Access)
**Scenario**: A user has a scope `Region: NA` that expired yesterday, and `Region: EU` that is valid.
**Logic**: The system filters out expired scopes during the query.
**Result**: User sees only `EU` data.

```sql
-- SQL Logic
SELECT value FROM access_scopes 
WHERE entity_id = ? 
  AND (valid_until IS NULL OR valid_until > datetime('now'))
```

## 3. The "Intersection" (Multi-Dimension Filtering)
**Scenario**: A KPI is configured to filter by `Region` AND `Product`.
- User has `Region: NA`
- User has `Product: A`

**Logic**: The user must match ALL dimensions configured for the KPI.
**Result**: User sees rows where `Region = NA` AND `Product = A`.

## 4. The "Missing Dimension"
**Scenario**: A KPI requires `Region` and `Product`. User has `Region: NA` but NO scopes for `Product`.
**Logic**: If a required dimension has no valid scopes, the intersection is empty.
**Result**: User sees 0 rows.

## 5. The "SME Owner" (Explicit Ownership)
**Scenario**: A user is assigned the `KPI_OWNER` role for the Sales KPI.
**Logic**: The system checks for `access_type === 'OWNER'`.
**Result**: 
- **Data Access**: User sees ALL data (treated as FULL).
- **Governance**: User is authorized to assign scopes to other users for this KPI.

```javascript
// Check for Owner
if (access.type === 'OWNER') {
    // Enable Admin UI
}
```

## Verification Script
A standalone script `backend/verify_corner_cases.js` has been created to execute these scenarios against an in-memory database.

**Run it:**
```bash
cd backend
node verify_corner_cases.js
```
