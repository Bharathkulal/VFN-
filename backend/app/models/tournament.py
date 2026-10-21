from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TournamentSettings(BaseModel):
    tournament_name: str = "Volleyball Friends Nalthur Trophy 2026"
    organizer: str = "Volleyball Friends Nalthur"
    category: str = "Volleyball"
    year: int = 2026
    ground: Optional[str] = "Nalthur Ground"
    rules: Optional[str] = None
    updated_at: Optional[datetime] = None


class TournamentSettingsUpdate(BaseModel):
    tournament_name: Optional[str] = Field(None, min_length=3, max_length=120)
    organizer: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    year: Optional[int] = Field(None, ge=2024, le=2100)
    ground: Optional[str] = Field(None, max_length=100)
    rules: Optional[str] = None
