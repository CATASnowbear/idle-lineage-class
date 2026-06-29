---
name: prepush
description: 放置天堂專案 push 前的完整檢查與準備 — bump 改動外掛的 ?v=、重算 sw.js 版本、跑 Playwright smoke、檢查衝突標記，全綠才建議 push。當使用者說「準備 push」「push 前檢查」「跑 prepush」或 /prepush 時使用。
disable-model-invocation: true
---

# /prepush — push 前一鍵備齊

對應 CLAUDE.md「每次 push 前的檢查清單」。**從 repo 根目錄(`D:\ppRepos\idle-lineage-class`)依序做完，全綠才建議使用者 push。** 任一步紅就停下回報，不要硬推。

## 步驟

1. **看這次要 push 什麼**
   - `git status` + `git log origin/main..HEAD --oneline`(還沒 push 的 commit)
   - `git diff origin/main..HEAD --name-only` 抓出「動到的 `afk-*.js`」清單。

2. **bump 改動外掛的 `?v=`**
   - 對每支「有改動、但 index.html 裡 `?v=` 沒跟著變」的 `afk-*.js`，把 index.html 中對應 `<script src="afk-xxx.js?v=...">` 的版本號 bump 成「今天日期+流水字母」(如 `20260629a`→`20260629b`；同一支當天再改就往下一個字母)。
   - 沒改到的外掛不要動它的 `?v=`。

3. **重算 sw.js 版本**(PWA 偵測更新靠這個)
   - `node scripts/stamp-sw-version.mjs`

4. **冒煙測試**(確認外掛都掛得上、沒被改壞)
   - `node scripts/smoke-hooks.mjs` → 要看到「冒煙測試通過」、exit 0。
   - 紅了代表某外掛 hook 失效(原作者改了 DOM / 自己改壞)，回報是哪支。

5. **衝突標記把關**(rebase 沒解乾淨會壞整頁)
   - `grep -nE "^<<<<<<<|^=======|^>>>>>>>" index.html sw.js afk-*.js` 必須為空。
   - 順手確認每支外掛在 index.html 只出現一次 `<script>`(沒有重複)。

6. **回報結果**
   - 全綠：列出「bump 了哪幾支、sw 版本、smoke 通過」，告訴使用者可以 `git add -A && git commit && git push` 了(或直接幫忙 commit/push)。
   - 有紅：明確指出哪步、要修什麼，停在這裡別 push。

> 註：實際 `git push` 時還有 `prepush-guard.mjs` hook 會再擋一次衝突標記/引用/sw 版本，這支 skill 是「主動把全部準備做完」。
