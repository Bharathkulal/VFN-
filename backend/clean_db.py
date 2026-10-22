import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings

async def clean_mock_data():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # 1. Ping
    ping_res = await client.admin.command("ping")
    print("MongoDB Ping:", ping_res)
    
    # 2. Count existing players
    count_before = await db.players.count_documents({})
    print("Players count before cleanup:", count_before)
    
    # 3. Delete any remaining mock players
    del_res = await db.players.delete_many({})
    print("Deleted mock players:", del_res.deleted_count)
    
    # 4. Reset serial counter back to 0
    await db.counters.update_one({"_id": "player_serial"}, {"$set": {"seq": 0}}, upsert=True)
    counter_doc = await db.counters.find_one({"_id": "player_serial"})
    print("Counter state:", counter_doc)
    
    # 5. Admin users count
    admin_count = await db.admin_users.count_documents({})
    print("Admin users count:", admin_count)
    
    # 6. Verify tournament settings
    tourn = await db.tournament_settings.find_one({"_id": "tournament_info"})
    print("Tournament info:", tourn.get("tournament_name") if tourn else "Default VFN Trophy 2026")
    
    client.close()
    print("DATABASE IS CONNECTED SUCCESSFULLY AND MOCK DATA REMOVED.")

if __name__ == "__main__":
    asyncio.run(clean_mock_data())
