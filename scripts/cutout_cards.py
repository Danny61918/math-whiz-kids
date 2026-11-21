"""Batch background removal for the monster gallery (white-background art -> clean RGBA).

Why not just threshold: a hard threshold leaves jagged edges and a white halo around the
dark outline. Here the background is found by flood-filling from the border, then the thin
edge band is un-mixed from white (alpha matting against a known white background) so edges
are smooth and carry no white fringe.

Usage (run with the TTS venv python, from the repo root):
    python scripts/cutout_monsters.py                    # cut every opaque monster in public/monsters
    python scripts/cutout_monsters.py mon_01 mon_07      # only these
    python scripts/cutout_monsters.py --out tmp_out      # write elsewhere instead of in place
    python scripts/cutout_monsters.py --sheet sheet.png  # also write a magenta/dark contact sheet

Sources: scripts/monster_raw/<name>.png when present, otherwise the current public file.
Originals are copied into scripts/monster_raw/ (gitignored) before being overwritten.
Files that already have transparency are skipped unless --force.
"""
import argparse
import os
import shutil

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public", "monsters")
RAW = os.path.join(ROOT, "scripts", "monster_raw")

BG_MIN_CHANNEL = 232   # pixels this light and border-connected are definite background
ADAPTIVE_TOL = 26      # adaptive mode: max per-channel distance from the border colour that counts as background
SHADOW_MAX_SAT = 18    # adaptive mode: light, nearly colourless pixels are treated as ground shadow
SHADOW_MIN_LIGHT = 170
BAND_PX = 3          # width of the edge band that gets proper alpha
LIGHT_FG_DIST2 = 4000  # |fg - white|^2 below this: foreground is too white to unmix, keep opaque
ENCLOSED_WHITE_MIN_PX = 600


def has_alpha(img: Image.Image) -> bool:
    a = np.array(img.convert("RGBA"))[:, :, 3]
    return float((a < 16).mean()) > 0.02


def cutout(img: Image.Image, adaptive: bool = False):
    """Returns (RGBA image, number of large enclosed pure-white regions left untouched).

    adaptive=False assumes a white background (what the first 38 monsters had).
    adaptive=True takes the background colour from the image border, for fresh SDXL renders whose
    "white" backdrop is tinted by the subject (e.g. pink behind pink petals)."""
    rgb = np.array(img.convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape

    if adaptive:
        edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg_color = np.median(edge, axis=0).astype(np.float32)
        candidate = np.abs(rgb - bg_color).max(axis=2) <= ADAPTIVE_TOL
        # pale grey ground shadows: low saturation and light, only removed when connected to the border
        candidate |= (rgb.max(axis=2) - rgb.min(axis=2) <= SHADOW_MAX_SAT) & (rgb.min(axis=2) >= SHADOW_MIN_LIGHT)
    else:
        bg_color = np.float32([255.0, 255.0, 255.0])
        candidate = rgb.min(axis=2) >= BG_MIN_CHANNEL
    labeled, _ = ndi.label(candidate)
    border = set(labeled[0, :].tolist()) | set(labeled[-1, :].tolist())
    border |= set(labeled[:, 0].tolist()) | set(labeled[:, -1].tolist())
    border.discard(0)
    bg = np.isin(labeled, list(border))

    # band = pixels just outside the definite background that are partly background
    near_bg = ndi.binary_dilation(bg, iterations=BAND_PX) & ~bg
    # interior = clearly foreground pixels, used to estimate the foreground colour in the band
    interior = ~ndi.binary_dilation(bg, iterations=BAND_PX + 1)
    _, (iy, ix) = ndi.distance_transform_edt(~interior, return_indices=True)
    fg = rgb[iy, ix]

    d = fg - bg_color
    denom = (d * d).sum(axis=2)
    alpha = np.ones((h, w), np.float32)
    num = ((rgb - bg_color) * d).sum(axis=2)
    ok = near_bg & (denom > LIGHT_FG_DIST2)
    alpha[ok] = np.clip(num[ok] / denom[ok], 0.0, 1.0)
    alpha[bg] = 0.0

    out_rgb = rgb.copy()
    out_rgb[ok] = fg[ok]  # decontaminate: edge colour = nearby interior colour, alpha carries the edge
    out = np.dstack([out_rgb, alpha * 255.0]).clip(0, 255).astype(np.uint8)

    # report big pure-white pockets that are NOT connected to the border (gaps between limbs etc.)
    pure = (rgb.min(axis=2) >= 250) & ~bg
    lab2, n2 = ndi.label(pure)
    big = 0
    if n2:
        sizes = ndi.sum(pure, lab2, range(1, n2 + 1))
        big = int((sizes >= ENCLOSED_WHITE_MIN_PX).sum())
    return Image.fromarray(out, "RGBA"), big


def contact_sheet(paths, dest, tile=256, cols=6):
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile * 2, rows * tile), (0, 0, 0))
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGBA").resize((tile, tile), Image.LANCZOS)
        x, y = (i % cols) * tile * 2, (i // cols) * tile
        for k, color in enumerate(((255, 0, 255), (28, 32, 48))):
            bg = Image.new("RGBA", (tile, tile), color + (255,))
            bg.alpha_composite(im)
            sheet.paste(bg.convert("RGB"), (x + k * tile, y))
    sheet.save(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="e.g. mon_01 (default: all)")
    ap.add_argument("--out", default=PUBLIC, help="output dir (default: public/monsters, in place)")
    ap.add_argument("--force", action="store_true", help="redo images that already have transparency")
    ap.add_argument("--sheet", help="write a magenta + dark contact sheet of the results")
    args = ap.parse_args()

    os.makedirs(RAW, exist_ok=True)
    os.makedirs(args.out, exist_ok=True)
    files = sorted(f for f in os.listdir(PUBLIC) if f.lower().endswith(".png"))
    if args.names:
        wanted = {n if n.endswith(".png") else n + ".png" for n in args.names}
        files = [f for f in files if f in wanted]

    done = []
    for f in files:
        pub = os.path.join(PUBLIC, f)
        raw = os.path.join(RAW, f)
        if not os.path.exists(raw):
            if has_alpha(Image.open(pub)) and not args.force:
                print(f"skip   {f} (already transparent)")
                continue
            shutil.copy2(pub, raw)  # keep the untouched original before anything is overwritten
        src = Image.open(raw)
        if has_alpha(src) and not args.force:
            print(f"skip   {f} (already transparent)")
            continue
        result, big = cutout(src)
        dest = os.path.join(args.out, f)
        result.save(dest, optimize=True)
        a = np.array(result)[:, :, 3]
        note = f"  !! {big} large enclosed white region(s) kept - check" if big else ""
        print(f"done   {f}  transparent={float((a == 0).mean()):.0%}  soft-edge px={int(((a > 0) & (a < 255)).sum())}{note}")
        done.append(dest)

    if args.sheet and done:
        contact_sheet(done, args.sheet)
        print(f"sheet -> {args.sheet}")


if __name__ == "__main__":
    main()
