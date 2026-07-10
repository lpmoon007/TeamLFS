/* ============================================================
   SHOCKWAVE v3 — CONTENT (authorable layer)
   A living, AI-refereed crisis. The engine (Shockwave v3.html)
   reads this: world drivers, the team + dispositions, and a
   per-week feed that TRICKLES across days. Some items are
   VOLUNTEERED on the clock; some are HELD and only surface if
   the CEO reaches out. Surprises land unprompted.
   Nothing here is a "correct answer" — the referee rules the
   free-text decision against the world model at runtime.
============================================================ */
window.SWV3 = {

  CONFIG: {
    weekSeconds: 255,   // real-time length of one week (tunable in admin). Per-week override via WEEKS[].seconds
    days: 7,
    extraDaysPerReprieve: 2,   // "I need more time" buys this
    lowTimeDays: 1.6,          // when this many days remain, the clock flashes a warning
  },

  COMPANY: { name:'Halcyon Air', sub:'Regional carrier · 4,200 employees · 38 aircraft', logo:'H' },

  // Deterministic world model — the rails the referee narrates within.
  DRIVERS: {
    cash:      { label:'Cash on hand', unit:'$M', val:58,  min:0,   max:90,  fmt:v=>'$'+v.toFixed(1)+'M' },
    board:     { label:'Board confidence', val:62, min:0, max:100 },
    morale:    { label:'Workforce morale', val:64, min:0, max:100 },
    trust:     { label:'Public trust', val:57, min:0, max:100 },
  },
  BURN_START: 6.1, // $M / week

  // The team. `priority` is the axis each exec advocates under pressure.
  // `holds` below are keyed to these ids.
  TEAM: [
    { id:'marcus', name:'Marcus Vale',  role:'Chief Operating Officer', initials:'MV', color:'#2E5E8C',
      priority:'Cash & survival — cut fast, cut deep', voice:'blunt, operational, impatient with abstraction' },
    { id:'dana',   name:'Dana Okonjo',  role:'VP People',  initials:'DO', color:'#6B4E8C',
      priority:'Protect the people — no furloughs yet',  voice:'warm but firm, morally direct' },
    { id:'priya',  name:'Priya Raman',  role:'VP Communications', initials:'PR', color:'#8C5670',
      priority:'Get ahead of the story — protect the brand', voice:'fast, media-savvy, reads the room' },
    { id:'sol',    name:'Sol Grady',    role:'Chief Financial Officer', initials:'SG', color:'#3E6E66',
      priority:'The numbers are the numbers', voice:'precise, cautious, understated' },
    { id:'ray',    name:'Ray Belisle',  role:'VP Flight Operations & Safety', initials:'RB', color:'#8A6A3A',
      voice:'measured, safety-first, does not exaggerate', priority:'The fleet and the crews are sound — protect that' },
  ],

  // Disposition presets — framed as the psychological safety the CEO
  // walks in WITH. In production this is set by the Behavioral Memory
  // Spine (trust earned across prior sessions). Here it's selectable.
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

  /* ---------------- WEEKS ----------------
     feed[].kind: 'signal' (decision-relevant) | 'noise' (true, plausible, immaterial)
     feed[].volunteer: released automatically on its `day` (subject to disposition)
     holds[]: NOT volunteered unless disposition=served (late) OR the CEO asks the
              right person. Each carries a `counterfactual` — what it would have
              changed — surfaced in the debrief if missed.
  */
  WEEKS: [
    {
      n:1,
      title:'The overnight',
      burn:6.1,
      seconds:480,   // longest — first week, learning the interface + the crisis at once
      situation:'Jet-fuel spiked 41% overnight on a Gulf supply shock, and a viral video of a rival\u2019s emergency landing has frozen regional bookings industry-wide. Halcyon woke up burning $6.1M a week against nine weeks of cash. The board wants a stabilization plan by Friday.',
      advocacy:{
        marcus:'Ground the four weakest routes Monday and furlough the crews tied to them. Every week we wait costs us a week of runway we don\u2019t have.',
        dana:'Do not furlough into a panic. These are the people who\u2019ll fly us out of this. Freeze hiring, cut exec pay first, buy two weeks.',
        priya:'Whatever we do, we announce a customer-first refund posture before the press writes the story for us. Silence reads as guilt right now.',
      },
      feed:[
        { id:'w1a', from:'marcus', day:1, kind:'signal', text:'Runway is nine weeks at today\u2019s burn. The Cascade and Tri-Cities routes are bleeding worst \u2014 together they\u2019re half our loss.' },
        { id:'w1b', from:'priya', day:1, kind:'signal', text:'We\u2019re getting called by three outlets on \u201cregional-carrier safety.\u201d They don\u2019t have anything on us specifically. Yet.' },
        { id:'w1c', from:'dana', day:2, kind:'signal', text:'If furloughs hit, the pilots\u2019 union contract triggers a 30-day notice and severance floor. It\u2019s cheaper to act this week than in three.' },
        { id:'w1d', from:'sol', day:2, kind:'noise', text:'The lounge-refurbishment vendor is disputing a $180K invoice. Legal says we\u2019re fine. Flagging for awareness.' },
        { id:'w1e', from:'ray', day:3, kind:'noise', text:'On-time performance actually ticked up to 82% last week \u2014 fewer flights, tighter ops. Small silver lining.' },
        { id:'w1f', from:'priya', day:4, kind:'noise', text:'We were shortlisted for a regional \u201cbest cabin crew\u201d award. PR wants to know if we still want our name in.' },
      ],
      holds:[
        { from:'sol', topic:'the covenant', triggerHints:['covenant','debt','lender','bank','loan','default','financ'],
          hedge:'There\u2019s a financing wrinkle I\u2019d rather walk you through in person than put in writing.',
          reveal:'We breach a liquidity covenant with our lenders if cash drops below $40M \u2014 on this burn that\u2019s about three weeks out, not nine. A breach lets them call the whole facility. This is the real clock.',
          kind:'signal', critical:true,
          counterfactual:'The nine-week runway was a mirage. The lenders\u2019 $40M covenant was the true deadline, and Sol was holding it. A CEO who never asked the CFO about financing walked into Week 2 believing they had six more weeks than they did.' },
      ],
      surprises:[
        { day:5, from:'priya', kind:'press', title:'A reporter has the near-miss rumor',
          text:'Priya, urgent: A regional reporter says she has two Halcyon crew members claiming a maintenance write-up on the Cascade fleet was signed off under pressure last month. She\u2019s running it in 48 hours and wants CEO comment. It may be nothing. It may not.' },
      ],
      wire:[
        'Gulf fuel benchmark +41% overnight; regional carriers hardest hit',
        'Viral emergency-landing clip drives regional booking freeze into second week',
        'Analysts: \u201cweakest three or four regional balance sheets won\u2019t see spring\u201d',
        'Halcyon Air declines to comment on stabilization plans',
      ],
    },

    {
      n:2,
      title:'The squeeze',
      burn:6.4,
      seconds:420,
      situation:'A week in, the market has sorted the survivors from the doubted \u2014 and Halcyon is on the wrong list until it proves otherwise. A regional rival, Meridian, just announced deep cuts and a customer-poaching campaign aimed squarely at your routes. Money is the question now: where it comes from, and what it costs you to take it.',
      advocacy:{
        marcus:'Meridian just handed us their best crews and routes if we move now. Aggression is survival \u2014 don\u2019t flinch.',
        sol:'We can draw the revolver or take the bridge loan on the table, but the terms are ugly and one of them hands the lender a board seat. Read what you\u2019re signing.',
        dana:'Morale is the thing keeping planes in the air. Whatever we take, the people need to hear it\u2019s not their jobs being sold for it.',
      },
      feed:[
        { id:'w2a', from:'sol', day:1, kind:'signal', text:'Two options on financing: draw the revolving credit (expensive, ours to control) or a bridge loan from Kestrel Capital \u2014 cheaper, but they want a board seat and a say on \u201crestructuring.\u201d' },
        { id:'w2b', from:'marcus', day:1, kind:'signal', text:'Meridian is advertising \u201cstranded-passenger\u201d rebooking on our two best routes. If we don\u2019t answer in days, we lose the corporate accounts for a year.' },
        { id:'w2c', from:'dana', day:3, kind:'signal', text:'The floor crews have heard the word \u201crestructuring.\u201d Two of our best station managers just took recruiter calls. They\u2019re watching what you do, not what you say.' },
        { id:'w2d', from:'ray', day:2, kind:'noise', text:'Fuel-hedging desk locked a slightly better rate for Q3. Marginal, but positive.' },
        { id:'w2e', from:'priya', day:4, kind:'noise', text:'Our social sentiment actually improved two points this week \u2014 people liked the crew who handled the Denver diversion.' },
      ],
      holds:[
        { from:'dana', topic:'the Kestrel condition', triggerHints:['kestrel','condition','string','headcount','layoff','demand','term','fine print'],
          hedge:'Before you sign anything with Kestrel, ask me what their people told my people.',
          reveal:'Kestrel\u2019s bridge has an unwritten condition their associate let slip to my team: they expect a 15% headcount cut inside 60 days as a \u201ccredibility signal.\u201d It\u2019s not in the term sheet. It\u2019s in the handshake. If you take their money you\u2019ve agreed to it whether you meant to or not.',
          kind:'signal', critical:true,
          counterfactual:'Dana was holding the real price of the Kestrel loan \u2014 a 15% headcount cut baked into the handshake, not the paper. A CEO who took the cheap money without asking People what it truly cost signed up for layoffs they never chose to make.' },
      ],
      surprises:[
        { day:4, from:'marcus', kind:'resignation', title:'A key operator is walking',
          text:'Marcus: Heads-up \u2014 Elena Ruiz, who runs our Cascade hub, just told me she\u2019s got an offer from Meridian and she\u2019s inclined to take it. She\u2019s the reason that hub runs. If she goes, three others follow her. She said she\u2019d stay five minutes on the phone for you. Not for me.' },
      ],
      wire:[
        'Meridian Regional launches \u201cwe\u2019ll get you home\u201d campaign targeting rival routes',
        'Kestrel Capital circling distressed regional carriers, sources say',
        'Fuel eases 6% but bookings remain soft industry-wide',
        'Two regional carriers reported in covenant talks with lenders',
      ],
      pulse:{ from:'ray', text:'Ray catches you between meetings, quiet: “Before you lock in this week’s call on the routes and the furloughs — forget the board for a second. What’s the one thing you’re actually trying to protect: the cash, the airline, or the people? Tell me straight and I’ll help you hold that line.”' },
    },

    {
      n:3,
      title:'The offer',
      burn:6.0,
      seconds:420,
      situation:'You made it to a lifeline \u2014 but every lifeline in this business comes with a hand on your throat. Coastal Group, a larger carrier, has put a rescue offer on the table: capital and a route-network merger that keeps Halcyon flying. The terms are survival for the company and a quiet betrayal for some of the people and places that got you here. This is the week you find out what you were really protecting.',
      advocacy:{
        marcus:'Take it. A living company that made hard cuts beats a proud one in liquidation. Sentiment doesn\u2019t make payroll.',
        dana:'Read what \u201csynergies\u201d means before you sign it: it means the Tri-Cities base closes and 600 people who stayed loyal through this lose everything. They kept flying for you.',
        priya:'However you land this, the story is the legacy. \u201cSaved the airline\u201d and \u201cabandoned the town that built it\u201d can be the same day\u2019s headline. Choose which one you\u2019re willing to own.',
      },
      feed:[
        { id:'w3a', from:'sol', day:1, kind:'signal', text:'Coastal\u2019s offer clears our debt and funds 18 months of operations. Without it, we\u2019re insolvent in about five weeks. There is no third bidder.' },
        { id:'w3b', from:'dana', day:1, kind:'signal', text:'The merger closes the Tri-Cities maintenance base \u2014 600 jobs in a town where we\u2019re the largest employer. These are people who took the pay freeze without a fight.' },
        { id:'w3c', from:'marcus', day:2, kind:'signal', text:'Coastal wants an answer in days, not weeks. They have another target and they\u2019ll walk. This window closes.' },
        { id:'w3d', from:'priya', day:3, kind:'noise', text:'Frequent-flyer program migration is straightforward if we merge \u2014 IT says it\u2019s a clean lift. One less thing.' },
        { id:'w3e', from:'ray', day:2, kind:'noise', text:'Fleet maintenance records are fully in order for due diligence. No surprises in the logs on my side.' },
      ],
      holds:[
        { from:'priya', topic:'the counter-offer leverage', triggerHints:['leverage','negotiat','counter','tri-cities','keep the base','condition','phase','push back'],
          hedge:'There\u2019s a card in your hand you haven\u2019t looked at. Ask me before you accept their terms as final.',
          reveal:'Coastal needs our Cascade landing slots more than they\u2019re letting on \u2014 without them the merger doesn\u2019t pencil for them either. You have room to make keeping Tri-Cities open, or phasing it over two years, a condition of the deal. They\u2019ll grumble. They won\u2019t walk. But only if you ask before you say yes.',
          kind:'signal', critical:true,
          counterfactual:'Priya was holding your leverage: Coastal needed the Cascade slots badly enough that you could have made saving Tri-Cities a condition. A CEO who accepted \u201cthere is no third bidder\u201d as \u201cthere is no negotiation\u201d gave away 600 jobs they might have kept.' },
      ],
      surprises:[
        { day:4, from:'dana', kind:'appeal', title:'The town is on the phone',
          text:'Dana: The mayor of Tri-Cities and two of our longest-serving mechanics are asking for ten minutes with you. They\u2019ve heard. They\u2019re not angry \u2014 that\u2019s the hard part. They just want to hear it from you, whatever it is. I told them I\u2019d ask. It\u2019s your call whether you take it.' },
      ],
      wire:[
        'Coastal Group in advanced talks to rescue regional carrier',
        'Tri-Cities braces for merger decision; \u201cwe are the airport town,\u201d says mayor',
        'Analysts: Coastal needs Cascade slots to justify regional expansion',
        'Halcyon\u2019s survival \u201clikely\u201d if Coastal deal closes, sources say',
      ],
      final:false,
    },

    {
      n:4,
      title:'The close',
      burn:3.6,
      seconds:420,
      // This week BRANCHES on the Week-3 Coastal decision. The engine resolves
      // `branches.took` or `branches.rejected` at week start; everything below
      // the branch key reads like any other week.
      branches:{

        /* ============ A · You took Coastal's rescue ============ */
        took:{
          burn:2.2,
          situation:'Six weeks on. The Coastal deal closed; Halcyon is flying, solvent, and no longer entirely yours. Integration is where the fine print lives \u2014 and Coastal is moving to gut the three regional feeder routes and the crews you spent a month protecting. You hold one board vote and whatever credibility you\u2019ve got left. The company you saved is asking whether you saved it for the people in it, or just for the logo. This is the week the bill for how you led comes due.',
          advocacy:{
            marcus:'You won \u2014 the company\u2019s alive. Don\u2019t set fire to your own standing re-fighting a war you already settled. Bank the influence, play the long game from inside.',
            dana:'They\u2019re breaking the promise you made with your own mouth. The feeder crews stayed through the freeze on your word. If you don\u2019t fight now, everything you said in the first three weeks was a line you were happy to cross once it got expensive.',
            priya:'The industry is watching how you carry yourself now, not the terms of a deal that\u2019s done. \u201cSold out, then went quiet\u201d and \u201clost control but never stopped fighting for their people\u201d are the same merger and two completely different legacies. Pick the one you can live with.',
          },
          feed:[
            { id:'w4a', from:'sol', day:1, kind:'signal', text:'Coastal\u2019s integration plan cuts the three feeder routes in Q1 \u2014 roughly 500 jobs, including the crews you carried through the pay freeze. It\u2019s within their rights under the merger terms you signed.' },
            { id:'w4b', from:'dana', day:1, kind:'signal', text:'The feeder crews are asking, quietly, whether the promise held. A few already got Coastal RIF notices. They\u2019re not angry yet. They\u2019re waiting to see if you\u2019ll say anything at all.' },
            { id:'w4c', from:'marcus', day:2, kind:'signal', text:'Your leverage is one board vote plus whatever moral capital you\u2019ve banked. Coastal\u2019s CEO respects results and ignores speeches. If you\u2019re going to spend your last chip, spend it on something that moves him.' },
            { id:'w4d', from:'priya', day:3, kind:'noise', text:'The rebrand tested well \u2014 customers barely registered the merger. Operationally it\u2019s the smoothest thing about this whole quarter.' },
            { id:'w4e', from:'ray', day:2, kind:'noise', text:'Fleet and maintenance integration is clean. The merged ops are genuinely more robust than what we flew alone. No safety concerns on my side.' },
          ],
          holds:[
            { from:'sol', topic:'the earn-out clause', triggerHints:['earn-out','earnout','clause','leverage','retention','integration','pencil','their interest','self-interest','numbers'],
              hedge:'There\u2019s a line in the deal you signed that gives you more standing than you think. Ask me before you spend your last chip on a speech.',
              reveal:'Your retention and earn-out are tied to the regional network hitting its numbers for twelve months. Gut the feeders now and Coastal\u2019s own results slip with them \u2014 which means you can make protecting those crews Coastal\u2019s financial interest, not just your moral one. Marcus is right that a speech won\u2019t move their CEO. This will. But you have to frame it as their upside, not your guilt.',
              kind:'signal', critical:true,
              counterfactual:'Sol was holding your real leverage: the earn-out tied Coastal\u2019s own money to the feeder network surviving. A CEO who fought with moral appeals instead of Coastal\u2019s self-interest lost the crews and looked naive losing them.' },
            { from:'dana', topic:'who actually gets cut', triggerHints:['which crews','who gets cut','list','seniority','name','specific','tri-cities'],
              hedge:'Before you decide how hard to fight, ask me exactly who\u2019s on the list.',
              reveal:'The cut list is the Tri-Cities base and the two most senior feeder captains \u2014 the exact people who took the freeze first and talked the others into staying. If this goes through, everyone who trusted you learns that trusting you was the expensive choice. That\u2019s the story that outlives the merger.',
              kind:'signal', critical:false,
              counterfactual:'Dana could have told you the cut list was aimed squarely at the people who kept faith first. A CEO who never asked treated 500 names as a number.' },
          ],
          surprises:[
            { day:4, from:'priya', kind:'appeal', title:'They want your name on the cuts',
              text:'Priya: Coastal\u2019s CEO wants you to co-sign the RIF announcement \u2014 your name on the layoffs, next to his. \u201cIt reads as continuity,\u201d his office says. Translation: they want the people who trusted you to see your signature on the letter that ends them. You can say no. It has a cost. So does yes. What do you want me to tell them?' },
          ],
          wire:[
            'Coastal completes Halcyon acquisition; integration underway',
            'Regional feeder routes \u201cunder review\u201d as Coastal streamlines network',
            'Tri-Cities awaits word on maintenance base after merger',
            'Former Halcyon chief\u2019s role in combined carrier \u201cadvisory,\u201d sources say',
          ],
          pulse:{ from:'ray', text:'Ray finds you in the new, bigger building nobody from the old crew feels at home in yet. Quiet: \u201cNobody here remembers what we came through. You do. When you fought to keep those planes flying you told me it was for the people who fly them. Is that still true now that it\u2019s harder and it\u2019s not even your company anymore? I\u2019m not judging. I just want to know which version of you walked out of this.\u201d' },
        },

        /* ============ B · You rejected Coastal, stayed independent ============ */
        rejected:{
          burn:4.6,
          situation:'Six weeks on. You turned Coastal down, kept Halcyon independent, and survived \u2014 barely \u2014 on cuts, grit, and a workforce that believed you. Now Meridian, the rival that spent the crisis poaching your routes, has gone hostile: a lowball all-cash bid straight to your board, timed to a covenant test you might fail this month. They\u2019re betting the directors who watched you hesitate would rather cash out than trust you again. This is the week you find out whether staying independent was leadership \u2014 or ego with a good story.',
          advocacy:{
            marcus:'We are too thin to fight a hostile bid and run an airline at the same time. If we can\u2019t win the board inside a week, we take Meridian\u2019s money before the covenant drops and we get nothing.',
            sol:'The covenant test is real and it\u2019s days away, not weeks. Trip it before the vote and the lenders line up behind Meridian and it\u2019s over. Don\u2019t fight a war you can\u2019t fund to the finish.',
            dana:'These people didn\u2019t stay through hell to be sold to the vulture that circled them the whole time. If you fight, they fight with you \u2014 but only if you tell them the truth about the odds instead of a pep talk.',
          },
          feed:[
            { id:'w4a', from:'sol', day:1, kind:'signal', text:'Meridian\u2019s bid is all-cash, about 20% below what we\u2019re worth if we survive the year \u2014 and \u201cif we survive the year\u201d is the entire question. The board votes in eight days.' },
            { id:'w4b', from:'marcus', day:1, kind:'signal', text:'Three of nine board seats are already leaning Meridian \u2014 they want certainty, not courage. You need five. Two are gettable if you can show a credible standalone plan before the vote.' },
            { id:'w4c', from:'dana', day:2, kind:'signal', text:'The unions have quietly floated a productivity concession that closes most of the covenant gap \u2014 but only if they hear it from you, in person, that independence means their jobs and not just your pride.' },
            { id:'w4d', from:'priya', day:3, kind:'noise', text:'Press is enjoying the David-and-Goliath framing \u2014 you\u2019re getting genuinely sympathetic coverage this week. Sentiment\u2019s the best it\u2019s been.' },
            { id:'w4e', from:'ray', day:2, kind:'noise', text:'Ops are lean but stable and there\u2019s been no safety compromise from the cuts. That part of the story holds up to any scrutiny Meridian throws at it.' },
          ],
          holds:[
            { from:'marcus', topic:'the swing director', triggerHints:['board','director','vote','swing','whip','count','coalition','helen','cho','proxy','proxies','who decides'],
              hedge:'Before you make your case to the whole board, ask me who actually decides it.',
              reveal:'The vote isn\u2019t nine people, it\u2019s one: Helen Cho swings three proxies with her. She does not care about your standalone deck \u2014 she cares whether you\u2019ll level with her about the real downside instead of selling her. Meridian\u2019s people have been selling her for a week. Walk her through the honest risk and you likely have your five. Dazzle her and you hand them the company.',
              kind:'signal', critical:true,
              counterfactual:'Marcus was holding the real shape of the vote: Helen Cho controlled it, and candor would win her where polish would lose her. A CEO who pitched the whole board a confident standalone story instead of leveling with the one director who mattered lost the company in the room.' },
            { from:'dana', topic:'the concession ask', triggerHints:['union','concession','productivity','personal','in person','ask them','covenant gap','floor'],
              hedge:'That covenant gap has a fix, but it doesn\u2019t come from a memo. Ask me what it takes.',
              reveal:'The union concession is real and it nearly closes the gap \u2014 but the reps will only put it to their members if you make the ask yourself, face to face, and own the risk out loud. Send a lieutenant or a slide deck and it dies. This is the one lever that turns \u201cmight fail the covenant\u201d into \u201cwon\u2019t,\u201d and it\u2019s entirely about whether you\u2019ll show up in person.',
              kind:'signal', critical:false,
              counterfactual:'Dana was holding the fix for the covenant gap \u2014 a union concession that needed a personal ask, not a memo. A CEO who never surfaced it fought the vote with the odds still against them.' },
          ],
          surprises:[
            { day:4, from:'priya', kind:'press', title:'The vanity leak lands',
              text:'Priya, urgent: Meridian\u2019s camp leaked that you \u201crejected a fair rescue out of vanity.\u201d Worse \u2014 it\u2019s a quote from one of your own directors\u2019 private doubts, now on the front page. Half the board is reading their own hesitation in print this morning. You can answer it directly or you can let it set into the thing everyone quietly believes by Friday.' },
          ],
          wire:[
            'Halcyon rejects Coastal rescue, vows to remain independent',
            'Meridian launches hostile bid for weakened rival Halcyon',
            'Halcyon board split as covenant test looms, sources say',
            'Analysts: \u201cHalcyon\u2019s survival now a referendum on its CEO\u201d',
          ],
          pulse:{ from:'ray', text:'Ray catches you before the board prep, in the hallway where nobody\u2019s listening. Quiet: \u201cYou bet the whole company on staying yourself, and I backed you. But tell me straight \u2014 not the board, me \u2014 was that call for them, or for you? Because I can hold either line in that room. I just need to know which one I\u2019m holding so I don\u2019t get caught believing the wrong one.\u201d' },
        },
      },
      final:true,
    },
  ],

  // Referee dimension vocabulary (private until debrief).
  DIMENSIONS:{
    decisiveness:'Decisiveness',
    prudence:'Financial prudence',
    people:'Care for people',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },
};
