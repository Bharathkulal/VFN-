import os
import math
import re
from datetime import datetime, timezone
import logging
from typing import Optional
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
import httpx
from backend.app.core.database import get_players_collection
from backend.app.core.security import get_current_admin
from backend.app.core.config import settings
from backend.app.core.cloudinary_client import (
    upload_player_photo,
    delete_player_photo,
    upload_player_poster,
    delete_player_poster,
    is_cloudinary_url,
)
from backend.app.services.counter_service import (
    get_next_serial_number,
    decrement_serial_number_on_failure,
    format_serial_number,
)
from backend.app.services.poster_generator import generate_player_poster
from backend.app.models.player import (
    PlayerBase,
    PlayerResponse,
    PlayerListResponse,
    PlayerUpdate,
    PlayingRoleEnum,
)

logger = logging.getLogger("vfn.players")
router = APIRouter(prefix="/players", tags=["Players"])


def serialize_player(doc: dict) -> PlayerResponse:
    """Helper to convert MongoDB player document to PlayerResponse schema."""
    serial = doc["serial_number"]
    return PlayerResponse(
        id=str(doc["_id"]),
        serial_number=serial,
        formatted_serial=format_serial_number(serial),
        player_name=doc["player_name"],
        village=doc["village"],
        playing_role=doc["playing_role"],
        phone_number=doc["phone_number"],
        photo_url=doc["photo_url"],
        photo_public_id=doc.get("photo_public_id"),
        poster_status=doc.get("poster_status", "pending"),
        poster_url=doc.get("poster_url"),
        poster_public_id=doc.get("poster_public_id"),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at", doc["created_at"]),
    )


@router.post("/register", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def register_player(
    player_name: str = Form(..., description="Full player name"),
    village: str = Form(..., description="Village or local club"),
    playing_role: PlayingRoleEnum = Form(..., description="Volleyball court position"),
    phone_number: str = Form(..., description="10-digit Indian mobile number"),
    photo: UploadFile = File(..., description="Player portrait image"),
):
    """
    Public endpoint to register a player for the tournament.
    1. Validates inputs and photo format/size.
    2. Uploads photo to Cloudinary.
    3. Allocates unique sequential serial number atomically.
    4. Saves record in MongoDB.
    """
    # Validate fields
    try:
        validated_data = PlayerBase(
            player_name=player_name,
            village=village,
            playing_role=playing_role,
            phone_number=phone_number,
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(err),
        )

    # Read photo file
    try:
        photo_bytes = await photo.read()
    except Exception as e:
        logger.error(f"Error reading uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded photo file.",
        )

    # Upload to Cloudinary (or local fallback in dev)
    photo_url, photo_public_id = await upload_player_photo(
        file_bytes=photo_bytes,
        filename=photo.filename or "player.jpg",
        content_type=photo.content_type or "image/jpeg",
    )

    # Atomically allocate sequential serial number
    try:
        serial_number = await get_next_serial_number()
    except Exception as e:
        logger.error(f"Error allocating serial number: {e}")
        # Clean up uploaded photo if serial allocation fails
        await delete_player_photo(photo_public_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate player serial number. Please try again.",
        )

    # Persist in MongoDB
    players_col = get_players_collection()
    now = datetime.now(timezone.utc)
    player_doc = {
        "serial_number": serial_number,
        "player_name": validated_data.player_name,
        "village": validated_data.village,
        "playing_role": validated_data.playing_role.value,
        "phone_number": validated_data.phone_number,
        "photo_url": photo_url,
        "photo_public_id": photo_public_id,
        "poster_status": "pending",
        "poster_url": None,
        "created_at": now,
        "updated_at": now,
    }

    try:
        insert_res = await players_col.insert_one(player_doc)
        player_doc["_id"] = insert_res.inserted_id
        logger.info(
            f"Successfully registered player '{validated_data.player_name}' with serial #{serial_number}"
        )
    except Exception as e:
        logger.error(f"Database insertion failed: {e}", exc_info=True)
        # Rollback actions
        await delete_player_photo(photo_public_id)
        await decrement_serial_number_on_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete player registration record.",
        )

    # Automatically generate official auction poster and save to Cloudinary + MongoDB
    try:
        rel_url, filepath = generate_player_poster(player_doc)
        c_poster_url, c_poster_id = await upload_player_poster(
            filepath,
            serial_number,
            player_name,
        )
        await players_col.update_one(
            {"_id": player_doc["_id"]},
            {
                "$set": {
                    "poster_status": "generated",
                    "poster_url": c_poster_url,
                    "poster_public_id": c_poster_id,
                    "local_poster_path": rel_url,
                }
            },
        )
        player_doc["poster_status"] = "generated"
        player_doc["poster_url"] = c_poster_url
        player_doc["poster_public_id"] = c_poster_id
        logger.info(f"Generated official poster for player #{serial_number} and saved to Cloudinary & MongoDB: {c_poster_url}")
    except Exception as pe:
        logger.error(f"Could not auto-generate poster on registration: {pe}", exc_info=True)
        await players_col.update_one(
            {"_id": player_doc["_id"]},
            {
                "$set": {
                    "poster_status": "failed",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        player_doc["poster_status"] = "failed"

    return serialize_player(player_doc)


@router.get("", response_model=PlayerListResponse)
async def list_players(
    q: Optional[str] = Query(None, description="Search by player name or serial number"),
    village: Optional[str] = Query(None, description="Filter by village"),
    role: Optional[str] = Query(None, description="Filter by playing role"),
    poster_status: Optional[str] = Query(None, description="Filter by poster status"),
    sort_by: str = Query("serial_number", description="Field to sort by (serial_number, created_at, player_name)"),
    sort_order: str = Query("asc", description="Sort order: 'asc' or 'desc'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    admin: dict = Depends(get_current_admin),
):
    """
    Admin-only endpoint to list, search, filter, and paginate registered players.
    """
    players_col = get_players_collection()
    filter_query = {}

    if village and village.strip():
        filter_query["village"] = {"$regex": f"^{re.escape(village.strip())}$", "$options": "i"}

    if role and role.strip():
        filter_query["playing_role"] = role.strip()

    if poster_status and poster_status.strip():
        filter_query["poster_status"] = poster_status.strip().lower()

    if q and q.strip():
        search_term = q.strip()
        or_clauses = [
            {"player_name": {"$regex": re.escape(search_term), "$options": "i"}},
            {"village": {"$regex": re.escape(search_term), "$options": "i"}},
            {"phone_number": {"$regex": re.escape(search_term)}},
        ]
        # Check if search term is an integer for serial_number match
        if search_term.isdigit():
            or_clauses.append({"serial_number": int(search_term)})

        if filter_query:
            filter_query = {"$and": [filter_query, {"$or": or_clauses}]}
        else:
            filter_query = {"$or": or_clauses}

    total = await players_col.count_documents(filter_query)
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1

    # Sorting
    direction = 1 if sort_order.lower() == "asc" else -1
    sort_field = sort_by if sort_by in ["serial_number", "created_at", "player_name", "village"] else "serial_number"

    cursor = (
        players_col.find(filter_query)
        .sort(sort_field, direction)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    docs = await cursor.to_list(length=page_size)
    players = [serialize_player(d) for d in docs]

    return PlayerListResponse(
        players=players,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{player_id}", response_model=PlayerResponse)
async def get_player_by_id(
    player_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Admin-only endpoint to retrieve a player by ID."""
    try:
        obj_id = ObjectId(player_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player ID.")

    players_col = get_players_collection()
    doc = await players_col.find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    return serialize_player(doc)


@router.patch("/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: str,
    update_data: PlayerUpdate,
    admin: dict = Depends(get_current_admin),
):
    """
    Admin-only endpoint to update player details.
    Keeps the serial_number strictly unchanged.
    """
    try:
        obj_id = ObjectId(player_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player ID.")

    players_col = get_players_collection()
    existing = await players_col.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    update_dict = {}
    if update_data.player_name is not None:
        update_dict["player_name"] = update_data.player_name
    if update_data.village is not None:
        update_dict["village"] = update_data.village
    if update_data.playing_role is not None:
        update_dict["playing_role"] = update_data.playing_role.value
    if update_data.phone_number is not None:
        update_dict["phone_number"] = update_data.phone_number
    if update_data.poster_status is not None:
        update_dict["poster_status"] = update_data.poster_status.value
    if update_data.poster_url is not None:
        update_dict["poster_url"] = update_data.poster_url

    if not update_dict:
        return serialize_player(existing)

    update_dict["updated_at"] = datetime.now(timezone.utc)

    await players_col.update_one({"_id": obj_id}, {"$set": update_dict})
    updated_doc = await players_col.find_one({"_id": obj_id})
    logger.info(f"Admin {admin.get('email')} updated player {player_id}")

    return serialize_player(updated_doc)


@router.delete("/{player_id}")
async def delete_player(
    player_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Admin-only endpoint to permanently delete a player.
    Also removes the player's photo from storage.
    """
    try:
        obj_id = ObjectId(player_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player ID.")

    players_col = get_players_collection()
    doc = await players_col.find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    # Delete photo from Cloudinary / local storage
    photo_public_id = doc.get("photo_public_id")
    if photo_public_id:
        await delete_player_photo(photo_public_id)

    # Delete document
    await players_col.delete_one({"_id": obj_id})
    logger.info(f"Admin {admin.get('email')} deleted player #{doc['serial_number']} ({doc['player_name']})")

    return {
        "success": True,
        "message": f"Player #{format_serial_number(doc['serial_number'])} ({doc['player_name']}) deleted successfully.",
    }


@router.get("/{player_id}/poster")
async def get_or_download_player_poster(
    player_id: str,
    download: bool = Query(False, description="Whether to trigger file download attachment"),
):
    """
    Retrieves or generates on-the-fly the official auction poster for the player.
    Supports ?download=true to trigger automatic browser download with proper filename.
    Decoupled from Render ephemeral local disk:
    - If valid Cloudinary URL is present:
      - For preview (download=False): 307 Redirects directly to Cloudinary CDN URL.
      - For download (download=True): Returns local file if present, or fetches/proxies directly
        from Cloudinary CDN with attachment headers so downloads never fail on ephemeral container restarts.
    - If Cloudinary URL is missing: Generates poster, uploads to Cloudinary, updates MongoDB, and returns asset.
    """
    try:
        obj_id = ObjectId(player_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player ID.")

    players_col = get_players_collection()
    player = await players_col.find_one({"_id": obj_id})
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    serial_str = format_serial_number(player.get("serial_number", 0))
    clean_name = "".join([c if c.isalnum() else "_" for c in player.get("player_name", "player")])
    filename = f"VFN_2026_Poster_#{serial_str}_{clean_name}.png"
    poster_url = player.get("poster_url")

    # If Cloudinary poster URL is already present and valid
    if poster_url and is_cloudinary_url(poster_url):
        if not download:
            return RedirectResponse(url=poster_url, status_code=307)

        # For download: check if cached locally
        local_rel = player.get("local_poster_path")
        if local_rel:
            local_full = os.path.join(
                settings.UPLOAD_DIR,
                "posters",
                os.path.basename(local_rel),
            )
            if os.path.isfile(local_full):
                return FileResponse(
                    path=local_full,
                    filename=filename,
                    media_type="image/png",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )

        # Local file wiped by Render restart: fetch directly from Cloudinary CDN and stream attachment
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(poster_url)
                if resp.status_code == 200:
                    return Response(
                        content=resp.content,
                        media_type="image/png",
                        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                    )
                logger.warning(f"Cloudinary fetch returned {resp.status_code} for player {player_id}; regenerating.")
        except Exception as dl_err:
            logger.warning(f"Could not proxy download from Cloudinary for player {player_id}: {dl_err}")

    # Fallback or initial generation: generate poster on-the-fly and upload to Cloudinary
    try:
        rel_url, filepath = generate_player_poster(player)
        c_poster_url, c_poster_id = await upload_player_poster(
            filepath,
            player.get("serial_number", 0),
            player.get("player_name", "player"),
        )
        await players_col.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "poster_status": "generated",
                    "poster_url": c_poster_url,
                    "poster_public_id": c_poster_id,
                    "local_poster_path": rel_url,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    except Exception as e:
        logger.error(f"Failed to generate and upload poster for player {player_id}: {e}", exc_info=True)
        await players_col.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "poster_status": "failed",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate auction poster.")

    if download:
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return RedirectResponse(url=c_poster_url, status_code=307)


@router.post("/{player_id}/poster/generate", response_model=PlayerResponse)
async def regenerate_poster(
    player_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Admin-only endpoint to force regenerate a player's auction poster.
    Reruns design generation, uploads to Cloudinary, and updates MongoDB.
    """
    try:
        obj_id = ObjectId(player_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player ID.")

    players_col = get_players_collection()
    player = await players_col.find_one({"_id": obj_id})
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")

    try:
        rel_url, filepath = generate_player_poster(player)
        c_poster_url, c_poster_id = await upload_player_poster(
            filepath,
            player.get("serial_number", 0),
            player.get("player_name", "player"),
        )
        await players_col.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "poster_status": "generated",
                    "poster_url": c_poster_url,
                    "poster_public_id": c_poster_id,
                    "local_poster_path": rel_url,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    except Exception as e:
        logger.error(f"Failed to regenerate poster for player {player_id}: {e}", exc_info=True)
        await players_col.update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "poster_status": "failed",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to regenerate poster: {str(e)}")

    updated = await players_col.find_one({"_id": obj_id})
    return serialize_player(updated)
