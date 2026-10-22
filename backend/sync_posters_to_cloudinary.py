import os
import sys
import re
import argparse
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv

# Load .env from root or backend
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from pymongo import MongoClient
from backend.app.core.config import settings
from backend.app.core.cloudinary_client import (
    upload_player_poster,
    check_cloudinary_asset_exists,
    is_cloudinary_url,
)
from backend.app.services.poster_generator import generate_player_poster
from backend.app.services.counter_service import format_serial_number


def parse_args():
    parser = argparse.ArgumentParser(
        description="SportBid VFN - Persistent Cloudinary Poster Synchronization Service"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the sync without uploading to Cloudinary or updating MongoDB.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force regeneration and re-upload even if poster is already synchronized.",
    )
    parser.add_argument(
        "--mongo-url",
        type=str,
        default=None,
        help="MongoDB connection URL override (defaults to MONGODB_URL env).",
    )
    parser.add_argument(
        "--db-name",
        type=str,
        default=None,
        help="MongoDB database name override (defaults to DATABASE_NAME env).",
    )
    parser.add_argument(
        "--posters-dir",
        type=str,
        default=None,
        help="Local directory path containing generated posters.",
    )
    return parser.parse_args()


async def sync_posters(
    dry_run: bool = False,
    force: bool = False,
    mongo_url: Optional[str] = None,
    db_name: Optional[str] = None,
    posters_dir: Optional[str] = None,
):
    print("=" * 70)
    print("      SPORTBID VFN - POSTER SYNCHRONIZATION ENGINE")
    print(f"      Mode: {'[DRY RUN - PREVIEW ONLY]' if dry_run else '[LIVE EXECUTION]'}")
    print(f"      Force Re-upload: {force}")
    print("=" * 70)

    # Validate Cloudinary credentials
    if not settings.is_cloudinary_configured:
        print("[FATAL] Cloudinary credentials are not configured in environment variables!")
        print("Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.")
        return 1

    # Connect to MongoDB
    active_mongo_url = mongo_url or settings.MONGODB_URL
    active_db_name = db_name or settings.DATABASE_NAME
    print(f"Connecting to MongoDB database: '{active_db_name}'...")
    client = MongoClient(active_mongo_url)
    db = client[active_db_name]
    players_col = db["players"]

    # Identify local posters directory
    resolved_posters_dir = Path(posters_dir) if posters_dir else Path(settings.UPLOAD_DIR) / "posters"
    resolved_posters_dir.mkdir(parents=True, exist_ok=True)
    print(f"Local posters directory: {resolved_posters_dir}")

    # 1. Scan local poster files
    local_files: List[Path] = [
        f for f in resolved_posters_dir.glob("*.png")
        if f.is_file() and not f.name.startswith(".")
    ]
    print(f"Found {len(local_files)} local poster image file(s) on disk.")

    # 2. Fetch all registered players from MongoDB
    players = list(players_col.find({}).sort("serial_number", 1))
    print(f"Found {len(players)} registered player(s) in MongoDB.\n")

    # Map serial numbers and IDs to players for fast matching
    player_by_serial: Dict[int, Dict[str, Any]] = {}
    player_by_id: Dict[str, Dict[str, Any]] = {}
    for p in players:
        s_num = p.get("serial_number", 0)
        player_by_serial[s_num] = p
        player_by_id[str(p["_id"])] = p

    # Metrics
    matched_local_files = set()
    already_synchronized: List[Dict[str, Any]] = []
    newly_uploaded: List[Dict[str, Any]] = []
    failed_sync: List[Dict[str, Any]] = []
    unmatched_files: List[Path] = []

    # Regex patterns for matching local poster filenames:
    # e.g., "poster_07_Suresh_Poojary_6ad96123.png" or "VFN_2026_Poster_#007_Suresh_Poojary.png"
    pattern1 = re.compile(r"^poster_(\d+)_", re.IGNORECASE)
    pattern2 = re.compile(r"Poster_#(\d+)_", re.IGNORECASE)

    # 3. Check each registered player
    for p in players:
        p_id = p["_id"]
        s_num = p.get("serial_number", 0)
        p_name = p.get("player_name", "Unknown Player")
        serial_fmt = format_serial_number(s_num)
        p_role = p.get("playing_role", "Player")

        existing_url = p.get("poster_url")
        existing_pid = p.get("poster_public_id")
        existing_status = p.get("poster_status")

        # Find matching local file if any
        matching_local_file: Optional[Path] = None
        for lf in local_files:
            m1 = pattern1.search(lf.name)
            m2 = pattern2.search(lf.name)
            match_num = None
            if m1:
                match_num = int(m1.group(1))
            elif m2:
                match_num = int(m2.group(1))

            if match_num == s_num:
                matching_local_file = lf
                matched_local_files.add(lf)
                break

        print(f"--> Player #{serial_fmt} | {p_name} ({p_role})")

        # Check if already in Cloudinary and MongoDB
        already_valid = False
        if not force and existing_url and is_cloudinary_url(existing_url) and existing_pid:
            # Verify asset actually exists in Cloudinary Media Library
            asset_exists = check_cloudinary_asset_exists(existing_pid)
            if asset_exists:
                already_valid = True
                print(f"    [OK] Already synchronized in Cloudinary & MongoDB.")
                print(f"         URL: {existing_url}")
                already_synchronized.append({
                    "serial": serial_fmt,
                    "name": p_name,
                    "url": existing_url,
                    "public_id": existing_pid,
                })

        if already_valid:
            continue

        # Needs upload or re-synchronization
        print(f"    [!] Needs synchronization to Cloudinary...")
        if dry_run:
            print(f"    [DRY-RUN] Would generate/upload poster for #{serial_fmt} {p_name} and update MongoDB.")
            newly_uploaded.append({
                "serial": serial_fmt,
                "name": p_name,
                "url": "(DRY-RUN - Cloudinary URL would be generated)",
                "public_id": f"vfn_tournament_2026/posters/poster_{serial_fmt}_{p_name}",
            })
            continue

        # LIVE EXECUTION: Generate fresh or use existing local
        try:
            target_filepath = str(matching_local_file) if (matching_local_file and matching_local_file.exists()) else None
            rel_url = None

            # Always ensure we have a valid, beautifully rendered local poster
            if not target_filepath or force:
                rel_url, gen_filepath = generate_player_poster(p)
                target_filepath = gen_filepath
                print(f"    [1] Rendered high-res poster locally: {Path(target_filepath).name}")
            else:
                rel_url = f"/uploads/posters/{matching_local_file.name}"
                print(f"    [1] Using existing local poster: {matching_local_file.name}")

            # Upload to Cloudinary with retry
            print(f"    [2] Uploading to Cloudinary Media Library...")
            c_url, c_id = await upload_player_poster(target_filepath, s_num, p_name)
            print(f"    [2] Upload successful: {c_url}")

            # Update MongoDB record
            players_col.update_one(
                {"_id": p_id},
                {
                    "$set": {
                        "poster_status": "generated",
                        "poster_url": c_url,
                        "poster_public_id": c_id,
                        "local_poster_path": rel_url,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            print(f"    [3] Saved in MongoDB record successfully.")
            newly_uploaded.append({
                "serial": serial_fmt,
                "name": p_name,
                "url": c_url,
                "public_id": c_id,
            })

        except Exception as err:
            print(f"    [ERROR] Failed to synchronize poster for #{serial_fmt} {p_name}: {err}")
            players_col.update_one(
                {"_id": p_id},
                {
                    "$set": {
                        "poster_status": "failed",
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            failed_sync.append({
                "serial": serial_fmt,
                "name": p_name,
                "error": str(err),
            })

    # 4. Check for unmatched local files
    for lf in local_files:
        if lf not in matched_local_files:
            unmatched_files.append(lf)

    # 5. Output Final Synchronization Report
    print("\n" + "=" * 70)
    print("                     FINAL SYNCHRONIZATION REPORT")
    print("=" * 70)
    print(f"Execution Mode:             {'DRY-RUN (Simulated)' if dry_run else 'LIVE EXECUTION'}")
    print(f"Total Local Files Scanned:   {len(local_files)}")
    print(f"Total Registered Players:    {len(players)}")
    print(f"Already Synchronized:        {len(already_synchronized)}")
    print(f"Newly Synchronized/Uploaded: {len(newly_uploaded)}")
    print(f"Failed Synchronizations:     {len(failed_sync)}")
    print(f"Unmatched Local Files:       {len(unmatched_files)}")
    print("-" * 70)

    if already_synchronized:
        print("\nALREADY SYNCHRONIZED PLAYERS:")
        for item in already_synchronized:
            print(f"  - #{item['serial']} {item['name']} -> {item['url']}")

    if newly_uploaded:
        print(f"\n{'SIMULATED' if dry_run else 'SUCCESSFULLY'} SYNCHRONIZED PLAYERS:")
        for item in newly_uploaded:
            print(f"  - #{item['serial']} {item['name']} -> {item['url']}")

    if failed_sync:
        print("\nFAILED SYNCHRONIZATIONS:")
        for item in failed_sync:
            print(f"  - #{item['serial']} {item['name']} -> Error: {item['error']}")

    if unmatched_files:
        print("\nUNMATCHED LOCAL POSTER FILES (Not linked to any active player in MongoDB):")
        for uf in unmatched_files:
            print(f"  - {uf.name} ({uf.stat().st_size} bytes)")
        print("  NOTE: Unmatched files were safely kept on disk and NOT uploaded to avoid polluting Cloudinary.")

    print("=" * 70)
    return 0 if len(failed_sync) == 0 else 1


def main():
    args = parse_args()
    exit_code = asyncio.run(
        sync_posters(
            dry_run=args.dry_run,
            force=args.force,
            mongo_url=args.mongo_url,
            db_name=args.db_name,
            posters_dir=args.posters_dir,
        )
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
