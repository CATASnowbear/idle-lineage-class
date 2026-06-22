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
 * 作法:monkey-patch 全域 updateUI——原函式跑完後,在六大屬性 grid 內、每個屬性「值欄」之後插一條
 *      橫跨整列(grid-column:1/-1)的分解行,前綴該屬性中文名(英文縮寫)。
 *      原作把屬性值從「整格 div」改成「夾在 +/- 加點按鈕之間的窄 span(w-8)」後,不能再 append 進值元素
 *      (會被擠爆);改為插在值欄之後、獨立成一橫列,對「無加點」與「升級加點(+/- 顯示)」兩種狀態都不影響版面。
 *      優雅降級:找不到 updateUI / player.base / 屬性元素就安靜停用。
 */
(function () {
  var STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  // 屬性中文名(英文縮寫) 與 對齊原作的文字色(力量紅/敏捷綠/體質橙/智力藍/精神紫/魅力粉)
  var LABEL = { str: '力量(STR)', dex: '敏捷(DEX)', con: '體質(CON)', int: '智力(INT)', wis: '精神(WIS)', cha: '魅力(CHA)' };
  var COLOR = { str: '#fca5a5', dex: '#86efac', con: '#fdba74', int: '#93c5fd', wis: '#d8b4fe', cha: '#f9a8d4' };
  function n(o, s) { return (o && o[s]) || 0; }

  function buildBreakdown() {
    if (typeof player === 'undefined' || !player || !player.base) return;
    STATS.forEach(function (s) {
      var valEl = document.getElementById('dt-' + s);   // 原作:夾在 +/- 之間的屬性值 <span>
      if (!valEl) return;
      var cell = valEl.parentElement;                   // 值欄(grid 直接子元素;flex 容器含 - 值 +)
      if (!cell || !cell.parentElement) return;
      // 清掉本屬性舊的分解行(原 updateUI 不會洗掉它,要自己防累積)
      var nx = cell.nextElementSibling;
      if (nx && nx.classList && nx.classList.contains('afk-stpts')) nx.remove();

      var bi = n(player.base, s);       // 始
      var al = n(player.alloc, s);      // 升
      var pa = n(player.panacea, s);    // 藥
      var tot = bi + al + pa;           // 總(不含裝備/buff)

      var line = document.createElement('div');
      line.className = 'afk-stpts';
      var lbl = document.createElement('span');
      lbl.className = 'afk-stpts-lbl';
      lbl.style.color = COLOR[s];
      lbl.textContent = LABEL[s];
      line.appendChild(lbl);
      line.appendChild(document.createTextNode(' 始' + bi + '／升' + al + '／藥' + pa + '／總' + tot));
      cell.after(line);                 // 插在值欄之後 → 靠 CSS grid-column:1/-1 撐成整列
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
    '.afk-stpts{grid-column:1 / -1;font-size:12px;font-weight:400;line-height:1.3;' +
    'color:#94a3b8;letter-spacing:0;margin:-4px 0 2px;white-space:nowrap;text-align:left;}' +
    '.afk-stpts-lbl{font-weight:700;margin-right:4px;}';
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
