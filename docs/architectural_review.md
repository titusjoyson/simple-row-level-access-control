# Architectural Review: Enterprise RBAC/RLS System

**Reviewer**: Senior Architect (15+ Years Exp)
**Date**: 2025-11-24
**Status**: Prototype -> Production Readiness Assessment

## Executive Summary
The current prototype demonstrates a solid understanding of the functional requirements (RBAC + Dynamic RLS). The schema refactor to separate `permissions` and `kpi_dimensions` was a critical maturity step. However, the system currently suffers from "Prototype Patterns" that would fail in a real-world enterprise environment (16k+ users).

## Critical Findings

### 1. Scalability & State Management
-   **Issue**: The `permissionCache` is an in-memory `Map`.
-   **Impact**: In a Kubernetes/Clustered environment with multiple replicas, cache coherency is lost. If an admin revokes access on Pod A, Pod B still allows it until TTL expires.
-   **Recommendation**: Abstract caching behind a `CacheInterface`. Implement a Redis adapter for production.

### 2. Data Access Layer (DAL) Coupling
-   **Issue**: Raw SQL queries are scattered throughout `services` and `controllers`.
-   **Impact**: High coupling. Changing the DB schema requires hunting down SQL strings in business logic files. Hard to test business logic without a real DB.
-   **Recommendation**: Implement the **Repository Pattern**. `UserRepository`, `KpiRepository`, `AccessRepository`.

### 3. Security & Concurrency
-   **Issue**: The "Check-then-Act" race condition in `approveRequest`.
-   **Impact**: Data corruption.
-   **Recommendation**: Use Database Transactions (`db.transaction`) strictly for all state-changing operations. (Currently partially implemented, needs enforcement).

### 4. Observability
-   **Issue**: `console.error` is not an observability strategy.
-   **Impact**: Impossible to debug production issues or set up alerts.
-   **Recommendation**: Structured Logging (JSON format) with correlation IDs (`x-request-id`).

### 5. Group-Based Access & Owner Logic (New)
-   **Strength**: The `getKPIAccess` single-query approach is highly efficient for read-heavy workloads.
-   **Risk**: **Scope Explosion**. As the number of groups and scopes grows, the `OR` conditions and `IN` clauses in the SQL query might degrade performance.
-   **Risk**: **Implicit "Owner" Logic**. Mixing `OWNER` (a role) into `access_type` (a permission) works for now but conflates "Responsibility" with "Access Rights".
-   **Recommendation**: Monitor query performance on the `access_scopes` table. Consider denormalizing "Effective Scopes" for users if performance drops.

## Architect's Verdict
The core logic is sound and the recent addition of **Group-Based Scopes** and **Explicit Owner Types** significantly enhances the enterprise readiness.

**Critical Next Steps:**
1.  **Repository Pattern**: Essential for maintainability.
2.  **Distributed Cache**: Required for high availability.
3.  **Scope Indexing**: Ensure `access_scopes` is indexed by `entity_type`, `entity_id`, and `dimension_id`.
