# transfer — Cloudflare Worker（跨裝置存檔轉移）

前端 `afk-transfer.js` 的後端。A 機匯出拿一組 **6 位數轉移碼**，B 機輸碼匯入；
碼預設 **10 分鐘到期、被領取後立即刪除**。

## 設計

- **單一 Durable Object（SQLite-backed，免費版即可）** 同時管：
  - `codes` 表：`code → save`，帶 `expireAt`。
  - per-IP 限流（in-memory，每分鐘固定視窗）。
- **不用 KV**：DO 強一致（KV 最終一致，A 寫完 B 幾秒內可能讀不到 → 誤判「查無此碼」），
  且寫入額度十萬級（KV 免費僅 1000/天，限流計數會先爆）。
- **過期不用 alarm**：`claim`/`status` 讀到過期當作不存在；每次 `create` 順手
  `DELETE FROM codes WHERE expireAt < now`（piggyback），儲存量有上界。
- **防濫用**：CORS Origin 白名單（擋別的網站來蹭；放行 `null` = 直接開 `index.html` 的 file://）
  ＋ per-IP 每分鐘限流 ＋ 6 位數 ＋ 短 TTL ＋ 用完即刪。
  ⚠ Origin 擋得了「瀏覽器上的別站」，擋不了 curl（可偽造）；防線是這整套疊加。

## 端點

| 方法 | 路徑 | body / query | 回傳 |
|---|---|---|---|
| POST | `/create` | `{save:"<存檔JSON字串>"}` | `{code,"123456", expireAt}` |
| POST | `/claim` | `{code:"123456"}` | `{save}`（成功，並刪碼）/ `404 not_found` |
| GET | `/status` | `?code=123456` | `{exists, expireAt?}`（給匯出端輪詢是否被領取） |

限流超過回 `429 rate_limited`；非白名單來源回 `403 forbidden_origin`。

## 部署

```bash
cd cf-transfer
npx wrangler deploy
```

部署後會得到網址：`https://transfer.<你的帳號子網域>.workers.dev`
把它填進 `afk-transfer.js` 最上方的 `API` 常數（見該檔註解），並 bump 其 `?v=` 版本號。

可調參數都在 `wrangler.toml` 的 `[vars]`（`ALLOW_ORIGINS` / `TTL_MS` / `RATE_PER_MIN` /
`MAX_SAVE_BYTES`），改完重新 `wrangler deploy`。

## 手動測試

```bash
# 建立（注意要帶白名單內的 Origin，否則 403）
curl -s -X POST https://transfer.<子網域>.workers.dev/create \
  -H 'Content-Type: application/json' -H 'Origin: https://pp771007.github.io' \
  -d '{"save":"{\"v\":1,\"p\":{\"cls\":\"mage\"}}"}'
# → {"code":"123456","expireAt":...}

# 領取（會刪碼）
curl -s -X POST https://transfer.<子網域>.workers.dev/claim \
  -H 'Content-Type: application/json' -H 'Origin: https://pp771007.github.io' \
  -d '{"code":"123456"}'
```

看 Worker 紀錄：`npx wrangler tail transfer`。

## 免費額度（500 人也夠）

DO 請求併入 Workers 免費 100,000/天；DO 儲存寫入額度約十萬級/天，遠超轉移所需。
存檔本體幾百 KB、10 分鐘即清，1GB 儲存綽綽有餘。
