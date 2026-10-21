import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel
from backend.app.core.config import settings

logger = logging.getLogger("sportbid.database")


class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db_instance = Database()


async def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db


async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL} (db: {settings.DATABASE_NAME})...")
    db_instance.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
    )
    db_instance.db = db_instance.client[settings.DATABASE_NAME]

    # Verify connection
    await db_instance.client.admin.command("ping")
    logger.info("Successfully connected to MongoDB.")

    # Initialize collections and indexes
    await init_db_indexes()


async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


async def init_db_indexes():
    """Ensure all required collections and unique/performance indexes exist."""
    db = db_instance.db

    try:
        # Players collection indexes
        player_indexes = [
            IndexModel([("serial_number", ASCENDING)], unique=True, name="idx_players_serial_unique"),
            IndexModel([("created_at", DESCENDING)], name="idx_players_created_at"),
            IndexModel([("village", ASCENDING)], name="idx_players_village"),
            IndexModel([("playing_role", ASCENDING)], name="idx_players_role"),
            IndexModel([("player_name", ASCENDING)], name="idx_players_name"),
        ]
        await db.players.create_indexes(player_indexes)
        logger.info("Player collection indexes verified.")

        # Admin users collection indexes
        admin_indexes = [
            IndexModel([("email", ASCENDING)], unique=True, name="idx_admins_email_unique"),
        ]
        await db.admin_users.create_indexes(admin_indexes)
        logger.info("Admin collection indexes verified.")

        # Counter collection default seed
        counter_doc = await db.counters.find_one({"_id": "player_serial"})
        if not counter_doc:
            await db.counters.insert_one({"_id": "player_serial", "seq": 0})
            logger.info("Initialized player_serial atomic counter in counters collection.")

        # Default tournament settings seed
        tournament_doc = await db.tournament_settings.find_one({"_id": "tournament_info"})
        if not tournament_doc:
            await db.tournament_settings.insert_one({
                "_id": "tournament_info",
                "tournament_name": "Volleyball Friends Nalthur Trophy 2026",
                "organizer": "Volleyball Friends Nalthur",
                "category": "Volleyball",
                "year": 2026,
                "ground": "Nalthur Ground",
            })
            logger.info("Seeded initial tournament settings.")

    except Exception as e:
        logger.error(f"Error initializing database indexes/seeds: {e}", exc_info=True)
        raise e


# Helper collection getters
def get_players_collection():
    return db_instance.db.players


def get_admins_collection():
    return db_instance.db.admin_users


def get_counters_collection():
    return db_instance.db.counters


def get_tournament_collection():
    return db_instance.db.tournament_settings
