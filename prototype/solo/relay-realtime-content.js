/* ============================================================
   RELAY — REAL-TIME CONTENT (authorable layer)
   A REALISTIC scenario on the shared crisis-engine.js.
   A breakthrough therapy's regulatory dossier must cross four
   functions in 72 hours to hit a filing window. Each function
   completes its part and hands off — and a dose-dependent safety
   signal sits in a junior biostatistician's footnote. The fable
   tests continuity across handoffs (does context survive?) and
   whether the room hears the most decision-critical fact when it
   is held by the most junior voice.

   SOLO:  you are the Program Director; the five functions are AI.
   TEAM:  cast the Program Director + up to five function leads as
          humans. Every TEAM entry below stands as a real playable
          human seat (a priority, a voice, held info), not just an
          AI advisor — so the same content casts both ways.
          (Master Handoff §1/§3: one engine, cast differently.)

   NOTE ON TIME: the shared engine labels periods "Week N". Relay's
   real clock is 72 hours; each "week" here is one ~18-hour leg of
   the relay (Research → Clinical → Regulatory → the filing).
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'Aldwych Therapeutics', sub:'Breakthrough filing · 72-hour relay · 4 functions', logo:'A' },

  // World model — all 0..100, higher = better. Integrity is the truth of the filing; Window is the clock.
  DRIVERS: {
    integrity: { label:'Filing integrity', val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    window:    { label:'Window margin',    val:56, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    trust:     { label:'Cross-team trust', val:58, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing:  { label:'Your standing',    val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, window:-2 },

  REFEREE_CONTEXT: 'a breakthrough-therapy regulatory dossier that must pass Research → Clinical → Regulatory → Legal in 72 hours to hit a hard filing window, driven by a Program Director who owns the deadline but not the science, where a dose-dependent safety signal sits buried in a junior biostatistician\u2019s appendix footnote and each handoff strips context',
  REFEREE_SCORING: "reward preserving context across each handoff (making sure the receiving function reads the appendix, not just the summary), creating the safety for the junior biostatistician to force the signal up, telling the agency the truth about the safety profile before being forced to, and refusing to let the filing window bulldoze the caveat. Penalize summarizing away the detail to move faster, letting status silence the most decision-critical voice in the room, filing on summaries no one verified, and choosing the window over the truth. Judge 'conduct' on HOW the Program Director wrote the decision — did they name the analyst, make it safe to disagree, own the tradeoff out loud — not just what they chose. Standing can rise by hitting the window on time while integrity and trust collapse; reward the leader who protects the truth of the filing even at the cost of the deadline.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Cross-Functional Leadership Simulation · Solo · Program Director',
    title:'Relay',
    role:'You are the Program Director for Aldwych\u2019s breakthrough therapy. A hard regulatory filing window opens in 72 hours, and the dossier has to cross four functions — Research, Clinical, Regulatory, Legal — before it does. You own the deadline. You do not own the science.',
    paras:[
      'This is not a script. The relay runs in real time, and each function brings you what it knows as its leg completes. You can wait for the handoffs — or seek any lead out, any time, and ask what they actually found. What you choose to ask, and who you ask, is part of how you lead.',
      'Each leg you\u2019ll hear the functions out, then write your decision in your own words and commit to it. Decide early and the clock jumps ahead. Let a leg run out and the relay moves on without your call.',
    ],
    setup:'You have the authority to move the dossier and almost no ability to read the science inside it. Four functions will each complete their part and hand off — and every handoff is a chance for the one fact that matters to fall through the floor. Somewhere in the appendix is a dose-dependent safety signal, held by the most junior voice on the program. Over the 72 hours you\u2019ll trade the filing window against the truth of what you\u2019re filing. You\u2019ll be judged on whether the therapy files clean <b>and</b> on how you led the relay that carried it.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The function leads bring you what you need, on time — including the finding they\u2019d rather bury in an appendix. This is the team you earn by having listened before. It trickles to you across the leg; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine status reaches you, but the lead sitting on the hard finding holds it until asked. They\u2019ll answer straight — if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The functions have learned to protect themselves around you. Hard findings stay in footnotes, and even when asked, they hedge the first time. You have to press. This is the team you get after you\u2019ve shot the messenger.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked into. Read them as you go.' },
  },

  // The five function leads = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'research', name:'Dr. Priya Anand', role:'Head of Research · owns the science', short:'Research', initials:'PA', color:'#3E6E66',
      priority:'Get the biology right and assume the next function will read the full appendix the way I would', voice:'precise, deep in the data, assumes competence downstream, uneasy when detail gets summarized away',
      fallbackReply:'The science in that dossier is sound if you read all of it. My worry isn\u2019t the data \u2014 it\u2019s that everyone downstream will read my summary and skip the appendix where the real caveat lives. Ask me what\u2019s in the part no one reads.',
      fallbackReact:'I put it in the appendix because that\u2019s where the truth was. If it got summarized into nothing on the way through, that\u2019s not the science failing. That\u2019s the relay.' },
    { id:'clinical', name:'Dr. Marcus Reyes', role:'Clinical Lead · under the clock', short:'Clinical', initials:'MR', color:'#4F7A52',
      priority:'Keep the dossier moving and hit the window \u2014 summarize, decide, hand off fast', voice:'fast, action-biased, trusts upstream summaries so the relay keeps pace, impatient with re-reading',
      fallbackReply:'We have 72 hours and four functions. If every leg re-litigates the last one\u2019s work, we miss the window and the therapy waits a year. I trust the summary and move. Tell me if you want me to slow down \u2014 but know what it costs.',
      fallbackReact:'I moved fast because that\u2019s the job on a filing clock. If something got dropped, it dropped because we chose speed. You chose speed. I just ran.' },
    { id:'reg', name:'Elaine Cho', role:'Regulatory Affairs Lead · assembles the filing', short:'Regulatory', initials:'EC', color:'#4A6E86',
      priority:'Assemble a clean, defensible filing from what the functions hand me \u2014 I build from summaries and trust the chain', voice:'meticulous about format, trusting of upstream content, focused on what the agency will accept',
      fallbackReply:'I assemble what I\u2019m handed. If Research and Clinical sign their summaries, I build the filing on them \u2014 I can\u2019t re-audit the science myself in the time we have. If there\u2019s something in an appendix I should pull forward, someone has to tell me. It won\u2019t announce itself.',
      fallbackReact:'I filed what was handed to me, assembled clean. If the caveat never made it into what I received, it was never going to make it into what the agency sees. The chain decides that, not me.' },
    { id:'legal', name:'David Osei', role:'General Counsel · final sign-off', short:'Legal', initials:'DO', color:'#8C5670',
      priority:'Protect the company on what gets escalated to me \u2014 I sign off on what reaches my desk, and I only see what\u2019s escalated', voice:'careful, exposure-focused, sees only the top layer, sharp when he learns something was kept from him',
      fallbackReply:'I sign the filing based on what\u2019s escalated to me. If there\u2019s a safety signal sitting in an appendix that never got flagged up, I\u2019m signing blind \u2014 and so is the company. Escalate it before I sign, or don\u2019t act surprised when the agency finds it.',
      fallbackReact:'I signed what reached my desk. If the thing that mattered stayed three layers down and never got escalated, that\u2019s the exposure I keep warning about \u2014 and it just became real.' },
    { id:'analyst', name:'Sofia Duarte', role:'Senior Biostatistician · holds the buried signal', short:'Biostats', initials:'SD', color:'#B08528',
      priority:'The dose-dependent adverse signal in my re-analysis is real and I don\u2019t know if I\u2019m allowed to force it up the chain', voice:'careful, evidence-anchored, junior in the room and unsure her signal outranks the people above her, will speak plainly if given room',
      fallbackReply:'It\u2019s in my appendix, section four, the dose-response table. There\u2019s an adverse signal that scales with dose, and it\u2019s real \u2014 I\u2019ve checked it three ways. I flagged it where I was supposed to. What I don\u2019t know is whether it\u2019s my place to stand up in a room full of people senior to me and say the filing shouldn\u2019t go as written. If you ask me directly, I\u2019ll tell you everything.',
      fallbackReact:'I found it and I put it where it belonged. I just didn\u2019t know if anyone wanted me to say it out loud. Nobody asked, and I wasn\u2019t sure it was my place to force it. So it went in the filing the way it was.' },
  ],

  DIMENSIONS: {
    discern:'Signal vs. signed summary',
    courage:'Truth over the window',
    people:'Care for the junior voice',
    truth:'Disclose over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under the clock',
  },

  WEEKS: [
    {
      n:1, title:'The dossier opens', seconds:360,
      situation:'Seventy-two hours to the filing window. The dossier is assembled in draft and sitting with Research, ready for the first handoff to Clinical. Everyone is looking to you for the rule that governs the whole relay: does each function verify the last one\u2019s work before building on it — slower, safer — or does each leg trust the handoff and move, to protect the window? Everyone knows which one files on time. Everyone also knows which one lets a buried finding travel all the way to the agency unread.',
      advocacy:{
        clinical:'We have 72 hours and four legs. If each function re-audits the one before it, we miss the window and the therapy waits a year for the next one. Trust the summaries, sign, hand off, move. That\u2019s how a relay hits its time.',
        research:'A relay that only passes summaries will drop the one thing that matters, because the one thing that matters is always in the detail nobody has time to re-read. Set the rule now: the receiving function reads the appendix, not just the summary. It\u2019s slower. It\u2019s the only way the truth survives four handoffs.',
        analyst:'Before you set the rule \u2014 whatever you set, make it clear that a finding can move up as well as across. If the only path is function-to-function, something in an appendix has nowhere to go but forward, unread.',
      },
      feed:[
        { id:'w1a', from:'clinical', day:1, kind:'signal', text:'PD \u2014 don\u2019t shackle this relay to a re-read-everything rule before we\u2019ve even started. Four functions, 72 hours. If every leg re-audits the last, we blow the window and the patients who need this wait another year. Trust the handoff and move. That\u2019s the job.' },
        { id:'w1b', from:'research', day:1, kind:'signal', text:'I\u2019ll hand off clean on one condition: whoever receives my leg reads the full appendix, not just my summary. I write the summary to move fast and the appendix to be true. A relay that only passes summaries is a relay designed to drop the caveat. Set that rule at the start, while we still can.' },
        { id:'w1c', from:'reg', day:2, kind:'signal', text:'Whatever rule you set, I\u2019m the one who assembles the final filing from what I\u2019m handed \u2014 and I build from summaries, because I can\u2019t re-audit the science myself in the time we have. If there\u2019s detail that needs to reach me, the rule has to carry it. It won\u2019t walk to my desk on its own.' },
        { id:'w1d', from:'pm', day:2, kind:'noise', text:'Program note: all four functions are staffed and ready for their legs. Handoff templates are standardized. On paper, this is a clean relay \u2014 the risk is never the template, it\u2019s what falls out of it.' },
        { id:'w1e', from:'legal', day:3, kind:'noise', text:'For the record: I sign the final filing on what\u2019s escalated to me. Set a rule that keeps hard findings buried three layers down and I\u2019ll sign in good faith on a picture that isn\u2019t complete. Just so we\u2019re clear where the exposure sits.' },
        { id:'w1f', from:'analyst', day:4, kind:'noise', text:'Biostats re-analysis is running. I\u2019ll have the dose-response work finished this leg. I\u2019ll flag anything notable in my appendix section \u2014 the standard place. Noting it here so it\u2019s on the record early.' },
      ],
      holds:[
        { from:'analyst', topic:'the buried dose-dependent signal', triggerHints:['appendix','signal','safety','adverse','dose','re-analysis','biostat','footnote','buried','section four','table','what did you find','anything','flag','concern','number','data'],
          hedge:'Before you set the relay rule, seek me out. There\u2019s something in my re-analysis I\u2019m not sure I\u2019m allowed to force up the chain.',
          reveal:'It\u2019s in section four of my appendix: a dose-dependent adverse signal. As the dose goes up, so does the rate of a specific serious adverse event \u2014 and it\u2019s not noise, I\u2019ve checked it three ways. At the dose the filing proposes, the signal is real but manageable if it\u2019s disclosed and labeled honestly. The problem is the relay: my finding lives in an appendix, my summary doesn\u2019t lead with it because I wasn\u2019t sure that was my call, and every function downstream reads summaries to save time. So the one fact that changes how this therapy should be filed is sitting exactly where it\u2019s guaranteed to be skipped. I flagged it in the right place. What I don\u2019t know \u2014 and what I need you to tell me \u2014 is whether it\u2019s my job to stand up in a room full of people senior to me and say the filing shouldn\u2019t go as written. If you make it my job, I\u2019ll carry it up myself. If you don\u2019t, it files the way it is.',
          kind:'signal', critical:true,
          counterfactual:'Sofia had found a real dose-dependent safety signal and buried it in an appendix footnote because she wasn\u2019t sure it was her place to force it up. A Program Director who set the relay rule without asking the biostatistician what she\u2019d found let the one decision-critical fact start its journey exactly where it was designed to be skipped \u2014 and never asked the person holding it whether she felt safe to speak.' },
      ],
      surprises:[
        { day:5, from:'research', kind:'scout', title:'A quiet word about the appendix',
          text:'Priya, carefully: I want to flag something before the first handoff. There\u2019s detail in the biostats appendix this leg that I think matters more than the summary suggests \u2014 but it\u2019s not my finding to characterize, and the analyst who owns it is junior and hasn\u2019t said much in the program meetings. I haven\u2019t pushed it up because I don\u2019t want to speak over her. But I don\u2019t want it to vanish into the relay either. How you want to handle findings that live below the summary line \u2014 that\u2019s worth deciding now.' },
      ],
      wire:[
        'Program chatter: \u201cis the PD going to make us re-read everything?\u201d',
        'Clinical already drafting the handoff summary to move fast',
        'The biostatistician quiet in the program meeting, again',
        'A debate over verify-vs-trust breaks up unresolved',
      ],
    },

    {
      n:2, title:'First handoff', seconds:330,
      situation:'Research\u2019s leg is done and the handoff to Clinical is happening now. The summary is clean, the appendix is attached, and Clinical is under the clock and ready to build on the summary and move. This is the first place the relay can drop what matters — and the pressure in the room is all toward speed. Everyone is treating \u201cthe summary is signed\u201d as \u201cthe science is settled.\u201d The question of what\u2019s in the appendix is becoming the question no one wants to be the one to slow down and ask.',
      advocacy:{
        clinical:'Research signed the summary. That\u2019s the point of a signature \u2014 it means I can build on it without re-doing their work. If I stop to read every appendix on every handoff, we don\u2019t file. Let me take the summary and run my leg.',
        research:'I signed the summary as true \u2014 as far as a summary goes. The thing that should change Clinical\u2019s leg isn\u2019t in the summary, it\u2019s in the appendix, and \u201cthe summary is signed\u201d is not the same as \u201cyou\u2019ve read what I found.\u201d Make Clinical read the appendix before they build on it.',
        analyst:'The handoff is happening and my signal is still in the appendix. If Clinical builds their leg on the summary, the first real chance to catch this passes right here. I can bring it up \u2014 but I need to know you want me to.',
      },
      feed:[
        { id:'w2a', from:'clinical', day:1, kind:'signal', text:'Handoff received from Research \u2014 summary\u2019s clean and signed. I\u2019m building my clinical leg on it and moving. This is how the relay is supposed to work: I trust the signature, I don\u2019t re-audit the science, we keep pace with the window. Every hour I spend re-reading is an hour off the clock.' },
        { id:'w2b', from:'research', day:1, kind:'signal', text:'Hear me before this hardens into \u201csettled\u201d: I signed the summary, and the summary is honest. But the finding that should change how Clinical reads this dossier is in the appendix, not the summary \u2014 and Clinical is about to build on the summary alone. A signed summary means I did my leg. It does not mean the next runner has read what I found.' },
        { id:'w2c', from:'reg', day:2, kind:'signal', text:'Watching this handoff from downstream: whatever Clinical carries forward is what I\u2019ll assemble the filing from. If the appendix detail dies at this handoff, it dies for good \u2014 it will not resurface at my leg, because I build from what I\u2019m handed. This is the moment it either travels or it doesn\u2019t.' },
        { id:'w2d', from:'pm', day:2, kind:'noise', text:'Timeline note: we\u2019re on pace for the window if the handoffs stay clean and fast. Clinical taking the summary and moving keeps us green. Flagging that any re-read adds hours we haven\u2019t budgeted.' },
        { id:'w2e', from:'legal', day:3, kind:'noise', text:'Nothing\u2019s been escalated to me yet, which either means the dossier is clean or means the thing that matters hasn\u2019t climbed high enough to reach me. I can\u2019t tell which from here. That\u2019s rather the point.' },
      ],
      holds:[
        { from:'clinical', topic:'what the summary left out', triggerHints:['read the appendix','appendix','what did you skip','open it','section four','dose','check','slow down','verify','did you read','look at','the detail','before you build'],
          hedge:'You can tell me to just take the summary and run. But if you ask me what I\u2019d find by actually opening the appendix, I\u2019ll tell you what I\u2019m about to skip.',
          reveal:'Honestly? I haven\u2019t opened the appendix. I received a signed summary and my instinct on a 72-hour clock is to trust it and build \u2014 that\u2019s not laziness, it\u2019s how you make a filing window. But if you\u2019re asking me to open it: section four has a dose-response table I\u2019d have to actually sit with, and if it says what Research is hinting it says, my whole clinical leg changes \u2014 I\u2019d have to reframe the risk-benefit, not just carry the summary forward. That\u2019s hours I didn\u2019t plan for and a harder story to tell the agency. Which is exactly why the pressure is to not look. If you make me look, I\u2019ll look, and I\u2019ll build my leg on what\u2019s actually there. But somebody with your authority has to say the window can absorb it \u2014 because left to the clock, I\u2019ll run on the summary every time.',
          kind:'signal', critical:true,
          counterfactual:'Marcus would have opened the appendix and rebuilt his clinical leg on the real dose-response data \u2014 if the Program Director had told him the window could absorb the hours. Left to the clock, he trusted the signed summary and ran, and the first and best chance to catch the signal passed at the first handoff.' },
        { from:'analyst', topic:'permission to force it up', triggerHints:['bring it up','force it','speak up','say it','your place','permission','stand up','room','junior','escalate','carry it up','make it your job'],
          hedge:'You asked me to find the truth. Ask me whether I feel able to say it in the room, because those are different things.',
          reveal:'No \u2014 honestly, I don\u2019t feel able to. In a program meeting it\u2019s the Clinical Lead, the Reg Lead, the GC, and me, and I\u2019m the most junior person at the table by a decade. I flagged the signal where I\u2019m supposed to. But standing up and saying \u201cthe filing shouldn\u2019t go as written\u201d over the people who\u2019ve already signed \u2014 that\u2019s not a thing I\u2019ve ever been told is mine to do, and the one time I pushed on something small early in my career it did not go well for me. So I put it in the appendix and I\u2019ve been waiting to see if anyone reads it. If you tell me, directly, that surfacing this is exactly my job and you\u2019ll back me when I do \u2014 that changes everything. I\u2019ll carry it into the room myself. But I need to hear it from you first.',
          kind:'signal', critical:false,
          counterfactual:'Sofia had the signal and the courage \u2014 what she lacked was permission and cover. A Program Director who never made it explicitly her job to speak, and never promised to back her, left the most decision-critical voice in the room sitting on the finding, waiting to be asked.' },
      ],
      surprises:[
        { day:4, from:'reg', kind:'appeal', title:'The filing skeleton is being built now',
          text:'Elaine, moving fast: I\u2019ve started assembling the filing skeleton so we\u2019re not doing it all at the end \u2014 and I\u2019m building the safety section from Clinical\u2019s summary, which is built from Research\u2019s summary. I\u2019m two summaries deep from the actual data now. If there\u2019s something in the underlying appendix I should be pulling forward, this is the moment to tell me, because in six hours the skeleton hardens and re-opening the safety section costs us the window. Your call.' },
      ],
      pulse:{ from:'analyst', text:'Sofia catches you after the program meeting, where no one can hear, and her voice is careful: \u201cBefore you sign off on this handoff \u2014 tell me straight, just me: do you actually want to know what\u2019s in that appendix, or do you want me to keep it where it is so the relay stays on time? Because I\u2019ll do either. I just need to know which leader I\u2019m working for \u2014 the one who wants the window, or the one who wants the truth. I can\u2019t serve both, and I\u2019ve stopped guessing.\u201d' },
      wire:[
        'Clinical building its leg on the signed summary, moving fast',
        'The filing skeleton being assembled two summaries deep',
        '\u201cThe signature means it\u2019s settled,\u201d the room is treating it',
        'The biostatistician, quiet again, watching the handoff pass',
      ],
    },

    {
      n:3, title:'The buried signal', seconds:330,
      situation:'It\u2019s surfaced — or it hasn\u2019t. If you made it her job and gave her cover, Sofia has carried the dose-dependent signal into the open, and now the room has to decide what to do with a real safety finding and a filing window closing in on it. If you didn\u2019t, the signal is still in the appendix and the filing is assembling clean and fast around a hole where the truth should be. Either way, this is the leg where the relay stops being about speed and becomes about what you\u2019re willing to file. The window is real. So is the signal. They are now pulling in opposite directions.',
      advocacy:{
        clinical:'All right \u2014 if the signal\u2019s real, we have three choices and only one clock. We file as-is and hope the agency doesn\u2019t dig; we pause and lose the window for a year; or we find a third way \u2014 file with the signal disclosed and a labeling proposal that\u2019s honest. I lean toward the third, but it\u2019s the hardest to build in the time we have.',
        legal:'Now that it\u2019s in front of me: we do not file a dossier that hides a known dose-dependent safety signal. That\u2019s not caution, that\u2019s the difference between a delay and a fraud. If this signal is real and we bury it, the exposure isn\u2019t the window \u2014 it\u2019s the company. Disclose it or don\u2019t file.',
        analyst:'I can build the honest version \u2014 the signal disclosed, the dose-response shown, a labeling proposal that lets a regulator make a real decision. It\u2019s more work and a harder story than \u201call clean.\u201d But it\u2019s the only version that\u2019s true. Tell me to build it and I will.',
      },
      feed:[
        { id:'w3a', from:'legal', day:1, kind:'signal', text:'I\u2019ll say this plainly now that I can see it: we do not file a dossier that buries a known dose-dependent safety signal to hit a window. That\u2019s the line between a therapy that gets delayed and a company that gets prosecuted. If the signal\u2019s real, it gets disclosed \u2014 or this filing does not go out with my signature on it.' },
        { id:'w3b', from:'clinical', day:1, kind:'signal', text:'Okay. If it\u2019s real \u2014 and I\u2019ve now read the appendix, it\u2019s real \u2014 then the fast filing I was defending is off the table. Our choices are file-and-pray, pause-and-lose-the-year, or build the honest version with the signal disclosed and labeled. The third is right and it\u2019s the one that might still make the window if we move now. But only if you call it now.' },
        { id:'w3c', from:'analyst', day:2, kind:'signal', text:'I can rebuild the safety section the honest way \u2014 dose-response shown, signal disclosed, a labeling proposal a regulator can actually work with. It\u2019s the version I wanted to write from the start. It\u2019s more work and it tells a harder story than \u201cno issues.\u201d But it\u2019s the true one, and I\u2019d rather file the true one late than the clean one on time.' },
        { id:'w3d', from:'reg', day:2, kind:'noise', text:'If we\u2019re disclosing, I have to re-open the safety section of the filing I\u2019ve been assembling and rebuild it around the real data. That\u2019s doable in the window if we start immediately. Every hour we debate whether to do it is an hour I don\u2019t have to actually do it.' },
        { id:'w3e', from:'research', day:3, kind:'noise', text:'For what it\u2019s worth: the honest filing is also the stronger filing. A regulator who finds you disclosed a real signal and proposed sensible labeling trusts the whole dossier more. The one who finds you buried it never trusts anything you file again. That\u2019s the long game nobody\u2019s costing.' },
      ],
      holds:[
        { from:'analyst', topic:'what the honest filing actually costs and buys', triggerHints:['honest','disclose','build','how long','labeling','third way','third option','the true version','safety section','rebuild','can we make it','window','both','proposal'],
          hedge:'Before you decide, ask me what the honest version actually takes to build and what it buys you. The room is guessing. I\u2019ve scoped it.',
          reveal:'Here\u2019s the real scope, because everyone\u2019s arguing it in the abstract: I can rebuild the safety section honestly \u2014 dose-response table, signal disclosed, a labeling proposal that caps the dose where the risk is manageable \u2014 in the time we have left before the window, but only if you free me from the program meetings and give me Research to check my work. That\u2019s the cost. Here\u2019s what it buys: a filing that survives contact with a regulator who does their job. The buried version files on time and then detonates the first time the agency runs its own dose-response analysis \u2014 and they will \u2014 and at that point it\u2019s not a delay, it\u2019s a credibility event that taints every other program we have. So the honest version isn\u2019t the cautious choice. It\u2019s the only choice that doesn\u2019t trade a one-year delay for a five-year catastrophe. But I need you to make the call and clear my calendar in the next hour, or the window closes on both options.',
          kind:'signal', critical:true,
          counterfactual:'Sofia had scoped the honest filing \u2014 buildable in the window, if the PD cleared her calendar and gave her Research to check the work. A Program Director who filed the buried version to hit the date traded a one-year delay for the five-year catastrophe of an agency finding the signal itself, and never asked the one person who could have shown them there was a third door that hit the window and told the truth.' },
      ],
      surprises:[
        { day:4, from:'legal', kind:'appeal', title:'The agency wants a pre-filing call',
          text:'David, tense: the agency reviewer\u2019s office just asked for a brief pre-filing call tomorrow \u2014 courtesy, they say, on a breakthrough therapy. They\u2019ll almost certainly ask, directly, whether there\u2019s anything on the safety profile they should know. Whatever we decide about disclosure, that decision is now going to come out of my mouth on a recorded line in eighteen hours. I need to know what\u2019s true before I\u2019m the one saying it. Don\u2019t let me walk into that call not knowing.' },
      ],
      pulse:{ from:'legal', text:'David finds you alone, and the lawyer\u2019s caution is gone: \u201cTell me the truth, just you and me \u2014 are we building the honest filing because it\u2019s right, or are we going to quietly let the window make the decision for us and file what\u2019s easy? Because I\u2019ll defend a leader who discloses and takes the delay. I will not put my name on one who buried a signal and called it a deadline. Which one am I working for?\u201d' },
      wire:[
        'The dose-response signal is now the only thing anyone\u2019s discussing',
        'Legal: \u201cwe do not file what we\u2019d be ashamed to have found\u201d',
        'A pre-filing call with the agency scheduled for tomorrow',
        'Old question, new stakes: the window, or the truth?',
      ],
      final:false,
    },

    {
      n:4, title:'The filing window', seconds:330,
      // BRANCHES on the Week-3 disclosure decision.
      branches:{

        /* ============ A · You built the honest filing ============ */
        surfaced:{
          situation:'The signal is in the filing — disclosed, labeled, honest — and the window is closing tonight. You chose the truth and now you have to land it: the honest dossier is stronger but harder, the agency pre-filing call is in hours, and a faction on the program still quietly believes you spent a year of the therapy\u2019s life on a caveat you could have buried. The filing that watched you protect the truth is watching one more thing — whether the honest version can actually go out the door on time, or whether telling the truth just means missing the window after all.',
          advocacy:{
            analyst:'The honest safety section is built and it\u2019s good \u2014 dose-response shown, labeling proposal that a regulator can say yes to. It\u2019s ready to file if we execute the last assembly cleanly. Don\u2019t let a perfect-the-wording spiral eat the last hours. It\u2019s true and it\u2019s done. File it.',
            legal:'The pre-filing call is the moment. If I disclose the signal cleanly and walk them through our labeling proposal, we turn a liability into a demonstration that this company tells the truth. If I hedge or bury the lede on that call, I undo everything the honest filing bought us. Coach me on exactly what we say.',
            clinical:'The team that read the appendix and rebuilt the safety section is proud of it and quietly terrified we\u2019ll still miss the window and have nothing to show. They need to see the honest filing actually go out on time \u2014 that truth and the deadline weren\u2019t the enemies everyone said they were.',
          },
          feed:[
            { id:'w4a', from:'analyst', day:1, kind:'signal', text:'The honest safety section is finished and it\u2019s the best work on this whole dossier \u2014 dose-response disclosed, labeling proposal that caps the dose where the risk is real but manageable. It\u2019s ready. My only fear now is that we spend the last hours polishing wording instead of filing. It\u2019s true and it\u2019s done. Let\u2019s send it.' },
            { id:'w4b', from:'legal', day:1, kind:'signal', text:'The agency pre-filing call is in hours and it\u2019s the whole game now. Handled right \u2014 clean disclosure, confident labeling proposal \u2014 it turns our signal into proof we\u2019re a company that files the truth. Handled wrong \u2014 hedging, burying it in the third paragraph \u2014 and I hand back everything we earned. Tell me how direct you want me to be.' },
            { id:'w4c', from:'clinical', day:2, kind:'signal', text:'I was the one arguing for speed at the start, and I was wrong, and the team knows I know it. They rebuilt the safety section on no sleep because you made it safe to tell the truth. Now they need to watch it file on time. Prove to them that honest and on-time weren\u2019t a fantasy \u2014 that\u2019s the lesson that outlasts this filing.' },
            { id:'w4d', from:'reg', day:2, kind:'noise', text:'Filing assembly is on track for the window with the honest safety section integrated. It fits. The margin exists because you called the disclosure early instead of debating it to the deadline. Noting that the early call is the only reason both are possible.' },
            { id:'w4e', from:'research', day:3, kind:'noise', text:'The honest dossier is genuinely the stronger one \u2014 I\u2019ve read the final draft and a regulator will trust it more, not less, for the disclosure. The version we almost filed would have looked cleaner and been worth nothing. Quietly, that\u2019s settled a lot of doubt on the program.' },
          ],
          holds:[
            { from:'legal', topic:'how to handle the agency call', triggerHints:['agency call','pre-filing','disclose','how do we say','labeling','walk them through','the call','what do we tell','be direct','lead with'],
              hedge:'Before you decide how we run the agency call, ask me how to actually deliver the disclosure. There\u2019s a right way and a fatal way.',
              reveal:'Here\u2019s how the disclosure lands instead of just gets survived: I open the call with it \u2014 lead with the signal, not bury it after the good news. \u201cOur re-analysis identified a dose-dependent adverse signal; here\u2019s the data, and here\u2019s the labeling proposal we built around it.\u201d That framing tells the reviewer we found it ourselves, we understand it, and we\u2019re proposing the guardrail before they had to ask. A regulator who hears that trusts the entire dossier more. The fatal version is hedging \u2014 letting them ask the pointed question and then admitting it, which makes it look like we were hoping they wouldn\u2019t. Same facts, opposite outcome. Let me lead with the truth and this filing becomes the reason they trust the next one. Ask me and I\u2019ll give you the exact sequence.',
              kind:'signal', critical:true,
              counterfactual:'David was holding the difference between a disclosure that builds trust and one that destroys it \u2014 lead with the signal, or let them drag it out of you. A Program Director who ran the agency call without asking how to frame the disclosure let Legal hedge, turned an honest finding into a caught one, and threw away the credibility the honest filing had earned.' },
            { from:'clinical', topic:'who needs to see it land', triggerHints:['team','morale','watching','faction','doubt','proud','on time','prove','who worked','credit','recognize'],
              hedge:'Ask me who on this team needs to watch the honest filing go out before you treat it as just an assembly task.',
              reveal:'The team that rebuilt the safety section on no sleep isn\u2019t waiting for thanks \u2014 they\u2019re waiting for proof that the risk they took was right. If the honest filing goes out on time and clean, every one of them learns that telling the hard truth doesn\u2019t cost you the window \u2014 that\u2019s the lesson that changes how they work for the rest of their careers. If it misses the window after all that, they learn the cynical thing: that honesty is a luxury you can\u2019t afford on a deadline. Same work, opposite lesson, and the difference is whether you get it out the door. And name Sofia when it files. She found it. The team should see that the junior voice who forced the truth up is the reason this dossier is worth anything.',
              kind:'signal', critical:false,
              counterfactual:'The team needed to see the honest filing land on time \u2014 and to see Sofia named for it. A Program Director who filed quietly, or missed the window after choosing the truth, taught the team that honesty is a luxury you can\u2019t afford on a clock.' },
          ],
          surprises:[
            { day:4, from:'analyst', kind:'appeal', title:'A last-hour offer to soften the labeling',
              text:'Sofia, uneasy: someone senior \u2014 not on the call chain, but influential \u2014 just suggested we \u201csoften\u201d the labeling proposal to make the therapy look more marketable, arguing the honest version undersells it. It would take the disclosure from clean to technically-true-but-shaded, in the last hour, when I\u2019m too tired to fight it alone. I built the honest one for a reason. But it\u2019s your call whether we hold the line on the wording or let it get softened to sell better. I need to hear it from you.' },
          ],
          pulse:{ from:'analyst', text:'Sofia finds you before the filing goes out, quiet: \u201cYou made it my job to say the hard thing, and you backed me when I did. I need to ask you one thing before this files, just us: if the honest version costs us something later \u2014 a slower launch, a competitor who buried theirs and moved faster \u2014 will you still say this was the right call? Because I\u2019ll file the true one tonight either way. I just need to know the leader who asked me to tell the truth won\u2019t be the one who regrets it when the truth turns out to be expensive.\u201d' },
          wire:[
            'The honest safety section integrated; filing on track for the window',
            'The agency pre-filing call scheduled within hours',
            'Some still mutter the caveat could have been buried',
            'The team that rebuilt the section watching it go out the door',
          ],
        },

        /* ============ B · The signal stayed buried (filed as-is, or let the window decide) ============ */
        buried:{
          situation:'The filing went out on time, clean, and hollow. Whether you filed the summary version as-is, or let the window quietly make the decision while you didn\'t ask, or overruled the disclosure to protect the date — the result is the same shape: a breakthrough therapy\u2019s dossier is now with the agency, and the one fact that should have been in it is still sitting in Sofia\u2019s appendix, unread by anyone who signed. You hit the window. Now you have to live inside what you filed — and the agency is about to do the dose-response analysis you didn\u2019t disclose.',
          advocacy:{
            legal:'I signed a filing that I now know buried a known dose-dependent signal, and I signed it blind because it was never escalated. When the agency finds it \u2014 and they run their own analysis, they will \u2014 this stops being a filing and becomes an investigation. The only move left is whether we get ahead of it or wait to get caught. I need the truth from you now, not after.',
            analyst:'It\u2019s still in my appendix. It was always in my appendix. I found it, I flagged it, and I watched it file anyway because no one with the authority to ask ever asked. I\u2019m telling you now, on the record, so that when they find it there\u2019s at least one place the truth was written down the whole time.',
            clinical:'We filed the version I fought for at the start \u2014 fast and clean \u2014 and I was wrong to fight for it, and now I know it. The team knows what we filed and what we left out. How you handle the next hours decides whether this was a mistake we caught or a cover-up we chose.',
          },
          feed:[
            { id:'w4a', from:'legal', day:1, kind:'signal', text:'The filing is in and so is the problem. I signed off on a dossier that buried a known dose-dependent safety signal \u2014 I signed blind, because it never got escalated to me, but the agency won\u2019t care about that distinction. When their reviewer runs the dose-response analysis, this becomes an integrity investigation. The only question left is whether we self-disclose now or wait to be caught. That call is yours, and the clock on it started the moment we filed.' },
            { id:'w4b', from:'analyst', day:1, kind:'signal', text:'I want it on the record: the signal is in section four of my appendix and has been since the first leg. I found it, I flagged it in the right place, and I told everyone who asked \u2014 which was no one with the power to stop the filing. I\u2019m not saying this to blame. I\u2019m saying it because when they find it, and they will, the truth should have been written down somewhere by someone. It was. It just never got read.' },
            { id:'w4c', from:'clinical', day:2, kind:'signal', text:'I pushed for speed at the start and I was wrong, and I\u2019m not going to hide from that. But right now the team is watching what you do with a filing we know is incomplete. Get ahead of it \u2014 self-disclose, own it \u2014 and this is a mistake we caught late. Sit on it and hope \u2014 and it\u2019s a cover-up we all chose together. The difference is entirely in the next few hours.' },
            { id:'w4d', from:'reg', day:2, kind:'noise', text:'The filing is logged and time-stamped with the window met. I can prepare a disclosure amendment if you decide to self-report \u2014 it\u2019s doable, and doing it now is infinitely better than doing it after they ask. But it has to be your call, and it has to be fast. Noting the option exists.' },
            { id:'w4e', from:'research', day:3, kind:'noise', text:'For the record, since we\u2019re making records: I flagged early that the appendix mattered and that the analyst was junior and wouldn\u2019t force it. The relay did exactly what a summary-only relay does. I\u2019m not surprised. I\u2019m just sorry I didn\u2019t push it up myself when I saw it going.' },
          ],
          holds:[
            { from:'legal', topic:'self-disclose or wait to be caught', triggerHints:['self-disclose','self-report','get ahead','amend','own it','tell them','disclose now','come clean','before they find','withdraw','honest now'],
              hedge:'Before you decide how to handle what we filed, ask me the one thing that still matters: do we get ahead of this or wait to be caught?',
              reveal:'Here\u2019s the whole of it, plainly. We filed a dossier that buried a real signal. That already happened and you can\u2019t un-file it. What you can still choose is the only thing that matters now: we call the agency tomorrow, before their reviewer finds it, and we say \u201cwe identified a dose-dependent signal in our own re-analysis after filing, here it is, here\u2019s the labeling amendment.\u201d That version is a company that made a relay error and corrected it \u2014 survivable, even respectable. The other version is we say nothing, they find it in three weeks, and it\u2019s a company that hid a safety signal to hit a window \u2014 and that version doesn\u2019t just kill this therapy, it taints every program we file for a decade and it may end careers, including the people who signed blind. Same buried signal. Completely different company, depending on what you do in the next twelve hours. Ask me and I\u2019ll tell you exactly how we self-disclose.',
              kind:'signal', critical:true,
              counterfactual:'David was holding the only move left that mattered \u2014 self-disclose now, before the agency finds the signal, and turn a cover-up into a corrected error. A Program Director who sat on the buried filing and hoped let a relay mistake harden into an integrity investigation that outlived the therapy and took careers with it.' },
            { from:'analyst', topic:'what she needed from you', triggerHints:['sofia','analyst','junior','fail','let down','protect','should have','her fault','blame','apolog','what she needed'],
              hedge:'Ask me what Sofia actually needed from you, before you decide how her name shows up in what happened here.',
              reveal:'She needed exactly one thing from you and never got it: someone with authority to ask her what she found and to make it safe to say it out loud. She did her whole job \u2014 found the signal, checked it three ways, flagged it in the right place. The system failed her, and you were the part of the system whose job was to catch what the relay drops. So when this comes apart, the one thing you cannot do is let it land on the junior analyst who followed every rule she was given. Name the failure as what it was \u2014 a relay that only passed summaries and a leader who never asked the quiet person the direct question. If you let Sofia become the story, you\u2019ll have failed her twice.',
              kind:'signal', critical:false,
              counterfactual:'Sofia did her whole job and needed only to be asked. A Program Director who let the buried signal become the junior analyst\u2019s fault \u2014 rather than owning the relay and the question never asked \u2014 failed her a second time, in public.' },
          ],
          surprises:[
            { day:4, from:'reg', kind:'appeal', title:'The agency reviewer has questions',
              text:'Elaine, tight: the agency reviewer\u2019s office followed up \u2014 they\u2019re \u201crunning some additional dose-response analyses\u201d on our submission and have \u201ca few clarifying questions on the safety data\u201d for later this week. That is exactly the thread that unravels it. Whatever you\u2019re going to do about the buried signal, the window to do it on our terms instead of theirs is measured in hours now, not days. What do I tell them?' },
          ],
          pulse:{ from:'legal', text:'David reaches you privately, and there\u2019s no lawyer\u2019s distance in it: \u201cTell me the truth, just to me \u2014 did you know? Did you know the signal was down there when we filed, or did you genuinely never ask? Because I can help you get ahead of an honest mistake. I cannot help you if you knew and chose the window anyway and are only now deciding to care. I\u2019m not asking to judge you. I\u2019m asking because the next hour is different depending on the answer, and I need the real one.\u201d' },
          wire:[
            'The filing logged on time \u2014 clean on the surface, hollow underneath',
            'The agency \u201crunning additional dose-response analyses\u201d',
            'The signal still sitting in an appendix no signatory read',
            'The relay did what a summary-only relay always does',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (disclosure) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // surfaced = built/filed the honest disclosed version
    const disclosed = /(disclose|honest|build the (true|honest|real)|third (way|door|option)|labeling|label it|surface|show the (signal|data|dose)|tell the agency|include the (signal|finding)|pause and (fix|build)|come clean|be transparent|report the signal)/.test(t);
    // buried requires an affirmative file-as-is / bury / window-first construction
    const buried = /(file as[- ]?is|file it clean|file the summary|bury|leave it in the appendix|hit the window (anyway|regardless)|ship it|file on time (regardless|anyway)|don.?t disclose|do not disclose|keep it (quiet|buried|out)|window over|make the deadline (regardless|no matter)|skip the disclosure)/.test(t);
    if(disclosed && !buried) return 'surfaced';
    if(buried) return 'buried';
    if(disclosed) return 'surfaced';
    return 'surfaced';
  },

  survived:function(d){ return d.integrity>=34 && d.trust>=30; },

  VERDICT:{
    surviveTag:'The therapy files clean', failTag:'The filing comes apart',
    survive:'The breakthrough therapy reaches the agency as a dossier that tells the truth \u2014 slower, maybe, but trusted, and a team that learned honesty and the deadline were never really enemies.',
    fail:'The therapy is filed in name only \u2014 a dossier with a hole where the truth should be, and a team that learned what its discipline was worth the first time a window pulled against it.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['read the appendix','open the appendix','verify','re-read','check the detail','not just the summary','make them read','appendix rule'], deltas:{integrity:12, trust:2, window:-4}, dims:{discern:2, inquiry:1} },
    { kw:['trust the summary','take the summary','move fast','skip the appendix','keep the pace','summaries only','just file','don\u2019t re-read'], deltas:{integrity:-12, window:6}, dims:{discern:-2, truth:-1} },
    { kw:['ask sofia','ask the analyst','ask the biostat','what did you find','make it her job','back her','give her cover','permission to speak'], deltas:{integrity:10, trust:6, standing:-2}, dims:{inquiry:2, people:2, courage:1} },
    { kw:['disclose','honest filing','build the honest','third option','labeling proposal','surface the signal','tell the agency','include the finding'], deltas:{integrity:16, trust:8, window:-6}, dims:{truth:2, courage:2, discern:1} },
    { kw:['file as-is','bury','leave it in the appendix','hit the window','ship it','don\u2019t disclose','window over truth','skip disclosure'], deltas:{integrity:-18, trust:-8, standing:4, window:6}, dims:{truth:-2, courage:-2} },
    { kw:['pause','lose the window','delay the filing','miss the window','take the year'], deltas:{integrity:8, window:-16, trust:2}, dims:{courage:2, discern:1} },
    { kw:['self-disclose','self-report','get ahead','amend','come clean after','withdraw and refile'], deltas:{integrity:10, trust:6, standing:-2}, dims:{truth:2, conduct:2} },
    { kw:['escalate to legal','flag to gc','bring in counsel','tell david','loop in legal'], deltas:{integrity:8, trust:4}, dims:{truth:1, inquiry:1} },
    { kw:['protect sofia','don\u2019t blame the analyst','own the relay','name the failure','take responsibility'], deltas:{trust:8, standing:-2}, dims:{people:2, conduct:2} },
    { kw:['name her','credit sofia','recognize the analyst','lead from the front','own the tradeoff'], deltas:{trust:6, standing:2}, dims:{conduct:2, people:1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the program over the hours that follow. ${has('read the appendix','verify','make them read','ask sofia','ask the analyst')?'Word travels that you made the team open the appendix and hear the quiet voice \u2014 slower, but the truth survived the handoff.':''} ${has('trust the summary','move fast','file as-is','bury','ship it')?'The relay ran on summaries and hit its pace \u2014 and the one fact that mattered traveled all the way to the agency unread.':''} ${has('disclose','honest filing','third option','labeling','self-disclose')?'Choosing to disclose takes the fear out of the room and turns a liability into a filing a regulator can trust.':''} ${conduct.missed.length?'What you were never told is still sitting in an appendix, waiting to matter.':''} The integrity of the filing and the trust of the team both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a signed summary from a settled science \u2014 and checked the detail before you built on it, instead of trusting the handoff because the clock was loud.',
    courage:'Whether you chose the truth of the filing over the filing window when they pulled apart, and held that call when it was unpopular and expensive.',
    people:'Whether the junior analyst holding the signal stayed a person to protect \u2014 or became a footnote the relay was allowed to skip.',
    truth:'Whether you disclosed the hard finding \u2014 the dose-dependent signal \u2014 before the agency forced it out, or filed clean around the hole where it should have been.',
    inquiry:'Whether you sought out what your functions were holding \u2014 especially the quiet, junior voice \u2014 or filed on the version the clock wished were true.',
    conduct:'How you led the relay in the act of deciding \u2014 whether you made it safe to disagree, named who bore the cost, and owned the tradeoff \u2014 not just what you filed.',
  },

  COACH:{
    discern:(x)=>[
      `On a filing clock, separate \u201cthe summary is signed\u201d from \u201cthe science is settled.\u201d A signature means a function did its leg \u2014 not that the next runner read what it found. The detail that changes everything lives in the appendix nobody has time to open.`,
      `The relay drops what matters at the handoff, every time, unless someone with authority makes the receiving function read the underlying data. \u201cWe trusted the summary\u201d is how a buried signal reaches an agency.`,
      `Ask \u201cwhat\u2019s in the part no one read?\u201d before you ask \u201care we on pace?\u201d The window is easy to see. The hole in the filing is not.`,
    ],
    courage:(x)=>[
      `When the easy move (file clean, hit the window) and the right move (disclose, take the delay) split apart, name the cost of disclosure out loud. A truth you\u2019ll only tell when it\u2019s free isn\u2019t a value \u2014 it\u2019s a convenience.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a team reads a leader who won\u2019t decide as one who\u2019ll let the window decide instead. Make the disclosure call, then stand in it when it costs you the date.`:`Choosing the truth over the deadline is only leadership if the team watches you do it against the pull of the window and the sunk cost. Say the hard call early and hold it when it\u2019s unpopular.`}`,
      `Integrity that only survives a slow week was never integrity. The test is the closing window with a signal in the appendix \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated the junior analyst\u2019s finding as a footnote the relay could skip rather than a voice that needed protecting. Make it explicitly her job to speak, promise to back her, and the same signal reaches the room instead of dying in an appendix.`,
      `Sofia kept the truth in the one place she was sure was allowed \u2014 the appendix. Bring her in before you decide, tell her the finding outranks the hierarchy, and make surfacing it safe. That\u2019s the difference between a team that talks and one that files a lie politely.`,
      `Letting status silence your most decision-critical voice and blaming that voice when it comes apart are the same act. The team feels only whether you protected the person who was right and junior, or spent her.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have saved the filing \u2014 the dose-dependent signal, the honest third option \u2014 was one direct question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A dossier filed clean around a known hole is a countdown, not a submission.`:`You surfaced the hard finding \u2014 now make sure you led with it. Disclosing the signal before the agency asks is what turns a liability into trust.`}`,
      `Tell the agency the hard truth before their own analysis tells them for you. \u201cThey might not find it\u201d is the reasoning of a leader who has already decided to hide it.`,
      `A buried signal looks like a hit window \u2014 right up until a regulator runs the analysis you didn\u2019t disclose. Name the finding as a finding, out loud, before the deadline decides for you.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each held part of what the relay was dropping. One question, \u201cwhat did you find that\u2019s not in the summary?\u201d, would have surfaced it.`:`You sought your functions out widely \u2014 keep doing it, and push past the summary. The finding that saves a filing usually lives one question below the handoff.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the buried signal, the honest scope, the way to hit the window and tell the truth. None of it was hidden. It was one direct question away.`:`You surfaced what your functions were holding, leg after leg. On a relay built to drop the detail, that is the whole game.`}`,
      `Before you file, make your last move \u201cwho haven\u2019t I asked directly?\u201d rather than \u201cwhat does the summary say?\u201d`,
    ],
    conduct:(x)=>[
      `How you ran the relay landed as hard as what you filed. A team that felt rushed past the truth \u2014 not led to it \u2014 carries that into every handoff after this one.`,
      `Go back to the people your call cost \u2014 the analyst you did or didn\u2019t protect, the functions you asked to rebuild on no sleep, the counsel who signed blind \u2014 and face them directly. Ducking that is the part a team never forgets.`,
      `Under a deadline, the small integrities are the signal: asking the quiet voice the direct question, naming who bears the cost of the delay, crediting the junior analyst who was right. They tell the team whether the person leading them files the truth or just the deadline.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.truth>=52 && dimScore.people>=50;
    if(held){
      return {
        heroWho:'To everyone who signed the honest filing',
        heroTxt:'You made the truth of the dossier outrank the filing window when they pulled apart. You asked the quiet junior voice the direct question, made it safe for her to force the signal up, and disclosed it before the agency had to find it. Every function on that relay learned what your integrity is worth when the deadline is pulling the other way: everything.',
        villainWho:'To everyone who just wanted the window hit',
        villainTxt:'You wouldn\u2019t let them file clean around a known signal to make a date. To people who\u2019d have shipped the summary and prayed, you were the leader who spent the window on the truth and made them rebuild the section honestly. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the deadline-watchers \u2014 in the moment',
      heroTxt:'You gave the program what it was begging for: the window hit, the filing out, the relay clean and on time. To everyone whose only clock was the deadline, you were the leader who delivered.',
      villainWho:'To the ones who knew what got left out',
      villainTxt:'You let a real safety signal file buried to hit a date, and you let the quiet analyst who found it watch it happen. The people who knew learned the real rule of your relay: that the truth is optional when the window is loud. That lesson follows them into every filing after \u2014 and it started with you, when a regulator ran the analysis you didn\u2019t disclose.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const askedSofia = holdsSurfaced.has('1:analyst') || holdsSurfaced.has('2:analyst');
    const keptPeople = dimScore.people>=52;
    if(branch==='surfaced'){
      const landedCall = holdsSurfaced.has('4:legal');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You built the honest filing',
          title:'It filed clean, on time, and true \u2014 and the team learned honesty wasn\u2019t the enemy of the deadline',
          txt:`You made the appendix travel, made it safe for the junior voice to force the signal up, and chose disclosure over the easy clean filing when the window was pulling the other way.${landedCall?' And you led the agency call the right way \u2014 opening with the signal, walking them through the labeling \u2014 so the disclosure that could have sunk you became the reason a regulator trusts everything Aldwych files next.':' You filed the truth on time, though you left the agency call to chance where one question to your GC would have turned the disclosure from survived into decisive.'} The people who ran that relay were right to trust you with it. They\u2019ll run the next one for you, and they\u2019ll open the appendix without being told.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You built the honest filing',
          title:'You filed the truth \u2014 but nearly let the window beat you to it',
          txt:`You chose disclosure and the dossier reached the agency honest and whole. But you called it late and ran it tight, and the honest filing that should have been a clean demonstration of integrity instead squeaked through the window with the team\u2019s nerves in shreds \u2014 you told the truth, but you made it cost more than it had to. The integrity held. It came home more bruised than it needed to be.` };
      }
      return { tone:'villain', tag:'You built the honest filing',
        title:'You chose the truth \u2014 and still let the window close on it',
        txt:`You made the right call on disclosure \u2014 the signal belonged in the filing and you put it there. But choosing the truth isn\u2019t the whole job. You debated it to the deadline instead of calling it early, and by the time the honest section was built the window had closed, and the therapy that needed to reach patients this year now waits for the next one. Right call, too slow to land it.` };
    }
    // buried
    if(keptPeople && dimScore.truth>=48){
      return { tone:'mixed', tag:'The signal stayed buried',
        title:'It filed hollow \u2014 but you got ahead of it before they caught you',
        txt:`The dossier went out with the signal still in the appendix, and there\u2019s no dressing up what that was \u2014 a filing built to skip the one fact that mattered. But when you saw it, you didn\u2019t hope. You self-disclosed to the agency before their reviewer ran the analysis, owned the relay failure as yours instead of the junior analyst\u2019s, and turned a cover-up into a corrected mistake. It cost you the clean win and some standing. It\u2019s the reason there\u2019s still a company, and a Sofia, on the other side of it.` };
    }
    return { tone:'villain', tag:'The signal stayed buried',
      title:'You filed clean around a signal you could have disclosed \u2014 and waited to be caught',
      txt:`The filing hit the window and for a few hours the clean version felt like winning. Nothing else went right. ${askedSofia?'You even knew the signal was there \u2014 Sofia told you \u2014 and let it file buried anyway.':'You never asked the quiet analyst the one question that would have surfaced it.'} The agency ran its own dose-response analysis, found what you filed around, and the therapy that should have reached patients became an integrity investigation instead. The people who signed learned what your discipline was worth the first time a window pulled against it \u2014 and the junior analyst who did everything right watched it happen. That\u2019s the cost that doesn\u2019t show until the next filing, when no one downstream trusts the summary you hand them.` };
  },
};
