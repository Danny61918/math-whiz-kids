# Math Whiz Kids v2 — Phase 3 Spec: "Fluency Engine" for kinder add/sub (single digit)

Branch: continue on `v2` (do not touch `main`; do not push unless told). Read first: `docs/v2-phase1-spec.md`, `docs/v2-phase2-spec.md`, and the existing code (`mathEngine.ts`, `GamePlayScreen.tsx`, `session.ts`, `MapScreen.tsx`, `useGameStore.ts`, `skills.ts`, `ObjectAid.tsx`, `rewards.ts`, `mastery.ts`, `i18n.ts`).

## 0. Goal
The kinder child (5yo, English-leaning) must become **fluent** — able to recall — in all one-digit addition and subtraction facts. Phase 1–2 gave "can compute" but not "fluent". Problems being fixed:
1. No per-fact tracking (7+8 is weak, 2+3 is solid, but selection is uniform random).
2. Coarse difficulty (≤5, ≤10, ≤20); no strategy ladder (doubles, make-10, near-doubles, +8/+9, bridging through 10).
3. Object aid always visible → child counts instead of recalling.
4. "Mastered" = 9/10 correct & avg 15 s: too loose; timing includes typing time.
5. Speed-tier coins pressure a 5-year-old; fast ≠ understood.
6. Only 5 questions/session, add and sub never interleaved, no fact-family link, first wrong answer hides the correct answer.
7. Little visible long-term progress.

Grade4 mode is **out of scope and must keep working unchanged**.

"One-digit facts" = both operands 1–9, sums up to 18; subtraction minuend up to 18, subtrahend 1–9, answer 1–9. **No zeros.** 81 addition facts (ordered pairs a+b, a,b ∈ 1..9) and 81 subtraction facts.

## 1. Fact model (`src/data/facts.ts`, pure)

```ts
export type FactKey = string;               // add: `${a}+${b}` ; sub: `${m}-${s}` (m = minuend, s = subtrahend)
export interface Fact { key: FactKey; op: '+' | '-'; a: number; b: number; sum: number } 
// For '+': operands a,b, answer = a+b. For '-': minuend m = a+b (sum), subtrahend s = a, answer = b. (a,b ∈ 1..9)
export const allFacts: Fact[];              // 81 add + 81 sub = 162
export function factKey(op, a, b): FactKey;
export function parseFactKey(k): Fact | null;
```
- A subtraction fact `m-s=b` is the fact-family partner of addition `s+b=m`. The chart (§6) is indexed by (a,b).
- Facts are **global per user**: practising `7+3` in "Make 10" and in "Add up to 10" updates the same fact.

## 2. Fact progress (`src/utils/factProgress.ts`, pure; inject `today: string` day-key from `utils/streak.ts`, never call Date inside)

```ts
export interface FactStats { box: 0|1|2|3|4|5; attempts: number; correct: number; lastSeenDay: string | null; lastUpDay: string | null; bestMs: number | null }
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];   // review interval per box
export const FAST_MS = 4000;                              // retrieval time threshold ("fluent")
export function updateFact(s: FactStats | undefined, r: { correct: boolean; retrievalMs: number }, today: string): FactStats
export function isDue(s: FactStats | undefined, today: string): boolean
export type FactLevel = 'unseen' | 'learning' | 'solid' | 'mastered'   // box 0-1 learning, 2-3 solid, 4-5 mastered(>=4)
export function factLevel(s?: FactStats): FactLevel
```
Rules for `updateFact` (first attempt of a question only; retries never call it):
- attempts++, lastSeenDay = today, bestMs = min.
- Correct **and** `retrievalMs <= FAST_MS`: box+1 (max 5), **but at most one box-up per calendar day** (if `lastUpDay === today` keep box). Set lastUpDay when it rises.
- Correct but slow: box unchanged (no penalty).
- Wrong: box = max(0, box - 2).
- `isDue`: unseen → true; else `daysBetween(lastSeenDay, today) >= BOX_INTERVAL_DAYS[box]` (0-day interval for box 0 means always due). Use calendar-day arithmetic from `streak.ts` helpers; a clock going backwards ⇒ not due (never throw).
- Mastered (box ≥ 4) facts are still reviewed per their interval; a wrong answer demotes them.
`retrievalMs` = time from the question appearing to the **first digit key/tap** (NOT submit). Measure it in `GamePlayScreen` with a ref set on the first `appendDigit` of each question.

## 3. Skill ladder (kinder) — pools

Replace the kinder entries in `skills.ts` (grade4 untouched). Each kinder skill has a **pool of facts** from `poolFor(skillId): Fact[]` (`src/data/facts.ts`):

| order | id | pool | question kinds |
|---|---|---|---|
| 1 | `k_add_5` | + with sum ≤ 5 | sum |
| 2 | `k_sub_5` | − with minuend ≤ 5 | diff |
| 3 | `k_plus12` | + where either operand is 1 or 2 (sum ≤ 11) | sum |
| 4 | `k_doubles` | a+a, a∈1..9 | sum |
| 5 | `k_make10` | + with sum = 10 (both orders) | sum 50%, missing-addend `a + ? = 10` 50% |
| 6 | `k_add_10` | + with sum ≤ 10 | sum |
| 7 | `k_sub_10` | − with minuend ≤ 10 | diff |
| 8 | `k_family_10` | + and − facts with sum ≤ 10 (families) | sum / diff / missing-addend `a + ? = c` mix, interleaved |
| 9 | `k_near_doubles` | a+(a±1), a∈3..8 (sums 7..17) | sum |
| 10 | `k_plus89` | + where an operand is 8 or 9 and the other 2..9 (sums 10..18) | sum |
| 11 | `k_add_11_18` | + with sum 11..18 | sum |
| 12 | `k_sub_11_18` | − with minuend 11..18 | diff |
| 13 | `k_mixed` | all 162 facts ("Mixed Master") | all kinds, interleaved |

- Remove old kinder ids `k_add_20`, `k_sub_20`. Keep `k_add_5`, `k_sub_5`, `k_add_10`, `k_sub_10`, `k_make10` ids (same meaning). `multiplier` stays on `Skill` (grade4 uses it; kinder: 1.0–1.3 ascending).
- A **special** non-ladder skill id `k_review` ("Daily Review"): pool = every fact the user has attempted (stats exists). Shown only when ≥ 10 facts attempted. Not part of the unlock chain; always available when shown.
- Tests: pool sizes/constraints (operands 1..9, no zero, sums ≤18, sub answers 1..9, minuend ≥ 2), the **union of ladder pools covers all 162 facts**, every pool non-empty, ids unique.

## 4. Question selection (`src/utils/mathEngine.ts` + new `src/utils/selection.ts`, pure)

```ts
export interface Question { /* existing, plus */ factKey?: string; kind?: 'sum' | 'diff' | 'missing' }
export function buildKinderSession(skillId: string, facts: Record<FactKey, FactStats>, today: string, count: number, rng: Rng): Question[]
```
- Candidate facts = `poolFor(skillId)` (for `k_review`: attempted facts).
- Buckets: **priority** (due AND box ≤ 1, i.e. weak/learning, plus any attempted fact whose last answer was wrong), **new** (unseen), **review** (attempted, due, box ≥ 2).
- Draw target mix 60% priority / 30% new / 10% review; if a bucket is empty, redistribute to the others; if everything is empty (all solid and nothing due), draw from the whole pool by lowest box. No duplicate `factKey` inside a session while the pool has enough facts (pool < count ⇒ allow repeats but never twice in a row).
- Interleave add/sub for mixed pools (shuffle final order; avoid > 2 same-kind in a row where possible).
- `kind` rules: `k_make10` and `k_family_10`/`k_mixed` may emit `missing` (`a + ? = c`: left=a, right=null, result=c, answer=b; fact is the addition fact a+b). `diff` for sub facts. Display operators as before ('+', '-').
- Session length for kinder = **8** (`QUESTION_COUNT.kinder`), grade4 stays 10. Update stars thresholds for 8 questions (3★ = all correct first try, 2★ ≥ 80% ⇒ ≥ 7/8 — compute via the existing ratio logic; adjust tests).
- Keep `generateSession` for grade4 skills (existing code path) untouched; kinder skills use `buildKinderSession`. `checkAnswer` unchanged.
- Tests with seeded rng: all questions' facts ∈ pool; no duplicates; distribution roughly 60/30/10 over many sessions (tolerance); priority facts are chosen more often than solid ones; empty-bucket redistribution; `k_review` only uses attempted facts; interleaving property.

## 5. Practice screen changes (`GamePlayScreen.tsx`, `session.ts`, new `TenFrame.tsx`)

1. **Aid fading per fact**: level from the fact's box: box 0–1 ⇒ ten-frame **visible**; box 2–3 ⇒ aid hidden behind a big "💡 Help" button (tap to show; using it marks the question as "helped": correct answer still counts as correct but does **not** box-up); box ≥ 4 or `k_mixed`/`k_review` ⇒ **no aid**, no help button.
2. **Ten-frame component** (replace emoji `ObjectAid` for kinder): 2 rows × 5 cells per frame; one frame for ≤10, two frames for up to 20 cells. Addition: first group filled with colour A, second with colour B. Subtraction: m filled, the last s cells crossed/dimmed. Missing-addend: left group filled colour A, remaining cells to the total as empty outlined (hint). Pure CSS/divs (no emoji circles needed), `aria-hidden` with a text alternative for a11y.
3. **Immediate correction (kinder)**: on a wrong first attempt show the correct answer **and the aid** right away in the gentle amber state (still no red, no negative words), then re-ask the same fact **3 questions later** (`insertAt = min(index + 3, queue.length)`), instead of at the end. A retry gives no coins, doesn't call `updateFact`, and is shown once only. Adapt `resolveSubmit` (pure) + its tests so `isLast`, award timing and perfect-bonus accounting stay correct (still exactly-once award at the final submit; keep all existing guarantees).
4. **Retrieval time**: record `retrievalMs` at first digit; if the child submits without ever pressing a digit it's not possible (Submit needs input) so always defined.
5. After each first attempt call new store action `recordFact(factKey, correct, retrievalMs, helped)` (kinder only) in addition to the existing `recordAnswer`; see §7.
6. 60 s **Blitz** mode (§8) uses the same screen with a timer; it must not update fact boxes.

## 6. Number Chart screen (`NumberChartScreen.tsx`) — the long-term driver
- Reached from the map header (🧮 button, ≥72px, kinder; aria-label via i18n).
- Two tabs: **➕ chart** and **➖ chart**. Each is a 9×9 grid, row = first operand a (1..9), column = b (1..9); for the ➖ chart the cell (a,b) is the family partner fact `(a+b)-a=b`.
- Cell colours by `factLevel`: unseen grey; learning warm yellow; solid green; mastered blue with ✨ and **the answer number shown inside**. Unseen cells show nothing.
- Header: "37 / 81 ⭐" counts mastered; a thin progress bar; tap a cell → small dialog with the equation, level, best time (ms→s) and a gentle "Practice this" hint (no navigation required).
- **Chart milestones**: when the mastered count of a chart first reaches 25%, 50%, 75%, 100% grant +1, +1, +2, +3 tickets (once each; persisted as `chartClaims`), shown as a celebration toast on the result screen and a badge on the chart.
- Result screen (kinder): show "✨ N new squares lit up!" when facts newly reached mastered this session (compare before/after).
- Works at 390px width without horizontal scroll; cells ≥ 32px, grid fits. In kinder mode the tabs/buttons ≥ 72px.

## 7. Store / data model (persist **version 4**)
```ts
export interface UserProfile { /* existing */ facts: Record<string, FactStats>; chartClaims: string[]; blitzBest: number; blitzBestDay: string | null }
```
- `migrateV3ToV4`: add `facts:{}`, `chartClaims:[]`, `blitzBest:0`, `blitzBestDay:null`; map `stars.k_add_20 → stars.k_add_11_18` and `stars.k_sub_20 → stars.k_sub_11_18` (keep max), then delete the two old keys; tolerate garbage; pure, exported, tested; chain from v0→v2→v3→v4 still works.
- Actions via `updateCurrentUser`: `recordFact(...)` (uses `updateFact`, `dayKey(now)` injected), `claimChartMilestones()` (idempotent, returns tickets granted), plus blitz recording `recordBlitz(score, now)`.
- `completeSession` summary additionally returns `newMasteredFacts: number` and `chartTickets: number` (computed from before/after facts) — keep coins untouched.
- Skill-level mastery for kinder skills (map badge): `new` if < 3 pool facts attempted; `mastered` if ≥ 80% of the pool has box ≥ 4; else `learning`. Grade4 keeps the old `getMastery`. Implement `getSkillMastery(skillId, facts)` in `mastery.ts` + tests.
- Map highlights the **recommended** node = first ladder skill not mastered (gentle glow + "Start here" label); unlock rule unchanged (previous ≥ 1★), plus `k_review` pinned on top when available.

## 8. Rewards & Blitz (`rewards.ts`)
- **Kinder coins**: no speed tiers. Fixed `10 × skill.multiplier` per first-attempt correct answer (rounded) **only when the answer was not helped**; helped-correct gives 5×. +20 coins bonus the moment a fact reaches box 5 (once per fact; tracked by detecting the transition). Session ×1.2 perfect bonus unchanged. Grade4 keeps the existing speed-tier logic exactly. Update tests.
- **Blitz** (`k_blitz` pseudo-skill, kinder, button on map): 60 seconds, unlimited questions drawn from the user's attempted facts (or `k_add_10` pool if < 10 attempted), correct = +1 score, wrong = no penalty (shows the answer briefly and moves on), no fact-box updates. Result: score, personal best (`blitzBest`), "New record!" ✨. Beating the personal best grants +1 ticket at most once per calendar day. Timer uses a ref/interval cleaned on unmount; pause not required; respect reduced motion. Pure scoring helper tested.

## 9. i18n
All new strings in both languages (identical key sets, parity test must pass), kid-friendly English and natural Taiwan Traditional Chinese (繁體, no Simplified characters). Skill names e.g. EN: "Add up to 5", "Take away within 5", "Plus 1 and 2", "Doubles", "Make 10", "Add up to 10", "Take away within 10", "Number families", "Near doubles", "Plus 8 and 9", "Add 11 to 18", "Take away 11 to 18", "Mixed master", "Daily review", "60-second blitz"; zh-TW: 5以內加法, 5以內減法, 加1和加2, 雙胞胎數(例:3+3), 湊成10, 10以內加法, 10以內減法, 加減一家人, 差一的雙胞胎數(例:6+7), 加8和加9, 11到18的加法, 11到18的減法, 加減大挑戰, 每日複習, 60秒挑戰. Remove dead keys of removed skills.

## 10. Tests (Vitest) — summary of required coverage
`facts` (162 facts, parse/roundtrip, pools, coverage), `factProgress` (all rules incl. one box-up per day, slow-correct no change, wrong −2, due logic, clock backwards), `selection` (§4), `session` resolveSubmit with insert-at-+3 retry, `rewards` (kinder fixed coins, helped, bonus, grade4 unchanged), `mastery` (`getSkillMastery`), migration v3→v4 chain, store actions (`recordFact`, `claimChartMilestones` idempotent, `recordBlitz`, `completeSession` new fields) incl. atomicity and "other user unchanged", chart milestone thresholds, i18n parity.

## 11. Acceptance
- `npm run build`, `npm run lint`, `npm test` pass; no `any`, no `@ts-ignore`/`eslint-disable`, no `alert()`, no new runtime dependencies; grade4 flows and the 200-card/pack/streak systems unaffected.
- Browser-verifiable (the orchestrator will drive it, also at 390px): kinder user → map shows ladder with "Start here" → a session of 8 mixed from `k_add_5` with ten-frames → a wrong answer immediately shows the answer + frame, reappears 3 questions later → result shows coins/stars (+ "squares lit up" when applicable) → Number Chart shows lit cells → hint button appears after a fact reaches box 2 → Blitz plays 60 s and records a best.
- Small logical commits on `v2`; do not push; do not touch `main`.

## 12. Notes for the developer
- Reuse `dayKey`/day arithmetic from `src/utils/streak.ts`; all time/random injected.
- Keep Phase 2 invariants: coins awarded exactly once at the final submit; `completeSession` doesn't touch coins; cards/packs/streak untouched.
- Update `docs/design_doc.md`/README briefly (fluency engine, ladder, chart).
- If ambiguous choose the simplest option and list it under "Decisions made". Report anything unfinished or deviating candidly; a separate Opus reviewer will check against this spec.
