/* Content layer: subjects, reviewers and exams (Supabase tables, or in memory in demo mode),
   the searchable dropdown, and the archive / exams / reviewer / dashboard views. */
const isStaff=()=>!!me&&['moderator','admin'].includes(me.role);
const isAdmin=()=>!!me&&me.role==='admin';
const live=()=>typeof sb!=='undefined'&&!!sb;
const MAXMB=50,fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const svg=p=>'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICON_CH=svg('<path d="m6 9 6 6 6-6"/>');
const ICON_TRASH=svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>');

/* ---------- loading ---------- */
const toR=x=>({id:x.id,title:x.title,subject:x.subject,year:x.year_level,section:x.section||'',sem:x.sem,exam:x.exam,type:x.file_type,size:x.file_size||'',by:x.uploaded_by||'',date:(x.created_at||'').slice(0,10),topics:x.topics||[],dl:x.downloads||0});
const toE=x=>({id:x.id,title:x.title,subject:x.subject,diff:x.diff,mins:x.mins,pass:x.pass,q:x.questions||[]});
async function loadContent(){
  if(!live())return;
  const [s,r,e]=await Promise.all([
    sb.from('subjects').select('name').order('name'),
    sb.from('reviewers').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}),
    sb.from('exams').select('*').order('id')]);
  const err=s.error||r.error||e.error;
  if(err){console.warn('Content tables not found. Run content.sql in Supabase.',err);return}
  SUBJ.length=0;s.data.forEach(x=>SUBJ.push(x.name));
  R.length=0;r.data.forEach(x=>R.push(toR(x)));
  E.length=0;e.data.forEach(x=>E.push(toE(x)));
  sideSubs();
}

/* ---------- data operations (database when live, memory in demo) ---------- */
const nextId=a=>a.reduce((m,x)=>Math.max(m,x.id),0)+1;
const dberr=e=>{console.error(e);const m=e.message||String(e);
  return /duplicate|unique/i.test(m)?'That already exists.':/foreign key|violates/i.test(m)?'Still in use. Remove its reviewers and exams first.':/row-level|polic|permission/i.test(m)?'Not allowed for your role.':/relation .* does not exist/i.test(m)?'Run content.sql in Supabase first.':m};

async function addSubject(name){
  name=String(name||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Enter a subject name.');return false}
  if(SUBJ.some(s=>s.toLowerCase()==name.toLowerCase())){toast('That subject already exists.');return false}
  if(live()){const {error}=await sb.from('subjects').insert({name});if(error){toast(dberr(error));return false}}
  SUBJ.push(name);SUBJ.sort();sideSubs();return true;
}
async function delSubject(name){
  if(R.some(r=>r.subject==name)||E.some(e=>e.subject==name)){toast('Still in use. Delete its reviewers and exams first.');return false}
  if(live()){const {data,error}=await sb.from('subjects').delete().eq('name',name).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only admins can delete subjects.');return false}}
  SUBJ.splice(SUBJ.indexOf(name),1);sideSubs();return true;
}
async function addReviewer(o,f){
  const ext=f.name.split('.').pop().toLowerCase(),type=ext.toUpperCase(),size=fmtSize(f.size);
  if(!live()){R.unshift({id:nextId(R),title:o.title,subject:o.subject,year:o.year,section:o.section,sem:o.sem,exam:o.exam,type,size,by:o.by,date:new Date().toISOString().slice(0,10),topics:o.topics,dl:0});sideSubs();return true}
  const {data,error}=await sb.from('reviewers').insert({title:o.title,subject:o.subject,year_level:o.year,section:o.section||null,sem:o.sem,exam:o.exam,file_type:type,file_size:size,uploaded_by:o.by,topics:o.topics}).select().single();
  if(error){toast(dberr(error));return false}
  const up=await sb.storage.from(BUCKET).upload(data.id+'.'+ext,f,{upsert:true,contentType:f.type||undefined});
  if(up.error){await sb.from('reviewers').delete().eq('id',data.id);toast('Upload failed: '+up.error.message);return false}
  R.unshift(toR(data));sideSubs();return true;
}
async function delReviewer(id){
  const i=R.findIndex(x=>x.id==id);if(i<0)return false;const r=R[i];
  if(live()){const {data,error}=await sb.from('reviewers').delete().eq('id',id).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only admins can delete.');return false}
    await sb.storage.from(BUCKET).remove([filePath(r)]);}
  R.splice(i,1);bm.delete(r.id);sideSubs();return true;
}
async function addExam(o){
  if(!live()){E.push({id:nextId(E),...o});return true}
  const {data,error}=await sb.from('exams').insert({title:o.title,subject:o.subject,diff:o.diff,mins:o.mins,pass:o.pass,questions:o.q}).select().single();
  if(error){toast(dberr(error));return false}
  E.push(toE(data));return true;
}
async function delExam(id){
  const i=E.findIndex(x=>x.id==id);if(i<0)return false;
  if(live()){const {data,error}=await sb.from('exams').delete().eq('id',id).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only admins can delete.');return false}}
  E.splice(i,1);return true;
}

/* ---------- sidebar subjects ---------- */
function sideSubs(){
  const box=document.getElementById('sidesubs');if(!box)return;
  const top=SUBJ.map(s=>[s,R.filter(r=>r.subject==s).length]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6);
  box.innerHTML=top.length?top.map(t=>`<a href="#" title="${esc(t[0])}" data-s="${esc(t[0])}" onclick="goSub(this.dataset.s);return false">${esc(t[0])}</a>`).join('')+(SUBJ.length>6?'<a href="#archive">All subjects</a>':''):'<span class="sm mt" style="display:block;padding:0 12px">No subjects yet</span>';
}
sideSubs();

/* ---------- searchable dropdown ---------- */
const sddHTML=(id,ph)=>`<div class="sdd" id="${id}" data-ph="${esc(ph)}"><button type="button" class="sdd-b" aria-haspopup="listbox" aria-expanded="false"><span class="sdd-t"></span>${ICON_CH}</button><div class="sdd-p" hidden><input class="sdd-s" type="text" placeholder="Search subjects" autocomplete="off" aria-label="Search subjects"><div class="sdd-l" role="listbox"></div></div></div>`;
function closeSdd(){document.querySelectorAll('.sdd.open').forEach(e=>e._sdd&&e._sdd.close())}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.sdd'))closeSdd()});
function sddInit(id,cfg){
  const el=document.getElementById(id);if(!el)return;
  const b=el.querySelector('.sdd-b'),p=el.querySelector('.sdd-p'),s=el.querySelector('.sdd-s'),l=el.querySelector('.sdd-l'),t=el.querySelector('.sdd-t');
  let val=cfg.value||'',hi=0,items=[];
  const label=()=>{t.textContent=val||cfg.all||el.dataset.ph;t.classList.toggle('ph',!val&&!cfg.all)};
  const draw=()=>{const q=s.value.trim().toLowerCase();items=[];
    if(cfg.all&&!q)items.push(['',cfg.all]);
    cfg.options().filter(o=>!q||o.toLowerCase().includes(q)).forEach(o=>items.push([o,o]));
    hi=Math.min(hi,Math.max(0,items.length-1));
    l.innerHTML=items.length?items.map((it,k)=>`<div class="sdd-i ${k==hi?'hi':''} ${it[0]==val?'sel':''}" role="option" data-k="${k}">${esc(it[1])}</div>`).join(''):'<div class="sdd-e">No subject found</div>'};
  const hl=()=>{const h=l.querySelector('.hi');if(h&&h.scrollIntoView)h.scrollIntoView({block:'nearest'})};
  const close=()=>{p.hidden=true;b.setAttribute('aria-expanded','false');el.classList.remove('open')};
  const open=()=>{closeSdd();p.hidden=false;b.setAttribute('aria-expanded','true');el.classList.add('open');s.value='';hi=0;draw();s.focus()};
  const pick=k=>{const it=items[k];if(!it)return;val=it[0];label();close();cfg.onChange&&cfg.onChange(val)};
  b.onclick=()=>p.hidden?open():close();
  b.onkeydown=e=>{if(e.key=='ArrowDown'&&p.hidden){e.preventDefault();open()}};
  s.oninput=()=>{hi=0;draw()};
  l.onmousedown=e=>{const i=e.target.closest('.sdd-i');if(i){e.preventDefault();pick(+i.dataset.k)}};
  s.onkeydown=e=>{
    if(e.key=='ArrowDown'){hi=Math.min(items.length-1,hi+1);draw();hl();e.preventDefault()}
    else if(e.key=='ArrowUp'){hi=Math.max(0,hi-1);draw();hl();e.preventDefault()}
    else if(e.key=='Enter'){pick(hi);e.preventDefault()}
    else if(e.key=='Escape'){close();b.focus();e.stopPropagation()}};
  el._sdd={get:()=>val,set:v=>{val=v||'';label()},close};
  label();
}
const sddGet=id=>{const e=document.getElementById(id);return e&&e._sdd?e._sdd.get():''};

/* ---------- reviewer card ---------- */
window.rc=function(r){
  if(!r)return '';
  const meta=[yr(r.year),r.section,'Sem '+r.sem].filter(Boolean).map(esc).join(' · ');
  return `<div class="card x-${r.exam.replace(/\W/g,'')}"><div class="ct"><h3><a href="#r/${r.id}">${esc(r.title)}</a></h3><div class="ca"><button class="bm ${bm.has(r.id)?'on':''}" aria-label="Bookmark" onclick="toggleBm(${r.id})">★</button>${isAdmin()?`<button class="bm del" aria-label="Delete reviewer" title="Delete reviewer" onclick="admDelReviewer(${r.id})">${ICON_TRASH}</button>`:''}</div></div>
<div class="mt sm">${esc(r.subject)}</div><div class="mt sm">${meta}</div>
<div style="margin:8px 0"><span class="tag">${esc(r.exam)}</span><span class="tag">${esc(r.type)}${r.size?' · '+esc(r.size):''}</span></div>
<div class="mt sm">${r.by?esc(r.by)+' · ':''}${esc(r.date)}</div><div class="row" style="margin:10px 0 0"><a class="btn g" href="#r/${r.id}">Preview</a><button class="btn" onclick="dl(${r.id})">Download</button></div></div>`;
};

/* ---------- archive ---------- */
let AF={q:'',sub:'',exam:'',yr:'',sem:'',sec:'',sort:'new'};
const selHTML=(id,label,vals,cur)=>`<select id="${id}" aria-label="${label}"><option value="">${label}</option>${vals.map(v=>`<option value="${esc(v)}" ${v==cur?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
V.archive=()=>{
  if(pend){AF.sub=pend;pend=null}
  if(pq){AF.q=pq;pq=''}
  if(pendX){AF.exam=pendX=='All'?'':pendX;pendX=null}
  if(pmine&&me){AF.yr=yr(me.year||me.year_level||1);pmine=false}
  const secs=[...new Set(R.map(r=>r.section).filter(Boolean))].sort();
  app.innerHTML=`<div class="ah"><h2 style="margin:0">Subject Archive</h2><span class="mt sm" id="cnt"></span></div>
<div class="tb"><input id="q" placeholder="Search titles, subjects, topics…" value="${esc(AF.q)}" aria-label="Search the archive">${sddHTML('sdd_sub','All subjects')}</div>
<div class="chips">${['All','Prelim','Midterm','Semi-Final','Final'].map(x=>`<button class="chip ${(AF.exam||'All')==x?'on':''}" onclick="archExam('${x}')">${x}</button>`).join('')}</div>
<div class="filters">${selHTML('f_year','Year level',[1,2,3,4].map(n=>yr(n)),AF.yr)}${selHTML('f_sem','Semester',['Sem 1','Sem 2'],AF.sem)}${secs.length?selHTML('f_sec','Section',secs,AF.sec):''}<select id="f_srt" aria-label="Sort"><option value="new">Newest</option><option value="dl">Most downloaded</option><option value="az">A to Z</option></select><button class="chip" style="justify-self:start" onclick="archClear()">Clear filters</button></div>
<div id="res" class="grid"></div>`;
  $('#f_srt').value=AF.sort;
  $('#q').oninput=e=>{AF.q=e.target.value;archRun()};
  [['f_year','yr'],['f_sem','sem'],['f_sec','sec'],['f_srt','sort']].forEach(p=>{const el=$('#'+p[0]);if(el)el.onchange=e=>{AF[p[1]]=e.target.value;archRun()}});
  sddInit('sdd_sub',{options:()=>SUBJ,value:AF.sub,all:'All subjects',onChange:v=>{AF.sub=v;archRun()}});
  archRun();
};
function archRun(){
  const q=AF.q.toLowerCase().trim();
  const L=R.filter(r=>(!AF.sub||r.subject==AF.sub)&&(!AF.exam||r.exam==AF.exam)&&(!AF.yr||yr(r.year)==AF.yr)&&(!AF.sem||'Sem '+r.sem==AF.sem)&&(!AF.sec||r.section==AF.sec)&&(!q||(r.title+' '+r.subject+' '+r.section+' '+r.topics.join(' ')).toLowerCase().includes(q)));
  L.sort((a,b)=>AF.sort=='dl'?b.dl-a.dl:AF.sort=='az'?a.title.localeCompare(b.title):(b.date||'').localeCompare(a.date||'')||b.id-a.id);
  const c=$('#cnt'),res=$('#res');if(!c||!res)return;
  c.textContent=L.length+' of '+R.length+' reviewers';
  res.innerHTML=L.length?L.map(rc).join(''):`<div class="card mt" style="grid-column:1/-1;text-align:center">${R.length?'No reviewers match these filters. Try clearing one.':'No reviewers yet.'}${isStaff()?' <button class="btn" style="margin-left:8px" onclick="openReviewerForm()">Upload reviewer</button>':''}</div>`;
}
function archExam(x){AF.exam=x=='All'?'':x;document.querySelectorAll('.chips .chip').forEach(c=>c.classList.toggle('on',c.textContent==x));archRun()}
function archClear(){AF={q:'',sub:'',exam:'',yr:'',sem:'',sec:'',sort:'new'};V.archive()}

/* ---------- reviewer page ---------- */
V.r=function(id){
  const r=R.find(x=>x.id==id);if(!r)return location.hash='#archive';
  if(user&&!hist.includes(r.id))hist.unshift(r.id);
  const rel=R.filter(x=>x.id!=r.id&&x.subject==r.subject).slice(0,3),ex=E.find(e=>e.subject==r.subject);
  app.innerHTML=`<a class="mt" href="#archive">← Archive</a><h2>${esc(r.title)}</h2><div class="mt">${[esc(r.subject),yr(r.year),r.section?esc(r.section):'',esc(r.exam)].filter(Boolean).join(' · ')}</div>
<div class="row"><button class="btn" onclick="dl(${r.id})">Download</button><button class="btn g" onclick="toggleBm(${r.id})">${bm.has(r.id)?'★ Bookmarked':'☆ Bookmark'}</button>${ex?`<a class="btn g" href="#exam/${ex.id}">Take mock exam</a>`:''}${isAdmin()?`<button class="btn g del" onclick="admDelReviewer(${r.id})">Delete</button>`:''}</div>
<div class="prev">Document preview area<br>Needs Supabase Storage plus a PDF viewer. Not connected in this demo.</div>
${r.topics.length?`<h2>Topics covered</h2>${r.topics.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}`:''}<p class="mt sm">${r.by?'Uploaded by '+esc(r.by)+' on ':'Uploaded on '}${esc(r.date)} · ${esc(r.type)}${r.size?' · '+esc(r.size):''}</p>
${rel.length?`<h2>You may also need</h2><div class="grid">${rel.map(rc).join('')}</div>`:''}`;
};

/* ---------- mock exams list ---------- */
V.exams=()=>{
  app.innerHTML=`<div class="ah"><h2 style="margin:0">Mock Exams</h2>${isStaff()?'<button class="btn" onclick="openExamForm()">Create exam</button>':''}</div><div class="grid" style="margin-top:16px">${E.length?E.map(e=>`<div class="card"><div class="ct"><h3>${esc(e.title)}</h3>${isAdmin()?`<button class="bm del" aria-label="Delete exam" title="Delete exam" onclick="admDelExam(${e.id})">${ICON_TRASH}</button>`:''}</div><div class="mt sm">${esc(e.subject)}</div><div class="mt sm">${e.q.length} questions · ${e.mins} min · Passing ${e.pass}%</div><div style="margin:8px 0"><span class="tag">${esc(e.diff)}</span></div><a class="btn" href="#exam/${e.id}">Start</a></div>`).join(''):'<div class="card mt">No mock exams yet.</div>'}</div>`;
};

/* ---------- dashboard ---------- */
V.dash=()=>{
  if(!user)return location.hash='#login';
  const ex=hist.filter(h=>h&&h.pct!=null),avg=ex.length?Math.round(ex.reduce((s,h)=>s+h.pct,0)/ex.length):0;
  const seen=hist.filter(h=>typeof h=='number').map(i=>R.find(r=>r.id==i)).filter(Boolean).slice(0,3);
  const saved=[...bm].map(i=>R.find(r=>r.id==i)).filter(Boolean);
  const subs=SUBJ.map(s=>[s,R.filter(r=>r.subject==s).length]).filter(s=>s[1]).sort((a,b)=>b[1]-a[1]).slice(0,6),mx=Math.max(1,...subs.map(s=>s[1]));
  const T=['Prelim','Midterm','Semi-Final','Final'].map(t=>[t,R.filter(r=>r.exam==t).length]),tm=Math.max(1,...T.map(x=>x[1]));
  const newest=[...R].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id).slice(0,5);
  const d=new Date(),hr=d.getHours(),gr=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const tile=(i,n,l)=>`<div class="card tile"><i>${i}</i><div><div class="stat">${n}</div><div class="mt sm">${l}</div></div></div>`;
  app.innerHTML=`<section class="card dh"><div><div class="mt sm">${d.toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}</div>
<h1 class="greet2">${gr}, <span>${esc(me.code_name||user)}</span></h1><p class="mt" style="max-width:440px;margin:0">${ex.length?'Keep the streak going. Pick a subject or take another mock exam.':'Pick a subject to review, or test yourself with a mock exam.'}</p>
<div class="row"><a class="btn" href="#archive">Browse archive</a><a class="btn g" href="#exams">Take a mock exam</a>${isStaff()?'<button class="btn g" onclick="fabToggle()">+ Add content</button>':''}</div></div>
<div class="dring"><div class="ring" style="--p:${avg}"><span>${avg}%</span></div><div class="mt sm" style="margin-top:10px">Average score · ${ex.length} exam${ex.length==1?'':'s'}</div></div></section>
<div class="tiles">${tile('▤',R.length,'Reviewers')}${tile('◈',SUBJ.length,'Subjects')}${tile('✎',E.length,'Mock exams')}${tile('↓',R.reduce((s,r)=>s+r.dl,0),'Downloads')}</div>
<div class="dg"><div class="card"><div class="ch">Reviewers by subject<a href="#archive">Browse</a></div>${subs.length?subs.map(s=>`<button class="sb" data-s="${esc(s[0])}" onclick="goSub(this.dataset.s)"><span class="sbn">${esc(s[0])}</span><span class="bar"><i style="width:${Math.max(8,s[1]/mx*100)}%"></i></span><b>${s[1]}</b></button>`).join(''):'<p class="mt">No reviewers yet.</p>'}</div>
<div class="card"><div class="ch">Recently added<a href="#archive">View all</a></div>${newest.length?newest.map(r=>`<div class="li"><div class="grow"><a href="#r/${r.id}"><b class="tr">${esc(r.title)}</b></a><div class="mt sm tr">${esc(r.subject)} · ${esc(r.exam)}</div></div><button class="btn g sbtn" onclick="dl(${r.id})" aria-label="Download ${esc(r.title)}">↓</button></div>`).join(''):'<p class="mt">Nothing uploaded yet.</p>'}</div></div>
<div class="dg eq"><div class="card"><div class="ch">By exam type</div><div class="hb">${T.map(t=>`<div class="col" role="button" tabindex="0" title="${t[1]} reviewer${t[1]==1?'':'s'}: open ${t[0]}" onclick="goExam('${t[0]}')"><div class="bw"><div class="b ${t[1]==tm?'solid':''}" style="height:${Math.max(12,t[1]/tm*100)}%"></div></div><span>${t[0]}</span></div>`).join('')}</div></div>
<div class="card"><div class="ch">Mock exams<a href="#exams">View all</a></div>${E.length?E.slice(0,3).map(e=>`<div class="li"><div class="grow"><b class="tr">${esc(e.title)}</b><div class="mt sm tr">${esc(e.subject)} · ${e.q.length} questions · ${e.mins} min</div></div><a class="btn g sbtn" href="#exam/${e.id}">Start</a></div>`).join(''):'<p class="mt">No mock exams yet.</p>'}</div></div>
<h2>Bookmarked</h2><div class="grid">${saved.length?saved.map(rc).join(''):'<div class="card mt">Nothing saved yet. Star a reviewer in the archive.</div>'}</div>
<h2>Recently viewed</h2><div class="grid">${seen.length?seen.map(rc).join(''):'<div class="card mt">Open a reviewer and it will show up here.</div>'}</div>
<h2>Exam history</h2>${ex.length?ex.map(h=>`<div class="card" style="margin-bottom:8px">${esc(h.title)} · ${h.pct}% · ${h.pass?'Passed':'Failed'}</div>`).join(''):'<div class="card mt">No attempts yet.</div>'}`;
};
