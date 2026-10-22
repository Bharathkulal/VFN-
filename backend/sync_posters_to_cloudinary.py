import os
import sys
import asyncio

sys.path.insert(0, r"d:\VFN")

from dotenv import load_dotenv

load_dotenv("d:/VFN/.env")

from pymongo import MongoClient
from backend.app.core.database import get_database
from backend.app.services.poster_generator import generate_player_poster
from backend.app.core.cloudinary_client import upload_player_poster

async def sync_all_posters():
    print("=" * 60)
    print("SYNCING ALL PLAYER POSTERS TO CLOUDINARY & MONGODB")
    print("=" * 60)

    client = MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DATABASE_NAME", "sportbid_vfn")]
    players_col = db["players"]

    players = list(players_col.find({}))
    print(f"Found {len(players)} player(s) in MongoDB.")

    for p in players:
        p_id = p["_id"]
        s_num = p.get("serial_number", 0)
        p_name = p.get("player_name", "Player")

        print(f"\nProcessing #{s_num:02d} {p_name} (ID: {p_id})...")

        try:
            # 1. Generate high-resolution poster
            rel_url, filepath = generate_player_poster(p)
            print(f"  [1] Poster generated locally at: {filepath}")

            # 2. Upload to Cloudinary
            c_url, c_id = await upload_player_poster(filepath, s_num, p_name)
            print(f"  [2] Uploaded to Cloudinary: {c_url} (ID: {c_id})")

            # 3. Save into MongoDB
            players_col.update_one(
                {"_id": p_id},
                {
                    "$set": {
                        "poster_status": "generated",
                        "poster_url": c_url,
                        "poster_public_id": c_id,
                        "local_poster_path": rel_url,
                    }
                },
            )
            print(f"  [3] Saved in MongoDB successfully!")
        except Exception as e:
            print(f"  [ERROR] Failed to process poster for {p_name}: {e}")

    print("\n" + "=" * 60)
    print("ALL POSTERS PROCESSED AND SYNCED TO CLOUDINARY & MONGODB!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(sync_all_posters())
