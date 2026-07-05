/* ============================================================================
 * afk-skin.js — 首頁「加掛版」品牌標記 + 外掛區外框（純視覺、不動遊戲邏輯）
 *
 * 兩件事(只動首頁 #creation-screen / #main-menu 的外觀,不碰存檔/遊戲函式):
 *   1. 右上角放一個會上下微微飄動的「加掛版」副標,底下墊半透明裝飾底。
 *   2. 把我們外掛加在首頁的那群入口(掉落查詢/小百科/原作者資訊/設定)用一個
 *      標「🔌 外掛」的半透明外框包起來,像遊戲內的外掛面板。
 *   3. 外掛入口按鈕套用原版首頁按鈕的皮(深藍漸層+金邊,抄 css/style.css 的
 *      #main-menu > button),讓外掛鈕與作者的按鈕風格一致。
 *
 * 作法:外掛元素是別支外掛(afk-dex/afk-wiki/afk-syncinfo/afk-storage)append 到 #main-menu 的,
 *   本檔載入順序排最後、並用 MutationObserver + 重試,等它們到齊再把它們搬進外框(idempotent)。
 * 掛接:在 </body> 前 <script src="afk-skin.js?v=..."></script>(排在其他 afk-* 之後)。
 * ========================================================================== */
(function () {
  'use strict';

  // 外框內元素的「顯示順序」(都是 #main-menu 的直接子元素;依此序排入外框)。
  //   原作者+正版最後同步(#afk-syncinfo)置頂,接掉落查詢/小百科,再巴哈/Line(#afk-syncinfo-links),最後設定。
  var FRAME_ORDER = ['#afk-syncinfo', '.m-dex-entry-row', '.m-wiki-entry-row', '#afk-syncinfo-links', '#afk-stg-wrap'];

  // ---- CSS ----------------------------------------------------------------
  var CSS = [
    /* 右上「加掛版」浮動副標 + 半透明裝飾底(圓角膠囊;之後可換雲形) */
    /* 浮在副標下方、置中、絕對定位(不佔版面、不把按鈕往下推);內層 afk-brand-inner 負責上下飄 */
    '#afk-brand-badge{position:absolute;left:50%;bottom:-34px;transform:translateX(-50%);z-index:6;pointer-events:none;}',
    '#afk-brand-badge .afk-brand-inner{position:relative;display:inline-block;padding:9px 26px 7px;animation:afkBrandFloat 3.2s ease-in-out infinite;}',
    '#afk-brand-badge .afk-brand-text{position:relative;z-index:1;font-size:15px;font-weight:800;letter-spacing:2px;color:#fde68a;text-shadow:0 1px 2px rgba(0,0,0,.75),0 0 6px rgba(0,0,0,.4);white-space:nowrap;}',
    /* ☁️ 雲朵底:body(膠囊)+ 兩團 puff(圓),全用「同色不透明」疊出輪廓→無接縫,再對整層 opacity 半透明 */
    '#afk-brand-badge .afk-cloud{position:absolute;left:0;right:0;top:30%;bottom:10%;opacity:.5;filter:drop-shadow(0 2px 5px rgba(0,0,0,.4));}',
    '#afk-brand-badge .afk-cloud,#afk-brand-badge .afk-cloud::before,#afk-brand-badge .afk-cloud::after{background:#e6ecf7;border-radius:999px;}',
    '#afk-brand-badge .afk-cloud::before{content:"";position:absolute;width:38%;height:155%;left:11%;top:-82%;border-radius:50%;}',
    '#afk-brand-badge .afk-cloud::after{content:"";position:absolute;width:50%;height:180%;right:7%;top:-100%;border-radius:50%;}',
    '@keyframes afkBrandFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    /* 手機(body.m-mobile;此版用 viewport=1180 縮放,純寬度 media query 失效,故靠 m-mobile class)：字略縮一點 */
    'body.m-mobile #afk-brand-badge .afk-brand-text{font-size:13px;letter-spacing:1px;}',

    /* 外掛區外框(半透明、像遊戲內面板) */
    '#afk-plugin-frame{position:relative;width:100%;max-width:20rem;margin:8px auto 0;padding:20px 14px 16px;',
      'border:1px solid rgba(148,163,184,.30);border-radius:16px;background:rgba(15,23,42,.22);',
      'box-shadow:inset 0 0 24px rgba(148,163,184,.05),0 4px 18px rgba(0,0,0,.20);',
      'display:flex;flex-direction:column;gap:14px;align-items:center;}',
    /* 框上的「外掛」標籤,坐在上緣(像 fieldset 標題) */
    '#afk-plugin-frame .afk-frame-label{position:absolute;top:-12px;left:50%;transform:translateX(-50%);',
      'padding:2px 14px;font-size:12.5px;font-weight:700;letter-spacing:2px;color:#cbd5e1;',
      'background:linear-gradient(180deg,rgba(40,52,72,.96),rgba(28,38,56,.96));',
      'border:1px solid rgba(148,163,184,.4);border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.4);white-space:nowrap;}',

    /* 外掛入口按鈕套原版皮:作者新登入頁的按鈕樣式只吃 #main-menu 的「直接子」button
       (css/style.css 的 #main-menu > button),我們的按鈕包在 row/外框裡吃不到 → 在這裡抄同一組
       宣告套上(深藍漸層+金邊)。⚠ 作者若改 css/style.css 該段風格,這裡要跟著換。 */
    '#main-menu .m-dex-entry-row > button,#main-menu .m-wiki-entry-row > button,#main-menu #afk-stg-gear{',
      'border-color:#b68a39;background:linear-gradient(180deg,rgba(35,55,83,.94),rgba(10,22,42,.96));',
      'color:#f8e7bb;text-shadow:0 1px 2px #000;box-shadow:inset 0 0 9px rgba(116,165,219,.35),0 2px 5px #000;}',
    '#main-menu .m-dex-entry-row > button:hover,#main-menu .m-wiki-entry-row > button:hover,#main-menu #afk-stg-gear:hover{filter:brightness(1.18);}',
    /* 主入口鈕的字級/內距也對齊原版(↗ 鈕與 ⚙ 鈕維持各自尺寸,只換皮) */
    '#main-menu .m-dex-entry-main,#main-menu .m-wiki-entry-main{',
      'padding:clamp(5px,.72vw,11px) 4px;font-size:clamp(9px,1.03vw,16px);line-height:1.1;}',
    /* 手機:afk-mobile 把原版按鈕釘在 16px/14px 12px(vw 字級在縮放 viewport 下失準),主入口鈕跟進 */
    'body.m-mobile #main-menu .m-dex-entry-main,body.m-mobile #main-menu .m-wiki-entry-main{',
      'font-size:16px;padding:14px 12px;}',

    /* 📢 公告跑馬燈:放在 #main-menu 第一個子層(首頁按鈕上方);紅底捲動,游標移上去暫停。
       (v3.0.40 作者登入頁改成藝術舞台後,標題不再是 #creation-screen 直接子層,改錨定 #main-menu。) */
    /* flex:0 0 auto + min-height:#main-menu 是 flex column 且自身 overflow:hidden
       →min-height:auto 退化成 0→會被 flex-shrink 壓扁、把文字上下裁掉(使用者回報「高度被裁」)。鎖死不縮、給足高度。 */
    '#afk-marquee{position:relative;flex:0 0 auto;width:100%;max-width:34rem;min-height:30px;margin:0 auto;overflow:hidden;border-radius:8px;border:1px solid rgba(230,110,110,.5);background:linear-gradient(180deg,rgba(96,16,16,.82),rgba(58,8,8,.82));padding:6px 0;box-shadow:inset 0 0 14px rgba(0,0,0,.35);}',
    /* 無縫捲動:track 放兩份相同文字,translateX 只移 -50%(=一份寬)→ 看起來連續、且第一份一開始就在可視區
       (動畫沒跑/還沒開始也看得到字,不會像「padding-left:100%」那樣有一段空白期 → 修「字沒出現」)。 */
    '#afk-marquee .afk-mq-track{display:flex;width:max-content;animation:afkMq 26s linear infinite;}',
    '#afk-marquee .afk-mq-seg{flex:0 0 auto;white-space:nowrap;padding:0 1.8rem;font-size:13px;font-weight:700;letter-spacing:1px;color:#fff2f2;text-shadow:0 1px 2px #000,0 0 4px rgba(0,0,0,.8);}',
    '#afk-marquee:hover .afk-mq-track{animation-play-state:paused;}',
    '@keyframes afkMq{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
    'body.m-mobile #afk-marquee{max-width:94%;}',
    'body.m-mobile #afk-marquee .afk-mq-seg{font-size:12px;letter-spacing:.5px;padding:0 1.3rem;}',
    ''
  ].join('');

  // 📢 公告跑馬燈文字(標點已修正:列項用頓號、界面→介面)
  var MARQUEE_TEXT = '如有介面、離線掛機、小百科、掉落查詢問題，請至巴哈301樓回報，請勿打擾原作者秋玥，謝謝大家配合！';

  function injectCss() {
    if (document.getElementById('afk-skin-css')) return;
    var s = document.createElement('style'); s.id = 'afk-skin-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- 右上副標 -----------------------------------------------------------
  function ensureBadge() {
    var cs = document.getElementById('creation-screen'); if (!cs) return;
    if (document.getElementById('afk-brand-badge')) return;
    // 錨定在「標題區(h1+副標 的容器)」的右下角=使用者示意圖框的位置(副標右側、標題下方、分隔線上方)。
    var h1 = cs.querySelector('h1');
    var header = h1 ? h1.parentElement : cs;
    header.style.position = 'relative';   // 讓 badge 以這塊為定位基準(桌機/手機一致)
    var b = document.createElement('div'); b.id = 'afk-brand-badge';
    b.innerHTML = '<span class="afk-brand-inner"><span class="afk-cloud"></span><span class="afk-brand-text">加掛版</span></span>';
    header.appendChild(b);
  }

  // ---- 公告跑馬燈(首頁按鈕上方) ------------------------------------------
  //   v3.0.40 作者登入頁改成藝術舞台(標題被包進 #login-art-stage>#login-title-layer),
  //   舊錨點「h1 父層是 #creation-screen 直接子層」不再成立、跑馬燈整個不插入(玩家回報消失)。
  //   改插在 #main-menu 第一個子層:視覺位置同樣在標題之下、按鈕之上,且不依賴作者標題結構。
  function ensureMarquee() {
    if (document.getElementById('afk-marquee')) return;
    var menu = document.getElementById('main-menu'); if (!menu) return;
    var mq = document.createElement('div'); mq.id = 'afk-marquee';
    var track = document.createElement('div'); track.className = 'afk-mq-track';
    for (var i = 0; i < 2; i++) {   // 兩份文字→無縫捲動;第一份開場即在可視區
      var seg = document.createElement('span'); seg.className = 'afk-mq-seg';
      if (i === 1) seg.setAttribute('aria-hidden', 'true');
      seg.textContent = MARQUEE_TEXT;
      track.appendChild(seg);
    }
    mq.appendChild(track);
    menu.insertBefore(mq, menu.firstChild);
  }

  // ---- 外掛外框 -----------------------------------------------------------
  var _busy = false;
  // 找某 selector 的元素(可能已在外框內、或還在 #main-menu 直接子層)
  function findEl(menu, sel) {
    return document.querySelector('#afk-plugin-frame > ' + sel) || menu.querySelector(':scope > ' + sel);
  }
  function ensureFrame() {
    var menu = document.getElementById('main-menu'); if (!menu) return;
    var els = [];
    FRAME_ORDER.forEach(function (s) { var el = findEl(menu, s); if (el) els.push(el); });
    if (!els.length) return;   // 外掛元素都還沒 append 進來
    var frame = document.getElementById('afk-plugin-frame');
    if (!frame) {
      frame = document.createElement('div'); frame.id = 'afk-plugin-frame';
      var label = document.createElement('div'); label.className = 'afk-frame-label'; label.textContent = '🔌 外掛';
      frame.appendChild(label);
      // 外框插在「#main-menu 內最早出現的那個外掛元素」位置(=作者按鈕/說明之後)
      var firstInMenu = null;
      FRAME_ORDER.forEach(function (s) { if (!firstInMenu) { var el = menu.querySelector(':scope > ' + s); if (el) firstInMenu = el; } });
      menu.insertBefore(frame, firstInMenu);
    }
    // 依 FRAME_ORDER 重新 append → 框內順序固定(把散在 #main-menu 的也一起收進來;idempotent)
    els.forEach(function (el) { frame.appendChild(el); });
  }

  function apply() {
    if (_busy) return; _busy = true;
    try { injectCss(); ensureBadge(); ensureMarquee(); ensureFrame(); } catch (e) { /* 視覺外掛,出錯不影響遊戲 */ }
    _busy = false;
  }

  // ---- 啟動:套用 + 觀察(其他外掛 append 是非同步的)----------------------
  function start() {
    apply();
    var menu = document.getElementById('main-menu');
    if (menu && window.MutationObserver) {
      var obs = new MutationObserver(function () { apply(); });
      obs.observe(menu, { childList: true });
    }
    // 後援:外掛可能延遲 append,前幾秒多試幾次
    var n = 0, iv = setInterval(function () { apply(); if (++n > 20) clearInterval(iv); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  console.log('[AFK-skin] hooks OK');
})();
