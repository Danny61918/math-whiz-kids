# Math Whiz Kids v2 — Phase 5A Spec: Times-table fluency engine (grade4)

Branch: continue on `v2` (do not touch `main`; do not push unless told). Reuse the Phase 3 fluency engine (`docs/v2-phase3-fluency-spec.md`) for **multiplication and division facts** for the grade4 user. Kinder behaviour must not change: **every existing test must keep passing unchanged** (add tests, don't edit kinder expectations).

## 0. Why
Grade4 currently has no tracking of the basic 九九 facts: multi-digit multiplication/division starts at 2-digit×1-digit and assumes the facts are automatic. The parent's judgement: basic ×/÷ fluency matters more than fractions. Fractions/decimals come later (5C/5D). Same fun/motivation loop as kinder: stars, map, Leitner boxes, daily review, 60-s blitz, chart, coins, cards.

## 1. Facts (data model)
- **Multiplication facts**: ordered pairs `a×b`, a,b ∈ 1..9 → 81 facts. Key `"{a}x{b}"` (e.g. `"3x4"`). `3x4` and `4x3` are separate facts (mirrors the 9×9 chart cell).
- **Division facts**: key `"{p}/{d}"` where p = a×b is the dividend, d the divisor (1..9), quotient q = p/d ∈ 1..9 → 81 facts (e.g. `"12/3"` answer 4; `"12/4"` answer 3).
- Keys never collide with kinder keys (`a+b`, `m-s`). Facts live in the same per-user `facts` record; `recordFact`, `updateFact`, `isDue`, `factLevel`, Leitner boxes and intervals are reused as is. **No store migration needed** (new keys/skill ids are additive); bump the persist version only if you add a persisted field (avoid).
- New module `src/data/tableFacts.ts`: `TableFact { key, op: '×'|'÷', a, b, product }` (for `×`: a,b factors, answer a·b; for `÷`: `a`=divisor, `b`=quotient, `product` = dividend, answer b), `tableFactsByKey`, `parseTableKey`, `allTableFacts`, and pools per skill (see §2). Unit-test counts (81 + 81), key round-trips, pools, no duplicates.
- Speed threshold: `updateFact` gets an optional `fastMs` parameter defaulting to the existing `FAST_MS` (4000). Table skills use **4000 ms for ×, 5000 ms for ÷**. The store's `recordFact` picks the threshold from the key (`parseTableKey`). Existing behaviour for kinder keys must be byte-identical.

## 2. Skills (new "table track")
Add an optional `track: 'main' | 'table'` to `Skill` (default `'main'`, so existing skills are unchanged). Unlock chain (`isSkillUnlocked`) and the recommended-skill logic run **per track**: the table track is its own sequential ladder; the existing 10 grade4 skills stay in the `main` track with the same unlock rule as today. Do **not** make main skills depend on the table track (soft nudge only, §4.2).

Table track skills (grade4 only), in order. "Pool" = all × (or ÷) facts that involve the listed factor/divisor as either operand/divisor:
| id | name (zh-TW / en) | pool | multiplier |
|---|---|---|---|
| `g_x25` | 2 與 5 的乘法 / ×2 and ×5 | × facts with a or b ∈ {2,5} | 1.0 |
| `g_x34` | 3 與 4 的乘法 / ×3 and ×4 | a or b ∈ {3,4} | 1.1 |
| `g_x6` | 6 的乘法 / ×6 | a or b = 6 | 1.2 |
| `g_x7` | 7 的乘法 / ×7 | a or b = 7 | 1.3 |
| `g_x8` | 8 的乘法 / ×8 | a or b = 8 | 1.3 |
| `g_x9` | 9 的乘法 / ×9 | a or b = 9 | 1.4 |
| `g_xmix` | 九九乘法大挑戰 / All the times tables | all 81 × facts | 1.5 |
| `g_d25` | 除以 2、除以 5 / ÷2 and ÷5 | ÷ facts with d ∈ {2,5} | 1.2 |
| `g_d34` | 除以 3、除以 4 / ÷3 and ÷4 | d ∈ {3,4} | 1.3 |
| `g_d69` | 除以 6~9 / ÷6 to ÷9 | d ∈ {6,7,8,9} | 1.5 |
| `g_dmix` | 九九除法大挑戰 / All the division facts | all 81 ÷ facts | 1.6 |

(The pool for a ladder skill may contain facts also in earlier skills; the existing bucket logic handles that as review.) Add `g_review` — **daily review** for grade4: all table facts the user has attempted that are due (same behaviour as `k_review`, shown pinned at the top of the table track when ≥ 1 fact is due; falls back like `k_review` does). Add i18n names (both languages, Traditional Chinese Taiwan wording; parity test must pass). Existing mastery/stars/recommended logic must work for table skills via their pools (`getSkillMastery`, `recommendedSkillId` generalise from `poolFor` to a table-aware lookup).

## 3. Session building & questions
- `buildFactSession(skillId, facts, today, count, rng)`: same algorithm as `buildKinderSession` (60/30/10 priority/new/review via `bucketOf`, largest-remainder `splitCount`, redistribution, repeat when the pool is smaller than the session, no same fact twice in a row) but over table facts. Refactor shared pieces (`bucketOf`, `splitCount`, `separateRepeats`, `weakestFirst`) to be reusable; `buildKinderSession` stays as-is or a thin wrapper — kinder tests untouched. `interleave` must not break on `×`/`÷` (group by op; at most 2 of the same op in a row when the mix allows, e.g. `g_xmix`/`g_review` mix ×,÷).
- Question forms: `a × b = ?`, `p ÷ d = ?`, plus **missing-factor** forms `a × ? = p` and `p ÷ ? = q` for a share of questions (`g_xmix` 25%, `g_dmix` 25%, `g_d25/34/69` 25% as `a × ? = p`, `g_review` 25%) — this links × and ÷. `Question` and `checkAnswer` gain the needed shapes (right/left unknown for `×`; keep existing grade4 generator paths unchanged). Each question carries `factKey`.
- Session length: `QUESTION_COUNT.grade4` (10) + retries. A wrong answer is re-asked 3 questions later (same rule as kinder, `insertRetry`).
- Single answer box (answer ≤ 2 digits, ≤ 81); **no remainder/quotient UI** in table sessions.
- Retrieval time = time to the first digit (same as kinder).

## 4. UI
### 4.1 Practice screen (`GamePlayScreen`)
Route to the fact-session path when `skillId` belongs to the table track (and `g_review`), not by `mode === 'kinder'` alone. The aid for table facts is an **array/dot-grid** (`ArrayAid`): `a` rows × `b` columns of dots (÷: the dividend as a grid grouped into rows of d). Fading identical to kinder: box 0–1 visible, box 2–3 behind a Help button (helped answers never raise the box and pay 5×-style reduced coins like kinder), box ≥ 4 none. After a wrong answer show the correct equation in the answer box (existing compact banner) plus the array for ×. All Phase 4 legibility rules hold: ≥ 14 px text, ≥ 48 px buttons, fits the viewport at 360×640 / 390×844 / 820×1180 / 1280×800 / 844×390 / 667×375 / 640×400. Dot size scales with viewport; a 9×9 array must remain legible (dots ≥ 12 px diameter on phone with grouping gaps every 5, or show a compact "a groups of b" visual instead for large facts — your choice, document it).
Coins/stars/cards: reuse `completeSession` and the kinder fluency reward rules (`round(10×mult)`, 5× if helped, +20 first time a fact reaches box 5, `paid5`); the grade4 non-fact reward path stays as is for main-track skills.

### 4.2 Map (`MapScreen`)
Grade4 map has two sections: **table track first** (heading "九九乘除 / Times tables", with `g_review` pinned at top when due), then the existing main track (heading "大數運算 / Big numbers"). The "Continue" button picks the recommended skill across tracks (deterministic, first match wins): (1) at least 5 table facts due and at least 10 attempted -> `g_review`; (2) any of `g_x25`, `g_x34`, `g_x6`, `g_x7` not (mastered AND starred) -> the table ladder's recommendation; (3) otherwise the first unlocked unstarred main skill; (4) if every main skill is starred, the table ladder's recommendation. A star only means a finished session, so mastery is required too. The daily review card on the map needs at least 10 attempted table facts and at least one due. Soft nudge: a `g_mul_21` / `g_div_21` card shows a small hint chip "先練九九更順" / "Tables first helps" while `g_xmix` has no star — it never locks anything. Map height must stay within Phase 4 targets (collapse locked table skills beyond the next 2 into a single "More to unlock" row, or two columns on ≥ 640 px).

### 4.3 Times-table chart
Generalise `NumberChartScreen` to a `TimesChartScreen` (or add an op param): 9×9 grid, tabs `✖ ×` / `➗ ÷` (÷: row = divisor, column = quotient; cell shows the dividend). Same states/legend/symbols/milestones as the Phase 3 chart (read its spec); milestone ids `mul25`, `mul50`, `mul81`, `div25`, `div50`, `div81` with the same ticket rewards logic as the add/sub milestones (extend `pendingMilestones`; claims stored in `chartClaims`; don't change existing ids). Reachable from the grade4 map via a labelled button (icon + text).

### 4.4 Blitz
Enable the 60-s blitz for grade4: pool = attempted table facts (≥ 10 attempted, else `g_x25` facts); same scoring/ticket rules via `evaluateBlitz`; `blitzBest` is per user so no clash. Kinder blitz unchanged.

### 4.5 Diagnostic ("九九檢測 / Times-table check")
A one-time, re-runnable screen reachable from the table-track heading (and as a dismissible first-run card for grade4 users with **zero** table facts attempted). 27 questions: 3 from each of the 9 factor groups (×1..×9; pick facts with both operands ≥ 2 where possible, mix 24 × and 3 ÷ questions, seeded rng injectable), **no aids, no Help**, no retries. Records via `recordFact` semantics with these seeding rules (implement as a dedicated store action `recordDiagnosticFact` or an option on `recordFact`, tested): correct & ≤ fast threshold → box max(current, 2); correct but slow → box max(current, 1); wrong → box 0 with `lastWrong`. Never above box 2 (real mastery needs multi-day review). No coins, no stars. Result screen for the parent and child: per-table summary (e.g. "×7 is the one to practise") as a coloured row of 9 chips with text (not colour alone), time per fact where slow, a **"Start practice" button that goes to the recommended skill**, and a note that the chart shows the details. i18n both languages.

## 5. Out of scope
Fractions/decimals/word problems/vertical-calculation modes (later phases); changing main-track grade4 skills; changing kinder; store version bump; card art.

## 6. Tests required (vitest)
- Facts: 81 + 81, key parse/format round-trip, pools per skill, uniqueness, speed thresholds (× 4000, ÷ 5000, add/sub unchanged).
- `buildFactSession`: size, 60/30/10 split, never the same fact twice in a row, deterministic with a seeded rng, `g_xmix` mixes ×/÷ rules, missing-factor share, review fallback with no history.
- Questions: answers correct for all 162 facts and all forms; `checkAnswer` for missing-factor.
- Tracks: per-track unlock, recommended skill rule across tracks (several states: fresh, partial, all mastered), `g_review` due logic, soft-nudge condition.
- Diagnostic: 27 questions, distribution across factor groups, seeding rules and the box-2 cap, no stars/coins.
- Chart milestones for `×`/`÷` ids, no change to the existing add/sub ids.
- i18n parity; all pre-existing tests unchanged and passing; `npm run build`, `npm run lint` clean; no `any` / `@ts-ignore` / `eslint-disable`; no new runtime deps.

## 7. Acceptance (the orchestrator will run a headless-Chrome audit afterwards)
At 360×640, 390×844, 820×1180, 1280×800, 844×390, 667×375, 640×400 with a grade4 (zh-TW) user: map (both tracks), table session (question / wrong answer / Help shown), chart (×/÷), blitz, diagnostic and its result, review: 0 text < 14 px, 0 buttons < 48 px, no horizontal scroll, OK button inside the viewport, array aid readable. Kinder screens must look and behave identically (spot-checked).

## 8. Notes for the developer
- Read first: `docs/v2-phase3-fluency-spec.md` (amendments A1–A10), `docs/v2-phase4-ui-legibility-spec.md`, `src/utils/{selection,factProgress,session,mastery,stars,rewards}.ts`, `src/data/{facts,skills}.ts`, `src/store/useGameStore.ts`, `GamePlayScreen`, `BlitzScreen`, `NumberChartScreen`, `MapScreen`, `TenFrame`.
- Prefer generalising by op rather than copy-pasting kinder code; keep kinder paths green at every commit.
- Small logical commits on `v2`, with the usual trailers and `-c user.name=danny -c user.email=danny61918@gmail.com`; no push.
- All Chinese text Traditional Chinese (Taiwan wording), never Simplified.
- Final report: per spec section done/not done, decisions, anything unfinished. A separate Opus reviewer follows.
