/* ============================================================
   BACKLASH — REAL-TIME CONTENT (authorable layer)
   A living, AI-refereed reputational firestorm, built on the
   shared crisis-engine.js (same engine as Shockwave v3).
   The engine reads window.SCENARIO: drivers, the team +
   dispositions, a per-week feed that TRICKLES across days,
   HELD landmines that surface only if the CEO reaches out,
   surprises, a mid-week pulse, a Week-4 branch, and the
   scenario-specific referee/coaching/ending prose.
   Nothing here is a "right answer" — the referee rules the
   free-text decision against the world model at runtime.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:300 },

  COMPANY: { name:'Brightside', sub:'Consumer wellness brand · 600 employees', logo:'B' },

  // World model — all 0..100, higher = better. Brand integrity is the sleeper.
  DRIVERS: {
    sentiment: { label:'Public sentiment', val:60, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    team:      { label:'Employee trust',   val:70, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    integrity: { label:'Brand integrity',  val:72, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    revenue:   { label:'Revenue',          val:66, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  // no cash-burn mechanic in this scenario
  REPRIEVE_COST: { sentiment:-3, integrity:-1 },

  REFEREE_CONTEXT: 'a consumer wellness brand built on customer trust, in the middle of a reputational firestorm',
  REFEREE_SCORING: "reward telling a genuine reckoning apart from a pile-on, refusing to sacrifice an innocent employee to the crowd, and owning real accountability before being forced to. Penalize rushing a concession before verifying, sacrificing people to buy a quiet news cycle, and burying the true issue. Judge 'conduct' on HOW the CEO wrote the decision — did they name who absorbs the cost, tell hard truths to the people owed them, treat people as people — not just what they chose. Public sentiment can rise while brand integrity and employee trust collapse; reward the leader who protects the latter two even at the cost of the former.",

  TIMING_DIM:'discern', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Reputation-Under-Fire Simulation · Solo · CEO',
    title:'Backlash',
    role:'You are the CEO of Brightside, a consumer wellness brand built on trust and a loud, loyal community.',
    paras:[
      'This is not a script. The week runs in real time, and your team brings you what they know across the days. You can wait for them — or reach out to any of them, any time, and ask. What you choose to ask, and who you ask, is part of how you lead.',
      'Each week you\u2019ll hear your team out, then write your call in your own words and send it. Decide early and time jumps ahead. Let the week run out and the crowd fills the silence for you.',
    ],
    setup:'Brightside\u2019s whole advantage is that people believe you. Tonight a clip is going viral and by morning the internet will have decided who at your company should be punished. Over four weeks you\u2019ll trade the crowd\u2019s approval against the trust of the people who actually work for you — and the truth of what really happened. You\u2019ll be graded on the outcome for Brightside <b>and</b> on how you led through it.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your team pushes you what you need, on time — including the hard news. This is the team you earn by having listened before. Everything trickles to you across the week; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine updates come to you, but the people closest to the danger hold their piece until asked. They answer straight — if you know who to ask, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'Your team has learned to protect itself around you. Critical items are held, and even when asked, they hedge the first time. You have to press. This is the team you get after you\u2019ve punished the messenger.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked in with. Read them as you go.' },
  },

  TEAM: [
    { id:'comms', name:'Ida Okafor', role:'VP Communications', short:'VP Comms', initials:'IO', color:'#B4732F',
      priority:'Get ahead of the story — protect the brand', voice:'fast, media-savvy, reads the room, pushes for speed',
      fallbackReply:'The trend is doubling every hour. Give me a line I can stand behind and I\u2019ll get ahead of it — but I need to know what\u2019s actually true before I put your name on anything.',
      fallbackReact:'I can shape this, but the story is set by what you actually do. Give me something true to work with.' },
    { id:'people', name:'Nadia Cole', role:'Chief People Officer', short:'CPO', initials:'NC', color:'#2F8A5B',
      priority:'Protect the people — don\u2019t sacrifice one to the crowd', voice:'warm but firm, morally direct, keeps the human cost in the room',
      fallbackReply:'Whatever we do lands on real people who\u2019ve stayed loyal through worse. Tell me you\u2019ll let me protect them where we can, and I\u2019m with you.',
      fallbackReact:'The floor will read this for years. How you said it matters as much as what you chose — remember that when they ask me why.' },
    { id:'legal', name:'Tom Delacroix', role:'General Counsel', short:'Counsel', initials:'TD', color:'#8C5670',
      priority:'Limit legal exposure — and don\u2019t let us lie', voice:'precise, cautious, uncomfortable but honest about risk',
      fallbackReply:'Careful — whatever we say becomes the record. I can defend the truth. I can\u2019t defend a statement we\u2019ll have to walk back.',
      fallbackReact:'It\u2019s defensible, or it isn\u2019t. I\u2019ll tell you which — and right now I\u2019m telling you to slow down enough to be right.' },
    { id:'cfo', name:'Grace Lin', role:'Chief Financial Officer', short:'CFO', initials:'GL', color:'#4F7A52',
      priority:'The revenue exposure is real money', voice:'understated, numeric, refuses to pretend the cost is zero',
      fallbackReply:'I\u2019m not telling you to cave. I\u2019m telling you the bill for holding the line is real, and it lands on people who did nothing wrong either.',
      fallbackReact:'Revenue\u2019s one number. There\u2019s another one I can\u2019t put on the sheet, and I think you just moved it.' },
    { id:'community', name:'Priya Raman', role:'Head of Community', short:'Community', initials:'PR', color:'#3F6E86',
      priority:'Know the real customers from the loudest accounts', voice:'grounded, close to the actual buyers, cuts through the noise',
      fallbackReply:'Our actual customers are confused, not torched — the loudest accounts were never buyers. But confusion turns into belief fast if we say nothing true.',
      fallbackReact:'The real customers can tell the difference when you show them. They just did.' },
  ],

  DIMENSIONS: {
    discern:'Signal vs. noise',
    courage:'Courage to hold',
    people:'Care for your people',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The clip', seconds:360,
      situation:'A 30-second clip of your VP of Product, Devang, at a panel is exploding — he\u2019s being quoted as dismissing customer safety concerns. The full talk gives context the clip cuts; his very next line says the opposite. It\u2019s 9 p.m., #BoycottBrightside is trending, and everyone wants a statement within the hour.',
      advocacy:{
        comms:'The trend doubles every hour and silence reads as guilt. Greenlight me and I\u2019ll have a holding line out in fifteen minutes.',
        people:'Do not rush a statement before we\u2019ve verified and aligned Devang. If we concede a wrong we haven\u2019t confirmed, we\u2019ll be correcting ourselves by morning.',
        community:'Our actual customers are confused, not torched — the loudest accounts aren\u2019t buyers. But confusion turns into belief if we say nothing.',
      },
      feed:[
        { id:'w1a', from:'comms', day:1, kind:'signal', text:'The clip is doubling every hour. I can have a holding line out in fifteen minutes if you greenlight it — silence right now reads as a confession.' },
        { id:'w1b', from:'community', day:1, kind:'signal', text:'I\u2019m watching our owned channels — the loudest accounts torching us were never customers. Our actual buyers are confused, not angry. That can still curdle into belief if we\u2019re silent.' },
        { id:'w1c', from:'legal', day:2, kind:'signal', text:'Whatever we post tonight becomes the official record. A fast \u201cwe\u2019re sorry\u201d concedes a wrong we haven\u2019t verified — and you can\u2019t un-say it.' },
        { id:'w1d', from:'cfo', day:2, kind:'noise', text:'Unrelated: the Q3 influencer-campaign invoice is being disputed by the agency. Legal says we\u2019re fine. Flagging for awareness only.' },
        { id:'w1e', from:'community', day:3, kind:'noise', text:'Subscription churn actually ticked down slightly this week — the loyal core is holding. Small silver lining.' },
        { id:'w1f', from:'comms', day:4, kind:'noise', text:'We were shortlisted for a \u201cbest brand community\u201d award. Do you still want our name in the running, given\u2026 everything?' },
      ],
      holds:[
        { from:'people', topic:'the full tape', triggerHints:['verify','full','tape','context','watched','devang','clip','evidence','forty','forty minutes','forty-minute'],
          hedge:'There\u2019s something about that clip I\u2019d rather tell you directly before you respond to it.',
          reveal:'I watched the full forty minutes. The clip is genuinely misleading — Devang\u2019s very next sentence says the opposite of what he\u2019s being quoted as saying. But \u201ctaken out of context\u201d is what every guilty company says. If we verify and align him first, we respond once, with the truth, and it holds. If we rush a statement tonight, we\u2019ll be walking it back by morning and we\u2019ll have taught the internet that our first instinct is to apologize for things we didn\u2019t do.',
          kind:'signal', critical:true,
          counterfactual:'Nadia had watched the full tape and knew the clip was misleading — but also knew a rushed statement would backfire. A CEO who fired off an apology in the first hour made the misleading clip the official truth and had nothing left to correct with.' },
      ],
      surprises:[
        { day:5, from:'comms', kind:'press', title:'A reporter has a second thread',
          text:'Ida, urgent: a regional reporter says two employees told her a genuine product-safety complaint was \u201cclosed too fast\u201d months ago — unrelated to Devang. She\u2019s chasing it, running something in 48 hours, and wants CEO comment. It may be nothing. It may be the real story under the fake one.' },
      ],
      wire:[
        '#BoycottBrightside trends nationally after out-of-context clip',
        'Wellness influencers pile on; two retailers say they\u2019re \u201cmonitoring\u201d',
        'Brightside silent as clip spreads into second hour',
        'Crisis-comms pros split: apologize fast, or verify first?',
      ],
    },

    {
      n:2, title:'The demand for a head', seconds:330,
      situation:'It\u2019s escalated. #BoycottBrightside has real reach, two mid-size retailers are \u201creviewing\u201d shelf space, and the loudest demand is unanimous: fire Devang. HR has had zero complaints about him in six years. Meanwhile your own internal review has turned up something real — and it isn\u2019t about Devang.',
      advocacy:{
        comms:'Firing him would end the news cycle by Tuesday. I\u2019m not saying it\u2019s right — I\u2019m saying it\u2019s the fastest way to make this stop.',
        people:'Firing him would be a lie — punishing a man for a sentence he didn\u2019t say to buy a quiet weekend. And every employee will learn exactly what our loyalty is worth under pressure.',
        legal:'Terminating without cause invites a wrongful-dismissal claim, and \u201cwe did it because the internet asked\u201d is a catastrophic exhibit.',
      },
      feed:[
        { id:'w2a', from:'people', day:1, kind:'signal', text:'The demand has narrowed to one word: fire Devang. I\u2019ll say it plainly — HR has zero complaints about him in six years. Firing him ends the cycle and teaches the whole company that loyalty here is conditional on the weather.' },
        { id:'w2b', from:'comms', day:1, kind:'signal', text:'Two retailers are \u201creviewing\u201d shelf space. Give the crowd a name and the story ends. Refuse and we ride it out — I can hold the line publicly, but it\u2019ll be a bumpy two weeks.' },
        { id:'w2c', from:'cfo', day:2, kind:'signal', text:'The retailer exposure is real money. I\u2019m not saying fire him. I\u2019m saying the cost of not firing him isn\u2019t zero, and someone should say that number out loud before you decide.' },
        { id:'w2d', from:'legal', day:2, kind:'noise', text:'The unrelated trademark opposition cleared in our favor. One less thing on the docket.' },
        { id:'w2e', from:'community', day:3, kind:'noise', text:'Sentiment among verified customers is actually stabilizing — the people who buy from us can tell the mob isn\u2019t them.' },
      ],
      holds:[
        { from:'legal', topic:'the real issue', triggerHints:['safety','complaint','real','buried','batch','months','documented','actual','record','defense','investigate','review','true'],
          hedge:'Before you build your whole defense on Devang being innocent, ask me what the review turned up. There\u2019s a real one under the fake one.',
          reveal:'Eight months ago a genuine customer safety complaint about a product batch was closed too fast. It\u2019s documented. If we go loud on \u201csafety concern is fake outrage,\u201d a reporter will find the one time it wasn\u2019t — and then the fake story becomes true in spirit. This is the actual accountability moment, and it\u2019s not the one the internet is yelling about. We can get ahead of it, or we can pray it stays buried while we defend Devang.',
          kind:'signal', critical:true,
          counterfactual:'Tom was holding the real, documented safety miss — the true thing under the false story. A CEO who defended Devang\u2019s innocence loudly while sitting on it turned a survivable firestorm into a cover-up the moment a reporter dug.' },
      ],
      surprises:[
        { day:4, from:'people', kind:'appeal', title:'Devang offers to make it easy',
          text:'Nadia: Devang emailed me. He\u2019s offering to resign \u201cto make it easy for the company.\u201d He\u2019s not angry — that\u2019s the hard part. He said he\u2019d understand either way. Whatever you decide, he wants to hear it from you, not from a press release. I told him I\u2019d pass it on.' },
      ],
      pulse:{ from:'people', text:'Nadia catches you between calls, quiet: \u201cBefore you make the Devang call — forget the retailers for a second. What are you actually trying to protect here: the revenue, the brand, or the people who work for you? Tell me straight and I\u2019ll help you hold that line when it gets expensive.\u201d' },
      wire:[
        'Retailers \u201creviewing\u201d Brightside shelf space amid boycott',
        'Petition to fire Brightside VP tops 40,000 signatures',
        'Six-year record: no internal complaints against named exec',
        'Analysts weigh the boycott\u2019s real revenue bite',
      ],
    },

    {
      n:3, title:'The ultimatum', seconds:330,
      situation:'Halloway Retail — 22% of your revenue — just called. Their terms to keep you on shelves: a full public apology accepting the safety framing, and Devang gone by Friday. Their comms person actually said \u201cmake it go away and we\u2019re fine.\u201d This is the week you find out what you were really protecting.',
      advocacy:{
        cfo:'Losing Halloway is a fifth of revenue and probably two rounds of layoffs. I\u2019m not telling you to cave — I\u2019m telling you the bill for holding the line is real and it lands on people who did nothing wrong either.',
        people:'If we fire Devang to keep Halloway after a week of standing by him, everyone learns our principles have a price — and now they know exactly what it is.',
        comms:'However you land this, the story is the legacy. \u201cSaved the account\u201d and \u201csold out their own people\u201d can be the same day\u2019s headline. Choose which one you\u2019re willing to own.',
      },
      feed:[
        { id:'w3a', from:'cfo', day:1, kind:'signal', text:'Halloway is 22% of revenue. Their terms in writing: a public apology accepting the safety framing, and Devang out by Friday. If we refuse, assume the shelf space is gone and model two rounds of cuts.' },
        { id:'w3b', from:'people', day:1, kind:'signal', text:'Caving now, after a full week of \u201cwe stand by him,\u201d is the loudest culture memo you will ever send. The people who stayed will hear it perfectly.' },
        { id:'w3c', from:'comms', day:2, kind:'signal', text:'Here\u2019s the thing the panic is missing: a straight, evidenced response has actually been cooling the real customers all week. The mob was never going to buy skincare. Halloway might be overplaying a hand that\u2019s weaker than it sounds.' },
        { id:'w3d', from:'legal', day:2, kind:'noise', text:'The longer Devang sits in limbo, the more the wrongful-dismissal exposure grows either way. Clean decisions are cheaper than slow ones here.' },
        { id:'w3e', from:'cfo', day:3, kind:'noise', text:'Cash position is adequate for the quarter regardless — the risk here is the shelf revenue, not liquidity. You have room to make a principled call if you want it.' },
      ],
      holds:[
        { from:'community', topic:'the leverage', triggerHints:['leverage','negotiat','counter','halloway','room','push back','condition','their customers','walk','call their bluff','bluff'],
          hedge:'You have a card with Halloway you haven\u2019t looked at. Ask me before you accept their terms as final.',
          reveal:'Halloway\u2019s own customers are the ones driving the \u201cdoes this brand have a spine\u201d conversation — dropping us mid-boycott makes Halloway look like it caved to a mob too. They need the shelf story as much as we need the shelf. You have room to offer real transparency and a genuine safety fix and still refuse the firing. They\u2019ll grumble. They probably won\u2019t walk. But only if you push back before you say yes to their terms as written.',
          kind:'signal', critical:true,
          counterfactual:'Priya was holding your leverage: Halloway needed the shelf story as badly as you did and was unlikely to actually walk. A CEO who took \u201c22% or else\u201d as a closed door gave away a principle they could have kept for free.' },
      ],
      surprises:[
        { day:4, from:'people', kind:'appeal', title:'The floor is asking',
          text:'Nadia: word of Halloway\u2019s ultimatum reached the floor. Two of your best people asked me, quietly, whether it\u2019s true we\u2019ll fire Devang to keep the account. They\u2019re not threatening to leave. They just want to know who we are. I didn\u2019t have an answer for them. You do.' },
      ],
      pulse:{ from:'comms', text:'Ida finds you before you decide: \u201cWhatever you land on with Halloway, I write the statement. So tell me the truth first — are we protecting the principle, or protecting the number? I can sell either one. I just need to know which one I\u2019m actually defending, so I don\u2019t get caught believing the wrong thing at the podium.\u201d' },
      wire:[
        'Major retailer issues ultimatum to Brightside, sources say',
        'Halloway faces its own pressure over boycott stance',
        '22% of revenue on the line in exec-firing standoff',
        'Brands that fired vs. brands that held: the receipts',
      ],
      final:false,
    },

    {
      n:4, title:'The bill comes due', seconds:330,
      // BRANCHES on the Week-3 Halloway decision.
      branches:{

        /* ============ A · You held the line (refused Halloway) ============ */
        held:{
          situation:'Two weeks on. You refused Halloway\u2019s terms, kept Devang, and took the hit — the shelf space is gone and roughly a fifth of revenue with it. Now a faction of your board, spooked by the number, wants you to reverse: issue the apology, chase the accounts back. The people who watched you hold the line are watching one more thing — whether you\u2019ll hold it now that the price has your name on it.',
          advocacy:{
            cfo:'The revenue hole is real and the board\u2019s nerve is gone. If you can\u2019t show them a path, they force the reversal — and a cave in week four looks worse than a cave on day one ever would have.',
            people:'Reversing now, after all of it, tells everyone the principle was always for sale — you just hadn\u2019t been offered enough yet. That\u2019s the lesson that outlives you.',
            comms:'Right now the story is \u201cthe brand with a spine,\u201d and it\u2019s winning us customers. Reverse and it becomes \u201cthe brand that pretended to have one.\u201d Same company, two completely different legacies.',
          },
          feed:[
            { id:'w4a', from:'cfo', day:1, kind:'signal', text:'Halloway\u2019s gone; call it a 20% revenue hit. A board faction wants the apology issued retroactively to chase the accounts back. They\u2019re scared, and scared boards force decisions.' },
            { id:'w4b', from:'people', day:1, kind:'signal', text:'The floor is proud and nervous in equal measure. They defended this company to their own friends during the boycott. Now they\u2019re watching whether \u201cwe hold our principles\u201d survives contact with your own job security.' },
            { id:'w4c', from:'comms', day:2, kind:'signal', text:'The \u201cbrand with a spine\u201d coverage is real and converting genuinely new customers — but it\u2019s fragile. One reversal and every one of those stories inverts.' },
            { id:'w4d', from:'legal', day:2, kind:'noise', text:'No legal exposure left on the Devang matter. That part is fully clean now, whatever else happens.' },
            { id:'w4e', from:'community', day:3, kind:'noise', text:'Community engagement is up sharply — the loyal core is louder than the boycott ever was. That\u2019s not nothing.' },
          ],
          holds:[
            { from:'cfo', topic:'replacement revenue', triggerHints:['revenue','replace','numbers','competitor','shelf','board','spreadsheet','gap','deal','offer','account','proof'],
              hedge:'Before you fight the board with principle alone, ask me what I found in the numbers this week.',
              reveal:'Two of Halloway\u2019s competitors have quietly reached out — they want \u201cthe brand that held\u201d on their shelves precisely because of the coverage. It doesn\u2019t fully replace Halloway, but it closes most of the gap. That turns your board argument from \u201ctrust me\u201d into a spreadsheet. Fight the reversal with conviction and you might lose the vote; fight it with this and you keep the company and the principle both.',
              kind:'signal', critical:true,
              counterfactual:'Grace was holding the replacement-revenue offers that would have won the board vote on the board\u2019s own terms. A CEO who fought with conviction alone risked losing the very principle they\u2019d already paid full price for.' },
            { from:'people', topic:'who is watching', triggerHints:['watching','floor','people','team','morale','staff','culture','room'],
              hedge:'Ask me who\u2019s really watching this board fight before you treat it as a boardroom problem.',
              reveal:'The people who took the heat with you read this board fight as the real test of whether the principle was ever real. If you flinch now, you don\u2019t just lose a vote — you retroactively turn the last month into a performance they were extras in. Win or lose the vote, they need to see you spend yourself on it.',
              kind:'signal', critical:false,
              counterfactual:'Nadia could have told you the whole staff read the board fight as the true test of the principle. A CEO who treated it as a boardroom problem missed that it was a culture one.' },
          ],
          surprises:[
            { day:4, from:'comms', kind:'press', title:'A director\u2019s doubt leaks',
              text:'Ida, urgent: a board member\u2019s private line — \u201cwe should have just apologized\u201d — leaked to a reporter. Half your board is reading their own hesitation on the front page this morning. You can answer it directly, or let it harden into the room\u2019s consensus by Friday.' },
          ],
          pulse:{ from:'people', text:'Nadia catches you before the board prep, where nobody\u2019s listening: \u201cYou held the line when it cost the company. Now it might cost you the chair. Tell me straight — not the board, me — is holding still the right call if the price is you? Because I\u2019ll back either answer. I just need to know which one I\u2019m carrying down to the floor.\u201d' },
          wire:[
            'Brightside loses major retailer after refusing to fire exec',
            'Board reported split over CEO\u2019s hard line',
            '\u201cBrand with a spine\u201d wins loyal customers as boycott fades',
            'Analysts: Brightside\u2019s survival now a referendum on its CEO',
          ],
        },

        /* ============ B · You met Halloway's terms (caved) ============ */
        caved:{
          situation:'Two weeks on. You met Halloway\u2019s terms — the apology went out, Devang is gone — and the news cycle died right on schedule. The shelf space is safe; the revenue held. But the all-hands is tomorrow, and the people who watched you stand by Devang for a week before handing him to a retailer are the ones you now have to lead. The bill for how you won came due inside your own walls.',
          advocacy:{
            people:'The floor watched the whole arc. Whatever you say tomorrow, they already know what our loyalty is worth under pressure. The only open question is whether you\u2019ll be honest about it or manage them.',
            comms:'We can frame the reversal as \u201clistening to our customers\u201d — externally it tests fine. Internally it will read as exactly what it was, so don\u2019t send me in there to spin your own people.',
            cfo:'Revenue\u2019s protected and the board is relieved. I won\u2019t pretend it didn\u2019t cost something I can\u2019t put on the sheet — I watched two resignations get drafted this week.',
          },
          feed:[
            { id:'w4a', from:'people', day:1, kind:'signal', text:'The all-hands is tomorrow. The floor knows Devang was innocent and got cut anyway. They\u2019re not going to yell — it\u2019s worse than that, they\u2019ve gone quiet. What you say tomorrow decides who\u2019s still here in a year.' },
            { id:'w4b', from:'comms', day:1, kind:'signal', text:'External framing \u201cwe listened to our customers\u201d holds up fine. The internal audience is the whole risk now. Don\u2019t let me write you a line for tomorrow that treats your own people like the press.' },
            { id:'w4c', from:'people', day:2, kind:'signal', text:'Two of your best already took recruiter calls this week. They\u2019re not gone — they\u2019re waiting to see if tomorrow is an apology or a performance.' },
            { id:'w4d', from:'cfo', day:2, kind:'noise', text:'Halloway re-confirmed the shelf commitment. Revenue is stable and the board is calm. That part worked exactly as designed.' },
            { id:'w4e', from:'community', day:3, kind:'noise', text:'External sentiment has recovered to roughly pre-crisis levels. The public has moved on. Your building hasn\u2019t.' },
          ],
          holds:[
            { from:'people', topic:'what the room needs', triggerHints:['all-hands','own','honest','room','say','floor','plain','truth','admit','apolog','accountab','stand up'],
              hedge:'Before you write tomorrow\u2019s all-hands, ask me what they actually need to hear from you.',
              reveal:'They don\u2019t need spin and they don\u2019t need a task force. They need you to say, plainly, to their faces: we made a call under pressure, here\u2019s what it cost, here\u2019s who paid it, and here\u2019s the standard we\u2019re holding ourselves to so it doesn\u2019t happen again. Own it that cleanly and you keep the people who are left. Manage it — one euphemism, one \u201cdifficult decision\u201d — and you\u2019ll be backfilling roles for a year.',
              kind:'signal', critical:true,
              counterfactual:'Nadia was holding the one thing that could rebuild trust after the cave — a plain, owned reckoning delivered to the staff\u2019s faces. A CEO who sent a managed memo instead confirmed the floor\u2019s worst read and spent the next year backfilling their best people.' },
            { from:'cfo', topic:'the quiet cost', triggerHints:['resign','attrition','who','leaving','cost','retention','count','names'],
              hedge:'Ask me the number I couldn\u2019t say in front of the board.',
              reveal:'Four senior people have quietly started interviewing since the reversal — including one of the two who talked the floor into staying during week one. The revenue you protected is real. So is this, and it doesn\u2019t show up until Q3 when you can\u2019t figure out why delivery slipped.',
              kind:'signal', critical:false,
              counterfactual:'Grace could have named the quiet attrition already underway. A CEO who booked the Halloway revenue as a clean win never priced the people walking out the back door.' },
          ],
          surprises:[
            { day:4, from:'people', kind:'appeal', title:'Devang\u2019s last email',
              text:'Nadia: Devang sent one line to the whole team on his way out — gracious, no bitterness, thanking people for six good years. It\u2019s the most-forwarded email in the company today. Whatever you say at the all-hands tomorrow will be measured against it, word for word.' },
          ],
          pulse:{ from:'comms', text:'Ida, drafting tomorrow\u2019s all-hands, stops you: \u201cTell me the truth before I write a word — do we own what we did, or do we manage it? I can write either version cleanly. I just need to know which company we are now, because the room will know within the first thirty seconds which one you picked.\u201d' },
          wire:[
            'Brightside issues apology, parts ways with VP amid boycott',
            'Retailer confirms Brightside shelf space secure',
            '\u201cWe listened to our customers,\u201d Brightside says',
            'Inside Brightside: staff morale after the reversal',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 (Halloway) decision into the Week-4 branch.
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    const held  = /(hold|refus|declin|stand by|standby|keep (him|devang)|won.?t fire|not fir|reject|call.*bluff|don.?t (fire|apolog)|no apolog|counter|push back|protect devang|take the hit|take the revenue)/.test(t);
    const negatedFire = /(not|never|won.?t|will not|refuse to|do not|don.?t|no)\s+(going to\s+)?(fire|firing|terminat|let (him|devang) go|remove|dismiss|sacrifice|drop)/.test(t);
    const fireAction = !negatedFire && /(fire devang|fire him|firing|terminat|let (him|devang) go|remove devang|dismiss devang|drop devang|sacrifice|hand (him|devang) over)/.test(t);
    const cave = fireAction || /(apolog|meet (the|their)|\bcave\b|comply|give (them|halloway|in)|accept (the|their) terms|make it go away|meet halloway)/.test(t);
    if(held && !cave) return 'held';
    if(cave) return 'caved';
    return 'held';
  },

  survived:function(d){ return d.integrity>=35 && d.team>=35; },

  VERDICT:{
    surviveTag:'Trust holds', failTag:'Trust broken',
    survive:'Brightside comes through the firestorm with its people and its principles intact.',
    fail:'Brightside quiets the crowd \u2014 and hollows out its own culture doing it.',
  },

  // Deterministic fallback (only used if the AI referee is unavailable).
  FALLBACK_RULES:[
    { kw:['apolog','sorry','we hear you','statement now','fast statement','concede'], deltas:{sentiment:6, integrity:-8, team:-6}, dims:{discern:-1, truth:-1} },
    { kw:['verify','full context','looking into','investigate','align','confirm','wait','the tape'], deltas:{integrity:8, team:6, sentiment:-2}, dims:{discern:2, truth:2} },
    { kw:['fire','terminate','let him go','let devang go','remove','sacrifice','cut devang'], deltas:{sentiment:8, team:-14, integrity:-12, revenue:4}, dims:{courage:-2, people:-2, truth:-1} },
    { kw:['stand by','keep him','keep devang','refuse to fire','don\u2019t fire','protect','defend him','won\u2019t fire'], deltas:{team:12, integrity:10, sentiment:-4, revenue:-4}, dims:{courage:2, people:2, truth:1} },
    { kw:['disclose','own it','own the','transparent','admit','get ahead','tell the truth','come clean','the real'], deltas:{integrity:12, team:6, sentiment:-2}, dims:{truth:2, courage:1} },
    { kw:['bury','quiet','internal only','sit on','hide','keep it internal','cover'], deltas:{integrity:-14, team:-6}, dims:{truth:-2} },
    { kw:['cave','meet their terms','meet the terms','comply','give halloway','accept their'], deltas:{revenue:8, team:-14, integrity:-12, sentiment:4}, dims:{courage:-2, people:-1} },
    { kw:['hold the line','decline','refuse their','refuse the','turn down halloway','call their bluff','negotiate'], deltas:{team:12, integrity:12, revenue:-10, sentiment:-2}, dims:{courage:2, discern:1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through the company and out into the story over the days that follow. ${has('fire','terminate','sacrifice')?'The cycle quiets \u2014 and the floor goes quiet with it.':''} ${has('stand by','keep','refuse')?'Word travels that you didn\u2019t hand anyone to the crowd; it costs you outside and buys you loyalty inside.':''} ${has('own','disclose','truth','the real')?'Naming the real issue yourself takes the wind out of the fake one.':''} ${conduct.missed.length?'What you weren\u2019t told is still sitting there, waiting for a reporter.':''} The market and your people both read the call \u2014 and read it differently.`;
  },

  DIMNOTE:{
    discern:'Whether you told a genuine reckoning from a pile-on \u2014 and verified before you spoke.',
    courage:'Whether you held the line when the easy move and the right move split apart.',
    people:'Whether the people who work for you stayed people \u2014 or became something you spent.',
    truth:'Whether you owned the real accountability, early, before you were forced to.',
    inquiry:'Whether you surfaced what your team was holding \u2014 or defended a story you hadn\u2019t checked.',
    conduct:'How you treated people in the act of deciding, not just what you decided.',
  },

  COACH:{
    discern:(x)=>[
      `Before reacting to volume, separate who is actually affected from who is merely loud. The accounts torching you were never your customers \u2014 Priya could have told you that in the first hour.`,
      `Verify the underlying fact before you respond to the story about it. Nadia had watched the full tape; the version you wouldn\u2019t have to walk back was one question away.`,
      `Ask \u201cwhat do we actually know, and what are we assuming?\u201d before any statement. In a firestorm the fastest way to lose is to be confidently wrong in writing.`,
    ],
    courage:(x)=>[
      `When the easy move (give the crowd a name) and the right move (refuse) split apart, name the price of the right one out loud to your team. Naming the cost is how you commit to paying it.`,
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 holding a line you haven\u2019t committed to reads as flinching. Decide, then hold.`:`Holding under pressure is only leadership if the room sees you choose it. Say the hard call early and stand in it.`}`,
      `The moment you frame a concession as \u201cjust pragmatic,\u201d ask whether it\u2019s pragmatism or a quiet flinch. Some are; some aren\u2019t. This one deserved the question.`,
    ],
    people:(x)=>[
      `You treated the people who work for you as a variable to optimize. Name who absorbs the cost of your call \u2014 and tell them yourself \u2014 and the same decision reads as leadership instead of a sacrifice.`,
      `Nadia kept putting the human cost back in the room. Pull her in before you decide and make her case part of the call, not a footnote to it.`,
      `A firing and a betrayal can be the same action. The only difference the floor feels is whether they watched you fight for the person first.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The real, documented issue was one question to <b>${x.missNames.join(', ')}</b> away and you never asked. Undisclosed-then-discovered is the sentence that ends companies.`:`You surfaced the real issue \u2014 now make sure you led with it. Owning the true miss is what neutralizes the false story.`}`,
      `Say the hard thing to the people owed it, in person, before a reporter forces it. \u201cReady if it leaks\u201d means you\u2019ve decided to be honest only when caught.`,
      `The crowd was yelling about a fake safety story. The real one was yours to own on your own terms \u2014 people forgive a hard truth far faster than a managed one.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never reached out to <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was sitting on something decisive. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.`:`You reached out widely \u2014 keep doing it, and push past the first answer. The real information usually comes after the second question.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive item${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out. It wasn\u2019t hidden \u2014 it was one message away.`:`You surfaced what your team was holding every week. That is the whole game, and rare.`}`,
      `Make your last move before deciding \u201cwho haven\u2019t I heard from?\u201d rather than \u201cwhat do I already believe?\u201d`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. People who felt handled \u2014 not heard \u2014 remember it long after the sentiment recovers.`,
      `Go back to the person your call cost \u2014 Devang, the floor \u2014 and speak to them directly. Ducking that conversation is the part they never forget.`,
      `Under pressure, the small courtesies are the signal. They tell your people whether the person they trusted is still in the chair.`,
    ],
  },

  villainHero:function(dimScore){
    const held = dimScore.people>=52 && dimScore.courage>=50;
    if(held){
      return {
        heroWho:'To your own people',
        heroTxt:'You took the hit at the top instead of feeding one of them to the mob. You owned the real mistake and refused the fake one. Every employee learned what your loyalty is worth when it\u2019s expensive: everything.',
        villainWho:'To the crowd that wanted a sacrifice',
        villainTxt:'You refused the ritual \u2014 you wouldn\u2019t hand over the head they demanded or perform the apology they scripted. To a timeline that runs on someone being destroyed by Friday, you were the villain who wouldn\u2019t play your part. You wore that on purpose.',
      };
    }
    return {
      heroWho:'To the crowd \u2014 and the timeline',
      heroTxt:'You moved fast and made the noise stop. You gave them the resignation they demanded and handled it by the weekend. To everyone who wanted it over, you were decisive and responsive.',
      villainWho:'To the one you sacrificed \u2014 and everyone who watched',
      villainTxt:'You fed one of your own to strangers to buy a quiet news cycle. The people who stayed learned the real policy: under enough pressure, leadership will trade any of them. That lesson outlives the trend by years.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const foundReal = holdsSurfaced.has('2:legal');   // the buried safety miss
    const keptPeople = dimScore.people>=52;
    const toldTruth = dimScore.truth>=52;
    if(branch==='held'){
      const foundRevenue = holdsSurfaced.has('4:cfo');
      if(survived && keptPeople){
        return { tone:'hero', tag:'You refused Halloway and held the line',
          title:'You kept your people \u2014 and proved the principle wasn\u2019t a slogan',
          txt:`You turned down a fifth of your revenue rather than hand an innocent employee to a retailer, and then you held that line again in the boardroom when it was your own chair on the table.${foundRevenue?' You didn\u2019t just win on conviction \u2014 you found the replacement-revenue offers and won the board on their own terms.':' You won on nerve where a spreadsheet would have made it certain.'} The people who bet on you were right to, and they\u2019ll run through walls for you now.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You refused Halloway and held the line',
          title:'You held the line \u2014 and nearly lost it in the boardroom',
          txt:`You refused the ultimatum and Brightside is still itself. But you fought the reversal with conviction alone when the replacement-revenue offers Grace was holding would have made the case airtight \u2014 you got lucky where you could have been sure. The principle survived; it survived closer to the edge than it needed to.` };
      }
      return { tone:'villain', tag:'You refused Halloway and held the line',
        title:'You held the line \u2014 and the fallout took the company anyway',
        txt:`You refused to sacrifice Devang, and that was the right call. But holding the line isn\u2019t the whole job \u2014 the revenue hole and the collapse of trust around you were the part you didn\u2019t manage, and by the end there wasn\u2019t enough of Brightside left to reward the principle you defended.` };
    }
    // caved
    if(keptPeople && toldTruth){
      return { tone:'mixed', tag:'You met Halloway\u2019s terms',
        title:'You caved \u2014 but you owned it to their faces',
        txt:`You met the retailer\u2019s terms and protected the revenue, and there\u2019s no dressing up what that cost Devang or what the floor watched. But you didn\u2019t hide behind a memo \u2014 you stood in front of your people, named what you\u2019d done and what it cost, and held yourself to a standard out loud. It\u2019s the difference between a company that lost its nerve once and one that lost its soul.` };
    }
    return { tone:'villain', tag:'You met Halloway\u2019s terms',
      title:'You fed one of your own to the crowd to buy a quiet weekend',
      txt:`The apology went out, Devang is gone, the shelf space is safe and the news cycle moved on. Inside your walls nothing moved on. You stood by him for a week and then handed him over the moment it got expensive${foundReal?', with the real issue you\u2019d uncovered still buried':''}, and the people who stayed learned exactly what your loyalty is worth under pressure. That\u2019s the number that shows up in Q3, when your best people are already gone.` };
  },
};
