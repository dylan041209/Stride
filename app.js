'use strict';
(async()=>{const account=await window.StrideAccount.start();
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setTheme(dark){
document.documentElement.dataset.theme=dark?'dark':'light';
const button=$('#theme-toggle');
button.textContent=dark?'☀ Light mode':'☾ Dark mode';
button.setAttribute('aria-pressed',String(dark));
button.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
try{localStorage.setItem('stride.theme',dark?'dark':'light');}catch(e){}
}
setTheme(document.documentElement.dataset.theme==='dark');
$('#theme-toggle').onclick=()=>setTheme(document.documentElement.dataset.theme!=='dark');

let subjects=[...account.state.selectedSubjects];const activities=['Flashcards','Past papers','Exam questions','Note taking','Homework'],colourNames=['purple','red','green','blue','amber','teal','rose'];
const fresh=()=>({version:1,sessions:[],courses:[],tasks:[],plans:[],topics:[],rewards:[],goal:300});
let data=validate(account.state);
function validate(d){if(!d||d.version!==1||!['sessions','courses','tasks','plans','topics','rewards'].every(k=>Array.isArray(d[k]))||(d.goal!==null&&(!Number.isInteger(d.goal)||d.goal<1||d.goal>10080)))throw Error('Invalid backup');
for(const a of ['sessions','courses','tasks','plans','topics','rewards'])if(d[a].length>10000)throw Error('Backup too large');
if(d.sessions.some(s=>!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>1440||!activities.includes(s.activity)||typeof s.target!=='string'||typeof s.topic!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)))throw Error('Invalid sessions');
if(d.sessions.some(s=>s.activity==='Exam questions'&&!validExamScore(s)))throw Error('Invalid exam marks');
if(d.courses.some(c=>typeof c.id!=='string'||typeof c.name!=='string'||!Number.isInteger(c.total)||c.total<1||!Number.isInteger(c.done)||c.done<0||c.done>c.total))throw Error('Invalid courses');
if(d.rewards.some(r=>typeof r.title!=='string'||r.title.length<1||r.title.length>160||!Number.isInteger(r.level)||r.level<2||r.level>10000))throw Error('Invalid rewards');
for(const list of ['sessions','courses','tasks','plans','topics','rewards'])for(const item of d[list]){if(!item||typeof item!=='object'||!(/^[A-Za-z0-9_-]{1,128}$/).test(item.id))throw Error('Invalid record ID');}
if(d.selectedSubjects!==undefined&&(!Array.isArray(d.selectedSubjects)||d.selectedSubjects.length!==3||new Set(d.selectedSubjects).size!==3||d.selectedSubjects.some(s=>!account.catalogue.includes(s))))throw Error('Choose exactly three valid subjects');
if(d.subjectColours!==undefined){if(!d.subjectColours||typeof d.subjectColours!=='object'||Array.isArray(d.subjectColours)||Object.entries(d.subjectColours).some(([s,c])=>!account.catalogue.includes(s)||!colourNames.includes(c)))throw Error('Invalid subject colours');}
if(d.displayName!==undefined&&(typeof d.displayName!=='string'||!d.displayName.trim()||d.displayName.length>80))throw Error('Invalid display name');
return d;}
function save(){return account.save(data);}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4500);}
const date=d=>{const v=d||new Date();return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');};
const today=()=>date(),uid=()=>crypto.randomUUID(),sum=s=>s.reduce((n,x)=>n+x.minutes,0);
function monday(s=today()){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);return date(d);}
const pages={dashboard:'Dashboard',subjects:'Subjects',planner:'Study planner',focus:'Focus timer',tasks:'Assignments & exams',history:'Study history',rewards:'Rewards',courses:'Courses & MOOCs'};
$('#nav').innerHTML=Object.entries(pages).map(([k,v])=>'<a href="#'+k+'">'+v+'</a>').join('');
const targets=()=>subjects.map(s=>'<option value="'+s+'">'+s+'</option>').join('')+data.courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' (course)</option>').join('');
const name=t=>account.catalogue.includes(t)?t+(subjects.includes(t)?'':' (archived)'):data.courses.find(c=>c.id===t)?.name||'Archived course';
const cls=t=>account.catalogue.includes(t)?(data.subjectColours[t]||'purple'):'course';
const bar=(n,max)=>'<div class="bar"><span style="width:'+Math.min(100,Math.max(0,n/max*100))+'%"></span></div>';
const XP_PER_LEVEL=100;
const level=x=>Math.floor(x/XP_PER_LEVEL)+1;
function xp(){const days=[...new Set(data.sessions.map(s=>s.date))];const weeks=[...new Set(data.sessions.map(s=>monday(s.date)))];return sum(data.sessions)+days.filter(d=>sum(data.sessions.filter(s=>s.date===d))>=20).length*20+weeks.filter(w=>data.goal&&sum(data.sessions.filter(s=>monday(s.date)===w))>=data.goal).length*50;}
const empty=t=>'<p class="empty">'+t+'</p>';

function validExamScore(s){return Number.isInteger(s.marksAvailable)&&s.marksAvailable>=1&&s.marksAvailable<=100&&Number.isInteger(s.marksEarned)&&s.marksEarned>=0&&s.marksEarned<=s.marksAvailable;}
function examDays(list){const groups=new Map();list.filter(s=>s.activity==='Exam questions'&&validExamScore(s)).forEach(s=>{const k=s.target+'|'+s.date;if(!groups.has(k))groups.set(k,{target:s.target,date:s.date,earned:0,available:0});const g=groups.get(k);g.earned+=s.marksEarned;g.available+=s.marksAvailable;});return [...groups.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(g=>({...g,percent:g.earned/g.available*100}));}
function examProgress(list){
const days=examDays(list);if(!days.length)return '<div class="card"><h2>Exam question progress</h2>'+empty('Log a scored exam question to start your graph.')+'</div>';
const dates=[...new Set(days.map(g=>g.date))],start=Date.parse(dates[0]+'T00:00:00Z'),end=Date.parse(dates[dates.length-1]+'T00:00:00Z');
const x=d=>end===start?360:60+(Date.parse(d+'T00:00:00Z')-start)/(end-start)*600,y=p=>225-p*1.9;
const grid=[0,25,50,75,100].map(p=>'<line x1="60" y1="'+y(p)+'" x2="660" y2="'+y(p)+'" class="chart-grid"/><text x="48" y="'+(y(p)+4)+'" text-anchor="end" class="chart-label">'+p+'%</text>').join('');
const series=[...new Set(days.map(g=>g.target))];
const lines=series.map(t=>{const ps=days.filter(g=>g.target===t);return '<g class="'+cls(t)+'"><polyline class="exam-line" points="'+ps.map(g=>x(g.date)+','+y(g.percent)).join(' ')+'"/>'+ps.map(g=>'<circle class="exam-dot" cx="'+x(g.date)+'" cy="'+y(g.percent)+'" r="5"><title>'+esc(name(t))+' · '+g.date+' · '+g.earned+'/'+g.available+' ('+Math.round(g.percent)+'%)</title></circle>').join('')+'</g>';}).join('');
const labels=dates.length===1?'<text x="360" y="252" text-anchor="middle" class="chart-label">'+dates[0]+'</text>':'<text x="60" y="252" class="chart-label">'+dates[0]+'</text><text x="660" y="252" text-anchor="end" class="chart-label">'+dates[dates.length-1]+'</text>';
return '<div class="card"><h2>Exam question progress</h2><p class="muted">Daily percentage: total marks earned ÷ total marks available, separately for each subject or course.</p><div class="chart-legend">'+series.map(t=>'<span class="pill '+cls(t)+'">'+esc(name(t))+'</span>').join('')+'</div><svg class="exam-chart" viewBox="0 0 720 270" role="img" aria-label="Exam question percentages over time">'+grid+lines+labels+'</svg><p class="muted">'+(dates.length===1?'Log on another day to see your trend.':'Hover over a point for the score.')+'</p><details><summary>View scores as a table</summary><div class="score-table-wrap"><table class="score-table"><thead><tr><th>Date</th><th>Subject / course</th><th>Marks</th><th>Score</th></tr></thead><tbody>'+days.map(g=>'<tr><td>'+g.date+'</td><td>'+esc(name(g.target))+'</td><td>'+g.earned+'/'+g.available+'</td><td>'+Math.round(g.percent)+'%</td></tr>').join('')+'</tbody></table></div></details></div>';
}

function entries(list){return list.length?list.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>'<div class="entry row"><div><span class="pill '+cls(s.target)+'">'+esc(name(s.target))+'</span> <strong>'+esc(s.topic)+'</strong><p class="muted">'+esc(s.activity)+' · '+esc(s.date)+' · '+s.minutes+' min</p>'+(s.activity==='Exam questions'&&validExamScore(s)?'<p class="exam-score">'+s.marksEarned+'/'+s.marksAvailable+' marks · '+Math.round(s.marksEarned/s.marksAvailable*100)+'%</p>':'')+(s.notes?'<p>'+esc(s.notes)+'</p>':'')+'</div><button class="quiet" data-delete-session="'+esc(s.id)+'" aria-label="Delete session">×</button></div>').join(''):empty('Your next session starts the story.');}
let timer={running:false,start:0,elapsed:0};
function elapsed(){return timer.elapsed+(timer.running?Date.now()-timer.start:0);}
function timerDisplay(){const sec=Math.floor(elapsed()/1000);const el=$('#clock');if(el)el.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
setInterval(timerDisplay,500);
function render(){
window.StrideMotion?.beforeRender($('#content'));
const parts=(location.hash.slice(1)||'dashboard').split('/'),page=pages[parts[0]]?parts[0]:'dashboard',detail=parts[1];
$('#title').textContent=pages[page];document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+page));
let out='',week=data.sessions.filter(s=>monday(s.date)===monday()),total=xp();
if(page==='dashboard')out='<section class="card hero"><span class="pill">ONE STEP AT A TIME</span><h2>Make room for your next stride.</h2><p>Choose a topic. Give it a little focus. Watch your progress grow.</p><button data-open-log>Log your first or next session →</button></section><div class="grid three"><div class="card"><p class="muted">This week</p><div class="stat">'+sum(week)+' <small>min</small></div>'+bar(sum(week),data.goal||180)+'<p>'+(data.goal?data.goal+' minute weekly goal':'Set a weekly goal in Rewards')+'</p></div><div class="card"><p class="muted">Your overall level</p><div class="stat">Level '+level(total)+'</div>'+bar(total%XP_PER_LEVEL,XP_PER_LEVEL)+'<p>'+total+' XP · '+(XP_PER_LEVEL-total%XP_PER_LEVEL)+' to next level</p></div><div class="card"><p class="muted">Today’s quest</p><h2>Find your focus</h2><p>Study for 20 minutes today. Earn 20 bonus XP.</p>'+bar(sum(data.sessions.filter(s=>s.date===today())),20)+'</div></div><div class="grid three">'+subjectCards()+'</div><div class="card"><h2>Coming up</h2>'+taskList(data.tasks.filter(t=>!t.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4))+'</div>';
if(page==='subjects'){const s=subjects.find(x=>x===safeDecode(detail||''));if(s){let sessions=data.sessions.filter(x=>x.target===s);out='<a class="link" href="#subjects">← All subjects</a><div class="card '+cls(s)+'"><h2>'+s+'</h2><div class="stat">'+sum(sessions)+' min</div><p>Level '+level(sum(sessions))+' · '+sum(sessions)+' subject XP</p></div><div class="grid two"><div class="card"><h2>How you study</h2>'+activities.map(a=>'<p>'+a+' · '+sum(sessions.filter(x=>x.activity===a))+' min</p>'+bar(sum(sessions.filter(x=>x.activity===a)),Math.max(1,sum(sessions)))).join('')+'</div><div class="card"><h2>Topics & goals</h2><form id="topic-form"><input name="title" placeholder="Add a topic or learning goal" required maxlength="120"><input type="hidden" name="subject" value="'+s+'"><button>Add topic</button></form>'+data.topics.filter(t=>t.subject===s).map(t=>'<div class="entry"><label><input type="checkbox" data-topic="'+t.id+'" '+(t.done?'checked':'')+'> '+esc(t.title)+'</label></div>').join('')+'</div></div>'+examProgress(sessions)+'<div class="card"><h2>Subject sessions</h2>'+entries(sessions)+'</div>';}else out='<div class="grid three">'+subjectCards()+'</div>';}
if(page==='history')out='<div class="card"><div class="grid two"><label>Subject or course<select id="filter-target"><option value="">All subjects & courses</option>'+targets()+'</select></label><label>Activity<select id="filter-activity"><option value="">All activities</option>'+activities.map(a=>'<option>'+a+'</option>').join('')+'</select></label></div><label>Search topic<input id="filter-topic" placeholder="Find a topic"></label><div id="history-list">'+entries(data.sessions)+'</div></div><div id="history-exam-progress">'+examProgress(data.sessions)+'</div>';
if(page==='focus')out='<div class="card"><h2>A little space to focus</h2><p class="muted">The timer counts study time. Pause it during breaks. Keep this tab open while timing.</p><div id="clock" class="timer">00:00</div><div class="actions"><button id="timer-toggle">'+(timer.running?'Pause':'Start / resume')+'</button><button id="timer-save">Finish & log</button><button class="quiet" id="timer-reset">Reset</button></div></div>';
if(page==='planner')out=plannerCalendar()+'<section class="card"><h2>Plan a session</h2><form id="plan-form"><div class="grid two"><label>Subject / course<select name="target">'+targets()+'</select></label><label>Date<input type="date" name="date" required value="'+today()+'"></label><label>Topic<input name="topic" required maxlength="120"></label><label>Minutes<input name="minutes" type="number" min="1" max="1440" step="1" value="30" required></label></div><button>Add to planner</button></form></section><section class="card"><h2>All planned sessions</h2>'+(data.plans.length?'<div class="all-plan-list">'+data.plans.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(p=>plannedSession(p,true)).join('')+'</div>':empty('Add a session above to make a little space for studying.'))+'</section>';
if(page==='tasks')out='<div class="card"><h2>Make deadlines feel manageable</h2><form id="task-form"><div class="grid two"><label>Title<input name="title" required maxlength="160"></label><label>Subject / course<select name="target">'+targets()+'</select></label><label>Deadline<input name="date" type="date" required></label><label>Type<select name="type"><option>Assignment</option><option>Exam</option></select></label><label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Low</option></select></label></div><button>Add deadline</button></form></div><div class="card">'+taskList(data.tasks.slice().sort((a,b)=>a.date.localeCompare(b.date)))+'</div>';
if(page==='courses')out='<div class="card hero"><h2>Curiosity goes beyond the classroom.</h2><p>Your online courses and MOOCs have their own home here.</p><strong>'+sum(data.sessions.filter(s=>!account.catalogue.includes(s.target)))+' minutes of independent learning</strong></div><div class="card"><h2>Add a course</h2><form id="course-form"><div class="grid two"><label>Course name<input name="name" required maxlength="160"></label><label>Provider<input name="provider" maxlength="120"></label><label>Course link<input name="url" type="url" placeholder="https://"></label><label>Total modules<input name="total" type="number" min="1" max="10000" value="10" required></label></div><button>Add course</button></form></div>'+data.courses.map(c=>'<div class="card course"><div class="row"><h2>'+esc(c.name)+'</h2><span class="pill">'+c.done+'/'+c.total+' modules</span></div><p>'+esc(c.provider)+'</p>'+bar(c.done,c.total)+(safeUrl(c.url)?'<a class="link" href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">Open course ↗</a>':'')+'<form data-course="'+c.id+'"><div class="grid two"><label>Completed modules<input name="done" type="number" min="0" max="'+c.total+'" value="'+c.done+'" required></label><label>Certificate link (optional)<input name="certificate" type="url" value="'+esc(c.certificate||'')+'"></label></div><button>Update progress</button></form>'+(safeUrl(c.certificate)?'<p><a class="link" href="'+esc(c.certificate)+'" target="_blank" rel="noopener noreferrer">View certificate ↗</a></p>':'')+'<p>'+sum(data.sessions.filter(s=>s.target===c.id))+' study minutes</p></div>').join('');
if(page==='rewards'){
out='<div class="card hero"><h2>Every session is a step forward.</h2><div class="stat">Level '+level(total)+' · '+total+' XP</div>'+bar(total%XP_PER_LEVEL,XP_PER_LEVEL)+'<p>'+XP_PER_LEVEL+' XP per level · '+(XP_PER_LEVEL-total%XP_PER_LEVEL)+' XP to your next level.</p><p>Study minutes earn XP, plus 20 XP for each day with 20 minutes and 50 XP for each week meeting your goal.</p><p class="muted">Bonuses are calculated from your saved sessions and current goal. No penalty for missed days.</p></div><div class="grid three">'+badges().map(([n,d,ok])=>'<div class="card '+(ok?'green':'locked')+'"><span class="pill">'+(ok?'✦ Unlocked':'◇ In progress')+'</span><h2>'+n+'</h2><p>'+d+'</p></div>').join('')+'</div>';
out+='<div class="grid two reward-settings"><section class="card"><span class="pill">YOUR ROUTINE</span><h2>Your weekly goal</h2><p class="muted">A little focus, at your own pace. Change your target whenever you need to.</p>'+(data.goal?'<div class="goal-current"><strong>'+data.goal+' <small>minutes a week</small></strong><span class="pill">'+(sum(week)>=data.goal?'✓ Goal reached':'In progress')+'</span></div>'+bar(sum(week),data.goal)+'<p class="muted">'+sum(week)+' / '+data.goal+' minutes this week</p>':'<p class="empty">No weekly goal set. Add one when you’re ready.</p>')+'<form id="goal-form"><label>Minutes per week<input name="goal" type="number" min="1" max="10080" step="1" value="'+(data.goal||180)+'" required></label><div class="reward-actions"><button>'+(data.goal?'Update goal':'Save goal')+'</button>'+(data.goal?'<button type="button" class="quiet" id="remove-goal">Remove goal</button>':'')+'</div></form></section><section class="card"><span class="pill">MAKE IT PERSONAL</span><h2>Something to look forward to</h2><p class="muted">Choose a treat worth working towards. You can edit or delete it at any time.</p><form id="reward-form"><label>Personal reward<input name="title" required maxlength="160" placeholder="A film night"></label><label>Unlock at level<input name="level" type="number" min="2" max="10000" step="1" value="'+Math.max(2,level(total)+1)+'" required></label><button>Add reward</button></form></section></div><section class="personal-rewards" aria-labelledby="personal-rewards-title"><div class="row"><h2 id="personal-rewards-title">Your personal rewards</h2><span class="muted">'+data.rewards.length+' '+(data.rewards.length===1?'reward':'rewards')+'</span></div><div class="grid two">'+rewardCards(total)+'</div></section>';
}
$('#content').innerHTML=out;renderAccountMenu();timerDisplay();bind(page);window.StrideMotion?.render($('#content'),'tracker:'+page+'/'+(detail||''));}
function safeUrl(u){try{return ['http:','https:'].includes(new URL(u).protocol);}catch{return false;}}
function subjectCards(){return subjects.map(s=>{const n=sum(data.sessions.filter(x=>x.target===s));return '<div class="card '+cls(s)+'"><span class="pill">SCHOOL SUBJECT</span><h2>'+s+'</h2><div class="stat accent">'+n+' <small>min</small></div><p>Level '+level(n)+'</p><a class="link" href="#subjects/'+encodeURIComponent(s)+'">Explore subject →</a></div>';}).join('');}
function planDateLabel(value){const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}
function plannedSession(p,showDate=false){
return '<article class="planned-session '+cls(p.target)+(showDate?' plan-summary':'')+'" data-plan-card="'+esc(p.id)+'"><button type="button" class="quiet plan-remove" data-delete-plan="'+esc(p.id)+'" aria-label="'+esc('Remove planned session: '+p.topic)+'">×</button><p class="plan-subject">'+esc(name(p.target))+'</p><h3 class="plan-topic">'+esc(p.topic)+'</h3><div class="plan-meta">'+(showDate?'<time datetime="'+esc(p.date)+'">'+esc(planDateLabel(p.date))+'</time>':'')+'<span class="plan-duration">'+esc(p.minutes)+' min</span></div></article>';
}
function plannerCalendar(){
const start=new Date(monday()+'T12:00:00'),end=new Date(start);end.setDate(end.getDate()+6);
const range=start.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' – '+end.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const plans=data.plans.filter(p=>p.date>=date(start)&&p.date<=date(end)),minutes=plans.reduce((n,p)=>n+(Number(p.minutes)||0),0);
return '<section class="card planner-calendar"><div class="planner-top"><div><span class="eyebrow">A LITTLE SPACE TO FOCUS</span><h2>Your week</h2><p class="planner-range">'+range+'</p></div><span class="pill planner-total">'+plans.length+' '+(plans.length===1?'session':'sessions')+' · '+minutes+' min planned</span></div><div class="planner-week">'+Array.from({length:7},(_,i)=>{
const d=new Date(start);d.setDate(d.getDate()+i);const ds=date(d),sessions=plans.filter(p=>p.date===ds),isToday=ds===today();
return '<section class="planner-day '+(isToday?'planner-today':'')+'" aria-label="'+esc(planDateLabel(ds))+'"><div class="planner-day-heading"><time datetime="'+ds+'"><span>'+d.toLocaleDateString('en-GB',{weekday:'short'})+'</span><strong>'+d.getDate()+'</strong></time>'+(isToday?'<span class="planner-today-label">Today</span>':'')+'</div><div class="planner-day-sessions">'+(sessions.length?sessions.map(p=>plannedSession(p)).join(''):'<p class="planner-empty">No sessions planned</p>')+'</div></section>';
}).join('')+'</div></section>';
}
function deadlineDate(task){
const due=new Date(task.date+'T12:00:00');
if(Number.isNaN(due.getTime()))return {day:'—',month:'DATE',year:'',label:'No valid date',status:task.done?'Completed':'Choose a deadline',overdue:false};
const days=Math.round((Date.parse(task.date+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000);
return {day:due.getDate(),month:due.toLocaleDateString('en-GB',{month:'short'}),year:due.getFullYear(),label:due.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),status:task.done?'Completed':days<0?'Overdue by '+Math.abs(days)+' '+(days===-1?'day':'days'):days===0?'Due today':days===1?'Due tomorrow':days+' days to go',overdue:!task.done&&days<0};
}
function taskList(ts){
if(!ts.length)return empty('No deadlines yet. Add one when you’re ready.');
return '<div class="deadline-list">'+ts.map(t=>{
const due=deadlineDate(t),priority=['High','Normal','Low'].includes(t.priority)?t.priority:'Normal';
return '<article class="deadline-card '+cls(t.target)+(t.done?' deadline-complete':'')+'" data-deadline-card="'+esc(t.id)+'"><time class="deadline-date" datetime="'+esc(t.date)+'" aria-label="'+esc(due.label)+'"><span>'+due.month+'</span><strong>'+due.day+'</strong><small>'+due.year+'</small></time><div class="deadline-body"><label class="deadline-title"><input type="checkbox" data-task="'+esc(t.id)+'" '+(t.done?'checked':'')+' aria-label="'+esc('Completed: '+t.title)+'"><span>'+esc(t.title)+'</span></label><div class="deadline-tags"><span class="deadline-subject">'+esc(name(t.target))+'</span><span class="deadline-type">'+esc(t.type)+'</span><span class="deadline-priority priority-'+priority.toLowerCase()+'">'+priority+' priority</span></div><p class="deadline-status '+(due.overdue?'deadline-overdue':'')+'">'+(t.done?'✓ ':'')+esc(due.status)+'</p></div><button class="quiet deadline-remove" data-delete-task="'+esc(t.id)+'" aria-label="'+esc('Remove deadline: '+t.title)+'">Remove</button></article>';
}).join('')+'</div>';
}
function badges(){const s=data.sessions;const weeks=[...new Set(s.map(x=>monday(x.date)))];let topics=new Map();s.forEach(x=>{const k=x.target+'|'+x.topic.trim().toLowerCase();if(!topics.has(k))topics.set(k,new Set());topics.get(k).add(x.date);});return [['Full Marks','Earn every available mark on an exam question',s.some(x=>x.activity==='Exam questions'&&validExamScore(x)&&x.marksEarned===x.marksAvailable)],['First Steps','Log your first session',s.length>0],['Paper Trail','Complete 5 past paper sessions',s.filter(x=>x.activity==='Past papers').length>=5],['Total Recall','Complete 10 flashcard sessions',s.filter(x=>x.activity==='Flashcards').length>=10],['Balanced Week','Study all 3 school subjects in one week',weeks.some(w=>subjects.every(t=>s.some(x=>x.target===t&&monday(x.date)===w)))],['Topic Revisited','Study a topic on 3 distinct dates',[...topics.values()].some(v=>v.size>=3)],['Five Hours Strong','Log 300 study minutes',sum(s)>=300],['Course Complete','Complete every module in an online course',data.courses.some(c=>c.done===c.total)]];}

function updateEarnedOptions(){const f=$('#session'),total=Number(f.elements.marksAvailable.value),previous=f.elements.marksEarned.value;f.elements.marksEarned.innerHTML='<option value="">Select score</option>'+(total?Array.from({length:total+1},(_,i)=>'<option value="'+i+'">'+i+'</option>').join(''):'');if(previous!==''&&Number(previous)<=total)f.elements.marksEarned.value=previous;}
function toggleExamMarks(){const f=$('#session'),exam=f.elements.activity.value==='Exam questions';$('#exam-marks').hidden=!exam;for(const field of [f.elements.marksAvailable,f.elements.marksEarned]){field.disabled=!exam;field.required=exam;}if(exam)updateEarnedOptions();else{f.elements.marksAvailable.value='';f.elements.marksEarned.innerHTML='<option value="">Select score</option>';}}
$('#session').elements.activity.onchange=toggleExamMarks;
$('#session').elements.marksAvailable.onchange=updateEarnedOptions;

let fromTimer=false;
function openLog(minutes){const f=$('#session');f.reset();f.elements.target.innerHTML=targets();f.elements.date.value=today();f.elements.date.max=today();f.elements.minutes.value=minutes||30;fromTimer=!!minutes;toggleExamMarks();$('#dialog').showModal();}
$('#log').onclick=()=>openLog();$('#cancel').onclick=()=>$('#dialog').close();
$('#session').onsubmit=e=>{e.preventDefault();const f=e.target, v=Object.fromEntries(new FormData(f));if(v.date>today()||!v.topic.trim())return toast('Choose today or an earlier date and enter a topic.');if(v.activity==='Exam questions'){if(v.marksAvailable===''||v.marksEarned==='')return toast('Choose marks available and earned.');v.marksAvailable=Number(v.marksAvailable);v.marksEarned=Number(v.marksEarned);if(!validExamScore(v))return toast('Marks earned must be between zero and marks available.');}else{delete v.marksAvailable;delete v.marksEarned;}const before=xp();data.sessions.push({...v,id:uid(),topic:v.topic.trim(),minutes:Number(v.minutes)});save();if(fromTimer)timer={running:false,start:0,elapsed:0};$('#dialog').close();render();toast('Session saved · +'+(xp()-before)+' XP ✨'+(v.activity==='Exam questions'&&v.marksEarned===v.marksAvailable?' · Full Marks! 🏅':''));};
function form(id,fn){const f=$(id);if(f)f.onsubmit=e=>{e.preventDefault();fn(Object.fromEntries(new FormData(f)));save();render();};}

function safeDecode(s){try{return decodeURIComponent(s);}catch{return '';}}
function rewardCards(total){
if(!data.rewards.length)return '<div class="card reward-empty"><span class="reward-icon" aria-hidden="true">✦</span><h3>Your next little celebration</h3><p class="muted">Add a personal reward above and watch each study session bring it closer.</p></div>';
return data.rewards.map(r=>{
const required=(r.level-1)*XP_PER_LEVEL,available=total>=required,remaining=Math.max(0,required-total);
return '<article class="card personal-reward '+(available?'reward-available':'')+'" data-reward-card="'+esc(r.id)+'"><div class="reward-heading"><span class="reward-icon" aria-hidden="true">'+(available?'✦':'◇')+'</span><span class="pill reward-status">'+(available?'✓ Ready to enjoy':'In progress')+'</span></div><h3>'+esc(r.title)+'</h3><p class="reward-level">Unlocks at level '+r.level+'</p><div class="reward-progress" role="progressbar" aria-label="Progress towards '+esc(r.title)+'" aria-valuemin="0" aria-valuemax="'+required+'" aria-valuenow="'+Math.min(total,required)+'"><span style="width:'+Math.min(100,total/required*100)+'%"></span></div><p class="reward-description">'+(available?'You’ve earned this. Enjoy your reward when you’re ready.':remaining+' XP to go. Every session brings it closer.')+'</p><div class="reward-actions"><button class="quiet" data-edit-reward="'+esc(r.id)+'" aria-label="Edit '+esc(r.title)+'">Edit reward</button><button class="quiet reward-delete" data-delete-reward="'+esc(r.id)+'" aria-label="Delete '+esc(r.title)+'">Delete</button></div></article>';
}).join('');
}
function rewardValues(form){
const v=Object.fromEntries(new FormData(form)),title=v.title.trim(),rewardLevel=Number(v.level);
if(!title||title.length>160||!Number.isInteger(rewardLevel)||rewardLevel<2||rewardLevel>10000){toast('Enter a reward and a whole-number level between 2 and 10,000.');return null;}
return {title,level:rewardLevel};
}
function openRewardEditor(id){
const reward=data.rewards.find(r=>r.id===id);if(!reward)return;const dialog=$('#reward-editor');
dialog.innerHTML='<form id="reward-edit-form"><div class="row"><h2 id="reward-editor-title">Edit your reward</h2><button type="button" class="quiet" id="close-reward-editor" aria-label="Close reward editor">×</button></div><p class="muted">Make it something you’ll look forward to.</p><label>Personal reward<input name="title" required maxlength="160" value="'+esc(reward.title)+'"></label><label>Unlock at level<input name="level" type="number" min="2" max="10000" step="1" required value="'+reward.level+'"></label><div class="actions"><button type="button" class="quiet" id="cancel-reward-edit">Cancel</button><button>Save changes</button></div></form>';
$('#close-reward-editor').onclick=$('#cancel-reward-edit').onclick=()=>dialog.close();
$('#reward-edit-form').onsubmit=e=>{e.preventDefault();const values=rewardValues(e.target);if(!values)return;Object.assign(reward,values);save();dialog.close();render();toast('Reward updated.');};
dialog.showModal();
}
function bindRewards(){
$('#reward-form').onsubmit=e=>{e.preventDefault();const values=rewardValues(e.target);if(!values)return;data.rewards.push({...values,id:uid()});save();render();toast('Something to look forward to, added.');};
document.querySelectorAll('[data-edit-reward]').forEach(b=>b.onclick=()=>openRewardEditor(b.dataset.editReward));
document.querySelectorAll('[data-delete-reward]').forEach(b=>b.onclick=()=>{const reward=data.rewards.find(r=>r.id===b.dataset.deleteReward);if(!reward||!confirm('Delete “'+reward.title+'”? Your study progress and XP will stay the same.'))return;data.rewards=data.rewards.filter(r=>r.id!==reward.id);save();render();toast('Reward deleted.');});
const remove=$('#remove-goal');if(remove)remove.onclick=()=>{if(!confirm('Remove your weekly goal? Weekly XP bonuses will be recalculated.'))return;data.goal=null;save();render();toast('Weekly goal removed.');};
}
function displayName(){const value=data.displayName??account.user?.user_metadata?.display_name;return typeof value==='string'?value.trim().slice(0,80):'';}
function accountSettings(){
const title=displayName(),initial=Array.from(title)[0]||'✦';
return '<div class="account-dialog-heading row"><h2 id="account-settings-title">Account settings</h2><button type="button" id="close-settings" class="quiet" aria-label="Close account settings">×</button></div><div class="account-page"><form id="account-form" class="account-layout"><section class="card account-profile" aria-labelledby="profile-heading"><h2 id="profile-heading">Your profile</h2><div class="account-identity"><span class="account-avatar" aria-hidden="true">'+esc(initial.toUpperCase())+'</span><div><h3 id="account-name">'+esc(title||'Your account')+'</h3><p class="muted account-email">'+esc(account.user?.email||'')+'</p></div></div><label for="display-name">Display name</label><input id="display-name" name="displayName" autocomplete="nickname" maxlength="80" required value="'+esc(title)+'" aria-describedby="display-name-help"><p id="display-name-help" class="muted">A name or nickname for your study space. It is not a public profile.</p></section><section class="card account-subjects" aria-labelledby="account-subjects-heading"><h2 id="account-subjects-heading">Subjects & colours</h2><p class="muted" id="account-subjects-help">Choose three subjects. Previous sessions stay in your study history when you switch.</p>'+subjects.map((s,i)=>'<fieldset class="account-subject" data-account-subject="'+i+'" data-current-subject="'+esc(s)+'"><legend>Subject '+(i+1)+'</legend><div class="account-subject-fields"><label for="account-subject-'+i+'">Subject<select id="account-subject-'+i+'" name="subject'+i+'" aria-label="Subject '+(i+1)+'" aria-describedby="account-subjects-help">'+account.catalogue.map(t=>'<option value="'+esc(t)+'" '+(s===t?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label><label for="account-colour-'+i+'">Colour<select id="account-colour-'+i+'" name="colour'+i+'" aria-label="Colour for subject '+(i+1)+'">'+colourNames.map(c=>'<option value="'+c+'" '+((data.subjectColours[s]||'purple')===c?'selected':'')+'>'+c[0].toUpperCase()+c.slice(1)+'</option>').join('')+'</select></label></div><span class="account-subject-preview '+cls(s)+'"><span aria-hidden="true"></span><span>'+esc(s)+'</span></span></fieldset>').join('')+'</section><div class="account-save"><p id="account-feedback" role="status" aria-live="polite" tabindex="-1"></p><button type="submit" id="save-account">Save changes</button></div></form></div>';
}
function renderAccountMenu(){
const title=displayName(),initial=Array.from(title)[0]||'✦';
$('#account-control').innerHTML='<details id="account-menu" class="account-menu"><summary aria-label="Account menu"><span class="account-menu-avatar" aria-hidden="true">'+esc(initial.toUpperCase())+'</span><span>Account</span><span class="account-caret" aria-hidden="true">⌄</span></summary><div class="account-menu-panel"><div class="account-menu-identity"><strong>'+esc(title||'Your account')+'</strong><span>'+esc(account.user?.email||'')+'</span></div><button type="button" data-account-edit="profile">Display name<span aria-hidden="true">↗</span></button><button type="button" data-account-edit="subjects">Subjects & colours<span aria-hidden="true">↗</span></button><div class="account-menu-divider"></div><button type="button" id="signout">Sign out<span aria-hidden="true">→</span></button></div></details>';
document.querySelectorAll('[data-account-edit]').forEach(button=>button.onclick=()=>openAccountSettings(button.dataset.accountEdit));
$('#signout').onclick=()=>{ $('#account-menu').open=false;account.signOut(); };
}
function openAccountSettings(section){
$('#account-menu').open=false;const dialog=$('#account-settings');dialog.innerHTML=accountSettings();dialog.setAttribute('aria-labelledby','account-settings-title');bindAccount();dialog.showModal();
const input=section==='subjects'?$('#account-subject-0'):$('#display-name');input.focus();input.scrollIntoView({block:'nearest'});
}
document.addEventListener('click',event=>{const menu=$('#account-menu');if(menu?.open&&!event.target.closest('#account-control'))menu.open=false;});
document.addEventListener('keydown',event=>{const menu=$('#account-menu');if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();}});
$('#account-settings').addEventListener('close',()=>$('#account-menu summary')?.focus());
function bindAccount(){
const form=$('#account-form'),feedback=$('#account-feedback'),button=$('#save-account'),draftColours={...data.subjectColours};
const message=(text,error=false)=>{feedback.textContent=text;feedback.classList.toggle('account-error',error);feedback.setAttribute('aria-live',error?'assertive':'polite');};
const changed=()=>{form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));message('Unsaved changes');};
form.addEventListener('input',changed);
form.querySelectorAll('[data-account-subject]').forEach(row=>{
 const select=row.querySelector('[name^="subject"]'),colour=row.querySelector('[name^="colour"]'),preview=row.querySelector('.account-subject-preview');
 const paint=()=>{preview.className='account-subject-preview '+colour.value;preview.lastElementChild.textContent=select.value;};
 select.onchange=()=>{draftColours[row.dataset.currentSubject]=colour.value;row.dataset.currentSubject=select.value;colour.value=draftColours[select.value]||'purple';paint();changed();};
 colour.onchange=()=>{draftColours[select.value]=colour.value;paint();changed();};
});
form.onsubmit=async e=>{
 e.preventDefault();const values=Object.fromEntries(new FormData(form)),title=values.displayName.trim(),chosen=[0,1,2].map(i=>values['subject'+i]);
 if(!title||title.length>80){$('#display-name').setAttribute('aria-invalid','true');message('Enter a display name between 1 and 80 characters.',true);$('#display-name').focus();return;}
 if(new Set(chosen).size!==3){const duplicates=chosen.map((s,i)=>chosen.indexOf(s)!==i||chosen.lastIndexOf(s)!==i);duplicates.forEach((duplicate,i)=>{if(duplicate)form.elements['subject'+i].setAttribute('aria-invalid','true');});message('Choose three different subjects before saving.',true);form.elements['subject'+duplicates.indexOf(true)].focus();return;}
 if(chosen.some(s=>!account.catalogue.includes(s))||[0,1,2].some(i=>!colourNames.includes(values['colour'+i]))){message('Choose a valid subject and colour for each row.',true);return;}
 data.displayName=title;data.selectedSubjects=chosen;chosen.forEach((s,i)=>data.subjectColours[s]=values['colour'+i]);subjects=[...chosen];
 $('#display-name').value=title;$('#account-name').textContent=title;$('.account-avatar').textContent=Array.from(title)[0].toUpperCase();
 const controls=[...form.querySelectorAll('input,select,button')];controls.forEach(control=>control.disabled=true);button.textContent='Saving…';message('Saving changes…');
 try{if(!save())throw Error('Save unavailable');await account.flush();if(window.StrideAccount.hasUnsynced())message('Changes are not synced yet. Check the sync message at the bottom of the page.',true);else message('Account changes saved.');render();}
 catch{message('Changes could not be synced. Check the sync message at the bottom of the page.',true);}
 finally{controls.forEach(control=>control.disabled=false);button.textContent='Save changes';}
};
$('#close-settings').onclick=()=>$('#account-settings').close();
}
function migrateBackup(incoming){
const aliases={Business:'Business Studies',IT:'ICT'};
for(const list of ['sessions','tasks','plans'])incoming[list].forEach(item=>{item.target=aliases[item.target]||item.target;});incoming.topics.forEach(item=>{item.subject=aliases[item.subject]||item.subject;});
incoming.selectedSubjects=[...subjects];incoming.subjectColours={...data.subjectColours};if(displayName())incoming.displayName=displayName();else delete incoming.displayName;incoming.setupStage='complete';return validate(incoming);
}

function bind(page){
document.querySelectorAll('[data-open-log]').forEach(b=>b.onclick=()=>openLog());
for(const [attr,arr] of [['delete-session','sessions'],['delete-plan','plans'],['delete-task','tasks']])document.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>{if(!confirm('Remove this record?'))return;data[arr]=data[arr].filter(x=>x.id!==b.getAttribute('data-'+attr));save();render();});
for(const [attr,arr] of [['task','tasks'],['topic','topics']])document.querySelectorAll('[data-'+attr+']').forEach(b=>b.onchange=()=>{const x=data[arr].find(x=>x.id===b.getAttribute('data-'+attr));if(x)x.done=b.checked;save();if(arr==='tasks')render();});
form('#topic-form',v=>data.topics.push({...v,id:uid(),done:false}));form('#task-form',v=>data.tasks.push({...v,id:uid(),done:false}));form('#plan-form',v=>data.plans.push({...v,id:uid(),minutes:Number(v.minutes)}));form('#course-form',v=>data.courses.push({...v,id:uid(),total:Number(v.total),done:0,certificate:''}));form('#goal-form',v=>data.goal=Number(v.goal));
if(page==='rewards')bindRewards();
document.querySelectorAll('[data-course]').forEach(f=>f.onsubmit=e=>{e.preventDefault();const c=data.courses.find(c=>c.id===f.dataset.course),v=Object.fromEntries(new FormData(f));c.done=Number(v.done);c.certificate=v.certificate;save();render();});
if(page==='history'){const filter=()=>{const filtered=data.sessions.filter(s=>(!$('#filter-target').value||s.target===$('#filter-target').value)&&(!$('#filter-activity').value||s.activity===$('#filter-activity').value)&&s.topic.toLowerCase().includes($('#filter-topic').value.toLowerCase()));$('#history-list').innerHTML=entries(filtered);$('#history-exam-progress').innerHTML=examProgress(filtered);bind('history');};['#filter-target','#filter-activity','#filter-topic'].forEach(s=>$(s).oninput=filter);}
if(page==='focus'){$('#timer-toggle').onclick=()=>{if(timer.running){timer.elapsed=elapsed();timer.running=false;}else{timer.start=Date.now();timer.running=true;}render();};$('#timer-reset').onclick=()=>{if(confirm('Reset timer?')){timer={running:false,start:0,elapsed:0};render();}};$('#timer-save').onclick=()=>{const mins=Math.floor(elapsed()/60000);if(mins<1)return toast('Study for at least one minute before logging.');if(timer.running){timer.elapsed=elapsed();timer.running=false;}openLog(Math.min(1440,mins));render();};}}
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='stride-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw Error('Too large');const incoming=migrateBackup(validate(JSON.parse(await file.text())));if(confirm('Replace the records in your signed-in account with this backup? Export your account first if you want to keep its existing records.')){data=incoming;save();render();toast('Backup restored.');}}catch{toast('This file is not a valid Stride backup.');}e.target.value='';};
$('#sync-retry').onclick=account.flush;$('#storage').textContent='Saved to your account';addEventListener('hashchange',render);addEventListener('beforeunload',e=>{if(elapsed()>0){e.preventDefault();e.returnValue='';}});render();


})().catch(()=>{document.getElementById('auth-root').hidden=false;document.getElementById('tracker-shell').hidden=true;document.getElementById('auth-root').textContent='Could not open your study space. Please refresh. Your online records have not been changed.';});
