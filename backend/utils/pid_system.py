"""
Unified PID System Utility
Generates consistent PID numbers across all modules:
- Sales Orders: PID/{FY}/{number}
- Projects: PID/{FY}/{number} (same as sales order)
- Quotations: Q-PID/{FY}/{number}
- Purchase Orders: PO-PID/{FY}/{number}-{seq}
- Expenses: Linked to PID

Financial Year: April 1 to March 31
Example: PID/25-26/001 for April 2025 - March 2026
"""

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'enerzia_erp')]


def get_current_financial_year() -> str:
    """
    Calculate current financial year based on Indian FY (April 1 - March 31)
    Returns format: "25-26" for FY 2025-2026 (April 2025 - March 2026)
    """
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month
    
    # FY starts April 1st
    # If current month is Jan-Mar, we're in previous year's FY
    if month >= 4:  # April to December
        year1 = year % 100  # e.g., 2025 -> 25
        year2 = (year + 1) % 100  # e.g., 2026 -> 26
    else:  # January to March
        year1 = (year - 1) % 100  # e.g., 2026 -> 25 (still in FY 25-26)
        year2 = year % 100  # e.g., 2026 -> 26
    
    return f"{year1:02d}-{year2:02d}"


async def get_next_pid(financial_year: str = None) -> dict:
    """
    Generate next consecutive PID number for the financial year.
    This is the MASTER PID generator used by both Sales Orders and Projects.
    
    Args:
        financial_year: Optional FY string like "25-26". Uses current FY if not provided.
    
    Returns:
        dict with next_pid (e.g., "PID/25-26/363") and financial_year
    """
    if not financial_year:
        financial_year = get_current_financial_year()
    
    # Search pattern for this FY
    pattern = f"^PID/{financial_year}/"
    
    # Check both sales_orders and projects for existing PIDs
    sales_pids = await db.sales_orders.find(
        {"order_no": {"$regex": pattern}},
        {"order_no": 1, "_id": 0}
    ).to_list(10000)
    
    project_pids = await db.projects.find(
        {"pid_no": {"$regex": pattern}},
        {"pid_no": 1, "_id": 0}
    ).to_list(10000)
    
    # Extract all PID numbers
    all_numbers = set()
    
    for order in sales_pids:
        pid = order.get("order_no", "")
        parts = pid.split("/")
        if len(parts) == 3:
            try:
                all_numbers.add(int(parts[2]))
            except ValueError:
                pass
    
    for project in project_pids:
        pid = project.get("pid_no", "")
        parts = pid.split("/")
        if len(parts) == 3:
            try:
                all_numbers.add(int(parts[2]))
            except ValueError:
                pass
    
    # Get next number
    next_num = max(all_numbers) + 1 if all_numbers else 1
    
    return {
        "next_pid": f"PID/{financial_year}/{next_num:03d}",
        "financial_year": financial_year,
        "sequence": next_num
    }


async def get_next_quotation_number(linked_pid: str = None) -> str:
    """
    Generate quotation number.
    If linked to a PID: Q-PID/25-26/363
    If standalone: Q-25-26-0001
    
    Args:
        linked_pid: Optional PID to link quotation to
    
    Returns:
        Quotation number string
    """
    financial_year = get_current_financial_year()
    
    if linked_pid:
        # Format: Q-PID/25-26/363
        return f"Q-{linked_pid}"
    else:
        # Standalone quotation: Q-25-26-0001
        pattern = f"^Q-{financial_year}-"
        latest = await db.quotations.find_one(
            {"quotation_no": {"$regex": pattern}},
            sort=[("quotation_no", -1)]
        )
        
        next_num = 1
        if latest:
            try:
                last_num = int(latest["quotation_no"].split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                pass
        
        return f"Q-{financial_year}-{next_num:04d}"


async def get_next_purchase_order_number(linked_pid: str) -> str:
    """
    Generate purchase order number linked to a PID.
    Format: PO-PID/25-26/363-01 (sequential within that PID)
    
    Args:
        linked_pid: The PID this PO is linked to (required)
    
    Returns:
        Purchase order number string
    """
    if not linked_pid:
        # Fallback for unlinked POs
        financial_year = get_current_financial_year()
        pattern = f"^PO-{financial_year}-"
        latest = await db.purchase_orders_v2.find_one(
            {"po_number": {"$regex": pattern}},
            sort=[("po_number", -1)]
        )
        
        next_num = 1
        if latest:
            try:
                last_num = int(latest["po_number"].split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                pass
        
        return f"PO-{financial_year}-{next_num:04d}"
    
    # Format: PO-PID/25-26/363-01
    base_pattern = f"^PO-{linked_pid}-"
    existing_pos = await db.purchase_orders_v2.find(
        {"po_number": {"$regex": base_pattern}},
        {"po_number": 1, "_id": 0}
    ).to_list(100)
    
    # Find next sequence
    max_seq = 0
    for po in existing_pos:
        po_num = po.get("po_number", "")
        try:
            seq = int(po_num.split("-")[-1])
            max_seq = max(max_seq, seq)
        except (ValueError, IndexError):
            pass
    
    next_seq = max_seq + 1
    return f"PO-{linked_pid}-{next_seq:02d}"


async def get_next_purchase_request_number(linked_pid: str) -> str:
    """
    Generate purchase request number linked to a PID.
    Format: PR-PID/25-26/363-01
    
    Args:
        linked_pid: The PID this PR is linked to
    
    Returns:
        Purchase request number string
    """
    if not linked_pid:
        financial_year = get_current_financial_year()
        return f"PR-{financial_year}-{datetime.now().strftime('%H%M%S')}"
    
    base_pattern = f"^PR-{linked_pid}-"
    existing_prs = await db.purchase_requests.find(
        {"pr_number": {"$regex": base_pattern}},
        {"pr_number": 1, "_id": 0}
    ).to_list(100)
    
    max_seq = 0
    for pr in existing_prs:
        pr_num = pr.get("pr_number", "")
        try:
            seq = int(pr_num.split("-")[-1])
            max_seq = max(max_seq, seq)
        except (ValueError, IndexError):
            pass
    
    next_seq = max_seq + 1
    return f"PR-{linked_pid}-{next_seq:02d}"


def extract_pid_from_order_no(order_no: str) -> str:
    """
    Extract PID from various formats.
    - PID/25-26/363 -> PID/25-26/363
    - SO-25-26-0001 -> None (old format)
    """
    if order_no and order_no.startswith("PID/"):
        return order_no
    return None


def is_pid_format(identifier: str) -> bool:
    """Check if identifier is in PID format"""
    return identifier and identifier.startswith("PID/") and identifier.count("/") == 2
