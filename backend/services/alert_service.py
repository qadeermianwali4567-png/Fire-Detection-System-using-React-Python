import os
import time
import smtplib
import cv2
import requests
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "").replace(" ", "")
EMAIL_TO   = os.getenv("EMAIL_TO",   "")

WHATSAPP_INSTANCE = os.getenv("WHATSAPP_INSTANCE", "")
WHATSAPP_TOKEN    = os.getenv("WHATSAPP_TOKEN",    "")
WHATSAPP_TO       = os.getenv("WHATSAPP_TO",       "")

PST = timezone(timedelta(hours=5))


class AlertService:
    def __init__(self):
        self._email_enabled    = bool(EMAIL_USER and EMAIL_PASS and EMAIL_TO)
        self._whatsapp_enabled = bool(WHATSAPP_INSTANCE and WHATSAPP_TOKEN and WHATSAPP_TO)

        if self._email_enabled:
            print(f"Email alerts enabled — sending to: {EMAIL_TO}")
        else:
            print("Email alerts disabled — check .env settings")

        if self._whatsapp_enabled:
            print(f"WhatsApp alerts enabled — sending to: {WHATSAPP_TO}")
        else:
            print("WhatsApp alerts disabled — check .env settings")

    def is_enabled(self) -> bool:
        return self._email_enabled or self._whatsapp_enabled

    def send_fire_alert(
        self,
        frame,
        confidence:     float,
        location:       str,
        camera_name:    str,
        severity:       str,
        severity_label: str,
        fire_position:  str,
        fire_size:      float,
    ):
        now         = datetime.now(PST)
        detected_at = now.strftime("%d/%m/%Y %I:%M:%S %p PKT")

        if self._whatsapp_enabled:
            self._send_whatsapp(
                frame, confidence, location, camera_name,
                severity, severity_label, fire_position, fire_size, detected_at
            )

        if self._email_enabled:
            self._send_email(
                frame, confidence, location, camera_name,
                severity, severity_label, fire_position, fire_size, detected_at
            )

    # ── WhatsApp ─────────────────────────────────────────────
    def _send_whatsapp(self, frame, confidence, location, camera_name,
                       severity, severity_label, fire_position, fire_size, detected_at):
        try:
            base_url = f"https://api.green-api.com/waInstance{WHATSAPP_INSTANCE}"

            # ── Caption text ──
            caption = (
                f"🔥 *FIRE DETECTED!*\n\n"
                f"🚨 Severity: *{severity_label}*\n"
                f"📹 Camera: *{camera_name}*\n"
                f"📍 Location: {location}\n"
                f"🎯 Position: {fire_position}\n"
                f"📊 Confidence: *{confidence * 100:.1f}%*\n"
                f"📐 Fire Size: {fire_size}% of frame\n"
                f"🕐 Time: {detected_at}\n\n"
                f"⚠️ Please take immediate action!"
            )

            # ── Pehle text bhejo ──
            requests.post(
                f"{base_url}/sendMessage/{WHATSAPP_TOKEN}",
                json={"chatId": WHATSAPP_TO, "message": caption},
                timeout=10
            )
            print(f"WhatsApp text sent to: {WHATSAPP_TO}")

            # ── Frame disk pe save karo ──
            save_dir = "frontend/static/captured_frames"
            os.makedirs(save_dir, exist_ok=True)
            filename = f"wa_alert_{int(time.time())}.jpg"
            filepath = os.path.join(save_dir, filename)
            cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])

            # ── Multipart upload ──
            with open(filepath, 'rb') as f:
                response = requests.post(
                    f"{base_url}/sendFileByUpload/{WHATSAPP_TOKEN}",
                    data={"chatId": WHATSAPP_TO, "caption": "📸 Fire Captured Frame"},
                    files={"file": (filename, f, "image/jpeg")},
                    timeout=30
                )

            if response.status_code == 200:
                print(f"WhatsApp image sent to: {WHATSAPP_TO}")
            else:
                print(f"WhatsApp image failed: {response.status_code} — {response.text}")

            # ── Temp file delete karo ──
            try:
                os.remove(filepath)
            except:
                pass

        except Exception as e:
            print(f"WhatsApp alert failed: {e}")

    # ── Email ────────────────────────────────────────────────
    def _send_email(self, frame, confidence, location, camera_name,
                    severity, severity_label, fire_position, fire_size, detected_at):
        try:
            severity_colors = {
                "HIGH":   "#e53e3e",
                "MEDIUM": "#ed8936",
                "LOW":    "#ecc94b",
            }
            sev_color  = severity_colors.get(severity, "#e53e3e")
            recipients = [r.strip() for r in EMAIL_TO.split(",") if r.strip()]

            html = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; background:#0a0a0a; color:#fff; padding:0; margin:0;">
                <div style="max-width:600px; margin:0 auto; background:#111; border-radius:12px; overflow:hidden; border:1px solid #222;">
                    <div style="background:#e53e3e; padding:24px; text-align:center;">
                        <h1 style="margin:0; font-size:24px; color:#fff;">🔥 FIRE DETECTED!</h1>
                        <p style="margin:8px 0 0; color:#fbd38d; font-size:14px;">Immediate attention required</p>
                    </div>
                    <div style="padding:20px; text-align:center; border-bottom:1px solid #222;">
                        <span style="background:{sev_color}; color:#fff; padding:8px 24px; border-radius:20px; font-size:16px; font-weight:700;">{severity_label}</span>
                    </div>
                    <div style="padding:24px;">
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="padding:10px 0; color:#888; font-size:13px; width:140px;">📹 Camera</td>
                                <td style="padding:10px 0; color:#fff; font-size:13px; font-weight:600;">{camera_name}</td>
                            </tr>
                            <tr style="border-top:1px solid #222;">
                                <td style="padding:10px 0; color:#888; font-size:13px;">📍 Location</td>
                                <td style="padding:10px 0; color:#fff; font-size:13px;">{location}</td>
                            </tr>
                            <tr style="border-top:1px solid #222;">
                                <td style="padding:10px 0; color:#888; font-size:13px;">🎯 Position</td>
                                <td style="padding:10px 0; color:#fff; font-size:13px;">{fire_position}</td>
                            </tr>
                            <tr style="border-top:1px solid #222;">
                                <td style="padding:10px 0; color:#888; font-size:13px;">📊 Confidence</td>
                                <td style="padding:10px 0; color:#e53e3e; font-size:13px; font-weight:600;">{confidence * 100:.1f}%</td>
                            </tr>
                            <tr style="border-top:1px solid #222;">
                                <td style="padding:10px 0; color:#888; font-size:13px;">📐 Fire Size</td>
                                <td style="padding:10px 0; color:#fff; font-size:13px;">{fire_size}% of frame</td>
                            </tr>
                            <tr style="border-top:1px solid #222;">
                                <td style="padding:10px 0; color:#888; font-size:13px;">🕐 Detected At</td>
                                <td style="padding:10px 0; color:#fff; font-size:13px;">{detected_at}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="padding:0 24px 24px;">
                        <p style="color:#888; font-size:12px; margin-bottom:12px;">📸 Captured Frame:</p>
                        <img src="cid:fire_frame" style="width:100%; border-radius:8px; border:2px solid {sev_color};" alt="Fire Detection Frame" />
                    </div>
                    <div style="background:#0a0a0a; padding:16px; text-align:center; border-top:1px solid #222;">
                        <p style="color:#555; font-size:12px; margin:0;">Fire Detection System — Automated Alert</p>
                    </div>
                </div>
            </body>
            </html>
            """

            _, img_encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            img_bytes      = img_encoded.tobytes()

            for recipient in recipients:
                msg = MIMEMultipart('related')
                msg['Subject'] = f"🔥 [{severity}] Fire Detected — {camera_name} — {detected_at}"
                msg['From']    = EMAIL_USER
                msg['To']      = recipient

                msg_alt = MIMEMultipart('alternative')
                msg.attach(msg_alt)
                msg_alt.attach(MIMEText(html, 'html'))

                img_mime = MIMEImage(img_bytes, _subtype='jpeg')
                img_mime['Content-ID']          = '<fire_frame>'
                img_mime['Content-Disposition'] = 'inline; filename="fire_frame.jpg"'
                msg.attach(img_mime)

                with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                    smtp.login(EMAIL_USER, EMAIL_PASS)
                    smtp.sendmail(EMAIL_USER, recipient, msg.as_string())

                print(f"Email sent to: {recipient}")

        except Exception as e:
            print(f"Email alert failed: {e}")