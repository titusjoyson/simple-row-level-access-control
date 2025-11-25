# Walkthrough: RBAC & Row-Level Security Prototype

## Overview
This prototype demonstrates an Enterprise Access Control system where:
1.  **Roles** determine which KPIs you can see.
2.  **Row-Level Security (RLS)** filters the data within those KPIs based on your assigned scopes (e.g., Region).
3.  **Delegated Administration** allows Managers to approve access requests for specific data scopes.

## Getting Started

### 1. Start the Backend
The backend runs on port `3001`.
```bash
cd backend
node server.js
```

### 2. Start the Frontend
The frontend runs on port `5173` (usually).
```bash
cd frontend
npm run dev
```

## Demo Scenarios

### Scenario A: The Restricted Analyst
1.  **Login**: Select **Charlie (Analyst)** from the bottom-left sidebar menu.
2.  **Dashboard**:
    - You see the **Global Revenue** KPI.
    - Click it. Notice you ONLY see data for **NA** (North America).
    - You do NOT see the **Churn Rate** KPI (restricted by Role).
3.  **Access Request**:
    - Go to **Access Management**.
    - Request access to **Region: EMEA**.
    - Submit.

### Scenario B: The Approving Manager
1.  **Login**: Switch to **Bob (Manager)**.
2.  **Dashboard**:
    - You see both **Global Revenue** and **Churn Rate**.
    - Click **Global Revenue**. You see all data (Manager has full access).
    - Click **Churn Rate**. You see data for **EMEA** (your scope).
3.  **Approval**:
    - Go to **Access Management**.
    - You see Charlie's request for **EMEA**.
    - Click **Approve**.

### Scenario C: Verification
1.  **Login**: Switch back to **Charlie (Analyst)**.
2.  **Dashboard**:
    - Click **Global Revenue**.
    - You now see data for **NA** AND **EMEA**.

## Key Code Concepts

- **`backend/services/rbac.service.js`**: Contains the logic for `canAccessKPI` and `getRLSFilters`.
- **`backend/database.js`**: Defines the schema and initial seed data.
- **`frontend/src/context/AuthContext.jsx`**: Simulates authentication by switching user IDs.
