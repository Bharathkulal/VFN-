import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.core.database import (
    connect_to_mongo,
    close_mongo_connection,
    get_admins_collection,
)
from backend.app.core.security import hash_password
from backend.app.routers.auth import router as auth_router, limiter
from backend.app.routers.players import router as players_router
from backend.app.routers.dashboard import router as dashboard_router
from backend.app.routers.tournament import router as tournament_router
from backend.app.routers.backup import router as backup_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vfn.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    logger.info("Initializing VFN Tournament backend application...")

    # Ensure uploads directories exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "players"), exist_ok=True)

    # Connect to MongoDB and create indexes
    await connect_to_mongo()

    # Bootstrap default admin if no admin accounts exist
    try:
        admins_col = get_admins_collection()
        admin_count = await admins_col.count_documents({})
        if admin_count == 0 and settings.ADMIN_EMAIL:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            hashed = hash_password(settings.ADMIN_PASSWORD or "admin")
            await admins_col.insert_one({
                "username": "admin",
                "email": settings.ADMIN_EMAIL.strip().lower(),
                "hashed_password": hashed,
                "full_name": settings.ADMIN_FULL_NAME,
                "is_active": True,
                "created_at": now,
                "last_login": None,
            })
            logger.info(f"Auto-bootstrapped initial admin: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.warning(f"Could not check or bootstrap default admin: {e}")

    logger.info("VFN backend started successfully.")
    yield

    # Teardown
    await close_mongo_connection()
    logger.info("VFN backend shutdown complete.")


# Create FastAPI application
app = FastAPI(
    title="VFN Tournament API",
    version=settings.VERSION,
    description="Backend API for Volleyball Friends Nalthur Trophy 2026 player registration and administration.",
    lifespan=lifespan,
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = settings.cors_origin_list
if not origins:
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve local uploads for development fallback photo storage
uploads_path = settings.UPLOAD_DIR
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Mount API V1 routers
api_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=api_prefix)
app.include_router(players_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(tournament_router, prefix=api_prefix)
app.include_router(backup_router, prefix=api_prefix)


@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint indicating API operational status."""
    return {
        "status": "healthy",
        "service": "VFN Tournament API",
        "tournament": "Volleyball Friends Nalthur Trophy 2026",
        "version": settings.VERSION,
        "database": "MongoDB Connected",
        "cloudinary": "Configured" if settings.is_cloudinary_configured else "Local Fallback Mode",
    }
