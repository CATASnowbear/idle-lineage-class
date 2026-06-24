/* ============================================================================
 * afk-pwa.js — 把遊戲變成可「安裝成免網路遊玩」的 PWA(安裝 + 離線資源預抓)
 *
 * 行為（全在首頁 #main-menu，遊戲中不顯示）：
 *   ● 還沒安裝 → 顯示一條純文字連結「📥 安裝成免網路遊玩」。
 *       - Android/桌機 Chromium：點了叫出系統安裝視窗（beforeinstallprompt）。
 *       - iOS / 抓不到安裝事件：點了跳文字引導（分享→加入主畫面）。
 *   ● 安裝完（以 app 模式開啟）→ 背景把全部圖（assets/）抓進圖桶，顯示「離線資源下載中 X%」直到 100%（之後就能完全離線）。
 *
 * 為什麼沒有「更新」相關 UI（自動更新勾勾 / 更新鈕 / version.json 落後偵測 / 頁面端強制刷新）了：
 *   sw.js 已把「導覽文件（index.html / 目錄 '/'）」改成 network-first——線上開頁一律抓最新「殼」，
 *   JS 帶 ?v= 版本號換版即換 URL，所以「線上＝永遠最新」是自動且無條件的，不再需要頁面端偵測落後/強制刷新/讓使用者選自動更新。
 *   離線則退快取照常遊玩。更新接管交還給瀏覽器對 sw.js 的標準偵測，本檔不再主導 skip-waiting，避免遊戲中途被強制 reload。
 *
 * 設計重點：
 *   - SW 註冊沿用 afk-sw.js（已上線驗證過）；本檔只負責「安裝 UI / 背景預抓 / 圖桶對帳」。
 *   - <head> 的 manifest / 圖示 / theme-color 用 JS 注入（每小時自動同步會用原版整份覆蓋 index.html、只重插外掛 <script>，
 *     寫死在 <head> 會被洗掉）。
 *   - 非安全環境（file://）自動略過 SW 相關功能，遊戲照舊、零錯誤。
 *
 * 掛接：index.html </body> 前 <script src="afk-pwa.js"></script>
 * ========================================================================== */
(function () {
  'use strict';

  var PRECACHE_DONE = 'afk_pwa_precached';       // '1'=離線資源已抓滿，跳過自動預抓
  var MANIFEST_SIG = 'afk_pwa_manifest_sig';     // 上次抓滿時的圖清單簽章；程式更新帶新圖→簽章變→重抓(否則新圖離線 404)
  var ICON = 'pwa-icon-192.png';

  var reg = null;            // ServiceWorkerRegistration
  var precaching = false, precacheFinished = false;
  var precachePhase = '';     // 'check'=檢查離線資源 / 'download'=下載圖片
  var precacheTotal = 0, precacheCheck = 0;   // 階段1:總圖數 / 已檢查數
  var precacheNeed = 0, precacheDone = 0;     // 階段2:要下載數 / 已下載數
  var precachePending = 0;    // 檢查完發現有 N 張待下載、但等使用者按「下載」才開始(已安裝、更新帶新圖時)
  var deferredPrompt = null; // 攔下來的 beforeinstallprompt，供安裝連結點擊時用

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function isStandalone() {
    return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches)) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream;
  }
  // 真的能跑 PWA/SW 的環境:有 serviceWorker、是安全環境、且 protocol 是 http/https。
  //   用「正面表列 http(s)」而不是排除 file://:SW 本來就只在 http(s) 跑,這樣連 data:/blob: 等
  //   origin 為 null 的環境一併擋掉,且不必去猜各家瀏覽器怎麼回報 origin。
  function pwaCapable() {
    return ('serviceWorker' in navigator) && window.isSecureContext && /^https?:$/.test(location.protocol);
  }

  // ----- <head> 注入：manifest / 圖示 / theme-color（同步會洗掉寫死的，故用 JS 補）-------
  function injectHead() {
    function add(tag, attrs) {
      var el = document.createElement(tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      document.head.appendChild(el);
    }
    // manifest 只在 http(s) 注入:file:// 下瀏覽器抓 manifest 會被 CORS 擋(origin null)、console 噴紅字,且 PWA 本來就只在 http(s) 能用
    if (/^https?:$/.test(location.protocol) && !document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
    if (!document.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: ICON });
    if (!document.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#0f141d' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    if (!document.querySelector('meta[name="mobile-web-app-capable"]')) add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) add('meta', { name: 'apple-mobile-web-app-title', content: '放置天堂' });
  }

  function injectCSS() {
    if (document.getElementById('afk-pwa-style')) return;
    var s = document.createElement('style');
    s.id = 'afk-pwa-style';
    s.textContent =
      '#afk-pwa-bar{margin-top:6px;text-align:center;font-size:13px;color:#94a3b8;line-height:1.8;}' +
      '#afk-pwa-bar .afk-pwa-link{color:#7dd3fc;text-decoration:underline;cursor:pointer;background:none;border:0;padding:0;font:inherit;}' +
      '#afk-pwa-bar .afk-pwa-link:hover{color:#bae6fd;}' +
      '#afk-pwa-bar .afk-pwa-prog{color:#34d399;}' +
      '#afk-pwa-bar .afk-pwa-dl{color:#fbbf24;margin-left:4px;}' +
      '#afk-pwa-bar .afk-pwa-done{color:#34d399;}';
    document.head.appendChild(s);
  }

  // ----- 首頁 UI ----------------------------------------------------------
  function bar() {
    var b = document.getElementById('afk-pwa-bar');
    if (!b) {
      var menu = document.getElementById('main-menu');
      if (!menu) return null;
      b = document.createElement('div');
      b.id = 'afk-pwa-bar';
      menu.appendChild(b);
    }
    return b;
  }

  function renderBar() {
    var b = bar();
    if (!b) return;
    // 未安裝時:安裝入口已移到首頁「⚙ 設定」選單(見 registerInstallSetting),首頁這條空白不顯示;
    //   只有「已安裝」後才在這顯示離線資源預抓狀態(更新已交給 sw.js network-first,無需更新 UI)。
    var html = '';
    if (isStandalone()) {
      if (precaching) {
        if (precachePhase === 'download' && precacheNeed > 0) {
          var dpct = Math.floor(precacheDone / precacheNeed * 100);
          html += '<div class="afk-pwa-prog">⬇️ 下載圖片 ' + dpct + '%（' + precacheDone + '/' + precacheNeed + '）</div>';
        } else {
          var cpct = precacheTotal ? Math.floor(precacheCheck / precacheTotal * 100) : 0;
          html += '<div class="afk-pwa-prog">🔍 檢查離線資源 ' + cpct + '%</div>';
        }
      } else if (precachePending > 0) {
        // 檢查完發現有新圖,但不自動抓——顯示張數 + 一顆小「下載」連結,點了才開始
        html += '<div class="afk-pwa-prog">🆕 有 ' + precachePending + ' 張新圖待下載' +
                '<button type="button" class="afk-pwa-link afk-pwa-dl" id="afk-pwa-dl">下載</button></div>';
      } else if (precacheFinished) {
        html += '<div class="afk-pwa-done">✅ 已可完全離線遊玩</div>';
      }
    }
    b.innerHTML = html;
    b.style.display = html ? '' : 'none';   // 未安裝時整條收起,首頁清爽
    var dl = document.getElementById('afk-pwa-dl');
    if (dl) dl.addEventListener('click', startPrecacheDownload);
  }

  // 點「安裝」先彈一張說明卡：提醒「日後移除安裝」各瀏覽器對存檔的處理不一定一樣，
  //   保險起見先匯出存檔再移除。用籠統寫法（不同瀏覽器/系統行為確實不一致，講死反而會誤導）。
  function onInstallClick() {
    installNoticeBox(doInstall);
  }
  function installNoticeBox(onOk) {
    var m = document.createElement('div');
    m.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:24px;');
    m.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;max-width:380px;width:100%;padding:20px;color:#e2e8f0;text-align:left;">' +
      '<div style="font-weight:bold;font-size:15px;margin-bottom:12px;text-align:center;">📥 安裝成免網路遊玩</div>' +
      '<div style="line-height:1.8;font-size:13px;color:#cbd5e1;margin-bottom:16px;">' +
      '安裝後可以離線開啟，存檔會保存在這個瀏覽器／裝置上。<br><br>' +
      '<b style="color:#fbbf24;">提醒：</b>日後若要「移除安裝」，<b>部分瀏覽器或系統會連同存檔一起清掉，部分則會保留</b>——各家行為不一定相同。為了保險，移除前建議先到遊戲內<b>匯出存檔</b>備份，日後重裝或換裝置都能再匯入回來。' +
      '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '<button type="button" id="afk-pwa-ni-cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #475569;background:#334155;color:#e2e8f0;cursor:pointer;">取消</button>' +
      '<button type="button" id="afk-pwa-ni-ok" style="flex:1;padding:10px;border-radius:8px;border:1px solid #16a34a;background:#15803d;color:#fff;cursor:pointer;">知道了，開始安裝</button>' +
      '</div></div>';
    document.body.appendChild(m);
    function remove() { if (m.parentNode) m.parentNode.removeChild(m); }
    var layer = window.AFK_UI ? AFK_UI.openLayer(remove) : null;   // 手機返回鍵 / ESC 可關
    function close() { if (layer && window.AFK_UI) AFK_UI.closeLayer(layer); else remove(); }
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#afk-pwa-ni-cancel').addEventListener('click', close);
    m.querySelector('#afk-pwa-ni-ok').addEventListener('click', function () { close(); onOk(); });
  }

  function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      var dp = deferredPrompt;
      (dp.userChoice || Promise.resolve()).then(function () { deferredPrompt = null; renderBar(); });
      return;
    }
    // 抓不到安裝事件（iOS，或瀏覽器尚未允許）→ 文字引導
    var guide = isIOS()
      ? 'iPhone / iPad 安裝方式：\n在 Safari 點下方的「分享」鈕 → 往下找「加入主畫面」→ 加入。\n之後從桌面圖示開啟，即可離線遊玩。'
      : '安裝方式：\n點瀏覽器右上角「⋮」選單 → 選「安裝應用程式」或「加到主畫面」。\n之後從桌面圖示開啟，即可離線遊玩。';
    alert(guide);   // afk-ui 會把 alert 美化成深色卡片
  }

  // ----- 圖桶對帳 + 背景預抓 ----------------------------------------------
  // 抓最新 assets-manifest.json(每筆 [path, sha];manifest 走網路、永遠最新),交給 cb 用。
  function withManifest(cb) {
    fetch('assets-manifest.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (manifest) { if (manifest && manifest.length) cb(manifest); })
      .catch(function () {});
  }
  // 每次載入都把最新 manifest 送給 SW:
  //   ● reconcile(線上逛、已安裝都跑)→ 只清掉 sha 對不上的舊圖,作者換一張只重抓一張、不重載整包。
  //       已安裝(isStandalone)時帶 deferReplaced:被換掉的舊圖先留著,等使用者按下載再覆寫(見 sw.js)。
  //   ● 首次安裝(forcePrecache)→ 直接把整包圖抓滿(裝了就離線,不打擾)。
  //   ● 之後已安裝、資產集有變/沒抓滿 → 只「檢查」算出 N 張待下載,由使用者按「下載」鈕才抓(checkOnly)。
  //   首次安裝尚未接管(無 controller)→ 等接管後再跑(此時快取為空,reconcile 是 no-op、precache 照抓)。
  function syncImages(forcePrecache) {
    var ctrl = navigator.serviceWorker.controller;
    if (!ctrl) {
      navigator.serviceWorker.addEventListener('controllerchange', function once() {
        navigator.serviceWorker.removeEventListener('controllerchange', once);
        syncImages(forcePrecache);
      });
      return;
    }
    var precacheDoneFlag = localStorage.getItem(PRECACHE_DONE) === '1';
    withManifest(function (manifest) {
      ctrl.postMessage({ type: 'reconcile-images', manifest: manifest, deferReplaced: isStandalone() });
      var sig = _manifestSig(manifest);
      var manifestChanged = localStorage.getItem(MANIFEST_SIG) !== sig;
      // checkNeeded:已安裝、且(沒抓滿過 或 資產集變了)→ 要算 N 張待下載。forcePrecache 不在此列(它直接抓滿)。
      var checkNeeded = !forcePrecache && isStandalone() && (!precacheDoneFlag || manifestChanged);
      if (!forcePrecache && !checkNeeded) {
        if (isStandalone() && precacheDoneFlag) { precacheFinished = true; renderBar(); }   // 已抓滿且無變動 → 顯示「✅ 已可完全離線」
        return;
      }
      _pendingSig = sig;
      startPrecache(manifest, checkNeeded);   // forcePrecache→完整抓;checkNeeded→只檢查
    });
  }
  // 啟動預抓:checkOnly=true 只檢查(回報 N 張待下載、等使用者點下載);false 直接走完整檢查+下載。
  function startPrecache(manifest, checkOnly) {
    var ctrl = navigator.serviceWorker.controller;
    if (!ctrl) return;
    precaching = true; precacheFinished = false; precachePending = 0;
    precachePhase = 'check'; precacheTotal = manifest.length; precacheCheck = 0;
    precacheNeed = 0; precacheDone = 0;
    renderBar();
    ctrl.postMessage({ type: 'precache-images', manifest: manifest, checkOnly: !!checkOnly });
  }
  // 使用者按「下載」→ 抓最新 manifest 走完整下載(SW 會很快重跑一次檢查再抓,維持無狀態較穩)。
  function startPrecacheDownload() {
    withManifest(function (manifest) {
      _pendingSig = _manifestSig(manifest);
      startPrecache(manifest, false);
    });
  }
  // 抓滿(或檢查後發現本來就齊全)→ 記住「已完整離線 + 這份資產簽章」,下次同簽章就不再檢查。
  function commitPrecacheDone() {
    localStorage.setItem(PRECACHE_DONE, '1');
    if (_pendingSig) { localStorage.setItem(MANIFEST_SIG, _pendingSig); _pendingSig = null; }
  }
  var _pendingSig = null;
  // 圖清單便宜簽章:筆數 + 所有 git-blob-sha 的滾動雜湊;新增一張或換一張都會變
  function _manifestSig(manifest) {
    var h = 5381, n = manifest.length;
    for (var i = 0; i < n; i++) { var s = String((manifest[i] && manifest[i][1]) || ''); for (var j = 0; j < s.length; j++) h = ((h << 5) + h + s.charCodeAt(j)) | 0; }
    return n + ':' + (h >>> 0);
  }

  // ----- SW 觀察:只管背景預抓進度(更新接管交給瀏覽器,本檔不再主導)-----------
  function watchUpdates() {
    navigator.serviceWorker.ready.then(function (r) {
      reg = r;
      // 載入時 nudge 瀏覽器重抓 sw.js 比對。更新接管走瀏覽器標準流程即可——導覽已 network-first,
      //   使用者看到的程式碼本來就一律最新,SW 何時換版不影響畫面,不需頁面端 skip-waiting/強制 reload。
      reg.update().catch(function () {});
      syncImages(false);   // 每次載入:對帳清舊圖(線上/已安裝都跑)+(已安裝未抓滿則)背景預抓
    }).catch(function () {});

    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'precache-check') { precachePhase = 'check'; precacheCheck = d.checked; precacheTotal = d.total; renderBar(); }
      else if (d.type === 'precache-check-done') {
        if (d.checkOnly) {
          // 只檢查模式:有缺就顯示「N 張待下載」按鈕,沒缺就直接標記已抓滿(避免下次又重檢查)
          precaching = false;
          if (d.need > 0) { precachePending = d.need; }
          else { precachePending = 0; precacheFinished = true; commitPrecacheDone(); }
          renderBar();
        } else {
          precachePhase = 'download'; precacheNeed = d.need; precacheDone = 0; renderBar();
        }
      }
      else if (d.type === 'precache-progress') { precachePhase = 'download'; precacheDone = d.done; precacheNeed = d.need; renderBar(); }
      else if (d.type === 'precache-done') { precaching = false; precachePending = 0; precacheFinished = true; commitPrecacheDone(); renderBar(); }
    });
  }

  // ----- 安裝事件 ---------------------------------------------------------
  function bindInstallEvents() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      renderBar();
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      renderBar();
      syncImages(true);   // 剛裝好就開始把圖抓滿(forcePrecache:此刻分頁仍是瀏覽器模式、isStandalone 還是 false)
    });
  }

  // 把「安裝成免網路遊玩」註冊成首頁「⚙ 設定」選單的一項(由 afk-storage 渲染)。
  //   visible 於開選單時才求值:未安裝且環境支援 PWA 才出現,裝好後自動消失。
  function registerInstallSetting() {
    window.AFK_SETTINGS = window.AFK_SETTINGS || { _items: [], add: function (it) { this._items.push(it); } };
    AFK_SETTINGS.add({
      label: '📥 安裝成免網路遊玩',
      visible: function () { return pwaCapable() && !isStandalone(); },
      onClick: onInstallClick
    });
  }

  function init() {
    injectHead();
    injectCSS();
    registerInstallSetting();
    renderBar();
    bindInstallEvents();
    if (pwaCapable()) {
      watchUpdates();
    }
    console.log('[AFK-pwa] hooks OK — PWA 安裝/離線預抓已就緒。');
  }

  ready(init);
})();
