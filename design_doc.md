# Design Doc: Math Whiz Kids (v1.0)

## 1. 專案願景
這是一個專為 5 歲與 8 歲孩子設計的數學練習遊戲。透過完成客製化的數學練習，孩子可以賺取金幣，並在未來的版本中利用金幣在「商店街」購買材料建設自己的空間。

## 2. 技術棧 (Tech Stack)
- **框架**: Vite + React + TypeScript
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand (需具備 Persist 功能)
- **部署**: GitHub Pages (透過 GitHub Actions 自動化)
- **資料存儲**: 
    - 階段一：LocalStorage (透過 Service Layer 封裝)
    - 階段二：預計轉移至 Google Sheets API 或 Supabase

## 3. 核心功能規格

### A. 練習設定 (Exercise Settings)
- **運算類型**: 
    - 整數：加、減、乘、除、加減混合、乘除混合。
    - 未來擴充：小數、分數。
- **難度自定義**: 
    - 可設定「左側數字位數」與「右側數字位數」（例如：2位數 + 1位數）。
    - 適合不同年齡層（5歲 vs 8歲）的彈性調整。

### B. 獎勵演算法 (Reward Algorithm)
- **基礎獎勵**: 每對一題獲得 10 金幣。
- **難度加權 (Multiplier)**:
    - 1位數加減: 1.0x
    - 2位數加減: 1.2x
    - 1位數乘除: 1.5x
    - 混合運算/多位數乘除: 2.0x
- **全對加成**: 答對率 100% 時，總金幣額外 x 1.2。

### C. 用戶資料結構 (Data Schema)
```json
{
  "userId": "string",
  "profile": { "name": "string", "avatar": "string" },
  "stats": {
    "totalCoins": "number",
    "completedSessions": "number"
  },
  "settings": {
    "defaultDigits": [2, 1],
    "preferredOperators": ["+", "-"]
  }
}```

### D. 階段一：LocalStorage 資料存儲
- **使用者設定**: 
    - 儲存使用者的設定（例如：預設運算類型、難度等）。
    - 使用 Zustand 管理狀態，並透過 Service Layer 封裝 LocalStorage 操作。
- **練習紀錄**: 
    - 儲存使用者的練習紀錄（例如：完成的練習、答對率等）。
    - 使用 Zustand 管理狀態，並透過 Service Layer 封裝 LocalStorage 操作。

### E. 階段二：Google Sheets API 資料存儲
- **使用者設定**: 
    - 儲存使用者的設定（例如：預設運算類型、難度等）。
    - 使用 Zustand 管理狀態，並透過 Service Layer 封裝 Google Sheets API 操作。
- **練習紀錄**: 
    - 儲存使用者的練習紀錄（例如：完成的練習、答對率等）。
    - 使用 Zustand 管理狀態，並透過 Service Layer 封裝 Google Sheets API 操作。