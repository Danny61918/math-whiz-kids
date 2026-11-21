# Card art

Drop card images here. The app picks them up automatically; no list needs editing.

- **Name:** `<cardId>.webp`, for example `dino_tyrannosaurus.webp`. The ids are in `src/data/cards.ts` and in the `output_filename` column of the prompt export.
- **Format:** WebP, square, 512x512 recommended, about 80 KB or less each (a warning appears above about 150 KB).
- **Fallback:** a card without a file (or with a file that fails to load) shows its emoji and colour tint.
- **Vite base:** images are served from `${BASE_URL}cards/<id>.webp`, so they work under `/math-whiz-kids/`.

## Scripts

```bash
npm run cards:prompts   # writes docs/card-prompts.csv and docs/card-prompts.json (one prompt per card)
npm run cards:check     # reports which of the 200 cards have art; never fails
```

Edit the style prefix and negative prompt at the top of `scripts/export-card-prompts.mjs`, then re-run `cards:prompts`.

## How the current art was made (local GPU, SDXL)

Same pipeline as the vocab-app monsters (kawaii chibi style), adapted in `scripts/`:

1. `scripts/card_batch_plan.json` – one entry per card (key = card id, short English prompt, subject first; SDXL reads only 77 tokens). Must stay in sync with `src/data/cards.ts` (a unit test checks this).
2. `python scripts/gen_card_batch.py` (use the TTS venv python, `E:/Code/tools/tts-env/Scripts/python.exe`) – makes candidates `a`,`b` per card into `scripts/card_raw/` (git-ignored) with border flood-fill cutout. Resumable. Env vars: `CARD_KEYS=id1,id2` to limit, `CAND_LETTERS=cdefgh` for extra candidates.
3. `python scripts/card_sheet.py <start> <end> <outdir>` – contact sheets to review candidates.
4. `scripts/card_override.json` – manual picks (`{"card_id": "c"}`); `scripts/card_choices.json` – final pick per plan number.
5. `python scripts/finalize_cards.py scripts/card_choices.json` – trims, pads, resizes to 512px WebP into `public/cards/`.
