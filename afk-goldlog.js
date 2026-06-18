/* ============================================================================
 * afk-goldlog.js — 系統與物品日誌:可開關「隱藏金幣訊息」
 *
 * 為什麼:掛機時每隻怪都會在系統日誌噴一行「獲得 N 金幣。」,洗到看不到掉落/升級
 *   等真正想看的訊息。本外掛在「系統與物品日誌」標題列加一個「隱藏金幣」勾選,
 *   勾起來就把這種每殺一隻的金幣訊息濾掉(其他含金幣的訊息——招募花費、自動購買、
 *   掛機結算總額——都照常顯示)。
 *
 * 怎麼做:包住全域 logSys,勾選開啟時遇到「獲得 N 金幣。」就不寫進日誌。
 *   只認「整句就是『獲得 N 金幣。』」的擊殺金幣行(去標籤後比對),不會誤殺其他訊息。
 *   設定存 localStorage,桌機/手機共用同一個勾選(手機版會把整個日誌面板搬進浮動面板,
 *   標題列的勾選跟著走,不必另做一份)。
 *
 * 優雅降級:沒有 logSys 就 console.warn 後安靜停用;找不到日誌標題列則只包 logSys、不放勾選。
 *
 * 掛接:在 index.html 的 </body> 前加一行 <script src="afk-goldlog.js"></script>
 *   (排在 afk-toast.js 之後,讓「隱藏」是最外層,被濾掉的金幣訊息連 toast 也不會收。)
 * ========================================================================== */
(function () {
  'use strict';

  var LS_KEY = 'afkHideGoldLog';
  // 擊殺金幣行去標籤後的樣子:「獲得 123 金幣。」(數字可能帶千分位逗號;句點可有可無)
  var GOLD_RE = /^獲得\s[\d,]+\s金幣。?$/;
  var hide = false;

  function loadPref() { try { return localStorage.getItem(LS_KEY) === '1'; } catch (e) { return false; } }
  function savePref(v) { try { localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch (e) {} }

  function isGoldGain(msg) {
    if (typeof msg !== 'string' || msg.indexOf('金幣') < 0) return false;
    return GOLD_RE.test(msg.replace(/<[^>]*>/g, '').trim());
  }

  // 勾選當下,把日誌裡現有的金幣行也一併清掉,立即見效
  function purgeExistingGoldLines() {
    var log = document.getElementById('sys-log');
    if (!log) return;
    Array.prototype.slice.call(log.querySelectorAll('.log-entry')).forEach(function (e) {
      var t = (e.textContent || '').trim();
      if (GOLD_RE.test(t)) e.parentNode && e.parentNode.removeChild(e);
    });
  }

  function injectCSS() {
    if (document.getElementById('afk-goldlog-style')) return;
    var s = document.createElement('style');
    s.id = 'afk-goldlog-style';
    s.textContent =
      '.afk-gold-toggle{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;white-space:nowrap;' +
      'font-size:13px;font-weight:normal;color:#94a3b8;cursor:pointer;}' +
      '.afk-gold-toggle input{width:14px;height:14px;margin:0;cursor:pointer;}';
    document.head.appendChild(s);
  }

  function injectToggle() {
    if (document.getElementById('afk-hidegold-cb')) return true;
    var panel = document.getElementById('syslog-panel');
    var hdr = panel && panel.querySelector('.panel-header');
    if (!hdr) return false;
    injectCSS();
    var lab = document.createElement('label');
    lab.className = 'afk-gold-toggle';
    lab.title = '勾選後,系統日誌不再顯示每次擊殺的「獲得 N 金幣」訊息(其他金幣訊息照常顯示)';
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'afk-hidegold-cb'; cb.checked = hide;
    var txt = document.createElement('span'); txt.textContent = '隱藏金幣';
    lab.appendChild(cb); lab.appendChild(txt);
    cb.addEventListener('change', function () {
      hide = cb.checked;
      savePref(hide);
      if (hide) purgeExistingGoldLines();
    });
    // 放在標題文字後、潘朵拉資訊(#syslog-pandora)之前;手機的 ⇆/✕ 鈕會接在最後,不衝突
    var pandora = document.getElementById('syslog-pandora');
    if (pandora && pandora.parentNode === hdr) hdr.insertBefore(lab, pandora);
    else hdr.appendChild(lab);
    return true;
  }

  function init() {
    if (typeof window.logSys !== 'function') {
      console.warn('[AFK-goldlog] 找不到 logSys,隱藏金幣功能停用。');
      return;
    }
    hide = loadPref();
    var orig = window.logSys;
    window.logSys = function (msg) {
      if (hide && isGoldGain(msg)) return;
      return orig.apply(this, arguments);
    };
    injectToggle();
    console.log('[AFK-goldlog] hooks OK — 系統日誌「隱藏金幣」開關已啟用。');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
