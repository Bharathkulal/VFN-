from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel


class LatestRegistrationItem(BaseModel):
    id: str
    serial_number: int
    formatted_serial: str
    player_name: str
    village: str
    playing_role: str
    phone_number: str
    photo_url: str
    poster_url: Optional[str] = None
    poster_status: Optional[str] = "generated"
    created_at: Optional[datetime] = None


class DashboardStatsResponse(BaseModel):
    total_registered_players: int
    today_registrations: int
    total_villages_represented: int = 0
    latest_registrations: List[LatestRegistrationItem] = []
    players_by_role: Dict[str, int]
    posters_generated: int
    posters_pending: int
    posters_failed: int
    tournament_name: str
