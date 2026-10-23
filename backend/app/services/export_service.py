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
    Each slide displays:
    - Tournament header
    - Formatted Serial Number (#01, #02, etc.) in gold typography
    - Player name in bold uppercase
    - Playing role & village
    - Contact phone
    - Embedded player portrait/poster if available
    """
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    sorted_players = sorted(players, key=lambda x: int(x.get("serial_number", 0)))

    for p in sorted_players:
        s_num = p.get("serial_number", 0)
        fmt_serial = format_serial_number(s_num)
        player_name = (p.get("player_name") or "VOLLEYBALL PLAYER").strip().upper()
        village = (p.get("village") or "NALTHUR").strip().upper()
        role = (p.get("playing_role") or "PLAYER").strip().upper()
        phone = (p.get("phone_number") or "").strip()
        phone_display = f"+91 {phone}" if phone and not phone.startswith("+") else phone

        slide = prs.slides.add_slide(blank_layout)

        # Solid dark luxury background matching tournament gold/black theme
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = RGBColor(8, 26, 17)  # Deep tournament emerald black

        # Top Tournament Banner
        banner = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.8))
        tf_banner = banner.text_frame
        tf_banner.word_wrap = True
        p_banner = tf_banner.paragraphs[0]
        p_banner.text = tournament_title
        p_banner.font.size = Pt(20)
        p_banner.font.bold = True
        p_banner.font.color.rgb = RGBColor(255, 204, 30)  # Gold
        p_banner.alignment = PP_ALIGN.CENTER

        # Left Column: Image (Poster or Portrait)
        # Try fetching poster or photo bytes
        image_added = False
        img_url = p.get("poster_url") or p.get("photo_url")
        if img_url and img_url.startswith("http"):
            try:
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(img_url)
                    if resp.status_code == 200:
                        img_stream = io.BytesIO(resp.content)
                        # Add image to left side: width 6 inches, centered vertically
                        slide.shapes.add_picture(
                            img_stream,
                            Inches(0.8),
                            Inches(1.6),
                            width=Inches(5.8),
                        )
                        image_added = True
            except Exception as e:
                logger.warning(f"Could not download image for PPTX slide #{fmt_serial}: {e}")

        # If no image could be downloaded, add a sporty placeholder card
        if not image_added:
            card_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.5))
            tf_card = card_box.text_frame
            p_card = tf_card.paragraphs[0]
            p_card.text = f"VFN 2026\nPLAYER #{fmt_serial}"
            p_card.font.size = Pt(32)
            p_card.font.bold = True
            p_card.font.color.rgb = RGBColor(218, 165, 32)
            p_card.alignment = PP_ALIGN.CENTER

        # Right Column: Player Auction Details
        left_pos = Inches(7.0)

        # Big Serial Number
        serial_box = slide.shapes.add_textbox(left_pos, Inches(1.6), Inches(5.5), Inches(1.2))
        tf_serial = serial_box.text_frame
        p_s = tf_serial.paragraphs[0]
        p_s.text = f"#{fmt_serial}"
        p_s.font.size = Pt(56)
        p_s.font.bold = True
        p_s.font.color.rgb = RGBColor(255, 215, 0)  # Bright gold

        # Player Name
        name_box = slide.shapes.add_textbox(left_pos, Inches(2.8), Inches(5.5), Inches(1.0))
        tf_name = name_box.text_frame
        p_n = tf_name.paragraphs[0]
        p_n.text = player_name
        p_n.font.size = Pt(32)
        p_n.font.bold = True
        p_n.font.color.rgb = RGBColor(255, 255, 255)

        # Metadata Table / Info box
        info_box = slide.shapes.add_textbox(left_pos, Inches(4.0), Inches(5.5), Inches(2.5))
        tf_info = info_box.text_frame

        p_role = tf_info.paragraphs[0]
        p_role.text = f"ROLE:  {role}"
        p_role.font.size = Pt(22)
        p_role.font.bold = True
        p_role.font.color.rgb = RGBColor(52, 211, 153)  # Emerald green

        p_vil = tf_info.add_paragraph()
        p_vil.text = f"VILLAGE:  {village}"
        p_vil.font.size = Pt(20)
        p_vil.font.color.rgb = RGBColor(229, 231, 235)  # Light gray

        p_ph = tf_info.add_paragraph()
        p_ph.text = f"PHONE:  {phone_display}"
        p_ph.font.size = Pt(18)
        p_ph.font.color.rgb = RGBColor(156, 163, 175)  # Muted gray

    out = io.BytesIO()
    prs.save(out)
    out.seek(0)
    return out.getvalue()
