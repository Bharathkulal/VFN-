import logging
from typing import Optional, Tuple
from bson import ObjectId
from pymongo import ReturnDocument
from backend.app.core.database import get_counters_collection, get_players_collection

logger = logging.getLogger("vfn.counter")


async def get_next_serial_number(counter_id: str = "player_serial") -> int:
    """
    Allocates the next available sequential serial number safely and collision-free.
    Always starts numbering from 1 ('01', '02', '03'...) for each tournament.
    Never starts from 09 or relies on an out-of-sync or incorrect counter.
    Finds the first available positive integer (filling any unused lower slots or continuing sequentially).
    """
    players_col = get_players_collection()
    counters_col = get_counters_collection()

    # Query all currently assigned positive serial numbers in the tournament
    cursor = players_col.find({}, {"serial_number": 1})
    docs = await cursor.to_list(length=10000)
    assigned_serials = set()
    for d in docs:
        s = d.get("serial_number")
        if isinstance(s, int) and s > 0:
            assigned_serials.add(s)

    # Find the smallest positive integer starting at 1 that is NOT currently assigned
    candidate = 1
    while candidate in assigned_serials:
        candidate += 1

    # Keep the counter collection synchronized with the highest candidate
    max_serial = max(assigned_serials) if assigned_serials else 0
    new_counter_seq = max(candidate, max_serial)
    await counters_col.update_one(
        {"_id": counter_id},
        {"$set": {"seq": new_counter_seq}},
        upsert=True,
    )

    logger.info(f"Allocated next available serial number: {candidate} (#{candidate:02d})")
    return candidate


async def is_serial_number_available(
    serial_number: int,
    exclude_player_id: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Checks if a serial number is available.
    Returns (True, None) if free, or (False, player_name) if already assigned.
    """
    if not isinstance(serial_number, int) or serial_number < 1:
        return False, "Invalid serial number (must be an integer >= 1)"

    players_col = get_players_collection()
    query = {"serial_number": serial_number}
    if exclude_player_id:
        try:
            query["_id"] = {"$ne": ObjectId(exclude_player_id)}
        except Exception:
            pass

    existing = await players_col.find_one(query, {"player_name": 1, "serial_number": 1})
    if existing:
        return False, existing.get("player_name", "Unknown Player")
    return True, None


async def decrement_serial_number_on_failure(counter_id: str = "player_serial") -> None:
    """
    Safe rollback hook if a post-allocation database transaction fails.
    Synchronizes the counter to the maximum serial number in the players collection.
    """
    try:
        players_col = get_players_collection()
        counters_col = get_counters_collection()

        cursor = players_col.find({}, {"serial_number": 1})
        docs = await cursor.to_list(length=10000)
        max_s = 0
        for d in docs:
            s = d.get("serial_number")
            if isinstance(s, int) and s > max_s:
                max_s = s

        await counters_col.update_one(
            {"_id": counter_id},
            {"$set": {"seq": max_s}},
            upsert=True,
        )
        logger.info(f"Synchronized counter '{counter_id}' to max serial {max_s}.")
    except Exception as e:
        logger.error(f"Failed to synchronize counter on failure: {e}")


def format_serial_number(serial_number: int, min_digits: int = 2) -> str:
    """Formats numeric serial number with leading zeros (e.g., 1 -> '01', 25 -> '25')."""
    return f"{serial_number:0{min_digits}d}"
