"""
Administration Routes - Admin panel for managing company-wide content
Includes: Announcements, Events, Holidays, Dashboard Settings
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os

router = APIRouter(prefix="/api/admin", tags=["Administration"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "enerzia_erp")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============= MODELS =============

class Announcement(BaseModel):
    title: str
    content: str
    priority: str = "medium"  # low, medium, high
    target_audience: str = "all"  # all, projects, accounts, sales, hr, etc.
    expiry_date: str


class AnnouncementInDB(Announcement):
    id: str
    created_at: str
    created_by: str
    status: str = "active"


class Event(BaseModel):
    title: str
    date: str
    time: str
    location: str
    type: str = "meeting"  # meeting, training, celebration, launch
    attendees: str = "All Employees"
    description: Optional[str] = ""


class EventInDB(Event):
    id: str
    created_at: str
    created_by: str


class Holiday(BaseModel):
    name: str
    date: str
    type: str = "national"  # national, regional, company


class HolidayInDB(Holiday):
    id: str
    day: str  # Monday, Tuesday, etc.
    year: int


# Helper to serialize MongoDB documents
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ============= ANNOUNCEMENTS =============

@router.get("/announcements")
async def get_announcements(status: Optional[str] = None, target_audience: Optional[str] = None):
    """Get all announcements"""
    query = {}
    if status:
        query["status"] = status
    if target_audience and target_audience != "all":
        query["$or"] = [
            {"target_audience": target_audience},
            {"target_audience": "all"}
        ]
    
    cursor = db.announcements.find(query).sort("created_at", -1)
    announcements = []
    async for doc in cursor:
        announcements.append(serialize_doc(doc))
    return {"announcements": announcements}


@router.get("/announcements/active")
async def get_active_announcements(target_audience: Optional[str] = None):
    """Get active announcements (not expired)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {
        "status": "active",
        "expiry_date": {"$gte": today}
    }
    if target_audience and target_audience != "all":
        query["$or"] = [
            {"target_audience": target_audience},
            {"target_audience": "all"}
        ]
    
    cursor = db.announcements.find(query).sort([("priority", -1), ("created_at", -1)])
    announcements = []
    async for doc in cursor:
        announcements.append(serialize_doc(doc))
    return {"announcements": announcements}


@router.post("/announcements")
async def create_announcement(announcement: Announcement, created_by: str):
    """Create a new announcement"""
    doc = {
        **announcement.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": created_by,
        "status": "active"
    }
    result = await db.announcements.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Announcement created", "announcement": doc}


@router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, announcement: Announcement):
    """Update an announcement"""
    result = await db.announcements.update_one(
        {"_id": ObjectId(announcement_id)},
        {"$set": announcement.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement updated"}


@router.put("/announcements/{announcement_id}/status")
async def update_announcement_status(announcement_id: str, status: str):
    """Update announcement status (active/inactive)"""
    result = await db.announcements.update_one(
        {"_id": ObjectId(announcement_id)},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": f"Announcement status updated to {status}"}


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str):
    """Delete an announcement"""
    result = await db.announcements.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}


# ============= EVENTS =============

@router.get("/events")
async def get_events(year: Optional[int] = None, month: Optional[int] = None):
    """Get all events"""
    query = {}
    if year:
        query["date"] = {"$regex": f"^{year}"}
    if month:
        month_str = f"{year or datetime.now().year}-{month:02d}"
        query["date"] = {"$regex": f"^{month_str}"}
    
    cursor = db.events.find(query).sort("date", 1)
    events = []
    async for doc in cursor:
        events.append(serialize_doc(doc))
    return {"events": events}


@router.get("/events/upcoming")
async def get_upcoming_events(limit: int = 5):
    """Get upcoming events"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cursor = db.events.find({"date": {"$gte": today}}).sort("date", 1).limit(limit)
    events = []
    async for doc in cursor:
        events.append(serialize_doc(doc))
    return {"events": events}


@router.post("/events")
async def create_event(event: Event, created_by: str):
    """Create a new event"""
    doc = {
        **event.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": created_by
    }
    result = await db.events.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Event created", "event": doc}


@router.put("/events/{event_id}")
async def update_event(event_id: str, event: Event):
    """Update an event"""
    result = await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": event.dict()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete an event"""
    result = await db.events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


# ============= HOLIDAYS =============

@router.get("/holidays")
async def get_holidays(year: Optional[int] = None, type: Optional[str] = None):
    """Get all holidays"""
    query = {}
    if year:
        query["year"] = year
    if type:
        query["type"] = type
    
    cursor = db.holidays.find(query).sort("date", 1)
    holidays = []
    async for doc in cursor:
        holidays.append(serialize_doc(doc))
    return {"holidays": holidays}


@router.get("/holidays/upcoming")
async def get_upcoming_holidays(limit: int = 5):
    """Get upcoming holidays"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cursor = db.holidays.find({"date": {"$gte": today}}).sort("date", 1).limit(limit)
    holidays = []
    async for doc in cursor:
        holidays.append(serialize_doc(doc))
    return {"holidays": holidays}


@router.post("/holidays")
async def create_holiday(holiday: Holiday):
    """Create a new holiday"""
    date_obj = datetime.strptime(holiday.date, "%Y-%m-%d")
    doc = {
        **holiday.dict(),
        "day": date_obj.strftime("%A"),
        "year": date_obj.year
    }
    result = await db.holidays.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return {"message": "Holiday created", "holiday": doc}


@router.put("/holidays/{holiday_id}")
async def update_holiday(holiday_id: str, holiday: Holiday):
    """Update a holiday"""
    date_obj = datetime.strptime(holiday.date, "%Y-%m-%d")
    update_data = {
        **holiday.dict(),
        "day": date_obj.strftime("%A"),
        "year": date_obj.year
    }
    result = await db.holidays.update_one(
        {"_id": ObjectId(holiday_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"message": "Holiday updated"}


@router.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str):
    """Delete a holiday"""
    result = await db.holidays.delete_one({"_id": ObjectId(holiday_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"message": "Holiday deleted"}


# ============= DASHBOARD DATA =============

@router.get("/dashboard-data")
async def get_dashboard_data(department: Optional[str] = None):
    """Get data to populate the main company dashboard"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get active announcements
    announcement_query = {
        "status": "active",
        "expiry_date": {"$gte": today}
    }
    if department and department != "all":
        announcement_query["$or"] = [
            {"target_audience": department.lower()},
            {"target_audience": "all"}
        ]
    
    cursor = db.announcements.find(announcement_query).sort([("priority", -1), ("created_at", -1)]).limit(5)
    announcements = []
    async for doc in cursor:
        announcements.append(serialize_doc(doc))
    
    # Get upcoming events
    cursor = db.events.find({"date": {"$gte": today}}).sort("date", 1).limit(5)
    events = []
    async for doc in cursor:
        events.append(serialize_doc(doc))
    
    # Get upcoming holidays
    cursor = db.holidays.find({"date": {"$gte": today}}).sort("date", 1).limit(5)
    holidays = []
    async for doc in cursor:
        holidays.append(serialize_doc(doc))
    
    # Count stats
    total_announcements = await db.announcements.count_documents(announcement_query)
    high_priority = await db.announcements.count_documents({**announcement_query, "priority": "high"})
    total_events = await db.events.count_documents({"date": {"$gte": today}})
    total_holidays = await db.holidays.count_documents({"date": {"$gte": today}})
    
    return {
        "announcements": announcements,
        "events": events,
        "holidays": holidays,
        "stats": {
            "totalAnnouncements": total_announcements,
            "highPriorityAnnouncements": high_priority,
            "upcomingEvents": total_events,
            "upcomingHolidays": total_holidays
        }
    }


# ============= ADMIN STATS =============

@router.get("/stats")
async def get_admin_stats():
    """Get admin panel statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_year = datetime.now().year
    
    # Announcements stats
    total_announcements = await db.announcements.count_documents({"status": "active"})
    high_priority = await db.announcements.count_documents({"status": "active", "priority": "high"})
    expiring_soon = await db.announcements.count_documents({
        "status": "active",
        "expiry_date": {"$gte": today, "$lte": (datetime.now(timezone.utc).replace(day=datetime.now().day + 7)).strftime("%Y-%m-%d")}
    })
    
    # Events stats
    total_events = await db.events.count_documents({})
    this_month_events = await db.events.count_documents({
        "date": {"$regex": f"^{current_year}-{datetime.now().month:02d}"}
    })
    upcoming_events = await db.events.count_documents({"date": {"$gte": today}})
    
    # Holidays stats
    total_holidays = await db.holidays.count_documents({"year": current_year})
    national_holidays = await db.holidays.count_documents({"year": current_year, "type": "national"})
    regional_holidays = await db.holidays.count_documents({"year": current_year, "type": "regional"})
    company_holidays = await db.holidays.count_documents({"year": current_year, "type": "company"})
    
    return {
        "announcements": {
            "total": total_announcements,
            "highPriority": high_priority,
            "expiringSoon": expiring_soon
        },
        "events": {
            "total": total_events,
            "thisMonth": this_month_events,
            "upcoming": upcoming_events
        },
        "holidays": {
            "total": total_holidays,
            "national": national_holidays,
            "regional": regional_holidays,
            "company": company_holidays
        }
    }
