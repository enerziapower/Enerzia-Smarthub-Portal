"""
Finance Dashboard Module (Phase 4)
- Order-wise Profit & Loss Analysis
- Cash Flow Projections
- Department Performance Metrics
- Savings Reports
- Financial KPIs
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]

router = APIRouter(prefix="/api/finance-dashboard", tags=["Finance Dashboard"])

# Second router for expense sheet approvals (used by Finance module)
finance_router = APIRouter(prefix="/api/finance", tags=["Finance Expense Approvals"])


# ============== HELPER FUNCTIONS ==============

def calculate_budget_amount(order_value: float, budget: dict) -> float:
    """Calculate budget amount from percentage or value"""
    if not budget:
        return 0
    if budget.get("type") == "percentage":
        return order_value * (budget.get("value", 0) / 100)
    return budget.get("value", 0)


async def get_order_costs(order_id: str) -> dict:
    """Get all costs associated with an order"""
    # Purchase costs from purchase_orders_v2
    po_pipeline = [
        {"$match": {"sales_order_id": order_id, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    po_result = await db.purchase_orders_v2.aggregate(po_pipeline).to_list(1)
    purchase_cost = po_result[0]["total"] if po_result else 0
    
    # Expenses from expenses_v2 (new expense management system)
    exp_pipeline = [
        {"$match": {"order_id": order_id, "approval_status": "approved"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    exp_result = await db.expenses_v2.aggregate(exp_pipeline).to_list(100)
    expenses_by_category = {e["_id"]: e["total"] for e in exp_result}
    total_expenses = sum(expenses_by_category.values())
    
    # Also check order_expenses (older system) for backward compatibility
    old_exp_pipeline = [
        {"$match": {"order_id": order_id, "approved": True}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]
    old_exp_result = await db.order_expenses.aggregate(old_exp_pipeline).to_list(100)
    for e in old_exp_result:
        if e["_id"] in expenses_by_category:
            expenses_by_category[e["_id"]] += e["total"]
        else:
            expenses_by_category[e["_id"]] = e["total"]
        total_expenses += e["total"]
    
    return {
        "purchase_cost": purchase_cost,
        "execution_expenses": total_expenses,
        "expenses_by_category": expenses_by_category,
        "total_cost": purchase_cost + total_expenses
    }


# ============== MAIN DASHBOARD ENDPOINTS ==============

@router.get("/overview")
async def get_finance_overview():
    """Get comprehensive financial overview"""
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    
    # Total Revenue (from sales orders)
    revenue_pipeline = [
        {"$match": {"status": {"$nin": ["cancelled", "rejected"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    revenue_result = await db.sales_orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    total_orders = revenue_result[0]["count"] if revenue_result else 0
    
    # This Month Revenue
    month_revenue_pipeline = [
        {"$match": {"status": {"$nin": ["cancelled", "rejected"]}, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    month_result = await db.sales_orders.aggregate(month_revenue_pipeline).to_list(1)
    month_revenue = month_result[0]["total"] if month_result else 0
    month_orders = month_result[0]["count"] if month_result else 0
    
    # Total Purchase Cost
    po_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    po_result = await db.purchase_orders_v2.aggregate(po_pipeline).to_list(1)
    total_purchase = po_result[0]["total"] if po_result else 0
    
    # Total Expenses (from both expense systems)
    exp_pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    exp_result = await db.expenses_v2.aggregate(exp_pipeline).to_list(1)
    total_expenses_v2 = exp_result[0]["total"] if exp_result else 0
    
    old_exp_pipeline = [
        {"$match": {"approved": True}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    old_exp_result = await db.order_expenses.aggregate(old_exp_pipeline).to_list(1)
    total_expenses_old = old_exp_result[0]["total"] if old_exp_result else 0
    total_expenses = total_expenses_v2 + total_expenses_old
    
    # Calculate Profit
    total_cost = total_purchase + total_expenses
    gross_profit = total_revenue - total_cost
    profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Pending Payments (from payment milestones)
    payment_pipeline = [
        {"$unwind": "$payment_milestones"},
        {"$match": {"payment_milestones.status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$payment_milestones.amount"}, "count": {"$sum": 1}}}
    ]
    payment_result = await db.order_lifecycle.aggregate(payment_pipeline).to_list(1)
    pending_payments = payment_result[0]["total"] if payment_result else 0
    pending_count = payment_result[0]["count"] if payment_result else 0
    
    # Pending Expenses (awaiting approval)
    pending_exp_pipeline = [
        {"$match": {"approval_status": {"$in": ["pending", "submitted"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    pending_exp_result = await db.expenses_v2.aggregate(pending_exp_pipeline).to_list(1)
    pending_expenses = pending_exp_result[0]["total"] if pending_exp_result else 0
    pending_expenses_count = pending_exp_result[0]["count"] if pending_exp_result else 0
    
    return {
        "revenue": {
            "total": total_revenue,
            "this_month": month_revenue,
            "orders_count": total_orders,
            "month_orders": month_orders
        },
        "costs": {
            "total_purchase": total_purchase,
            "total_expenses": total_expenses,
            "total_cost": total_cost
        },
        "profit": {
            "gross_profit": gross_profit,
            "margin_percent": round(profit_margin, 1)
        },
        "pending": {
            "payments": pending_payments,
            "payments_count": pending_count,
            "expenses": pending_expenses,
            "expenses_count": pending_expenses_count
        }
    }


@router.get("/order-profitability")
async def get_order_profitability(
    limit: int = 50,
    status: Optional[str] = None,
    sort_by: str = "profit"  # profit, revenue, margin
):
    """Get order-wise P&L analysis"""
    # Get orders with lifecycle
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.sales_orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    profitability_data = []
    
    for order in orders:
        order_id = order.get("id")
        order_value = order.get("total_amount", 0)
        
        # Get lifecycle data
        lifecycle = await db.order_lifecycle.find_one({"sales_order_id": order_id}, {"_id": 0})
        
        # Get costs
        costs = await get_order_costs(order_id)
        
        # Calculate targets
        purchase_target = 0
        execution_target = 0
        target_profit = 0
        
        if lifecycle:
            purchase_target = calculate_budget_amount(order_value, lifecycle.get("purchase_budget"))
            execution_target = calculate_budget_amount(order_value, lifecycle.get("execution_budget"))
            target_profit = calculate_budget_amount(order_value, lifecycle.get("target_profit"))
        
        # Calculate actuals
        actual_profit = order_value - costs["total_cost"]
        profit_margin = (actual_profit / order_value * 100) if order_value > 0 else 0
        
        # Calculate variance
        profit_variance = actual_profit - target_profit if target_profit else actual_profit
        purchase_savings = purchase_target - costs["purchase_cost"] if purchase_target else 0
        execution_savings = execution_target - costs["execution_expenses"] if execution_target else 0
        
        # Payment status
        paid_amount = 0
        if lifecycle and lifecycle.get("payment_milestones"):
            paid_amount = sum(m.get("paid_amount", 0) for m in lifecycle["payment_milestones"])
        
        profitability_data.append({
            "order_id": order_id,
            "order_no": order.get("order_no"),
            "customer_name": order.get("customer_name"),
            "order_date": order.get("date"),
            "status": lifecycle.get("status", "new") if lifecycle else order.get("status", "new"),
            "order_value": order_value,
            "purchase_cost": costs["purchase_cost"],
            "execution_expenses": costs["execution_expenses"],
            "total_cost": costs["total_cost"],
            "actual_profit": actual_profit,
            "profit_margin": round(profit_margin, 1),
            "target_profit": target_profit,
            "profit_variance": profit_variance,
            "purchase_target": purchase_target,
            "purchase_savings": purchase_savings,
            "execution_target": execution_target,
            "execution_savings": execution_savings,
            "total_savings": purchase_savings + execution_savings,
            "paid_amount": paid_amount,
            "pending_payment": order_value - paid_amount,
            "payment_percent": round((paid_amount / order_value * 100) if order_value else 0, 1)
        })
    
    # Sort
    if sort_by == "profit":
        profitability_data.sort(key=lambda x: x["actual_profit"], reverse=True)
    elif sort_by == "margin":
        profitability_data.sort(key=lambda x: x["profit_margin"], reverse=True)
    elif sort_by == "revenue":
        profitability_data.sort(key=lambda x: x["order_value"], reverse=True)
    
    # Calculate totals
    totals = {
        "total_revenue": sum(o["order_value"] for o in profitability_data),
        "total_purchase": sum(o["purchase_cost"] for o in profitability_data),
        "total_expenses": sum(o["execution_expenses"] for o in profitability_data),
        "total_cost": sum(o["total_cost"] for o in profitability_data),
        "total_profit": sum(o["actual_profit"] for o in profitability_data),
        "total_savings": sum(o["total_savings"] for o in profitability_data),
        "avg_margin": round(sum(o["profit_margin"] for o in profitability_data) / len(profitability_data), 1) if profitability_data else 0
    }
    
    return {
        "orders": profitability_data,
        "totals": totals,
        "count": len(profitability_data)
    }


@router.get("/cash-flow")
async def get_cash_flow_projection(months: int = 6):
    """Get cash flow projections based on payment milestones"""
    now = datetime.now()
    projections = []
    
    # Get all unpaid payment milestones
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$unwind": "$payment_milestones"},
        {"$project": {
            "_id": 0,
            "order_no": "$order.order_no",
            "customer": "$order.customer_name",
            "milestone": "$payment_milestones.name",
            "amount": "$payment_milestones.amount",
            "status": "$payment_milestones.status",
            "due_date": "$payment_milestones.due_date",
            "paid_amount": "$payment_milestones.paid_amount"
        }}
    ]
    
    milestones = await db.order_lifecycle.aggregate(pipeline).to_list(500)
    
    # Group by month
    for i in range(months):
        target_month = now + timedelta(days=30 * i)
        month_key = target_month.strftime("%Y-%m")
        month_name = target_month.strftime("%b %Y")
        
        expected_inflow = 0
        expected_outflow = 0
        milestone_details = []
        
        for m in milestones:
            if m.get("status") == "paid":
                continue
            
            due_date = m.get("due_date")
            if due_date:
                try:
                    due_dt = datetime.strptime(due_date, "%Y-%m-%d")
                    if due_dt.strftime("%Y-%m") == month_key:
                        expected_inflow += m.get("amount", 0) - m.get("paid_amount", 0)
                        milestone_details.append({
                            "order_no": m.get("order_no"),
                            "customer": m.get("customer"),
                            "milestone": m.get("milestone"),
                            "amount": m.get("amount", 0),
                            "due_date": due_date
                        })
                except:
                    pass
        
        # Get expected expenses for this month (from pending expenses)
        month_start = datetime(target_month.year, target_month.month, 1)
        month_end = month_start + timedelta(days=32)
        month_end = datetime(month_end.year, month_end.month, 1)
        
        projections.append({
            "month": month_key,
            "month_name": month_name,
            "expected_inflow": expected_inflow,
            "expected_outflow": expected_outflow,
            "net_flow": expected_inflow - expected_outflow,
            "milestone_count": len(milestone_details),
            "details": milestone_details[:5]  # Top 5 only
        })
    
    # Calculate summary
    total_expected = sum(p["expected_inflow"] for p in projections)
    
    return {
        "projections": projections,
        "summary": {
            "total_expected_inflow": total_expected,
            "months_covered": months
        }
    }


@router.get("/savings-analysis")
async def get_savings_analysis():
    """Get comprehensive savings analysis - Budget vs Actual"""
    # Get all orders with lifecycle configurations
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$project": {
            "_id": 0,
            "sales_order_id": 1,
            "order_no": "$order.order_no",
            "customer": "$order.customer_name",
            "order_value": "$order.total_amount",
            "purchase_budget": 1,
            "execution_budget": 1,
            "target_profit": 1,
            "status": 1
        }}
    ]
    
    lifecycles = await db.order_lifecycle.aggregate(pipeline).to_list(200)
    
    savings_data = []
    total_purchase_budget = 0
    total_purchase_actual = 0
    total_execution_budget = 0
    total_execution_actual = 0
    
    for lc in lifecycles:
        order_value = lc.get("order_value", 0)
        order_id = lc.get("sales_order_id")
        
        # Calculate budgets
        purchase_budget = calculate_budget_amount(order_value, lc.get("purchase_budget"))
        execution_budget = calculate_budget_amount(order_value, lc.get("execution_budget"))
        
        # Get actuals
        costs = await get_order_costs(order_id)
        
        purchase_savings = purchase_budget - costs["purchase_cost"]
        execution_savings = execution_budget - costs["execution_expenses"]
        
        total_purchase_budget += purchase_budget
        total_purchase_actual += costs["purchase_cost"]
        total_execution_budget += execution_budget
        total_execution_actual += costs["execution_expenses"]
        
        savings_data.append({
            "order_no": lc.get("order_no"),
            "customer": lc.get("customer"),
            "order_value": order_value,
            "status": lc.get("status", "new"),
            "purchase_budget": purchase_budget,
            "purchase_actual": costs["purchase_cost"],
            "purchase_savings": purchase_savings,
            "purchase_savings_percent": round((purchase_savings / purchase_budget * 100) if purchase_budget else 0, 1),
            "execution_budget": execution_budget,
            "execution_actual": costs["execution_expenses"],
            "execution_savings": execution_savings,
            "execution_savings_percent": round((execution_savings / execution_budget * 100) if execution_budget else 0, 1),
            "total_savings": purchase_savings + execution_savings
        })
    
    # Sort by total savings
    savings_data.sort(key=lambda x: x["total_savings"], reverse=True)
    
    return {
        "orders": savings_data,
        "summary": {
            "total_purchase_budget": total_purchase_budget,
            "total_purchase_actual": total_purchase_actual,
            "total_purchase_savings": total_purchase_budget - total_purchase_actual,
            "purchase_savings_percent": round(((total_purchase_budget - total_purchase_actual) / total_purchase_budget * 100) if total_purchase_budget else 0, 1),
            "total_execution_budget": total_execution_budget,
            "total_execution_actual": total_execution_actual,
            "total_execution_savings": total_execution_budget - total_execution_actual,
            "execution_savings_percent": round(((total_execution_budget - total_execution_actual) / total_execution_budget * 100) if total_execution_budget else 0, 1),
            "grand_total_savings": (total_purchase_budget - total_purchase_actual) + (total_execution_budget - total_execution_actual)
        }
    }


@router.get("/expense-breakdown")
async def get_expense_breakdown(
    period: str = "all"  # all, month, quarter, year
):
    """Get expense breakdown by category"""
    match_query = {"approval_status": "approved"}
    
    now = datetime.now(timezone.utc)
    if period == "month":
        match_query["created_at"] = {"$gte": datetime(now.year, now.month, 1, tzinfo=timezone.utc)}
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        match_query["created_at"] = {"$gte": datetime(now.year, quarter_month, 1, tzinfo=timezone.utc)}
    elif period == "year":
        match_query["created_at"] = {"$gte": datetime(now.year, 1, 1, tzinfo=timezone.utc)}
    
    # Category breakdown from expenses_v2
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "avg": {"$avg": "$amount"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    result = await db.expenses_v2.aggregate(pipeline).to_list(100)
    
    # Calculate percentages
    grand_total = sum(r["total"] for r in result)
    categories = []
    
    category_labels = {
        "material_purchase": "Material Purchase",
        "labor": "Labor / Manpower",
        "transport": "Transport & Logistics",
        "site_expenses": "Site Expenses",
        "subcontractor": "Subcontractor Payments",
        "equipment_rental": "Equipment Rental",
        "travel": "Travel & Accommodation",
        "misc": "Miscellaneous"
    }
    
    for r in result:
        categories.append({
            "category": r["_id"],
            "label": category_labels.get(r["_id"], r["_id"]),
            "total": r["total"],
            "count": r["count"],
            "average": round(r["avg"], 2),
            "percentage": round((r["total"] / grand_total * 100) if grand_total else 0, 1)
        })
    
    return {
        "categories": categories,
        "grand_total": grand_total,
        "period": period
    }


@router.get("/payment-status")
async def get_payment_status():
    """Get payment collection status"""
    # Get all orders with payment info
    pipeline = [
        {"$lookup": {
            "from": "sales_orders",
            "localField": "sales_order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$project": {
            "_id": 0,
            "order_no": "$order.order_no",
            "customer": "$order.customer_name",
            "order_value": "$order.total_amount",
            "payment_milestones": 1,
            "status": 1
        }}
    ]
    
    lifecycles = await db.order_lifecycle.aggregate(pipeline).to_list(200)
    
    fully_paid = []
    partially_paid = []
    unpaid = []
    overdue = []
    
    today = datetime.now().date()
    
    for lc in lifecycles:
        order_value = lc.get("order_value", 0)
        milestones = lc.get("payment_milestones", [])
        
        total_paid = sum(m.get("paid_amount", 0) for m in milestones)
        total_due = sum(m.get("amount", 0) for m in milestones)
        
        # Check for overdue
        has_overdue = False
        for m in milestones:
            if m.get("status") != "paid" and m.get("due_date"):
                try:
                    due_date = datetime.strptime(m["due_date"], "%Y-%m-%d").date()
                    if due_date < today:
                        has_overdue = True
                        break
                except:
                    pass
        
        order_info = {
            "order_no": lc.get("order_no"),
            "customer": lc.get("customer"),
            "order_value": order_value,
            "total_paid": total_paid,
            "pending": order_value - total_paid,
            "status": lc.get("status")
        }
        
        if has_overdue:
            overdue.append(order_info)
        elif total_paid >= order_value * 0.95:
            fully_paid.append(order_info)
        elif total_paid > 0:
            partially_paid.append(order_info)
        else:
            unpaid.append(order_info)
    
    total_receivable = sum(o["pending"] for o in partially_paid) + sum(o["pending"] for o in unpaid) + sum(o["pending"] for o in overdue)
    total_collected = sum(o["total_paid"] for o in fully_paid) + sum(o["total_paid"] for o in partially_paid)
    total_overdue = sum(o["pending"] for o in overdue)
    
    return {
        "summary": {
            "total_receivable": total_receivable,
            "total_collected": total_collected,
            "total_overdue": total_overdue,
            "fully_paid_count": len(fully_paid),
            "partially_paid_count": len(partially_paid),
            "unpaid_count": len(unpaid),
            "overdue_count": len(overdue)
        },
        "overdue_orders": overdue[:10],
        "partially_paid": partially_paid[:10],
        "unpaid": unpaid[:10]
    }


@router.get("/department-performance")
async def get_department_performance():
    """Get department-wise performance metrics"""
    # This aggregates data by analyzing which department handles which orders
    # Based on expense categories and purchase requests
    
    # Expense by department (approximated by category)
    expense_pipeline = [
        {"$match": {"approval_status": "approved"}},
        {"$group": {
            "_id": "$category",
            "total_expense": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    expenses = await db.expenses_v2.aggregate(expense_pipeline).to_list(100)
    
    # Purchase department metrics
    pr_stats = {
        "total_requests": await db.purchase_requests.count_documents({}),
        "pending": await db.purchase_requests.count_documents({"status": "pending"}),
        "completed": await db.purchase_requests.count_documents({"status": {"$in": ["ordered", "closed"]}})
    }
    
    po_pipeline = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    po_result = await db.purchase_orders_v2.aggregate(po_pipeline).to_list(1)
    po_stats = po_result[0] if po_result else {"total_value": 0, "count": 0}
    
    # Sales department metrics
    sales_pipeline = [
        {"$match": {"status": {"$nin": ["cancelled", "rejected"]}}},
        {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    sales_result = await db.sales_orders.aggregate(sales_pipeline).to_list(1)
    sales_stats = sales_result[0] if sales_result else {"total_revenue": 0, "count": 0}
    
    # Accounts/Expense department metrics
    accounts_pipeline = [
        {"$group": {
            "_id": "$approval_status",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    accounts_result = await db.expenses_v2.aggregate(accounts_pipeline).to_list(10)
    accounts_by_status = {r["_id"]: {"total": r["total"], "count": r["count"]} for r in accounts_result}
    
    return {
        "purchase": {
            "requests": pr_stats,
            "orders": {
                "count": po_stats.get("count", 0),
                "total_value": po_stats.get("total_value", 0)
            },
            "efficiency": round((pr_stats["completed"] / pr_stats["total_requests"] * 100) if pr_stats["total_requests"] else 0, 1)
        },
        "sales": {
            "orders_count": sales_stats.get("count", 0),
            "total_revenue": sales_stats.get("total_revenue", 0),
            "avg_order_value": round(sales_stats.get("total_revenue", 0) / sales_stats.get("count", 1) if sales_stats.get("count") else 0, 0)
        },
        "accounts": {
            "expenses_by_status": accounts_by_status,
            "approval_rate": round(
                (accounts_by_status.get("approved", {}).get("count", 0) / 
                 sum(s.get("count", 0) for s in accounts_by_status.values()) * 100) 
                if accounts_by_status else 0, 1
            )
        },
        "expense_breakdown": {e["_id"]: e["total_expense"] for e in expenses}
    }


@router.get("/monthly-trends")
async def get_monthly_trends(months: int = 12):
    """Get monthly revenue, cost, and profit trends"""
    now = datetime.now(timezone.utc)
    trends = []
    
    for i in range(months - 1, -1, -1):
        # Calculate month start and end
        target_date = now - timedelta(days=30 * i)
        month_start = datetime(target_date.year, target_date.month, 1, tzinfo=timezone.utc)
        if target_date.month == 12:
            month_end = datetime(target_date.year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            month_end = datetime(target_date.year, target_date.month + 1, 1, tzinfo=timezone.utc)
        
        # Revenue
        revenue_pipeline = [
            {"$match": {"created_at": {"$gte": month_start, "$lt": month_end}, "status": {"$nin": ["cancelled"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
        ]
        revenue_result = await db.sales_orders.aggregate(revenue_pipeline).to_list(1)
        revenue = revenue_result[0]["total"] if revenue_result else 0
        orders_count = revenue_result[0]["count"] if revenue_result else 0
        
        # Purchase cost
        po_pipeline = [
            {"$match": {"created_at": {"$gte": month_start, "$lt": month_end}, "status": {"$ne": "cancelled"}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        po_result = await db.purchase_orders_v2.aggregate(po_pipeline).to_list(1)
        purchase = po_result[0]["total"] if po_result else 0
        
        # Expenses
        exp_pipeline = [
            {"$match": {"created_at": {"$gte": month_start, "$lt": month_end}, "approval_status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        exp_result = await db.expenses_v2.aggregate(exp_pipeline).to_list(1)
        expenses = exp_result[0]["total"] if exp_result else 0
        
        total_cost = purchase + expenses
        profit = revenue - total_cost
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        trends.append({
            "month": month_start.strftime("%Y-%m"),
            "month_name": month_start.strftime("%b %Y"),
            "revenue": revenue,
            "purchase": purchase,
            "expenses": expenses,
            "total_cost": total_cost,
            "profit": profit,
            "margin": round(margin, 1),
            "orders_count": orders_count
        })
    
    return {"trends": trends}


@router.get("/kpis")
async def get_financial_kpis():
    """Get key financial performance indicators"""
    # Overall metrics
    overview = await get_finance_overview()
    
    # Average order value
    orders = await db.sales_orders.find({"status": {"$nin": ["cancelled"]}}, {"total_amount": 1}).to_list(1000)
    avg_order_value = sum(o.get("total_amount", 0) for o in orders) / len(orders) if orders else 0
    
    # Collection efficiency
    payment_status = await get_payment_status()
    total_expected = payment_status["summary"]["total_collected"] + payment_status["summary"]["total_receivable"]
    collection_rate = (payment_status["summary"]["total_collected"] / total_expected * 100) if total_expected else 0
    
    # Expense approval turnaround (pending expenses)
    pending_exp = await db.expenses_v2.count_documents({"approval_status": {"$in": ["pending", "submitted"]}})
    approved_exp = await db.expenses_v2.count_documents({"approval_status": "approved"})
    
    return {
        "revenue_kpis": {
            "total_revenue": overview["revenue"]["total"],
            "monthly_revenue": overview["revenue"]["this_month"],
            "avg_order_value": round(avg_order_value, 0),
            "total_orders": overview["revenue"]["orders_count"]
        },
        "profitability_kpis": {
            "gross_profit": overview["profit"]["gross_profit"],
            "profit_margin": overview["profit"]["margin_percent"],
            "cost_ratio": round((overview["costs"]["total_cost"] / overview["revenue"]["total"] * 100) if overview["revenue"]["total"] else 0, 1)
        },
        "collection_kpis": {
            "collection_rate": round(collection_rate, 1),
            "pending_receivables": overview["pending"]["payments"],
            "overdue_amount": payment_status["summary"]["total_overdue"]
        },
        "operational_kpis": {
            "pending_expenses": pending_exp,
            "approved_expenses": approved_exp,
            "expense_approval_rate": round((approved_exp / (pending_exp + approved_exp) * 100) if (pending_exp + approved_exp) else 0, 1)
        }
    }
