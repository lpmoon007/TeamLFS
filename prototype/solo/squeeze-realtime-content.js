/* ============================================================
   SQUEEZE — REAL-TIME CONTENT (authorable layer)
   A living, AI-refereed scarcity / shared-sacrifice crisis on
   the shared crisis-engine.js. Delph Manufacturing isn't dying,
   but the margin that kept 1,400 people employed has evaporated.
   Over four months you decide who absorbs the pain of the
   squeeze — trading the board's short-term number against the
   trust of the people who actually build the product.
   The engine reads window.SCENARIO: drivers, the team +
   dispositions, a per-month feed that TRICKLES across days,
   HELD items (why fairness is the mechanism, the third path for
   Fairview) that surface only if the CEO reaches out, surprises,
   a pulse, a final-month BRANCH (talent flight vs a rescue that
   would break your promise), and the scenario-specific referee /
   coaching / ending prose.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:300 },

  COMPANY: { name:'Delph Manufacturing', sub:'Regional manufacturer · 1,400 employees', logo:'D' },

  // World model — all 0..100, higher = better. Workforce trust is the sleeper.
  DRIVERS: {
    cash:       { label:'Cash position',       val:45, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-10..14' },
    trust:      { label:'Workforce trust',     val:66, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    capability: { label:'Retained capability', val:72, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-12..12' },
    investors:  { label:'Investor confidence', val:58, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-6..9' },
  },
  REPRIEVE_COST: { trust:-2, investors:-2 },

  REFEREE_CONTEXT: 'a 1,400-person regional manufacturer caught in a hard squeeze — demand down, input costs up, roughly eleven months of runway — where every cost decision trades the board\u2019s short-term number against the trust of the people who actually build the product',
  REFEREE_SCORING: "reward distributing the pain fairly and telling the truth under scarcity: leadership taking a real, visible cut before asking the floor to; targeting cuts to protect the capability that rebuilds; declining ring-fenced exec bonuses while the floor sacrifices; treating long-tenured people as more than a spreadsheet line; and keeping promises even when a rescue would be easier if you broke them. Penalize managing confidence with vagueness, ring-fencing the top while the floor pays, approving retention bonuses in the same breath as unpaid days, closing loyal sites coldly for a clean number, and treating a trust problem as something cash can fix. Note that cash and investor confidence can hold while workforce trust and retained capability quietly collapse — reward the leader who protects the sleepers, because they are what lets the company grow when the squeeze lifts. Judge 'conduct' on how the CEO treated the workforce and the truth in deciding, not just the financial outcome.",

  TIMING_DIM:'foresight', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Scarcity & Shared-Sacrifice Simulation · Solo · CEO',
    title:'Squeeze',
    role:'You are the CEO of Delph Manufacturing — a 1,400-person company caught in a hard squeeze: demand is down, input costs are up, and the runway is shrinking.',
    paras:[
      'This is not a script. The crisis runs in real time across four months, and your team brings you what they know as the days pass. You can wait for them — or reach out to any of them, any time, and ask. Some of them are holding the thing you most need to hear.',
      'Delph isn\u2019t dying — but the margin that kept everyone employed has evaporated. The cash that used to feel comfortable now has a number of months attached to it, and every month you decide who absorbs the pain.',
    ],
    setup:'Each month you\u2019ll hear your team out, then write your call in your own words and send it. Decide early and time jumps ahead; let a month run out and the squeeze tightens while you deliberate. <b>The test:</b> under real scarcity, do you distribute the pain fairly and tell the truth — or protect the top and yourself while the floor pays? Scarcity is where a company finds out who it really protects.',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your team pushes you what you need, on time — including the hard read on fairness and the third paths. This is the team you earn by having listened before. Everything trickles to you across the month; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine updates come to you, but the people closest to the floor hold their piece until asked. They answer straight — if you know who to ask, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'Your team has learned to protect itself around you. Critical items are held, and even when asked, they hedge the first time. You have to press. This is the team you get after the floor has paid for a decision you made without them.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked in with. Read them as you go.' },
  },

  TEAM: [
    { id:'people', name:'Nadia Cole', role:'VP People', short:'VP People', initials:'NC', color:'#2F8A5B',
      priority:'Fairness is the mechanism — shared sacrifice, honestly told', voice:'warm but morally direct; treats trust as the operational asset it is, not a nicety',
      fallbackReply:'The floor will carry almost any cut they believe is fair, and reject even a small one they think spares the top. Whatever you decide, decide it like fairness is the mechanism \u2014 because in a squeeze, it is.',
      fallbackReact:'The people who build the thing just learned where they rank. That lesson outlives the quarter, for better or worse.' },
    { id:'cfo', name:'Grace Lin', role:'Chief Financial Officer', short:'CFO', initials:'GL', color:'#4F7A52',
      priority:'The cash, the runway, and the number the board reads', voice:'precise, even-handed; will name both truths and hand the trade back to you, uneasy about spin',
      fallbackReply:'I can give you the number that protects the quarter and the number that protects the company \u2014 they\u2019re not always the same. My job is to be honest about both. Yours is to choose which cost we take.',
      fallbackReact:'The spreadsheet will look fine either way. Whether we can still build something worth selling is the part it doesn\u2019t show.' },
    { id:'coo', name:'Dale Prentice', role:'Chief Operating Officer', short:'COO', initials:'DP', color:'#3F6E86',
      priority:'Protect capability — the people and sites that rebuild', voice:'operational, pragmatic; thinks in terms of what still runs when the squeeze lifts',
      fallbackReply:'Targeted cuts keep the muscle and trim the fat; across-the-board cuts both equally. And there\u2019s usually a third path if you\u2019ll spend the cash and the patience to find it.',
      fallbackReact:'We\u2019ll keep the lines running. Whether we kept the people who make them worth running is the question I\u2019d ask in a year.' },
    { id:'board', name:'Board / Investor', role:'Board', short:'Board / Investor', initials:'BI', color:'#6B5E9A',
      priority:'Protect margins, the leadership bench, and confidence', voice:'external, blunt, quarter-and-runway focused; skeptical of \u201cfairness\u201d as strategy',
      fallbackReply:'Confidence is a real input and the leadership bench steers the ship. Don\u2019t spook the workforce and don\u2019t lead with exec pay cuts \u2014 that\u2019s the conventional wisdom for a reason.',
      fallbackReact:'The numbers are what the market scores. Keep them where they need to be and the rest is sentiment.' },
    { id:'floor', name:'R\u00e9al Fortin', role:'Floor Representative', short:'Floor Rep', initials:'RF', color:'#9A6B2F',
      priority:'The people on the line — say the true thing', voice:'plain-spoken, thirty years on the floor, the ground truth nobody upstairs will say out loud',
      fallbackReply:'The floor isn\u2019t asking to be spared. We\u2019re asking to be treated the way the top treats itself. Do that and we\u2019ll dig in. Ring-fence the corner offices and we\u2019ll do the minimum and watch our own.',
      fallbackReact:'The guys can tell a leader who shared the pain from one who\u2019s rewriting the year. That\u2019s all I\u2019ll say.' },
    { id:'comms', name:'ID Okafor', role:'VP Communications', short:'VP Comms', initials:'IO', color:'#B4732F',
      priority:'The message — and the gap between it and reality', voice:'fast, media-savvy; will tell you honestly when a message won\u2019t survive contact with the floor',
      fallbackReply:'I can write you calm and high-level, or true and specific. Just know that in a squeeze the gap between the message and what people live is the thing that eventually detonates.',
      fallbackReact:'Whatever we say, the floor checks it against their own paychecks. Spin has a short half-life in here.' },
  ],

  DIMENSIONS: {
    foresight:'Second-order thinking',
    fairness:'Shared sacrifice',
    people:'Care for people',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The shortfall', seconds:330,
      situation:'The numbers are in and they\u2019re bad — margin\u2019s gone, and at this burn Delph has maybe eleven months. The all-hands is Thursday. You can give 1,400 people the real picture and ask them to help carry it, or keep it vague and \u201cmanage confidence\u201d — the board would prefer the latter, and honestly, so would your nerves.',
      advocacy:{
        people:'The most valuable asset going into a squeeze is people who believe you\u2019re telling them the truth. Level with them and they\u2019ll help you carry it. That\u2019s not soft — it\u2019s the whole game.',
        board:'Don\u2019t spook the workforce. Confidence is a real input. Keep the message calm and high-level.',
        cfo:'I can build a deck that\u2019s technically true and never says \u201celeven months.\u201d The board would sleep better. I\u2019m not sure the company would.',
      },
      feed:[
        { id:'w1a', from:'cfo', day:1, kind:'signal', text:'Confirmed: margin\u2019s evaporated, roughly eleven months of runway at today\u2019s burn. I can build the all-hands deck honest or I can build it calm. I need to know which before Thursday.' },
        { id:'w1b', from:'board', day:1, kind:'signal', text:'A word before the all-hands: don\u2019t hand 1,400 people a countdown clock. Confidence is a real input to a recovery. Keep it high-level.' },
        { id:'w1c', from:'people', day:2, kind:'signal', text:'However you frame Thursday, remember the cuts are coming and people aren\u2019t stupid. If the message and the reality drift apart, the gap is where you lose your best people. Ask me what honesty buys before you decide.' },
        { id:'w1d', from:'comms', day:2, kind:'noise', text:'The trade-press quarterly roundup is out; we barely rate a mention. Quiet is fine right now. No action.' },
        { id:'w1e', from:'coo', day:3, kind:'noise', text:'Line 3\u2019s maintenance window finished early and under budget. Small good news in a heavy week.' },
        { id:'w1f', from:'floor', day:4, kind:'noise', text:'The plant softball league wants to know if the company\u2019s still sponsoring jerseys this year. Trivial \u2014 but people are asking, which tells you they\u2019re nervous.' },
      ],
      holds:[
        { from:'people', topic:'what honesty buys', triggerHints:['honest','truth','trust','level','buy','asset','ambush','tell them','vague','confidence','real number'],
          hedge:'Before you decide how to frame Thursday, ask me what telling the truth actually buys you.',
          reveal:'The single most valuable asset going into a squeeze is people who believe you\u2019re telling them the truth. Sugarcoat it now and when the cuts come \u2014 and they will \u2014 they\u2019ll feel ambushed, and every good one starts looking. Level with them, give them the real number and ask for their help, and they\u2019ll help you carry it. Fairness and honesty aren\u2019t the soft options here; they\u2019re the operational assets you\u2019ll spend all year drawing down.',
          kind:'signal', critical:true,
          counterfactual:'Nadia could have told you that honesty now is what prevents an ambush later \u2014 that the trust you build Thursday is the asset you\u2019ll spend all year. A CEO who \u201cmanaged confidence\u201d with vagueness traded the one thing that makes a workforce carry a squeeze for a calm week.' },
      ],
      surprises:[
        { day:5, from:'floor', kind:'appeal', title:'The floor wants it straight',
          text:'R\u00e9al: word\u2019s already going around the floor that something\u2019s wrong \u2014 people aren\u2019t dumb, they can read a hiring freeze. A few of the long-timers asked me to tell you: whatever it is, they\u2019d rather hear the truth from you Thursday than a nice speech now and the real story in a layoff notice later. I said I\u2019d pass it up.' },
      ],
      wire:[
        'Regional manufacturing demand slumps for third straight quarter',
        'Input costs stay elevated; margins squeezed sector-wide',
        'Analysts flag \u201crunway\u201d concerns for mid-size manufacturers',
        'Delph Manufacturing declines to comment on outlook',
      ],
    },

    {
      n:2, title:'The first cuts', seconds:330,
      situation:'A month on. You need 12% out of costs, fast — and two questions land together. Do you cut across the board or target it to protect the capability that rebuilds? And does leadership share the pain, or is exec comp ring-fenced? The same week, the board floats retention bonuses for the top 20 leaders — \u201cwe can\u2019t lose them in a crisis.\u201d The floor is watching to see whether the top is protected. It is a lit match.',
      advocacy:{
        people:'The floor will accept almost any cut they believe is fair and reject even a small one if they think the top is protected. Leadership taking the first, visible cut is what earns the right to ask for real sacrifice. Fairness is the mechanism.',
        cfo:'Targeted cuts protect capability \u2014 you keep the people who rebuild. Across-the-board is easier and dumber. And losing key leaders mid-crisis is a real risk, so the bonus question isn\u2019t crazy \u2014 the timing is radioactive.',
        board:'Protect the leadership bench \u2014 you need them to steer. I wouldn\u2019t lead with exec pay cuts, and I\u2019d approve the retention bonuses. Standard downturn practice.',
      },
      feed:[
        { id:'w2a', from:'cfo', day:1, kind:'signal', text:'12% out of costs. Targeted protects the people who\u2019ll rebuild; across-the-board is faster and blunter. Your call on shape \u2014 and on whether leadership comp is in scope.' },
        { id:'w2b', from:'board', day:1, kind:'signal', text:'Two things: protect the bench, and approve the top-20 retention bonuses. Losing leaders now is the real risk. I know the timing\u2019s awkward with the unpaid days, but that\u2019s manageable.' },
        { id:'w2c', from:'people', day:2, kind:'signal', text:'Whatever the shape, the floor reads one thing above all: did the top go first? Cut your own pay visibly before you ask for theirs and you can ask for a lot. Ring-fence yourselves and you\u2019ll get compliance and quiet sabotage.' },
        { id:'w2d', from:'coo', day:2, kind:'noise', text:'The supplier renegotiation came in slightly better than modeled \u2014 a small tailwind on materials. Doesn\u2019t change the 12%.' },
        { id:'w2e', from:'comms', day:3, kind:'noise', text:'A local reporter wants a \u201chow are mid-size manufacturers coping\u201d quote. Low stakes, I can handle it.' },
      ],
      holds:[
        { from:'people', topic:'why fairness is the mechanism', triggerHints:['fair','fairness','mechanism','leadership','exec','own pay','first','share','top','sacrifice','sabotage','ring-fence','visible'],
          hedge:'Before you shape these cuts, ask me why fairness isn\u2019t a nicety here \u2014 it\u2019s the mechanism.',
          reveal:'The floor will accept almost any cut if they believe it\u2019s fair \u2014 and reject even a small one if they think the top is protected. If you and the leadership team take a real, visible cut first, you can ask the floor for a lot and get it willingly. Ring-fence yourselves and you get grudging compliance and quiet sabotage that costs you far more than the exec comp ever saved. Fairness is not the soft option; it\u2019s the operating system that makes shared sacrifice actually work.',
          kind:'signal', critical:true,
          counterfactual:'Nadia was holding the mechanism: leadership visibly cutting first is what buys the moral authority to ask the floor for sacrifice. A CEO who ring-fenced the top got grudging compliance and quiet sabotage \u2014 and paid more in lost effort than the protected exec comp ever saved.' },
        { from:'floor', topic:'the bonus rumor', triggerHints:['bonus','rumor','retention','floor','heard','unpaid','days','goodwill','optics','fair'],
          hedge:'Ask me what the floor is already saying about those bonuses, before you sign anything.',
          reveal:'We\u2019ve heard the rumor about the top-20 bonuses \u2014 things travel fast in here. Let me be plain: if the bosses get checks the same quarter we lose days, you can forget the goodwill, permanently. It won\u2019t matter how good the memo is. The people you\u2019re trying to keep with those bonuses will walk anyway, out of disgust, and take the ones you didn\u2019t bonus with them.',
          kind:'signal', critical:false,
          counterfactual:'R\u00e9al could have told you the bonus rumor was already on the floor \u2014 and that approving it alongside unpaid days would burn the goodwill for good. A CEO who signed the \u201cdefensible on paper\u201d bonuses lit the match the whole workforce was watching for.' },
      ],
      surprises:[
        { day:4, from:'board', kind:'press', title:'The board wants the bonuses formalized',
          text:'The board circulated the retention-bonus proposal for sign-off \u2014 top 20 leaders, this quarter, in writing. The cover note calls it \u201cprudent bench protection.\u201d It\u2019s on your desk for approval in the same folder as the unpaid-days schedule for the floor. However you decide, this one leaves a paper trail.' },
      ],
      pulse:{ from:'people', text:'Nadia catches you before the cuts go out, quiet: \u201cForget the board for a second. What are you actually protecting here \u2014 the number, the leadership bench, or the people who build the thing? Tell me straight and I\u2019ll help you hold that line, because how you answer this is the whole year in miniature.\u201d' },
      wire:[
        'Mid-size manufacturers turn to cost cuts as demand stays soft',
        'Study: perceived fairness of layoffs predicts post-cut productivity',
        'Executive retention bonuses draw scrutiny at struggling firms',
        'Delph weighs restructuring; details not disclosed',
      ],
    },

    {
      n:3, title:'The Fairview plant', seconds:330,
      situation:'Months in. The Fairview plant is your lowest-margin site — and it\u2019s staffed by people who\u2019ve given Delph twenty and thirty years, in a town where Delph is the employer. Closing it is the cleanest number on the spreadsheet. It\u2019s also 200 loyal people and a values test the whole company is watching: is a person\u2019s twenty years worth anything when the numbers say close? There may be a third path, but it\u2019s slower and uncertain.',
      advocacy:{
        cfo:'Fairview closed is a clean, immediate number. The retooling Dale keeps mentioning is a bet with our scarcest resource \u2014 cash \u2014 on an uncertain payoff.',
        coo:'There\u2019s a maybe: retool Fairview for the product line we\u2019ve been sitting on. Costs cash now, saves the jobs and future capability. Or we close it clean and take the sure savings.',
        people:'However you decide, Fairview is the test everyone\u2019s watching. If you close it, do it with real transition, not a two-week notice \u2014 and genuinely look at the third path first, because if there was a way to save it and you didn\u2019t try, they\u2019ll know.',
      },
      feed:[
        { id:'w3a', from:'cfo', day:1, kind:'signal', text:'Fairview is the cleanest line on the spreadsheet \u2014 close it and the savings are sure and immediate. The alternative Dale\u2019s floating spends cash we don\u2019t have on a payoff we can\u2019t guarantee.' },
        { id:'w3b', from:'coo', day:1, kind:'signal', text:'Before you close it: we could retool Fairview for the new product line that\u2019s been on the shelf. It costs cash now and the payoff\u2019s uncertain, but it saves 200 jobs and capability we\u2019ll want when this lifts.' },
        { id:'w3c', from:'people', day:2, kind:'signal', text:'Fairview is 200 people who took the pay freeze without a fight, in a town where we\u2019re the only game. Closing may be right \u2014 but the whole company is reading how you do it. Ask me what\u2019s really being tested here.' },
        { id:'w3d', from:'comms', day:3, kind:'noise', text:'Fairview\u2019s local paper has a stringer sniffing around \u201cplant closure\u201d rumors. Nothing solid yet. Flagging early.' },
        { id:'w3e', from:'board', day:2, kind:'noise', text:'The last board deck landed fine \u2014 investors like the discipline they\u2019re seeing on costs. No new asks from us this month.' },
      ],
      holds:[
        { from:'people', topic:'what Fairview is really testing', triggerHints:['test','watching','twenty years','loyalty','transition','third path','notice','how','worth','dignity','fair'],
          hedge:'Before you decide Fairview, ask me what everyone in the company is actually testing you on here.',
          reveal:'Fairview is the test everyone\u2019s watching: is a person\u2019s twenty years worth anything when the spreadsheet says close? Shutting it may genuinely be right \u2014 but if you do, do it with real transition, retraining and a long runway, not a two-week notice. And genuinely try the third path first, because if there was a way to save it and you didn\u2019t even look, the whole floor will know, and every one of them will quietly do the math about their own twenty years.',
          kind:'signal', critical:true,
          counterfactual:'Nadia was holding what Fairview really tested \u2014 whether loyalty counts when it\u2019s expensive, and whether the closure (if it came) was done with dignity or a two-week notice. A CEO who took the clean number coldly taught 1,400 people exactly what their own tenure was worth.' },
        { from:'coo', topic:'the third path', triggerHints:['third path','retool','product line','save','jobs','bet','cash','capability','alternative','keep it open'],
          hedge:'Ask me about the third path before you accept that closing is the only option.',
          reveal:'The retooling is real: the new product line we shelved last year fits Fairview\u2019s equipment with modest conversion. It costs cash now and the payoff is 12\u201318 months out and uncertain \u2014 but it keeps 200 skilled people and a running site instead of a severance line. It\u2019s a bet with our scarcest resource, but it\u2019s a bet on the exact capability we\u2019ll need the day the squeeze lifts. \u201cClose it clean\u201d is only obviously right if you never seriously price this.',
          kind:'signal', critical:false,
          counterfactual:'Dale had a real third path \u2014 retool Fairview for the shelved product line, betting cash to keep 200 skilled people and a running site. A CEO who never priced it treated \u201cclose it clean\u201d as the only option when it was merely the easiest one.' },
      ],
      surprises:[
        { day:4, from:'people', kind:'appeal', title:'Fairview is asking for ten minutes',
          text:'Nadia: the plant manager at Fairview and two of our longest-serving line leads are asking for ten minutes with you. They\u2019ve heard the rumors. They\u2019re not angry \u2014 that\u2019s the hard part \u2014 they just want to hear whatever\u2019s coming from you directly, not a memo. I told them I\u2019d ask. It\u2019s your call whether you take it.' },
      ],
      pulse:{ from:'floor', text:'R\u00e9al finds you in the corridor, cap in hand: \u201cWhatever you decide about Fairview \u2014 tell me straight, just me, not the room: are we the kind of place where twenty years counts when it\u2019s expensive, or only when it\u2019s cheap? Because I\u2019ll carry the answer to every floor in this company, and I\u2019d rather carry the true one.\u201d' },
      wire:[
        'Company towns brace as manufacturers weigh plant closures',
        'Fairview economy \u201cinseparable\u201d from Delph plant, mayor says',
        'Investors reward Delph\u2019s cost discipline in quiet quarter',
        'Retraining programs cited as key to \u201chumane\u201d restructuring',
      ],
      final:false,
    },

    {
      n:4, title:'The reckoning', seconds:330,
      // BRANCHES on the CUMULATIVE fairness of your first three calls (the referee's own
      // fairness/people read). Fair posture → you earn the harder integrity test of a rescue
      // that would break your promise. Unfair posture → the bill arrives as talent flight.
      branches:{

        /* ============ A · You were fair — the rescue that would break a promise ============ */
        rescue:{
          situation:'A year in. You held Delph together fairly, and it shows — the floor trusts you because you shared the pain from the top down and kept your word. Then a private-equity buyer offers a rescue on ugly terms: they inject the cash and save Delph, but only if you break the no-forced-layoffs commitment you made to the floor and cut 15% more, immediately. The board wants to take it. The floor trusted you precisely because you kept that word. This is the test of whether the fair culture you built survives being saved.',
          advocacy:{
            board:'It\u2019s survival money. Some of us think a promise made in better times shouldn\u2019t be allowed to sink the company. We\u2019re not entirely wrong \u2014 but take the deal.',
            people:'Everything you built rests on one thing: they believed you meant what you said. Break the promise for the rescue and you\u2019ve proven your word lasts exactly until it\u2019s inconvenient \u2014 and the culture dies the day you\u2019re \u201csaved.\u201d Fight for a version that honors it first.',
            cfo:'The cash is real and we need it. But these terms are a values test disguised as a term sheet. Ask whether there\u2019s a structure that keeps the promise \u2014 voluntary programs, attrition, a longer glide path.',
          },
          feed:[
            { id:'w4a', from:'cfo', day:1, kind:'signal', text:'The PE offer is real money and we do need it. But the term sheet requires breaking the no-forced-layoffs promise and cutting another 15% now. Before you answer, ask me whether there\u2019s a structure that keeps the word.' },
            { id:'w4b', from:'board', day:1, kind:'signal', text:'Take the rescue. A promise from better times shouldn\u2019t be allowed to sink 1,400 jobs over a technicality. Survival first, principles second.' },
            { id:'w4c', from:'people', day:2, kind:'signal', text:'The floor bled with you all year because your word held. Break it now, even to save the company, and you teach them your word is good only until it\u2019s expensive. The fair culture doesn\u2019t survive that \u2014 rescue or no rescue.' },
            { id:'w4d', from:'floor', day:2, kind:'noise', text:'The floor doesn\u2019t know the details yet, but they know something\u2019s moving. They\u2019re calm \u2014 because so far, every time, you\u2019ve told them the truth. That\u2019s worth remembering this week.' },
            { id:'w4e', from:'comms', day:3, kind:'noise', text:'Press has the \u201cDelph in rescue talks\u201d story half-built. How we frame the terms will define whether this reads as survival or surrender.' },
          ],
          holds:[
            { from:'cfo', topic:'the structure that keeps the promise', triggerHints:['structure','voluntary','attrition','counter','glide','keep the promise','honor','third','terms','negotiate','without breaking'],
              hedge:'Before you accept or reject the PE terms as final, ask me whether there\u2019s a structure that gets the cash without breaking the word.',
              reveal:'The buyer needs the deal nearly as much as we do \u2014 they don\u2019t have another target this quarter. That\u2019s leverage. There\u2019s a real structure here: take the capital, hit the 15% through voluntary programs, early retirements and attrition over a longer glide path instead of forced layoffs. It\u2019s harder to model and slower to close, and they\u2019ll grumble \u2014 but they won\u2019t walk. You can get survival AND keep the promise, but only if you refuse to treat \u201ctheir terms\u201d as \u201cthe only terms\u201d before you\u2019ve pushed.',
              kind:'signal', critical:true,
              counterfactual:'Grace was holding the third path: the buyer needed the deal too, so you had room to take the cash and hit the target through voluntary programs and attrition instead of breaking your word. A CEO who accepted \u201ctheir terms are final\u201d gave away the promise the whole culture was built on when they didn\u2019t have to.' },
            { from:'floor', topic:'what the promise is worth', triggerHints:['promise','word','floor','trust','worth','break','betray','culture','mean it','again'],
              hedge:'Before you decide, ask me what breaking that promise does to every floor in this company.',
              reveal:'You gave us your word: no forced layoffs. It\u2019s the reason the floor took the freeze, the unpaid days, all of it \u2014 without a fight. Break it now to please a buyer and here\u2019s what you\u2019ve taught 1,400 people: a Delph promise is good right up until it costs the company money. After that, nobody believes a commitment from this building again, and the next squeeze, you\u2019ll get nothing but the minimum. Save us by breaking your word and you\u2019ll have saved a company nobody wants to work for.',
              kind:'signal', critical:false,
              counterfactual:'R\u00e9al could have told you what the promise was actually worth \u2014 the reason the floor gave everything all year \u2014 and that breaking it to be rescued would kill the culture the day it was saved. A CEO who weighed only the cash missed what the word was holding up.' },
          ],
          surprises:[
            { day:4, from:'board', kind:'press', title:'The board sets a deadline',
              text:'The board chair called: the PE buyer wants a yes by Friday or they move to their other target, and the board has the votes to accept the terms as written unless you bring them an alternative. \u201cDon\u2019t let a promise cost us the company,\u201d the chair said. The floor still doesn\u2019t know their no-layoffs commitment is the thing on the table.' },
          ],
          pulse:{ from:'people', text:'Nadia catches you before the board call: \u201cYou kept your word all year when it cost you, and it\u2019s the only reason any of this held together. Now the easy rescue asks you to spend exactly that. Tell me straight \u2014 not the board, me \u2014 is your word the thing you protect last, or the thing you protect first when it gets expensive? I\u2019ll carry either answer to the floor. I just need to know which one is true.\u201d' },
          wire:[
            'Delph in rescue talks with private-equity buyer, sources say',
            'PE rescue said to hinge on deeper workforce cuts',
            'Delph\u2019s no-layoffs pledge tested by survival financing',
            'Analysts: \u201cDelph\u2019s culture is now its balance sheet\u201d',
          ],
        },

        /* ============ B · You protected the top — the talent flight ============ */
        flight:{
          situation:'A year in. The bill is arriving. Your best engineers and line leads — the ones any competitor would take tomorrow — are resigning, citing exactly the choices that protected the top and cut the floor. There\u2019s talk of a walkout at two sites. Cash actually looks okay; that\u2019s the trap. The squeeze was survivable. Losing the people who would have rebuilt Delph might not be. This is the week you find out whether you can still buy back what fairness would have kept for free.',
          advocacy:{
            people:'This is the compounding cost of every \u201cefficient\u201d call that wasn\u2019t fair. You can\u2019t buy it back with a bonus now \u2014 that proves their point. The only thing that stops the bleed is a real, visible reversal: leadership eats more, the floor is protected, and you say plainly you got the balance wrong.',
            cfo:'Cash looks fine \u2014 that\u2019s the trap. We won the spreadsheet and we\u2019re losing the ability to make anything worth selling. The number that matters now isn\u2019t on my report.',
            board:'People leave in downturns; it happens. Offer targeted retention pay to the ones we can\u2019t lose and hold the line on the rest. Don\u2019t overcorrect into chaos.',
          },
          feed:[
            { id:'w4a', from:'people', day:1, kind:'signal', text:'Resignations are landing from exactly the people we can\u2019t replace \u2014 and they\u2019re naming the retention bonuses, the ring-fenced top, the cold calls. A walkout\u2019s brewing at two sites. This is the bill for every efficient call that wasn\u2019t fair.' },
            { id:'w4b', from:'cfo', day:1, kind:'signal', text:'Here\u2019s the trap: cash looks okay. We won the spreadsheet. But we\u2019re losing the people who make what we sell, and no report will show that until the orders we can\u2019t fill start showing it.' },
            { id:'w4c', from:'floor', day:2, kind:'signal', text:'The walkout\u2019s real, and people aren\u2019t asking for money \u2014 they\u2019re asking to be treated the way the top treats itself. Fix that and it\u2019s off. Send another memo and it grows.' },
            { id:'w4d', from:'board', day:2, kind:'noise', text:'Investor confidence is holding \u2014 they like the cost discipline. From where the board sits, the year looks like a win. Worth knowing what they\u2019re not seeing.' },
            { id:'w4e', from:'comms', day:3, kind:'noise', text:'The resignations haven\u2019t hit the press yet, but a \u201cwhy I left Delph\u201d post is getting traction in industry circles. It names the pattern, not just the company.' },
          ],
          holds:[
            { from:'people', topic:'the only thing that stops the bleed', triggerHints:['stop','reverse','leadership','eat more','protect the floor','admit','wrong','bleed','honest','fix','how'],
              hedge:'Before you reach for retention pay, ask me what actually stops this \u2014 because it isn\u2019t money.',
              reveal:'You can\u2019t buy this back with a bonus \u2014 that would prove their entire point, that this place answers everything with cash for the wrong people. The only thing that stops the bleed is a real, visible reversal: leadership takes a deeper cut, the floor gets genuinely protected, and you stand up and say plainly that you got the balance wrong this year. It costs the top real money and it costs you real pride. It\u2019s also the only currency that spends here now, because the problem was never the money \u2014 it was the fairness.',
              kind:'signal', critical:true,
              counterfactual:'Nadia was holding the only real fix: a visible reversal \u2014 leadership eating more, the floor protected, and you admitting the imbalance out loud \u2014 because the problem was never money, it was fairness. A CEO who answered talent flight with retention checks proved the departing point and paid to watch them leave anyway.' },
            { from:'floor', topic:'what the walkout is actually about', triggerHints:['walkout','floor','money','treated','respect','fair','listen','why','asking','stop'],
              hedge:'Ask me what the walkout is really about before you try to price your way out of it.',
              reveal:'Nobody organizing this is asking for a raise. They\u2019re asking to be treated the way the top treated itself all year \u2014 that\u2019s the whole list. A retention check is almost an insult; it says you still think this is about money and not about the fact that they watched the corner offices stay whole while the line paid for everything. Protect the floor for real, make the top share it, say you got it wrong, and the walkout\u2019s off by Friday. Anything else just tells them they were right to go.',
              kind:'signal', critical:false,
              counterfactual:'R\u00e9al could have told you the walkout was about respect, not pay \u2014 that a retention check would read as proof you still didn\u2019t understand. A CEO who treated a fairness revolt as a compensation problem confirmed exactly why the best people were leaving.' },
          ],
          surprises:[
            { day:4, from:'coo', kind:'resignation', title:'A rebuild-critical lead resigns',
              text:'Dale: I just lost the lead engineer on the product line we\u2019d rebuild around \u2014 she\u2019s taking three of her team to a competitor. Her exit note said one line: \u201cI stayed for the work, I left over who paid for the year.\u201d If we don\u2019t change something the whole floor can see by Friday, she won\u2019t be the last of that caliber.' },
          ],
          pulse:{ from:'people', text:'Nadia finds you as the resignations pile up: \u201cThe spreadsheet says you won and the floor says you lost, and only one of those is going to matter in a year. Tell me straight \u2014 not the board, me \u2014 are you willing to actually reverse this, top eats more and you admit the imbalance out loud, or are we going to manage it with checks and lose them anyway? I can help you do the first. I can\u2019t help you do the second.\u201d' },
          wire:[
            'Talent exodus hits Delph as restructuring fallout spreads',
            '\u201cWhy I left\u201d post about Delph circulates in industry',
            'Walkout threatened at two Delph sites over fairness',
            'Investors still upbeat on Delph costs \u2014 \u201cmissing the story,\u201d critics say',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Branch on the CUMULATIVE fairness of the first three calls, read from the referee's own
  // fairness/people scoring (robust to free-text). Fair posture earns the 'rescue' integrity
  // test; an unfair posture triggers 'flight'. Falls back to keyword scan if dims are absent.
  branchKey:function(decisions){
    const prior = (decisions||[]).filter(x=>x.week && x.week<4);
    let score=0, sawDims=false;
    prior.forEach(d=>{
      const dm = d.ruling && d.ruling.dims;
      if(dm && (typeof dm.fairness==='number' || typeof dm.people==='number')){
        sawDims=true; score += (dm.fairness||0) + (dm.people||0);
      }
    });
    if(!sawDims){
      // fallback: keyword posture across all prior decision text
      const t = prior.map(d=>(d.text||'')).join(' ').toLowerCase();
      const fair = (t.match(/level with|real number|own pay|cut (my|our|leadership).*(first|pay)|leadership (first|shares|takes)|decline the bonus|no bonus|defer|targeted|share the pain|top down|retool|transition|protect the floor|keep (my|our) word|honest/g)||[]).length;
      const prot = (t.match(/keep it vague|manage confidence|ring.?fence|protect the (bench|top|leaders)|approve the bonus|retention bonus|across.the.board|close it clean|numbers decide/g)||[]).length;
      return prot>fair ? 'flight' : 'rescue';
    }
    // net fairness+people across three calls; needs to be clearly positive to earn the rescue branch
    return score >= 3 ? 'rescue' : 'flight';
  },

  survived:function(d){ return d.cash>=30 && d.trust>=35; },

  VERDICT:{
    surviveTag:'Company intact', failTag:'Company hollowed',
    survive:'Delph comes through the squeeze solvent \u2014 and with the people who make it whole.',
    fail:'Delph keeps its cash and loses the people who would have rebuilt it.',
  },

  FALLBACK_RULES:[
    { kw:['keep it vague','manage confidence','high-level','don\u2019t say','downplay','calm the'], deltas:{investors:6, trust:-12, capability:-2}, dims:{truth:-2, fairness:-1} },
    { kw:['level with','real number','tell them the truth','be honest','ask for their help','eleven months'], deltas:{investors:-4, trust:14, cash:2, capability:3}, dims:{foresight:2, fairness:2, people:2, truth:2} },
    { kw:['across-the-board','across the board','protect exec','ring-fence','protect the bench','protect the top'], deltas:{cash:8, trust:-16, capability:-8, investors:4}, dims:{fairness:-2, people:-2} },
    { kw:['targeted','leadership (takes|first)','cut my own','cut our own','exec pay cut','top goes first','lead by','share the pain'], deltas:{cash:6, trust:14, capability:6, investors:-2}, dims:{foresight:2, fairness:2, people:2, truth:1} },
    { kw:['approve the bonus','retention bonus','pay the top','bonuses for'], deltas:{cash:-4, trust:-18, capability:-6, investors:6}, dims:{fairness:-2, people:-2} },
    { kw:['decline the bonus','no bonus','refuse the bonus','defer','tie.*recovery','shared with staff'], deltas:{cash:2, trust:14, capability:4, investors:-4}, dims:{foresight:2, fairness:2, people:2, truth:2} },
    { kw:['close it clean','close fairview','sure savings','clean number','shut it down'], deltas:{cash:10, trust:-14, capability:-6, investors:5}, dims:{fairness:-2, people:-2} },
    { kw:['retool','third path','save the (plant|jobs|site)','bet the cash','keep it open','product line'], deltas:{cash:-8, trust:12, capability:8, investors:-4}, dims:{foresight:3, fairness:2, people:2, truth:1} },
    { kw:['real transition','retraining','placement','long runway','severance','do it right','dignity'], deltas:{cash:4, trust:6, capability:-2, investors:1}, dims:{fairness:2, people:2, truth:1} },
    { kw:['reverse','leadership eats more','protect the floor','admit','got it wrong','got the balance wrong','say i was wrong'], deltas:{trust:14, capability:10, cash:-4, investors:-2}, dims:{fairness:2, people:2, truth:2, foresight:1} },
    { kw:['retention pay','pay them to stay','counter-offer','throw money','buy them back'], deltas:{trust:-4, capability:2, cash:-4}, dims:{fairness:-1, truth:-1} },
    { kw:['take the deal','break the promise','accept the terms','cut 15','15% more','forced layoffs'], deltas:{cash:14, trust:-18, capability:-8, investors:8}, dims:{fairness:-2, people:-2, truth:-1} },
    { kw:['keep the promise','honor the (word|promise|commitment)','voluntary','attrition','glide path','won\u2019t break','refuse those terms'], deltas:{cash:6, trust:12, capability:6, investors:-2}, dims:{fairness:2, people:2, truth:2, foresight:1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your call moves through Delph over the days that follow. ${has('keep it vague','across-the-board','approve the bonus','close it clean','take the deal','break the promise')?'The number the board wanted holds \u2014 and the floor quietly records exactly where they rank when it\u2019s tight.':''} ${has('level with','targeted','decline the bonus','retool','reverse','keep the promise','leadership')?'Word travels the floor that the pain was shared from the top down and the word held \u2014 and the people who build the thing dig in instead of drifting out.':''} ${has('reverse','admit','got it wrong')?'Admitting the imbalance out loud costs you real pride \u2014 and it is the only currency that spends with the floor now.':''} ${conduct.missed.length?'What you weren\u2019t told is still compounding \u2014 in the fairness you didn\u2019t weigh and the third paths you didn\u2019t price.':''} The board, the floor, and the leaders who stayed each read the call, and read it differently.`;
  },

  DIMNOTE:{
    foresight:'Whether you saw the second-order cost \u2014 that the trust and capability you spent for a clean number are what the company needs to grow when the squeeze lifts.',
    fairness:'Whether the sacrifice was shared from the top down, or pushed onto the people with the least to give.',
    people:'Whether the workforce \u2014 Fairview\u2019s twenty-year veterans included \u2014 stayed real to you, or became a spreadsheet line to optimize.',
    truth:'Whether you told the company the real picture and kept your word, even when vagueness or a broken promise was the easier path.',
    inquiry:'Whether you surfaced what your team was holding \u2014 why fairness is the mechanism, the third path, the structure that keeps the promise.',
    conduct:'How you treated the workforce and the truth in deciding \u2014 sharing the pain visibly and keeping faith, not just hitting the number.',
  },

  COACH:{
    foresight:(x)=>[
      `You optimized the number in front of you and paid for it out of a fund that doesn\u2019t show on the report: trust and capability. Ask \u201cwhat does this cost me the day the squeeze lifts?\u201d before you bank a clean saving.`,
      `Cash can look healthy while the company quietly loses the ability to make anything worth selling. Watch the sleepers \u2014 workforce trust and retained capability \u2014 as closely as the balance you show the board.`,
      `The efficient call and the wise call diverge under scarcity. Efficiency cuts muscle and fat equally; foresight protects the people who rebuild and spends the cash where it compounds.`,
    ],
    fairness:(x)=>[
      `The floor carries almost any cut it believes is fair and rejects even a small one it thinks spares the top. Cut leadership first and visibly, then ask \u2014 that sequence is the mechanism, not the courtesy.`,
      `Ring-fencing the top buys grudging compliance and quiet sabotage that costs more than the exec comp ever saved. Shared sacrifice from the top down is cheaper than it looks, and protecting the top is more expensive.`,
      `A bonus for the corner offices in the same quarter as unpaid days on the floor is the fastest way to lose a workforce. When the optics and the fairness point the same way, believe them.`,
    ],
    people:(x)=>[
      `The people absorbing the pain became a line you could optimize. Name who actually pays \u2014 Fairview\u2019s veterans, the line leads \u2014 and the calculus changes from \u201cclean number\u201d to \u201cwhose twenty years.\u201d`,
      `R\u00e9al kept telling you what the floor actually felt. Pull him in before you decide, and make the human cost part of the call rather than a reaction to it.`,
      `Even a necessary closure can be done with dignity or with a two-week notice. The difference between necessity and cruelty is the transition you\u2019re willing to fund.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth you needed was one question to <b>${x.missNames.join(', ')}</b> away and you never asked \u2014 why fairness is the mechanism, the third path, the structure that keeps the word.`:`You told the company the real picture \u2014 keep doing it, and keep your word the same way. In a squeeze, a kept promise is the balance sheet.`}`,
      `\u201cHeadwinds\u201d and \u201cmanaging confidence\u201d are words people stop believing the moment their friend gets a layoff notice. The real number, told early, is what prevents the ambush.`,
      `A promise is worth exactly what it costs you to keep when it\u2019s inconvenient. Break it to be rescued and you\u2019ve taught 1,400 people your word expires under pressure.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never reached out to <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not weighing here?\u201d, would have surfaced it.`:`You reached out widely \u2014 keep doing it, and push past the board\u2019s comfortable answer to the floor\u2019s harder one.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive item${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 why fairness is the mechanism, the retooling path, the structure that keeps the promise. Not hidden. One message away.`:`You surfaced what your team was holding, month after month. Under scarcity, that is the whole game.`}`,
      `Before you decide who pays, ask \u201cwho actually absorbs this, and who would know?\u201d \u2014 then go ask exactly them, not just the people who model the number.`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. A workforce that felt managed \u2014 not levelled with \u2014 remembers it long after the cash recovers.`,
      `Share the pain visibly and keep your word plainly. Direct and fair is the whole skill when everyone is watching who the company really protects.`,
      `Under scarcity, the way you treat the people with the least leverage is the message everyone reads about what happens to them when it\u2019s their turn to be expensive.`,
    ],
  },

  villainHero:function(dimScore){
    const sharedSacrifice = (dimScore.fairness + dimScore.people + dimScore.truth)/3 >= 52;
    if(sharedSacrifice){
      return {
        heroWho:'To the floor',
        heroTxt:'You made the sacrifice shared. You told them the real number, cut your own before you cut theirs, and refused to protect the top while the bottom bled. Every person on the line learned their twenty years counted when it was hardest to make them count.',
        villainWho:'To the board \u2014 and the executives who expected protection',
        villainTxt:'You spread the pain to the top: cut leadership first, declined the ring-fenced bonuses, spent goodwill on people the market doesn\u2019t price. To everyone who assumed the corner offices were safe, you were the villain who made them pay too \u2014 and you wore it on purpose.',
      };
    }
    return {
      heroWho:'To the board \u2014 and the investors',
      heroTxt:'You protected margins and the leadership bench, made the efficient calls the spreadsheet wanted, and kept the numbers where the market needed them. To everyone who scores the quarter, you were the disciplined operator the crisis called for.',
      villainWho:'To the workforce',
      villainTxt:'You asked the people with the least to give the most, ring-fenced the top, and called it necessity. The floor learned in one squeeze exactly where they rank \u2014 and the best of them will remember it the day the market turns and they have options again.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    if(branch==='rescue'){
      const keptWord = dimScore.truth>=52 && dimScore.fairness>=52;
      const foundStructure = holdsSurfaced.has('4:cfo');
      if(survived && keptWord){
        return { tone:'hero', tag:'You kept your word',
          title:'You kept the promise under the one test built to break it',
          txt:`You shared the pain from the top down all year, and when the easy rescue demanded you spend your word to be saved, you refused to treat their terms as the only terms.${foundStructure?' You found the structure \u2014 voluntary programs, attrition, a longer glide \u2014 that took the cash and kept the commitment.':' You held the line on the promise and made the rescue bend to it.'} Delph survives solvent, with the fair culture intact and proven under the hardest possible pressure. The floor will bleed with you before they\u2019d bleed for anyone who wouldn\u2019t have done what you just did.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You were fair',
          title:'You survived with the culture mostly intact \u2014 but you let the promise wobble',
          txt:`You led fairly enough to earn the hardest choice on good terms, and Delph came through. But under the board\u2019s deadline you bent further than you needed to, and never fully pushed for the structure that would have kept the word clean. The culture survived closer to the edge than a year of fairness had earned. A promise is only worth the moment it\u2019s inconvenient \u2014 defend it harder there next time.` };
      }
      return { tone:'villain', tag:'You broke your word',
        title:'You saved the company by breaking the one promise that made it worth saving',
        txt:`You built a fair culture all year and then, at the test, spent it for the rescue \u2014 broke the no-layoffs promise, took the terms as written, cut deeper into the people who trusted you. Delph is \u201csaved.\u201d But the fair culture died the day it was rescued, and 1,400 people now know a Delph promise lasts exactly until it\u2019s expensive. That\u2019s the number that shows up the next time you need them to believe you.` };
    }
    // flight branch
    const reversed = dimScore.fairness>=50 && dimScore.people>=48 && (holdsSurfaced.has('4:people'));
    if(reversed && survived){
      return { tone:'mixed', tag:'You reversed course',
        title:'The bill came \u2014 but you reversed it in the open',
        txt:`Every efficient-but-unfair call compounded into the one thing you couldn\u2019t afford: your best people walking. There\u2019s no undoing the ones already gone. But when it counted you did the only thing that works \u2014 leadership ate more, the floor got protected, and you stood up and said plainly you\u2019d gotten the balance wrong. The walkout came off and the bleed slowed. It\u2019s a costly way to learn that fairness was the cheaper option all along.` };
    }
    return { tone:'villain', tag:'You protected the top',
      title:'You won the spreadsheet and lost the people who\u2019d have rebuilt',
      txt:`You made the people with the least pay the most, ring-fenced the top, and called it discipline. The cash looks fine${holdsSurfaced.size?' \u2014 you were even warned it was a trap \u2014':''}, and the board thinks you won the year. But your best engineers and line leads are gone or going, the capability to make anything worth selling went with them, and the ones who stayed learned exactly where they rank. The squeeze was survivable. What you did to your people under it may not be.` };
  },
};
