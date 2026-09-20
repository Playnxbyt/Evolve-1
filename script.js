
/* EVOLVE — focused product layer
   Persistent local state, safe migration, meaningful completion math,
   editable tasks, responsive views and lightweight analytics. */
const SOUND_FILES={
  advancement:'sounds/ADVANCEMENT_MADE_.mp3',
  finish:'sounds/Finish_Tasks.mp3',
  check:'sounds/Check.mp3',
  click:'sounds/Click.mp3',
  uiPop:'sounds/UI_POP.mp3',
  uiSwipe:'sounds/UI_SWIPE.mp3'
};
const SOUNDS={};
function playSound(name){
  const src=SOUND_FILES[name];
  if(!src) return;
  try{
    let s=SOUNDS[name];
    if(!s){s=new Audio(src);s.volume=.55;SOUNDS[name]=s;}
    s.currentTime=0;
    const p=s.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
  }catch(e){}
}

const CATS=[
  {id:"fitness",label:"Fitness",emoji:"💪",color:"#FF9A62",bg:"rgba(255,154,98,.07)"},
  {id:"mental",label:"Mental Growth",emoji:"🧠",color:"#A99BFF",bg:"rgba(169,155,255,.07)"},
  {id:"social",label:"Social Growth",emoji:"🤝",color:"#E7C86E",bg:"rgba(231,200,110,.07)"},
  {id:"skills",label:"Skills",emoji:"🚀",color:"#64E8D3",bg:"rgba(100,232,211,.07)"}
];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const QUOTES=["Small steps, clear direction.","Progress becomes visible through consistency.","Make the next useful move.","Build the day you want.","Consistency beats intensity.","Show up with intention.","One meaningful win at a time."];
const MOOD_LABELS={good:"Feeling good",meh:"Feeling okay",bad:"Feeling rough"};
const MOOD_EMOJI={good:"🙂",meh:"😐",bad:"😞","":"·"};
const PRIORITY={low:{label:"Low",color:"#6f858d"},medium:{label:"Medium",color:"#E7C86E"},high:{label:"High",color:"#FF7D76"}};
const LEVELS=[
 {min:0,max:99,title:"Seedling",icon:"🌱"},
 {min:100,max:249,title:"Grinder",icon:"⚡"},
 {min:250,max:499,title:"Warrior",icon:"⚔️"},
 {min:500,max:999,title:"Champion",icon:"🏆"},
 {min:1000,max:1999,title:"Legend",icon:"🌟"},
 {min:2000,max:9999,title:"Transcendent",icon:"🔮"}
];
const BADGES=[
 {id:"first_goal",label:"First completion",icon:"✓",desc:"Complete your first task"},
 {id:"streak3",label:"3-day streak",icon:"◉",desc:"Keep a three-day streak"},
 {id:"streak7",label:"7-day streak",icon:"◌",desc:"Keep a seven-day streak"},
 {id:"streak30",label:"30-day streak",icon:"✦",desc:"Keep a thirty-day streak"},
 {id:"all_cats",label:"All-rounder",icon:"◆",desc:"Complete a task in every category today"},
 {id:"perfect_day",label:"Perfect day",icon:"★",desc:"Complete every active task today"},
 {id:"century",label:"100 completions",icon:"100",desc:"Reach one hundred completions"}
];

const today=new Date();
const dayKey=(d)=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dateAt=(y,m,d)=>new Date(y,m,d);
const todayKey=dayKey(today);
const todayTime=dateAt(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
const $=id=>document.getElementById(id);
const escapeHTML=str=>String(str??"").replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[t]));
function parseDateKey(key){const [y,m,d]=key.split("-").map(Number);return new Date(y,m,d);}
function formatDateInput(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
function toDayStart(v){const d=new Date(v);return dateAt(d.getFullYear(),d.getMonth(),d.getDate()).getTime();}
function activeOnDate(task,y,m,d){
  const t=dateAt(y,m,d).getTime();
  return task.createdAt<=t && (!task.deletedAt || task.deletedAt>t);
}

let state={
 tasks:[],completions:{},expanded:null,activeModal:null,editingTaskId:null,
 calMonth:today.getMonth(),calYear:today.getFullYear(),xp:0,badges:[],moodLog:{},fabOpen:false
};

function normalizeState(raw){
  const next={...state,...raw};
  next.tasks=Array.isArray(next.tasks)?next.tasks:[];
  next.completions=next.completions&&typeof next.completions==="object"?next.completions:{};
  next.moodLog=next.moodLog&&typeof next.moodLog==="object"?next.moodLog:{};
  next.badges=Array.isArray(next.badges)?next.badges:[];
  next.xp=Number.isFinite(Number(next.xp))?Number(next.xp):0;
  next.tasks=next.tasks.map(t=>({
    id:String(t.id),
    catId:CATS.some(c=>c.id===t.catId)?t.catId:"mental",
    text:decodeStoredText(t.text),
    createdAt:Number(t.createdAt)||todayTime,
    deletedAt:t.deletedAt?Number(t.deletedAt):null,
    priority:PRIORITY[t.priority]?t.priority:"medium"
  }));
  return next;
}
function decodeStoredText(text){
  const s=String(text??"");
  if(!/[&][a-zA-Z#0-9]+;/.test(s))return s;
  const el=document.createElement("textarea");el.innerHTML=s;return el.value;
}
try{
  const raw=localStorage.getItem("evolveAppData");
  if(raw){
    const parsed=JSON.parse(raw);
    if(parsed.goals&&!parsed.tasks){
      const migrated={...parsed,tasks:[],completions:{},moodLog:parsed.moodLog||{}};
      CATS.forEach(cat=>{
        (parsed.goals[cat.id]||[]).forEach(g=>{
          const id=String(g.id);
          migrated.tasks.push({id,catId:cat.id,text:g.text,createdAt:todayTime,deletedAt:null,priority:"medium"});
          if(parsed.done?.[`${cat.id}-${g.id}`]){
            migrated.completions[todayKey]??={};
            migrated.completions[todayKey][id]=true;
          }
        });
      });
      delete migrated.goals;delete migrated.done;delete migrated.monthData;
      state=normalizeState(migrated);
    }else state=normalizeState(parsed);
  }
}catch(e){console.warn("EVOLVE state load failed",e);}
function saveData(){try{localStorage.setItem("evolveAppData",JSON.stringify(state));}catch(e){console.warn("EVOLVE state save failed",e);}}

function getTasksForDate(y,m,d){return state.tasks.filter(t=>activeOnDate(t,y,m,d));}
function getActiveTasksToday(){return getTasksForDate(today.getFullYear(),today.getMonth(),today.getDate());}
function getDayScore(y,m,d){
  const comps=state.completions[`${y}-${m}-${d}`]||{};
  return getTasksForDate(y,m,d).filter(t=>comps[t.id]).length;
}
function getDayPct(y,m,d){
  const tasks=getTasksForDate(y,m,d);if(!tasks.length)return 0;
  const comps=state.completions[`${y}-${m}-${d}`]||{};
  return Math.round(tasks.filter(t=>comps[t.id]).length/tasks.length*100);
}

/* Denominator is task-days actually possible on each date.
   A task created mid-month contributes only from its start date; a deleted task
   contributes only while active. */
function calcMonthStats(y,m){
  const days=new Date(y,m+1,0).getDate();
  const stats={total:{done:0,possible:0,pct:0},cat:{},task:{}};
  CATS.forEach(c=>stats.cat[c.id]={done:0,possible:0,pct:0});
  for(let d=1;d<=days;d++){
    const tasks=getTasksForDate(y,m,d),comps=state.completions[`${y}-${m}-${d}`]||{};
    tasks.forEach(t=>{
      stats.total.possible++;stats.cat[t.catId].possible++;
      if(!stats.task[t.id])stats.task[t.id]={done:0,possible:0,text:t.text,catId:t.catId};
      stats.task[t.id].possible++;
      if(comps[t.id]){stats.total.done++;stats.cat[t.catId].done++;stats.task[t.id].done++;}
    });
  }
  stats.total.pct=stats.total.possible?Math.round(stats.total.done/stats.total.possible*100):0;
  Object.values(stats.cat).forEach(c=>c.pct=c.possible?Math.round(c.done/c.possible*100):0);
  Object.values(stats.task).forEach(t=>t.pct=t.possible?Math.round(t.done/t.possible*100):0);
  return stats;
}
function getAllTimeCompleted(){return Object.values(state.completions).reduce((sum,day)=>sum+Object.values(day||{}).filter(Boolean).length,0);}
function getAllTimeCat(catId){
  const ids=new Set(state.tasks.filter(t=>t.catId===catId).map(t=>t.id));
  return Object.values(state.completions).reduce((sum,day)=>sum+Object.keys(day||{}).filter(id=>ids.has(id)&&day[id]).length,0);
}
function calcStreak(){
  let streak=0,d=new Date(today);
  for(let i=0;i<366;i++){
    const tasks=getTasksForDate(d.getFullYear(),d.getMonth(),d.getDate());
    const comps=state.completions[dayKey(d)]||{};
    if(tasks.length&&tasks.every(t=>comps[t.id])){streak++;d.setDate(d.getDate()-1);}
    else break;
  }
  return streak;
}
function calcCatStreak(catId){
  let streak=0,d=new Date(today);
  for(let i=0;i<366;i++){
    const tasks=getTasksForDate(d.getFullYear(),d.getMonth(),d.getDate()).filter(t=>t.catId===catId);
    const comps=state.completions[dayKey(d)]||{};
    if(tasks.length&&tasks.every(t=>comps[t.id])){streak++;d.setDate(d.getDate()-1);}else break;
  }
  return streak;
}

function getLevelData(xp){
  for(let i=LEVELS.length-1;i>=0;i--)if(xp>=LEVELS[i].min)return{level:i+1,...LEVELS[i]};
  return{level:1,...LEVELS[0]};
}
function getXPProgress(xp){
  const l=getLevelData(xp);return l.level>=LEVELS.length?100:Math.round((xp-l.min)/(l.max-l.min+1)*100);
}
function getXPToNext(xp){const l=getLevelData(xp);return l.level>=LEVELS.length?0:l.max+1-xp;}
function addXP(amount){
  const before=getLevelData(state.xp).level;state.xp=Math.max(0,state.xp+amount);
  const after=getLevelData(state.xp);if(after.level>before)showLevelUpToast(after);
  renderXP();saveData();
}
function renderXP(){
  const l=getLevelData(state.xp),pct=getXPProgress(state.xp),next=getXPToNext(state.xp);
  $("xp-level").textContent=`Lv ${l.level}`;$("xp-title").textContent=`${l.icon} ${l.title}`;$("xp-bar-fill").style.width=`${pct}%`;
  $("xp-mini-sub").textContent=next?`${state.xp} XP · ${next} to next`:`${state.xp} XP · MAX`;
  $("xp-level-big").textContent=`Lv ${l.level}`;$("xp-title-big").textContent=`${l.icon} ${l.title}`;$("xp-big-fill").style.width=`${pct}%`;
  $("xp-sub").textContent=next?`${state.xp} XP · ${next} to next level`:`${state.xp} XP · Max level`;
}
function showLevelUpToast(l){$("levelup-title").textContent=`Level ${l.level}`;$("levelup-sub").textContent=`${l.icon} ${l.title} unlocked`;$("levelup-toast").classList.add("show");playSound("advancement");setTimeout(()=>$("levelup-toast").classList.remove("show"),3200);}

function checkBadges(){
  const active=getActiveTasksToday(),comps=state.completions[todayKey]||{},done=active.filter(t=>comps[t.id]).length;
  const allCats=CATS.every(c=>active.some(t=>t.catId===c.id)&&active.filter(t=>t.catId===c.id).every(t=>comps[t.id]));
  const checks=[
    ["first_goal",done>=1],["streak3",calcStreak()>=3],["streak7",calcStreak()>=7],["streak30",calcStreak()>=30],
    ["all_cats",allCats],["perfect_day",active.length>0&&done===active.length],["century",getAllTimeCompleted()>=100]
  ];
  checks.forEach(([id,cond])=>{if(cond&&!state.badges.includes(id)){state.badges.push(id);const b=BADGES.find(x=>x.id===id);if(b)showBadgeToast(b);}});
  renderBadges();saveData();
}
function showBadgeToast(b){$("levelup-title").textContent=`${b.label}`;$("levelup-sub").textContent=b.desc;$("levelup-toast").classList.add("show");playSound("advancement");setTimeout(()=>$("levelup-toast").classList.remove("show"),3200);}
function renderBadges(){$("badges-row").innerHTML=BADGES.map(b=>`<span class="badge-chip ${(state.badges||[]).includes(b.id)?"earned":""}">${b.icon} ${b.label}</span>`).join("");}

function setMood(mood){
  state.moodLog[todayKey]=mood;
  document.querySelectorAll(".mood-btn").forEach(b=>b.classList.toggle("selected",b.dataset.mood===mood));
  $("mood-set-label").textContent=MOOD_LABELS[mood]||"";saveData();renderMoodHistory();
}
function loadMoodUI(){
  const mood=state.moodLog[todayKey]||"";
  document.querySelectorAll(".mood-btn").forEach(b=>b.classList.toggle("selected",b.dataset.mood===mood));
  $("mood-set-label").textContent=MOOD_LABELS[mood]||"";
}
function renderMoodHistory(){
  $("mood-history-row").innerHTML=Array.from({length:7},(_,i)=>{
    const d=new Date(today);d.setDate(d.getDate()-(6-i));const mood=state.moodLog[dayKey(d)]||"";
    return `<div class="mood-history-item"><div class="mood-history-emoji">${MOOD_EMOJI[mood]}</div><div class="mood-history-day">${DAY_NAMES[d.getDay()]}</div></div>`;
  }).join("");
}

function renderProgressGraph(){
  const data=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-(6-i));return{d,pct:getDayPct(d.getFullYear(),d.getMonth(),d.getDate()),today:i===6};});
  const avg=Math.round(data.reduce((a,x)=>a+x.pct,0)/data.length);
  $("progress-graph").innerHTML=data.map(x=>`<div class="graph-bar-wrap"><div class="graph-bar-pct">${x.pct?x.pct+"%":""}</div><div class="graph-bar" style="height:${Math.max(4,x.pct)}%;background:${x.today?"linear-gradient(180deg,#64E8D3,#57B9F5)":"rgba(87,185,245,.28)"}"></div></div>`).join("");
  $("graph-days").innerHTML=data.map(x=>`<div class="graph-day-lbl" style="${x.today?"color:#64E8D3;font-weight:700":""}">${DAY_NAMES[x.d.getDay()]}</div>`).join("");
  $("week-trend").textContent=`${avg}% avg`;
}
function renderMonthlyLineGraph(){
  const canvas=$("monthly-line-chart"),ctx=canvas.getContext("2d");const rect=canvas.getBoundingClientRect();
  const w=Math.max(320,Math.floor(rect.width||600)),h=150,dpr=window.devicePixelRatio||1;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const days=new Date(state.calYear,state.calMonth+1,0).getDate();
  const points=Array.from({length:days},(_,i)=>getDayPct(state.calYear,state.calMonth,i+1));
  const pad={l:8,r:8,t:15,b:22};const cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  ctx.strokeStyle="rgba(174,216,228,.08)";ctx.lineWidth=1;
  [0,50,100].forEach(v=>{const y=pad.t+ch-(v/100)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();});
  const pts=points.map((v,i)=>[pad.l+(days===1?cw/2:i/(days-1)*cw),pad.t+ch-(v/100)*ch]);
  if(pts.length){
    const grad=ctx.createLinearGradient(0,pad.t,0,h);grad.addColorStop(0,"rgba(100,232,211,.22)");grad.addColorStop(1,"rgba(100,232,211,0)");
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.lineTo(pts.at(-1)[0],pad.t+ch);ctx.lineTo(pts[0][0],pad.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle="#64E8D3";ctx.lineWidth=2;ctx.stroke();
    pts.forEach((p,i)=>{if(i===0||i===pts.length-1||points[i]===100){ctx.beginPath();ctx.arc(p[0],p[1],2.8,0,Math.PI*2);ctx.fillStyle="#64E8D3";ctx.fill();}});
  }
  $("graph-month-badge").textContent=`${MONTHS[state.calMonth]} ${state.calYear}`;
  const stats=calcMonthStats(state.calYear,state.calMonth);$("monthly-line-footer").innerHTML=`<span>${stats.total.done} completed</span><span>${stats.total.possible} possible task-days</span><span>${stats.total.pct}% completion</span>`;
}

function renderInsights(){
  const s=calcMonthStats(today.getFullYear(),today.getMonth()),withData=CATS.filter(c=>s.cat[c.id].possible>0);
  const mc=$("most-consistent"),wa=$("weakest-area");
  if(!withData.length){mc.textContent="Not enough data";wa.textContent="Add a few tasks";return;}
  const best=withData.reduce((a,b)=>s.cat[b.id].pct>s.cat[a.id].pct?b:a),worst=withData.reduce((a,b)=>s.cat[b.id].pct<s.cat[a.id].pct?b:a);
  mc.innerHTML=`<span style="color:${best.color}">${best.emoji} ${best.label} · ${s.cat[best.id].pct}%</span>`;
  wa.innerHTML=`<span style="color:${worst.color}">${worst.emoji} ${worst.label} · ${s.cat[worst.id].pct}%</span>`;
  const active=getActiveTasksToday(),comps=state.completions[todayKey]||{};
  const next=active.find(t=>!comps[t.id]);
  $("focus-title").textContent=next?next.text:"Everything on today's list is complete.";
  $("focus-sub").textContent=next?`Priority: ${PRIORITY[next.priority].label} · ${CATS.find(c=>c.id===next.catId).label}`:"Take a moment to notice the win.";
  const pct=getDayPct(today.getFullYear(),today.getMonth(),today.getDate());
  $("today-insight").textContent=pct===100?"You completed every active task today. Protect the habit of showing up.":pct>=70?"Strong momentum. Finish one more meaningful task before you call it a day.":pct>0?"Your progress is moving. Keep the next action small and specific.":"A clear first task is enough to begin.";
}

function renderHome(){
  const tasks=getActiveTasksToday(),comps=state.completions[todayKey]||{},total=tasks.length,done=tasks.filter(t=>comps[t.id]).length,pct=total?Math.round(done/total*100):0;
  const circ=2*Math.PI*90;$("ring-progress").setAttribute("stroke-dasharray",`${pct/100*circ} ${circ}`);$("ring-pct").textContent=`${pct}%`;
  $("today-done").textContent=done;$("today-total").textContent=total;$("progress-status").textContent=pct===100&&total?"Complete":pct?"In progress":"Not started";
  $("ring-sub").textContent=pct===100&&total?"Everything is done for today.":done?"Keep the next action simple.":"Start with one meaningful win.";
  $("progress-detail").textContent=total?`${total-done} task${total-done===1?"":"s"} remaining · ${pct}% of today's list complete.`:"Add a task to create today's list.";
  $("streak-num").textContent=calcStreak();
  $("cat-pills").innerHTML=CATS.map(c=>{const ts=tasks.filter(t=>t.catId===c.id),d=ts.filter(t=>comps[t.id]).length;return `<span class="cat-pill" style="background:${c.bg};color:${c.color};border-color:${c.color}33">${c.emoji} ${d}/${ts.length}</span>`;}).join("");
  $("cats-list").innerHTML=CATS.map(cat=>{
    const ts=tasks.filter(t=>t.catId===cat.id),d=ts.filter(t=>comps[t.id]).length,p=ts.length?Math.round(d/ts.length*100):0,exp=state.expanded===cat.id;
    const rows=ts.length?ts.map(t=>{const done=!!comps[t.id],pr=PRIORITY[t.priority]||PRIORITY.medium;return `<div class="goal-row ${done?"just-checked":""}" data-cat="${cat.id}" data-gid="${t.id}" onclick="toggleGoal('${cat.id}','${t.id}')">
      <div class="checkbox" style="border-color:${done?cat.color:"rgba(255,255,255,.16)"};background:${done?cat.color:"transparent"}">${done?"✓":""}</div>
      <div><div class="goal-text" style="color:${done?"#71858b":"#dce8ea"};text-decoration:${done?"line-through":"none"}">${escapeHTML(t.text)}</div><div class="task-meta"><span class="priority-dot" style="background:${pr.color}"></span>${pr.label}</div></div>
      <button class="edit-btn" aria-label="Edit ${escapeHTML(t.text)}" onclick="event.stopPropagation();openModal('${cat.id}','${t.id}')">✎</button>
      <button class="del-btn" aria-label="Delete ${escapeHTML(t.text)}" onclick="event.stopPropagation();deleteGoal('${cat.id}','${t.id}')">×</button>
    </div>`;}).join(""):`<div class="goal-empty">No goals yet — add one when you're ready.</div>`;
    return `<article class="cat-card" data-catid="${cat.id}">
      <div class="cat-header" onclick="toggleExpand('${cat.id}')"><span class="cat-emoji">${cat.emoji}</span><div class="cat-info"><div class="cat-name-row"><span class="cat-name" style="color:${cat.color}">${cat.label}</span>${d&&d===ts.length?`<span class="cat-done-badge" style="background:${cat.color};color:#061016">DONE</span>`:""}</div>${ts.length?`<div class="cat-bar-wrap"><div class="cat-bar" style="width:${p}%;background:${cat.color}"></div></div>`:""}</div><span class="cat-count">${ts.length?`${d}/${ts.length}`:""}</span><span class="cat-chevron" style="transform:rotate(${exp?90:0}deg)">›</span><button class="add-btn" style="color:${cat.color};border-color:${cat.color}44;background:${cat.color}12" onclick="event.stopPropagation();openModal('${cat.id}')">+</button></div>
      ${exp?`<div class="goals-list">${rows}</div>`:""}
    </article>`;
  }).join("");
  $("stats-total-goals").textContent=total;$("stats-today-pct").textContent=`${calcMonthStats(today.getFullYear(),today.getMonth()).total.pct}%`;$("stats-completions").textContent=getAllTimeCompleted();
  loadMoodUI();renderXP();renderProgressGraph();renderInsights();renderMoodHistory();renderCatStats();renderBadges();
}
function renderCatStats(){
  const s=calcMonthStats(today.getFullYear(),today.getMonth());
  $("cat-stat-cards").innerHTML=`<div class="cat-stat-section-label">Category breakdown</div>`+CATS.map(c=>{const x=s.cat[c.id];return `<div class="cat-stat-card" style="background:${c.bg};border-color:${c.color}22"><div class="cat-stat-header"><span class="cat-stat-emoji">${c.emoji}</span><div style="flex:1"><div class="cat-stat-name" style="color:${c.color}">${c.label}</div><div class="cat-stat-sub">${x.done} / ${x.possible} task-days completed</div></div><span class="cat-stat-rate-badge" style="color:${c.color};background:${c.color}12;border-color:${c.color}30">${x.pct}%</span></div><div class="cat-stat-bar-track"><div class="cat-stat-bar-fill" style="width:${x.pct}%;background:${c.color}"></div></div><div class="cat-stat-2col"><div class="cat-stat-cell"><div class="cat-stat-val" style="color:${c.color}">${getAllTimeCat(c.id)}</div><div class="cat-stat-lbl">All-time completions</div></div><div class="cat-stat-cell"><div class="cat-stat-val" style="color:${c.color}">${calcCatStreak(c.id)}d</div><div class="cat-stat-lbl">Current category streak</div></div></div></div>`;}).join("");
}

function toggleExpand(catId){state.expanded=state.expanded===catId?null:catId;saveData();renderHome();}
function toggleGoal(catId,id){
  state.completions[todayKey]??={};const was=!!state.completions[todayKey][id];state.completions[todayKey][id]=!was;
  if(!was){playSound("check");addXP(10);}else playSound("click");
  const tasks=getActiveTasksToday(),comps=state.completions[todayKey];if(!was&&tasks.length&&tasks.every(t=>comps[t.id]))playSound("finish");
  checkBadges();renderAll();saveData();
}
function deleteGoal(catId,id){
  const task=state.tasks.find(t=>t.id===id);if(!task)return;
  if(!confirm("Delete this task from today onward? Its historical completions will remain in analytics."))return;
  task.deletedAt=todayTime;state.expanded=catId;renderAll();saveData();
}

function fillCategorySelect(selected){$("modal-category").innerHTML=CATS.map(c=>`<option value="${c.id}" ${c.id===selected?"selected":""}>${c.emoji} ${c.label}</option>`).join("");}
function openModal(catId=state.activeModal||"mental",taskId=null){
  const cat=CATS.find(c=>c.id===catId)||CATS[0],task=taskId?state.tasks.find(t=>t.id===taskId):null;
  state.activeModal=cat.id;state.editingTaskId=task?task.id:null;state.expanded=cat.id;fillCategorySelect(task?.catId||cat.id);
  $("modal-emoji").textContent=cat.emoji;$("modal-cat-name").textContent=cat.label;$("modal-cat-name").style.color=cat.color;
  $("modal-mode-label").textContent=task?"EDIT TASK":"NEW TASK";$("modal-input").value=task?task.text:"";$("modal-priority").value=task?.priority||"medium";
  $("modal-date").value=task?formatDateInput(new Date(task.createdAt)):formatDateInput(today);$("modal-add-btn").textContent=task?"Save changes":"Create task";
  $("modal").classList.add("open");setTimeout(()=>$("modal-input").focus(),80);
}
function closeModal(){state.activeModal=null;state.editingTaskId=null;$("modal").classList.remove("open");}
function saveTaskFromModal(){
  const text=$("modal-input").value.trim();if(!text){$("modal-input").focus();return;}
  const catId=$("modal-category").value,priority=$("modal-priority").value,dateVal=$("modal-date").value;
  const createdAt=dateVal?toDayStart(`${dateVal}T12:00:00`):todayTime;
  if(state.editingTaskId){
    const task=state.tasks.find(t=>t.id===state.editingTaskId);if(task){task.text=text;task.catId=catId;task.priority=PRIORITY[priority]?priority:"medium";task.createdAt=createdAt;}
    playSound("click");
  }else{
    state.tasks.push({id:(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,catId,text,priority:PRIORITY[priority]?priority:"medium",createdAt,deletedAt:null});playSound("click");
  }
  closeModal();renderAll();saveData();
}
$("modal-add-btn").addEventListener("click",saveTaskFromModal);
$("modal-input").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveTaskFromModal();}});
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal();});

function openFabMenu(){state.fabOpen=!state.fabOpen;$("fab").classList.toggle("open",state.fabOpen);$("fab-menu").classList.toggle("open",state.fabOpen);if(state.fabOpen){playSound("uiPop");$("fab-menu-inner").innerHTML=CATS.map(c=>`<div class="fab-item" onclick="fabSelectCat('${c.id}')"><span class="fab-item-label" style="color:${c.color}">${c.label}</span><span class="fab-item-dot" style="color:${c.color};border-color:${c.color}33;background:${c.bg}">${c.emoji}</span></div>`).join("");}}
function fabSelectCat(catId){state.fabOpen=false;$("fab").classList.remove("open");$("fab-menu").classList.remove("open");openModal(catId);}
document.addEventListener("click",e=>{if(state.fabOpen&&!e.target.closest(".fab")&&!e.target.closest(".fab-menu")){state.fabOpen=false;$("fab").classList.remove("open");$("fab-menu").classList.remove("open");}});

function showDayGoals(y,m,d){
  playSound("uiSwipe");const key=`${y}-${m}-${d}`,tasks=getTasksForDate(y,m,d),comps=state.completions[key]||{};
  $("day-modal-date").textContent=dateAt(y,m,d).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  $("day-modal-goals").innerHTML=tasks.length?tasks.map(t=>{const c=CATS.find(x=>x.id===t.catId),done=!!comps[t.id];return `<div class="day-goal-item" style="background:${c.bg};border-color:${c.color}30"><span class="day-goal-dot" style="background:${done?c.color:"rgba(255,255,255,.15)"}"></span><span class="day-goal-text ${done?"day-goal-done":""}">${escapeHTML(t.text)}</span><span style="color:${c.color};font-size:11px">${c.emoji}</span></div>`}).join(""):`<div class="goal-empty">No active tasks were scheduled for this day.</div>`;
  $("day-modal").classList.add("open");
}
function closeDayModal(){$("day-modal").classList.remove("open");}
$("day-modal").addEventListener("click",e=>{if(e.target===$("day-modal"))closeDayModal();});

function toggleTaskCat(catId){const el=$(`cat-expand-${catId}`);if(el)el.style.display=el.style.display==="none"?"flex":"none";}
function renderCalendar(){
  const y=state.calYear,m=state.calMonth,days=new Date(y,m+1,0).getDate(),first=new Date(y,m,1).getDay(),grid=$("cal-grid");
  $("month-name").textContent=`${MONTHS[m]} ${y}`;
  const scores=Array.from({length:days},(_,i)=>getDayScore(y,m,i+1)),max=Math.max(1,...scores);
  let html="";for(let i=0;i<first;i++)html+="<div></div>";
  for(let d=1;d<=days;d++){
    const score=scores[d-1],pct=getDayPct(y,m,d),isToday=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();
    const alpha=score?Math.max(.10,(score/max)*.72):isToday?.06:.02;
    html+=`<div class="cal-day ${isToday?"today":""}" style="background:rgba(100,232,211,${alpha})" onclick="showDayGoals(${y},${m},${d})"><span class="cal-day-num">${d}</span>${score?`<span class="cal-score">${pct}%</span>`:""}</div>`;
  }
  grid.innerHTML=html;
  const stats=calcMonthStats(y,m);$("month-pct-num").textContent=`${stats.total.pct}%`;$("month-pct-fill").style.width=`${stats.total.pct}%`;
  renderTaskMonthStats(stats);
  if($("view-stats").classList.contains("active"))renderMonthlyLineGraph();
}
function renderTaskMonthStats(stats){
  const cats=CATS.filter(c=>Object.values(stats.task).some(t=>t.catId===c.id));
  $("task-month-stats").innerHTML=`<div class="task-month-header">Task completion this month</div>`+(cats.length?cats.map(cat=>{
    const ts=Object.values(stats.task).filter(t=>t.catId===cat.id),pct=stats.cat[cat.id].pct;
    return `<div class="task-month-cat-card" style="background:${cat.bg};border-color:${cat.color}22"><div class="task-month-cat-header" onclick="toggleTaskCat('${cat.id}')"><span class="task-month-emoji">${cat.emoji}</span><div><div class="task-month-cat-name" style="color:${cat.color}">${cat.label}</div><div class="task-month-cat-sub">${ts.length} tracked task${ts.length===1?"":"s"}</div></div><span class="task-month-pct" style="color:${cat.color}">${pct}%</span></div><div class="task-month-bar-track"><div class="task-month-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div><div class="task-cat-goals" id="cat-expand-${cat.id}" style="display:none">${ts.map(t=>`<div class="task-goal-row"><div class="task-goal-left"><span class="task-goal-dot" style="background:${cat.color}"></span><span class="task-goal-text">${escapeHTML(t.text)}</span></div><div class="task-goal-right"><span>${t.done}/${t.possible}</span><span style="color:${cat.color}">${t.pct}%</span></div><div class="task-goal-bar-track"><div class="task-goal-bar-fill" style="width:${t.pct}%;background:${cat.color}"></div></div></div>`).join("")}</div></div>`;
  }).join(""):`<div class="goal-empty">No task history for this month.</div>`);
}
function goToday(){state.calMonth=today.getMonth();state.calYear=today.getFullYear();renderCalendar();}

function setView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view==="month")renderCalendar();
  if(view==="stats"){renderCatStats();renderProgressGraph();renderMonthlyLineGraph();renderMoodHistory();renderInsights();renderXP();renderBadges();}
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
$("prev-month").addEventListener("click",()=>{if(state.calMonth===0){state.calMonth=11;state.calYear--;}else state.calMonth--;renderCalendar();});
$("next-month").addEventListener("click",()=>{if(state.calMonth===11){state.calMonth=0;state.calYear++;}else state.calMonth++;renderCalendar();});

function updateClock(){
  const now=new Date(),h=now.getHours(),mins=String(now.getMinutes()).padStart(2,"0"),hh=h%12||12,ampm=h>=12?"PM":"AM",time=`${hh}:${mins} ${ampm}`;
  $("time-label").textContent=time;$("mobile-time").textContent=time;
  $("date-label").textContent=now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  $("sidebar-date").textContent=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  $("greeting-part").textContent=h<12?"morning":h<17?"afternoon":"evening";
}
updateClock();setInterval(updateClock,1000);

(function initParticles(){
  const canvas=$("particle-canvas");
  if(!canvas) return;
  const ctx=canvas.getContext("2d");
  if(!ctx) return;
  let w=0,h=0,ps=[];
  const resize=()=>{w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;};
  resize();window.addEventListener("resize",resize,{passive:true});
  for(let i=0;i<24;i++)ps.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.2+.3,dx:(Math.random()-.5)*.12,dy:(Math.random()-.5)*.12});
  let raf=0;
  const draw=()=>{
    ctx.clearRect(0,0,w,h);ctx.fillStyle="rgba(100,232,211,.55)";
    ps.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();p.x+=p.dx;p.y+=p.dy;if(p.x<0||p.x>w||p.y<0||p.y>h){p.x=Math.random()*w;p.y=Math.random()*h;}});
    raf=requestAnimationFrame(draw);
  };
  draw();
  window.addEventListener("pagehide",()=>cancelAnimationFrame(raf),{once:true});
})();
addEventListener("resize",()=>{if($("view-stats").classList.contains("active"))renderMonthlyLineGraph();});

function renderAll(){renderHome();renderCalendar();}
renderAll();checkBadges();
