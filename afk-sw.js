/* ============================================================================
 * afk-sw.js — 註冊「只快取背景大圖」的 Service Worker(實際快取邏輯見 sw.js)
 *
 *   - 只在「安全環境」(HTTPS / localhost,即 window.isSecureContext)註冊。
 *     載 zip 下來用 file:// 開的玩家:isSecureContext 為 false → 直接略過、零錯誤、遊戲照舊。
 *   - 不掛任何遊戲 DOM,純註冊 SW。所以原作者怎麼改 index.html 都不會影響它
 *     → 也因此「不」列入 scripts/smoke-hooks.mjs 的掛點冒煙檢查(沒有 DOM 掛點可壞)。
 *
 * 掛接:在 index.html </body> 前加一行 <script src="afk-sw.js"></script>
 * ========================================================================== */
(function () {
  'use strict';
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    console.log('[AFK-sw] 非安全環境(file:// 或瀏覽器不支援),略過 Service Worker 註冊,遊戲不受影響。');
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function () {
      console.log('[AFK-sw] hooks OK — 背景大圖 Service Worker 已註冊(回訪 / 重整秒出)。');
    }).catch(function (err) {
      console.warn('[AFK-sw] Service Worker 註冊失敗(不影響遊戲):', err && err.message);
    });
  });
})();
