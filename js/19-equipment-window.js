// ===== 可拖曳雙頁角色裝備視窗 =====
(function () {
    const PAGE_SLOTS = [
        [
            { k: 'helm',    x: 76.2, y: 17.6, w: 11.6, h: 9.1 },
            { k: 'amulet',  x: 63.6, y: 23.5, w: 11.4, h: 9.2 },
            { k: 'tshirt',  x: 51.8, y: 35.8, w: 11.5, h: 9.4 },
            { k: 'armor',   x: 64.1, y: 35.4, w: 11.5, h: 9.4 },
            { k: 'cloak',   x: 76.4, y: 35.4, w: 11.5, h: 9.4 },
            { k: 'ring1',   x: 39.7, y: 46.4, w: 10.6, h: 8.7 },
            { k: 'wpn',     x: 39.9, y: 56.8, w: 11.4, h: 9.7 },
            { k: 'gloves',  x: 52.9, y: 53.4, w: 11.1, h: 9.1 },
            { k: 'belt',    x: 69.4, y: 45.6, w: 11.6, h: 9.1 },
            { k: 'shield',  x: 83.9, y: 49.0, w: 11.7, h: 9.7 },
            { k: 'ring2',   x: 83.0, y: 59.4, w: 11.5, h: 9.5 },
            { k: 'boots',   x: 82.3, y: 84.9, w: 11.8, h: 10.0 }
        ],
        [
            { k: 'ear1',    x: 63.6, y: 23.5, w: 11.4, h: 9.2 },
            { k: 'ear2',    x: 76.2, y: 17.6, w: 11.6, h: 9.1 },
            { k: 'ring3',   x: 39.7, y: 46.4, w: 10.6, h: 8.7 },
            { k: 'offwpn',  x: 51.8, y: 35.8, w: 11.5, h: 9.4 },
            { k: 'pet',     x: 52.9, y: 53.4, w: 11.1, h: 9.1 },
            { k: 'arrow',   x: 83.9, y: 49.0, w: 11.7, h: 9.7 },
            { k: 'ring4',   x: 83.0, y: 59.4, w: 11.5, h: 9.5 },
            { k: 'doll',    x: 82.3, y: 84.9, w: 11.8, h: 10.0 }
        ]
    ];

    let page = 0;
    let drag = null;
    let sideMode = null;
    let clickTimer = null;

    function el(id) { return document.getElementById(id); }
    function signed(n) { n = Number(n) || 0; return n > 0 ? '+' + n : String(n); }

    function renderStats() {
        if (typeof player === 'undefined' || !player || !player.d) return;
        const d = player.d;
        const expReq = getExpReq(player.lv);
        const expPct = player.lv >= 100 ? 100 : (expReq > 0 && isFinite(expReq) ? (player.exp / expReq) * 100 : 0);
        const values = [
            ['level', player.lv], ['exp', expPct.toFixed(2) + '%'],
            ['hp', `${Math.floor(player.hp)}/${Math.floor(player.mhp)}`],
            ['mp', `${Math.floor(player.mp)}/${Math.floor(player.mmp)}`],
            ['ac', player.d.ac], ['elixir', player.panaceaUsed || 0], ['pk', player.pk || 0],
            ['str', d.str], ['dex', d.dex], ['con', d.con], ['int', d.int], ['wis', d.wis], ['cha', d.cha],
            ['earth', Math.abs(Number(d.resEarth) || 0)], ['water', Math.abs(Number(d.resWater) || 0)],
            ['fire', Math.abs(Number(d.resFire) || 0)], ['wind', Math.abs(Number(d.resWind) || 0)],
            ['er', Math.abs(Number(d.er) || 0)]
        ];
        el('equipment-window-stats').innerHTML = values.map(([key, value]) =>
            `<span class="equipment-stat equipment-stat-${key}">${value}</span>`
        ).join('');
    }

    function renderMorphSnapshot() {
        const box = el('equipment-morph-snapshot');
        if (!box || typeof player === 'undefined' || !player) return;
        const form = player._setPoly || ((player.buffs && player.buffs.poly > 0 && player.poly) ? player.poly : null);
        if (!form) { box.classList.add('hidden'); return; }
        box.classList.remove('hidden');
        el('equipment-morph-name').textContent = form.n || '變身';
        const aliases = {
            '真‧死亡騎士':'死亡騎士', '真死亡騎士':'死亡騎士',
            '真‧克特':'克特', '真克特':'克特',
            '高等黑暗精靈':'黑暗精靈', '真‧黑暗妖精':'黑暗精靈', '真黑暗妖精':'黑暗精靈',
            '真‧黑暗精靈':'黑暗精靈', '真黑暗精靈':'黑暗精靈',
            '惡魔':'小惡魔'
        };
        const imageName = (aliases[form.n] || form.n || '').replace(/[()（）·‧\s]/g, '');
        const image = el('equipment-morph-image');
        image.classList.remove('no-image');
        image.src = 'assets/morph/' + encodeURIComponent(imageName) + '.jpg';
        image.alt = form.n || '變身快照';
        image.onerror = function () { this.classList.add('no-image'); };
        const labels = [];
        if (form.md) labels.push('近傷+' + form.md); if (form.mh) labels.push('近命中+' + form.mh);
        if (form.rd) labels.push('遠傷+' + form.rd); if (form.rh) labels.push('遠命中+' + form.rh);
        if (form.ed) labels.push('額外傷害+' + form.ed); if (form.eh) labels.push('額外命中+' + form.eh);
        if (form.mgd) labels.push('魔傷+' + form.mgd); if (form.sp) labels.push('魔法點數+' + form.sp);
        if (form.mpr) labels.push('回魔+' + form.mpr); if (form.ac) labels.push('AC' + form.ac);
        if (form.er) labels.push('ER+' + form.er); if (form.mr) labels.push('MR+' + form.mr);
        if (form.spd) labels.push('攻速+' + form.spd + '%');
        el('equipment-morph-bonus').textContent = labels.join('、');
    }

    function renderSlots() {
        if (typeof player === 'undefined' || !player || !player.eq) return;
        const host = el('equipment-window-slots');
        host.innerHTML = '';
        PAGE_SLOTS[page].forEach(pos => {
            const item = player.eq[pos.k];
            const data = item && typeof DB !== 'undefined' && DB.items[item.id];
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'equipment-visual-slot' + (item ? ' is-filled' : ' is-empty');
            slot.style.cssText = `left:${pos.x}%;top:${pos.y}%;width:${pos.w}%;height:${pos.h}%;`;
            if (item && data) {
                const img = document.createElement('img');
                img.src = getIconUrl(data);
                img.alt = data.n || pos.k;
                img.draggable = false;
                img.onerror = function () { this.style.display = 'none'; };
                slot.appendChild(img);
                if (item.en) {
                    const badge = document.createElement('span');
                    badge.className = 'equipment-slot-enhance';
                    badge.textContent = '+' + item.en;
                    slot.appendChild(badge);
                }
                const fullName = document.createElement('span');
                fullName.innerHTML = getItemFullName(item);
                slot.title = fullName.textContent || fullName.innerText || data.n || item.id;
                slot.onclick = function () {
                    clearTimeout(clickTimer);
                    clickTimer = setTimeout(function () {
                        openEquipmentSidePanel((data.type === 'wpn' || data.isArrow) ? 'weapons' : 'armors');
                    }, 230);
                };
                slot.ondblclick = function (event) {
                    clearTimeout(clickTimer);
                    event.preventDefault();
                    event.stopPropagation();
                    unequipItem(pos.k);
                };
            } else {
                slot.title = '尚未裝備';
                slot.onclick = function () {
                    openEquipmentSidePanel((pos.k === 'wpn' || pos.k === 'offwpn' || pos.k === 'arrow') ? 'weapons' : 'armors');
                };
            }
            host.appendChild(slot);
        });
        el('equipment-window-prev').disabled = page === 0;
        el('equipment-window-next').disabled = page === PAGE_SLOTS.length - 1;
    }

    function plainItemName(item) {
        const d = DB.items[item.id];
        const tmp = document.createElement('span');
        tmp.innerHTML = getItemFullName(item);
        return tmp.textContent || tmp.innerText || (d && d.n) || item.id;
    }

    function renderSidePanel() {
        const panel = el('equipment-side-panel');
        const list = el('equipment-side-list');
        if (!panel || panel.classList.contains('hidden') || !sideMode || typeof player === 'undefined') return;
        el('equipment-side-title').textContent = sideMode === 'weapons' ? '武器' : '防具與飾品';
        list.innerHTML = '';
        const items = player.inv.filter(function (item) {
            const d = DB.items[item.id];
            if (!d) return false;
            return sideMode === 'weapons' ? d.type === 'wpn' : (d.type === 'arm' || d.type === 'acc');
        });
        if (!items.length) {
            list.innerHTML = '<div class="equipment-side-empty">背包中沒有可顯示的裝備</div>';
            return;
        }
        items.forEach(function (item) {
            const d = DB.items[item.id];
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'equipment-side-item' + (checkCanEquip(item) ? '' : ' cannot-equip');
            row.title = plainItemName(item);
            const icon = document.createElement('img');
            icon.src = getIconUrl(d);
            icon.alt = '';
            icon.draggable = false;
            icon.onerror = function () { this.style.visibility = 'hidden'; };
            const name = document.createElement('span');
            name.className = 'equipment-side-name ' + getItemColor(item);
            name.innerHTML = getItemFullName(item);
            const count = document.createElement('small');
            count.textContent = (item.cnt || 1) > 1 ? '×' + (item.cnt || 1).toLocaleString() : '';
            row.append(icon, name, count);
            row.onclick = function () {
                clearTimeout(clickTimer);
                clickTimer = setTimeout(function () { openModal(item, false); }, 230);
            };
            row.ondblclick = function (event) {
                clearTimeout(clickTimer);
                event.preventDefault();
                event.stopPropagation();
                equipItem(item);
            };
            list.appendChild(row);
        });
    }

    window.openEquipmentSidePanel = function (mode) {
        sideMode = mode === 'armors' ? 'armors' : 'weapons';
        const panel = el('equipment-side-panel');
        if (!panel) return;
        panel.classList.remove('hidden');
        const frame = el('equipment-window-frame');
        if (frame) frame.classList.add('side-open');
        renderSidePanel();
        requestAnimationFrame(fitEquipmentWindowToViewport);
    };

    window.closeEquipmentSidePanel = function () {
        const panel = el('equipment-side-panel');
        if (panel) panel.classList.add('hidden');
        const frame = el('equipment-window-frame');
        if (frame) frame.classList.remove('side-open');
        sideMode = null;
        requestAnimationFrame(fitEquipmentWindowToViewport);
    };

    function fitEquipmentWindowToViewport() {
        const frame = el('equipment-window-frame');
        const win = el('equipment-window');
        if (!frame || !win || win.classList.contains('hidden')) return;
        const rect = frame.getBoundingClientRect();
        const side = frame.classList.contains('side-open') ? el('equipment-side-panel') : null;
        const sideWidth = side && !side.classList.contains('hidden') ? side.getBoundingClientRect().width + 8 : 0;
        const totalWidth = rect.width + sideWidth;
        let left = rect.left, top = rect.top;
        left = Math.max(4, Math.min(left, innerWidth - totalWidth - 4));
        top = Math.max(4, Math.min(top, innerHeight - rect.height - 4));
        frame.style.left = left + 'px';
        frame.style.top = top + 'px';
        frame.style.transform = 'none';
    }

    window.refreshEquipmentWindow = function () {
        const win = el('equipment-window');
        if (!win || win.classList.contains('hidden')) return;
        renderStats();
        renderMorphSnapshot();
        renderSlots();
        renderSidePanel();
    };

    window.openEquipmentWindow = function () {
        const win = el('equipment-window');
        if (!win) return;
        win.classList.remove('hidden');
        win.setAttribute('aria-hidden', 'false');
        refreshEquipmentWindow();
        requestAnimationFrame(fitEquipmentWindowToViewport);
    };

    window.toggleEquipmentWindow = function () {
        const win = el('equipment-window');
        if (!win) return;
        if (win.classList.contains('hidden')) openEquipmentWindow();
        else closeEquipmentWindow();
    };

    window.closeEquipmentWindow = function () {
        const win = el('equipment-window');
        if (!win) return;
        win.classList.add('hidden');
        win.setAttribute('aria-hidden', 'true');
    };

    function init() {
        const frame = el('equipment-window-frame');
        const handle = el('equipment-window-drag');
        if (!frame || !handle) return;
        el('equipment-window-close').onclick = closeEquipmentWindow;
        el('equipment-side-close').onclick = closeEquipmentSidePanel;
        el('equipment-window-next').onclick = function () { if (page < 1) { page++; refreshEquipmentWindow(); } };
        el('equipment-window-prev').onclick = function () { if (page > 0) { page--; refreshEquipmentWindow(); } };

        handle.addEventListener('pointerdown', function (event) {
            const rect = frame.getBoundingClientRect();
            drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
            handle.setPointerCapture(event.pointerId);
            frame.classList.add('is-dragging');
            event.preventDefault();
        });
        handle.addEventListener('pointermove', function (event) {
            if (!drag || drag.id !== event.pointerId) return;
            const side = frame.classList.contains('side-open') ? el('equipment-side-panel') : null;
            const sideWidth = side && !side.classList.contains('hidden') ? side.getBoundingClientRect().width + 8 : 0;
            const maxX = Math.max(0, innerWidth - frame.offsetWidth - sideWidth);
            const maxY = Math.max(0, innerHeight - frame.offsetHeight);
            frame.style.left = Math.max(0, Math.min(maxX, event.clientX - drag.dx)) + 'px';
            frame.style.top = Math.max(0, Math.min(maxY, event.clientY - drag.dy)) + 'px';
            frame.style.transform = 'none';
        });
        function stopDrag(event) {
            if (!drag || drag.id !== event.pointerId) return;
            drag = null;
            frame.classList.remove('is-dragging');
        }
        handle.addEventListener('pointerup', stopDrag);
        handle.addEventListener('pointercancel', stopDrag);
        window.addEventListener('resize', fitEquipmentWindowToViewport);
        // 純顯示更新：讓卷軸到期、重新變身或套裝切換能即時反映，不改動任何變身判定。
        window.setInterval(function () {
            const win = el('equipment-window');
            if (win && !win.classList.contains('hidden')) renderMorphSnapshot();
        }, 500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
