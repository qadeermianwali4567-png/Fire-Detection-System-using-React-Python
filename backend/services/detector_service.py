import cv2
import os
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

MODEL_PATH   = os.getenv("MODEL_PATH", "models/fire_model/weights/best.pt")
DEFAULT_CONF = float(os.getenv("DEFAULT_CONF", 0.7))


class DetectorService:
    def __init__(self):
        """Initialize the YOLO fire detection service."""
        self._model   = None
        self._running = False
        self._load_model()

    def _load_model(self):
        """Load YOLO model from disk."""
        if not os.path.exists(MODEL_PATH):
            print(f"Warning: Model not found at {MODEL_PATH}")
            return

        try:
            self._model = YOLO(MODEL_PATH)
            print(f"Detection model loaded: {MODEL_PATH}")
        except Exception as e:
            print(f"Failed to load model: {e}")
            self._model = None

    def is_loaded(self) -> bool:
        """Check if model is loaded successfully."""
        return self._model is not None

    def is_running(self) -> bool:
        """Check if detection is currently active."""
        return self._running

    def _get_position(self, cx, cy, frame_w, frame_h) -> str:
        """
        Determine fire position in frame.
        Divides frame into 9 zones:
        Top-Left | Top-Center | Top-Right
        Middle-Left | Center | Middle-Right
        Bottom-Left | Bottom-Center | Bottom-Right
        """
        col = "Left"   if cx < frame_w / 3 else \
              "Right"  if cx > frame_w * 2 / 3 else "Center"

        row = "Top"    if cy < frame_h / 3 else \
              "Bottom" if cy > frame_h * 2 / 3 else "Middle"

        if row == "Middle" and col == "Center":
            return "Center"

        return f"{row}-{col}"

    def _get_severity(self, confidence: float, size_pct: float) -> dict:
        """
        Determine fire severity level based on confidence and size.

        Levels:
            HIGH   — confidence >= 0.90 OR size > 15%
            MEDIUM — confidence >= 0.80 OR size > 5%
            LOW    — everything else
        """
        if confidence >= 0.90 or size_pct > 15:
            return {
                "level":  "HIGH",
                "label":  "🔴 HIGH",
                "color":  "#e53e3e",
                "emoji":  "🔴",
            }
        elif confidence >= 0.80 or size_pct > 5:
            return {
                "level":  "MEDIUM",
                "label":  "🟠 MEDIUM",
                "color":  "#ed8936",
                "emoji":  "🟠",
            }
        else:
            return {
                "level":  "LOW",
                "label":  "🟡 LOW",
                "color":  "#ecc94b",
                "emoji":  "🟡",
            }

    def detect(self, frame, conf: float = DEFAULT_CONF):
        """
        Run fire detection on a single frame.

        Args:
            frame: OpenCV image frame
            conf:  Confidence threshold

        Returns:
            (annotated_frame, fire_detected, confidence_score, location_info)
        """
        if not self.is_loaded():
            return frame, False, 0.0, None

        self._running = True

        try:
            results = self._model(frame, conf=conf, verbose=False)

            fire_detected = any(len(r.boxes) > 0 for r in results)

            confidence    = 0.0
            location_info = None

            if fire_detected:
                for r in results:
                    if len(r.boxes) > 0:
                        confidence = float(r.boxes.conf.max())

                        # Get frame dimensions
                        frame_h, frame_w = frame.shape[:2]

                        # Get bounding box of highest confidence detection
                        best_box_idx = r.boxes.conf.argmax()
                        box          = r.boxes.xyxy[best_box_idx]
                        x1, y1, x2, y2 = map(int, box.tolist())

                        # Fire center point
                        cx = (x1 + x2) // 2
                        cy = (y1 + y2) // 2

                        # Fire size relative to frame
                        box_area   = (x2 - x1) * (y2 - y1)
                        frame_area = frame_w * frame_h
                        size_pct   = (box_area / frame_area) * 100

                        # Determine position in frame
                        position = self._get_position(cx, cy, frame_w, frame_h)

                        # Determine severity level
                        severity = self._get_severity(confidence, size_pct)

                        location_info = {
                            "position":       position,
                            "center_x":       cx,
                            "center_y":       cy,
                            "box_x1":         x1,
                            "box_y1":         y1,
                            "box_x2":         x2,
                            "box_y2":         y2,
                            "size_percent":   round(size_pct, 1),
                            "frame_width":    frame_w,
                            "frame_height":   frame_h,
                            "severity":       severity["level"],
                            "severity_label": severity["label"],
                            "severity_color": severity["color"],
                            "severity_emoji": severity["emoji"],
                        }
                        break

            annotated_frame = results[0].plot()
            return annotated_frame, fire_detected, confidence, location_info

        except Exception as e:
            print(f"Detection error: {e}")
            return frame, False, 0.0, None

        finally:
            self._running = False