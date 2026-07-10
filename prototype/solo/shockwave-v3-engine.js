/* ============================================================
   SHOCKWAVE v3 — ENGINE
   Real-time weeks. Trickled info. Dispositions. Pull-to-ask.
   Free-text decisions ruled by an AI referee (window.claude),
   with a deterministic fallback. Everything is timestamped for
   the game-film debrief, and every held item that was never
   surfaced comes back as a counterfactual.
============================================================ */
const C = window.SWV3;
const teamById = Object.fromEntries(C.TEAM.map(t=>[t.id,t]));
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; };
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const av = (t)=>`<span class="c-av" style="background:${t.color}">${t.initials}</span>`;

/* ---------------- STATE ---------------- */
let S = null;
let clockTimer = null;

function fresh(disposition){
  const play = disposition==='surprise'
    ? ['served','request','guarded'][Math.floor(Math.random()*3)]
    : disposition;
  return {
    disposition, play,
    weekIdx:0,
    elapsed:0,            // ms into current week
    extraDays:0,          // from reprieves
    running:false,
    drivers:{ cash:C.DRIVERS.cash.val, board:C.DRIVERS.board.val, morale:C.DRIVERS.morale.val, trust:C.DRIVERS.trust.val },
    burn:C.BURN_START,
    released:new Set(),   // feed ids released
    surprisesFired:new Set(),
    holdsSurfaced:new Set(),   // "week:from" surfaced
    holdsHedged:new Set(),
    holdsAll:[],          // {weekN, from, ...} every hold defined (for counterfactual)
    contacted:new Set(),  // ids contacted this week
    everContacted:new Set(),
    decisions:[],         // per week {week, text, day, ruling, reprieve}
    pulseStated:'',
    reprieves:0,
    timeline:[],          // {week, day, type, text}
    feedItems:[],         // rendered cards this week (for clearing)
    busy:false,
    buzzer:false,
    wkOverride:{},        // weekIdx -> resolved (branched) week object
  };
}

// Classify the Coastal decision (the pre-branch week) into the Week-4 branch.
function branchKey(){
  const d = (S.decisions||[]).filter(x=>x.week===3).slice(-1)[0]
         || (S.decisions||[]).slice(-1)[0];
  const t = ((d&&d.text)||'').toLowerCase();
  const reject = /(reject|declin|refus|turn(ed)?\s+(it|them|coastal)?\s*down|turn\s+down|walk(ed)?\s+away|stay\s+independ|remain\s+independ|independen|no\s+deal|without\s+coastal|on\s+our\s+own|go\s+it\s+alone|say\s+no|pass\s+on|don'?t\s+(take|accept|sign)|not\s+(take|accept|sign))/.test(t);
  const accept = /(accept|take\s+(the|it|coastal|their|this)|sign|do\s+the\s+deal|merge|merger|say\s+yes|agree\s+to|go\s+with\s+coastal|close\s+the\s+deal|take\s+the\s+money|take\s+the\s+offer)/.test(t);
  if(reject && !accept) return 'rejected';
  return 'took';
}

function weekSecondsNow(){ const w=week(); return (w && w.seconds) || C.CONFIG.weekSeconds; }
function dayMs(){ return (weekSecondsNow()*1000)/C.CONFIG.days; }
function totalDays(){ return C.CONFIG.days + S.extraDays; }
function curDay(){ return Math.min(totalDays(), Math.floor(S.elapsed/dayMs())+1); }
function daysLeft(){ return totalDays() - (S.elapsed/dayMs()); }
function week(){ return S ? (S.wkOverride[S.weekIdx] || C.WEEKS[S.weekIdx]) : null; }
function logTL(type,text){ S.timeline.push({week:week().n, day:curDay(), type, text}); }

/* ---------------- TICKER / CHYRON ---------------- */
function paintWire(){
  const w = week();
  const lines = (w&&w.wire)?w.wire:['Markets open','Regional aviation under pressure'];
  const track = $('tickerTrack');
  const seq = [...lines, ...lines];
  track.innerHTML = seq.map(l=>`<span class="tk"><span class="dot"></span>${l}</span>`).join('');
  const ct = $('chyronTrack');
  ct.innerHTML = seq.map(l=>`<span class="chy">${l}</span>`).join('');
}

/* ---------------- HUD ---------------- */
function renderHUD(){
  const d=S.drivers;
  const mfmt = { cash:C.DRIVERS.cash.fmt(d.cash), board:d.board+'%', morale:d.morale+'%', trust:d.trust+'%' };
  const pct = { cash:clamp((d.cash/C.DRIVERS.cash.max)*100,0,100), board:d.board, morale:d.morale, trust:d.trust };
  const col = v => v<25?'var(--alert)':v<50?'var(--amber)':'var(--good)';
  const dots = Array.from({length:totalDays()},(_,i)=>{
    const day=i+1, cd=curDay();
    const c = day<cd?'past':day===cd&&S.running?'now':day<cd?'past':'';
    return `<span class="day-dot ${day<cd?'past':(day===cd?'now':'')}"></span>`;
  }).join('');
  const w=week();
  $('hud').innerHTML = `
   <div class="hud"><div class="stage" style="padding-bottom:0">
    <div class="hud-top">
      <div class="co"><div class="co-logo">${C.COMPANY.logo}</div>
        <div><div class="co-name">${C.COMPANY.name}</div><div class="co-sub">${C.COMPANY.sub}</div></div></div>
      <div class="hudclock" id="hudclock"></div>
    </div>
    <div class="meters">
      ${['cash','board','morale','trust'].map(k=>`
        <div class="meter" id="meter-${k}">
          <div class="mh"><span class="ml">${C.DRIVERS[k].label}</span><span class="mv">${mfmt[k]}</span></div>
          <div class="bar"><span style="width:${pct[k]}%;background:${col(pct[k])}"></span></div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);text-align:right;margin-top:7px;font-family:'JetBrains Mono',monospace">Burn ${'$'+S.burn.toFixed(1)}M / week</div>
   </div></div>`;
  updateCountdown();
}

/* ---------------- INTRO ---------------- */
function renderIntro(){
  stopClock(); hideCountdown();
  $('hud').innerHTML=''; $('railMount').innerHTML=''; $('dockMount').innerHTML='';
  const wrap = el('div');
  const disps = Object.entries(C.DISPOSITIONS);
  wrap.innerHTML = `
    <div class="intro">
      <div class="kick">Leadership Failure Simulation · Solo · CEO</div>
      <h1>Shockwave</h1>
      <div class="role">You are the Chief Executive of ${C.COMPANY.name}, a regional carrier hit overnight by a fuel-and-demand shock.</div>
      <p>This is not a script. The week runs in real time, and your team brings you what they know across the days. You can wait for them \u2014 or reach out to any of them, any time, and ask.</p>
      <p>Each week you\u2019ll hear your team out, then write the call in your own words and send it. Decide early and time jumps ahead. Let the week run out and the world moves without you.</p>
      <div class="setup">
        You will be graded on two things:
        <ol class="grade-list"><li>The outcome for ${C.COMPANY.name}.</li><li>Your leadership through the process.</li></ol>
      </div>
      <div class="disp-h">The team you walk in with</div>
      <p style="font-size:12.5px;color:var(--muted);margin-bottom:4px">In the full program this is set by your history \u2014 the trust you\u2019ve earned or spent in earlier sessions decides how openly your team briefs you. For now, choose the team you\u2019re walking in with.</p>
      <div class="disp-grid" id="dispGrid">
        ${disps.map(([k,v])=>`
          <button class="disp" data-k="${k}">
            <div class="dt">${v.label} <span class="dtag">${v.tag}</span></div>
            <div class="dc">${v.cap}</div>
          </button>`).join('')}
      </div>
      <button class="start-btn" id="startBtn" disabled>Choose a team to begin</button>
    </div>`;
  $('main').innerHTML=''; $('main').appendChild(wrap);
  let chosen=null;
  wrap.querySelectorAll('.disp').forEach(b=>b.onclick=()=>{
    wrap.querySelectorAll('.disp').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); chosen=b.dataset.k;
    const btn=$('startBtn'); btn.disabled=false; btn.textContent='Begin \u2014 the week is running';
  });
  $('startBtn').onclick=()=>{ if(chosen){ S=fresh(chosen); startWeek(); } };
  paintWire();
}

/* ---------------- WEEK LIFECYCLE ---------------- */
function startWeek(){
  // resolve a branching week (Week 4) into a concrete week the first time we enter it
  const raw=C.WEEKS[S.weekIdx];
  if(raw && raw.branches && !S.wkOverride[S.weekIdx]){
    const key=branchKey();
    S.wkOverride[S.weekIdx]=Object.assign({}, raw, raw.branches[key], {_branch:key});
    delete S.wkOverride[S.weekIdx].branches;
  }
  const w=week();
  if(typeof w.burn==='number') S.burn=w.burn;
  S.elapsed=0; S.extraDays=0; S.released=new Set(); S.surprisesFired=new Set();
  S.contacted=new Set(); S.feedItems=[]; S.busy=false; S.buzzer=false;
  // register this week's holds into the master list for counterfactual accounting
  (w.holds||[]).forEach(h=> S.holdsAll.push({...h, weekN:w.n}));
  renderHUD(); paintWire(); renderRail(); renderDock();
  const main=$('main'); main.innerHTML='';
  main.appendChild(bannerEl(w));
  const feed=el('div','feed'); feed.id='feed'; main.appendChild(feed);
  logTL('week', `Week ${w.n} — ${w.title} — begins.`);
  S.running=true;
  startClock();
  updateCountdown();
}

function bannerEl(w){
  const b=el('div','weekbanner');
  b.innerHTML=`<div class="wb-k">Week ${w.n} of ${C.WEEKS.length} · ${w.title}</div><h2>The situation</h2><p>${w.situation}</p>`;
  return b;
}

function startClock(){ stopClock(); clockTimer=setInterval(tick,200); }
function stopClock(){ if(clockTimer){ clearInterval(clockTimer); clockTimer=null; } }

function tick(){
  if(!S.running) return;
  S.elapsed += 200;
  const cd=curDay(), w=week();
  // release volunteered feed
  (w.feed||[]).forEach(it=>{
    if(S.released.has(it.id)) return;
    let releaseDay = it.day;
    if(S.play==='guarded') releaseDay = Math.min(totalDays(), it.day+1); // guarded team is slower
    if(cd>=releaseDay){ S.released.add(it.id); pushFeed(it); }
  });
  // served teams volunteer their held item late in the week
  if(S.play==='served'){
    (w.holds||[]).forEach(h=>{
      const key=w.n+':'+h.from;
      if(!S.holdsSurfaced.has(key) && cd>=5){ surfaceHold(h,true); }
    });
  }
  // surprises
  (w.surprises||[]).forEach((sp,i)=>{
    const key=w.n+':sp'+i;
    if(!S.surprisesFired.has(key) && cd>=sp.day){ S.surprisesFired.add(key); pushSurprise(sp); }
  });
  // mid pulse
  if(w.pulse && !S._pulseFired && cd>=3){ S._pulseFired=true; pushPulse(w.pulse); }
  updateClockUI();
  // week times out → do NOT auto-fail. Enter "buzzer": force a decision now.
  if(S.elapsed >= totalDays()*dayMs() && !S.buzzer){ enterBuzzer(); }
}

function enterBuzzer(){
  S.running=false; stopClock(); S.buzzer=true;
  S.elapsed = totalDays()*dayMs();
  logTL('miss', `<b>Week ${week().n}: the clock ran out.</b> You were pressed to decide under the buzzer.`);
  updateCountdown();
  // focus the decision box, keep both levers live
  const ta=$('decTxt'); if(ta){ ta.focus(); ta.style.borderColor='var(--alert)'; }
  const mb=$('moreBtn'); if(mb && S.reprieves<2){ mb.disabled=false; }
  const feed=$('feed');
  if(feed){
    const c=el('div','card surprise');
    c.innerHTML=`<div class="c-kick surprise">\u23f0 Time\u2019s up</div>
      <p class="c-body">The week is over and the board wants your call. You can still make it \u2014 even briefly \u2014 and it will be measured as the decision you made under maximum pressure. Or buy yourself more time if you truly need it. What you cannot do is nothing.</p>`;
    feed.appendChild(c);
    window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  }
}

function updateClockUI(){
  // day dots + label
  const dl=document.querySelector('.daylabel'); if(dl) dl.textContent=`Day ${curDay()}/${totalDays()}`;
  const dotsWrap=document.querySelector('.days');
  if(dotsWrap){
    const cd=curDay();
    dotsWrap.innerHTML=Array.from({length:totalDays()},(_,i)=>{const day=i+1;return `<span class="day-dot ${day<cd?'past':(day===cd?'now':'')}"></span>`;}).join('');
  }
  updateCountdown();
}

function updateCountdown(){
  const hc=$('hudclock'); if(!hc) return;
  if(!S || (!S.running && !S.buzzer)){ hc.style.visibility='hidden'; return; }
  hc.style.visibility='visible';
  const left=Math.max(0,daysLeft());
  const frac=clamp(left/totalDays(),0,1);
  const secLeft=Math.max(0,Math.ceil((totalDays()*dayMs()-S.elapsed)/1000));
  const mm=Math.floor(secLeft/60), ss=secLeft%60;
  const low = S.buzzer || left<=C.CONFIG.lowTimeDays;
  hc.className='hudclock'+(S.buzzer?' buzzer':(low?' low':''));
  hc.innerHTML=`
    <div class="hc-row"><span class="hc-day">Day ${curDay()}<small>/${totalDays()}</small></span>
      <span class="hc-time">${S.buzzer?'\u23f0 time\u2019s up':mm+':'+String(ss).padStart(2,'0')+' left'}</span></div>
    <div class="hc-bar"><span style="width:${S.buzzer?0:frac*100}%"></span></div>
    <div class="hc-hint">${S.buzzer?'Decide now \u2014 or buy more time':'Running short \u2014 decide or buy time'}</div>`;
  const adv=document.querySelector('.dock-lbl .adv');
  if(adv){
    if(S.buzzer){ adv.innerHTML='<b style="color:var(--alert)">\u23f0 The week has run out \u2014 make the call now, even briefly, or buy more time.</b>'; }
    else if(low){ adv.innerHTML='<b style="color:var(--amber)">Time is short. Make your decision, or use \u201cmore time\u201d if you\u2019re not ready.</b>'; }
  }
}
function hideCountdown(){ const cd=$('countdown'); if(cd){ cd.style.display='none'; } }

/* ---------------- FEED ITEMS ---------------- */
function stamp(){ return `W${week().n} · Day ${curDay()}`; }
function pushFeed(it){
  const t=teamById[it.from]; const feed=$('feed'); if(!feed)return;
  const c=el('div','card inbound');
  c.innerHTML=`<div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <p class="c-body">${it.text}</p>
    <div class="card-actions"><button class="reply-inline" onclick="openCompose('${it.from}',{})">↩ Reply to ${t.name.split(' ')[0]}</button></div>`;
  feed.appendChild(c);
  logTL('info', `<b>${t.name}</b> brought you: \u201c${trunc(it.text)}\u201d`);
}
function pushSurprise(sp){
  const t=teamById[sp.from]; const feed=$('feed'); if(!feed)return;
  const c=el('div','card surprise');
  c.innerHTML=`<div class="c-kick surprise">Unscheduled · ${sp.kind}</div>
    <div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <div class="c-title">${sp.title}</div><p class="c-body">${sp.text}</p>`;
  feed.appendChild(c);
  logTL('info', `<b>Surprise</b> (${sp.kind}): ${sp.title}`);
}
function pushPulse(p){
  const t=teamById[p.from]; const feed=$('feed'); if(!feed)return;
  const c=el('div','card reveal');
  c.innerHTML=`<div class="c-kick reveal">A quiet word</div>
    <div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <p class="c-body">${p.text}</p>
    <div class="surprise-actions"><button class="mini-btn" id="pulseBtn">Answer him</button></div>`;
  $('feed').appendChild(c);
  $('pulseBtn').onclick=()=>openCompose(p.from,{pulse:true});
}
function trunc(s){ return s.length>90?s.slice(0,88)+'\u2026':s; }

/* ---------------- TEAM RAIL ---------------- */
function renderRail(){
  const shortRole = t => ({marcus:'COO',dana:'VP People',priya:'VP Comms',sol:'CFO',ray:'VP Flt Ops'})[t.id] || t.role;
  const r=el('div','rail');
  r.innerHTML=`<div class="stage" style="padding-bottom:0"><div class="rail-h">Your executive team \u2014 reach out any time</div>
    <div class="rail-row">${C.TEAM.map(t=>`
      <div class="tchip ${S.everContacted.has(t.id)?'':''}">
        <span class="av" style="background:${t.color}">${t.initials}<span class="on"></span></span>
        <div><div class="tn">${t.name.split(' ')[0]}</div><div class="tr">${shortRole(t)}</div></div>
        <button class="ask" data-id="${t.id}">Ask</button>
      </div>`).join('')}</div></div>`;
  $('railMount').innerHTML=''; $('railMount').appendChild(r);
  r.querySelectorAll('.ask').forEach(b=>b.onclick=()=>openCompose(b.dataset.id,{}));
}

/* ---------------- DECISION DOCK ---------------- */
function renderDock(){
  const w=week();
  const adv = Object.entries(w.advocacy||{}).map(([id,txt])=>{
    const t=teamById[id]; return `<span style="color:${t.color};font-weight:600">${t.name.split(' ')[0]}</span>`;
  }).join(' · ');
  const d=el('div','dock');
  d.innerHTML=`<div class="dock-in">
    <div class="dock-lbl"><span class="l">Your decision — Week ${w.n}</span>
      <span class="adv">Your team is split: ${adv}. Read them, ask what you need, then make the call.</span></div>
    <div class="dock-row">
      <textarea id="decTxt" placeholder="Write your decision in your own words \u2014 what you're doing, and what you want your team to know\u2026"></textarea>
      <button class="more" id="moreBtn">+ I need more time</button>
      <button class="send" id="decSend">Decide \u2192</button>
    </div></div>`;
  $('dockMount').innerHTML=''; $('dockMount').appendChild(d);
  const ta=$('decTxt');
  ta.addEventListener('input',()=>{ ta.style.height='46px'; ta.style.height=Math.min(120,ta.scrollHeight)+'px'; });
  $('decSend').onclick=submitDecision;
  $('moreBtn').onclick=reprieve;
}

function reprieve(){
  if(S.reprieves>=2){ return; }
  if(!S.running && !S.buzzer) return;
  const wasBuzzer=S.buzzer;
  S.reprieves++; S.extraDays += C.CONFIG.extraDaysPerReprieve;
  logTL('ask', `You bought more time (reprieve #${S.reprieves}). The clock stretched \u2014 but the world noticed.`);
  // cost: the story widens; small board + trust ding; a surprise nudge
  S.drivers.board = clamp(S.drivers.board-3,0,100);
  S.drivers.trust = clamp(S.drivers.trust-2,0,100);
  renderHUD();
  const feed=$('feed');
  if(feed){
    const c=el('div','card reveal');
    c.innerHTML=`<div class="c-kick reveal">You bought time</div>
      <p class="c-body">You told the board you need more days before deciding. They granted it \u2014 coolly. Word travels: the market reads hesitation, and the story you were sitting on has more time to grow. <b>+${C.CONFIG.extraDaysPerReprieve} days</b>, but the room is a degree colder.</p>`;
    feed.appendChild(c);
  }
  const mb=$('moreBtn'); if(S.reprieves>=2){ mb.disabled=true; mb.textContent='No more time'; }
  if(wasBuzzer){ S.buzzer=false; S.running=true; startClock(); const ta=$('decTxt'); if(ta) ta.style.borderColor=''; }
  updateClockUI();
}

/* ---------------- COMPOSE / PULL-TO-ASK ---------------- */
let composeTarget=null, composeOpts=null;
function openCompose(id,opts){
  composeTarget=id; composeOpts=opts||{};
  const t=teamById[id];
  const hint = composeOpts.pulse
    ? 'He\u2019s asking for your honest read, not a decision. Say what you\u2019re really trying to protect.'
    : 'Ask a direct question. What you choose to ask \u2014 and who you ask \u2014 is part of how you lead. Reaching out is free; the clock keeps moving while you wait for the reply.';
  const m=el('div','scrim');
  m.innerHTML=`<div class="modal">
    <div class="modal-h"><span class="av" style="background:${t.color}">${t.initials}</span>
      <div><div class="nm">${t.name}</div><div class="rl">${t.role}</div></div>
      <button class="x" id="cx">\u00d7</button></div>
    <div class="modal-b">
      <p class="hint">${hint}</p>
      <textarea id="askTxt" placeholder="${composeOpts.pulse?'What\u2019s your read right now\u2026':'Type your message to '+t.name.split(' ')[0]+'\u2026'}"></textarea>
      <div class="modal-actions">
        ${composeOpts.pulse?'':'<button class="vm" id="vmBtn">Leave voicemail</button>'}
        <button class="snd" id="sndBtn" disabled>${composeOpts.pulse?'Send':'Send message'}</button>
      </div>
      ${composeOpts.pulse?'':'<div class="cost-note">The week keeps running while you wait for the reply.</div>'}
    </div></div>`;
  $('modalMount').innerHTML=''; $('modalMount').appendChild(m);
  const ta=$('askTxt'), snd=$('sndBtn');
  ta.focus();
  ta.addEventListener('input',()=>{ snd.disabled=ta.value.trim().length<3; });
  $('cx').onclick=closeCompose;
  m.onclick=(e)=>{ if(e.target===m) closeCompose(); };
  snd.onclick=()=>sendAsk(ta.value.trim(),false);
  if($('vmBtn')) $('vmBtn').onclick=()=>{ if(ta.value.trim().length>=3) sendAsk(ta.value.trim(),true); };
}
function closeCompose(){ $('modalMount').innerHTML=''; composeTarget=null; }

async function sendAsk(text,isVoicemail){
  const id=composeTarget, t=teamById[id], pulse=composeOpts.pulse;
  closeCompose();
  if(pulse){
    S.pulseStated=text;
    logTL('ask', `You told <b>${t.name}</b> your read: \u201c${trunc(text)}\u201d`);
    const feed=$('feed'); if(feed){
      const c=el('div','card reply');
      c.innerHTML=`<div class="c-kick reply">You \u2192 ${t.name.split(' ')[0]}</div><p class="c-body">\u201c${text}\u201d</p>`;
      feed.appendChild(c);
      const ack=el('div','card inbound');
      ack.innerHTML=`<div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>`+
        `<p class="c-body">Thank you \u2014 that helps me more than you know. I\u2019ll hold you to it, quietly. When this is over, that\u2019s the line I\u2019ll remind you of.</p>`;
      feed.appendChild(ack);
    }
    return;
  }
  // reaching out no longer costs clock time — we WANT to reward it.
  // (Over-asking a guarded exec still carries a relational read in scoring.)
  S.contacted.add(id); S.everContacted.add(id);
  logTL('ask', `You reached out to <b>${t.name}</b>${isVoicemail?' (voicemail)':''}: \u201c${trunc(text)}\u201d`);
  updateClockUI();
  // echo the player's message
  const feed=$('feed');
  const you=el('div','card reply');
  you.innerHTML=`<div class="c-kick reply">You \u2192 ${t.name.split(' ')[0]}${isVoicemail?' · voicemail':''}</div><p class="c-body">\u201c${text}\u201d</p>`;
  feed.appendChild(you);
  // thinking bubble
  const think=el('div','card inbound');
  think.innerHTML=`<div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <p class="c-body"><span class="thinking"><span></span><span></span><span></span></span></p>`;
  feed.appendChild(think);

  // does this question hit a held item?
  const w=week(); const hold=(w.holds||[]).find(h=>h.from===id);
  const key=w.n+':'+id;
  let replyText=null, isReveal=false;
  if(hold && !S.holdsSurfaced.has(key)){
    const hit = matchHold(text,hold);
    if(hit){
      if(S.play==='guarded' && !S.holdsHedged.has(key)){
        S.holdsHedged.add(key);
        replyText = hold.hedge + ' \u2014 press me if you want the rest.';
      } else {
        replyText = hold.reveal; isReveal=true;
        S.holdsSurfaced.add(key);
      }
    }
  }
  if(replyText===null){
    replyText = await genReply(t,text,isVoicemail);
  }
  think.remove();
  const c=el('div', isReveal?'card reveal':'card inbound');
  c.innerHTML=`${isReveal?'<div class="c-kick reveal">Now it comes out</div>':''}
    <div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <p class="c-body">${replyText}</p>
    <div class="card-actions"><button class="reply-inline" onclick="openCompose('${t.id}',{})">↩ Reply to ${t.name.split(' ')[0]}</button></div>`;
  feed.appendChild(c);
  if(isReveal){ logTL('reveal', `<b>${t.name}</b> gave up what they were holding: \u201c${trunc(hold.reveal)}\u201d`); }
  else { logTL('info', `<b>${t.name}</b> replied.`); }
}

function surfaceHold(h,volunteered){
  const w=week(); const key=w.n+':'+h.from; if(S.holdsSurfaced.has(key))return;
  S.holdsSurfaced.add(key);
  const t=teamById[h.from]; const feed=$('feed'); if(!feed)return;
  const c=el('div','card reveal');
  c.innerHTML=`<div class="c-kick reveal">${volunteered?'Brought to you unprompted':'Now it comes out'}</div>
    <div class="c-from">${av(t)}<div><div class="c-name">${t.name}</div><div class="c-role">${t.role}</div></div><div class="c-time">${stamp()}</div></div>
    <p class="c-body">${h.reveal}</p>`;
  feed.appendChild(c);
  logTL('reveal', `<b>${t.name}</b> volunteered what a guarded team would have sat on: \u201c${trunc(h.reveal)}\u201d`);
}

function matchHold(text,hold){
  const low=text.toLowerCase();
  if((hold.triggerHints||[]).some(h=>low.includes(h))) return true;
  // also match if they mention the person's domain topic word
  if(hold.topic && low.includes(hold.topic.toLowerCase().split(' ').slice(-1)[0])) return true;
  return false;
}

/* ---------------- AI: in-character reply ---------------- */
async function genReply(t,question,isVoicemail){
  const w=week();
  const sys=`You are ${t.name}, ${t.role} at ${C.COMPANY.name}, a regional airline in an acute financial crisis. Your character voice: ${t.voice}. Your standing priority under pressure: ${t.priority}. It is Week ${w.n}: ${w.title}. Situation: ${w.situation}
The CEO (the user) has just ${isVoicemail?'left you a voicemail':'messaged you'}. Reply IN CHARACTER, first person, to the CEO. Be concrete and human, 2-4 sentences. Do not narrate or use stage directions. Do not resolve the whole crisis — you're one voice with one view. Advocate your priority honestly but don't be a caricature.`;
  try{
    if(window.claude && window.claude.complete){
      const out = await window.claude.complete({ model:'claude-haiku-4-5', max_tokens:220,
        system:sys, messages:[{role:'user', content:question}] });
      const clean=(out||'').trim().replace(/^["\u201c]|["\u201d]$/g,'');
      if(clean) return clean;
    }
  }catch(e){ /* fall through */ }
  // deterministic fallback
  return fallbackReply(t,question);
}
function fallbackReply(t,q){
  const byId={
    marcus:'Straight answer: we don\u2019t have the runway to be gentle. Give me the call and I\u2019ll execute it clean, but every day we debate is a day of cash we\u2019re not getting back.',
    dana:'I hear the pressure. But whatever we do lands on real people who\u2019ve stayed loyal through worse. Tell me you\u2019ll let me protect them where we can, and I\u2019m with you.',
    priya:'We can shape this if we move now. Give me a line I can stand behind and I\u2019ll get ahead of it \u2014 but I need to know what\u2019s actually true before I put your name on anything.',
    sol:'Let me be precise: the numbers don\u2019t leave much room. I can model whichever path you choose, but none of them are painless, and I won\u2019t pretend otherwise.',
    ray:'The fleet and the crews are sound \u2014 that part I can promise you. What I can\u2019t promise is how long the crews stay calm if they think we\u2019re not being straight with them.',
  };
  return byId[t.id] || 'Understood. Let me get you what you need.';
}

/* ---------------- DECISION SUBMISSION ---------------- */
async function submitDecision(){
  if(S.busy) return;
  const ta=$('decTxt'); const text=(ta?ta.value.trim():'');
  if(text.length<8){ ta.style.borderColor='var(--alert)'; ta.placeholder='Say what you\u2019re actually deciding \u2014 in your own words.'; return; }
  S.busy=true; S.running=false; stopClock();
  const w=week(); const decidedDay=curDay(); const early = decidedDay < C.CONFIG.days && !S.buzzer;
  const underBuzzer=S.buzzer; S.buzzer=false; hideCountdown();
  $('decSend').disabled=true; $('decSend').textContent='Ruling\u2026'; $('moreBtn').disabled=true;
  logTL('decision', `<b>Week ${w.n} decision</b> (Day ${decidedDay}${underBuzzer?', under the buzzer':''}): \u201c${trunc(text)}\u201d`);
  const conduct=conductSummary(); conduct.underBuzzer=underBuzzer;
  const ruling = await referee(w,text,conduct,decidedDay);
  // apply deltas
  applyDeltas(ruling.deltas);
  S.decisions.push({week:w.n, text, day:decidedDay, ruling, reprieve:S.reprieves, conduct, underBuzzer});
  renderHUD();
  showTransition(w,ruling,early,false,underBuzzer);
  S.busy=false;
}

function timeoutWeek(){
  const w=week();
  logTL('miss', `<b>Week ${w.n}: no decision.</b> The week ran out. The world moved without you.`);
  const conduct=conductSummary();
  const noDecision={
    narrative:`The week closed with no call from your office. The board convened without a plan from you; your team improvised in the vacuum. Indecision, in a crisis, is itself a decision \u2014 and it read as one.`,
    deltas:{ cash:-w.burn, board:-12, morale:-8, trust:-5 },
    dims:{ decisiveness:-2, prudence:-1, people:-1, truth:0, inquiry:conduct.asked>0?0:-1, conduct:-1 },
    teamReactions:[
      {who:'marcus', text:'We needed a call and didn\u2019t get one. So I made the ones I could. You may not like all of them.'},
      {who:'dana', text:'The floor noticed the silence from the top. That\u2019s the thing about a vacuum \u2014 someone always fills it, and it\u2019s rarely with calm.'},
    ],
  };
  applyDeltas(noDecision.deltas);
  S.decisions.push({week:w.n, text:'(no decision — week timed out)', day:totalDays(), ruling:noDecision, reprieve:S.reprieves, conduct, timedOut:true});
  renderHUD();
  showTransition(w,noDecision,false,true);
}

function conductSummary(){
  const contactedNames=[...S.contacted].map(id=>teamById[id].name.split(' ')[0]);
  const ignored=C.TEAM.filter(t=>!S.contacted.has(t.id)).map(t=>t.name.split(' ')[0]);
  const w=week();
  const heldThisWeek=(w.holds||[]);
  const surfaced=heldThisWeek.filter(h=>S.holdsSurfaced.has(w.n+':'+h.from)).map(h=>teamById[h.from].name.split(' ')[0]);
  const missed=heldThisWeek.filter(h=>!S.holdsSurfaced.has(w.n+':'+h.from)).map(h=>teamById[h.from].name.split(' ')[0]);
  return { asked:S.contacted.size, contactedNames, ignored, surfaced, missed, reprieves:S.reprieves };
}

/* ---------------- AI: referee ---------------- */
async function referee(w,decisionText,conduct,decidedDay){
  const d=S.drivers;
  const sys=`You are the referee of a leadership crisis simulation for ${C.COMPANY.name}, a regional airline near insolvency. You are fair, sharp, and unsentimental. You never coach the player or reveal a "right answer." You rule on the CEO's written decision by reading it against the world model, then translate it into consequences.

WORLD MODEL (current): cash $${d.cash.toFixed(1)}M, board confidence ${d.board}, workforce morale ${d.morale}, public trust ${d.trust}. Weekly burn $${S.burn.toFixed(1)}M.
WEEK ${w.n} — ${w.title}. Situation: ${w.situation}
Team advocated competing priorities: ${Object.entries(w.advocacy).map(([id,t])=>teamById[id].name+': "'+t+'"').join(' | ')}

CONDUCT THIS WEEK: The CEO reached out to ${conduct.asked} of ${C.TEAM.length} advisors (${conduct.contactedNames.join(', ')||'none'}); did not contact ${conduct.ignored.join(', ')||'no one'}. ${conduct.surfaced.length?('They surfaced held information from '+conduct.surfaced.join(', ')+'.'):'They surfaced no hidden information.'} ${conduct.missed.length?('There was critical information still held by '+conduct.missed.join(', ')+' that they never asked for.'):''} Reprieves used: ${conduct.reprieves}. Decided on day ${decidedDay} of ${C.CONFIG.days}.${conduct.underBuzzer?' The CEO did not decide until the clock fully ran out and they were forced to the buzzer — weigh this as a sign of indecision, though the fact they still made a real call under maximum pressure is itself worth reading.':''}

Return ONLY strict minified JSON, no prose, this exact shape:
{"narrative":"2-3 sentences: what happens in the world as a result of this decision, concrete and in-fiction, no coaching","deltas":{"cash":<number -8..6>,"board":<int -20..15>,"morale":<int -20..15>,"trust":<int -20..15>},"dims":{"decisiveness":<int -2..2>,"prudence":<int -2..2>,"people":<int -2..2>,"truth":<int -2..2>,"inquiry":<int -2..2>,"conduct":<int -2..2>},"teamReactions":[{"who":"<advisor id: marcus|dana|priya|sol|ray>","text":"one in-character sentence reacting to the decision AND how they were treated"},{"who":"<different id>","text":"..."}]}
Scoring guidance: reward decisiveness that is also informed; penalize decisions made while ignoring advisors who held critical info (low inquiry). Judge 'conduct' on HOW the CEO wrote the decision — did they acknowledge who they overruled, explain, treat people as people — not just what they chose. cash delta is on top of the -$${S.burn.toFixed(1)}M weekly burn.`;
  try{
    if(window.claude && window.claude.complete){
      const out=await window.claude.complete({ model:'claude-haiku-4-5', max_tokens:600, system:sys,
        messages:[{role:'user', content:'CEO decision: "'+decisionText+'"'}] });
      const parsed=parseJSON(out);
      if(parsed && parsed.deltas && parsed.dims){
        // fold weekly burn into cash delta
        parsed.deltas.cash = (Number(parsed.deltas.cash)||0) - S.burn;
        parsed.teamReactions = (parsed.teamReactions||[]).filter(r=>teamById[r.who]);
        if(!parsed.teamReactions.length) parsed.teamReactions=fallbackReactions(decisionText);
        return parsed;
      }
    }
  }catch(e){ /* fall through */ }
  return fallbackRuling(w,decisionText,conduct,decidedDay);
}
function parseJSON(s){
  if(!s) return null;
  let t=s.trim().replace(/```json/gi,'').replace(/```/g,'');
  const a=t.indexOf('{'), b=t.lastIndexOf('}');
  if(a<0||b<0) return null;
  try{ return JSON.parse(t.slice(a,b+1)); }catch(e){ return null; }
}

/* ---------------- Deterministic fallback ruling ---------------- */
function fallbackRuling(w,text,conduct,decidedDay){
  const low=text.toLowerCase();
  const has=(...ws)=>ws.some(x=>low.includes(x));
  let deltas={cash:0,board:0,morale:0,trust:0};
  let dims={decisiveness:0,prudence:0,people:0,truth:0,inquiry:0,conduct:0};
  // cash-protective moves
  if(has('cut','furlough','ground','layoff','reduce','trim','close')){ deltas.cash+=3; deltas.morale-=6; dims.prudence+=1; dims.people-=1; }
  // people-protective
  if(has('protect','keep','no furlough','no layoff','retain','pay freeze','exec pay','share the')){ deltas.morale+=6; deltas.cash-=1; dims.people+=1; }
  // customer/reputation
  if(has('refund','customer','passenger','apolog','transparen','statement','press','public')){ deltas.trust+=5; deltas.cash-=1; dims.truth+=1; }
  // financing
  if(has('loan','bridge','revolver','financ','capital','raise','draw')){ deltas.cash+=3; deltas.board+=2; dims.prudence+=1; }
  // truth / honesty
  if(has('honest','truth','tell them','be straight','admit','own it')){ dims.truth+=1; deltas.trust+=3; }
  // decisiveness by specificity + timing
  const wordCount=text.split(/\s+/).length;
  if(wordCount>25 && has('will','i\u2019m','we\u2019re','by','today','this week','directive')){ dims.decisiveness+=1; deltas.board+=3; }
  if(decidedDay<=3){ dims.decisiveness+=1; } if(conduct.underBuzzer){ dims.decisiveness-=1; }
  // inquiry
  if(conduct.surfaced.length){ dims.inquiry+=2; deltas.board+=3; }
  else if(conduct.missed.length){ dims.inquiry-=1; }
  if(conduct.asked===0){ dims.inquiry-=1; dims.conduct-=1; }
  // conduct: acknowledgement language
  if(has('thank','i know','i understand','i hear','difficult','not easy','to the team','to everyone')){ dims.conduct+=1; deltas.morale+=2; }
  // reprieve penalty
  if(conduct.reprieves>0){ dims.decisiveness-=conduct.reprieves; }
  deltas.cash -= S.burn;
  // clamp dims
  Object.keys(dims).forEach(k=>dims[k]=clamp(dims[k],-2,2));
  const narrative = `Your directive moves through the company over the days that follow. ${has('cut','furlough','ground','close')?'The cuts land \u2014 cash steadies, but the floor feels it.':''} ${has('protect','keep','no furlough')?'The signal that you\u2019re shielding people buys loyalty, at a cost to the runway.':''} ${conduct.missed.length?'What you weren\u2019t told still moves under the surface.':''} The board and the market absorb the call and adjust.`;
  return { narrative:narrative.replace(/\s+/g,' ').trim(), deltas, dims, teamReactions:fallbackReactions(text) };
}
function fallbackReactions(text){
  return [
    {who:'marcus', text:'It\u2019s a call. I\u2019ll run it hard \u2014 that\u2019s what I do. We\u2019ll see in a week if it was the right one.'},
    {who:'dana', text:'I\u2019ll carry this to the floor. How you said it matters as much as what you chose \u2014 remember that when they ask me why.'},
  ];
}

function applyDeltas(dl){
  S.drivers.cash = clamp(S.drivers.cash + (dl.cash||0), 0, C.DRIVERS.cash.max+20);
  S.drivers.board = clamp(S.drivers.board + (dl.board||0), 0, 100);
  S.drivers.morale = clamp(S.drivers.morale + (dl.morale||0), 0, 100);
  S.drivers.trust = clamp(S.drivers.trust + (dl.trust||0), 0, 100);
}

/* ---------------- WEEK TRANSITION ---------------- */
function showTransition(w,ruling,early,timedOut,underBuzzer){
  $('dockMount').innerHTML=''; $('railMount').innerHTML=''; hideCountdown();
  const main=$('main');
  const box=el('div','transition');
  const reacts=(ruling.teamReactions||[]).map(r=>{
    const t=teamById[r.who]; if(!t)return'';
    return `<div class="react-row"><span class="react-av" style="background:${t.color}">${t.initials}</span>
      <div class="react-bub"><div class="react-who">${t.name} · ${t.role}</div><div class="react-txt">${r.text}</div></div></div>`;
  }).join('');
  const last = w.final;
  const dm = ruling.deltas||{};
  const mvRows = ['cash','board','morale','trust'].map(k=>{
    const v=dm[k]||0;
    if(!v) return `<div class="mv-row flat"><span>${C.DRIVERS[k].label}</span><span class="mv-val">no change</span></div>`;
    const up=v>0;
    const disp = k==='cash' ? ((up?'+':'\u2212')+'$'+Math.abs(v).toFixed(1)+'M') : ((up?'+':'\u2212')+Math.abs(v)+' pts');
    return `<div class="mv-row ${up?'up':'dn'}"><span>${C.DRIVERS[k].label}</span><span class="mv-val">${up?'\u25b2':'\u25bc'} ${disp}</span></div>`;
  }).join('');
  const movement = `<div class="movement"><div class="mv-h">This week\u2019s movement \u2014 what your call moved</div><div class="mv-grid">${mvRows}</div></div>`;
  box.innerHTML=`<div class="tk2">${underBuzzer?'Decided under the buzzer':(timedOut?'The week ran out':(early?'Jumping ahead':'End of week '+w.n))}</div>
    <h2>${last?'The dust settles':'Week '+w.n+' → Week '+(w.n+1)}</h2>
    <p>${ruling.narrative}</p>
    ${movement}
    ${reacts}
    <button class="cont" id="contBtn">${last?'See the debrief':'Into Week '+(w.n+1)+' \u2192'}</button>`;
  main.appendChild(box);
  box.scrollIntoView===undefined; window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  $('contBtn').onclick=()=>{
    if(last){ renderDebrief(); }
    else { S.weekIdx++; S._pulseFired=false; startWeek(); window.scrollTo({top:0,behavior:'smooth'}); }
  };
}

/* ---------------- DEBRIEF ---------------- */
function renderDebrief(){
  stopClock(); hideCountdown();
  $('hud').innerHTML=''; $('railMount').innerHTML=''; $('dockMount').innerHTML='';
  const d=S.drivers;
  const survived = d.cash>0 && d.board>=32;
  // aggregate dims across decisions
  const dimKeys=Object.keys(C.DIMENSIONS);
  const agg=Object.fromEntries(dimKeys.map(k=>[k,0]));
  S.decisions.forEach(dec=>{ dimKeys.forEach(k=>{ agg[k]+=(dec.ruling.dims&&dec.ruling.dims[k])||0; }); });
  // normalize to 0-100 (range per dim: -2..2 per week * weeks)
  const wk=S.decisions.length||1;
  const norm=k=> clamp(Math.round(((agg[k]+2*wk)/(4*wk))*100),0,100);
  const dimScore=Object.fromEntries(dimKeys.map(k=>[k,norm(k)]));
  const overall=Math.round(dimKeys.reduce((s,k)=>s+dimScore[k],0)/dimKeys.length);
  const grade = overall>=80?'Exemplary':overall>=65?'Strong':overall>=50?'Mixed':overall>=35?'Concerning':'Failing';

  // counterfactuals: holds never surfaced
  const missedHolds=S.holdsAll.filter(h=>!S.holdsSurfaced.has(h.weekN+':'+h.from));
  const surfacedHolds=S.holdsAll.filter(h=>S.holdsSurfaced.has(h.weekN+':'+h.from));

  // villain/hero framing: keyed on care-for-people vs pure survival + truth
  const savedPeople = dimScore.people>=55 && dimScore.truth>=50;
  const heroWho = savedPeople ? 'To your people, and the ones who had no vote' : 'To the balance sheet and the board';
  const heroTxt = savedPeople
    ? 'You carried the company AND refused to let the people who built it become line items. Where you could protect them you did, and where you couldn\u2019t you told them the truth to their face. That is the harder, rarer thing.'
    : 'You kept the company alive, and the numbers will say you succeeded. The people who trusted you to fight for them will remember it differently \u2014 that when the pressure came, they were the first thing spent.';
  const villainWho = savedPeople ? 'To the market, briefly' : 'To the people you led';
  const villainTxt = savedPeople
    ? 'Some will say you were too slow to cut, too soft when survival demanded teeth. You wore that risk on purpose. The question the debrief asks: did protecting people cost the company its future, or did it cost you only comfort?'
    : 'You didn\u2019t set out to be the villain. You made \u201crational\u201d calls under real pressure \u2014 and each one quietly moved the cost onto someone who wasn\u2019t in the room. Nobody chooses to be the villain. They just optimize, one reasonable decision at a time.';

  // starting disposition read
  const dispName=C.DISPOSITIONS[S.play].label;
  const dispRead = {
    served:'You walked in with a forthcoming team \u2014 the kind of openness a leader earns over time. They brought you the hard news without being asked. The question the program will keep asking: did you honor that trust, or spend it?',
    request:'You walked in with a team that answers honestly but volunteers nothing hard \u2014 a neutral starting trust. What you learned depended entirely on what you thought to ask. That is the most common team a leader actually has.',
    guarded:'You walked in with a guarded team \u2014 the kind you get after trust has been spent. They held the truth until pressed, and hedged even then. In the full program, this is not a setting; it is a consequence of how you\u2019ve led before.',
  }[S.play] || '';

  const dimLabel=k=>C.DIMENSIONS[k];
  const dimNote={
    decisiveness:'How clearly and how early you committed \u2014 and whether you gathered first or froze.',
    prudence:'Whether your calls respected the balance sheet and the real clock.',
    people:'Whether the human cost stayed in view, or became something spent quietly.',
    truth:'Whether you told hard truths to the people owed them.',
    inquiry:'Whether you surfaced what your team was holding \u2014 or decided blind.',
    conduct:'How you treated people in the act of deciding, not just what you chose.',
  };

  // ---- COACHING: grouped, concrete "do differently" by weakest dimensions ----
  const neverContacted=C.TEAM.filter(t=>!S.everContacted.has(t.id)).map(t=>t.name.split(' ')[0]);
  const buzzerCount=S.decisions.filter(dec=>dec.underBuzzer).length;
  const missNames=missedHolds.map(h=>teamById[h.from].name.split(' ')[0]);
  const coachBook={
    inquiry:()=>[
      neverContacted.length? `You never reached out to <b>${neverContacted.join(', ')}</b> \u2014 not once, across the whole crisis. Each was sitting on something. One question, \u201cwhat am I not seeing?\u201d, would have surfaced it.` : `You reached out widely \u2014 keep doing that, but push past the first answer. The best information usually comes after the second question.`,
      missedHolds.length? `${missedHolds.length} decisive item${missedHolds.length>1?'s were':' was'} held by <b>${[...new Set(missNames)].join(', ')}</b> and never came out. It wasn\u2019t hidden \u2014 it was one question away.` : `You surfaced everything your team was holding. That is rare and it is the whole game.`,
      `Make your last move before deciding \u201cwho haven\u2019t I heard from?\u201d rather than \u201cwhat do I already believe?\u201d`,
    ],
    people:()=>[
      `When you moved on the workforce you led with the number, not the people. Name who absorbs the cost \u2014 and tell them yourself \u2014 and the same decision reads as leadership instead of a cut.`,
      `Dana kept raising the human cost. Pull her in <i>before</i> you decide and make her case part of the call, not a footnote to it.`,
      `A furlough and a betrayal can be the same action. The only difference the room feels is whether they saw you fight for them first.`,
    ],
    truth:()=>[
      `You had openings to tell the hard truth \u2014 to the board, the public, your own people \u2014 and softened them. Softening buys a day and spends the trust you\u2019ll need by week three.`,
      `The safety story didn\u2019t need spin; it needed a straight answer, early, from you. People forgive a hard truth far faster than a managed one.`,
      `Say the difficult thing while it\u2019s still your choice to say it. Once it leaks, you\u2019re not truthful \u2014 you\u2019re caught.`,
    ],
    prudence:()=>[
      `You spent against a balance sheet that couldn\u2019t carry it. The covenant Sol was holding was the tell \u2014 cash under $40M and the lenders move on you.`,
      `\u201cDecisive\u201d and \u201creckless\u201d look identical until the bill arrives. Pressure-test the biggest number in the room before you commit to it.`,
      `Protect one week of runway you don\u2019t think you\u2019ll need. In a crisis, the reserve you kept is the option nobody else has.`,
    ],
    decisiveness:()=>[
      buzzerCount? `You went to the buzzer ${buzzerCount} time${buzzerCount>1?'s':''}. Waiting isn\u2019t gathering \u2014 once you\u2019ve asked, the next move is to commit, not to circle.` : `You committed, but late. Ask fast, then close \u2014 the value of a decision decays every day it sits.`,
      `Separate the two jobs: gather hard and quickly, then decide cleanly. Blending them is how good leaders freeze.`,
      `A 70%-right call made on Day 3 usually beats a 90%-right call made on Day 7. Speed is part of the answer.`,
    ],
    conduct:()=>[
      `How you decided landed as hard as what you decided. People who felt handled \u2014 not heard \u2014 remember it long after the numbers recover.`,
      `Go back to the people your call cost and tell them directly. Ducking that conversation is the part they never forget.`,
      `Under pressure, the small courtesies are the signal. They tell your team whether the person they trusted is still in the chair.`,
    ],
  };
  const weakest=dimKeys.slice().sort((a,b)=>dimScore[a]-dimScore[b]).slice(0,2);
  const coachingHTML=weakest.map(k=>`
    <div class="coach">
      <div class="coach-h"><span class="coach-dim">${dimLabel(k)}</span><span class="coach-sc">scored ${dimScore[k]}/100</span></div>
      <div class="coach-lead">To reach a different outcome on <b>${dimLabel(k).toLowerCase()}</b>, you could have:</div>
      <ol class="coach-list">${coachBook[k]().map(b=>`<li>${b}</li>`).join('')}</ol>
    </div>`).join('');

  // ---- GAME-FILM: tag each moment good / bad / key ----
  const tlMeta=t=>{
    if(t.type==='reveal') return {cls:'good', tag:'\u2713 You surfaced this', note:'You pulled it into the open before deciding \u2014 exactly the move.'};
    if(t.type==='ask') return {cls:'good', tag:'\u2713 You reached out', note:'Asking instead of assuming.'};
    if(t.type==='miss') return {cls:'bad', tag:'\u2717 Left on the table', note:'Decided without it.'};
    if(t.type==='decision') return {cls:'key', tag:'Your call', note:''};
    return {cls:'', tag:'', note:''};
  };

  // ---- BRANCH-SPECIFIC ENDING: name the version of the ending they earned ----
  const branch = (S.wkOverride && Object.values(S.wkOverride).map(x=>x&&x._branch).find(Boolean)) || 'took';
  const foundEarnout = S.holdsSurfaced.has('4:sol');    // took: the lever that protects the crews
  const wonTheRoom   = S.holdsSurfaced.has('4:marcus');  // rejected: Helen Cho, the real vote
  const keptPeople   = dimScore.people>=52;
  let endTitle, endTxt, endTone;
  if(branch==='took'){
    if(foundEarnout && keptPeople){
      endTone='hero'; endTitle='You saved the company \u2014 and refused to let go of the people in it';
      endTxt='You took Coastal\u2019s money and then spent your last chip well: you found the earn-out that tied their own numbers to the feeder network, and made keeping those crews Coastal\u2019s interest instead of your plea. You lost control of the company. You did not lose the thing you kept saying you were protecting.';
    } else if(foundEarnout){
      endTone='mixed'; endTitle='You saved the company, found the lever \u2014 and didn\u2019t pull it hard enough';
      endTxt='You took the rescue and you did surface the earn-out that gave you standing to fight for the crews. But when it came to spending your position on them, the record shows you eased off. The company lives; the people who took the freeze first read the ending differently than you do.';
    } else {
      endTone='villain'; endTitle='You saved the company and let the wheel go with it';
      endTxt='You took Coastal\u2019s money and Halcyon survived. When integration came for the feeder crews there was one lever \u2014 the earn-out that made protecting them Coastal\u2019s own financial interest \u2014 and you never found it, because you never asked Sol. The people who trusted you first learned that trusting you was the expensive choice.';
    }
  } else { // rejected
    if(wonTheRoom && survived){
      endTone='hero'; endTitle='You kept the company yours \u2014 and won the room the honest way';
      endTxt='You turned down the rescue, stared down a hostile bid, and carried the vote by doing the hard thing: leveling with Helen Cho about the real risk instead of selling her a deck. Halcyon is still independent, still yours, and the people who bet on you were right to.';
    } else if(survived){
      endTone='mixed'; endTitle='You stayed independent \u2014 and survived more by luck than by reading the room';
      endTxt='You held the line and Halcyon is still yours. But you never found that the board vote was really one person \u2014 Helen Cho, won by candor, not confidence \u2014 so you fought the whole room when you only needed her. You got lucky where you could have been sure.';
    } else {
      endTone='villain'; endTitle='You bet the company on staying yourself \u2014 and the board cashed you out';
      endTxt='You rejected the rescue to keep Halcyon independent, and the board chose Meridian\u2019s certainty over your conviction. The company you were protecting isn\u2019t yours anymore. The only question the debrief leaves open is the one Ray asked in the hallway: was the bet for them, or for you?';
    }
  }
  const endingHTML=`
    <div class="res-h">How it ended</div>
    <div class="ending ${endTone}">
      <div class="ending-tag">${branch==='took'?'You accepted Coastal\u2019s rescue':'You rejected Coastal and stayed independent'}</div>
      <h3>${endTitle}</h3>
      <p>${endTxt}</p>
    </div>`;

  const main=$('main'); main.innerHTML='';
  const r=el('div','result');
  r.innerHTML=`
    <div class="res-top ${survived?'survive':'fail'}">
      <div class="res-verdict">${survived?'Halcyon survives':'Halcyon does not make it'}</div>
      <h2>${survived?'The company is still flying \u2014 changed, and standing.':'The company could not clear the crisis intact.'}</h2>
      <p>Cash ${C.DRIVERS.cash.fmt(d.cash)} · Board ${d.board} · Morale ${d.morale} · Public trust ${d.trust}</p>
      <div class="res-score"><span class="big">${overall}</span><span class="max">/ 100 leadership</span><span class="gr">${grade}</span></div>
    </div>
    <div class="res-body">

      ${endingHTML}

      <div class="res-h">The read \u2014 how you led</div>
      ${dimKeys.map(k=>`<div class="dim">
        <div class="dim-top"><b>${dimLabel(k)}</b><span class="s">${dimScore[k]}</span></div>
        <div class="bar"><span style="width:${dimScore[k]}%;background:${dimScore[k]<40?'var(--alert)':dimScore[k]<60?'var(--amber)':'var(--good)'}"></span></div>
        <div class="dim-note">${dimNote[k]}</div>
      </div>`).join('')}

      <div class="res-h">The team you walked in with \u2014 ${dispName}</div>
      <div class="read">${dispRead}</div>

      ${S.pulseStated?`<div class="res-h">Stated vs. revealed</div>
        <div class="read">Mid-crisis, you told Ray what you were trying to protect: <b>\u201c${S.pulseStated}\u201d</b><br><br>
        Set that beside what your decisions actually show \u2014 care for people scored <b>${dimScore.people}</b>, truth <b>${dimScore.truth}</b>, prudence <b>${dimScore.prudence}</b>. The gap between what a leader believes they\u2019re doing and what the record shows is where the real coaching lives.</div>`:''}

      <div class="res-h">The counterfactual \u2014 what you weren\u2019t told</div>
      ${missedHolds.length? missedHolds.map(h=>`<div class="cf"><div class="cf-h">${teamById[h.from].name} was holding this \u2014 and you never asked</div><div class="cf-txt">${h.counterfactual}</div></div>`).join('')
        : '<div class="cf good"><div class="cf-h">You surfaced what your team was holding</div><div class="cf-txt">In every week, you reached the person sitting on the decisive information and pulled it into the open before you decided. That is the difference between a leader who is briefed and one who thinks they are.</div></div>'}
      ${surfacedHolds.length&&missedHolds.length? `<div class="cf good"><div class="cf-h">Where you did dig</div><div class="cf-txt">You did surface ${surfacedHolds.length} held item${surfacedHolds.length>1?'s':''} \u2014 proof you know how. The misses weren\u2019t inability. They were attention.</div></div>`:''}

      <div class="res-h">The game-film \u2014 your crisis, minute by minute</div>
      <div class="tl">${S.timeline.map(t=>{const m=tlMeta(t);return `<div class="tl-item ${t.type} ${m.cls}"><div class="tl-when">Wk ${t.week} · Day ${t.day}</div><div class="tl-body"><div class="tl-txt">${t.text}</div>${m.tag?`<div class="tl-badge ${m.cls}">${m.tag}${m.note?' \u00b7 <span class="tl-note">'+m.note+'</span>':''}</div>`:''}</div></div>`;}).join('')}</div>

      <div class="res-h">Where to grow \u2014 what would have changed the outcome</div>
      <div class="coach-intro">Your two lowest reads, and the concrete moves that would have moved them. This is the part worth taking into the next crisis.</div>
      ${coachingHTML}

      <div class="res-h">Villain or hero?</div>
      <div class="vh">
        <div class="vh-head"><div class="vh-eyebrow">The frame that outlasts the score</div>
          <h3>Nobody chooses to be the villain.</h3>
          <div class="vh-formula">Event + Response = Outcome \u2014 you don\u2019t pick the crisis, only who you were inside it.</div></div>
        <div class="vh-frames">
          <div class="vh-frame"><div class="vh-tag hero">Hero</div><div class="vh-who">${heroWho}</div><div class="vh-txt">${heroTxt}</div></div>
          <div class="vh-frame"><div class="vh-tag villain">Villain</div><div class="vh-who">${villainWho}</div><div class="vh-txt">${villainTxt}</div></div>
        </div>
        <div class="vh-close">Every crisis makes you one or the other in someone\u2019s story. The leader who survives with their people\u2019s trust intact did something harder than survive: <b>they stayed the same person under pressure that they were before it.</b></div>
      </div>

      <div class="res-actions">
        <button id="againBtn">Run it again</button>
        <button class="pri" id="diffBtn">Try a different team</button>
      </div>
    </div>`;
  main.appendChild(r);
  window.scrollTo({top:0,behavior:'smooth'});
  $('againBtn').onclick=()=>{ S=fresh(S.disposition); startWeek(); };
  $('diffBtn').onclick=renderIntro;
  // final wire
  paintWire();
}

/* ---------------- BOOT ---------------- */
renderIntro();
