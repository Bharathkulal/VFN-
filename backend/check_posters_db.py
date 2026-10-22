import os
from dotenv import load_dotenv
load_dotenv('d:/VFN/.env')
from pymongo import MongoClient

print("=== CHECKING LOCAL MONGODB ===")
try:
    c_loc = MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000)
    for p in c_loc['sportbid_vfn'].players.find():
        s = p.get('serial_number')
        name = str(p.get('player_name', '')).encode('ascii', 'replace').decode()
        status = p.get('poster_status')
        p_url = p.get('poster_url')
        pub_id = p.get('poster_public_id')
        loc = p.get('local_poster_path')
        print(f"#{s}: {name} | status={status} | url={p_url} | pub_id={pub_id} | local={loc}")
except Exception as e:
    print("Local error:", e)

print("\n=== CHECKING ATLAS MONGODB ===")
try:
    c_atl = MongoClient('mongodb+srv://lalithakulal82_db_user:Y8Tjpe1j3rLSRhcS@cluster0.dfzlkzq.mongodb.net/?retryWrites=true&w=majority', serverSelectionTimeoutMS=5000)
    for p in c_atl['sportbid_vfn'].players.find():
        s = p.get('serial_number')
        name = str(p.get('player_name', '')).encode('ascii', 'replace').decode()
        status = p.get('poster_status')
        p_url = p.get('poster_url')
        pub_id = p.get('poster_public_id')
        loc = p.get('local_poster_path')
        print(f"#{s}: {name} | status={status} | url={p_url} | pub_id={pub_id} | local={loc}")
except Exception as e:
    print("Atlas error:", e)
