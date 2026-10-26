import os
import sys
import io
import json
import time
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
import cloudinary
import cloudinary.uploader
from backend.app.core.config import settings
from backend.app.services.poster_generator import generate_player_poster
from backend.app.core.cloudinary_client import upload_player_poster

async def run_renumbering_migration():
    print("=" * 70)
    print("   VFN TOURNAMENT 2026 - SEQUENTIAL SERIAL RENUMBERING MIGRATION")
    print("=" * 70)

    # 1. Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    players_col = db["players"]
    counters_col = db["counters"]

    # 2. Fetch all registered players sorted by current serial number
    players = await players_col.find({}).sort("serial_number", 1).to_list(1000)
    total_players = len(players)
    print(f"\n[INFO] Found {total_players} registered players in database '{settings.DATABASE_NAME}'.")

    if total_players == 0:
        print("[ERROR] No players found in database. Aborting.")
        return

    # 3. Create verified pre-migration backup snapshot
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = BASE_DIR / "backend" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_file = backup_dir / f"pre_renumbering_backup_{timestamp_str}.json"

    # Serialize docs for JSON
    serializable_players = []
    for p in players:
        p_copy = dict(p)
        p_copy["_id"] = str(p_copy["_id"])
        if "created_at" in p_copy and isinstance(p_copy["created_at"], datetime):
            p_copy["created_at"] = p_copy["created_at"].isoformat()
        if "updated_at" in p_copy and isinstance(p_copy["updated_at"], datetime):
            p_copy["updated_at"] = p_copy["updated_at"].isoformat()
        serializable_players.append(p_copy)

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_players": total_players,
            "players": serializable_players,
        }, f, indent=2)

    print(f"[STEP 1] Verified pre-migration backup saved to:")
    print(f"         {backup_file} ({backup_file.stat().st_size} bytes)")

    # 4. Two-Stage Unique Index Safe Renumbering
    print("\n[STEP 2] Executing two-stage unique-index safe database renumbering...")
    
    # Stage 2A: Shift to temporary offset (10000 + i) to vacate 1..100
    for idx, p in enumerate(players, start=1):
        await players_col.update_one(
            {"_id": p["_id"]},
            {"$set": {"serial_number": 10000 + idx}}
        )
    print("  -> Stage 2A complete: All serials shifted to temporary safe offset (10001-10050).")

    # Stage 2B: Assign final sequential numbers (1 to total_players)
    renumbered_players = []
    for idx, p in enumerate(players, start=1):
        old_serial = p.get("serial_number")
        name = p.get("player_name", "")
        await players_col.update_one(
            {"_id": p["_id"]},
            {
                "$set": {
                    "serial_number": idx,
                    "formatted_serial": f"{idx:02d}",
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )
        p_updated = dict(p)
        p_updated["serial_number"] = idx
        p_updated["formatted_serial"] = f"{idx:02d}"
        renumbered_players.append((idx, old_serial, p_updated))

    print(f"  -> Stage 2B complete: All {total_players} players assigned sequential numbers #01 to #{total_players:02d}.")

    # Stage 2C: Update atomic counter in counters collection
    await counters_col.update_one(
        {"_id": "player_serial"},
        {"$set": {"seq": total_players}},
        upsert=True
    )
    print(f"  -> Stage 2C complete: Atomic sequence in counters updated to {total_players}.")

    # 5. Poster Regeneration and Cloudinary Upload
    print(f"\n[STEP 3] Regenerating and uploading posters for all {total_players} players...")
    print("         (Preserving existing Cloudinary assets for non-destructive safety)")

    async def update_player_poster_asset(idx, old_s, p_doc):
        name = p_doc.get("player_name", "Player")
        fmt_serial = f"{idx:02d}"
        try:
            # 1. Render new high-resolution poster locally
            rel_url, gen_filepath = generate_player_poster(p_doc, allow_fallback_avatar=True)
            
            # 2. Upload to Cloudinary under new serial public_id (e.g. poster_01_Jeevan)
            c_url, c_id = await upload_player_poster(gen_filepath, idx, name)
            
            # 3. Update MongoDB record with verified new poster references
            await players_col.update_one(
                {"_id": p_doc["_id"]},
                {
                    "$set": {
                        "poster_status": "generated",
                        "poster_url": c_url,
                        "poster_public_id": c_id,
                        "local_poster_path": rel_url,
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
            print(f"  [{idx:02d}/{total_players:02d}] #{fmt_serial} {name} (was #{old_s:02d}) -> {c_url}")
            return True, None
        except Exception as e:
            print(f"  [ERROR] Failed poster update for #{fmt_serial} {name}: {e}")
            return False, (idx, name, str(e))

    # Concurrency pool for faster poster generation and uploads
    semaphore = asyncio.Semaphore(4)
    async def sem_task(idx, old_s, p_doc):
        async with semaphore:
            return await update_player_poster_asset(idx, old_s, p_doc)

    tasks = [sem_task(idx, old_s, p_doc) for idx, old_s, p_doc in renumbered_players]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for ok, _ in results if ok)
    failed_items = [err for ok, err in results if not ok]

    print("\n" + "=" * 70)
    print("                    MIGRATION COMPLETION REPORT")
    print("=" * 70)
    print(f"Total Players Renumbered: {total_players} (#01 to #{total_players:02d})")
    print(f"Posters Successfully Updated: {success_count}/{total_players}")
    print(f"Failed Poster Updates: {len(failed_items)}")
    print(f"Pre-Migration Snapshot: {backup_file.name}")
    print(f"Counter State: 'player_serial' -> seq: {total_players}")
    print("=" * 70)

    client.close()

if __name__ == "__main__":
    asyncio.run(run_renumbering_migration())
