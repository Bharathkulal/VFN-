"""
Export service providing CSV and native editable PowerPoint presentation (.pptx)
generation for players in the Volleyball Friends Nalthur (VFN) tournament.
"""
import io
import os
import csv
import logging
import urllib.request
from typing import List, Dict, Any, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
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
_CLEAN_METADATA_PANEL_PATH = os.path.join(_ASSETS_DIR, "clean_metadata_panel.png")

# ─── Slide design constants (inches) ────────────────────────────────────────────
# 16:9 widescreen canvas: 13.333" × 7.5"
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
    Exports registered players into a clean CSV format for tournament administration.
    Preserves exact formatted serial numbers (#01, #02...).
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Serial Number",
        "Player Name",
        "Village / Club",
        "Playing Role",
        "Mobile Number",
        "Poster Status",
        "Poster Link",
        "Registered On",
    ])

    sorted_players = sorted(players, key=lambda x: int(x.get("serial_number", 0)))

    for p in sorted_players:
        s_num = p.get("serial_number", 0)
        fmt_serial = f"#{format_serial_number(s_num)}"
        name = p.get("player_name", "")
        village = p.get("village", "")
        role = p.get("playing_role", "")
        phone = p.get("phone_number", "")
        status = p.get("poster_status", "pending")
        poster_url = p.get("poster_url", "")
        created_at = p.get("created_at")

        date_str = ""
        if isinstance(created_at, datetime):
            date_str = created_at.strftime("%Y-%m-%d %H:%M:%S")
        elif created_at:
            date_str = str(created_at)

        writer.writerow([
            fmt_serial,
            name,
            village,
            role,
            phone,
            status,
            poster_url,
            date_str,
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
    bg_color: Optional[RGBColor] = None,
):
    """Add a native PowerPoint text box with single-run styling and tight margins."""
    txbox = slide.shapes.add_textbox(
        Inches(left), Inches(top), Inches(width), Inches(height),
    )
    if name:
        txbox.name = name

    if bg_color:
        txbox.fill.solid()
        txbox.fill.fore_color.rgb = bg_color
        txbox.line.fill.background()
    else:
        txbox.fill.background()
        txbox.line.fill.background()

    tf = txbox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)

    para = tf.paragraphs[0]
    para.alignment = alignment
    run = para.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = font_color
    run.font.name = font_name
    return txbox


# ─── Helper: add a rectangle shape ──────────────────────────────────────────────
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
    """Add a native PowerPoint rectangle shape."""
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


# ─── Helper: add a rounded rectangle shape (photo border) ───────────────────────
def _add_rounded_rect(
    slide,
    left: float,
    top: float,
    width: float,
    height: float,
    line_color: RGBColor = _GOLD_BORDER,
    line_width: float = 3,
    name: str = "",
):
    """Add an elegant rounded rectangle border for the player photo frame."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height),
    )
    if name:
        shape.name = name
    shape.fill.background()
    shape.line.fill.solid()
    shape.line.fill.fore_color.rgb = line_color
    shape.line.width = Pt(line_width)
    try:
        shape.adjustments[0] = 0.05
    except Exception:
        pass
    return shape


def _normalize_image_for_pptx(img_bytes: bytes) -> bytes:
    """
    Ensure the image bytes are in a format natively supported by PowerPoint (JPEG or PNG).
    Converts unsupported formats such as WEBP or MPO to JPEG.
    """
    try:
        im = Image.open(io.BytesIO(img_bytes))
        if im.format in ("JPEG", "PNG"):
            return img_bytes
        im_rgb = im.convert("RGB")
        out = io.BytesIO()
        im_rgb.save(out, format="JPEG", quality=95)
        return out.getvalue()
    except Exception as e:
        logger.warning(f"Could not convert image format: {e}")
        return img_bytes


def _fetch_player_photo(p: Dict[str, Any]):
    """
    Fetch the raw player photo for embedding as an independent, replaceable image.
    Priority: photo_url (Cloudinary / HTTP) → local upload path → fallback extraction from poster.
    """
    s_num = p.get("serial_number", 0)
    fmt_serial = format_serial_number(s_num)

    # 1. Try photo_url via urllib (Cloudinary CDN or HTTP URL)
    photo_url = p.get("photo_url")
    if photo_url and photo_url.startswith("http"):
        try:
            req = urllib.request.Request(photo_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = resp.read()
                if len(data) > 1000:
                    return p, _normalize_image_for_pptx(data)
        except Exception as e:
            logger.warning(f"Could not download photo for player #{fmt_serial} from {photo_url}: {e}")

    # 2. Try local disk path if photo_url is a relative local path
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
                        return p, _normalize_image_for_pptx(f.read())
    except Exception:
        pass

    # 3. Fallback: extract original player photo frame from generated poster_url
    poster_url = p.get("poster_url")
    if poster_url and poster_url.startswith("http"):
        try:
            req = urllib.request.Request(poster_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                poster_data = resp.read()
                if len(poster_data) > 5000:
                    poster_img = Image.open(io.BytesIO(poster_data))
                    # Photo frame in official 1024x562 poster: (28, 98, 477, 482)
                    photo_crop = poster_img.crop((28, 98, 477, 482))
                    out = io.BytesIO()
                    photo_crop.save(out, format="JPEG", quality=95)
                    return p, out.getvalue()
        except Exception as e:
            logger.warning(f"Could not extract photo fallback from poster for #{fmt_serial}: {e}")

    return p, None


def _get_master_canvas_bytes() -> Optional[bytes]:
    """
    Builds or retrieves the master background canvas image.
    Preserves all official poster template artwork (outer gold borders, crests,
    decorative ornaments, badges) while clearing the player photo area, metadata panel,
    and tournament title area so native PowerPoint editable text boxes, photos,
    and shapes render seamlessly without static text showing through.
    """
    if not os.path.isfile(_POSTER_TEMPLATE_PATH):
        return None

    try:
        tpl = Image.open(_POSTER_TEMPLATE_PATH).convert("RGB")
        clean_tpl = tpl.copy()

        # 1. Clear photo frame area (x=28..477, y=98..482) with the dark tournament color
        bg_dark = (8, 26, 17)
        for x in range(28, 478):
            for y in range(98, 483):
                clean_tpl.putpixel((x, y), bg_dark)

        # 2. Paste clean metadata panel (with icons, dividers, but NO static player values)
        if os.path.isfile(_CLEAN_METADATA_PANEL_PATH):
            clean_meta = Image.open(_CLEAN_METADATA_PANEL_PATH).convert("RGB")
            clean_tpl.paste(clean_meta, (500, 160))

        # 3. Paste golden name banner
        if os.path.isfile(_GOLDEN_BANNER_PATH):
            golden_banner = Image.open(_GOLDEN_BANNER_PATH).convert("RGB")
            clean_tpl.paste(golden_banner, (500, 110))

        # 4. Clear the title area (x=215..855, y=22..52) so editable native title displays cleanly
        title_bg_dark = (0, 16, 28)
        for x in range(215, 855):
            for y in range(22, 52):
                clean_tpl.putpixel((x, y), title_bg_dark)

        buf = io.BytesIO()
        clean_tpl.save(buf, format="PNG", quality=95)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Error creating master canvas: {e}")
        # Fallback to reading raw template
        try:
            with open(_POSTER_TEMPLATE_PATH, "rb") as f:
                return f.read()
        except Exception:
            return None


def generate_players_powerpoint(
    players: List[Dict[str, Any]],
    tournament_title: str = "VOLLEYBALL FRIENDS NALTHUR TROPHY - 2026",
) -> bytes:
    """
    Generates a fully editable 16:9 widescreen PowerPoint presentation (.pptx)
    for tournament player auction bidding.

    Every element on each slide is a native PowerPoint object:
    - Text boxes: Player Name, Serial Number (#01...), Village, Role, Phone Number, Tournament Title
    - Replaceable Images: Player Photo, Spiker Badge, Karna Creation Logo
    - Shapes: Gold border frame, photo frame border, metadata divider lines

    This enables administrators to select, double-click to edit, reposition, or
    right-click -> 'Change Picture' on any element directly inside Microsoft PowerPoint.
    """
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    blank_layout = prs.slide_layouts[6]

    sorted_players = sorted(players, key=lambda x: int(x.get("serial_number", 0)))

    # Fetch player photos concurrently using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=8) as executor:
        fetched_results = list(executor.map(_fetch_player_photo, sorted_players))

    fetched_results.sort(key=lambda x: int(x[0].get("serial_number", 0)))

    # Pre-generate master background canvas and pre-read assets
    master_canvas_bytes = _get_master_canvas_bytes()

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

    for p_data, photo_bytes in fetched_results:
        s_num = p_data.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        player_name = (p_data.get("player_name") or "VOLLEYBALL PLAYER").strip().upper()
        village = (p_data.get("village") or "NALTHUR").strip().upper()
        role = (p_data.get("playing_role") or "PLAYER").strip().upper()
        if role == "SPIKER":
            role = "ATTACKER"
        phone = (p_data.get("phone_number") or "").strip()
        phone_display = f"+91 {phone}" if phone and not phone.startswith("+") else (phone or "N/A")

        slide = prs.slides.add_slide(blank_layout)

        # ── 1. Deep tournament emerald black background ─────────────────────
        bg = slide.background
        bg_fill = bg.fill
        bg_fill.solid()
        bg_fill.fore_color.rgb = _BG_COLOR

        # ── 2. Master background canvas (preserves tournament frame / motifs) ─
        if master_canvas_bytes:
            try:
                slide.shapes.add_picture(
                    io.BytesIO(master_canvas_bytes),
                    Inches(0), Inches(0),
                    width=Inches(SLIDE_W), height=Inches(SLIDE_H),
                ).name = "Background Canvas"
            except Exception as e:
                logger.warning(f"Could not add background canvas for #{fmt_serial}: {e}")

        # ── 3. Gold outer border frame (editable PowerPoint shape) ──────────
        _add_rect(
            slide,
            left=0.1, top=0.1,
            width=SLIDE_W - 0.2, height=SLIDE_H - 0.2,
            fill_color=None,
            line_color=_GOLD_BORDER,
            line_width=3,
            name="Gold Border Frame",
        )

        # ── 4. Player Photo (independent replaceable picture object) ────────
        # Frame coordinates in 16:9 canvas: x=0.365", y=1.308", w=5.846", h=5.125"
        photo_left = 28 * _SX    # ≈ 0.365"
        photo_top = 98 * _SY     # ≈ 1.308"
        photo_w = 449 * _SX      # ≈ 5.846"
        photo_h = 384 * _SY      # ≈ 5.125"

        if photo_bytes:
            try:
                pic = slide.shapes.add_picture(
                    io.BytesIO(photo_bytes),
                    Inches(photo_left), Inches(photo_top),
                    width=Inches(photo_w), height=Inches(photo_h),
                )
                pic.name = f"Player Photo #{fmt_serial}"
            except Exception as e:
                logger.warning(f"Could not add player photo picture for #{fmt_serial}: {e}")
                photo_bytes = None

        if not photo_bytes:
            _add_rect(
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

        # ── 5. Gold photo frame border (editable rounded rectangle shape) ───
        _add_rounded_rect(
            slide,
            left=photo_left - 0.04, top=photo_top - 0.04,
            width=photo_w + 0.08, height=photo_h + 0.08,
            line_color=_GOLD_BORDER,
            line_width=3,
            name="Photo Frame Border",
        )

        # ── 6. Golden Name Banner (shape / picture) ─────────────────────────
        banner_left = 505 * _SX  # ≈ 6.575"
        banner_top = 112 * _SY   # ≈ 1.495"
        banner_w = 260 * _SX     # ≈ 3.385"
        banner_h = 63 * _SY      # ≈ 0.841"

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

        # ── 7. Player Name (editable PowerPoint text box) ───────────────────
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
            name="Player Name",
        )

        # ── 8. Tournament Title (editable PowerPoint text box) ──────────────
        _add_text(
            slide,
            left=2.6, top=0.25,
            width=8.13, height=0.55,
            text=tournament_title,
            font_size=24,
            font_color=_GOLD,
            bold=True,
            alignment=PP_ALIGN.CENTER,
            font_name="Impact",
            name="Tournament Title",
        )

        # ── 9. Metadata Section (editable PowerPoint text boxes) ────────────
        meta_x = 580 * _SX       # ≈ 7.552"
        meta_w = 4.2
        label_h = 0.28
        value_h = 0.55

        # Row 1: SERIAL NUMBER
        row1_label_y = 186 * _SY  # ≈ 2.482"
        row1_value_y = 202 * _SY  # ≈ 2.696"
        _add_text(slide, meta_x, row1_label_y, meta_w, label_h,
                  "SERIAL NUMBER", 13, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Serial Number")
        _add_text(slide, meta_x, row1_value_y, meta_w, value_h,
                  f"#{fmt_serial}", 46, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Serial Number Value")

        # Divider 1
        _add_rect(slide, meta_x, 254 * _SY, 3.5, 0.025, _GOLD, name="Divider 1")

        # Row 2: VILLAGE
        row2_label_y = 258 * _SY  # ≈ 3.443"
        row2_value_y = 274 * _SY  # ≈ 3.657"
        _add_text(slide, meta_x, row2_label_y, meta_w, label_h,
                  "VILLAGE", 13, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Village")
        _add_text(slide, meta_x, row2_value_y, meta_w, value_h,
                  village, 34, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Village Value")

        # Divider 2
        _add_rect(slide, meta_x, 328 * _SY, 3.5, 0.025, _GOLD, name="Divider 2")

        # Row 3: ROLE
        row3_label_y = 330 * _SY  # ≈ 4.404"
        row3_value_y = 346 * _SY  # ≈ 4.617"
        _add_text(slide, meta_x, row3_label_y, meta_w, label_h,
                  "ROLE", 13, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Role")
        _add_text(slide, meta_x, row3_value_y, meta_w, value_h,
                  role, 34, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Role Value")

        # Divider 3
        _add_rect(slide, meta_x, 405 * _SY, 3.5, 0.025, _GOLD, name="Divider 3")

        # Row 4: PHONE
        row4_label_y = 404 * _SY  # ≈ 5.391"
        row4_value_y = 420 * _SY  # ≈ 5.605"
        _add_text(slide, meta_x, row4_label_y, meta_w, label_h,
                  "PHONE", 13, _WHITE, True, PP_ALIGN.LEFT, "Arial", "Label Phone")
        _add_text(slide, meta_x, row4_value_y, meta_w, value_h,
                  phone_display, 32, _GOLD, True, PP_ALIGN.LEFT, "Impact", "Phone Value")

        # ── 10. Spiker badge (independent replaceable image) ────────────────
        if spiker_badge_bytes:
            try:
                badge_left = 0
                badge_top = 380 * _SY  # ≈ 5.071"
                badge_w = 120 * _SX    # ≈ 1.562"
                badge_h = 140 * _SY    # ≈ 1.868"
                badge_pic = slide.shapes.add_picture(
                    io.BytesIO(spiker_badge_bytes),
                    Inches(badge_left), Inches(badge_top),
                    width=Inches(badge_w), height=Inches(badge_h),
                )
                badge_pic.name = "Spiker Badge"
            except Exception as e:
                logger.warning(f"Could not add spiker badge to slide #{fmt_serial}: {e}")

        # ── 11. Karna Creation logo (independent replaceable image) ─────────
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
