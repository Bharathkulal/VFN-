import pytest
from datetime import datetime, timezone
from backend.app.services.counter_service import format_serial_number, get_next_serial_number, is_serial_number_available
from backend.app.services.export_service import generate_players_csv, generate_players_powerpoint


def test_format_serial_number():
    assert format_serial_number(1) == "01"
    assert format_serial_number(2) == "02"
    assert format_serial_number(9) == "09"
    assert format_serial_number(10) == "10"
    assert format_serial_number(46) == "46"
    assert format_serial_number(105) == "105"


def test_generate_players_csv():
    players = [
        {
            "serial_number": 2,
            "player_name": "Test Player B",
            "village": "Nalthur",
            "playing_role": "Lifter",
            "phone_number": "9876543211",
            "poster_status": "generated",
            "poster_url": "https://res.cloudinary.com/demo/image/upload/b.png",
            "photo_url": "https://res.cloudinary.com/demo/image/upload/photo_b.png",
            "created_at": datetime(2026, 1, 15, 10, 30, tzinfo=timezone.utc),
        },
        {
            "serial_number": 1,
            "player_name": "Test Player A",
            "village": "Nalthur",
            "playing_role": "Attacker",
            "phone_number": "9876543210",
            "poster_status": "generated",
            "poster_url": "https://res.cloudinary.com/demo/image/upload/a.png",
            "photo_url": "https://res.cloudinary.com/demo/image/upload/photo_a.png",
            "created_at": datetime(2026, 1, 15, 9, 30, tzinfo=timezone.utc),
        },
    ]

    csv_output = generate_players_csv(players)
    lines = csv_output.strip().split("\r\n") if "\r\n" in csv_output else csv_output.strip().split("\n")
    assert len(lines) == 3  # Header + 2 players
    header = lines[0]
    assert "Serial #" in header and "Formatted Serial" in header and "Player Name" in header

    # Ensure player 1 is sorted before player 2
    assert "#01" in lines[1]
    assert "Test Player A" in lines[1]
    assert "#02" in lines[2]
    assert "Test Player B" in lines[2]


def test_generate_players_powerpoint():
    players = [
        {
            "serial_number": 1,
            "player_name": "RATHAN KULAL",
            "village": "NALTHUR",
            "playing_role": "All Rounder",
            "phone_number": "9876543210",
            "poster_status": "generated",
        },
        {
            "serial_number": 2,
            "player_name": "CHETHAN POOJARY",
            "village": "NALTHUR",
            "playing_role": "Attacker",
            "phone_number": "9876543211",
            "poster_status": "generated",
        },
    ]

    pptx_bytes = generate_players_powerpoint(players)
    assert isinstance(pptx_bytes, bytes)
    assert len(pptx_bytes) > 2000
    # Standard PK ZIP header for PPTX
    assert pptx_bytes[:4] == b"PK\x03\x04"
