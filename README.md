# Math Whiz Kids 數學小神童

A small math practice game for two kinds of players. Practice earns coins; progress is tracked per skill.

- **kinder** (about 5 years old): addition and subtraction within 5, 10 and 20, "make 10". English by default, big buttons, emoji objects as visual aid.
- **grade4** (about 10 years old): large-integer add/subtract (with carries/borrows), multiplication, and division with remainder. zh-TW by default.

Each player has their own mode, language, coins and skill statistics, saved in the browser (localStorage).

## Collectible cards and art

Practice earns stars, coins and pack tickets; packs hold one of 200 collectible cards (dinosaurs, cars, planes, ships and trains, space, rescue). Card faces are emoji placeholders until real art is added: put `public/cards/<cardId>.webp` files in place and they appear automatically. `npm run cards:prompts` writes `docs/card-prompts.csv` and `docs/card-prompts.json` (one image prompt per card), and `npm run cards:check` reports which cards still lack art. The `cards:*` scripts need Node >= 22.6 (TypeScript type stripping). Details in `public/cards/README.md`.

## Development

```bash
npm install
npm run dev     # start the dev server
npm run build   # type-check and build to dist/
npm run lint    # eslint
npm test        # vitest unit tests
npm run cards:prompts   # export card image prompts to docs/
npm run cards:check     # report which cards have art in public/cards/
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Zustand, Vitest.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`: install, test, build, then publish `dist/` to GitHub Pages.

## Fluency engine (kinder)
Kindergarten mode tracks every one-digit addition/subtraction fact, adapts question selection to weak facts, fades the ten-frame aid as facts become fluent, and shows progress on a Number Chart. See `docs/v2-phase3-fluency-spec.md`.
