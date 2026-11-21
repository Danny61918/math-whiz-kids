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
