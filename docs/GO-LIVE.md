# Go-Live Runbook — The Signal / TLFS

Ordered, copy-pasteable steps to take the full build live on **Vercel + Supabase**.
Follow top to bottom. `DEPLOY.md` is the reference for individual pieces; this is the
sequence. Everything from this build is on branch `claude/inspiring-brahmagupta-jh9lvy`.

**What goes live:** the team app (The Signal), all 9 solo scenarios, the facilitator
console (team + solo), the AI referee/advisors/voice, the Director-AI (Vercel Cron), the
Behavioral Memory Spine (AI coder + cross-session profile + LDOL lens), and the re-score
+ human-coding surfaces.

---

## 0. Prerequisites (one-time)

- Vercel project connected to the GitHub repo, Production branch = `main`.
- A Supabase project (you have `zoxyfwjdtzdqlcfcwlvx`). Have the **DB password** and
  the **service-role key** handy.
- `psql` locally (or use the Supabase SQL editor for the `.sql` files).
- Vercel **Pro** if you want the Director to tick every 2 min (Hobby crons run daily).

---

## 1. Merge to `main`

```bash
git checkout main && git pull
git merge claude/inspiring-brahmagupta-jh9lvy
git push origin main
```

Vercel auto-builds `main`. Let it finish (CI runs the type-check/build). Don't hand out
any links until the DB steps below are done.

---

## 2. Environment variables (Vercel → Settings → Environment Variables)

You said these are already set — verify all **8** are present for **Production**:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser Realtime/auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client |
| `SUPABASE_SERVICE_ROLE` | server writes (the whole privileged path) |
| `ANTHROPIC_API_KEY` | referee, advisors, voice, **AI coder**, Director |
| `ELEVENLABS_KEY` | voice TTS |
| `FACILITATOR_SECRET` | facilitator console + manual endpoints |
| `CRON_SECRET` | Vercel Cron → Director tick auth |

Optional model overrides (`VOICE_MODEL`, `SOLO_MODEL`, `SCORER_MODEL`,
`ELEVENLABS_MODEL`) — leave unset to use the defaults in `lib/env.ts`.

> Without `ANTHROPIC_API_KEY` the app still runs but every AI path falls back
> (deterministic referee, heuristic coder). With it set, everything is live.

---

## 3. Database — schema + scenarios

Set once:

```bash
DB="postgresql://postgres:<DB_PASSWORD>@db.zoxyfwjdtzdqlcfcwlvx.supabase.co:5432/postgres"
```

### Path A — clean project (recommended)

`deploy/bootstrap.sql` resets the `public` schema, applies **migrations 0001–0012**, and
seeds the **team** scenario ("The Signal") — voices included (they live in the seed).

```bash
psql "$DB" -f deploy/bootstrap.sql
```

Then seed the solo scenarios you want live:

```bash
for s in backlash exodus handover overdrive squeeze shockwave colony expedition vault; do
  psql "$DB" -f "supabase/solo_seed_${s}.sql"
done
```

> `bootstrap.sql` **drops the public schema first**. That's fine here — nothing was
> hand-entered outside the seed (the ElevenLabs voice IDs are regenerated from the seed).
> If in doubt, take a Supabase backup first.

### Path B — existing data you must keep

Apply only the migrations your live DB doesn't have yet (0009–0012 are all additive —
`create table` / `add column if not exists`), then the solo seeds. Do **not** re-run
`seed.sql` if the team scenario is already seeded.

```bash
for m in 0009_solo_engine 0010_run_config 0011_cross_session_spine 0012_trait_score_note; do
  psql "$DB" -f "supabase/migrations/${m}.sql"
done
for s in backlash exodus handover overdrive squeeze shockwave colony expedition vault; do
  psql "$DB" -f "supabase/solo_seed_${s}.sql"
done
```

### Verify

```sql
-- 12 migrations' worth of tables present, 6 solo scenarios + 1 team
select mode_default, count(*) from scenario_meta group by 1;          -- solo | 9
select count(*) from scenarios;                                       -- 10 (9 solo + The Signal)
select to_regclass('public.subjects'), to_regclass('public.rulings'); -- both non-null
```

---

## 4. Deploy check

Open the production URL. You should see the app. Quick health checks:

- `GET /` loads.
- `/facilitator` → sign in with `FACILITATOR_SECRET` → the session list shows the team
  session (**team** badge) and the 9 solo sessions (**solo** badge).

---

## 5. Vercel Cron — the Director

`vercel.json` already registers the cron (`/api/cron/director`, every 2 min). After the
first deploy:

- Vercel → your project → **Settings → Cron Jobs** → confirm `/api/cron/director` is
  listed and enabled. (Vercel signs it with `CRON_SECRET` automatically.)
- The Director is **off per session by default** — turn it on in the console (Step 6) for
  any session you want auto-paced. Until then, injects fire only manually.

Manual tick (for testing, no cron needed):

```bash
curl -s -X POST "$APP_URL/api/facilitator/director" \
  -H "Authorization: Bearer $FACILITATOR_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"<session-uuid>","dryRun":true}' | jq
```

---

## 6. Smoke test (≈10 min, using the demo sessions)

Demo sessions are seeded **live** with `demo-*-REPLACE` tokens — perfect for a dry run
before real participants. Get ids/tokens:

```sql
select s.id as session_id, sc.title, p.token
from sessions s join scenarios sc on sc.id=s.scenario_id
join participants p on p.session_id=s.id and p.token is not null
order by sc.title;
```

Walk each surface:

1. **Team participant** — open `/s/<signal-session>?t=demo-david-REPLACE`. Accept the
   disclaimer, send a message to a teammate, open an email, place a call (voice loop).
2. **Solo CEO** — open `/solo/<backlash-session>?t=demo-backlash-ceo-REPLACE`. Watch the
   week clock, reach out to an advisor (in-character reply), write a decision → the
   referee rules it. Advance weeks → **debrief** with the game-film + **LDOL lens**.
3. **Facilitator console** — `/facilitator/<signal-session>`: fire an inject, flip a seat
   to **AI** (it replies on its own), toggle the **Director** on and Run tick.
4. **Finalize → debrief → spine** — End the team session; open the debrief, drill into a
   participant's game-film (LDOL disciplines + trait scores). Try **Code these traits →**
   (blind human coding) and the re-score harness:
   ```bash
   curl -s -X POST "$APP_URL/api/facilitator/rescore" \
     -H "Authorization: Bearer $FACILITATOR_SECRET" \
     -d '{"sessionId":"<signal-session>"}' | jq '.agreement'
   ```

If all four work, you're live-ready.

---

## 7. Run a real session

**Use the console.** On `/facilitator`, click **+ New session** → pick a scenario (and,
for solo, the disposition) → **Create session**. This makes a fresh **live** session with
random per-seat magic links and the right casting (team: every seat human; solo: 1 human
CEO + AI advisors). Copy each link from the panel and hand them out, or **Open console →**
to run it. The seeded `demo-*` sessions stay untouched.

- Team: each seat gets `https://<app>/s/<session>?t=<token>`
- Solo CEO: `https://<app>/solo/<session>?t=<token>`

> **SQL fallback** (if you prefer): insert a `sessions` row (`status='live'`, the
> `scenario_id`) + one `participants` row per seat with a random token
> (`replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')`);
> for solo, set the CEO seat `cast_kind='human'` (with token) and advisors `cast_kind='ai'`
> (no token). Or rotate a demo session's `demo-*-REPLACE` tokens the same way.

Before the run:
- **Solo:** in the facilitator solo console, set the **disposition** dial (or **Surprise**
  to let the spine resolve it from the CEO's history — needs ≥2 prior sessions to differ).
- **Team:** toggle the **Director** on (+ AI) if you want the sim to pace itself; otherwise
  fire injects manually.
- Set `started_at` so the Director's `T+` clock is anchored (the seed's demo session may
  need `update sessions set started_at = now() where id='<uuid>';`).

---

## Known gaps & notes

- **Demo tokens are `*-REPLACE`** and guessable — never use the seeded demo sessions for
  real participants. Use **+ New session** (Step 7), which mints random tokens.
- **Minute-level cron needs Vercel Pro.** On Hobby, the Director cron runs at most daily;
  use the manual **Run tick** in the console meanwhile.
- **Disposition-from-history and the Learning lens** only light up once a person (matched
  by email/name) has **≥2** finished sessions — expected to read "one session" at first.
- **Traits are v0.1 hypotheses.** The debrief marks them not-yet-validated; run the
  human-coding surface + re-score harness before treating any trait as a client claim.
- **The AI coder runs once per participant at finalize.** Fine at current scale; batch it
  if you later run many concurrent sessions.

---

## Rollback

- **App:** Vercel → Deployments → promote the previous good deployment.
- **DB:** migrations 0009–0012 and the solo seeds are additive; to remove a solo scenario,
  delete its `scenarios` row (cascades). Restore from a Supabase backup if you took one
  before Step 3.
