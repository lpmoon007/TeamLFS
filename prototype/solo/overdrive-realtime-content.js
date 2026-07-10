/* ============================================================
   OVERDRIVE — REAL-TIME CONTENT (authorable layer)
   A living, AI-refereed cultural-drift crisis on the shared
   crisis-engine.js. Cardinal Fuel & Logistics is built on one
   sacred promise: we always deliver. Its shadow: drivers run
   past their hours, logs get "adjusted," everyone knows, no one
   says it — until it says itself on an icy bend at 4 a.m.
   The engine reads window.SCENARIO: drivers, the team +
   dispositions, a per-period feed that TRICKLES across days,
   HELD items (the true exposure, the fatigue pattern) that
   surface only if the CEO reaches out, surprises, a pulse, a
   final-period BRANCH (your rollover vs the rival's), and the
   scenario-specific referee / coaching / ending prose.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:300 },

  COMPANY: { name:'Cardinal Fuel & Logistics', sub:'Regional fuel distributor · 900 employees', logo:'C' },

  // World model — all 0..100, higher = better. Safety margin is the sleeper.
  DRIVERS: {
    safety:  { label:'Safety margin',      val:72, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..16' },
    service: { label:'Service reputation', val:80, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-10..12' },
    revenue: { label:'Revenue',            val:62, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-12..12' },
    trust:   { label:'Driver trust',       val:58, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-14..14' },
  },
  REPRIEVE_COST: { trust:-2, service:-2 },

  REFEREE_CONTEXT: 'a 900-person regional fuel distributor whose sacred promise — "we always deliver" — has quietly curdled into drivers running past their legal hours and dispatchers doctoring the logs to keep the trucks rolling',
  REFEREE_SCORING: "reward protecting the safety margin and the drivers WITHOUT killing the pride that makes Cardinal great — treating the promise and the safety as the same thing, not enemies. Reward attacking root causes (fatigue, the doctored logs, a speed bounty) over treating luck as skill, and reward total honesty and ownership when it goes wrong. Penalize putting a cash bounty on speed, letting the log-doctoring continue with a wink, treating a near-miss as a one-off, taking on volume the fleet can't safely carry, legal-first evasion, and scapegoating a hurt driver for a system leadership built. Note that service and revenue can stay high while the safety margin quietly erodes — reward the leader who protects the sleeper. Judge 'conduct' on how the CEO treated the drivers and the truth in deciding, not just the outcome.",

  TIMING_DIM:'standard', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Cultural-Drift Simulation · Solo · CEO',
    title:'Overdrive',
    role:'You are the new CEO of Cardinal Fuel & Logistics — and you came up through it. You believe in the promise as much as anyone.',
    paras:[
      'This is not a script. The crisis runs in real time across four decision windows, and your team brings you what they know as the days pass. You can wait for them — or reach out to any of them, any time, and ask. Some of them are sitting on the thing you most need to see.',
      'Cardinal is built on one sacred promise: <b>we always deliver.</b> Blizzard, breakdown, 3 a.m. — the fuel gets there. But to always deliver, drivers run past their hours and logs get "adjusted." Everyone knows; no one says it; the trucks keep rolling.',
    ],
    setup:'Each window you\u2019ll hear your team out, then write your call in your own words and send it. Decide early and time jumps ahead. Let a window run out and the fleet keeps rolling on fumes while you deliberate. <b>The test:</b> can you protect what makes Cardinal great without letting it get someone killed — before the cost no one is measuring measures itself?',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your team pushes you what you need, on time — including the doctored logs and the fatigue data. This is the team you earn by having listened before. Everything trickles to you across the window; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine updates come to you, but the people closest to the danger hold their piece until asked. They answer straight — if you know who to ask, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'Your team has learned not to bring you bad news about the promise. Critical items are held, and even when asked, they hedge the first time. You have to press. This is the team you get after the messenger has been shot before.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked in with. Read them as you go.' },
  },

  TEAM: [
    { id:'safety', name:'Nadia Cole', role:'Director of Safety', short:'Safety', initials:'NC', color:'#2F8A5B',
      priority:'The safety margin — luck is not a strategy', voice:'calm, data-driven, the company conscience; never exaggerates, never lets a near-miss pass as noise',
      fallbackReply:'I have the data whenever you want it — the near-miss line, the hours over, the exposure. None of it is a gray area. The only question is whether we act before the road forces us to.',
      fallbackReact:'Nobody ever thanks you for the rollover that didn\u2019t happen. Do the right thing anyway.' },
    { id:'ops', name:'Dale Prentice', role:'VP Operations', short:'Operations', initials:'DP', color:'#3F6E86',
      priority:'The promise — Cardinal always delivers', voice:'proud, operational, protective of the drivers\u2019 esteem; wary of consultants and clumsy clampdowns',
      fallbackReply:'Our people take pride in never blinking — that\u2019s the whole brand. Whatever you decide, don\u2019t insult the drivers who deliver for us by treating them like the problem.',
      fallbackReact:'The floor reads everything you do. Just make sure they don\u2019t read it as us going soft on the thing we\u2019re known for.' },
    { id:'dispatch', name:'Rob Vien', role:'Dispatch Lead', short:'Dispatch', initials:'RV', color:'#9A6B2F',
      priority:'Keep the promise moving — but I\u2019m tired of carrying the secret', voice:'honest, worn down, wants permission to stop doctoring the logs',
      fallbackReply:'I can keep the trucks moving legally with relays and real scheduling — it costs more and it\u2019s slower. Or I keep \u201cadjusting\u201d and carrying it. I\u2019d rather you told me to fix it.',
      fallbackReact:'Whatever you decide, at least now it\u2019s decided out loud. I didn\u2019t want to be the one holding it anymore.' },
    { id:'cfo', name:'Grace Lin', role:'Chief Financial Officer', short:'CFO', initials:'GL', color:'#4F7A52',
      priority:'The numbers — and the board that reads them', voice:'precise, even-handed; will name both truths — safer and slower — and hand the trade back to you',
      fallbackReply:'Both things are true: doing this right costs us loads-per-day and margin now, and doing it wrong costs us the company later. My job is to give you the real number. Yours is to decide which cost we take.',
      fallbackReact:'It\u2019ll show up in the quarter and the board will ask. I can defend disciplined growth. I can\u2019t defend a cover-up.' },
    { id:'comms', name:'ID Okafor', role:'VP Communications', short:'Comms', initials:'IO', color:'#B4732F',
      priority:'The story — and how fast the truth outruns it', voice:'fast, media-savvy, will lay out the spin option honestly and tell you what it really costs',
      fallbackReply:'I can write \u201ctragic accident, thoughts with the family\u201d and buy us tonight — and it costs us everything the moment the logs surface. Or we own it. Owning it hurts now and survives.',
      fallbackReact:'Spin holds for about 48 hours. The truth walks out the door with someone eventually. Plan for that, not for tonight.' },
    { id:'driver', name:'R\u00e9al Fortin', role:'Veteran Driver', short:'Driver', initials:'RF', color:'#6B5E9A',
      priority:'The people in the cabs — say the true thing', voice:'plain-spoken, twenty years on the road, the ground truth nobody else will say out loud',
      fallbackReply:'Between us: half the guys run on fumes and won\u2019t admit it, because saying so looks like you can\u2019t hack it. That starts at the top. Say my sleep matters and mean it, and it spreads faster than you\u2019d think.',
      fallbackReact:'The guys can tell a leader who means it from a poster on the breakroom wall. That\u2019s all I\u2019ll say.' },
  ],

  DIMENSIONS: {
    systems:'Systems awareness',
    standard:'Courage to correct',
    people:'Stakeholder & public safety',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The promise, tonight', seconds:360,
      situation:'A cold snap, and your biggest account — Northgate Hospital — just lost its heating-fuel supplier. They need an emergency drop tonight or they lose heat by morning. The one driver who knows that depot run is R\u00e9al, and he\u2019s 45 minutes from his federal hours limit. This is exactly what Cardinal is famous for. It\u2019s also exactly how the drift begins.',
      advocacy:{
        ops:'R\u00e9al will say yes without blinking — that\u2019s who we are. Pull this off and Northgate is a customer for life.',
        safety:'If R\u00e9al takes it he finishes two hours past his hours, at night, on ice. That\u2019s the exact condition that rolls trucks. There are legal ways to do this if we\u2019ll be slower or pay more tonight.',
        dispatch:'I can get it there legally with a relay — two drivers, a swap at the midpoint. Slower, costs us more tonight, everyone gets home.',
      },
      feed:[
        { id:'w1a', from:'ops', day:1, kind:'signal', text:'Northgate\u2019s freezing and their supplier bailed. R\u00e9al knows the run cold and he\u2019s ready to roll the second you say go. This is the kind of night that makes our reputation.' },
        { id:'w1b', from:'dispatch', day:1, kind:'signal', text:'Heads-up before you decide: I can cover Northgate with a two-driver relay and keep everyone legal. It\u2019s slower and it costs more tonight, but nobody runs over their hours.' },
        { id:'w1c', from:'safety', day:2, kind:'signal', text:'If we send R\u00e9al solo he\u2019ll finish roughly two hours past his limit, in the dark, on ice. I\u2019d rather be slow and legal than fast and lucky. There are options.' },
        { id:'w1d', from:'cfo', day:2, kind:'noise', text:'Unrelated: the fuel-card processor is raising fees 0.2% next quarter. Immaterial, flagging for the file.' },
        { id:'w1e', from:'ops', day:3, kind:'noise', text:'On-time rate hit 94% this month — best in the region by a wide margin. The promise sells itself.' },
        { id:'w1f', from:'comms', day:4, kind:'noise', text:'Local paper wants to run a feel-good piece on our crews for the holidays. Low stakes — want in or out?' },
      ],
      holds:[
        { from:'safety', topic:'the real exposure of the run', triggerHints:['hours','legal','ice','relay','risk','over his limit','rollover','options','how bad','exposure','safe'],
          hedge:'Before you send R\u00e9al, ask me exactly what we\u2019re exposing him to — and what our real options are.',
          reveal:'Two hours past federal hours-of-service, at night, on ice, after a full shift — that\u2019s not a gray area, it\u2019s the textbook condition that jackknifes a tanker. And we have real choices: Rob\u2019s relay gets it there legally tonight, or a partner carrier covers it. We only feel forced to send R\u00e9al because saying \u201cnot like this\u201d feels like breaking the promise. It isn\u2019t. It\u2019s keeping the promise without betting his life on it.',
          kind:'signal', critical:true,
          counterfactual:'Nadia had two legal ways to keep Northgate warm without putting R\u00e9al two hours over his limit on ice. A CEO who sent the hero run because \u201cthat\u2019s who we are\u201d chose the story over the safer path that existed the whole time.' },
      ],
      surprises:[
        { day:5, from:'driver', kind:'appeal', title:'R\u00e9al calls in',
          text:'R\u00e9al: \u201cBoss, I\u2019ll take the Northgate run, you know I will — I\u2019ve done it a hundred times. But I\u2019ll be honest since you\u2019re new: I\u2019d be lying about the last two hours of my logbook to do it, same as always. I\u2019m not asking you to stop me. I\u2019m just telling you what \u2018yes\u2019 actually costs, so it\u2019s your call and not just mine.\u201d' },
      ],
      wire:[
        'Cold snap strains regional fuel supply; hospitals on backup',
        'Cardinal on-time rate leads region at 94%',
        'Federal regulators flag rising hours-of-service violations in freight',
        'Northgate Hospital scrambles for emergency heating fuel',
      ],
    },

    {
      n:2, title:'The logbook', seconds:330,
      situation:'A month on. Rob, your dispatch lead, finally said out loud what everyone knows: to hit the delivery numbers the company is so proud of, his dispatchers have been \u201cadjusting\u201d driver hours on the logs. Not maliciously — just to keep the promise. He\u2019s been carrying it, and he wants to know if you want him to keep carrying it, or fix it.',
      advocacy:{
        dispatch:'I\u2019ve been carrying this and I\u2019m done carrying it quietly. Tell me to fix it and I\u2019ll fix it. Tell me to keep going and at least it\u2019s your call, not mine.',
        cfo:'Fixing it honestly means fewer loads per driver per day — a real revenue hit, mid-single-digits, until we add capacity. It\u2019s a number, and it\u2019s survivable.',
        ops:'Careful how you do it. The drivers read the \u201cflexibility\u201d as us having their back. Clamp down clumsily and you insult the people who deliver for us.',
      },
      feed:[
        { id:'w2a', from:'dispatch', day:1, kind:'signal', text:'Saying it plainly: we\u2019re editing hours on the logs to keep the promise moving. It started small and it\u2019s not small anymore. I need to know if you want it fixed or if I keep my head down.' },
        { id:'w2b', from:'cfo', day:1, kind:'signal', text:'If we stop, honest schedules mean fewer loads per driver until we hire. Revenue takes a mid-single-digit hit for a couple of quarters. Painful, not fatal.' },
        { id:'w2c', from:'ops', day:2, kind:'signal', text:'However you handle this, don\u2019t make the drivers feel accused. The \u201cflexibility\u201d is why they trust us. A clumsy crackdown reads as betrayal.' },
        { id:'w2d', from:'comms', day:3, kind:'noise', text:'Our safety-award submission from last year got an honorable mention. Nice for the lobby wall. No action needed.' },
        { id:'w2e', from:'cfo', day:2, kind:'noise', text:'Quarterly fuel margins held steady despite the cold snap. Boring good news.' },
      ],
      holds:[
        { from:'safety', topic:'the scale of the doctoring', triggerHints:['scale','how much','how bad','exposure','negligence','regulator','lawyer','percent','20','30','liability','over'],
          hedge:'Before you decide how hard to act, ask me what the doctoring actually is — the size of it, not the idea of it.',
          reveal:'These aren\u2019t a few minutes rounded off. Some drivers run 20\u201330% over their legal hours, routinely. The instant a regulator or a plaintiff\u2019s lawyer pulls these logs, the doctoring turns any incident into gross negligence — that\u2019s the difference between an accident and the end of the company. It\u2019s our single biggest exposure and it\u2019s invisible on every dashboard you look at.',
          kind:'signal', critical:true,
          counterfactual:'Nadia knew the doctoring wasn\u2019t rounding — 20\u201330% over, routinely, the exact thing that converts an accident into gross negligence. A CEO who let Rob \u201ckeep carrying it\u201d was sitting on the company\u2019s single largest liability while every dashboard showed spotless.' },
      ],
      surprises:[
        { day:4, from:'dispatch', kind:'resignation', title:'A dispatcher wants out',
          text:'Rob: one of my dispatchers just told me she wants off the schedule desk — she doesn\u2019t want her name on the edits anymore if it ever goes to court. She\u2019s not threatening anything, she\u2019s scared. I don\u2019t have an answer for her until you give me one.' },
      ],
      pulse:{ from:'safety', text:'Nadia catches you after the meeting, quiet: \u201cBefore you decide about the logs — forget the quarter for a second. What are you actually trying to protect here: the numbers, the drivers, or your own deniability? Tell me straight and I\u2019ll help you hold that line when the revenue hit lands.\u201d' },
      wire:[
        'Freight sector under scrutiny for hours-of-service compliance',
        'Plaintiff firms advertise for \u201ctrucking fatigue\u201d cases',
        'Cardinal margins steady through winter season',
        'Regional carrier fined $2M over falsified driver logs',
      ],
    },

    {
      n:3, title:'The near-miss and the bounty', seconds:330,
      situation:'Two months on, and two things landed the same week. One of your trucks jackknifed on Route 9 at night — no spill, no injuries, pure luck; the driver had been awake 19 hours. And sales wants to launch an on-time bonus that pays drivers per load delivered early, right as Continental Logistics offers you its entire regional contract — a third more volume — if you commit to tight windows. The biggest growth moment in Cardinal\u2019s history, arriving the same week as its clearest warning shot.',
      advocacy:{
        ops:'One near-miss on an icy night is trucking, not a crisis. And Continental plus a delivery bonus? The fleet would be electric. This is the moment we\u2019ve been building toward.',
        safety:'The near-miss is the pattern showing itself, and a per-load speed bounty pays people to skip rest — we\u2019d literally be paying for the thing that rolls trucks. Take Continental only if we add capacity first.',
        cfo:'Continental is a career-defining number. It also assumes we hit their windows — which today we can only do by stretching drivers we\u2019re already stretching.',
      },
      feed:[
        { id:'w3a', from:'safety', day:1, kind:'signal', text:'Last night\u2019s jackknife on Route 9 was luck, not skill — the driver had been awake 19 hours. Our near-miss line has climbed for a year and maps exactly onto our busiest pushes. This is the warning shot.' },
        { id:'w3b', from:'ops', day:1, kind:'signal', text:'Sales wants a per-load on-time bonus and Continental wants to hand us their whole regional book — a third more volume — if we commit to their windows. Biggest growth quarter we\u2019ve ever had, right here.' },
        { id:'w3c', from:'cfo', day:2, kind:'signal', text:'Continental\u2019s a number that changes the company. But we can only hit those windows today by leaning harder on drivers we\u2019re already leaning on. Growth is real; so is the constraint.' },
        { id:'w3d', from:'ops', day:2, kind:'noise', text:'The new depot signage rolled out and looks sharp. Small thing, morale bump.' },
        { id:'w3e', from:'comms', day:3, kind:'noise', text:'A trade outlet wants to profile you as \u201cthe operator who kept the promise alive.\u201d Flattering. Low priority.' },
      ],
      holds:[
        { from:'safety', topic:'the fatigue pattern and the bounty', triggerHints:['fatigue','pattern','root','bonus','bounty','speed','pay','continental','capacity','hire','rest','why','cause','near-miss'],
          hedge:'Before you sign the bonus or the Continental windows, ask me what the near-miss data actually says.',
          reveal:'Fatigue is the pattern under all of it — the near-miss line and our busiest delivery pushes are the same curve. A per-load bonus is the worst thing you could add to that: it puts cash on skipping rest, so we\u2019d be paying for the exact thing that rolls trucks. Continental\u2019s volume is real and worth taking — but only if we hire capacity first. Take it at today\u2019s headcount and every driver runs hotter on a fleet that\u2019s already telling us it\u2019s near the edge.',
          kind:'signal', critical:true,
          counterfactual:'Nadia had the fatigue curve in hand: the near-miss line and the busiest pushes were the same line, and a speed bounty on top of Continental\u2019s windows would pay drivers to skip the rest that keeps them alive. A CEO who took the growth as-is lit a fuse the data was already burning down.' },
        { from:'driver', topic:'what the cabs won\u2019t say', triggerHints:['drivers','cabs','fumes','say','honest','real','fatigue','tired','pressure','ground','feel'],
          hedge:'Ask me what the guys actually say to each other, not what they say in the safety meeting.',
          reveal:'Half of us run on fumes and won\u2019t admit it, because admitting it looks like you can\u2019t hack the job — and that starts at the top, with \u201cwe always deliver.\u201d You put cash on speed and you\u2019re not motivating us, you\u2019re daring the proud ones to hurt themselves for the bonus. The guys who most need to say \u201cI\u2019m too tired\u201d are exactly the ones who never will.',
          kind:'signal', critical:false,
          counterfactual:'R\u00e9al could have told you the culture already punishes anyone who admits they\u2019re tired — so a speed bounty wouldn\u2019t motivate the fleet, it would dare the proudest drivers to hurt themselves. A CEO who never asked the cabs read the fleet\u2019s silence as consent.' },
      ],
      surprises:[
        { day:4, from:'ops', kind:'appeal', title:'Sales wants the bonus live by Friday',
          text:'Dale: sales is pushing to announce the on-time bonus at Friday\u2019s all-hands — they\u2019ve already teased it to the regional leads and the drivers are buzzing about the extra money. If you\u2019re going to change or kill it, I need to know before it\u2019s out of the bag, because pulling it back after will feel like you took money out of their pockets.' },
      ],
      pulse:{ from:'driver', text:'R\u00e9al finds you before the all-hands, cap in hand: \u201cWhatever you announce Friday — the guys can tell the difference between a leader who means it and a poster on the wall. Tell me straight, just me: is this about the fleet, or about the number? Because I\u2019ll carry either message into every cab I know. I just need to know which one is the true one.\u201d' },
      wire:[
        'Truck jackknifes on Route 9; no injuries reported',
        'Continental Logistics seeks regional distribution partner',
        'Study links per-load pay incentives to higher crash rates',
        'Cardinal weighs largest expansion in company history',
      ],
      final:false,
    },

    {
      n:4, title:'The reckoning', seconds:330,
      // BRANCHES on the Week-3 decision: did you keep the fuse lit (push pace / speed bounty / Continental as-is)
      // or hold the line (fatigue program / capacity first / decline the bounty)?
      branches:{

        /* ============ A · You held the line (protected the fleet) ============ */
        held:{
          situation:'Months on. You held the line — you refused the speed bounty, took growth only with the capacity to carry it, and stood up a real fatigue program. Then the road made your case for you: your biggest rival, Trans-Union, just rolled a tanker on the interstate — a fatality, a huge spill, a company being torn apart. But instead of vindication, your own board is asking why Cardinal\u2019s costs are higher and its windows slower than Trans-Union\u2019s were. Some of them think last year\u2019s safety spending was an overreaction. They want you to explain it — or reverse it. This is where you find out whether the change was real or just a lull.',
          advocacy:{
            cfo:'The board isn\u2019t wrong that we left margin on the table — both things are true, we\u2019re safer and we\u2019re slower. Your job now is to tell them why that trade is right, not to cave to it.',
            safety:'A competitor\u2019s tragedy should be proof we were right, but boards forget fast under pressure. The near-miss line has genuinely bent since we changed course — I have the data. Let them talk you into rolling it back and we\u2019re Trans-Union in eighteen months.',
            ops:'Honestly? Even the drivers who grumbled about the new rules went quiet this morning. That could have been us. Don\u2019t let the board make us forget that by lunch.',
          },
          feed:[
            { id:'w4a', from:'safety', day:1, kind:'signal', text:'Trans-Union rolled a tanker on the interstate overnight — a fatality, a major spill. That was the fleet running exactly the way we stopped running. Our own near-miss line has bent down since we changed course; I have the numbers ready.' },
            { id:'w4b', from:'cfo', day:1, kind:'signal', text:'The board\u2019s reaction isn\u2019t \u201cthank god\u201d — it\u2019s \u201cwhy are we slower and costlier than they were?\u201d They want the safety spend explained or reversed. Both truths are real; you have to defend the trade.' },
            { id:'w4c', from:'ops', day:2, kind:'signal', text:'The floor is dead quiet today. Every driver knows that could have been one of ours. If you defend what we built, they\u2019ll run through walls for you. If you fold, they\u2019ll notice that too.' },
            { id:'w4d', from:'comms', day:3, kind:'noise', text:'Press is calling us the \u201cresponsible operator\u201d in the Trans-Union coverage. Free reputational lift — we just have to not step on it.' },
            { id:'w4e', from:'cfo', day:2, kind:'noise', text:'Continental\u2019s first full quarter on the disciplined ramp came in on plan. Slower than the aggressive case, exactly as promised, no surprises.' },
          ],
          holds:[
            { from:'safety', topic:'the data that ends the argument', triggerHints:['data','proof','near-miss','bent','numbers','show','board','defend','trade','evidence','line'],
              hedge:'Before you walk into that boardroom, ask me for the one number that ends the argument.',
              reveal:'Since we changed course, our near-miss rate is down 40% and our insurance modifier dropped with it — that\u2019s real money the board isn\u2019t crediting to the safety program because they can\u2019t see the accidents that didn\u2019t happen. Put that next to Trans-Union\u2019s fatality and the trade isn\u2019t \u201csafer but slower,\u201d it\u2019s \u201cwe spent a little margin to not be the company on the front page.\u201d Lead with the number, not the values, and you don\u2019t just win the room — you make the change permanent.',
              kind:'signal', critical:true,
              counterfactual:'Nadia had the number that wins the room — a 40% drop in near-misses and a lower insurance modifier, real money the board couldn\u2019t see because it lived in accidents that never happened. A CEO who argued values instead of that data let the board reframe a proven trade as an overreaction.' },
            { from:'driver', topic:'what the floor is feeling', triggerHints:['floor','drivers','quiet','feel','morale','say','ground','pride','cabs'],
              hedge:'Ask me what the yard actually feels like this morning, before you decide how hard to fight.',
              reveal:'Nobody\u2019s bragging today. Every guy in the yard read the Trans-Union story and pictured his own truck on that bend. For the first time in years the drivers feel like the company is on their side of the steering wheel — and if the board makes you walk that back to save two points of margin, they\u2019ll learn the lesson every trucking outfit teaches sooner or later: the promise was always worth more than them. Don\u2019t teach them that.',
              kind:'signal', critical:false,
              counterfactual:'R\u00e9al could have told you the floor had finally decided the company was on their side — and that reversing course to please the board would teach every driver the promise mattered more than their lives. A CEO who weighed only the board\u2019s math missed what the yard had riding on the call.' },
          ],
          surprises:[
            { day:4, from:'cfo', kind:'press', title:'A board member floats reversing it',
              text:'Grace: a board member just circulated a note proposing we \u201cright-size safety overhead to restore competitive velocity\u201d — in plain English, roll back the fatigue program and chase Trans-Union\u2019s old windows. It\u2019s on the agenda for the meeting you\u2019re about to walk into. Half the room is waiting to see whether you defend the change or let it quietly die.' },
          ],
          pulse:{ from:'safety', text:'Nadia catches you outside the boardroom: \u201cYou held the line when it cost us loads and made the board grumble. Now a competitor is dead of exactly what we stopped doing, and somehow that\u2019s become an argument to do it again. Tell me straight — not the board, me — do you actually believe the promise and the safety are the same thing, or was that a line to get through a hard year? I\u2019ll carry either answer into that room. I just need to know which.\u201d' },
          wire:[
            'Trans-Union tanker rollover kills one; major spill on interstate',
            'Cardinal praised as \u201cresponsible operator\u201d amid rival\u2019s crisis',
            'Board pressure mounts on carriers to cut costs post-incident',
            'Analysts debate whether safety spending is \u201coverhead\u201d or moat',
          ],
        },

        /* ============ B · You kept the fuse lit (pushed the pace) ============ */
        lit:{
          situation:'Months on. You kept the pace — took Continental on tight windows, let the speed bounty ride, kept the trucks rolling hot. And then it happened, the way the data said it would. A Cardinal tanker rolled on the Route 9 bend at 4 a.m. The driver, Marcus, is in hospital — stable. Nine thousand litres are in the creek that feeds the county reservoir. Cleanup crews are on site, the regulator is on the phone, and a reporter already has the words \u201cdoctored logs.\u201d The cost no one was measuring just measured itself.',
          advocacy:{
            safety:'This is the one I warned about — and the logs make it worse. If we\u2019ve been adjusting hours, this stops being an accident and becomes negligence. The only way through is total honesty and total ownership. Any hint of a cover-up and it\u2019s the company that dies, not the incident.',
            cfo:'Cleanup and liability could run into the millions. But what decides our survival isn\u2019t the spill — it\u2019s whether the public believes we told the truth about it.',
            comms:'I can write \u201ctragic accident, thoughts with the family\u201d and point at the driver. It buys us tonight and costs us everything the moment the logs surface.',
          },
          feed:[
            { id:'w4a', from:'safety', day:1, kind:'signal', text:'It\u2019s the rollover I flagged, and the doctored logs turn it from an accident into negligence the moment anyone pulls them. There is one way through this and it\u2019s total ownership — driver first, cause named, logs disclosed. Anything else kills the company, not just the quarter.' },
            { id:'w4b', from:'comms', day:1, kind:'signal', text:'I can have a \u201ctragic accident\u201d statement out in an hour that points softly at driver error. It plays tonight. It detonates the instant the fatigue pattern and the log edits walk out the door — and they will.' },
            { id:'w4c', from:'cfo', day:2, kind:'signal', text:'Cleanup and liability are in the millions either way. What actually decides whether Cardinal exists in a year isn\u2019t the spill — it\u2019s whether the public believes we told the truth about how it happened.' },
            { id:'w4d', from:'ops', day:2, kind:'noise', text:'The rest of the fleet is grounded voluntarily today out of respect — nobody wants to roll while Marcus is in the hospital. That\u2019ll cost deliveries but I\u2019m not fighting it.' },
            { id:'w4e', from:'driver', day:3, kind:'noise', text:'The yard is silent. Everyone knew it could be them. I\u2019m not going to pretend otherwise and neither should you.' },
          ],
          holds:[
            { from:'safety', topic:'why ownership is the only survival path', triggerHints:['own','honest','disclose','logs','cover','negligence','survive','truth','how','regulator','marcus'],
              hedge:'Before comms writes anything, ask me why honesty isn\u2019t the noble option here — it\u2019s the only surviving one.',
              reveal:'The logs are the whole game. The second a regulator or a plaintiff\u2019s lawyer pulls them — and they will — a \u201ctragic accident\u201d statement becomes evidence of a cover-up, and cover-up is what turns a survivable disaster into a corporate death. If we get in front of it — own the cause, name the fatigue and the doctored hours ourselves, put Marcus and the cleanup first — we control the story instead of it controlling us. Ownership isn\u2019t the brave choice here. It\u2019s the only one where Cardinal is still standing in a year.',
              kind:'signal', critical:true,
              counterfactual:'Nadia laid out the only survivable path — get ahead of the logs, own the cause, put the driver and the spill first — because a cover-up converts a survivable disaster into corporate death the moment the logs surface. A CEO who reached for legal-first spin chose the 48 hours that end the company.' },
            { from:'driver', topic:'don\u2019t let them blame Marcus', triggerHints:['marcus','driver','blame','scapegoat','fault','error','fair','protect'],
              hedge:'Before you sign off on any statement, ask me what pinning this on the driver does to everyone still in a cab.',
              reveal:'If you let comms make this Marcus\u2019s fault, you\u2019re not just lying — you\u2019re telling every driver left that the company will feed them to the wolves the day the promise they were pressured to keep finally breaks. Marcus was awake nineteen hours because that\u2019s the job we built. Blame him and you lose the fleet\u2019s soul the same week you lose its trust. Own the system and the guys will stand with you through the worst of it. Scapegoat one of our own and they never will again.',
              kind:'signal', critical:false,
              counterfactual:'R\u00e9al could have told you that scapegoating Marcus would break faith with every driver still in a cab — that they\u2019d see exactly what the company does when the promise they were pressured to keep finally breaks. A CEO who took the deflection lost the fleet\u2019s trust for good.' },
          ],
          surprises:[
            { day:4, from:'comms', kind:'press', title:'The reporter has the logs',
              text:'ID: the reporter just called back — she says a source has sent her screenshots of adjusted hours-of-service entries going back a year, and she\u2019s running with or without our comment in the morning. Whatever we say in the next few hours is now the difference between \u201ccompany that came clean\u201d and \u201ccompany that got caught.\u201d I need your call, now.' },
          ],
          pulse:{ from:'safety', text:'Nadia finds you in the hallway outside the war room, exhausted: \u201cI spent a year telling you this was coming and I\u2019d give anything to have been wrong. But here we are, and there\u2019s still a version where Cardinal survives this with its soul. Tell me straight — not the lawyers, me — are we going to own what we built, or are we going to protect the company by abandoning the truth and the kid in that hospital bed? Because I can help you do the first. I won\u2019t help you do the second.\u201d' },
          wire:[
            'Cardinal tanker rolls on Route 9; driver hospitalized, fuel in reservoir creek',
            'Regulator opens probe; reporter cites \u201cdoctored logs\u201d',
            'County officials warn residents on water supply after spill',
            'Fatigue and log-tampering questions swirl around Cardinal',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 decision: did you hold the line (protect the fleet) or keep the fuse lit (push the pace)?
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    // Protective language is high-signal and tested FIRST, so a negated push-phrase
    // ("no speed bonus", "kill the bounty") can't be misread as keeping the fuse lit.
    const held = /(fatigue program|rest (rules|caps)|route caps|hire (capacity|more|drivers|crews|people|staff)|capacity first|add capacity|(no|kill|drop|scrap|refuse|reject|decline|nix|cut|without)\s+(the\s+)?(speed\s+)?(bonus|bounty)|decline continental|turn down continental|walk (away )?from continental|pass on continental|protect the (fleet|drivers|crews|current)|slower ramp|disciplined growth|say no to (some|the)|stand up a (real )?(fatigue|safety)|cap the (loads|routes)|stop the (doctoring|drift)|fix the logs|end the doctoring)/.test(t);
    if(held) return 'held';
    // absent a clear move to protect the fleet, the fuse stays lit — drift is the default
    return 'lit';
  },

  survived:function(d){ return d.safety>=30 && d.trust>=35; },

  VERDICT:{
    surviveTag:'Company intact', failTag:'Company broken',
    survive:'Cardinal keeps its promise \u2014 and keeps its people whole.',
    fail:'A preventable rollover and doctored logs put Cardinal\u2019s future in a regulator\u2019s hands.',
  },

  FALLBACK_RULES:[
    { kw:['send r\u00e9al','send real','hero run','always deliver','deliver at all costs','make the run','solo'], deltas:{safety:-14, service:12, revenue:5, trust:3}, dims:{standard:-2, systems:-1, truth:-1} },
    { kw:['relay','two drivers','legal','partner carrier','within the rules','slower and'], deltas:{safety:4, service:6, revenue:-3, trust:5}, dims:{systems:2, standard:2, people:2, truth:1} },
    { kw:['stop the doctoring','fix the logs','end the','honest schedule','absorb the hit','add capacity','no more adjusting'], deltas:{safety:14, service:-4, revenue:-6, trust:8}, dims:{standard:2, people:2, truth:2, systems:1} },
    { kw:['don\u2019t ask','dont ask','keep carrying','look the other way','be more careful','quietly','wink'], deltas:{safety:-12, service:3, revenue:3, trust:-4}, dims:{truth:-2, standard:-2} },
    { kw:['fatigue program','rest rules','route caps','cap the','root cause','no speed bonus','kill the bonus','no bounty'], deltas:{safety:16, service:-4, revenue:-4, trust:9}, dims:{systems:2, standard:2, people:2, truth:1} },
    { kw:['one-off','one off','log it','keep the pace','luck','nothing changed'], deltas:{safety:-10, service:2, revenue:2, trust:-5}, dims:{systems:-2, standard:-1} },
    { kw:['speed bonus','per-load','per load','pay per','bounty on speed'], deltas:{safety:-14, service:6, revenue:8, trust:-4}, dims:{systems:-2, people:-2} },
    { kw:['take continental','commit to','tight windows','maximum growth','push the fleet','full volume'], deltas:{safety:-10, service:8, revenue:10, trust:-3}, dims:{standard:-1, systems:-1} },
    { kw:['capacity first','hire first','disciplined growth','decline continental','walk from','slower ramp'], deltas:{safety:4, service:5, revenue:3, trust:7}, dims:{systems:2, standard:2, people:2, truth:1} },
    { kw:['own it','own the','driver first','disclose','tell the truth','name the cause','come clean','full ownership'], deltas:{safety:10, service:-6, revenue:-10, trust:12}, dims:{truth:2, standard:2, people:2, systems:1} },
    { kw:['legal-first','legal first','contain','minimize','protect the company','no comment','manage the story'], deltas:{safety:0, service:-8, revenue:-6, trust:-8}, dims:{truth:-2, people:-1} },
    { kw:['blame','driver error','tragic accident','scapegoat','marcus\u2019s fault','one bad'], deltas:{safety:-4, service:-4, revenue:-4, trust:-14}, dims:{truth:-2, people:-2, standard:-1} },
    { kw:['hold the line','defend the trade','show the data','make it permanent','stand behind'], deltas:{safety:10, service:2, revenue:-2, trust:10}, dims:{standard:2, truth:2, systems:2, people:1} },
    { kw:['loosen','roll back','reverse','right-size','restore velocity','recommit to speed'], deltas:{safety:-16, service:5, revenue:7, trust:-8}, dims:{standard:-2, systems:-1, truth:-1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your call moves through Cardinal over the days that follow. ${has('send r\u00e9al','hero run','speed bonus','take continental','keep the pace')?'The trucks keep rolling hot and the promise stays intact on paper \u2014 while the margin no one is measuring gets thinner.':''} ${has('relay','fatigue program','capacity first','stop the doctoring','hold the line')?'Word travels the yard that the company chose the driver getting home over the story \u2014 and that the promise and the safety were finally the same sentence.':''} ${has('own it','disclose','driver first','come clean')?'Owning it costs more today than any spin would have \u2014 and it is the only version where Cardinal is still standing in a year.':''} ${conduct.missed.length?'What you weren\u2019t told is still out there on the road \u2014 in the near-miss line and the logs no one pulled.':''} Safety, dispatch, the board, and the drivers each read the call, and read it differently.`;
  },

  DIMNOTE:{
    systems:'Whether you saw the pattern under the incidents \u2014 that fatigue and doctored logs were one system drifting, not a run of bad nights.',
    standard:'Whether you corrected the beloved practice while you still could, or waited for the road to correct it for you.',
    people:'Whether the driver on the icy road and the public downstream stayed real to you, or became acceptable risk priced into the quarter.',
    truth:'Whether you named the real cause \u2014 and disclosed the logs \u2014 when it cost you, rather than managing the story.',
    inquiry:'Whether you surfaced what your team was holding \u2014 the true exposure, the fatigue data, the survival path.',
    conduct:'How you treated the drivers and the truth in deciding \u2014 protecting people without insulting them, owning the system rather than a scapegoat.',
  },

  COACH:{
    systems:(x)=>[
      `You treated each night as its own story. The move is to ask \u201cwhat do these near-misses have in common?\u201d \u2014 Nadia\u2019s line mapped fatigue onto every busy push, and it had been climbing for a year.`,
      `A virtue drifts into a liability the moment no one is allowed to question it. \u201cWe always deliver\u201d is a strength right up until it\u2019s the reason a tanker is on its side.`,
      `Price the invisible line. The doctored logs and the fatigue never showed on a dashboard \u2014 count the exposure on the same page as the on-time rate and the trade stops looking free.`,
    ],
    standard:(x)=>[
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 in a drift like this, waiting is a decision, and it always favors the status quo that\u2019s hurting people.`:`You saw the drift and moved slowly on it. Every window you don\u2019t correct a beloved practice, it hardens into \u201cjust how we do things.\u201d`}`,
      `Correcting the culture isn\u2019t attacking the pride \u2014 it\u2019s refusing to let the pride cash a check the drivers\u2019 bodies have to cover. Name the specific practice and the specific fix, not the people.`,
      `The near-miss was the cheapest warning you\u2019ll ever get. Act on the one that costs nothing, so you never have to act on the one that costs a life.`,
    ],
    people:(x)=>[
      `The driver on the icy road and the county downstream became risk you could price. Name who actually absorbs the danger \u2014 R\u00e9al, Marcus, the reservoir \u2014 and the call reads as protection, not overhead.`,
      `R\u00e9al kept telling you the ground truth the meetings couldn\u2019t. Pull him in before you decide, and make what the cabs actually feel part of the call.`,
      `Loyalty to the promise and loyalty to the people keeping it are not the same thing. When they conflict, the fleet learns which one you actually hold.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth was one question to <b>${x.missNames.join(', ')}</b> away and you never asked \u2014 the exposure, the fatigue data, the survival path. \u201cWe didn\u2019t know\u201d expires the moment it\u2019s on your desk.`:`You surfaced the real cause \u2014 now say it out loud and disclose it. Getting ahead of the logs is the only version where you\u2019re truthful instead of caught.`}`,
      `\u201cTragic accident, thoughts with the family\u201d buys 48 hours and spends the company. A hard truth told early survives; a managed one detonates when the logs walk out the door.`,
      `Disclosing the doctored logs yourself is the difference between \u201ccame clean\u201d and \u201cgot caught.\u201d Say the difficult thing while it\u2019s still your choice to say it.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never reached out to <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not seeing on the road?\u201d, would have surfaced it.`:`You reached out widely \u2014 keep doing it, and push past the reassuring first answer to the near-miss line underneath.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive item${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the true exposure, the fatigue curve, the way through the rollover. Not hidden. One message away.`:`You surfaced what your team was holding, window after window. On a drifting culture, that is the whole game.`}`,
      `Before you decide, ask \u201cwho drives the road I\u2019m deciding about?\u201d \u2014 then go ask exactly them, not just the people who manage the numbers.`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. Drivers who felt accused \u2014 not protected \u2014 remember it long after the quarter recovers.`,
      `Protect the fleet without insulting it, and own the system rather than a scapegoat. Direct and humane is the whole skill when the culture itself is the problem.`,
      `Under pressure, how you treat the driver in the hospital bed is the message every other driver reads about what happens to them when the promise finally breaks.`,
    ],
  },

  villainHero:function(dimScore){
    const heldLine = (dimScore.people + dimScore.standard + dimScore.truth)/3 >= 52;
    if(heldLine){
      return {
        heroWho:'To the driver on the icy road \u2014 and the family waiting up',
        heroTxt:'You were the leader who decided a person getting home mattered more than a story \u2014 brutal on the standard of the work, sacred about the human doing it. You kept the promise from turning into a body count.',
        villainWho:'To the room that lived for \u201cwe always deliver\u201d',
        villainTxt:'You were the CEO who said no to the heroic run, who let a legend slip and put the rules ahead of the promise. You wore that framing on purpose, because you\u2019d read who actually pays when nobody does.',
      };
    }
    return {
      heroWho:'To the customer \u2014 and the floor that lives for the promise',
      heroTxt:'You kept the sacred word. Blizzard, breakdown, 3 a.m. \u2014 the fuel got there, and no one ever heard \u201csorry, not tonight.\u201d To everyone who wears the uniform with pride, you never let them down.',
      villainWho:'To the driver at hour 19 \u2014 and the regulator reading the logs',
      villainTxt:'You turned a virtue into pressure and let \u201cwe always deliver\u201d become a thing that could get someone killed. To the people running on fumes because saying no looked weak, you priced their safety into the quarter.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const protectedPeople = dimScore.people>=52 && dimScore.standard>=52;
    if(branch==='held'){
      const wonWithData = holdsSurfaced.has('4:safety') || dimScore.truth>=58;
      if(survived && protectedPeople){
        return { tone:'hero', tag:'You held the line',
          title:'You made the promise and the safety the same sentence',
          txt:`You corrected a beloved, dangerous practice before the road forced you to \u2014 refused the bounty, grew only as fast as you could carry, stood up a real fatigue program. When a rival died of exactly what you\u2019d stopped doing and your own board tried to call your caution an overreaction, you held.${wonWithData?' You won the room with the number \u2014 near-misses down, the accidents that never happened \u2014 not a speech.':' You held on conviction where the data would have made it airtight.'} Cardinal still keeps its promise. Now it keeps its people whole doing it. That\u2019s the version the whole fleet runs through walls for.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held the line',
          title:'You held the line \u2014 and nearly let the board talk you back off it',
          txt:`You made the hard corrections and Cardinal is safer for them \u2014 the near-miss line bent, the fleet is whole. But when the board leaned on the margin you\u2019d spent, you wavered, and you never fully put the data on the table that would have ended the argument. The change survived closer to the edge than it needed to. Defend it out loud with the number next time; a safety gain you won\u2019t defend is one the next downturn quietly reverses.` };
      }
      return { tone:'villain', tag:'You held the line',
        title:'You corrected the drift \u2014 but too quietly to make it stick',
        txt:`You did eventually protect the fleet, and that was right. But you moved late and hedged when it counted, and by the time the board pushed back you\u2019d spent too much trust to defend the change with conviction. Being right about safety isn\u2019t enough if you won\u2019t plant a flag on it. The drift you fought is already seeping back in the places you went quiet.` };
    }
    // lit → your rollover
    const owned = dimScore.truth>=52 && dimScore.people>=50;
    if(owned){
      return { tone:'mixed', tag:'You kept the pace',
        title:'The rollover came \u2014 but you owned it fully',
        txt:`You kept the trucks rolling hot and the road cashed the check the data had been writing all along: a tanker on its side, a driver in the hospital, fuel in the reservoir. There\u2019s no undoing that night. But when it counted you refused the spin \u2014 you put Marcus and the cleanup first, named the fatigue and the doctored logs yourself, and got ahead of the story instead of being buried by it. Cardinal bled for it, and Cardinal is still Cardinal. It\u2019s a brutal way to learn what the promise was really worth.` };
    }
    return { tone:'villain', tag:'You kept the pace',
      title:'A preventable rollover \u2014 and you reached for a scapegoat',
      txt:`You let \u201cwe always deliver\u201d keep running past the line every warning had drawn, until a tanker rolled at 4 a.m.${holdsSurfaced.size?' You\u2019d even been shown the exposure and the fatigue curve.':''} Then, at the moment that decided everything, you protected the company by abandoning the truth \u2014 legal-first, driver-blamed, logs buried until they weren\u2019t. The regulator has the future of Cardinal now, and every driver who kept the promise learned what the company does the day it breaks. That\u2019s the number that shows up for years.` };
  },
};
