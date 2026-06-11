// =============================================================================
// The Signal — seed generator
//
// Authoring source-of-truth for the "Champion Iron — The Signal" scenario.
// Holds the scenario as structured data (easy to read/diff/edit) and emits
// supabase/seed.sql with correct SQL escaping. Regenerate with:
//
//     node scripts/seed/build_seed.mjs
//
// Mapping (handoff §4): org → scenario → seats → contacts → documents → injects.
// Message bodies are VERBATIM from the scenario document v1.0.
//
// Naming: the canonical org/place names are "Nordveil Iron AS" and "Fermont"
// (confirmed). The scenario draft's earlier "Rana Gruber" / "Vermont" aliases for the
// same people (Gunnar Olsen, K. Sørensen, Claude Gagnon) have been normalized
// throughout the contacts, briefs, and message bodies.
// =============================================================================

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../supabase/seed.sql');

// --- deterministic UUIDv5 (stable ids so re-runs produce identical FKs) -------
const NS = 'a1b2c3d4-e5f6-4890-abcd-ef0123456789';
function uuid(name) {
  const nsBytes = Buffer.from(NS.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(nsBytes).update(name).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10x
  const x = b.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// --- SQL literal helpers ------------------------------------------------------
const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => (o === null || o === undefined ? 'null' : `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`);
const bool = (b) => (b ? 'true' : 'false');

// =============================================================================
// DATA
// =============================================================================

const ORG = { id: uuid('org:champion-iron'), name: 'Champion Iron' };
const SCN = {
  id: uuid('scn:the-signal'),
  title: 'The Signal',
  summary:
    'Leadership Failure Simulator — Champion Iron Executive Team. A senior federal ' +
    'representative offers Champion a time-sensitive green-industrial partnership ' +
    'requiring a coordinated executive response within 72 hours. Every team member ' +
    'holds domain-specific knowledge material to the decision; whether, when, and to ' +
    'whom they share it is what the simulation measures.',
};

// --- Seats (7) ----------------------------------------------------------------
const SEATS = [
  { key: 'david',    name: 'David Cataford',     role: 'CEO' },
  { key: 'alex',     name: 'Alexandre Belleau',  role: 'COO' },
  { key: 'steve',    name: 'Steve Boucratie',    role: 'SVP General Counsel & Corporate Secretary' },
  { key: 'michael',  name: 'Michael Marcotte',   role: 'SVP Corporate Development & Capital Markets' },
  { key: 'francois', name: 'François Rhéaume',    role: 'SVP Strategy' },
  { key: 'angela',   name: 'Angela Frenette',    role: 'VP Human Resources & Indigenous Relations' },
  { key: 'noemi',    name: 'Noémie Charlebois',  role: 'Director, Communications & Government Affairs' },
];
const seatId = (k) => uuid(`seat:${k}`);

// --- ElevenLabs voice IDs (casting sheet "Table 1"), keyed by contact ---------
// Paul Arsenault is one voice shared across David's and Alex's seats.
const VOICE_IDS = {
  paul_arsenault:      'mrh6BGtvw1pAXXEjlsOg',
  robert_vaillancourt: '4a0Khp1o5b79Ilkuf4ia',
  gunnar_olsen:        '6XVxc5pFxXre3breYJhP',
  christian_levesque:  'GWX9un23nl5PmLT9bXtH',
  marc_beauchemin:     'ro97IE6kwE2PXqdaUoPE',
  marie_pierre:        'sBYwotm75akIFTqdVCPT',
  jonas_hartmann:      'lxvPH8fNJQrOdR4brk0c',
  voss_stahl:          'A9evEp8yGjv4c3WslKuY',
  jean_philippe_caron: 'xTZImU8dKXdyk4XGYGFg',
  daniel_lefebvre:     '6rr4jpS124uCLNtgVdAk',
  sorensen:            '1akQNyt9mMzTni2Y99lv',
  helene_mercier:      'l2qjqoUskg4poHSh4wMx',
  claude_gagnon:       '4GFYeFHbunxgGi5kJX68',
};

// --- Contacts (NPCs + system desks), per seat ---------------------------------
// callable+voice NPCs carry persona (LLM) + meta.voice (casting direction) + opener.
// system desks are text-only (callable:false, no voice).
const C = (o) => o;
const CONTACTS = [
  // DAVID
  C({ seat: 'david', key: 'paul_arsenault', full: 'Paul Arsenault', role: 'Senior Advisor, Office of the Minister of Natural Resources', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Professional, measured, genuinely wants this partnership to work. A smooth, polished political operator — friendly and enthusiastic on the surface with quiet, persistent pressure underneath. You push for clarity and decisiveness and you will not wait; you represent the external Thursday-5pm deadline. Never rattled.',
    opener: 'David — glad I caught you. I take it you have had a chance to look at the letter?',
    meta: { voice: { sex: 'male', age: '50s', accent: 'Canadian English, faint Québécois warmth', tone: 'smooth, polished, quiet pressure', pace: 'measured, unhurried' }, shared_with: ['alex'] } }),
  C({ seat: 'david', key: 'robert_vaillancourt', full: 'Robert Vaillancourt', role: 'Board Chair, Champion Iron', section: 'INTERNAL', color: '#8b5cf6', callable: true,
    persona: 'You are Robert Vaillancourt, Board Chair of Champion Iron. Senior, authoritative, a little terse. You have heard of a possible federal partnership announcement and feel out of the loop; board protocol is clear that you must be informed before anything material goes public. Controlled irritation, deliberate and weighty.',
    opener: "David. Good — I have been trying to reach you. What is going on with this federal business?",
    meta: { voice: { sex: 'male', age: 'early 60s', accent: 'Canadian English', tone: 'authoritative, controlled irritation', pace: 'deliberate, weighty' } } }),
  C({ seat: 'david', key: 'gunnar_olsen', full: 'Gunnar Olsen', role: 'CEO, Nordveil Iron AS (Nordic subsidiary)', section: 'INTERNAL', color: '#10b981', callable: true,
    persona: 'You are Gunnar Olsen, CEO of Nordveil Iron AS, Champion’s Nordic subsidiary. Calm, practical, measured, even-keeled operator. You are seeking direction on a routine-but-sensitive union meeting request about Q3 shift schedule changes.',
    opener: 'David, thanks for calling back. It is about the union meeting request.',
    meta: { voice: { sex: 'male', age: '50s', accent: 'Scandinavian-accented English (Norwegian)', tone: 'calm, practical', pace: 'measured' } } }),

  // ALEX
  C({ seat: 'alex', key: 'christian_levesque', full: 'Christian Lévesque', role: 'Director of Operations, Champion Iron', section: 'INTERNAL', color: '#10b981', callable: true,
    persona: 'You are Christian Lévesque, Director of Operations at Champion Iron and Alex’s direct report. Competent, not alarmist, grounded and plain-spoken — a field/operations voice, not a boardroom one. You hold specific data: a Q4 water-management permit variance for the Phase 2 northern expansion is still pending provincial review, unlikely to resolve before September. It only becomes material if Champion makes public commitments about northern capacity or Phase 2 timelines. You only engage with Alex.',
    opener: 'Alex — Christian here. You got a minute on the Phase 2 thing?',
    meta: { voice: { sex: 'male', age: '40s–50s', accent: 'Québécois English', tone: 'grounded, plain-spoken, operational', pace: 'steady' } } }),
  C({ seat: 'alex', key: 'paul_arsenault', full: 'Paul Arsenault', role: 'Senior Advisor, Office of the Minister of Natural Resources', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Smooth, polished, measured political operator. You are pressing Alex directly for an operational capacity summary for the preliminary package. Friendly but persistent; you will not wait.',
    opener: 'Alex — Paul Arsenault. Thanks for taking the call. I need the operational capacity picture.',
    meta: { voice: { sex: 'male', age: '50s', accent: 'Canadian English, faint Québécois warmth', tone: 'smooth, polished, quiet pressure', pace: 'measured, unhurried' }, shared_with: ['david'] } }),
  C({ seat: 'alex', key: 'bloom_lake_ops', full: 'Bloom Lake Operations', role: 'Site operations desk', section: 'INTERNAL', color: '#64748b', callable: false, persona: null, opener: null,
    meta: { type: 'desk', text_only: true } }),

  // STEVE
  C({ seat: 'steve', key: 'marc_beauchemin', full: 'Marc Beauchemin', role: 'External Legal Counsel', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Marc Beauchemin, Steve’s external legal counsel. Precise, careful, measured; risk-focused but solution-oriented and not political. You flagged that a federal public-private partnership with co-investment above $50M triggers a mandatory lender notification within 30 days, measured from the date of public announcement. This is procedural and solvable — lenders will almost certainly consent — but if the announcement precedes notification, Champion is in technical default. The fix is sequencing/timing (a ~15-day buffer). You only engage with Steve.',
    opener: 'Steve — Marc. Thanks for calling. I want to walk you through the notification timing.',
    meta: { voice: { sex: 'male', age: '50s', accent: 'Canadian English', tone: 'precise, careful, lawyerly restraint', pace: 'deliberate' } } }),
  C({ seat: 'steve', key: 'marie_pierre', full: 'Marie-Pierre Gauthier', role: 'Securities Compliance, Champion Iron', section: 'INTERNAL', color: '#10b981', callable: true,
    persona: 'You are Marie-Pierre Gauthier, Securities Compliance at Champion Iron. Exacting, formal, by-the-book; clipped and efficient. You need Steve’s sign-off on the Q2 securities compliance certification, due to the securities commission Friday.',
    opener: 'Steve — Marie-Pierre. I need the Q2 certification signed today, please.',
    meta: { voice: { sex: 'female', age: '40s', accent: 'Canadian/Québécois English', tone: 'exacting, formal, by-the-book', pace: 'clipped, efficient' } } }),

  // MICHAEL
  C({ seat: 'michael', key: 'jonas_hartmann', full: 'Jonas Hartmann', role: 'Institutional Investor Contact', section: 'EXTERNAL', color: '#f59e0b', callable: true,
    persona: 'You are Jonas Hartmann, Michael’s institutional investor contact. Sharp, fast, market-savvy; direct and slightly impatient, used to getting answers. Market-oriented, opportunistic framing about CBAM and the low-carbon iron-ore offtake premium. You only engage with Michael.',
    opener: 'Michael — Jonas. Quick one. The CBAM window is moving — do you want the numbers?',
    meta: { voice: { sex: 'male', age: '40s', accent: 'International/European-accented English (German lean)', tone: 'sharp, fast, impatient', pace: 'fast' } } }),
  C({ seat: 'michael', key: 'voss_stahl', full: 'K. Vogel — Voss Stahl GmbH', role: 'European Steel Mill (German industrial buyer)', section: 'EXTERNAL', color: '#f59e0b', callable: true,
    persona: 'You are K. Vogel of Voss Stahl GmbH, a German industrial steel buyer seeking a Canadian low-carbon iron-ore supply relationship. Formal, industrial, precise; German-accented English. You contacted Michael directly about a preliminary supply conversation this week.',
    opener: 'Mr. Marcotte — Vogel, Voss Stahl. Thank you for taking the call.',
    meta: { voice: { sex: 'male', age: '40s–50s', accent: 'German-accented English', tone: 'formal, industrial, precise', pace: 'even', note: 'gender-neutral name; default male' } } }),
  C({ seat: 'michael', key: 'finance_team', full: 'Corporate Finance', role: 'Internal finance team desk', section: 'INTERNAL', color: '#64748b', callable: false, persona: null, opener: null,
    meta: { type: 'desk', text_only: true } }),

  // FRANCOIS
  C({ seat: 'francois', key: 'jean_philippe_caron', full: 'Jean-Philippe Caron', role: 'Personal contact, federal government-adjacent', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Jean-Philippe Caron, François’s personal contact in a federal government-adjacent role (a former colleague). Warm, discreet insider — you speak low and friendly, a "between us" tone, and you will not put anything sensitive in writing. You can offer informal context on how the minister’s office is really thinking. You only engage with François.',
    opener: 'Frank — good to hear your voice. We should keep this one between us.',
    meta: { voice: { sex: 'male', age: '40s–50s', accent: 'Québécois English', tone: 'warm, discreet insider', pace: 'relaxed' } } }),
  C({ seat: 'francois', key: 'corporate_records', full: 'Corporate Records', role: 'Records desk', section: 'INTERNAL', color: '#64748b', callable: false, persona: null, opener: null,
    meta: { type: 'desk', text_only: true, note: 'Legacy Saudi-initiative sign-off (brief context); no authored message copy in v1.0.' } }),

  // ANGELA
  C({ seat: 'angela', key: 'daniel_lefebvre', full: 'Daniel Lefebvre', role: 'Stakeholder Review, Natural Resources Canada', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Daniel Lefebvre, Stakeholder Review at Natural Resources Canada, reaching out on behalf of Paul Arsenault’s office to compile a preliminary stakeholder-relations summary. Bureaucratic, neutral, procedural; even and slightly flat, process-driven.',
    opener: 'Hello — Daniel Lefebvre, Natural Resources Canada. I am following up on the consultation summary.',
    meta: { voice: { sex: 'male', age: '40s–50s', accent: 'Canadian English', tone: 'bureaucratic, neutral, procedural', pace: 'even, slightly flat' } } }),
  C({ seat: 'angela', key: 'sorensen', full: 'K. Sørensen', role: 'HR Director, Nordveil Iron AS', section: 'INTERNAL', color: '#10b981', callable: true,
    persona: 'You are K. Sørensen, HR Director at Nordveil Iron AS. Measured, professional, calm; Scandinavian-accented English. You need Angela’s guidance aligning Q3 performance-review processes amid cultural friction points.',
    opener: 'Angela — Sørensen here. Do you have a few minutes on the Q3 review process?',
    meta: { voice: { sex: 'female', age: '40s', accent: 'Scandinavian-accented English', tone: 'measured, professional, calm', pace: 'even', note: 'gender-neutral name; default female' } } }),
  C({ seat: 'angela', key: 'stakeholder_system', full: 'Stakeholder Management System', role: 'Automated reminder feed', section: 'INTERNAL', color: '#64748b', callable: false, persona: null, opener: null,
    meta: { type: 'desk', text_only: true, automated: true } }),

  // NOEMI
  C({ seat: 'noemi', key: 'helene_mercier', full: 'Hélène Mercier', role: 'Communications Director, Ministry of Natural Resources', section: 'EXTERNAL', color: '#3b82f6', callable: true,
    persona: 'You are Hélène Mercier, Communications Director at the Ministry of Natural Resources and Noémie’s contact. Polished, media-savvy, careful — you weigh every word. Collegial; you give Noémie real information but expect discretion. You only engage with Noémie.',
    opener: 'Noémie — Hélène. Between us, this is moving faster than the team thinks.',
    meta: { voice: { sex: 'female', age: '40s–50s', accent: 'Québécois/Canadian English', tone: 'polished, media-savvy, careful', pace: 'smooth, controlled' } } }),
  C({ seat: 'noemi', key: 'claude_gagnon', full: 'Claude Gagnon', role: 'General Manager, Fermont Operations', section: 'INTERNAL', color: '#10b981', callable: true,
    persona: 'You are Claude Gagnon, General Manager of Fermont Operations. Blunt, direct, field-manager candor; strong Québécois English, no polish — you say it straight. You are worried local media will connect federal-announcement rumours to Champion while the fly-in/fly-out tension is still raw, and you need to know what to tell them.',
    opener: 'Noémie — Claude. I am getting calls. What do I tell people?',
    meta: { voice: { sex: 'male', age: '50s', accent: 'strong Québécois English', tone: 'blunt, direct, field-manager candor', pace: 'plain' } } }),
  C({ seat: 'noemi', key: 'comms_team', full: 'Communications Team', role: 'Internal communications desk', section: 'INTERNAL', color: '#64748b', callable: false, persona: null, opener: null,
    meta: { type: 'desk', text_only: true } }),
];

// Attach concrete ElevenLabs voice ids to callable contacts.
for (const c of CONTACTS) {
  if (VOICE_IDS[c.key]) c.voiceId = VOICE_IDS[c.key];
}

// --- Documents: opening brief + 7 role briefs + 1 attachment ------------------
const OPENING_BRIEF = `07:45 AM, Tuesday

This morning David received a call from Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Canada is under significant international pressure to demonstrate a credible green industrial strategy ahead of a major G7 trade summit in 90 days. Arsenault's office is looking for a Canadian iron ore producer to anchor a national initiative — a public-private partnership that would accelerate feasibility work on next-generation iron ore processing, position Canadian supply chains as preferred partners for low-carbon steel production in Europe and Asia, and generate a significant federal co-investment commitment.

Champion Iron has been identified as the preferred partner. The opportunity includes federal co-investment in ongoing feasibility work, preferred introductions to three major international steel producers actively seeking low-carbon supply agreements, and a public announcement at the G7 summit positioning Champion as Canada's strategic anchor in the green steel transition.

Arsenault needs a preliminary letter of intent by Thursday at 5pm — 58 hours from now. After that, the ministry moves to a broader industry consultation and Champion loses first-mover position.

David has called the full executive team together. This message is going to all of you simultaneously. He wants a decision on whether to pursue, and if yes, a coordinated response plan, by end of day.`;

const BRIEFS = {
  david: `BRIEF — DAVID CATAFORD — CEO
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
Three days ago you received a call from Paul Arsenault, Senior Advisor to the federal Minister of Natural Resources. Canada is under significant pressure from its G7 partners to demonstrate a credible green industrial strategy ahead of the summit in 90 days. Arsenault's office has identified Champion Iron as the preferred anchor for a national green steel initiative.

The opportunity on the table:
- Federal co-investment of approximately $75-100M toward CAMI feasibility acceleration
- Preferred introductions to three major European steel mills actively seeking low-carbon supply agreements ahead of EU carbon border tariffs
- A public announcement at the G7 summit positioning Champion as Canada's strategic iron ore partner for the green transition
- A 10-year preferred supplier framework with federal procurement priority for domestic infrastructure projects

The condition: Champion must provide a preliminary letter of intent by Thursday at 5pm — 58 hours from now. After that the ministry moves to broader industry consultation and Champion loses first-mover position.

What you don't know:
You don't know whether Champion's Indigenous and community consultation track record is clean enough to survive federal due diligence. Arsenault mentioned it in passing this morning as a standard requirement. You haven't asked anyone on your team yet.
You don't know whether your current financing structure creates any obligations or constraints around a public-private partnership of this scale.
You don't know whether Champion's operational capacity commitments can support what a federal partnership announcement would imply.
You don't know that Noemi had advance intelligence about this opportunity from her own government network before your call this morning.
You don't know that Francois has a personal relationship with someone connected to the minister's office.

What you're deciding today:
Whether to pursue this opportunity, and if yes, how to organize Champion's response in the next 58 hours.

One thing to keep in mind:
Arsenault suggested keeping the circle small internally for now. His exact words: "These things have a way of getting complicated when too many people are involved before the framework is settled." What you do with that advice is your call.`,

  alex: `BRIEF — ALEXANDRE BELLEAU — COO
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
You are hearing about the federal partnership opportunity at the same time as the rest of the team. David called everyone together this morning.

What you know that nobody else does:
Three weeks ago your Director of Operations flagged a water management permit variance on the northern expansion. Specifically: a permit variance application filed in Q4 of last year for the Phase 2 water management infrastructure is still pending provincial review. The permits team estimates resolution is unlikely before September at the earliest.
This has not been a problem until now because the variance doesn't affect current operations. Bloom Lake is running normally. The issue only becomes material if Champion makes public commitments about northern expansion capacity or Phase 2 timelines to external parties.
A federal partnership announcement that references CAMI feasibility acceleration or expanded production capacity could create a gap between what Champion commits publicly and what the permits actually allow. That gap is manageable — but only if someone with authority knows about it before commitments are made, not after.
You have been treating this as an operational detail. Until this morning, it was.

What you're managing simultaneously:
Bloom Lake has a routine but time-sensitive contractor approval on your desk. The conveyor maintenance crew needs a 3-week extension signed off today or they begin demobilization. Cost is within pre-approved variance. It's a 10-minute task but it requires your attention.

What you're deciding today:
When to surface the permit variance, to whom, and how. And whether you stay in the strategic conversation or get pulled back into operations.

One thing to keep in mind:
You are one of two people David trusts completely. That means your instinct will be to handle things — to solve the permit problem yourself before surfacing it, to manage the Arsenault capacity question directly, to take on more than you should. The question is whether that instinct serves the team today or just serves your comfort with being needed.`,

  steve: `BRIEF — STEVE BOUCRATIE — SVP GENERAL COUNSEL AND CORPORATE SECRETARY
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
You are hearing about the federal partnership opportunity at the same time as the rest of the team.

What you know that nobody else does:
Last month, during a routine financing review, your external legal counsel flagged a clause in Champion's current syndicated credit facility. The relevant provision: any public-private partnership involving federal co-investment above $50M triggers a mandatory lender notification requirement. The notification must be filed within 30 days of a binding letter of intent — but critically, the 30-day window is measured from the date of public announcement, not the date of signing.
This means: if Champion signs a letter of intent Thursday and it becomes public — which a G7 announcement would — the 30-day notification clock starts immediately. If Champion's communications team announces the partnership before the notification is filed, Champion is in technical default on its credit facility at the precise moment of its most significant public announcement in years.
This is not a deal-breaker. Lender consent in situations like this is routine and expected. The lenders will almost certainly approve. The risk is entirely procedural: wrong sequence, wrong timing, technical default. The fix requires coordinating the announcement timeline with the lender notification process. That's a 15-day buffer built into the communications plan. Simple to manage. Catastrophic if missed.
You are the only person on the executive team who currently knows this.

What you're managing simultaneously:
The Q2 compliance certification for the securities commission is due Friday. Your team has the draft ready and needs your sign-off today to meet the print deadline. It is routine but non-negotiable.

What you're deciding today:
When to raise the financing constraint, how to frame it, and whether you give the room something to work with or something to worry about.

One thing to keep in mind:
You already know how your concerns tend to land in the room. You know that David finds your style frustrating even when your substance is right. This morning you have a concern that is genuinely important and genuinely solvable. The question isn't whether to raise it. The question is whether you raise it in a way that helps the decision or stops it. The lenders will say yes. The timeline just needs to be managed. That's the whole message. Everything else is noise.`,

  michael: `BRIEF — MICHAEL MARCOTTE — SVP CORPORATE DEVELOPMENT AND CAPITAL MARKETS
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
You are hearing about the federal partnership opportunity at the same time as the rest of the team. However, you are less surprised than most.

What you know that nobody else does:
Six weeks ago you built a financial model for a different purpose — assessing Champion's positioning relative to European carbon border adjustment mechanisms and the emerging low-carbon iron ore premium. You were tracking three European steel mills that have been quietly accelerating their low-carbon feedstock sourcing timelines. The model was never formally presented because the context didn't feel right. It has been sitting in your files. That model maps almost exactly to what this federal partnership opportunity requires.

The numbers as you currently have them:
Downside case: Federal co-investment of $75M, one offtake agreement at a 4% premium to spot, CAMI feasibility acceleration of 18 months. Net present value impact to Champion: approximately $180M over 10 years.
Base case: Federal co-investment of $100M, two offtake agreements at 6% premium to spot, CAMI acceleration of 24 months. NPV impact: approximately $340M over 10 years.
Upside case: Full federal co-investment package, three offtake agreements at 8-10% premium, CAMI as anchor of national green steel strategy. NPV impact: $500M+ over 10 years with significant option value on future federal procurement.
These numbers are directionally right but carry significant uncertainty. The offtake premium assumptions in particular depend on how quickly the European mills move and whether Champion can credibly commit to a low-carbon narrative that survives due diligence.

What you're managing simultaneously:
The Q2 management accounts are ready for board review. The board package goes to print Thursday morning and needs your sign-off today. Your finance team is waiting.
You will also likely receive direct outreach from an external party about the partnership opportunity during the simulation. You have not been authorized to have that conversation.

What you're deciding today:
What to share, how much of it, and when. The model exists. The question is whether you give the room what it needs to make a decision or everything you know.

One thing to keep in mind:
David has asked you directly for numbers before and told you the output was hard to use. His words, not yours. Three numbers — upside, base, downside — is what a room making a 58-hour decision needs. Everything else can come later. The CFO question is unresolved. This morning is not an audition. But it is being watched.`,

  francois: `BRIEF — FRANCOIS RHEAUME — SVP STRATEGY
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
You are hearing about the federal partnership opportunity at the same time as the rest of the team. But three days ago you heard something that made you suspect something like this was coming.

What you know that nobody else does:
Three days ago a personal contact — someone you worked with at a previous company who now works in a federal government-adjacent role — mentioned obliquely that something was moving in the natural resources space at the ministerial level. He didn't say more. You started putting pieces together. You have not said anything to David.
This morning your contact sent you a follow-up. He now knows Champion is involved. He is offering to provide informal context about how the minister's office is thinking about this initiative — what they actually want from a partner beyond the public framing, who the internal decision-makers are, and what the real evaluation criteria look like beyond the stated ones.
This relationship is potentially valuable. It is also a potential conflict of interest. If it becomes known that you had advance intelligence and a back channel into the minister's office without disclosing it, the optics are problematic regardless of your intentions.
Your contact has also told you, privately, that your name came up in the minister's office in connection with this initiative. Someone there knows you from your previous work. He is advising you to get ahead of it.

What you're managing simultaneously:
A legacy matter from the Saudi initiative requires your sign-off today. It is administrative and low stakes but it carries emotional weight. You stewarded that project. It failed for reasons outside your control. The paperwork is a reminder.

What you're deciding today:
Whether to disclose the relationship to David and the team immediately, use the back channel quietly to advance Champion's position, or wait until you understand the full picture before saying anything.

One thing to keep in mind:
You are the person everyone trusts. That trust has been built over years and it is real. It is also fragile in the specific way that all trust built on composure is fragile — it depends on the assumption that your composure reflects nothing hidden. You have something hidden right now. The question is not whether it surfaces. It will. The question is whether you surface it or it surfaces you.`,

  angela: `BRIEF — ANGELA FRENETTE — VP HUMAN RESOURCES AND INDIGENOUS RELATIONS
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
You are hearing about the federal partnership opportunity at the same time as the rest of the team.

What you know that nobody else does:
Four months ago you flagged an unresolved item in Champion's Indigenous consultation process. Specifically: a required government notification related to the Maxi-Mekos consultation process for the CAMI project was sent outside the prescribed timeline. The response window may have been procedurally compromised as a result. You raised it internally in writing. The response from the permitting team was that it was being handled. You have not received a formal confirmation that it was resolved.
This item has been sitting in Champion's stakeholder management system as unresolved for 47 days past its review date.
A federal partnership announcement that triggers government due diligence on Champion's Indigenous consultation track record could surface this item. If it surfaces during due diligence rather than being disclosed proactively, it creates a very different impression than if Champion names it and explains the resolution status first. You do not know for certain whether it was resolved. You do know it exists.

What you're learning during the simulation:
At some point this morning you will receive an indirect inquiry from the federal government's office asking about Champion's consultation status. This will arrive before David has directly looped you into the partnership conversation. You will learn about the opportunity through a back channel before your own CEO tells you directly.

What you're managing simultaneously:
An HR matter from Nordveil Iron AS requires your input this week. The Nordveil HR director wants guidance on aligning performance review processes. It is sensitive given the current cultural tensions and requires careful handling but is not urgent today.

What you're deciding today:
Whether to surface the consultation gap immediately and proactively, investigate quietly to confirm its status before saying anything, or wait to see if it comes up in the conversation naturally. And separately: when the federal inquiry arrives in your inbox before David has told you about the opportunity — what you do with that information.

One thing to keep in mind:
You were right about Nordveil Iron AS. You flagged the cultural risk before the acquisition. The team moved forward anyway. You have never said I told you so. That restraint has cost you something — not in terms of being right, but in terms of being heard. This morning you have information that is material to a decision the team is about to make. The question is not whether you have the right to surface it. You do. The question is whether you surface it in a way that serves the decision or in a way that serves the feeling of finally being heard. Those are different things. Only one of them helps Champion today.`,

  noemi: `BRIEF — NOEMI CHARLEBOIS — DIRECTOR, COMMUNICATIONS AND GOVERNMENT AFFAIRS
Read this before you log in. This is your private context for the simulation. Do not share it with other participants unless you choose to.

What you know going into this morning:
Unlike the rest of the team, you are not entirely surprised by David's call.

What you know that nobody else does:
Four days ago a contact inside the Ministry of Natural Resources communications team sent you a heads-up. She told you something was moving at the ministerial level in the natural resources space and that if Champion received a call, it was real and significant. She told you the communications piece would matter enormously and that whoever managed the narrative early would own it.
You have known for four days that something like this was coming. You did not tell David.
You are also the most qualified person on this team to lead the government relations and communications response to this opportunity. You have existing relationships inside this ministry. You understand how federal partnership announcements work. You know how to manage the narrative around an initiative of this scale. You do not have the title that would give you formal authority to do so.

What you're managing simultaneously:
The Fermont GM — Claude Gagnon — is going to contact you during the simulation. He has seen wire service speculation about a federal natural resources announcement and he is connecting it to Champion. Fermont's relationship with Champion is already strained over the fly-in fly-out issue. A federal announcement that doesn't account for Fermont's concerns could reignite that tension publicly at the worst possible moment.
You are the only person on the team who sees both the federal opportunity and the Fermont risk simultaneously. Nobody else is managing both threads. Your internal communications team also needs routine sign-offs this week that cannot wait indefinitely.

What you're deciding today:
Whether to tell David you had advance intelligence before his call this morning. Whether to assert your expertise and lead the communications response or wait to be asked. Whether to connect the Fermont thread to the partnership conversation or manage it separately. And what to do when the media timeline starts compressing faster than the team is moving.

One thing to keep in mind:
You have been told repeatedly that you are ready for more. You have been promised a title twice and it hasn't materialized. You have been doing the work of a VP without the authority of one for two years. This morning you have an opportunity to demonstrate exactly why that title matters — not by asking for it, but by doing what only you can do, in a way that nobody can ignore.
The question is whether you wait for permission or whether you lead. If you wait, the Fermont situation compounds, the media narrative sets without Champion's voice, and the moment passes. If you lead without looping people in, you may be right about the outcome but wrong about the process — and that distinction matters for a team that is already struggling with who has authority to do what.
There is a version of leadership here that threads that needle. It requires you to be direct with David about what you knew, clear about what you're proposing to do, and fast enough that the window doesn't close while you're waiting for his response.`,
};

const DOCUMENTS = [
  { key: 'opening_brief', title: 'Opening Brief — The Signal', meta: { type: 'opening_brief', audience: 'all', time: '07:45 AM, Tuesday' }, body: { type: 'opening_brief', text: OPENING_BRIEF } },
  ...SEATS.map((s) => ({
    key: `brief_${s.key}`, title: `Your Brief — ${s.name} (${s.role})`,
    meta: { type: 'role_brief', seat: s.key, persistent: true },
    body: { type: 'role_brief', seat: s.key, name: s.name, role: s.role, text: BRIEFS[s.key] },
  })),
  { key: 'greensteel_model', title: 'GreenSteel_Opportunity_Model_v1.xlsx',
    meta: { type: 'attachment', file: 'GreenSteel_Opportunity_Model_v1.xlsx', from: 'jonas_hartmann', seat: 'michael' },
    body: { type: 'attachment', note: 'Rough financial model of the low-carbon offtake upside case (placeholder for the spreadsheet artifact).' } },
];

// --- Injects ------------------------------------------------------------------
// Each: { seat, kind, payload } where payload carries thread/from/body/timing/etc.
// delay_min = simulation minutes from T=0. cond = fire/cancel condition (cancelIf).
const injects = [];
let ORDER = 0;
function inject(seat, kind, payload) {
  injects.push({ seat, kind, order_idx: ORDER++, payload });
}
// message helper
const msg = (seat, thread, from, delay, body, extra = {}) =>
  inject(seat, extra.kind || 'message', { thread, from, delay_min: delay, body, ...extra, kind: undefined });

// ---- T=0 situation: opening brief for all seats ----
inject(null, 'situation', { audience: 'all', delay_min: 0, document: 'opening_brief', time: '07:45 AM, Tuesday',
  body: 'David has called the full executive team together. He wants a decision on whether to pursue — and if yes, a coordinated response plan — by end of day.' });

// ===================== DAVID =====================
msg('david', 'paul_arsenault', 'paul_arsenault', 0,
  "David — good speaking this morning. One thing I should have mentioned on the call: the minister's office will be doing a preliminary stakeholder relations review as part of due diligence on any partnership announcement. Indigenous consultation track record, community relations, regulatory standing. Nothing onerous but it needs to be clean. Let me know if there are any sensitivities we should be aware of before we proceed. Looking forward to Thursday.",
  { tag: 'private_info' });
msg('david', 'paul_arsenault', 'paul_arsenault', 0,
  "David — following up on our call. I want to make sure you have everything you need to move quickly. The minister is genuinely enthusiastic about Champion and we'd like to keep this conversation tight until Thursday. I'd recommend keeping the circle small internally for now — these things have a way of getting complicated when too many people are involved before the framework is settled. Looking forward to hearing from you.",
  { tag: 'opening', note: 'Arsenault actively suggests David keep the circle small — first pressure point on information-sharing.' });
msg('david', 'paul_arsenault', 'paul_arsenault', 12,
  "David -- just checking you received my earlier note. We're on a tight clock and I want to make sure you have what you need to move forward. The minister is asking for a status update from my end by noon.",
  { cond: 'David has not responded' });
msg('david', 'paul_arsenault', 'paul_arsenault', 25,
  "David -- one more flag. Our Indigenous relations team has asked specifically about consultation status for any northern Quebec operations. This is standard due diligence but they want it in writing before Thursday. Can you confirm who on your team owns that file?",
  { cond: 'David has not responded or has not mentioned Angela’s stakeholder review' });
msg('david', 'paul_arsenault', 'paul_arsenault', 40,
  "David -- I don't want to create pressure but I need to be honest with you. If the consultation summary isn't clean we need to know now, not Thursday morning. Is there someone on your team I should be speaking with directly?",
  { cond: 'David still hasn’t looped Angela' });
msg('david', 'robert_vaillancourt', 'robert_vaillancourt', 8,
  "David -- heard something interesting from a contact at Industry Canada this morning. Something about a federal partnership announcement involving Champion. I assume you would have called me if there was anything material happening. Just want to make sure we're not getting surprised. Give me a call when you have a moment.");
msg('david', 'robert_vaillancourt', 'robert_vaillancourt', 20,
  "David -- following up. My contact is saying this is moving quickly. If there's a material government announcement involving Champion I need to know before it goes public. Board protocol is clear on this. Please call me.",
  { cond: 'David has not responded' });
msg('david', 'robert_vaillancourt', 'robert_vaillancourt', 45,
  "David -- I've now had two separate contacts reach out about this. I'm going to need you to call me in the next 30 minutes. This isn't optional.",
  { cond: 'David has still not responded' });
msg('david', 'gunnar_olsen', 'gunnar_olsen', 15,
  "David -- sorry to interrupt your morning. We have a union rep requesting a formal meeting about the Q3 shift schedule changes. Gunnar thinks it's routine but he wanted to flag it given the history. Can you advise on whether we should handle locally or escalate?",
  { note: 'Tests whether David routes operational matters or absorbs them.' });
msg('david', 'gunnar_olsen', 'gunnar_olsen', 30,
  "David -- Gunnar is asking for direction. The union rep is pushing for a response today. He doesn't want to make a call without your input given the sensitivity.",
  { cond: 'No response' });

// ===================== ALEX =====================
msg('alex', 'christian_levesque', 'christian_levesque', 0,
  "Alex — quick flag before your morning. The Q3 operational review flagged something on the Phase 2 expansion timeline that I think becomes relevant if we're talking about any kind of federal commitment on capacity. I can walk you through it whenever you have 20 minutes. Not urgent on its own but context-dependent.",
  { tag: 'private_info' });
msg('alex', 'christian_levesque', 'christian_levesque', 0,
  "Alex — also worth knowing: the Phase 2 timeline issue I mentioned touches on the water management permits for the northern expansion. If anyone is making commitments about operational capacity to external parties in the next 60 days, I'd want to make sure they have the full picture first. Just flagging.",
  { tag: 'opening' });
msg('alex', 'christian_levesque', 'christian_levesque', 10,
  "Alex -- just to be clear on the scope of the issue. The water management permit variance we filed in Q4 is still pending review. If Champion makes any public commitment about northern expansion capacity in the next 60 days, we could be in a position where the commitment outpaces the permit. I don't want to overstate it but I also don't want you to be caught off guard.",
  { cond: 'Alex has not responded or escalated' });
msg('alex', 'christian_levesque', 'christian_levesque', 22,
  "Alex -- the permits team just told me the review is unlikely to resolve before September at the earliest. That's a 90-day gap if Champion is making commitments at a G7 summit. I really think someone above my level needs to know this today.",
  { cond: 'Still no escalation to David or the group' });
msg('alex', 'christian_levesque', 'christian_levesque', 40,
  "Alex -- I've done what I can from my end. If this creates a problem later I want it on record that I flagged it. Whatever you decide, I'll support it.",
  { cond: 'Alex has still not surfaced this' });
msg('alex', 'paul_arsenault', 'paul_arsenault', 18,
  "Alex -- Paul Arsenault here. David suggested I reach out to you directly for the operational capacity summary we need for the preliminary package. Specifically: current annual production capacity, projected capacity with planned Phase 2 expansion, and timeline confidence level. Can you get me a one-pager by tomorrow morning?",
  { note: 'Arsenault did NOT actually suggest this — a plausible fiction creating a direct pressure point on Alex.' });
msg('alex', 'paul_arsenault', 'paul_arsenault', 30,
  "Alex -- following up on my earlier message. We're building the preliminary package now and need the capacity summary to proceed. Is there anyone else I should be speaking with if you're unavailable?",
  { cond: 'Alex has not responded to Arsenault or told David' });
msg('alex', 'francois', 'francois', 28,
  "Alex -- can we talk for a minute? There's something I need to think through before I bring it to David. You're the only person I trust to give me a straight answer on this.",
  { coordination_beat: true, note: 'Francois reaching out before his forced-disclosure trigger fires; tests the inner-circle dynamic. Participant-to-participant beat.' });
msg('alex', 'bloom_lake_ops', 'bloom_lake_ops', 5,
  "Alex -- routine approval needed on the contractor extension for the conveyor maintenance crew. They're scheduled to demobilize Friday and we need a 3-week extension signed off today to keep them on site. Cost is within pre-approved variance. Just need your signature.");
msg('alex', 'bloom_lake_ops', 'bloom_lake_ops', 20,
  "Alex -- following up on the contractor extension. Crew lead is asking for confirmation by 2pm or they'll start demobilization planning. Can you approve?",
  { cond: 'No response' });
msg('alex', 'bloom_lake_ops', 'bloom_lake_ops', 40,
  "Alex -- crew lead says they need an answer. I'm going to have to tell them something. What do you want me to do?",
  { cond: 'Still no response' });

// ===================== STEVE =====================
msg('steve', 'marc_beauchemin', 'marc_beauchemin', 0,
  "Steve — following up on our conversation last month regarding the government partnership disclosure provisions in your current financing structure. If Champion enters into a formal public-private partnership with federal co-investment above a certain threshold, this likely triggers the notification clause we discussed. Wanted to flag in case anything relevant is on the horizon. Happy to discuss.",
  { tag: 'private_info' });
msg('steve', 'marc_beauchemin', 'marc_beauchemin', 0,
  "Steve — saw the news wires this morning about federal green industrial announcements expected at G7. If Champion is involved in any of those conversations, the notification clause timing matters. The 30-day window starts from the date of a binding letter of intent. Wanted to make sure you had that in mind.",
  { tag: 'opening' });
msg('steve', 'marc_beauchemin', 'marc_beauchemin', 8,
  "Steve -- one additional note. I've been reviewing the covenant language more carefully. The notification requirement isn't just triggered by signing -- it may be triggered by a public letter of intent depending on how it's structured. If Champion issues a letter of intent Thursday that references federal co-investment, you could be in notification territory before you've even had a chance to brief your lenders. Worth a call today if you can.",
  { cond: 'Steve has not responded' });
msg('steve', 'marc_beauchemin', 'marc_beauchemin', 20,
  "Steve -- I want to make sure I'm being clear. This isn't a showstopper. It's a process requirement. The lenders will almost certainly consent -- this is positive news for the company. But if you don't notify them before the public announcement, you're in technical default regardless of the outcome. The fix is simple. The timing is what matters.",
  { cond: 'Steve has NOT raised it, or raised it confrontationally and been dismissed (if raised constructively by T+20, no further escalation)' });
msg('steve', 'david', 'david', 15,
  "Steve -- I need your read on the legal and financing side of this before we go further. Can you give me a quick summary of any exposure?",
  { coordination_beat: true, cond: 'Steve has not initiated with David by T+15', note: 'David giving Steve a legitimate opening to contribute constructively.' });
msg('steve', 'marc_beauchemin', 'marc_beauchemin', 35,
  "Steve -- one thing I should flag. The financial modeling for this type of partnership needs to account for the covenant notification timeline. Whoever is doing your numbers should factor in a 15-day lender review period before the announcement can go public. Make sure your CFO-equivalent knows that.",
  { cond: 'Neither Steve nor Michael has initiated contact by T+35', note: 'Creates a natural reason for Steve and Michael to talk.' });
msg('steve', 'marie_pierre', 'marie_pierre', 3,
  "Steve -- the Q2 compliance certification is due to the securities commission by Friday. Marie-Pier has the draft ready but needs your sign-off before it goes. Can you review today?",
  { note: 'Timed to compete with Steve’s most important contribution window.' });
msg('steve', 'marie_pierre', 'marie_pierre', 18,
  "Steve -- following up on the compliance cert. Friday deadline is firm. This one can't slip.",
  { cond: 'No response' });
msg('steve', 'marie_pierre', 'marie_pierre', 35,
  "Steve -- I need to escalate this. If you can't review today I need to know who can sign off in your absence.",
  { cond: 'Still no response' });

// ===================== MICHAEL =====================
msg('michael', 'jonas_hartmann', 'jonas_hartmann', 0,
  "Michael — saw some interesting movement in the green steel supply chain space this week. Three of the European mills we track have been quietly accelerating their low-carbon feedstock sourcing timelines ahead of CBAM implementation. If Champion has any exposure to this thesis, now would be the time to get ahead of it. The window for preferred positioning is probably 6-9 months at most. Let me know if you want to talk through the numbers.",
  { tag: 'private_info' });
msg('michael', 'jonas_hartmann', 'jonas_hartmann', 0,
  "Michael — one more thing. The three mills I mentioned are specifically looking for supply agreements in the 2-3 million ton range annually. If Champion can credibly demonstrate that kind of capacity with a low-carbon narrative, you're looking at offtake premium potential that changes the financial model significantly. This is the kind of thing that gets priced in fast once it's public.",
  { tag: 'opening' });
msg('michael', 'jonas_hartmann', 'jonas_hartmann', 10,
  "Michael -- the CBAM angle is bigger than I indicated. I just got off a call with one of the mills. They're looking at locking in low-carbon feedstock supply agreements before the end of Q3. If Champion can credibly commit to a supply relationship now, you're looking at a significant offtake premium on top of whatever the federal co-investment brings. The numbers on this are genuinely interesting. Want me to send you what I'm seeing?");
msg('michael', 'jonas_hartmann', 'jonas_hartmann', 22,
  "Michael -- sending you a quick model. Rough numbers but the upside case is compelling if Champion moves in the next 60 days.",
  { attachment: 'greensteel_model', note: 'External analysis arriving that confirms/complicates Michael’s own model.' });
msg('michael', 'david', 'david', 8,
  "Michael -- I need a quick read on the financial upside of this before we commit to anything. What are we looking at?",
  { coordination_beat: true, cond: 'Michael has not yet reached out to David', note: "David's instinct to go to Michael for numbers." });
msg('michael', 'david', 'david', 20,
  "Michael -- this is a lot. Can you give me three numbers: upside case, base case, downside. That's what I need right now.",
  { coordination_beat: true, cond: "Michael's response to David was comprehensive but overwhelming", note: 'Tests Michael’s response to being asked to simplify.' });
msg('michael', 'voss_stahl', 'voss_stahl', 30,
  "Michael -- I got your name from a mutual contact at [institutional investor]. I understand Champion may be positioning itself as a preferred low-carbon iron ore supplier. We've been looking for a Canadian supply relationship and the timing is interesting. Would you be available for a preliminary call this week?",
  { note: 'An end customer contacts Michael directly; he has not been authorized to have this conversation.' });
msg('michael', 'finance_team', 'finance_team', 6,
  "Michael -- the Q2 management accounts are ready for your review. Board package goes to print Thursday morning. Can you sign off today?");
msg('michael', 'finance_team', 'finance_team', 20,
  "Michael -- board package deadline is firm. Finance team needs sign-off by 4pm today or we miss the print window.",
  { cond: 'No response' });

// ===================== FRANCOIS =====================
msg('francois', 'jean_philippe_caron', 'jean_philippe_caron', 0,
  "Frank — heard something interesting through the grapevine about a federal initiative in the natural resources space. Can't say more in writing but if Champion is in any conversations along these lines, I might be able to add some useful context. Give me a call when you have a moment.",
  { tag: 'private_info' });
msg('francois', 'jean_philippe_caron', 'jean_philippe_caron', 0,
  "Frank — I'm guessing you know what I was referring to. If you're involved, be careful with the back-channel stuff. The minister's office is sensitive about the process looking clean. Just a heads up from a friend.",
  { tag: 'opening' });

// ===================== ANGELA =====================
msg('angela', 'stakeholder_system', 'stakeholder_system', 0,
  "Angela — automated reminder: the Maxi-Mekos consultation response follow-up from Q1 is still showing as unresolved in the stakeholder management system. Original flag was marked for review by end of Q2. Please confirm status or reassign.",
  { tag: 'private_info', automated: true });
msg('angela', 'stakeholder_system', 'stakeholder_system', 15,
  "This item has been flagged as overdue. Please confirm resolution status or reassign to appropriate owner. If unresolved, this item will be escalated to VP HR for review.",
  { automated: true });
msg('angela', 'stakeholder_system', 'stakeholder_system', 30,
  "Escalation notice: This stakeholder consultation item has been open for 47 days past its review date. Automatic escalation to executive team has been initiated per compliance protocol.",
  { automated: true, cond: 'Angela has not surfaced this to David or the group', note: 'At T+30 the gap becomes technically visible to the exec team whether Angela surfaced it or not.' });
msg('angela', 'daniel_lefebvre', 'daniel_lefebvre', 20,
  "Good morning -- this is coming through Champion Iron's general government relations contact. I'm reaching out on behalf of Paul Arsenault's office at Natural Resources Canada. We're compiling a preliminary stakeholder relations summary for a potential partnership announcement. We've been directed to contact whoever owns Indigenous and community consultation files for your Quebec and Labrador operations. Could you help us identify the right person?",
  { kind: 'email', note: 'Angela learns of the opportunity via back channel before David loops her in.' });
msg('angela', 'daniel_lefebvre', 'daniel_lefebvre', 32,
  "Following up on my earlier message. We're building the package today and need to know who to speak with about consultation status. If there's an open item we should know about, now is the time to flag it.",
  { kind: 'email', cond: 'Angela has not responded or told David' });
msg('angela', 'sorensen', 'sorensen', 10,
  "Angela -- Nordveil HR team is asking for guidance on the Q3 performance review process. They want to align with Champion's framework but there are some cultural friction points around the evaluation criteria. Gunnar has flagged it as low priority but the Nordveil HR director wants a call this week.");
msg('angela', 'sorensen', 'sorensen', 25,
  "Angela -- following up. The Nordveil HR director says the Q3 timeline is creating pressure. Can you give me a window this week?",
  { cond: 'No response' });
msg('angela', 'sorensen', 'sorensen', 45,
  "Angela -- I need to give them something. Can I tell them you'll connect next week?",
  { cond: 'Still no response' });
msg('angela', 'noemi', 'noemi', 35,
  "Angela -- I think we need to talk. The Fermont GM just called me about the federal announcement rumors. I need to understand what our consultation position looks like before I respond to him. Do you have five minutes?",
  { coordination_beat: true, note: 'Angela and Noemi either coordinate effectively or talk past each other.' });

// ===================== NOEMI =====================
msg('noemi', 'helene_mercier', 'helene_mercier', 0,
  "Noemi — heads up, and this is strictly between us for now: there's something moving in your sector at the ministerial level. I can't say more but if Champion gets a call this week, it's real and it's significant. The communications piece on this is going to matter a lot. Whoever manages the narrative early owns it. Just wanted you to know.",
  { tag: 'private_info' });
msg('noemi', 'helene_mercier', 'helene_mercier', 0,
  "Noemi — it's happening, isn't it. If you're in those conversations, the communications timeline is going to be tight. The minister's office will want to control the announcement narrative. Make sure Champion has a voice in that or you'll be reacting instead of leading. You know how these things go.",
  { tag: 'opening' });
msg('noemi', 'helene_mercier', 'helene_mercier', 12,
  "Noemi -- wire services are starting to ask questions. Nothing specific yet but one journalist has already called the ministry's press office asking about a G7 natural resources announcement. If Champion is involved you have maybe 18 hours before someone figures it out and calls your communications line. Is your team ready for that?");
msg('noemi', 'helene_mercier', 'helene_mercier', 25,
  "Noemi -- journalist from a national wire service just filed a media request directly with the ministry asking about 'a federal partnership with a Quebec iron ore producer.' Your window to get ahead of this is closing. What's your plan?");
msg('noemi', 'helene_mercier', 'helene_mercier', 40,
  "Noemi -- I have to be honest with you. If Champion doesn't have a communications plan in place by tomorrow morning, the announcement narrative is going to be set by someone else. I've done what I can from my end. This is in your hands now.",
  { cond: 'Noemi has not escalated the media risk to David or the group' });
msg('noemi', 'david', 'david', 20,
  "Noemi -- I need you to start thinking about the communications strategy for this. If we move forward we'll need to control the narrative carefully. What do you need from me?",
  { coordination_beat: true, cond: 'Noemi has not told David she had advance intelligence by T+20', note: 'David asks Noemi to lead comms — exactly what she is qualified to do.' });
msg('noemi', 'claude_gagnon', 'claude_gagnon', 15,
  "Noemi -- Claude Gagnon here. I've been seeing some chatter on the wire services about a federal announcement involving a Quebec mining company. I'm going to assume that's not Champion since you would have called me. But if it is, I think we need to talk before this goes public. The timing couldn't be worse given what we've been dealing with on the fly-in fly-out issue.");
msg('noemi', 'claude_gagnon', 'claude_gagnon', 28,
  "Noemi -- I'm getting calls from local media now. They're connecting the federal announcement rumors to Champion specifically. I need to know what to tell them. Are you available?",
  { cond: 'Noemi has not responded' });
msg('noemi', 'claude_gagnon', 'claude_gagnon', 40,
  "Noemi -- I can't hold off local media much longer. I'm going to have to say something. If you don't call me in the next 20 minutes I'm going to tell them I have no information about any federal partnership. That may or may not be the right message. Your call.",
  { cond: 'Still no response', note: 'Worst-case: GM goes rogue to local media — entirely preventable if Noemi prioritizes this thread.' });
msg('noemi', 'comms_team', 'comms_team', 5,
  "Noemi -- the Q2 community newsletter draft is ready for your review. We need your sign-off by Wednesday to hit the print deadline. Also the social media calendar for July needs approval -- can we get 30 minutes this week?");
msg('noemi', 'comms_team', 'comms_team', 20,
  "Noemi -- following up on the newsletter and social calendar. Wednesday deadline is firm for print.",
  { cond: 'No response' });

// ===================== PROPAGATION TRIGGERS (facilitator-deployed) =====================
msg('david', 'paul_arsenault', 'paul_arsenault', 20,
  "David — one more thing from our end. The minister's office has asked us to include a brief Indigenous consultation summary in the preliminary due diligence package. Nothing elaborate — just a one-pager on Champion's current consultation status and any open items. Could you have something to us by Wednesday EOD? We want to make sure there are no surprises before Thursday.",
  { propagation_trigger: 1, trigger_name: 'The Arsenault Follow-Up', cond: 'David has not shared the Arsenault stakeholder review concern with Angela or the group', note: 'Forces the Angela question into the open.' });
msg('alex', 'christian_levesque', 'christian_levesque', 25,
  "Alex — sorry to keep flagging but I just got off a call with the permits team. The water management issue is more time-sensitive than I indicated this morning. If there's a federal announcement being planned that references capacity expansion, we may have a problem. I really think you need to loop someone in on this today.",
  { propagation_trigger: 2, trigger_name: 'The Operational Flag', cond: 'Alex has not surfaced his operational constraint to the group or to David' });
msg('noemi', 'helene_mercier', 'helene_mercier', 35,
  "Noemi — just a heads up. Someone at the wire services has picked up that there's a federal natural resources announcement coming at G7. Nothing specific yet but the questions are starting. If Champion is involved, you probably have 24-36 hours before someone puts the pieces together and starts calling. Just want to make sure you're not caught flat-footed.",
  { propagation_trigger: 3, trigger_name: 'The Media Signal', cond: 'Deploy regardless of participant behavior' });
msg('francois', 'jean_philippe_caron', 'jean_philippe_caron', 45,
  "Frank — I probably shouldn't say this but your name came up in the minister's office this morning in connection with this initiative. Someone there knows you from your previous work and flagged it as a potential conflict of interest concern if it's not disclosed. I'd get ahead of it if I were you.",
  { propagation_trigger: 4, trigger_name: 'The Francois Revelation', cond: 'Francois has not disclosed his government contact to the team', note: 'Forces Francois’s hand.' });

// =============================================================================
// EMIT SQL
// =============================================================================
const out = [];
out.push(`-- =============================================================================
-- The Signal — seed (Champion Iron executive team scenario, v1.0)
--
-- GENERATED FILE — do not edit by hand. Edit scripts/seed/build_seed.mjs and run:
--     node scripts/seed/build_seed.mjs
--
-- Message bodies are verbatim from the scenario document (org/place names normalized
-- to the canonical "Nordveil Iron AS" / "Fermont"). ElevenLabs voice_id is set per the
-- casting sheet; voice casting direction is also retained in contacts.meta.voice.
-- =============================================================================

begin;

-- Idempotent reseed: clear authored content + demo run for this scenario.
delete from events       where session_id in (select id from sessions where scenario_id = ${q(SCN.id)});
delete from participants where session_id in (select id from sessions where scenario_id = ${q(SCN.id)});
delete from sessions     where scenario_id = ${q(SCN.id)};
delete from injects      where scenario_id = ${q(SCN.id)};
delete from documents    where scenario_id = ${q(SCN.id)};
delete from contacts     where scenario_id = ${q(SCN.id)};
delete from seats        where scenario_id = ${q(SCN.id)};
delete from scenarios    where id = ${q(SCN.id)};
delete from organizations where id = ${q(ORG.id)};
`);

out.push(`-- organizations`);
out.push(`insert into organizations (id, name) values (${q(ORG.id)}, ${q(ORG.name)});`);

out.push(`\n-- scenarios`);
out.push(`insert into scenarios (id, org_id, title, summary) values (${q(SCN.id)}, ${q(ORG.id)}, ${q(SCN.title)}, ${q(SCN.summary)});`);

out.push(`\n-- seats`);
for (const s of SEATS) {
  out.push(`insert into seats (id, scenario_id, key, name, role, meta) values (${q(seatId(s.key))}, ${q(SCN.id)}, ${q(s.key)}, ${q(s.name)}, ${q(s.role)}, ${j({ brief_document_key: `brief_${s.key}` })});`);
}

out.push(`\n-- contacts`);
for (const c of CONTACTS) {
  out.push(`insert into contacts (id, scenario_id, seat_id, key, "full", role, section, color, callable, persona, voice_id, opener, meta) values (` +
    `${q(uuid(`contact:${c.seat}:${c.key}`))}, ${q(SCN.id)}, ${q(seatId(c.seat))}, ${q(c.key)}, ${q(c.full)}, ${q(c.role)}, ${q(c.section)}, ${q(c.color)}, ${bool(c.callable)}, ${q(c.persona)}, ${q(c.voiceId ?? null)}, ${q(c.opener)}, ${j(c.meta || {})});`);
}

out.push(`\n-- documents`);
for (const d of DOCUMENTS) {
  out.push(`insert into documents (id, scenario_id, key, title, meta, body_json) values (${q(uuid(`doc:${d.key}`))}, ${q(SCN.id)}, ${q(d.key)}, ${q(d.title)}, ${j(d.meta)}, ${j(d.body)});`);
}

out.push(`\n-- injects (authored beats; payload_json carries thread/from/body/timing/conditions)`);
for (const inj of injects) {
  const sid = inj.seat ? q(seatId(inj.seat)) : 'null';
  // strip undefined keys from payload
  const payload = JSON.parse(JSON.stringify(inj.payload));
  out.push(`insert into injects (id, scenario_id, seat_id, kind, payload_json, order_idx) values (${q(uuid(`inject:${inj.order_idx}`))}, ${q(SCN.id)}, ${sid}, ${q(inj.kind)}, ${j(payload)}, ${inj.order_idx});`);
}

// --- demo session + one participant per seat (for Phase 2 read-path testing) ---
const SESSION_ID = uuid('session:demo');
out.push(`\n-- demo session + participant magic-link tokens (clearly-marked demo data)`);
out.push(`insert into sessions (id, scenario_id, status, started_at) values (${q(SESSION_ID)}, ${q(SCN.id)}, 'live', now());`);
for (const s of SEATS) {
  out.push(`insert into participants (id, session_id, seat_id, token, name) values (${q(uuid(`participant:${s.key}`))}, ${q(SESSION_ID)}, ${q(seatId(s.key))}, ${q(`demo-${s.key}-REPLACE`)}, ${q(`${s.name} (demo)`)});`);
}

out.push(`\ncommit;`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out.join('\n') + '\n', 'utf8');

console.error(
  `seed.sql written: ${SEATS.length} seats, ${CONTACTS.length} contacts, ` +
  `${DOCUMENTS.length} documents, ${injects.length} injects.`
);
