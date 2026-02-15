from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class MeetingActionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyMeeting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meeting_date: str
    meeting_type: str = "Weekly Review"
    attendees: List[str] = []
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    key_decisions: Optional[str] = None
    action_items: List[MeetingActionItem] = []
    status: str = "Scheduled"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[str] = []
    project_updates: List[dict] = []
    billing_summary: Optional[dict] = None
    department_updates: List[dict] = []
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyMeetingCreate(BaseModel):
    meeting_date: str
    meeting_type: str = "Weekly Review"
    attendees: List[str] = []
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    key_decisions: Optional[str] = None
    action_items: List[MeetingActionItem] = []
    status: str = "Scheduled"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    project_updates: List[dict] = []
    billing_summary: Optional[dict] = None
    department_updates: List[dict] = []

class WeeklyMeetingUpdate(BaseModel):
    meeting_date: Optional[str] = None
    meeting_type: Optional[str] = None
    attendees: Optional[List[str]] = None
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    key_decisions: Optional[str] = None
    action_items: Optional[List[MeetingActionItem]] = None
    status: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    project_updates: Optional[List[dict]] = None
    billing_summary: Optional[dict] = None
    department_updates: Optional[List[dict]] = None
