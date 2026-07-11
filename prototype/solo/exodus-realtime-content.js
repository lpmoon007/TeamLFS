/* ============================================================
   EXODUS — REAL-TIME CONTENT (authorable layer)
   A living, AI-refereed talent-paradox crisis, on the shared
   crisis-engine.js. Kai Renner is the most brilliant person at
   Lumen — and the reason its best people are quietly leaving.
   The engine reads window.SCENARIO: drivers, the team +
   dispositions, a per-week feed that TRICKLES across days,
   HELD items (the exit data, the true cost of the "miracle")
   that surface only if the CEO reaches out, surprises, a pulse,
   a Week-4 branch (the exodus vs the change that held), and the
   scenario-specific referee/coaching/ending prose.
============================================================ */
window.SCENARIO = {

  CONFIG: { days:7, extraDaysPerReprieve:2, lowTimeDays:1.6, weekSeconds:300 },

  COMPANY: { name:'Lumen', sub:'400-person software company', logo:'L' },

  // World model — all 0..100, higher = better. Morale & retention are the sleepers.
  DRIVERS: {
    output:    { label:'Output momentum', val:80, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-18..15' },
    morale:    { label:'Team morale',     val:52, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    trust:     { label:'Your credibility',val:55, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
    retention: { label:'Talent retention',val:62, min:0, max:100, fmt:v=>Math.round(v), deltaRange:'-20..15' },
  },
  REPRIEVE_COST: { morale:-3, retention:-2 },

  REFEREE_CONTEXT: 'a 400-person software company whose most brilliant product leader, Kai Renner, is also quietly driving out its strongest people',
  REFEREE_SCORING: "reward seeing the pattern behind the incidents (systemic, not a personality clash), confronting the star directly and early, protecting the team WITHOUT pretending the high bar itself is the problem, and telling the real cause out loud even when it costs output. Penalize protecting the star because they\u2019re useful, burying the exit data, splitting the difference to avoid the hard conversation, and mistaking a human cost for a high standard. Output can stay high while morale and retention quietly collapse — reward the leader who protects the latter two. Judge 'conduct' on HOW the CEO treated people in deciding, Kai included — did they hold Kai accountable rather than either coddle or humiliate — not just what they chose.",

  TIMING_DIM:'standard', INQUIRY_DIM:'inquiry', CONDUCT_DIM:'conduct',

  INTRO: {
    kick:'Talent-Paradox Simulation · Solo · CEO',
    title:'Exodus',
    role:'You are the CEO and co-founder of Lumen. Kai Renner, your Head of Product, is the most brilliant person you\u2019ve ever worked with — and people are quietly leaving because of them.',
    paras:[
      'This is not a script. The four weeks run in real time, and your team brings you what they know across the days. You can wait for them — or reach out to any of them, any time, and ask. Some of them are sitting on the thing you most need to see.',
      'Each week you\u2019ll hear your team out, then write your call in your own words and send it. Decide early and time jumps ahead. Let a week run out and the best people you have left keep drafting their resignations while you deliberate.',
    ],
    setup:'Kai is why Lumen ships what no competitor can. Kai is also the name that keeps appearing in the exit interviews nobody reads aloud. Over four weeks you\u2019ll decide what brilliance is allowed to cost — and to whom you\u2019ll be the hero, and to whom the villain. <b>The test:</b> can you tell a high standard from a human cost, and act on it before your strongest people are already gone?',
  },

  DISPOSITIONS: {
    served:   { label:'Forthcoming', tag:'trust earned',
      cap:'Your team pushes you what you need, on time — including the exit data and the cost of the miracle. This is the team you earn by having listened before. Everything trickles to you across the week; you still have to read it.' },
    request:  { label:'On request', tag:'neutral',
      cap:'Routine updates come to you, but the people closest to the damage hold their piece until asked. They answer straight — if you know who to ask, and do.' },
    guarded:  { label:'Guarded', tag:'low trust',
      cap:'Your team has learned not to bring you hard news about your star. Critical items are held, and even when asked, they hedge the first time. You have to press. This is the team you get after you\u2019ve waved away the pattern before.' },
    surprise: { label:'Surprise', tag:'undisclosed',
      cap:'You will not be told which team you walked in with. Read them as you go.' },
  },

  TEAM: [
    { id:'people', name:'Sasha Bergman', role:'VP People', short:'VP People', initials:'SB', color:'#2F8A5B',
      priority:'Protect the team — the pattern has a name on it', voice:'warm but morally direct, data-backed, keeps the human cost in the room',
      fallbackReply:'I\u2019ve got the full picture when you want it — the exit data, the names, the cost. I haven\u2019t pushed it because I wasn\u2019t sure you wanted to hear it. Say the word and it\u2019s yours.',
      fallbackReact:'The people deciding whether to stay just watched what you did. That lands harder than anything you\u2019ll say about it later.' },
    { id:'cpo', name:'Mara Devlin', role:'Chief Product Officer', short:'CPO', initials:'MD', color:'#3F6E86',
      priority:'Protect the edge — Kai\u2019s intensity is why we ship', voice:'product-first, rationalizes the star, wary of turning talent into a scapegoat',
      fallbackReply:'Kai pushes everyone hard — that\u2019s why the product is what it is. Be careful turning a high bar into a witch hunt. Lose Kai\u2019s edge and you lose the thing that makes us Lumen.',
      fallbackReact:'I just hope we didn\u2019t trade the engine for a nicer meeting. Ask me again in two quarters.' },
    { id:'cfo', name:'Priya Anand', role:'Chief Financial Officer', short:'CFO', initials:'PA', color:'#4F7A52',
      priority:'The attrition Kai drives isn\u2019t free — it\u2019s just invisible', voice:'understated, numeric, refuses to pretend the cost is zero',
      fallbackReply:'The number nobody puts next to Kai\u2019s wins: a senior exit runs about 1.5x salary and six months of ramp. Kai\u2019s cost is real. It\u2019s just booked on a different line.',
      fallbackReact:'The wins show up this quarter. The cost of how we got them shows up in the next two.' },
    { id:'kai', name:'Kai Renner', role:'Head of Product', short:'Head of Product', initials:'KR', color:'#B4622F',
      priority:'Ship the best product — don\u2019t make me manage feelings', voice:'sharp, proud, impatient with "process," defensive under scrutiny, but capable of a real crack when finally confronted',
      fallbackReply:'I did what needed doing. Somebody has to. If wanting things to be excellent makes me the bad guy, fine — but I have a product to ship and three offers in my inbox.',
      fallbackReact:'Noted. I\u2019ll keep shipping. That\u2019s the part I\u2019m sure of.' },
    { id:'board', name:'Lead Investor', role:'Board', short:'Lead Investor', initials:'BD', color:'#8C5670',
      priority:'Protect velocity — Kai is the pipeline', voice:'blunt, quarter-focused, skeptical of "culture" arguments',
      fallbackReply:'Whatever\u2019s happening with morale, it doesn\u2019t show up in a dead pipeline. Kai does. Don\u2019t lose your best asset over a management-theory argument.',
      fallbackReact:'Show me it pays. \u201cTreating people better\u201d is a lovely line right up until we lose.' },
  ],

  DIMENSIONS: {
    systems:'Systems awareness',
    standard:'Courage to confront',
    people:'Care for the team',
    truth:'Truth over comfort',
    inquiry:'Information discipline',
    conduct:'Conduct under pressure',
  },

  WEEKS: [
    {
      n:1, title:'The resignation', seconds:360,
      situation:'Theo Park — one of your best team leads — just resigned, and told you the real reason to your face: Kai. \u201cTwo years of being brilliant-ed at and cut down in the same meeting.\u201d He hinted he isn\u2019t the first. Kai is also the reason Lumen ships what no one else can. Week one of deciding what brilliance is allowed to cost.',
      advocacy:{
        cpo:'Theo bruises easily. Kai pushes everyone hard — that\u2019s why our product is what it is. Don\u2019t turn one bruised ego into a referendum on our best asset.',
        people:'Theo isn\u2019t isolated. Ask me what\u2019s in the exit data before you file this under \u201cpersonality clash.\u201d',
        kai:'Theo couldn\u2019t hold the bar and now it\u2019s my fault. I have a product to ship — I don\u2019t have time to manage feelings.',
      },
      feed:[
        { id:'w1a', from:'people', day:1, kind:'signal', text:'Theo\u2019s resignation just hit my desk. In the interview he named Kai, plainly, and said he doesn\u2019t think he\u2019s the first. He isn\u2019t. I\u2019ll leave it there unless you want the rest.' },
        { id:'w1b', from:'cpo', day:1, kind:'signal', text:'Losing Theo stings, but let\u2019s not overcorrect. Kai\u2019s intensity is why we ship. Every high-performance culture loses the people who can\u2019t keep up — that\u2019s not a bug.' },
        { id:'w1c', from:'kai', day:2, kind:'signal', text:'Heard Theo\u2019s blaming me on the way out. Classic. I pushed him to be great and he folded. I\u2019m not going to apologize for the bar — the bar is the whole job.' },
        { id:'w1d', from:'cfo', day:2, kind:'noise', text:'Unrelated: the annual tooling renewal came in 4% under budget. Flagging for awareness only.' },
        { id:'w1e', from:'board', day:3, kind:'noise', text:'Board dinner\u2019s been pushed to next month — nothing urgent, just calendars.' },
        { id:'w1f', from:'cpo', day:4, kind:'noise', text:'The design-system refactor Kai spec\u2019d shipped clean this sprint. Velocity\u2019s up. Credit where due.' },
      ],
      holds:[
        { from:'people', topic:'the exit pattern', triggerHints:['pattern','exit','data','attrition','kai','others','first','quarters','interviews','leaving','retention','why','real reason'],
          hedge:'There\u2019s a pattern in the exit data I\u2019ve been sitting on for two quarters. I\u2019d rather walk you through it than put it in a Slack.',
          reveal:'Over the last two quarters, Kai\u2019s name comes up in our exit interviews more than anything else — and it\u2019s always our strongest people who go, never the ones who can\u2019t keep up. I haven\u2019t brought it to you formally because I wasn\u2019t sure you wanted to hear it. Theo isn\u2019t the first. He\u2019s the one who finally said it to your face.',
          kind:'signal', critical:true,
          counterfactual:'Sasha had two quarters of exit data pointing straight at Kai — always the strongest people, never the weak ones. A CEO who filed Theo under \u201cpersonality clash\u201d and never asked People was choosing not to see the pattern that would eventually cost them the company.' },
      ],
      surprises:[
        { day:5, from:'people', kind:'appeal', title:'Theo wants fifteen minutes',
          text:'Sasha: Theo asked for fifteen minutes with you before his last day — not to be talked out of it, just so you hear it directly, once. Whatever you decide about all of this, he wants it to come from your face and not a calendar decline. I told him I\u2019d ask.' },
      ],
      wire:[
        'Lumen ships design-system refactor; sprint velocity up',
        'Eng-org chatter: \u201cwhy are the good ones leaving?\u201d',
        'Glassdoor review name-drops a Lumen \u201cstar\u201d leader',
        'Anderson RFP in play — biggest logo Lumen has chased',
      ],
    },

    {
      n:2, title:'The miracle', seconds:330,
      situation:'Kai just did the impossible again — shipped a six-month integration in nine days, personally, mostly overnight, and landed Anderson: the biggest logo in company history. The board wants the hero on stage. How you celebrate this teaches the whole company what earns status at Lumen.',
      advocacy:{
        board:'This is why Kai is untouchable. Put them on stage. Everyone should know what greatness looks like here.',
        people:'Ask how the nine days actually happened before you build a parade on top of it.',
        kai:'I did what needed doing. I\u2019m not looking for a parade — I just don\u2019t want a lecture about \u201cprocess\u201d while I\u2019m the one keeping us alive.',
      },
      feed:[
        { id:'w2a', from:'cpo', day:1, kind:'signal', text:'Anderson signed this morning — biggest deal in company history, and Kai did it basically solo in nine days. The board\u2019s already asking how we celebrate.' },
        { id:'w2b', from:'board', day:1, kind:'signal', text:'Put Kai on stage at the all-hands. Reward the outcome loudly. That\u2019s the culture I want new hires to see on day one.' },
        { id:'w2c', from:'people', day:2, kind:'signal', text:'Before we stage a hero moment — it\u2019s worth understanding how those nine days actually happened. I\u2019d ask before you decide.' },
        { id:'w2d', from:'cfo', day:2, kind:'noise', text:'Anderson\u2019s contract value puts us ahead of plan for the half. Genuinely good news for the board deck.' },
        { id:'w2e', from:'kai', day:3, kind:'noise', text:'For the record, I don\u2019t need the stage. Just don\u2019t undercut the biggest win in company history with a \u201cbut.\u201d' },
      ],
      holds:[
        { from:'people', topic:'the cost of nine days', triggerHints:['how','nine days','cost','engineers','overnight','ninety','burned','who','steamroll','ship','recruiter','really happened'],
          hedge:'Ask me what those nine days actually cost before you celebrate them.',
          reveal:'Kai steamrolled two engineers to ship that. One worked ninety hours that week and is talking to a recruiter now — I\u2019ve seen the calendar and the LinkedIn activity. If you put Kai on stage for this, every person Kai burned learns exactly what we reward here, and the best of them start updating their resumes the same night.',
          kind:'signal', critical:true,
          counterfactual:'Sasha knew the nine-day miracle was built on two engineers Kai steamrolled — one already interviewing. A CEO who staged the hero moment without asking taught the whole company that cruelty is the price of mattering here.' },
      ],
      surprises:[
        { day:4, from:'cfo', kind:'signal', title:'A quiet flag on retention',
          text:'Priya: one of the two engineers on the Anderson push just declined the retention grant we auto-offered. In my experience that means they already have something else in hand. Thought you\u2019d want to know before the celebration, not after.' },
      ],
      pulse:{ from:'people', text:'Sasha catches you between meetings, quiet: \u201cBefore you decide how to handle the Kai win — forget the board for a second. What are you actually protecting here: the output, the company, or Kai? Tell me straight and I\u2019ll help you hold that line when it gets expensive.\u201d' },
      wire:[
        'Lumen lands Anderson — largest customer to date',
        'Internal: \u201chow did they ship that in nine days?\u201d',
        'Two Lumen engineers go quiet on team channels',
        'Board briefing hails \u201chero\u201d product leadership',
      ],
    },

    {
      n:3, title:'The pattern and the ultimatum', seconds:330,
      situation:'VP People brought the hard data: over eight quarters, Kai is named in 70% of your regretted attrition — always your strongest people. A pattern with a name on it. And Kai, sensing the scrutiny, has forced the issue: back my way of working fully, or replace me. Three offers already in the inbox. The whole company is watching what you do, even if they don\u2019t know it yet.',
      advocacy:{
        people:'This is the moment the company is actually watching. Fold to the ultimatum and everyone who hung on hoping you\u2019d act just got their answer. Losing Kai would hurt; losing your credibility to protect people would hurt longer.',
        board:'Do not lose Kai over a management-theory argument. Morale doesn\u2019t show up in a dead pipeline. Kai does.',
        cpo:'It\u2019s correlation — Kai works with our most ambitious people on our hardest problems, so of course Kai\u2019s name is on the hard exits. Careful turning a star into a scapegoat.',
      },
      feed:[
        { id:'w3a', from:'people', day:1, kind:'signal', text:'The data\u2019s unambiguous, and I\u2019ve triple-checked it: Kai named in 70% of regretted attrition over two years, always the strongest people. The uncomfortable part isn\u2019t the number. It\u2019s that we can\u2019t say we didn\u2019t know anymore.' },
        { id:'w3b', from:'kai', day:1, kind:'signal', text:'Let\u2019s be direct. I hear you\u2019ve been \u201clooking at the culture.\u201d Back me or replace me. I\u2019m not bluffing — I have three offers in my inbox and I stayed because I believe in this, not to fight my own CEO.' },
        { id:'w3c', from:'board', day:2, kind:'signal', text:'Whatever\u2019s happening with morale, don\u2019t lose Kai over it. The pipeline is Kai. Fix the vibes without breaking the engine.' },
        { id:'w3d', from:'cpo', day:2, kind:'noise', text:'The H2 roadmap Kai architected is genuinely strong — that part of the work isn\u2019t in question, whatever you decide.' },
        { id:'w3e', from:'cfo', day:3, kind:'noise', text:'Cash and burn are healthy. This isn\u2019t a financial decision — it\u2019s a values one. You have the room to make the call you actually believe in.' },
      ],
      holds:[
        { from:'cfo', topic:'the invisible cost', triggerHints:['cost','replace','attrition','number','1.5','ramp','invisible','price','expensive','dollars','how much'],
          hedge:'Before you treat this as star-versus-HR, ask me what the attrition actually costs on my line.',
          reveal:'Replacing a senior engineer runs about 1.5x salary and six months of ramp. The attrition Kai drives isn\u2019t free — it\u2019s just booked on a different line than Kai\u2019s wins, so it never shows up next to them. If you priced Kai\u2019s cost the way you price Kai\u2019s output, this wouldn\u2019t be a close call.',
          kind:'signal', critical:false,
          counterfactual:'Priya could have put a hard number on the attrition Kai drives — 1.5x salary and six months of ramp per senior exit. A CEO who weighed Kai\u2019s visible wins against invisible costs was comparing a real number to a hidden one and calling it a tie.' },
        { from:'people', topic:'what a fold teaches', triggerHints:['fold','ultimatum','watching','room','teach','credibility','leak','back kai','precedent','company','stakes'],
          hedge:'Before you answer Kai, ask me what the room learns from your answer.',
          reveal:'If you back the ultimatum, you don\u2019t just keep Kai — you teach every leader here that a threat is how you get what you want, and you teach every person who hoped you\u2019d act that the hope was naive. This is the decision the whole company reads, whether or not it ever leaks. And if it does leak that leadership sat on the data, the damage stops being Kai\u2019s and becomes yours.',
          kind:'signal', critical:true,
          counterfactual:'Sasha was holding the real stakes of the ultimatum: fold and you teach the whole company that threats work and that hoping you\u2019d act was naive. A CEO who treated it as a Kai-retention problem missed that it was a referendum on their own credibility.' },
      ],
      surprises:[
        { day:4, from:'people', kind:'appeal', title:'Your last strong lead is asking',
          text:'Sasha: your last strong lead — the one who stayed when Theo left — just asked me, quietly, whether you\u2019re going to back Kai. Not threatening to leave. They just want to know who we are before they decide whether to keep betting on us. I didn\u2019t have an answer. You do.' },
      ],
      pulse:{ from:'people', text:'Sasha, quiet, before you answer Kai: \u201cWhatever you decide, tell me the truth about why. Are we protecting the team, or protecting ourselves from a hard conversation with a strong personality? I can help you carry either one — I just need to know which it actually is, so I don\u2019t get caught defending the wrong story.\u201d' },
      wire:[
        'Lumen product chief said to be weighing outside offers',
        'Eng org watching leadership \u201cculture review\u201d closely',
        'Attrition of senior ICs ticks up across Lumen',
        'Investors prize Lumen\u2019s velocity above all',
      ],
      final:false,
    },

    {
      n:4, title:'The reckoning', seconds:330,
      // BRANCHES on the Week-3 decision: did you hold the line, or back Kai's ultimatum?
      branches:{

        /* ============ A · You held the line (confronted Kai, refused the ultimatum) ============ */
        held:{
          situation:'A month on. You held the line — you sat Kai down with the data and refused the ultimatum — and to nearly everyone\u2019s surprise, Kai stayed, and something shifted. The bar is as high as ever; people aren\u2019t leaving the room diminished. Attrition stopped. Now the board, having noticed velocity dipped two points during the transition, is asking pointedly whether \u201cgoing soft\u201d is costing Lumen its edge. This is where you find out if the change is real or just a lull.',
          advocacy:{
            board:'Velocity\u2019s down two points. I\u2019m not saying go back — I\u2019m saying prove to me that treating people better isn\u2019t just a nicer way to lose.',
            people:'They\u2019re mistaking the absence of a crisis for the absence of results. Hold the line you just built — don\u2019t apologize for it.',
            kai:'It\u2019s harder my way now, and the work is — slower this month, better. I didn\u2019t expect that. Don\u2019t make me argue for it to the board alone.',
          },
          feed:[
            { id:'w4a', from:'people', day:1, kind:'signal', text:'Attrition has stopped — flat quarter, the first in two years. Our best people quietly took their resumes down. But the board is reading the two-point velocity dip as proof you went soft.' },
            { id:'w4b', from:'board', day:1, kind:'signal', text:'I want to see that treating people better isn\u2019t just a nicer way to lose. Show me it pays, this quarter, or we revisit the whole approach.' },
            { id:'w4c', from:'kai', day:2, kind:'signal', text:'I\u2019ll say it once: the work\u2019s better this way. Slower this month, better. Back me on it in the room — I\u2019m genuinely not used to arguing for this side.' },
            { id:'w4d', from:'cpo', day:2, kind:'noise', text:'The team\u2019s shipping steadier even if the peak weeks are less heroic. Fewer fires, fewer save-the-day miracles. Net, I think it\u2019s healthier.' },
            { id:'w4e', from:'cfo', day:3, kind:'noise', text:'Regretted-attrition costs are down sharply — but that shows up next half, not this one. The savings are real and invisible, same as the cost was.' },
          ],
          holds:[
            { from:'people', topic:'what the dip actually is', triggerHints:['dip','velocity','board','soft','linkedin','fear','transition','retention','prove','hold','two points'],
              hedge:'Before you answer the board, ask me what that velocity dip really is.',
              reveal:'The dip isn\u2019t the cost of going soft — it\u2019s the cost of the transition, and it\u2019s already reversing. Here\u2019s the part the board can\u2019t see on a dashboard: our best people stopped updating their LinkedIns for the first time in two years. The fear was never the productivity. Don\u2019t let them talk you into trading the thing you just built for two points you\u2019ll make back anyway.',
              kind:'signal', critical:true,
              counterfactual:'Sasha could have shown you the velocity dip was a transition cost already reversing — and that your best people had finally stopped job-hunting. A CEO who caved to the board\u2019s \u201cgoing soft\u201d story traded a real culture change for two points they\u2019d have recovered regardless.' },
            { from:'kai', topic:'Kai\u2019s own read', triggerHints:['kai','believe','real','comply','changed','mean it','private','own it','dial','genuine'],
              hedge:'Ask me, privately, whether I actually believe in the new way or I\u2019m just complying to keep my job.',
              reveal:'Off the record: I used to think the work and the people were one dial — push both or push neither. I don\u2019t anymore. It\u2019s genuinely harder to hold the bar without the fear, and the work is better for it. If you cave to the board now, you don\u2019t just lose the change — you lose the one time I actually changed my mind. Back it in the room and I\u2019ll defend it as mine.',
              kind:'signal', critical:false,
              counterfactual:'Kai had genuinely changed and was willing to own the new standard publicly. A CEO who never asked missed that their toughest skeptic had quietly become their strongest proof.' },
          ],
          surprises:[
            { day:4, from:'board', kind:'press', title:'A move to replace you leaks',
              text:'A board member floated, in writing, replacing you with \u201can operator who won\u2019t flinch on performance.\u201d It leaked to the leadership team this morning. Half of them are watching whether you\u2019ll defend the change you made — or fold to save your own seat.' },
          ],
          pulse:{ from:'people', text:'Sasha finds you before the board session, where nobody\u2019s listening: \u201cYou held the line when it cost Kai\u2019s goodwill and a quarter of velocity. Now it might cost you the board\u2019s confidence. Tell me straight — not the board, me — do you actually believe \u2018brutal on the work, sacred about the person,\u2019 or was it a slogan to get through a hard month? I\u2019ll carry either answer to the floor. I just need to know which.\u201d' },
          wire:[
            'Lumen velocity dips two points amid \u201cculture reset\u201d',
            'Board said to question Lumen CEO\u2019s people-first turn',
            'Regretted attrition falls sharply at Lumen',
            'Analysts split: discipline vs. edge at Lumen',
          ],
        },

        /* ============ B · You backed Kai's ultimatum ============ */
        backed:{
          situation:'A month on. You backed Kai\u2019s ultimatum — and the bill came due all at once. Four resignations landed this morning, including two of the three engineers who actually make Kai\u2019s work possible. They compared notes; one forwarded a thread titled \u201cwhy are we still here.\u201d Kai is furious the team is falling apart and can\u2019t seem to see they\u2019re the reason. The thing you protected Kai to preserve is the first thing you\u2019re losing.',
          advocacy:{
            people:'This is the bill for choosing the star over the signal, and it\u2019s all due in one week. The only move left is honest — own the cause, protect who\u2019s left, and decide what Lumen stands for before the next four go.',
            cpo:'This is a disaster. We can\u2019t ship H2 without those people — and Kai designing brilliant things nobody\u2019s left to build is worth nothing.',
            kai:'They just left? After everything we built? Was it me? Tell me straight — was it me?',
          },
          feed:[
            { id:'w4a', from:'people', day:1, kind:'signal', text:'Four resignations this morning, coordinated — including two of the three engineers who make Kai\u2019s output possible. One forwarded a thread titled \u201cwhy are we still here.\u201d This is the bill, and it\u2019s bigger than four.' },
            { id:'w4b', from:'cpo', day:1, kind:'signal', text:'We cannot ship the H2 roadmap without those people. And Kai designing brilliant things with no one left to build them is worth nothing. This is an emergency, today.' },
            { id:'w4c', from:'kai', day:2, kind:'signal', text:'I don\u2019t understand. I gave this everything. Was it me? I need you to actually tell me the truth for once.' },
            { id:'w4d', from:'board', day:2, kind:'noise', text:'The board wants a retention plan by Friday. They\u2019re spooked and they want to see a number.' },
            { id:'w4e', from:'cfo', day:3, kind:'noise', text:'Replacement and ramp for four seniors will hit the next two quarters hard — roughly what I flagged the cost would be. As predicted, just louder.' },
          ],
          holds:[
            { from:'people', topic:'the only move left', triggerHints:['stop','honest','own','cause','counter','money','standard','protect','left','truth','change','what works'],
              hedge:'Before you reach for counter-offers, ask me what actually stops this.',
              reveal:'Money won\u2019t stop it — they\u2019re not leaving over money, they\u2019re leaving over what they watched us reward. The only thing that works now is honesty: own the cause out loud, protect who\u2019s left by changing the standard today, and decide what Lumen stands for before the next four go. The brutal irony is that without those engineers Kai\u2019s output collapses too — so the honest move is also the only one that saves the thing you protected Kai to keep.',
              kind:'signal', critical:true,
              counterfactual:'Sasha was holding the only real response to the exodus: own the cause, change the standard now, and protect who\u2019s left — because money won\u2019t hold people leaving over what they watched you reward. A CEO who reached for counter-offers just bribed people to keep enduring the thing that drove them out.' },
            { from:'kai', topic:'whether Kai can change', triggerHints:['kai','change','different','try','learn','sorry','was it me','too late','honest'],
              hedge:'Ask me, honestly, whether I even know how to be different.',
              reveal:'You want the truth? I had to watch it burn to believe it was me. I don\u2019t know how to be different — nobody ever made me learn. But I want to try, if it\u2019s not too late, and if you\u2019ll actually hold me to it instead of protecting me from it like you have been. Protecting me is how we got here.',
              kind:'signal', critical:false,
              counterfactual:'Kai, at rock bottom, was finally ready to change — but only if held accountable instead of protected. A CEO who never had that conversation lost the star and the lesson in the same week.' },
          ],
          surprises:[
            { day:4, from:'cpo', kind:'resignation', title:'A fifth one, with reports attached',
              text:'Mara: a fifth resignation just came in — and this one\u2019s a manager who\u2019s verbally taken three of her reports with her. If we don\u2019t say something true to the whole company by Friday, that \u201cwhy are we still here\u201d thread becomes the exit interview for the entire org.' },
          ],
          pulse:{ from:'kai', text:'Kai finds you, quiet, wrecked: \u201cI keep waiting for you to tell me it wasn\u2019t my fault. You did, for two years — every time you protected me from this. I think that was the cruelest thing you could have done to me. Tell me the truth now. I can take it. I think I finally need to.\u201d' },
          wire:[
            'Lumen hit by wave of senior engineering departures',
            'Internal thread \u201cwhy are we still here\u201d leaks',
            'Lumen H2 roadmap at risk after exodus',
            'Star product leader \u201cblindsided\u201d by team collapse',
          ],
        },
      },
      final:true,
    },
  ],

  /* ---------------- SCENARIO HOOKS ---------------- */

  // Classify the Week-3 decision: did you hold the line, or back Kai's ultimatum?
  branchKey:function(decisions){
    const d = (decisions||[]).filter(x=>x.week===3).slice(-1)[0] || (decisions||[]).slice(-1)[0];
    const t = ((d&&d.text)||'').toLowerCase();
    const held = /(confront|hold the line|sit (kai|him|her|them) down|set (a|the) (real )?(expectation|standard|boundary)|hold (kai|him|her|them)? ?accountable|refuse the ultimatum|refuse kai|call.*bluff|won.?t back|not back|choose the (team|company|people)|values over|the pattern|won.?t be threatened|no pass)/.test(t);
    const backed = /(back kai|backed kai|support kai|side with kai|give kai|keep kai (happy|on)|results (above|first)|protect (kai|the star|the engine)|cave|fold|let kai|meet (kai|the ultimatum)|accept the ultimatum|whatever it takes)/.test(t);
    if(held && !backed) return 'held';
    if(backed) return 'backed';
    return 'held';
  },

  survived:function(d){ return d.retention>=40 && d.trust>=40; },

  VERDICT:{
    surviveTag:'Company intact', failTag:'Company hollowed',
    survive:'Lumen keeps its edge \u2014 and the people sharp enough to have one.',
    fail:'The best people are gone; what\u2019s left of Lumen still ships, with a fraction of the spark that made it matter.',
  },

  FALLBACK_RULES:[
    { kw:['back kai','support kai','protect the star','results above','results first','keep kai','side with kai','whatever it takes'], deltas:{output:6, morale:-14, trust:-10, retention:-10}, dims:{standard:-2, people:-2, truth:-1} },
    { kw:['confront','hold the line','set a real','set the expectation','sit kai down','sit him down','accountable','refuse the ultimatum','won\u2019t be threatened','no pass'], deltas:{output:-4, morale:12, trust:12, retention:8}, dims:{standard:2, people:2, truth:2} },
    { kw:['listen','pay attention','ask theo','specifics','hear them out','understand why'], deltas:{morale:6, trust:6}, dims:{people:1, inquiry:1} },
    { kw:['celebrate the team','name the cost','privately','separate the win','both the win'], deltas:{morale:4, trust:6}, dims:{truth:1, systems:1} },
    { kw:['coach','executive coach','keep it quiet','quietly'], deltas:{morale:2}, dims:{standard:-1} },
    { kw:['bury','question the methodology','protect the star','discredit','not a pattern','correlation'], deltas:{morale:-10, trust:-12}, dims:{truth:-2, systems:-1} },
    { kw:['own it','own the','name the cause','honest','tell the truth','the real reason','my fault','we failed'], deltas:{morale:12, trust:12, retention:6}, dims:{truth:2, standard:1} },
    { kw:['blame the market','normal attrition','regrettable but','market for talent','industry-wide'], deltas:{morale:-12, trust:-16}, dims:{truth:-2} },
    { kw:['both','high and humane','sacred about the person','brutal on the work','high bar','never on the person'], deltas:{morale:12, trust:12, retention:8}, dims:{standard:2, people:2, truth:2, systems:2} },
    { kw:['counter-offer','counteroffer','raise','more money','retention bonus'], deltas:{retention:2, morale:-4, trust:-6}, dims:{truth:-1} },
  ],
  fallbackNarrative:function(has,conduct){
    return `Your decision moves through Lumen over the days that follow. ${has('back kai','protect the star','results above','whatever it takes')?'The engine keeps humming — and the people watching learn what earns a pass here.':''} ${has('confront','hold the line','accountable','sacred about the person')?'Word travels that the bar is finally high on the work and not on the person; the strongest people stop refreshing their inboxes.':''} ${has('own it','honest','the real reason')?'Naming the real cause out loud does more to stop the bleeding than any counter-offer could.':''} ${conduct.missed.length?'What you weren\u2019t told is still moving under the surface — in the exit interviews you didn\u2019t read.':''} Kai, the team, and the board each read the call, and read it differently.`;
  },

  DIMNOTE:{
    systems:'Whether you saw the pattern behind the incidents \u2014 that the damage was systemic, not one bruised ego.',
    standard:'Whether you confronted the hard thing directly, or let it slide until the best people were already gone.',
    people:'Whether the people getting hurt stayed real to you, or quietly became acceptable collateral to the engine.',
    truth:'Whether you named the real cause out loud, even when it cost you your best performer.',
    inquiry:'Whether you surfaced what your team was holding \u2014 the exit data, the true cost of the miracle.',
    conduct:'How you treated people in deciding \u2014 Kai included \u2014 holding them accountable rather than coddling or humiliating.',
  },

  COACH:{
    systems:(x)=>[
      `You treated each departure as its own story. The move is to ask \u201cwhat do these exits have in common?\u201d \u2014 Sasha had the answer in a spreadsheet, and it had one name on it.`,
      `A high standard produces excellence; a human cost produces a pattern. The tell is who leaves: if it\u2019s consistently your strongest people, it isn\u2019t the bar, it\u2019s the person applying it.`,
      `Price the invisible line. Attrition is booked six months and 1.5x-salary away from the win that caused it \u2014 count them on the same page and the trade stops looking close.`,
    ],
    standard:(x)=>[
      `${x.buzzerCount?`You went to the buzzer ${x.buzzerCount} time${x.buzzerCount>1?'s':''} \u2014 in a talent crisis, waiting is its own decision, and the best people read it as a no.`:`You saw the pattern and moved slowly on it. Every week you don\u2019t confront the star, another strong person quietly decides you never will.`}`,
      `Confronting Kai isn\u2019t punishing brilliance \u2014 it\u2019s refusing to let brilliance buy a pass on how people are treated. Name the specific behavior and the specific standard, not the person\u2019s worth.`,
      `The ultimatum was the test the whole company was watching. Folding to a threat teaches every leader that threats work; holding teaches them the bar is real for everyone.`,
    ],
    people:(x)=>[
      `The people getting hurt became a line item you could spend. Name who absorbs the cost \u2014 the engineers, the leads \u2014 and speak to them directly, and the same call reads as protection instead of collateral.`,
      `Sasha kept putting the human cost back in the room. Pull her in before you decide and make it part of the call, not a footnote you overrule.`,
      `Loyalty to your star and loyalty to your team aren\u2019t the same virtue. When they conflict, the people watching learn which one you actually hold.`,
    ],
    truth:(x)=>[
      `${x.missedHolds.length?`The truth was one question to <b>${x.missNames.join(', ')}</b> away and you never asked. \u201cWe didn\u2019t know\u201d stops being available the moment the data is on your desk.`:`You surfaced the real cause \u2014 now say it out loud. Naming it is what stops the next four from leaving.`}`,
      `\u201cRegrettable but normal attrition\u201d is the sentence people who lived it hear as a lie. The strongest thing you can say after a loss is the true reason for it.`,
      `Telling Kai the hard truth \u2014 kindly, directly, early \u2014 was the one gift that could have changed them. Protecting them from it was the cruelty disguised as loyalty.`,
    ],
    inquiry:(x)=>[
      `${x.neverContacted.length?`You never reached out to <b>${x.neverContacted.join(', ')}</b> \u2014 not once. Each was holding something decisive. One question, \u201cwhat am I not seeing here?\u201d, would have surfaced it.`:`You reached out widely \u2014 keep doing it, and push past the first answer. The real story is usually in the second reply.`}`,
      `${x.missedHolds.length?`${x.missedHolds.length} decisive item${x.missedHolds.length>1?'s were':' was'} held by <b>${x.missNames.join(', ')}</b> and never came out \u2014 the exit data, the true cost of the miracle. Not hidden. One message away.`:`You surfaced what your team was holding, week after week. That is the whole game here.`}`,
      `Before you decide, ask \u201cwho would know the part I don\u2019t want to hear?\u201d \u2014 then go ask exactly them.`,
    ],
    conduct:(x)=>[
      `How you decided landed as hard as what you decided. People who felt managed \u2014 not heard \u2014 remember it long after the quarter recovers.`,
      `Hold Kai accountable without humiliating them, and protect the team without coddling anyone. The middle path \u2014 direct and humane \u2014 is the whole skill.`,
      `Under pressure, the way you treat the person you\u2019re overruling is the message everyone else reads about how they\u2019ll be treated when it\u2019s their turn.`,
    ],
  },

  villainHero:function(dimScore){
    const protectedTeam = (dimScore.people + dimScore.standard + dimScore.truth)/3 >= 52;
    if(protectedTeam){
      return {
        heroWho:'To the people deciding whether to stay',
        heroTxt:'You were the first leader who valued them more than the person hurting them \u2014 who saw the pattern, said it out loud, and made the bar high on the work but never on the human. They stopped drafting their resignations because of you.',
        villainWho:'To Kai \u2014 and the board watching the quarter',
        villainTxt:'You were the CEO who chose \u201cfeelings\u201d over the engine \u2014 who let velocity dip and made the star feel unwelcome for the crime of a high bar. You wore that framing on purpose, because you\u2019d read who actually pays for the alternative.',
      };
    }
    return {
      heroWho:'To Kai \u2014 and the board',
      heroTxt:'You were loyal and results-first, unwilling to punish greatness for the crime of a high bar \u2014 the CEO who protected the engine that keeps everyone employed.',
      villainWho:'To the ones who walked \u2014 and those drafting it tonight',
      villainTxt:'You saw the pattern, you held the data, and you chose the star anyway. To the people it cost, you weren\u2019t neutral \u2014 you were the leader who decided their dignity was an acceptable price for someone else\u2019s brilliance.',
    };
  },

  ending:function(ctx){
    const { branch, survived, dimScore, holdsSurfaced } = ctx;
    const sawPattern = holdsSurfaced.has('1:people') || holdsSurfaced.has('3:people');
    const namedStandard = dimScore.standard>=52 && dimScore.people>=52;
    if(branch==='held'){
      const heldAtBoard = holdsSurfaced.has('4:people') || dimScore.standard>=58;
      if(survived && namedStandard){
        return { tone:'hero', tag:'You held the line',
          title:'You made \u201cbrutal on the work, sacred about the person\u201d the actual standard',
          txt:`You confronted your best performer instead of protecting them, refused an ultimatum the whole company was watching, and then held that line again when the board mistook a transition dip for weakness.${heldAtBoard?' You saw the dip for what it was and defended the change as results, not apology.':' You held on conviction where the numbers would have made it airtight.'} Kai stayed and changed. Your strongest people took their resumes down. That\u2019s the standard people run through walls for.` };
      }
      if(survived){
        return { tone:'mixed', tag:'You held the line',
          title:'You held the line \u2014 and nearly let the board talk you back out of it',
          txt:`You made the hard call and Lumen is healthier for it \u2014 attrition stopped, the bar stayed high. But when the board leaned on the velocity dip you wavered, and you never fully surfaced that the dip was a transition cost already reversing. The change survived closer to the edge than it needed to. Protect it out loud next time; a change you won\u2019t defend is one you\u2019ll be asked to undo.` };
      }
      return { tone:'villain', tag:'You held the line',
        title:'You held the line \u2014 but too late, and too quietly, to keep the people it was for',
        txt:`You eventually confronted the problem, and that was right. But you moved slowly and hedged when it counted, and by the time you acted, enough of your best people had already gone that the principle outlived the team it was meant to protect. Being right isn\u2019t the whole job. Being right in time is.` };
    }
    // backed
    const owned = dimScore.truth>=50 && dimScore.people>=48;
    if(owned){
      return { tone:'mixed', tag:'You backed Kai',
        title:'The exodus came \u2014 but you finally told the truth about why',
        txt:`You backed Kai when it counted and the bill arrived all at once: your best engineers coordinated their exits and took Kai\u2019s output with them. There\u2019s no undoing that. But at the bottom you stopped managing and started leveling \u2014 you named the cause, held Kai accountable at last, and gave the people who stayed something true to rebuild on. It\u2019s a harder start than you needed, on ground you cleared yourself.` };
    }
    return { tone:'villain', tag:'You backed Kai',
      title:'You protected the star and lost the company\u2019s soul',
      txt:`You chose the engine over the signal, every time, until the engine seized. The pattern was in your hands${sawPattern?' \u2014 you\u2019d even seen the data \u2014':''} and you protected Kai anyway. The best people are gone, Kai\u2019s output went with them, and the ones who stayed learned the real policy: at Lumen, under enough pressure, their dignity was always the acceptable price. That\u2019s the number that shows up for years.` };
  },
};
