# Design Doc: Math Whiz Kids (v2)

## 1. 專案願景
給兩位孩子的數學練習遊戲：大班（約 5 歲，加減法，英文介面）與國小四年級（約 10 歲，大數加減乘除，中文介面）。練習賺金幣，並依「技能」追蹤進度。農場／商店玩法已在 v2 移除。

## 2. 技術棧
Vite + React 19 + TypeScript + Tailwind CSS 4 + Zustand (persist) + Vitest。部署：GitHub Pages（GitHub Actions：test、build、deploy）。資料存於 LocalStorage（storageService 封裝），store 版本 `2`，附 v1 → v2 migration。

## 3. 核心設計
- **使用者**：每位使用者有各自的 `mode`（kinder / grade4）、`language`（zh-TW / en）、金幣與各技能統計。
- **技能 (skills)**：`src/data/skills.ts`。kinder 7 項（5/10/20 以內加減、湊 10）；grade4 10 項（四位、六位加減，乘法 2x1 / 3x2 / 4x2，除法 2÷1 / 3÷2 / 4÷1 含餘數）。
- **題目引擎**：`src/utils/mathEngine.ts`，純函式、可注入 rng；進退位次數有限制，除法約 70% 有餘數；`generateSession` 不重複。
- **熟練度**：`new`（練習不足 5 題）/ `learning` / `mastered`（近 10 題至少答對 9 題且平均時間達標）。
- **獎勵**：每題基礎 10 金幣，5 秒內 30、10 秒內 20，乘以技能倍率後四捨五入；全對則整場總額 x1.2。答錯不給金幣。
- **大班答錯**：溫和提示，該題最後再出現一次（不給金幣、不計入統計）；國小答錯顯示正確答案後繼續。

## 4. 路線圖
- **Phase 1（本版）**：練習基礎：技能、引擎、進度追蹤、store 版本與遷移、單元測試。
- **Phase 2（已完成）**：地圖、星星、連續天數與每日券、200 張收藏卡片與抽卡（卡片圖片由使用者提供，見 public/cards/README.md）。
- **Phase 3**：分數與小數；直式計算介面。
- **Phase 4**：錯題本、適性出題、家長頁面、資料匯出。
- **Phase 5**：PWA（離線）、TTS 語音。

## 5. Fluency Engine (v2 Phase 3, kinder add/sub)
- Per-fact tracking: 162 one-digit facts (81 add, 81 sub), Leitner boxes 0-5 (`src/utils/factProgress.ts`); a fact rises only on a fast (<= 4 s to the first digit), unhelped correct answer, at most once per day; a wrong answer drops two boxes.
- Skill ladder of 13 strategy skills (doubles, make 10, near doubles, plus 8/9, ...) plus a Daily Review (unlocks at 10 attempted facts) and a 60-second Blitz. Sessions are 8 questions drawn 60% weak / 30% new / 10% review (`src/utils/selection.ts`).
- Ten-frame aid fades with the box (visible, then behind a Help button, then hidden). A wrong answer shows the answer and frame at once and re-asks 3 questions later.
- Number Chart (9x9 add and subtract grids) shows long-term progress; 25/50/75/100% milestones grant 1/1/2/3 tickets.
- Kinder coins are fixed (10 x multiplier, 5 x when helped, +20 when a fact first reaches box 5); grade4 keeps speed tiers.
- Store persist version 4 (`facts`, `chartClaims`, `blitzBest`, `blitzBestDay`).
