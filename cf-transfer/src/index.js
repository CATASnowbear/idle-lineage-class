// ============================================================================
// transfer — Cloudflare Worker + 單一 Durable Object：跨裝置存檔轉移。
//
// 流程：A 機按「匯出」→ POST /create 存進 DO、回 6 位數轉移碼(預設 10 分鐘到期)。
//       B 機輸碼按「匯入」→ POST /claim 取回存檔並「立即刪除」該碼(用完即刪)。
//       匯出端可選擇性 GET /status?code= 輪詢「對方是否已領取」。
//
// 為什麼用 Durable Object 而不是 KV：
//   - 強一致：寫完立刻全世界讀得到(KV 最終一致,A 寫完 B 幾秒內可能讀不到 → 「查無此碼」誤判)。
//   - 寫入額度十萬級(KV 免費僅 1000/天,限流計數會先爆)。
//   - claim 的「取回+刪除」在交易內原子完成。
//   過期不用 alarm：lazy 判 expireAt + 每次 create 順手 DELETE 過期列(piggyback),儲存有上界。
//
// 防濫用：CORS Origin 白名單(擋其他網站來蹭;放行 null=直接開 index.html)
//         + per-IP 每分鐘限流(in-memory,單一 DO 串行、零儲存成本)
//         + 6 位數 + 短 TTL + 用完即刪。
//   ⚠ Origin 只能擋「瀏覽器上的別站」,擋不了 curl(可偽造 Origin);真正防線是這整套疊加。
// ============================================================================

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { ...JSON_HEADERS, ...extra } });
}

// 依請求 Origin 算 CORS 標頭;不在白名單回 null(呼叫端據此回 403)。
function corsFor(origin, env) {
  const allow = (env.ALLOW_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  // 沒帶 Origin(同源/部分非瀏覽器)一律放行,讓 file:// 與直接打 API 的健康檢查可用。
  if (origin === null) return { 'access-control-allow-origin': '*' };
  if (allow.includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      'vary': 'Origin',
      'access-control-allow-methods': 'POST, GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      'access-control-max-age': '86400',
    };
  }
  return null;   // 不允許
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');   // 沒有時為 null
    const cors = corsFor(origin, env);

    if (req.method === 'OPTIONS') {
      // 預檢:允許就回 CORS 標頭,不允許回 403。
      return cors ? new Response(null, { status: 204, headers: cors })
                  : new Response(null, { status: 403 });
    }
    if (!cors) return json({ error: 'forbidden_origin' }, 403);

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';

    // 全部請求轉給單一 DO('global');把真實 IP 帶進去做限流(DO 看不到 CF-Connecting-IP)。
    const id = env.TRANSFER.idFromName('global');
    const stub = env.TRANSFER.get(id);
    const url = new URL(req.url);
    const fwdHeaders = new Headers({ 'X-Client-IP': ip });
    if (req.headers.get('Content-Type')) fwdHeaders.set('Content-Type', req.headers.get('Content-Type'));
    const body = req.method === 'POST' ? await req.text() : undefined;
    const resp = await stub.fetch('https://do' + url.pathname + url.search, {
      method: req.method, headers: fwdHeaders, body,
    });

    // 把 DO 回應原樣帶出,補上 CORS 標頭。
    const out = new Response(resp.body, resp);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};

export class Transfer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(
      'CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, save TEXT NOT NULL, expireAt INTEGER NOT NULL)'
    );
    this.rl = new Map();   // ip -> { win: 分鐘桶, count }(in-memory,DO 在記憶體期間累計)
  }

  // per-IP 固定一分鐘視窗限流。低流量時 DO 可能休眠重置 → 但低流量本就無濫用,濫用=高流量=DO 常駐=計數有效。
  allow(ip, limit) {
    const win = Math.floor(Date.now() / 60000);
    const e = this.rl.get(ip);
    if (!e || e.win !== win) {
      if (this.rl.size > 5000) for (const [k, v] of this.rl) if (v.win !== win) this.rl.delete(k);
      this.rl.set(ip, { win, count: 1 });
      return true;
    }
    if (e.count >= limit) return false;
    e.count++;
    return true;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const ip = req.headers.get('X-Client-IP') || 'unknown';
    const limit = Number(this.env.RATE_PER_MIN || 30);
    if (!this.allow(ip, limit)) return json({ error: 'rate_limited' }, 429);

    if (req.method === 'POST' && url.pathname === '/create') return this.create(req);
    if (req.method === 'POST' && url.pathname === '/claim') return this.claim(req);
    if (req.method === 'GET' && url.pathname === '/status') return this.status(url);
    return json({ error: 'not_found' }, 404);
  }

  async create(req) {
    let data;
    try { data = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
    const save = data && data.save;
    if (typeof save !== 'string' || !save) return json({ error: 'empty_save' }, 400);
    const max = Number(this.env.MAX_SAVE_BYTES || 2000000);
    if (save.length > max) return json({ error: 'too_large' }, 413);

    const now = Date.now();
    this.sql.exec('DELETE FROM codes WHERE expireAt < ?', now);   // piggyback 清過期,儲存有上界

    let code = '';
    for (let i = 0; i < 12; i++) {
      const c = String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
      const live = this.sql.exec('SELECT 1 FROM codes WHERE code = ? AND expireAt > ?', c, now).toArray();
      if (!live.length) { code = c; break; }   // 未過期才算佔用;撞到過期的可直接覆蓋
    }
    if (!code) return json({ error: 'busy' }, 503);   // 幾乎不可能(同時 live 碼極少)

    const ttl = Number(this.env.TTL_MS || 600000);
    const expireAt = now + ttl;
    this.sql.exec('INSERT OR REPLACE INTO codes (code, save, expireAt) VALUES (?, ?, ?)', code, save, expireAt);
    return json({ code, expireAt });
  }

  async claim(req) {
    let data;
    try { data = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
    const code = String((data && data.code) || '').trim();
    if (!/^\d{6}$/.test(code)) return json({ error: 'bad_code' }, 400);

    const now = Date.now();
    const rows = this.sql.exec('SELECT save, expireAt FROM codes WHERE code = ?', code).toArray();
    const row = rows[0];
    if (!row || row.expireAt < now) {
      if (row) this.sql.exec('DELETE FROM codes WHERE code = ?', code);   // 順手清掉過期的那筆
      return json({ error: 'not_found' }, 404);
    }
    this.sql.exec('DELETE FROM codes WHERE code = ?', code);   // 用完即刪
    return json({ save: row.save });
  }

  status(url) {
    const code = String(url.searchParams.get('code') || '').trim();
    if (!/^\d{6}$/.test(code)) return json({ error: 'bad_code' }, 400);
    const now = Date.now();
    const rows = this.sql.exec('SELECT expireAt FROM codes WHERE code = ?', code).toArray();
    const row = rows[0];
    if (!row || row.expireAt < now) return json({ exists: false });   // 消失=被領取或已過期(由前端用 expireAt 判別)
    return json({ exists: true, expireAt: row.expireAt });
  }
}
