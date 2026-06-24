/* ============================================================================
 * afk-pwa.js — 把遊戲變成可「安裝成免網路遊玩」的 PWA，並管更新流程
 *
 * 行為（全在首頁 #main-menu，遊戲中不顯示）：
 *   ● 還沒安裝 → 顯示一條純文字連結「📥 安裝成免網路遊玩」。
 *       - Android/桌機 Chromium：點了叫出系統安裝視窗（beforeinstallprompt）。
 *       - iOS / 抓不到安裝事件：點了跳文字引導（分享→加入主畫面）。
 *   ● 安裝完（以 app 模式開啟）→ 連結換成 checkbox「自動更新至最新版本」（預設打勾），
 *       並在背景把全部圖（assets/）抓進圖桶，顯示「離線資源下載中 X%」直到 100%（之後就能完全離線）。
 *   ● 更新只在「開網頁／重整網頁」那一刻檢查一次（不常駐輪詢），所以判斷時必定停在首頁，不會在操作人物／戰鬥中途跳更新。
 *       - checkbox 有勾 → 偵測到新版直接重整套用（此時人在首頁）。
 *       - checkbox 沒勾 → 顯示「🔄 更新至最新版」連結，按了跳確認視窗，確認才更新。
 *
 * 設計重點：
 *   - SW 註冊沿用 afk-sw.js（已上線驗證過）；本檔只負責「觀察更新 / UI / 背景預抓」。
 *   - <head> 的 manifest / 圖示 / theme-color 用 JS 注入（比照 afk-fixes 注 favicon）——
 *     因為每小時自動同步會用原版整份覆蓋 index.html、只重插外掛 <script>，寫死在 <head> 會被洗掉。
 *   - 非安全環境（file://）自動略過 SW 相關功能，遊戲照舊、零錯誤。
 *
 * 掛接：index.html </body> 前 <script src="afk-pwa.js"></script>
 * ========================================================================== */
(function () {
  'use strict';

  var PREF_AUTOUPDATE = 'afk_pwa_autoupdate';   // '0'=關閉自動更新；其餘（含未設）=開啟（預設打勾）
  var PRECACHE_DONE = 'afk_pwa_precached';       // '1'=離線資源已抓滿，跳過自動預抓
  var MANIFEST_SIG = 'afk_pwa_manifest_sig';     // 上次抓滿時的圖清單簽章；程式更新帶新圖→簽章變→重抓(否則新圖離線 404)
  var ICON = 'pwa-icon-192.png';

  var reg = null;            // ServiceWorkerRegistration
  var waitingSW = null;      // 等待接管的新版 SW
  var refreshing = false;    // 防止 controllerchange 無限重整
  var updateApplied = false;  // 是否「我們主動套用更新」(只有這種 controllerchange 才重整)
  var precaching = false, precacheFinished = false;
  var precachePhase = '';     // 'check'=檢查離線資源 / 'download'=下載圖片
  var precacheTotal = 0, precacheCheck = 0;   // 階段1:總圖數 / 已檢查數
  var precacheNeed = 0, precacheDone = 0;     // 階段2:要下載數 / 已下載數
  var precachePending = 0;    // 檢查完發現有 N 張待下載、但等使用者按「下載」才開始(已安裝、更新帶新圖時)
  var deferredPrompt = null; // 攔下來的 beforeinstallprompt，供安裝連結點擊時用
  var buildId = '';          // 目前這版的 build 時間(向控制中的 SW 問,僅供畫面辨識)
  var runningCode = '';      // 控制中 SW 回報的 CODE_VERSION(= 目前畫面這份程式的版本),供 version.json 比對
  var latestCode = '';       // version.json 回報的線上最新 code
  var latestStale = false;   // 比對結果:目前是不是落後線上最新版
  var FORCED_CODE = 'afk_pwa_forced_code';   // 已用「頁面端強制刷新」把內容換到的最新 code,防 iOS 下 SW 不換版→無限重整

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  // 自動更新偏好是「全網域共用的一個 pin」——本來就只能這樣:一個 origin 只有一個 Service Worker,
  //   App 與瀏覽器分頁共用它(也共用這個 localStorage 旗標)。cache-first 下不可能 App 留舊版、瀏覽器跑新版並存,
  //   誰把新版 SW 啟用(skip-waiting)就是全體一起換。故「關閉自動更新」= App 與瀏覽器都不會被自動推上去,
  //   要更新得自己按更新鈕(App 與瀏覽器都有提供,見 renderBar)。這樣「開瀏覽器」不會反過來把想留舊版的 App 強推到新版。
  function autoUpdateOn() { return localStorage.getItem(PREF_AUTOUPDATE) !== '0'; }
  function isStandalone() {
    return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches)) ||
           window.navigator.standalone === true;
  }
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream;
  }
  // 是否正停在首頁(主選單可見)。遊戲中 #main-menu 會被加上 .hidden(見 index.html 的 startGame/loadGame)。
  //   自動更新只在首頁套用——避免在操作人物/戰鬥中突然刷新打斷遊玩。
  function onHomePage() {
    var m = document.getElementById('main-menu');
    return !!(m && !m.classList.contains('hidden'));
  }
  // 真的能跑 PWA/SW 的環境:有 serviceWorker、是安全環境、且 protocol 是 http/https。
  //   用「正面表列 http(s)」而不是排除 file://:SW 本來就只在 http(s) 跑,這樣連 data:/blob: 等
  //   origin 為 null 的環境一併擋掉,且不必去猜各家瀏覽器怎麼回報 origin
  //   (file:// 的 location.origin:Chromium 回 'file://'、Firefox 回 'null',但 protocol 兩家都是 'file:')。
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
      '#afk-pwa-bar .afk-pwa-chk{display:inline-flex;align-items:center;gap:6px;cursor:pointer;justify-content:center;}' +
      '#afk-pwa-bar .afk-pwa-chk input{width:15px;height:15px;cursor:pointer;}' +
      '#afk-pwa-bar .afk-pwa-update{color:#fbbf24;font-weight:bold;}' +
      '#afk-pwa-bar .afk-pwa-prog{color:#34d399;}' +
      '#afk-pwa-bar .afk-pwa-dl{color:#fbbf24;margin-left:4px;}' +
      '#afk-pwa-bar .afk-pwa-done{color:#34d399;}' +
      '#afk-pwa-bar .afk-pwa-ver{color:#64748b;font-size:11px;margin-top:2px;letter-spacing:.3px;}' +
      // 更新過場：套用更新到實際重整之間（SW skip-waiting→activate 有秒級延遲），蓋全螢幕轉圈避免「沒反應」的錯覺
      '#afk-pwa-updating{position:fixed;inset:0;z-index:100000;background:rgba(8,12,20,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#e2e8f0;font-size:15px;}' +
      '#afk-pwa-updating .afk-pwa-spin{width:42px;height:42px;border:4px solid #334155;border-top-color:#7dd3fc;border-radius:50%;animation:afkPwaSpin .8s linear infinite;}' +
      '#afk-pwa-updating .afk-pwa-updating-text{letter-spacing:.5px;}' +
      '@keyframes afkPwaSpin{to{transform:rotate(360deg);}}';
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
    if (!pwaCapable() && !isStandalone()) { b.innerHTML = ''; return; }   // file:// 等非 PWA 環境:不顯示任何 PWA UI(裝不了,顯示只會誤導)
    var html = '';
    // 關了自動更新 + 有等待中的新版 → 顯示手動更新連結。App 與瀏覽器分頁都要顯示:
    //   關閉是全網域共用的 pin,瀏覽器分頁也不會被自動推上去,所以這裡要給它一個手動更新的入口,
    //   否則「不自動更新、又沒得手動更新」就會卡死(使用者回報過的舊 bug)。
    var updateLink = (!autoUpdateOn() && (waitingSW || latestStale))
      ? '<div><button type="button" class="afk-pwa-link afk-pwa-update" id="afk-pwa-update">🔄 更新至最新版</button></div>'
      : '';
    if (!isStandalone()) {
      // 還沒安裝：純文字連結（非大按鈕）
      html = '<button type="button" class="afk-pwa-link" id="afk-pwa-install">📥 安裝成免網路遊玩</button>' + updateLink;
    } else {
      // 已安裝：自動更新 checkbox（預設打勾）
      html = '<label class="afk-pwa-chk"><input type="checkbox" id="afk-pwa-auto"' + (autoUpdateOn() ? ' checked' : '') + '> 自動更新至最新版本</label>';
      html += updateLink;
      // 背景預抓進度（兩階段各自讀條）
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
    if (buildId) html += '<div class="afk-pwa-ver">版本 ' + buildId + '</div>';
    b.innerHTML = html;

    var inst = document.getElementById('afk-pwa-install');
    if (inst) inst.addEventListener('click', onInstallClick);
    var auto = document.getElementById('afk-pwa-auto');
    if (auto) auto.addEventListener('change', function () {
      localStorage.setItem(PREF_AUTOUPDATE, this.checked ? '1' : '0');
      renderBar();
      if (this.checked && (waitingSW || latestStale)) applyLatest();   // 勾回自動更新且落後 → 立刻套用最新
    });
    var upd = document.getElementById('afk-pwa-update');
    if (upd) upd.addEventListener('click', function () {
      confirmBox('要更新到最新版本嗎？更新後會重新載入遊戲（進度已存檔，不會遺失）。', applyLatest);
    });
    var dl = document.getElementById('afk-pwa-dl');
    if (dl) dl.addEventListener('click', startPrecacheDownload);
  }

  // 自製確認視窗（不用原生 confirm：iOS 會抑制；樣式比照登出視窗的深色卡片）
  function confirmBox(msg, onOk) {
    var m = document.createElement('div');
    m.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:24px;');
    m.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;max-width:360px;width:100%;padding:20px;color:#e2e8f0;text-align:center;">' +
      '<div style="line-height:1.7;margin-bottom:16px;">' + msg + '</div>' +
      '<div style="display:flex;gap:10px;">' +
      '<button type="button" id="afk-pwa-cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #475569;background:#334155;color:#e2e8f0;cursor:pointer;">取消</button>' +
      '<button type="button" id="afk-pwa-ok" style="flex:1;padding:10px;border-radius:8px;border:1px solid #16a34a;background:#15803d;color:#fff;cursor:pointer;">確定更新</button>' +
      '</div></div>';
    document.body.appendChild(m);
    function close() { if (m.parentNode) m.parentNode.removeChild(m); }
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('#afk-pwa-cancel').addEventListener('click', close);
    m.querySelector('#afk-pwa-ok').addEventListener('click', function () { close(); onOk(); });
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
    function close() { if (m.parentNode) m.parentNode.removeChild(m); }
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

  // ----- 更新流程 ---------------------------------------------------------
  function onUpdateReady() {
    waitingSW = (reg && reg.waiting) || waitingSW;
    if (!waitingSW) return;
    if (autoUpdateOn()) autoApply();     // 自動：只在首頁套用(見 autoApply)
    else renderBar();                    // 手動：顯示「更新至最新版」
  }
  // 自動更新只在「停在首頁」時才重整套用。更新偵測本來就只發生在開網頁/重整那一刻(見 watchUpdates 註解),
  //   此時必定停在首頁,所以實務上一定會套到;這道 onHomePage 檢查純粹保險——萬一偵測稍慢、使用者已點進遊戲,
  //   就不在操作人物/戰鬥途中強制刷新打斷(使用者回報過的干擾),這個等待中的新版會留到下次開網頁/重整時自然套用。
  function autoApply() {
    if (onHomePage()) applyUpdate();
  }
  function applyUpdate() {
    if (!waitingSW) return;
    if (updateApplied || refreshing) return;   // 防重複套用:native(reg.waiting)與 version.json 兩條偵測可能同時觸發
    updateApplied = true;
    showUpdatingOverlay();   // 立刻給回饋，使用者按完「確定更新」不會覺得沒反應
    waitingSW.postMessage({ type: 'skip-waiting' });
    // 保險：萬一 controllerchange 沒如期觸發（卡 waiting），逾時也強制重整，不讓過場停在那
    setTimeout(function () { if (!refreshing) { refreshing = true; location.reload(); } }, 8000);
  }
  function showUpdatingOverlay() {
    if (document.getElementById('afk-pwa-updating')) return;
    var o = document.createElement('div');
    o.id = 'afk-pwa-updating';
    o.innerHTML = '<div class="afk-pwa-spin"></div><div class="afk-pwa-updating-text">正在更新至最新版…</div>';
    document.body.appendChild(o);
  }

  // ----- 落後偵測(獨立於 SW 機制,治本)-------------------------------------
  // 為什麼不只靠 SW 自己的更新偵測(reg.waiting/updatefound):iOS Safari 對 SW 更新又懶又黏,reg.waiting 常常根本不亮,
  //   靠它判斷「有沒有新版」會漏。改抓 version.json(SW 不攔截、永遠走網路最新)跟「目前這份的 code」比對,到處都準。
  //   落後且「使用者要最新(自動更新開著)」才在首頁自動修;想留舊版(關自動更新)的完全不碰,只給一個手動更新入口。
  function checkFreshness() {
    if (!runningCode) return;                    // 還不知道自己是哪版 → 等 version 訊息再說
    fetch('version.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.code) return;               // 抓不到/格式怪 → 當作沒事
        latestCode = v.code;
        latestStale = (v.code !== runningCode);
        if (!latestStale) { localStorage.removeItem(FORCED_CODE); return; }   // 已是最新 → 清掉防呆旗標
        // 已經用頁面端強制刷新把「內容」換到這個最新 code 了(只是該支 SW 還沒換版、仍報舊 code)→ 別再修,免無限重整。
        //   此時內容其實已是最新,版號顯示成最新才對。
        if (localStorage.getItem(FORCED_CODE) === v.code) { if (v.build) buildId = v.build; renderBar(); return; }
        if (autoUpdateOn()) maybeAutoApplyLatest();   // 要最新卻落後 → 首頁自動修(下面會 reload,顯示不重要)
        else renderBar();                             // 想留舊版 → 不動 buildId(照顯示他實際在跑的版本),只給手動更新入口
      })
      .catch(function () { /* 離線/連不到 → 安靜放棄,絕不把「沒網路」誤判成「落後」 */ });
  }
  // 自動修:只在首頁(不打斷戰鬥)。不在首頁就這次先不動,等下次回首頁/重整(我們手機版「回首頁」本身就 reload)再修。
  function maybeAutoApplyLatest() {
    if (updateApplied || refreshing) return;
    if (!onHomePage()) { renderBar(); return; }
    applyLatest();
  }
  // 套用最新:有等待中的新版 SW → 走原本最便宜的 skip-waiting;沒有(iOS 常態)→ 頁面端強制刷新。
  function applyLatest() {
    if (updateApplied || refreshing) return;
    if (waitingSW) { applyUpdate(); return; }
    forceCodeRefresh();
  }
  // 頁面端強制刷新:不靠 SW 換版、也不需 SW 支援新訊息——直接用 Cache API 把最新 index.html 覆寫進程式桶,
  //   重整後(還是那支舊 SW 在控制)cache-first 就會回到剛覆寫的新版(新 index.html 內的 ?v= 新 JS 會自動連網抓)。
  //   離線安全鐵則:① 只有抓成功(res.ok)才覆寫,絕不先刪再抓 → 抓失敗時舊快取原封不動;② 失敗(含離線)不重整、不留旗標。
  function forceCodeRefresh() {
    if (!('caches' in window) || !latestCode) return;
    updateApplied = true;
    showUpdatingOverlay();
    var settled = false;
    var t = setTimeout(function () { if (!settled) { settled = true; abortRefresh(); } }, 12000);   // 沒回應就收掉遮罩、不盲目重整
    (async function () {
      var keys = await caches.keys();
      // 精準鎖定「控制中 SW 的程式桶」——桶名就等於它的 CODE_VERSION(= runningCode);
      //   換版瞬間若同時存在新舊兩個 code 桶,用前綴取 [0] 可能挑錯,故優先用 runningCode 命中。
      var codeBucket = (keys.indexOf(runningCode) !== -1) ? runningCode
                       : keys.filter(function (k) { return k.indexOf('code-') === 0; })[0];
      if (!codeBucket) return false;
      var cache = await caches.open(codeBucket);
      // 先找出 SW 當初存「導覽」用的那個 key(用 pathname 比對,通常是 '/' 或 '/index.html')。
      //   先找、晚點再抓,避免把下面 cache-buster 那筆也比中。
      var existing = await cache.keys();
      var navKey = null;
      for (var i = 0; i < existing.length; i++) {
        var u = new URL(existing[i].url);
        if (u.origin === location.origin && u.pathname === location.pathname) { navKey = existing[i]; break; }
      }
      if (!navKey) return false;   // 導覽根本沒被快取 → 不是 cache-first 卡舊版的情境,不需強刷
      // ★ 關鍵:同源 fetch 會被「正在控制的舊 SW」攔成 cache-first → 直接抓只會拿回舊的。
      //   加 cache-buster query 讓 SW 的 cache.match 落空 → 它只好走網路 → 才真的拿到最新 index.html。
      var bust = location.origin + location.pathname + '?__afkfresh=' + Date.now();
      var res = await fetch(bust, { cache: 'reload' });
      if (!res || !res.ok) return false;
      var html = await res.text();
      // 防呆:抓回來的要「長得像我們的遊戲」(含外掛 script 字樣)才覆寫。擋掉 captive portal / proxy 對任何網址
      //   都回 200 假頁的情況——否則會把登入頁當 index.html 快取起來、cache-first 下連離線都壞。
      if (html.indexOf('afk-pwa.js') === -1) return false;
      await cache.put(navKey, new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }));   // 覆寫進「真正的導覽 key」
      try { await cache.delete(bust); } catch (e) {}   // 清掉 SW 順手快取的 cache-buster 那筆 junk
      return true;
    })().then(function (ok) {
      if (settled) return;
      settled = true; clearTimeout(t);
      if (!ok) { abortRefresh(); return; }   // 失敗(含離線、導覽沒被快取、抓到非遊戲頁)→ 不重整、不留旗標,維持現狀
      // 旗標一定要「確認寫得進去」才 reload:萬一 localStorage 寫不進(如配額爆 QuotaExceededError),
      //   盲目 reload 會變成「旗標沒記成 → 下次又 force-refresh」的迴圈,且可能卡在更新遮罩。
      //   寫不成就放棄這次:不 reload、收掉遮罩(內容其實已覆寫進快取,下次載入自然就是新版),絕不迴圈也不卡死。
      var flagged = false;
      try { localStorage.setItem(FORCED_CODE, latestCode); flagged = (localStorage.getItem(FORCED_CODE) === latestCode); } catch (e) { flagged = false; }
      if (flagged && !refreshing) { refreshing = true; location.reload(); }
      else abortRefresh();
    }).catch(function () { if (!settled) { settled = true; clearTimeout(t); abortRefresh(); } });
  }
  function abortRefresh() {
    updateApplied = false;
    var o = document.getElementById('afk-pwa-updating');
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }
  // 載入時清掉「上一輪 force-refresh 殘留的 cache-buster junk」——治本、不靠 forceCodeRefresh 裡那行會跟 SW 搶輸的立即刪。
  //   在「新的一次載入」時掃,此刻舊 SW 背景存檔早就落定、沒有 race;把 code 桶內所有帶 __afkfresh= 的 key 清光。
  //   所以 junk 最多只會是「本次 session 剛產生的一筆」,下次載入就被掃掉,不會累積。離線也安全(純本機快取操作)。
  function sweepBusterJunk() {
    if (!('caches' in window)) return;
    caches.keys().then(function (keys) {
      keys.filter(function (k) { return k.indexOf('code-') === 0; }).forEach(function (k) {
        caches.open(k).then(function (cache) {
          cache.keys().then(function (reqs) {
            reqs.forEach(function (r) { if (r.url.indexOf('__afkfresh=') !== -1) cache.delete(r); });
          });
        });
      });
    }).catch(function () {});
  }

  function watchUpdates() {
    navigator.serviceWorker.ready.then(function (r) {
      reg = r;
      if (reg.waiting && navigator.serviceWorker.controller) onUpdateReady();
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) onUpdateReady();
        });
      });
      // 只在「開網頁/重整」時檢查一次更新,不做常駐輪詢——避免遊戲中途偵測到新版而打斷遊玩。
      //   (瀏覽器本來在每次導覽就會自動重抓 sw.js 比對,這裡再主動 update() 一次確保不吃 HTTP 快取。)
      reg.update().catch(function () {});
      sweepBusterJunk();   // 每次載入清掉上一輪 force-refresh 殘留的 cache-buster junk(避免累積)
      syncImages(false);   // 每次載入:對帳清舊圖(線上/已安裝都跑)+(已安裝未抓滿則)背景預抓
    }).catch(function () {});

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // 只有「我們主動套用更新(skip-waiting)」才重整;首次安裝 SW 透過 clients.claim 接管不重整(避免初訪白白 reload 一次)。
      if (refreshing || !updateApplied) return;
      refreshing = true;
      location.reload();
    });

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
      else if (d.type === 'version') {
        if (d.code) runningCode = d.code;
        if (d.build && d.build !== '0000-0000') { buildId = d.build; renderBar(); }
        checkFreshness();   // 拿到「目前這份的版本」後,跟 version.json 比對是否落後線上最新版
      }
    });

    askVersion();
    navigator.serviceWorker.addEventListener('controllerchange', askVersion);
  }

  // 向「控制這個分頁的 SW」問現在這版的 build 時間(僅供畫面辨識)
  function askVersion() {
    var ctrl = navigator.serviceWorker.controller;
    if (ctrl) ctrl.postMessage({ type: 'get-version' });
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

  function init() {
    injectHead();
    injectCSS();
    renderBar();
    bindInstallEvents();
    if (pwaCapable()) {
      watchUpdates();
    }
    console.log('[AFK-pwa] hooks OK — PWA 安裝/離線/更新已就緒。');
  }

  ready(init);
})();
