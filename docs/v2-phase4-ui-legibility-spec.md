# Math Whiz Kids v2 — Phase 4 Spec: UI legibility pass

Branch: continue on `v2` (do not touch `main`; do not push unless told). Behavior/game logic is **out of scope**: do not change stores, engines, rewards, selection, or i18n keys' meaning. This is a presentation pass (components, Tailwind classes, small presentational helpers, new i18n labels where needed — both languages, Traditional Chinese only).

## 0. Problem (measured, baseline from a headless-Chrome audit at 390×844, 820×1180, 1280×800)
User feedback: "the UI doesn't read very well". Measured:
- **Map** (`MapScreen`): page is 3037 px tall (kinder), 1832 px (grade4); labels such as "Learning"/"New"/"新挑戰" are 11 px; star ratings are tiny text glyphs; the zig-zag path + semi-transparent label cards waste space and lower contrast; the 🧮 chart button has no label; only ~3 skills visible per screen.
- **Number Chart**: 81 cells at 34–43 px; the "✨" is 8 px; no legend (what do yellow/green/blue mean?); milestone chips tiny; colour is the only state cue.
- **Practice screen**: on 1280×800 the OK button's bottom is at 832 px (below the fold); in the wrong-answer state the document grows (968 px at 800 vh; 928 px at 844 vh on a phone) so OK/keypad get pushed off screen; content is a narrow column on tablets/desktop with small ten-frame dots.
- **Album**: category counts are 12 px.
- **All screens**: fixed narrow column (~450 px) on tablets/desktops; unlabeled icon buttons in the header; star/progress glyphs are small.
Audience: a 5-year-old (kinder, English-leaning) on a tablet/phone/laptop, and a 10-year-old (grade4, Chinese). Parents glance at screens too.

## 1. Global rules
1. **Type scale**: no visible text under **14 px** anywhere (verify by the audit, §6). Primary labels (skill names, button labels, counts) ≥ **16 px**; kinder primary labels ≥ **18 px**. Headings 24–32 px. Question equation scales with viewport (clamp) up to 96 px.
2. **Contrast**: text on tinted/gradient backgrounds must sit on an opaque white (or near-white) card/chip with dark text (≥ 4.5:1). No grey-on-pale-grey text, no text directly on the sky gradient except large headings with a dark colour. Disabled/locked states still readable (≥ 3:1) and never rely on colour alone (add icon/shape/text).
3. **Responsive width**: phone = full width with 16 px gutters; ≥ 640 px wide = centered content up to **672 px** for map/chart/album/result lists (2-column grids where specified), practice screen content up to **520 px** but fonts/keypad scale up with viewport via `clamp()`. Never horizontal scroll (390, 360, 820, 1280 widths).
4. **Fit the viewport** where interaction needs it: the practice screens (`GamePlayScreen`, `BlitzScreen`, grade4 division state, wrong-answer/correction state, Help button visible) must show **question + answer box + keypad + OK fully inside the viewport without scrolling** at 360×640, 390×844, 820×1180, 1280×800 (use `dvh`/clamp sizing for key heights, aid size and spacing; the correction text may replace (not add to) vertical space, e.g. overlay/compact layout). Kinder keypad buttons stay ≥ 72 px tall when the viewport height allows; on short viewports (< 700 px tall) they may shrink to no less than 56 px.
5. **Tap targets**: all buttons ≥ 48 px; kinder-mode primary buttons ≥ 72 px (existing rule) except where the short-viewport exception above applies.
6. **Icon buttons get text**: any header/icon-only button that triggers navigation to a feature (chart, cards, blitz, tickets) shows an icon **plus a short visible label** (≥ 14 px) — home (🏠) may stay icon-only with `aria-label`. Keep `aria-label`s.
7. Consistent top bar component (`TopBar`: back/home, title or user chip, right-side stats chips) reused on map, chart, album; stats chips (🪙 coins, 🔥 streak, 🎫 tickets) have visible text ≥ 16 px and a tooltip/aria-label.
8. Respect `prefers-reduced-motion` (existing) and keep all existing a11y roles/labels.

## 2. Map (`MapScreen.tsx`) — replace the zig-zag path with a readable skill list
- **Primary action first**: below the top bar a large **"Continue"** button (e.g. "▶ Continue: Add up to 5" / "▶ 繼續:5以內加法") that starts `recommendedSkillId` (the "Start here" skill). Visible above the fold at 390×844 and 1280×800.
- **Secondary actions** in one row of three labelled buttons: My Cards, 60-second blitz, Number Chart (icon + text, ≥ 72 px tall in kinder mode; wrap nicely on narrow widths).
- **Skill list**: single column on phone, **2 columns at ≥ 640 px**. Each skill is a card (opaque white, rounded, ≥ 84 px tall): big emoji/icon on the left (≥ 40 px), **skill name 18–20 px bold**, optional example line ≥ 14 px (e.g. "(例:3+3)"), **star rating as 3 large SVG/emoji stars (≥ 24 px) with filled=gold, empty=outlined grey**, and a **status chip** with text ≥ 14 px (New / Learning / Mastered or 新挑戰 / 練習中 / 已熟練) that also has an icon. States: recommended (accent border + "Start here!" badge), available, locked (lock icon + "Play the one before first" hint on tap; greyed but readable), daily review pinned at top. Reuse existing unlock/recommended/mastery logic and stars from the store — do not reimplement logic.
- Page height target: kinder ladder (13 + review) should be ≤ ~1300 px tall on phone and ≤ ~900 px on ≥ 640 px (2 columns).
- Keep the toast/hint for locked nodes (readable, ≥ 16 px, ≥ 2 s).

## 3. Number Chart (`NumberChartScreen.tsx`)
- Grid uses the **full available width**: cells `aspect-square`, ≥ 36 px on 360–390 px wide phones (grid max width = viewport − gutters), up to ~56 px on ≥ 640 px; row/column headers ≥ 16 px bold.
- Cell content: mastered = the **answer number** (≥ 18 px bold, dark on blue) + a small ⭐ badge in a corner (≥ 12 px **as a shape, not the only cue**); solid = green + ✓; learning = yellow + • ; unseen = grey empty. State must be distinguishable without colour (icon/shape) .
- **Legend** under the progress card: four chips (icon + text ≥ 14 px): Not yet / Learning / Solid / Mastered (zh: 還沒練 / 練習中 / 穩了 / 熟練).
- Progress card: "13 / 81" ≥ 28 px; progress bar ≥ 14 px tall; milestone chips ≥ 14 px text with ticket icon, claimed ones visibly filled with ✓.
- Tabs ➕ Add / ➖ Take away ≥ 72 px kinder; heading "Number Chart" ≥ 28 px.
- Cell dialog text ≥ 16 px.

## 4. Practice screens (`GamePlayScreen`, `BlitzScreen`, `TenFrame`, result screen)
- Equation font `clamp(44px, 9vw, 96px)` (kinder) / `clamp(32px, 7vw, 72px)` (grade4 long numbers still must not overflow; keep nowrap/overflow safeguards).
- **Ten-frame** dots scale with viewport (≥ 26 px on 390 px phones, ≥ 36 px on ≥ 820 px); the two frames may wrap into two rows on narrow viewports; keep text alternative.
- Answer box and keypad sized with `clamp()`/`dvh` so everything fits (§1.4). The wrong-answer/correction state must not push the keypad/OK off screen: show the correction as a compact banner inside the answer area (e.g. correct answer in the answer box + one short line), not two extra stacked blocks. Help button, retry marker and counter ≥ 16 px.
- Grade4 division (quotient & remainder boxes, remainder toggle) must fit in the same viewport rules.
- Result screen: star row ≥ 64 px each on phone, buttons ≥ 72 px kinder, text ≥ 16 px; no overlap of confetti with text (confetti must not obscure buttons: pointer-events none, lower z-index than the card or fewer particles near the card).

## 5. Album / Setup / dialogs / pack modal
- Album: category tab counts ≥ 14 px; tabs and tile captions ≥ 14 px (truncate with ellipsis); grid 3 columns on phone, 4–6 on wider (≥ 640 px) with larger tiles; same `TopBar`.
- Setup screen: keep layout but ensure fonts/targets follow §1 and the card widens to 520 px on ≥ 640 px.
- Pack modal / card detail dialog: text ≥ 16 px, buttons ≥ 72 px kinder; modal fits 360×640 without internal scrolling issues.

## 6. Acceptance — measured by the orchestrator's headless audit (will be run after your work)
At viewports **360×640, 390×844, 820×1180, 1280×800**, with a kinder (English) and a grade4 (zh-TW) user, across: setup, map, chart, game (question / wrong answer / Help shown), blitz, result, album, pack modal:
1. **0 visible text nodes with computed font-size < 14 px** (emoji glyph decorations that are `aria-hidden` and purely decorative may be < 14 px only if a non-colour cue exists elsewhere; avoid them).
2. **0 buttons with min(width,height) < 48 px** (kinder primary ≥ 72 px except §1.4 exception).
3. **No horizontal scroll** at any viewport.
4. **Practice screens: OK/submit button bottom ≤ viewport height** (including wrong-answer state, Help shown, grade4 division) at all four viewports.
5. Map document height ≤ ~1300 px on phone widths (kinder), "Continue" button bottom ≤ 600 px at 390×844.
6. Chart cells ≥ 36 px at 360 px width; legend present.
7. `npm run build`, `npm run lint`, `npm test` pass; no `any`/`@ts-ignore`/`eslint-disable`; no new runtime deps; existing tests updated only where DOM-independent expectations changed (logic tests must not change).
8. All Chinese text Traditional (Taiwan). i18n key parity test passes.

## 7. Notes for the developer
- Prefer small reusable components: `TopBar`, `SkillCard`, `StarRating`, `StatChip`, `LegendChip`. Replace the old zig-zag path code and any dead CSS.
- Use Tailwind 4 utilities; for viewport-aware sizes use `clamp()` and `dvh` arbitrary values (e.g. `h-[clamp(52px,8dvh,76px)]`, `text-[clamp(44px,9vw,96px)]`).
- You can reproduce the audit yourself only if a browser is available; otherwise be conservative: bigger minimums, and verify by reasoning about the sizes (the orchestrator will measure).
- Do not touch `public/cards`, `scripts/card_raw`, card data, or game logic. Small logical commits on `v2`, with the usual trailers and `-c user.name=danny -c user.email=danny61918@gmail.com`; no push.
- Final report: per spec section done/not done, decisions made, anything unfinished. A separate reviewer will check.
