"""
Project Profit Module
Tracks project profitability by linking revenue, costs, and budget data
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

from core.database import db
from core.security import get_current_user, require_auth

router = APIRouter(prefix="/project-profit", tags=["Project Profit"])


# ==================== MODELS ====================

class BudgetAllocation(BaseModel):
    """Budget allocation for a project from Sales"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    order_reference: Optional[str] = None  # Zoho order reference or manual entry
    order_value: float = 0  # Total order/contract value (Revenue)
    
    # Budget breakdown
    material_budget: float = 0
    labor_budget: float = 0
    subcontractor_budget: float = 0
    travel_budget: float = 0
    overhead_budget: float = 0
    contingency_budget: float = 0
    
    # Metadata
    allocated_by: Optional[str] = None
    allocated_date: Optional[str] = None
    notes: Optional[str] = None
    status: str = "draft"  # draft, approved, revised
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCost(BaseModel):
    """Actual costs incurred for a project"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    cost_type: str  # material, labor, subcontractor, travel, overhead, other
    description: str
    amount: float
    reference_type: Optional[str] = None  # purchase_order, expense_claim, travel_log, payroll
    reference_id: Optional[str] = None
    date: str
    recorded_by: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BudgetAllocationCreate(BaseModel):
    project_id: str
    order_reference: Optional[str] = None
    order_value: float = 0
    material_budget: float = 0
    labor_budget: float = 0
    subcontractor_budget: float = 0
    travel_budget: float = 0
    overhead_budget: float = 0
    contingency_budget: float = 0
    notes: Optional[str] = None


class ProjectCostCreate(BaseModel):
    project_id: str
    cost_type: str
    description: str
    amount: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    date: str


# ==================== BUDGET ALLOCATION ENDPOINTS ====================

@router.post("/budget")
async def create_budget_allocation(data: BudgetAllocationCreate, current_user: dict = Depends(require_auth)):
    """Create a new budget allocation for a project"""
    
    # Verify project exists
    project = await db.projects.find_one({"id": data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if budget already exists for this project
    existing = await db.project_budgets.find_one({"project_id": data.project_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this project. Use update instead.")
    
    budget = BudgetAllocation(
        **data.model_dump(),
        allocated_by=current_user.get("name", current_user.get("email")),
        allocated_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        status="draft"
    )
    
    await db.project_budgets.insert_one(budget.model_dump())
    
    # Update project with budget total
    total_budget = (data.material_budget + data.labor_budget + data.subcontractor_budget + 
                   data.travel_budget + data.overhead_budget + data.contingency_budget)
    await db.projects.update_one(
        {"id": data.project_id},
        {"$set": {"budget": total_budget, "po_amount": data.order_value}}
    )
    
    return {"message": "Budget allocation created", "id": budget.id}


@router.get("/budget/{project_id}")
async def get_budget_allocation(project_id: str, current_user: dict = Depends(require_auth)):
    """Get budget allocation for a project"""
    budget = await db.project_budgets.find_one({"project_id": project_id}, {"_id": 0})
    if not budget:
        return {"message": "No budget allocated", "budget": None}
    return budget


@router.put("/budget/{project_id}")
async def update_budget_allocation(project_id: str, data: BudgetAllocationCreate, current_user: dict = Depends(require_auth)):
    """Update budget allocation for a project"""
    
    existing = await db.project_budgets.find_one({"project_id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    total_budget = (data.material_budget + data.labor_budget + data.subcontractor_budget + 
                   data.travel_budget + data.overhead_budget + data.contingency_budget)
    
    update_data = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc),
        "status": "revised"
    }
    
    await db.project_budgets.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    
    # Update project budget
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"budget": total_budget, "po_amount": data.order_value}}
    )
    
    return {"message": "Budget updated"}


@router.post("/budget/{project_id}/approve")
async def approve_budget(project_id: str, current_user: dict = Depends(require_auth)):
    """Approve a budget allocation"""
    result = await db.project_budgets.update_one(
        {"project_id": project_id},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget approved"}


# ==================== PROJECT COSTS ENDPOINTS ====================

@router.post("/costs")
async def add_project_cost(data: ProjectCostCreate, current_user: dict = Depends(require_auth)):
    """Add a cost entry for a project"""
    
    cost = ProjectCost(
        **data.model_dump(),
        recorded_by=current_user.get("name", current_user.get("email"))
    )
    
    await db.project_costs.insert_one(cost.model_dump())
    
    # Update project actual_expenses
    await update_project_actual_expenses(data.project_id)
    
    return {"message": "Cost added", "id": cost.id}


@router.get("/costs/{project_id}")
async def get_project_costs(project_id: str, current_user: dict = Depends(require_auth)):
    """Get all costs for a project"""
    costs = await db.project_costs.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("date", -1).to_list(500)
    
    # Group by cost type
    by_type = {}
    total = 0
    for cost in costs:
        cost_type = cost.get("cost_type", "other")
        if cost_type not in by_type:
            by_type[cost_type] = {"items": [], "total": 0}
        by_type[cost_type]["items"].append(cost)
        by_type[cost_type]["total"] += cost.get("amount", 0)
        total += cost.get("amount", 0)
    
    return {
        "costs": costs,
        "by_type": by_type,
        "total": total
    }


@router.delete("/costs/{cost_id}")
async def delete_project_cost(cost_id: str, current_user: dict = Depends(require_auth)):
    """Delete a cost entry"""
    cost = await db.project_costs.find_one({"id": cost_id}, {"_id": 0})
    if not cost:
        raise HTTPException(status_code=404, detail="Cost not found")
    
    await db.project_costs.delete_one({"id": cost_id})
    await update_project_actual_expenses(cost["project_id"])
    
    return {"message": "Cost deleted"}


# ==================== PROFIT ANALYSIS ENDPOINTS ====================

@router.get("/analysis/{project_id}")
async def get_project_profit_analysis(project_id: str, current_user: dict = Depends(require_auth)):
    """Get complete profit analysis for a project"""
    
    # Get project
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get budget
    budget = await db.project_budgets.find_one({"project_id": project_id}, {"_id": 0})
    
    # Get all costs
    costs = await db.project_costs.find({"project_id": project_id}, {"_id": 0}).to_list(500)
    
    # Calculate actual costs by type
    actual_costs = {
        "material": 0,
        "labor": 0,
        "subcontractor": 0,
        "travel": 0,
        "overhead": 0,
        "other": 0
    }
    for cost in costs:
        cost_type = cost.get("cost_type", "other")
        if cost_type in actual_costs:
            actual_costs[cost_type] += cost.get("amount", 0)
        else:
            actual_costs["other"] += cost.get("amount", 0)
    
    total_actual_cost = sum(actual_costs.values())
    
    # Get linked expenses from travel_log
    travel_expenses = await db.travel_logs.find(
        {"project_id": project_id},
        {"_id": 0, "total_expenses": 1}
    ).to_list(100)
    travel_total = sum(t.get("total_expenses", 0) for t in travel_expenses)
    
    # Calculate revenue
    order_value = budget.get("order_value", 0) if budget else project.get("po_amount", 0)
    
    # Calculate totals
    total_budget = 0
    if budget:
        total_budget = (budget.get("material_budget", 0) + budget.get("labor_budget", 0) + 
                       budget.get("subcontractor_budget", 0) + budget.get("travel_budget", 0) + 
                       budget.get("overhead_budget", 0) + budget.get("contingency_budget", 0))
    
    total_expenses = total_actual_cost + travel_total
    gross_profit = order_value - total_expenses
    profit_margin = (gross_profit / order_value * 100) if order_value > 0 else 0
    budget_variance = total_budget - total_expenses
    
    return {
        "project": {
            "id": project_id,
            "pid_no": project.get("pid_no"),
            "project_name": project.get("project_name"),
            "client": project.get("client"),
            "status": project.get("status")
        },
        "revenue": {
            "order_value": order_value,
            "order_reference": budget.get("order_reference") if budget else None
        },
        "budget": {
            "total": total_budget,
            "breakdown": {
                "material": budget.get("material_budget", 0) if budget else 0,
                "labor": budget.get("labor_budget", 0) if budget else 0,
                "subcontractor": budget.get("subcontractor_budget", 0) if budget else 0,
                "travel": budget.get("travel_budget", 0) if budget else 0,
                "overhead": budget.get("overhead_budget", 0) if budget else 0,
                "contingency": budget.get("contingency_budget", 0) if budget else 0
            },
            "status": budget.get("status") if budget else "not_allocated"
        },
        "actual_costs": {
            "total": total_expenses,
            "breakdown": actual_costs,
            "travel_expenses": travel_total,
            "cost_entries": len(costs)
        },
        "profitability": {
            "gross_profit": gross_profit,
            "profit_margin_percent": round(profit_margin, 2),
            "budget_variance": budget_variance,
            "budget_utilization_percent": round((total_expenses / total_budget * 100) if total_budget > 0 else 0, 2)
        },
        "budget_vs_actual": {
            "material": {
                "budget": budget.get("material_budget", 0) if budget else 0,
                "actual": actual_costs["material"],
                "variance": (budget.get("material_budget", 0) if budget else 0) - actual_costs["material"]
            },
            "labor": {
                "budget": budget.get("labor_budget", 0) if budget else 0,
                "actual": actual_costs["labor"],
                "variance": (budget.get("labor_budget", 0) if budget else 0) - actual_costs["labor"]
            },
            "subcontractor": {
                "budget": budget.get("subcontractor_budget", 0) if budget else 0,
                "actual": actual_costs["subcontractor"],
                "variance": (budget.get("subcontractor_budget", 0) if budget else 0) - actual_costs["subcontractor"]
            },
            "travel": {
                "budget": budget.get("travel_budget", 0) if budget else 0,
                "actual": actual_costs["travel"] + travel_total,
                "variance": (budget.get("travel_budget", 0) if budget else 0) - (actual_costs["travel"] + travel_total)
            },
            "overhead": {
                "budget": budget.get("overhead_budget", 0) if budget else 0,
                "actual": actual_costs["overhead"],
                "variance": (budget.get("overhead_budget", 0) if budget else 0) - actual_costs["overhead"]
            }
        }
    }


@router.get("/dashboard")
async def get_profit_dashboard(current_user: dict = Depends(require_auth)):
    """Get overall profit dashboard across all projects"""
    
    # Get all projects with budgets
    budgets = await db.project_budgets.find({}, {"_id": 0}).to_list(500)
    
    # Get all costs
    all_costs = await db.project_costs.find({}, {"_id": 0}).to_list(2000)
    
    # Aggregate by project
    project_summaries = []
    total_revenue = 0
    total_budget = 0
    total_actual = 0
    
    for budget in budgets:
        project_id = budget.get("project_id")
        project = await db.projects.find_one({"id": project_id}, {"_id": 0, "pid_no": 1, "project_name": 1, "client": 1, "status": 1})
        
        if not project:
            continue
        
        order_value = budget.get("order_value", 0)
        budget_total = (budget.get("material_budget", 0) + budget.get("labor_budget", 0) + 
                       budget.get("subcontractor_budget", 0) + budget.get("travel_budget", 0) + 
                       budget.get("overhead_budget", 0) + budget.get("contingency_budget", 0))
        
        # Get costs for this project
        project_costs = [c for c in all_costs if c.get("project_id") == project_id]
        actual_total = sum(c.get("amount", 0) for c in project_costs)
        
        gross_profit = order_value - actual_total
        margin = (gross_profit / order_value * 100) if order_value > 0 else 0
        
        project_summaries.append({
            "project_id": project_id,
            "pid_no": project.get("pid_no"),
            "project_name": project.get("project_name"),
            "client": project.get("client"),
            "status": project.get("status"),
            "order_value": order_value,
            "budget": budget_total,
            "actual_cost": actual_total,
            "gross_profit": gross_profit,
            "profit_margin": round(margin, 2),
            "budget_status": budget.get("status", "draft")
        })
        
        total_revenue += order_value
        total_budget += budget_total
        total_actual += actual_total
    
    # Sort by profit margin
    project_summaries.sort(key=lambda x: x["profit_margin"], reverse=True)
    
    return {
        "summary": {
            "total_projects": len(project_summaries),
            "total_revenue": total_revenue,
            "total_budget": total_budget,
            "total_actual_cost": total_actual,
            "total_gross_profit": total_revenue - total_actual,
            "average_margin": round(((total_revenue - total_actual) / total_revenue * 100) if total_revenue > 0 else 0, 2)
        },
        "projects": project_summaries,
        "top_profitable": project_summaries[:5] if len(project_summaries) >= 5 else project_summaries,
        "low_margin": sorted(project_summaries, key=lambda x: x["profit_margin"])[:5] if len(project_summaries) >= 5 else []
    }


# ==================== HELPER FUNCTIONS ====================

async def update_project_actual_expenses(project_id: str):
    """Update project's actual_expenses from all cost entries"""
    costs = await db.project_costs.find({"project_id": project_id}, {"_id": 0}).to_list(500)
    total = sum(c.get("amount", 0) for c in costs)
    
    # Also get travel expenses
    travel = await db.travel_logs.find({"project_id": project_id}, {"_id": 0, "total_expenses": 1}).to_list(100)
    travel_total = sum(t.get("total_expenses", 0) for t in travel)
    
    total_expenses = total + travel_total
    
    # Get budget for savings calculation
    budget = await db.project_budgets.find_one({"project_id": project_id}, {"_id": 0})
    if budget:
        budget_total = (budget.get("material_budget", 0) + budget.get("labor_budget", 0) + 
                       budget.get("subcontractor_budget", 0) + budget.get("travel_budget", 0) + 
                       budget.get("overhead_budget", 0) + budget.get("contingency_budget", 0))
        savings = budget_total - total_expenses
    else:
        savings = 0
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"actual_expenses": total_expenses, "pid_savings": savings}}
    )
