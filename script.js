/* ═══════════════════════════════════════════════
   EVOLVE — Upgraded PWA Script
   Features: XP/Levels, Mood Tracking, Quick-Add FAB,
   Day-tap Goals, Monthly %, Analytics Dashboard,
   Particle BG, Badges, Progress Graph
═══════════════════════════════════════════════ */

// ── Sound Engine ───────────────────────────────
const SOUNDS = {
  advancement: new Audio('sounds/ADVANCEMENT_MADE_.mp3'),
  finish:      new Audio('sounds/Finish_Tasks.mp3'),
  check:       new Audio('sounds/Check.mp3'),
  click:       new Audio('sounds/Click.mp3'),
  uiPop:       new Audio('sounds/UI_POP.mp3'),
  uiSwipe:     new Audio('sounds/UI_SWIPE.mp3'),
};
SOUNDS.advancement.volume = 0.8;
SOUNDS.finish.volume      = 0.9;
SOUNDS.check.volume       = 0.7;
SOUNDS.click.volume       = 0.6;
SOUNDS.uiPop.volume       = 0.6;
SOUNDS.uiSwipe.volume     = 0.65;

function playSound(name) {
  const s = SOUNDS[name];
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}

const CATS = [
  {id:"fitness",  label:"Fitness",      emoji:"💪", color:"#FF6B35", bg:"rgba(255,107,53,0.09)"},
  {id:"mental",   label:"Mental Growth",emoji:"🧠", color:"#A78BFA", bg:"rgba(167,139,250,0.09)"},
  {id:"social",   label:"Social Growth", emoji:"🤝", color:"#FBBF24", bg:"rgba(251,191,36,0.09)"},
  {id:"skills",   label:"Skills",        emoji:"🚀", color:"#34D399", bg:"rgba(52,211,153,0.09)"},
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const QUOTES = ["1% better every day.","Progress, not perfection.","Small steps, big wins.","You got this, legend.","Evolve or repeat.","Consistency beats intensity.","Show up. Always."];

// XP / Level config
const LEVELS = [
  {min:0,   max:99,   title:"Seedling",    icon:"🌱"},
  {min:100, max:249,  title:"Grinder",     icon:"⚡"},
  {min:250, max:499,  title:"Warrior",     icon:"⚔️"},
  {min:500, max:999,  title:"Champion",    icon:"🏆"},
  {min:1000,max:1999, title:"Legend",      icon:"🌟"},
  {min:2000,max:9999, title:"Transcendent",icon:"🔮"},
];

const BADGES = [
  {id:"first_goal",  label:"First Goal",  icon:"🎯", desc:"Complete your first goal"},
  {id:"streak3",     label:"On Fire",     icon:"🔥", desc:"3-day streak"},
  {id:"streak7",     label:"Week Warrior",icon:"📅", desc:"7-day streak"},
  {id:"streak30",    label:"Iron Will",   icon:"💎", desc:"30-day streak"},
  {id:"all_cats",    label:"All-Rounder", icon:"🌈", desc:"Complete a goal in every category today"},
  {id:"perfect_day", label:"Perfect Day", icon:"⭐", desc:"100% completion in a day"},
  {id:"century",     label:"Century",     icon:"💯", desc:"100 total goals completed"},
];

const MOOD_LABELS = {good:"Feeling good 🙂",meh:"Feeling okay 😐",bad:"Feeling rough 😞"};
const MOOD_EMOJI  = {good:"😃", meh:"😐", bad:"😞", "":""};

// ── Default state ──────────────────────────────
let state = {
  goals:    {fitness:[],mental:[],social:[],skills:[]},
  done:     {},
  monthData:{},
  expanded: null,
  activeModal: null,
  calMonth: new Date().getMonth(),
  calYear:  new Date().getFullYear(),
  streak:   0,
  xp:       0,
  badges:   [],
  moodLog:  {},   // dateKey → "good"|"meh"|"bad"
  fabOpen:  false,
  statsCalMonth: new Date().getMonth(),
  statsCalYear:  new Date().getFullYear(),
  activeMonthTab: "combined",
};

// Load persisted data
const savedData = localStorage.getItem("evolveAppData");
if (savedData) {
  try { state = {...state, ...JSON.parse(savedData)}; } catch(e){}
}

function saveData() {
  localStorage.setItem("evolveAppData", JSON.stringify(state));
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':'&quot;'}[t]));
}

// ── Date helpers ───────────────────────────────
const today    = new Date();
const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

document.getElementById("date-label").textContent =
  today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
document.getElementById("tagline").textContent =
  QUOTES[Math.floor(Math.random()*QUOTES.length)];

// ── Counters ───────────────────────────────────
function totalGoals()   { return CATS.reduce((s,c)=>s+state.goals[c.id].length,0); }
function doneTodayCount(){ return Object.values(state.done).filter(Boolean).length; }
function catDone(catId) { return state.goals[catId].filter(g=>state.done[`${catId}-${g.id}`]).length; }
function getCatMonthCount(catId){ return Object.values(state.monthData).reduce((s,d)=>s+(d[catId]||0),0); }
function getMonthTotal(){ return Object.values(state.monthData).reduce((s,d)=>s+Object.values(d).reduce((a,b)=>a+b,0),0); }
function getDayScore(y,m,d){ const k=`${y}-${m}-${d}`; const day=state.monthData[k]; return day?Object.values(day).reduce((a,b)=>a+b,0):0; }
function getAllTimeCompleted(){ return Object.values(state.monthData).reduce((s,d)=>s+Object.values(d).reduce((a,b)=>a+b,0),0); }

function calcStreak(){
  let streak=0, d=new Date(today);
  for(let i=0;i<90;i++){
    const k=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if(state.monthData[k]&&Object.values(state.monthData[k]).some(v=>v>0)){streak++;d.setDate(d.getDate()-1);}
    else break;
  }
  return streak;
}

// ── XP / Level system ──────────────────────────
function getLevelData(xp) {
  for(let i=LEVELS.length-1;i>=0;i--){
    if(xp>=LEVELS[i].min) return {level:i+1,...LEVELS[i]};
  }
  return {level:1,...LEVELS[0]};
}
function getXPProgress(xp) {
  const ld=getLevelData(xp);
  if(ld.level>=LEVELS.length) return 100;
  return Math.round(((xp-ld.min)/(ld.max-ld.min+1))*100);
}
function getXPToNext(xp) {
  const ld=getLevelData(xp);
  if(ld.level>=LEVELS.length) return 0;
  return ld.max+1-xp;
}

function addXP(amount) {
  const prevLevel = getLevelData(state.xp).level;
  state.xp = (state.xp||0)+amount;
  const newLevel = getLevelData(state.xp).level;
  if(newLevel>prevLevel) showLevelUpToast(getLevelData(state.xp));
  renderXP();
  saveData();
}

function renderXP() {
  const ld  = getLevelData(state.xp||0);
  const pct = getXPProgress(state.xp||0);
  const toNext = getXPToNext(state.xp||0);

  // Header badge
  document.getElementById("xp-level").textContent    = `Lv ${ld.level}`;
  document.getElementById("xp-title").textContent    = ld.icon+" "+ld.title;
  document.getElementById("xp-bar-fill").style.width = pct+"%";

  // Stats card
  const lvBig = document.getElementById("xp-level-big");
  const ttBig = document.getElementById("xp-title-big");
  const bfill = document.getElementById("xp-big-fill");
  const xpsub = document.getElementById("xp-sub");
  if(lvBig) lvBig.textContent   = `Lv ${ld.level}`;
  if(ttBig) ttBig.textContent   = ld.icon+" "+ld.title;
  if(bfill) bfill.style.width   = pct+"%";
  if(xpsub) xpsub.textContent   = toNext>0?`${state.xp} XP · ${toNext} to next level`:`MAX LEVEL 🔮`;
}

function showLevelUpToast(ld) {
  const toast = document.getElementById("levelup-toast");
  document.getElementById("levelup-title").textContent = `Level ${ld.level}!`;
  document.getElementById("levelup-sub").textContent   = `You are now a ${ld.title} ${ld.icon}`;
  toast.classList.add("show");
  playSound('advancement');
  setTimeout(()=>toast.classList.remove("show"),3500);
}

// ── Badge system ───────────────────────────────
function checkBadges() {
  const badges = state.badges || [];
  const streak = calcStreak();
  const allDone = CATS.every(c=>catDone(c.id)>0&&state.goals[c.id].length>0);
  const pct     = totalGoals()>0?Math.round((doneTodayCount()/totalGoals())*100):0;
  const total   = getAllTimeCompleted();

  const checks = [
    {id:"first_goal",  cond: doneTodayCount()>=1},
    {id:"streak3",     cond: streak>=3},
    {id:"streak7",     cond: streak>=7},
    {id:"streak30",    cond: streak>=30},
    {id:"all_cats",    cond: allDone},
    {id:"perfect_day", cond: pct===100&&totalGoals()>0},
    {id:"century",     cond: total>=100},
  ];

  checks.forEach(({id,cond})=>{
    if(cond&&!badges.includes(id)){
      badges.push(id);
      const b=BADGES.find(x=>x.id===id);
      if(b) showBadgeToast(b);
    }
  });
  state.badges=badges;
  renderBadges();
}

function showBadgeToast(b) {
  const toast = document.getElementById("levelup-toast");
  document.getElementById("levelup-title").textContent = b.label+" Unlocked!";
  document.getElementById("levelup-sub").textContent   = b.icon+" "+b.desc;
  toast.classList.add("show");
  playSound('advancement');
  setTimeout(()=>toast.classList.remove("show"),3500);
}

function renderBadges() {
  const row = document.getElementById("badges-row");
  if(!row) return;
  row.innerHTML = BADGES.map(b=>{
    const earned = (state.badges||[]).includes(b.id);
    return `<div class="badge-chip ${earned?"earned":"locked"}">${b.icon} ${b.label}</div>`;
  }).join("");
}

// ── Mood tracking ──────────────────────────────
function setMood(mood) {
  state.moodLog = state.moodLog||{};
  state.moodLog[todayKey] = mood;
  document.querySelectorAll(".mood-btn").forEach(b=>{
    b.classList.toggle("selected", b.dataset.mood===mood);
  });
  document.getElementById("mood-set-label").textContent = MOOD_LABELS[mood]||"";
  saveData();
  renderMoodHistory();
}

function loadMoodUI() {
  const todayMood = (state.moodLog||{})[todayKey];
  if(todayMood){
    document.querySelectorAll(".mood-btn").forEach(b=>{
      b.classList.toggle("selected", b.dataset.mood===todayMood);
    });
    document.getElementById("mood-set-label").textContent = MOOD_LABELS[todayMood]||"";
  }
}

function renderMoodHistory() {
  const row = document.getElementById("mood-history-row");
  if(!row) return;
  const items = [];
  for(let i=6;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const k=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const mood=(state.moodLog||{})[k]||"";
    items.push({day:DAY_NAMES[d.getDay()],mood,emoji:MOOD_EMOJI[mood]||"·"});
  }
  row.innerHTML = items.map(it=>`
    <div class="mood-history-item">
      <div class="mood-history-emoji">${it.emoji}</div>
      <div class="mood-history-day">${it.day}</div>
    </div>
  `).join("");
}

// ── Monthly completion % ───────────────────────
function calcMonthlyCompletion(y,m) {
  let daysWithData=0, totalPct=0;
  const daysInMonth=new Date(y,m+1,0).getDate();
  for(let d=1;d<=daysInMonth;d++){
    const k=`${y}-${m}-${d}`;
    const data=state.monthData[k];
    if(data){
      const score=Object.values(data).reduce((a,b)=>a+b,0);
      if(score>0){daysWithData++;totalPct+=Math.min(100,score*10);}
    }
  }
  return daysWithData>0?Math.round(totalPct/daysInMonth):0;
}

// ── 7-day progress graph (canvas line chart) ───
function renderProgressGraph() {
  const wrap = document.getElementById("progress-graph");
  if(!wrap) return;

  // Build data: percentage of goals completed each day
  const data=[];
  const totalGoalsCount = totalGoals();
  for(let i=6;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const dk=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dayData=state.monthData[dk]||{};
    const score=Object.values(dayData).reduce((a,b)=>a+b,0);
    // Convert to pct: cap at 100, scale by total goals if set, else raw score*20
    const pct = totalGoalsCount>0 ? Math.min(100,Math.round((score/totalGoalsCount)*100)) : Math.min(100,score*20);
    data.push({day:DAY_NAMES[d.getDay()],pct,isToday:i===0});
  }

  // Render canvas
  wrap.innerHTML='<canvas id="week-chart"></canvas>';
  const canvas=document.getElementById("week-chart");
  const dpr=window.devicePixelRatio||1;
  const W=wrap.offsetWidth||320;
  const H=90;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  const ctx=canvas.getContext("2d");
  ctx.scale(dpr,dpr);

  const padL=10,padR=10,padT=12,padB=28;
  const chartW=W-padL-padR;
  const chartH=H-padT-padB;

  // Grid lines at 0, 50, 100%
  ctx.setLineDash([2,4]);
  ctx.strokeStyle="rgba(255,255,255,0.06)";
  ctx.lineWidth=1;
  [0,50,100].forEach(v=>{
    const yy=padT+chartH-(v/100)*chartH;
    ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(W-padR,yy);ctx.stroke();
  });
  ctx.setLineDash([]);

  // Y-axis labels
  ctx.fillStyle="rgba(255,255,255,0.2)";
  ctx.font=`600 8px 'Sora',sans-serif`;
  ctx.textAlign="right";
  [0,50,100].forEach(v=>{
    const yy=padT+chartH-(v/100)*chartH;
    ctx.fillText(v+"%",padL-2,yy+3);
  });

  const pts=data.map((item,i)=>({
    x:padL+(i/(data.length-1))*chartW,
    y:padT+chartH-(item.pct/100)*chartH,
    ...item
  }));

  // Fill under curve
  ctx.beginPath();
  ctx.moveTo(pts[0].x,padT+chartH);
  pts.forEach((p,i)=>{
    if(i===0){ctx.lineTo(p.x,p.y);}
    else{const prev=pts[i-1];const cx=(prev.x+p.x)/2;ctx.bezierCurveTo(cx,prev.y,cx,p.y,p.x,p.y);}
  });
  ctx.lineTo(pts[pts.length-1].x,padT+chartH);
  ctx.closePath();
  const fillGrad=ctx.createLinearGradient(0,padT,0,padT+chartH);
  fillGrad.addColorStop(0,"rgba(167,139,250,0.22)");
  fillGrad.addColorStop(1,"rgba(167,139,250,0.01)");
  ctx.fillStyle=fillGrad;ctx.fill();

  // Curve line
  ctx.beginPath();
  pts.forEach((p,i)=>{
    if(i===0){ctx.moveTo(p.x,p.y);}
    else{const prev=pts[i-1];const cx=(prev.x+p.x)/2;ctx.bezierCurveTo(cx,prev.y,cx,p.y,p.x,p.y);}
  });
  ctx.strokeStyle="#A78BFA";ctx.lineWidth=2;ctx.stroke();

  // Dots + day labels
  ctx.textAlign="center";
  pts.forEach(p=>{
    // Dot
    ctx.beginPath();ctx.arc(p.x,p.y,p.isToday?4.5:3,0,Math.PI*2);
    ctx.fillStyle=p.isToday?"#E879F9":"#A78BFA";ctx.fill();
    if(p.isToday){ctx.strokeStyle="rgba(232,121,249,0.5)";ctx.lineWidth=3;ctx.stroke();}
    // Pct label above dot for today
    if(p.isToday&&p.pct>0){
      ctx.fillStyle="rgba(255,255,255,0.85)";
      ctx.font=`700 9px 'Space Mono',monospace`;
      ctx.fillText(p.pct+"%",p.x,p.y-9);
    }
    // Day label below
    ctx.fillStyle=p.isToday?"#E0D4FF":"rgba(255,255,255,0.3)";
    ctx.font=`700 9px 'Sora',sans-serif`;
    ctx.fillText(p.day,p.x,H-4);
  });
}

// ── Insights (most consistent / weakest) ──────
function renderInsights() {
  const sorted=[...CATS].sort((a,b)=>getCatMonthCount(b.id)-getCatMonthCount(a.id));
  const best=sorted[0],worst=sorted[sorted.length-1];
  const mc=document.getElementById("most-consistent");
  const wa=document.getElementById("weakest-area");
  if(mc) mc.innerHTML=`<span style="color:${best.color}">${best.emoji} ${best.label}</span>`;
  if(wa) wa.innerHTML=`<span style="color:${worst.color}">${worst.emoji} ${worst.label}</span>`;
}

// ── Render Home ────────────────────────────────
function renderHome() {
  const total=totalGoals(), done=doneTodayCount();
  const pct=total>0?Math.round((done/total)*100):0;
  const circ=2*Math.PI*56;

  document.getElementById("ring-progress").setAttribute("stroke-dasharray",`${(pct/100)*circ} ${circ}`);
  document.getElementById("ring-progress").setAttribute("stroke",pct===100?"#34D399":"url(#rg)");
  document.getElementById("ring-progress").classList.toggle("complete", pct===100);
  document.getElementById("ring-pct").textContent=`${pct}%`;
  document.getElementById("ring-sub").textContent=
    done===0?"Start checking off your goals!":
    done===total&&total>0?"🎉 All done! Incredible!":
    "Keep going, almost there!";

  const streak=calcStreak();
  document.getElementById("streak-num").textContent=streak;
  const statsStreak=document.getElementById("stats-streak");
  if(statsStreak) statsStreak.textContent=streak;

  // Pills
  const pills=document.getElementById("cat-pills");
  pills.innerHTML=CATS.map(c=>{
    const d=catDone(c.id),total=state.goals[c.id].length;
    const donePct=total>0?Math.round((d/total)*100):0;
    return `<div class="cat-pill" style="background:${c.bg};color:${c.color};border-color:${c.color}30">
      <span>${c.emoji}</span><span>${d}/${total}</span>
    </div>`;
  }).join("");

  // Category cards
  const list=document.getElementById("cats-list");
  list.innerHTML=CATS.map(cat=>{
    const catGoals=state.goals[cat.id];
    const d=catDone(cat.id);
    const cp=catGoals.length>0?Math.round((d/catGoals.length)*100):0;
    const isExp=state.expanded===cat.id;
    const doneBadge=d>0&&d===catGoals.length?`<span class="cat-done-badge" style="background:${cat.color};color:#000">✓ Done</span>`:"";

    const goalsHTML=catGoals.length===0
      ?`<div class="goal-empty">No goals yet — tap + to add</div>`
      :catGoals.map((g,i)=>{
        const gk=`${cat.id}-${g.id}`;
        const isDone=!!state.done[gk];
        return `<div class="goal-row fade-up" data-cat="${cat.id}" data-gid="${g.id}" onclick="toggleGoal('${cat.id}','${g.id}')" style="background:${isDone?cat.color+"20":"rgba(255,255,255,0.04)"};border-color:${isDone?cat.color+"60":"rgba(255,255,255,0.07)"};animation-delay:${i*0.05}s">
          <div class="checkbox" style="border-color:${isDone?cat.color:"rgba(255,255,255,0.2)"};background:${isDone?cat.color:"transparent"}">${isDone?'<span class="check-icon">✓</span>':""}</div>
          <span class="goal-text" style="color:${isDone?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.88)"};text-decoration:${isDone?"line-through":"none"}">${g.text}</span>
          <button class="del-btn" onclick="event.stopPropagation();deleteGoal('${cat.id}','${g.id}')">✕</button>
        </div>`;
      }).join("");

    const allDone = catGoals.length > 0 && d === catGoals.length;
    return `<div class="cat-card${allDone?' all-done':''}" style="--cat-glow:${cat.color}66;background:${cat.bg};border:1px solid ${cat.color}28;box-shadow:${isExp?`0 0 28px ${cat.color}35`:"none"}">
      <div class="cat-header" onclick="toggleExpand('${cat.id}')">
        <span class="cat-emoji">${cat.emoji}</span>
        <div class="cat-info">
          <div class="cat-name-row"><span class="cat-name" style="color:${cat.color}">${cat.label}</span>${doneBadge}</div>
          ${catGoals.length>0?`<div class="cat-bar-wrap"><div class="cat-bar" style="width:${cp}%;background:linear-gradient(90deg,${cat.color}aa,${cat.color})"></div></div>`:""}
        </div>
        <span class="cat-count" style="color:${cat.color}">${catGoals.length>0?`${d}/${catGoals.length}`:""}</span>
        <button class="add-btn" style="background:${cat.color}25;border:1.5px solid ${cat.color}55;color:${cat.color}" onclick="event.stopPropagation();openModal('${cat.id}')">+</button>
      </div>
      ${isExp?`<div class="goals-list">${goalsHTML}</div>`:""}
    </div>`;
  }).join("");

  // Stats panel updates
  const stg=document.getElementById("stats-total-goals");
  const stp=document.getElementById("stats-today-pct");
  if(stg) stg.textContent=total;
  if(stp) stp.textContent=`${pct}%`;

  renderXP();
  renderCatStats();
  renderInsights();
  renderProgressGraph();
  renderMoodHistory();
  renderBadges();
  renderCatBreakdown();
  loadMoodUI();
}

function renderCatStats() {
  const cards=document.getElementById("cat-stat-cards");
  if(!cards) return;
  cards.innerHTML=CATS.map(cat=>{
    const catGoals=state.goals[cat.id];
    const d=catDone(cat.id);
    const mc=getCatMonthCount(cat.id);
    const r=catGoals.length>0?Math.round((d/catGoals.length)*100):0;
    return `<div class="cat-stat-card" style="background:${cat.bg};border-color:${cat.color}28">
      <div class="cat-stat-header">
        <span class="cat-stat-emoji">${cat.emoji}</span>
        <div><div class="cat-stat-name" style="color:${cat.color}">${cat.label}</div><div class="cat-stat-sub">${catGoals.length} goals set</div></div>
      </div>
      <div class="cat-stat-3col">
        <div class="cat-stat-cell"><div class="cat-stat-val" style="color:${cat.color}">${d}</div><div class="cat-stat-lbl">Today</div></div>
        <div class="cat-stat-cell"><div class="cat-stat-val" style="color:${cat.color}">${mc}</div><div class="cat-stat-lbl">Month</div></div>
        <div class="cat-stat-cell"><div class="cat-stat-val" style="color:${cat.color}">${r}%</div><div class="cat-stat-lbl">Rate</div></div>
      </div>
    </div>`;
  }).join("");
}


  const el=document.getElementById("cat-breakdown");
  if(!el) return;
  el.innerHTML=CATS.map(cat=>{
    const catGoals=state.goals[cat.id];
    const d=catDone(cat.id);
    const mc=getCatMonthCount(cat.id);
    const r=catGoals.length>0?Math.round((d/catGoals.length)*100):0;
    const pct=catGoals.length>0?Math.round((d/catGoals.length)*100):0;
    return `<div class="cat-bd-row">
      <div class="cat-bd-left">
        <span class="cat-bd-emoji">${cat.emoji}</span>
        <div>
          <div class="cat-bd-name" style="color:${cat.color}">${cat.label}</div>
          <div class="cat-bd-sub">${catGoals.length} goals · ${mc} this month</div>
        </div>
      </div>
      <div class="cat-bd-right">
        <div class="cat-bd-pct" style="color:${cat.color}">${r}%</div>
        <div class="cat-bd-bar-wrap"><div class="cat-bd-bar" style="width:${pct}%;background:${cat.color}"></div></div>
      </div>
    </div>`;
  }).join("");
}



// ── Calendar ───────────────────────────────────
function renderCalendar() {
  const y=state.calYear, m=state.calMonth;
  document.getElementById("month-name").textContent=`${MONTHS[m]} ${y}`;
  const days=new Date(y,m+1,0).getDate();
  const first=new Date(y,m,1).getDay();
  const grid=document.getElementById("cal-grid");
  const maxScore=Math.max(1,...Array.from({length:days},(_,i)=>getDayScore(y,m,i+1)));

  let html="";
  for(let i=0;i<first;i++) html+=`<div></div>`;
  for(let d=1;d<=days;d++){
    const score=getDayScore(y,m,d);
    const isToday=d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
    const isPast=new Date(y,m,d)<today;

    // More vivid intensity steps
    let intensity=0;
    if(score>0){
      const ratio=score/maxScore;
      intensity=ratio<=0.2?0.2:ratio<=0.4?0.4:ratio<=0.65?0.65:ratio<=0.85?0.85:1;
    }

    const bg=score>0
      ?`rgba(167,139,250,${intensity*0.75})`
      :isToday?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.03)";
    const border=isToday?"1.5px solid #A78BFA":"1px solid rgba(255,255,255,0.05)";
    const shadow=score>0?`box-shadow:0 0 ${10*intensity}px rgba(167,139,250,${intensity*0.5})`:"";
    const numColor=isToday?"#A78BFA":score>0?"#fff":isPast?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.75)";

    html+=`<div class="cal-day${isToday?' today':''}${score>0?' has-score':''}" style="background:${bg};border:${border};${shadow};animation-delay:${(d*0.018).toFixed(2)}s" onclick="showDayGoals(${y},${m},${d})">
      <span class="cal-day-num" style="color:${numColor}">${d}</span>
      ${score>0?`<span class="cal-score">+${score}</span>`:""}
    </div>`;
  }
  grid.innerHTML=html;

  // Monthly completion %
  const pct=calcMonthlyCompletion(y,m);
  const pctEl=document.getElementById("month-pct-num");
  const fillEl=document.getElementById("month-pct-fill");
  if(pctEl) pctEl.textContent=`${pct}%`;
  if(fillEl) fillEl.style.width=`${pct}%`;

  // Stats
  document.getElementById("month-total").textContent=getMonthTotal();
  const best=CATS.reduce((b,c)=>{const cnt=getCatMonthCount(c.id);return cnt>(b.count||0)?{...c,count:cnt}:b},{});
  document.getElementById("best-cat-emoji").textContent=best.emoji||"—";
  document.getElementById("best-cat-name").textContent=best.label||"None yet";
  if(best.color) document.getElementById("best-cat-name").style.color=best.color;

  const maxCount=Math.max(...CATS.map(c=>getCatMonthCount(c.id)),1);
  document.getElementById("cat-bars").innerHTML=CATS.map(cat=>{
    const cnt=getCatMonthCount(cat.id);
    return `<div class="cat-bar-card" style="background:${cat.bg};border:1px solid ${cat.color}22">
      <div class="cat-bar-row"><span class="cat-bar-name">${cat.emoji} ${cat.label}</span><span class="cat-bar-count" style="color:${cat.color}">${cnt}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(cnt/maxCount)*100}%;background:linear-gradient(90deg,${cat.color}88,${cat.color})"></div></div>
    </div>`;
  }).join("");
}

// ── Day Goals Modal (tap calendar day) ─────────
function showDayGoals(y,m,d) {
  playSound('uiSwipe');
  const dateKey=`${y}-${m}-${d}`;
  const dayData=state.monthData[dateKey]||{};
  const dateStr=new Date(y,m,d).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  document.getElementById("day-modal-date").textContent=dateStr;

  const goalItems=[];
  CATS.forEach(cat=>{
    state.goals[cat.id].forEach(g=>{
      const gk=`${cat.id}-${g.id}`;
      // For historical days, approximate from monthData; for today use done state
      const isToday=d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
      const isDone=isToday?!!state.done[gk]:(dayData[cat.id]>0);
      goalItems.push({cat,text:g.text,isDone});
    });
  });

  if(goalItems.length===0) {
    document.getElementById("day-modal-goals").innerHTML=
      `<div style="text-align:center;color:rgba(255,255,255,0.25);font-size:13px;padding:20px 0">No goals set for this day</div>`;
  } else {
    document.getElementById("day-modal-goals").innerHTML=goalItems.map(item=>`
      <div class="day-goal-item" style="background:${item.cat.bg};border-color:${item.cat.color}30">
        <div class="day-goal-dot" style="background:${item.isDone?item.cat.color:"rgba(255,255,255,0.15)"}"></div>
        <span class="day-goal-text ${item.isDone?"day-goal-done":""}">${item.text}</span>
        <span style="color:${item.cat.color};font-size:11px;font-weight:700">${item.cat.emoji}</span>
      </div>
    `).join("");
  }

  const modal=document.getElementById("day-modal");
  modal.classList.add("open");
  setTimeout(()=>{
    document.querySelectorAll(".day-goal-item").forEach((el,i)=>{
      el.style.animationDelay=(i*0.07)+"s";
    });
  },50);
}

function closeDayModal() {
  const modal=document.getElementById("day-modal");
  modal.classList.remove("open");
}

document.getElementById("day-modal").addEventListener("click",e=>{
  if(e.target===document.getElementById("day-modal")) closeDayModal();
});

// ── Quick-Add FAB ──────────────────────────────
function openFabMenu() {
  state.fabOpen=!state.fabOpen;
  const fab=document.getElementById("fab");
  const menu=document.getElementById("fab-menu");
  fab.classList.toggle("open",state.fabOpen);
  menu.classList.toggle("open",state.fabOpen);
  if(state.fabOpen){ playSound('uiPop'); buildFabMenu(); }
}

function buildFabMenu() {
  const inner=document.getElementById("fab-menu-inner");
  inner.innerHTML=CATS.map((cat,i)=>`
    <div class="fab-item" style="animation-delay:${i*0.05}s" onclick="fabSelectCat('${cat.id}')">
      <div class="fab-item-label" style="color:${cat.color}">${cat.label}</div>
      <div class="fab-item-dot" style="background:${cat.bg};border-color:${cat.color}55;color:${cat.color}">${cat.emoji}</div>
    </div>
  `).join("");
}

function fabSelectCat(catId) {
  state.fabOpen=false;
  document.getElementById("fab").classList.remove("open");
  document.getElementById("fab-menu").classList.remove("open");
  openModal(catId);
}

// Close FAB on outside tap
document.addEventListener("click",e=>{
  if(state.fabOpen&&!e.target.closest(".fab")&&!e.target.closest(".fab-menu")){
    state.fabOpen=false;
    document.getElementById("fab").classList.remove("open");
    document.getElementById("fab-menu").classList.remove("open");
  }
});

// ── Modal ──────────────────────────────────────
function openModal(catId) {
  state.activeModal=catId;
  state.expanded=catId;
  const cat=CATS.find(c=>c.id===catId);
  document.getElementById("modal-emoji").textContent=cat.emoji;
  document.getElementById("modal-cat-name").textContent=cat.label;
  document.getElementById("modal-cat-name").style.color=cat.color;
  document.getElementById("modal-add-btn").style.background=`linear-gradient(135deg,${cat.color},${cat.color}aa)`;
  document.getElementById("modal-input").style.borderColor=`${cat.color}60`;
  document.getElementById("modal-input").value="";
  const modal=document.getElementById("modal");
  modal.classList.add("open");
  modal.style.display="flex";
  setTimeout(()=>document.getElementById("modal-input").focus(),350);
}

function closeModal() {
  document.getElementById("modal").style.display="none";
  document.getElementById("modal").classList.remove("open");
  state.activeModal=null;
}

document.getElementById("modal").addEventListener("click",e=>{
  if(e.target===document.getElementById("modal")) closeModal();
});

document.getElementById("modal-add-btn").addEventListener("click",()=>{
  const val=escapeHTML(document.getElementById("modal-input").value.trim());
  if(!val||!state.activeModal) return;
  state.goals[state.activeModal].push({id:Date.now(),text:val});
  playSound('click');
  closeModal();
  renderAll();
  saveData();
});

document.getElementById("modal-input").addEventListener("keydown",e=>{
  if(e.key==="Enter") document.getElementById("modal-add-btn").click();
});

// ── Goal interactions ──────────────────────────
function toggleGoal(catId,goalId) {
  const k=`${catId}-${goalId}`;
  const wasChecked=!!state.done[k];
  state.done[k]=!wasChecked;
  if(state.done[k]){
    const row=document.querySelector(`[data-cat="${catId}"][data-gid="${goalId}"]`);
    if(row){row.classList.add('just-checked');setTimeout(()=>row.classList.remove('just-checked'),450);}
    playSound('check');
  }

  const dayData=state.monthData[todayKey]||{};
  dayData[catId]=Math.max(0,(dayData[catId]||0)+(state.done[k]?1:-1));
  state.monthData[todayKey]=dayData;

  // XP gain
  if(state.done[k]) addXP(10);

  // Finish sound when all goals complete
  const total=totalGoals(), done=doneTodayCount();
  if(state.done[k] && total>0 && done===total) playSound('finish');

  checkBadges();
  renderAll();
  saveData();
}

function deleteGoal(catId,goalId) {
  const k=`${catId}-${goalId}`;
  if(state.done[k]){
    const dayData=state.monthData[todayKey];
    if(dayData&&dayData[catId]) dayData[catId]=Math.max(0,dayData[catId]-1);
  }
  state.goals[catId]=state.goals[catId].filter(g=>g.id!=goalId);
  delete state.done[k];
  renderAll();
  saveData();
}

function toggleExpand(catId) {
  state.expanded=state.expanded===catId?null:catId;
  renderHome();
  saveData();
}

// ── Navigation (Pill Nav + Page Transitions) ────
const VIEW_ORDER = ["home","month","stats"];
let currentView = "home";

function positionNavSlider(view) {
  const track = document.querySelector(".nav-pill-track");
  const btn = document.querySelector(`.nav-pill-btn[data-view="${view}"]`);
  const slider = document.getElementById("nav-slider");
  if(!btn||!slider||!track) return;
  const tRect = track.getBoundingClientRect();
  const bRect = btn.getBoundingClientRect();
  slider.style.left  = (bRect.left - tRect.left) + "px";
  slider.style.width = bRect.width + "px";
}

function switchView(v) {
  if(v===currentView) return;
  const oldIdx = VIEW_ORDER.indexOf(currentView);
  const newIdx = VIEW_ORDER.indexOf(v);
  const goingRight = newIdx > oldIdx;

  const outView = document.getElementById(`view-${currentView}`);
  const inView  = document.getElementById(`view-${v}`);

  // Animate out
  outView.classList.remove("active");
  outView.style.display = "block";
  outView.style.animation = goingRight
    ? "viewSlideOutLeft 0.28s cubic-bezier(0.4,0,1,1) forwards"
    : "viewSlideOutRight 0.28s cubic-bezier(0.4,0,1,1) forwards";
  setTimeout(() => { outView.style.display = "none"; outView.style.animation = ""; }, 290);

  // Animate in
  inView.style.display = "block";
  inView.style.animation = goingRight
    ? "viewSlideIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards"
    : "viewSlideInRight 0.38s cubic-bezier(0.22,1,0.36,1) forwards";
  inView.classList.add("active");

  currentView = v;

  // Update pill buttons
  document.querySelectorAll(".nav-pill-btn").forEach(b => b.classList.toggle("active", b.dataset.view===v));
  positionNavSlider(v);

  if(v==="month") renderCalendar();
  if(v==="stats") {
    renderCatStats(); renderProgressGraph(); renderMoodHistory();
    renderBadges(); renderInsights(); renderXP(); renderMonthlyGraph(); renderCatBreakdown();
  }
}

document.querySelectorAll(".nav-pill-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// Position slider on load after layout
requestAnimationFrame(() => positionNavSlider("home"));
window.addEventListener("resize", () => positionNavSlider(currentView));

document.getElementById("prev-month").addEventListener("click",()=>{
  if(state.calMonth===0){state.calMonth=11;state.calYear--;}else state.calMonth--;
  renderCalendar();
});
document.getElementById("next-month").addEventListener("click",()=>{
  if(state.calMonth===11){state.calMonth=0;state.calYear++;}else state.calMonth++;
  renderCalendar();
});

// ── Particle Background ────────────────────────
(function initParticles() {
  const canvas=document.getElementById("particle-canvas");
  const ctx=canvas.getContext("2d");
  let W,H,particles=[];

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener("resize",resize);

  const COLORS=["rgba(167,139,250,","rgba(232,121,249,","rgba(45,212,191,","rgba(255,107,53,"];

  function mkParticle(){
    return {
      x:Math.random()*W,
      y:Math.random()*H,
      r:Math.random()*1.8+0.4,
      dx:(Math.random()-0.5)*0.22,
      dy:(Math.random()-0.5)*0.22,
      alpha:Math.random()*0.45+0.05,
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
    };
  }

  for(let i=0;i<55;i++) particles.push(mkParticle());

  function draw(){
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color+p.alpha+")";
      ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0||p.x>W||p.y<0||p.y>H){Object.assign(p,mkParticle());}
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Monthly Habit Graph ────────────────────────
function initMonthlyGraphControls() {
  document.getElementById("stats-prev-month").addEventListener("click",()=>{
    if(state.statsCalMonth===0){state.statsCalMonth=11;state.statsCalYear--;}
    else state.statsCalMonth--;
    renderMonthlyGraph();
  });
  document.getElementById("stats-next-month").addEventListener("click",()=>{
    if(state.statsCalMonth===11){state.statsCalMonth=0;state.statsCalYear++;}
    else state.statsCalMonth++;
    renderMonthlyGraph();
  });
  document.querySelectorAll(".monthly-tab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      state.activeMonthTab=tab.dataset.tab;
      document.querySelectorAll(".monthly-tab").forEach(t=>t.classList.toggle("active",t===tab));
      renderMonthlyGraph();
    });
  });
}

// ── Monthly Habit Graph (Heatmap) ─────────────
function renderMonthlyGraph() {
  const y = state.statsCalYear, m = state.statsCalMonth;
  const label = document.getElementById("stats-month-label");
  if(label) label.textContent = MONTHS[m].slice(0,3)+" "+y;

  const daysInMonth = new Date(y,m+1,0).getDate();
  const tab = state.activeMonthTab;

  // Build per-day scores
  const dayScores = Array.from({length:daysInMonth},(_,i)=>{
    const dk=`${y}-${m}-${i+1}`;
    if(tab==="combined"){
      return getDayScore(y,m,i+1);
    } else {
      return (state.monthData[dk]||{})[tab]||0;
    }
  });

  const maxVal=Math.max(...dayScores,1);
  const color = tab==="combined"?"167,139,250":(()=>{
    const cat=CATS.find(c=>c.id===tab);
    if(!cat) return "167,139,250";
    // Parse hex to rgb approx
    const hex=cat.color.replace("#","");
    const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    return `${r},${g},${b}`;
  })();
  const accentColor = tab==="combined"?"#A78BFA":(CATS.find(c=>c.id===tab)||{color:"#A78BFA"}).color;

  // Build heatmap grid
  const heatmapEl = document.getElementById("monthly-heatmap");
  if(!heatmapEl) return;

  const firstDayOfMonth = new Date(y,m,1).getDay(); // 0=Sun
  const totalCells = Math.ceil((firstDayOfMonth+daysInMonth)/7)*7;

  let html='';
  for(let i=0;i<totalCells;i++){
    const dayNum = i-firstDayOfMonth+1;
    if(dayNum<1||dayNum>daysInMonth){
      html+=`<div class="hm-cell hm-empty"></div>`;
      continue;
    }
    const score=dayScores[dayNum-1];
    const isToday=dayNum===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
    const ratio=score>0?score/maxVal:0;
    let intensity=0;
    if(ratio>0) intensity=ratio<=0.25?0.18:ratio<=0.5?0.38:ratio<=0.75?0.62:ratio<=0.9?0.82:1;

    const bg=score>0?`rgba(${color},${intensity})`:(isToday?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.025)");
    const border=isToday?`border:1.5px solid ${accentColor}60`:"";
    const glow=score>0&&ratio>0.7?`box-shadow:0 0 6px rgba(${color},0.4)`:"";
    html+=`<div class="hm-cell${isToday?' hm-today':''}${score>0?' hm-active':''}" 
      style="background:${bg};${border};${glow}" 
      title="${MONTHS[m].slice(0,3)} ${dayNum}: ${score} goals">
      <span class="hm-day-num">${dayNum}</span>
    </div>`;
  }
  heatmapEl.innerHTML=html;

  // Monthly summary stats
  const summaryEl = document.getElementById("monthly-summary-row");
  if(summaryEl){
    const daysWithData=dayScores.filter(v=>v>0).length;
    const total=dayScores.reduce((a,b)=>a+b,0);
    const best=Math.max(...dayScores);
    const avg=daysWithData>0?(total/daysWithData).toFixed(1):0;
    const pct=Math.round((daysWithData/daysInMonth)*100);
    summaryEl.innerHTML=`
      <div class="monthly-summary-cell">
        <div class="monthly-summary-val" style="color:${accentColor}">${total}</div>
        <div class="monthly-summary-lbl">Total</div>
      </div>
      <div class="monthly-summary-cell">
        <div class="monthly-summary-val" style="color:${accentColor}">${best}</div>
        <div class="monthly-summary-lbl">Best Day</div>
      </div>
      <div class="monthly-summary-cell">
        <div class="monthly-summary-val" style="color:${accentColor}">${avg}</div>
        <div class="monthly-summary-lbl">Daily Avg</div>
      </div>
      <div class="monthly-summary-cell">
        <div class="monthly-summary-val" style="color:${accentColor}">${pct}%</div>
        <div class="monthly-summary-lbl">Active Days</div>
      </div>
    `;
  }
}

// ── Render all ─────────────────────────────────
function renderAll(){
  renderHome();
  renderCalendar();
}

renderAll();
initMonthlyGraphControls();
