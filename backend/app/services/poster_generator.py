import os
import io
import logging
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import httpx
from backend.app.core.config import settings

logger = logging.getLogger("vfn.poster")

ASSETS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
)
POSTERS_DIR = os.path.join(settings.UPLOAD_DIR, "posters")
os.makedirs(POSTERS_DIR, exist_ok=True)

TEMPLATE_PATH = os.path.join(ASSETS_DIR, "poster_template.png")
SPIKER_BADGE_PATH = os.path.join(ASSETS_DIR, "spiker_badge.png")


def get_font(font_name: str, size: int) -> ImageFont.FreeTypeFont:
    """Attempts to load a Windows TrueType font, falling back gracefully."""
    font_paths = [
        os.path.join(r"C:\Windows\Fonts", font_name),
        os.path.join("/usr/share/fonts/truetype", font_name),
    ]
    for p in font_paths:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def load_player_image(photo_path_or_url: str) -> Optional[Image.Image]:
    """Loads player portrait from local disk or URL."""
    if not photo_path_or_url:
        return None

    # 1. Check local static uploads path
    if photo_path_or_url.startswith("/uploads/") or photo_path_or_url.startswith("uploads/"):
        rel_path = photo_path_or_url.lstrip("/")
        full_path = os.path.join(os.path.dirname(settings.UPLOAD_DIR), rel_path)
        if os.path.isfile(full_path):
            try:
                return Image.open(full_path).convert("RGB")
            except Exception as e:
                logger.warning(f"Could not open local photo file {full_path}: {e}")

    # 2. Check direct absolute or relative file path
    if os.path.isfile(photo_path_or_url):
        try:
            return Image.open(photo_path_or_url).convert("RGB")
        except Exception:
            pass

    # 3. Check HTTP / HTTPS remote URL (e.g. Cloudinary)
    if photo_path_or_url.startswith("http://") or photo_path_or_url.startswith("https://"):
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(photo_path_or_url)
                if res.status_code == 200:
                    return Image.open(io.BytesIO(res.content)).convert("RGB")
        except Exception as e:
            logger.warning(f"Failed to fetch player photo from remote URL {photo_path_or_url}: {e}")

    return None


def create_fallback_avatar(w: int, h: int, player_name: str) -> Image.Image:
    """Creates a dark sporty fallback portrait if no photo was uploaded."""
    img = Image.new("RGB", (w, h), (10, 36, 22))
    draw = ImageDraw.Draw(img)

    # Initial circles
    cx, cy = w // 2, h // 2 - 20
    draw.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(24, 76, 50), outline=(218, 165, 32), width=3)
    # Head silhouette
    draw.ellipse([cx - 40, cy - 50, cx + 40, cy + 30], fill=(218, 165, 32))
    # Shoulders silhouette
    draw.chord([cx - 75, cy + 15, cx + 75, cy + 120], 180, 360, fill=(218, 165, 32))

    # Name label at bottom
    font = get_font("arialbd.ttf", 18)
    initials = "".join([part[0] for part in player_name.split() if part])[:2].upper() or "VFN"
    draw.text((cx - 20, cy - 10), initials, font=font, fill=(10, 36, 22))
    return img


def generate_player_poster(player_doc: dict) -> Tuple[str, str]:
    """
    Generates a high-resolution tournament auction poster matching the exact
    Volleyball Friends Nalthur Trophy 2026 design with Karna Creation branding.

    Returns: (relative_url, absolute_file_path)
    """
    player_id = str(player_doc.get("_id") or player_doc.get("id"))
    serial_num = player_doc.get("serial_number", 1)
    formatted_serial = player_doc.get("formatted_serial", f"{serial_num:02d}")
    player_name = (player_doc.get("player_name") or "VOLLEYBALL PLAYER").strip().upper()
    village = (player_doc.get("village") or "NALTHUR").strip().upper()
    playing_role = (player_doc.get("playing_role") or "ALL-ROUNDER").strip().upper()
    phone = (player_doc.get("phone_number") or "").strip()

    # Output file paths
    safe_name = "".join([c if c.isalnum() else "_" for c in player_name])[:20]
    out_filename = f"poster_{formatted_serial}_{safe_name}_{player_id[:8]}.png"
    out_filepath = os.path.join(POSTERS_DIR, out_filename)
    rel_url = f"/uploads/posters/{out_filename}"

    # 1. Load base template
    if not os.path.isfile(TEMPLATE_PATH):
        raise FileNotFoundError(f"Master poster template not found at {TEMPLATE_PATH}")

    template = Image.open(TEMPLATE_PATH).convert("RGBA")
    draw = ImageDraw.Draw(template)

    # 2. Process player portrait into left frame
    # Frame target box: (28, 98, 477, 482) -> w=449, h=384
    frame_x, frame_y = 28, 98
    target_w, target_h = 449, 384

    photo_img = load_player_image(player_doc.get("photo_url", ""))
    if photo_img is None:
        photo_img = create_fallback_avatar(target_w, target_h, player_name)

    # Aspect fill and crop to target_w x target_h
    pw, ph = photo_img.size
    aspect_target = target_w / target_h
    aspect_photo = pw / ph

    if aspect_photo > aspect_target:
        # Photo is wider than target: scale by height, crop sides
        new_h = target_h
        new_w = int(pw * (target_h / ph))
        resized = photo_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        left = (new_w - target_w) // 2
        cropped = resized.crop((left, 0, left + target_w, target_h))
    else:
        # Photo is taller than target: scale by width, crop top/bottom
        new_w = target_w
        new_h = int(ph * (target_w / pw))
        resized = photo_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        top = max(0, (new_h - target_h) // 3)  # bias slightly towards top for portraits
        cropped = resized.crop((0, top, target_w, top + target_h))

    # Mask with rounded corners
    corner_radius = 24
    rounded_mask = Image.new("L", (target_w, target_h), 0)
    mask_draw = ImageDraw.Draw(rounded_mask)
    mask_draw.rounded_rectangle([0, 0, target_w, target_h], radius=corner_radius, fill=255)

    # Paste portrait onto template
    template.paste(cropped, (frame_x, frame_y), rounded_mask)

    # Draw luxury golden metallic frame border
    draw.rounded_rectangle(
        [frame_x - 4, frame_y - 4, frame_x + target_w + 4, frame_y + target_h + 4],
        radius=corner_radius + 4,
        outline=(230, 180, 50),
        width=4,
    )
    draw.rounded_rectangle(
        [frame_x - 2, frame_y - 2, frame_x + target_w + 2, frame_y + target_h + 2],
        radius=corner_radius + 2,
        outline=(255, 230, 120),
        width=1,
    )

    # 3. Paste Spiker Badge on bottom-left corner of the photo
    if os.path.isfile(SPIKER_BADGE_PATH):
        spiker_img = Image.open(SPIKER_BADGE_PATH).convert("RGBA")
        template.paste(spiker_img, (0, 380), spiker_img)

    # 4. Draw Player Name inside the golden brush banner (centered around x=635, y=142)
    # Banner spans x: 505 to 765, y: 112 to 175
    font_name_lg = get_font("impact.ttf", 34)
    font_name_md = get_font("impact.ttf", 26)
    font_name_sm = get_font("impact.ttf", 20)

    chosen_font = font_name_lg
    bbox = draw.textbbox((0, 0), player_name, font=chosen_font)
    tw = bbox[2] - bbox[0]
    if tw > 220:
        chosen_font = font_name_md
        bbox = draw.textbbox((0, 0), player_name, font=chosen_font)
        tw = bbox[2] - bbox[0]
    if tw > 230:
        chosen_font = font_name_sm
        bbox = draw.textbbox((0, 0), player_name, font=chosen_font)
        tw = bbox[2] - bbox[0]

    th = bbox[3] - bbox[1]
    name_x = 635 - tw // 2
    name_y = 142 - th // 2 - 3
    draw.text((name_x, name_y), player_name, font=chosen_font, fill=(0, 0, 0))

    # 5. Draw Metadata Labels and Values
    font_lbl = get_font("arialbd.ttf", 11)
    font_serial = get_font("impact.ttf", 36)
    font_val = get_font("impact.ttf", 26)

    gold_val_color = (252, 198, 38)
    white_lbl_color = (235, 235, 235)

    # Row 1: SERIAL NUMBER (Divider line 1 is at y=181, Divider line 2 is at y=254)
    draw.text((580, 189), "SERIAL NUMBER", font=font_lbl, fill=white_lbl_color)
    draw.text((580, 205), formatted_serial, font=font_serial, fill=gold_val_color)

    # Row 2: VILLAGE (Divider line 2 is at y=254, Divider line 3 is at y=328)
    draw.text((580, 262), "VILLAGE", font=font_lbl, fill=white_lbl_color)
    draw.text((580, 279), village, font=font_val, fill=gold_val_color)

    # Row 3: ROLE (Divider line 3 is at y=328, Divider line 4 is at y=405)
    draw.text((580, 336), "ROLE", font=font_lbl, fill=white_lbl_color)
    draw.text((580, 353), playing_role, font=font_val, fill=gold_val_color)

    # Row 4: PHONE (Divider line 4 is at y=405)
    draw.text((580, 413), "PHONE", font=font_lbl, fill=white_lbl_color)
    phone_display = phone if phone.startswith("+") else (f"+91 {phone}" if phone else "N/A")
    draw.text((580, 430), phone_display, font=font_val, fill=gold_val_color)

    # 6. Save final poster
    final_rgb = template.convert("RGB")
    final_rgb.save(out_filepath, "PNG", quality=95)
    logger.info(f"Generated high-resolution auction poster for player #{formatted_serial} ({player_name}) at {out_filepath}")

    return rel_url, out_filepath
