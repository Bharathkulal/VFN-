from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends
from backend.app.core.database import get_players_collection, get_tournament_collection
from backend.app.core.security import get_current_admin
from backend.app.models.dashboard import DashboardStatsResponse, LatestRegistrationItem
from backend.app.models.player import PlayingRoleEnum

logger = logging.getLogger("vfn.dashboard")
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

    # 3. Total villages represented
    distinct_villages = await players_col.distinct("village")
    # filter out empty strings if any
    valid_villages = [v for v in distinct_villages if v and str(v).strip()]
    total_villages = len(valid_villages)

    # 4. Latest registrations (newest first, limit 6)
    latest_cursor = players_col.find().sort("created_at", -1).limit(6)
    latest_list = []
    async for p in latest_cursor:
        latest_list.append(
            LatestRegistrationItem(
                id=str(p["_id"]),
                serial_number=p.get("serial_number", 0),
                formatted_serial=f"{p.get('serial_number', 0):02d}",
                player_name=p.get("player_name", ""),
                village=p.get("village", ""),
                playing_role=p.get("playing_role", ""),
                phone_number=p.get("phone_number", ""),
                photo_url=p.get("photo_url", ""),
                created_at=p.get("created_at"),
            )
        )

    # 5. Breakdown by role
    role_counts = {role.value: 0 for role in PlayingRoleEnum}
    pipeline = [
        {"$group": {"_id": "$playing_role", "count": {"$sum": 1}}},
    ]
    cursor = players_col.aggregate(pipeline)
    async for item in cursor:
        role_name = item.get("_id")
        if role_name:
            role_counts[role_name] = item.get("count", 0)

    # 6. Poster status counts
    posters_generated = await players_col.count_documents({"poster_status": "generated"})
    posters_pending = await players_col.count_documents({"poster_status": "pending"})
    posters_failed = await players_col.count_documents({"poster_status": "failed"})

    # 7. Tournament name
    tourn_doc = await tournament_col.find_one({"_id": "tournament_info"})
    tournament_name = tourn_doc.get("tournament_name", "Volleyball Friends Nalthur Trophy 2026") if tourn_doc else "Volleyball Friends Nalthur Trophy 2026"

    return DashboardStatsResponse(
        total_registered_players=total_registered,
        today_registrations=today_count,
        total_villages_represented=total_villages,
        latest_registrations=latest_list,
        players_by_role=role_counts,
        posters_generated=posters_generated,
        posters_pending=posters_pending,
        posters_failed=posters_failed,
        tournament_name=tournament_name,
    )
