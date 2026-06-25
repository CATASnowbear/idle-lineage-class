/*
 * afk-slotinfo.js — 選角/載入畫面的「掛機資訊」提供者 + 桌機渲染
 *
 * 為什麼獨立成一支:存檔鈕要顯示的「📍 目前掛在哪張地圖」「⏱ 已掛機多久」這組資訊,
 *   讀取邏輯(afk_map_<slot> / afk_ts_<slot> / 地圖中文名 / 掛機時間格式化)跟「手機或桌機」無關,
 *   桌機與手機兩種版面都要用。把它放在 afk-mobile.js 裡是錯的歸屬,故抽成這支共用資料源:
 *     - window.AFK_SLOTINFO.read(slot) → { mapName, idleText }(純資料、無 DOM)
 *     - afk-mobile.js 的手機重排呼叫 read() 取資料,自己排兩行版面
 *     - 本檔負責「桌機」版面:在原作者存檔鈕下「附加」這兩行,不改動原本單行 label / 大頭貼
 *
 * 資料來源:afk-offline.js 寫的即時地圖記錄 afk_map_<slot>(較準)、最後活躍心跳 afk_ts_<slot>;
 *   讀不到 afk_map_ 就退回存檔 blob 的 ms.current。地圖中文名與離線上限呼叫 afk-offline 暴露的 window.__afk。
 *
 * 優雅降級:openSlotSelect / __afk 不存在就安靜停用,不弄壞畫面。桌機附加只在「非 m-mobile」時做,
 *   手機由 afk-mobile 自行渲染(兩者用 body.m-mobile 互斥,即使都 wrap 了 openSlotSelect 也不衝突)。
 */
(function () {
  // 把離線毫秒數格式化成「X 天 Y 小時 / X 小時 Y 分 / X 分鐘 / 剛剛」
  function fmtIdle(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    if (s < 60) return '剛剛';
    var m = Math.floor(s / 60);
    if (m < 60) return m + ' 分鐘';
    var h = Math.floor(m / 60), rm = m % 60;
    if (h < 24) return rm ? (h + ' 小時 ' + rm + ' 分') : (h + ' 小時');
    var d = Math.floor(h / 24), rh = h % 24;
    return rh ? (d + ' 天 ' + rh + ' 小時') : (d + ' 天');
  }

  // 唯一資料源:給一個存檔位編號,回「掛機地圖中文名」與「已掛機多久」文字(沒有就回空字串)
  function read(slot) {
    var mapId = '';
    try { mapId = localStorage.getItem('afk_map_' + slot) || ''; } catch (e) {}
    if (!mapId) {
      try { var rs = JSON.parse(localStorage.getItem('lineage_idle_save_' + slot)); mapId = (rs && rs.ms && rs.ms.current) || ''; } catch (e) {}
    }
    var mapName = '';
    if (mapId) mapName = (window.__afk && typeof window.__afk.mapName === 'function') ? window.__afk.mapName(mapId) : mapId;

    var ts = 0; try { ts = +localStorage.getItem('afk_ts_' + slot) || 0; } catch (e) {}
    var idleText = '';
    if (ts > 0) {
      var idleMs = Date.now() - ts;
      var capH = (window.__afk && window.__afk.capHours) || 24;   // 離線收益上限(小時),讀 afk-offline
      idleText = '⏱ 已掛機 ' + fmtIdle(idleMs);
      if (idleMs >= capH * 3600000) idleText += '（收益上限 ' + capH + ' 小時）';   // 顯示真實時間,超過上限時提醒收益封頂
    }
    return { mapName: mapName, idleText: idleText };
  }

  window.AFK_SLOTINFO = { version: '1.0.0', read: read };

  // --- 桌機版面:在原作者的存檔鈕下「附加」📍/⏱ 兩行 -----------------------------
  //   桌機鈕本體是 flex 橫排(大頭貼 + 單行 label),改成 flex-wrap 後把一個滿寬的資訊區塊擠到次行。
  //   只附加、不清空 → 原作者的單行 label、大頭貼、經典模式樣式都原封不動。手機(m-mobile)不在此處理。
  function appendDesktopInfo() {
    if (document.body.classList.contains('m-mobile')) return;   // 手機由 afk-mobile 自行重排
    var list = document.getElementById('slot-list');
    if (!list) return;
    var rows = list.children;
    for (var i = 0; i < rows.length; i++) {
      var btn = rows[i].children[0];
      if (!btn || btn.querySelector('.afk-slot-extra')) continue;   // openSlotSelect 每次重建清單,理論上不會殘留;仍防呆去重
      var info = read(i + 1);
      if (!info.mapName && !info.idleText) continue;
      btn.style.flexWrap = 'wrap';
      var box = document.createElement('span');
      box.className = 'afk-slot-extra';
      box.style.cssText = 'flex-basis:100%;width:100%;display:flex;flex-direction:column;gap:1px;margin-top:3px;font-size:.8rem;font-weight:400;color:#94a3b8;line-height:1.3;';
      if (info.mapName) { var a = document.createElement('span'); a.textContent = '📍 ' + info.mapName; box.appendChild(a); }
      if (info.idleText) { var b = document.createElement('span'); b.textContent = info.idleText; box.appendChild(b); }
      btn.appendChild(box);
    }
  }

  function wrapSlotSelect() {
    if (typeof window.openSlotSelect !== 'function' || window.openSlotSelect.__afkSlotInfo) return false;
    var orig = window.openSlotSelect;
    var wrapped = function () { orig.apply(this, arguments); try { appendDesktopInfo(); } catch (e) {} };
    wrapped.__afkSlotInfo = true;
    window.openSlotSelect = wrapped;
    return true;
  }

  if (wrapSlotSelect()) {
    console.log('[AFK-slotinfo] hooks OK — 選角畫面掛機地點/已掛機時間(桌機附加、手機共用資料源 AFK_SLOTINFO.read)。');
  } else {
    console.warn('[AFK-slotinfo] 找不到 openSlotSelect,選角畫面掛機資訊停用。');
  }
})();
