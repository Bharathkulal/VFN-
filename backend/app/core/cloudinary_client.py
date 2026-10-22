import os
import uuid
import logging
from typing import Dict, Tuple
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from backend.app.core.config import settings

logger = logging.getLogger("sportbid.storage")

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# Initialize Cloudinary if credentials are provided
if settings.is_cloudinary_configured:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary client configured successfully.")
else:
    logger.warning(
        "Cloudinary credentials not provided in environment. "
        f"Falling back to local static storage in '{settings.UPLOAD_DIR}' for development."
    )
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "players"), exist_ok=True)


def validate_photo_file(file_bytes: bytes, content_type: str):
    """Validates file type and size against tournament registration rules."""
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player photo file is empty.",
        )

    if len(file_bytes) > MAX_PHOTO_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Photo size ({size_mb:.2f} MB) exceeds maximum allowed limit of 5 MB.",
        )

    if content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Permitted formats: JPEG, PNG, WebP.",
        )


async def upload_player_photo(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> Tuple[str, str]:
    """
    Uploads player photo to Cloudinary (or local storage fallback).
    Returns (photo_url, photo_public_id).
    """
    validate_photo_file(file_bytes, content_type)

    unique_id = uuid.uuid4().hex[:12]
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        ext = "jpg"

    if settings.is_cloudinary_configured:
        try:
            logger.info("Uploading player photo to Cloudinary...")
            result = cloudinary.uploader.upload(
                file_bytes,
                folder=settings.CLOUDINARY_FOLDER,
                public_id=f"player_{unique_id}",
                resource_type="image",
                overwrite=True,
            )
            photo_url = result.get("secure_url") or result.get("url")
            public_id = result.get("public_id")
            logger.info(f"Photo uploaded to Cloudinary: {public_id}")
            return photo_url, public_id
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to upload player photo to Cloudinary storage. Please try again.",
            )
    else:
        # Local development storage fallback
        dest_dir = os.path.join(settings.UPLOAD_DIR, "players")
        os.makedirs(dest_dir, exist_ok=True)
        local_filename = f"player_{unique_id}.{ext}"
        local_filepath = os.path.join(dest_dir, local_filename)

        with open(local_filepath, "wb") as f:
            f.write(file_bytes)

        photo_url = f"/uploads/players/{local_filename}"
        public_id = f"local_player_{unique_id}"
        logger.info(f"Saved photo locally for dev: {photo_url}")
        return photo_url, public_id


async def delete_player_photo(photo_public_id: str) -> bool:
    """Deletes player photo from Cloudinary or local storage."""
    if not photo_public_id:
        return False

    if settings.is_cloudinary_configured and not photo_public_id.startswith("local_"):
        try:
            result = cloudinary.uploader.destroy(photo_public_id, resource_type="image")
            logger.info(f"Destroyed Cloudinary photo {photo_public_id}: {result}")
            return True
        except Exception as e:
            logger.warning(f"Could not delete photo {photo_public_id} from Cloudinary: {e}")
            return False
    else:
        # Check local storage
        try:
            dest_dir = os.path.join(settings.UPLOAD_DIR, "players")
            for fname in os.listdir(dest_dir):
                if photo_public_id in fname or fname.startswith(photo_public_id):
                    os.remove(os.path.join(dest_dir, fname))
                    return True
        except Exception as e:
            logger.warning(f"Could not delete local photo {photo_public_id}: {e}")
        return False


async def upload_player_poster(
    poster_source: str,  # filepath or URL
    serial_number: int,
    player_name: str,
) -> Tuple[str, str]:
    """
    Uploads tournament auction poster to Cloudinary (or preserves local fallback).
    Returns (poster_url, poster_public_id).
    """
    clean_name = "".join([c if c.isalnum() else "_" for c in player_name]).strip("_")[:20]
    public_id = f"poster_{serial_number:02d}_{clean_name}"
    local_rel = f"/uploads/posters/{os.path.basename(poster_source)}" if isinstance(poster_source, str) and os.path.isfile(poster_source) else ""

    if settings.is_cloudinary_configured:
        try:
            logger.info(f"Uploading auction poster for #{serial_number:02d} ({player_name}) to Cloudinary...")
            result = cloudinary.uploader.upload(
                poster_source,
                folder=settings.CLOUDINARY_POSTERS_FOLDER,
                public_id=public_id,
                resource_type="image",
                overwrite=True,
            )
            secure_url = result.get("secure_url") or result.get("url")
            c_public_id = result.get("public_id")
            logger.info(f"Auction poster successfully saved in Cloudinary: {c_public_id} -> {secure_url}")
            return secure_url, c_public_id
        except Exception as e:
            logger.error(f"Failed to upload poster to Cloudinary: {e}", exc_info=True)
            if local_rel:
                return local_rel, f"local_{public_id}"
            raise

    return local_rel or f"/uploads/posters/{public_id}.png", f"local_{public_id}"


async def delete_player_poster(poster_public_id: str) -> bool:
    """
    Deletes a player poster from Cloudinary or local storage.
    """
    if not poster_public_id:
        return False

    if settings.is_cloudinary_configured and not poster_public_id.startswith("local_"):
        try:
            result = cloudinary.uploader.destroy(poster_public_id, resource_type="image")
            logger.info(f"Destroyed Cloudinary poster {poster_public_id}: {result}")
            return True
        except Exception as e:
            logger.warning(f"Could not delete poster {poster_public_id} from Cloudinary: {e}")
            return False
    else:
        try:
            dest_dir = os.path.join(settings.UPLOAD_DIR, "posters")
            for fname in os.listdir(dest_dir):
                if poster_public_id in fname or fname.startswith(poster_public_id):
                    os.remove(os.path.join(dest_dir, fname))
                    return True
        except Exception as e:
            logger.warning(f"Could not delete local poster {poster_public_id}: {e}")
        return False

