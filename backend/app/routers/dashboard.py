from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends
from backend.app.core.database import get_players_collection, get_tournament_collection
from backend.app.core.security import get_current_admin
from backend.app.models.dashboard import DashboardStatsResponse
from backend.app.models.player import PlayingRoleEnum

logger = logging.getLogger("sportbid.dashboard")
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_statistics(
    admin: dict = Depends(get_current_admin),
):
    """
    Computes and returns real-time tournament registration statistics from MongoDB.
    """
    players_col = get_players_collection()
    tournament_col = get_tournament_collection()

    # 1. Total players count
    total_registered = await players_col.count_documents({})

    # 2. Today's registrations count (from 00:00:00 UTC today)
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    today_count = await players_col.count_documents({"created_at": {"$gte": start_of_today}})

    # 3. Breakdown by role
    role_counts = {role.value: 0 for role in PlayingRoleEnum}
    pipeline = [
        {"$group": {"_id": "$playing_role", "count": {"$sum": 1}}},
    ]
    cursor = players_col.aggregate(pipeline)
    async for item in cursor:
        role_name = item.get("_id")
        if role_name:
            role_counts[role_name] = item.get("count", 0)

    # 4. Poster status counts
    posters_generated = await players_col.count_documents({"poster_status": "generated"})
    posters_pending = await players_col.count_documents({"poster_status": "pending"})
    posters_failed = await players_col.count_documents({"poster_status": "failed"})

    # 5. Tournament name
    tourn_doc = await tournament_col.find_one({"_id": "tournament_info"})
    tournament_name = tourn_doc.get("tournament_name", "Volleyball Friends Nalthur Trophy 2026") if tourn_doc else "Volleyball Friends Nalthur Trophy 2026"

    return DashboardStatsResponse(
        total_registered_players=total_registered,
        today_registrations=today_count,
        players_by_role=role_counts,
        posters_generated=posters_generated,
        posters_pending=posters_pending,
        posters_failed=posters_failed,
        tournament_name=tournament_name,
    )
