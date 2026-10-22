import os
from dotenv import load_dotenv

load_dotenv("d:/VFN/.env")

from pymongo import MongoClient
import cloudinary

print("=" * 45)
print("1. DATABASE (MongoDB) CONNECTION STATUS")
print("=" * 45)
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
db_name = os.getenv("DATABASE_NAME", "sportbid_vfn")

try:
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
    info = client.server_info()
    db = client[db_name]
    ping = db.command("ping")
    collections = db.list_collection_names()
    players_count = db.players.count_documents({})
    admins_count = db.admins.count_documents({})

    print(">> STATUS: CONNECTED SUCCESSFULLY (YES)")
    print(f"   URL: {mongo_url}")
    print(f"   Database: {db_name}")
    print(f"   Ping Result: {ping}")
    print(f"   Collections Found: {collections}")
    print(f"   Registered Players: {players_count}")
    print(f"   Admin Accounts: {admins_count}")
except Exception as e:
    print(f">> STATUS: NOT CONNECTED (NO) -> {e}")

print("\n" + "=" * 45)
print("2. CLOUDINARY CONNECTION STATUS")
print("=" * 45)
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

has_credentials = bool(cloud_name and api_key and api_secret)

if not has_credentials:
    print(">> STATUS: NOT CONNECTED (NO)")
    print("   Reason: Cloudinary credentials in .env are currently EMPTY:")
    print(f"   - CLOUDINARY_CLOUD_NAME: {'[Configured]' if cloud_name else '[EMPTY]'}")
    print(f"   - CLOUDINARY_API_KEY:    {'[Configured]' if api_key else '[EMPTY]'}")
    print(f"   - CLOUDINARY_API_SECRET: {'[Configured]' if api_secret else '[EMPTY]'}")
    print("\n   Current Operating Mode:")
    print("   -> The system is automatically using LOCAL FALLBACK STORAGE.")
    print("   -> All player photos and posters are safely saved on your computer in 'D:\\VFN\\backend\\uploads'.")
else:
    print(">> Testing Cloudinary credentials...")
    try:
        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)
        import cloudinary.api
        res = cloudinary.api.ping()
        print(f">> STATUS: CONNECTED SUCCESSFULLY TO CLOUDINARY (YES) -> {res}")
    except Exception as e:
        print(f">> STATUS: FAILED TO CONNECT TO CLOUDINARY -> {e}")
print("=" * 45)
