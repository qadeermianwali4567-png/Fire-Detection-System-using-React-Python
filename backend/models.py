from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta


# ─── Admin Models ───────────────────────────────────────────

class AdminBase(BaseModel):
    username: str
    email: str


class AdminCreate(AdminBase):
    password: str


class AdminInDB(AdminBase):
    id: str
    hashed_password: str
    created_at: datetime
    is_active: bool = True


# ─── Camera Models ──────────────────────────────────────────

class CameraBase(BaseModel):
    name: str
    location: str
    stream_url: str = "0"  # Default: webcam


class CameraCreate(CameraBase):
    pass


class CameraInDB(CameraBase):
    id: str
    is_active: bool = True
    created_at: datetime


# ─── Incident Models ────────────────────────────────────────

class IncidentBase(BaseModel):
    camera_id: str
    camera_name: str
    location: str
    confidence_score: float
    frame_path: str


class IncidentCreate(IncidentBase):
    pass


class IncidentInDB(IncidentBase):
    id: str
    detected_at: datetime
    status: str = "new"  # new, acknowledged, resolved
    notes: Optional[str] = None


# ─── Model Performance Models ───────────────────────────────

class PerformanceBase(BaseModel):
    precision: float
    recall: float
    map50: float
    map50_95: float
    fps: float


class PerformanceCreate(PerformanceBase):
    pass


class PerformanceInDB(PerformanceBase):
    id: str
    recorded_at: datetime
    model_version: str = "fire_model"


# ─── Audit Log Models ───────────────────────────────────────

class AuditLogBase(BaseModel):
    admin_id: str
    admin_username: str
    action: str
    details: Optional[str] = None


class AuditLogInDB(AuditLogBase):
    id: str
    timestamp: datetime