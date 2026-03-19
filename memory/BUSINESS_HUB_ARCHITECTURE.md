# Business Hub & P&S Architecture - Budget, Expenses & Payments Flow

## Overview

The Business Hub and P&S (Projects & Services) work together to manage the complete **Order-to-Cash lifecycle**. This document explains how Budget, Expenses, and Payments flow through the system.

---

## Data Model & Collections

### 1. `sales_orders` Collection
- **Source**: Created from Sales Enquiries or imported
- **Key Fields**:
  - `id`: Unique identifier
  - `order_no`: PID number (e.g., PID/25-26/401)
  - `total_amount`: Order value
  - `financials.purchase_budget`: Budget for procurement
  - `financials.execution_budget`: Budget for execution (THE KEY BUDGET)
  - `financials.others_budget`: Miscellaneous budget
  - `financials.target_profit`: Expected profit
  - `lifecycle.execution_budget`: Also stores execution budget (legacy)

### 2. `order_lifecycle` Collection
- **Source**: Extended lifecycle data for orders
- **Key Fields**:
  - `sales_order_id`: Links to sales_orders.id
  - `financials.execution_budget`: (May be null, fallback to sales_orders)

### 3. `projects` Collection
- **Source**: Created from Business Hub or manually
- **Key Fields**:
  - `id`: Unique identifier
  - `pid_no`: PID number
  - `source_order_id`: Links to sales_orders.id (if from Business Hub)
  - `budget`: Project budget (may differ from execution_budget)
  - `actual_expenses`: Sum of approved expenses (calculated)

### 4. `project_requests` Collection
- **Source**: Created from P&S "Raise Request" modal
- **Types**: 
  - `material` - Material requests
  - `vendor` - Vendor/subcontractor requests
  - `payment` - Payment requests
- **Key Fields**:
  - `order_id`: Links to project ID
  - `order_no`: PID number
  - `status`: pending, approved, rejected, etc.
  - `amount`: (for payment requests)

### 5. `expenses` Collection
- **Source**: 
  1. Manual entry in Expense Management
  2. Auto-created when payment request is approved
- **Key Fields**:
  - `order_id`: Links to project/order
  - `amount`: Expense amount
  - `approval_status`: pending, approved, rejected
  - `pending_bill`: True if bill needs to be uploaded
  - `linked_payment_request`: ID of source payment request (if auto-created)

---

## Budget Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORDER MANAGEMENT                                   │
│                       (Business Hub Entry Point)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Order Value: ₹100,000                                                      │
│   ├── Purchase Budget: ₹60,000 (for procurement)                            │
│   ├── Execution Budget: ₹15,000 (for P&S team) ◄── THIS IS THE KEY BUDGET   │
│   ├── Others Budget: ₹0                                                      │
│   └── Target Profit: ₹25,000                                                │
│                                                                              │
│   Stored in: sales_orders.financials.execution_budget                       │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT MANAGEMENT                                   │
│                    (Accepts orders → Creates projects)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│   - Order accepted in Project Management                                     │
│   - Project created with source_order_id linking back to order              │
│   - Budget field in project is read-only (set in Order Management)          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │   MATERIAL   │   │    VENDOR    │   │   PAYMENT    │
        │   REQUEST    │   │   REQUEST    │   │   REQUEST    │
        └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
               │                  │                  │
               │                  │                  │ (When Approved)
               ▼                  ▼                  ▼
        ┌──────────────────────────────────────────────────────┐
        │                PURCHASE MANAGEMENT                    │
        │            (PID-Centric Consolidated View)            │
        ├──────────────────────────────────────────────────────┤
        │   Shows for each PID:                                 │
        │   - Budget (from sales_orders.financials.exec_budget) │
        │   - Expenses (from expenses collection)               │
        │   - Available = Budget - Expenses                     │
        │   - Material/Vendor/Payment requests                  │
        │                                                       │
        │   Budget Warning on Payment Approval:                 │
        │   ├── No Budget (amber) - if execution_budget = 0     │
        │   ├── Over Budget (red) - if payment > available      │
        │   └── Budget OK (green) - if sufficient budget        │
        └──────────────────────────────────────────────────────┘
                                    │
                                    │ (Payment Request Approved)
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │             AUTO-CREATE EXPENSE ENTRY                 │
        │                                                       │
        │   When payment request status = "approved":           │
        │   - New expense created automatically                 │
        │   - approval_status = "approved"                      │
        │   - pending_bill = true (bill needs upload)           │
        │   - linked_payment_request = request_id               │
        └──────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │                EXPENSE MANAGEMENT                     │
        │                                                       │
        │   Two entry paths:                                    │
        │   1. Manual entry (with bill upload)                  │
        │   2. Auto-created from payment approval (bill pending)│
        │                                                       │
        │   Only APPROVED expenses count toward profit calc     │
        └──────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │                FINANCE ANALYTICS                      │
        │                                                       │
        │   Profit = Order Amount - Sum(Approved Expenses)      │
        │                                                       │
        │   NOTE: Request estimates do NOT count as expenses    │
        └──────────────────────────────────────────────────────┘
```

---

## Key Workflows

### 1. Order-to-Cash Lifecycle

1. **Order Created** → Order Management (Business Hub)
   - Set Order Value, Budgets (Purchase, Execution, Others)
   - PID auto-generated

2. **Order Accepted** → Project Management (Business Hub)
   - Creates project with `source_order_id` link
   - Budget is read-only (flows from Order Management)

3. **Requests Raised** → P&S (Projects & Services)
   - Material Request: List of items needed
   - Vendor Request: Subcontractor/service requirement
   - Payment Request: Advance, milestone, vendor payments

4. **Requests Processed** → Purchase Management (Business Hub)
   - View all requests by PID
   - Update status (approve, reject, order, deliver)
   - Budget warnings on payment approval

5. **Expenses Tracked** → Expense Management (Business Hub)
   - Manual expenses with bills
   - Auto-created expenses from approved payments

6. **Profit Calculated** → Finance Analytics (Business Hub)
   - Profit = Order Amount - Approved Expenses

---

### 2. Budget Check Flow (Payment Approval)

```python
# Backend: /api/project-requests/{request_id}/budget-check

1. Get payment request amount
2. Find execution_budget from (in order):
   a. order_lifecycle.financials.execution_budget
   b. sales_orders.financials.execution_budget  ← Primary source
   c. projects.budget                           ← Fallback
3. Get total approved expenses for this PID
4. Calculate: available_budget = execution_budget - total_expenses
5. Return warning if:
   - execution_budget = 0 → "no_budget" (amber)
   - payment > available → "over_budget" (red)
   - remaining < 10% → "low_budget" (yellow)
   - else → OK (green)
```

---

### 3. Auto-Create Expense Flow

```python
# Backend: PUT /api/project-requests/{request_id}/status

When payment request status → "approved":
1. Create expense entry:
   - expense_no: auto-generated
   - order_id: from request
   - amount: from request
   - category: mapped from payment_type
   - approval_status: "approved" (auto-approved)
   - pending_bill: true (bill needs upload later)
   - linked_payment_request: request_id
2. Insert into expenses collection
```

---

## P&S Page Budget Display

The Projects & Services page (`/projects`) shows:

```
Budget: ₹50,000            Available: ₹50,000
       ↑                            ↑
       │                            │
  projects.budget     (projects.budget - projects.actual_expenses)
```

**Note**: This uses `projects.budget` which may differ from `execution_budget` in Order Management.

---

## Purchase Management Budget Display

The Purchase Management page shows:

```
PID/25-26/401
Budget: ₹15,000     Available: ₹0      Profit: ₹85,000 (85%)
       ↑                   ↑                    ↑
       │                   │                    │
  execution_budget    budget - expenses    order_value - expenses
  (from sales_orders)
```

**Note**: This uses `sales_orders.financials.execution_budget` as the budget source.

---

## Key Data Sources Summary

| Field | Collection | Path |
|-------|------------|------|
| Order Value | sales_orders | `total_amount` |
| Execution Budget | sales_orders | `financials.execution_budget` |
| Project Budget | projects | `budget` |
| Approved Expenses | expenses | `{order_id, approval_status: "approved"}` |
| Request Estimates | project_requests | `amount` or `estimated_cost` |

---

## Important Notes

1. **Requests ≠ Expenses**: Material/Vendor/Payment requests are for workflow only. They do NOT directly count as expenses.

2. **Budget Sources**: 
   - Purchase Management uses `execution_budget` from Order Management
   - P&S page uses `budget` from Projects collection
   - These may differ!

3. **Payment → Expense Bridge**: When a payment request is approved, an expense is auto-created. This ensures all payments are tracked as actual expenses.

4. **Profit Calculation**: 
   - `Profit = Order Amount - Sum(Approved Expenses)`
   - Only approved expenses from the `expenses` collection count

5. **Bills Missing**: Auto-created expenses from payments have `pending_bill = true`. These should have receipts uploaded later in Expense Management.

---

## API Endpoints Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/project-requests/consolidated/by-pid` | PID-centric view for Purchase Management |
| `GET /api/project-requests/consolidated/pid/{order_id}` | Full details for a single PID |
| `GET /api/project-requests/{request_id}/budget-check` | Budget warning before payment approval |
| `PUT /api/project-requests/{request_id}/status` | Update request status (triggers auto-expense) |
| `POST /api/expense-management/expenses` | Manual expense entry |
| `GET /api/expense-management/expenses` | List expenses |
