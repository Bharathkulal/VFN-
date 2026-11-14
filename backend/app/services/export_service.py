import os
import io
import csv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from backend.app.services.counter_service import format_serial_number

logger = logging.getLogger("vfn.export")

# ─── Asset paths ────────────────────────────────────────────────────────────────
_ASSETS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
)
_POSTER_TEMPLATE_PATH = os.path.join(_ASSETS_DIR, "poster_template.png")
_SPIKER_BADGE_PATH = os.path.join(_ASSETS_DIR, "spiker_badge.png")
_KARNA_LOGO_PATH = os.path.join(_ASSETS_DIR, "karna_logo.png")
_GOLDEN_BANNER_PATH = os.path.join(_ASSETS_DIR, "golden_banner.png")

# ─── Slide design constants (inches) ────────────────────────────────────────────
# 16:9 canvas: 13.333" × 7.5"
SLIDE_W = 13.333
SLIDE_H = 7.5

# Poster template pixel dimensions for coordinate mapping
_TPL_PX_W = 1024
_TPL_PX_H = 562
_SX = SLIDE_W / _TPL_PX_W   # ≈ 0.01302 in/px
_SY = SLIDE_H / _TPL_PX_H   # ≈ 0.01335 in/px

# Design colours
_GOLD = RGBColor(255, 204, 30)
_GOLD_BORDER = RGBColor(230, 180, 50)
_GOLD_DARK = RGBColor(60, 40, 0)
_WHITE = RGBColor(245, 245, 245)
_BG_COLOR = RGBColor(8, 26, 17)
_NAME_TEXT = RGBColor(15, 15, 15)
_EMERALD = RGBColor(52, 211, 153)


def generate_players_csv(players: List[Dict[str, Any]]) -> str:
    """
    Generates CSV data for all registered players with proper serial numbering and formatting.
    Compatible with Microsoft Excel, Google Sheets, and LibreOffice.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow([
        "Serial #",
        "Formatted Serial",
        "Player Name",
        "Village",
        "Playing Role",
        "Phone Number",
        "Poster Status",
        "Poster URL",
        "Photo URL",
        "Registration Date (UTC)",
    ])

    for p in sorted(players, key=lambda x: int(x.get("serial_number", 0))):
        s_num = p.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        created_at = p.get("created_at")
        if isinstance(created_at, datetime):
            created_str = created_at.strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_str = str(created_at or "")

        writer.writerow([
            s_num,
            f"#{fmt_serial}",
            p.get("player_name", ""),
            p.get("village", ""),
            p.get("playing_role", ""),
            p.get("phone_number", ""),
            p.get("poster_status", ""),
            p.get("poster_url", "") or "",
            p.get("photo_url", "") or "",
            created_str,
        ])

    return output.getvalue()


# ─── Helper: add a styled text box ──────────────────────────────────────────────
def _add_text(
    slide,
    left: float,
    top: float,
    width: float,
    height: float,
    text: str,
    font_size: int,
    font_color: RGBColor = _GOLD,
    bold: bool = True,
    alignment=PP_ALIGN.LEFT,
    font_name: str = "Impact",
    name: str = "",
):
    """Add a native PowerPoint text box with single-run styling."""
    txbox = slide.shapes.add_textbox(
        Inches(left), Inches(top), Inches(width), Inches(height),
    )
    if name:
        txbox.name = name
    tf = txbox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    para = tf.paragraphs[0]
    para.alignment = alignment
    run = para.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = font_color
    run.font.name = font_name
    return txbox


# ─── Helper: add a gold rectangle shape ─────────────────────────────────────────
def _add_rect(
    slide,
    left: float,
    top: float,
    width: float,
    height: float,
    fill_color: Optional[RGBColor] = None,
    line_color: Optional[RGBColor] = None,
    line_width: float = 0,
    name: str = "",
):
    """Add a native rectangle shape (border, divider, backdrop)."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height),
    )
    if name:
        shape.name = name
    if fill_color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
    else:
        shape.fill.background()
    if line_color and line_width > 0:
        shape.line.fill.solid()
        shape.line.fill.fore_color.rgb = line_color
        shape.line.width = Pt(line_width)
    else:
        shape.line.fill.background()
    return shape


def _fetch_player_photo(p: Dict[str, Any]):
    """
    Fetch the raw player *photo* (not the composite poster) for embedding
    as an independent, replaceable image in the slide.
    Priority: photo_url (Cloudinary) → local disk.
    """
    s_num = p.get("serial_number", 0)
    fmt_serial = format_serial_number(s_num)

    # 1. Try photo_url (Cloudinary CDN)
    photo_url = p.get("photo_url")
    if photo_url and photo_url.startswith("http"):
        try:
            with httpx.Client(timeout=12.0) as client:
                resp = client.get(photo_url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    return p, resp.content
        except Exception as e:
            logger.warning(f"Could not download photo for player #{fmt_serial}: {e}")

    # 2. Try local disk
    try:
        from backend.app.core.config import settings
        if photo_url:
            clean_name = os.path.basename(photo_url)
            candidates = [
                os.path.join(settings.UPLOAD_DIR, "players", clean_name),
                os.path.join(settings.UPLOAD_DIR, clean_name),
            ]
            for cand in candidates:
                if os.path.isfile(cand):
                    with open(cand, "rb") as f:
                        return p, f.read()
    except Exception:
        pass

    return p, None


def generate_players_powerpoint(
    players: List[Dict[str, Any]],
    tournament_title: str = "VOLLEYBALL FRIENDS NALTHUR TROPHY - 2026",
) -> bytes:
    """
    Generates a fully editable 16:9 widescreen PowerPoint presentation (.pptx)
    for tournament player auction bidding.

    Every element on each slide is a native PowerPoint object — text boxes,
    shapes, and separate images — so that the user can individually select,
    edit, move, or replace any part in Microsoft PowerPoint.

    - One player per slide
    - Black & Gold tournament design using native shapes and text boxes
    - Player photos as independently replaceable images
    - Labels and values as individually editable text boxes
    - Decorative borders/dividers as editable shape objects
    """
    from concurrent.futures import ThreadPoolExecutor

    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    blank_layout = prs.slide_layouts[6]

    sorted_players = sorted(players, key=lambda x: int(x.get("serial_number", 0)))

    # ── Fetch player *photos* concurrently ──────────────────────────────────
    with ThreadPoolExecutor(max_workers=10) as executor:
        fetched_results = list(executor.map(_fetch_player_photo, sorted_players))

    fetched_results.sort(key=lambda x: int(x[0].get("serial_number", 0)))

    # ── Pre-load reusable asset files into memory ───────────────────────────
    def _read_asset(path: str) -> Optional[bytes]:
        if os.path.isfile(path):
            try:
                with open(path, "rb") as f:
                    return f.read()
            except Exception:
                pass
        return None

    spiker_badge_bytes = _read_asset(_SPIKER_BADGE_PATH)
    karna_logo_bytes = _read_asset(_KARNA_LOGO_PATH)
    golden_banner_bytes = _read_asset(_GOLDEN_BANNER_PATH)
    poster_template_bytes = _read_asset(_POSTER_TEMPLATE_PATH)

    # ── Build slides ────────────────────────────────────────────────────────
    for p_data, photo_bytes in fetched_results:
        s_num = p_data.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        player_name = (p_data.get("player_name") or "VOLLEYBALL PLAYER").strip().upper()
        village = (p_data.get("village") or "NALTHUR").strip().upper()
        role = (p_data.get("playing_role") or "PLAYER").strip().upper()
        phone = (p_data.get("phone_number") or "").strip()
        phone_display = f"+91 {phone}" if phone and not phone.startswith("+") else phone

        slide = prs.slides.add_slide(blank_layout)

        # ── 1. Background fill ──────────────────────────────────────────────
        bg = slide.background
        bg_fill = bg.fill
        bg_fill.solid()
        bg_fill.fore_color.rgb = _BG_COLOR

        # ── 2. Poster template as background image (editable / replaceable) ─
        if poster_template_bytes:
            try:
                slide.shapes.add_picture(
                    io.BytesIO(poster_template_bytes),
                    Inches(0), Inches(0),
                    width=Inches(SLIDE_W), height=Inches(SLIDE_H),
                ).name = "Background Template"
            except Exception as e:
                logger.warning(f"Could not add poster template to slide #{fmt_serial}: {e}")

        # ── 3. Gold outer border frame ──────────────────────────────────────
        _add_rect(
            slide,
            left=0.1, top=0.1,
            width=SLIDE_W - 0.2, height=SLIDE_H - 0.2,
            fill_color=None,
            line_color=_GOLD_BORDER,
            line_width=3,
            name="Gold Border Frame",
        )

        # ── 4. Player photo (independently replaceable) ────────────────────
        # Photo frame area mapped from poster template: (28, 98) → (477, 482)
        photo_left = 28 * _SX    # ≈ 0.36"
        photo_top = 98 * _SY     # ≈ 1.31"
        photo_w = 449 * _SX      # ≈ 5.85"
        photo_h = 384 * _SY      # ≈ 5.13"

        if photo_bytes:
            try:
                pic = slide.shapes.add_picture(
                    io.BytesIO(photo_bytes),
                    Inches(photo_left), Inches(photo_top),
                    width=Inches(photo_w), height=Inches(photo_h),
                )
                pic.name = f"Player Photo #{fmt_serial}"
            except Exception as e:
                logger.warning(f"Could not add player photo to slide #{fmt_serial}: {e}")
                photo_bytes = None

        if not photo_bytes:
            # Dark placeholder rectangle where the photo would go
            placeholder = _add_rect(
                slide,
                left=photo_left, top=photo_top,
                width=photo_w, height=photo_h,
                fill_color=RGBColor(10, 36, 22),
                line_color=_GOLD_BORDER,
                line_width=2,
                name=f"Photo Placeholder #{fmt_serial}",
            )
            _add_text(
                slide,
                left=photo_left + 0.5, top=photo_top + photo_h / 2 - 0.3,
                width=photo_w - 1.0, height=0.6,
                text="Photo Not Available",
                font_size=20, font_color=_WHITE,
                alignment=PP_ALIGN.CENTER,
                font_name="Arial",
                name="Photo Placeholder Text",
            )

        # ── 5. Gold photo frame border ──────────────────────────────────────
        _add_rect(
            slide,
            left=photo_left - 0.04, top=photo_top - 0.04,
            width=photo_w + 0.08, height=photo_h + 0.08,
            fill_color=None,
            line_color=_GOLD_BORDER,
            line_width=3,
            name="Photo Frame Border",
        )

        # ── 6. Golden name banner (shape) ───────────────────────────────────
        # Banner area mapped from template: roughly x=505-765, y=112-175
        banner_left = 505 * _SX  # ≈ 6.58"
        banner_top = 112 * _SY   # ≈ 1.50"
        banner_w = 260 * _SX     # ≈ 3.39"
        banner_h = 63 * _SY      # ≈ 0.84"

        if golden_banner_bytes:
            try:
                banner_pic = slide.shapes.add_picture(
                    io.BytesIO(golden_banner_bytes),
                    Inches(banner_left), Inches(banner_top),
                    width=Inches(banner_w), height=Inches(banner_h),
                )
                banner_pic.name = "Golden Name Banner"
            except Exception:
                _add_rect(
                    slide,
                    left=banner_left, top=banner_top,
                    width=banner_w, height=banner_h,
                    fill_color=_GOLD,
                    name="Golden Name Banner",
                )
        else:
            _add_rect(
                slide,
                left=banner_left, top=banner_top,
                width=banner_w, height=banner_h,
                fill_color=_GOLD,
                name="Golden Name Banner",
            )

        # ── 7. Player name text (on banner) ────────────────────────────────
        # Dynamically reduce font size for long names
        name_font_size = 28
        if len(player_name) > 18:
            name_font_size = 22
        if len(player_name) > 25:
            name_font_size = 18

        _add_text(
            slide,
            left=banner_left + 0.05, top=banner_top + 0.05,
            width=banner_w - 0.1, height=banner_h - 0.1,
            text=player_name,
            font_size=name_font_size,
            font_color=_NAME_TEXT,
            bold=True,
            alignment=PP_ALIGN.CENTER,
            font_name="Impact",
            name=f"Player Name",
        )

        # ── 8. Tournament title text ────────────────────────────────────────
        _add_text(
            slide,
            left=0.3, top=0.15,
            width=SLIDE_W - 0.6, height=0.65,
            text=tournament_title,
            font_size=22,
            font_color=_GOLD,
            bold=True,
            alignment=PP_ALIGN.CENTER,
            font_name="Impact",
            name="Tournament Title",
        )

        # ── 9. Metadata section (right side) ───────────────────────────────
        # Mapped from poster template pixel coordinates
        meta_x = 580 * _SX       # ≈ 7.55"
        meta_w = 4.8              # width of metadata text area
        label_h = 0.3
        value_h = 0.55

        # Row 1: SERIAL NUMBER
        row1_label_y = 186 * _SY  # ≈ 2.48"
        row1_value_y = 202 * _SY  # ≈ 2.70"
        _add_text(slide, meta_x, row1_label_y, meta_w, label_h,
                  "SERIAL NUMBER", 14, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Serial Number")
        _add_text(slide, meta_x, row1_value_y, meta_w, value_h,
                  f"#{fmt_serial}", 48, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Serial Number Value")

        # Gold divider after serial number
        div1_y = 254 * _SY
        _add_rect(slide, meta_x, div1_y, 3.5, 0.025, _GOLD, name="Divider 1")

        # Row 2: VILLAGE
        row2_label_y = 258 * _SY
        row2_value_y = 274 * _SY
        _add_text(slide, meta_x, row2_label_y, meta_w, label_h,
                  "VILLAGE", 14, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Village")
        _add_text(slide, meta_x, row2_value_y, meta_w, value_h,
                  village, 34, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Village Value")

        # Gold divider after village
        div2_y = 328 * _SY
        _add_rect(slide, meta_x, div2_y, 3.5, 0.025, _GOLD, name="Divider 2")

        # Row 3: ROLE
        row3_label_y = 330 * _SY
        row3_value_y = 346 * _SY
        _add_text(slide, meta_x, row3_label_y, meta_w, label_h,
                  "ROLE", 14, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Role")
        _add_text(slide, meta_x, row3_value_y, meta_w, value_h,
                  role, 34, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Role Value")

        # Gold divider after role
        div3_y = 405 * _SY
        _add_rect(slide, meta_x, div3_y, 3.5, 0.025, _GOLD, name="Divider 3")

        # Row 4: PHONE
        row4_label_y = 404 * _SY
        row4_value_y = 420 * _SY
        _add_text(slide, meta_x, row4_label_y, meta_w, label_h,
                  "PHONE", 14, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Phone")
        _add_text(slide, meta_x, row4_value_y, meta_w, value_h,
                  phone_display, 32, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Phone Value")

        # ── 10. Spiker badge (independently replaceable image) ──────────────
        if spiker_badge_bytes:
            try:
                badge_left = 0
                badge_top = 380 * _SY  # ≈ 5.07"
                badge_w = 140 * _SX    # ≈ 1.82"
                badge_h = 140 * _SY    # ≈ 1.87"
                badge_pic = slide.shapes.add_picture(
                    io.BytesIO(spiker_badge_bytes),
                    Inches(badge_left), Inches(badge_top),
                    width=Inches(badge_w), height=Inches(badge_h),
                )
                badge_pic.name = "Spiker Badge"
            except Exception as e:
                logger.warning(f"Could not add spiker badge to slide #{fmt_serial}: {e}")

        # ── 11. Karna Creation logo (independently replaceable) ─────────────
        if karna_logo_bytes:
            try:
                logo_w = 1.8
                logo_h = 1.2
                logo_left = SLIDE_W - logo_w - 0.3
                logo_top = SLIDE_H - logo_h - 0.2
                logo_pic = slide.shapes.add_picture(
                    io.BytesIO(karna_logo_bytes),
                    Inches(logo_left), Inches(logo_top),
                    width=Inches(logo_w), height=Inches(logo_h),
                )
                logo_pic.name = "Karna Creation Logo"
            except Exception as e:
                logger.warning(f"Could not add Karna logo to slide #{fmt_serial}: {e}")

    out = io.BytesIO()
    prs.save(out)
    out.seek(0)
    return out.getvalue()
