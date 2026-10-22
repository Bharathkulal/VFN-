import os
import sys
import httpx
from pymongo import MongoClient

print("=" * 60)
print("TESTING FULL REGISTRATION -> CLOUDINARY & MONGODB FLOW")
print("=" * 60)

# Load test photo
photo_path = "backend/app/assets/spiker_badge.png"
with open(photo_path, "rb") as f:
    photo_bytes = f.read()

payload = {
    "player_name": "Suresh Poojary",
    "village": "Kedoor",
    "playing_role": "Libero",
    "phone_number": "9148690502"
}
files = {
    "photo": ("suresh.png", photo_bytes, "image/png")
}

print("1. Submitting player registration to http://127.0.0.1:8000/api/v1/players/register...")
with httpx.Client(timeout=30.0) as client:
    res = client.post("http://127.0.0.1:8000/api/v1/players/register", data=payload, files=files)
    print(f"Response HTTP Status: {res.status_code}")
    assert res.status_code == 201, f"Failed registration: {res.text}"
    data = res.json()

print(f"   Serial Number: #{data.get('formatted_serial')}")
print(f"   Player Name:   {data.get('player_name')}")
print(f"   Photo URL:     {data.get('photo_url')}")
print(f"   Poster Status: {data.get('poster_status')}")
print(f"   Poster URL:    {data.get('poster_url')}")
print(f"   Poster Pub ID: {data.get('poster_public_id')}")

# Verify in MongoDB
print("\n2. Verifying record directly in MongoDB...")
client = MongoClient("mongodb://localhost:27017")
db = client["sportbid_vfn"]
player = db.players.find_one({"serial_number": data.get("serial_number")})

assert player is not None, "Player not found in MongoDB!"
print("   MongoDB Document Verified:")
print(f"   - _id:              {player['_id']}")
print(f"   - serial_number:    {player['serial_number']}")
print(f"   - player_name:      {player['player_name']}")
print(f"   - photo_url:        {player.get('photo_url')}")
print(f"   - poster_status:    {player.get('poster_status')}")
print(f"   - poster_url:       {player.get('poster_url')}")
print(f"   - poster_public_id: {player.get('poster_public_id')}")

# Verify poster URL is hosted on Cloudinary
poster_url = player.get("poster_url", "")
assert "res.cloudinary.com" in poster_url, f"Poster URL is not hosted on Cloudinary: {poster_url}"
print("\n3. Verifying Cloudinary Poster URL is publicly accessible...")
with httpx.Client(timeout=15.0) as client:
    c_res = client.get(poster_url)
    print(f"   Cloudinary URL HTTP Status: {c_res.status_code}")
    print(f"   Cloudinary Content-Type:    {c_res.headers.get('content-type')}")
    print(f"   Cloudinary File Size:       {len(c_res.content)} bytes")
    assert c_res.status_code == 200, "Cloudinary poster URL returned non-200!"

print("\n" + "=" * 60)
print("SUCCESS: POSTER SAVED IN BOTH CLOUDINARY AND MONGODB!")
print("=" * 60)
