# Deploy — The Signal (Supabase + Vercel)

The stack is **Vercel** (the Next.js app + server actions + API routes) talking to
**Supabase** (Postgres + Realtime + Auth). Everything is in this repo; deploying is
provisioning the two services and setting env vars.

## 0. Prerequisites you (the account owner) provide

These require *your* accounts — they can't be created from CI without your tokens:

| # | Thing | Where |
|---|---|---|
| 1 | A **Supabase project** | supabase.com → New project. Note: project ref, project URL, anon key, **service_role** key, and the **database password**. |
| 2 | A **Vercel project** linked to this GitHub repo | vercel.com → Add New → Project → import `lpmoon007/TeamLFS`. |
| 3 | **ANTHROPIC_API_KEY** and **ELEVENLABS_KEY** | for the voice loop (Phase 6). |
| 4 | A **FACILITATOR_SECRET** | any strong random string (guards the facilitator/inject/debrief surfaces). |

## 1. Supabase — apply the schema + seed

```bash
npm i -g supabase              # or: brew install supabase/tap/supabase
supabase login                 # opens browser for your access token
supabase link --project-ref <YOUR_PROJECT_REF>

# apply all migrations to the hosted DB
supabase db push

# seed the scenario ONCE (db push does not run seed.sql on a remote project)
psql "postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  -f supabase/seed.sql
```

Notes:
- Migration `0003_realtime.sql` adds the live tables to the `supabase_realtime`
  publication; Realtime is on by default.
- RLS is default-deny for the browser; all privileged reads/writes go through the
  service role server-side (§2A). No extra RLS config needed.
- To regenerate `seed.sql` after editing the scenario: `npm run seed:build`.

## 2. Vercel — set env vars + deploy

In the Vercel project → Settings → Environment Variables, add:

| Variable | Value | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | public (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | public (browser) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | server |
| `SUPABASE_SERVICE_ROLE` | Supabase **service_role** key | **server only** |
| `ANTHROPIC_API_KEY` | your Anthropic key | server only |
| `ELEVENLABS_KEY` | your ElevenLabs key | server only |
| `FACILITATOR_SECRET` | your strong random string | server only |
| `VOICE_MODEL` *(optional)* | default `claude-opus-4-8` | server |
| `ELEVENLABS_MODEL` *(optional)* | default `eleven_turbo_v2_5` | server |

Then **Deploy** (Vercel auto-builds `npm run build` on push to the branch). No
`vercel.json` is required — the framework preset is Next.js.

## 3. Post-deploy — run a session

1. In Supabase (or via SQL), a `sessions` row + `participants` rows already exist from
   the seed (a demo session with one token per seat).
2. Each participant link: `https://<your-vercel-domain>/s/<sessionId>?t=<token>`
   (the demo tokens are `demo-<seat>-REPLACE` — replace with real random tokens for a
   real run).
3. Facilitator: `https://<your-vercel-domain>/facilitator` → enter `FACILITATOR_SECRET`
   → control the session, fire injects, hand-drive NPCs, then **End session**.
4. Debrief: `https://<your-vercel-domain>/facilitator/debrief/<sessionId>` (team →
   game-film → One Wall).

## Local development (full stack, no cloud)

Docker required. Boots Postgres + PostgREST + Realtime + Auth + Studio locally:

```bash
supabase start                 # prints local URL + anon/service keys
supabase db reset              # applies migrations/ then seed.sql
cp .env.example .env.local     # fill NEXT_PUBLIC_* + SUPABASE_* from `supabase start`
npm run dev                    # http://localhost:3000
```

`supabase status` reprints the local keys; `supabase stop` tears it down.

## make.com (later)

The inject endpoints are the integration seam: `GET /api/facilitator/injects` and
`POST /api/facilitator/fire-inject` (both `Authorization: Bearer <FACILITATOR_SECRET>`).
make.com fires beats on a schedule/condition against the same endpoints a human uses.
