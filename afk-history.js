/* ============================================================================
 * afk-history.js — 首頁「⚙ 設定」選單 → 離線掛機歷史紀錄
 *
 * 把「📜 離線掛機紀錄」註冊成首頁設定選單的一項(選單本身由 afk-storage 渲染)。
 * 點開後彈出 modal,把每個存檔位角色「最近 5 筆離線掛機」列成可比較的卡片:
 *   時間範圍(關閉→登入、真實時長)、地點、經驗/金錢(含 /10分 平均)、升級、
 *   獲得道具(依品階上色)、擊殺各怪數量(少→多)。
 *
 * 資料來源:afk-offline.js 結算離線時寫進的 localStorage 鍵 afk_hist_<slot>(陣列)。
 * 角色身分:呼叫遊戲全域 slotSummary(n) 唯讀讀存檔摘要(名稱/職業/等級),讀不到就只顯示存檔位。
 *
 * 🔒 純唯讀:本檔只 getItem,從不寫入任何 localStorage、不呼叫 saveGame、不碰存檔。
 *           (紀錄的「寫入」全在 afk-offline.js,且只動 afk_hist_<slot>。)
 *
 * 優雅降級:抓不到 #main-menu 就安靜停用,不影響遊戲。
 * 掛接:在 index.html 的 </body> 前加一行 <script src="afk-history.js"></script>
 * ========================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  var HIST_RE = /^afk_hist_(\d+)$/;
  var CLS_NAME = { knight: '騎士', mage: '法師', elf: '妖精', dark: '黑暗妖精', illusion: '幻術士', dragon: '龍騎士', warrior: '戰士', royal: '王族' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function fmtNum(n) { try { return (n || 0).toLocaleString(); } catch (e) { return '' + (n || 0); } }

  // epoch ms → 本地時間「M月D日 HH:mm」(玩家裝置在地時間=他離線/登入的當地時刻)
  function fmtClock(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '?';
    var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hh + ':' + mm;
  }
  // 時長(ms)→「X 時 Y 分」/「X 分」/「X 秒」
  function fmtDur(ms) {
    var totalMin = Math.floor(ms / 60000);
    if (totalMin < 1) return Math.max(1, Math.round(ms / 1000)) + ' 秒';
    var h = Math.floor(totalMin / 60), m = totalMin % 60;
    if (h <= 0) return m + ' 分';
    return h + ' 時' + (m ? ' ' + m + ' 分' : '');
  }
  // 平均效率(對齊遊戲「經驗/10分、金幣/10分」);分母用「實際結算時間 settledMs」才不會被 24h 上限/陣亡稀釋
  function per10(val, settledMs) {
    if (!settledMs || settledMs <= 0) return 0;
    return Math.floor(val / (settledMs / 600000));
  }

  // 掃 localStorage 取得「有離線紀錄」的存檔位(由小到大),每個附角色摘要(唯讀)
  function collectSlots() {
    var slots = [];
    for (var k in localStorage) {
      if (!Object.prototype.hasOwnProperty.call(localStorage, k)) continue;
      var m = HIST_RE.exec(k);
      if (!m) continue;
      var recs = [];
      try { recs = JSON.parse(localStorage.getItem(k)) || []; } catch (e) { recs = []; }
      if (!Array.isArray(recs) || !recs.length) continue;
      slots.push({ slot: m[1], recs: recs });
    }
    slots.sort(function (a, b) { return (+a.slot) - (+b.slot); });
    return slots;
  }

  // 角色身分文字:優先用遊戲 slotSummary(唯讀讀存檔);讀不到就只顯示存檔位
  function slotTitle(slot) {
    var sum = null;
    try { if (typeof slotSummary === 'function') sum = slotSummary(slot); } catch (e) {}
    if (!sum) return '存檔 ' + slot;
    var cls = sum.cls || '';   // slotSummary 回的 cls 已是中文職業名;保險再對一次表
    if (CLS_NAME[cls]) cls = CLS_NAME[cls];
    return '存檔 ' + slot + ' · <span class="m-hist-cname">' + esc(sum.name || '未命名') + '</span>'
      + ' <span class="m-hist-cmeta">' + esc(cls) + ' Lv.' + (sum.lv || 1) + '</span>';
  }

  function kindBadge(kind) {
    if (kind === 'climb') return '<span class="m-hist-badge bg-sky">攀登</span>';
    if (kind === 'oblivion') return '<span class="m-hist-badge bg-teal">遺忘之島</span>';
    if (kind === 'king') return '<span class="m-hist-badge bg-amber">軍王之室</span>';
    return '';
  }

  function recordCard(r) {
    var html = '<div class="m-hist-card">';
    // 時間列
    html += '<div class="m-hist-time">🕒 <b>' + fmtClock(r.closeTs) + '</b> → <b>' + fmtClock(r.loginTs) + '</b>'
      + '<span class="m-hist-dur">（共 ' + fmtDur(r.realMs) + '）</span>';
    if (r.capped) html += '<span class="m-hist-flag flag-cap" title="離線超過 24 小時,實際只結算到上限">已達 24h 上限</span>';
    if (r.died) html += '<span class="m-hist-flag flag-died">陣亡</span>';
    html += '</div>';
    // 地點
    html += '<div class="m-hist-map">📍 ' + esc(r.map || '?') + ' ' + kindBadge(r.kind) + '</div>';
    // 經驗 / 金錢 / 升級(含 /10分 平均)
    var stats = [];
    if (r.exp > 0) stats.push('<span class="m-hist-stat"><span class="lbl">經驗</span> <b class="v-exp">+' + fmtNum(r.exp) + '</b>'
      + '<span class="avg">平均 ' + fmtNum(per10(r.exp, r.settledMs)) + ' / 10分</span></span>');
    if (r.gold > 0) stats.push('<span class="m-hist-stat"><span class="lbl">金錢</span> <b class="v-gold">+' + fmtNum(r.gold) + '</b>'
      + '<span class="avg">平均 ' + fmtNum(per10(r.gold, r.settledMs)) + ' / 10分</span></span>');
    if (r.lv > 0) stats.push('<span class="m-hist-stat"><span class="lbl">升級</span> <b class="v-lv">+' + r.lv + ' 級</b></span>');
    if (stats.length) html += '<div class="m-hist-stats">' + stats.join('') + '</div>';
    else html += '<div class="m-hist-empty-line">（無明顯經驗 / 金錢收益）</div>';
    // 道具(依品階上色)
    if (r.items && r.items.length) {
      var its = r.items.map(function (it) {
        return '<span class="m-hist-item ' + esc(it.c || 'text-slate-200') + '">' + esc(it.n) + ' ×' + fmtNum(it.cnt) + '</span>';
      }).join('');
      html += '<div class="m-hist-row"><span class="m-hist-rowlbl">道具</span><span class="m-hist-rowval">' + its + '</span></div>';
    }
    // 擊殺(少 → 多)
    if (r.kills && r.kills.length) {
      var ks = r.kills.map(function (k) {
        return '<span class="m-hist-kill">' + esc(k.n) + ' ×' + fmtNum(k.cnt) + '</span>';
      }).join('');
      html += '<div class="m-hist-row"><span class="m-hist-rowlbl">擊殺</span><span class="m-hist-rowval">' + ks + '</span></div>';
    }
    if (r.keysUsed > 0) html += '<div class="m-hist-keys">🔑 消耗軍王的鑰匙 ' + r.keysUsed + ' 把</div>';
    html += '</div>';
    return html;
  }

  function renderBody() {
    var slots = collectSlots();
    if (!slots.length) {
      return '<div class="m-hist-none">目前還沒有任何離線掛機紀錄。<br>離線掛機並重新登入結算後,這裡就會逐筆累積(每個角色保留最近 5 筆)。</div>';
    }
    var html = '';
    slots.forEach(function (s) {
      html += '<div class="m-hist-slot">';
      html += '<div class="m-hist-slot-head">' + slotTitle(s.slot)
        + '<span class="m-hist-count">最近 ' + s.recs.length + ' 筆</span></div>';
      s.recs.forEach(function (r) { html += recordCard(r); });
      html += '</div>';
    });
    return html;
  }

  var _layer = null;
  function openModal() {
    var m = document.getElementById('m-hist-modal'); if (!m) return;
    document.getElementById('m-hist-body').innerHTML = renderBody();
    m.classList.add('open');
    _layer = window.AFK_UI ? AFK_UI.openLayer(hideModal) : null;
  }
  function hideModal() { var m = document.getElementById('m-hist-modal'); if (m) m.classList.remove('open'); _layer = null; }
  function closeModal() { if (_layer && window.AFK_UI) AFK_UI.closeLayer(_layer); else hideModal(); }

  function buildModal() {
    if (document.getElementById('m-hist-modal')) return;
    var modal = document.createElement('div');
    modal.id = 'm-hist-modal';
    modal.innerHTML =
      '<div id="m-hist-card">' +
        '<div id="m-hist-head">' +
          '<span id="m-hist-title">📜 離線掛機紀錄</span>' +
          '<button id="m-hist-close" title="關閉">✕</button>' +
        '</div>' +
        '<div id="m-hist-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('m-hist-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  }

  function injectCSS() {
    if (document.getElementById('m-hist-style')) return;
    var s = document.createElement('style');
    s.id = 'm-hist-style';
    s.textContent = [
      '#m-hist-modal{display:none;position:fixed;inset:0;z-index:1000;background:rgba(2,6,23,0.82);align-items:flex-start;justify-content:center;padding:24px 12px;font-family:system-ui,"Segoe UI",sans-serif;}',
      '#m-hist-modal.open{display:flex;}',
      '#m-hist-card{width:min(620px,96vw);max-height:calc(100dvh - 48px);display:flex;flex-direction:column;background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden;}',
      '#m-hist-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #1e293b;flex:0 0 auto;}',
      '#m-hist-title{font-size:16px;font-weight:bold;color:#fff;}',
      '#m-hist-close{width:34px;height:34px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;border-radius:8px;font-size:15px;cursor:pointer;line-height:1;}',
      '#m-hist-close:active{background:#334155;}',
      '#m-hist-body{flex:1 1 auto;overflow-y:auto;padding:14px;}',
      '.m-hist-none{color:#94a3b8;text-align:center;padding:26px 10px;font-size:14px;line-height:1.8;}',
      '.m-hist-slot{margin-bottom:18px;}',
      '.m-hist-slot:last-child{margin-bottom:0;}',
      '.m-hist-slot-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:14px;color:#e2e8f0;font-weight:bold;padding:0 2px 7px;border-bottom:1px solid #1e293b;margin-bottom:9px;}',
      '.m-hist-cname{color:#fcd34d;}',
      '.m-hist-cmeta{color:#94a3b8;font-weight:normal;font-size:12px;}',
      '.m-hist-count{flex:0 0 auto;color:#64748b;font-size:11.5px;font-weight:normal;}',
      '.m-hist-card{background:#111c30;border:1px solid #1e293b;border-radius:9px;padding:10px 11px;margin-bottom:9px;}',
      '.m-hist-card:last-child{margin-bottom:0;}',
      '.m-hist-time{font-size:13px;color:#cbd5e1;display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;}',
      '.m-hist-time b{color:#e2e8f0;}',
      '.m-hist-dur{color:#7dd3fc;}',
      '.m-hist-flag{font-size:11px;font-weight:bold;border-radius:6px;padding:1px 7px;}',
      '.flag-cap{background:rgba(180,83,9,.22);color:#fcd34d;border:1px solid #b45309;}',
      '.flag-died{background:rgba(220,38,38,.18);color:#fca5a5;border:1px solid #b91c1c;}',
      '.m-hist-map{font-size:13.5px;color:#fda4af;margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
      '.m-hist-badge{font-size:11px;font-weight:bold;border-radius:6px;padding:1px 7px;color:#0f172a;}',
      '.m-hist-badge.bg-sky{background:#7dd3fc;}',
      '.m-hist-badge.bg-teal{background:#5eead4;}',
      '.m-hist-badge.bg-amber{background:#fcd34d;}',
      '.m-hist-stats{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;}',
      '.m-hist-stat{font-size:13px;color:#cbd5e1;display:inline-flex;align-items:baseline;gap:5px;}',
      '.m-hist-stat .lbl{color:#94a3b8;font-size:12px;}',
      '.m-hist-stat .v-exp{color:#c4b5fd;}',
      '.m-hist-stat .v-gold{color:#fde047;}',
      '.m-hist-stat .v-lv{color:#86efac;}',
      '.m-hist-stat .avg{color:#64748b;font-size:11.5px;margin-left:3px;}',
      '.m-hist-empty-line{font-size:12.5px;color:#64748b;margin-top:7px;}',
      '.m-hist-row{display:flex;gap:8px;margin-top:8px;font-size:13px;}',
      '.m-hist-rowlbl{flex:0 0 auto;color:#94a3b8;font-size:12px;padding-top:1px;}',
      '.m-hist-rowval{flex:1 1 auto;display:flex;flex-wrap:wrap;gap:4px 8px;}',
      '.m-hist-item{font-weight:bold;}',
      '.m-hist-kill{color:#e2e8f0;}',
      '.m-hist-keys{margin-top:7px;font-size:12.5px;color:#fcd34d;}'
    ].join('');
    document.head.appendChild(s);
  }

  function init() {
    var menu = document.getElementById('main-menu');
    if (!menu) { console.warn('[AFK-history] 找不到 #main-menu,離線紀錄停用。'); return; }
    injectCSS();
    buildModal();
    // 註冊進首頁「⚙ 設定」選單(由 afk-storage 渲染合併;此處只負責 add 一項)
    window.AFK_SETTINGS = window.AFK_SETTINGS || { _items: [], add: function (it) { this._items.push(it); } };
    AFK_SETTINGS.add({ label: '📜 離線掛機紀錄', onClick: openModal });
    console.log('[AFK-history] hooks OK — 離線掛機紀錄已加入首頁設定選單。');
  }

  ready(init);
})();
