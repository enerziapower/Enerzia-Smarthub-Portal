"""
Customer Management Module - Analytics & CRM
Provides comprehensive customer analysis including:
- Customer 360° Dashboard
- Enquiry Analysis
- Quote Analysis
- Order Analysis
- Projections (Order & Billing)
- New Customer Targeting
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId, Regex
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/customer-management", tags=["Customer Management"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "smarthub_enerzia")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def safe_datetime_diff(now: datetime, dt) -> int:
    """Safely calculate days difference between now and a datetime that may or may not be timezone-aware."""
    if dt is None:
        return 0
    try:
        # If dt is naive (no timezone), make it aware by assuming UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (now - dt).days
    except Exception:
        return 0


# ============== CUSTOMER 360° DASHBOARD ==============

@router.get("/overview")
async def get_customer_overview():
    """Get overall customer management statistics"""
    try:
        # Total customers
        total_customers = await db.clients.count_documents({"customer_type": "domestic"})
        
        # Active customers (with at least one enquiry/order in last 6 months)
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        
        # Get customers with recent activity
        recent_enquiries = await db.sales_enquiries.distinct("company_name", {
            "created_at": {"$gte": six_months_ago}
        })
        active_customers = len(recent_enquiries)
        
        # Total pipeline value (all non-declined enquiries)
        pipeline = db.sales_enquiries.aggregate([
            {"$match": {"status": {"$nin": ["declined", "invoiced"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$value", 0]}}}}
        ])
        pipeline_result = await pipeline.to_list(1)
        pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0
        
        # Total revenue (accepted/invoiced orders)
        revenue_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"status": {"$in": ["accepted", "invoiced"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$value", 0]}}}}
        ])
        revenue_result = await revenue_pipeline.to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Enquiry stats
        total_enquiries = await db.sales_enquiries.count_documents({})
        new_enquiries = await db.sales_enquiries.count_documents({"status": "new"})
        quoted_enquiries = await db.sales_enquiries.count_documents({"status": "quoted"})
        won_enquiries = await db.sales_enquiries.count_documents({"status": {"$in": ["accepted", "invoiced"]}})
        lost_enquiries = await db.sales_enquiries.count_documents({"status": "declined"})
        
        # Conversion rate
        conversion_rate = (won_enquiries / total_enquiries * 100) if total_enquiries > 0 else 0
        
        # Top customers by value
        top_customers_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"status": {"$in": ["accepted", "invoiced"]}}},
            {"$group": {
                "_id": "$company_name",
                "total_value": {"$sum": {"$ifNull": ["$value", 0]}},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"total_value": -1}},
            {"$limit": 10}
        ])
        top_customers = await top_customers_pipeline.to_list(10)
        
        return {
            "summary": {
                "total_customers": total_customers,
                "active_customers": active_customers,
                "pipeline_value": pipeline_value,
                "total_revenue": total_revenue,
                "conversion_rate": round(conversion_rate, 1)
            },
            "enquiry_stats": {
                "total": total_enquiries,
                "new": new_enquiries,
                "quoted": quoted_enquiries,
                "won": won_enquiries,
                "lost": lost_enquiries
            },
            "top_customers": [
                {
                    "name": c["_id"],
                    "total_value": c["total_value"],
                    "order_count": c["order_count"]
                } for c in top_customers
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer/{customer_name}/360")
async def get_customer_360(customer_name: str):
    """Get complete 360° view of a specific customer"""
    try:
        # Use bson.Regex for proper regex matching
        name_regex = Regex(re.escape(customer_name), "i")
        
        # Find customer details
        customer = await db.clients.find_one(
            {"name": name_regex, "customer_type": "domestic"},
            {"_id": 0}
        )
        
        customer_id = customer.get("id") if customer else None
        
        # Get all enquiries for this customer - by customer_id first, then by name
        enquiries = []
        if customer_id:
            enquiries = await db.sales_enquiries.find(
                {"customer_id": customer_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        # Fallback to name matching if no customer_id results
        if not enquiries:
            enquiries = await db.sales_enquiries.find(
                {"company_name": customer_name},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        # If no exact match, try regex
        if not enquiries:
            enquiries = await db.sales_enquiries.find(
                {"company_name": name_regex},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        # Get all quotations for this customer
        quotations = []
        if customer_id:
            quotations = await db.sales_quotations.find(
                {"customer_id": customer_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        if not quotations:
            quotations = await db.sales_quotations.find(
                {"customer_name": name_regex},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        # Get all orders for this customer
        orders = []
        if customer_id:
            orders = await db.sales_orders.find(
                {"customer_id": customer_id},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        if not orders:
            orders = await db.sales_orders.find(
                {"customer_name": name_regex},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
        
        # Calculate enquiry metrics
        total_enquiries = len(enquiries)
        total_enquiry_value = sum(e.get("value", 0) or 0 for e in enquiries)
        won_enquiries = [e for e in enquiries if e.get("status") in ["accepted", "invoiced", "quoted", "ordered"]]
        lost_enquiries = [e for e in enquiries if e.get("status") == "declined"]
        pending_enquiries = [e for e in enquiries if e.get("status") not in ["accepted", "invoiced", "quoted", "ordered", "declined"]]
        
        # Calculate quotation metrics
        total_quotations = len(quotations)
        total_quoted_value = sum(q.get("total_amount", 0) or 0 for q in quotations)
        accepted_quotations = [q for q in quotations if q.get("status") in ["accepted", "converted"]]
        pending_quotations = [q for q in quotations if q.get("status") in ["draft", "sent", "pending"]]
        
        # Calculate order metrics
        total_orders = len(orders)
        total_order_value = sum(o.get("total_amount", 0) or 0 for o in orders)
        completed_orders = [o for o in orders if o.get("status") in ["completed", "delivered"]]
        pending_orders = [o for o in orders if o.get("status") in ["pending", "in_progress", "processing"]]
        paid_orders = [o for o in orders if o.get("payment_status") == "paid"]
        
        # Win rate (enquiry to order conversion)
        win_rate = (len(won_enquiries) / total_enquiries * 100) if total_enquiries > 0 else 0
        
        # Quote to Order conversion rate
        quote_to_order_rate = (total_orders / total_quotations * 100) if total_quotations > 0 else 0
        
        # Average order value
        avg_order_value = (total_order_value / total_orders) if total_orders > 0 else 0
        
        # Enquiry status breakdown
        status_breakdown = {}
        for e in enquiries:
            status = e.get("status", "unknown")
            if status not in status_breakdown:
                status_breakdown[status] = {"count": 0, "value": 0}
            status_breakdown[status]["count"] += 1
            status_breakdown[status]["value"] += e.get("value", 0) or 0
        
        # Monthly trend (last 12 months)
        monthly_trend = []
        now = datetime.now(timezone.utc)
        for i in range(11, -1, -1):
            month_start = now.replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            month_enquiries = []
            month_orders = []
            for e in enquiries:
                created_at = e.get("created_at")
                if created_at:
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    if month_start <= created_at < month_end:
                        month_enquiries.append(e)
            for o in orders:
                created_at = o.get("created_at")
                if created_at:
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    if month_start <= created_at < month_end:
                        month_orders.append(o)
            monthly_trend.append({
                "month": month_start.strftime("%b %Y"),
                "enquiries": len(month_enquiries),
                "enquiry_value": sum(e.get("value", 0) or 0 for e in month_enquiries),
                "orders": len(month_orders),
                "order_value": sum(o.get("total_amount", 0) or 0 for o in month_orders)
            })
        
        return {
            "customer": customer,
            "customer_id": customer_id,
            "metrics": {
                "total_enquiries": total_enquiries,
                "total_enquiry_value": total_enquiry_value,
                "won_count": len(won_enquiries),
                "lost_count": len(lost_enquiries),
                "pending_enquiries": len(pending_enquiries),
                "total_quotations": total_quotations,
                "total_quoted_value": total_quoted_value,
                "accepted_quotations": len(accepted_quotations),
                "pending_quotations": len(pending_quotations),
                "total_orders": total_orders,
                "total_order_value": total_order_value,
                "completed_orders": len(completed_orders),
                "pending_orders": len(pending_orders),
                "paid_orders": len(paid_orders),
                "win_rate": round(win_rate, 1),
                "quote_to_order_rate": round(quote_to_order_rate, 1),
                "avg_order_value": round(avg_order_value, 0)
            },
            "status_breakdown": status_breakdown,
            "monthly_trend": monthly_trend,
            "recent_enquiries": enquiries[:10],
            "recent_quotations": quotations[:10],
            "recent_orders": orders[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer-by-id/{customer_id}/360")
async def get_customer_360_by_id(customer_id: str):
    """Get complete 360° view of a customer by their ID"""
    try:
        # Find customer details by ID
        customer = await db.clients.find_one(
            {"id": customer_id},
            {"_id": 0}
        )
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        customer_name = customer.get("name", "")
        
        # Get all enquiries by customer_id
        enquiries = await db.sales_enquiries.find(
            {"customer_id": customer_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get all quotations by customer_id
        quotations = await db.sales_quotations.find(
            {"customer_id": customer_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get all orders by customer_id
        orders = await db.sales_orders.find(
            {"customer_id": customer_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Calculate metrics
        total_enquiry_value = sum(e.get("value", 0) or 0 for e in enquiries)
        total_quoted_value = sum(q.get("total_amount", 0) or 0 for q in quotations)
        total_order_value = sum(o.get("total_amount", 0) or 0 for o in orders)
        
        # Calculate conversion rates
        enquiry_to_quote_rate = (len(quotations) / len(enquiries) * 100) if enquiries else 0
        quote_to_order_rate = (len(orders) / len(quotations) * 100) if quotations else 0
        
        return {
            "customer": customer,
            "customer_id": customer_id,
            "summary": {
                "total_enquiries": len(enquiries),
                "total_quotations": len(quotations),
                "total_orders": len(orders),
                "total_enquiry_value": total_enquiry_value,
                "total_quoted_value": total_quoted_value,
                "total_order_value": total_order_value,
                "enquiry_to_quote_rate": round(enquiry_to_quote_rate, 1),
                "quote_to_order_rate": round(quote_to_order_rate, 1)
            },
            "enquiries": enquiries,
            "quotations": quotations,
            "orders": orders
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== ENQUIRY ANALYSIS ==============

@router.get("/enquiry-analysis")
async def get_enquiry_analysis():
    """Get comprehensive enquiry analysis"""
    try:
        # Status distribution
        status_pipeline = db.sales_enquiries.aggregate([
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$value", 0]}}
            }}
        ])
        status_dist = await status_pipeline.to_list(20)
        
        # Category distribution
        category_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"category": {"$ne": None}}},
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$value", 0]}}
            }},
            {"$sort": {"count": -1}}
        ])
        category_dist = await category_pipeline.to_list(10)
        
        # Department distribution
        dept_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"department": {"$ne": None}}},
            {"$group": {
                "_id": "$department",
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$value", 0]}}
            }},
            {"$sort": {"count": -1}}
        ])
        dept_dist = await dept_pipeline.to_list(10)
        
        # Monthly enquiry trend (last 12 months)
        monthly_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=365)}}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$value", 0]}}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ])
        monthly_trend = await monthly_pipeline.to_list(12)
        
        # Priority distribution
        priority_pipeline = db.sales_enquiries.aggregate([
            {"$match": {"priority": {"$ne": None}}},
            {"$group": {
                "_id": "$priority",
                "count": {"$sum": 1}
            }}
        ])
        priority_dist = await priority_pipeline.to_list(5)
        
        # Top companies by enquiry count
        top_companies_pipeline = db.sales_enquiries.aggregate([
            {"$group": {
                "_id": "$company_name",
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$value", 0]}}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        top_companies = await top_companies_pipeline.to_list(10)
        
        # Conversion funnel
        total = await db.sales_enquiries.count_documents({})
        quoted = await db.sales_enquiries.count_documents({"status": {"$in": ["quoted", "negotiation", "accepted", "invoiced"]}})
        won = await db.sales_enquiries.count_documents({"status": {"$in": ["accepted", "invoiced"]}})
        
        return {
            "status_distribution": [{"status": s["_id"], "count": s["count"], "value": s["value"]} for s in status_dist],
            "category_distribution": [{"category": c["_id"], "count": c["count"], "value": c["value"]} for c in category_dist],
            "department_distribution": [{"department": d["_id"], "count": d["count"], "value": d["value"]} for d in dept_dist],
            "monthly_trend": [
                {
                    "month": f"{m['_id']['year']}-{m['_id']['month']:02d}",
                    "count": m["count"],
                    "value": m["value"]
                } for m in monthly_trend
            ],
            "priority_distribution": [{"priority": p["_id"], "count": p["count"]} for p in priority_dist],
            "top_companies": [{"name": c["_id"], "count": c["count"], "value": c["value"]} for c in top_companies],
            "conversion_funnel": {
                "total_enquiries": total,
                "quoted": quoted,
                "won": won,
                "quote_rate": round(quoted/total*100, 1) if total > 0 else 0,
                "win_rate": round(won/total*100, 1) if total > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== QUOTE ANALYSIS ==============

@router.get("/quote-analysis")
async def get_quote_analysis():
    """Get quote/quotation analysis"""
    try:
        # Quotations from enquiries that reached quoted status
        quoted_enquiries = await db.sales_enquiries.find(
            {"status": {"$in": ["quoted", "negotiation", "accepted", "invoiced", "declined"]}},
            {"_id": 0}
        ).to_list(1000)
        
        total_quotes = len(quoted_enquiries)
        accepted = [q for q in quoted_enquiries if q.get("status") in ["accepted", "invoiced"]]
        declined = [q for q in quoted_enquiries if q.get("status") == "declined"]
        pending = [q for q in quoted_enquiries if q.get("status") in ["quoted", "negotiation"]]
        
        total_quote_value = sum(q.get("value", 0) or 0 for q in quoted_enquiries)
        accepted_value = sum(q.get("value", 0) or 0 for q in accepted)
        declined_value = sum(q.get("value", 0) or 0 for q in declined)
        pending_value = sum(q.get("value", 0) or 0 for q in pending)
        
        win_rate = (len(accepted) / total_quotes * 100) if total_quotes > 0 else 0
        avg_quote_value = (total_quote_value / total_quotes) if total_quotes > 0 else 0
        
        # Quote aging (days since created for pending quotes)
        aging_buckets = {"0-7 days": 0, "8-14 days": 0, "15-30 days": 0, "30+ days": 0}
        now = datetime.now(timezone.utc)
        for q in pending:
            if q.get("created_at"):
                days = safe_datetime_diff(now, q["created_at"])
                if days <= 7:
                    aging_buckets["0-7 days"] += 1
                elif days <= 14:
                    aging_buckets["8-14 days"] += 1
                elif days <= 30:
                    aging_buckets["15-30 days"] += 1
                else:
                    aging_buckets["30+ days"] += 1
        
        return {
            "summary": {
                "total_quotes": total_quotes,
                "accepted_count": len(accepted),
                "declined_count": len(declined),
                "pending_count": len(pending),
                "win_rate": round(win_rate, 1),
                "avg_quote_value": round(avg_quote_value, 0)
            },
            "value_breakdown": {
                "total_value": total_quote_value,
                "accepted_value": accepted_value,
                "declined_value": declined_value,
                "pending_value": pending_value
            },
            "aging": aging_buckets,
            "pending_quotes": [
                {
                    "enquiry_no": q.get("enquiry_no"),
                    "company_name": q.get("company_name"),
                    "value": q.get("value"),
                    "date": q.get("date"),
                    "status": q.get("status"),
                    "days_pending": safe_datetime_diff(now, q.get("created_at"))
                } for q in sorted(pending, key=lambda x: x.get("created_at") or now, reverse=True)[:10]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== ORDER ANALYSIS ==============

@router.get("/order-analysis")
async def get_order_analysis():
    """Get order analysis - orders are accepted/invoiced enquiries"""
    try:
        # Orders = accepted or invoiced enquiries
        orders = await db.sales_enquiries.find(
            {"status": {"$in": ["accepted", "invoiced"]}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
        
        total_orders = len(orders)
        total_value = sum(o.get("value", 0) or 0 for o in orders)
        avg_order_value = (total_value / total_orders) if total_orders > 0 else 0
        
        # Orders by company
        company_orders = {}
        for o in orders:
            company = o.get("company_name", "Unknown")
            if company not in company_orders:
                company_orders[company] = {"count": 0, "value": 0}
            company_orders[company]["count"] += 1
            company_orders[company]["value"] += o.get("value", 0) or 0
        
        # Sort by value
        top_customers = sorted(
            [{"name": k, **v} for k, v in company_orders.items()],
            key=lambda x: x["value"],
            reverse=True
        )[:10]
        
        # Repeat customers (more than 1 order)
        repeat_customers = [c for c in company_orders.items() if c[1]["count"] > 1]
        repeat_rate = (len(repeat_customers) / len(company_orders) * 100) if company_orders else 0
        
        # Monthly order trend
        monthly_orders = {}
        for o in orders:
            if o.get("created_at"):
                month_key = o["created_at"].strftime("%Y-%m")
                if month_key not in monthly_orders:
                    monthly_orders[month_key] = {"count": 0, "value": 0}
                monthly_orders[month_key]["count"] += 1
                monthly_orders[month_key]["value"] += o.get("value", 0) or 0
        
        # Sort by month
        monthly_trend = [
            {"month": k, **v} 
            for k, v in sorted(monthly_orders.items())
        ][-12:]  # Last 12 months
        
        # Category breakdown
        category_orders = {}
        for o in orders:
            cat = o.get("category", "Uncategorized") or "Uncategorized"
            if cat not in category_orders:
                category_orders[cat] = {"count": 0, "value": 0}
            category_orders[cat]["count"] += 1
            category_orders[cat]["value"] += o.get("value", 0) or 0
        
        return {
            "summary": {
                "total_orders": total_orders,
                "total_value": total_value,
                "avg_order_value": round(avg_order_value, 0),
                "unique_customers": len(company_orders),
                "repeat_customers": len(repeat_customers),
                "repeat_rate": round(repeat_rate, 1)
            },
            "top_customers": top_customers,
            "monthly_trend": monthly_trend,
            "category_breakdown": [{"category": k, **v} for k, v in category_orders.items()],
            "recent_orders": [
                {
                    "enquiry_no": o.get("enquiry_no"),
                    "company_name": o.get("company_name"),
                    "value": o.get("value"),
                    "date": o.get("date"),
                    "category": o.get("category"),
                    "status": o.get("status")
                } for o in orders[:10]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== PROJECTIONS ==============

@router.get("/projections")
async def get_projections():
    """Get order and billing projections based on historical data"""
    try:
        # Get historical monthly data (last 12 months)
        twelve_months_ago = datetime.now(timezone.utc) - timedelta(days=365)
        
        # Monthly revenue from orders
        monthly_pipeline = db.sales_enquiries.aggregate([
            {"$match": {
                "status": {"$in": ["accepted", "invoiced"]},
                "created_at": {"$gte": twelve_months_ago}
            }},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "revenue": {"$sum": {"$ifNull": ["$value", 0]}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ])
        monthly_data = await monthly_pipeline.to_list(12)
        
        # Calculate average monthly revenue
        revenues = [m["revenue"] for m in monthly_data if m["revenue"] > 0]
        avg_monthly_revenue = sum(revenues) / len(revenues) if revenues else 0
        
        # Calculate growth rate
        if len(revenues) >= 2:
            recent_avg = sum(revenues[-3:]) / min(3, len(revenues[-3:]))
            older_avg = sum(revenues[:3]) / min(3, len(revenues[:3]))
            growth_rate = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        else:
            growth_rate = 0
        
        # Pipeline value (pending enquiries)
        pipeline_result = await db.sales_enquiries.aggregate([
            {"$match": {"status": {"$nin": ["declined", "accepted", "invoiced"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$value", 0]}}}}
        ]).to_list(1)
        pipeline_value = pipeline_result[0]["total"] if pipeline_result else 0
        
        # Weighted pipeline (by status probability)
        status_weights = {
            "new": 0.1,
            "price_enquiry": 0.15,
            "site_visit_needed": 0.2,
            "site_visited": 0.3,
            "under_progress": 0.4,
            "quoted": 0.5,
            "negotiation": 0.7
        }
        
        pending_enquiries = await db.sales_enquiries.find(
            {"status": {"$nin": ["declined", "accepted", "invoiced"]}},
            {"_id": 0, "status": 1, "value": 1}
        ).to_list(1000)
        
        weighted_pipeline = sum(
            (e.get("value", 0) or 0) * status_weights.get(e.get("status", "new"), 0.1)
            for e in pending_enquiries
        )
        
        # Project next 3 months
        projections = []
        for i in range(1, 4):
            month = (datetime.now() + timedelta(days=30*i)).strftime("%b %Y")
            # Simple projection: avg monthly + growth trend
            projected = avg_monthly_revenue * (1 + growth_rate/100 * i/12)
            projections.append({
                "month": month,
                "projected_revenue": round(projected, 0),
                "confidence": "medium" if i <= 2 else "low"
            })
        
        return {
            "historical": [
                {
                    "month": f"{m['_id']['year']}-{m['_id']['month']:02d}",
                    "revenue": m["revenue"],
                    "orders": m["count"]
                } for m in monthly_data
            ],
            "metrics": {
                "avg_monthly_revenue": round(avg_monthly_revenue, 0),
                "growth_rate": round(growth_rate, 1),
                "pipeline_value": pipeline_value,
                "weighted_pipeline": round(weighted_pipeline, 0)
            },
            "projections": projections,
            "pipeline_breakdown": {
                status: len([e for e in pending_enquiries if e.get("status") == status])
                for status in status_weights.keys()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== NEW CUSTOMER TARGETING ==============

@router.get("/customer-targeting")
async def get_customer_targeting():
    """Get insights for targeting new customers and nurturing existing ones"""
    try:
        # All customers
        all_customers = await db.clients.find(
            {"customer_type": "domestic"},
            {"_id": 0, "id": 1, "name": 1, "contact_person": 1, "phone": 1, "email": 1, "location": 1, "city": 1}
        ).to_list(1000)
        
        # Customers with enquiries
        customers_with_enquiries = await db.sales_enquiries.distinct("company_name")
        
        # Identify prospects (customers with no enquiries)
        prospects = [
            c for c in all_customers 
            if c.get("name") and c["name"] not in customers_with_enquiries
        ]
        
        # Dormant customers (no enquiry in last 6 months but had before)
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        recent_customers = await db.sales_enquiries.distinct("company_name", {
            "created_at": {"$gte": six_months_ago}
        })
        
        dormant = [
            c for c in all_customers
            if c.get("name") in customers_with_enquiries and c.get("name") not in recent_customers
        ]
        
        # High-value customers (top 20% by order value)
        customer_values = await db.sales_enquiries.aggregate([
            {"$match": {"status": {"$in": ["accepted", "invoiced"]}}},
            {"$group": {
                "_id": "$company_name",
                "total_value": {"$sum": {"$ifNull": ["$value", 0]}},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"total_value": -1}}
        ]).to_list(1000)
        
        top_20_threshold = len(customer_values) // 5
        high_value_customers = customer_values[:max(top_20_threshold, 1)]
        
        # Customers needing follow-up (quoted but not accepted for >14 days)
        follow_up_needed = await db.sales_enquiries.find(
            {
                "status": {"$in": ["quoted", "negotiation"]},
                "created_at": {"$lt": datetime.now(timezone.utc) - timedelta(days=14)}
            },
            {"_id": 0}
        ).sort("created_at", 1).to_list(50)
        
        return {
            "summary": {
                "total_customers": len(all_customers),
                "active_customers": len(recent_customers),
                "prospects": len(prospects),
                "dormant_customers": len(dormant),
                "high_value_customers": len(high_value_customers)
            },
            "prospects": prospects[:20],  # Top 20 prospects
            "dormant_customers": [
                {"name": d.get("name"), "contact": d.get("contact_person"), "phone": d.get("phone")}
                for d in dormant[:20]
            ],
            "high_value_customers": [
                {"name": c["_id"], "total_value": c["total_value"], "orders": c["order_count"]}
                for c in high_value_customers[:10]
            ],
            "follow_up_needed": [
                {
                    "enquiry_no": f.get("enquiry_no"),
                    "company_name": f.get("company_name"),
                    "value": f.get("value"),
                    "status": f.get("status"),
                    "days_pending": safe_datetime_diff(datetime.now(timezone.utc), f.get("created_at"))
                } for f in follow_up_needed[:10]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== CUSTOMER LIST WITH ANALYTICS ==============

@router.get("/customers")
async def get_customers_with_analytics(
    search: Optional[str] = None,
    sort_by: str = "name",
    limit: int = 50,
    skip: int = 0
):
    """Get customer list with their analytics summary"""
    try:
        # Build query
        query = {"customer_type": "domestic"}
        if search:
            query["name"] = Regex(re.escape(search), "i")
        
        # Get customers
        customers = await db.clients.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        total = await db.clients.count_documents(query)
        
        # Enrich with analytics
        enriched = []
        for c in customers:
            customer_name = c.get("name", "")
            
            # Get enquiry stats using exact match for better performance
            enquiry_stats = await db.sales_enquiries.aggregate([
                {"$match": {"company_name": customer_name}},
                {"$group": {
                    "_id": None,
                    "total_enquiries": {"$sum": 1},
                    "total_value": {"$sum": {"$ifNull": ["$value", 0]}},
                    "won": {"$sum": {"$cond": [{"$in": ["$status", ["accepted", "invoiced"]]}, 1, 0]}},
                    "pending": {"$sum": {"$cond": [
                        {"$and": [
                            {"$ne": ["$status", "accepted"]},
                            {"$ne": ["$status", "invoiced"]},
                            {"$ne": ["$status", "declined"]}
                        ]}, 
                        1, 
                        0
                    ]}}
                }}
            ]).to_list(1)
            
            stats = enquiry_stats[0] if enquiry_stats else {
                "total_enquiries": 0, "total_value": 0, "won": 0, "pending": 0
            }
            
            enriched.append({
                **c,
                "analytics": {
                    "total_enquiries": stats.get("total_enquiries", 0),
                    "total_value": stats.get("total_value", 0),
                    "won_orders": stats.get("won", 0),
                    "pending_enquiries": stats.get("pending", 0)
                }
            })
        
        return {
            "customers": enriched,
            "total": total,
            "page": skip // limit + 1,
            "pages": (total + limit - 1) // limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
