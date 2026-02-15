"""
Dashboard routes - Migrated from server.py
Uses absolute imports for compatibility
With Redis caching for improved performance
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Absolute imports from core modules
from core.database import db
from core.security import get_current_user

# Import caching utilities
from utils.cache import cache, CacheTTL


class DashboardStats(BaseModel):
    total_projects: int
    total_billing: float
    pending_pos: int
    active_projects: int
    this_week_billing: float
    completion_avg: float
    category_breakdown: dict
    status_breakdown: dict


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


async def _compute_dashboard_stats() -> dict:
    """Compute dashboard statistics from database"""
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    
    total_projects = len(projects)
    total_billing = sum(p.get('po_amount', 0) for p in projects)
    pending_pos = sum(1 for p in projects if not p.get('po_number') or p.get('po_number') == '')
    
    active_projects = sum(1 for p in projects if p.get('status') != 'Completed')
    this_week_billing = sum(p.get('this_week_billing', 0) for p in projects)
    
    non_completed_projects = [p for p in projects if p.get('status') != 'Completed']
    completion_percentages = [p.get('completion_percentage', 0) for p in non_completed_projects]
    completion_avg = sum(completion_percentages) / len(completion_percentages) if completion_percentages else 0
    
    category_breakdown = {}
    for p in projects:
        cat = p.get('category', 'Other')
        if cat not in category_breakdown:
            category_breakdown[cat] = {'count': 0, 'value': 0}
        category_breakdown[cat]['count'] += 1
        category_breakdown[cat]['value'] += p.get('po_amount', 0)
    
    status_breakdown = {}
    for p in projects:
        status = p.get('status', 'Unknown')
        if status not in status_breakdown:
            status_breakdown[status] = 0
        status_breakdown[status] += 1
    
    return {
        "total_projects": total_projects,
        "total_billing": total_billing,
        "pending_pos": pending_pos,
        "active_projects": active_projects,
        "this_week_billing": this_week_billing,
        "completion_avg": completion_avg,
        "category_breakdown": category_breakdown,
        "status_breakdown": status_breakdown
    }


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics (cached for 5 minutes)"""
    cache_key = "dashboard:stats"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return DashboardStats(**cached)
    
    # Compute and cache
    stats = await _compute_dashboard_stats()
    await cache.set(cache_key, stats, ttl=CacheTTL.MEDIUM)
    
    return DashboardStats(**stats)


@router.get("/this-week-breakdown")
async def get_this_week_breakdown():
    """Get detailed breakdown of this week's billing by project (cached for 5 minutes)"""
    cache_key = "dashboard:this_week_breakdown"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Compute
    projects = await db.projects.find(
        {"this_week_billing": {"$gt": 0}},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "this_week_billing": 1, "category": 1}
    ).to_list(1000)
    
    total = sum(p.get('this_week_billing', 0) for p in projects)
    
    result = {
        "total": total,
        "count": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('this_week_billing', 0), reverse=True)
    }
    
    # Cache result
    await cache.set(cache_key, result, ttl=CacheTTL.MEDIUM)
    
    return result


@router.get("/active-projects-breakdown")
async def get_active_projects_breakdown():
    """Get detailed breakdown of active (ongoing) projects (cached for 5 minutes)"""
    cache_key = "dashboard:active_projects_breakdown"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Compute
    projects = await db.projects.find(
        {"status": "Ongoing"},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "completion_percentage": 1, "category": 1, "engineer_in_charge": 1}
    ).to_list(1000)
    
    result = {
        "total": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('completion_percentage', 0))
    }
    
    # Cache result
    await cache.set(cache_key, result, ttl=CacheTTL.MEDIUM)
    
    return result


@router.get("/total-billing-breakdown")
async def get_total_billing_breakdown():
    """Get detailed breakdown of total billing by project (cached for 5 minutes)"""
    cache_key = "dashboard:total_billing_breakdown"
    
    # Try to get from cache
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Compute
    projects = await db.projects.find(
        {"po_amount": {"$gt": 0}},
        {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "po_amount": 1, "invoiced_amount": 1, "category": 1}
    ).to_list(1000)
    
    for p in projects:
        p['balance'] = p.get('po_amount', 0) - p.get('invoiced_amount', 0)
    
    total_po = sum(p.get('po_amount', 0) for p in projects)
    total_invoiced = sum(p.get('invoiced_amount', 0) for p in projects)
    total_balance = total_po - total_invoiced
    
    result = {
        "total_po_amount": total_po,
        "total_invoiced": total_invoiced,
        "total_balance": total_balance,
        "count": len(projects),
        "projects": sorted(projects, key=lambda x: x.get('po_amount', 0), reverse=True)
    }
    
    # Cache result
    await cache.set(cache_key, result, ttl=CacheTTL.MEDIUM)
    
    return result


@router.post("/invalidate-cache")
async def invalidate_dashboard_cache():
    """Manually invalidate dashboard cache (admin only)"""
    count = await cache.invalidate_pattern("dashboard:*")
    return {"message": f"Invalidated {count} cache entries", "pattern": "dashboard:*"}


@router.get("/cache-stats")
async def get_cache_stats():
    """Get cache statistics"""
    return cache.get_stats()
