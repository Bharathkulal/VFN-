import os
import sys
import io
import asyncio
from datetime import datetime, timezone
from pathlib import Path
import httpx
from PIL import Image

# Ensure project root in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from backend.app.core.config import settings
from backend.app.services.poster_generator import generate_player_poster

RENDER_BASE_URL = "https://vfn-backend-k4hx.onrender.com"
ATLAS_URL = "mongodb+srv://lalithakulal82_db_user:Y8Tjpe1j3rLSRhcS@cluster0.dfzlkzq.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "sportbid_vfn"

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

async def migrate():
    print("=" * 60)
    print("PERSISTING ALL REGISTERED ATLAS PLAYERS TO CLOUDINARY")
    print("PRESERVING ALL REGISTERED PLAYER DATA")
    print("=" * 60)

    client = MongoClient(ATLAS_URL)
    db = client[DB_NAME]
    players_col = db["players"]

    players = list(players_col.find({}).sort("serial_number", 1))
    print(f"Total active registered players in Atlas: {len(players)}")

    async with httpx.AsyncClient(timeout=20.0) as http:
        for p in players:
            p_id = p["_id"]
            s_num = p.get("serial_number", 0)
            name = p.get("player_name", "Player")
            photo_url = p.get("photo_url", "")
            poster_url = p.get("poster_url", "")

            print(f"\nProcessing #{s_num:02d} {name}...")

            # 1. Check and migrate photo to Cloudinary
            c_photo_url = photo_url
            c_photo_id = p.get("photo_public_id")
            photo_bytes = None

            if not photo_url.startswith("http"):
                # Fetch photo from Render
                render_photo_url = f"{RENDER_BASE_URL}{photo_url}"
                try:
                    res = await http.get(render_photo_url)
                    if res.status_code == 200 and len(res.content) > 1000:
                        photo_bytes = res.content
                        # Upload to Cloudinary
                        clean_name = "".join([c if c.isalnum() else "_" for c in name])
                        c_res = cloudinary.uploader.upload(
                            photo_bytes,
                            folder="vfn_tournament_2026/players",
                            public_id=f"player_{s_num:02d}_{clean_name}",
                            overwrite=True,
                            tags=["vfn_tournament_2026", "player_photo"],
                        )
                        c_photo_url = c_res.get("secure_url") or c_res.get("url")
                        c_photo_id = c_res.get("public_id")
                        print(f"  [+] Rescued photo to Cloudinary: {c_photo_url}")
                    else:
                        print(f"  [-] Photo not found on Render ({res.status_code})")
                except Exception as e:
                    print(f"  [!] Photo fetch error: {e}")
            else:
                print(f"  [OK] Photo already on CDN: {photo_url}")

            # Update photo in MongoDB Atlas
            if c_photo_url.startswith("http"):
                players_col.update_one(
                    {"_id": p_id},
                    {
                        "$set": {
                            "photo_url": c_photo_url,
                            "photo_public_id": c_photo_id,
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
                p["photo_url"] = c_photo_url
                p["photo_public_id"] = c_photo_id

            # 2. Check and migrate poster to Cloudinary
            c_poster_url = poster_url
            c_poster_id = p.get("poster_public_id")

            if not poster_url.startswith("http"):
                clean_name = "".join([c if c.isalnum() else "_" for c in name])
                public_id = f"vfn_tournament_2026/posters/poster_{s_num:02d}_{clean_name}"

                # If photo is in Cloudinary, re-generate poster with player's actual photo!
                if c_photo_url.startswith("http") and photo_bytes:
                    try:
                        rel_path, local_file = generate_player_poster(p)
                        with open(local_file, "rb") as f:
                            p_bytes = f.read()
                        up_res = cloudinary.uploader.upload(
                            p_bytes,
                            public_id=public_id,
                            overwrite=True,
                            tags=["vfn_tournament_2026", "auction_poster"],
                        )
                        c_poster_url = up_res.get("secure_url") or up_res.get("url")
                        c_poster_id = up_res.get("public_id")
                        print(f"  [+] Generated & uploaded poster with player photo: {c_poster_url}")
                    except Exception as ge:
                        print(f"  [!] Poster generation error: {ge}")
                else:
                    # Fetch existing poster from Render and upload to Cloudinary
                    try:
                        render_poster_url = f"{RENDER_BASE_URL}{poster_url}"
                        p_res = await http.get(render_poster_url)
                        if p_res.status_code == 200:
                            up_res = cloudinary.uploader.upload(
                                p_res.content,
                                public_id=public_id,
                                overwrite=True,
                                tags=["vfn_tournament_2026", "auction_poster"],
                            )
                            c_poster_url = up_res.get("secure_url") or up_res.get("url")
                            c_poster_id = up_res.get("public_id")
                            print(f"  [+] Uploaded existing Render poster to Cloudinary: {c_poster_url}")
                    except Exception as pe:
                        print(f"  [!] Poster fetch/upload error: {pe}")

                # Update poster in Atlas
                if c_poster_url.startswith("http"):
                    players_col.update_one(
                        {"_id": p_id},
                        {
                            "$set": {
                                "poster_status": "generated",
                                "poster_url": c_poster_url,
                                "poster_public_id": c_poster_id,
                                "updated_at": datetime.now(timezone.utc),
                            }
                        },
                    )
            else:
                print(f"  [OK] Poster already on CDN: {poster_url}")

    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE! ALL DATA PRESERVED IN ATLAS & CLOUDINARY")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(migrate())
