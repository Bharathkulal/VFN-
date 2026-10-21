from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.core.config import settings
from backend.app.core.database import get_admins_collection
from backend.app.core.security import (
    verify_password,
    create_access_token,
    get_current_admin,
)
from backend.app.models.admin import (
    AdminLoginRequest,
    AdminUserResponse,
    TokenResponse,
)

logger = logging.getLogger("sportbid.auth")
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    login_data: AdminLoginRequest,
):
    """
    Authenticate admin credentials and issue a signed JWT token.
    Rate-limited to 5 attempts per minute per IP address.
    """
    admins_col = get_admins_collection()
    email_clean = login_data.email.strip().lower()

    admin = await admins_col.find_one({"email": email_clean})
    if not admin:
        logger.warning(f"Failed login attempt for nonexistent admin: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(login_data.password, admin["hashed_password"]):
        logger.warning(f"Failed password attempt for admin: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not admin.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled.",
        )

    # Update last login timestamp
    now = datetime.now(timezone.utc)
    await admins_col.update_one(
        {"_id": admin["_id"]},
        {"$set": {"last_login": now}},
    )

    # Generate JWT
    token_payload = {
        "sub": admin["email"],
        "id": str(admin["_id"]),
        "name": admin.get("full_name", "Admin"),
    }
    access_token = create_access_token(token_payload)

    # Set secure HTTP-only cookie for browser sessions
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,  # Set to True when HTTPS is enabled in production
        path="/",
    )

    admin_resp = AdminUserResponse(
        id=str(admin["_id"]),
        email=admin["email"],
        full_name=admin.get("full_name", "Tournament Admin"),
        is_active=admin.get("is_active", True),
        created_at=admin.get("created_at"),
        last_login=now,
    )

    logger.info(f"Successful admin login for {email_clean}")
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        admin=admin_resp,
    )


@router.post("/logout")
async def logout(response: Response):
    """Logs out the admin by clearing session cookies."""
    response.delete_cookie(key="access_token", path="/")
    return {"success": True, "message": "Logged out successfully."}


@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_info(
    admin: dict = Depends(get_current_admin),
):
    """Returns profile information for the authenticated admin."""
    return AdminUserResponse(
        id=str(admin["_id"]),
        email=admin["email"],
        full_name=admin.get("full_name", "Tournament Admin"),
        is_active=admin.get("is_active", True),
        created_at=admin.get("created_at"),
        last_login=admin.get("last_login"),
    )
