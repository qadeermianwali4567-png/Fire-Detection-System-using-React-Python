from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fire_detection_db")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Collections
admins_collection     = db["admins"]
incidents_collection  = db["incidents"]
cameras_collection    = db["cameras"]
performance_collection = db["model_performance"]
audit_logs_collection = db["audit_logs"]


async def connect_db():
    """Test database connection on startup."""
    try:
        await client.admin.command("ping")
        print("MongoDB connected successfully.")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        raise


async def close_db():
    """Close database connection on shutdown."""
    client.close()
    print("MongoDB connection closed.")