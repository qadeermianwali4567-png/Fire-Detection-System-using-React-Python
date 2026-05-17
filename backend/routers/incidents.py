from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional

from backend.database import incidents_collection
from backend.schemas import (
    IncidentResponse,
    IncidentUpdateRequest,
    IncidentListResponse
)
from backend.dependencies import get_current_admin

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


# ─── Helper ─────────────────────────────────────────────────

def format_incident(doc: dict) -> IncidentResponse:
    """Convert MongoDB document to IncidentResponse."""
    return IncidentResponse(
        id=str(doc["_id"]),
        camera_id=doc["camera_id"],
        camera_name=doc["camera_name"],
        location=doc["location"],
        confidence_score=doc["confidence_score"],
        frame_path=doc["frame_path"],
        detected_at=doc["detected_at"],
        status=doc.get("status", "new"),
        notes=doc.get("notes"),
    )


# ─── Routes ─────────────────────────────────────────────────

@router.get("", response_model=IncidentListResponse)
async def get_all_incidents(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin),
):
    """Get all incidents with pagination and filters."""

    # Build filter query
    query = {}
    if status:
        query["status"] = status
    if camera_id:
        query["camera_id"] = camera_id

    # Count total
    total = await incidents_collection.count_documents(query)

    # Fetch paginated results
    skip = (page - 1) * per_page
    cursor = incidents_collection.find(query)\
        .sort("detected_at", -1)\
        .skip(skip)\
        .limit(per_page)

    incidents = []
    async for doc in cursor:
        incidents.append(format_incident(doc))

    return IncidentListResponse(
        total=total,
        page=page,
        per_page=per_page,
        incidents=incidents,
    )


@router.get("/latest", response_model=list[IncidentResponse])
async def get_latest_incidents(
    limit: int = Query(10, ge=1, le=50),
    current_admin: dict = Depends(get_current_admin),
):
    """Get latest fire incidents for dashboard."""

    cursor = incidents_collection.find({})\
        .sort("detected_at", -1)\
        .limit(limit)

    incidents = []
    async for doc in cursor:
        incidents.append(format_incident(doc))

    return incidents


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Get a single incident by ID."""

    if not ObjectId.is_valid(incident_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid incident ID format.",
        )

    doc = await incidents_collection.find_one({"_id": ObjectId(incident_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return format_incident(doc)


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    request: IncidentUpdateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Update incident status and notes."""

    if not ObjectId.is_valid(incident_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid incident ID format.",
        )

    valid_statuses = ["new", "acknowledged", "resolved"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    update_data = {
        "status": request.status,
        "updated_at": datetime.now(timezone(timedelta(hours=5))),
    }
    if request.notes:
        update_data["notes"] = request.notes

    result = await incidents_collection.update_one(
        {"_id": ObjectId(incident_id)},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    updated_doc = await incidents_collection.find_one(
        {"_id": ObjectId(incident_id)}
    )
    return format_incident(updated_doc)


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """Delete an incident record."""

    if not ObjectId.is_valid(incident_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid incident ID format.",
        )

    result = await incidents_collection.delete_one(
        {"_id": ObjectId(incident_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    return {"message": "Incident deleted successfully.", "success": True}