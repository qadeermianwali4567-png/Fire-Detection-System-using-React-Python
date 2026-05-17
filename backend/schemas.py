from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta


# ─── Auth Schemas ───────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


# ─── Admin Schemas ──────────────────────────────────────────

class AdminCreateRequest(BaseModel):
    username: str
    email: str
    password: str


class AdminResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    created_at: datetime


# ─── Camera Schemas ─────────────────────────────────────────

class CameraCreateRequest(BaseModel):
    name: str
    location: str
    stream_url: str = "0"


class CameraResponse(BaseModel):
    id: str
    name: str
    location: str
    stream_url: str
    is_active: bool
    created_at: datetime


# ─── Incident Schemas ───────────────────────────────────────

class IncidentResponse(BaseModel):
    id: str
    camera_id: str
    camera_name: str
    location: str
    confidence_score: float
    frame_path: str
    detected_at: datetime
    status: str
    notes: Optional[str] = None


class IncidentUpdateRequest(BaseModel):
    status: str        # new, acknowledged, resolved
    notes: Optional[str] = None


class IncidentListResponse(BaseModel):
    total: int
    page: int
    per_page: int
    incidents: list[IncidentResponse]


# ─── Reports Schemas ────────────────────────────────────────

class MonthlyReportResponse(BaseModel):
    month: str
    count: int


class AnnualReportResponse(BaseModel):
    year: int
    monthly_data: list[MonthlyReportResponse]
    total: int


class HourlyReportResponse(BaseModel):
    hour: int
    count: int


# ─── Performance Schemas ────────────────────────────────────

class PerformanceCreateRequest(BaseModel):
    precision: float
    recall: float
    map50: float
    map50_95: float
    fps: float
    model_version: str = "fire_model"


class PerformanceResponse(BaseModel):
    id: str
    precision: float
    recall: float
    map50: float
    map50_95: float
    fps: float
    model_version: str
    recorded_at: datetime


# ─── General Schemas ────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True