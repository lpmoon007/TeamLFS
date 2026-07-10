# World-Class Leadership Simulation — Scenario Authoring Playbook

A reference for building scenarios that feel real enough that an executive forgets
they're in a simulation, makes the decisions they'd actually make under pressure,
and learns something true about themselves. Copy any section into your scenario builder.

---

## 0. First principles (the non-negotiables)

- **Realism over gamification.** Pressure is felt through people and events — never shown as bars, scores, timers, or badges.
- **They play themselves.** There is no character to inhabit. The fiction is their own job, under stress. Write everything in second person, present tense.
- **The platform is invisible; the scenario is everything.** No tooltips, no onboarding overlays, nothing that names the simulation from inside it.
- **Every element earns its place.** If a message, character, or document doesn't create pressure, reveal character, or force a decision — cut it.
- **No clean answers.** If there's an obviously correct move, you've built a quiz, not a simulation.

---

## 1. THE THRESHOLD — the start

The job of the opening is to move the participant across the line from
"I'm doing a training exercise" to "I am in this, now."

**Author these fields:**
- **Role line** — "You are [name], [title] of [company]." One sentence.
- **Company one-liner** — what the company is, in plain terms.
- **World as of T-0** — 2–3 facts that are simply true when they arrive. (e.g. "A confidential acquisition approach is in its final stage.")
- **The cold open** — the first inbound message. It must imply events *already in motion*: a timestamp earlier than now, an inquiry already filed, a call already requested. **Never start from zero.**
- **The hanging question** — the single unresolved thing the participant feels in the first 60 seconds. ("Do I respond to the press before 9:00?")

**Ceremony, briefly.** A deliberate confidential-access moment ("You are entering a confidential exercise. Everything here stays in the room.") earns the immersion. Make crossing the threshold feel intentional, then get out of the way.

**Pitfall:** a tutorial. The first message *is* the onboarding.

---

## 2. THE CURTAIN — the stop

End on a beat, not a fade. Bring them back to reality on purpose, then bridge to reflection.

**Author these fields:**
- **End condition(s)** — a decisive narrative event that closes the window: the story publishes at 9:00, the board convenes, the deal closes or collapses. Time-boxed by *story*, never by a visible clock.
- **Curtain copy** — a brief, system-level message that signals the exercise has ended and reality resumes. Calm, final.
- **Hot-wash prompt (optional)** — 1–2 reflective questions delivered while the experience is still raw, before the formal debrief. ("What were you optimizing for in that last decision?")
- **Exit snapshot** — the state handed to the facilitator/debrief at the moment of close (see §8).

**Pitfall:** letting it trail off. The ending must land as hard as the open.

---

## 3. CHARACTERS — the heart of the thing

This is the single biggest lever. A character is an *agent with wants*, not a reply machine.

**Character sheet template (author one per character):**
```
NAME / ROLE:            
RELATIONSHIP to participant:   (ally, authority, adversary, wildcard)
SURFACE AGENDA:         what they openly want from the participant
HIDDEN AGENDA:          what they actually want
EMOTIONAL BASELINE:     calm / anxious / clipped / warm
SHIFTS WHEN:            stalled → ____ ; contradicted → ____ ; ignored → ____
KNOWS:                  facts they hold
DOESN'T KNOW / SUSPECTS:
TRIGGERS:               conditions that change behavior
                        (e.g. "if no reply in 2 beats, escalate and go around them")
RED LINE:               the thing that makes them turn, disengage, or escalate over the participant's head
VOICE (3 sample lines): show tone, formality, sentence length
```

**The rule that creates tension:** author **at least two characters who want opposite things.**
The Board Chair wants governance and cover; the M&A advisor wants discretion and speed. They pull
in opposite directions on the *same* decision, so consulting both is a dilemma, not a comfort.

**Pitfall:** helpful NPCs. Characters should create friction, not assist. An assistant breaks the simulation.

---

## 4. CONSEQUENCE & BRANCHING — the world reacts

Structure decisions as forks driven by what the participant *means*, not menu buttons.

**Author these:**
- **Decision fulcrums** — 2–4 pivotal moments where an action materially changes the path. (Not every message is a fulcrum; most aren't.)
- **Intent classes** per fulcrum — the meaningful ways a participant can respond. e.g. *Confirm / Deny / Deflect / Silence-by-omission.* Classify their free text into one of these; don't show them options.
- **The cascade** — for each intent, a sequence of beats **across multiple channels and characters.** The reply itself is the *smallest* part. The consequence is *who else reacts*: the board chair calls, the advisor warns, comms scrambles, the situation brief updates. That's the invisible hand of causality.
- **State variables** the scenario reads and writes: `press_posture`, `board_confidence`, `deal_status`, `leak_level`, `legal_exposure`. Beats branch on these.
- **Silence is a choice.** Author what happens if the participant does *nothing* by a deadline. Inaction must have consequences too — the story runs uncontrolled.

**Fulcrum schema (copy into builder):**
```
FULCRUM:        e.g. "Press inquiry before 9:00 deadline"
CHANNEL:        which thread it lives in
INTENT CLASSES: [confirm, deny, deflect, ignore]
  confirm →  effects: deal_status=at_risk, board_confidence−−
             cascade: [press ack] → [situation update] → [board chair: call me now]
                      → [advisor: this jeopardizes the deal] → [comms: need a statement]
  deny →     effects: legal_exposure+, buys_time
             cascade: [press: publishing the denial] → [chair: hold the line]
                      → [advisor: keep it verbal] → [counsel: disclosure risk]
  deflect →  effects: reads_as_confirmation (latent)
             cascade: [press: "declined to comment"] → [advisor: disciplined]
                      → [chair: silence reads as yes]
  ignore →   on deadline: [story publishes uncontrolled] → [chair: where were you?]
```

**Pitfall:** cosmetic branches that converge in one line. A real branch changes the *next ten minutes*.

---

## 5. MULTI-CHANNEL REALISM

Executives operate across modalities. Author the right channel for each beat — the medium *is* the message.

| Channel | Use it for |
|---|---|
| 1:1 message | quick pressure, private asks |
| Group thread (war room) | team dynamics, watching them lead a room |
| Email | formal, longer, a document to approve |
| Call (synchronous) | the highest-pressure asks ("call me before 8") |
| Document / artifact | approve, edit, sign off — an interactive object |
| Voice note | intimacy, urgency, a leak |
| Calendar invite (appears) | an event imposed on them — board convening |

**Rule of thumb:** bad news and pressure **escalate up the formality ladder** — text → call → board convening.

**Pitfall:** everything in one channel.

---

## 6. DIEGETIC PRESSURE — felt, never displayed

Pressure devices that need no UI element:
- **A named deadline inside dialogue** — "we go to print at 9:00."
- **Interruption** — a message lands while they're mid-reply.
- **Concurrency** — two people need them at the same moment.
- **Withdrawal** — a character who goes silent; absence as pressure.
- **Escalating cadence** — messages arrive faster as the crisis deepens.
- **Information scarcity** — they must act without the full picture.

**Pitfall:** countdowns, timers, progress bars, act badges. Never *name* the pressure — manufacture it.

---

## 7. THE CONTROL ROOM — the facilitator layer

(You're building this separately — captured here for completeness.) The hidden operator side:
live inject control, the ability to hand-drive a character, observe in real time, pause, override a
branch, and tag moments for the debrief. **Author "facilitator notes" per beat:** what to watch for,
when to nudge, and any optional manual injects.

---

## 8. CAPTURE & DEBRIEF — where the ROI lives

The client isn't paying for the 90 minutes; they're paying for the after-action review.
The participant UI hides all of this — the platform captures it silently.

**Capture per session:**
- Every decision point and the choice made
- **Timing / latency** — how long they took, where they hesitated
- **Who they consulted vs. ignored** — and in what order
- **The exact language they used** under pressure (verbatim)
- Channel choices — did they call, write, or go silent
- Whether they sought counsel before acting

**Debrief artifacts to generate:**
- A **timeline replay** of the session
- A **"what others did"** comparison against peers/benchmarks
- **3–5 leadership themes** surfaced (decisiveness, stakeholder management, communication under pressure, ethical posture)
- Self-reflection prompts tied to their actual moves

**Author per scenario:** the **3–5 competencies this scenario is designed to reveal**, and the
**observable behaviors** that map to each. (This is what makes the debrief feel custom, not generic.)

**Pitfall:** scoring the participant *inside* the experience. Assessment is for the debrief, always.

---

## 9. PERSONALIZATION TO THE ORG

The more it smells like their real life, the more real their decisions.

**Author hooks:**
- Org structure that mirrors theirs — titles, team names, reporting lines
- An **industry-accurate** crisis with the right vocabulary, regulators, competitor archetypes
- A scenario aimed at **their known strategic vulnerability**
- Real geographies, real-sounding counterparties, internal language

**Pitfall:** a generic crisis. The bespoke scenario *is* the product.

---

## 10. ETHICAL & EMOTIONAL TEXTURE — the dilemma

World-class scenarios test character, not just competence.

**Author into every scenario:**
- **A genuine dilemma** — two defensible options, each with a real cost. (Loyalty vs. transparency; speed vs. diligence; protect people vs. protect the deal.)
- **Human stakes** — livelihoods, trust, reputation. Not just numbers on a term sheet.
- **A moment that reveals who they are** when no one is grading and there's no right answer.

**Pitfall:** an optimal path. If a smart participant can "win," the dilemma isn't real.

---

## Scenario data model (mirror this in your builder)

```
SCENARIO
├── meta: title, org, target competencies [3–5]
├── entry:   role line, company line, T-0 world state, cold open, hanging question
├── exit:    end condition(s), curtain copy, hot-wash prompts, capture spec
├── characters[]: { sheet from §3 }
├── state_variables[]: { name, type, default }
├── channels[]: message | group | email | call | document | voicenote | calendar
├── beats / injects[]:
│     { id, trigger (time | state | participant_action),
│       channel, sender, content, effects (state writes),
│       facilitator_note }
└── fulcrums[]:
      { prompt, channel, intent_classes[],
        per_intent: { effects, cascade: [beat_ids] },
        silence_path }
```

---

## One-page authoring checklist

- [ ] T-0 world state + cold open written (starts mid-motion)
- [ ] Confidential threshold / entry ceremony
- [ ] Hard end condition + curtain copy + hot-wash
- [ ] 4–7 characters with agendas, voices, triggers, red lines
- [ ] **At least two characters in direct opposition**
- [ ] 2–4 decision fulcrums with intent classes + cross-channel cascades
- [ ] State variables defined and written by beats
- [ ] **Silence / inaction paths authored**
- [ ] Correct channel assigned to every inject
- [ ] Diegetic pressure devices placed (zero timers/scores)
- [ ] 3–5 target competencies + observable behaviors mapped
- [ ] Capture plan + debrief artifacts specified
- [ ] One genuine no-clean-answer dilemma at the core
