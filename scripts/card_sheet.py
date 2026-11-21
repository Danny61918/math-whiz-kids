"""Review sheets: python scripts/card_sheet.py <start> <end> <outdir>  (5 cards per sheet, A|B on magenta)."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
CUT = os.path.join(HERE, "card_raw", "cut")
PLAN = json.load(open(os.path.join(HERE, "card_batch_plan.json"), encoding="utf-8"))["cards"]
start, end, outdir = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
os.makedirs(outdir, exist_ok=True)
T, ROWS = 300, 5
try: font = ImageFont.truetype(r"C:\Windows\Fonts\msjh.ttc", 22)
except OSError: font = ImageFont.load_default()
for s in range(start, end, ROWS):
    idxs = list(range(s, min(s + ROWS, end)))
    sheet = Image.new("RGB", (T * 2, T * len(idxs)))
    for r, i in enumerate(idxs):
        m = PLAN[i]
        for c, cand in enumerate("ab"):
            p = os.path.join(CUT, f"{m['key']}_{cand}.png")
            tile = Image.new("RGBA", (T, T), (255, 0, 255, 255))
            if os.path.exists(p):
                tile.alpha_composite(Image.open(p).convert("RGBA").resize((T, T), Image.LANCZOS))
            d = ImageDraw.Draw(tile)
            tag = f"{i + 1}{cand.upper()} {m['key']}"
            d.rectangle((0, 0, 12 + 13 * len(tag), 32), fill=(0, 0, 0))
            d.text((6, 3), tag, fill=(255, 255, 255), font=font)
            sheet.paste(tile.convert("RGB"), (c * T, r * T))
    sheet.save(os.path.join(outdir, f"sheet_{s + 1:03d}.png"))
print("ok")
