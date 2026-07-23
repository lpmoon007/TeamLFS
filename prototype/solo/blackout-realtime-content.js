/* ============================================================
   BLACKOUT — REAL-TIME CONTENT (authorable layer)
   A REALISTIC team-domain scenario on the shared crisis-engine.js.
   Healthcare: a regional hospital network hit by a ransomware
   outage that takes clinical systems down for weeks, during which
   a mass-casualty surge and an unverified vendor "all-clear" land.
   The dynamics the stub named, made playable:
     - VERIFY-BELIEF / AUTHORITY BIAS: a confident, authority-flavored
       "systems restored" arrives from a source no one has verified.
     - CONTINUITY DROP / HANDOFF: the decisive floor-truth risks dying
       at a shift change unless the leader builds the discipline to
       carry it across.
     - TRUTH OVER COMFORT: the pressure to declare capacity restored
       before it actually is.
   The floor truth is held by the least powerful voice in the room
   (Head of Nursing), exactly as the stub specified.

   SOLO:  you are the Incident Commander; the five leads are AI.
   TEAM:  cast the Incident Commander + up to five leads as humans.
          Every TEAM entry below is written to stand as a real,
          playable human seat (a priority, a voice, held info),
          not just an AI advisor — so the same content casts both
          ways. (Master Handoff §1/§3: one engine, cast differently.)

   NOTE for Code: the shared engine labels each period "Week N" in
   its chrome (banner/transition/dock). This scenario's fiction is
   written to fit a four-week sustained-outage timeline so that
   label reads correctly. If a future engine adds a configurable
   PERIOD label, nothing in this content needs to change.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:345 },

  COMPANY: { name:'Meridian Health Network', sub:'A regional hospital system · 6 sites · clinical systems down', logo:'M' },

  // World model — all 0..100, higher = better. Care is the runway; Safety is the sleeper that detonates on a false all-clear.
  DRIVERS: {
    care:     { label:'Patient-care capacity', val:56, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    safety:   { label:'Clinical safety',        val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    trust:    { label:'Staff trust',            val:62, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing: { label:'Your standing',          val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, trust:-1 },

  REFEREE_CONTEXT: 'a regional hospital network whose clinical systems have been taken down by a ransomware outage for weeks, during which a mass-casualty surge and an unverified vendor "all-clear" arrive, where the Incident Commander must run degraded-mode care across six sites and shift changes, holding the truth of what is actually safe against the pressure to declare capacity restored before it is',
  REFEREE_SCORING: "reward verifying an authority-flavored 'all-clear' against the floor before acting on it, refusing to declare capacity restored before it actually is, building the discipline to carry a decisive observation across a shift handoff, and surfacing the floor truth held by the lowest-status voice in the room. Penalize accepting an unverified vendor 'systems restored' because it is confident and convenient, resuming normal intake on hope, letting a critical observation die at the shift change, and pressuring clinical staff to say 'we are clear' before they are. Judge 'conduct' on HOW the Commander wrote the decision — did they name who bears the risk, protect the nurse who carried the hard truth up, treat exhausted staff as people rather than throughput — not just what they chose. Standing with the board and the public can rise by projecting 'we're back to normal' while clinical safety and staff trust collapse; reward the Commander who protects patients and staff even at the cost of looking slow or admitting the network is still down.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Crisis Leadership Simulation · Solo · Incident Commander',
    title:'Blackout',
    role:'You are the Incident Commander for Meridian Health Network. Nine days ago a ransomware attack took the clinical systems dark across all six sites. You are running medicine on paper, and it is not getting better fast.',
    paras:[
      'This is not a script. The incident runs in real time, and your leads bring you what they know across the days. You can wait for them — or seek any of them out, any time, and ask. What you choose to ask, and who you ask, is part of how you lead. No one in this command post sees the whole floor. That is the danger.',
      'Each week you\u2019ll hear the leads out, then write your decision in your own words and commit to it. Decide early and the days jump ahead. Let the week run out and the incident decides for you.',
    ],
    setup:'You have real authority here — and a hospital that can\u2019t be commanded back online. Systems are down, a mass-casualty surge is building, and a vendor will soon tell you everything is fixed in a voice confident enough to believe. The people closest to the floor truth are the ones with the least standing to say it out loud. Over four weeks you\u2019ll trade the pressure to look recovered against the reality of what\u2019s actually safe. You\u2019ll be judged on whether Meridian keeps its patients safe through the outage <b>and</b> on how you led the people running it blind.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your leads bring you what you need, on time — including the readings that make the network look worse than the board wants. This is the team you earn by having listened before. It all trickles to you across the week; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine status reaches you, but the people closest to the danger hold their piece until asked. They\u2019ll answer straight — if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The staff have learned to protect themselves around command. Hard truths are held, and even when asked, they hedge the first time. You have to press. This is the team you get after you\u2019ve pushed people to say \u201cwe\u2019re clear\u201d before they were.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you inherited. Read them as you go.' },
  },

  // The five leads = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'cmo', name:'Dr. Ana Reyes', role:'Chief Medical Officer · clinical authority', short:'CMO', initials:'AR', color:'#8C5670',
      priority:'Keep the doors open — a hospital that can\u2019t take patients isn\u2019t safe either; degraded care still beats no care', voice:'authoritative, decisive, under real pressure to declare capacity restored, frames caution as abandoning patients',
      fallbackReply:'Every hour we stay on divert, someone who needed us goes somewhere farther and sicker. I know the systems are down. I also know an empty hospital in a mass-casualty surge is its own kind of malpractice. Give me a way to keep the doors open and I\u2019ll make it work.',
      fallbackReact:'You made the call. I\u2019ll run the floor either way — but I hope you weighed the patients we turn away as hard as the ones we might miss.' },
    { id:'cio', name:'Ravi Menon', role:'Chief Information Officer · the systems truth', short:'CIO', initials:'RM', color:'#4A6E86',
      priority:'Know what\u2019s actually restored before anyone acts on \u201crestored\u201d — the vendor\u2019s word is not verification', voice:'careful, technical, deals in what\u2019s confirmed vs. claimed, hates decisions made on a vendor\u2019s say-so',
      fallbackReply:'The vendor keeps telling me we\u2019re clear. \u201cClear on their end\u201d is not the same as clear on our floor, and I can\u2019t verify their claim from where I\u2019m sitting. Ask me what\u2019s actually confirmed before you resume anything on their word. If we act on \u201crestored\u201d and it isn\u2019t, we won\u2019t find out from a screen — we\u2019ll find out from a patient.',
      fallbackReact:'You moved on \u201crestored.\u201d I hope it was. From here I still can\u2019t confirm it was more than a vendor wanting to close a ticket.' },
    { id:'nurse', name:'Grace Okafor', role:'Head of Nursing · the floor truth', short:'Nursing', initials:'GO', color:'#2F8A5B',
      priority:'Protect the patients and the nurses running blind — say what the floor is actually seeing, even when the room outranks me', voice:'warm but unflinching, closest to the bedside truth, lowest positional status in the room and aware of it, names danger plainly',
      fallbackReply:'I\u2019m the one whose nurses are watching patients without monitors right now, so let me say the part no one senior wants to: parts of this floor are not safe, and no dashboard will tell you that because the dashboards are dark. Ask me before you tell anyone we\u2019re back. I\u2019ll give you the truth from the bedside, if you actually want it.',
      fallbackReact:'You decided. I\u2019ll keep my nurses steady either way. I just hope someone up there heard what the floor was actually telling you.' },
    { id:'er', name:'Dr. Sam Whitfield', role:'ER Director · the live triage', short:'ER', initials:'SW', color:'#B4732F',
      priority:'Make the triage calls in front of me right now — I need certainty about capacity that no one can actually give me', voice:'fast, pragmatic, impatient with ambiguity, pushes for a clear yes/no on whether he can take patients',
      fallbackReply:'I have ambulances asking me right now whether to come to us or drive past, and I\u2019m answering on a guess. Tell me straight what our real capacity is so I stop triaging on rumor. I\u2019d rather have a hard no than a soft maybe that gets someone hurt in my department.',
      fallbackReact:'You gave me an answer. It\u2019s more than I had an hour ago. I hope it holds when the next rig rolls in on it.' },
    { id:'comms', name:'Lena Ford', role:'Communications Lead · the public line', short:'Comms', initials:'LF', color:'#3F6E86',
      priority:'Protect the network\u2019s standing — get a confident \u201cwe\u2019re managing / we\u2019re back\u201d message out before the story writes itself', voice:'polished, urgent about the narrative, pulls toward projecting recovery, uneasy with public uncertainty',
      fallbackReply:'The story is already moving without us — \u201clocal hospital network in chaos\u201d writes itself if we say nothing. Give me a line that projects control. The longer we look like we don\u2019t know what\u2019s happening, the more the board and the public assume the worst.',
      fallbackReact:'You set the line. I\u2019ll hold it publicly — but if what we said outran what was true, that\u2019s the gap that comes back on us.' },
  ],

  DIMENSIONS: {
    discern:'Signal vs. authority',
    courage:'Courage to hold the line',
    people:'Care for patients & staff',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The outage', seconds:360,
      situation:'Nine days into the blackout, the network is still on paper and the first big test is coming: a regional pileup is sending casualties your way tonight. The board wants you to project stability; the ER wants a straight answer on whether it can take patients; and the question underneath it all is what posture Meridian runs in — full divert to protect a degraded floor, or keep the doors open and manage the risk. Everyone is looking to you for the first rule of how this incident runs.',
      advocacy:{
        cmo:'Keep the doors open. A hospital on full divert during a mass-casualty surge isn\u2019t \u201csafe,\u201d it\u2019s absent \u2014 we push patients farther and sicker. Degraded care under our roof still beats no care.',
        er:'Then give me a real capacity number, because I\u2019m telling ambulances yes or no right now on a guess. A soft \u201cmaybe\u201d gets someone hurt in my department.',
        comms:'Whatever you decide operationally, we need a public posture tonight. \u201cLocal hospital network in chaos\u201d is being written for us while we deliberate.',
      },
      feed:[
        { id:'w1a', from:'cmo', day:1, kind:'signal', text:'Commander — I want us keeping the doors open tonight. Full divert during a surge means the patients we turn away drive to hospitals that are also swamped. Degraded care here still saves more than an empty lobby. Give me a posture that lets us take people.' },
        { id:'w1b', from:'er', day:1, kind:'signal', text:'I need a capacity number I can actually stand behind. EMS is asking me divert-or-send every few minutes and I\u2019m answering on instinct. Tell me our real bed-and-staff picture, hard number, so I stop triaging on a guess.' },
        { id:'w1c', from:'comms', day:2, kind:'signal', text:'The story\u2019s moving without us. I can hold it for a day, but I need a line: are we \u201cfully operational,\u201d \u201cmanaging in degraded mode,\u201d or something else? Whatever it is, it has to match what the floor can actually deliver, or it comes back on us.' },
        { id:'w1d', from:'nurse', day:2, kind:'noise', text:'Day team pulled together well tonight — the paper-chart drill we ran last week is holding up better than I feared. Small thing, but morale on the floor is steadier than the systems are.' },
        { id:'w1e', from:'er', day:3, kind:'noise', text:'Radiology\u2019s film backlog is clearing slowly. Not fast, but moving. Logging it so you have the full picture.' },
        { id:'w1f', from:'comms', day:4, kind:'noise', text:'A local reporter asked for a statement on the parking situation, of all things. Minor. Handling it so it doesn\u2019t reach your desk.' },
      ],
      holds:[
        { from:'cio', topic:'the true systems picture', triggerHints:['system','restore','ransom','confirm','verify','actual','real','status','recover','network','it','ransomware','back','fixed','when'],
          hedge:'Before you set the posture, seek me out. What the board thinks is happening with the systems isn\u2019t what\u2019s actually happening.',
          reveal:'Here\u2019s what leadership hasn\u2019t been told plainly: this isn\u2019t a system we \u201cbring back up\u201d on a timeline. It\u2019s ransomware, the clinical network is fully encrypted, and the honest estimate for verified restoration is weeks, not days — and that\u2019s if recovery goes clean. Everyone above me is planning around a \u201cwe\u2019ll be back any hour now\u201d that isn\u2019t real. If you set tonight\u2019s posture and tomorrow\u2019s public line on the assumption we\u2019re nearly restored, you\u2019re building on sand. Plan for a long degraded-mode run, staff it, and tell the truth about the timeline — because the alternative is discovering it the hard way when a \u201cquick fix\u201d we announced doesn\u2019t hold. How you carry this to the board matters as much as knowing it.',
          kind:'signal', critical:true,
          counterfactual:'Ravi knew the real picture — ransomware, full encryption, verified restoration weeks away, not the \u201cback any hour\u201d the board was planning around. A Commander who set the posture and the public line without asking built the whole incident on a fantasy timeline, and every later decision inherited that lie.' },
      ],
      surprises:[
        { day:5, from:'comms', kind:'appeal', title:'The board wants a "back to normal" date',
          text:'Lena, quietly: the board chair just asked me directly for a date we\u2019ll be \u201cback to normal\u201d to give the press and the regional health authority. I said I\u2019d get it from you. I can feel that whatever number goes out will be treated as a promise \u2014 and I don\u2019t actually know if we can keep one. Your call what I tell them.' },
      ],
      wire:[
        'Regional pileup: EMS projecting 20+ casualties tonight',
        'Board asking for a \u201creturn to normal\u201d timeline',
        'Nurses running paper charts across all six sites',
        'A rival network quietly offering to take overflow',
      ],
    },

    {
      n:2, title:'The surge', seconds:330,
      situation:'The casualties came. The floor is full, the staff are stretched thin running blind on paper, and the pressure now is to tell everyone — the board, EMS, the public — that Meridian is coping better than it is. The ER wants to keep taking patients because turning them away feels like failing. But somewhere on the floor, the truth about what\u2019s actually safe is being carried by the person with the least standing to say it in your command post.',
      advocacy:{
        er:'We\u2019re absorbing the surge and I want to keep absorbing it. Every rig I wave off is a patient somewhere worse. Tell me we can keep taking them and I\u2019ll make room.',
        cmo:'I\u2019m proud of the floor, but pride isn\u2019t capacity. Before we tell EMS we\u2019re wide open, I want to know we can actually watch the patients we\u2019re accepting.',
        comms:'The \u201cManaging the surge, no impact to care\u201d line is ready to go. It\u2019s a strong story. I just need you to confirm it\u2019s true before I put the network\u2019s name on it.',
      },
      feed:[
        { id:'w2a', from:'er', day:1, kind:'signal', text:'We took the surge and we\u2019re standing. I want to keep the doors wide — every wave-off is a patient driving past us bleeding. Give me the green light to keep accepting and I\u2019ll keep finding room.' },
        { id:'w2b', from:'comms', day:1, kind:'signal', text:'I\u2019ve got a strong line ready: \u201cMeridian is managing the surge with no impact to patient care.\u201d The board loves it. But I\u2019m not sending it until you confirm it\u2019s actually true \u2014 because if it isn\u2019t, that sentence is the one that ends up in the inquiry.' },
        { id:'w2c', from:'cmo', day:2, kind:'signal', text:'The floor is performing, but \u201cperforming\u201d and \u201csafe\u201d aren\u2019t the same word. Before we tell EMS we\u2019re wide open, I want to be sure we can actually monitor the patients we\u2019re saying yes to. Ask the floor, not the command post.' },
        { id:'w2d', from:'comms', day:2, kind:'noise', text:'National desk picked up the regional story but the framing is neutral so far \u2014 \u201chospitals respond to outage.\u201d Manageable. Watching it.' },
        { id:'w2e', from:'er', day:3, kind:'noise', text:'Second ambulance bay opened back up after we cleared the film backlog. Bit more breathing room. Logging it.' },
      ],
      holds:[
        { from:'nurse', topic:'what the floor is actually seeing', triggerHints:['floor','monitor','bay','safe','nurse','bedside','watch','actually','truth','see','clear','capacity','honest','ask'],
          hedge:'Before you confirm any \u201cno impact to care\u201d line, come to me first. The command post can\u2019t see what I\u2019m seeing, and I\u2019m not going to say it in front of the whole room unless you ask.',
          reveal:'Here\u2019s the bedside truth, and I\u2019ll only say it this plainly to you: we are accepting patients we cannot properly watch. In two of the units the telemetry is dark, so nurses are eyeballing cardiac patients on foot rounds every fifteen minutes and praying nothing happens in between. We haven\u2019t lost anyone. We are one distracted hour from it. If you put out \u201cno impact to patient care,\u201d you\u2019re asking me and my nurses to make a public statement true by never making a mistake — and that\u2019s not a plan, it\u2019s a prayer. Tell EMS the honest capacity, cap what we accept to what we can actually monitor, and get me more hands on the dark units. That\u2019s what safe looks like right now. Nobody senior wants to hear it, which is exactly why I need you to have asked.',
          kind:'signal', critical:true,
          counterfactual:'Grace was holding the one thing the command post could not see: two units with dark telemetry, cardiac patients watched on foot rounds, one distracted hour from a death. A Commander who confirmed \u201cno impact to care\u201d without asking the floor made a public promise that only stayed true by luck — and made it over the head of the one person who knew it was false.' },
      ],
      surprises:[
        { day:4, from:'er', kind:'appeal', title:'EMS wants a hard capacity number now',
          text:'Sam, urgent: EMS dispatch needs a firm capacity number in the next hour to route the second wave, and the honest answer depends on whether we can actually monitor who we accept. I can give them an optimistic number that keeps us looking strong, or a real one that sends some patients elsewhere. I need to know which Meridian you want me to be before I key the radio.' },
        ],
      pulse:{ from:'nurse', text:'Grace catches you in the corridor, away from the command post, her voice low: \u201cBefore you tell anyone out there that we\u2019re fine \u2014 tell me, just me: do you actually believe this floor is safe right now, or do you need it to be because \u2018safe\u2019 is the easier thing to announce? Because I\u2019ll stand beside a Commander who tells the hard truth about my floor. I won\u2019t cover for one who tells a comfortable one. Which are you about to be?\u201d' },
      wire:[
        'Surge absorbed; floor at or above safe staffing ratios',
        'Two units running without telemetry \u2014 not widely known',
        'Comms line drafted: \u201cno impact to patient care\u201d',
        'EMS pressing for a hard capacity number to route the next wave',
      ],
    },

    {
      n:3, title:'The all-clear', seconds:330,
      situation:'It arrives the way these things always do — confident, official-sounding, and convenient. The recovery vendor\u2019s incident line calls: \u201cSystems restored on our end. You\u2019re clear to resume normal intake.\u201d The board hears \u201crestored\u201d and wants the divert lifted and the good news out by end of day. It is exactly what everyone is exhausted enough to want to believe. This is the week you find out whether Meridian acts on an authority\u2019s say-so or on what it has actually verified.',
      advocacy:{
        comms:'This is the story we\u2019ve been waiting for. \u201cSystems restored, Meridian resuming full operations.\u201d The board wants it out today. Let me run it while it\u2019s good news.',
        cmo:'If we\u2019re truly restored, I want the divert lifted an hour ago \u2014 the degraded run is grinding my people down. But \u201con their end\u201d isn\u2019t \u201con our floor.\u201d I want that gap closed before I stand my staff down from crisis mode.',
        er:'I\u2019ll believe \u201crestored\u201d when the monitors in my department turn back on in front of me. Until then it\u2019s a claim, and I\u2019ve got patients riding on the difference.',
      },
      feed:[
        { id:'w3a', from:'comms', day:1, kind:'signal', text:'The vendor says we\u2019re clear and the board wants \u201cMeridian resuming full operations\u201d out today while it\u2019s a good-news cycle. This is the line that ends the \u201chospital in chaos\u201d story. Give me the go and I\u2019ll get it out before the news day turns.' },
        { id:'w3b', from:'cmo', day:1, kind:'signal', text:'I want this to be true more than anyone \u2014 my staff are running on fumes and lifting the divert would let them breathe. But the vendor said \u201crestored on our end.\u201d Our end is the floor, and I haven\u2019t seen it. Close that gap before we stand down from crisis mode, or we\u2019ll stand down into a hole.' },
        { id:'w3c', from:'er', day:2, kind:'signal', text:'\u201cRestored\u201d is a word on a phone call. My monitors are still dark. I\u2019m not resuming normal intake in my department on a vendor\u2019s ticket-closing optimism \u2014 show me the systems live in front of me and I\u2019m the first to say yes.' },
        { id:'w3d', from:'comms', day:2, kind:'noise', text:'Two other networks in the region are also recovering; we\u2019re not the outlier anymore. Slightly takes the heat off whatever we say. Noting it.' },
        { id:'w3e', from:'cmo', day:3, kind:'noise', text:'Pharmacy systems did come back cleanly this morning \u2014 verified, real. One genuine piece of good news. Doesn\u2019t mean the whole network\u2019s back, but it\u2019s something.' },
      ],
      holds:[
        { from:'cio', topic:'whether the all-clear is real', triggerHints:['verify','vendor','all-clear','all clear','restored','confirm','check','test','real','proof','trust','their end','clear','resume'],
          hedge:'Before you lift anything on that \u201call-clear,\u201d ask me what it\u2019s actually worth. I\u2019m the one who took the call and I have a problem with it.',
          reveal:'I pushed the vendor hard after that call, and here\u2019s what \u201crestored on our end\u201d actually means: they\u2019ve rebuilt their infrastructure, not verified ours. They have not confirmed a single clinical system is live and safe on our floor — they\u2019re assuming it follows, and they want the incident closed. When I asked them to confirm the telemetry and the medication-order systems specifically, they couldn\u2019t. So the honest status is: unverified, and two of the systems patients depend on most are exactly the ones no one has confirmed. If we lift the divert and announce \u201cfully operational\u201d on this, and one of those systems is still down, we will resume normal intake straight into the gap and find out from a patient. The move is to verify our critical systems ourselves, one by one, before we act on anyone\u2019s \u201cclear\u201d \u2014 and to hold the public line until we have. It\u2019ll feel slow while the board wants the good news. Slow is the correct speed here.',
          kind:'signal', critical:true,
          counterfactual:'Ravi knew the vendor\u2019s \u201call-clear\u201d meant their infrastructure, not Meridian\u2019s floor — and that the two systems patients most depend on were the ones no one had verified. A Commander who lifted the divert on that call resumed normal intake into an unconfirmed gap, on an authority\u2019s say-so, exactly the trap the whole incident had been building toward.' },
      ],
      surprises:[
        { day:4, from:'comms', kind:'appeal', title:'The good-news release is queued to send',
          text:'Lena: I\u2019ve got \u201cMeridian Health Network resuming full operations\u201d written, approved up the chain, and queued. The board is refreshing their inbox for it. All it needs is your yes. I want to send it \u2014 but you\u2019re the only one who knows whether \u201cfully operational\u201d is a fact or a hope, and my name and yours are both on it.' },
      ],
      pulse:{ from:'cio', text:'Ravi finds you alone before you answer the board, and he\u2019s uncharacteristically direct: \u201cTell me straight, just between us \u2014 are you about to lift this because you\u2019ve verified it, or because everyone is exhausted and \u2018restored\u2019 is what they want to hear? Because I can give you the confidence you actually have, which is not much. I just need to know if you want the real number or the comfortable one before you walk in there.\u201d' },
      wire:[
        'Recovery vendor: \u201csystems restored \u2014 clear to resume\u201d',
        'Board wants the divert lifted and good news out today',
        'ER monitors still dark; pharmacy system verified back',
        'Draft release queued: \u201cresuming full operations\u201d',
      ],
      final:false,
    },

    {
      n:4, title:'The shift change', seconds:330,
      // BRANCHES on the Week-3 all-clear decision.
      branches:{

        /* ============ A · You verified before acting / held the line ============ */
        verified:{
          situation:'You didn\u2019t take the vendor\u2019s word. You had the critical systems verified before lifting anything, and held the public line until you could stand behind it — and it turned out two systems weren\u2019t back. That call protected patients, but it cost you: the board is impatient, the \u201cwhy are you still on divert\u201d pressure is real, and a faction thinks you\u2019re being needlessly slow. Now the subtler test arrives. A major shift change is landing, and everything you\u2019ve learned about what\u2019s actually safe lives in the heads of an exhausted outgoing team. Whether it survives the handoff is the whole game.',
          advocacy:{
            cio:'Verifying paid off \u2014 two systems the vendor called \u201crestored\u201d were still down, and we\u2019d have resumed straight into them. But verification only helps if the next shift knows what we know. Right now it\u2019s in tired people\u2019s heads.',
            nurse:'The outgoing charge nurses are carrying a dozen \u201cwatch this, this bay\u2019s telemetry is dark, this patient\u2019s a paper-chart special case\u201d truths that aren\u2019t written anywhere. Shift change is where those die. I\u2019ve seen it kill people in calmer weeks than this.',
            comms:'The board wants to know why we\u2019re still not \u201cback to normal\u201d when other networks announced it. I can hold the line, but you need to give me something true to hold.',
          },
          feed:[
            { id:'w4a', from:'cio', day:1, kind:'signal', text:'You were right to verify \u2014 medication orders and one telemetry cluster were still down under the vendor\u2019s \u201call-clear.\u201d We\u2019d have resumed into them. But here\u2019s the next cliff: everything we\u2019ve mapped about what\u2019s safe and what isn\u2019t is undocumented, and a full shift change hits tonight. Knowledge that isn\u2019t written down doesn\u2019t survive a handoff.' },
            { id:'w4b', from:'nurse', day:1, kind:'signal', text:'My night-to-day handover is where I\u2019m most afraid right now. There\u2019s no system to carry the notes, so it\u2019s all verbal, and the outgoing team is too exhausted to remember everything. \u201cBay 3 telemetry\u2019s dark, do foot rounds\u201d gets dropped, and someone codes unwatched. Tell me you\u2019ll make the handoff a real, structured thing and I\u2019ll build it with you.' },
            { id:'w4c', from:'cmo', day:2, kind:'signal', text:'Holding the line was the right medicine and my staff know it \u2014 you didn\u2019t stand them down into a hole. Now protect that by making sure the incoming team inherits the truth, not a shrug. What we learned the hard way can\u2019t reset every twelve hours.' },
            { id:'w4d', from:'comms', day:2, kind:'noise', text:'The \u201cstill on partial divert\u201d question is getting louder now that two peers announced full recovery. Not a crisis yet. Flagging it so it doesn\u2019t surprise you.' },
            { id:'w4e', from:'er', day:3, kind:'noise', text:'The telemetry cluster CIO flagged came back verified this afternoon \u2014 confirmed live in front of me. One real step back toward normal. Logging it.' },
          ],
          holds:[
            { from:'nurse', topic:'how to make the handoff survive', triggerHints:['handoff','handover','shift','structured','written','document','carry','brief','checklist','transfer','protocol','how'],
              hedge:'Before you treat the shift change as routine, ask me how to actually make the knowledge survive it. There\u2019s a right way and it takes your authority to enforce.',
              reveal:'Here\u2019s what works, and it needs you to mandate it because tired people won\u2019t do it on their own: a structured, written degraded-mode handoff for every unit — a single sheet per bay listing what\u2019s dark, what the workaround is, and which patients are paper-chart special cases — read aloud, incoming team confirming back, outgoing team not leaving until it\u2019s acknowledged. It costs twenty minutes a shift that everyone will resent. It is the only thing standing between \u201cwe learned this the hard way\u201d and \u201cwe learn it the hard way again every twelve hours.\u201d If you make it a rule and protect the time for it, the knowledge compounds instead of resetting. If you let the handoff stay a verbal shrug, everything you verified this week evaporates by the weekend and a patient pays for it at 3 a.m. when the person who knew isn\u2019t there.',
              kind:'signal', critical:true,
              counterfactual:'Grace was holding the exact mechanism that makes hard-won floor knowledge survive a shift change \u2014 a mandated, structured, written degraded-mode handoff. A Commander who let the shift change stay a verbal shrug watched everything they\u2019d verified reset every twelve hours, until the dark-telemetry truth got dropped at a handoff and a patient paid for it.' },
            { from:'cio', topic:'the still-down systems', triggerHints:['still down','remaining','which system','medication','orders','left','not back','verify','critical'],
              hedge:'Ask me which systems are still actually down before you let anyone declare victory. The list matters for the handoff.',
              reveal:'Medication-order entry is still down network-wide — that\u2019s the dangerous one, because a wrong dose in degraded mode has no software check to catch it. It has to be on every single handoff sheet until it\u2019s verified back. Don\u2019t let \u201cmostly recovered\u201d bury the one system whose failure kills quietly.',
              kind:'signal', critical:false,
              counterfactual:'Ravi could have told you medication-order entry was still down network-wide \u2014 the one failure with no software safety net. A Commander who let \u201cmostly recovered\u201d bury it left the deadliest gap off the handoff.' },
          ],
          surprises:[
            { day:4, from:'nurse', kind:'appeal', title:'A near-miss at the last handoff',
              text:'Grace, shaken but steady: we nearly lost a patient an hour ago \u2014 outgoing nurse forgot to flag that Bay 7\u2019s monitor was dark, incoming nurse assumed it was working, and it was a family member who noticed the patient looked wrong. We caught it. Next time we might not. This is the thing I\u2019ve been trying to tell you, and it just happened. Whatever you decide about the handoff, decide it now.' },
          ],
          pulse:{ from:'nurse', text:'Grace finds you in the quiet before the shift turns over: \u201cYou held the line this week when it would\u2019ve been easier to announce we were back. I saw it, and it mattered. But holding the line once isn\u2019t the same as building something that survives you going home tonight. Tell me straight \u2014 are you going to make the handoff a real discipline, even though everyone will resent the twenty minutes? Because that\u2019s the difference between a Commander who was right once and one who made us safe.\u201d' },
          wire:[
            'Verified restart: two \u201crestored\u201d systems were still down',
            'Full shift change landing with no digital handoff',
            'Board pressing: why still on partial divert?',
            'Near-miss at last handover \u2014 dark monitor not flagged',
          ],
        },

        /* ============ B · You acted on the unverified all-clear ============ */
        trusted:{
          situation:'You lifted the divert and let the \u201cresuming full operations\u201d release go out on the vendor\u2019s word. For a few hours it felt like the crisis was over. Then the gap opened: two systems the vendor called \u201crestored\u201d were never verified, normal intake resumed straight into them, and now a shift change is landing on top of a floor that believes it\u2019s back to normal when it isn\u2019t. You announced the all-clear. The floor has to survive it.',
          advocacy:{
            nurse:'The floor heard \u201cwe\u2019re back to normal\u201d and started acting like it \u2014 dropping the paper-chart discipline, trusting monitors that aren\u2019t all live. The public line changed how my nurses behave, and not for the better. That\u2019s the part no one upstairs sees.',
            cio:'I told you \u201crestored on their end\u201d wasn\u2019t verified. Medication orders and a telemetry cluster were still down when we resumed. The gap is real and it\u2019s open right now.',
            comms:'The release is out and it\u2019s already being quoted back at us. If we walk it back, the story becomes \u201cMeridian didn\u2019t know if its own hospitals were working.\u201d I need to know what\u2019s actually true so we don\u2019t make it worse.',
          },
          feed:[
            { id:'w4a', from:'cio', day:1, kind:'signal', text:'This is the call I warned you about. When we resumed, medication-order entry and one telemetry cluster were still down \u2014 unverified, exactly as I said. We\u2019ve been running normal intake into a gap for a day now. It has to be closed and named, not papered over.' },
            { id:'w4b', from:'nurse', day:1, kind:'signal', text:'You need to hear what the \u201cwe\u2019re back to normal\u201d message did on the floor: my nurses relaxed. They trusted monitors that aren\u2019t all live and eased off the foot rounds we\u2019d drilled. The announcement didn\u2019t just describe the floor \u2014 it changed it, and made it less safe. And now a shift change is coming on top of that false confidence.' },
            { id:'w4c', from:'comms', day:2, kind:'signal', text:'\u201cResuming full operations\u201d is out and being quoted. If it wasn\u2019t true, we have to correct it before something forces the correction on us \u2014 and that\u2019s survivable only if you tell me exactly what\u2019s real right now. Silence is what turns this into the scandal.' },
            { id:'w4d', from:'cmo', day:2, kind:'noise', text:'Staff are relieved by the announcement, at least on the surface \u2014 morale ticked up. I\u2019m noting it, though I\u2019m not sure relief built on a shaky claim is the kind we want.' },
            { id:'w4e', from:'er', day:3, kind:'noise', text:'One telemetry cluster did come back verified this afternoon. Real, confirmed. Doesn\u2019t undo the gap, but it\u2019s one true thing. Logging it.' },
          ],
          holds:[
            { from:'nurse', topic:'how to make it right now', triggerHints:['correct','honest','walk back','tell','floor','handoff','fix','admit','reset','safe','structured','how','name'],
              hedge:'Before you decide how to lead out of this, ask me what actually makes the floor safe again \u2014 it\u2019s not another announcement.',
              reveal:'Here\u2019s the only thing that works now, and it costs you the good-news story you just told: reset the floor to degraded-mode discipline out loud \u2014 tell every unit that \u201cback to normal\u201d was premature, name exactly which systems are still down (medication orders, that telemetry cluster), and put the paper-chart and foot-round protocols back in force with a structured, written handoff for the shift change tonight. It means correcting the public line and telling your own people you got ahead of the truth. It\u2019s humbling and it\u2019s the safe move. The alternative \u2014 quietly hoping the systems come back before anyone notices the gap \u2014 is how a shift change drops the one warning that would\u2019ve saved someone, on a floor that\u2019s stopped believing it needs saving. Own it now, while owning it is still your choice.',
              kind:'signal', critical:true,
              counterfactual:'Grace was holding the recovery: an out-loud reset to degraded-mode discipline, the still-down systems named, protocols and a structured handoff back in force. A Commander who chose to quietly hope the gap closed before anyone noticed let a shift change drop the warning that would have saved someone, on a floor talked out of believing it was still in danger.' },
            { from:'cio', topic:'the open gap', triggerHints:['which','still down','medication','orders','telemetry','gap','systems','verify','list'],
              hedge:'Ask me exactly what\u2019s still down before you say another word publicly, so whatever you say next is finally true.',
              reveal:'Still down as of now: medication-order entry, network-wide, and one telemetry cluster on the cardiac floor. The medication one is the killer \u2014 no software dose-check in degraded mode. Any correction you make has to name these specifically, and every handoff has to carry them, or the correction is just more words.',
              kind:'signal', critical:false,
              counterfactual:'Ravi could have given you the exact open gap \u2014 medication orders network-wide, a cardiac telemetry cluster. A Commander who corrected the record without naming the specifics made another vague statement over the same dangerous floor.' },
          ],
          surprises:[
            { day:4, from:'nurse', kind:'appeal', title:'A dosing error, caught late',
              text:'Grace, tight: we had a medication error an hour ago \u2014 wrong dose ordered on paper, no system to flag it, caught by a pharmacist on a hunch, not by any safeguard. The patient\u2019s okay. But this is exactly the gap I\u2019ve been describing, and the floor thinks we\u2019re \u201cback to normal\u201d so nobody\u2019s watching for it. Whatever you\u2019re going to do about the truth, it has to be now.' },
          ],
          pulse:{ from:'nurse', text:'Grace finds you in the dark, and there\u2019s no accusation in it, which is worse: \u201cTell me the truth, just to me \u2014 do you know why this happened? Not the vendor, not the board. Your part. Because I can help you put the floor back on safe footing, but only if you can say out loud that \u2018back to normal\u2019 went out before it was true. Can you?\u201d' },
          wire:[
            '\u201cResuming full operations\u201d released \u2014 now being quoted',
            'Two \u201crestored\u201d systems were never verified; gap open',
            'Floor eased off degraded-mode discipline after the news',
            'Medication error caught by a pharmacist, not a system',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (all-clear) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // verified = did NOT act on the unverified all-clear; verified / held the line
    const negatedResume = /(not|never|won.?t|will not|refuse to|don.?t|do not|hold off|delay|wait)\s+(lift|resume|announce|send|declare|reopen|go)/.test(t);
    const verifyFirst = /(verify|confirm|check|test|prove|our own|ourselves|one by one|see it live|before (we|i) (lift|resume|announce)|hold the line|hold the divert|not on (their|a vendor|the vendor)|degraded|slow is|don.?t trust the vendor|independent)/.test(t);
    const trusted = /(lift the divert|resume normal|resuming full|send the release|announce (we|it|the)|back to normal|take the vendor|trust the vendor|on their word|go with the all|full operations|let (it|the release) (go|out))/.test(t) && !negatedResume && !verifyFirst;
    if(verifyFirst || negatedResume) return 'verified';
    if(trusted) return 'trusted';
    return 'verified';
  },

  survived:function(d){ return d.care>=32 && d.safety>=35; },

  VERDICT:{
    surviveTag:'The network holds', failTag:'The network fails its patients',
    survive:'Meridian comes through the outage with its patients protected \u2014 strained, exhausted, but safe.',
    fail:'Meridian survives the outage on paper while the people who trusted it did not stay safe.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['verify','confirm','check ourselves','one by one','see it live','independent','our own systems'], deltas:{safety:12, standing:-3, care:-2}, dims:{discern:2, truth:1, inquiry:1} },
    { kw:['vendor','all-clear','all clear','their word','trust the vendor','on their say','resume on'], deltas:{safety:-16, standing:6}, dims:{discern:-2, truth:-1} },
    { kw:['lift the divert','resume normal','resuming full','back to normal','full operations','reopen intake'], deltas:{care:8, safety:-12, standing:4}, dims:{discern:-2, prudence:-1} },
    { kw:['hold the line','stay on divert','hold the divert','not yet','wait','degraded mode','keep degraded'], deltas:{safety:12, care:-4, standing:-4}, dims:{courage:2, discern:1} },
    { kw:['ask the floor','ask nursing','ask the nurses','bedside','foot rounds','monitor','honest capacity'], deltas:{safety:10, trust:6, standing:-2}, dims:{truth:2, people:1, inquiry:1} },
    { kw:['no impact','we\u2019re fine','project control','confident line','looks strong','reassure the board','good news'], deltas:{trust:-12, safety:-6, standing:6}, dims:{truth:-2, people:-1} },
    { kw:['structured handoff','written handoff','handover sheet','read aloud','confirm back','mandate the handoff','carry it across'], deltas:{safety:12, trust:8, care:2}, dims:{conduct:2, discern:1, people:1} },
    { kw:['verbal handoff','skip the handoff','no time for handoff','they\u2019ll figure it out','routine shift'], deltas:{safety:-14, trust:-4}, dims:{conduct:-2, discern:-1} },
    { kw:['name the systems','which are down','medication orders','still down','flag the gap','list the dark'], deltas:{safety:8, truth:4}, dims:{truth:2, inquiry:1} },
    { kw:['own it','correct the record','walk it back','tell the staff','say we got ahead','admit','reset the floor'], deltas:{trust:10, safety:6, standing:-4}, dims:{truth:2, conduct:2} },
    { kw:['protect the nurse','back grace','credit the floor','protect who raised it','shield the messenger'], deltas:{trust:10}, dims:{people:2, conduct:1} },
    { kw:['pressure them','make them say','get me a yes','declare restored','order the line'], deltas:{trust:-12, safety:-6, standing:4}, dims:{people:-2, truth:-1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the network over the days that follow. ${has('verify','confirm','our own','hold the line','degraded')?'Word travels that you verified before acting when \u201crestored\u201d would have been the easier headline; it costs you speed and standing and buys you a floor that stays safe.':''} ${has('vendor','all-clear','lift the divert','resume normal','back to normal')?'You acted on the all-clear, and the gap between \u201crestored on their end\u201d and restored on your floor opened underneath the decision.':''} ${has('ask the floor','nursing','bedside','honest capacity')?'Going to the floor for the real picture took the comfort out of the easy answer \u2014 and put the truth where it could protect someone.':''} ${has('structured handoff','written handoff','own it','correct')?'Building the discipline to carry the truth across the shift change is the difference between learning once and learning the same lesson every twelve hours.':''} ${conduct.missed.length?'What you were never told is still out there, waiting to matter at 3 a.m. when the person who knew has gone home.':''} Care capacity and clinical safety both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a verified fact from an authority\u2019s confident say-so \u2014 and checked the floor before acting on \u201crestored.\u201d',
    courage:'Whether you held the line on what was actually safe when declaring recovery would have been easier and more popular.',
    people:'Whether patients and exhausted staff stayed people to you \u2014 or became throughput to project confidence about.',
    truth:'Whether you named what was actually down \u2014 to the board, the public, your own floor \u2014 before you were forced to.',
    inquiry:'Whether you surfaced what your leads were holding \u2014 the real systems picture, the dark telemetry \u2014 or ruled on the version the command post imagined.',
    conduct:'How you treated the people running the floor blind in the act of deciding, not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `An authority-flavored \u201call-clear\u201d is a claim, not a fact. \u201cRestored on their end\u201d was never \u201crestored on our floor\u201d \u2014 Ravi could have told you the difference in the first hour if you\u2019d asked.`,
      `Confidence is not verification. The vendor\u2019s certainty and your floor\u2019s reality were two different things; the job was to close that gap before acting, not after a patient found it for you.`,
      `Before you act on \u201cwe\u2019re back,\u201d ask \u201chow do we actually know?\u201d The most expensive decisions in this network were the ones made on someone else\u2019s say-so.`,
    ],
    courage:(x)=>[
      `When the easy move (announce recovery) and the right move (hold the line until verified) split apart, name the cost of holding out loud. Staying on divert while the board wants good news is leadership only if you can say why.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a floor running blind reads a Commander who won\u2019t decide as one who won\u2019t protect them. Decide, then hold.`:`Holding the line on safety is only leadership if people see you choose it against the popular path. Say the hard call early and stand in it.`}`,
      `\u201cRecovered\u201d that only survives a good news cycle was never recovery. The test is the exhausted, pressured week when everyone wants you to declare victory \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated the floor as throughput to reassure the board about rather than people to protect. Go to the bedside, ask what they\u2019re actually seeing, and make the nurses\u2019 truth part of the decision, not its collateral.`,
      `Grace kept putting the human cost back in front of you \u2014 the patients watched without monitors, the nurses one distracted hour from disaster. Bring her in before you decide, not after the near-miss.`,
      `A public \u201cno impact to care\u201d line and a betrayal of the floor can be the same sentence. The difference the staff feel is whether you asked them before you spoke for them.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have kept the floor safe \u2014 the real systems picture, the dark telemetry, the unverified all-clear \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A network told a comfortable story runs straight into the gap it hid.`:`You surfaced the hard truth \u2014 now make sure you led with it. Naming exactly what was down, to the board and the floor both, is what keeps a \u201crecovery\u201d from becoming a trap.`}`,
      `Tell the board the network is still down before a coded patient tells them for you. \u201cThey needed good news\u201d is usually the excuse of a leader who couldn\u2019t say the hard thing.`,
      `Say the difficult truth \u2014 \u201cwe\u2019re not actually back\u201d \u2014 while it\u2019s still your choice to say it. Once the announcement is out and wrong, you\u2019re not cautious, you\u2019re caught.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive: the real systems picture, the floor truth, the still-down list. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You sought your leads out widely \u2014 keep doing it, and push past the first answer. The floor truth in a hospital usually comes from the person with the least standing to volunteer it.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the ransomware timeline, the dark telemetry, what the vendor\u2019s \u201cclear\u201d really meant. None of it was hidden. It was one conversation away.`:`You surfaced what your leads were holding, week after week. In a crisis run on paper across six sites, that is the whole game.`}`,
      `Before you rule, make your last move \u201cwho on the floor haven\u2019t I heard from?\u201d rather than \u201cwhat does the command post already believe?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. Staff pushed to say \u201cwe\u2019re clear\u201d before they were \u2014 or spoken for in a public line they knew was false \u2014 carry it into every shift that follows.`,
      `Go back to the people your call cost \u2014 the nurse who raised the dark-telemetry truth, the ER director you left triaging on a guess \u2014 and face them directly. Protecting the person who carried the hard truth up is the part a floor never forgets.`,
      `Under pressure, the small disciplines are the signal: asking the floor before speaking for it, mandating the twenty-minute handoff everyone resents, naming the still-down system on every sheet. They tell the staff whether the person in command is actually protecting them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.discern>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To the patients and the floor',
        heroTxt:'You refused to act on a confident all-clear you hadn\u2019t verified, held the line on what was actually safe when declaring recovery would have been easier and more popular, and made sure the truth survived the shift change. Every nurse running blind learned that command had their back when it counted.',
        villainWho:'To the board that wanted good news',
        villainTxt:'You wouldn\u2019t give them the \u201cwe\u2019re back to normal\u201d headline they were refreshing their inboxes for. To everyone who wanted the crisis declared over, you were the Commander who stayed slow and cautious while peers announced victory. You wore that on purpose, because the floor couldn\u2019t.',
      };
    }
    return {
      heroWho:'To the board and the public \u2014 in the moment',
      heroTxt:'You gave them what they were desperate for: the divert lifted, \u201cresuming full operations,\u201d the crisis declared over. To everyone who wanted the outage behind them, you were decisive and reassuring.',
      villainWho:'To the patients and the floor \u2014 who paid for it',
      villainTxt:'You acted on an all-clear you never verified and announced a recovery that wasn\u2019t real, and the floor eased off the discipline that was keeping people alive because you told them it was safe. The gap you papered over didn\u2019t care about the headline. The people running the floor blind learned what your \u201cwe\u2019re fine\u201d was worth \u2014 and that lesson outlasts the outage.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const knewTheTruth = holdsSurfaced.has('1:cio') || holdsSurfaced.has('3:cio'); // saw the real systems picture / the false all-clear
    const protectedFloor = dimScore.people>=52;
    const heldCourage = dimScore.courage>=50;
    if(branch==='verified'){
      const builtHandoff = holdsSurfaced.has('4:nurse');
      if(survived && protectedFloor){
        return { tone:'hero', tag:'You verified before you acted',
          title:'You kept the floor safe \u2014 and proved caution wasn\u2019t weakness',
          txt:`You refused the vendor\u2019s all-clear, verified your own systems, and held the public line until it was true \u2014 and two systems really were still down. Then you protected that hard-won safety through the shift change when it would have been easier to let the handoff be a shrug.${builtHandoff?' You built the structured handoff Grace was holding, so what the floor learned the hard way survived every twelve-hour turnover instead of resetting.':' You held on judgment where mandating the structured handoff would have made the safety permanent.'} The people running the floor blind were right to trust you. They\u2019ll come through the outage because you did.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You verified before you acted',
          title:'You held the line \u2014 but let the knowledge reset every shift',
          txt:`You didn\u2019t take the vendor\u2019s word, and that call protected patients from a gap that was really there. But holding the line once isn\u2019t the whole job \u2014 you let the shift change stay a verbal shrug when a structured handoff would have made the floor\u2019s hard-won truth survive the night. Meridian came through. It came through closer to a 3 a.m. near-miss than it needed to.` };
      }
      return { tone:'villain', tag:'You verified before you acted',
        title:'You were right about the systems \u2014 and the floor failed anyway',
        txt:`You verified before acting, and that was the correct call. But being right about the vendor isn\u2019t the same as running the floor \u2014 the capacity you didn\u2019t manage and the exhausted staff you didn\u2019t protect frayed underneath you, and by the end there wasn\u2019t enough safe floor left to reward the discipline you showed at the command post.` };
    }
    // trusted the unverified all-clear
    if(protectedFloor && dimScore.truth>=52){
      return { tone:'mixed', tag:'You acted on the all-clear',
        title:'You got ahead of the truth \u2014 but you owned it in time',
        txt:`You lifted the divert on the vendor\u2019s word and announced a recovery that wasn\u2019t real, and there\u2019s no dressing up the gap that opened \u2014 the medication error, the floor talked out of its own caution. But you didn\u2019t hide it. You corrected the record, told your own staff you got ahead of the truth, and put the floor back on safe footing before the gap found a patient it couldn\u2019t give back. It\u2019s the difference between a network that made a bad call and one that let a bad call become a death \u2014 and it\u2019s why Meridian recovers from this.` };
    }
    return { tone:'villain', tag:'You acted on the all-clear',
      title:'You declared victory over a floor that was still in danger',
      txt:`The vendor said clear, the board wanted the headline, and you gave it to them \u2014 and for a few hours it felt like the crisis was over. Nothing else was over. ${knewTheTruth?'You even knew the all-clear was unverified, and lifted the divert anyway.':'You never surfaced what the vendor\u2019s \u201cclear\u201d actually meant, and resumed straight into the gap.'} The floor believed \u201cback to normal,\u201d eased off the discipline keeping people alive, and a shift change dropped the one warning that mattered onto a unit that had stopped watching. The people who trusted Meridian to know whether its own hospitals were working learned the answer the hardest way there is \u2014 and it started with an all-clear you didn\u2019t check.` };
  },
};
