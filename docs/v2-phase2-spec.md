# Math Whiz Kids v2 — Phase 2 Spec: "Fun & Drive" (stars, map, streak, collectible cards)

Branch: continue on `v2` (or `v2-phase2` off `v2`; do not touch `main`; do not push unless told). Same stack. Phase 1 spec: `docs/v2-phase1-spec.md` (done).

## 0. Goal
The two kids (kinder, ~5yo, English-leaning; grade4, ~10yo, Chinese-leaning) must **want** to practice. Phase 1 gives coins with nothing to spend them on. This phase adds a motivation loop:

**Practice → stars + coins → open card packs → fill the album → streak keeps them coming back.**

Design rules (non-negotiable):
- No real money, no timers that punish absence, no FOMO, no "you lose" mechanics. A missed day resets the flame but never removes anything earned.
- Every practice session must feel rewarding even when answers are wrong (gentle for kinder).
- No dark patterns: duplicates are never "wasted" (they refund coins); pity system guarantees progress.
- Kinder UI: huge targets, almost no reading required, emoji/visual first. Grade4 UI: can show numbers/progress.
- Everything bilingual via existing i18n (`t(key, lang)`, identical key sets, per-user language).

Out of scope: fractions/decimals (Phase 3), parent page, PWA, TTS for questions, real artwork (cards use emoji art now; see §5).

## 1. Data model additions (`useGameStore.ts`, persist **version 3**, `migrate` handles 0→2→3 chain)

```ts
export interface StreakState { count: number; best: number; lastDay: string | null } // lastDay = local 'YYYY-MM-DD'
export interface UserProfile {
  // ...existing...
  stars: Record<string, 0 | 1 | 2 | 3>;     // best stars per skillId
  cards: Record<string, number>;            // cardId -> copies owned (>=1 means discovered)
  tickets: number;                          // free pack tickets
  pity: number;                             // pulls since last rarity>=3 card
  streak: StreakState;
  dailyBonusDay: string | null;             // day the daily first-session ticket was granted
  totalSessions: number;
}
```
- v2→v3 migrate: add defaults (`stars:{}, cards:{}, tickets:0, pity:0, streak:{count:0,best:0,lastDay:null}, dailyBonusDay:null, totalSessions:0`). Must tolerate garbage; pure exported function `migrateV2ToV3`; unit-tested; chain with existing `migrateV1ToV2` for old saves (version 0).
- New actions (all via the single `updateCurrentUser` helper): `completeSession(result)`, `openPack(rng?, now?)`, plus whatever small helpers are needed. `now`/`rng` injectable for tests. **No `Date.now()` / `Math.random()` inside pure logic modules** — pass them in.

## 2. Stars (`src/utils/stars.ts`, pure)
`calcStars(correctFirstTry: number, total: number): 0|1|2|3`
- 3★ = all questions correct on first try.
- 2★ = ≥ 80% (kinder 5Q: ≥4; grade4 10Q: ≥8).
- 1★ = finished the session (anything else).
Store keeps the **best** stars per skill. Show stars on result screen (animated one by one) and on map nodes.

## 3. Map (`SkillSelectScreen` → map view)
Replace the flat list with a vertical winding path of nodes, one per skill in `order`, current mode only.
- Node states: locked / available (current) / done (1–3★). Unlock rule: first node always open; next node opens when the previous has ≥1★. (Low barrier; no grinding gate.) Already-played skills from Phase 1 saves count as unlocked if they have recorded attempts (don't lock out existing progress): treat `skills[id].attempts > 0` as ≥1★ for unlock purposes at migration time (set `stars[id]=1` in `migrateV2ToV3` when attempts>0).
- Current node pulses/bounces (CSS only). Locked nodes show a lock and are not tappable (gentle shake on tap).
- Show mastery badge (existing `getMastery`) as a small marker, stars under each node.
- Header: coin count, 🔥 streak, 🎫 tickets, and a big **Cards** button → album. Kinder: ≥ 72px targets.
- Path is a simple CSS layout (alternating left/right offsets + connecting line); no canvas/lib.

## 4. Streak & daily bonus (`src/utils/streak.ts`, pure)
```ts
export function dayKey(d: Date): string                       // local 'YYYY-MM-DD'
export function updateStreak(s: StreakState, today: string): StreakState
// same day -> unchanged; yesterday -> count+1; else -> count=1; best=max(best,count)
export const STREAK_MILESTONES = [3, 7, 14, 30]               // reaching one grants +1 ticket
```
- Completing ≥1 session in a day updates the streak (call in `completeSession`).
- **Daily first-session bonus**: first completed session of a local day grants +1 ticket (`dailyBonusDay`).
- Milestone tickets granted once when the count first hits a milestone that day.
- Edge cases to unit test: month/year boundaries, DST-safe day diff (compare calendar days via dayKey, not 24h math), clock going backwards (treat as same day, never decrease), first ever session.
- Displayed: 🔥 + count on the map header; a short celebratory toast when it increments.

## 5. Cards (`src/data/cards.ts`) — **200 cards**
```ts
export type CardCategory = 'dino' | 'car' | 'plane' | 'ship_train' | 'space' | 'rescue';
export interface Card { id: string; category: CardCategory; rarity: 1|2|3|4; nameEn: string; nameZh: string; emoji: string; hue?: number }
export const cards: Card[]; export const cardsById: Record<string, Card>;
```
Counts: dino 40, car 40, plane 30, ship_train 25, space 25, rescue 40 (=200). Rarity share ≈ 50% r1, 30% r2, 14% r3, 6% r4 overall (±3 cards).
Rules:
- `id` stable snake_case, unique (e.g. `dino_triceratops`). Never renumber later.
- Names must be **correct, real, kid-appropriate** in both languages (zh-TW wording as used in Taiwan: 暴龍, 三角龍, 劍龍, 翼龍, 挖土機, 消防車, 高鐵…). English names are real words a 5-year-old will learn (Triceratops, Fire Truck, Rocket…). No duplicates within a category. Dinosaurs = real species; vehicles = real vehicle types.
- Art: card face = large emoji. There are not 40 distinct dinosaur emoji, so reuse emoji across similar cards is allowed, but each card gets a `hue` (0–359) used as the card background tint so siblings look different; rarity decides frame style (r1 plain, r2 silver, r3 gold, r4 holographic/rainbow animated border — CSS). Add an optional `art?: string` (image URL) field that, when present, replaces the emoji later. Document this clearly in code comment and README: **placeholder art, to be replaced by real illustrations later**.
- **Art is user-supplied** through a pipeline: images go in `public/cards/<cardId>.webp` (square, ~512x512, small); `CardView` shows the image when the file exists and falls back to the emoji + hue face when it is missing or fails to load. `npm run cards:prompts` exports one generation prompt per card to `docs/card-prompts.csv/.json`; `npm run cards:check` reports which cards have art. See `public/cards/README.md`.
- Validation test (see §9) enforces all counts/uniqueness/non-empty names/emoji present.

## 6. Packs (`src/utils/packs.ts`, pure)
```ts
export const PACK_PRICE = { kinder: 60, grade4: 150 }
export const PITY_LIMIT = 10                    // every 10th pull without rarity>=3 is guaranteed >=3
export const RARITY_WEIGHTS = { 1: 60, 2: 28, 3: 9, 4: 3 }
export const DUPLICATE_REFUND = { 1: 15, 2: 30, 3: 60, 4: 120 }   // coins back for a duplicate
export function drawCard(rng: Rng, pity: number, owned: Record<string, number>): { card: Card; isNew: boolean; nextPity: number }
```
- Pick rarity by weights (forced to ≥3 when `pity+1 >= PITY_LIMIT`), then a uniform card of that rarity. **Prefer unowned cards**: within the rarity, if any unowned card exists, 70% of the time choose among unowned only (reduces frustration late in the collection); if the rarity is fully owned, still draw (duplicate).
- `nextPity` = 0 if rarity ≥ 3 else pity+1.
- `openPack` action: costs a ticket if `tickets > 0`, else costs `PACK_PRICE[mode]` coins; if neither affordable, no-op and returns false. Duplicate → refund coins `DUPLICATE_REFUND[rarity]` and still increments count. Atomic (single `set`).
- Statistics test: with a seeded rng, 10,000 draws approximate the weights; pity forces rarity ≥3 within PITY_LIMIT pulls; owned-preference works; full collection still draws.

## 7. Screens / UX
Flow: `setup` → `map` (replaces skills) → `game` → `result` → back to map. Plus `album` and a pack-opening modal. Add them to `App.tsx` screen state (keep it simple; no router lib).

### Result screen (in `GamePlayScreen`'s finished state, extract to `ResultScreen.tsx`)
- Stars appear one-by-one (CSS animation + sound), coins counting up, "new streak day" toast, daily ticket earned message.
- Buttons: "Open pack" (if affordable/ticket) highlighted, "Next skill" (if unlocked), "Back to map".
- Confetti on 3★ (pure CSS/emoji particles; **no new dependency**). Respect `prefers-reduced-motion`.

### In-game
- Combo counter: consecutive first-try-correct answers show "🔥 x3" with escalating praise strings (i18n). Never shown negatively.
- Keep Phase 1 behavior (retry queue, gentle kinder feedback) unchanged.

### Pack opening (`PackOpenModal.tsx`)
- Big pack emoji → tap → shake → flip reveal of the card (CSS 3D flip), rarity sparkle, "NEW!" badge or "Duplicate +N 🪙".
- Plays sounds (reuse `audioService`; add a short rising "reveal" tone and a bigger fanfare for rarity ≥3, gentle for kinder).
- Can open several in a row if tickets/coins allow ("Open another").

### Album (`AlbumScreen.tsx`)
- Category tabs with progress `owned/total`; grid of cards; undiscovered = dark silhouette with "?".
- Tap a discovered card → detail view: large card, both names, rarity stars, copies owned, 🔊 button speaking the **English name** (and Chinese name via a second button) using `speechSynthesis` if available (feature-detect; hide button if unsupported; `lang` 'en-US' / 'zh-TW').
- Overall progress bar "37 / 200". Category completion shows a ✨ badge (cosmetic only for now).

### i18n
All new strings in both languages, identical keys (existing parity test must pass). Category names, rarity names, praise lines, toasts, button labels. Kinder-friendly short English; natural zh-TW.

## 8. Code organization
- New files: `src/utils/stars.ts`, `streak.ts`, `packs.ts`, `src/data/cards.ts`, `src/components/{MapScreen,ResultScreen,PackOpenModal,AlbumScreen,CardView,Confetti}.tsx` (rename/replace `SkillSelectScreen` as appropriate), tests alongside.
- `CardView` is one reusable component (sizes sm/md/lg; handles emoji vs `art`, hue tint, rarity frame, silhouette mode).
- No new runtime dependencies. No `any`, no `@ts-ignore`/`eslint-disable`, no `alert()`.
- Accessibility: buttons are real `<button>`s with accessible labels; animations disabled under `prefers-reduced-motion`.

## 9. Tests (Vitest)
1. `stars`: thresholds for both question counts.
2. `streak`: all edge cases in §4.
3. `packs`: weights (seeded 10k draws, tolerance), pity, owned-preference, refund amounts, full-collection draw, `openPack` store action (ticket first, then coins, insufficient funds no-op, duplicate refund, atomic).
4. `cards` validation: 200 total, per-category counts, unique ids, unique `nameEn` and `nameZh` within a category, non-empty strings, valid hue range, rarity distribution within tolerance, every `emoji` non-empty.
5. migration v2→v3 incl. chain from v0 and `stars[id]=1` for skills with attempts>0.
6. `completeSession` store action: stars best-of, streak update, daily ticket once per day, milestone ticket, totalSessions++, coins unaffected beyond what GamePlay already awards (do not double-award).
7. i18n parity still passes.

## 10. Acceptance
- `npm run build`, `npm run lint`, `npm test` pass.
- Browser-verifiable flow (the orchestrator will drive it): kinder user plays a session → sees stars + coins → opens a pack (via ticket or 60 coins) → card reveal → album shows it → streak shows 🔥1; second session same day gives no second daily ticket; grade4 user in Chinese sees all new UI in zh-TW; narrow (390px) width has no horizontal scroll on map/album/result.
- Small logical commits; do not push; do not touch `main`.

## 11. Notes for the developer
- Read the Phase 1 code first (`GamePlayScreen`, `useGameStore`, `i18n`, `audioService`, `skills`). The existing "award coins at the final submit" logic must stay exactly once-only; hook `completeSession` there without double-awarding.
- When ambiguous, pick the simplest option and list it under "Decisions made". Report anything unfinished or deviating. A separate reviewer will check against this spec.
