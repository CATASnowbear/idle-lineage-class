/* ============================================================================
 * audit-exchange-coverage.mjs — 「兌換/任務發裝備結構」→ 掉落查詢來源 覆蓋稽核
 *
 * 為什麼有這支:原作者把遊戲拆成多檔後,任務/兌換 NPC 散在 js/*.js,各自一套不同形狀的
 *   結構(SHIMIZHE_REWARDS / YURIA_REWARDS / WARRIOR_EX / DARK_TRIAL_CFG …)。掉落查詢
 *   (afk-dex.js 的 buildTrialBy)要「逐一把這些結構接進來」才會把兌換來源算進物品卡;
 *   作者新增一個兌換 NPC、我們忘了接 → 那批裝備就查不到來源(踩過:藍海賊/希米哲漏接)。
 *   這支把 js 裡所有 *_(REWARDS|EX|CFG|REQS) 結構列出來,標記哪些「afk-dex 還沒引用」,
 *   當「漏網偵測」的安全網。
 *
 * ⚠ 啟發式名稱比對,會有誤報:不是每個 *_CFG/_REQS 都是「發裝備的兌換」(例:PLEDGE_CFG 是血盟設定、
 *   RED_QUEST_REQS 是需求清單)。輸出是「請人工複查」清單,不是錯誤。
 *
 * 跑法(repo 根目錄): node scripts/audit-exchange-coverage.mjs
 * ========================================================================== */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const jsFiles = existsSync('js') ? readdirSync('js').filter((n) => /\.js$/.test(n)) : [];
const dex = existsSync('afk-dex.js') ? readFileSync('afk-dex.js', 'utf8') : '';

// 已知「非發裝備兌換」的結構,排除掉免得每次都當誤報跳出來(確認過不是掉落查詢來源的才放這)。
const KNOWN_NON_ITEM = new Set(['PLEDGE_CFG']);   // 血盟設定,非物品兌換

const STRUCT_RE = /\b(?:const|let|var)\s+([A-Z][A-Z0-9_]*_(?:REWARDS|EX|CFG|REQS))\s*=/g;
const seen = new Map();   // name → file(首見)
for (const f of jsFiles) {
  const src = readFileSync('js/' + f, 'utf8');
  let m;
  while ((m = STRUCT_RE.exec(src))) if (!seen.has(m[1])) seen.set(m[1], 'js/' + f);
}

const rows = [...seen.entries()]
  .filter(([name]) => !KNOWN_NON_ITEM.has(name))
  .map(([name, file]) => ({ name, file, inDex: dex.includes(name) }));
const missing = rows.filter((r) => !r.inDex);

console.log('=== 兌換/任務結構 → 掉落查詢(buildTrialBy)覆蓋稽核 ===');
console.log(`共 ${rows.length} 個結構;其中 ${missing.length} 個「afk-dex 未引用」(可能漏接,或本就非發裝備結構→人工判斷):\n`);
for (const r of missing) console.log('  ⚠️  ' + r.name.padEnd(26) + r.file);
console.log('\n已接進 afk-dex 的:');
for (const r of rows.filter((r) => r.inDex)) console.log('  ✅  ' + r.name);

// 給 CI/workflow 用:有「未引用」時 exit 0 但印出警告(不擋,只提醒,因為會有合理的誤報)。
process.exit(0);
