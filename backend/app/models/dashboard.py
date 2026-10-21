from typing import Dict
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_registered_players: int
    today_registrations: int
    players_by_role: Dict[str, int]
    posters_generated: int
    posters_pending: int
    posters_failed: int
    tournament_name: str
