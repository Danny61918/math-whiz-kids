# Math Whiz Kids v2 — Phase 1 Spec

Branch: `v2` (do not touch `main`, do not push). Stack stays: Vite + React 19 + TS + Tailwind 4 + Zustand.

## 0. Product context
Two users:
- **kinder** (大班, ~5yo): addition/subtraction only. Prefers **English** UI. Big buttons, visual objects.
- **grade4** (國小四年級, ~10yo): large-integer add/sub/mul/div now; fractions/decimals come in Phase 2 (NOT this phase). Prefers **zh-TW**.

The farm/idle game is being dropped. Rewards in later phases = map + stars + collectible cards. Phase 1 only builds the practice foundation; coins remain.

## 1. Scope of Phase 1
1. Remove farm + block code.
2. Per-user language and per-user mode.
3. Skill-based question engine (replaces digit-setting engine).
4. Skill progress tracking (per user).
5. Store versioning + migration from v1 saves.
6. Vitest unit tests.
7. UI: setup/skill-select screen + practice screen adapted to skills. No shop, no space.

Out of scope: fractions, decimals, vertical-calculation UI, map, cards, parent page, PWA, TTS.

## 2. Deletions
Delete files: `components/SpaceScreen.tsx`, `ShopScreen.tsx`, `ItemIcon.tsx`, `BlockWorldScreen.tsx`, `BlockShopScreen.tsx`, `BlockIcon.tsx`, `data/shopItems.ts`, `data/blockItems.ts`, `assets/react.svg` if unused.
Remove from store: `inventory`, `placedItems`, `landLevel`, `buyItem`, `placeItem`, `moveItem`, `removeItem`, `growPlants`, `harvestPlot`, `removeAllPlacedItems`.
Remove farm/shop/block keys from `i18n.ts`. No dead code, no unused exports.

## 3. Data model (`src/store/useGameStore.ts`)

```ts
export type Language = 'zh-TW' | 'en';       // re-export from i18n, single source
export type UserMode = 'kinder' | 'grade4';

export interface SkillStats {
  attempts: number;            // lifetime
  correct: number;             // lifetime
  recent: boolean[];           // last 10 results, newest last
  avgTimeMs: number;           // exponential moving average, alpha 0.2
  lastPlayedAt: number;        // epoch ms
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  mode: UserMode;
  language: Language;
  coins: number;
  skills: Record<string, SkillStats>;   // key = SkillId
}

interface GameState {
  users: Record<string, UserProfile>;
  currentUserId: string | null;
  // actions
  createUser(name: string, avatar: string, mode: UserMode, language: Language): void;
  switchUser(id: string): void;
  setUserLanguage(language: Language): void;   // current user
  addCoins(amount: number): void;
  recordAnswer(skillId: string, correct: boolean, timeMs: number): void;
}
```
- Remove global `language`, `settings`, `updateSettings`, `GameSettings`. (Question count is per-mode constant: kinder 5, grade4 10.)
- Provide selector hooks/helpers: `useCurrentUser()` returning `UserProfile | null`, and `useLanguage()` returning current user's language (fallback `'zh-TW'` when no user). Components use these; do not duplicate "get current user" boilerplate inside each action — write one internal `updateCurrentUser(set, fn)` helper.
- `persist` options: `name: 'math-whiz-kids-storage'`, **`version: 2`**, `migrate`.
- Keep the `storageService` adapter.

### Migration v1 → v2 (`migrate(persisted, version)`)
v1 shape: `{ users: Record<id, {id,name,avatar,coins,inventory,placedItems,landLevel}>, currentUserId, settings, language }`.
For each user: keep `id,name,avatar,coins`; drop farm fields; set `language = old global language ?? 'zh-TW'`; set `mode = 'grade4'` (user can change later — add a mode switch in user creation only; migrated users default grade4); `skills = {}`. Drop `settings` and global `language`. Must tolerate missing/garbage fields (no throw). Export `migrateV1ToV2` as a pure function so it can be unit-tested.

## 4. Skills (`src/data/skills.ts`)

```ts
export interface Skill {
  id: string;                  // stable, e.g. 'k_add_10'
  mode: UserMode;
  nameKey: string;             // i18n key
  order: number;               // display order within mode
  multiplier: number;          // coin multiplier
}
export const skills: Skill[];
export const skillsForMode(mode): Skill[]  // sorted by order
```

Initial skill list:

**kinder** (all single-answer integers, answer ≥ 0):
| id | description | multiplier |
|---|---|---|
| `k_add_5` | a+b, sum ≤ 5, a,b ≥ 1 | 1.0 |
| `k_sub_5` | a−b, a ≤ 5, result ≥ 0 | 1.0 |
| `k_add_10` | a+b, sum ≤ 10 | 1.1 |
| `k_sub_10` | a−b, a ≤ 10 | 1.1 |
| `k_make10` | a+?=10 style: question `a + ? = 10` (answer = 10−a, a∈1..9) | 1.2 |
| `k_add_20` | a+b, sum ≤ 20, no carry required first? → **allow carry**, a,b ≥ 1 | 1.3 |
| `k_sub_20` | a−b, a ≤ 20, includes borrow cases | 1.3 |

**grade4**:
| id | description | multiplier |
|---|---|---|
| `g_add_4` | 4-digit + 4-digit (or 3–4 digit), requires ≥1 carry | 1.2 |
| `g_sub_4` | 4-digit − 3–4 digit, result > 0, requires ≥1 borrow | 1.2 |
| `g_add_6` | 5–6 digit + 5–6 digit, ≥2 carries | 1.4 |
| `g_sub_6` | 5–6 digit − 5–6 digit, result > 0, ≥2 borrows | 1.4 |
| `g_mul_21` | 2-digit × 1-digit | 1.3 |
| `g_mul_32` | 3-digit × 2-digit | 1.6 |
| `g_mul_42` | 4-digit × 2-digit | 1.8 |
| `g_div_21` | 2-digit ÷ 1-digit, with remainder (≈70% non-zero remainder) | 1.4 |
| `g_div_32` | 3-digit ÷ 2-digit, with remainder (≈70%) | 1.8 |
| `g_div_41` | 4-digit ÷ 1-digit, with remainder (≈70%) | 1.6 |

## 5. Question engine (`src/utils/mathEngine.ts`, rewrite)

```ts
export interface Question {
  skillId: string;
  operator: '+' | '-' | '×' | '÷';   // display operator
  left: number | null;               // null = unknown slot (for k_make10: shown as ?)
  right: number | null;
  result: number | null;             // k_make10 shows result (10)
  answer: number;                    // the quotient / the value to type
  remainder?: number;                // division only: user must also enter remainder
  key: string;                       // dedupe key
}
export type Rng = () => number;      // [0,1), default Math.random

export function generateQuestion(skillId: string, rng?: Rng, recentKeys?: string[]): Question;
export function generateSession(skillId: string, count: number, rng?: Rng): Question[]; // no duplicate keys within a session
export function checkAnswer(q: Question, input: { answer: number; remainder?: number }): boolean;
```
Rules:
- **Pure**: no module-level mutable state (remove the old global `questionHistory`). Dedupe via `recentKeys`/`generateSession`.
- All randomness through injected `rng` (tests use a seeded PRNG, e.g. mulberry32 in the test file).
- Never produce negative numbers, never `left === right` for subtraction (result 0 allowed only for kinder `k_sub_*`? → **no zero results, no zero operands** unless stated).
- Keep the "interesting number" ideas from the old engine (avoid trailing zeros, avoid 1 in multiplication/division, favor harder digits) but simplified and deterministic under rng.
- Carry/borrow counting helpers: `countCarries(a,b)`, `countBorrows(a,b)` exported for tests.
- If constraints cannot be met within 100 attempts, fall back to a valid question for that skill (never loop forever, never throw).
- Division: `left = quotient*right + remainder`, `0 ≤ remainder < right`; divisor ≥ 2; quotient ≥ 2. `checkAnswer` requires both quotient and remainder to match (remainder omitted ⇒ treated as 0).

## 6. Mastery (`src/utils/mastery.ts`)
```ts
export type Mastery = 'new' | 'learning' | 'mastered';
export function getMastery(stats?: SkillStats): Mastery;
```
- `new`: no stats or attempts < 5.
- `mastered`: `recent.length ≥ 10`, ≥ 9 of last 10 correct, and `avgTimeMs ≤ 15000` (kinder) — keep time threshold as an optional param, default 20000.
- else `learning`.
Pure + unit-tested. Used by the skill-select screen to show a badge.

## 7. Rewards (in `GamePlayScreen` or `src/utils/rewards.ts` — prefer the util for testability)
```ts
export function questionCoins(skill: Skill, timeMs: number): number
// base = 10; ≤5s → 30; ≤10s → 20; then Math.round(base * skill.multiplier)
export function sessionBonus(total: number, correctCount: number, totalQuestions: number): number
// all correct → Math.round(total * 1.2), else total
```
Wrong answers give 0 coins. Kinder: wrong answer shows gentle retry text, no red X harshness; the question is shown once more after a wrong answer (append to end of the queue once; the retry does not give coins and counts as not-correct for the first attempt). Grade4: wrong answer shows correct answer, moves on.

## 8. UI

### `App.tsx`
Screens: `'setup' | 'skills' | 'game'`. No `alert()` — if no user, `SetupScreen` simply keeps start disabled with inline hint.

### `SetupScreen` (user select / create)
- List users (name, mode badge, coins). Select = `switchUser`.
- Create user: name, mode (kinder/grade4 two big buttons), language (zh-TW/English; default en for kinder, zh-TW for grade4 — pre-selected but changeable).
- Language toggle for current user (`setUserLanguage`). The current user's mode can also be switched here (`setUserMode`).
- "Start" → skills screen.

### `SkillSelectScreen` (new)
- Grid/list of `skillsForMode(user.mode)`, each with name, mastery badge (new/learning/mastered), recent accuracy.
- Tap = start a session of that skill.
- Kinder: very large tap targets (min 72px height), emoji icons ok.

### `GamePlayScreen`
- Props: `skillId`, `onBack`.
- Uses `generateSession(skillId, count)` once on mount (stable via `useState` initializer or `useRef`; no regeneration on re-render).
- Number pad on screen (0–9, backspace, submit); kinder buttons ≥ 64px. Physical keyboard digits/Enter/Backspace also work.
- Division shows two fields: quotient and remainder (as before).
- Kinder visual aid: for `k_add_5/10`, `k_sub_5/10`, `k_make10` render the quantity as emoji objects (e.g. 🍎) under the numbers, max 10 per group. Not needed for 20-skills.
- After each answer call `recordAnswer(skillId, correct, timeMs)`.
- Result screen: correct count, coins earned, back to skills.
- Re-use existing audio service for correct/incorrect sounds if present.

### i18n
- `t(key, lang)` signature stays. Add keys for new screens; remove dead keys. Both `zh-TW` and `en` must contain **identical key sets** (add a unit test asserting this). Skill names in both languages (kinder skill names should be very child-friendly, e.g. "Add up to 5" / "5以內加法").

## 9. Tests (Vitest)
Add `vitest` devDependency and `"test": "vitest run"` script. Tests (co-locate `*.test.ts`):
1. **mathEngine**: for every skill id, generate 300 questions with seeded rng and assert all constraints in §4 (digit counts, carry/borrow counts, answer ≥ 0, division relation, remainder range, no zero operands). `generateSession` has no duplicate keys. `checkAnswer` correctness incl. remainder.
2. **mastery**: boundary cases.
3. **rewards**: time tiers, multiplier rounding, all-correct bonus.
4. **migration**: v1 fixture → v2 shape; garbage input does not throw; coins preserved; language taken from old global.
5. **i18n**: key parity between languages.
No React component tests required this phase.

## 10. Acceptance criteria
- `npm run build`, `npm run lint`, `npm test` all pass with zero errors.
- `grep -ri "farm\|plot\|placedItems\|inventory\|shopItems\|blockItems\|SpaceScreen\|ShopScreen"` over `src/` returns nothing (except the migration function/test fixture, which may mention v1 field names).
- No `alert(`, no `any`, no `@ts-ignore` / `eslint-disable` added.
- Manually verifiable flow: create kinder user (English) → pick `k_add_10` → 5 questions → coins increase → skill shows progress; switch to a grade4 user (中文) → `g_div_32` shows quotient+remainder fields.
- Commits: small, logical, on branch `v2`, conventional-commit style. Do not push. Do not modify `main`.

## 11. Working notes for the developer
- Read the existing `GamePlayScreen.tsx`, `SetupScreen.tsx`, `useGameStore.ts`, `mathEngine.ts`, `i18n.ts`, `audioService.ts` first; reuse styling (Tailwind classes) where sensible but the farm-themed copy goes away.
- Do not add dependencies other than `vitest`.
- If the spec is ambiguous, pick the simplest reading and list the decision under "Decisions made" in your final report. Do not silently skip a requirement; list anything unfinished.
