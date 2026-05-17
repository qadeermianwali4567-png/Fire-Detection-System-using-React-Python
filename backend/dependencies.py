from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta, timedelta
from typing import Optional
import os

from backend.database import admins_collection

load_dotenv()

JWT_SECRET       = os.getenv("JWT_SECRET", "secret")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", 8))
ALGORITHM        = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Token Generation ───────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Generate a JWT access token."""
    to_encode = data.copy()

    expire = datetime.now(timezone(timedelta(hours=5))) + (
        expires_delta if expires_delta
        else timedelta(hours=JWT_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


# ─── Token Verification ─────────────────────────────────────

def verify_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Current User Dependency ────────────────────────────────

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """
    Dependency — extracts and validates the current logged-in admin.
    Use this in any route that requires authentication.
    """
    payload = verify_token(token)

    username: str = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain user information.",
        )

    # Verify admin still exists in database
    admin = await admins_collection.find_one({"username": username})
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account not found.",
        )

    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled.",
        )

    return admin