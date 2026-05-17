from fastapi import APIRouter, HTTPException, status, Depends
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

from backend.database import admins_collection, audit_logs_collection
from backend.schemas import LoginRequest, TokenResponse, AdminCreateRequest, AdminResponse
from backend.dependencies import create_access_token, get_current_admin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Password Utilities ─────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against its hash."""
    return pwd_context.verify(plain, hashed)


# ─── Routes ─────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Admin login — returns JWT token on success."""

    # Find admin in database
    admin = await admins_collection.find_one({"username": request.username})

    if not admin or not verify_password(request.password, admin["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact administrator.",
        )

    # Generate JWT token
    token = create_access_token(data={"sub": admin["username"]})

    # Save audit log
    await audit_logs_collection.insert_one({
        "admin_id":       str(admin["_id"]),
        "admin_username": admin["username"],
        "action":         "LOGIN",
        "details":        "Admin logged in successfully.",
        "timestamp":      datetime.now(timezone(timedelta(hours=5))),
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        username=admin["username"],
    )


@router.post("/logout")
async def logout(current_admin: dict = Depends(get_current_admin)):
    """Admin logout — saves audit log."""

    await audit_logs_collection.insert_one({
        "admin_id":       str(current_admin["_id"]),
        "admin_username": current_admin["username"],
        "action":         "LOGOUT",
        "details":        "Admin logged out.",
        "timestamp":      datetime.now(timezone(timedelta(hours=5))),
    })

    return {"message": "Logged out successfully.", "success": True}


@router.post("/register", response_model=AdminResponse)
async def register_admin(request: AdminCreateRequest):
    """
    Register a new admin account.
    Only use this once to create the first admin.
    """

    # Check if username already exists
    existing = await admins_collection.find_one({"username": request.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists.",
        )

    # Check if email already exists
    existing_email = await admins_collection.find_one({"email": request.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Create admin document
    admin_doc = {
        "username":        request.username,
        "email":           request.email,
        "hashed_password": hash_password(request.password),
        "is_active":       True,
        "created_at":      datetime.now(timezone(timedelta(hours=5))),
    }

    result = await admins_collection.insert_one(admin_doc)

    return AdminResponse(
        id=str(result.inserted_id),
        username=request.username,
        email=request.email,
        is_active=True,
        created_at=admin_doc["created_at"],
    )


@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(current_admin: dict = Depends(get_current_admin)):
    """Get currently logged in admin information."""

    return AdminResponse(
        id=str(current_admin["_id"]),
        username=current_admin["username"],
        email=current_admin["email"],
        is_active=current_admin.get("is_active", True),
        created_at=current_admin["created_at"],
    )