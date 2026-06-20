/*
 * afk-ui.js — 統一自製彈窗:全域接管 window.alert
 *
 * 為什麼:原生 alert 在 iOS Safari 會被「抑制連續彈窗」,且外觀與遊戲不統一。
 *   alert 是「純通知、無回傳值」,可安全地全域換成自製非阻塞彈窗,原作者所有 alert 自動套用。
 *   ※ confirm/prompt 會「同步回傳」使用者的選擇,自製彈窗本質非同步、無法 drop-in 取代,
 *     不在本檔處理(要換得逐個攔按鈕重寫流程,如登出/倉庫的做法)。
 *
 * 行為:接管後 alert(msg) → 置中深色卡片 + 「確定」鈕(沿用登出視窗樣式)。
 *   多則 alert 自動排隊依序顯示。關閉:點確定 / 點背景 / Enter / Esc。
 *   保留原生 alert 作為極早期(DOM 未就緒)的兜底。
 *
 * 優雅降級:document.body 不存在時退回原生 alert,不影響遊戲。
 * 純接管 window.alert + 自注 DOM/CSS,無「必須命中的原作者 DOM 掛點」,故不列入 smoke-hooks。
 */
(function () {
  var nativeAlert = (typeof window.alert === 'function') ? window.alert.bind(window) : null;
  var queue = [];
  var modal = null, msgEl = null, okBtn = null, showing = false;

  function injectCss() {
    if (document.getElementById('afk-ui-css')) return;
    var s = document.createElement('style');
    s.id = 'afk-ui-css';
    s.textContent = [
      '#afk-alert-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(2,6,23,0.7);align-items:center;justify-content:center;padding:24px;}',
      '#afk-alert-modal.open{display:flex;}',
      '#afk-alert-card{width:min(360px,92vw);background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.6);}',
      '#afk-alert-msg{color:#e2e8f0;font-size:15px;line-height:1.7;text-align:center;margin-bottom:18px;word-break:break-word;}',
      '#afk-alert-ok{display:block;width:100%;padding:11px;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit;border:1px solid #d97706;background:#b45309;color:#fff;}',
      '#afk-alert-ok:active{background:#92400e;}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function build() {
    injectCss();
    modal = document.createElement('div');
    modal.id = 'afk-alert-modal';
    modal.innerHTML =
      '<div id="afk-alert-card">' +
        '<div id="afk-alert-msg"></div>' +
        '<button id="afk-alert-ok" type="button">確定</button>' +
      '</div>';
    document.body.appendChild(modal);
    msgEl = modal.querySelector('#afk-alert-msg');
    okBtn = modal.querySelector('#afk-alert-ok');
    okBtn.addEventListener('click', dismiss);
    modal.addEventListener('click', function (e) { if (e.target === modal) dismiss(); });   // 點背景關閉
    document.addEventListener('keydown', function (e) {                                     // Enter / Esc 關閉
      if (!showing) return;
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); dismiss(); }
    });
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showNext() {
    if (showing || !queue.length) return;
    if (!modal) build();
    showing = true;
    var msg = queue.shift();
    msgEl.innerHTML = esc(msg).replace(/\n/g, '<br>');   // 原生 alert 的 \n 換行 → <br>;內容先逸出避免 HTML 注入
    modal.classList.add('open');
    try { okBtn.focus(); } catch (e) {}
  }

  function dismiss() {
    if (!showing) return;
    showing = false;
    modal.classList.remove('open');
    if (queue.length) setTimeout(showNext, 0);   // 還有排隊的下一則接著顯示
  }

  window.alert = function (msg) {
    if (!document.body) { if (nativeAlert) nativeAlert(msg); return; }   // 極早期(body 未就緒)退回原生
    queue.push(msg == null ? '' : msg);
    showNext();
  };

  console.log('[AFK-ui] hooks OK(window.alert 已接管為自製彈窗)');
})();
