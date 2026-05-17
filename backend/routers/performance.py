from fastapi import APIRouter, Depends, Query, HTTPException, status
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId

from backend.database import performance_collection
from backend.schemas import (
    PerformanceCreateRequest,
    PerformanceResponse,
)
from backend.dependencies import get_current_admin

router = APIRouter(prefix="/api/performance", tags=["Performance"])

PST = timezone(timedelta(hours=5))

# ─── Helper ─────────────────────────────────────────────────

def format_performance(doc: dict) -> dict:
    """Convert MongoDB document to response dict."""
    return {
        "id": str(doc["_id"]),
        "precision": doc["precision"],
        "recall": doc["recall"],
        "map50": doc["map50"],
        "map50_95": doc["map50_95"],
        "fps": doc["fps"],
        "model_version": doc.get("model_version", "fire_model"),
        "recorded_at": doc["recorded_at"].astimezone(PST).strftime("%Y-%m-%d %H:%M:%S"),
    }


# ─── Routes ─────────────────────────────────────────────────

@router.get("/latest", response_model=PerformanceResponse)
async def get_latest_performance(
    current_admin: dict = Depends(get_current_admin),
):
    """Get the most recent model performance metrics."""
    try:
        doc = await performance_collection.find_one(
            {}, sort=[("recorded_at", -1)]
        )

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No performance records found.",
            )

        return format_performance(doc)
    except Exception as e:
        print(f"Error in get_latest_performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching performance data: {str(e)}"
        )


@router.get("/history", response_model=List[PerformanceResponse])
async def get_performance_history(
    limit: int = Query(10, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
):
    """Get performance history for trend graphs."""
    try:
        cursor = performance_collection.find({})\
            .sort("recorded_at", -1)\
            .limit(limit)

        records = []
        async for doc in cursor:
            records.append(format_performance(doc))

        # Return in ascending order for charts
        records.reverse()
        return records
    except Exception as e:
        print(f"Error in get_performance_history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching history: {str(e)}"
        )


@router.post("/record", response_model=PerformanceResponse)
async def record_performance(
    request: PerformanceCreateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Save new model performance metrics."""
    try:
        doc = {
            "precision": request.precision,
            "recall": request.recall,
            "map50": request.map50,
            "map50_95": request.map50_95,
            "fps": request.fps,
            "model_version": request.model_version,
            "recorded_at": datetime.now(PST),
        }

        result = await performance_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

        print(f"Performance record saved: {doc['_id']}")  # Debug log
        
        return format_performance(doc)
    except Exception as e:
        print(f"Error in record_performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving performance data: {str(e)}"
        )


@router.get("/summary")
async def get_performance_summary(
    current_admin: dict = Depends(get_current_admin),
):
    """Get performance summary with latest metrics."""
    try:
        # Latest record
        latest = await performance_collection.find_one(
            {}, sort=[("recorded_at", -1)]
        )

        if not latest:
            return {
                "message": "No performance data available.",
                "success": False,
                "latest": None,
                "total_records": 0
            }

        # Total records count
        total_records = await performance_collection.count_documents({})

        response_data = {
            "latest": {
                "precision": latest["precision"],
                "recall": latest["recall"],
                "map50": latest["map50"],
                "map50_95": latest["map50_95"],
                "fps": latest["fps"],
                "model_version": latest.get("model_version", "fire_model"),
                "recorded_at": latest["recorded_at"].strftime("%d/%m/%Y, %I:%M:%S %p"),
            },
            "total_records": total_records,
            "success": True
        }
        
        print(f"Performance summary response: {response_data}")  # Debug log
        return response_data
        
    except Exception as e:
        print(f"Error in get_performance_summary: {e}")
        return {
            "message": f"Error fetching performance data: {str(e)}",
            "success": False,
            "latest": None,
            "total_records": 0
        }