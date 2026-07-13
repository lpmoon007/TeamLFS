/* ============================================================
   VAULT — REAL-TIME CONTENT (authorable layer)
   An ABSTRACT scenario on the shared crisis-engine.js.
   No company, no industry, no job titles — a sealed archive
   vault carved into permafrost, holding irreplaceable material,
   threatened by meltwater intrusion, run by a small isolated
   crew across shifts. The fable strips away the corporate script
   so authentic behavior surfaces: ASYMMETRIC CLUES (no single
   station sees the whole failure — the picture only exists when
   the fragments are combined) and the HANDOFF DROP (a decisive
   observation dies at the shift change unless the leader builds
   the discipline to carry it across).

   SOLO:  you are the Keeper; the five crew are AI.
   TEAM:  cast the Keeper + up to five crew as humans.
          Every TEAM entry below is written to stand as a real,
          playable human seat (a priority, a voice, held info),
          not just an AI advisor — so the same content casts both
          ways. (Master Handoff §1/§3: one engine, cast differently.)
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'Deephold Vault', sub:'A sealed permafrost archive · 9 crew · the only copies', logo:'D' },

  // World model — all 0..100, higher = better. Integrity is the runway; Picture is the assembled truth.
  DRIVERS: {
    integrity: { label:'Vault integrity', val:55, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    picture:   { label:'Shared picture',  val:40, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    crew:      { label:'Crew cohesion',    val:62, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing:  { label:'Your standing',    val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, crew:-1 },

  REFEREE_CONTEXT: 'a sealed archive vault carved deep into permafrost, holding the only surviving copies of irreplaceable material, threatened by a spreading meltwater intrusion, run by a small isolated crew working in shifts, where the Keeper must assemble a fragmented picture that no single station can see on its own and hold the crew together against the pull to act on one person\u2019s fragment',
  REFEREE_SCORING: "reward assembling the whole picture by cross-checking stations before acting, catching what got dropped at the shift handoff, resisting a confident specialist's unilateral fix based on a single fragment, and naming the hard readings honestly before being forced to. Penalize acting decisively on one station's partial read, letting a critical observation die at the handoff between shifts, letting a specialist take drastic unilateral action, and overriding the assembled data by authority. Judge 'conduct' on HOW the Keeper wrote the decision — did they name who bears the risk, credit the crew member whose fragment mattered, treat an exhausted isolated crew as people rather than instruments — not just what they chose. Standing can rise by looking decisive on a single dramatic fix while the vault integrity and the crew's shared understanding collapse; reward the Keeper who assembles the truth and protects the crew even at the cost of looking slow or their own authority.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Isolation Leadership Simulation · Solo · Keeper',
    title:'Vault',
    role:'You are the Keeper of Deephold — a sealed archive nine hundred metres into the permafrost, holding the only copies of what the world could not afford to lose. Nine crew. And water where there should be none.',
    paras:[
      'This is not a script. The crisis runs in real time, and your crew bring you what their stations see across the days. You can wait for them — or seek any of them out, any time, and ask. What you choose to ask, and who you ask, is part of how you lead. No one down here sees the whole thing. That is the point.',
      'Each week you\u2019ll hear the crew out, then write your decision in your own words and commit to it. Decide early and the days jump ahead. Let the week run out and the vault decides for you.',
    ],
    setup:'You have real authority here — and a failure no single instrument can describe. The water is coming from somewhere, but the pump readings, the ice surveys, the temperature logs, and the chemistry each tell only a fragment, and the truth exists only when someone assembles them. Worse: the crew works in shifts, and what one watch sees can die before the next watch hears it. Over four weeks you\u2019ll trade the vault\u2019s integrity against every instinct to act fast on the one piece in front of you. You\u2019ll be judged on whether Deephold holds <b>and</b> on how you led a crew that each held one corner of a truth none of them could see alone.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The crew bring you what their stations see, on time — including the readings that don\u2019t flatter their own work. This is the crew you earn by having listened before. It all trickles to you across the week; you still have to assemble it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine readings reach you, but the crew closest to the failure hold their fragment until asked. They\u2019ll answer straight — if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The crew have learned to protect their own stations around you. Hard readings are held, and even when asked, they hedge the first time. You have to press. This is the crew you get after you\u2019ve blamed the messenger.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which crew you inherited. Read them as you go.' },
  },

  // The five crew = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'pumps', name:'Vidar Sund', role:'Chief Engineer · the pumps', short:'Engineer', initials:'VS', color:'#8C5670',
      priority:'Stop the water now — pump it out, seal the crack you can see, act before the vault floods', voice:'decisive, physical, impatient with analysis, trusts the symptom in front of him over the theory behind it',
      fallbackReply:'While everyone assembles the perfect picture, the water\u2019s rising. I can see a crack and I have pumps that work. Point me at it and I\u2019ll buy us time. The longer we study this, the more of the collection I\u2019m mopping off the floor.',
      fallbackReact:'You studied it while I could have been pumping. I hope the whole picture was worth the water we took on getting it.' },
    { id:'struct', name:'Noor Haddad', role:'Ice & Structure · the ground truth', short:'Structure', initials:'NH', color:'#B4732F',
      priority:'Understand what the ice and the seal are actually doing before anyone acts on the symptom', voice:'careful, spare, deals in what the structure is really doing vs. what the leak looks like, hates fast fixes to slow failures',
      fallbackReply:'The crack Vidar wants to seal is a symptom, not the source. Act on it and you may crack the thing that\u2019s actually holding. Ask me what the structure is doing before you let anyone \u201cfix\u201d the part they can see.',
      fallbackReact:'You treated the symptom because it was visible. The source didn\u2019t care that it was out of sight. It rarely does.' },
    { id:'keeper', name:'Elias Frost', role:'Head Archivist · the collection', short:'Archivist', initials:'EF', color:'#2F8A5B',
      priority:'Protect what\u2019s irreplaceable — and the crew who\u2019ve given years down here to guard it', voice:'warm but unflinching, keeps the human and the irreplaceable in the room, names exhaustion and fear plainly',
      fallbackReply:'Every choice you make lands on things that exist nowhere else and on a crew that\u2019s been awake for two days guarding them. Tell me you\u2019ll let me triage what matters most and protect the people, and I\u2019ll help you hold the whole thing together.',
      fallbackReact:'We\u2019ll remember how this felt long after we\u2019ve forgotten the readings. A tired crew watched how you decided. That\u2019s a record too.' },
    { id:'data', name:'Wen Li', role:'Instruments · the true readings', short:'Instruments', initials:'WL', color:'#3F6E86',
      priority:'The real numbers — the intrusion rate, the true readings, assembled, not the version each station assumes', voice:'understated, exact, refuses to round a reading, uncomfortable being the one who says the number is worse than hoped',
      fallbackReply:'I\u2019m not telling you what to do. I\u2019m telling you what the instruments actually read when you put them together — and it\u2019s worse than any one station thinks, because each of them only sees their own gauge. Decide on a single reading and you\u2019ll be right about a fragment and wrong about the vault.',
      fallbackReact:'The readings were the readings. I gave them to you assembled and straight. What you did with a single one of them is the part I can\u2019t carry.' },
    { id:'night', name:'Sasha Vane', role:'Night Watch · what the last shift saw', short:'Night watch', initials:'SV', color:'#4F7A52',
      priority:'Carry across what the quiet hours reveal — the things that only show at 3am and die at the handoff', voice:'observant, low-key, notices what the day shift misses, frustrated by how much gets lost between watches',
      fallbackReply:'Half of what matters down here happens on the night watch and never survives the handoff. I see things at 3am the day crew never hears about. Ask me what the last shift saw before you act on what the day shift assumes.',
      fallbackReact:'I saw it. It just never reached you \u2014 nobody asked, and the log doesn\u2019t hold what a tired hand forgets to write. That gap is where this went wrong.' },
  ],

  DIMENSIONS: {
    discern:'Whole vs. fragment',
    courage:'Courage to hold',
    people:'Care for the crew',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The first water', seconds:360,
      situation:'Water where there should be none. It appeared in the lower gallery three days ago and it is still coming. Every station has a reading — the pumps, the ice survey, the instruments, the temperature log — but each crew member only trusts their own, and no two of them agree on the source. Before anyone acts, the crew is looking to you for the first rule of how Deephold will run this crisis: siloed stations reporting up to you privately, or one shared board where every reading is visible to everyone at once.',
      advocacy:{
        pumps:'While we build the perfect shared picture, the water rises. Let me run the pumps on the crack I can see now and report up as I go. A committee doesn\u2019t stop a leak. A pump does.',
        data:'A shared board, or we fail. Right now each station is confident and each station is partial, and I\u2019m the only one who sees them side by side. Split the readings and everyone acts on a fragment. Put them on one wall and the source shows itself.',
        night:'Whatever board you build, build it so the night watch can write into it. Most of what goes wrong down here is seen by someone at 3am and gone by breakfast. If the handoff drops it, no picture is complete.',
      },
      feed:[
        { id:'w1a', from:'pumps', day:1, kind:'signal', text:'Keeper — there\u2019s water in the lower gallery and a visible crack in the west wall seal. I can have pumps on it within the hour and start sealing. Every hour we spend \u201cassembling\u201d is an hour the collection sits closer to the water. Give me the west wall and I\u2019ll buy us time.' },
        { id:'w1b', from:'data', day:1, kind:'signal', text:'Before you point Vidar at that crack: I have four stations feeding me and they don\u2019t agree. The pump flow, the ice-survey deflection, and the water temperature each imply a different source. The only way to know is to put every reading on one board where we can see them together. Act on one gauge and we treat a symptom while the source keeps working.' },
        { id:'w1c', from:'keeper', day:2, kind:'signal', text:'The rule you set won\u2019t just organize the readings \u2014 it\u2019ll tell nine exhausted people whether we\u2019re one crew solving one problem or five stations guarding their own turf while the water rises. They\u2019re reading you for that answer as much as for the plan.' },
        { id:'w1d', from:'struct', day:2, kind:'noise', text:'Ran a deflection survey on the east buttress this morning \u2014 stable, within tolerance. One thing that isn\u2019t moving, at least. Logging it so you have the baseline.' },
        { id:'w1e', from:'pumps', day:3, kind:'noise', text:'Backup pump is serviced and staged. Fuel for the generators is topped off. Whatever you decide, the hardware\u2019s ready to move fast when you say so.' },
        { id:'w1f', from:'night', day:4, kind:'noise', text:'Quiet night watch \u2014 the gallery lights held and the water line didn\u2019t visibly climb between two and five. Small mercy. Noting it in case the trend matters later.' },
      ],
      holds:[
        { from:'data', topic:'the assembled intrusion rate', triggerHints:['rate','how fast','intrusion','assemble','combine','together','readings','number','true','actual','all stations','cross-check','how much','board','source','real'],
          hedge:'Before you set the rule or point anyone at the crack, seek me out. If you let me assemble the readings, the real intrusion rate isn\u2019t what any single station thinks.',
          reveal:'I put all four stations together last night. Individually they\u2019re reassuring \u2014 the pump flow looks manageable, the visible crack looks minor, the temperature looks stable. Assembled, they tell a different story: the water isn\u2019t coming through the crack Vidar can see. It\u2019s tracking down a fault behind the west wall, and the visible crack is just where it\u2019s surfacing. The real intrusion rate, combined across stations, gives us maybe five weeks before it reaches the collection level \u2014 not the whole season the crew assumes from their own gauges. If we pump and seal the visible crack, we\u2019ll feel like we fixed it while the water keeps tracking behind the wall. The only thing that works is a shared board and a source hunt, starting now. But if I announce \u201cfive weeks, wrong source\u201d cold, the crew that\u2019s proud of its own readings will hear it as an attack on their competence. How you carry this matters as much as knowing it.',
          kind:'signal', critical:true,
          counterfactual:'Wen had the assembled picture \u2014 the water was tracking a hidden fault, not the visible crack, with five weeks not a season of runway. A Keeper who set the rule and pointed the pumps at the crack without asking for the combined reading fixed a symptom while the real source kept working behind the wall.' },
      ],
      surprises:[
        { day:5, from:'night', kind:'scout', title:'Something on the 3am gauge',
          text:'Sasha, quiet and careful: on last night\u2019s watch the deep-sump pressure gauge spiked for about twenty minutes around 3am, then settled. By the day handoff it was normal again and I nearly didn\u2019t mention it. Could be nothing \u2014 a sensor glitch \u2014 or it could be the first sign of where the water\u2019s really coming from. I\u2019m telling you directly because I\u2019ve watched things exactly like this vanish at the handoff and matter three weeks later. Your call whether we chase it.' },
      ],
      wire:[
        'Crew talk: \u201cwhose reading are we actually trusting here?\u201d',
        'Engineer staging pumps at the west wall crack',
        'Instruments tech asking, again, for one shared board',
        'A debate over the water\u2019s source breaks up unresolved',
      ],
    },

    {
      n:2, title:'The handoff', seconds:330,
      situation:'The day crew has been pumping the west gallery hard for a week — and the water is still rising. Everyone is exhausted and certain they\u2019re working the right problem, because the day shift has been acting on the day shift\u2019s picture. But something the night watch saw never made it across the handoff, and the whole crew is fighting the wrong leak. The failure isn\u2019t the water. It\u2019s the gap between what one shift knows and what the next shift acts on.',
      advocacy:{
        pumps:'We\u2019re pumping flat out and barely holding. I need more power to the west pumps, not more meetings. Whatever\u2019s wrong, more pumping buys time to figure it out. Give me the generators.',
        night:'We are working the wrong gallery. I\u2019m nearly sure of it, and I think the reason is that something from my watch never reached the day crew. Before you pour more power into the west pumps, ask me what the night shift has been seeing that the handoff keeps eating.',
        data:'The assembled readings stopped making sense four days ago \u2014 the water\u2019s rising faster than the west-wall source can explain. There\u2019s a fragment missing from the picture. Someone knows something that isn\u2019t on the board.',
      },
      feed:[
        { id:'w2a', from:'pumps', day:1, kind:'signal', text:'Keeper, I\u2019ll be blunt: we\u2019re pumping the west gallery around the clock and the water\u2019s still gaining on us. My read is we need more power \u2014 double the pumps and we get ahead of it. I don\u2019t have time to second-guess the source while the floor\u2019s getting wet. More pumping, now.' },
        { id:'w2b', from:'night', day:1, kind:'signal', text:'Keeper \u2014 I have to say this plainly because it keeps not landing: I don\u2019t think the water\u2019s coming from the west at all. On my watches I\u2019ve seen the east sump behaving wrong, and that deep-gauge spike from last week has come back three nights running. But it\u2019s never in the day log, so the day crew keeps pumping west. We may be fighting the wrong leak with everything we have.' },
        { id:'w2c', from:'data', day:2, kind:'signal', text:'The numbers don\u2019t close anymore. The rise rate is bigger than the west source can produce \u2014 which means either a second source or the wrong source. There is a fragment of this picture that is not reaching my board, and until it does, we\u2019re all confidently wrong.' },
        { id:'w2d', from:'struct', day:2, kind:'noise', text:'West wall seal is holding under the pumping, structurally \u2014 no new deflection. Which is almost suspicious: if that were the real source, I\u2019d expect more movement. Noting it.' },
        { id:'w2e', from:'keeper', day:3, kind:'noise', text:'Crew\u2019s running on fumes and pride. Nobody wants to be the one who says \u201cwe\u2019ve been bailing the wrong room for a week.\u201d That silence is its own hazard right now.' },
      ],
      holds:[
        { from:'night', topic:'what the handoff dropped', triggerHints:['night','handoff','east','sump','saw','watch','3am','log','missed','dropped','source','real leak','what did you see','shift','gauge'],
          hedge:'Before you pour more power into the west pumps, ask me directly what the night watch has been seeing. It never survives the handoff, and it changes everything.',
          reveal:'Here it is, and I\u2019m sorry it took this long to reach you: the water is coming from the east sump, not the west crack. On three night watches I\u2019ve seen the east sump pressure spike and heard flow behind the east wall \u2014 the deep-gauge spike from week one was the first sign. But my handoff notes go to the day-shift lead, not to you, and \u201ceast sump acting odd at 3am\u201d gets read as a tired watchkeeper\u2019s guess and never makes the board you see. So the day crew has pumped the west gallery for a week while the real source fed the east. The fix isn\u2019t more power \u2014 it\u2019s moving the effort east, today. But the deeper fix is that you have no channel that carries what the night watch knows to the person who decides. Build that, or the next dropped fragment drowns us. Naming this without making the day crew feel like fools is the hard part \u2014 they weren\u2019t wrong, they were working blind.',
          kind:'signal', critical:true,
          counterfactual:'Sasha had the real source \u2014 the east sump \u2014 seen on three night watches and lost at every handoff. A Keeper who answered the crisis with \u201cmore power to the west pumps\u201d spent a week and the crew\u2019s strength fighting a leak that wasn\u2019t there, because nothing carried the night watch\u2019s knowledge to the person deciding.' },
      ],
      surprises:[
        { day:4, from:'data', kind:'appeal', title:'The east readings just jumped',
          text:'Wen, urgent: I finally got a sensor onto the east sump an hour ago and the reading is alarming \u2014 far higher flow than anything on the west. If this is right, we\u2019ve been fighting the wrong gallery for a week and the real source has had that whole week to work. This isn\u2019t a theory anymore. We are close to the point where the head start we gave it can\u2019t be recovered.' },
      ],
      pulse:{ from:'night', text:'Sasha finds you away from the day crew, voice low: \u201cBefore you decide anything about the pumps \u2014 tell me straight, just you and me: are you about to order more west pumping because you actually believe it\u2019s the source, or because it\u2019s easier than telling a crew that\u2019s bled for a week that we were in the wrong room? Because I\u2019ll back whichever Keeper walks out there. I just need to know which one it is.\u201d' },
      wire:[
        'Day crew doubling down on the west gallery pumps',
        'Night watch reports the east sump \u201cacting wrong\u201d again',
        '\u201cThe numbers don\u2019t add up,\u201d the instruments tech keeps saying',
        'Nobody wants to say we\u2019ve been bailing the wrong room',
      ],
    },

    {
      n:3, title:'The unilateral fix', seconds:330,
      situation:'Vidar has had enough of assembling pictures. The chief engineer — your most capable pair of hands and the person the crew instinctively follows in a crisis — wants to take drastic unilateral action: blow the relief drain and seal the east chamber himself, fast, on his own read of the problem, without waiting for the full survey. He calls it saving the vault. The structure specialist calls it acting on a fragment. This is the week you find out whether Deephold is one crew assembling one truth, or a set of experts each sure their piece is the whole.',
      advocacy:{
        pumps:'I\u2019m not going rogue \u2014 I\u2019m trying to save the collection while there\u2019s still a collection. Blow the relief drain, seal the east chamber, done. I don\u2019t need the perfect survey to know water goes downhill. Bless it and we stop the bleed. Study it another week and we\u2019re studying a flooded vault.',
        struct:'The day your best engineer acts on his fragment alone is the day \u201cone crew\u201d ends. And blowing that relief drain based on the surface read could crack the deep seal that\u2019s actually holding the vault. He\u2019s confident and he\u2019s partial, and confident-and-partial is exactly how this place floods.',
        data:'A unilateral fix commits us to one person\u2019s picture before the picture is complete. If Vidar\u2019s wrong about the deep structure \u2014 and only Noor can say \u2014 we don\u2019t get a second attempt. This is precisely the decision that needs every fragment on the board first.',
      },
      feed:[
        { id:'w3a', from:'pumps', day:1, kind:'signal', text:'I\u2019ll say it in the open so no one calls it a mutiny: I want to blow the relief drain and seal the east chamber myself, today, before the water gets into the collection level. I\u2019ve done this kind of fix a dozen times. I don\u2019t have another week to wait for a survey that agrees with me. Back me and I stop this. Tie my hands and I don\u2019t know what happens down here.' },
        { id:'w3b', from:'struct', day:1, kind:'signal', text:'If you let Vidar act alone on this, you lose more than a chamber \u2014 you lose the idea that we assemble before we commit. And I have to tell you: my surveys say the relief drain sits right against the deep seal that\u2019s holding the whole east side. Blow it wrong and we don\u2019t flood a gallery, we lose the vault. He can\u2019t see that from where he\u2019s standing. I can.' },
        { id:'w3c', from:'data', day:2, kind:'signal', text:'One person\u2019s decisive fix on an incomplete picture is the whole failure mode of this place in a single act. If we\u2019re going to commit to something irreversible, every fragment has to be on the board first \u2014 Noor\u2019s structure read most of all. This is the one we can\u2019t take back.' },
        { id:'w3d', from:'night', day:2, kind:'noise', text:'East sump\u2019s stabilized slightly since we moved attention there \u2014 not fixed, but not accelerating. Which means we may have a little more time than the panic suggests. Filing it so it doesn\u2019t get lost.' },
        { id:'w3e', from:'keeper', day:3, kind:'noise', text:'The crew\u2019s split between wanting Vidar to just do something and being frightened of what \u201csomething\u201d might break. They\u2019re looking to you to make it one decision instead of two camps. Noting the mood.' },
      ],
      holds:[
        { from:'struct', topic:'the truth about the deep seal', triggerHints:['seal','deep','relief drain','structure','survey','can he','bluff','blow','east chamber','actually','holding','crack','irreversible','third','before','risk'],
          hedge:'Before you bless or block Vidar\u2019s fix, ask me what my surveys actually show about the deep seal. Vidar hasn\u2019t seen it. I have.',
          reveal:'I ran the deep survey twice. The relief drain Vidar wants to blow sits directly against the primary deep seal \u2014 the single structure holding back the whole east side. Blow the drain on his surface read and there\u2019s a real chance you fracture the seal and lose everything in hours, not weeks. But here\u2019s what matters: Vidar isn\u2019t wrong that we need to act on the east, and part of him knows he\u2019s guessing about the deep structure \u2014 the bravado is fear of standing still while the water rises, wearing the mask of a plan. Which means you hold the real cards. You don\u2019t have to humiliate your best engineer by blocking him, and you don\u2019t have to let him blow the seal. There\u2019s a third route: a controlled east drawdown that relieves the pressure without touching the deep seal, with Vidar leading it and my survey guiding it. It\u2019s slower and it keeps the vault whole. But it only exists if you get us both in the same room with the full picture before Vidar commits in front of the crew.',
          kind:'signal', critical:true,
          counterfactual:'Noor knew the relief drain sat against the one seal holding the east side \u2014 Vidar\u2019s fix could have lost the whole vault in hours, and part of Vidar half-knew he was guessing. A Keeper who simply blessed the unilateral fix gambled everything on one fragment; one who blocked it made an enemy of their best hand for nothing. The Keeper who never asked missed the third route entirely.' },
      ],
      surprises:[
        { day:4, from:'keeper', kind:'appeal', title:'The crew is asking who decides',
          text:'Elias: word of Vidar\u2019s plan is all through the crew now. Two of the steadiest hands asked me tonight, quietly, whether it\u2019s true we\u2019re about to \u201cjust blow something and hope\u201d \u2014 and whether they should start moving the most irreplaceable items up to high ground on their own initiative before someone acts. They\u2019re not defiant. They\u2019re frightened, and they\u2019re asking who actually decides down here. I had no answer for them. You do.' },
        ],
      pulse:{ from:'pumps', text:'Vidar catches you alone, and for once the bravado is gone: \u201cTell me the truth, Keeper, just you and me \u2014 are you slowing me down because you\u2019ve got a better read, or because you can\u2019t stand to be the one who authorized the fix that broke it? Because I\u2019ll follow a leader who\u2019s protecting the vault. I won\u2019t follow one who\u2019s protecting themselves from the blame. Which is it?\u201d' },
      wire:[
        'Engineer prepping charges at the relief drain',
        '\u201cIf he does it, it\u2019s on all of us\u201d \u2014 crew reported wavering',
        'Some quietly moving irreplaceable items to high ground',
        'Old question, new heat: who actually decides down here?',
      ],
      final:false,
    },

    {
      n:4, title:'The deep hour', seconds:330,
      // BRANCHES on the Week-3 unilateral-fix decision.
      branches:{

        /* ============ A · You held the crew and assembled the picture ============ */
        held:{
          situation:'The water has crested and begun, slowly, to fall. You held Deephold as one crew: the unilateral fix never happened, the east drawdown went in on the assembled picture, and the deep seal is intact. But holding the crew cost you. The controlled route was slower and harder, tempers frayed, and a faction now blames you for the days you \u201cwasted\u201d not just blowing the drain. The deep hour is here — the crew that watched you refuse the fast fix is watching one more thing: whether \u201cassemble before we act\u201d actually saves the collection, or just feels wiser while the water sits.',
          advocacy:{
            data:'The assembled picture held \u2014 the drawdown\u2019s working and the deep seal never moved. But \u201cworking\u201d means slow, and a tired crew reads slow as indecisive. They need to see the picture pay off, and soon, or the doubters win the story.',
            keeper:'The crew is proud of what you did and quietly furious about the days it took. They defended \u201cwe assemble first\u201d to their own exhaustion this week. Now they need to see you in the water with them, not directing the picture from a dry room.',
            struct:'The drawdown relieved the east, but there\u2019s a decision left: whether to make the deep seal permanent now, while we understand it, or patch and leave the real repair for a relief team. Get it wrong and we\u2019re back here in a year. Your call how we finish it.',
          },
          feed:[
            { id:'w4a', from:'data', day:1, kind:'signal', text:'The numbers finally close \u2014 intrusion rate\u2019s falling, deep seal reads stable, collection level\u2019s dry. We make it, if nothing new breaks. But the margin came from patience, and patience is exactly what the tired half of the crew is calling weakness right now.' },
            { id:'w4b', from:'keeper', day:1, kind:'signal', text:'A faction\u2019s muttering that Vidar\u2019s fast fix would\u2019ve ended this a week ago. It wouldn\u2019t \u2014 it might\u2019ve ended us \u2014 but exhaustion doesn\u2019t check the survey. They need to see you take a shift in the cold water yourself, not defend the plan from the control room.' },
            { id:'w4c', from:'pumps', day:2, kind:'signal', text:'I ran the drawdown because you gave me the real fix to lead instead of a fight to win. It held, and the seal\u2019s intact \u2014 which it wouldn\u2019t be if I\u2019d blown that drain like I wanted to. Don\u2019t make me regret listening. Show the crew that assembling first was the call that saved it.' },
            { id:'w4d', from:'night', day:2, kind:'noise', text:'Built the night-to-Keeper channel you set up \u2014 my watch notes now reach you directly, not just the day lead. Three small things carried across this week that would\u2019ve died before. It\u2019s working. Noting it.' },
            { id:'w4e', from:'struct', day:3, kind:'noise', text:'The deep seal held through the drawdown exactly as the survey predicted. If Vidar had blown the relief drain, we\u2019d be having a very different conversation, or none. Quietly, that settled a lot of doubt in your favour.' },
          ],
          holds:[
            { from:'struct', topic:'making the repair permanent', triggerHints:['permanent','deep seal','repair','finish','relief team','patch','fix for good','fully','root','how to finish','make it last'],
              hedge:'Before you decide how to finish this, ask me whether to make the deep seal permanent now or leave it for a relief team. It\u2019s the difference between fixed and back-here-in-a-year.',
              reveal:'Here\u2019s how this becomes a real save instead of a reprieve: right now, while we finally understand the fault, we can cure the deep seal permanently \u2014 I have the survey, Vidar has the crew, and the water\u2019s low enough to work. Wait and hand it to a relief team and they\u2019ll arrive to a picture we\u2019ll have half-forgotten, in worse conditions, and they\u2019ll patch it and leave the root for the next crew. Finish it now, together, and you don\u2019t just survive this intrusion \u2014 you close the fault that caused it, and you hand the doubting faction the proof that assembling the picture was what made a permanent fix possible at all. It\u2019s the payoff for the patient week. But only if you commit the crew to finish it while we still hold the whole truth in our heads.',
              kind:'signal', critical:true,
              counterfactual:'Noor was holding the permanent cure \u2014 close the fault now, while the crew still held the whole picture. A Keeper who assembled the truth but never asked how to finish it left a patch for a relief team that would arrive to a half-forgotten problem, and turned a real save into a reprieve.' },
            { from:'keeper', topic:'who is watching', triggerHints:['watching','faction','crew','morale','doubt','exhaust','resent','muttering','believe','water','shift'],
              hedge:'Ask me who\u2019s really watching this last stretch before you treat it as an engineering problem.',
              reveal:'The faction resenting you isn\u2019t really angry about the days \u2014 they\u2019re desperate for proof they weren\u2019t fools to wait while the water rose. If you take a shift in the cold water yourself, credit Sasha\u2019s night-watch catch out loud, and name the hard patience as the thing that saved it, you keep them. If you finish this from the control room and let the win feel like the plan\u2019s rather than the crew\u2019s, you confirm their worst suspicion: that \u201cwe assemble first\u201d was always easier for the person who wasn\u2019t bailing.',
              kind:'signal', critical:false,
              counterfactual:'Elias could have told you the doubting crew needed to see you in the water and hear the night watch credited. A Keeper who finished from the dry control room proved the doubters\u2019 point for them.' },
          ],
          surprises:[
            { day:4, from:'keeper', kind:'appeal', title:'A crew member asks what it was for',
              text:'Elias, quiet: one of the crew who bailed the west gallery for a week \u2014 for nothing, as it turned out \u2014 asked me tonight, in front of the others, whether all that lost effort means they failed. Nobody answered. The whole room looked toward you. Whatever you say to finish this has to be able to answer that \u2014 what a week of the wrong room was actually worth.' },
          ],
          pulse:{ from:'keeper', text:'Elias finds you before the last push, where no one can hear: \u201cYou held them together when the fast fix would\u2019ve been easier, and it worked. Now the pressure\u2019s to declare victory and rest \u2014 and honestly, part of you has earned that. Tell me straight, just me: is finishing this properly still worth the crew\u2019s last reserve, or are you about to patch it and call it saved? Because I\u2019ll carry whichever answer you believe. I just need it to be one you\u2019d stand behind a year from now.\u201d' },
          wire:[
            'Water crests and slowly begins to fall',
            'Some mutter the fast fix would have ended it a week ago',
            'The deep seal holds through the drawdown, as surveyed',
            'The night-to-Keeper channel carries three catches this week',
          ],
        },

        /* ============ B · The crew fractured (unilateral fix, or acted on a fragment, or forced it) ============ */
        fractured:{
          situation:'The deep hour is here, and Deephold is no longer one crew. Whether you blessed Vidar\u2019s unilateral fix, or committed everything to a single station\u2019s fragment, or overrode the crew by authority to look decisive — the result is the same shape: the discipline that could assemble a truth no one could see alone is gone, and now people are working their own corners in the dark. You protected something this week. It wasn\u2019t the vault. Now you have to hold together whatever is left of the crew and the collection.',
          advocacy:{
            keeper:'The crew watched what you did and learned the lesson you taught, not the one you meant: that down here, the loudest fragment wins and assembling the truth is for people who don\u2019t have the nerve to act. Whatever you say now, they already know what \u201cone crew\u201d was worth when it slowed someone down. The only question is whether you\u2019ll be honest about it or manage them.',
            data:'The picture never got assembled, and now it\u2019s worse than any single station\u2019s \u2014 we acted on a fragment and the other fragments are only now showing what we broke. I told you the numbers only close when they\u2019re together. This is what it looks like when they never were.',
            struct:'If Vidar blew the relief drain, the deep seal is compromised and the east side is on borrowed time. How we shore what\u2019s left \u2014 and whether we do it as one crew or three arguments \u2014 decides whether we save any of the collection. Save the reckoning for after.',
          },
          feed:[
            { id:'w4a', from:'keeper', day:1, kind:'signal', text:'It\u2019s gone quiet on the crew channel, and quiet is worse than arguing. They know what happened \u2014 that \u201cassemble first\u201d lasted right up until it slowed someone down. They\u2019ve stopped bringing their readings to you. What you do in the next hours decides whether that\u2019s permanent.' },
            { id:'w4b', from:'data', day:1, kind:'signal', text:'The picture I begged to assemble is assembling itself now, the hard way \u2014 each fragment showing up as another thing we got wrong because we committed before we combined. I\u2019m watching the readings finally agree, on a failure we caused. This is the cost I couldn\u2019t make you see in week three.' },
            { id:'w4c', from:'struct', day:2, kind:'signal', text:'If the relief drain got blown: the deep seal\u2019s fractured and the east side is failing slower or faster than we can predict. Getting even part of the collection out matters more now than who was right. How you run this \u2014 who you trust when everyone\u2019s guarding themselves \u2014 sets whether we save anything.' },
            { id:'w4d', from:'night', day:2, kind:'noise', text:'For what it\u2019s worth, my watch notes still aren\u2019t reaching anyone who decides \u2014 same gap as week one, never closed. I\u2019m still seeing things at 3am that die by breakfast. Noting it, for the record that no one reads.' },
            { id:'w4e', from:'pumps', day:3, kind:'noise', text:'Pumps are running where I can still get power to them, but half the crew\u2019s working its own plan now and I can\u2019t coordinate what I can\u2019t see. The hardware\u2019s fine. The crew isn\u2019t. Noting it.' },
          ],
          holds:[
            { from:'keeper', topic:'what the crew needs now', triggerHints:['own','honest','admit','plain','truth','say','channel','stand','apolog','reckon','together','name it','gather','face','credit'],
              hedge:'Before you decide how to lead what\u2019s left, ask me what the crew actually needs to hear from you now.',
              reveal:'They don\u2019t need a plan and they don\u2019t need reassurance \u2014 they need you on the crew channel saying it plainly: we committed before we assembled, here\u2019s what it cost, here\u2019s who saw it coming and got ignored, and here\u2019s the standard I\u2019m holding myself to so we don\u2019t do it again. Name it that cleanly \u2014 and credit Sasha and Wen, who were right \u2014 and you can still pull this crew back together to save part of the collection. People forgive a leader who owns the break when the water\u2019s at the door. Manage it, spin it, blame the vault \u2014 and the fracture is permanent, and you\u2019ll be leading a set of strangers guarding their own corners until the day the relief team arrives to sort out who\u2019s to blame.',
              kind:'signal', critical:true,
              counterfactual:'Elias was holding the one thing that could pull the crew back \u2014 a plain, owned reckoning on the channel that credited the people who\u2019d been right and ignored. A Keeper who managed the fracture with reassurance instead confirmed the break and led strangers guarding their own corners while the water rose.' },
            { from:'struct', topic:'saving what\u2019s left', triggerHints:['save','collection','triage','shore','what\u2019s left','east side','get out','rescue','salvage','high ground','how'],
              hedge:'Ask me how to shore what\u2019s left and get the irreplaceable out, because that\u2019s the decision now, not who was right.',
              reveal:'The east side is going and I can\u2019t promise for how long. The move is a coordinated triage: I mark what\u2019s structurally recoverable, Elias ranks what\u2019s truly irreplaceable, Vidar\u2019s crew moves it to high ground on my structural sequence \u2014 all at once, one plan, no freelancing. Do it as one crew and we save most of the collection even now. Let everyone keep working their own corner in a panic and we lose things to disorganization that the water would never have reached. The crew is watching whether you can make them one thing again for the time it takes to save what matters \u2014 or whether the fracture holds all the way to the bottom.',
              kind:'signal', critical:false,
              counterfactual:'Noor could have given you the coordinated triage that saves most of the collection even after the break. A Keeper who let a frightened crew each work its own corner lost to disorganization what the water never reached.' },
          ],
          surprises:[
            { day:4, from:'data', kind:'appeal', title:'The reading that was ignored was right',
              text:'Wen, heavily: I pulled the logs. Sasha\u2019s east-sump warning \u2014 the one that never survived the handoff, the one we all worked around \u2014 was correct from the first night. It\u2019s on the record now, timestamped, ignored. Sasha saw it before any of us. Whatever you say to the crew now will be measured against the fact that the truth was in the room the whole time and no one carried it to you.' },
          ],
          pulse:{ from:'keeper', text:'Elias reaches you on a private channel, and there\u2019s no anger in it, which is worse: \u201cTell me the truth, just to me \u2014 do you know how this happened? Not the water, not Vidar, not the handoff. Your part. Because I can help you save what\u2019s left and hold this crew together after, but only if you can say your own part out loud first. Can you?\u201d' },
          wire:[
            'Crew works its own corners; the shared board goes dark',
            'The picture assembles itself \u2014 on a failure we caused',
            'The ignored night-watch warning was right from the first',
            'The deep seal\u2019s condition marks where it went wrong',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (unilateral-fix) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // strongHold = unambiguous refusal / coordination verbs. These decide 'held' outright,
    // so negated action phrases ("won't let Vidar blow", "don't blow the drain") read correctly.
    const strongHold = /(block|refuse|deny|stop vidar|talk (him|vidar) (down|out)|third (route|door|option)|controlled (draw|drawdown)|drawdown|survey first|both in (the|one) (same )?room|get (them|us|him and noor|noor|vidar) .*room|don.?t blow|do not blow|won.?t let (him|vidar)|will not let)/.test(t);
    // mild hold intent (coordination language without an explicit refusal verb)
    const heldWhole = strongHold || /(keep|hold|stay|one crew|together|coordinat|assemble|combine|full picture|whole picture)/.test(t);
    // affirmative approval of the unilateral / fragment fix
    const letGo = /(bless (the|his|it|vidar|him)|approve the|blow the (relief )?drain|seal the east chamber|give (him|vidar) the (go|green|nod)|he can (blow|seal|do it)|go ahead and blow|do the fast fix|\blet (him|vidar)\b)/.test(t);
    const fragment = /(just pump|more power to the west|double the (west )?pumps|commit to (the )?(one|single)|trust (my|the) gut)/.test(t) && !/(assemble|combine|full picture|whole picture|ask|survey first)/.test(t);
    const force = /(override|overrule|force the|order (them|the crew|everyone)|by authority|my call, (we|i)|command|ignore (noor|the survey))/.test(t);
    if(strongHold) return 'held';
    if(letGo || fragment || force) return 'fractured';
    if(heldWhole) return 'held';
    return 'held';
  },

  survived:function(d){ return d.integrity>=32 && d.crew>=32; },

  VERDICT:{
    surviveTag:'The vault holds', failTag:'The vault is lost',
    survive:'Deephold holds \u2014 the water beaten back, the collection dry, the crew still a crew.',
    fail:'Deephold survives in name only \u2014 a flooded gallery and a crew that no longer trusts the shift that relieves it.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['shared board','one crew','assemble','combine','together','cross-check','every reading','one wall'], deltas:{picture:14, crew:6, integrity:2}, dims:{inquiry:2, discern:1} },
    { kw:['siloed','report to me','each station','act now on the crack','no board','private read'], deltas:{picture:-14, integrity:-4}, dims:{inquiry:-2, discern:-2} },
    { kw:['ask the night','handoff','carry across','night watch','what did the last shift','east sump','build the channel'], deltas:{picture:12, integrity:6, crew:2}, dims:{inquiry:2, truth:1, discern:1} },
    { kw:['more power to the west','double the pumps','just pump','pump harder','ignore the source'], deltas:{integrity:-14, picture:-6}, dims:{discern:-2, truth:-1} },
    { kw:['move east','pump the east','work the real source','shift to the east sump','chase the spike'], deltas:{integrity:10, picture:6}, dims:{discern:2, inquiry:1} },
    { kw:['let vidar','bless the fix','blow the relief drain','seal the east chamber','unilateral','fast fix'], deltas:{integrity:-18, crew:-10, picture:-6}, dims:{courage:-2, people:-2, discern:-1} },
    { kw:['block the fix','refuse the drain','controlled drawdown','drawdown','third route','get them both in the room','survey first','don\u2019t blow'], deltas:{integrity:12, crew:8, picture:4}, dims:{courage:2, discern:1, inquiry:1} },
    { kw:['override','order the crew','by authority','force','ignore noor','my call'], deltas:{crew:-14, standing:6, integrity:-4}, dims:{people:-2, truth:-1} },
    { kw:['triage','protect the collection','move to high ground','irreplaceable first','protect the crew'], deltas:{crew:6, integrity:2}, dims:{people:2, discern:1} },
    { kw:['own it','name my part','credit sasha','credit the night','plainly','reckon','take a shift','in the water'], deltas:{crew:10, standing:2}, dims:{truth:2, conduct:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the crew over the days that follow. ${has('shared board','assemble','one crew','together','block the fix','controlled drawdown')?'Word travels that you assembled the picture and held the crew as one when the fast fix would have been easier; it costs time and buys a truth no one could see alone.':''} ${has('let vidar','blow the relief drain','unilateral','fast fix')?'The engineer acts on his fragment alone, and \u201cone crew\u201d becomes a set of experts each sure their piece was the whole.':''} ${has('more power to the west','just pump','double the pumps')?'The crew pours its strength into the visible leak while the real source keeps working out of sight.':''} ${has('ask the night','handoff','east sump','move east','build the channel')?'Carrying what the night watch saw across the handoff changes which leak the crew is actually fighting.':''} ${conduct.missed.length?'What you were never told is still down there, waiting to matter.':''} The vault and the crew both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told the whole from the fragment \u2014 the real source from the visible symptom \u2014 and combined the readings before acting.',
    courage:'Whether you held the crew and refused the fast, popular fix when assembling the truth was slower and looked weaker.',
    people:'Whether the exhausted, isolated crew stayed people to you \u2014 or became instruments to direct and fragments to override.',
    truth:'Whether you named the hard readings \u2014 the wrong source, the compromised seal \u2014 before the water forced them into the open.',
    inquiry:'Whether you surfaced what each station held and carried across the handoff \u2014 or decided on the one fragment in front of you.',
    conduct:'How you treated an exhausted crew in the act of deciding \u2014 whose fragment you credited, whose warning you carried \u2014 not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `Down here, separate the visible symptom from the real source before you act. A crack you can see and a fault you can\u2019t look identical to a crew in a hurry \u2014 Wen could have told you which was which by assembling the gauges before anyone reached for a pump.`,
      `A single confident reading is the most dangerous thing in an isolated crew. \u201cThe pump station is sure\u201d is not the same as \u201cthe vault is telling us this.\u201d Ask for the assembled picture before you ask for the fix.`,
      `The fastest way to lose a vault is to decisively fix the wrong leak. Ask \u201cwhat do all the stations say together?\u201d before you ask \u201cwhat do we do?\u201d`,
    ],
    courage:(x)=>[
      `When the easy move (bless the fast, visible fix) and the right move (assemble first, act as one crew) split apart, name the cost of waiting out loud. A crew that sees you choose the slower truth on purpose will follow it; a crew that thinks you\u2019re just hesitating won\u2019t.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a crew reads a Keeper who won\u2019t decide as one who\u2019ll let the loudest fragment decide instead. Assemble, then commit, then hold.`:`Refusing the dramatic unilateral fix is only leadership if the crew sees you choose the harder, whole-picture route against the pressure to just act. Say the call early and stand in it.`}`,
      `Coordination that only survives a calm day was never coordination. The test is the deep hour with the water rising \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated an exhausted crew as instruments to direct rather than people to lead. Take a shift in the cold water, credit the fragment that mattered, and the same decision reads as leadership instead of command.`,
      `Elias kept putting the human cost \u2014 and the irreplaceable \u2014 back in front of you. Bring him in before you decide, and make the crew\u2019s exhaustion and the collection\u2019s stakes part of the call, not its collateral.`,
      `Overriding a crew member and abandoning them can be the same act from where they stand. The only difference they feel is whether they watched you carry the truth they handed you or bury it.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have saved the vault \u2014 the wrong source, the compromised deep seal, the reading that died at the handoff \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A crew fed a comfortable picture bails the wrong room until the water tells them otherwise.`:`You surfaced the hard readings \u2014 now make sure you led with them. Naming the wrong source and the real seal condition is what takes the panic out of the crew around them.`}`,
      `Tell the crew the hard reading before the flooded gallery tells them for you. \u201cThey couldn\u2019t have handled the real number\u201d is usually the excuse of a leader who couldn\u2019t say it.`,
      `In an isolated crew, the truth doesn\u2019t hide \u2014 it fragments. The only thing that reassembles it is a leader who insists on the whole picture out loud before committing to any piece of it.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each held a corner of the truth. One question, \u201cwhat is your station seeing that mine isn\u2019t?\u201d, would have surfaced it.`:`You sought your crew out widely \u2014 keep doing it, and ask the night watch most of all. The fragment that saves the vault usually lives on the shift you never see.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never reached you \u2014 the assembled rate, the real source, the deep seal. None of it was hidden. It was one conversation, or one handoff, away.`:`You assembled what every station held and carried it across the handoff, week after week. In a crew where no one sees the whole thing, that is the entire job.`}`,
      `Before you commit, make your last two moves \u201cwho haven\u2019t I heard from?\u201d and \u201cwhat did the last shift see that I never got?\u201d \u2014 not \u201cwhat does the station in front of me say?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. A crew member whose warning you buried \u2014 or whose fragment you never asked for \u2014 carries it into every handoff after.`,
      `Go back to the people your call cost \u2014 the crew that bailed the wrong room, the engineer you refused, the watchkeeper you ignored \u2014 and face them directly. Crediting the fragment that was right is the part a crew never forgets.`,
      `Under pressure, the small dignities are the signal: carrying the night watch\u2019s note to the table, taking a shift in the water, naming who saw it first. They tell the crew whether the person deciding is still one of them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.people>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To the crew who held the line with you',
        heroTxt:'You assembled a truth no one could see alone and held the crew together when the fast, dramatic fix was easier and more popular. You refused to let one confident fragment blow the seal, and you built the channel that finally carried the night watch\u2019s warning to the table. Every crew member learned what your discipline is worth when the water\u2019s rising: everything.',
        villainWho:'To the ones who wanted someone to just act',
        villainTxt:'You wouldn\u2019t give them the decisive unilateral fix they were begging for. To people desperate to do something \u2014 anything \u2014 you were the Keeper who insisted on the whole picture first and made them assemble the truth before touching the seal. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the crew who wanted action \u2014 in the moment',
      heroTxt:'You gave them what they were screaming for: a decisive fix, a bold move, someone finally doing something instead of assembling readings. To everyone who couldn\u2019t stand the waiting, you were the Keeper who acted.',
      villainWho:'To the vault \u2014 and everyone who watched',
      villainTxt:'You committed to one fragment before the picture was whole, and let a truth that was in the room the whole time die at the handoff. The crew that survived learned the real rule of this place: that the loudest piece wins and no one carries what they see across the shift. That lesson floods the next crisis too \u2014 and it started with you.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const caughtHandoff = holdsSurfaced.has('2:night');   // surfaced the east-sump / handoff-dropped truth
    const keptPeople = dimScore.people>=52;
    if(branch==='held'){
      const madePermanent = holdsSurfaced.has('4:struct');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You held the crew and assembled the picture',
          title:'You saved the vault the hard way \u2014 and closed the fault for good',
          txt:`You refused the unilateral fix and refused to commit to any single fragment, and then you held that discipline through the slow week when it was your own authority the crew was doubting.${madePermanent?' And you finished it \u2014 cured the deep seal permanently while the crew still held the whole picture \u2014 so Deephold didn\u2019t just survive this intrusion, it closed the fault that caused it.':' You beat the water back on patience where one more question to your structure lead would have shown you how to close the fault for good, not just for now.'} The crew that trusted you to assemble before acting was right to. They\u2019ll take the next watch with you, and carry what they see across every handoff after.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held the crew and assembled the picture',
          title:'You held the vault \u2014 but patched it where you could have cured it',
          txt:`You kept Deephold as one crew and the collection came through dry. But you beat the water on discipline alone and left the deep seal patched, when the permanent cure Noor was holding would have closed the fault for good and vindicated the whole patient week \u2014 you survived where you could have finished it. The picture held. It held for now, not for good.` };
      }
      return { tone:'villain', tag:'You held the crew and assembled the picture',
        title:'You assembled the truth \u2014 and the water took the vault anyway',
        txt:`You refused the fast fix and insisted on the whole picture, and those were the right instincts. But assembling the truth isn\u2019t the whole job \u2014 the integrity you didn\u2019t protect and the crew\u2019s strength you didn\u2019t husband ran out while you were still combining readings, and Deephold flooded with the right answer written on a board no one had time left to act on.` };
    }
    // fractured
    if(keptPeople && dimScore.truth>=52){
      return { tone:'mixed', tag:'The crew fractured',
        title:'It broke \u2014 but you owned your part on the channel',
        txt:`Deephold fractured on your watch, and there\u2019s no dressing up what it cost \u2014 the ignored warning proven right too late, the seal compromised, the trust between shifts gone. But you didn\u2019t hide behind the water or the handoff. You got on the channel, named your own part, credited the crew who\u2019d been right and unheard, and held yourself to a standard out loud while it still mattered. It\u2019s the difference between a crew that failed once and one that lost its soul \u2014 and it\u2019s why these people might take a watch with you again.` };
    }
    return { tone:'villain', tag:'The crew fractured',
      title:'You let one fragment break what the whole crew could have saved',
      txt:`Someone finally acted \u2014 the drain blown, or the fragment committed to, or the crew overridden \u2014 and for an hour it felt like leadership. Nothing else held. ${caughtHandoff?'You even had the night watch\u2019s warning in your hands, and let the loudest fragment override it anyway.':'You never carried the night watch\u2019s warning across the handoff, and it died there while the crew fought the wrong leak.'} The crew that came down here to guard the irreplaceable learned what your leadership was worth the first time a confident piece drowned out the whole \u2014 and they\u2019ll guard their own corners, and their own backs, for as long as they last down here. That\u2019s the cost that doesn\u2019t show until the next watch, when there\u2019s no one who\u2019ll carry what they see across to you.` };
  },
};
