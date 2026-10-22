import io
import pytest
from PIL import Image
from backend.app.services.poster_generator import (
    adjust_player_portrait,
    generate_player_poster,
)


def test_adjust_player_portrait_preserves_portrait_aspect_ratio():
    """Verify vertical portrait photos fit completely without unwanted cropping."""
    # Simulates a smartphone camera portrait photo (3:4 ratio)
    photo = Image.new("RGB", (900, 1200), (40, 100, 180))
    result = adjust_player_portrait(photo, target_w=449, target_h=384)
    assert result.size == (449, 384)
    # Target frame should be filled completely with ambient backdrop + fitted photo
    assert result.mode == "RGB"


def test_adjust_player_portrait_preserves_square_aspect_ratio():
    """Verify 1:1 square photos fit completely without unwanted cropping."""
    photo = Image.new("RGB", (1000, 1000), (180, 120, 30))
    result = adjust_player_portrait(photo, target_w=449, target_h=384)
    assert result.size == (449, 384)


def test_adjust_player_portrait_preserves_landscape_aspect_ratio():
    """Verify 16:9 landscape photos fit completely without unwanted cropping."""
    photo = Image.new("RGB", (1600, 900), (30, 180, 80))
    result = adjust_player_portrait(photo, target_w=449, target_h=384)
    assert result.size == (449, 384)


def test_generate_player_poster_with_raw_photo():
    """Verify poster generation works with raw uploaded photo image."""
    photo = Image.new("RGBA", (600, 800), (200, 150, 50, 255))
    player_doc = {
        "_id": "6ad961234567890abcdef123",
        "serial_number": 99,
        "formatted_serial": "99",
        "player_name": "TEST SPIKER",
        "village": "NALTHUR",
        "playing_role": "SPIKER",
        "phone_number": "9988776655",
        "photo_url": "",
    }
    rel_url, filepath = generate_player_poster(player_doc, raw_photo_image=photo)
    assert filepath.endswith(".png")
    assert rel_url.startswith("/uploads/posters/")

    # Verify generated poster dimensions match master template (1024 x 562)
    with Image.open(filepath) as img:
        assert img.size == (1024, 562)


def test_generate_player_poster_raises_error_when_photo_unavailable_and_fallback_disallowed():
    """Verify ValueError is raised if original photo is missing and fallback avatar is disabled."""
    player_doc = {
        "_id": "6ad961234567890abcdef123",
        "serial_number": 99,
        "formatted_serial": "99",
        "player_name": "NO PHOTO SPIKER",
        "village": "NALTHUR",
        "playing_role": "SPIKER",
        "phone_number": "9988776655",
        "photo_url": "https://example.com/nonexistent_photo_404.jpg",
    }
    with pytest.raises(ValueError, match="is missing or inaccessible"):
        generate_player_poster(player_doc, allow_fallback_avatar=False)
