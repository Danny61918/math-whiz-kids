"""Write chosen candidates to public/cards/<id>.webp (512px, transparent).
    python scripts/finalize_cards.py scripts/card_choices.json [--dry-run]
card_choices.json maps 1-based plan number -> "A"/"B"; unlisted default "A"."""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PUBLIC = os.path.join(ROOT, "public", "cards")
CUT = os.path.join(HERE, "card_raw", "cut")
SIZE, MARGIN, QUALITY = 512, 0.06, 85
choices = {}
if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
    choices = {int(k): v.upper() for k, v in json.load(open(sys.argv[1], encoding="utf-8")).items()}
dry = "--dry-run" in sys.argv
plan = json.load(open(os.path.join(HERE, "card_batch_plan.json"), encoding="utf-8"))["cards"]
os.makedirs(PUBLIC, exist_ok=True)
def trim_square(im):
    a = np.array(im.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a > 16)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    side = int(max(im.size) * (1 + 2 * MARGIN))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)
done = 0
for n, m in enumerate(plan, start=1):
    letter = choices.get(n, "A").lower()
    cut = os.path.join(CUT, f"{m['key']}_{letter}.png")
    if not os.path.exists(cut):
        print(f"missing {cut}"); continue
    if not dry:
        trim_square(Image.open(cut)).save(os.path.join(PUBLIC, f"{m['key']}.webp"), "WEBP", quality=QUALITY, method=4)
    done += 1
print(f"{'would write' if dry else 'wrote'} {done}/{len(plan)}")
