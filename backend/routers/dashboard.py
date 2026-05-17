from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import asyncio
import cv2
import base64
import json
from datetime import datetime, timezone, timedelta

from backend.dependencies import get_current_admin
from backend.database import incidents_collection, cameras_collection
from backend.services.detector_service import DetectorService
from backend.services.alert_service import AlertService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# Global service instances
detector_service = DetectorService()
alert_service    = AlertService()

# Pakistan Standard Time
PST = timezone(timedelta(hours=5))


# ─── Helper ─────────────────────────────────────────────────

def encode_frame(frame) -> str:
    """Convert OpenCV frame to base64 string for browser."""
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buffer).decode('utf-8')


def get_camera_name(index: int) -> str:
    """Return camera name based on index."""
    names = {
        0: "Built-in Camera",
        1: "External Camera",
        2: "Camera 3",
        3: "Camera 4",
    }
    return names.get(index, f"Camera {index}")


# ─── Routes ─────────────────────────────────────────────────

@router.get("/status")
async def get_dashboard_status(
    current_admin: dict = Depends(get_current_admin),
):
    """Get system status — cameras, model, detection."""

    cameras = []
    async for cam in cameras_collection.find({"is_active": True}):
        cameras.append({
            "id":        str(cam["_id"]),
            "name":      cam["name"],
            "location":  cam["location"],
            "is_active": cam["is_active"],
        })

    today_start = datetime.now(PST).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_count = await incidents_collection.count_documents({
        "detected_at": {"$gte": today_start}
    })
    total_count = await incidents_collection.count_documents({})

    return {
        "cameras":          cameras,
        "total_cameras":    len(cameras),
        "today_incidents":  today_count,
        "total_incidents":  total_count,
        "model_loaded":     detector_service.is_loaded(),
        "detection_active": detector_service.is_running(),
        "success":          True,
    }


@router.get("/available-cameras")
async def get_available_cameras(
    current_admin: dict = Depends(get_current_admin),
):
    """Return list of available cameras on system."""
    available = []
    for i in range(2):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            available.append({
                "index": i,
                "name":  get_camera_name(i),
            })
            cap.release()

    return {"cameras": available, "success": True}


@router.websocket("/ws/stream/{camera_index}")
async def websocket_stream(websocket: WebSocket, camera_index: int = 0):
    """
    WebSocket endpoint for live camera feed.
    camera_index: 0 = built-in, 1 = external, etc.
    """
    await websocket.accept()
    print(f"WebSocket connected — Camera {camera_index}")

    cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        await websocket.send_text(json.dumps({
            "type":    "error",
            "message": f"Camera {camera_index} not available."
        }))
        await websocket.close()
        return

    camera_name = get_camera_name(camera_index)

    # Cooldown to avoid sending duplicate alerts
    cooldown_frames   = 30
    frames_since_fire = cooldown_frames

    # Email cooldown — send email every 5 minutes max per camera
    email_cooldown_seconds = 300
    last_email_time        = None

    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

            # Run detection
            annotated_frame, fire_detected, confidence, location_info = \
                detector_service.detect(frame)

            # Save incident + send email if fire detected and cooldown passed
            if fire_detected and location_info and frames_since_fire >= cooldown_frames:
                frames_since_fire = 0

                # Save frame to disk
                timestamp      = datetime.now(PST).strftime('%Y%m%d_%H%M%S')
                frame_filename = f"fire_cam{camera_index}_{timestamp}.jpg"
                frame_path     = f"frontend/static/captured_frames/{frame_filename}"
                cv2.imwrite(frame_path, frame)

                # Save incident to MongoDB
                await incidents_collection.insert_one({
                    "camera_id":        f"webcam_{camera_index}",
                    "camera_name":      camera_name,
                    "location":         f"Camera {camera_index} Location",
                    "fire_position":    location_info["position"],
                    "fire_size_pct":    location_info["size_percent"],
                    "severity":         location_info["severity"],
                    "severity_label":   location_info["severity_label"],
                    "bounding_box": {
                        "x1": location_info["box_x1"],
                        "y1": location_info["box_y1"],
                        "x2": location_info["box_x2"],
                        "y2": location_info["box_y2"],
                    },
                    "frame_width":      location_info["frame_width"],
                    "frame_height":     location_info["frame_height"],
                    "confidence_score": confidence,
                    "frame_path":       frame_path,
                    "detected_at":      datetime.now(PST),
                    "status":           "new",
                })

                print(f"[{camera_name}] Fire saved — "
                      f"Severity: {location_info['severity']} | "
                      f"Position: {location_info['position']} | "
                      f"Confidence: {confidence:.2f}")

                # Send email alert — max once every 5 minutes per camera
                now = datetime.now(PST)
                if (last_email_time is None or
                        (now - last_email_time).total_seconds() >= email_cooldown_seconds):

                    last_email_time = now

                    # Run email in background so it doesn't block video stream
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(
                        None,
                        lambda: alert_service.send_fire_alert(
                            frame         = frame,
                            confidence    = confidence,
                            location      = f"Camera {camera_index} Location",
                            camera_name   = camera_name,
                            severity      = location_info["severity"],
                            severity_label= location_info["severity_label"],
                            fire_position = location_info["position"],
                            fire_size     = location_info["size_percent"],
                        )
                    )

            if fire_detected:
                frames_since_fire = 0
            else:
                frames_since_fire = min(frames_since_fire + 1, cooldown_frames)

            # Encode and send frame to browser
            encoded = encode_frame(annotated_frame)

            message = {
                "type":          "frame",
                "image":         encoded,
                "fire_detected": fire_detected,
                "confidence":    round(confidence, 2),
                "camera_index":  camera_index,
                "camera_name":   camera_name,
                "timestamp":     datetime.now(PST).strftime("%H:%M:%S"),
            }

            if fire_detected and location_info:
                message["fire_position"]  = location_info["position"]
                message["fire_size"]      = location_info["size_percent"]
                message["severity"]       = location_info["severity"]
                message["severity_label"] = location_info["severity_label"]
                message["severity_color"] = location_info["severity_color"]
                message["severity_emoji"] = location_info["severity_emoji"]

            await websocket.send_text(json.dumps(message))
            await asyncio.sleep(0.03)  # ~30 FPS

    except WebSocketDisconnect:
        print(f"WebSocket disconnected — Camera {camera_index}")
    finally:
        cap.release()
        print(f"Camera {camera_index} released.")