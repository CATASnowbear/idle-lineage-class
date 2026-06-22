/* ============================================================================
 * afk-transfer.js — 跨裝置存檔轉移(配後端 Worker：cf-transfer/)
 *
 * A 機按「匯出」→ 後端產一組「6 位數轉移碼」(預設 10 分鐘到期)。
 * B 機輸入轉移碼按「匯入」→ 取回資料寫進本機;碼被領取後立即刪除。
 * 匯出畫面會倒數;對方領走或時間到就提示。
 *
 * ⭐ 整包轉移:匯出「整台裝置的 localStorage」(4 個存檔位、共用倉庫、所有設定),
 *   不分角色;匯入時「完整取代」目標機現有的全部存檔資料(寫入前先在本機備份、
 *   失敗自動還原),完成後重新整理頁面套用。
 *   (排除本機備份副本 *_bak 與本工具自己的備份鍵,避免無謂膨脹。)
 *
 * 後端防濫用(見 cf-transfer/):CORS Origin 白名單(只允許本站與直接開 index.html 的 file://,
 * 擋其他網站來蹭)+ 每 IP 每分鐘限流 + 短 TTL + 用完即刪。
 *
 * 掛接:在 index.html 的 </body> 前加 <script src="afk-transfer.js"></script>。
 * 優雅降級:找不到 #main-menu 就停用;後端網址未設定/連不上時給明確提示,不弄壞遊戲。
 * ========================================================================== */
(function () {
  'use strict';

  // ⚙ 部署 cf-transfer Worker 後,把這裡換成你的網址(見 cf-transfer/README.md),並 bump 本檔 ?v=。
  var API = 'https://transfer.pp771007.workers.dev';
  function apiReady() { return API && API.indexOf('YOUR-SUBDOMAIN') === -1; }

  var TTL_FALLBACK = 600000;             // 後端沒回 expireAt 時的保底倒數(10 分鐘)
  var BACKUP_KEY = 'afk_transfer_backup';  // 匯入前整包備份存這個鍵(只在本機,不轉移)
  var _tick = null;                      // 倒數 interval
  var _poll = null;                      // 領取狀態輪詢 interval

  var CLS_NAME = { knight: '騎士', mage: '法師', elf: '妖精', dark: '黑暗妖精' };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function api(path, opts) {
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { ok: r.ok, status: r.status, data: j };
      });
    });
  }

  function fmtMMSS(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000), m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // 從一份存檔字串取摘要文字(角色職業/等級/名稱)
  function saveLine(slotN, raw) {
    if (!raw) return null;
    try {
      var p = JSON.parse(raw).p;
      if (!p) return null;
      return '存檔' + slotN + '：' + (CLS_NAME[p.cls] || p.cls) + ' Lv.' + (p.lv || 1) + '　' + (p.name || '未命名');
    } catch (e) { return null; }
  }

  // ----- 樣式 -------------------------------------------------------------
  function injectCSS() {
    if ($('afk-tx-style')) return;
    var st = document.createElement('style');
    st.id = 'afk-tx-style';
    st.textContent =
      '#afk-tx-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;display:none;align-items:center;justify-content:center;padding:14px;}' +
      '#afk-tx-ov.open{display:flex;}' +
      '#afk-tx-card{background:#0f172a;border:1px solid #334155;border-radius:14px;width:100%;max-width:430px;max-height:92vh;overflow:auto;color:#e2e8f0;box-shadow:0 12px 40px rgba(0,0,0,.6);}' +
      '#afk-tx-card .tx-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #1e293b;position:sticky;top:0;background:#0f172a;}' +
      '#afk-tx-card .tx-hd b{font-size:16px;}' +
      '#afk-tx-x{background:none;border:none;color:#94a3b8;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}' +
      '#afk-tx-card .tx-tabs{display:flex;gap:8px;padding:12px 16px 0;}' +
      '#afk-tx-card .tx-tab{flex:1;padding:9px;border-radius:9px;border:1px solid #334155;background:#1e293b;color:#cbd5e1;cursor:pointer;font-weight:bold;}' +
      '#afk-tx-card .tx-tab.on{background:#0ea5e9;border-color:#0ea5e9;color:#fff;}' +
      '#afk-tx-card .tx-body{padding:14px 16px 18px;}' +
      '#afk-tx-card .tx-lbl{font-size:13px;color:#94a3b8;margin:4px 0 8px;line-height:1.5;}' +
      '#afk-tx-card .tx-list{font-size:13px;background:#1e293b;border-radius:9px;padding:9px 11px;margin-bottom:12px;line-height:1.7;color:#cbd5e1;}' +
      '#afk-tx-card .tx-list .s-n{color:#7dd3fc;}' +
      '#afk-tx-card .tx-btn{width:100%;padding:12px;border-radius:10px;border:none;background:#0ea5e9;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;}' +
      '#afk-tx-card .tx-btn:disabled{opacity:.5;cursor:default;}' +
      '#afk-tx-card .tx-code-in{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:26px;letter-spacing:8px;text-align:center;font-family:monospace;margin-bottom:12px;}' +
      '#afk-tx-card .tx-codebox{text-align:center;margin:6px 0 12px;}' +
      '#afk-tx-card .tx-code{font-size:46px;letter-spacing:12px;font-family:monospace;font-weight:bold;color:#fde047;}' +
      '#afk-tx-card .tx-count{font-size:14px;color:#94a3b8;margin-top:6px;}' +
      '#afk-tx-card .tx-count b{color:#7dd3fc;}' +
      '#afk-tx-card .tx-msg{font-size:13px;border-radius:9px;padding:10px;margin-top:10px;line-height:1.5;}' +
      '#afk-tx-card .tx-msg.ok{background:#064e3b;color:#a7f3d0;}' +
      '#afk-tx-card .tx-msg.err{background:#7f1d1d;color:#fecaca;}' +
      '#afk-tx-card .tx-msg.info{background:#1e293b;color:#cbd5e1;}' +
      '#afk-tx-card .tx-warn{font-size:12px;color:#fca5a5;margin-top:2px;margin-bottom:12px;line-height:1.5;}' +
      '#afk-tx-card .tx-hint{font-size:12px;color:#64748b;margin-top:10px;line-height:1.5;}';
    document.head.appendChild(st);
  }

  // ----- 首頁入口 ---------------------------------------------------------
  function injectButton(menu) {
    if ($('afk-tx-open')) return;
    var b = document.createElement('button');
    b.id = 'afk-tx-open';
    b.type = 'button';
    b.className = 'btn text-xl py-4 bg-sky-700 hover:bg-sky-600 border-sky-500';
    b.textContent = '📦 存檔轉移（跨裝置）';
    b.addEventListener('click', openModal);
    menu.appendChild(b);
  }

  // ----- Modal 建構 -------------------------------------------------------
  function buildModal() {
    if ($('afk-tx-ov')) return;
    var ov = document.createElement('div');
    ov.id = 'afk-tx-ov';
    ov.innerHTML =
      '<div id="afk-tx-card">' +
        '<div class="tx-hd"><b>📦 存檔轉移（跨裝置）</b><button id="afk-tx-x" type="button" aria-label="關閉">×</button></div>' +
        '<div class="tx-tabs">' +
          '<button class="tx-tab on" id="afk-tx-tab-ex" type="button">匯出（產生碼）</button>' +
          '<button class="tx-tab" id="afk-tx-tab-im" type="button">匯入（輸入碼）</button>' +
        '</div>' +
        '<div class="tx-body">' +
          '<div id="afk-tx-pane-ex">' +
            '<div class="tx-lbl">會把這台裝置的<b>全部存檔資料</b>（4 個存檔位、共用倉庫、各項設定）整包打包成一組轉移碼。</div>' +
            '<div class="tx-list" id="afk-tx-ex-list"></div>' +
            '<button class="tx-btn" id="afk-tx-ex-go" type="button">產生轉移碼</button>' +
            '<div id="afk-tx-ex-result"></div>' +
            '<div class="tx-hint">在另一台裝置開同一個遊戲 →「存檔轉移」→「匯入」→ 輸入這組碼即可。轉移碼僅短時間有效，對方領取後立即失效。本機資料不會因匯出而改變。</div>' +
          '</div>' +
          '<div id="afk-tx-pane-im" style="display:none;">' +
            '<div class="tx-lbl">輸入對方裝置產生的 6 位數轉移碼：</div>' +
            '<input id="afk-tx-im-code" class="tx-code-in" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="off">' +
            '<div class="tx-warn">⚠ 匯入會以轉移來的資料<b>完整取代</b>這台裝置現有的全部存檔（4 個角色、倉庫、設定都會被覆蓋）。<br>匯入前會自動在本機備份，完成後頁面會重新整理。</div>' +
            '<button class="tx-btn" id="afk-tx-im-go" type="button">匯入並取代本機資料</button>' +
            '<div id="afk-tx-im-result"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    $('afk-tx-x').addEventListener('click', closeModal);
    $('afk-tx-tab-ex').addEventListener('click', function () { switchTab('ex'); });
    $('afk-tx-tab-im').addEventListener('click', function () { switchTab('im'); });
    $('afk-tx-ex-go').addEventListener('click', doExport);
    $('afk-tx-im-go').addEventListener('click', doImport);
    $('afk-tx-im-code').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); });
  }

  function switchTab(which) {
    stopTimers();
    $('afk-tx-tab-ex').classList.toggle('on', which === 'ex');
    $('afk-tx-tab-im').classList.toggle('on', which === 'im');
    $('afk-tx-pane-ex').style.display = which === 'ex' ? '' : 'none';
    $('afk-tx-pane-im').style.display = which === 'im' ? '' : 'none';
  }

  // 列出本機現有的存檔位摘要(讓使用者確認要轉移的內容)
  function renderLocalList() {
    var el = $('afk-tx-ex-list'); if (!el) return;
    var lines = [];
    for (var n = 1; n <= 4; n++) {
      var line = saveLine(n, localStorage.getItem('lineage_idle_save_' + n));
      if (line) lines.push('<span class="s-n">' + esc(line) + '</span>');
    }
    el.innerHTML = lines.length ? ('本機現有：<br>' + lines.join('<br>')) : '本機目前沒有任何存檔。';
  }

  function openModal() {
    buildModal();
    injectCSS();
    if (!apiReady()) {
      var m = '<div class="tx-msg err">轉移伺服器尚未設定（請先部署 cf-transfer 並填入網址）。</div>';
      $('afk-tx-ex-result').innerHTML = m; $('afk-tx-im-result').innerHTML = m;
    } else {
      $('afk-tx-ex-result').innerHTML = ''; $('afk-tx-im-result').innerHTML = '';
    }
    renderLocalList();
    switchTab('ex');
    $('afk-tx-ov').classList.add('open');
  }

  function closeModal() {
    stopTimers();
    var ov = $('afk-tx-ov'); if (ov) ov.classList.remove('open');
  }

  function stopTimers() {
    if (_tick) { clearInterval(_tick); _tick = null; }
    if (_poll) { clearInterval(_poll); _poll = null; }
  }

  // ----- 匯出 -------------------------------------------------------------
  // 整包打包本機 localStorage(排除 *_bak 備份副本與本工具的備份鍵)。
  function buildFullDump() {
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}   // 先把目前進度寫入 localStorage
    var data = {};
    var hasSave = false;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || /_bak$/.test(k) || k === BACKUP_KEY) continue;
      data[k] = localStorage.getItem(k);
      if (/^lineage_idle_save_[1-4]$/.test(k)) hasSave = true;
    }
    if (!hasSave) return null;
    return JSON.stringify({ t: 'ls', v: 1, data: data });
  }

  function doExport() {
    if (!apiReady()) return;
    var res = $('afk-tx-ex-result');
    var payload = buildFullDump();
    if (!payload) { res.innerHTML = '<div class="tx-msg err">本機沒有可轉移的存檔。</div>'; return; }
    var btn = $('afk-tx-ex-go'); btn.disabled = true; btn.textContent = '產生中…';
    res.innerHTML = '';
    api('/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: payload }),
    }).then(function (r) {
      btn.disabled = false; btn.textContent = '重新產生轉移碼';
      if (r.ok && r.data && r.data.code) {
        showCode(r.data.code, r.data.expireAt || (Date.now() + TTL_FALLBACK));
      } else {
        res.innerHTML = '<div class="tx-msg err">' + errMsg(r) + '</div>';
      }
    }).catch(function () {
      btn.disabled = false; btn.textContent = '產生轉移碼';
      res.innerHTML = '<div class="tx-msg err">連線失敗，請稍後再試。</div>';
    });
  }

  function showCode(code, expireAt) {
    stopTimers();
    var res = $('afk-tx-ex-result');
    res.innerHTML =
      '<div class="tx-codebox"><div class="tx-code">' + esc(code) + '</div>' +
      '<div class="tx-count">剩餘 <b id="afk-tx-cd">--:--</b>　到期或被領取後即失效</div></div>' +
      '<div id="afk-tx-st" class="tx-msg info">在另一台裝置「匯入」輸入這組碼。對方領取後這裡會提示。</div>';
    var cdEl = $('afk-tx-cd'), stEl = $('afk-tx-st');
    function refresh() {
      var left = expireAt - Date.now();
      if (cdEl) cdEl.textContent = fmtMMSS(left);
      if (left <= 0) {
        stopTimers();
        if (stEl) { stEl.className = 'tx-msg err'; stEl.textContent = '轉移碼已過期，請重新產生。'; }
        if (cdEl) cdEl.textContent = '0:00';
      }
    }
    refresh();
    _tick = setInterval(refresh, 1000);
    // 每 10 秒問後端「碼還在嗎」;消失且還沒到期 → 對方已領取。
    _poll = setInterval(function () {
      api('/status?code=' + encodeURIComponent(code), {}).then(function (r) {
        if (r.ok && r.data && r.data.exists === false && Date.now() < expireAt) {
          stopTimers();
          if (cdEl && cdEl.parentNode) cdEl.parentNode.style.display = 'none';
          if (stEl) { stEl.className = 'tx-msg ok'; stEl.textContent = '✅ 對方已成功領取，轉移碼已刪除。'; }
        }
      }).catch(function () {});
    }, 10000);
  }

  // ----- 匯入 -------------------------------------------------------------
  function doImport() {
    if (!apiReady()) return;
    var res = $('afk-tx-im-result');
    var code = ($('afk-tx-im-code').value || '').trim();
    if (!/^\d{6}$/.test(code)) { res.innerHTML = '<div class="tx-msg err">請輸入 6 位數轉移碼。</div>'; return; }
    var btn = $('afk-tx-im-go'); btn.disabled = true; btn.textContent = '匯入中…';
    res.innerHTML = '';
    api('/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code }),
    }).then(function (r) {
      btn.disabled = false; btn.textContent = '匯入並取代本機資料';
      if (r.ok && r.data && typeof r.data.save === 'string') {
        applyImport(r.data.save, res);
      } else if (r.status === 404) {
        res.innerHTML = '<div class="tx-msg err">查無此轉移碼（可能已過期、已被領取或輸入錯誤）。</div>';
      } else {
        res.innerHTML = '<div class="tx-msg err">' + errMsg(r) + '</div>';
      }
    }).catch(function () {
      btn.disabled = false; btn.textContent = '匯入並取代本機資料';
      res.innerHTML = '<div class="tx-msg err">連線失敗，請稍後再試。</div>';
    });
  }

  // 把本機 localStorage 整包快照成字串(排除本工具備份鍵,避免備份套疊)。
  function snapshot() {
    var o = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k !== BACKUP_KEY) o[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ t: 'ls-backup', data: o });
  }

  // 用取回的整包資料「完整取代」本機 localStorage:清空 → 寫入;寫入失敗自動還原;成功後備份+重整。
  function applyImport(text, res) {
    var env;
    try { env = JSON.parse(text); } catch (e) { res.innerHTML = '<div class="tx-msg err">收到的資料格式錯誤。</div>'; return; }
    var data = env && env.data;
    if (!env || env.t !== 'ls' || !data || typeof data !== 'object') {
      res.innerHTML = '<div class="tx-msg err">收到的內容不是有效的整包存檔資料。</div>'; return;
    }
    var incoming = [];
    for (var n = 1; n <= 4; n++) { var ln = saveLine(n, data['lineage_idle_save_' + n]); if (ln) incoming.push(ln); }
    if (!incoming.length) { res.innerHTML = '<div class="tx-msg err">轉移資料裡找不到任何角色存檔。</div>'; return; }

    if (!confirm('即將匯入以下存檔，並「完整取代」這台裝置現有的全部存檔資料：\n\n' + incoming.join('\n') +
                 '\n\n（目前這台的資料會先自動備份；匯入後頁面會重新整理）\n確定要匯入嗎？')) {
      res.innerHTML = '<div class="tx-msg info">已取消，未變更本機資料。</div>'; return;
    }

    var snap = snapshot();   // 先在記憶體留一份本機現況,寫入失敗可還原
    try {
      localStorage.clear();
      for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) localStorage.setItem(k, data[k]);
    } catch (e) {
      try { localStorage.clear(); var b = JSON.parse(snap).data; for (var kk in b) localStorage.setItem(kk, b[kk]); } catch (_) {}
      res.innerHTML = '<div class="tx-msg err">匯入失敗（資料量超出此瀏覽器上限），已還原本機原本資料。</div>';
      return;
    }
    try { localStorage.setItem(BACKUP_KEY, snap); } catch (e) { /* 沒空間放備份不影響已寫入的新資料 */ }

    res.innerHTML = '<div class="tx-msg ok">✅ 已完整匯入！正在重新整理頁面…</div>';
    stopTimers();
    setTimeout(function () { location.reload(); }, 1400);
  }

  function errMsg(r) {
    var e = r && r.data && r.data.error;
    if (e === 'rate_limited') return '操作太頻繁，請稍候一分鐘再試。';
    if (e === 'too_large') return '存檔資料過大，無法轉移。';
    if (e === 'forbidden_origin') return '此來源未被允許使用轉移伺服器。';
    if (e === 'busy') return '伺服器忙碌，請稍後再試。';
    return '操作失敗（' + (e || ('HTTP ' + (r && r.status))) + '）。';
  }

  // ----- 啟動 -------------------------------------------------------------
  function init() {
    var menu = $('main-menu');
    if (!menu) { console.warn('[AFK-transfer] 找不到 #main-menu，存檔轉移停用。'); return; }
    injectCSS();
    injectButton(menu);
    if (!apiReady()) console.warn('[AFK-transfer] 後端網址尚未設定（API 仍是 placeholder），功能待設定。');
    console.log('[AFK-transfer] hooks OK — 跨裝置存檔轉移已啟用（整包 localStorage）。');
  }

  ready(init);
})();
