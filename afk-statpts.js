/*
 * afk-statpts.js — 能力值面板:在每個能力值底下補一行「點數來源分解」（始/升/藥/總，不含裝備）。
 *
 * 始 = 出生點數 = player.base[s]（職業起始能力 ＋ 創角時分配的點，遊戲創角時就加進 base）
 * 升 = 升級點數 = player.alloc[s]（升級後分配的配點）
 * 藥 = 萬能藥點數 = player.panacea[s]
 * 總 = 始＋升＋藥 = naturalStat（不含裝備、不含 buff；面板右側那個大數字是含裝備的，會比「總」大）
 *
 * 註:用過「回憶蠟燭」重置後,創角分配的點會被併進 alloc(升),此時「始」只剩純職業基礎、
 *    「升」會含創角點;沒重置過的角色則 始/升 完全準確。總一定正確。
 *
 * 作法:monkey-patch 全域 updateUI——原函式跑完(會把 dt-str…dt-cha 的 innerText 設成含裝備的數字)後,
 *      再在每個能力值元素內 append 一行分解。優雅降級:找不到 updateUI / player.base 就安靜停用。
 */
(function () {
  var STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  function n(o, s) { return (o && o[s]) || 0; }

  function buildBreakdown() {
    if (typeof player === 'undefined' || !player || !player.base) return;
    STATS.forEach(function (s) {
      var el = document.getElementById('dt-' + s);
      if (!el) return;
      var bi = n(player.base, s);       // 始
      var al = n(player.alloc, s);      // 升
      var pa = n(player.panacea, s);    // 藥
      var tot = bi + al + pa;           // 總(不含裝備/buff)
      var old = el.querySelector('.afk-stpts'); if (old) old.remove();   // 原 updateUI 通常已洗掉,保險再清
      var span = document.createElement('span');
      span.className = 'afk-stpts';
      span.textContent = '始' + bi + '/升' + al + '/藥' + pa + '/總' + tot;
      el.appendChild(span);
    });
  }

  function hook() {
    if (typeof window.updateUI !== 'function') return false;
    if (window.updateUI.__afkStpts) return true;
    var orig = window.updateUI;
    window.updateUI = function () {
      var r = orig.apply(this, arguments);
      try { buildBreakdown(); } catch (e) {}
      return r;
    };
    window.updateUI.__afkStpts = true;
    return true;
  }

  var st = document.createElement('style');
  st.textContent =
    '.afk-stpts{display:block;font-size:11px;font-weight:400;line-height:1.3;' +
    'color:#94a3b8;letter-spacing:0;margin-top:1px;white-space:nowrap;}';
  (document.head || document.documentElement).appendChild(st);

  // updateUI 可能還沒定義(遊戲腳本載入順序) → 輪詢幾次掛上
  var tries = 0;
  (function tryHook() {
    if (hook()) {
      buildBreakdown();
      console.log('[AFK-statpts] hooks OK — 能力值分解（始/升/藥/總，不含裝備）已掛上。');
      return;
    }
    if (++tries < 40) setTimeout(tryHook, 250);
    else console.warn('[AFK-statpts] 找不到 updateUI,能力值分解停用。');
  })();
})();
