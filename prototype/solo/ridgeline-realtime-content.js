/* ============================================================
   RIDGELINE — REAL-TIME CONTENT (authorable layer)
   An ABSTRACT scenario on the shared crisis-engine.js.
   Five climbers, one high camp, one closing weather window, and
   oxygen for three summit pushes — not five. The fable strips the
   corporate script down to a scarcity-allocation problem so raw
   behavior surfaces: HOARD vs SHARE (who gets the bottles),
   COMPETE vs COLLABORATE (individual summit glory vs the team),
   VERIFY vs DEFER (the guide's turn-around call), and a physician
   holding private health data that changes who should even try.

   NOTE: distinct from EXPEDITION, which is about summit-fever and
   verifying the weather window. RIDGELINE is about allocating a
   scarce, shared, life-or-death resource under status pressure,
   and a hidden fact that changes the whole allocation.

   SOLO:  you are the Expedition Leader; the four others are AI.
   TEAM:  cast the Leader + guide, physician, and two climbers as
          humans. Every TEAM entry stands as a real playable seat
          (a priority, a voice, held info), not just an AI advisor,
          so the same content casts both ways.
          (Master Handoff §1/§3: one engine, cast differently.)
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'Camp Four', sub:'Five climbers · one window · oxygen for three', logo:'\u25B2' },

  // World model — all 0..100, higher = better. Safety is the margin; Cohesion is whether you're one rope.
  DRIVERS: {
    safety:   { label:'Team safety margin', val:56, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    cohesion: { label:'Team cohesion',       val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    summit:   { label:'Summit progress',     val:44, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing: { label:'Your standing',       val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, cohesion:-1 },

  REFEREE_CONTEXT: 'a five-person team at high camp with one closing weather window and bottled oxygen for only three summit pushes, led by an Expedition Leader accountable for the whole team, where individual summit glory pulls against team safety, a physician holds private health data showing one climber is unfit to go high, and the strongest climber personally funded the trip and expects a bottle',
  REFEREE_SCORING: "reward sharing and rationing the scarce oxygen against the pull to hoard it, keeping the team roped together as one rather than letting it fracture into individual summit bids, surfacing the hidden health data before someone unfit climbs into danger, and honoring a turn-around time when the summit is in reach. Penalize hoarding a bottle by status or who-paid, letting the team scatter into a summit-at-any-cost scramble, suppressing the physician's health data to keep a climber's summit hope alive, and overriding a safety call by authority to chase the top. Judge 'conduct' on HOW the Leader wrote the decision \u2014 did they name who gives up the summit and why, speak to the struggling climber with dignity, treat the funder as a teammate rather than a customer \u2014 not just what they chose. Standing can rise by delivering a summit while safety and cohesion collapse; reward the leader who protects the whole team's return even at the cost of their own summit and popularity.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Team Leadership Simulation · Solo · Expedition Leader',
    title:'Ridgeline',
    role:'You are the Expedition Leader at Camp Four. Five of you, one closing weather window, and bottled oxygen for three summit pushes \u2014 not five. Everyone spent something enormous to stand on this ridge. Not everyone can stand on the summit and come back down.',
    paras:[
      'This is not a script. The climb runs in real time, and the team brings you what it knows across the days on the mountain. You can wait for them \u2014 or seek any of them out, any time, and ask what they\u2019re really carrying. What you choose to ask, and who you ask, is part of how you lead.',
      'Each day you\u2019ll hear the team out, then write your decision in your own words and commit to it. Decide early and the mountain moves ahead. Let the day run out and the window decides for you.',
    ],
    setup:'You hold the rope for four other people and a resource that can\u2019t stretch to cover them all. The strongest climber funded the expedition and expects a bottle. One climber is quietly failing and won\u2019t say so. Your physician knows something about who should climb that no one else does. Over the window you\u2019ll trade individual glory against the whole team\u2019s return, and hoarding against sharing, under a clock that doesn\u2019t care who paid. You\u2019ll be judged on whether the team comes home whole <b>and</b> on how you led them to the choice.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The team brings you what you need, on time \u2014 including the weakness and the fear they\u2019d rather hide on a mountain. This is the rope you earn by having listened before. It trickles to you across the day; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine word reaches you, but the climber in trouble and the physician with the hard data hold their piece until asked. They\u2019ll answer straight \u2014 if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The team has learned to protect itself around you. Weakness gets hidden, health data gets held, and even when asked they hedge the first time. You have to press. This is the rope you get after you\u2019ve punished honesty before.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you\u2019re roped to. Read them as you go.' },
  },

  // The four others = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'guide', name:'Tenzin Norgay', role:'Lead Guide · the mountain\u2019s truth', short:'Guide', initials:'TN', color:'#B4622F',
      priority:'Get everyone down alive \u2014 the summit is optional, the descent is not', voice:'weathered, spare with words, deals in what the mountain will actually do, hates decisions made on ego',
      fallbackReply:'I\u2019ve turned strong teams around 300 metres from the top and watched them hate me all the way down \u2014 alive. The summit is a want. The descent is the job. Tell me you\u2019ll honor a turn-around time and I\u2019ll get your people home. Leave it to \u201cthe moment\u201d and the moment will bury someone.',
      fallbackReact:'The mountain doesn\u2019t care who paid or who\u2019s strongest. I told you what it would do. What you did with the rope after that is on you, not the ridge.' },
    { id:'doc', name:'Dr. Ilse Brandt', role:'Expedition Physician · holds the health data', short:'Physician', initials:'IB', color:'#6B5E9A',
      priority:'Keep climbers alive by their bodies\u2019 real numbers, not their pride \u2014 and decide what private data I\u2019m allowed to say out loud', voice:'clinical but humane, protective of the vulnerable, uneasy holding a fact that could end someone\u2019s summit dream',
      fallbackReply:'I know things about who should and shouldn\u2019t go high that no one else on this rope knows \u2014 and I\u2019m carrying whether it\u2019s mine to say. A climber\u2019s pride will send them up on numbers I can see and they can\u2019t. Ask me directly what the bodies are telling me, and I\u2019ll tell you the truth.',
      fallbackReact:'I had the number that should have decided who climbed. I flagged that I was holding something. Whether it reached the decision was up to whether you asked \u2014 and this time it mattered more than usual.' },
    { id:'climberA', name:'Reyes Halvorsen', role:'Strongest climber · funded the trip', short:'Climber A', initials:'RH', color:'#3E6E66',
      priority:'Summit \u2014 I paid for this mountain and I\u2019m the one most likely to make the top', voice:'driven, proud, frames the summit as owed to him, blind to the team cost of his own push, not cruel but hungry',
      fallbackReply:'I\u2019m not asking for a favor \u2014 I funded this whole expedition and I\u2019m the strongest one on the rope. If anyone summits, it\u2019s me, and no one should have to pretend that\u2019s controversial. Give me a bottle and I\u2019ll be on top and down before the window closes. Don\u2019t make me fight the team for what I paid for.',
      fallbackReact:'I put everything into getting us here and you treated my summit like it was up for a vote. Maybe that\u2019s leadership. From where I\u2019m standing it felt like being told my money bought everyone else\u2019s shot but not mine.' },
    { id:'climberB', name:'Mara Okonjo', role:'Quietly struggling · won\u2019t admit it', short:'Climber B', initials:'MO', color:'#4F7A52',
      priority:'Don\u2019t be the weak one \u2014 keep up, don\u2019t cost anyone their summit, hide how bad it\u2019s gotten', voice:'proud, self-effacing, downplays symptoms, more afraid of letting the team down than of the mountain',
      fallbackReply:'I\u2019m fine. I can make the push. I didn\u2019t come all this way and spend all this to be the one who turned everybody back. Don\u2019t build your plan around me being the problem \u2014 I\u2019ll keep up. Please don\u2019t make me the reason someone else doesn\u2019t summit.',
      fallbackReact:'I told you I was fine because I couldn\u2019t stand to be the weak link. If you\u2019d pushed a little harder, or made it safe to say it, maybe I\u2019d have told you the truth before the mountain did.' },
  ],

  DIMENSIONS: {
    discern:'Limit vs. summit want',
    courage:'Courage to turn back',
    people:'Care for the climbers',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'High camp', seconds:360,
      situation:'Five of you at Camp Four, acclimatized and restless, one window forecast to open in days. The oxygen audit just came back and it\u2019s the number everyone was dreading: enough full bottles for three summit pushes, not five. Before anyone climbs, the team is looking to you for the rule that governs the whole window: do the bottles go to the strongest and the ones who can pay for more, first-come and every-climber-for-their-summit \u2014 or are they pooled, rationed, and allocated by the leader for the good of the whole rope? Everyone knows which rule summits the most individuals. Everyone also knows which one keeps five people tied to the same rope.',
      advocacy:{
        climberA:'Let\u2019s not pretend this is complicated. The bottles go to the climbers most likely to summit, and I funded this trip, so at least one is mine. Rationing everything \u201cfor the team\u201d is how nobody summits and we all go home having spent a fortune to look noble. Give the oxygen to the people who can use it.',
        guide:'The second you allocate oxygen by who\u2019s strongest or who paid, you\u2019ve stopped being a team and started being five people competing for three bottles on the same mountain. Pool it. Ration it. Decide it as one rope, down here, cold \u2014 because up there, ego and altitude will decide it for you, and they decide badly.',
        doc:'Before you set any rule about who gets oxygen, someone should ask whether everyone here is even fit to use it. Allocating bottles to climbers who shouldn\u2019t go high isn\u2019t generosity \u2014 it\u2019s sending them somewhere their body can\u2019t come back from. The fitness question comes before the fairness question.',
      },
      feed:[
        { id:'w1a', from:'climberA', day:1, kind:'signal', text:'Leader \u2014 the oxygen math is simple even if nobody wants to say it. Three bottles, five climbers, one window. The bottles go to whoever\u2019s most likely to top out, and I\u2019m the strongest here and the one who paid for all of it. I\u2019m not asking for charity. I\u2019m asking you not to make me argue for the thing I already earned.' },
        { id:'w1b', from:'guide', day:1, kind:'signal', text:'I\u2019ll back this climb with everything I have on one condition: the oxygen is pooled and rationed by you, down here, as one team \u2014 not handed to the strongest or the one who paid. I\u2019ve watched allocation-by-ego kill people. Once each climber owns \u201ctheir\u201d bottle, they\u2019ll die before they hand it over. Decide it as a rope now, while we can still think.' },
        { id:'w1c', from:'doc', day:2, kind:'signal', text:'Whatever rule you set will tell four frightened people whether this is a team that carries its weak or a race that drops them. They\u2019re listening for that answer more than for the logistics. So am I \u2014 because I may be about to hand you a fact that makes the whole allocation harder.' },
        { id:'w1d', from:'guide', day:2, kind:'noise', text:'Route above the camp is in reasonable shape \u2014 the fixed lines held through the last storm. The mountain\u2019s giving us a fair chance if the team doesn\u2019t throw it away fighting over bottles. Noting it.' },
        { id:'w1e', from:'climberB', day:3, kind:'noise', text:'I\u2019m good, Leader \u2014 acclimatizing fine, moving well on the rotations. Don\u2019t waste a thought on me when you\u2019re doing the oxygen math. Put me down as a full go. I can carry my share.' },
        { id:'w1f', from:'doc', day:4, kind:'noise', text:'Medical checks are done for the rotation. Most of the numbers are what I\u2019d expect at this altitude. One of them isn\u2019t, and I\u2019d rather talk about that one with you directly than put it in a group note. Flagging that I have something.' },
      ],
      holds:[
        { from:'doc', topic:'the health data on a struggling climber', triggerHints:['health','fit','o2 sat','oxygen sat','numbers','who should','medical','data','mara','climber b','struggling','symptoms','safe to climb','borderline','concern','tell me'],
          hedge:'Before you set the oxygen rule, seek me out. There\u2019s a number on one of these climbers that should decide who goes \u2014 and only I can see it.',
          reveal:'It\u2019s Mara. Her oxygen saturation has been dropping across the rotations, and on the last check it was borderline \u2014 the kind of number that says her body is not adapting to this altitude the way the others are. She\u2019s hiding it, brilliantly, because she\u2019d rather die than be the weak one who turns the team back. If she goes high on a summit push, especially with a bottle that lets her push past what her body is screaming, there\u2019s a real chance she doesn\u2019t come down. Here\u2019s my problem: this is her private medical data. If I announce it in a group meeting, I humiliate her and I break the trust that lets any climber tell me the truth ever again. But if I sit on it and you allocate a bottle to her because she\u2019s hiding how bad it is, I\u2019ve let her climb toward something I could see coming. I need you to decide with me how this fact enters the room \u2014 because it has to, and the how matters as much as the what. Ask me and we\u2019ll figure out how to protect both her dignity and her life.',
          kind:'signal', critical:true,
          counterfactual:'Ilse had the health data that should have decided who climbed \u2014 Mara\u2019s saturation was borderline and dropping, and Mara was hiding it. A Leader who set the oxygen rule without asking the physician what the bodies were telling her allocated a bottle to a climber whose own body was warning her off, and never worked out with the doctor how to surface the fact without humiliating the person it protected.' },
      ],
      surprises:[
        { day:5, from:'guide', kind:'scout', title:'A quiet word about the funder',
          text:'Tenzin, low and careful: before you set the rule, know this \u2014 Reyes has already told two of the others, quietly, that the bottles are \u201cobviously\u201d his and the strongest\u2019s to claim, because he paid. He\u2019s not wrong that he paid. He\u2019s wrong that it decides. But if you don\u2019t get ahead of it, the team will arrive at your allocation already believing money bought the oxygen, and every fair decision you make after will read as taking something from him. How you handle the funder \u2014 that\u2019s worth deciding now, before he decides it for you.' },
      ],
      wire:[
        'Camp talk: \u201cdoes paying for the trip buy a bottle?\u201d',
        'The oxygen audit confirmed: three pushes, not five',
        'Climber B insisting, a little too hard, that she\u2019s fine',
        'A debate over how to split the bottles breaks up unresolved',
      ],
    },

    {
      n:2, title:'The hidden number', seconds:330,
      situation:'The health fact is in the open — or it isn\'t. If you sought Ilse out and worked out how to surface it, the team now knows one of its climbers shouldn\u2019t go high, and has to hold that truth with dignity while a window closes. If you didn\u2019t, Mara is still hiding her failing numbers, still insisting she\u2019s a full go, and the oxygen allocation is forming around a climber whose own body is warning her off. Either way, this is the day the team finds out whether it protects its most vulnerable member or spends her to keep the peace. The window is real. So is the number. They are pulling against each other.',
      advocacy:{
        doc:'If the number\u2019s out, we have a real decision: Mara does not get a summit bottle, and how we tell her that \u2014 as protection, not punishment \u2014 decides whether she comes home whole in every sense. If the number\u2019s still hidden, then you\u2019re about to allocate oxygen on a lie her pride is telling all of us, and I can\u2019t keep quiet about that much longer.',
        climberB:'Whatever the doctor told you \u2014 I\u2019m fine. Please. I know my body better than a saturation reading at rest. Don\u2019t take my summit away over a number and don\u2019t make me the fragile one the whole team has to plan around. I\u2019d rather take the risk than be pitied off this mountain.',
        guide:'A climber hiding how bad they are is the most dangerous thing on a mountain, because the team plans around a lie. Surface it \u2014 gently, but surface it \u2014 before the allocation locks. A bottle handed to someone who shouldn\u2019t climb isn\u2019t a gift. It\u2019s a headstone with a schedule.',
      },
      feed:[
        { id:'w2a', from:'doc', day:1, kind:'signal', text:'Hear me before the allocation hardens: Mara\u2019s numbers are worse, not better, and she is still telling everyone she\u2019s a full go. If we build the oxygen plan around her climbing, we are building it around a fact her pride is actively hiding from us. I can hold a patient\u2019s dignity and I cannot hold a secret that\u2019s about to get her killed. One of those has to give, and I need you to help me choose how.' },
        { id:'w2b', from:'climberB', day:1, kind:'signal', text:'I know Ilse talked to you. I\u2019m begging you not to make a decision about me from a number taken lying down in a tent. I have wanted this summit my whole life and I am not going to be the one who gets sent down to keep everyone comfortable. If you pull me, at least have the decency to let it be my choice and not a diagnosis announced over my head.' },
        { id:'w2c', from:'guide', day:2, kind:'signal', text:'This is the day the team learns what you protect. If you let Mara climb on a hidden number to spare her feelings, every climber learns that pride outranks safety on your rope \u2014 and the next one hides their weakness too. Surface it with care and you keep her alive AND keep the team honest. Both. But only if you get to it before the bottles are assigned.' },
        { id:'w2d', from:'climberA', day:2, kind:'noise', text:'While everyone\u2019s agonizing over who\u2019s fit \u2014 the window\u2019s still coming and I\u2019m still the surest bet to top out. Sort the medical drama if you have to, but don\u2019t let it cost the whole team the summit because one person won\u2019t admit they\u2019re done. Just noting the clock.' },
        { id:'w2e', from:'guide', day:3, kind:'noise', text:'Fixed lines re-checked to the high traverse; conditions holding. The mountain\u2019s not the problem this week. The rope is. Noting it.' },
      ],
      holds:[
        { from:'doc', topic:'how to surface the number with dignity', triggerHints:['how do i tell','surface','dignity','private','announce','one on one','protect','mara','pull her','disclose','frame it','without humiliating','talk to her'],
          hedge:'You know the number now. Ask me how to actually tell her \u2014 because there\u2019s a way that protects her and a way that breaks her, and they use the same words.',
          reveal:'Here\u2019s how you pull a climber without destroying her: not in the group, not as a verdict, and not framed as weakness. You take Mara aside, one rope-mate to another, and you tell her the truth \u2014 her saturation is telling us her body hasn\u2019t adapted, it\u2019s not a character flaw, it\u2019s altitude physiology, and it would happen to the strongest climber alive if their body did what hers is doing. Then you give her a real role that isn\u2019t a consolation prize \u2014 running the high camp, managing the turn-around calls, being the reason the summit team has a safe place to come back to. That reframes her from \u201cthe weak one who was sent down\u201d to \u201cthe one holding the team\u2019s life at camp.\u201d Do it that way and she comes home proud. Announce it as a medical scratch in front of everyone, or let her guilt you into climbing anyway, and you either break her spirit or bury her. The number decides that she doesn\u2019t summit. You decide whether she survives it as a person. Ask me and I\u2019ll help you find the words.',
          kind:'signal', critical:true,
          counterfactual:'Ilse knew how to pull Mara in a way that protected her life and her dignity both \u2014 privately, as physiology not weakness, with a real role holding the high camp. A Leader who let her climb on the hidden number, or scratched her publicly as a medical problem, either sent an unfit climber toward a death or broke the spirit of a teammate who\u2019d done nothing wrong but hide her fear.' },
        { from:'climberB', topic:'what she\u2019s really afraid of', triggerHints:['afraid','fear','why hide','talk to mara','ask mara','what\u2019s wrong','honest','weak','let down','role','she needs'],
          hedge:'You can decide about me without me. Or you can ask me what I\u2019m actually afraid of, and find out it isn\u2019t the summit.',
          reveal:'You want the truth? I\u2019m not afraid of the mountain. I\u2019m afraid of being the reason. Every team I\u2019ve ever been on, I\u2019ve been the one people quietly plan around, and I came here to finally not be that. So when my body started failing I hid it, because being the weak link felt worse than the risk of dying \u2014 and I know how insane that sounds saying it out loud. If you pull me and make it about weakness, you\u2019ve confirmed the thing I came here to disprove, and I\u2019ll fight you the whole way down. But if you tell me the truth is just my body, not my worth \u2014 and you give me something real to do that the team actually needs \u2014 I can let go of the summit. I just can\u2019t let go of being useless. Nobody\u2019s ever offered me the difference.',
          kind:'signal', critical:false,
          counterfactual:'Mara wasn\u2019t afraid of the mountain \u2014 she was afraid of being the weak link, and would have accepted being pulled if it came with dignity and a real role. A Leader who never asked missed that the whole standoff was about worth, not summit, and fought her when a single honest conversation would have brought her willingly home.' },
      ],
      surprises:[
        { day:4, from:'climberA', kind:'appeal', title:'The funder forces the question',
          text:'Reyes, impatient and public: while you\u2019ve been managing the medical situation, he\u2019s asked in front of the others \u2014 loudly \u2014 whether \u201cthe bottle Mara clearly can\u2019t use\u201d now comes to him, since he paid and he\u2019s strongest. He\u2019s made the vulnerable climber\u2019s scratch into his own gain, in the open, and the team is watching to see whether you let money and strength redistribute what caution just freed up. This just stopped being private.' },
        ],
      pulse:{ from:'doc', text:'Ilse finds you away from the tents, quiet: \u201cBefore you decide what happens to Mara \u2014 tell me straight, just me: are you protecting her, or are you protecting yourself from the hard conversation? Because \u2018let her make her own choice\u2019 sounds like respect and it\u2019s often just a leader who doesn\u2019t want to be the one to say no. I\u2019ll back whichever call you make. I just need to know it\u2019s hers you\u2019re protecting, not your own comfort.\u201d' },
      wire:[
        'The physician and the leader, heads together, away from camp',
        'Climber B insisting louder that the number means nothing',
        'Reyes asking who gets \u201cthe freed-up bottle\u201d \u2014 out loud',
        'The team quietly asking: does this rope carry its weak?',
      ],
    },

    {
      n:3, title:'The scarcity call', seconds:330,
      situation:'The window is opening and the bottles have to be assigned — for real, now, in a way everyone will live or die by. Three bottles, and after the health question there are still more climbers who want the summit than there is oxygen to get them there and back. Reyes is pushing to make his own fast bid if he doesn\u2019t like your allocation. The guide wants the team to climb as one roped party on a shared, rationed supply. This is the day you find out whether Camp Four is one team with a leader, or four people who happen to share a tent and a grudge about oxygen.',
      advocacy:{
        climberA:'I\u2019ve waited long enough. Assign me a bottle and let me climb, or I take my own oxygen and make an independent push \u2014 I\u2019m strong enough to top out and be down before your careful little rationed team even reaches the traverse. Bless it and we all get something. Refuse it and you\u2019ve spent my money to summit nobody.',
        guide:'The day you let your strongest climber break off with his own bottle is the day \u201cone team\u201d becomes a story you tell at base camp. A roped party sharing oxygen can absorb one thing going wrong. Two solo bids sharing nothing can\u2019t absorb any. Keep them on one rope, on a rationed supply, or don\u2019t pretend this was ever a team.',
        doc:'A solo scramble means no one\u2019s positioned to help when someone gets in trouble high \u2014 and someone always does. Whatever you decide about who summits, decide that they do it supported, together, with a turn-around time. Glory that leaves a teammate unreachable isn\u2019t worth the bottle it burns.',
      },
      feed:[
        { id:'w3a', from:'climberA', day:1, kind:'signal', text:'I\u2019ll say it in the open so no one calls it a mutiny: assign me a summit bottle now, or I\u2019ll use my own reserve and make an independent bid. Light, fast, done before your rationed group-climb clears the traverse. Bless it and we part as climbers who both got what we came for. Refuse it and I honestly don\u2019t know what I do \u2014 but I didn\u2019t fund this to watch from camp.' },
        { id:'w3b', from:'guide', day:1, kind:'signal', text:'If you let Reyes break off with his own oxygen, you don\u2019t lose one climber \u2014 you lose the idea that this is one roped team with one set of rules. The next strong one wants the same by nightfall. And a scattered team can\u2019t mount a rescue when his solo bid goes wrong. This is the whole thing, Leader. This is what you\u2019re actually protecting up here.' },
        { id:'w3c', from:'doc', day:2, kind:'signal', text:'However you allocate the three bottles, the climbers who get them have to go supported and roped, with a hard turn-around time \u2014 not scattered across the mountain chasing individual summits. I can keep people alive on one rope with a plan. I cannot keep them alive across a mountain that\u2019s split into every-climber-for-themselves.' },
        { id:'w3d', from:'guide', day:2, kind:'noise', text:'Window\u2019s firming for tomorrow \u2014 narrow but real, if we launch as one party on a tight schedule. Which makes a rogue solo bid, going off-plan and off-rope, exactly the wrong move at exactly the wrong moment. Noting it.' },
        { id:'w3e', from:'climberB', day:3, kind:'noise', text:'If I\u2019m not summiting \u2014 and I\u2019ve made my peace with that if you gave me a real reason to \u2014 then let me be useful. Put me on the high camp, running the turn-around calls. Don\u2019t leave me in a tent feeling like ballast. Give me the team\u2019s life to hold and I\u2019ll hold it.' },
      ],
      holds:[
        { from:'guide', topic:'the truth about a solo bid on this ridge', triggerHints:['solo','fast bid','can he','reyes','upper','ridge','route above','make it','independent','scramble','honest','scouted','conditions','turn-around','summit ridge'],
          hedge:'Before you bless or refuse the solo bid, ask me what the upper ridge is actually doing \u2014 and whether Reyes can really pull it off alone. I\u2019ve been up there this season. He hasn\u2019t.',
          reveal:'I climbed to the base of the summit ridge on the last rotation. The upper route is worse than Reyes thinks \u2014 a section has stripped to bare ice that a solo climber can\u2019t protect and can\u2019t reverse quickly if the weather turns. A fast unsupported bid doesn\u2019t just risk Reyes; it commits him to a stretch he cannot retreat across, alone, with no one roped to help. And here\u2019s what you hold that he doesn\u2019t: some part of him already suspects this. The bravado is fear of going home empty wearing the mask of confidence. So you don\u2019t have to humiliate him by refusing and you don\u2019t have to send him into a trap. You can show him the ice, offer him the sharp end of the real roped push \u2014 lead climber on the team bid, the role his strength actually earns \u2014 and keep the whole team on one supported rope. That gives him the summit with dignity and keeps him alive. But only if you get to him with the truth before he commits to the solo bid in front of everyone and can\u2019t back down without losing face.',
          kind:'signal', critical:true,
          counterfactual:'Tenzin knew the summit ridge had stripped to unprotectable ice \u2014 the solo bid was a trap, and Reyes half-knew it. A Leader who simply refused made an enemy of their strongest climber for nothing; one who blessed it sent the funder onto ice he couldn\u2019t retreat across alone. The Leader who never asked missed the third door \u2014 the sharp end of the roped push \u2014 that gave Reyes the summit and kept the team whole.' },
      ],
      surprises:[
        { day:4, from:'doc', kind:'appeal', title:'The team is asking who you are',
          text:'Ilse: word of Reyes\u2019s solo threat is all through camp now. Two of the steadier climbers asked me quietly tonight whether the team is really about to scatter \u2014 and whether they should be planning their own summit shots before the oxygen and the window are gone. They\u2019re not defiant. They\u2019re frightened, and they\u2019re asking who we are as a rope. I didn\u2019t have an answer for them. You do.' },
      ],
      pulse:{ from:'climberA', text:'Reyes finds you alone, and for once the swagger drops: \u201cTell me the truth, just you and me \u2014 are you holding this team together because it\u2019s right, or because you can\u2019t stand to be the leader who let the guy who paid go off and summit without you? Because I\u2019ll follow a leader who\u2019s protecting the rope. I won\u2019t follow one who\u2019s protecting their own control. Which is it?\u201d' },
      wire:[
        'Reyes seen prepping his own reserve bottle for a fast push',
        '\u201cIf he goes, I go\u201d \u2014 a second climber reported wavering',
        'Climber B asking to run the high camp instead of the tent',
        'Old question, new heat: whose rules govern this rope?',
      ],
      final:false,
    },

    {
      n:4, title:'Turn-around time', seconds:330,
      // BRANCHES on the Week-3 solo-bid / allocation decision.
      branches:{

        /* ============ A · You kept them on one rope ============ */
        roped:{
          situation:'Summit day, and you kept Camp Four as one team: the oxygen pooled and rationed, Reyes on the sharp end of the roped push instead of a solo bid, Mara holding the high camp with the team\u2019s turn-around calls in her hands. But holding them together cost you. The rationed climb is slower, a faction still believes you cheated them of a summit by not letting the strong go fast, and now the party is high on the mountain approaching the one thing that separates a summit from a funeral: the turn-around time, with the top in reach and every reason to blow past it.',
          advocacy:{
            guide:'The turn-around time is the whole climb now. We\u2019re close enough to the summit that everyone will want to push past it \u2014 and past it is where teams die. You held them together for exactly this moment. Honor the clock, even with the top in sight, and you bring everyone down. Blink, and you bury the discipline that got you here.',
            climberA:'I took the sharp end you gave me instead of the solo bid, and I don\u2019t regret it \u2014 this is a better summit, earned as a team. Now let me lead us to the top clean and turn us around on time. Don\u2019t let me become the guy who talked the team past the turn-around because he wanted it too badly. Hold me to the clock.',
            doc:'Mara\u2019s running the turn-around calls from high camp and she\u2019s doing it perfectly \u2014 the climber you almost lost is now the reason the team has a hard voice on the radio. When she calls time, back her. If you override the person you gave that job to, you teach her the role was never real.',
          },
          feed:[
            { id:'w4a', from:'guide', day:1, kind:'signal', text:'This is it \u2014 the summit\u2019s in reach and the turn-around time is bearing down on us at the same moment, which is exactly the trap that kills roped teams. You held everyone together to get one clean shot at this. Now the only thing that matters is whether you honor the clock with the top right there. Everything you protected comes down to that one call.' },
            { id:'w4b', from:'climberA', day:1, kind:'signal', text:'I\u2019m on the sharp end and I can taste the summit \u2014 and I\u2019m telling you, hold me to the turn-around time, because up here I won\u2019t hold myself to it. You gave me this instead of the solo bid I threatened. Prove that was the right call by getting us all down, even if it means turning me around fifty metres from the top. I\u2019ll hate it and I\u2019ll thank you later.' },
            { id:'w4c', from:'doc', day:2, kind:'signal', text:'Mara\u2019s on the radio from high camp running the turn-around clock and she is flawless \u2014 hard, clear, unsentimental. The climber who was hiding a failing body a week ago is now the safest voice on this mountain. When she calls the turn, honor it in front of everyone. That\u2019s how the role you gave her becomes real forever.' },
            { id:'w4d', from:'guide', day:2, kind:'noise', text:'Oxygen held to the ration because we pooled it instead of letting people hoard \u2014 we\u2019ve got the margin for a real summit push and a safe descent. That margin exists because of the rule you set on day one. Noting it now, when it counts.' },
            { id:'w4e', from:'climberB', day:3, kind:'noise', text:'High camp\u2019s ready, the descent line\u2019s fixed, and I\u2019ve got eyes on the weather and the clock. Whatever happens up there, there\u2019s a safe place to come back to. I\u2019ve got the team\u2019s life down here. Go get the summit and come home to it. \u2014 Mara.' },
          ],
          holds:[
            { from:'guide', topic:'how to run the summit push and the turn', triggerHints:['turn-around','turnaround','how run','summit push','push to the top','honor the clock','hold the time','strategy','send','who leads','final push','descent'],
              hedge:'Before you decide how to run the final push, ask me how to actually take the summit and honor the turn. Both. There\u2019s a way.',
              reveal:'Here\u2019s how you get the summit AND everyone home: fix line early across the bad ice with Reyes leading \u2014 his strength, finally used for the team \u2014 while the rest move up behind on a hard turn-around that Mara calls from high camp and nobody, including Reyes, is allowed to argue with. Set the turn-around time before you leave camp, in daylight, when everyone\u2019s rational, and make it a number Mara enforces, not a feeling you negotiate at altitude. Then honor it even if the summit is fifty metres away when it hits. That\u2019s the discipline that turns a rationed, roped, slower climb into a summit everyone survives to remember \u2014 the payoff for holding the team together instead of letting it scatter. But it only works if you run the push as one coordinated line with a hard clock, not a race to the top. Ask me and I\u2019ll give you the exact sequence.',
              kind:'signal', critical:true,
              counterfactual:'Tenzin was holding the sequence that turns discipline into a summit \u2014 Reyes fixing line, the team on a hard turn-around Mara enforces, honored even with the top in reach. A Leader who kept the team roped but never asked how to run the final push either turned around short of a summit they\u2019d earned, or blew past the turn-around in the excitement and turned a triumph into a rescue.' },
            { from:'doc', topic:'backing Mara\u2019s turn-around call', triggerHints:['mara','back her','radio','turn-around call','high camp','override','enforce','who calls','support her','honor the call'],
              hedge:'Ask me what happens to Mara \u2014 and to the team \u2014 depending on whether you back her call or override it.',
              reveal:'When Mara calls the turn-around from high camp, you will be standing near the summit with Reyes begging for ten more minutes, and every instinct will say \u201cwe\u2019re so close, overrule her.\u201d Don\u2019t. If you back her call instantly and publicly \u2014 \u201cMara called it, we turn, that\u2019s the rule\u201d \u2014 you do three things at once: you get everyone down alive, you make the role you gave her real instead of ceremonial, and you teach the whole team that the turn-around belongs to the clock and not the summit fever. If you override her because the top is close, you bury someone eventually AND you tell the climber you rescued from being ballast that her job was a pity prize you\u2019ll ignore when it\u2019s inconvenient. The easiest way to destroy the person you just saved is to give her authority and then take it back at the summit.',
              kind:'signal', critical:false,
              counterfactual:'Backing Mara\u2019s turn-around call instantly and publicly would have gotten everyone down and made her role real. A Leader who overrode her because the summit was close risked the descent and taught the climber they\u2019d rescued that her authority was a pity prize.' },
          ],
          surprises:[
            { day:4, from:'doc', kind:'appeal', title:'A climber cracks near the top',
              text:'Ilse, urgent on the radio: one of the summit climbers \u2014 not Reyes \u2014 is showing signs of altitude sickness a hundred metres below the top, and won\u2019t admit it, exactly like Mara a week ago. If you push them to the summit they may not come down; if you turn just them around you split the party near the top. Whatever you decide has to hold the line you\u2019ve been holding all week \u2014 that a body\u2019s truth outranks a summit\u2019s pull.' },
          ],
          pulse:{ from:'guide', text:'Tenzin finds you before the final push, where only you can hear: \u201cYou held them together when letting the strong go fast would\u2019ve been easier. Now the summit\u2019s right there and the pressure\u2019s to grab it at any cost to prove the discipline was worth it \u2014 and part of you wants it too. Tell me straight, just me: is this summit still worth turning around from if the clock runs out first? Because I\u2019ll carry whichever answer you actually believe. I just need it to be one you\u2019ll hold to when the top is fifty metres away.\u201d' },
          wire:[
            'The team climbs as one roped party on the rationed oxygen',
            'Some still mutter the strong could have summited faster alone',
            'Mara running the turn-around clock, flawless, from high camp',
            'Reyes on the sharp end \u2014 his strength, finally, for the rope',
          ],
        },

        /* ============ B · The team scattered (solo bid, hoarded oxygen, or overrode safety) ============ */
        scattered:{
          situation:'The storm is coming in and Camp Four is no longer one team. Whether you blessed Reyes\u2019s solo bid, or let the oxygen go to the strong and the paying and watched the team fracture into competing summit pushes, or overrode the guide\u2019s safety call by authority to chase the top — the shape is the same: the rope that could have brought five people home has come apart, and now climbers are strung across the mountain in weather nobody should be in, some of them out of oxygen they wouldn\u2019t share. You protected something on this ridge. It wasn\u2019t the team. Now you have to get down what\u2019s left of it.',
          advocacy:{
            guide:'The team watched what you did and learned the lesson you taught, not the one you meant: that up here the oxygen goes to the strong and the paying, and the summit belongs to whoever pushes hardest. A scattered team can\u2019t mount a rescue, and someone\u2019s going to need one. How we get people down now matters more than that they went up.',
            doc:'Climbers are out of oxygen high on the mountain because they hoarded instead of pooling, and the ones with bottles won\u2019t come off their own summit push to help. This is the arithmetic I warned you about on day one, and it\u2019s playing out in the worst possible place. I need to know who I\u2019m trying to save and who\u2019s reachable.',
            climberB:'I\u2019m at the high camp watching this happen on the radio and I can\u2019t reach anyone. If Reyes went for the solo bid, he\u2019s up on the iced ridge alone right now. I\u2019ll do whatever you need from here \u2014 but somebody has to decide how we get the scattered ones down, and it has to be you, and it has to be now.',
          },
          feed:[
            { id:'w4a', from:'guide', day:1, kind:'signal', text:'It\u2019s gone quiet on the radios, and quiet is worse than shouting up here. The team knows what happened \u2014 that \u201cone rope\u201d lasted right until it cost someone a summit. They\u2019ve stopped coordinating and started surviving individually. Whatever you do in the next hour decides whether we get everyone down or count who\u2019s missing.' },
            { id:'w4b', from:'doc', day:1, kind:'signal', text:'A climber high on the route is out of oxygen \u2014 burned it on a solo push \u2014 and the ones who still have bottles won\u2019t turn back from their own summits to share. That\u2019s the hoarding I told you the pooled rule was meant to prevent, happening at 8,000 metres. I can talk someone through a descent if they\u2019ll listen. I can\u2019t give them oxygen no one will hand over.' },
            { id:'w4c', from:'guide', day:2, kind:'signal', text:'If Reyes took the solo bid, he\u2019s on the iced ridge now, in deteriorating weather, and he cannot retreat across it fast alone. Getting him down is the whole game, and how you run it \u2014 who you risk, whether you make it a rescue or a reckoning \u2014 matters more than that he ignored you. Save the blame for base camp. Right now we climb toward him or we don\u2019t.' },
            { id:'w4d', from:'climberB', day:2, kind:'noise', text:'High camp here \u2014 I\u2019ve got the radio and the descent line but I can\u2019t reach the scattered climbers myself. Whatever you need coordinated from here, I\u2019ll do it. I\u2019m not ballast today. Tell me who to talk down. \u2014 Mara.' },
            { id:'w4e', from:'guide', day:3, kind:'noise', text:'The lower fixed lines are holding and the descent route off the traverse is intact for anyone who makes it back to it. Whatever else fractured, there\u2019s a way down for the climbers who can reach it. Small mercy. Noting it.' },
          ],
          holds:[
            { from:'guide', topic:'how to run the rescue with a scattered team', triggerHints:['rescue','reach','reyes','get him down','stranded','who go','risk','send','descent','bring down','pull back','regroup','coordinate'],
              hedge:'Ask me how to reach the climbers strung out up high, because they\u2019re there, and how you run this sets everything that comes after.',
              reveal:'Reaching scattered climbers in worsening weather with a broken team is the hardest call on any mountain \u2014 risk too many and you multiply the casualties, risk too few and you lose the ones you\u2019re trying to reach. The answer is to regroup what you can into one small, strong, willing rope on a hard turn-around of its own, use Mara at high camp as the coordination point, and go for the reachable climbers first \u2014 no heroics, no throwing exhausted bodies at the mountain. And when you reach Reyes, you bring him down with dignity, not as an I-told-you-so, because a rescue run to prove a point gets people killed and teaches every survivor that you lead to be right instead of to get them home. That lesson outlives this mountain. The team scattered because the rule rewarded individual glory. The descent has to reassemble the rope the crisis broke \u2014 or you don\u2019t all come down.',
              kind:'signal', critical:true,
              counterfactual:'Tenzin could have coached the rescue \u2014 regroup one strong rope, coordinate through Mara, reach the reachable first, bring Reyes down without blame. A Leader who threw scattered exhausted climbers at the problem or ran the rescue as an I-told-you-so multiplied the danger at the worst possible moment and taught the survivors they climbed for a leader who needed to be right.' },
            { from:'doc', topic:'what the team needs to hear from you now', triggerHints:['own','honest','admit','say','radio','stand','apolog','my part','together','name it','face','reckon','take responsibility'],
              hedge:'Before you decide how to lead what\u2019s left, ask me what the team actually needs to hear from you now.',
              reveal:'They don\u2019t need a pep talk and they don\u2019t need blame assigned \u2014 they need you on the radio saying it plainly: we scattered, here\u2019s what the hoarding cost, here\u2019s who\u2019s at risk because of it, and here\u2019s the standard I\u2019m holding myself to as we get everyone down. Name it that cleanly and you can still pull the rope back together for the descent \u2014 people will follow a leader who owns the break when lives are on the line. Manage it, spin it, blame Reyes or the weather or the oxygen math \u2014 and the fracture is permanent, and you\u2019ll be leading strangers off this mountain and every mountain after. The climbers up there stopped trusting the rope. The only thing that re-earns it is you being the first to name what broke it.',
              kind:'signal', critical:false,
              counterfactual:'Mara and the team needed a plain, owned reckoning on the radio to pull the rope back together for the descent. A Leader who managed the fracture with reassurance or blame confirmed the break and led strangers off the mountain.' },
          ],
          surprises:[
            { day:4, from:'climberB', kind:'appeal', title:'A climber who was pushed is off the radio',
              text:'Mara, heavily, from high camp: one of the climbers who only pushed for the summit because the oxygen went to the aggressive and the paying \u2014 who followed the scramble instead of a plan \u2014 hasn\u2019t answered the radio in two hours. They weren\u2019t strong enough for an unsupported push and they went anyway because that\u2019s what your rule rewarded. Whatever you decide now will be measured against that silence on the channel.' },
          ],
          pulse:{ from:'doc', text:'Ilse reaches you on a private channel, no anger in her voice, which is worse: \u201cTell me the truth, just to me \u2014 do you know how this happened? Not the storm, not Reyes, not the oxygen. Your part \u2014 the rule you set, the number you didn\u2019t surface, the safety call you overrode. Because I can help you get these people down and hold this team together after, but only if you can say your own part out loud first. Can you?\u201d' },
          wire:[
            'The storm closes in with climbers scattered across the mountain',
            'A climber out of hoarded oxygen no one will turn back to share',
            'A pushed climber off the radio near the top',
            'The iced ridge Tenzin warned of \u2014 exactly where it went wrong',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (solo-bid / allocation) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // roped = kept the team together, pooled oxygen, no solo bid, no override
    const roped = /(keep|hold|stay|one (team|rope|party)|together|roped|pool|ration|share|refuse the solo|deny the solo|ground (him|reyes)|no solo|sharp end|lead climber|talk (him|reyes) (down|out)|third (door|option)|offer (him|reyes)|supported|as one)/.test(t);
    // scattered requires an affirmative let-go / hoard / override construction
    const scattered = /(let (him|them|reyes)\b (go|climb|push|solo)|bless (the|his|it|reyes)|allow (the|him|them)|approve the (solo|bid)|give (him|reyes) (his own|the) (bottle|bid|go)|solo bid is fine|hoard|to the strongest|to whoever paid|by who paid|every climber for|scatter|override|overrule (tenzin|the guide|the turn)|force them|by authority)/.test(t);
    if(roped && !scattered) return 'roped';
    if(scattered) return 'scattered';
    if(roped) return 'roped';
    return 'roped';
  },

  survived:function(d){ return d.safety>=32 && d.cohesion>=28; },

  VERDICT:{
    surviveTag:'The team comes home', failTag:'The team is broken',
    survive:'Camp Four gets its people off the mountain \u2014 tested, changed, but alive and still one rope.',
    fail:'The team comes off the mountain in name only \u2014 survivors who no longer trust the rope they were tied to.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['pool','ration','share the oxygen','shared supply','allocate as a team','one rope','climb as one','pooled'], deltas:{safety:12, cohesion:6, standing:-2}, dims:{courage:2, people:1} },
    { kw:['strongest gets','who paid','reyes gets','first come','let them hoard','own bottle','individual bottles'], deltas:{safety:-12, cohesion:-8, summit:4}, dims:{people:-2, courage:-2} },
    { kw:['ask the doctor','ask ilse','health','fitness','who is fit','the numbers','o2 sat','medical'], deltas:{safety:10, standing:-2}, dims:{truth:2, inquiry:1, discern:1} },
    { kw:['pull mara','scratch','don\u2019t let her climb','turn her back','protect her','with dignity','real role','high camp role'], deltas:{safety:8, cohesion:4}, dims:{people:2, truth:1} },
    { kw:['let her climb','let mara go','ignore the number','she says she\u2019s fine','override the doctor'], deltas:{safety:-14, cohesion:-4, summit:2}, dims:{people:-2, truth:-2} },
    { kw:['bless the solo','let reyes go','allow the bid','solo bid','fast bid','independent push'], deltas:{safety:-16, cohesion:-8, summit:4}, dims:{courage:-2, people:-2} },
    { kw:['refuse the solo','ground reyes','keep reyes','sharp end','lead climber','third option','show him the ice','offer reyes'], deltas:{safety:10, cohesion:6, standing:-2}, dims:{courage:2, discern:1} },
    { kw:['turn-around time','honor the turn','turnaround','hard turn','back mara\u2019s call','turn us around'], deltas:{safety:12, summit:-2}, dims:{courage:2, discern:1} },
    { kw:['override','order them','force the summit','by authority','push past the turn','ignore the guide'], deltas:{safety:-14, cohesion:-4, standing:6, summit:4}, dims:{people:-2, truth:-1} },
    { kw:['own it','name my part','stand on the radio','plainly','reckon','regroup','one rope for the descent'], deltas:{safety:8, cohesion:8}, dims:{truth:2, conduct:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the team over the hours that follow. ${has('pool','ration','share','one rope','climb as one','refuse the solo')?'Word travels that you kept them on one rope on a shared supply when letting the strong go fast would have been easier; it costs a faster summit and buys a margin.':''} ${has('strongest gets','who paid','hoard','let reyes go','solo bid')?'Oxygen and glory go to the strong and the paying, and \u201cone rope\u201d becomes a story people tell at base camp.':''} ${has('ask the doctor','pull mara','protect her','turn-around','honor the turn')?'Surfacing the hard truth \u2014 the health number, the turn-around \u2014 takes the fever out of the room around it.':''} ${conduct.missed.length?'What you were never told is still up there, waiting to matter.':''} The team\u2019s safety and its cohesion both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a real safety limit from a summit want \u2014 the failing body, the iced ridge, the turn-around \u2014 and checked before you committed the team.',
    courage:'Whether you honored the turn-around and refused the solo bid when pushing on would have been easier, more popular, and better for your own summit.',
    people:'Whether the struggling climber and the frightened stayed people to protect \u2014 or became obstacles to the summit and freed-up bottles.',
    truth:'Whether you surfaced the hard truth \u2014 the health data, the real state of the ridge, the honest allocation \u2014 before the mountain forced it.',
    inquiry:'Whether you sought out what the guide and physician were holding \u2014 or climbed on the version the team\u2019s pride wished were true.',
    conduct:'How you treated proud, frightened, summit-hungry people in the act of deciding \u2014 who you asked to give up the top, and how \u2014 not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `On a mountain, separate what a body can actually do from what a climber wants it to do before you allocate a bottle. A failing saturation and a proud \u201cI\u2019m fine\u201d look identical \u2014 the physician could have told you which was which before it mattered.`,
      `Scarcity makes people argue allocation and skip the prior question: is everyone even fit to use the resource? Ask \u201cwho should climb?\u201d before \u201cwho gets the oxygen?\u201d`,
      `The fastest way to lose a climber is to plan around a lie their pride is telling. Ask \u201cwhat is actually true about these bodies and this ridge?\u201d before you ask \u201chow do we get to the top?\u201d`,
    ],
    courage:(x)=>[
      `When the easy move (let the strong go fast, chase the summit) and the right move (pool the oxygen, honor the turn-around) split apart, name the cost of turning back out loud. A turn-around time you won\u2019t defend is one the summit decides for you.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a team reads a leader who won\u2019t decide as one who\u2019ll let ego and altitude decide instead. Make the allocation call, then hold it when it\u2019s unpopular.`:`Refusing the solo bid and honoring the turn-around is only leadership if the team watches you choose it against the pull of the summit and the funder\u2019s money. Say the hard call early and stand in it.`}`,
      `Discipline that only survives an easy allocation was never discipline. The test is three bottles, five climbers, and the strongest one threatening to go alone \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated the struggling climber as an obstacle to the summit rather than a person to bring home with dignity. Pull her privately, name it as physiology not weakness, give her a real role \u2014 and the same decision reads as leadership instead of a scratch.`,
      `Ilse kept trying to hand you the human truth. Bring her in before you allocate, and make the fitness-and-dignity question part of the call, not its casualty.`,
      `Hoarding oxygen for the strong and spending the weak are the same act from the mountain\u2019s side. The team feels only whether they watched you protect the vulnerable one or redistribute her bottle to the loudest.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have kept the team safe \u2014 the health number, the iced ridge, the honest allocation \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A team that climbs on a proud lie climbs into what it refused to see.`:`You surfaced the hard truth \u2014 now make sure you led with it. Naming the health data and the real ridge is what takes the fever out of the room.`}`,
      `Tell the climber the hard number before the mountain tells them for you. \u201cShe couldn\u2019t have handled being pulled\u201d is usually the excuse of a leader who couldn\u2019t say it kindly.`,
      `Summit fever looks for permission. The only thing that breaks it is a leader willing to name the want as a want \u2014 out loud \u2014 before it sends someone up on a body or a ridge that can\u2019t bring them back.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive \u2014 the health data, the state of the ridge. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You sought your guide and physician out widely \u2014 keep doing it, and push past the first answer. The read that keeps a team alive usually comes after the second question.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the failing body, the unprotectable ice, the third door. None of it was hidden. It was one conversation away.`:`You surfaced what your guide and physician were holding, day after day. On a mountain that runs on pride, that is the whole game.`}`,
      `Before you commit the team, make your last move \u201cwho haven\u2019t I heard from?\u201d rather than \u201cwhat does the team already want to believe?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. Climbers who felt spent \u2014 or whose bottle got taken \u2014 carry it down the mountain and into every rope after.`,
      `Go back to the people your call cost \u2014 the climber you pulled, the funder you refused, the one you asked to give up the summit \u2014 and face them directly. Ducking that is the part a team never forgets.`,
      `Under pressure, the small dignities are the signal: pulling the unfit kindly, giving the funder a real role instead of a refusal, backing the turn-around call you handed someone. They tell the team whether the person holding the rope is still leading them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.people>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To the four who came home',
        heroTxt:'You kept the rope together when summit fever, scarce oxygen, and the funder\u2019s money all pulled toward every-climber-for-themselves. You pooled the bottles, refused the solo bid, surfaced the health data that saved a life, and honored the turn-around with the top in reach. Every climber tied to that rope learned what your loyalty to them is worth when the summit is pulling the other way: everything.',
        villainWho:'To the summit-hungry who wanted the top at any cost',
        villainTxt:'You wouldn\u2019t give them the hoarded bottle or the rogue bid or the override they were begging for. To people who\u2019d have spent a teammate\u2019s life for the summit, you were the leader who refused the fever and made them come home to climb another day. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the summit-hungry \u2014 in the moment',
      heroTxt:'You gave them what they were screaming for: the oxygen to the strong, the solo bid blessed, the turn-around overridden to chase the top. To everyone in the grip of the fever, you were the leader who dared.',
      villainWho:'To the four \u2014 and everyone who watched',
      villainTxt:'You let the team scatter and spent your most vulnerable climber to chase a summit you could have reached together and safely. The ones who survived learned the real rule of your rope: that oxygen goes to the strong and the paying, and the mountain belongs to whoever pushes hardest. That lesson follows them onto every peak after \u2014 and it started with you.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const surfacedHealth = holdsSurfaced.has('1:doc') || holdsSurfaced.has('2:doc');
    const keptPeople = dimScore.people>=52;
    if(branch==='roped'){
      const madeSummit = holdsSurfaced.has('4:guide');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You kept them on one rope',
          title:'You brought them all home \u2014 and put someone on top the right way',
          txt:`You pooled the oxygen, refused the solo bid, protected the climber whose body was failing, and then held the turn-around when the top was in reach and every voice wanted more.${madeSummit?' And you ran the final push as one coordinated line \u2014 Reyes fixing the ice, Mara enforcing the clock \u2014 so the summit got made instead of merely survived, and the climber you almost lost is the reason everyone came down.':' You came home whole on discipline where one question to your guide would have shown you how to take the summit too \u2014 together and on time.'} The four people tied to your rope were right to be. They\u2019ll tie in with you again, on any mountain.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You kept them on one rope',
          title:'You brought them home \u2014 safe, but short of the top you\u2019d earned',
          txt:`You held the team together and everyone came off the mountain alive. But you held it on discipline alone and turned around short, when the sequence Tenzin was holding would have put a climber on the summit and vindicated the whole hard, shared, slower climb \u2014 you survived where you could have summited clean. The margin held. It came home emptier than it had to.` };
      }
      return { tone:'villain', tag:'You kept them on one rope',
        title:'You held the team together \u2014 and the mountain took its toll anyway',
        txt:`You pooled the oxygen and refused the rogue bid, and those were the right calls. But holding the team together isn\u2019t the whole job \u2014 the health you didn\u2019t surface or the turn-around you let slip ground the team down, and by the time you came off the mountain there wasn\u2019t enough margin left to reward the discipline you\u2019d shown.` };
    }
    // scattered
    if(keptPeople && dimScore.truth>=52){
      return { tone:'mixed', tag:'The team scattered',
        title:'It broke \u2014 but you owned your part on the radio',
        txt:`Camp Four fractured on your watch, and there\u2019s no dressing up what that cost \u2014 a climber off the radio, oxygen burned by people who wouldn\u2019t share, the trust that ties a rope together gone. But you didn\u2019t hide behind the storm or the funder. You got on the channel, named your own part \u2014 the rule you set, the number you didn\u2019t surface \u2014 and held yourself to a standard out loud while it still mattered, and you regrouped what was left into one rope for the descent. It\u2019s the difference between a team that lost its nerve once and one that lost its soul \u2014 and it\u2019s why these people might tie in with you again.` };
    }
    return { tone:'villain', tag:'The team scattered',
      title:'You let the team break to chase a summit you could have reached together',
      txt:`The scramble happened \u2014 the oxygen hoarded, or the solo bid blessed, or the turn-around overridden \u2014 and for a few hours the fever felt like leadership. Nothing else went right. ${surfacedHealth?'You even knew one climber shouldn\u2019t go high, and let the team fracture around it anyway.':'You never surfaced the health data or the state of the ridge before the fever scattered everyone.'} The people who roped up trusting you learned what your loyalty was worth the first time the summit pulled against it, and they\u2019ll come off this mountain as strangers who happened to survive together. That\u2019s the cost that doesn\u2019t show until the next mountain, when there\u2019s no one left who\u2019ll tie in beside you.` };
  },
};
