import asyncio
import argparse
import sys
import os
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.config import settings
from backend.app.core.security import hash_password
from motor.motor_asyncio import AsyncIOMotorClient


async def bootstrap_admin(username: str, email: str, password: str, full_name: str):
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    clean_email = email.strip().lower() if email else "admin@vfn.com"
    clean_username = username.strip().lower() if username else "admin"

    if not password:
        print("Error: Password is required.")
        return False

    hashed = hash_password(password)
    now = datetime.now(timezone.utc)

    # Upsert admin with both username and email
    result = await db.admin_users.update_one(
        {"$or": [{"email": clean_email}, {"username": clean_username}]},
        {
            "$set": {
                "username": clean_username,
                "email": clean_email,
                "hashed_password": hashed,
                "full_name": full_name.strip() or "Tournament Admin",
                "is_active": True,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    if result.upserted_id:
        print(f"SUCCESS: Created initial admin user '{clean_username}' / '{clean_email}' (Argon2id secured).")
    else:
        print(f"SUCCESS: Updated existing admin user '{clean_username}' / '{clean_email}' with new credentials.")

    client.close()
    return True


def main():
    parser = argparse.ArgumentParser(description="SportBid - Secure Admin Bootstrap Script")
    parser.add_argument(
        "--username",
        default="admin",
        help="Admin username (defaults to 'admin')",
    )
    parser.add_argument(
        "--email",
        default=settings.ADMIN_EMAIL,
        help="Admin email (defaults to ADMIN_EMAIL in .env)",
    )
    parser.add_argument(
        "--password",
        default="admin",
        help="Admin password (defaults to 'admin')",
    )
    parser.add_argument(
        "--name",
        default=settings.ADMIN_FULL_NAME,
        help="Admin full name",
    )

    args = parser.parse_args()
    success = asyncio.run(bootstrap_admin(args.username, args.email, args.password, args.name))
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
