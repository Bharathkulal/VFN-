from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator
import re


class PlayingRoleEnum(str, Enum):
    SETTER = "Setter"
    ATTACKER = "Attacker"
    SPIKER = "Attacker"  # Backward compatibility alias
    MIDDLE_BLOCKER = "Middle Blocker"
    LIBERO = "Libero"
    ALL_ROUNDER = "All-rounder"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            clean = value.strip().lower()
            if clean == "spiker":
                return cls.ATTACKER
            for m in cls:
                if m.value.lower() == clean:
                    return m
        return super()._missing_(value)


class PosterStatusEnum(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    FAILED = "failed"


class PlayerBase(BaseModel):
    player_name: str = Field(..., min_length=2, max_length=60)
    village: str = Field(..., min_length=2, max_length=60)
    playing_role: PlayingRoleEnum
    phone_number: str = Field(..., min_length=10, max_length=15)

    @field_validator("player_name", "village")
    @classmethod
    def strip_and_validate_string(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Field must contain at least 2 non-whitespace characters.")
        return cleaned

    @field_validator("phone_number")
    @classmethod
    def validate_indian_phone(cls, v: str) -> str:
        # Strip all whitespace, dashes, parentheses
        digits = re.sub(r"[\s\-\(\)]", "", v)
        if digits.startswith("+91"):
            digits = digits[3:]
        elif digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            digits = digits[1:]

        if not re.match(r"^[6-9]\d{9}$", digits):
            raise ValueError("Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return digits


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(BaseModel):
    serial_number: Optional[int] = Field(None, ge=1, description="Official sequential serial number")
    player_name: Optional[str] = Field(None, min_length=2, max_length=60)
    village: Optional[str] = Field(None, min_length=2, max_length=60)
    playing_role: Optional[PlayingRoleEnum] = None
    phone_number: Optional[str] = Field(None, min_length=10, max_length=15)
    poster_status: Optional[PosterStatusEnum] = None
    poster_url: Optional[str] = None

    @field_validator("player_name", "village")
    @classmethod
    def strip_optional_string(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) < 2:
                raise ValueError("Field must contain at least 2 non-whitespace characters.")
            return cleaned
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_optional_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            digits = re.sub(r"[\s\-\(\)]", "", v)
            if digits.startswith("+91"):
                digits = digits[3:]
            elif digits.startswith("91") and len(digits) == 12:
                digits = digits[2:]
            elif digits.startswith("0") and len(digits) == 11:
                digits = digits[1:]

            if not re.match(r"^[6-9]\d{9}$", digits):
                raise ValueError("Must be a valid 10-digit Indian mobile number.")
            return digits
        return v


class PlayerResponse(BaseModel):
    id: str
    serial_number: int
    formatted_serial: str
    player_name: str
    village: str
    playing_role: str
    phone_number: str
    photo_url: str
    photo_public_id: Optional[str] = None
    poster_status: str
    poster_url: Optional[str] = None
    poster_public_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PlayerListResponse(BaseModel):
    players: List[PlayerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
