# Math Whiz Kids 數學小神童

A small math practice game for two kinds of players. Practice earns coins; progress is tracked per skill.

- **kinder** (about 5 years old): addition and subtraction within 5, 10 and 20, "make 10". English by default, big buttons, emoji objects as visual aid.
- **grade4** (about 10 years old): large-integer add/subtract (with carries/borrows), multiplication, and division with remainder. zh-TW by default.

Each player has their own mode, language, coins and skill statistics, saved in the browser (localStorage).

## Development

```bash
npm install
npm run dev     # start the dev server
npm run build   # type-check and build to dist/
npm run lint    # eslint
npm test        # vitest unit tests
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Zustand, Vitest.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`: install, test, build, then publish `dist/` to GitHub Pages.
