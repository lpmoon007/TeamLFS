// =============================================================================
// Non-destructive SOLO content patch generator. Given an edited content file, emits SQL
// that UPDATES the authored content + metadata IN PLACE — it never deletes scenarios,
// sessions, or participants, so run history is preserved (unlike a full solo_seed, which
// delete+inserts the scenario and cascades its sessions).
//
//   node scripts/seed/build_solo_patch.mjs prototype/solo/backlash-realtime-content.js
//   → writes supabase/solo_patch_<scenario>.sql   (apply on a LIVE DB, Copy-raw safe)
//
// What it touches (all UPDATE / UPSERT):
//   scenarios         title, summary
//   scenario_meta     driver_keys, week_count, week_seconds, difficulty, content_version+1
//   documents         solo_content body_json (THE blob the runtime loads) + title/meta
//   seats             upsert name/role/meta by deterministic id (no delete)
// It does NOT re-derive holds/injects rows — the solo runtime reads the content blob, so
// updating the blob is sufficient. If the STRUCTURE changed materially (new/removed seat
// keys), publish it as a NEW scenario id via build_solo_seed instead.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const contentPath = resolve(ROOT, process.argv[2] ?? 'prototype/solo/backlash-realtime-content.js');

const win = {};
new Function('window', readFileSync(contentPath, 'utf8'))(win);
const C = win.SCENARIO;
if (!C) throw new Error(`No window.SCENARIO in ${contentPath}`);

const slug = basename(contentPath).replace(/-realtime-content\.js$|-content\.js$/, '');
const OUT = resolve(ROOT, `supabase/solo_patch_${slug}.sql`);

// ---- deterministic ids (must match build_solo_seed.mjs) ----
const NS = 'b2c3d4e5-f6a7-4890-abcd-ef0123456789';
function uuid(name) {
  const h = createHash('sha1').update(Buffer.from(NS.replace(/-/g, ''), 'hex')).update(name).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const SCEN_ID = uuid(`scenario:solo:${slug}`);
const seatId = (k) => uuid(`seat:${slug}:${k}`);

// difficulty — identical formula to build_solo_seed.mjs
function difficultyOf(C) {
  const weeks = C.WEEKS.length || 1;
  const seen = new Set();
  let critical = 0;
  const addBlk = (weekN, blk) => {
    for (const h of blk.holds ?? []) {
      const k = `${weekN}:${h.from}:${h.topic}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (h.critical) critical++;
    }
  };
  for (const wk of C.WEEKS) {
    if (wk.branches) for (const blk of Object.values(wk.branches)) addBlk(wk.n, blk);
    else addBlk(wk.n, wk);
  }
  const teamSize = C.TEAM.length;
  const weekSeconds = Number(C.CONFIG?.weekSeconds) || 240;
  const dvals = Object.values(C.DRIVERS ?? {});
  let fragSum = 0;
  for (const d of dvals) {
    const span = (Number(d.max) - Number(d.min)) || 1;
    const margin = Math.max(0, Math.min(1, (Number(d.val) - Number(d.min)) / span));
    fragSum += 1 - margin;
  }
  const fragility = dvals.length ? fragSum / dvals.length : 0.35;
  const infoLoad = Math.min(1, critical / weeks / 1.5);
  const consultLoad = Math.min(1, Math.max(0, (teamSize - 3) / 4));
  const timePressure = Math.min(1, Math.max(0, (300 - weekSeconds) / 240));
  const idx = (infoLoad + consultLoad + timePressure + fragility) / 4;
  return Math.max(0.8, Math.min(1.25, Math.round((0.7 + 0.7 * idx) * 100) / 100));
}

const drivers = Object.fromEntries(
  Object.entries(C.DRIVERS).map(([k, d]) => [k, { label: d.label, val: d.val, min: d.min, max: d.max, deltaRange: d.deltaRange }]),
);
const fnReplacer = (_k, v) => (typeof v === 'function' ? { __fn: v.toString() } : v);
const soloContentJson = JSON.stringify(C, fnReplacer);
const capturedFns = (soloContentJson.match(/"__fn"/g) || []).length;
const DIFF = difficultyOf(C);
const title = C.INTRO?.title ?? slug;

const out = [];
out.push(`-- =============================================================================
-- NON-DESTRUCTIVE content patch: ${title} (${slug})
-- GENERATED from ${basename(contentPath)} — do not hand-edit.
--   node scripts/seed/build_solo_patch.mjs ${process.argv[2] ?? ''}
-- Safe to apply to a LIVE DB: updates authored content + metadata IN PLACE and bumps
-- content_version; does NOT delete scenarios/sessions/participants (run history preserved).
-- Requires migration 0017. If a session already exists, its debrief keeps the version it
-- was played on; NEW sessions get the bumped version.
-- =============================================================================
begin;
update scenarios set title = ${q(title)}, summary = ${q(C.INTRO?.setup ?? null)} where id = ${q(SCEN_ID)};
update scenario_meta set driver_keys = ${j(drivers)}, week_count = ${C.WEEKS.length}, week_seconds = ${C.CONFIG?.weekSeconds ?? 'null'}, difficulty = ${DIFF}, content_version = content_version + 1 where scenario_id = ${q(SCEN_ID)};
update documents set title = ${q(`${title} — engine content`)}, meta = ${j({ type: 'solo_content', slug, captured_fns: capturedFns })}, body_json = '${soloContentJson.replace(/'/g, "''")}'::jsonb where scenario_id = ${q(SCEN_ID)} and key = 'solo_content';
`);

out.push(`-- seats: upsert name/role/meta by deterministic id (no delete → no cascade)`);
out.push(
  `insert into seats (id, scenario_id, key, name, role, meta) values (${q(seatId('ceo'))}, ${q(SCEN_ID)}, 'ceo', 'CEO', ${q(C.INTRO?.role ?? 'Chief Executive Officer')}, ${j({ hot_seat: true, cast_default: 'human' })}) on conflict (id) do update set name = excluded.name, role = excluded.role, meta = excluded.meta;`,
);
for (const t of C.TEAM) {
  const persona = `You are ${t.name}, ${t.role} — an advisor to the CEO. Priority: ${t.priority}. Voice: ${t.voice}. Stay fully in character; answer straight.`;
  const meta = { cast_default: 'ai', role: t.role, short: t.short, initials: t.initials, color: t.color, priority: t.priority, voice: t.voice, persona, fallbackReply: t.fallbackReply, fallbackReact: t.fallbackReact };
  out.push(
    `insert into seats (id, scenario_id, key, name, role, meta) values (${q(seatId(t.id))}, ${q(SCEN_ID)}, ${q(t.id)}, ${q(t.name)}, ${q(t.role)}, ${j(meta)}) on conflict (id) do update set name = excluded.name, role = excluded.role, meta = excluded.meta;`,
  );
}
out.push(`commit;`);

writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.error(`Wrote ${OUT}\n  content patch "${title}" (solo) · difficulty ${DIFF} · ${capturedFns} fns · bumps content_version`);
