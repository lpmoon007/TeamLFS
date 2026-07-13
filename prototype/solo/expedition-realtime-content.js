/* ============================================================
   EXPEDITION — REAL-TIME CONTENT (authorable layer)
   An ABSTRACT scenario on the shared crisis-engine.js.
   No company, no industry, no job titles — a commercial summit
   attempt on a fictional 7,000m peak, racing a closing season.
   The fable strips away the corporate script so authentic
   behavior surfaces: SUNK-COST ESCALATION (permits, sponsors,
   days, altitude already spent), SUMMIT FEVER / EGO (the top
   becomes identity), and the courage to honor a TURN-BACK rule
   under the pressure to push on.

   SOLO:  you are the Expedition Leader; the five are AI.
   TEAM:  cast the Leader + up to five specialists as humans.
          Every TEAM entry below is written to stand as a real,
          playable human seat (a priority, a voice, held info),
          not just an AI advisor — so the same content casts both
          ways. (Master Handoff §1/§3: one engine, cast differently.)
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:330 },

  COMPANY: { name:'The Sennar Ascent', sub:'A commercial expedition · 11 climbers · one closing season', logo:'S' },

  // World model — all 0..100, higher = better. Margin is the people-runway; Window is the season.
  DRIVERS: {
    margin:   { label:'Team margin',      val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    summit:   { label:'Summit progress',  val:44, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    supply:   { label:'Oxygen & supply',  val:56, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    standing: { label:'Your standing',    val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { standing:-3, margin:-1 },

  REFEREE_CONTEXT: 'a commercial high-altitude expedition of 11 climbers on a fictional 7,000m peak, racing a closing weather season, where the hired Expedition Leader must hold a team together against summit fever and the sunk cost of permits, sponsors and days already spent, with real authority but a team that can fracture or push on without them',
  REFEREE_SCORING: "reward honoring a turn-back rule under pressure to push on, telling a real weather window from a hoped-for one, holding the team together when a strong climber wants to break off for a solo bid, and naming the hard truth about oxygen, fitness and conditions before being forced to. Penalize escalating commitment because of what's already been spent (permits, sponsor money, days, altitude), chasing summit fever past the safety margin, letting the strongest climber split the team to protect a personal summit, and overriding the mountain's signals by authority. Judge 'conduct' on HOW the Leader wrote the decision — did they name who bears the risk, speak to the frightened and the exhausted directly, treat a rival's ego as a person to lead rather than a threat to beat — not just what they chose. Standing with sponsors can rise by pushing for a summit while the team's safety margin and cohesion collapse; reward the leader who protects the climbers even at the cost of the summit and their own reputation.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Expedition Leadership Simulation · Solo · Leader',
    title:'Expedition',
    role:'You are the Leader of the Sennar Ascent — eleven climbers, one summit, and a season that closes in four weeks. Everyone here has spent something enormous to stand at this base camp. So have you.',
    paras:[
      'This is not a script. The season runs in real time, and your specialists bring you what they know across the days. You can wait for them — or seek any of them out, any time, and ask. What you choose to ask, and who you ask, is part of how you lead.',
      'Each week you\u2019ll hear the team out, then write your decision in your own words and commit to it. Decide early and the days jump ahead. Let the week run out and the mountain decides for you.',
    ],
    setup:'You have real authority here — and a mountain that ignores it. Every climber has poured savings, months, and identity into standing on that summit, and so much is already spent that turning back feels like losing it all. The weather is closing, the oxygen is finite, and the strongest climber on the team wants the top badly enough to go without you. Over four weeks you\u2019ll trade the summit against the margin that keeps eleven people alive. You\u2019ll be judged on whether the expedition comes home <b>and</b> on how you led them through the pull to push on.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your specialists bring you what you need, on time — including the reads they\u2019d rather not deliver. This is the team you earn by having listened before. It all trickles to you across the week; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine word reaches you, but the people closest to the danger hold their read until asked. They\u2019ll answer straight — if you know who to seek out, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'The team has learned to protect itself around you. Hard truths are held, and even when asked, they hedge the first time. You have to press. This is the team you get after you\u2019ve shot the messenger.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you\u2019re leading. Read them as you go.' },
  },

  // The five specialists = AI advisors (solo) or castable human seats (team).
  TEAM: [
    { id:'client', name:'Reyes Marchetti', role:'Lead climber · the sponsor\u2019s name', short:'Lead climber', initials:'RM', color:'#8C5670',
      priority:'Get to the summit — it\u2019s why every one of us is here, and turning back now wastes everything we\u2019ve spent', voice:'driven, magnetic, impatient with caution, frames every delay as a loss of what\u2019s already invested',
      fallbackReply:'We did not come this far and spend this much to be talked off the mountain by a forecast. The summit is right there. Every day you hesitate, the window closes and the money we burned means nothing. Point me up and I\u2019ll get us there.',
      fallbackReact:'You had the top in reach and you flinched. I\u2019ll live with the call. I\u2019m not sure I\u2019ll ever believe it was the brave one.' },
    { id:'guide', name:'Tenzin Dorje', role:'Head guide · the mountain\u2019s read', short:'Head guide', initials:'TD', color:'#B4732F',
      priority:'Read the mountain honestly — the route, the snowpack, the turn-back time — and never let the summit override it', voice:'calm, spare, deals in what the mountain is actually doing vs. what the team wishes, hates decisions made on hope',
      fallbackReply:'The mountain does not care what we spent to be here. I can tell you what the route is really doing above Camp Three — but only if you ask before the summit fever answers for you. Decide on hope and I\u2019ll be pulling people out of it.',
      fallbackReact:'You climbed on what you wanted the mountain to be, not what I told you it was. Up here, that\u2019s the same as climbing blind.' },
    { id:'doc', name:'Ilse Brandt', role:'Expedition doctor · the human margin', short:'Doctor', initials:'IB', color:'#2F8A5B',
      priority:'Keep eleven people alive and honest about who is actually fit to go higher', voice:'warm but unflinching, keeps the bodies in the room, names exhaustion and altitude sickness by their real names',
      fallbackReply:'Every decision you make lands on a body at the edge of what it can take. Tell me you\u2019ll let me pull the ones who shouldn\u2019t go higher — even the ones who\u2019ll hate me for it — and I\u2019ll help you get the rest home whole.',
      fallbackReact:'The mountain will forget this by morning. The people you sent up sick will carry it a lot longer. So will I.' },
    { id:'met', name:'Owen Faraday', role:'Meteorologist · signal vs. hope', short:'Weather', initials:'OF', color:'#3F6E86',
      priority:'Tell a real weather window from one the team wants to see', voice:'precise, cautious, uncomfortable being the bearer of a closing sky, refuses to round a forecast toward good news',
      fallbackReply:'I can give you the sky as it actually is, not as the team is praying it will be. But a forecast only helps if you ask me before everyone\u2019s already decided the window is real. Read the hope instead of the data and you\u2019ll climb into the exact storm I\u2019m warning you about.',
      fallbackReact:'I told you what the sky was doing. You heard what you needed it to say. That gap is where people get hurt up here.' },
    { id:'log', name:'Marta Kessler', role:'Logistics lead · the true count', short:'Logistics', initials:'MK', color:'#4F7A52',
      priority:'The real numbers — oxygen, fixed rope, days of food — not what the team assumes is up there', voice:'understated, exact, refuses to soften a count, uneasy being the one who says \u201cwe don\u2019t have enough\u201d',
      fallbackReply:'I\u2019m not telling you whether to climb. I\u2019m telling you the real count of oxygen and rope on this mountain, and it\u2019s tighter than the team believes. Plan on the summit they\u2019re dreaming of and you\u2019ll run the tanks dry somewhere you can\u2019t.',
      fallbackReact:'The count is the count. I gave it to you straight. What you did with it is the part I can\u2019t carry down for you.' },
  ],

  DIMENSIONS: {
    discern:'Signal vs. summit fever',
    courage:'Courage to turn back',
    people:'Care for the climbers',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'Base camp', seconds:360,
      situation:'Eleven climbers acclimatized and restless at base camp. Everyone has spent something enormous to be here — Reyes\u2019s sponsor put six figures on the line, two climbers remortgaged, all of you burned a year. Before the first push, the team is looking to you for the rule that governs the whole climb: a hard turn-back time that nobody overrides, or a flexible one you\u2019ll \u201ccall on the day.\u201d Everyone knows which one summits more people. Everyone also knows which one buries them.',
      advocacy:{
        client:'Set a hard turn-back and you\u2019ve pre-decided to fail on a good day just because a clock says so. Trust the leader to read the moment. That\u2019s what we\u2019re paying for.',
        guide:'A turn-back time you\u2019ll \u201ccall on the day\u201d is a turn-back time the summit will call for you. On the day, at altitude, wanting it — nobody turns around. That\u2019s why it has to be set down here, cold, where we can still think.',
        log:'Before you set any rule, someone should say out loud exactly how much oxygen and rope we actually have. The team\u2019s planning a summit against numbers it hasn\u2019t looked at.',
      },
      feed:[
        { id:'w1a', from:'client', day:1, kind:'signal', text:'Leader — the team\u2019s strong and the mountain\u2019s in shape. Don\u2019t shackle us to a rigid clock before we\u2019ve even started. A hard turn-back time is how expeditions leave the summit on the table on the one clear day they get. Give the call to the moment.' },
        { id:'w1b', from:'guide', day:1, kind:'signal', text:'I\u2019ll back this climb with everything I have on one condition: the turn-back time is fixed here, at base camp, and it is not a suggestion. I have watched strong teams die because \u201cwe\u2019ll decide up there\u201d always decides to keep going. Set it cold, now, while we can still think straight.' },
        { id:'w1c', from:'doc', day:2, kind:'signal', text:'Whatever rule you set won\u2019t just govern the clock — it\u2019ll tell eleven people whether this is a summit we\u2019ll die for or a climb we\u2019ll come home from. They\u2019re listening for that answer more than for the schedule. So am I.' },
        { id:'w1d', from:'met', day:2, kind:'noise', text:'Long-range looks unsettled but nothing decisive yet. Two systems tracking our way; too early to call a window. Logging it so you have the trend.' },
        { id:'w1e', from:'guide', day:3, kind:'noise', text:'Icefall route through the lower section is in decent shape this year — fewer seracs than last season. Small mercy. The team\u2019s moving well on the acclimatization rotations.' },
        { id:'w1f', from:'log', day:4, kind:'noise', text:'Fixed rope inventory checked and sorted at base. Fuel for the lower camps is squared away. The high-altitude numbers are the ones we should talk about \u2014 separately.' },
      ],
      holds:[
        { from:'log', topic:'the true oxygen count', triggerHints:['oxygen','count','how much','o2','tanks','bottles','supply','runway','actual','real','number','rope','enough','last','inventory','margin'],
          hedge:'Before you set the turn-back rule, seek me out. The oxygen count isn\u2019t what the team thinks it is.',
          reveal:'I\u2019ve counted the tanks three times. We have enough bottled oxygen for a summit push with a real safety reserve — but only if the turn-back time is hard and everyone honors it. The team is mentally planning on the \u201coptimistic\u201d count: summit for all eleven, no delays, perfect weather. That count has no reserve for a stuck rope, a slow climber, a forced bivouac. If you set a flexible turn-back, people will burn their reserve chasing the top, and the first thing that goes wrong will happen with empty tanks in the death zone. The hard rule isn\u2019t caution — it\u2019s the only thing that makes the oxygen math survivable. But if I announce the tight number cold, half the team will read it as \u201cwe can\u2019t make it\u201d and lose heart before we start. How you carry this matters as much as knowing it.',
          kind:'signal', critical:true,
          counterfactual:'Marta had the real oxygen count — enough for a summit only if the turn-back was hard and honored. A Leader who set the rule without asking for the number planned the whole climb against oxygen math that had no reserve, and left the team burning tanks it didn\u2019t have when the first thing went wrong.' },
      ],
      surprises:[
        { day:5, from:'met', kind:'scout', title:'A gap in the long-range',
          text:'Owen, quiet and careful: the models are hinting at a possible clear window late in the season — a few days that could open for a summit push. I want to flag it because the team will seize on any word of a window like a drowning man on a rope. But it\u2019s eight days out and these things dissolve as often as they firm up. I haven\u2019t told anyone. A rumor of \u201cthe window\u201d could drive decisions before the sky has actually committed. Your call how we handle it.' },
      ],
      wire:[
        'Base-camp talk: \u201cis the leader going to shackle us to a clock?\u201d',
        'Two climbers comparing what the year cost them to be here',
        'Reyes\u2019s sponsor rep asking, again, about summit odds',
        'A debate over turn-back rules breaks up unresolved',
      ],
    },

    {
      n:2, title:'The window', seconds:330,
      situation:'A word has taken the whole team: window. The forecast is showing a break in the weather, and every climber has decided it\u2019s the summit chance they came for. The sponsor wants the push. Reyes is already packing. The team is treating a hoped-for gap in the clouds as a certainty — and the pressure to launch the summit bid now, on this window, is becoming a stampede. Hope has found a shape, and it wants a green light.',
      advocacy:{
        client:'This is the window. This is the one. The sky\u2019s opening, the team\u2019s ready, the sponsor\u2019s watching — we launch the push now or we go home having spent everything for nothing. Give the word.',
        met:'Everyone has decided the window is real because they need it to be. I have not finished reading it, and \u201cthe team believes it\u2019s clear\u201d is not the same as \u201cit\u2019s clear.\u201d Before you launch anyone at that summit, let me tell you what the sky is actually doing.',
        guide:'I\u2019ve watched a team launch on a window that everyone wanted and nobody had confirmed. Half of them didn\u2019t come back down. Ask the forecaster the real read before the fever answers for you.',
      },
      feed:[
        { id:'w2a', from:'client', day:1, kind:'signal', text:'The window\u2019s here, Leader. I can feel the whole team lifting with it. This is exactly what we came for and exactly what we\u2019re running out of time to catch. Every hour you spend \u201cconfirming\u201d is an hour of the window we\u2019re burning. Say go.' },
        { id:'w2b', from:'met', day:1, kind:'signal', text:'Hear me clearly before this becomes a stampede: I flagged a possible window. Possible. The team has turned \u201cpossible\u201d into \u201cconfirmed\u201d because they\u2019re desperate for it to be true. I am still reading it, and what I\u2019m seeing worries me. Do not let hope launch this push before the data does.' },
        { id:'w2c', from:'doc', day:2, kind:'signal', text:'Summit fever is already in the camp \u2014 I can see it in how fast people are packing and how little they\u2019re sleeping. When the whole team wants something this badly, they stop hearing anyone who says wait. Including me. Including you, if you\u2019re not careful.' },
        { id:'w2d', from:'log', day:2, kind:'noise', text:'Loads are staged for a push if you call one \u2014 oxygen and rope pre-positioned to Camp Two. That part\u2019s ready. Whether the rest is ready is above my pay grade. Noting it.' },
        { id:'w2e', from:'guide', day:3, kind:'noise', text:'The team moved well on the last rotation \u2014 physically, they\u2019re capable of the push. Capability was never going to be the thing that killed anyone up here. Judgment is.' },
      ],
      holds:[
        { from:'met', topic:'what the window actually is', triggerHints:['window','weather','forecast','sky','storm','real','confirm','data','clear','actually','model','wait','hold','mirage','front'],
          hedge:'Before you launch anyone on this window, ask me what the data actually shows. Not the hope — the data.',
          reveal:'I\u2019ve run it every way I can. The \u201cwindow\u201d is a sucker gap — a brief clearing on the front edge of a much larger storm system that\u2019s tracking in behind it. If the team launches now, they\u2019ll get one clear morning that makes everyone feel vindicated, and then the real weather arrives while they\u2019re high on the mountain with nowhere to go. Here\u2019s the trap: because the gap looks real on day one, anyone who pushed will feel like they made the right call right up until the storm hits. The genuine window \u2014 if it comes \u2014 is four to five days out, narrower, but clean. Holding the team now, against a stampede that thinks you\u2019re stealing their summit, is the hardest thing you\u2019ll do on this climb. It\u2019s also the only thing that keeps them alive to catch the real one.',
          kind:'signal', critical:true,
          counterfactual:'Owen knew the window was a sucker gap on the front of a bigger storm, with the real clearing four to five days out. A Leader who launched on the stampede got one vindicating clear morning and then the storm, high on the mountain \u2014 when holding the team four more days would have caught the window that was actually survivable.' },
      ],
      surprises:[
        { day:4, from:'guide', kind:'appeal', title:'A rope team has started up on its own',
          text:'Tenzin, urgent and low: while you\u2019ve been weighing this, two of the younger climbers got ahead of you. They\u2019ve started up toward Camp One on their own initiative, chasing the window before you\u2019ve called it \u2014 following Reyes\u2019s energy, not your order. This stops being a decision and becomes a rescue the moment they\u2019re above the icefall without a plan. We\u2019re close to that line.' },
      ],
      pulse:{ from:'met', text:'Owen catches you away from the others, voice low: \u201cBefore you give the team an answer on this window \u2014 tell me straight, not them: do you actually believe the sky is clear, or are you about to launch this push because it\u2019s easier than telling eleven desperate people to wait? Because I\u2019ll back whichever leader walks out to that camp. I just need to know if it\u2019s the one who read the data or the one who read the room.\u201d' },
      wire:[
        'The word \u201cwindow\u201d is everywhere; packing has started',
        'Two young climbers seen moving up toward Camp One',
        '\u201cWe launch now or we go home empty,\u201d the camp is saying',
        'Others, quieter: \u201chas anyone actually confirmed the weather?\u201d',
      ],
    },

    {
      n:3, title:'The solo bid', seconds:330,
      situation:'Reyes has had enough of waiting. The lead climber — the sponsor\u2019s name, the strongest on the team, and a third of the group\u2019s belief — wants to break off with a small fast party and make an independent push for the summit, ahead of your schedule and outside your rules. Reyes calls it seizing the chance. The guide calls it splitting the team on the mountain. This is the week you find out whether the Sennar Ascent is one expedition or a group of people who happen to share a base camp.',
      advocacy:{
        client:'I\u2019m not betraying anyone \u2014 I\u2019m trying to get someone to the top before this whole season is wasted. A small fast team can summit and be down before your \u201creal window\u201d even opens. Bless it and we all come home with something. Ground me and you\u2019ve spent a year and a fortune to summit nobody.',
        guide:'The day your strongest climber breaks off with his own rope team is the day \u201cone expedition\u201d becomes a story. Everyone left behind learns that the rules bind the cautious and free the bold. And a split team can\u2019t support a rescue when the fast party gets in trouble \u2014 and they will.',
        doc:'A fast alpine-style bid means no reserve, no support, no margin. If anything goes wrong up there \u2014 and at that altitude something always does \u2014 there is no one positioned to help them. I can\u2019t keep people alive across a mountain I\u2019ve been split in half on.',
      },
      feed:[
        { id:'w3a', from:'client', day:1, kind:'signal', text:'I\u2019ll say it in the open so nobody calls it a mutiny: I want to take a small fast party and push for the summit now. Light, quick, outside the big slow plan. We can top out and be back before your window even arrives. Bless it and we part as climbers who both got what we came for. Refuse it and I honestly don\u2019t know what I do.' },
        { id:'w3b', from:'guide', day:1, kind:'signal', text:'If you let Reyes break off, you don\u2019t lose one rope team \u2014 you lose the idea that this is one expedition with one set of rules. The next strong climber will want the same by nightfall. This is the whole thing, Leader. This is what you\u2019re actually protecting up here.' },
        { id:'w3c', from:'log', day:2, kind:'signal', text:'A splinter bid means splitting the oxygen and the rope two ways, and neither half has enough for a real emergency. One expedition, pooled, can absorb one thing going wrong. Two half-expeditions can\u2019t absorb any. I can\u2019t make the count say otherwise.' },
        { id:'w3d', from:'met', day:2, kind:'noise', text:'The real window I flagged is firming up for late in the week \u2014 narrow but clean, if it holds. Which makes launching a rogue bid now, before it opens, exactly the wrong moment. Noting it.' },
        { id:'w3e', from:'doc', day:3, kind:'noise', text:'The team\u2019s holding up physically better than I feared on this rotation. Which, perversely, is the problem \u2014 nobody feels the danger in their legs yet, so nobody\u2019s scared enough to be careful.' },
      ],
      holds:[
        { from:'guide', topic:'the truth about the upper route', triggerHints:['route','upper','above camp','can he','can they','bluff','solo','fast','make it','conditions','ridge','summit ridge','actually','scouted','honest','reyes'],
          hedge:'Before you bless or ground the solo bid, ask me what the upper route is actually doing \u2014 and whether Reyes can really pull this off. I\u2019ve been up there. He hasn\u2019t, this season.',
          reveal:'I climbed to the base of the summit ridge on the last rotation. The upper route is worse than Reyes thinks \u2014 a section of the ridge has stripped back to bare ice that a fast light party can\u2019t protect and can\u2019t retreat across quickly. A solo-style bid doesn\u2019t just risk Reyes; it will get him committed to a stretch he cannot reverse when the weather turns. And here\u2019s the part that matters: some part of Reyes already suspects this. The bravado is fear of going home empty, wearing the mask of a plan. Which means you hold the real cards. You don\u2019t have to humiliate him by refusing, and you don\u2019t have to let him climb into a trap. You can show him the ice, give him the dignity of leading the real push when the clean window opens, and keep the team whole without anyone losing face. But only if you get to him with this before he commits in front of everyone.',
          kind:'signal', critical:true,
          counterfactual:'Tenzin knew the summit ridge had stripped to unprotectable ice \u2014 the solo bid was a trap, and Reyes half-knew it. A Leader who simply refused made an enemy of their strongest climber for nothing; one who blessed it sent the sponsor\u2019s name onto ice he couldn\u2019t retreat across. The Leader who never asked missed the third door entirely.' },
      ],
      surprises:[
        { day:4, from:'doc', kind:'appeal', title:'The team is asking who we are',
          text:'Ilse: word of Reyes\u2019s solo bid is all over camp now. Two of the steadiest climbers asked me tonight, quietly, whether it\u2019s true the team is splitting \u2014 and whether they should be planning their own summit shot before the season\u2019s gone. They\u2019re not defiant. They\u2019re frightened, and they\u2019re asking who we are as a team. I had no answer for them. You do.' },
      ],
      pulse:{ from:'client', text:'Reyes finds you alone, and for once the swagger is gone: \u201cTell me the truth, Leader, just you and me \u2014 are you holding this team together because it\u2019s right, or because you can\u2019t stand to be the one who came home without a summit? Because I\u2019ll follow a leader who\u2019s protecting the climbers. I won\u2019t follow one who\u2019s protecting their own record. Which is it?\u201d' },
      wire:[
        'Reyes seen sorting a light kit for a fast push',
        '\u201cIf he goes, I go\u201d \u2014 two climbers reported wavering',
        'The sponsor rep asking whether a solo summit still \u201ccounts\u201d',
        'Old question, new heat: whose rules govern this mountain?',
      ],
      final:false,
    },

    {
      n:4, title:'Summit day', seconds:330,
      // BRANCHES on the Week-3 solo-bid decision.
      branches:{

        /* ============ A · You held the expedition as one ============ */
        held:{
          situation:'The real window is opening \u2014 narrow, clean, exactly as Owen said it would. You kept the Sennar Ascent whole: Reyes stayed, the rules held, the solo bid never happened. But holding the team cost you. The delay burned days and sponsor patience, and a faction now blames you for the summit they think you stole from them on the fake window. Summit day is here, on your terms, as one team. The mountain that watched you hold the line is watching one more thing \u2014 whether \u201cone expedition\u201d can actually put someone on top.',
          advocacy:{
            met:'The window is real and it\u2019s open, but it\u2019s narrow \u2014 you get one clean shot at this and the timing has to be exact. Launch too cautious and you waste it; launch sloppy and you\u2019re caught high when it shuts. This is the needle you held the team together to thread.',
            doc:'The team is proud of the discipline and quietly furious about the wait. They defended \u201cwe climb as one\u201d to their own doubts this week. Now they need to see that holding the line actually gets someone to the top \u2014 not just that it kept everyone safe and short of the summit.',
            guide:'The route\u2019s in as good a shape as it\u2019ll get, and the team\u2019s positioned. But the summit ridge is still the crux \u2014 the ice I flagged. How we run the final push, and who we send, decides whether discipline ends in a summit or just a safe retreat. Your call how we play it.',
          },
          feed:[
            { id:'w4a', from:'met', day:1, kind:'signal', text:'The clean window\u2019s opening on schedule \u2014 the one worth waiting for. But it\u2019s narrow: a summit push has to launch tight and turn around on time or it gets caught when the window shuts behind it. You held the team for exactly this. Now the timing has to be perfect.' },
            { id:'w4b', from:'doc', day:1, kind:'signal', text:'A faction\u2019s still muttering that we\u2019d have summited on the earlier window. It\u2019s not true \u2014 that window would\u2019ve killed people \u2014 but resentment doesn\u2019t check the forecast. They need to see you spend yourself on this summit push, leading from the front, not managing it from base.' },
            { id:'w4c', from:'client', day:2, kind:'signal', text:'I stayed because you gave me the real push to lead instead of a fight to win. I\u2019ll take the sharp end on the ridge. Don\u2019t make me regret talking myself out of the solo bid \u2014 show the team that waiting was the call that got us here.' },
            { id:'w4d', from:'log', day:2, kind:'noise', text:'Oxygen and rope held to the count because the turn-back was honored \u2014 we\u2019ve got the reserve for a real summit push now. That margin exists because of week one. Noting it.' },
            { id:'w4e', from:'guide', day:3, kind:'noise', text:'The fake window Reyes wanted to launch on? It hit exactly as Owen predicted \u2014 a team on the upper mountain that day would be dead now. Quietly, that settled a lot of doubt in your favour.' },
          ],
          holds:[
            { from:'guide', topic:'how to run the summit push', triggerHints:['summit push','final push','ridge','who send','how run','ice','crux','turn-back','turnaround','play it','send','strategy','last push'],
              hedge:'Before you decide how to run the final push, ask me how to actually take the summit ridge. That ice is still there.',
              reveal:'Here\u2019s how the summit gets made instead of just survived: send a small strong rope team \u2014 Reyes and me on the sharp end \u2014 to fix line across the bare-ice section early, while the rest of the team moves up behind on a fixed turn-back. That way the crux gets protected for everyone, the strongest climber gets the summit he stayed for, and nobody\u2019s committed to ice they can\u2019t retreat across. Set a hard turnaround time on the ridge and honor it even in the window, and you summit clean and come home whole. This is the payoff for holding the team \u2014 but only if you run the final push as one coordinated line instead of a race. Ask me and I\u2019ll show you the sequence.',
              kind:'signal', critical:true,
              counterfactual:'Tenzin was holding the sequence that turns discipline into a summit \u2014 a strong team fixing line across the crux early, the rest following on a hard turnaround. A Leader who held the team together but never asked how to run the final push threw away the summit the discipline had earned, and came home safe but empty when they could have come home whole and on top.' },
            { from:'doc', topic:'who is watching', triggerHints:['watching','faction','team','morale','doubt','resent','muttering','believe','front','lead from'],
              hedge:'Ask me who\u2019s really watching this summit push before you treat it as a logistics problem.',
              reveal:'The faction resenting you isn\u2019t really angry about the summit \u2014 they\u2019re angry for proof they weren\u2019t fools to wait. If you take the sharp end, share the risk of the ridge, and lead the push from the front, you keep them for good. If you run it from base and send others up to take the danger, you confirm their worst suspicion: that \u201cwe climb as one\u201d was always easier for the person who wasn\u2019t on the ice.',
              kind:'signal', critical:false,
              counterfactual:'Ilse could have told you the doubting faction needed to see you take the risk of the ridge yourself. A Leader who ran the summit push from base and sent others onto the ice proved their point for them.' },
          ],
          surprises:[
            { day:4, from:'doc', kind:'appeal', title:'A climber breaks down before the push',
              text:'Ilse, quiet: one of the climbers who waited \u2014 who defended you all week \u2014 broke down tonight before the push, saying they can\u2019t tell anymore if they\u2019re here for the summit or just to not have wasted the year. The whole camp heard it. Whatever you say before you launch has to be able to answer that \u2014 what this climb is actually for.' },
          ],
          pulse:{ from:'doc', text:'Ilse finds you before the launch, where no one can hear: \u201cYou held them together when going for it would\u2019ve been easier. Now the window\u2019s open and the pressure\u2019s to summit at any cost to prove the wait was worth it \u2014 and honestly, part of you wants that too. Tell me straight, just me: is the summit still worth turning back from if the ridge goes wrong? Because I\u2019ll carry whichever answer you believe. I just need it to be one you\u2019d actually hold to at the turnaround.\u201d' },
          wire:[
            'The real window opens, narrow and clean, as forecast',
            'Some mutter the earlier window would have summited too',
            'The fake window hits the upper mountain \u2014 exactly as predicted',
            'Reyes takes the sharp end; the team moves as one line',
          ],
        },

        /* ============ B · The expedition fractured (solo bid, or pushed the fake window, or forced it) ============ */
        fractured:{
          situation:'The storm is on the mountain, and the Sennar Ascent is no longer one team. Whether you blessed Reyes\u2019s solo bid, or launched the whole team on the fake window, or overrode the turn-back rule by authority to chase the summit \u2014 the result is the same shape: the discipline that kept eleven people alive is gone, and now people are strung out across the mountain in weather nobody should be climbing in. You protected something this season. It wasn\u2019t the team. Now you have to get down what\u2019s left of it.',
          advocacy:{
            doc:'The team watched what you did and learned the lesson you taught, not the one you meant: that up here, the rules bind the cautious and the summit belongs to whoever pushes hardest. Whatever you say now, they already know what our discipline was worth when it got in the way of the top. The only question is whether you\u2019ll be honest about it or manage them.',
            log:'The oxygen count is worse than one pooled team\u2019s would have been \u2014 split parties burned reserve independently and nobody can support anybody now. I told you the arithmetic in week one. This is the arithmetic, at altitude, in a storm.',
            guide:'The fake window hit exactly as Owen said, and the ridge iced up exactly as I said. Anyone caught high is in real trouble and a split team can\u2019t mount a rescue. If Reyes went for the solo bid, he\u2019s up there now. How we get people down matters more than that they went up.',
          },
          feed:[
            { id:'w4a', from:'doc', day:1, kind:'signal', text:'It\u2019s gone quiet on the radios, and quiet is worse than chaos. The team knows what happened \u2014 that \u201cwe climb as one\u201d lasted right up until it cost someone the summit. They\u2019ve stopped bringing their reads to you. What you do in the next hours decides whether that\u2019s recoverable.' },
            { id:'w4b', from:'log', day:1, kind:'signal', text:'Split parties waste more oxygen than one team ever did \u2014 I\u2019m tracking a party running its reserve dry high on the route while another sits on tanks it won\u2019t share, and neither will coordinate now. This is the cost I couldn\u2019t make you see in week one. It\u2019s visible now, in the worst place.' },
            { id:'w4c', from:'guide', day:2, kind:'signal', text:'If Reyes took the solo bid: he\u2019s on the iced ridge now, in the storm, and he can\u2019t retreat across it fast. Getting him down alive is the whole game, and how you run this \u2014 who you risk to reach him \u2014 matters more than that he ignored you. Save the reckoning for base camp.' },
            { id:'w4d', from:'met', day:2, kind:'noise', text:'The storm\u2019s doing exactly what I forecast \u2014 no worse, no better. That\u2019s cold comfort with people high on the mountain, but at least the weather isn\u2019t going to surprise us on top of everything else.' },
            { id:'w4e', from:'log', day:3, kind:'noise', text:'The lower camps are holding and the descent line is still fixed where the main team built it. Whatever else fractured, the way down for the people who stayed low is intact. Small mercy.' },
          ],
          holds:[
            { from:'doc', topic:'what the team needs now', triggerHints:['own','honest','admit','plain','truth','say','radio','stand','apolog','reckon','together','name it','gather','face'],
              hedge:'Before you decide how to lead what\u2019s left, ask me what the team actually needs to hear from you now.',
              reveal:'They don\u2019t need a plan and they don\u2019t need reassurance \u2014 they need you on the radio saying it plainly: we fractured, here\u2019s what it cost, here\u2019s who\u2019s at risk because of it, and here\u2019s the standard I\u2019m holding myself to so we get everyone down. Name it that cleanly and you can still bring this team back together on the descent \u2014 people forgive a leader who owns the break when lives are on the line. Manage it, spin it, blame the mountain or the weather \u2014 and the fracture becomes permanent, and you\u2019ll be leading a group of strangers off this mountain and every mountain after.',
              kind:'signal', critical:true,
              counterfactual:'Ilse was holding the one thing that could pull the team back together for the descent \u2014 a plain, owned reckoning on the radio. A Leader who managed the fracture with reassurance instead confirmed the break and led strangers off the mountain.' },
            { from:'guide', topic:'reaching the stranded climber', triggerHints:['rescue','reach','reyes','stranded','get him down','descent','bring down','ridge','risk','send','who go'],
              hedge:'Ask me how to reach the climber stuck up high, because someone is, and how you run it sets everything that comes after.',
              reveal:'Reaching a stranded climber in a storm with a split team is the hardest call on any mountain \u2014 risk too many and you multiply the casualties, risk too few and you lose the one you\u2019re trying to save. The answer is a small, strong, willing team on a hard turnaround of its own \u2014 no heroics, no throwing bodies at the problem, and Reyes gets brought down with dignity, not blame, because a rescue run as an I-told-you-so gets people killed. And every climber watching learns whether you lead to be proven right or to get everyone home. That lesson outlives this expedition.',
              kind:'signal', critical:false,
              counterfactual:'Tenzin could have coached you on running the rescue \u2014 a small strong team, a hard turnaround, no blame. A Leader who threw bodies at the problem or ran it as an I-told-you-so multiplied the danger at the worst possible moment.' },
          ],
          surprises:[
            { day:4, from:'log', kind:'appeal', title:'A climber who was talked into it is missing',
              text:'Marta, heavily: one of the younger climbers \u2014 the one who followed Reyes\u2019s energy up the mountain, who only went because the bold move looked like the right one \u2014 hasn\u2019t checked in on the radio for two hours. They weren\u2019t ready for this. Whatever you decide now will be measured against that silence on the channel.' },
          ],
          pulse:{ from:'doc', text:'Ilse reaches you on a private channel, and there\u2019s no anger in her voice, which is worse: \u201cTell me the truth, just to me \u2014 do you know how this happened? Not the storm, not Reyes, not the window. Your part. Because I can help you get these people down and hold this team together after, but only if you can say your own part out loud first. Can you?\u201d' },
          wire:[
            'The storm hits with climbers strung across the upper mountain',
            'Split parties burn oxygen no one can share or coordinate',
            'A climber who was talked into the push is off the radio',
            'The iced ridge Tenzin warned of is exactly where it went wrong',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (solo-bid) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // held = kept the team together, no rogue bid, no forced override
    const heldWhole = /(keep|hold|stay|one (team|expedition|rope)|together|whole|ground (him|reyes|them)|refuse|deny|talk (him|reyes) (down|out)|third (door|option)|show (him|reyes) the ice|offer (him|reyes)|dignity|convince|persuade|wait for the (real|clean) window|wait for the real)/.test(t);
    // letGo requires an affirmative go-verb construction (bare "solo bid" no longer counts, so "won't bless a solo bid" reads as held)
    const letGo = /(let (him|them|reyes)\b|bless (the|his|it|reyes|him)|allow (the|him|them)|approve the|grant (the|his)|give (him|them) the (bid|go|green)|he can (go|climb)|they can (go|climb)|let (him|reyes) (go|climb|push))/.test(t);
    const pushFake = /(launch|go now|take the window|push (now|on the window)|summit push now|send the team up now)/.test(t) && !/(wait|hold|real window|clean window|don.?t|do not)/.test(t);
    const force = /(override|overrule|force them|force the|make them|order (them|everyone)|by authority|ignore the turn|push past the rule|command|my call, we (go|climb))/.test(t);
    if(heldWhole && !letGo && !pushFake && !force) return 'held';
    if(letGo || pushFake || force) return 'fractured';
    if(heldWhole) return 'held';
    return 'held';
  },

  survived:function(d){ return d.margin>=32 && d.supply>=28; },

  VERDICT:{
    surviveTag:'The expedition comes home', failTag:'The expedition is broken',
    survive:'The Sennar Ascent gets its people off the mountain \u2014 tested, changed, but alive and still a team.',
    fail:'The expedition comes off the mountain in name only \u2014 survivors who no longer trust the rope they\u2019re tied to.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['hard turn-back','fixed turn-back','set the rule','honor the turn','turnaround time','discipline','one team','climb as one'], deltas:{margin:12, standing:2, summit:-2}, dims:{courage:2, discern:1} },
    { kw:['flexible','call it on the day','decide up there','trust the moment','no fixed','leave it open'], deltas:{margin:-12, summit:4}, dims:{courage:-2, discern:-2} },
    { kw:['ask the count','oxygen count','real number','true count','reserve','ration the o2','check the tanks'], deltas:{supply:8, margin:4, standing:-2}, dims:{truth:2, discern:1, inquiry:1} },
    { kw:['launch now','take the window','go now','push on the window','summit push now','send them up now'], deltas:{margin:-16, summit:6, supply:-6}, dims:{discern:-2, truth:-1} },
    { kw:['wait for the real','hold the team','sucker gap','not the window','confirm the weather','wait four days','trust the forecast'], deltas:{margin:12, summit:-2}, dims:{discern:2, courage:2, truth:1} },
    { kw:['bless the solo','let reyes go','allow the bid','let him push','fast party','solo bid','let them split'], deltas:{margin:-18, summit:4, supply:-8}, dims:{courage:-2, people:-2} },
    { kw:['ground him','refuse the bid','keep reyes','talk him down','show him the ice','offer reyes','third option','hold together'], deltas:{margin:12, summit:2, standing:-2}, dims:{courage:2, discern:1} },
    { kw:['override','order them','force the summit','by authority','ignore the turn-back','push past'], deltas:{margin:-14, standing:6, summit:4}, dims:{people:-2, truth:-1} },
    { kw:['pull the unfit','turn back the sick','protect the climbers','send them down','who is fit'], deltas:{margin:8, summit:-2}, dims:{people:2, discern:1} },
    { kw:['own it','name my part','stand on the radio','plainly','reckon','take the sharp end','lead from the front','share the risk'], deltas:{margin:10, standing:2}, dims:{truth:2, conduct:2} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the team over the days that follow. ${has('one team','together','hold','keep whole','climb as one','ground him')?'Word travels that you held the expedition as one when going for it would have been easier; it costs a summit shot and buys a margin.':''} ${has('launch now','take the window','go now','push on the window')?'The team launches on the window everyone wanted to believe \u2014 and climbs into the sky the forecaster was warning about.':''} ${has('bless the solo','let reyes go','solo bid','fast party')?'The strongest climber breaks off with a fast party, and \u201cone expedition\u201d becomes a story people tell at base camp.':''} ${has('wait for the real','ask the count','oxygen count','hard turn-back','sucker gap')?'Naming the hard read \u2014 the real window, the real count \u2014 takes the fever out of the room around it.':''} ${conduct.missed.length?'What you were never told is still up there, waiting to matter.':''} The margin and the people both register the call \u2014 and register it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a real signal from summit fever \u2014 the true window from the hoped-for one \u2014 and checked before you climbed.',
    courage:'Whether you honored the turn-back and held the team when pushing on would have been easier and more popular.',
    people:'Whether the exhausted and the frightened stayed people to you \u2014 or became obstacles to the summit.',
    truth:'Whether you named the hard truth \u2014 the real count, the fake window, the iced ridge \u2014 before the mountain forced it.',
    inquiry:'Whether you surfaced what your specialists were holding \u2014 or climbed on the version the team wished were true.',
    conduct:'How you treated exhausted, frightened, summit-hungry people in the act of deciding, not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `On a mountain, separate what the sky is doing from what the team needs it to be doing before you launch anyone. A hoped-for window and a real one look identical on day one \u2014 Owen could have told you which was which before it mattered.`,
      `Summit fever is the confident pursuit of the wrong risk. \u201cThe team believes the window is open\u201d is not the same as \u201cit\u2019s open.\u201d Ask for the data before you ask for the push.`,
      `The fastest way to lose a team high on a mountain is to climb on hope. Ask \u201cwhat is actually true up there?\u201d before you ask \u201chow do we get to the top?\u201d`,
    ],
    courage:(x)=>[
      `When the easy move (push on, chase the summit) and the right move (honor the turn-back) split apart, name the cost of turning around out loud. A turn-back time you won\u2019t defend is a turn-back time the summit decides for you.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 a team reads a leader who won\u2019t decide as one who\u2019ll let the mountain decide instead. Make the call, then hold it at the turnaround.`:`Turning back is only leadership if the team sees you choose it against the pull of the summit and the sunk cost. Say the hard call early and stand in it when it\u2019s unpopular.`}`,
      `Discipline that only survives a bad forecast was never discipline. The test is the open window with the summit in reach \u2014 that\u2019s the one you\u2019re graded on.`,
    ],
    people:(x)=>[
      `You treated exhausted climbers as obstacles to the summit rather than people to bring home. Pull the ones who shouldn\u2019t go higher, share the risk of the ridge yourself, and the same decision reads as leadership instead of ambition.`,
      `Ilse kept putting the bodies back in front of you. Bring her in before you decide, and make the fit-to-climb question part of the call, not its casualty.`,
      `Chasing a summit past your people and abandoning them are the same act from the mountain\u2019s side. The only difference the team feels is whether they watched you refuse to spend them on the top.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth that would have kept the team safe \u2014 the real oxygen count, the sucker gap, the iced ridge \u2014 was one question to <b>${x.missNames.join(', ')}</b> away, and you never asked. A team fed a hopeful story climbs into the storm behind it.`:`You surfaced the hard truth \u2014 now make sure you led with it. Naming the fake window and the real count is what takes the fever out of the room.`}`,
      `Tell the team the hard number before the empty tank tells them for you. \u201cThey couldn\u2019t have handled the real forecast\u201d is usually the excuse of a leader who couldn\u2019t say it.`,
      `Summit fever looks for permission. The only thing that breaks it is a leader willing to name the hope as hope, out loud, before it launches anyone at the sky.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never sought out <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You sought your specialists out widely \u2014 keep doing it, and push past the first answer. The read that keeps a team alive usually comes after the second question.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive thing${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the true oxygen count, the sucker gap, the ice on the ridge. None of it was hidden. It was one conversation away.`:`You surfaced what your specialists were holding, week after week. On a mountain that runs on hope, that is the whole game.`}`,
      `Before you climb, make your last move \u201cwho haven\u2019t I heard from?\u201d rather than \u201cwhat does the team already believe?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. Climbers who felt spent \u2014 not led \u2014 carry it down the mountain and into every rope team after.`,
      `Go back to the people your call cost \u2014 the climber talked into the push, the faction you made wait, the strong one you refused \u2014 and face them directly. Ducking that is the part a team never forgets.`,
      `Under pressure, the small dignities are the signal: pulling the unfit kindly, taking the sharp end yourself, bringing a stranded climber down without blame. They tell the team whether the person they roped up with is still leading them.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.people>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To the eleven who came home',
        heroTxt:'You held the expedition together when summit fever and sunk cost made pushing on the easy thing. You refused to launch on a window you hadn\u2019t confirmed and refused to let your strongest climber split the team. Every person on that rope learned what your loyalty to them is worth when the summit is pulling the other way: everything.',
        villainWho:'To the summit-hungry who wanted the top at any cost',
        villainTxt:'You wouldn\u2019t give them the fake window or the rogue bid or the override they were begging for. To people who\u2019d have spent their own lives for the top, you were the leader who refused the fever and made them come home to climb another day. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the summit-hungry \u2014 in the moment',
      heroTxt:'You gave the team what it was screaming for: the window taken, or the bold bid blessed, or the rule overridden to chase the top. To everyone in the grip of the fever, you were the leader who dared.',
      villainWho:'To the eleven \u2014 and everyone who watched',
      villainTxt:'You let the expedition fracture to chase a summit you could have reached safely a few days later. The climbers who survived learned the real rule of your rope: that discipline binds the cautious and the mountain belongs to whoever pushes hardest. That lesson follows them onto every peak after \u2014 and it started with you.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const readTheWindow = holdsSurfaced.has('2:met');   // knew the sucker gap
    const keptPeople = dimScore.people>=52;
    if(branch==='held'){
      const madeSummit = holdsSurfaced.has('4:guide');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You held the expedition as one',
          title:'You brought them home whole \u2014 and put someone on top the right way',
          txt:`You refused the fake window and refused to let your strongest climber split the team, and then you held that line through the wait when it was your own reputation on the rope.${madeSummit?' And you ran the final push as one coordinated line \u2014 the crux fixed, a hard turnaround honored \u2014 so the summit got made instead of merely survived. The doubters got their top and their whole team both.':' You came home safe on nerve where one question to your guide would have shown you how to take the summit too \u2014 whole and on top.'} The people who tied in with you were right to. They\u2019ll rope up with you again, on any mountain.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held the expedition as one',
          title:'You brought them home \u2014 safe, but short of the top you\u2019d earned',
          txt:`You kept the Sennar Ascent whole and everyone came off the mountain alive. But you held it on discipline alone and turned around short, when the sequence Tenzin was holding would have put a climber on the summit and vindicated the whole hard wait \u2014 you survived where you could have summited clean. The margin held. It came home emptier than it had to.` };
      }
      return { tone:'villain', tag:'You held the expedition as one',
        title:'You held the team together \u2014 and the mountain took its toll anyway',
        txt:`You refused the fake window and refused the rogue bid, and those were the right calls. But holding the team together isn\u2019t the whole job \u2014 the oxygen you didn\u2019t manage and the exhaustion you didn\u2019t get ahead of ground the expedition down, and by the time you came off the mountain there wasn\u2019t enough margin left to reward the discipline you\u2019d shown.` };
    }
    // fractured
    if(keptPeople && dimScore.truth>=52){
      return { tone:'mixed', tag:'The expedition fractured',
        title:'It broke \u2014 but you owned your part on the radio',
        txt:`The Sennar Ascent fractured on your watch, and there\u2019s no dressing up what that cost \u2014 a climber off the radio, oxygen burned across parties that wouldn\u2019t share, the trust that ties a rope team gone. But you didn\u2019t hide behind the storm or the fever. You got on the channel, named your own part, and held yourself to a standard out loud while it still mattered. It\u2019s the difference between a team that lost its nerve once and one that lost its soul \u2014 and it\u2019s why these people might tie in with you again.` };
    }
    return { tone:'villain', tag:'The expedition fractured',
      title:'You let the team break to chase a summit you could have reached safely',
      txt:`The push happened \u2014 the window taken, or the solo bid blessed, or the rule overridden \u2014 and for a few hours the fever felt like vision. Nothing else went right. ${readTheWindow?'You even knew the window was a sucker gap, and launched into it anyway.':'You never confirmed the window before the fever launched everyone into it.'} The people who roped up trusting you learned what your discipline was worth the first time the summit pulled against it, and they\u2019ll come off this mountain as strangers who happened to survive together. That\u2019s the cost that doesn\u2019t show until the next mountain, when there\u2019s no one left who\u2019ll tie in beside you.` };
  },
};
