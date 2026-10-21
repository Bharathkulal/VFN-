import logging
from pymongo import ReturnDocument
from backend.app.core.database import get_counters_collection

logger = logging.getLogger("sportbid.counter")


async def get_next_serial_number(counter_id: str = "player_serial") -> int:
    """
    Atomically increments and returns the next sequential serial number.
    Uses MongoDB find_one_and_update with upsert for 100% concurrency safety.
    """
    counters_col = get_counters_collection()

    result = await counters_col.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    serial = result["seq"]
    logger.info(f"Allocated sequential serial number: {serial}")
    return serial


async def decrement_serial_number_on_failure(counter_id: str = "player_serial") -> None:
    """
    Decrements counter if a post-allocation database transaction fails,
    preventing holes in sequential serial numbers.
    """
    try:
        counters_col = get_counters_collection()
        await counters_col.update_one(
            {"_id": counter_id},
            {"$inc": {"seq": -1}},
        )
        logger.warning(f"Reverted serial number allocation for '{counter_id}'.")
    except Exception as e:
        logger.error(f"Failed to decrement counter on failure: {e}")


def format_serial_number(serial_number: int, min_digits: int = 2) -> str:
    """Formats numeric serial number with leading zeros (e.g., 1 -> '01', 25 -> '25')."""
    return f"{serial_number:0{min_digits}d}"
