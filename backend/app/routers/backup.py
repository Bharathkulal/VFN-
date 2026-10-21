import os
import json
import hashlib
from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.database import (
    get_players_collection,
    get_tournament_collection,
    get_counters_collection,
)
from backend.app.core.security import get_current_admin

logger = logging.getLogger("vfn.backup")
router = APIRouter(prefix="/backup", tags=["Backup & Recovery"])

# Directory where local backups are stored
BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "backups",
)
os.makedirs(BACKUP_DIR, exist_ok=True)


class BackupStatusResponse(BaseModel):
    database_name: str
    backup_directory: str
    total_backups: int
    last_backup_time: Optional[datetime] = None
    players_count: int
    settings_count: int
    counters_count: int
    system_status: str


class BackupFileItem(BaseModel):
    filename: str
    created_at: datetime
    size_bytes: int
    size_formatted: str
    player_count: int
    checksum: str


class RestoreResponse(BaseModel):
    success: bool
    filename: str
    players_restored: int
    message: str


def format_bytes(num_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


@router.get("/status", response_model=BackupStatusResponse)
async def get_backup_status(admin: dict = Depends(get_current_admin)):
    """Returns current real backup state and database document counts."""
    players_col = get_players_collection()
    tourn_col = get_tournament_collection()
    counters_col = get_counters_collection()

    players_count = await players_col.count_documents({})
    settings_count = await tourn_col.count_documents({})
    counters_count = await counters_col.count_documents({})

    files = [f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")]
    last_time = None
    if files:
        # Sort files by modification time
        files.sort(key=lambda f: os.path.getmtime(os.path.join(BACKUP_DIR, f)), reverse=True)
        mtime = os.path.getmtime(os.path.join(BACKUP_DIR, files[0]))
        last_time = datetime.fromtimestamp(mtime, tz=timezone.utc)

    return BackupStatusResponse(
        database_name=settings.DATABASE_NAME,
        backup_directory=BACKUP_DIR,
        total_backups=len(files),
        last_backup_time=last_time,
        players_count=players_count,
        settings_count=settings_count,
        counters_count=counters_count,
        system_status="Operational (MongoDB Connected)",
    )


@router.get("/history", response_model=List[BackupFileItem])
async def get_backup_history(admin: dict = Depends(get_current_admin)):
    """Lists all available backup snapshots in chronological order."""
    if not os.path.exists(BACKUP_DIR):
        return []

    files = [f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")]
    history: List[BackupFileItem] = []

    for f in sorted(files, key=lambda x: os.path.getmtime(os.path.join(BACKUP_DIR, x)), reverse=True):
        filepath = os.path.join(BACKUP_DIR, f)
        stat = os.stat(filepath)
        mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        size = stat.st_size

        # Read summary from json
        player_count = 0
        checksum = ""
        try:
            with open(filepath, "r", encoding="utf-8") as bf:
                data = json.load(bf)
                player_count = len(data.get("players", []))
                checksum = data.get("checksum", "")[:12]
        except Exception:
            pass

        history.append(
            BackupFileItem(
                filename=f,
                created_at=mtime,
                size_bytes=size,
                size_formatted=format_bytes(size),
                player_count=player_count,
                checksum=checksum or "n/a",
            )
        )

    return history


@router.post("/create", response_model=BackupFileItem)
async def create_backup(admin: dict = Depends(get_current_admin)):
    """Exports a fresh JSON snapshot of players, tournament settings, and counters."""
    players_col = get_players_collection()
    tourn_col = get_tournament_collection()
    counters_col = get_counters_collection()

    now = datetime.now(timezone.utc)
    timestamp_str = now.strftime("%Y%m%d_%H%M%S")
    filename = f"vfn_backup_{timestamp_str}.json"
    filepath = os.path.join(BACKUP_DIR, filename)

    # 1. Fetch all players
    players_data = []
    async for p in players_col.find():
        p_clean = dict(p)
        if "_id" in p_clean:
            p_clean["_id"] = str(p_clean["_id"])
        if "created_at" in p_clean and isinstance(p_clean["created_at"], datetime):
            p_clean["created_at"] = p_clean["created_at"].isoformat()
        if "updated_at" in p_clean and isinstance(p_clean["updated_at"], datetime):
            p_clean["updated_at"] = p_clean["updated_at"].isoformat()
        players_data.append(p_clean)

    # 2. Fetch tournament info
    tourn_data = []
    async for t in tourn_col.find():
        t_clean = dict(t)
        if "updated_at" in t_clean and isinstance(t_clean["updated_at"], datetime):
            t_clean["updated_at"] = t_clean["updated_at"].isoformat()
        tourn_data.append(t_clean)

    # 3. Fetch counters
    counters_data = []
    async for c in counters_col.find():
        c_clean = dict(c)
        counters_data.append(c_clean)

    payload = {
        "tournament": "Volleyball Friends Nalthur Trophy 2026",
        "exported_at": now.isoformat(),
        "exported_by": admin.get("email", "admin@vfn.com"),
        "players": players_data,
        "tournament_settings": tourn_data,
        "counters": counters_data,
    }

    raw_bytes = json.dumps(payload, indent=2).encode("utf-8")
    checksum = hashlib.sha256(raw_bytes).hexdigest()
    payload["checksum"] = checksum

    with open(filepath, "w", encoding="utf-8") as out_f:
        json.dump(payload, out_f, indent=2)

    stat = os.stat(filepath)
    logger.info(f"Admin {admin.get('email')} created backup {filename} with {len(players_data)} players.")

    return BackupFileItem(
        filename=filename,
        created_at=now,
        size_bytes=stat.st_size,
        size_formatted=format_bytes(stat.st_size),
        player_count=len(players_data),
        checksum=checksum[:12],
    )


@router.get("/download/{filename}")
async def download_backup(filename: str, admin: dict = Depends(get_current_admin)):
    """Streams a backup snapshot file to the client for download."""
    # Sanitize filename
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(BACKUP_DIR, safe_filename)

    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested backup file does not exist.",
        )

    return FileResponse(
        path=filepath,
        filename=safe_filename,
        media_type="application/json",
    )


@router.post("/restore/{filename}", response_model=RestoreResponse)
async def restore_backup(
    filename: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Restores player data and counters from a verified backup snapshot.
    Safely merges/restores documents without duplicating serial numbers.
    """
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(BACKUP_DIR, safe_filename)

    if not os.path.isfile(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup snapshot file not found.",
        )

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse backup JSON: {str(e)}",
        )

    players = data.get("players", [])
    players_col = get_players_collection()
    counters_col = get_counters_collection()

    restored_count = 0
    max_serial = 0

    for p in players:
        serial = p.get("serial_number", 0)
        if serial > max_serial:
            max_serial = serial

        # Parse date strings back to datetime
        created_at = None
        if p.get("created_at"):
            try:
                created_at = datetime.fromisoformat(p["created_at"])
            except Exception:
                created_at = datetime.now(timezone.utc)

        updated_at = None
        if p.get("updated_at"):
            try:
                updated_at = datetime.fromisoformat(p["updated_at"])
            except Exception:
                updated_at = datetime.now(timezone.utc)

        doc = {
            "serial_number": serial,
            "formatted_serial": f"{serial:02d}",
            "player_name": p.get("player_name"),
            "village": p.get("village"),
            "playing_role": p.get("playing_role"),
            "phone_number": p.get("phone_number"),
            "photo_url": p.get("photo_url"),
            "photo_public_id": p.get("photo_public_id"),
            "poster_status": p.get("poster_status", "pending"),
            "poster_url": p.get("poster_url"),
            "created_at": created_at or datetime.now(timezone.utc),
            "updated_at": updated_at or datetime.now(timezone.utc),
        }

        # Upsert by serial_number
        await players_col.update_one(
            {"serial_number": serial},
            {"$set": doc},
            upsert=True,
        )
        restored_count += 1

    # Update counter sequence to at least max_serial
    if max_serial > 0:
        await counters_col.update_one(
            {"_id": "player_serial"},
            {"$max": {"seq": max_serial}},
            upsert=True,
        )

    logger.info(f"Admin {admin.get('email')} restored {restored_count} players from {safe_filename}.")
    return RestoreResponse(
        success=True,
        filename=safe_filename,
        players_restored=restored_count,
        message=f"Successfully restored {restored_count} player records. Counter aligned to #{max_serial:02d}.",
    )
