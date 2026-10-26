import os
import io
import csv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from backend.app.services.counter_service import format_serial_number

logger = logging.getLogger("vfn.export")


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


def generate_players_powerpoint(
    players: List[Dict[str, Any]],
    tournament_title: str = "VOLLEYBALL FRIENDS NALTHUR TROPHY - 2026",
) -> bytes:
    """
    Generates a high-impact 16:9 widescreen PowerPoint presentation (.pptx)
    for tournament player auction bidding.
    - One player per slide
    - Exactly preserves official poster design, quality, and aspect ratio
    - Centers the high-res 1024x562 poster on 16:9 widescreen canvas
    - Robust concurrent image retrieval with disk cache fallback
    - Safe fallback slide and logging for missing posters
    """
    from concurrent.futures import ThreadPoolExecutor

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    sorted_players = sorted(players, key=lambda x: int(x.get("serial_number", 0)))

    # Fetch poster images concurrently using ThreadPoolExecutor
    def fetch_player_poster(p: Dict[str, Any]):
        p_id = str(p.get("_id") or p.get("id") or "")
        s_num = p.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        
        # 1. Try local disk poster cache first
        from backend.app.core.config import settings
        posters_dir = os.path.join(settings.UPLOAD_DIR, "posters")
        local_path = p.get("local_poster_path")
        if local_path:
            clean_name = os.path.basename(local_path)
            candidate = os.path.join(posters_dir, clean_name)
            if os.path.isfile(candidate):
                try:
                    with open(candidate, "rb") as f:
                        return p, f.read()
                except Exception:
                    pass

        # 2. Try remote poster_url (Cloudinary CDN)
        poster_url = p.get("poster_url")
        if poster_url and poster_url.startswith("http"):
            try:
                with httpx.Client(timeout=12.0) as client:
                    resp = client.get(poster_url)
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        return p, resp.content
                    logger.warning(f"Poster URL returned HTTP {resp.status_code} for player #{fmt_serial}")
            except Exception as e:
                logger.warning(f"Could not download poster for PPTX slide #{fmt_serial}: {e}")

        # 3. Fallback to player portrait photo if poster is not available
        photo_url = p.get("photo_url")
        if photo_url and photo_url.startswith("http"):
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.get(photo_url)
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        return p, resp.content
            except Exception as pe:
                logger.warning(f"Could not download photo for PPTX fallback #{fmt_serial}: {pe}")

        return p, None

    with ThreadPoolExecutor(max_workers=10) as executor:
        fetched_results = list(executor.map(fetch_player_poster, sorted_players))

    # Re-sort results to guarantee strict sequential serial order
    fetched_results.sort(key=lambda x: int(x[0].get("serial_number", 0)))

    for p, img_bytes in fetched_results:
        s_num = p.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        player_name = (p.get("player_name") or "VOLLEYBALL PLAYER").strip().upper()
        village = (p.get("village") or "NALTHUR").strip().upper()
        role = (p.get("playing_role") or "PLAYER").strip().upper()
        phone = (p.get("phone_number") or "").strip()
        phone_display = f"+91 {phone}" if phone and not phone.startswith("+") else phone

        slide = prs.slides.add_slide(blank_layout)

        # Deep tournament emerald black background
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = RGBColor(8, 26, 17)

        if img_bytes:
            try:
                img_stream = io.BytesIO(img_bytes)
                # Official poster dimensions: 1024 x 562 (aspect ratio = 1.822)
                # Centered in 16:9 slide (13.333" x 7.5") preserving exact ratio
                poster_w = Inches(13.0)
                poster_h = Inches(7.135)
                poster_left = Inches(0.166)
                poster_top = Inches(0.182)

                slide.shapes.add_picture(
                    img_stream,
                    poster_left,
                    poster_top,
                    width=poster_w,
                    height=poster_h,
                )
            except Exception as pe:
                logger.error(f"Failed to render poster image into slide for #{fmt_serial}: {pe}")
                img_bytes = None

        if not img_bytes:
            # Fallback auction card slide if poster is completely inaccessible
            card_box = slide.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.333), Inches(4.5))
            tf = card_box.text_frame
            tf.word_wrap = True

            p_s = tf.paragraphs[0]
            p_s.text = f"#{fmt_serial}"
            p_s.font.size = Pt(64)
            p_s.font.bold = True
            p_s.font.color.rgb = RGBColor(255, 204, 30)  # Gold
            p_s.alignment = PP_ALIGN.CENTER

            p_n = tf.add_paragraph()
            p_n.text = player_name
            p_n.font.size = Pt(36)
            p_n.font.bold = True
            p_n.font.color.rgb = RGBColor(255, 255, 255)
            p_n.alignment = PP_ALIGN.CENTER

            p_meta = tf.add_paragraph()
            p_meta.text = f"{role}  •  {village}  •  {phone_display}"
            p_meta.font.size = Pt(20)
            p_meta.font.bold = True
            p_meta.font.color.rgb = RGBColor(52, 211, 153)  # Emerald green
            p_meta.alignment = PP_ALIGN.CENTER

            p_note = tf.add_paragraph()
            p_note.text = "(Official auction poster pending or regenerating)"
            p_note.font.size = Pt(13)
            p_note.font.italic = True
            p_note.font.color.rgb = RGBColor(156, 163, 175)
            p_note.alignment = PP_ALIGN.CENTER

    out = io.BytesIO()
    prs.save(out)
    out.seek(0)
    return out.getvalue()
