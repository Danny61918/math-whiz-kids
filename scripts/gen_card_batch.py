"""Card art generator for Math Whiz Kids (adapted from vocab-app gen_monster_batch.py).

SDXL on the local GPU -> border flood-fill cutout, two candidates ("a","b") per card.
Reads scripts/card_batch_plan.json. Resumable. Raw: scripts/card_raw/<key>_a.png, cutouts: scripts/card_raw/cut/.
Run with the TTS venv python from the repo root:
    E:/Code/tools/tts-env/Scripts/python.exe scripts/gen_card_batch.py [start end]
"""
import json, os, sys
import numpy as np
import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionXLPipeline
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cutout_cards import cutout  # noqa: E402

RAW = os.path.join(HERE, "card_raw")
CUT = os.path.join(RAW, "cut")
os.makedirs(CUT, exist_ok=True)

# Same kawaii style as the vocab-app monsters. Subject first: SDXL reads only the first 77 tokens.
PROMPT_TAIL = ", kawaii chibi mascot, adorable round chubby body, huge sparkly eyes, tiny happy smile, soft pastel colors, thick clean outlines, flat cel shading, centered full body, plain white background, no shadow"
NEGATIVE_PROMPT = (
    "girl, human, person, portrait, teeth, fangs, sharp teeth, angry, scary, creepy, grotesque, edgy, tattoo art, realistic, "
    "photo, 3d render, text, watermark, multiple characters, character sheet, scenery, ground, shadow, floor, road, "
    "sticker, white outline, die-cut, emblem, badge, circle backdrop, frame, border, glow, sparkles, dots, gradient background"
)
LETTERS = os.environ.get("CAND_LETTERS", "ab")
CANDS = tuple((l, "abcdefgh".index(l)) for l in LETTERS)
CHUNK = 20

plan = json.load(open(os.path.join(HERE, "card_batch_plan.json"), encoding="utf-8"))["cards"]
start = int(sys.argv[1]) if len(sys.argv) > 2 else 0
end = int(sys.argv[2]) if len(sys.argv) > 2 else len(plan)

print("Loading SDXL pipeline...", flush=True)
pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.to("cuda")
print("Pipeline ready.", flush=True)

only = set(os.environ.get('CARD_KEYS', '').split(',')) - {''}
for idx in range(start, end):
    m = plan[idx]
    if only and m['key'] not in only:
        continue
    for cand, off in CANDS:
        name = f"{m['key']}_{cand}.png"
        raw_path, cut_path = os.path.join(RAW, name), os.path.join(CUT, name)
        if os.path.exists(cut_path):
            continue
        if os.path.exists(raw_path):
            image = Image.open(raw_path)
        else:
            prompt = f"A cute {m['prompt']}{PROMPT_TAIL}"
            seed = 9000 + idx * 3 + off if cand in "ab" else 20000 + idx * 10 + off
            gen = torch.Generator(device="cuda").manual_seed(seed)
            image = pipe(prompt=prompt, negative_prompt=NEGATIVE_PROMPT, num_inference_steps=30,
                         guidance_scale=7.0, width=1024, height=1024, generator=gen).images[0]
            image.save(raw_path)
        result, big = cutout(image, adaptive=True)
        result.save(cut_path)
        transparent = float((np.array(result)[:, :, 3] == 0).mean())
        flag = "  !! LOW TRANSPARENCY" if transparent < 0.25 else ""
        print(f"[{idx}] {name} {m['name']} transparent={transparent:.0%}{flag}", flush=True)
    if (idx + 1) % CHUNK == 0 or idx + 1 == end:
        print(f"CHUNK {idx // CHUNK + 1} done (cards up to {idx})", flush=True)
print("ALL DONE", flush=True)
