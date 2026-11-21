"""Background removal for card art: flood-fill the border background, then un-mix the edge band for smooth alpha."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BG_MIN_CHANNEL = 232   # pixels this light and border-connected are definite background
ADAPTIVE_TOL = 26      # adaptive mode: max per-channel distance from the border colour that counts as background
SHADOW_MAX_SAT = 18    # adaptive mode: light, nearly colourless pixels are treated as ground shadow
SHADOW_MIN_LIGHT = 170
BAND_PX = 3          # width of the edge band that gets proper alpha
LIGHT_FG_DIST2 = 4000  # |fg - white|^2 below this: foreground is too white to unmix, keep opaque
ENCLOSED_WHITE_MIN_PX = 600


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
