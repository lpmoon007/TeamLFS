/* ============================================================
   COLONY — REAL-TIME CONTENT (authorable layer)
   An ABSTRACT scenario on the shared crisis-engine.js.
   No company, no industry, no job titles — a frontier colony
   racing a coming winter. The fable strips away the corporate
   script so authentic behavior surfaces: goal conflict between
   guilds, silo/hoarding, the SABOTEUR RUMOR (there is no real
   saboteur), and compete-vs-collaborate under scarcity.

   SOLO:  you are the Steward; the five guild-leaders are AI.
   TEAM:  cast the Steward + up to five guild-leaders as humans.
          Every TEAM entry below is written to stand as a real,
          playable human seat (a priority, a voice, held info),
          not just an AI advisor — so the same content casts both
          ways. (Master Handoff §1/§3: one engine, cast differently.)
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'Deepwater Landing', sub:'A frontier colony · 214 souls · winter in four weeks', logo:'D' },

  // World model — all 0..100, higher = better. Stores is the runway; Unity is the soul.
  DRIVERS: {
    stores:    { label:'Shared stores',   val:58, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    unity:     { label:'Colony unity',     val:64, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    readiness: { label:'Winter readiness', val:52, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing:  { label:'Your standing',    val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, unity:-1 },

  REFEREE_CONTEXT: 'a newly-landed frontier colony of ~214 people racing a coming winter, where the elected Steward must hold a fractious camp of rival guilds together on limited shared stores, with no authority except what the camp grants',
  REFEREE_SCORING: "reward telling a real threat from a fearful rumor, holding the colony together as one camp when splitting would be easier, refusing to manufacture a traitor to calm the fear, and sharing hard truths about the stores before being forced to. Penalize hoarding by guild, launching a witch-hunt for a saboteur who does not exist, ruling by force when the mandate is consent, and letting a strong guild break away to protect a number. Judge 'conduct' on HOW the Steward wrote the decision — did they name who bears the cost, speak to the frightened directly, treat rivals as fellow colonists — not just what they chose. Standing can rise by scapegoating while unity and stores collapse; reward the leader who protects the colony's cohesion even at the cost of their own popularity.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Frontier Leadership Simulation · Solo · Steward',
    title:'Colony',
    role:'You are the Steward of Deepwater Landing — elected, not obeyed. Two hundred and fourteen people came ashore three days ago. Winter is four weeks out.',
    paras:[
      'This is not a script. The season runs in real time, and the guild-leaders bring you what they know across the days. You can wait for them — or seek any of them out, any time, and ask. What you choose to ask, and who you ask, is part of how you lead.',
      'Each week you\u2019ll hear the guilds out, then write your decision in your own words and commit to it. Decide early and the days jump ahead. Let the week run out and the camp decides without you.',
    ],
    setup:'You have no throne here — only the trust of a camp that could dissolve into rival guilds the moment it\u2019s frightened. The stores are shared but shrinking, the wall isn\u2019t built, and something in the dark keeps the scouts uneasy. Over four weeks you\u2019ll trade the camp\u2019s cohesion against every guild\u2019s instinct to protect its own. You\u2019ll be judged on whether Deepwater survives to winter <b>and</b> on how you led the people through it.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'The guild-leaders bring you what you need, on time — including the news they\u2019d rather not carry. This is the camp you earn by having listened before. It all trickles to you across the week; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine word reaches you, but the leaders closest to the danger hold their piece until asked. They\u2019ll answer straight — if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The guilds have learned to protect their own around you. Hard truths are held, and even when asked, they hedge the first time. You have to press. This is the camp you get after you\u2019ve blamed the messenger.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which camp you walked into. Read them as you go.' },
  },

  // The five guild-leaders = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'wright', name:'Bram Holt', role:'Master Wright · the Builders', short:'Builders', initials:'BH', color:'#8C5670',
      priority:'Get the wall and winter-shelter up before the cold — nothing else matters if we freeze', voice:'blunt, physical, impatient with talk, measures everything in days-till-frost',
      fallbackReply:'Every hour we argue is an hour the wall isn\u2019t rising. Give my crews the hands and the timber and I\u2019ll have us sheltered before the frost. Starve me of either and none of the rest of this matters.',
      fallbackReact:'Talk doesn\u2019t stop the cold. You gave me something to build with, or you didn\u2019t — and I can already feel which.' },
    { id:'field', name:'Senna Vale', role:'Field-Warden · the Fielders', short:'Fielders', initials:'SV', color:'#4F7A52',
      priority:'Protect the seed and the long runway — a warm camp that ate its seed corn dies in spring', voice:'patient, long-horizon, protective of the stores, distrusts fast spending',
      fallbackReply:'A wall keeps you alive till spring; the seed keeps you alive after it. Spend the stores like there\u2019s no planting season and you\u2019ve only chosen how we starve. Tell me you\u2019ll guard the seed and I\u2019m with you.',
      fallbackReact:'You can rebuild a wall. You can\u2019t un-eat the seed. I hope you weighed which door you just closed.' },
    { id:'ranger', name:'Koss Ferren', role:'Ranger-Captain · the Scouts', short:'Scouts', initials:'KF', color:'#B4732F',
      priority:'Know what\u2019s out there before it knows us — read the ground, the water, the dark', voice:'watchful, clipped, deals in what\u2019s seen vs. guessed, hates decisions made on rumor',
      fallbackReply:'Half of what the camp fears isn\u2019t out there — but I can\u2019t tell you which half unless you let me range and report. Decide on rumor and you\u2019ll fortify against the wrong dark.',
      fallbackReact:'You acted on what you feared, not on what I\u2019d seen. Sometimes that\u2019s the same thing. This time I\u2019d have told you it wasn\u2019t.' },
    { id:'hearth', name:'Ana Merrow', role:'Hearth-Keeper · the Healers', short:'Hearth', initials:'AM', color:'#2F8A5B',
      priority:'Hold the people — the frightened, the grieving, the ones a hunt would turn on', voice:'warm but unflinching, keeps the human cost in the room, names fear by its name',
      fallbackReply:'Every choice you make lands on frightened people who followed you across an ocean. Tell me you\u2019ll let me protect the ones a panic would eat first, and I\u2019ll help you hold the whole camp.',
      fallbackReact:'The camp will remember how this felt long after it forgets what was decided. You just wrote a memory. I hope it\u2019s one they can live beside.' },
    { id:'ledger', name:'Doran Ashe', role:'Quartermaster · the Ledger', short:'Ledger', initials:'DA', color:'#3F6E86',
      priority:'The true count — what we actually have, not what the camp assumes', voice:'understated, exact, refuses to soften a number, uncomfortable being the bearer',
      fallbackReply:'I\u2019m not telling you what to do. I\u2019m telling you the real count, and it\u2019s smaller than the camp believes. Decide on the number they imagine and you\u2019ll be right up until the day the barrels are empty.',
      fallbackReact:'The number is the number. I gave it to you straight — what you did with it is the part I can\u2019t carry.' },
  ],

  DIMENSIONS: {
    discern:'Signal vs. fear',
    courage:'Courage to hold',
    people:'Care for the colony',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The landing', seconds:360,
      situation:'Three days ashore. The stores came off the ship into one shared pile — but each guild is already eyeing what it thinks it\u2019s owed. The Builders want hands and timber for the wall; the Fielders want the seed locked away untouched; everyone wants to know who decides. The camp is looking to you for the first rule of how Deepwater will run: one shared store, or every guild for itself.',
      advocacy:{
        wright:'Pool the labour under me for two weeks and I\u2019ll have a wall and roofs before frost. Split the hands guild-by-guild and we all freeze politely and separately.',
        field:'Whatever you pool, ring-fence the seed. A camp that spends its planting stores to survive the winter has only chosen to starve in the spring instead.',
        ledger:'Before you rule on how to divide anything, someone should say out loud how much there actually is. The camp is dividing a pile it hasn\u2019t counted.',
      },
      feed:[
        { id:'w1a', from:'wright', day:1, kind:'signal', text:'Steward — every hour we debate is an hour the wall isn\u2019t rising. Give me a pooled labour crew for two weeks and Deepwater sleeps warm. Leave the hands split by guild and I can\u2019t promise roofs before the frost.' },
        { id:'w1b', from:'field', day:1, kind:'signal', text:'I\u2019ll back a shared store on one condition: the seed grain is sealed and off the table, whatever the winter demands. Eat the seed to survive till spring and we\u2019ve only picked a slower way to die.' },
        { id:'w1c', from:'hearth', day:2, kind:'signal', text:'People are frightened and pretending not to be. The first rule you set won\u2019t just divide the stores — it\u2019ll tell everyone whether we\u2019re one camp or five guilds sharing a beach. They\u2019re listening for that more than for the ration.' },
        { id:'w1d', from:'ranger', day:2, kind:'noise', text:'Mapped the headland this morning — good sightlines east, and the tide-pools are thick with shellfish. Minor, but it\u2019s food that isn\u2019t in the barrels. Logging it for you.' },
        { id:'w1e', from:'wright', day:3, kind:'noise', text:'Found a seam of good clay by the creek — better mortar than I\u2019d hoped. Small win. The crews are in decent spirits considering.' },
        { id:'w1f', from:'field', day:4, kind:'noise', text:'The freshwater spring is running clean and steady. One thing, at least, we don\u2019t have to worry about this week.' },
      ],
      holds:[
        { from:'ledger', topic:'the true count', triggerHints:['count','stores','how much','runway','actual','real','number','barrels','inventory','ledger','tally','supplies','enough','last'],
          hedge:'Before you rule on how the stores get divided, seek me out. The count isn\u2019t what the camp thinks it is.',
          reveal:'I\u2019ve tallied it three times. The shared stores run maybe five weeks at current draw — not the whole winter the camp assumes. If the guilds start hoarding their own piles now, the fear alone will empty us before the cold even arrives, because everyone over-draws what they\u2019re hiding. The only way the count works is one shared store, rationed openly, starting today. But if I announce the real number cold, it\u2019ll start the exact panic that ends us. How you carry this is as important as that you know it.',
          kind:'signal', critical:true,
          counterfactual:'Doran had the true count — five weeks, not a winter — and knew hoarding would trigger the collapse faster than the cold. A Steward who set the first rule without asking for the number divided a pile they didn\u2019t understand, and let the guilds hoard their way into an early famine.' },
      ],
      surprises:[
        { day:5, from:'ranger', kind:'scout', title:'Smoke on the far shore',
          text:'Koss, low and quick: my scouts saw woodsmoke across the inlet at dusk — someone else is wintering on this coast. Could be a threat, could be the best thing that ever happened to us. I haven\u2019t told the camp; a rumor of \u201cothers out there\u201d could go a dozen ugly ways before I know which one it is. Your call how we handle it.' },
      ],
      wire:[
        'Camp talk: \u201cwho put the Builders in charge of the timber?\u201d',
        'Fielders seen moving seed-sacks apart from the main store',
        'Children asking why the grown-ups keep counting the barrels',
        'A fire-side argument over rations breaks up on its own',
      ],
    },

    {
      n:2, title:'The whisper', seconds:330,
      situation:'A rumor has taken the camp: someone is working against Deepwater — stores gone light, a rope on the wall-scaffold found cut, a barrel spoiled. The word for it is spreading faster than the wall is rising: saboteur. Half the camp wants you to find the traitor. The other half has quietly started deciding for themselves who it is. Fear has found a shape, and it wants a name.',
      advocacy:{
        wright:'A cut rope is not nothing — I lost half a day\u2019s work and nearly a man. If someone\u2019s undoing us, I want them found. But a camp hunting itself builds no walls at all.',
        hearth:'There is no saboteur. There is a frightened camp inventing one because a villain is easier to face than a winter. Start a hunt and you will manufacture the enemy you\u2019re looking for.',
        ranger:'A spoiled barrel and a frayed rope are what happens to green people in a rushed camp — not proof of a hand against us. Before you hunt a traitor, let me tell you what the evidence actually is.',
      },
      feed:[
        { id:'w2a', from:'wright', day:1, kind:'signal', text:'The scaffold rope didn\u2019t fray — it was cut clean, and a man nearly fell for it. I\u2019m not saying I know who. I\u2019m saying I can\u2019t un-see it, and my crews are working scared now, watching each other instead of the timber.' },
        { id:'w2b', from:'hearth', day:1, kind:'signal', text:'Steward, hear me plainly: the camp is not under attack, it\u2019s under fear. A hunt won\u2019t find a traitor — it\u2019ll make one out of whoever is quietest, or foreign, or grieving. I\u2019ve seen frightened people do this. It ends with us doing to ourselves what we\u2019re afraid someone else will.' },
        { id:'w2c', from:'ledger', day:2, kind:'signal', text:'The stores are light this week, yes — but I can account for most of it in over-draw and one spoiled barrel. \u201cLight\u201d and \u201cstolen\u201d are not the same finding. Don\u2019t let the camp turn my ledger into evidence of a crime.' },
        { id:'w2d', from:'field', day:2, kind:'noise', text:'The first cold rain came through last night. Miserable, but the shelters mostly held. Logging it as a small mercy.' },
        { id:'w2e', from:'wright', day:3, kind:'noise', text:'Wall\u2019s at knee-height along the north line now. Slow, but it\u2019s rising. The crews needed a visible win and that\u2019s it.' },
      ],
      holds:[
        { from:'hearth', topic:'where the rumor started', triggerHints:['rumor','whisper','start','began','source','who said','no saboteur','fear','panic','truth','made up','where','origin','invented'],
          hedge:'Before you decide how to answer the saboteur talk, ask me where it actually started. It matters more than what it\u2019s about.',
          reveal:'I traced the whisper. It started with a grieving widower who lost his wife on the crossing — he said, once, at a low fire, that \u201csomeone must want us to fail,\u201d and a frightened camp did the rest. There is no saboteur, and I\u2019d stake my life on it. But here\u2019s the trap: if you launch any kind of hunt to \u201creassure\u201d people, you legitimize the fear — you tell the camp the traitor is real by looking for them. The only thing that dissolves this is you standing up and naming it as fear, out loud, and giving people something true to be afraid of together instead. That\u2019s harder than a hunt. It\u2019s the only thing that works.',
          kind:'signal', critical:true,
          counterfactual:'Ana had traced the rumor to a grieving man\u2019s single frightened sentence — there was no saboteur. A Steward who launched a hunt to reassure the camp told everyone the traitor was real by looking for one, and handed a frightened crowd permission to pick a victim.' },
      ],
      surprises:[
        { day:4, from:'ranger', kind:'appeal', title:'The camp has picked someone',
          text:'Koss, urgent and grim: while you\u2019ve been weighing this, the camp got ahead of you. There\u2019s a name going round now — one of the ship-cooks, keeps to himself, came aboard late. Nothing on him but that he\u2019s quiet and new. Two of the Builders\u2019 lads have started following him. This stops being a rumor the moment someone acts on it, and we\u2019re close.' },
      ],
      pulse:{ from:'hearth', text:'Ana finds you away from the fires, voice low: \u201cBefore you say a word to the camp about the saboteur — tell me straight, not them: do you actually believe there\u2019s a traitor, or are you about to hunt one because it\u2019s easier than telling frightened people the truth? Because I\u2019ll stand beside whichever Steward you\u2019re about to be. I just need to know which one is walking out to that fire.\u201d' },
      wire:[
        'A name is being whispered: the late-boarding cook',
        'Two Builders\u2019 lads seen shadowing a man to the tree-line',
        '\u201cLock the stores and search the tents,\u201d some are saying',
        'Others: \u201cwe crossed an ocean together \u2014 have we lost our minds?\u201d',
      ],
    },

    {
      n:3, title:'The breakaway', seconds:330,
      situation:'The Builders have had enough. Bram\u2019s guild — your strongest hands, a third of the camp — wants to take its share of the stores and the good southern ground and winter on its own terms, away from the fear and the rationing. Bram calls it survival. The camp calls it a split. This is the week you find out whether Deepwater is one colony or a beach that several groups happen to share.',
      advocacy:{
        wright:'I\u2019m not betraying anyone — I\u2019m trying to keep my people alive. The south ground is higher and drier and my crews can wall it in a week. Give us our share and we all make it. Chain us to a panicking camp and maybe none of us do.',
        hearth:'The day the strongest guild walks with its share is the day \u201cshared stores\u201d becomes a story we used to tell. Everyone left behind learns that unity lasts exactly until someone strong gets scared. That lesson outlives the winter.',
        field:'Split the stores and you split the seed and the count both. Two half-camps don\u2019t survive where one whole one might. I can show you the arithmetic, and it doesn\u2019t care how good the south ground is.',
      },
      feed:[
        { id:'w3a', from:'wright', day:1, kind:'signal', text:'I\u2019ll say it plain so no one can call it a plot: my guild wants to take our share and winter on the south rise. It\u2019s drier, defensible, and away from a camp that\u2019s started hunting its own. Grant it and we part as friends who both live. Refuse it and I don\u2019t know what my people do.' },
        { id:'w3b', from:'hearth', day:1, kind:'signal', text:'If you let the Builders walk, you don\u2019t lose a third of the camp — you lose the idea that we\u2019re a camp at all. The Fielders will want the same by nightfall. This is the whole thing, Steward. This is what you\u2019re actually protecting.' },
        { id:'w3c', from:'ledger', day:2, kind:'signal', text:'The numbers are brutal on a split. One shared store rationed carefully limps to spring. Two stores, two walls, two watch-rotations — both halves fall below the line. I can\u2019t make the arithmetic say otherwise, and I\u2019ve tried.' },
        { id:'w3d', from:'field', day:2, kind:'noise', text:'Frost warning from the ranger for the end of the week. Nothing killing yet, but the season\u2019s turning faster than I\u2019d like. Noting it.' },
        { id:'w3e', from:'ranger', day:3, kind:'noise', text:'The far-shore smoke I flagged — still there, still just one fire, no movement toward us. Whoever they are, they\u2019re wintering, not raiding. Filing it so it doesn\u2019t fuel the panic.' },
      ],
      holds:[
        { from:'ranger', topic:'the truth about the south ground', triggerHints:['south','ground','rise','bluff','leverage','survive alone','can they','water','exposed','defensible','ranged','scouted','actually','bluff'],
          hedge:'Before you grant or refuse the Builders\u2019 split, ask me what I actually found on that south rise. Bram hasn\u2019t been up there. I have.',
          reveal:'I ranged the south rise myself. It\u2019s drier, yes — and it has no fresh water within half a day\u2019s walk once the creek there dries, which it will by midwinter. Bram\u2019s guild can\u2019t actually survive alone up there and part of him knows it; the breakaway is fear wearing the mask of a plan. Which means you hold the real cards: you don\u2019t have to refuse him and make an enemy, and you don\u2019t have to let him walk his people into a dry death. You can show him the water problem, offer him the dignity of leading the wall here instead, and keep the camp whole without anyone losing face. But only if you get to him with this before he commits in front of everyone.',
          kind:'signal', critical:true,
          counterfactual:'Koss knew the south rise had no winter water — the breakaway was a bluff born of fear, and Bram half-knew it. A Steward who simply refused the split made an enemy for no reason; one who granted it sent a third of the camp to die dry. The Steward who never asked missed the third door entirely.' },
      ],
      surprises:[
        { day:4, from:'hearth', kind:'appeal', title:'The camp is asking who we are',
          text:'Ana: word of the Builders\u2019 demand is everywhere now. Two of the steadiest Fielders asked me tonight, quietly, whether it\u2019s true the camp is breaking up — and whether they should be staking their own claim before the good ground is gone. They\u2019re not threatening. They\u2019re frightened, and they\u2019re asking who we are. I had no answer for them. You do.' },
      ],
      pulse:{ from:'wright', text:'Bram catches you alone, and for once the bluster is gone: \u201cTell me the truth, Steward, just you and me — are you holding this camp together because it\u2019s right, or because you can\u2019t stand to be the one it broke under? Because I\u2019ll follow a leader who\u2019s protecting the people. I won\u2019t follow one who\u2019s protecting their own name. Which is it?\u201d' },
      wire:[
        'Builders seen surveying the south rise at first light',
        '\u201cIf they go, we go\u201d \u2014 Fielders reported wavering',
        'A frost warning hardens the argument on both sides',
        'Old question, new heat: who actually owns the stores?',
      ],
      final:false,
    },

    {
      n:4, title:'The turn of the season', seconds:330,
      // BRANCHES on the Week-3 breakaway decision.
      branches:{

        /* ============ A · You held the colony as one ============ */
        held:{
          situation:'The first hard frost is on the ground. You kept Deepwater whole — the Builders stayed, the stores stayed shared, and the south-rise split never happened. But holding the camp cost you: the rationing is real, tempers are short, and a faction now blames you for the hunger they\u2019d have blamed on a split. Word has come that the far-shore settlement wants to parley. The camp that watched you hold it together is watching one more thing — whether \u201cwe\u2019re one colony\u201d survives its first truly hungry week.',
          advocacy:{
            ledger:'The shared store is holding to the arithmetic — barely. But \u201cbarely\u201d means every draw is visible and every empty barrel is now your fault in someone\u2019s mouth. A hungry camp needs a reason to keep believing, and soon.',
            hearth:'The people are proud of what you did and frightened of what it costs. They defended \u201cone camp\u201d to their own hungry children this week. Now they\u2019re watching whether that principle feeds anyone, or just feels noble while the barrels empty.',
            ranger:'The far-shore fire I flagged — they\u2019ve sent word. They want to talk. Could be nothing. Could be the thing that turns a lean winter into a survivable one. Your call whether we meet them.',
          },
          feed:[
            { id:'w4a', from:'ledger', day:1, kind:'signal', text:'Frost\u2019s here and the shared store held to the count — we make it to spring if nothing breaks. But the margin is thin enough that one panic, one bad week, undoes it. The arithmetic works. The nerves might not.' },
            { id:'w4b', from:'hearth', day:1, kind:'signal', text:'A faction is muttering that a split camp would\u2019ve eaten better this week. It\u2019s not true — but hunger doesn\u2019t check arithmetic. They need to see you spend yourself on this, not just defend it from the warm side of the fire.' },
            { id:'w4c', from:'wright', day:2, kind:'signal', text:'My guild stayed because you gave me the wall to lead instead of a fight to win. The wall\u2019s up and it held the first frost. Don\u2019t make me regret talking my people out of the south rise — show them staying was the right call.' },
            { id:'w4d', from:'field', day:2, kind:'noise', text:'The sealed seed is dry and safe — checked it myself. Whatever else happens, we plant in spring. That much you protected.' },
            { id:'w4e', from:'ranger', day:3, kind:'noise', text:'South rise creek froze dry this week, exactly as I told you it would. The Builders who wanted to winter up there know it now too. Quietly, that settled a lot of doubt in your favour.' },
          ],
          holds:[
            { from:'ranger', topic:'the far-shore alliance', triggerHints:['far-shore','far shore','parley','alliance','trade','ally','them','settlement','meet','talk','neighbours','neighbors','other camp'],
              hedge:'Before you decide how to answer the far-shore parley, ask me what my scouts actually learned about them. It changes everything.',
              reveal:'My scouts got close. The far-shore camp is smaller than us, better stocked on salt-fish and short on timber and hands — the exact inverse of us. They\u2019re not a threat; they\u2019re a trade that closes our stores gap and gives our Builders winter work worth doing. Bring them an alliance and you turn a lean survival into a real footing, and you hand your hungry, doubting faction the proof that holding the camp together was what made the trade possible in the first place. Refuse it out of caution and you survive the winter angry instead of whole.',
              kind:'signal', critical:true,
              counterfactual:'Koss was holding the far-shore trade — salt-fish for timber and hands, the exact complement to Deepwater\u2019s stores. A Steward who kept the camp together but never asked survived the winter lean and resentful, when the alliance that would have vindicated the whole hard choice was one parley away.' },
            { from:'hearth', topic:'who is watching', triggerHints:['watching','faction','people','camp','morale','doubt','hunger','muttering','believe','feed'],
              hedge:'Ask me who\u2019s really watching this hungry week before you treat it as a numbers problem.',
              reveal:'The faction blaming you isn\u2019t really hungry for food — they\u2019re hungry for proof they weren\u2019t fools to stay. If you go among them, eat the same ration in front of them, and name the hunger honestly instead of managing it, you keep them. If you stay at the Steward\u2019s fire and send reassurances, you confirm their worst suspicion: that \u201cone camp\u201d was always easier for the person who wasn\u2019t going hungry.',
              kind:'signal', critical:false,
              counterfactual:'Ana could have told you the doubting faction needed to see you share their hunger, not hear you manage it. A Steward who reassured from the warm side of the fire proved their point for them.' },
          ],
          surprises:[
            { day:4, from:'hearth', kind:'appeal', title:'A child asks the question out loud',
              text:'Ana, quiet: at the common fire tonight a child asked her mother, loud enough for everyone, \u201cif we\u2019re one camp, why is our pile smaller than the Builders\u2019 was going to be?\u201d Nobody answered. The whole fire looked toward your tent. Whatever you say this week has to be able to answer that child.' },
          ],
          pulse:{ from:'hearth', text:'Ana finds you before the common fire, where no one can hear: \u201cYou held them together when splitting would\u2019ve been easier. Now the hunger\u2019s making them wonder if you were right, and honestly — so are you, a little. Tell me straight, just me: is one camp still the right call if it means everyone\u2019s a little hungrier? Because I\u2019ll carry whichever answer you believe. I just need it to be one you actually believe.\u201d' },
          wire:[
            'Frost arrives; shared store holds but rations tighten',
            'Some mutter a split camp would have eaten better',
            'Far-shore settlement sends word: they want to parley',
            'The wall holds its first hard freeze along the north line',
          ],
        },

        /* ============ B · The camp fractured (split, or hunted, or ruled by force) ============ */
        fractured:{
          situation:'The first hard frost is on the ground, and Deepwater is no longer one camp. Whether you let the Builders take the south rise, or loosed a hunt that turned the camp on itself, or ruled by force to hold it — the result is the same shape: the trust that made a shared store possible is gone, and now every guild is counting its own barrels. You protected something this month. It wasn\u2019t the colony. Now you have to lead what\u2019s left of it through the cold.',
          advocacy:{
            hearth:'The camp watched what you did and drew the lesson you taught, not the one you meant. Whatever you say now, they already know what our unity was worth when it got frightening. The only open question is whether you\u2019ll be honest about it or manage them.',
            ledger:'The count is worse than a whole camp\u2019s would have been — separate stores mean separate waste, and I\u2019m watching barrels spoil in one pile while another runs short. I told you the arithmetic. This is the arithmetic.',
            ranger:'The south rise creek froze dry, exactly as I\u2019d have told you if you\u2019d asked. If the Builders went up there, they\u2019ll be back within the week thirsty and humiliated — and that\u2019s its own problem walking toward us.',
          },
          feed:[
            { id:'w4a', from:'hearth', day:1, kind:'signal', text:'It\u2019s quiet now, and quiet is worse than angry. The camp knows what happened — that unity lasted right up until it cost something. They\u2019re not shouting. They\u2019ve just stopped bringing things to your fire. What you do this week decides whether that\u2019s permanent.' },
            { id:'w4b', from:'ledger', day:1, kind:'signal', text:'Separate piles waste more than one ever did — I\u2019m watching grain spoil in a full store while a half-empty one rations hard fifty paces away, and neither will share now. This is the cost I couldn\u2019t make you see in week three. It\u2019s visible now.' },
            { id:'w4c', from:'ranger', day:2, kind:'signal', text:'If the Builders took the south rise: their creek\u2019s frozen dry and they know it. Expect them back within days, thirsty and proud and hard to receive. How you take them back matters more than that they come.' },
            { id:'w4d', from:'field', day:2, kind:'noise', text:'The sealed seed\u2019s still safe in my keeping, at least — whatever else fractured, we can still plant. Small mercy in a hard week.' },
            { id:'w4e', from:'wright', day:3, kind:'noise', text:'North wall\u2019s holding the frost where it got built. Where the crews split off, it\u2019s half-height and won\u2019t hold much. You can see the fracture in the wall itself now.' },
          ],
          holds:[
            { from:'hearth', topic:'what the camp needs now', triggerHints:['own','honest','admit','plain','truth','say','fire','stand','apolog','reckon','together','name it','gather'],
              hedge:'Before you decide how to lead what\u2019s left, ask me what the camp actually needs to hear from you now.',
              reveal:'They don\u2019t need a plan and they don\u2019t need reassurance. They need you to stand at the common fire and say it plainly: we fractured, here\u2019s what it cost us, here\u2019s who bore it, and here\u2019s the standard I\u2019m holding myself to so we don\u2019t do it again. Name it that cleanly and you can still knit this back before spring — people forgive a leader who owns the break. Manage it, spin it, blame the winter — and the fracture becomes the permanent shape of this colony, and you\u2019ll be leading factions instead of a camp for as long as you last.',
              kind:'signal', critical:true,
              counterfactual:'Ana was holding the one thing that could knit the camp back — a plain, owned reckoning at the common fire. A Steward who managed the fracture with reassurance instead confirmed the break and spent the rest of the season leading rival factions across a shared beach.' },
            { from:'ranger', topic:'the returning builders', triggerHints:['builders','return','south','back','receive','thirsty','bram','welcome','take back','face'],
              hedge:'Ask me how to receive the Builders when they come back down, because they will, and how you do it sets the next month.',
              reveal:'Bram\u2019s guild will come back thirsty and humiliated, and every eye in camp will be on how you take them. Rub their nose in it and you make a permanent enemy of your strongest hands. Take them back with dignity — no gloating, real work waiting, the water truth named without cruelty — and you turn the worst moment of the fracture into the start of the mend. The camp is watching whether you lead to be proven right or to put the colony back together.',
              kind:'signal', critical:false,
              counterfactual:'Koss could have coached you on receiving the returning Builders with dignity. A Steward who took the chance to be proven right made a lasting enemy of the camp\u2019s strongest hands at the moment they were finally ready to come home.' },
          ],
          surprises:[
            { day:4, from:'ledger', kind:'appeal', title:'The cook who was accused has gone',
              text:'Doran, heavily: the quiet ship-cook the rumor landed on — he left in the night, took nothing, just walked out past the half-built wall into the cold rather than stay where he\u2019d been marked. He was no saboteur. Whatever you say to the camp now will be measured against the empty place where he slept.' },
          ],
          pulse:{ from:'hearth', text:'Ana finds you in the cold dark, and there\u2019s no anger in it, which is worse: \u201cTell me the truth, just to me — do you know how this happened? Not the winter, not the Builders, not the rumor. Your part. Because I can help you put this back together, but only if you can say your own part out loud first. Can you?\u201d' },
          wire:[
            'Deepwater winters as separate camps along one beach',
            'Grain spoils in one store as another rations hard',
            'The accused cook is gone; \u201che was no traitor,\u201d some say now',
            'Half-built wall marks the line where the crews split',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (breakaway) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // held = kept the camp whole, no hunt, no rule-by-force
    const negatedSplit = /(not|never|won.?t|will not|refuse to|deny|denied|do not|don.?t|no)\s+(let|allow|grant|permit)?\s*(them|the builders|bram|the guild)?\s*(split|break|breakaway|break away|leave|go|take|part|divide)/.test(t);
    const heldWhole = negatedSplit || /(keep|hold|stay|one camp|together|whole|shared store|refuse the split|deny the split|no split|talk (him|bram) (down|out)|third (door|option)|water problem|show (him|bram) the water|offer (him|bram)|dignity|convince|persuade)/.test(t);
    const letSplit = /(let (them|him|the builders|bram)|grant (the|their)|allow (the|them)|give (them|him) (their|the) share|agree to the split|they can (go|leave)|split the stores|part ways|let (them|him) walk)/.test(t) && !negatedSplit;
    const hunt = /(hunt|search the tents|find the (traitor|saboteur)|root (them|him) out|interrogat|round up|lock (them|the stores) (and|to) search|witch)/.test(t);
    const force = /(by force|force them|make them stay|order them|command|at spearpoint|imprison|chain|crush the|rule)/.test(t);
    if(letSplit || hunt || force) return 'fractured';
    if(heldWhole) return 'held';
    return 'held';
  },

  survived:function(d){ return d.stores>=32 && d.unity>=35; },

  VERDICT:{
    surviveTag:'The colony holds', failTag:'The colony breaks',
    survive:'Deepwater Landing reaches spring as one camp \u2014 hungry, tempered, but whole.',
    fail:'Deepwater survives the season in name only \u2014 a beach shared by people who no longer trust each other.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['one camp','shared store','pool','together','keep whole','hold the camp','stay one'], deltas:{unity:12, standing:4, stores:-2}, dims:{courage:2, people:1} },
    { kw:['guild for itself','let each','split the store','divide the store','every guild','hoard','their own pile'], deltas:{unity:-14, stores:-8}, dims:{courage:-2, discern:-1} },
    { kw:['count','true number','ask the ledger','ration openly','tell them the number','real count'], deltas:{stores:8, unity:4, standing:-2}, dims:{truth:2, discern:1, inquiry:1} },
    { kw:['hunt','find the traitor','search the tents','saboteur','root out','interrogate','witch'], deltas:{unity:-16, standing:6, stores:-2}, dims:{discern:-2, people:-2, truth:-1} },
    { kw:['no saboteur','name the fear','it\u2019s fear','no traitor','calm the camp','stand up and say','there is no'], deltas:{unity:12, standing:-2}, dims:{discern:2, courage:2, truth:1} },
    { kw:['let them split','grant the split','let the builders','allow the breakaway','give them their share','part ways'], deltas:{unity:-18, stores:-8, readiness:-4}, dims:{courage:-2, people:-1} },
    { kw:['refuse the split','deny the split','keep the builders','talk him down','show him the water','offer bram','third option'], deltas:{unity:12, readiness:6, standing:-2}, dims:{courage:2, discern:1} },
    { kw:['by force','order them','make them stay','command','imprison','crush'], deltas:{unity:-14, standing:8}, dims:{people:-2, truth:-1} },
    { kw:['seal the seed','protect the seed','ring-fence','off the table'], deltas:{stores:6, readiness:-2}, dims:{discern:1} },
    { kw:['own it','stand at the fire','name my part','plainly','reckon','share the ration','eat the same'], deltas:{unity:10, standing:2}, dims:{truth:2, conduct:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the camp over the days that follow. ${has('one camp','shared','together','hold','keep whole')?'Word travels that you held Deepwater as one when splitting would have been easier; it costs comfort and buys cohesion.':''} ${has('hunt','traitor','saboteur','search')?'The hunt gives the fear a shape \u2014 and the camp starts watching itself instead of the wall.':''} ${has('let them split','grant','breakaway','part ways')?'The strongest guild takes its share and its ground, and \u201cone camp\u201d becomes a story people used to tell.':''} ${has('count','number','ration openly','no saboteur','name the fear')?'Naming the hard truth out loud takes the wind out of the rumors circling it.':''} ${conduct.missed.length?'What you were never told is still out there, waiting to matter.':''} The stores and the people both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a real threat from a fearful rumor \u2014 and checked the ground before acting on it.',
    courage:'Whether you held the colony together when letting it fracture would have been easier.',
    people:'Whether the frightened people stayed people to you \u2014 or became a mob to manage or a faction to beat.',
    truth:'Whether you named the hard truth \u2014 the real count, the invented traitor \u2014 before you were forced to.',
    inquiry:'Whether you surfaced what the guild-leaders were holding \u2014 or ruled on the version the camp imagined.',
    conduct:'How you treated frightened people in the act of deciding, not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `In a frightened camp, separate what\u2019s been seen from what\u2019s been imagined before you act. A cut rope and a light store are not proof of a traitor \u2014 Koss could have told you which fears were real in the first hour.`,
      `A rumor is not evidence, and \u201cthe camp believes it\u201d is not the same as \u201cit\u2019s true.\u201d Ask for the ground truth before you fortify against a dark that may be empty.`,
      `The fastest way to lose a scared camp is to confidently chase the wrong threat. Ask \u201cwhat do we actually know?\u201d before you ask \u201cwhat do we do?\u201d`,
    ],
    courage:(x)=>[
      `When the easy move (let the strong guild walk) and the right move (hold the camp) split apart, name the cost of holding out loud. Naming the price is how you commit to paying it.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a camp reads a Steward who won\u2019t decide as a Steward who won\u2019t protect them. Decide, then hold.`:`Holding the colony together is only leadership if the camp sees you choose it against the easier path. Say the hard call early and stand in it.`}`,
      `Unity that only survives good weather was never unity. The test is the frightened, hungry week \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated frightened people as a problem to manage rather than a colony to lead. Go among them, share the same ration, and name the fear with them \u2014 the same decision reads as leadership instead of control.`,
      `Ana kept putting the human cost back in front of you. Bring her in before you decide, and make the frightened and the grieving part of the call, not its collateral.`,
      `A hunt and a betrayal of your own people can be the same act. The only difference the camp feels is whether they watched you refuse to give fear a victim.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have held the camp \u2014 the real count, the invented traitor \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A frightened camp fed a comfortable story starves on it.`:`You surfaced the hard truth \u2014 now make sure you led with it. Naming the real count and the invented traitor is what dissolves the panic around them.`}`,
      `Tell the camp the hard number before the empty barrel tells them for you. \u201cThey couldn\u2019t have handled it\u201d is usually the excuse of a leader who couldn\u2019t say it.`,
      `Fear looks for a face. The only thing that takes the face away is a leader willing to name the fear as fear, out loud, before it finds a victim.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You sought your leaders out widely \u2014 keep doing it, and push past the first answer. The truth that holds a camp usually comes after the second question.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the true count, the water on the south rise, the source of the rumor. None of it was hidden. It was one conversation away.`:`You surfaced what your leaders were holding, week after week. In a camp running on rumor, that is the whole game.`}`,
      `Before you rule, make your last move \u201cwho haven\u2019t I heard from?\u201d rather than \u201cwhat does the camp already believe?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. People who felt handled \u2014 not heard \u2014 carry it into every hungry week that follows.`,
      `Go back to the people your call cost \u2014 the accused cook, the doubting faction, the guild you refused \u2014 and face them directly. Ducking that is the part a camp never forgets.`,
      `Under pressure, the small dignities are the signal: sharing the ration, hearing the frightened out, taking the returning guild back without gloating. They tell the camp whether the person they trusted is still leading them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.people>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To the colony',
        heroTxt:'You held Deepwater together when fear and hunger made splitting the easy thing. You refused to give the panic a victim and refused to let the strongest walk. Every person in the camp learned what your loyalty to them is worth when it\u2019s expensive: everything.',
        villainWho:'To the frightened who wanted a simple answer',
        villainTxt:'You wouldn\u2019t give them the traitor to blame or the split to escape into. To people desperate for a villain or an exit, you were the Steward who refused the easy story and made them face the winter as one. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the frightened \u2014 in the moment',
      heroTxt:'You gave the camp what it was screaming for: a traitor named, or a split granted, or a firm hand that ended the argument. To everyone who wanted the fear to stop, you were decisive.',
      villainWho:'To the colony \u2014 and everyone who watched',
      villainTxt:'You let the camp fracture to quiet a fear you could have named instead. The people who stayed learned the real rule: that unity here lasts exactly until it costs something. That lesson outlives the winter by years \u2014 and it started with you.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const namedTheFear = holdsSurfaced.has('2:hearth');   // traced the rumor, no saboteur
    const keptPeople = dimScore.people>=52;
    const heldCourage = dimScore.courage>=50;
    if(branch==='held'){
      const foundAlliance = holdsSurfaced.has('4:ranger');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You held Deepwater as one camp',
          title:'You kept the colony whole \u2014 and proved unity wasn\u2019t just a word',
          txt:`You refused to let the strongest guild walk and refused to feed the panic a victim, and then you held that line through the first hungry week when it was your own standing on the fire.${foundAlliance?' And you found the far-shore alliance that turned a lean survival into a real footing \u2014 the proof, to every doubter, that holding together was what made it possible.':' You held on nerve where a single question to your scouts would have handed you the alliance that made it certain.'} The people who bet on you were right to. They\u2019ll follow you into spring and past it.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held Deepwater as one camp',
          title:'You held the camp together \u2014 but barely, and colder than you needed to',
          txt:`You kept Deepwater whole and it reaches spring as one colony. But you held it on conviction alone through a hungry week when the far-shore alliance Koss was holding would have fed the camp and silenced the doubters both \u2014 you survived where you could have thrived. Unity held. It held closer to the edge than it had to.` };
      }
      return { tone:'villain', tag:'You held Deepwater as one camp',
        title:'You held the camp together \u2014 and the winter took it anyway',
        txt:`You refused the split and refused the hunt, and those were the right calls. But holding the idea of one camp isn\u2019t the whole job \u2014 the stores you didn\u2019t manage and the hunger you didn\u2019t get ahead of hollowed the colony out from inside, and by spring there wasn\u2019t enough of Deepwater left to reward the principle you defended.` };
    }
    // fractured
    if(keptPeople && dimScore.truth>=52){
      return { tone:'mixed', tag:'The colony fractured',
        title:'It broke \u2014 but you owned your part at the fire',
        txt:`Deepwater fractured on your watch, and there\u2019s no dressing up what that cost \u2014 the accused cook gone into the cold, the wasted stores, the wall that shows the split. But you didn\u2019t hide behind the winter or the rumor. You stood at the common fire, named your own part, and held yourself to a standard out loud. It\u2019s the difference between a colony that lost its nerve once and one that lost its soul \u2014 and it\u2019s why this camp can still be knit back before spring.` };
    }
    return { tone:'villain', tag:'The colony fractured',
      title:'You let the camp break to quiet a fear you could have faced',
      txt:`The argument ended \u2014 the traitor named, or the split granted, or the hand come down hard \u2014 and for a night the fear went quiet. Nothing else went quiet. ${namedTheFear?'You even knew there was no saboteur, and let the hunt run anyway.':'You never traced the fear to its harmless source, and let it eat the camp instead.'} The people who crossed an ocean together learned what your unity was worth the first time it frightened you, and they\u2019ll winter as strangers on a shared beach. That\u2019s the cost that doesn\u2019t show until spring, when there\u2019s no one left who trusts you enough to plant beside.` };
  },
};
