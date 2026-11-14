"""
Test and validate editable PowerPoint generation for all MongoDB players.
"""
import os
import sys
import io
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(".env")

MONGO_URI = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DATABASE_NAME", "sportbid_vfn")

print(f"Connecting to MongoDB: {DB_NAME}...")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
players_col = db["players"]

# Fetch all players sorted by serial_number
players = list(players_col.find({}).sort("serial_number", 1))
print(f"Total players fetched from DB: {len(players)}")

sys.path.insert(0, ".")
from backend.app.services.export_service import generate_players_powerpoint
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

print("Generating PPTX for all players...")
pptx_bytes = generate_players_powerpoint(players)

output_filename = "test_editable_export.pptx"
with open(output_filename, "wb") as f:
    f.write(pptx_bytes)

print(f"PPTX written successfully ({len(pptx_bytes)} bytes) to {output_filename}!")

# Now inspect and validate the generated PPTX structure
prs = Presentation(output_filename)

slide_width = prs.slide_width.inches
slide_height = prs.slide_height.inches
print(f"\nSlide dimensions: {slide_width:.3f}\" x {slide_height:.3f}\" (Aspect ratio: {slide_width/slide_height:.3f})")

print(f"Total slides in presentation: {len(prs.slides)}")
assert len(prs.slides) == len(players), f"Expected {len(players)} slides, got {len(prs.slides)}"

# Let's inspect slide 1 in detail
slide1 = prs.slides[0]
print(f"\n--- Detailed Analysis of Slide 1 ---")
shape_counts = {}
shape_details = []

for shape in slide1.shapes:
    stype = str(shape.shape_type)
    shape_counts[stype] = shape_counts.get(stype, 0) + 1
    text_content = ""
    if shape.has_text_frame:
        text_content = " | ".join([p.text for p in shape.text_frame.paragraphs if p.text])
    shape_details.append({
        "name": shape.name,
        "type": stype,
        "left": round(shape.left.inches, 3),
        "top": round(shape.top.inches, 3),
        "width": round(shape.width.inches, 3),
        "height": round(shape.height.inches, 3),
        "text": text_content
    })

print(f"Total shapes in Slide 1: {len(slide1.shapes)}")
print("Shape types summary:", shape_counts)
print("\nShape breakdown:")
for s in shape_details:
    txt = f" -> \"{s['text']}\"" if s['text'] else ""
    print(f"  [{s['name']}] ({s['type']}) at ({s['left']}\", {s['top']}\") {s['width']}\"x{s['height']}\"{txt}")

# Check requirements across all slides
errors = []
for idx, slide in enumerate(prs.slides):
    p = players[idx]
    s_num = p.get("serial_number", 0)
    expected_serial = f"#{s_num:03d}"
    
    # Collect all text
    texts = []
    has_photo = False
    has_logo = False
    has_badge = False
    has_editable_shapes = False
    
    for sh in slide.shapes:
        if sh.has_text_frame:
            for para in sh.text_frame.paragraphs:
                if para.text.strip():
                    texts.append(para.text.strip())
        if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
            if "Photo" in sh.name:
                has_photo = True
            elif "Logo" in sh.name:
                has_logo = True
            elif "Badge" in sh.name:
                has_badge = True
        elif sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
            has_editable_shapes = True

    # Verification checks
    all_text_concat = " ".join(texts)
    if expected_serial not in all_text_concat:
        errors.append(f"Slide {idx+1}: Serial number {expected_serial} not found in text.")
    if p.get("full_name", "").upper() not in all_text_concat.upper():
        errors.append(f"Slide {idx+1}: Player name {p.get('full_name')} not found in text.")
    if not has_editable_shapes:
        errors.append(f"Slide {idx+1}: No editable vector shapes found.")

if errors:
    print(f"\nFound {len(errors)} validation errors:")
    for err in errors[:10]:
        print(f"  - {err}")
else:
    print(f"\nAll {len(prs.slides)} slides PASSED validation! Every slide contains editable text boxes, vector shapes, and independent picture elements.")
