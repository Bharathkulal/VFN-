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
    """Attempts to load a bundled or system TrueType font, falling back gracefully."""
    font_paths = [
        os.path.join(ASSETS_DIR, "fonts", font_name),
        os.path.join(r"C:\Windows\Fonts", font_name),
        os.path.join("/usr/share/fonts/truetype", font_name),
        os.path.join("/usr/share/fonts/truetype/dejavu", font_name),
    ]
    for p in font_paths:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


def adjust_player_portrait(photo_img: Image.Image, target_w: int = 449, target_h: int = 384) -> Image.Image:
    """
    Fits and renders the player photo into the designated frame (target_w x target_h)
    such that:
    1. The ENTIRE player photo is preserved without any unwanted cropping, stretching, or distortion.
    2. The original aspect ratio is strictly maintained across portrait, square, and landscape photos.
    3. An ambient, darkened, and blurred backdrop derived from the photo itself fills any side
       or top/bottom margins seamlessly, ensuring broadcast-level visual excellence.
    4. A gentle drop shadow separates the sharp foreground subject from the backdrop.
    """
    from PIL import ImageFilter, ImageEnhance

    img = photo_img.convert("RGBA")
    w, h = img.size

    # 1. Maintain exact aspect ratio: scale so that entire photo fits inside the frame box
    scale = min(target_w / w, target_h / h)
    fit_w = max(1, int(round(w * scale)))
    fit_h = max(1, int(round(h * scale)))
    fit_img = img.resize((fit_w, fit_h), Image.Resampling.LANCZOS)

    # If photo already fills the target frame perfectly (within 1px tolerance)
    if fit_w >= target_w and fit_h >= target_h:
        return fit_img.crop((0, 0, target_w, target_h)).convert("RGB")

    # 2. Create ambient background from the photo itself
    bg_scale = max(target_w / w, target_h / h)
    bg_w = max(target_w, int(round(w * bg_scale)))
    bg_h = max(target_h, int(round(h * bg_scale)))
    bg = img.resize((bg_w, bg_h), Image.Resampling.BILINEAR)

    # Center crop the background to fill target_w x target_h
    bg_x = (bg_w - target_w) // 2
    bg_y = (bg_h - target_h) // 2
    bg_cropped = bg.crop((bg_x, bg_y, bg_x + target_w, bg_y + target_h))

    # Apply blur and darken to create a subdued, elegant backdrop
    bg_blurred = bg_cropped.filter(ImageFilter.GaussianBlur(radius=28))
    bg_dark = ImageEnhance.Brightness(bg_blurred).enhance(0.35)

    # 3. Center the sharp fitted photo within the frame
    ox = (target_w - fit_w) // 2
    oy = (target_h - fit_h) // 2

    # 4. Add soft drop shadow behind fitted photo
    shadow = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rectangle(
        [max(0, ox - 3), max(0, oy - 3), min(target_w, ox + fit_w + 3), min(target_h, oy + fit_h + 3)],
        fill=(0, 0, 0, 150),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))

    # 5. Composite: background + shadow + sharp fitted photo
    canvas = Image.alpha_composite(bg_dark, shadow)
    if fit_img.mode == "RGBA":
        canvas.paste(fit_img, (ox, oy), fit_img)
    else:
        canvas.paste(fit_img, (ox, oy))

    return canvas.convert("RGB")


def load_player_image(photo_path_or_url: str) -> Optional[Image.Image]:
    """Loads player portrait from local disk or URL, preserving alpha transparency."""
    if not photo_path_or_url:
        return None

    # 1. Check HTTP / HTTPS remote URL (e.g. Cloudinary)
    if photo_path_or_url.startswith("http://") or photo_path_or_url.startswith("https://"):
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.get(photo_path_or_url)
                if res.status_code == 200:
                    return Image.open(io.BytesIO(res.content)).convert("RGBA")
                logger.warning(f"Remote photo fetch returned status {res.status_code} for {photo_path_or_url}")
        except Exception as e:
            logger.warning(f"Failed to fetch player photo from remote URL {photo_path_or_url}: {e}")

    # 2. Check all possible local paths (accounting for relative, absolute, uploads, backend/uploads)
    clean_name = os.path.basename(photo_path_or_url)
    candidate_paths = [
        photo_path_or_url,
        os.path.join(settings.UPLOAD_DIR, clean_name),
        os.path.join(settings.UPLOAD_DIR, "players", clean_name),
        os.path.join(os.path.dirname(settings.UPLOAD_DIR), "uploads", "players", clean_name),
        os.path.join(os.path.dirname(settings.UPLOAD_DIR), "backend", "uploads", "players", clean_name),
    ]

    if photo_path_or_url.startswith("/uploads/") or photo_path_or_url.startswith("uploads/"):
        rel_path = photo_path_or_url.lstrip("/")
        candidate_paths.append(os.path.join(os.path.dirname(settings.UPLOAD_DIR), rel_path))
        # Strip leading uploads/ to join directly with settings.UPLOAD_DIR
        clean_rel = rel_path[len("uploads/"):] if rel_path.startswith("uploads/") else rel_path
        candidate_paths.append(os.path.join(settings.UPLOAD_DIR, clean_rel))

    for path in candidate_paths:
        if path and os.path.isfile(path):
            try:
                return Image.open(path).convert("RGBA")
            except Exception as e:
                logger.warning(f"Could not open local photo file {path}: {e}")

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


def generate_player_poster(
    player_doc: dict,
    raw_photo_image: Optional[Image.Image] = None,
    allow_fallback_avatar: bool = False,
) -> Tuple[str, str]:
    """
    Generates a high-resolution tournament auction poster matching the exact
    Volleyball Friends Nalthur Trophy 2026 design with Karna Creation branding.

    Preserves 100% of the player's photo without unwanted cropping or stretching.
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

    if raw_photo_image is not None:
        photo_img = raw_photo_image
    else:
        photo_img = load_player_image(player_doc.get("photo_url", ""))

    if photo_img is None:
        if allow_fallback_avatar:
            cropped = create_fallback_avatar(target_w, target_h, player_name)
        else:
            raise ValueError(
                f"Original photo for player #{formatted_serial} ({player_name}) is missing or inaccessible. "
                "Cannot generate poster without valid player photo."
            )
    else:
        cropped = adjust_player_portrait(photo_img, target_w, target_h)

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

    # 4. Draw Player Name inside golden brush banner (centered around x=635, y=143)
    # Banner spans x: 505 to 765, y: 112 to 175
    font_size = 36
    chosen_font = get_font("impact.ttf", font_size)
    bbox = draw.textbbox((0, 0), player_name, font=chosen_font)
    tw = bbox[2] - bbox[0]
    while tw > 210 and font_size > 18:
        font_size -= 2
        chosen_font = get_font("impact.ttf", font_size)
        bbox = draw.textbbox((0, 0), player_name, font=chosen_font)
        tw = bbox[2] - bbox[0]

    th = bbox[3] - bbox[1]
    name_x = 635 - tw // 2
    name_y = 143 - th // 2 - 2
    draw.text((name_x, name_y), player_name, font=chosen_font, fill=(15, 15, 15))

    # 5. Draw Metadata Labels and Values
    font_lbl = get_font("arialbd.ttf", 13)
    font_serial = get_font("impact.ttf", 46)

    gold_val_color = (255, 204, 30)
    gold_shadow_color = (60, 40, 0)
    white_lbl_color = (245, 245, 245)

    def draw_val(x: int, y: int, text: str, initial_size: int = 34, max_width: int = 180):
        """Draws a large value with dynamic sizing to prevent overlapping the Karna logo."""
        size = initial_size
        f = get_font("impact.ttf", size)
        b = draw.textbbox((0, 0), text, font=f)
        w = b[2] - b[0]
        while w > max_width and size > 18:
            size -= 2
            f = get_font("impact.ttf", size)
            b = draw.textbbox((0, 0), text, font=f)
            w = b[2] - b[0]
        # Crisp drop shadow
        draw.text((x + 1, y + 1), text, font=f, fill=gold_shadow_color)
        draw.text((x, y), text, font=f, fill=gold_val_color)

    # Row 1: SERIAL NUMBER (Divider line 1 is at y=181, Divider line 2 is at y=254)
    draw.text((580, 186), "SERIAL NUMBER", font=font_lbl, fill=white_lbl_color)
    draw.text((581, 203), formatted_serial, font=font_serial, fill=gold_shadow_color)
    draw.text((580, 202), formatted_serial, font=font_serial, fill=gold_val_color)

    # Row 2: VILLAGE (Divider line 2 is at y=254, Divider line 3 is at y=328)
    draw.text((580, 258), "VILLAGE", font=font_lbl, fill=white_lbl_color)
    draw_val(580, 274, village, initial_size=34, max_width=180)

    # Row 3: ROLE (Divider line 3 is at y=328, Divider line 4 is at y=405)
    draw.text((580, 330), "ROLE", font=font_lbl, fill=white_lbl_color)
    draw_val(580, 346, playing_role, initial_size=34, max_width=180)

    # Row 4: PHONE (Divider line 4 is at y=405)
    draw.text((580, 404), "PHONE", font=font_lbl, fill=white_lbl_color)
    phone_display = phone if phone.startswith("+") else (f"+91 {phone}" if phone else "N/A")
    draw_val(580, 420, phone_display, initial_size=32, max_width=180)

    # 6. Save final poster
    final_rgb = template.convert("RGB")
    final_rgb.save(out_filepath, "PNG", quality=95)
    logger.info(f"Generated high-resolution auction poster for player #{formatted_serial} ({player_name}) at {out_filepath}")

    return rel_url, out_filepath

