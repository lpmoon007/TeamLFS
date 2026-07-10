// =============================================================================
// Solo-engine seed generator — ports a real-time scenario content file
// (window.SCENARIO from crisis-engine.js) into the DB (Master Handoff §5, Phase 1).
//
//   node scripts/seed/build_solo_seed.mjs [prototype/solo/backlash-realtime-content.js]
//   → writes supabase/solo_seed_<scenario>.sql
//
// Mapping (unified "seat ≠ participant" model):
//   scenario            ← INTRO/COMPANY
//   scenario_meta       ← CONFIG + DRIVERS (mode_default='solo')
//   documents:solo_content ← the FULL content object incl. logic fns as source
//                            (the authoritative thing the runtime loads)
//   seats               ← the human hot seat (ceo) + each TEAM advisor as an
//                          AI-castable seat (persona/voice/disposition in meta)
//   holds               ← each week's held-info landmines (linear weeks)
//   injects             ← per-week situation + feed + surprises + pulse + wire,
//                          tagged in trigger_json (week/day/kind/from/tag/branch)
//   advocacy + branched-week beats stay in solo_content (runtime-coupled).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const contentPath = resolve(ROOT, process.argv[2] ?? 'prototype/solo/backlash-realtime-content.js');

// ---- load the content object via a window shim ----
const win = {};
new Function('window', readFileSync(contentPath, 'utf8'))(win);
const C = win.SCENARIO;
if (!C) throw new Error(`No window.SCENARIO in ${contentPath}`);

const slug = basename(contentPath).replace(/-realtime-content\.js$|-content\.js$/, '');
const OUT = resolve(ROOT, `supabase/solo_seed_${slug}.sql`);

// ---- helpers ----
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
const bool = (b) => (b ? 'true' : 'false');
const fnSrc = (f) => (typeof f === 'function' ? f.toString() : null);

const ORG_ID = uuid('org:tlfs-library');
const SCEN_ID = uuid(`scenario:solo:${slug}`);
const seatId = (k) => uuid(`seat:${slug}:${k}`);

// driver defs minus fmt() functions
const drivers = Object.fromEntries(
  Object.entries(C.DRIVERS).map(([k, d]) => [k, { label: d.label, val: d.val, min: d.min, max: d.max, deltaRange: d.deltaRange }]),
);

// the authoritative content blob (data + logic-as-source)
const soloContent = {
  intro: C.INTRO,
  company: C.COMPANY,
  config: C.CONFIG,
  dispositions: C.DISPOSITIONS,
  dimensions: C.DIMENSIONS,
  dims: { timing: C.TIMING_DIM, inquiry: C.INQUIRY_DIM, conduct: C.CONDUCT_DIM },
  drivers,
  reprieve_cost: C.REPRIEVE_COST,
  referee_context: C.REFEREE_CONTEXT,
  referee_scoring: C.REFEREE_SCORING,
  verdict: C.VERDICT,
  fallback_rules: C.FALLBACK_RULES,
  dimnote: C.DIMNOTE,
  coach: C.COACH,
  weeks: C.WEEKS, // full weekly content incl. branched week (runtime reads this)
  logic: {
    branchKey: fnSrc(C.branchKey),
    survived: fnSrc(C.survived),
    fallbackNarrative: fnSrc(C.fallbackNarrative),
    villainHero: fnSrc(C.villainHero),
    ending: fnSrc(C.ending),
  },
};

// ---- emit ----
const out = [];
out.push(`-- =============================================================================
-- Solo scenario seed: ${C.INTRO?.title ?? slug} (${slug})
-- GENERATED from ${basename(contentPath)} — do not hand-edit.
--   node scripts/seed/build_solo_seed.mjs ${process.argv[2] ?? ''}
-- Requires migrations 0001-0009. Additive; safe to re-run (idempotent delete first).
-- =============================================================================
begin;
delete from injects       where scenario_id = ${q(SCEN_ID)};
delete from holds         where scenario_id = ${q(SCEN_ID)};
delete from documents     where scenario_id = ${q(SCEN_ID)};
delete from contacts      where scenario_id = ${q(SCEN_ID)};
delete from scenario_meta where scenario_id = ${q(SCEN_ID)};
delete from seats         where scenario_id = ${q(SCEN_ID)};
delete from scenarios     where id = ${q(SCEN_ID)};
insert into organizations (id, name) values (${q(ORG_ID)}, 'TLFS Library') on conflict (id) do nothing;
`);

out.push(`-- scenario + real-time meta`);
out.push(`insert into scenarios (id, org_id, title, summary) values (${q(SCEN_ID)}, ${q(ORG_ID)}, ${q(C.INTRO?.title ?? slug)}, ${q(C.INTRO?.setup ?? null)});`);
out.push(
  `insert into scenario_meta (scenario_id, mode_default, driver_keys, week_count, week_seconds) values (` +
    `${q(SCEN_ID)}, 'solo', ${j(drivers)}, ${C.WEEKS.length}, ${C.CONFIG?.weekSeconds ?? 'null'});`,
);

out.push(`\n-- full authored content (data + logic sources) the runtime loads`);
out.push(`insert into documents (id, scenario_id, key, title, meta, body_json) values (${q(uuid(`doc:solo:${slug}`))}, ${q(SCEN_ID)}, 'solo_content', ${q(`${C.INTRO?.title ?? slug} — engine content`)}, ${j({ type: 'solo_content', slug })}, ${j(soloContent)});`);

out.push(`\n-- seats: human hot seat + advisor seats (AI-castable)`);
out.push(`insert into seats (id, scenario_id, key, name, role, meta) values (${q(seatId('ceo'))}, ${q(SCEN_ID)}, 'ceo', 'CEO', ${q(C.INTRO?.role ?? 'Chief Executive Officer')}, ${j({ hot_seat: true, cast_default: 'human' })});`);
for (const t of C.TEAM) {
  const persona = `You are ${t.name}, ${t.role} — an advisor to the CEO. Priority: ${t.priority}. Voice: ${t.voice}. Stay fully in character; answer straight.`;
  const meta = {
    cast_default: 'ai',
    role: t.role,
    short: t.short,
    initials: t.initials,
    color: t.color,
    priority: t.priority,
    voice: t.voice,
    persona,
    disposition_default: 'request',
    fallbackReply: t.fallbackReply,
    fallbackReact: t.fallbackReact,
  };
  out.push(`insert into seats (id, scenario_id, key, name, role, meta) values (${q(seatId(t.id))}, ${q(SCEN_ID)}, ${q(t.id)}, ${q(t.name)}, ${q(t.role)}, ${j(meta)});`);
}

// ---- holds (linear weeks) + injects (timed beats) ----
const holdRows = [];
const injectRows = [];
let order = 0;

function addHold(weekN, h, branch) {
  holdRows.push({
    id: uuid(`hold:${slug}:${weekN}:${h.from}:${h.topic}:${branch ?? ''}`),
    week_idx: weekN,
    holder: h.from,
    topic: h.topic,
    trigger_hints: h.triggerHints ?? [],
    hedge: h.hedge ?? null,
    reveal: h.reveal ?? null,
    critical: !!h.critical,
    counterfactual: h.counterfactual ?? null,
  });
}
function addInject(weekN, kind, from, body, extra) {
  injectRows.push({
    id: uuid(`inject:${slug}:${order}`),
    kind,
    body,
    trigger: { week: weekN, from: from ?? null, ...extra },
    order_idx: order++,
  });
}
function beatsOf(weekN, blk, branch) {
  if (blk.situation) addInject(weekN, 'situation', null, blk.situation, { beat: 'situation', branch });
  for (const it of blk.feed ?? []) addInject(weekN, 'message', it.from, it.text, { beat: 'feed', day: it.day, tag: it.kind, ref: it.id, branch });
  for (const sp of blk.surprises ?? []) addInject(weekN, 'situation', sp.from, sp.text, { beat: 'surprise', day: sp.day, kind: sp.kind, title: sp.title, branch });
  if (blk.pulse) addInject(weekN, 'message', blk.pulse.from, blk.pulse.text, { beat: 'pulse', branch });
  for (const w of blk.wire ?? []) addInject(weekN, 'situation', null, w, { beat: 'wire', branch });
  for (const h of blk.holds ?? []) addHold(weekN, h, branch);
}

for (const wk of C.WEEKS) {
  if (wk.branches) {
    // branched week: emit each branch's beats, tagged; holds preserved per branch
    for (const [bk, blk] of Object.entries(wk.branches)) beatsOf(wk.n, blk, bk);
    // the week's own situation (pre-branch) if present
    if (wk.situation) addInject(wk.n, 'situation', null, wk.situation, { beat: 'situation' });
  } else {
    beatsOf(wk.n, wk);
  }
}

out.push(`\n-- holds (${holdRows.length}) — the held-info landmines`);
for (const h of holdRows) {
  out.push(
    `insert into holds (id, scenario_id, week_idx, holder_seat_id, topic, trigger_hints, hedge_text, reveal_text, critical, counterfactual_text) values (` +
      `${q(h.id)}, ${q(SCEN_ID)}, ${h.week_idx}, ${q(seatId(h.holder))}, ${q(h.topic)}, ${j(h.trigger_hints)}, ${q(h.hedge)}, ${q(h.reveal)}, ${bool(h.critical)}, ${q(h.counterfactual)});`,
  );
}

out.push(`\n-- injects (${injectRows.length}) — per-week timed beats (seat=ceo; week/day/tag in trigger_json)`);
for (const i of injectRows) {
  out.push(
    `insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx, trigger_json) values (` +
      `${q(i.id)}, ${q(SCEN_ID)}, ${q(seatId('ceo'))}, ${q(i.kind)}, ${j({ body: i.body, from: i.trigger.from })}, ${i.order_idx}, ${j(i.trigger)});`,
  );
}

out.push(`\ncommit;`);

writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.error(
  `Wrote ${OUT}\n  scenario "${C.INTRO?.title ?? slug}" (solo) · ${C.WEEKS.length} weeks · ` +
    `${C.TEAM.length + 1} seats · ${holdRows.length} holds · ${injectRows.length} injects`,
);
