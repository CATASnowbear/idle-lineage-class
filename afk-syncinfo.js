/* ============================================================================
 * afk-syncinfo.js — 首頁顯示「原版最後同步時間」
 *
 * 自動同步流程(sync-upstream)每次把原作者更新合併進來時,會在 last-sync.json
 * 寫下當下時間。本外掛在首頁(#main-menu)最下方讀出並顯示,讓玩家一眼知道
 * 「目前這版是什麼時候從原作者那邊同步來的」。
 *   - 純讀取根目錄 last-sync.json,讀不到就安靜隱藏,不影響遊戲。
 *   - 時間一律換算成台灣時間顯示(與自動同步打的 tag 同時區)。
 *
 * 掛接:在 index.html 的 </body> 前加一行 <script src="afk-syncinfo.js"></script>
 * ========================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // ISO 時間 → 台灣時間字串「YYYY/MM/DD HH:mm」
  function fmtTpe(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var parts = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return o.year + '/' + o.month + '/' + o.day + ' ' + o.hour + ':' + o.minute;
  }

  function injectCSS() {
    if (document.getElementById('afk-syncinfo-style')) return;
    var s = document.createElement('style');
    s.id = 'afk-syncinfo-style';
    s.textContent =
      '#afk-syncinfo,#afk-syncinfo-links{color:#64748b;font-size:12px;text-align:center;letter-spacing:.3px;line-height:1.6;}' +
      '.afk-si-row{margin-top:1px;}' +
      '.afk-si-link{color:#7dd3fc;text-decoration:underline;}' +
      // 原作者名:彩虹漸層流動(會動)
      '.afk-si-name{font-weight:bold;background:linear-gradient(90deg,#f472b6,#fb923c,#fde047,#34d399,#22d3ee,#a78bfa,#f472b6);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:afk-si-flow 6s linear infinite;}' +
      '@keyframes afk-si-flow{to{background-position:220% 0;}}';
    document.head.appendChild(s);
  }

  function init() {
    var menu = document.getElementById('main-menu');
    if (!menu) { console.warn('[AFK-syncinfo] 找不到 #main-menu,原作者/最後同步資訊不顯示。'); return; }
    if (document.getElementById('afk-syncinfo')) return;
    injectCSS();
    // 頂部:原作者 + 正版最後同步(各自一列;afk-skin 會把這塊排到外掛框最上方)
    var foot = document.createElement('div');
    foot.id = 'afk-syncinfo';
    foot.innerHTML =
      '<div class="afk-si-row"><span class="afk-si-author">原作者：<span class="afk-si-name">秋玥</span> <a class="afk-si-link" href="https://shines871.github.io/idle-lineage-class/" target="_blank" rel="noopener">(正版連結)</a></span></div>' +
      '<div class="afk-si-row afk-si-timerow"><span class="afk-si-time">正版最後同步：載入中…</span></div>';
    menu.appendChild(foot);
    // 連結:巴哈討論串 + 加入Line群(各自一列;afk-skin 會排到框內較下方)
    var links = document.createElement('div');
    links.id = 'afk-syncinfo-links';
    links.innerHTML =
      '<div class="afk-si-row"><a class="afk-si-link" href="https://forum.gamer.com.tw/C.php?bsn=84452&amp;snA=8362" target="_blank" rel="noopener">巴哈討論串</a>（本加掛版發布在 <a class="afk-si-link" href="https://forum.gamer.com.tw/Co.php?bsn=84452&amp;sn=37297" target="_blank" rel="noopener">301</a> 樓）</div>' +
      '<div class="afk-si-row"><a class="afk-si-link" href="https://line.me/ti/g2/RRXPx6rMc8ZhxiuNSSziKtcjnhc2AXEPuIOpVA?utm_source=invitation&amp;utm_medium=link_copy&amp;utm_campaign=default" target="_blank" rel="noopener">[加入Line群討論]</a> <a class="afk-si-link" href="https://discord.com/invite/xyWDYknDj" target="_blank" rel="noopener">[加入Discord討論]</a></div>';
    menu.appendChild(links);
    console.log('[AFK-syncinfo] hooks OK — 首頁顯示原作者與原版最後同步時間。');

    var timeRow = foot.querySelector('.afk-si-timerow'), timeEl = foot.querySelector('.afk-si-time');
    // file:// 無法 fetch(CORS,origin null)→ 直接降級藏時間列,避免 console 噴紅字;http(s) 才去抓同步時間
    if (!/^https?:$/.test(location.protocol)) { timeRow.style.display = 'none'; return; }
    fetch('last-sync.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var t = j && j.syncedAt ? fmtTpe(j.syncedAt) : '';
        if (t) { timeEl.textContent = '正版最後同步：' + t; }
        else { timeRow.style.display = 'none'; }   // 讀不到時間只藏時間列,作者照顯示
      })
      .catch(function () { timeRow.style.display = 'none'; });
  }

  ready(init);
})();
