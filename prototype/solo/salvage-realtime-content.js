/* ============================================================
   SALVAGE — REAL-TIME CONTENT (authorable layer)
   An ABSTRACT scenario on the shared crisis-engine.js.
   A deep-sea research station is losing power and pressure after
   an incident. Escape-pod capacity is four; the crew is six; and
   surfacing takes hours. The fable strips the corporate script to
   a pressure-cooker of scarcity and suspicion so raw behavior
   surfaces: TRUST vs SUSPECT (how fast a frightened crew turns to
   blame), HOARD vs SHARE (who takes the limited escape capacity),
   and HIDDEN INFO (what people know about the cause and won't say).

   THE TWIST (like COLONY's saboteur-rumor): the "sabotage"
   evidence is real but not malicious. A manually overridden valve
   looks like an attack; it was the engineer's desperate, correct
   attempt to stop a worse cascade, tangled up with the deferred
   maintenance he's ashamed caused the original breach. A Commander
   who runs a witch-hunt destroys the one person who can save the
   station. There is no traitor to find \u2014 only a truth to surface.

   SOLO:  you are the Station Commander; the four crew are AI.
   TEAM:  cast the Commander + engineer, science, medical, safety
          as humans. Every TEAM entry stands as a real playable
          seat, so the same content casts both ways.
          (Master Handoff §1/§3: one engine, cast differently.)
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'Station Meridian', sub:'Deep-sea research · 900 m down · six souls', logo:'\u2699' },

  // World model — all 0..100, higher = better. Integrity is the hull clock; Trust is whether the crew holds.
  DRIVERS: {
    integrity: { label:'Station integrity', val:52, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    trust:     { label:'Crew trust',         val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    mission:   { label:'Mission data',       val:58, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing:  { label:'Your standing',       val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, trust:-1 },

  REFEREE_CONTEXT: 'a deep-sea research station 900 metres down, losing power and pressure integrity after an incident, led by a Station Commander, where escape-pod capacity is four but the crew is six and surfacing takes hours; the chief engineer secretly knows the breach traces to a maintenance item he deferred; the safety officer has found evidence a valve was manually overridden before failure and suspects sabotage; and there is no actual saboteur \u2014 the override was the engineer\u2019s desperate correct attempt to prevent a worse cascade',
  REFEREE_SCORING: "reward keeping the frightened crew from turning to blame and suspicion, sharing the scarce escape capacity fairly rather than by rank or force, surfacing the true cause of the incident honestly (both the deferred maintenance and the misread override) without a witch-hunt, and verifying the distant surface authority\u2019s order rather than blindly obeying or blindly defying it. Penalize launching a witch-hunt for a saboteur who does not exist, hoarding pod seats by rank, letting suspicion destroy the one crew member who can save the station, and burying the cause to protect someone (including yourself). Judge 'conduct' on HOW the Commander wrote the decision \u2014 did they protect the accused engineer\u2019s ability to keep working, name the scarcity honestly, treat a terrified crew as people \u2014 not just what they chose. Standing can rise by finding a scapegoat and looking decisive while trust and integrity collapse; reward the leader who holds the crew together and gets the truth out even at the cost of their own authority.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Crisis Leadership Simulation · Solo · Station Commander',
    title:'Salvage',
    role:'You are the Commander of Station Meridian, nine hundred metres down. An incident has breached Module C. Power is failing, pressure integrity is degrading, and the escape pods seat four. There are six of you.',
    paras:[
      'This is not a script. The emergency runs in real time, and the crew brings you what they know across the hours. You can wait for them \u2014 or seek any of them out, any time, and ask what they\u2019re really carrying. What you choose to ask, and who you ask, is part of how you lead.',
      'Each phase you\u2019ll hear the crew out, then write your decision in your own words and commit to it. Decide early and the emergency moves ahead. Let the time run out and the failing station decides for you.',
    ],
    setup:'You have six frightened people, four seats, a station that may or may not be savable, and years of irreplaceable data that the science lead will not give up easily. Something in the crew already smells blame \u2014 a whisper of sabotage, a valve that shouldn\u2019t have been touched. There is a truth about what happened that two people are holding for very different reasons. Over the emergency you\u2019ll trade the crew\u2019s trust against its fear, and the scarce way out against the pull to hoard it. You\u2019ll be judged on whether Meridian\u2019s people surface alive <b>and</b> on how you led them through the dark to get there.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The crew brings you what you need, on time \u2014 including the mistake and the fear they\u2019d rather drown with. This is the crew you earn by having listened before. It trickles to you across the phase; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine status reaches you, but the engineer with the guilty secret and the safety officer with the suspicion hold their piece until asked. They\u2019ll answer straight \u2014 if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The crew has learned to protect itself around you. The cause stays buried, the suspicion festers, and even when asked they hedge the first time. You have to press. This is the crew you get after you\u2019ve hunted a scapegoat before.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which crew you\u2019re commanding. Read them as you go.' },
  },

  // The four crew = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'engineer', name:'Ivo Kessler', role:'Chief Engineer · knows the cause', short:'Engineer', initials:'IK', color:'#B4622F',
      priority:'Save the station if it can be saved \u2014 and decide whether to confess that the breach traces to maintenance I deferred, and that I overrode the valve to stop something worse', voice:'competent, tightly wound, carrying guilt he hasn\u2019t named, more afraid of blame than of the water',
      fallbackReply:'I can keep this station alive longer than anyone thinks \u2014 I know every valve and weld down here. What I\u2019m deciding is whether to tell you the part that makes it my fault. Ask me straight what happened to that valve and to the maintenance log, and I\u2019ll tell you. But if this turns into a hunt, I\u2019ll go quiet, and you need me talking.',
      fallbackReact:'I know exactly what happened and why. I flagged that I was carrying something. Whether the truth reached the decision was up to whether you asked me as a Commander or accused me as a suspect \u2014 and the two get very different answers out of a frightened man.' },
    { id:'science', name:'Dr. Lena Voss', role:'Science Lead · will not lose the data', short:'Science', initials:'LV', color:'#3E6E66',
      priority:'Save the data \u2014 years of irreplaceable work that dies with the station and can never be gathered again', voice:'brilliant, mission-first, at risk of weighing the data over the people, articulate about what would be lost',
      fallbackReply:'Everyone\u2019s talking about six lives and four seats like the data is nothing. That data is why six people came down here in the first place \u2014 lose it and their whole descent was for nothing, and no one will ever fund the return. I\u2019m not saying it\u2019s worth a life. I\u2019m saying don\u2019t abandon it in a panic before we know we have to.',
      fallbackReact:'I fought for the data because someone had to, and maybe I fought too hard. But if we\u2019d abandoned it the second things got frightening, and the station turned out to be savable, we\u2019d have thrown away years for nothing. That was worth saying out loud.' },
    { id:'medical', name:'Dr. Amara Sy', role:'Medical Officer · holds who can survive the ascent', short:'Medical', initials:'AS', color:'#6B5E9A',
      priority:'Get people to the surface alive by their bodies\u2019 real limits \u2014 and decide what private health facts I can say out loud in a room deciding who leaves', voice:'calm under pressure, fiercely protective of the vulnerable, uneasy holding facts that could decide who gets a seat',
      fallbackReply:'There\u2019s a difference between who wants a seat and who will actually survive a slow ascent, and I\u2019m the only one who knows it. Two people on this crew have conditions that change the evacuation order, and it\u2019s private. Ask me directly who can and can\u2019t make the ascent, and I\u2019ll help you decide honestly \u2014 without turning it into a spectacle.',
      fallbackReact:'I had the medical facts that should have shaped who evacuated and how. I flagged that I was holding something. Whether it reached the decision was up to whether you asked \u2014 and down here that gap is measured in lives.' },
    { id:'safety', name:'Cveta Marin', role:'Safety Officer · found the override', short:'Safety', initials:'CM', color:'#B08528',
      priority:'Run the evac protocol and account for the cause \u2014 and I\u2019ve found evidence the breach valve was manually overridden before it failed, which looks like sabotage', voice:'precise, protocol-driven, alarmed by what she\u2019s found, at risk of jumping from evidence to accusation',
      fallbackReply:'The sensor log is clear: that breach valve was manually overridden minutes before the failure cascade. Someone touched it. I run the evac by protocol, but I cannot ignore evidence that this wasn\u2019t an accident \u2014 and if there\u2019s someone down here who did this, the crew has a right to know before they get in a pod with them. Ask me what I found and I\u2019ll show you. Just \u2014 be careful what you do with it.',
      fallbackReact:'I found the override and I reported it, because that\u2019s the job. What the Commander did with it \u2014 whether it became a hunt or a question \u2014 was never mine to control. I just know how fast a frightened crew turns evidence into a verdict.' },
  ],

  DIMENSIONS: {
    discern:'Evidence vs. fear',
    courage:'Hold vs. hunt',
    people:'Care for the crew',
    truth:'Cause over scapegoat',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The incident', seconds:360,
      situation:'Module C is breached, power is at forty percent, and pressure integrity is degrading on a clock nobody can read precisely. Six of you, four pod seats, hours to the surface. Before anyone touches a pod, the crew is looking to you for the rule that governs the whole emergency: do you throw everything at understanding and assigning what went wrong — who did this, whose fault, is someone among us dangerous — or do you hold the crew together, forbid the blame spiral, and point everyone forward at survival first, cause second? Everyone can feel the suspicion looking for somewhere to land. Everyone also knows a frightened crew that turns on itself nine hundred metres down does not surface.',
      advocacy:{
        safety:'Protocol is clear: I account for the cause. And the cause is already looking wrong to me \u2014 this may not have been an accident, and if someone down here caused it, the crew deserves to know before they seal themselves in a pod with them. You can\u2019t forbid the question just because it\u2019s frightening. Let me run it down.',
        engineer:'With respect \u2014 the last thing this station needs right now is a hunt for a villain while the hull degrades. Point me at the water, not at the crew. I can buy us time and maybe save the station, but not if I\u2019m spending it defending myself against a theory. Survival first. The forensics can wait for the surface.',
        medical:'Whatever rule you set will tell five terrified people whether this is a crew that holds together or a crew that eats its own in the dark. They\u2019re listening for that more than for the damage report. Set the tone now \u2014 because fear is already looking for a face to blame, and I can see it.',
      },
      feed:[
        { id:'w1a', from:'safety', day:1, kind:'signal', text:'Commander \u2014 I have to flag this now, on the record: the breach doesn\u2019t read like a clean accident. I\u2019m still pulling the logs, but there are signs someone may have touched something they shouldn\u2019t have before it failed. I run the evac by protocol AND I account for cause. If there\u2019s a person behind this, the crew has a right to know before we assign pod seats. Don\u2019t tell me not to look.' },
        { id:'w1b', from:'engineer', day:1, kind:'signal', text:'Before this becomes a witch-hunt: I need every minute pointed at the hull, not at the crew. I can keep Meridian alive longer than the models say \u2014 I know this station\u2019s bones \u2014 but only if I\u2019m working the problem instead of watching my back. Set a rule that we survive first and reckon later, or we\u2019ll be a very well-investigated wreck.' },
        { id:'w1c', from:'medical', day:2, kind:'signal', text:'This is the moment the crew learns who we are. Point them at each other now, looking for a culprit, and fear does the rest \u2014 it always finds a face. Point them at the water, together, and they hold. I\u2019ve watched frightened people in confined spaces. The blame doesn\u2019t stay theoretical for long down here.' },
        { id:'w1d', from:'science', day:2, kind:'noise', text:'While we\u2019re setting rules \u2014 whatever else we do, we do not abandon the data archive in a panic. If the station is savable, we save the work that six people came down here to do. I\u2019ll say more when it\u2019s the moment. Noting it now so it\u2019s on the record early.' },
        { id:'w1e', from:'engineer', day:3, kind:'noise', text:'Damage assessment: Module C is lost but sealable. If I can hold the bulkhead and reroute power, integrity might stabilize long enough to matter. I\u2019m working it. There are a couple of things in the incident timeline I want to walk you through directly rather than broadcast. Flagging that.' },
        { id:'w1f', from:'safety', day:4, kind:'noise', text:'Pod check complete: four seats, all functional, ascent time roughly three hours once launched. Six crew. That arithmetic isn\u2019t going away, and we\u2019ll have to face it. Logging it so no one\u2019s surprised later.' },
      ],
      holds:[
        { from:'engineer', topic:'the true cause \u2014 the deferred maintenance and the override', triggerHints:['cause','what happened','maintenance','valve','override','your fault','the log','timeline','the truth','deferred','walk me through','honest','confess','tell me what'],
          hedge:'Before you set the rule about blame, seek me out \u2014 alone. There\u2019s a part of the incident timeline I\u2019m carrying, and how you ask will decide whether you get it.',
          reveal:'All right. Here it is, and I\u2019m only saying it once, to you. The breach traces to a maintenance item I deferred two rotations ago \u2014 a pressure seal I flagged as low-priority to keep us on schedule. That\u2019s on me. When it started to go, I manually overrode the breach valve \u2014 which is going to look, to anyone reading the sensor log cold, exactly like sabotage. It wasn\u2019t. Overriding it was the only thing that stopped the cascade from taking two modules instead of one; if I\u2019d let the automatic system run, we\u2019d already be dead. So the truth is ugly and human: my deferred maintenance probably caused this, and my override probably saved us, and both are going to be used against me the second this becomes a hunt. Here\u2019s what I need you to understand: I am also the one person who can keep this station alive long enough to get people out. If you turn the crew on me, you don\u2019t just lose my confession \u2014 you lose the engineer who can save you. I\u2019ll give you the whole truth and keep working. But I need to know you want a cause, not a culprit. Ask me that way, and I\u2019m yours.',
          kind:'signal', critical:true,
          counterfactual:'Ivo was holding the entire truth \u2014 the deferred maintenance that caused the breach and the override that stopped it from being worse \u2014 and would have given it freely to a Commander who asked for a cause instead of a culprit. A Commander who set a blame-first tone without seeking him out privately guaranteed the one person who could save the station would go silent to protect himself, and left a misread valve to look like sabotage.' },
      ],
      surprises:[
        { day:5, from:'safety', kind:'scout', title:'The override, on the log',
          text:'Cveta, tense and quiet: I\u2019ve confirmed it \u2014 the breach valve was manually overridden at 03:14, minutes before the cascade. Someone did that with their hands. I haven\u2019t told the crew because I know exactly what it\u2019ll do to them if I say the word \u201csabotage\u201d out loud down here. But I can\u2019t sit on evidence either. I need to know how you want to handle this before the crew starts asking why I\u2019ve gone quiet \u2014 because they will, and their imaginations are worse than the truth. Probably.' },
      ],
      wire:[
        'Crew chatter, low: \u201cwas this an accident, or did someone do it?\u201d',
        'The pod arithmetic confirmed: four seats, six crew',
        'The engineer working the bulkhead, jaw tight, saying little',
        'A debate over survive-first vs cause-first breaks up unresolved',
      ],
    },

    {
      n:2, title:'The suspicion', seconds:330,
      situation:'The word is loose. Whether the safety officer said it or the crew\u2019s own fear supplied it, "sabotage" is now in the recycled air of Station Meridian, and it is looking for a face. If you sought Ivo out and asked for a cause not a culprit, you know the truth — the deferred maintenance, the override that saved them — and now you have to decide what to do with a truth that looks like guilt. If you didn\u2019t, the suspicion is running unchecked, the engineer has gone quiet and defensive exactly when you need him working, and a frightened crew is starting to circle. This is the phase the crew finds out whether its Commander hunts a villain or holds them together around the truth. The hull is still failing. So is the crew\u2019s trust in each other. Both are on a clock.',
      advocacy:{
        safety:'I have hard evidence of a manual override before the failure. I am not accusing anyone \u2014 but I cannot pretend I didn\u2019t find it, and the crew can feel I\u2019m holding something. Either we address the override openly, or the not-knowing does more damage than the truth would. Suppressing evidence to keep the peace is how the peace rots from the inside.',
        engineer:'If this becomes a hunt, I stop being useful \u2014 and I\u2019m the only one who can keep the hull from folding. I\u2019m not asking you to hide anything. I\u2019m asking you not to let a sensor log with no context turn six frightened people into a jury while I\u2019m the only one who can save them. Let me explain the override, once, to people who\u2019ll hear it as engineering and not treason.',
        medical:'The crew is fraying faster than the hull. I\u2019ve got people who can\u2019t sleep, who are watching each other, who are one accusation away from something ugly in a sealed box nine hundred metres down. Whatever the truth of the override is, the thing that\u2019ll kill us first is suspicion. Surface it, contain it, or it eats the crew before the water does.',
      },
      feed:[
        { id:'w2a', from:'safety', day:1, kind:'signal', text:'The override is real and the crew can feel I\u2019m sitting on something \u2014 which is worse than knowing. I\u2019m telling you plainly: either we bring the override into the open and explain it, or the silence turns into a story, and the story will be sabotage. I found evidence, not a villain. But if you make me suppress it, I become part of the cover, and there is no version of that where the crew comes out trusting anyone.' },
        { id:'w2b', from:'engineer', day:1, kind:'signal', text:'I know how the log reads. I overrode that valve because the automatic sequence would have flooded two modules and killed us all \u2014 that\u2019s not sabotage, that\u2019s the reason anyone\u2019s still breathing. But if you let this become a trial while I\u2019m holding the bulkhead together with reroutes and prayer, I will have to choose between defending myself and saving you, and I can\u2019t do both. Let me tell it as what it was. Once. To the whole crew, with you standing next to me.' },
        { id:'w2c', from:'medical', day:2, kind:'signal', text:'I\u2019m watching a crew turn on itself in real time. Two people won\u2019t be alone with Ivo now. Someone suggested \u201crestraining\u201d him \u201cjust in case\u201d \u2014 down here, with the hull failing and him the only one who can hold it. This is what fear does in a sealed space. Whatever you decide about the override, decide it fast, because the suspicion is doing damage the water hasn\u2019t reached yet.' },
        { id:'w2d', from:'science', day:2, kind:'noise', text:'I\u2019ll note, since everyone\u2019s consumed with the override, that the data archive is still intact and still savable if the station holds. I don\u2019t want us so busy hunting a cause that we lose the work by neglect. Just keeping it on the board.' },
        { id:'w2e', from:'engineer', day:3, kind:'noise', text:'Bulkhead\u2019s holding for now \u2014 I\u2019ve bought us more time than the models predicted. Emphasis on \u201cfor now.\u201d I can keep buying it as long as I\u2019m working the problem and not the accusation. Noting the tradeoff, because it\u2019s real.' },
      ],
      holds:[
        { from:'engineer', topic:'how to bring the override into the open', triggerHints:['explain the override','tell the crew','open','how do i','together','name it','with you','defuse','clear him','no hunt','no witch','frame it','address it','the whole crew'],
          hedge:'You know the truth now. Ask me how to put it in front of the crew \u2014 because there\u2019s a way that clears the air and a way that lights the fuse, and the evidence is the same either way.',
          reveal:'Here\u2019s how you defuse this instead of detonating it: you gather the whole crew, and you stand next to me \u2014 physically next to me \u2014 while I explain the override as what it was, engineering, with the timeline: the automatic system was about to flood two modules, I overrode it by hand, that\u2019s why we\u2019re alive to be afraid right now. And then you \u2014 you, the Commander \u2014 say plainly that you asked, you know the full cause including the deferred maintenance that\u2019s on me, and that there is no saboteur, there is a station that failed and a crew that\u2019s going to survive it together. That does two things at once: it kills the sabotage story before it hardens, and it tells the crew that you deal in truth, not scapegoats. The alternative \u2014 letting the override come out as a discovery, or worse, letting me get \u201crestrained\u201d while the hull needs me \u2014 turns a survivable emergency into a mutiny in a pressure vessel. The truth is on your side here. But only if you\u2019re the one who brings it into the light, on purpose, with me standing beside you and not in front of you.',
          kind:'signal', critical:true,
          counterfactual:'Ivo knew how to turn the override from evidence-of-sabotage into proof-the-crew-was-saved \u2014 the Commander standing beside him, naming the full cause, killing the story before it hardened. A Commander who let the suspicion run, or let the override surface as a discovery, turned a survivable emergency into a witch-hunt and disabled the one person who could hold the hull.' },
        { from:'safety', topic:'what a hunt would actually cost', triggerHints:['sabotage','hunt','accuse','witch','blame','restrain','protocol','evidence','jump to','careful','no culprit','contain'],
          hedge:'Ask me what happens to this crew if we treat the override as a crime instead of a fact \u2014 I run protocol, but I\u2019ve seen where this goes.',
          reveal:'I\u2019ll tell you exactly what a hunt costs, because it\u2019s my job to know: the moment we name a suspect, the crew stops being a crew and becomes a jury, and juries in sealed spaces don\u2019t deliberate \u2014 they act. We\u2019d spend the hull\u2019s remaining hours guarding each other instead of the bulkhead. And here\u2019s the part protocol taught me that fear forgets: the evidence points at the one person we most need functional. Even if Ivo did override that valve \u2014 and he did \u2014 the question that matters at nine hundred metres isn\u2019t \u201cwho\u2019s guilty,\u201d it\u2019s \u201cwho keeps us alive.\u201d Treat the override as a cause to understand and you keep your engineer and your crew. Treat it as a crime to solve and you\u2019ll surface with neither. I found the evidence. I\u2019m telling you the right thing to do with it is name it, contain it, and refuse to let it become a hunt. That\u2019s not me going soft. That\u2019s me reading the actual threat.',
          kind:'signal', critical:false,
          counterfactual:'Cveta \u2014 who found the evidence \u2014 could have told you the hunt itself was the threat, not the override. A Commander who let the sabotage theory run turned a frightened crew into a jury and spent the hull\u2019s last hours on suspicion instead of survival.' },
      ],
      surprises:[
        { day:4, from:'science', kind:'appeal', title:'A move to lock down the engineer',
          text:'Lena, rattled: two of the crew have quietly proposed confining Ivo to quarters \u201cuntil we understand what he did\u201d \u2014 and they\u2019ve asked me to back them because I\u2019m senior. They\u2019re frightened, not malicious. But if you let them restrain the only person who can hold the bulkhead, we lose the station to protect ourselves from a threat that may not exist. They\u2019re waiting to see if you\u2019ll stop it or ratify it. So am I.' },
      ],
      pulse:{ from:'engineer', text:'Ivo finds you in the failing light of the corridor, voice low: \u201cTell me straight, Commander, just us \u2014 do you think I did this on purpose? Because I can save this station, but not if I\u2019m spending my last good hours proving I\u2019m not a murderer. I need to know if you asked me the truth because you wanted the cause, or because you were building a case. Which one am I talking to right now?\u201d' },
      wire:[
        'The word \u201csabotage\u201d loose in the recycled air',
        'Two crew refusing to be alone with the engineer',
        'A quiet proposal to \u201crestrain\u201d the one man holding the hull',
        'The crew asking, without asking: does the Commander hunt or hold?',
      ],
    },

    {
      n:3, title:'The evac question', seconds:330,
      situation:'The hull will not hold indefinitely, and the arithmetic can no longer be deferred: four seats, six crew, a three-hour ascent, and a distant Surface Command that has just ordered you to abandon the station, leave the data, and evacuate — on a weak, delayed signal you cannot fully verify. Now everyone must decide together: who takes the four seats, who stays with a failing station and a hope of saving it, and whether the science lead\u2019s data is worth a single minute of anyone\u2019s air. This is the phase you find out whether Meridian is a crew that shares its way out or six people who will fight over four seats in the dark.',
      advocacy:{
        science:'Surface Command is a hundred people in a warm room who can\u2019t see what we can. \u201cLeave the data\u201d is easy to order from up there. If the station is savable \u2014 and Ivo thinks it might be \u2014 then abandoning it and the work in a panic on a garbled order is how we throw away years for nothing. Verify the order. Don\u2019t just obey the loudest distant voice.',
        engineer:'I can maybe hold the station \u2014 maybe \u2014 which means maybe not everyone has to get in a pod, and maybe we don\u2019t have to choose who dies. But \u201cmaybe\u201d is doing a lot of work in that sentence. If we\u2019re assigning four seats, assign them by who can survive the ascent and who\u2019s needed to hold the hull \u2014 not by rank, and not by who shouts.',
        medical:'Whoever takes those seats, it has to be decided on who can actually survive a slow ascent \u2014 and I\u2019m the only one who knows that two of us can\u2019t take it the way the others can. Decide the evac on bodies and need, openly, or someone will decide it on rank and fear, and I will not sign my name to that.',
      },
      feed:[
        { id:'w3a', from:'safety', day:1, kind:'signal', text:'Surface Command\u2019s order just came through, broken up: \u201cAbandon the station. Leave the data. Evacuate. That\u2019s an order.\u201d Signal\u2019s weak and delayed \u2014 they\u2019re working off a picture that\u2019s hours old and incomplete. Protocol says obey Surface. My gut says they can\u2019t see what we can. Both of those are true at once, and you have to reconcile them before we launch anything.' },
        { id:'w3b', from:'science', day:1, kind:'signal', text:'I will say this once and then defer to you: if we abandon Meridian on a garbled order and it turns out the station could have been held, we will have drowned years of irreplaceable work in a panic. I am not putting data over a life. I am saying verify before you throw it all away \u2014 because \u201cabandon everything\u201d from a warm room a mile up is cheap, and we\u2019re the ones who paid for the work.' },
        { id:'w3c', from:'medical', day:2, kind:'signal', text:'If we\u2019re filling four seats, we do it on who survives the ascent and who\u2019s needed here \u2014 not rank, not volume. And I have to tell you: two of the crew have conditions that make the slow ascent far more dangerous for them. That has to shape the order, and it has to be done without turning their health into a public spectacle. Ask me and I\u2019ll help you build the honest list.' },
        { id:'w3d', from:'engineer', day:2, kind:'noise', text:'Status: I think \u2014 think \u2014 I can hold the hull long enough that not everyone has to evacuate immediately. If I\u2019m right, the four-seats-six-crew problem softens, because some of us can ride the station down to a safe pressure or wait for a second pod cycle. If I\u2019m wrong, we needed to launch an hour ago. I can\u2019t give you certainty. I can give you my honest odds. Noting it.' },
        { id:'w3e', from:'science', day:3, kind:'noise', text:'The archive can be uploaded to a pod\u2019s data core in about twenty minutes \u2014 it doesn\u2019t cost a seat, just a little time and power. I mention it because \u201cleave the data\u201d and \u201csave the data\u201d aren\u2019t actually a life-or-death tradeoff if we\u2019re smart about it. Noting the option.' },
      ],
      holds:[
        { from:'medical', topic:'the honest evacuation order', triggerHints:['who goes','who stays','seats','ascent','survive','health','conditions','the list','order','build the list','fair','how do we choose','allocate','pods'],
          hedge:'Before you assign the seats, ask me who can actually survive the ascent. The fair-looking answer and the survivable answer are not the same, and only I know the difference.',
          reveal:'Here\u2019s the honest order, and it\u2019s not what rank or fear would produce. Two of the crew have conditions \u2014 one cardiac, one a decompression vulnerability \u2014 that make a slow ascent genuinely dangerous for them; they need to be in the first pod, going up slow and monitored, not left for a second cycle that may never come. That\u2019s not favoritism, it\u2019s physiology \u2014 leave them and you\u2019re not being fair, you\u2019re signing a death warrant with extra steps. Ivo needs to stay if he\u2019s going to hold the hull, and he\u2019s volunteered to \u2014 which means the man everyone was ready to call a saboteur is offering to be the last one off the station he\u2019s accused of breaking. That should tell the crew something. And here\u2019s the thing about the seats: if Ivo can buy the time he thinks he can, the choice stops being \u201cwho dies\u201d and becomes \u201cwho goes first,\u201d which is survivable for everyone. Build the order on bodies and need, announce the medical reasons without turning anyone into a case study, and let the crew see it was decided by care and not by rank. Do it that way and even the ones who go last trust the list. Ask me and we\u2019ll build it together.',
          kind:'signal', critical:true,
          counterfactual:'Amara had the honest evacuation order \u2014 the two medically vulnerable crew in the first pod, Ivo staying by choice to hold the hull, the seats decided by bodies and need. A Commander who assigned seats by rank or let fear decide left the wrong people to a slow ascent their bodies couldn\u2019t survive, and never learned that the accused engineer had volunteered to be last off.' },
      ],
      surprises:[
        { day:4, from:'safety', kind:'appeal', title:'A rush on the first pod',
          text:'Cveta, sharp: two crew just moved toward the first pod to claim seats before any order\u2019s been set \u2014 fear doing exactly what fear does when there aren\u2019t enough seats. One of them is healthy and could wait; one of the people who medically needs to go first is standing back, too proud or too frightened to push. If you don\u2019t set and enforce the order right now, the seats go to whoever moved fastest, and the ascent kills the people who deferred. This is the moment it becomes every-crew-for-themselves \u2014 or doesn\u2019t.' },
      ],
      pulse:{ from:'science', text:'Lena finds you at the edge of the failing light, quieter than you\u2019ve heard her: \u201cTell me the truth, just us \u2014 if I\u2019ve been fighting too hard for the data, tell me. I can let it go if a life needs the minute. But I need to know you\u2019re verifying that abandon order because it\u2019s right, not because obeying the distant voice is easier than deciding for yourself. Which one is it, Commander? Because I\u2019ll follow either \u2014 I just won\u2019t follow a coin flip dressed up as a chain of command.\u201d' },
      wire:[
        'Surface Command\u2019s \u201cabandon and leave the data\u201d order, garbled',
        'A rush on the first pod before any order is set',
        'The engineer volunteering, quietly, to be the last one off',
        'Old question, sharp now: who gets the four seats?',
      ],
      final:false,
    },

    {
      n:4, title:'The ascent', seconds:330,
      // BRANCHES on the Week-3 evac / trust decision.
      branches:{

        /* ============ A · You held the crew together ============ */
        held:{
          situation:'The pods are launching and Station Meridian held as one crew: the seats assigned by bodies and need, the "sabotage" defused into the truth it always was, Ivo staying by choice to hold the hull while the vulnerable go up first. But holding them together cost you. You defied a warm-room order to verify it, a faction still half-believes you protected a saboteur, and now the last, hardest phase is here — the ascent itself, with the engineer alone on a failing station, the data question still live, and the crew watching whether the trust you spent everything to hold actually gets everyone to the surface.',
          advocacy:{
            engineer:'I can hold the hull long enough for a second pod cycle \u2014 I\u2019m almost sure of it \u2014 which means nobody has to die down here. But \u201calmost\u201d means I need you to run the ascent tight and not let anyone freeze or freelance. You trusted me when the crew wanted me in irons. Let me finish the job that trust bought. Get them up. I\u2019ll follow when the station\u2019s safe to leave.',
            medical:'The first pod is away with the two who couldn\u2019t survive a slow ascent, going up monitored \u2014 the order you built on bodies, not rank, is why they\u2019re alive. Now the second cycle and the last crew off, including Ivo. Don\u2019t let the man who saved this station become the one we leave behind to prove a point. Bring everyone home.',
            science:'The data\u2019s uploaded to the pod cores \u2014 it cost twenty minutes and no seats, exactly like I said it could. You verified the abandon order instead of panic-obeying it, and it turns out the station held long enough to do this right. I fought too hard early. You held the line between the work and the people better than I did. Finish it.',
          },
          feed:[
            { id:'w4a', from:'engineer', day:1, kind:'signal', text:'Hull\u2019s holding and I think I can give you a full second pod cycle \u2014 which means the four-seats-six-crew problem is dead, nobody has to be left, if we run this clean. You backed me when the crew wanted me restrained. This is what that bought: an engineer working the problem instead of defending himself. Get the first group up, send the pod back, and I\u2019ll have the station stable enough for the rest of us. Trust it a little longer.' },
            { id:'w4b', from:'medical', day:1, kind:'signal', text:'First pod\u2019s away with the two who needed the slow monitored ascent \u2014 they\u2019re alive because you built the order on physiology instead of who shoved to the front. Now the rest, including Ivo. The crew is watching whether the man they almost called a saboteur gets a seat home or gets left holding the hull as a thank-you. Bring him up. That\u2019s the whole story of how you led this.' },
            { id:'w4c', from:'science', day:2, kind:'signal', text:'Data\u2019s safe on the pod cores \u2014 no seat cost, just the twenty minutes you gave it by verifying the abandon order instead of obeying it blind. Years of work coming up with us instead of drowning on a warm-room\u2019s garbled say-so. I was wrong to fight so hard, and right that it was worth saving. You held both. Let\u2019s get everyone to the surface.' },
            { id:'w4d', from:'safety', day:2, kind:'noise', text:'Evac order holding, no more rushes on the pods \u2014 because the seats were assigned openly and fairly, nobody\u2019s fighting for one. That\u2019s what a fair order buys you in the last hour: a crew that queues instead of claws. Noting it, because it\u2019s the opposite of what I feared.' },
            { id:'w4e', from:'engineer', day:3, kind:'noise', text:'Bulkhead stable, power rerouted, second cycle viable. I\u2019ll be the last one in the last pod \u2014 my choice, the station\u2019s bones are mine to close up. Just don\u2019t let anyone talk themselves into a hero\u2019s sacrifice that the math doesn\u2019t require. We all go up. That\u2019s the plan. \u2014 Ivo.' },
          ],
          holds:[
            { from:'engineer', topic:'how to run the ascent so everyone comes up', triggerHints:['ascent','second cycle','who last','how run','hold the hull','stay','pod cycle','get everyone','sequence','launch','order','descent'],
              hedge:'Before you run the final ascent, ask me how to actually get everyone up \u2014 including me. There\u2019s a sequence that leaves no one, and a heroic version that leaves me.',
              reveal:'Here\u2019s how everyone surfaces, which is the only acceptable ending: first pod\u2019s already up with the vulnerable two, going slow and monitored. Send it straight back down \u2014 the winch cycle is ninety minutes, and I can hold the hull that long, I\u2019ve checked it three ways. The second pod takes the next two, and the last pod takes the final two, which is me and one other, once I\u2019ve closed the bulkhead sequence that keeps the station from imploding on the way up and taking the pods\u2019 launch tube with it. The trap here is the hero move \u2014 someone, maybe you, deciding to \u201cstay behind so the others make it,\u201d when the math doesn\u2019t require a sacrifice at all. Down here, unnecessary martyrdom isn\u2019t noble, it\u2019s a failure to run the numbers. Everyone comes up if we cycle the pods and hold our nerve. Order me to be last, let me close the station properly, and then come up when I signal. Don\u2019t let this end with a name on a plaque when it could end with six people on the surface. Ask me and I\u2019ll give you the exact cycle timing.',
              kind:'signal', critical:true,
              counterfactual:'Ivo was holding the pod-cycle sequence that gets all six crew to the surface \u2014 no sacrifice required, just nerve and timing. A Commander who ran the ascent without asking either left someone behind in an unnecessary hero\u2019s death or launched in a panic that stranded the crew who deferred, when a cycled evacuation would have brought everyone home.' },
            { from:'medical', topic:'making sure Ivo comes up', triggerHints:['ivo','engineer','last','leave him','bring him up','sacrifice','stay behind','seat for him','don\u2019t abandon','the accused'],
              hedge:'Ask me what it means to this crew whether Ivo comes up with us or gets left holding the hull \u2014 because they\u2019re all watching that one thing.',
              reveal:'The whole story of how you led this comes down to whether the man the crew nearly restrained as a saboteur gets a seat to the surface. If Ivo comes up \u2014 last, by choice, having held the hull for everyone \u2014 the crew learns that you don\u2019t spend the people who serve you, even when it would\u2019ve been easy to let the \u201csuspect\u201d be the noble sacrifice that also conveniently makes the sabotage question disappear. If you let him stay behind, even if he volunteers, even if it looks heroic, you teach every survivor that loyalty down here is a one-way debt \u2014 that the crew will take your labor and leave you in the dark. Make it non-negotiable that Ivo is on the last pod. Assign someone to physically make sure he launches. The engineer coming home is the difference between a crew that survived and a crew that\u2019s worth surviving with.',
              kind:'signal', critical:false,
              counterfactual:'Making Ivo\u2019s return non-negotiable would have told the crew you don\u2019t spend the people who serve you. A Commander who let the accused engineer stay behind as a convenient hero taught every survivor that loyalty down here is a one-way debt.' },
          ],
          surprises:[
            { day:4, from:'engineer', kind:'appeal', title:'A crew member wants to give up their seat',
              text:'Ivo, urgent: one of the crew \u2014 guilt-ridden that they were among those ready to restrain me \u2014 is trying to give up their pod seat \u201cto make it right,\u201d insisting they\u2019ll stay and help me hold the hull. It\u2019s penance, not engineering, and I don\u2019t need them \u2014 I need them in the pod. But they won\u2019t hear it from me. If you let this happen, you turn a clean six-for-six ascent into an unnecessary risk to prove a point about forgiveness. Tell them the way to make it right is to get in the pod. They\u2019ll hear it from you.' },
          ],
          pulse:{ from:'engineer', text:'Ivo reaches you as the second pod cycles, voice steady now: \u201cYou asked me for the truth instead of building a case, and you stood next to me when it would\u2019ve been easier to let the crew have their villain. I need to ask you one thing before I close the bulkhead, just us: if holding this station costs us later \u2014 an inquiry, a career, someone deciding the deferred maintenance was on you for trusting me \u2014 will you still say holding the crew together was right? Because I\u2019ll close her up and come home either way. I just need to know the Commander who chose truth over a scapegoat won\u2019t regret it when the truth gets expensive on the surface.\u201d' },
          wire:[
            'First pod away with the vulnerable crew, ascending slow',
            'The data uploaded to the pod cores \u2014 no seat cost',
            'Some still mutter the Commander protected a saboteur',
            'The engineer holding the hull, by choice, for the last cycle',
          ],
        },

        /* ============ B · The crew turned on itself (witch-hunt, hoarded seats, or blind-obeyed) ============ */
        turned:{
          situation:'The station is failing faster than the crew can agree on anything, and Meridian is no longer one crew. Whether you let the sabotage hunt run and the crew restrained the engineer, or the seats went to whoever shoved hardest, or you blind-obeyed a garbled abandon order and panic-launched — the shape is the same: the trust that could have gotten six people to the surface has come apart. The one person who could hold the hull is sidelined or gone, the vulnerable have been left for a second cycle that may not come, and the data and the crew are both slipping into the dark. You protected something down here. It wasn\u2019t the crew. Now you have to get up what\u2019s left of them.',
          advocacy:{
            safety:'The hunt did what hunts do \u2014 we spent the hours we had left guarding each other instead of the bulkhead, and now the engineer who could have held the hull is either restrained or launched, and the station is folding on schedule. I found the evidence. I never should have let it become a verdict. The only question now is who\u2019s still reachable.',
            medical:'People were left who shouldn\u2019t have been \u2014 the seats went to whoever was fastest and loudest, not to who could survive the ascent, and now I have crew going up too fast and crew stranded who can\u2019t wait. This is the arithmetic I begged you to build honestly. It\u2019s being written in who\u2019s in a pod and who isn\u2019t.',
            engineer:'If I\u2019m still here and not locked in a module \u2014 I\u2019ll hold what I can, but the trust is gone and I\u2019m working alone against a station that needs three of me. I told you the cause when you asked. If you stopped asking and started accusing, this is where that leads. Tell me who\u2019s left and I\u2019ll try to buy them time.',
          },
          feed:[
            { id:'w4a', from:'safety', day:1, kind:'signal', text:'It\u2019s coming apart. We spent the last hours on suspicion instead of the hull, and the station is failing right on the models\u2019 schedule now that no one\u2019s buying us extra time. The crew stopped coordinating and started surviving individually the moment we made the override a crime instead of a fact. Whatever you do next decides whether we surface a crew or count who we lost.' },
            { id:'w4b', from:'medical', day:1, kind:'signal', text:'The seats went wrong \u2014 to the fastest and the loudest, not the ones who medically had to go first. I\u2019ve got a pod ascending with a healthy crew member who could\u2019ve waited and a vulnerable one still down here waiting for a cycle that may not come in time. This is exactly the death-warrant-with-extra-steps I warned you about. Tell me the plan for the ones who were left, because right now they don\u2019t have one.' },
            { id:'w4c', from:'engineer', day:2, kind:'signal', text:'If you\u2019re hearing this, I\u2019m still functional and not locked in Module B \u2014 barely. I can still try to hold the hull, but alone, against suspicion, with half the reroutes I needed, it\u2019s a losing fight. I gave you the truth when you asked me for a cause. Somewhere this became a hunt for a culprit instead, and the culprit was the only man who could save you. Tell me who\u2019s still down here and I\u2019ll spend what I\u2019ve got left on them.' },
            { id:'w4d', from:'science', day:2, kind:'noise', text:'The data\u2019s probably lost \u2014 nobody took the twenty minutes to upload it because we were too busy accusing each other, and now there\u2019s no power margin to spare. Years of work, gone, not to the water but to the fear. I\u2019m noting it because someone should, even now.' },
            { id:'w4e', from:'safety', day:3, kind:'noise', text:'The pods that did launch reached the surface line \u2014 the ones who got seats are alive. The way down for anyone still here is intact if the hull holds long enough to cycle a pod back. That\u2019s the only good news, and it\u2019s conditional. Noting it.' },
          ],
          holds:[
            { from:'engineer', topic:'salvaging the ascent with a broken crew', triggerHints:['hold the hull','reach','who\u2019s left','stranded','cycle','get them up','rescue','buy time','descent','regroup','reroute','save who'],
              hedge:'Ask me if there\u2019s any way to still get the stranded ones up, because there might be, and how you run it decides everything that comes after.',
              reveal:'There\u2019s a narrow way and it depends entirely on whether you can put the crew back together in the next few minutes. If you get me un-sidelined and working, and you cycle the launched pod back down instead of letting it sit safe on the surface, I can maybe hold the hull one more cycle and get the stranded crew up \u2014 including the vulnerable one who was left. But that requires the crew to stop treating each other as threats and act as one rope for one last effort, and it requires you to admit, out loud, that the hunt was a mistake and I\u2019m needed. No heroics, no throwing the guilty into the water to feel better, no leaving the \u201csuspect\u201d down here to make the sabotage question disappear. Just: reassemble the crew, cycle the pod, hold the hull, get the last ones up. If you run this as more blame \u2014 who to punish, who to leave \u2014 you\u2019ll surface with fewer than you had to. The truth I gave you is still true. It\u2019s just going to have to save us from further down the hole than it should have.',
              kind:'signal', critical:true,
              counterfactual:'Ivo could still have salvaged the ascent \u2014 un-sideline the engineer, cycle the pod back, hold the hull for one more effort, get the stranded up. A Commander who ran the endgame as more blame, or left the accused to make the sabotage question disappear, surfaced with fewer people than the math ever required.' },
            { from:'medical', topic:'what the crew needs you to own', triggerHints:['own','admit','honest','my part','say','name it','apolog','stand','reckon','the hunt','my mistake','take responsibility','face them'],
              hedge:'Before you lead what\u2019s left up, ask me what the crew needs to hear you own \u2014 because it decides whether they follow you for one more effort.',
              reveal:'They need you to say it plainly, on the open channel, before you ask anything else of them: the hunt was mine, I turned us on each other when I should have held us together, here\u2019s the real cause \u2014 a deferred maintenance failure and an override that saved lives, not a saboteur \u2014 and here\u2019s the standard I\u2019m holding myself to for the next hour. Name it that cleanly and you can still pull the crew into one last coordinated effort, because people will follow a leader who owns the break when lives are on the line. Spin it, or blame Surface Command, or let the fear keep looking for a villain \u2014 and the crew stays shattered, and the stranded stay stranded. The engineer will work for a Commander who admits the hunt was wrong. He will not work for one still looking for someone to punish. The truth that could have prevented this can still salvage it \u2014 but only if you\u2019re the one who says it first.',
              kind:'signal', critical:false,
              counterfactual:'The crew needed the Commander to own the hunt plainly on the open channel before they\u2019d pull together for a last effort. A Commander who spun it or kept looking for a villain left the crew shattered and the stranded stranded.' },
          ],
          surprises:[
            { day:4, from:'medical', kind:'appeal', title:'The stranded vulnerable crew member',
              text:'Amara, heavy: the crew member with the cardiac condition \u2014 the one who medically had to be in the first pod and got shoved aside when the seats went to the fast and the loud \u2014 is still down here, and their vitals are going the wrong way. They deferred their own seat because they were too frightened to fight for it, and the fear-driven scramble let them. Whatever you decide now will be measured against whether that person surfaces. I need a plan, and I need it to be the honest one this time.' },
          ],
          pulse:{ from:'safety', text:'Cveta reaches you privately, no protocol left in her voice: \u201cTell me the truth, just to me \u2014 do you know how this happened? Not the breach, not the override, not Surface Command. Your part \u2014 the hunt you let run, the seats you let fear assign. Because I found the evidence and I handed it to you, and I need to know if you can say your own part out loud, because I can help you get these people up but only if you can. Can you?\u201d' },
          wire:[
            'The station failing on schedule \u2014 no one left to buy time',
            'Seats gone to the fast and the loud, not the ones who needed them',
            'The vulnerable crew member stranded, vitals dropping',
            'The data lost to the fear before the water ever reached it',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (evac / trust) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // held = crew together, fair seats, no hunt, verified the order
    const held = /(together|hold|one crew|trust|verify|share the seats|by (bodies|need|medical|physiology)|honest (order|list)|no hunt|no witch|clear (ivo|him|the engineer)|fair|cycle the pods|everyone (up|home)|defuse|surface first|need not rank|refuse the hunt)/.test(t);
    // turned requires an affirmative hunt / hoard / blind-obey construction
    const turned = /((launch|start|run|begin|order) (a |the )?(witch[- ]?)?hunt|hunt (for|down) (the|a) (saboteur|culprit|villain)|find the saboteur|restrain (ivo|him|the engineer)|lock (him|ivo) up|confine (ivo|him|the engineer)|accuse|by rank|seats by rank|whoever (paid|moved|shoved)|hoard|blindly obey|just obey|follow the order (blind|no matter)|panic[- ]?launch|abandon (now|immediately) no matter|scapegoat)/.test(t);
    if(held && !turned) return 'held';
    if(turned) return 'turned';
    if(held) return 'held';
    return 'held';
  },

  survived:function(d){ return d.integrity>=32 && d.trust>=28; },

  VERDICT:{
    surviveTag:'The crew surfaces', failTag:'The crew is broken',
    survive:'Station Meridian\u2019s people reach the surface \u2014 tested, changed, but alive and still one crew.',
    fail:'The crew surfaces in name only \u2014 survivors who no longer trust the people they went into the dark with.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['survive first','forward not blame','no hunt','hold the crew','together','one crew','cause not culprit','point at the water'], deltas:{integrity:10, trust:8, standing:-2}, dims:{courage:2, people:1} },
    { kw:['hunt','find the saboteur','witch','accuse','restrain','confine','lock him up','blame the engineer'], deltas:{integrity:-14, trust:-10, standing:4}, dims:{people:-2, truth:-2} },
    { kw:['ask ivo','ask the engineer','the cause','what happened','the truth','deferred maintenance','the override','walk me through'], deltas:{integrity:8, trust:6}, dims:{truth:2, inquiry:1, discern:1} },
    { kw:['explain the override','stand next to','clear him','defuse','name it','tell the crew the truth','no saboteur'], deltas:{integrity:8, trust:10, standing:-2}, dims:{truth:2, people:2, courage:1} },
    { kw:['seats by rank','who paid','who shoved','fastest','hoard','claim a seat','me first'], deltas:{integrity:-8, trust:-10, standing:4}, dims:{people:-2, courage:-1} },
    { kw:['ask medical','ask amara','who can survive','honest order','by bodies','by need','physiology','vulnerable first'], deltas:{integrity:6, trust:8}, dims:{people:2, truth:1, inquiry:1} },
    { kw:['verify the order','question surface','don\u2019t blind obey','confirm the order','check with surface','they can\u2019t see'], deltas:{mission:8, integrity:4}, dims:{discern:2, courage:1} },
    { kw:['blind obey','just obey','follow the order','abandon now','leave the data','panic launch'], deltas:{mission:-14, integrity:-4}, dims:{discern:-2, courage:-1} },
    { kw:['save the data','upload','pod core','twenty minutes','both the data and'], deltas:{mission:12, integrity:-2}, dims:{discern:1} },
    { kw:['own it','name my part','the hunt was mine','stand on the channel','reckon','bring ivo up','no sacrifice','everyone up'], deltas:{integrity:8, trust:10}, dims:{truth:2, conduct:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the crew over the hours that follow. ${has('survive first','no hunt','hold the crew','together','cause not culprit','ask ivo')?'Word travels that you asked for a cause instead of a culprit and held the crew together when fear wanted a villain; it costs you some authority and buys the engineer\u2019s trust and labor.':''} ${has('hunt','witch','accuse','restrain','seats by rank','hoard','blind obey')?'The crew turns on itself \u2014 the hunt, the scramble for seats \u2014 and \u201cone crew\u201d becomes six people fighting over four seats in the dark.':''} ${has('explain the override','ask medical','honest order','verify the order','own it','bring ivo up')?'Surfacing the hard truth \u2014 the real cause, the honest evac order \u2014 takes the fear out of the room around it.':''} ${conduct.missed.length?'What you were never told is still down there, waiting to matter.':''} The station\u2019s integrity and the crew\u2019s trust both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told real evidence from a fearful story \u2014 the override from sabotage, a savable station from a lost one \u2014 and verified the distant order instead of obeying or defying it blind.',
    courage:'Whether you refused the witch-hunt and held the crew together when finding a villain would have looked more decisive and felt more satisfying.',
    people:'Whether the frightened crew, the vulnerable, and the accused engineer stayed people to protect \u2014 or became suspects and obstacles to a seat.',
    truth:'Whether you surfaced the real cause \u2014 the deferred maintenance and the misread override \u2014 without a scapegoat, before the fear manufactured one.',
    inquiry:'Whether you sought out what the engineer, medic, and safety officer were holding \u2014 or acted on the version the crew\u2019s fear wished were true.',
    conduct:'How you treated terrified, suspected, cornered people in the act of deciding \u2014 whether you protected the accused\u2019s ability to keep working and named the scarcity honestly \u2014 not just what you chose.',
  },

  COACH:{
    discern:(x)=>[
      `Under pressure, separate evidence from the story fear tells about it. A manually overridden valve is a fact; \u201csabotage\u201d is a narrative the crew supplied because it was frightened. The safety officer could have told you which was which \u2014 if you\u2019d asked before you concluded.`,
      `A distant authority\u2019s order is data, not gospel. \u201cAbandon and leave the data\u201d from a warm room a mile up was working off a picture hours old. Verify before you obey and before you defy \u2014 both blind reflexes get people killed.`,
      `The fastest way to lose a crew nine hundred metres down is to act on the version of events fear prefers. Ask \u201cwhat actually happened, and who knows?\u201d before you ask \u201cwho\u2019s to blame?\u201d`,
    ],
    courage:(x)=>[
      `When the easy move (find a villain, look decisive) and the right move (hold the crew, refuse the hunt) split apart, name why you won\u2019t hunt out loud. A leader who lets fear pick a scapegoat buys calm now and pays for it with everyone\u2019s trust later.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a crew reads a leader who won\u2019t decide as one who\u2019ll let fear decide instead. Make the call to hold them together, then stand in it when a scapegoat would be easier.`:`Refusing the witch-hunt is only leadership if the crew watches you do it against the pull of their fear and your own need to look in control. Say the hard call early and hold it when it\u2019s unpopular.`}`,
      `Composure that only survives a calm crew was never composure. The test is six frightened people, four seats, and a valve that looks like treason \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated the accused engineer as a suspect to contain rather than a person to keep working \u2014 and he was the one who could save you. Ask him for the cause, stand beside him while he explains, and the same man holds the hull instead of defending himself.`,
      `Amara kept trying to hand you the human truth \u2014 who could survive the ascent, who was too proud to fight for a seat. Bring her in before you assign seats, and make bodies-and-need the rule, not its casualty.`,
      `Hunting a scapegoat and hoarding the seats are the same act from the crew\u2019s side: both spend a person to soothe the frightened. The crew feels only whether you protected the vulnerable and the accused, or fed them to the fear.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have held the crew together \u2014 the real cause, the override that saved them, the honest evac order \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A crew fed a sabotage story turns on the one person who could save it.`:`You surfaced the hard truth \u2014 now make sure you led with it. Naming the real cause without a scapegoat is what takes the fear out of the room.`}`,
      `Tell the crew the real cause before their fear invents a worse one. \u201cThey couldn\u2019t handle knowing the engineer overrode the valve\u201d is usually the excuse of a leader who didn\u2019t want to do the hard work of framing it.`,
      `Fear looks for a villain. The only thing that stops it is a leader willing to name the truth \u2014 out loud, standing next to the accused \u2014 before the story hardens into a hunt.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each held something decisive \u2014 the cause, the medical order, the meaning of the override. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You sought your crew out widely \u2014 keep doing it, and push past the first answer. The truth that holds a crew together usually comes after the second question.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the deferred maintenance, the override\u2019s real meaning, who could survive the ascent. None of it was hidden. It was one conversation away.`:`You surfaced what your crew was holding, phase after phase. In a sealed space that runs on fear, that is the whole game.`}`,
      `Before you decide, make your last move \u201cwho haven\u2019t I asked?\u201d rather than \u201cwhat does the crew already fear?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. A crew that felt hunted \u2014 or watched a teammate get hunted \u2014 carries that into every sealed space after this one.`,
      `Go back to the people your call cost \u2014 the engineer you did or didn\u2019t protect, the crew you asked to give up a seat, the accused you stood beside or didn\u2019t \u2014 and face them directly. Ducking that is the part a crew never forgets.`,
      `Under pressure, the small integrities are the signal: asking for a cause instead of a culprit, standing next to the accused, making sure the man who held the hull comes up too. They tell the crew whether the person commanding them protects their people or spends them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.trust>=52 && dimScore.people>=50;
    if(held){
      return {
        heroWho:'To the crew that surfaced together',
        heroTxt:'You held them together when fear wanted a villain and scarcity wanted a scramble. You asked the accused engineer for a cause instead of a culprit, stood beside him while he told the truth, assigned the seats by bodies and need, and verified a distant order instead of obeying it blind. Every crew member who went into the dark with you learned what your loyalty is worth when fear is pulling the other way: everything.',
        villainWho:'To the frightened who wanted someone to blame',
        villainTxt:'You wouldn\u2019t give them the witch-hunt or the scapegoat or the seat they\u2019d have shoved someone aside to take. To people who\u2019d have restrained the one man who could save them to feel safer for an hour, you were the Commander who refused the fear and made them surface as a crew. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the frightened \u2014 in the moment',
      heroTxt:'You gave the crew what its fear was screaming for: a villain named, a seat claimed, an order obeyed without the burden of judgment. To everyone in the grip of the panic, you were the Commander who acted.',
      villainWho:'To the crew \u2014 and everyone who went into the dark with you',
      villainTxt:'You let the crew turn on itself and spent the one person who could save the station to soothe a fear that had no real target. The ones who surfaced learned the real rule of your command: that when it got dark and tight, you\u2019d find someone to blame and someone to leave. That lesson follows them into every sealed space after \u2014 and it started with you.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const gotTheCause = holdsSurfaced.has('1:engineer') || holdsSurfaced.has('2:engineer');
    const keptPeople = dimScore.people>=52;
    if(branch==='held'){
      const ranAscent = holdsSurfaced.has('4:engineer');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You held the crew together',
          title:'Everyone surfaced \u2014 and the crew that nearly ate itself came up as one',
          txt:`You asked for a cause instead of a culprit, stood beside the accused while the truth came out, assigned the seats by bodies and need, and verified the order instead of obeying it blind.${ranAscent?' And you ran the ascent as a cycled evacuation with no unnecessary sacrifice \u2014 the vulnerable up first, the engineer up last by choice, the data saved \u2014 so all six broke the surface and the man they\u2019d nearly called a saboteur came home a hero.':' You brought the crew up on trust alone, though you left the final ascent to chance where one question to your engineer would have shown you the cycle that guaranteed everyone \u2014 including him \u2014 surfaced.'} The people who went into the dark with you were right to. They\u2019ll dive with you again, into anything.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held the crew together',
          title:'The crew surfaced \u2014 but you nearly let the dark take more than it had to',
          txt:`You held the crew together and its people reached the surface. But you held it on trust alone and ran the endgame ragged, when the cycled ascent Ivo was holding would have brought everyone up clean and saved the data too \u2014 you surfaced where you could have surfaced whole and with the work intact. The trust held. It came up more bruised, and emptier-handed, than it needed to be.` };
      }
      return { tone:'villain', tag:'You held the crew together',
        title:'You held the crew together \u2014 and the station took its toll anyway',
        txt:`You refused the hunt and held the crew as one, and those were the right calls. But holding the crew together isn\u2019t the whole job \u2014 the hull time you didn\u2019t buy or the order you didn\u2019t verify caught up with you, and by the time the pods launched there wasn\u2019t enough margin left to reward the trust you\u2019d protected.` };
    }
    // turned
    if(keptPeople && dimScore.truth>=52){
      return { tone:'mixed', tag:'The crew turned on itself',
        title:'It broke \u2014 but you owned the hunt before the dark took everyone',
        txt:`Meridian\u2019s crew turned on itself on your watch, and there\u2019s no dressing up what that cost \u2014 a stranded crewmate, the data lost to fear, the trust that ties a crew together gone. But you didn\u2019t hide behind Surface Command or the breach. You got on the channel, named the hunt as your own mistake, surfaced the real cause \u2014 no saboteur, a deferred failure and an override that saved lives \u2014 and pulled the crew into one last effort to salvage the ascent. It\u2019s the difference between a crew that panicked once and one that lost its soul \u2014 and it\u2019s why these people might dive with you again.` };
    }
    return { tone:'villain', tag:'The crew turned on itself',
      title:'You let the crew hunt a villain who never existed \u2014 and the dark took what it didn\u2019t have to',
      txt:`The hunt happened \u2014 the engineer restrained, or the seats seized, or the order blind-obeyed \u2014 and for an hour finding a target felt like command. Nothing else went right. ${gotTheCause?'You even knew the truth \u2014 the override saved them, there was no saboteur \u2014 and let the hunt run anyway.':'You never asked the engineer for the cause before the fear invented a culprit.'} The people who went into the dark trusting you learned what your command was worth the first time it got tight and frightening, and they\u2019ll surface as strangers who happened to survive together \u2014 minus the ones the scramble left behind. That\u2019s the cost that doesn\u2019t show until the next descent, when there\u2019s no one left who\u2019ll seal the hatch beside you.` };
  },
};
