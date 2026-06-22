/* ============================================================================
 * afk-transfer.js — 跨裝置存檔轉移(配後端 Worker：cf-transfer/)
 *
 * A 機按「匯出」→ 後端產一組「6 位數轉移碼」(預設 10 分鐘到期)。
 * B 機輸入轉移碼按「匯入」→ 取回存檔寫進指定存檔位;碼被領取後立即刪除。
 * 匯出畫面會倒數;對方領走或時間到就提示。
 *
 * 重用原作者存檔格式:lineage_idle_save_<slot> 的 JSON(含 .p 玩家)+ 共用倉庫 wh,
 * 與內建「匯出進度 / 匯入」完全相容。
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
  //   例:'https://transfer.your-name.workers.dev'
  var API = 'https://transfer.pp771007.workers.dev';
  function apiReady() { return API && API.indexOf('YOUR-SUBDOMAIN') === -1; }

  var TTL_FALLBACK = 600000;   // 後端沒回 expireAt 時的保底倒數(10 分鐘)
  var _tick = null;            // 倒數 interval
  var _poll = null;            // 領取狀態輪詢 interval

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  // 讀某存檔位摘要(重用原作者 slotSummary):{name,cls,lv,gold} 或 null
  function slotInfo(n) {
    try { return (typeof slotSummary === 'function') ? slotSummary(String(n)) : null; } catch (e) { return null; }
  }
  function slotLabel(n) {
    var s = slotInfo(n);
    return s ? (esc(s.cls) + ' Lv.' + s.lv + '　' + esc(s.name)) : '（空）';
  }

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
      '#afk-tx-card .tx-lbl{font-size:13px;color:#94a3b8;margin:4px 0 6px;}' +
      '#afk-tx-card .tx-slots{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}' +
      '#afk-tx-card .tx-slot{text-align:left;padding:9px 10px;border-radius:9px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;cursor:pointer;font-size:13px;line-height:1.35;}' +
      '#afk-tx-card .tx-slot .s-n{color:#7dd3fc;font-weight:bold;margin-right:4px;}' +
      '#afk-tx-card .tx-slot.on{border-color:#0ea5e9;background:#0c4a6e;}' +
      '#afk-tx-card .tx-slot .s-sub{color:#94a3b8;font-size:12px;}' +
      '#afk-tx-card .tx-btn{width:100%;padding:12px;border-radius:10px;border:none;background:#0ea5e9;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;}' +
      '#afk-tx-card .tx-btn:disabled{opacity:.5;cursor:default;}' +
      '#afk-tx-card .tx-btn.sec{background:#334155;}' +
      '#afk-tx-card .tx-code-in{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#fff;font-size:26px;letter-spacing:8px;text-align:center;font-family:monospace;margin-bottom:12px;}' +
      '#afk-tx-card .tx-codebox{text-align:center;margin:6px 0 12px;}' +
      '#afk-tx-card .tx-code{font-size:46px;letter-spacing:12px;font-family:monospace;font-weight:bold;color:#fde047;}' +
      '#afk-tx-card .tx-count{font-size:14px;color:#94a3b8;margin-top:6px;}' +
      '#afk-tx-card .tx-count b{color:#7dd3fc;}' +
      '#afk-tx-card .tx-msg{font-size:13px;border-radius:9px;padding:10px;margin-top:10px;line-height:1.5;}' +
      '#afk-tx-card .tx-msg.ok{background:#064e3b;color:#a7f3d0;}' +
      '#afk-tx-card .tx-msg.err{background:#7f1d1d;color:#fecaca;}' +
      '#afk-tx-card .tx-msg.info{background:#1e293b;color:#cbd5e1;}' +
      '#afk-tx-card .tx-hint{font-size:12px;color:#64748b;margin-top:10px;line-height:1.5;}' +
      '#afk-tx-card .tx-row2{display:flex;gap:8px;margin-top:10px;}' +
      '#afk-tx-card .tx-row2 .tx-btn{flex:1;}';
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
  var _exSlot = 1, _imSlot = 1;

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
            '<div class="tx-lbl">選擇要轉移的存檔位：</div>' +
            '<div class="tx-slots" id="afk-tx-ex-slots"></div>' +
            '<button class="tx-btn" id="afk-tx-ex-go" type="button">產生轉移碼</button>' +
            '<div id="afk-tx-ex-result"></div>' +
            '<div class="tx-hint">在另一台裝置開同一個遊戲 →「存檔轉移」→「匯入」→ 輸入這組碼即可。轉移碼僅短時間有效，對方領取後立即失效。</div>' +
          '</div>' +
          '<div id="afk-tx-pane-im" style="display:none;">' +
            '<div class="tx-lbl">輸入對方裝置產生的 6 位數轉移碼：</div>' +
            '<input id="afk-tx-im-code" class="tx-code-in" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="off">' +
            '<div class="tx-lbl">匯入到哪個存檔位（會覆蓋該位置，原存檔自動備份）：</div>' +
            '<div class="tx-slots" id="afk-tx-im-slots"></div>' +
            '<button class="tx-btn" id="afk-tx-im-go" type="button">匯入</button>' +
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

  function renderSlots(containerId, sel, onPick) {
    var c = $(containerId); if (!c) return;
    var html = '';
    for (var n = 1; n <= 4; n++) {
      var info = slotInfo(n);
      var sub = info ? (esc(info.cls) + ' Lv.' + info.lv + '<br>' + esc(info.name)) : '（空）';
      html += '<button type="button" class="tx-slot' + (n === sel ? ' on' : '') + '" data-n="' + n + '">' +
              '<span class="s-n">存檔' + n + '</span><span class="s-sub">' + sub + '</span></button>';
    }
    c.innerHTML = html;
    Array.prototype.forEach.call(c.querySelectorAll('.tx-slot'), function (el) {
      el.addEventListener('click', function () {
        Array.prototype.forEach.call(c.querySelectorAll('.tx-slot'), function (x) { x.classList.remove('on'); });
        el.classList.add('on');
        onPick(Number(el.getAttribute('data-n')));
      });
    });
  }

  function switchTab(which) {
    stopTimers();
    $('afk-tx-tab-ex').classList.toggle('on', which === 'ex');
    $('afk-tx-tab-im').classList.toggle('on', which === 'im');
    $('afk-tx-pane-ex').style.display = which === 'ex' ? '' : 'none';
    $('afk-tx-pane-im').style.display = which === 'im' ? '' : 'none';
  }

  function defaultSlot() {
    try { if (typeof currentSlot !== 'undefined' && slotInfo(currentSlot)) return Number(currentSlot); } catch (e) {}
    for (var n = 1; n <= 4; n++) if (slotInfo(n)) return n;
    return 1;
  }

  function openModal() {
    buildModal();
    injectCSS();
    if (!apiReady()) {
      $('afk-tx-ex-result').innerHTML = '<div class="tx-msg err">轉移伺服器尚未設定（請先部署 cf-transfer 並填入網址）。</div>';
      $('afk-tx-im-result').innerHTML = '<div class="tx-msg err">轉移伺服器尚未設定（請先部署 cf-transfer 並填入網址）。</div>';
    } else {
      $('afk-tx-ex-result').innerHTML = '';
      $('afk-tx-im-result').innerHTML = '';
    }
    _exSlot = defaultSlot(); _imSlot = defaultSlot();
    renderSlots('afk-tx-ex-slots', _exSlot, function (n) { _exSlot = n; });
    renderSlots('afk-tx-im-slots', _imSlot, function (n) { _imSlot = n; });
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
  // 組出與原作者「匯出進度」相同的字串:該存檔位 JSON + 共用倉庫 wh。
  function buildPayload(slot) {
    try {
      if (typeof currentSlot !== 'undefined' && String(slot) === String(currentSlot) && typeof saveGame === 'function') {
        saveGame();   // 目前所在存檔位:先存一次,確保是最新進度
      }
    } catch (e) {}
    var raw = localStorage.getItem('lineage_idle_save_' + slot);
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      var whRaw = (typeof WH_KEY !== 'undefined') ? localStorage.getItem(WH_KEY) : null;
      if (whRaw) obj.wh = JSON.parse(whRaw);
      return JSON.stringify(obj);
    } catch (e) { return raw; }
  }

  function doExport() {
    if (!apiReady()) return;
    var res = $('afk-tx-ex-result');
    var payload = buildPayload(_exSlot);
    if (!payload) { res.innerHTML = '<div class="tx-msg err">存檔位 ' + _exSlot + ' 沒有可轉移的存檔。</div>'; return; }
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
          if (cdEl) cdEl.parentNode && (cdEl.parentNode.style.display = 'none');
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
      btn.disabled = false; btn.textContent = '匯入';
      if (r.ok && r.data && typeof r.data.save === 'string') {
        applyImport(r.data.save, res);
      } else if (r.status === 404) {
        res.innerHTML = '<div class="tx-msg err">查無此轉移碼（可能已過期、已被領取或輸入錯誤）。</div>';
      } else {
        res.innerHTML = '<div class="tx-msg err">' + errMsg(r) + '</div>';
      }
    }).catch(function () {
      btn.disabled = false; btn.textContent = '匯入';
      res.innerHTML = '<div class="tx-msg err">連線失敗，請稍後再試。</div>';
    });
  }

  // 把取回的存檔字串寫進存檔位(重用原作者匯入邏輯:驗證 → 備份 → 寫入 → 倉庫選擇性還原)。
  function applyImport(text, res) {
    var d;
    try { d = JSON.parse(text); } catch (e) { res.innerHTML = '<div class="tx-msg err">收到的存檔格式錯誤。</div>'; return; }
    if (!d || typeof d !== 'object' || !d.p || typeof d.p !== 'object' || !d.p.cls) {
      res.innerHTML = '<div class="tx-msg err">收到的內容不是有效的放置天堂存檔。</div>'; return;
    }
    var n = _imSlot;
    var existing = slotInfo(n);
    if (existing && !confirm('存檔 ' + n + ' 已有角色（' + existing.cls + ' Lv.' + existing.lv + ' ' + existing.name + '）。\n確定用匯入的存檔「取代」它嗎？\n（原存檔會自動備份，可於載入畫面點「復原備份」還原）')) {
      res.innerHTML = '<div class="tx-msg info">已取消，未變更存檔。</div>'; return;
    }
    var whData = d.wh;
    var saveText = text;
    if (whData !== undefined) { var c = {}; for (var k in d) { if (k !== 'wh') c[k] = d[k]; } saveText = JSON.stringify(c); }
    var cur = localStorage.getItem('lineage_idle_save_' + n);
    if (cur) localStorage.setItem('lineage_idle_save_' + n + '_bak', cur);   // 匯入前自動備份
    localStorage.setItem('lineage_idle_save_' + n, saveText);

    var whMsg = '';
    if (whData !== undefined && typeof WH_KEY !== 'undefined') {
      var cnt = (whData.items && whData.items.length) || 0, gold = whData.gold || 0;
      if (confirm('此轉移檔包含倉庫資料（物品 ' + cnt + ' 項、金幣 ' + gold.toLocaleString() + '）。\n是否一併還原倉庫？\n⚠ 會覆蓋目前瀏覽器的共用倉庫（四個存檔位共用）。')) {
        localStorage.setItem(WH_KEY, JSON.stringify({ items: whData.items || [], gold: whData.gold || 0 }));
        whMsg = '<br>倉庫已一併還原。';
      } else { whMsg = '<br>（倉庫維持原狀，未還原）'; }
    }
    try { if (typeof openSlotSelect === 'function' && typeof _slotMode !== 'undefined') openSlotSelect(_slotMode); } catch (e) {}   // 刷新載入畫面清單
    var ns = slotInfo(n);
    res.innerHTML = '<div class="tx-msg ok">✅ 已匯入到存檔 ' + n + '：' +
      (ns ? (esc(ns.cls) + ' Lv.' + ns.lv + '　' + esc(ns.name)) : '完成') +
      (cur ? '<br>（原存檔已自動備份，可於載入畫面點「復原備份」還原）' : '') + whMsg +
      '<br>到「載入存檔」選此存檔位即可開始遊玩。</div>';
    // 重新整理存檔位卡片
    renderSlots('afk-tx-im-slots', _imSlot, function (x) { _imSlot = x; });
  }

  function errMsg(r) {
    var e = r && r.data && r.data.error;
    if (e === 'rate_limited') return '操作太頻繁，請稍候一分鐘再試。';
    if (e === 'too_large') return '存檔過大，無法轉移。';
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
    console.log('[AFK-transfer] hooks OK — 跨裝置存檔轉移已啟用。');
  }

  ready(init);
})();
