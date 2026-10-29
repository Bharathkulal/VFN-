import os
import sys
import io
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
import httpx

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from backend.app.core.config import settings
from backend.app.core.database import connect_to_mongo, close_mongo_connection, get_players_collection
from backend.app.core.cloudinary_client import upload_player_poster, is_cloudinary_url
from backend.app.services.poster_generator import generate_player_poster, load_player_image
from backend.app.services.counter_service import format_serial_number

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", force=True)
logger = logging.getLogger("vfn.migration")


def extract_portrait_from_poster(poster_url_or_path: str) -> Image.Image:
    """Fallback extraction of photo frame from existing master poster (28, 98, 477, 482)."""
    if poster_url_or_path.startswith("http://") or poster_url_or_path.startswith("https://"):
        with httpx.Client(timeout=15.0) as client:
            res = client.get(poster_url_or_path)
            if res.status_code == 200:
                p_img = Image.open(io.BytesIO(res.content)).convert("RGBA")
                return p_img.crop((28, 98, 28 + 449, 98 + 384))
    elif os.path.isfile(poster_url_or_path):
        p_img = Image.open(poster_url_or_path).convert("RGBA")
        return p_img.crop((28, 98, 28 + 449, 98 + 384))
    return None


async def run_migration():
    sys.stdout.reconfigure(line_buffering=True)
    logger.info("Starting migration: Spiker -> Attacker and poster regeneration...")
    await connect_to_mongo()
    players_col = get_players_collection()

    # Match any player with Spiker OR Attacker (to handle those partially migrated earlier)
    # We filter down to those who were originally Spikers or now Attacker (serial 1, 3, 4, 5, 8, 13, 16, 18, 21, 22, 25, 28, 33, 34, 35, 36, 37, 43, 44, 46, 49, 51)
    target_serials = [1, 3, 4, 5, 8, 13, 16, 18, 21, 22, 25, 28, 33, 34, 35, 36, 37, 43, 44, 46, 49, 51]
    players = await players_col.find({"serial_number": {"$in": target_serials}}).sort("serial_number", 1).to_list(length=100)
    logger.info(f"Found {len(players)} target player(s) to migrate and regenerate.")

    updated_count = 0
    poster_regen_count = 0
    failed_poster_count = 0

    for player in players:
        p_id = player["_id"]
        s_num = player.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        name = player.get("player_name", "Player")

        logger.info(f"Processing Player #{fmt_serial} ({name})...")

        # 1. Update playing_role to "Attacker"
        update_fields = {
            "playing_role": "Attacker",
            "updated_at": datetime.now(timezone.utc),
        }

        # 2. Check and regenerate poster
        photo_url = player.get("photo_url", "")
        photo_img = None
        if photo_url:
            try:
                photo_img = load_player_image(photo_url)
            except Exception as pe:
                logger.warning(f"  Could not load photo from {photo_url}: {pe}")

        # Fallback to extracting from existing poster if photo is missing
        if photo_img is None and player.get("poster_url"):
            try:
                logger.info(f"  Attempting portrait extraction from existing poster for #{fmt_serial}...")
                photo_img = extract_portrait_from_poster(player["poster_url"])
                if photo_img:
                    logger.info(f"  Successfully extracted portrait for #{fmt_serial} from existing poster.")
            except Exception as ce:
                logger.warning(f"  Could not extract portrait from poster for #{fmt_serial}: {ce}")

        if photo_img:
            try:
                player_doc_copy = dict(player)
                player_doc_copy["playing_role"] = "Attacker"
                rel_url, filepath = generate_player_poster(
                    player_doc_copy,
                    raw_photo_image=photo_img,
                    allow_fallback_avatar=False,
                )
                logger.info(f"  Generated local poster with ATTACKER at: {filepath}")

                # Upload to Cloudinary
                if settings.is_cloudinary_configured:
                    c_poster_url, c_poster_id = await upload_player_poster(filepath, s_num, name)
                    if c_poster_url and is_cloudinary_url(c_poster_url):
                        update_fields["poster_url"] = c_poster_url
                        update_fields["poster_public_id"] = c_poster_id
                        update_fields["local_poster_path"] = rel_url
                        update_fields["poster_status"] = "generated"
                        poster_regen_count += 1
                        logger.info(f"  Cloudinary poster uploaded: {c_poster_url}")
                    else:
                        logger.warning(f"  Cloudinary upload did not return secure URL: {c_poster_url}")
                        failed_poster_count += 1
                else:
                    update_fields["poster_url"] = rel_url
                    update_fields["local_poster_path"] = rel_url
                    update_fields["poster_status"] = "generated"
                    poster_regen_count += 1
            except Exception as ge:
                logger.error(f"  Poster generation/upload error for #{fmt_serial}: {ge}", exc_info=True)
                failed_poster_count += 1
        else:
            logger.warning(f"  No photo image available for #{fmt_serial} ({name}); role updated without poster regeneration.")

        await players_col.update_one({"_id": p_id}, {"$set": update_fields})
        updated_count += 1

    # Also catch any other players where playing_role might still be "Spiker"
    extra_spikers = await players_col.find({"playing_role": {"$regex": "^spiker$", "$options": "i"}}).to_list(length=100)
    for p in extra_spikers:
        await players_col.update_one({"_id": p["_id"]}, {"$set": {"playing_role": "Attacker", "updated_at": datetime.now(timezone.utc)}})
        logger.info(f"Updated extra player #{p.get('serial_number')} ({p.get('player_name')}) role to Attacker.")

    logger.info("=" * 60)
    logger.info("Migration Complete!")
    logger.info(f"  Players updated: {updated_count}")
    logger.info(f"  Posters regenerated & uploaded: {poster_regen_count}")
    logger.info(f"  Poster generation failures: {failed_poster_count}")

    # Verify counts
    remaining_spikers = await players_col.count_documents({"playing_role": {"$regex": "^spiker$", "$options": "i"}})
    attacker_count = await players_col.count_documents({"playing_role": "Attacker"})
    logger.info(f"  Remaining 'Spiker' in DB: {remaining_spikers}")
    logger.info(f"  Total 'Attacker' in DB: {attacker_count}")
    logger.info("=" * 60)

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(run_migration())
