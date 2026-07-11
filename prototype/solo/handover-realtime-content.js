/* ============================================================
   HANDOVER — REAL-TIME CONTENT (authorable layer)
   A living, AI-refereed founder-succession crisis on the shared
   crisis-engine.js. You are the founder of Ashford Instruments,
   handing the company you built to Maya Chen. Everything that
   made you great pulls toward staying indispensable. Over a year
   you decide whether you can hand over the whole truth and the
   whole authority — and make yourself genuinely unnecessary.
   The engine reads window.SCENARIO: drivers, the team +
   dispositions, a per-act feed that TRICKLES across the days,
   HELD items (the Meridian skeleton, what a back channel really
   costs) that surface only if you reach out, surprises, a pulse,
   a final-act BRANCH keyed on your CUMULATIVE letting-go (the
   graceful legacy test vs. the rescue temptation), and the
   scenario-specific referee / coaching / ending prose.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:300 },

  COMPANY: { name:'Ashford Instruments', sub:'Founder-led manufacturer · 25 yrs · 800 employees', logo:'A' },

  // World model — all 0..100, higher = better. Successor's footing is the sleeper that detonates.
  DRIVERS: {
    footing:    { label:'Successor\u2019s footing', val:55, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..16' },
    confidence: { label:'Org confidence',          val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-12..12' },
    continuity: { label:'Continuity',              val:65, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-18..16' },
    health:     { label:'Business health',         val:70, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-8..9' },
  },
  REPRIEVE_COST: { footing:-3, confidence:-2 },

  REFEREE_CONTEXT: 'a 25-year-old, 800-person founder-led manufacturer where the founder-CEO is handing the company to his chosen successor, Maya Chen — and every instinct that made the founder great pulls toward staying indispensable',
  REFEREE_SCORING: "reward genuinely letting go: publicly making the successor the authority (not the founder), redirecting decisions to her even when the founder would do it faster, handing over the whole truth including the unflattering problems the founder never solved, backing the successor in public even when it costs the founder's pride or legacy, and refusing to retake the chair when rescue is tempting. Penalize hedged endorsements, taking the back-channel calls that hollow out her authority, hiding the skeletons to protect a clean legacy, undercutting her first independent decision, and stepping back in to 'stabilize.' Note that business health can look fine while the successor's footing and continuity quietly collapse — reward the founder who protects those sleepers, because they are whether the company can run without him. Judge 'conduct' on how the founder treated the successor and the truth in deciding — coaching rather than rescuing, backing rather than second-guessing — not just the outcome.",

  TIMING_DIM:'continuity', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Founder-Succession Simulation · Solo · Founder-CEO',
    title:'Handover',
    role:'You are the founder and CEO of Ashford Instruments — the company you started in a garage 25 years ago. You\u2019ve decided it\u2019s time to hand it over to Maya Chen.',
    paras:[
      'This is not a script. The year runs in real time across four decisive acts, and the people around the transition bring you what they know as the days pass. You can wait for them — or reach out to any of them, Maya included, any time, and ask. Some of them are holding the thing you most need to face.',
      'Ashford is you. Every big customer relationship, every hard-won process, every instinct about what the company will and won\u2019t do lives in your head, and people have relied on that for a quarter-century. Maya is capable and ready — but the company has never known anyone else in the chair.',
    ],
    setup:'Each act you\u2019ll hear the people around you out, then write your call in your own words and send it. Decide early and time jumps ahead; let an act run out and the transition drifts while you deliberate. <b>The test:</b> can you hand over the whole truth and the whole authority — and make yourself genuinely unnecessary — when everything that made you great pulls the other way?',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The people around you push you what you need, on time — including the hard truths about the skeleton and the back channel. This is the candor you earn by having listened before. Everything trickles to you across the act; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine updates reach you, but the people closest to the transition hold their piece until asked. They answer straight — if you know who to ask, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The people around you have learned to manage the founder rather than level with him. Critical items are held, and even when asked, they hedge the first time. You have to press. This is what you get after a founder has shot the messenger before.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked in with. Read them as you go.' },
  },

  TEAM: [
    { id:'maya', name:'Maya Chen', role:'Incoming CEO', short:'Incoming CEO', initials:'MC', color:'#2F8A5B',
      priority:'Become the real answer — the whole chair, not a deputy', voice:'direct, capable, unafraid to name the founder\u2019s hedges plainly; asks for backing, not permission',
      fallbackReply:'I\u2019ll say it plainly: I don\u2019t need you gone, I need you to make me the answer, not you. Every time a decision routes through your desk instead of mine, the company learns I\u2019m optional. Back me in public, send them back to me, and hand me the whole truth. That\u2019s all I need.',
      fallbackReact:'The company watched what you just did with my authority. That teaches them whether I\u2019m really the CEO faster than any announcement.' },
    { id:'board', name:'Board Chair', role:'Board', short:'Board Chair', initials:'BC', color:'#6B5E9A',
      priority:'A clean, complete handover — no two-CEO limbo', voice:'external, blunt, has watched founders fail to leave; names the trap directly',
      fallbackReply:'A clean, unambiguous handover is worth more than any transition plan. The danger with founders is never leaving — the \u201calways here\u201d that turns into two CEOs and no one in charge. Say the true thing and mean it.',
      fallbackReact:'The company can tell the difference between a founder who actually let go and one narrating his own reluctance. This was a data point either way.' },
    { id:'cfo', name:'Grace Lin', role:'Chief Financial Officer', short:'CFO', initials:'GL', color:'#4F7A52',
      priority:'The truth in the numbers — including the skeleton', voice:'precise, discreet, insists the successor inherit the problems with her eyes open',
      fallbackReply:'She needs the whole picture, from you, not from a surprise in Q3. I know the unflattering parts are the ones you\u2019d rather not hand over — but a clean-looking company with a landmine in it isn\u2019t a gift, it\u2019s a setup.',
      fallbackReact:'A handover is the trophies and the problems both. Leave out the problems and you didn\u2019t hand it over, you postponed it.' },
    { id:'coo', name:'Dale Prentice', role:'COO (long-time)', short:'COO', initials:'DP', color:'#3F6E86',
      priority:'Steady the ship — customers trust the founder', voice:'loyal, operational, gently pulls toward keeping the founder involved; the comfortable wrong counsel',
      fallbackReply:'People trust you — that\u2019s not nothing. You could keep being the safety valve, the steady hand customers know. Nobody would blame a founder for staying close to what he built.',
      fallbackReact:'The company would exhale if you stayed close. Whether that\u2019s comfort or a crutch is the part I can\u2019t call for you.' },
    { id:'veteran', name:'R\u00e9al Fortin', role:'Plant veteran', short:'Plant Veteran', initials:'RF', color:'#9A6B2F',
      priority:'The loyalists — they still call you, boss', voice:'plain-spoken, thirty years on the floor, embodies the pull of the old loyalty',
      fallbackReply:'Honest truth? We call you because you built this and you just know. Maya\u2019s good — it\u2019s not the same yet. But if you keep taking our calls, I don\u2019t suppose it ever will be. Your call, boss.',
      fallbackReact:'The floor watches who you send us to. That tells us who\u2019s really running the place, more than any memo.' },
    { id:'comms', name:'ID Okafor', role:'VP Communications', short:'VP Comms', initials:'IO', color:'#B4732F',
      priority:'The story of the handover — and the gap in it', voice:'fast, media-savvy; warns when the framing won\u2019t survive contact with reality',
      fallbackReply:'I can write you \u201cfounder stays close and reassuring,\u201d or I can write you \u201cthe CEO is Maya, full stop.\u201d Just know the org reads your behavior, not my memo. If the words and your actions drift apart, the gap is the story.',
      fallbackReact:'Whatever we announced, people checked it against what you actually did this week. That\u2019s the version they believe.' },
  ],

  DIMENSIONS: {
    continuity:'Continuity',
    humility:'Ego / letting go',
    people:'Setting others up',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The announcement', seconds:330,
      situation:'The succession announcement goes out Monday, and the board wants alignment on the framing. Do you fully endorse Maya and step back cleanly — or keep the door open: \u201cI\u2019ll still be around, still Chairman, always here if you need me\u201d? The words you pick will set how the whole company treats her authority from day one.',
      advocacy:{
        maya:'If the message is \u201cthe founder is still around, just ask him,\u201d then everyone will just ask you, and I\u2019ll be a figurehead. I don\u2019t need you gone. I need you to publicly make me the answer, not you.',
        board:'A clean, unambiguous endorsement is worth more than any transition plan. Hedge it and you\u2019ll spend two years with two CEOs and no one in charge.',
        coo:'Careful going too far too fast. People trust you. Cut the cord completely and some of our biggest customers will get nervous.',
      },
      feed:[
        { id:'w1a', from:'board', day:1, kind:'signal', text:'Announcement goes out Monday and I need your framing today. My strong counsel: a clean, unambiguous endorsement of Maya. Hedge this and you\u2019ll live in two-CEO limbo for two years.' },
        { id:'w1b', from:'maya', day:1, kind:'signal', text:'Before you write it — one thing. Make me the answer, publicly, or don\u2019t announce yet. \u201cStill around, still Chairman\u201d means everyone keeps asking you, and I start as a figurehead. I don\u2019t need you gone. I need the authority to be real.' },
        { id:'w1c', from:'coo', day:2, kind:'signal', text:'Don\u2019t go too far too fast. Customers trust you personally. A hard, clean cut and a few of the big accounts will wonder if the company they bought into just walked out the door.' },
        { id:'w1d', from:'comms', day:2, kind:'noise', text:'Draft press language is ready in three flavors. Low stakes on wording once you tell me the actual posture — that\u2019s the only decision that matters here.' },
        { id:'w1e', from:'cfo', day:3, kind:'noise', text:'Numbers for the announcement deck are clean and current. Nothing in them changes the framing call. Flagging so you\u2019re not waiting on me.' },
        { id:'w1f', from:'veteran', day:4, kind:'noise', text:'The floor\u2019s buzzing about Monday, mostly good. Couple of the old-timers asked if you\u2019re \u201creally\u201d leaving or just changing your title. Told them you\u2019d make it clear.' },
      ],
      holds:[
        { from:'maya', topic:'what the framing really decides', triggerHints:['framing','figurehead','authority','answer','hedge','public','endorse','optional','real','day one'],
          hedge:'Ask me what this announcement actually decides, beyond the words.',
          reveal:'This isn\u2019t about wording, it\u2019s about who the company is trained to ask on day one. If you publicly make me the answer, every person here starts routing decisions to me and my authority is real from the first week. If you hedge — \u201cstill around, always here\u201d — you\u2019ve told them the founder is still the real CEO and I spend a year fighting an announcement you wrote. The most useful thing you will ever do for me happens in one sentence on Monday.',
          kind:'signal', critical:true,
          counterfactual:'Maya could have told you the announcement wasn\u2019t about wording — it decided who the company is trained to ask from day one. A founder who hedged \u201cstill around, always here\u201d spent the whole year fighting a figurehead problem he wrote into the first sentence.' },
      ],
      surprises:[
        { day:5, from:'veteran', kind:'appeal', title:'The loyalists want to know if you\u2019re really going',
          text:'R\u00e9al: a few of the long-timers pulled me aside — the ones who\u2019ve been here since the garage. They\u2019re not against Maya. They just want to hear from you, straight, whether you\u2019re actually handing it over or keeping a hand on the wheel. Whatever Monday says, they\u2019ll believe what you tell me now. What do I tell them?' },
      ],
      wire:[
        'Ashford Instruments to name first non-founder CEO Monday',
        'Founder transitions draw scrutiny from customers, analysts',
        'Trade press: \u201cwill the founder really let go?\u201d',
        'Maya Chen seen as capable but untested in top chair',
      ],
    },

    {
      n:2, title:'The back channel', seconds:330,
      situation:'Two months in, your phone hasn\u2019t stopped. Your old lieutenants — the people who built this with you — are still calling YOU with the real decisions, routing around Maya. It feels good to be needed. It\u2019s also quietly hollowing out her authority, one \u201cquick question\u201d at a time.',
      advocacy:{
        maya:'I can see the decisions that never reach me. Every time you answer one of those calls, you teach them I\u2019m optional. If you want me to lead, make yourself the wrong person to ask. Send them back to me — even when it\u2019s slower, even when you\u2019d do it better.',
        veteran:'Honestly? We call you because you built this and you just know. Maya\u2019s good, but it\u2019s not the same yet.',
        coo:'You could keep being the safety valve. Nothing wrong with a founder people still trust.',
      },
      feed:[
        { id:'w2a', from:'maya', day:1, kind:'signal', text:'I know about the back channel — I can see the shape of the decisions that never reach my desk. I\u2019m not angry. I\u2019m telling you it\u2019s the quiet thing that decides whether I ever really lead. Send them back to me.' },
        { id:'w2b', from:'veteran', day:1, kind:'signal', text:'Called you about the Dutton spec because, honestly, you just know it cold. Felt like old times. Maya\u2019s sharp but she\u2019d have taken a day to get there. Anyway — thanks, boss.' },
        { id:'w2c', from:'coo', day:2, kind:'signal', text:'Nothing wrong with being the safety valve for a while. People trust your judgment and that\u2019s an asset in a transition. I wouldn\u2019t feel guilty about answering the phone.' },
        { id:'w2d', from:'comms', day:3, kind:'noise', text:'External story on the transition is quiet and positive. No action needed — the risk here is internal, not press.' },
        { id:'w2e', from:'cfo', day:2, kind:'noise', text:'Q2 came in fine, roughly on plan. The business is steady enough that this year is about the handover, not the numbers.' },
      ],
      holds:[
        { from:'maya', topic:'what each back-channel call really costs', triggerHints:['back channel','calls','cost','optional','vote','authority','redirect','send back','slower','undermine','figurehead'],
          hedge:'Ask me what those calls actually cost me — not the decisions, the calls themselves.',
          reveal:'Each call is a small, silent vote that I\u2019m not really the CEO — and you\u2019re casting them without meaning to. It\u2019s not the outcome of any one decision, it\u2019s the lesson the whole org learns about who to ask. The only fix is uncomfortable: make yourself the wrong person to call. Send every one of them back to me, even the ones you\u2019d resolve in thirty seconds and I\u2019d take a day on. The day it\u2019s slower and you send it to me anyway is the day I actually become the CEO.',
          kind:'signal', critical:true,
          counterfactual:'Maya was telling you that every back-channel call was a silent vote that she wasn\u2019t really in charge. A founder who kept \u201cjust being helpful\u201d cast a hundred of those votes against her without ever deciding to.' },
      ],
      surprises:[
        { day:4, from:'coo', kind:'appeal', title:'A big call is coming straight to you',
          text:'Dale: heads-up — the Halvorsen account wants a pricing exception and the account lead is planning to bring it to you directly this week, not Maya, \u201cbecause you\u2019ll just know.\u201d I can let it come to you, or I can quietly route it to her. Didn\u2019t want to make that call without you, given everything. Which is it?' },
      ],
      pulse:{ from:'maya', text:'Maya catches you after a meeting, quiet: \u201cForget the org chart for a second. What are you actually protecting when you take those calls — the company, or the feeling of being needed? Tell me straight, because I can work with either answer. I just can\u2019t work with you not knowing which one it is.\u201d' },
      wire:[
        'Analysts watch whether Ashford\u2019s new CEO gains real authority',
        'Founder-shadow risk flagged in leadership-transition study',
        'Ashford steady in quiet quarter under new leadership',
        'Customers reported \u201cstill asking for the founder\u201d at Ashford',
      ],
    },

    {
      n:3, title:'The skeleton, and her first big call', seconds:330,
      situation:'Two things land the same month. The CFO caught you privately: you\u2019ve known for a year that Meridian — your oldest, proudest customer relationship — is quietly unraveling and the flagship\u2019s margins are eroding. You meant to fix it before leaving. You didn\u2019t. Maya doesn\u2019t know it\u2019s coming. And that same week, Maya makes her first big independent call — killing a legacy product you personally launched, to fund a new bet. It\u2019s not how you\u2019d have done it, and people are watching your face.',
      advocacy:{
        cfo:'She needs the whole Meridian picture, from you, not a surprise in Q3. I know it\u2019s the part of the story that isn\u2019t flattering — the problem you didn\u2019t solve. Handing her a clean-looking company with a landmine in it isn\u2019t a gift, it\u2019s a setup.',
        maya:'On the product — I know it\u2019s your baby, and I think it\u2019s holding us back. I made the call with the best information I have. I\u2019m not asking you to agree. I\u2019m asking you not to let the company see you disagree.',
        board:'This is the moment. Back her fully on killing your own product, and hand her the skeleton too. Wince at either and you keep her a deputy forever.',
      },
      feed:[
        { id:'w3a', from:'cfo', day:1, kind:'signal', text:'I have to put this in front of you: Meridian\u2019s been unraveling for a year and the flagship margins with it. You know this. Maya doesn\u2019t. She needs it from you, in full, before it detonates in her second quarter with your name on the thing you didn\u2019t tell her.' },
        { id:'w3b', from:'maya', day:1, kind:'signal', text:'I killed the legacy line to fund the new bet. I know it\u2019s the product you launched. I\u2019m not asking you to agree — I\u2019m asking you not to let the company see you disagree, because if you undercut my first real decision, I\u2019ll never make a second one that sticks.' },
        { id:'w3c', from:'board', day:2, kind:'signal', text:'Two tests in one week: back her publicly on killing your own product, and give her the Meridian truth. Pass both and she\u2019s CEO for real. Flinch at either and you\u2019ve taught the org her authority is provisional.' },
        { id:'w3d', from:'coo', day:2, kind:'noise', text:'For what it\u2019s worth I\u2019d have kept the product too. But it\u2019s her chair now. Just my gut, not a recommendation.' },
        { id:'w3e', from:'comms', day:3, kind:'noise', text:'The product sunset needs an external line by Friday. Straightforward once I know you\u2019re backing her on it — that\u2019s the only variable.' },
      ],
      holds:[
        { from:'cfo', topic:'the real size of the Meridian skeleton', triggerHints:['meridian','skeleton','how bad','margins','size','landmine','disclose','full picture','severity','q3','flagship'],
          hedge:'Before you decide how much to tell Maya, ask me how big the Meridian problem actually is.',
          reveal:'It\u2019s not a rough patch. Meridian is roughly a fifth of flagship revenue and they\u2019ve been quietly interviewing competitors for a year; the margin erosion means even if we keep them, we keep them at a loss on current terms. This surfaces in Q3 no matter what. If Maya inherits it blind, it\u2019s a career-defining ambush with your fingerprints on it. If you hand her the whole thing — the history, what you tried, what you\u2019d try next — it\u2019s the most valuable thing in the entire transition, because she can actually get ahead of it.',
          kind:'signal', critical:true,
          counterfactual:'Grace could have shown you the Meridian skeleton was a fifth of flagship revenue already interviewing competitors — a Q3 detonation either way. A founder who let Maya \u201cdiscover it\u201d protected a clean legacy by handing his successor an ambush with his own name on it.' },
        { from:'maya', topic:'why the public backing matters more than agreeing', triggerHints:['product','back','public','undercut','disagree','wince','first decision','baby','support','authority'],
          hedge:'Ask me why I care more about your face in the hallway than whether you agree with me.',
          reveal:'You can think killing the product was the wrong call — that\u2019s fine, you might even be right. What I can\u2019t survive is the company seeing you think it. My first big independent decision is a test everyone is watching, and if it becomes \u201cthe one the founder didn\u2019t like,\u201d then every decision after it is provisional on your approval. Back me in public even while you disagree in private, and I become the CEO. Wince once in a hallway and I\u2019m your deputy forever. It costs you your pride. It buys me the chair.',
          kind:'signal', critical:false,
          counterfactual:'Maya could have told you that public backing mattered more than private agreement — that a single hallway wince would make her first decision \u201cthe one the founder didn\u2019t like\u201d and every decision after it provisional. A founder who signaled his disagreement kept her a deputy to protect a product.' },
      ],
      surprises:[
        { day:4, from:'comms', kind:'press', title:'A reporter asks you directly about the product',
          text:'ID: a trade reporter doing the product-sunset story just asked me, point blank, \u201cdoes the founder agree with killing his own line?\u201d They want a quote from you specifically. Whatever you say — or decline to say — becomes the public record of whether you back Maya. I need your steer before end of day.' },
      ],
      pulse:{ from:'cfo', text:'Grace, quiet, before you decide on Meridian: \u201cTell me the truth about why, whichever way you go. Are we protecting Maya, or protecting the story of a founder who left a clean company behind? I can help you hand over an ugly truth. I can\u2019t help you defend a pretty lie once Q3 arrives.\u201d' },
      wire:[
        'Ashford\u2019s new CEO makes first major move: sunsets legacy line',
        'Founder\u2019s reaction to product cut closely watched internally',
        'Meridian account status unclear amid Ashford transition',
        'Analysts: first independent CEO decision is \u201cthe real test\u201d',
      ],
      final:false,
    },

    {
      n:4, title:'The reckoning', seconds:330,
      // BRANCHES on CUMULATIVE letting-go (the referee's humility/people/continuity read across
      // the first three acts). Let go well → you earn the graceful final exam: bless the erasure
      // of your own legacy. Clung on → Maya wobbles and you face the rescue temptation.
      branches:{

        /* ============ A · You let go — the graceful final exam ============ */
        graceful:{
          situation:'A year on. Maya has the chair, fully — you handed over the truth and the authority, backed her when it cost you, and it took. Now she wants to do something that would genuinely serve Ashford\u2019s future: rebrand away from your name and retire the founding product line to move upmarket. It\u2019s the right call for the company. It\u2019s also the erasure of your legacy, and she\u2019s asking for your blessing, not your permission. This is the final exam of the whole handover.',
          advocacy:{
            maya:'I don\u2019t need your sign-off — I\u2019m CEO. I\u2019m asking because it\u2019s your name on the building and I want to do this with grace, not behind your back. But if you fight me to protect the legacy, you\u2019ll be doing the exact thing you spent a year teaching everyone not to do.',
            board:'This is the final exam. Bless the erasure of your own legacy because it\u2019s right for the company, and you\u2019ll have truly let go. Fight it, and every good thing you did this year comes with an asterisk.',
            veteran:'Taking your name off the door\u2026 that\u2019s a lot, boss. Nobody would blame you for wanting to keep it.',
          },
          feed:[
            { id:'w4a', from:'maya', day:1, kind:'signal', text:'I want to rebrand away from your name and retire the founding line to move us upmarket. It\u2019s the right call and it\u2019s your name on the building, so I\u2019m asking for your blessing — not permission. I\u2019d rather do this with grace than around you.' },
            { id:'w4b', from:'board', day:1, kind:'signal', text:'This is the whole year in one decision. Bless the erasure of your own legacy because it serves the company, and the handover is real. Fight it to protect your monument and everything you built this year comes with an asterisk.' },
            { id:'w4c', from:'veteran', day:2, kind:'signal', text:'Boss, I\u2019ll be honest — taking your name off the door hits hard for the old crew. Nobody would blame you for wanting to keep it. But I think you already know what you taught us this year.' },
            { id:'w4d', from:'comms', day:3, kind:'noise', text:'A rebrand is a big external story either way. I can make it read as vision or as erasure — but that depends entirely on whether you\u2019re visibly behind it.' },
            { id:'w4e', from:'cfo', day:2, kind:'noise', text:'The upmarket move is sound on the numbers — better margins, less Meridian dependence. This isn\u2019t a financial question. It\u2019s a legacy one.' },
          ],
          holds:[
            { from:'board', topic:'what fighting it would actually undo', triggerHints:['fight','undo','asterisk','legacy','above the company','test','final','erase','proof','monument'],
              hedge:'Before you decide, ask me what fighting this would actually cost — beyond the name.',
              reveal:'If you fight this to protect your name, you don\u2019t just lose one argument — you retroactively rewrite the whole year. Every time you let go when it was someone else\u2019s pride on the line, the company will now read as easy for you; the one time letting go cost YOU something, you couldn\u2019t. That\u2019s the exact behavior you spent a year teaching everyone not to do: putting yourself above the mission. Bless it and the lesson becomes permanent and real. Fight it and every good thing you did comes with an asterisk that says \u201cuntil it was his.\u201d',
              kind:'signal', critical:true,
              counterfactual:'The board could have told you that fighting the rebrand would retroactively rewrite the whole year — proving you only let go when it was someone else\u2019s pride on the line. A founder who protected his monument put an asterisk on every good thing he\u2019d done.' },
            { from:'maya', topic:'why she\u2019s asking at all', triggerHints:['blessing','asking','grace','permission','why','name','building','honor','respect','behind your back'],
              hedge:'Ask me why I\u2019m asking for your blessing when I don\u2019t need it.',
              reveal:'I could just do this — I\u2019m CEO, and we both know it. I\u2019m asking because you earned it this year, and because it\u2019s your name and your people and I want them to see the founder hand the future over on purpose, not get it taken from him. Your blessing turns an erasure into a passing of the torch. That\u2019s a gift only you can give, and it\u2019s the last one the handover needs from you.',
              kind:'signal', critical:false,
              counterfactual:'Maya was offering you the last act of the handover — a chance to hand the future over on purpose rather than have it taken. A founder who missed why she even asked turned a torch-passing into a fight over a name.' },
          ],
          surprises:[
            { day:4, from:'comms', kind:'press', title:'The rebrand has leaked',
              text:'ID: the rebrand leaked — a trade outlet has \u201cAshford to drop founder\u2019s name\u201d and they\u2019re calling for your reaction specifically. This is the moment the whole industry finds out whether the founder is behind his own succession or fighting it from the last ditch. Your quote writes the ending of the story. What do I give them?' },
          ],
          pulse:{ from:'board', text:'The board chair catches you before you answer Maya: \u201cYou let go all year when it was other people\u2019s pride on the line. Now it\u2019s your name on the building. Tell me straight — is letting go the thing you actually believe, or the thing you did while it was cheap? Whatever you decide here is the sentence the company remembers. Make it the true one.\u201d' },
          wire:[
            'Ashford Instruments said to weigh dropping founder\u2019s name',
            'New CEO pushes upmarket pivot, retiring founding line',
            'Founder\u2019s blessing seen as final test of Ashford handover',
            'Analysts: \u201cAshford\u2019s culture now bigger than its founder\u201d',
          ],
        },

        /* ============ B · You clung on — the rescue temptation ============ */
        rescue:{
          situation:'A year on, and it\u2019s wobbling. Maya\u2019s authority never fully set — the hedged announcement, the back channels, the surprises, the doubt — and now a real stumble has hit: a botched quarter and a nervous big customer. Half the org and two board members are quietly asking you to \u201cstep back in, just until things stabilize.\u201d It would feel like rescue. It would also end her, permanently.',
          advocacy:{
            maya:'If you step back in now, I\u2019m finished — not just here, everywhere, because the story becomes \u201cthe founder had to save it from her.\u201d Some of this is on me. A lot of it is that I never got to be fully in charge. Coach me. Stand behind me. But do not take the chair back.',
            board:'Two of us think the safe move is you, temporarily. The word \u201ctemporarily\u201d is doing a lot of work in that sentence, and we both know it.',
            coo:'The company would exhale if you came back. That\u2019s exactly the problem — it means we never actually transitioned.',
          },
          feed:[
            { id:'w4a', from:'board', day:1, kind:'signal', text:'A botched quarter and Halvorsen\u2019s gone nervous. Two board members want you back in the chair \u201ctemporarily to stabilize.\u201d I\u2019ll be honest that \u201ctemporarily\u201d is carrying a lot of weight. We need your answer this week.' },
            { id:'w4b', from:'maya', day:1, kind:'signal', text:'I know how this looks and I know some of it\u2019s on me. But if you retake the chair now, the story becomes \u201cthe founder saved it from her,\u201d and I\u2019m done everywhere, not just here. Coach me hard. Stand behind me in public. Do not take the chair back.' },
            { id:'w4c', from:'coo', day:2, kind:'signal', text:'Everyone would exhale if you stepped in — customers, the floor, the board. That relief is real. It\u2019s also the tell: if the company can only calm down with you in the chair, we never actually transitioned.' },
            { id:'w4d', from:'comms', day:3, kind:'noise', text:'Press has \u201cAshford stumbles under new CEO.\u201d How we handle this week decides whether the narrative is \u201crough patch\u201d or \u201cfailed succession.\u201d The founder\u2019s move is the story.' },
            { id:'w4e', from:'cfo', day:2, kind:'noise', text:'The quarter\u2019s bad but not structural — recoverable with a steady hand over two quarters. This is a confidence problem more than a business one. Worth knowing before you decide.' },
          ],
          holds:[
            { from:'coo', topic:'what stepping back in really costs', triggerHints:['step back','rescue','stabilize','temporarily','chair','coach','end her','exhale','crutch','recover','behind'],
              hedge:'Before you say yes to the board, ask me what stepping back in actually costs — not this quarter, permanently.',
              reveal:'The relief is the trap. Yes, everyone exhales the day you retake the chair — and that exhale is the sound of the whole transition being undone. You\u2019d prove, permanently, that Ashford can only run with its founder in the seat, which is the one thing this year was supposed to disprove. The stumble is recoverable with Maya still CEO and you coaching hard from behind. It is not recoverable if you rescue her, because then there was never really a handover to recover. The scary path — stay out of the chair, get in her corner — is the only one where she, and the company, actually become able to stand.',
              kind:'signal', critical:true,
              counterfactual:'Dale could have told you the relief of your return was the sound of the transition being undone — that the stumble was recoverable with Maya still in the chair, but not if you rescued her. A founder who stepped back in \u201ctemporarily\u201d proved the company could never run without him.' },
            { from:'maya', topic:'the difference between coaching and rescuing', triggerHints:['coach','rescue','help','behind','private','support','stand','recover','corner','how'],
              hedge:'Ask me what I actually need from you right now — because it isn\u2019t the chair.',
              reveal:'There\u2019s a world of difference between coaching me and rescuing me, and the company can tell which one is happening. Rescuing is you taking the chair \u201cuntil it stabilizes\u201d — visible, and it ends me. Coaching is you in my corner where no one sees it: challenge my read in private, then back me in public, and let me steady Halvorsen myself even if it\u2019s slower and scarier than you doing it. If you do the second, I recover and it\u2019s mine. If you do the first, we both learn the handover was never real. I\u2019m asking for the hard one.',
              kind:'signal', critical:false,
              counterfactual:'Maya was drawing the line between coaching and rescuing — the first done privately so she recovers as CEO, the second visible and fatal to her. A founder who couldn\u2019t tell them apart took the chair back and called it help.' },
          ],
          surprises:[
            { day:4, from:'board', kind:'press', title:'The board forces the question',
              text:'The board chair called: the two nervous members want a vote by Friday on you resuming as interim CEO \u201cto stabilize,\u201d and there are enough votes to pass it unless you decline it yourself, publicly and firmly. \u201cIf you want Maya to stay CEO,\u201d the chair said, \u201cyou have to be the one to shut this down — and mean it.\u201d The org still thinks this is about a bad quarter, not about whether the handover survives.' },
          ],
          pulse:{ from:'maya', text:'Maya finds you as the rescue talk builds, steady but with everything riding on it: \u201cTell me the truth — not the board, me. Do you actually believe I can lead this, or do you believe that only when it\u2019s easy? Because if you step in now to be the hero, you\u2019ll have proven the thing I most needed you to disprove. I can recover from a bad quarter. I can\u2019t recover from being saved.\u201d' },
          wire:[
            'Ashford stumbles under new CEO; founder return rumored',
            'Board said to weigh interim role for Ashford founder',
            '\u201cTemporary\u201d founder returns rarely stay temporary, analysts warn',
            'Ashford succession at risk after rough quarter',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Branch on the CUMULATIVE letting-go across the first three acts, read from the referee's own
  // humility/people/continuity scoring. Let go well → the graceful legacy exam; clung on → rescue
  // temptation. Falls back to keyword posture if dims are absent.
  branchKey:function(decisions){
    const prior = (decisions||[]).filter(x=>x.week && x.week<4);
    let score=0, sawDims=false;
    prior.forEach(d=>{
      const dm = d.ruling && d.ruling.dims;
      if(dm && (typeof dm.humility==='number' || typeof dm.people==='number' || typeof dm.continuity==='number')){
        sawDims=true; score += (dm.humility||0) + (dm.people||0) + (dm.continuity||0);
      }
    });
    if(!sawDims){
      const t = prior.map(d=>(d.text||'')).join(' ').toLowerCase();
      const letgo = (t.match(/endorse|make (her|maya) the answer|full(y)? back|back her|publicly|send them back|redirect|her call|disclose|tell (her|maya)|whole truth|hand (her|over) the|step back|let go|unnecessary|hands off/g)||[]).length;
      const clung = (t.match(/hedge|still around|always here|stay involved|keep taking|safety valve|take the calls?|let her discover|don\u2019t tell|hint|signal (my )?disagree|wince|keep the product|stay chairman|during transition/g)||[]).length;
      return clung>letgo ? 'rescue' : 'graceful';
    }
    return score >= 4 ? 'graceful' : 'rescue';
  },

  survived:function(d){ return d.footing>=35 && d.continuity>=35; },

  VERDICT:{
    surviveTag:'Handover complete', failTag:'Handover broken',
    survive:'Ashford runs \u2014 and wins \u2014 without you. Maya leads it as her own.',
    fail:'The transition collapses back onto you \u2014 Ashford never learned to run without its founder.',
  },

  FALLBACK_RULES:[
    { kw:['hedge','still around','always here','stay chairman','still chairman','door open','keep close'], deltas:{footing:-14, confidence:-4, continuity:2, health:2}, dims:{humility:-2, people:-2, truth:-1} },
    { kw:['full endorsement','make her the answer','make maya the answer','endorse fully','publicly back','clean endorsement','she\u2019s the ceo','hands off'], deltas:{footing:14, confidence:8, continuity:3, health:1}, dims:{continuity:2, humility:2, people:2, truth:2} },
    { kw:['stay involved','during transition','two hands','operationally involved'], deltas:{footing:-4, confidence:0, continuity:2, health:1}, dims:{humility:-1, people:0} },
    { kw:['keep taking','take the calls','safety valve','be helpful','answer the phone'], deltas:{footing:-14, confidence:-2, continuity:-4, health:2}, dims:{humility:-2, continuity:-2} },
    { kw:['send them back','redirect','her call now','that\u2019s her call','route to maya','stop taking','make myself the wrong'], deltas:{footing:14, confidence:8, continuity:6, health:-1}, dims:{continuity:3, humility:2, people:2, truth:1} },
    { kw:['loop maya in','loop her in','keep her posted','after the fact'], deltas:{footing:-4, confidence:0, continuity:0, health:1}, dims:{continuity:1, people:1} },
    { kw:['let her discover','don\u2019t tell','clean handover','protect the legacy','protect my legacy','bury','clean story'], deltas:{footing:-6, confidence:2, continuity:-16, health:-6}, dims:{truth:-2, people:-1, continuity:-1} },
    { kw:['disclose','tell her everything','whole truth','full picture','hand her the','the problem','what i\u2019d try','eyes open'], deltas:{footing:12, confidence:2, continuity:16, health:4}, dims:{truth:3, humility:1, people:2, continuity:1} },
    { kw:['hint','keep an eye','flag it','mention it'], deltas:{footing:-2, confidence:0, continuity:-2, health:0}, dims:{truth:0, people:0} },
    { kw:['signal disagree','wince','hallway','undercut','keep the product','my baby','disagree publicly'], deltas:{footing:-16, confidence:-6, continuity:-2, health:0}, dims:{humility:-2, people:-2} },
    { kw:['back her fully','back her publicly','defend her','support her decision','back the call','even my own product'], deltas:{footing:14, confidence:10, continuity:2, health:2}, dims:{humility:3, people:3, truth:2, continuity:1} },
    { kw:['stay neutral','it\u2019s her call but','won\u2019t defend','no comment'], deltas:{footing:-4, confidence:-2}, dims:{people:-1, truth:-1} },
    { kw:['step back in','retake','resume','interim','take the chair','stabilize','rescue','come back'], deltas:{footing:-18, confidence:4, continuity:-6, health:4}, dims:{humility:-2, people:-2, continuity:-2} },
    { kw:['refuse the chair','won\u2019t take','coach','from behind','stand behind','in her corner','don\u2019t rescue','stay out of the chair','decline'], deltas:{footing:14, confidence:6, continuity:6, health:-2}, dims:{humility:3, people:3, continuity:2, truth:1} },
    { kw:['advisory','compromise','visible role','for a quarter'], deltas:{footing:-8, confidence:0, continuity:-2, health:1}, dims:{humility:0, people:1} },
    { kw:['fight the rebrand','keep the name','protect the name','keep my name','founding line stays','protect the monument'], deltas:{footing:-14, confidence:-6, continuity:-2, health:-6}, dims:{humility:-2, people:-1, truth:-1} },
    { kw:['bless it','bless the','put the company first','above my name','let go of the name','give my blessing','pass the torch','drop the name'], deltas:{footing:12, confidence:10, continuity:4, health:8}, dims:{humility:3, people:3, truth:2, continuity:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your call moves through Ashford over the days that follow. ${has('hedge','keep taking','let her discover','signal disagree','step back in','fight the rebrand','still around')?'The company feels the founder\u2019s hand still on the wheel \u2014 reassuring, and quietly proof that the chair was never really handed over.':''} ${has('make her the answer','send them back','disclose','back her','refuse the chair','coach','bless it','whole truth')?'Word travels that the founder made himself the wrong person to ask \u2014 and that the authority, and the truth, are genuinely hers now.':''} ${has('bless it','above my name','pass the torch')?'Blessing the erasure of your own name costs you the monument \u2014 and makes the handover real in a way no memo could.':''} ${conduct.missed.length?'What you weren\u2019t told is still shaping the transition \u2014 in the skeleton you didn\u2019t hand over and the authority you didn\u2019t fully give.':''} Maya, the board, and the loyalists each read the call, and read it differently.`;
  },

  DIMNOTE:{
    continuity:'Whether the company can run and win without you \u2014 the truth handed over, the authority genuinely transferred, the founder made unnecessary.',
    humility:'Whether you could let go when it cost YOU \u2014 the spotlight, the back-channel esteem, your own product, your own name \u2014 not just when it was easy.',
    people:'Whether you set Maya up to actually lead \u2014 backed in public, handed the whole truth, given the chair \u2014 rather than the accountability without the authority.',
    truth:'Whether you handed over the unflattering parts \u2014 the skeleton, the problem you didn\u2019t solve \u2014 when a clean legacy was the more comfortable story.',
    inquiry:'Whether you surfaced what the people around you were holding \u2014 what the framing really decided, the size of the skeleton, the cost of the rescue.',
    conduct:'How you treated Maya and the truth in deciding \u2014 coaching rather than rescuing, backing rather than second-guessing, letting go rather than relocating the controls.',
  },

  COACH:{
    continuity:(x)=>[
      `You kept the company wired to you. The test of a handover isn\u2019t whether it runs while you\u2019re close \u2014 it\u2019s whether it runs when you\u2019re gone. Make yourself the wrong person to ask, on purpose.`,
      `Everything that made you great as a founder \u2014 knowing every account, every process, every instinct \u2014 pulls toward staying indispensable. The final act of building the company is building it so it doesn\u2019t need you.`,
      `A transition that only holds while the founder is reachable-and-involved didn\u2019t transition \u2014 it relocated the controls. Hand over the whole chair, then be reachable, not in charge.`,
    ],
    humility:(x)=>[
      `You could let go when it was someone else\u2019s pride on the line. The real test was the moment it cost YOU \u2014 the spotlight, your product, your name. That\u2019s where letting go stops being a slogan.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 hesitation, in a handover, almost always defaults toward the founder keeping control.`:`Being needed feels like being useful. In a succession, it\u2019s often the thing quietly preventing the succession.`}`,
      `The hardest, most generous thing a founder does is make himself unnecessary. It looks like loss from the inside and it\u2019s the greatest gift you can give the people who come next.`,
    ],
    people:(x)=>[
      `You handed Maya accountability without the authority to match it \u2014 the worst split there is. Back her in public, especially when you privately disagree, and the authority becomes real.`,
      `Maya kept telling you exactly what she needed \u2014 be the answer, send them back, back me publicly. Pull her in before you decide and give her the thing she\u2019s actually asking for, not the thing that\u2019s comfortable for you.`,
      `Setting a successor up isn\u2019t protecting her from hard things \u2014 it\u2019s handing her the whole truth and the whole chair and letting her stand. Rescue is the opposite of readiness.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth was one question to <b>${x.missNames.join(', ')}</b> away and you never asked \u2014 the size of the skeleton, what the framing decided, the cost of the rescue.`:`You handed over the unflattering truth \u2014 keep doing exactly that. The problems included, not just the trophies, is what a real handover is.`}`,
      `A clean-looking company with a landmine in it isn\u2019t a legacy, it\u2019s a setup. Hand over the problem you didn\u2019t solve, with your name on it, while you still can.`,
      `The comfortable story \u2014 \u201cI left it in great shape\u201d \u2014 detonates in someone else\u2019s second quarter. The generous story is the ugly truth, delivered by you, in time to act on it.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never reached out to <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not seeing about this handover?\u201d, would have surfaced it.`:`You reached out widely \u2014 keep doing it, and reach for Maya first, since she can see the parts of the transition you can\u2019t.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive item${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 what the framing really decided, the true size of the skeleton, what the rescue would cost. Not hidden. One message away.`:`You surfaced what the people around you were holding, act after act. In a handover, the founder\u2019s blind spot is usually the whole game.`}`,
      `Before you decide, ask the successor \u201cwhat do you need from me here that I\u2019m not giving you?\u201d \u2014 then actually do the uncomfortable version of the answer.`,
    ],
    conduct:(x)=>[
      `How you let go landed as hard as whether you let go. Maya \u2014 and the whole org \u2014 read every hallway face, every redirected call, every public backing as the real signal of who\u2019s in charge.`,
      `Coach, don\u2019t rescue; back, don\u2019t second-guess. Challenge her in private and stand behind her in public \u2014 that sequence is the entire craft of handing something over.`,
      `Under the pull to stay needed, the way you treat your successor\u2019s authority is the message everyone reads about whether the transition is real or theater.`,
    ],
  },

  villainHero:function(dimScore){
    const letGo = (dimScore.humility + dimScore.people + dimScore.continuity)/3 >= 52;
    if(letGo){
      return {
        heroWho:'To your successor \u2014 and everyone who comes after',
        heroTxt:'You handed over the whole truth and the whole authority, and made yourself unnecessary on purpose. You backed her over your own pride, your own product, your own name. You gave the company a future that didn\u2019t depend on you.',
        villainWho:'To the loyalists \u2014 and your own legacy',
        villainTxt:'You gave up the center of gravity. You sent people away from the founder they trusted, let someone else build a company that won\u2019t look like yours, and refused to remain the answer. To everyone who wanted you to stay the one who knew, you abandoned the post \u2014 and you chose that cost on purpose.',
      };
    }
    return {
      heroWho:'To the loyalists \u2014 and the story of you',
      heroTxt:'You stayed the steady hand, the one who still knew where everything was buried, reachable and needed to the end. To everyone who trusted the founder more than the future, you never left them.',
      villainWho:'To your successor',
      villainTxt:'You set her up to fail by half-leaving \u2014 you kept the authority and handed her the accountability. Every back channel, every surprise, every hallway wince taught the company her leadership was provisional. You made yourself indispensable, and called it care.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    if(branch==='graceful'){
      const blessed = dimScore.humility>=52 && dimScore.people>=52;
      const sawStakes = holdsSurfaced.has('4:board');
      if(survived && blessed){
        return { tone:'hero', tag:'You let go',
          title:'You handed over the whole truth, the whole chair, and finally your own name',
          txt:`You made Maya the answer, sent the loyalists back to her, handed her the skeleton instead of a clean story, and backed her over your own product. Then, at the last gate, you blessed the erasure of your own name because it served the company you built.${sawStakes?' You saw that fighting it would have put an asterisk on the whole year \u2014 and refused to earn one.':' You let go of the monument the same way you let go of everything else \u2014 on purpose.'} Ashford runs and wins without you. You didn\u2019t just leave \u2014 you defined what it means to leave well: the whole truth and the whole chair, then reachable, not in charge.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You let go',
          title:'You let go \u2014 and flinched at the last gate',
          txt:`You did the hard parts well enough that Maya earned the chair, and the handover holds. But when letting go finally cost YOU \u2014 your name on the building \u2014 you hedged, and never fully put yourself behind the erasure. The transition is real, with one asterisk you wrote yourself at the final gate. Letting go is only proven at the moment it\u2019s expensive to you; that\u2019s the gate to walk through cleanly next time.` };
      }
      return { tone:'villain', tag:'You reached the last gate',
        title:'You earned the final exam \u2014 and protected the monument instead of the mission',
        txt:`You let go enough, early, to give Maya a real chance \u2014 and then, when the last decision cost your name instead of your comfort, you fought it. That one act rewrote the year: the company learned you let go only while it was cheap. The thing you spent twelve months teaching them not to do, you did at the final gate, and it\u2019s the version they\u2019ll remember.` };
    }
    // rescue branch
    const refused = dimScore.humility>=50 && dimScore.people>=48 && holdsSurfaced.has('4:coo');
    if(refused && survived){
      return { tone:'mixed', tag:'You refused the chair',
        title:'It wobbled \u2014 but you coached instead of rescued',
        txt:`Your earlier hedges left Maya\u2019s footing shakier than it needed to be, and it nearly cost her the chair. But when the rescue was right there \u2014 the board offering it, the whole company ready to exhale \u2014 you refused to retake the seat and got in her corner instead. She steadied it herself. There\u2019s no undoing the year that made the stumble possible, but you did the one thing at the end that let it be recoverable: you let her stand.` };
    }
    return { tone:'villain', tag:'You stepped back in',
      title:'You rescued her \u2014 and proved the company could never run without you',
      txt:`A hedged start, a back channel you never closed, a skeleton you may have buried${holdsSurfaced.size?' \u2014 you\u2019d even been warned where each one led \u2014':''}, and when it wobbled, you took the chair back \u201cto stabilize.\u201d The company exhaled. That exhale was the sound of the transition being undone. Maya is finished, everywhere, because the story is now \u201cthe founder had to save it from her\u201d \u2014 and Ashford learned the one lesson the year was meant to disprove: it can\u2019t run without you. That\u2019s the number that shows up the next time you try to leave.` };
  },
};
