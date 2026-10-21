from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.database import get_tournament_collection
from backend.app.core.security import get_current_admin
from backend.app.models.tournament import (
    TournamentSettings,
    TournamentSettingsUpdate,
)

logger = logging.getLogger("vfn.tournament")
router = APIRouter(prefix="/tournament", tags=["Tournament"])


@router.get("", response_model=TournamentSettings)
async def get_tournament_details():
    """Returns official tournament details from MongoDB."""
    tourn_col = get_tournament_collection()
    doc = await tourn_col.find_one({"_id": "tournament_info"})
    if not doc:
        return TournamentSettings()

    return TournamentSettings(
        tournament_name=doc.get("tournament_name", "Volleyball Friends Nalthur Trophy 2026"),
        organizer=doc.get("organizer", "Volleyball Friends Nalthur"),
        category=doc.get("category", "Volleyball"),
        year=doc.get("year", 2026),
        ground=doc.get("ground", "Nalthur Ground"),
        rules=doc.get("rules"),
        updated_at=doc.get("updated_at"),
    )


@router.patch("", response_model=TournamentSettings)
async def update_tournament_details(
    update_data: TournamentSettingsUpdate,
    admin: dict = Depends(get_current_admin),
):
    """Admin-only endpoint to update tournament information."""
    tourn_col = get_tournament_collection()

    update_dict = {}
    if update_data.tournament_name is not None:
        update_dict["tournament_name"] = update_data.tournament_name.strip()
    if update_data.organizer is not None:
        update_dict["organizer"] = update_data.organizer.strip()
    if update_data.category is not None:
        update_dict["category"] = update_data.category.strip()
    if update_data.year is not None:
        update_dict["year"] = update_data.year
    if update_data.ground is not None:
        update_dict["ground"] = update_data.ground.strip()
    if update_data.rules is not None:
        update_dict["rules"] = update_data.rules

    if not update_dict:
        return await get_tournament_details()

    update_dict["updated_at"] = datetime.now(timezone.utc)

    await tourn_col.update_one(
        {"_id": "tournament_info"},
        {"$set": update_dict},
        upsert=True,
    )

    logger.info(f"Admin {admin.get('email')} updated tournament details: {update_dict}")
    return await get_tournament_details()
