/* Content layer: subjects, reviewers and exams (Supabase tables, or in memory in demo mode),
   the searchable dropdown, and the archive / exams / reviewer / dashboard views. */
const isStaff=()=>!!me&&['moderator','admin'].includes(me.role);
const isAdmin=()=>!!me&&me.role==='admin';
const live=()=>typeof sb!=='undefined'&&!!sb;
const MAXMB=50,fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const svg=p=>'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const ICON_CH=svg('<path d="m6 9 6 6 6-6"/>');
const ICON_TRASH=svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>');

const ICON_EDIT=svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');

/* ---------- schools (every school has its own separate data) ---------- */
let SCHOOLS=[{id:1,name:'City College of Angeles'}],SCH=1,HAS_SCH=false;
const isSuper=()=>!!me&&me.role==='admin'&&!me.school_id;
const activeSchool=()=>me&&me.school_id?me.school_id:SCH;
const schoolName=()=>{const x=SCHOOLS.find(s=>s.id==activeSchool());return x?x.name:''};
const sc=()=>HAS_SCH?{school_id:SCH}:{};                    // add to inserts
const scope=q=>HAS_SCH?q.eq('school_id',SCH):q;              // limit deletes/updates to the active school

/* ---------- courses (each course has its own subjects per year level) ---------- */
const COURSES=[...new Set([...R.map(r=>r.course).filter(Boolean),'BS Computer Engineering'])].sort();
const CS=[];R.forEach(r=>{if(r.course&&!CS.some(x=>x.course==r.course&&x.subject==r.subject))CS.push({course:r.course,subject:r.subject,year:r.year})});
const courseOK=c=>!!c&&COURSES.includes(c);
const landing=()=>me&&courseOK(me.course)?'course':'dash';
const yearOrder=y=>(a,b)=>(a==y?-1:a==0?9:a)-(b==y?-1:b==0?9:b);

/* ---------- loading ---------- */
const toR=x=>({id:x.id,title:x.title,subject:x.subject,year:x.year_level,section:x.section||'',sem:x.sem,exam:x.exam,type:x.file_type,size:x.file_size||'',by:x.uploaded_by||'',date:(x.created_at||'').slice(0,10),topics:x.topics||[],dl:x.downloads||0});
const toE=x=>({id:x.id,title:x.title,subject:x.subject,diff:x.diff,mins:x.mins,pass:x.pass,q:x.questions||[]});
async function loadContent(){
  if(!live())return;
  const sr=await sb.from('schools').select('id,name').order('name');
  HAS_SCH=!sr.error;
  if(HAS_SCH){
    SCHOOLS=sr.data||[];
    let saved=0;try{saved=+localStorage.getItem('mip_school')}catch(e){}
    SCH=me&&me.school_id?me.school_id:(SCHOOLS.some(x=>x.id==saved)?saved:(SCHOOLS[0]?SCHOOLS[0].id:null));
  }
  const q=(t,cols)=>{const x=sb.from(t).select(cols);return HAS_SCH&&SCH!=null?x.eq('school_id',SCH):x};
  if(HAS_SCH&&SCH==null){SUBJ.length=0;R.length=0;E.length=0;COURSES.length=0;CS.length=0;sideSubs();return}
  const [s,r,e,c,cs]=await Promise.all([
    q('subjects','name').order('name'),
    q('reviewers','*').order('created_at',{ascending:false}).order('id',{ascending:false}),
    q('exams','*').order('id'),
    q('courses','name').order('name'),
    q('course_subjects','course,subject,year_level')]);
  const err=s.error||r.error||e.error;
  if(err){console.warn('Content tables not found. Run content.sql in Supabase.',err);return}
  SUBJ.length=0;s.data.forEach(x=>SUBJ.push(x.name));
  R.length=0;r.data.forEach(x=>R.push(toR(x)));
  E.length=0;e.data.forEach(x=>E.push(toE(x)));
  if(!c.error&&!cs.error){COURSES.length=0;c.data.forEach(x=>COURSES.push(x.name));CS.length=0;cs.data.forEach(x=>CS.push({course:x.course,subject:x.subject,year:x.year_level}))}
  else console.warn('Courses not set up. Run courses_chat.sql in Supabase.',c.error||cs.error);
  sideSubs();
}

/* ---------- data operations (database when live, memory in demo) ---------- */
const nextId=a=>a.reduce((m,x)=>Math.max(m,x.id),0)+1;
const dberr=e=>{console.error(e);const m=e.message||String(e);
  return /duplicate|unique/i.test(m)?'That already exists.':/foreign key|violates/i.test(m)?'Still in use. Remove its reviewers and exams first.':/row-level|polic|permission|multiple \(or no\) rows/i.test(m)?'Not allowed for your role.':/relation .* does not exist/i.test(m)?'Run content.sql in Supabase first.':m};

async function addSubject(name){
  name=String(name||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Enter a subject name.');return false}
  if(SUBJ.some(s=>s.toLowerCase()==name.toLowerCase())){toast('That subject already exists.');return false}
  if(live()){const {error}=await sb.from('subjects').insert({name,...sc()});if(error){toast(dberr(error));return false}}
  SUBJ.push(name);SUBJ.sort();sideSubs();return true;
}
async function delSubject(name){
  if(R.some(r=>r.subject==name)||E.some(e=>e.subject==name)){toast('Still in use. Delete its reviewers and exams first.');return false}
  if(live()){const {data,error}=await scope(sb.from('subjects').delete()).eq('name',name).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only admins can delete subjects.');return false}}
  SUBJ.splice(SUBJ.indexOf(name),1);for(let i=CS.length-1;i>=0;i--)if(CS[i].subject==name)CS.splice(i,1);sideSubs();return true;
}
async function addReviewer(o,f){
  const ext=f.name.split('.').pop().toLowerCase(),type=ext.toUpperCase(),size=fmtSize(f.size);
  if(!live()){R.unshift({id:nextId(R),title:o.title,subject:o.subject,year:o.year,section:o.section,sem:o.sem,exam:o.exam,type,size,by:o.by,date:new Date().toISOString().slice(0,10),topics:o.topics,dl:0});sideSubs();return true}
  const {data,error}=await sb.from('reviewers').insert({...sc(),title:o.title,subject:o.subject,year_level:o.year,section:o.section||null,sem:o.sem,exam:o.exam,file_type:type,file_size:size,uploaded_by:o.by,topics:o.topics}).select().single();
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
  const {data,error}=await sb.from('exams').insert({...sc(),title:o.title,subject:o.subject,diff:o.diff,mins:o.mins,pass:o.pass,questions:o.q}).select().single();
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

/* schools */
async function addSchool(name){
  name=String(name||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Enter a school name.');return 0}
  if(SCHOOLS.some(x=>x.name.toLowerCase()==name.toLowerCase())){toast('That school already exists.');return 0}
  let row={id:nextId(SCHOOLS),name};
  if(live()){const {data,error}=await sb.from('schools').insert({name}).select().single();if(error){toast(dberr(error));return 0}row=data}
  SCHOOLS.push(row);SCHOOLS.sort((a,b)=>a.name.localeCompare(b.name));return row.id;
}
async function delSchool(id){
  if(SCHOOLS.length<2){toast('Keep at least one school.');return false}
  if(live()){const {data,error}=await sb.from('schools').delete().eq('id',id).select();
    if(error){toast(/foreign key|violates/i.test(error.message)?'This school still has students. Move or remove them first.':dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only platform admins can delete schools.');return false}}
  SCHOOLS.splice(SCHOOLS.findIndex(x=>x.id==id),1);
  if(SCH==id){SCH=SCHOOLS[0].id;try{localStorage.setItem('mip_school',String(SCH))}catch(e){}await loadContent()}
  return true;
}
async function switchSchool(id){
  SCH=+id;try{localStorage.setItem('mip_school',String(SCH))}catch(e){}
  await loadContent();AF={q:'',sub:'',exam:'',yr:'',sem:'',sec:'',sort:'new'};CH.room='';route();
}
function schoolSelect(id){return `<select id="${id}" aria-label="Active school" style="width:auto;min-width:200px" onchange="switchSchool(this.value)">${SCHOOLS.map(x=>`<option value="${x.id}" ${x.id==SCH?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`}
async function fillSchools(){
  const el=document.getElementById('sch'),w=document.getElementById('schw');if(!el)return;
  let list=SCHOOLS;
  if(live()){const {data,error}=await sb.from('schools').select('id,name').order('name');
    if(error||!data||!data.length){if(w)w.hidden=true;return}list=data}
  el.innerHTML='<option value="">Choose your school</option>'+list.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
}
const _vlogin=V.login;V.login=t=>{_vlogin(t);if(t=='register')fillSchools()};

/* edit reviewers and exams */
async function updateReviewer(id,o,f){
  const r=R.find(x=>x.id==id);if(!r)return false;
  let type=r.type,size=r.size;
  if(f){const ext=f.name.split('.').pop().toLowerCase();type=ext.toUpperCase();size=fmtSize(f.size)}
  if(!live()){Object.assign(r,{title:o.title,subject:o.subject,year:o.year,section:o.section,sem:o.sem,exam:o.exam,topics:o.topics,type,size});sideSubs();return true}
  if(f){const old=filePath(r),ext=f.name.split('.').pop().toLowerCase(),np=id+'.'+ext;
    const up=await sb.storage.from(BUCKET).upload(np,f,{upsert:true,contentType:f.type||undefined});
    if(up.error){toast('Upload failed: '+up.error.message);return false}
    if(old!==np)await sb.storage.from(BUCKET).remove([old])}
  const {data,error}=await sb.from('reviewers').update({title:o.title,subject:o.subject,year_level:o.year,section:o.section||null,sem:o.sem,exam:o.exam,topics:o.topics,file_type:type,file_size:size}).eq('id',id).select().single();
  if(error){toast(dberr(error));return false}
  Object.assign(r,toR(data));sideSubs();return true;
}
async function updateExam(id,o){
  const e=E.find(x=>x.id==id);if(!e)return false;
  if(!live()){Object.assign(e,{title:o.title,subject:o.subject,diff:o.diff,mins:o.mins,pass:o.pass,q:o.q});return true}
  const {data,error}=await sb.from('exams').update({title:o.title,subject:o.subject,diff:o.diff,mins:o.mins,pass:o.pass,questions:o.q}).eq('id',id).select().single();
  if(error){toast(dberr(error));return false}
  Object.assign(e,toE(data));return true;
}

/* courses */
async function addCourse(name,subs){
  name=String(name||'').trim().replace(/\s+/g,' ');
  if(name.length<2){toast('Enter a course name.');return false}
  if(COURSES.some(c=>c.toLowerCase()==name.toLowerCase())){toast('That course already exists.');return false}
  subs=subs||[];
  if(live()){
    const {error}=await sb.from('courses').insert({name,...sc()});if(error){toast(dberr(error));return false}
    if(subs.length){const r=await sb.from('course_subjects').insert(subs.map(x=>({...sc(),course:name,subject:x.subject,year_level:x.year})));if(r.error){toast('Course added, but its subjects failed: '+dberr(r.error));subs=[]}}}
  COURSES.push(name);COURSES.sort();subs.forEach(x=>CS.push({course:name,subject:x.subject,year:x.year}));return true;
}
async function delCourse(name){
  if(live()){const {data,error}=await scope(sb.from('courses').delete()).eq('name',name).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed. Only admins can delete courses.');return false}}
  COURSES.splice(COURSES.indexOf(name),1);for(let i=CS.length-1;i>=0;i--)if(CS[i].course==name)CS.splice(i,1);
  if(me&&me.course==name)me.course=null;sideSubs();return true;
}
async function setCS(course,subject,year){
  if(live()){const {error}=await sb.from('course_subjects').upsert({...sc(),course,subject,year_level:year},{onConflict:HAS_SCH?'school_id,course,subject':'course,subject'});if(error){toast(dberr(error));return false}}
  const x=CS.find(c=>c.course==course&&c.subject==subject);x?x.year=year:CS.push({course,subject,year});sideSubs();return true;
}
async function delCS(course,subject){
  if(live()){const {data,error}=await scope(sb.from('course_subjects').delete()).eq('course',course).eq('subject',subject).select();
    if(error){toast(dberr(error));return false}
    if(!data||!data.length){toast('Not allowed for your role.');return false}}
  const i=CS.findIndex(c=>c.course==course&&c.subject==subject);if(i>=0)CS.splice(i,1);sideSubs();return true;
}
async function saveStudy(o){
  const course=o.course||null,section=o.section||null;
  if(live()&&me&&me.id){const {error}=await sb.from('profiles').update({course,year_level:o.year,section}).eq('id',me.id);if(error){toast(dberr(error));return false}}
  Object.assign(me,{course,year:o.year,year_level:o.year,section});sideSubs();return true;
}
window.obSave=async function(){
  const course=$('#oc').value,y=+$('#oy').value,sec=($('#os').value||'').trim().toUpperCase();
  if(!/^[A-Z0-9 \-]{0,20}$/.test(sec))return fe('e_os','Use letters, numbers, spaces or dashes only.');
  if(await saveStudy({course,year:y,section:sec})){obi=2;V.welcome()}
};

/* ---------- sidebar subjects ---------- */
function sideSubs(){
  const box=document.getElementById('sidesubs');if(!box)return;
  const c=me&&courseOK(me.course)?me.course:'',y=me?me.year||me.year_level||1:1;
  let list=c?CS.filter(x=>x.course==c).sort((a,b)=>yearOrder(y)(a.year,b.year)||a.subject.localeCompare(b.subject)).map(x=>x.subject):[];
  if(!list.length)list=SUBJ.map(s=>[s,R.filter(r=>r.subject==s).length]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(t=>t[0]);
  const top=list.slice(0,6);
  box.innerHTML=top.length?top.map(t=>`<a href="#" title="${esc(t)}" data-s="${esc(t)}" onclick="goSub(this.dataset.s);return false">${esc(t)}</a>`).join('')+(list.length>6?'<a href="#archive">All subjects</a>':''):'<span class="sm mt" style="display:block;padding:0 12px">No subjects yet</span>';
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
  return `<div class="card x-${r.exam.replace(/\W/g,'')}"><div class="ct"><h3><a href="#r/${r.id}">${esc(r.title)}</a></h3><div class="ca"><button class="bm ${bm.has(r.id)?'on':''}" aria-label="Bookmark" onclick="toggleBm(${r.id})">★</button>${isStaff()?`<button class="bm ed" aria-label="Edit reviewer" title="Edit reviewer" onclick="openReviewerForm(${r.id})">${ICON_EDIT}</button>`:''}${isAdmin()?`<button class="bm del" aria-label="Delete reviewer" title="Delete reviewer" onclick="admDelReviewer(${r.id})">${ICON_TRASH}</button>`:''}</div></div>
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
<div class="row"><button class="btn" onclick="dl(${r.id})">Download</button><button class="btn g" onclick="toggleBm(${r.id})">${bm.has(r.id)?'★ Bookmarked':'☆ Bookmark'}</button>${ex?`<a class="btn g" href="#exam/${ex.id}">Take mock exam</a>`:''}${isStaff()?`<button class="btn g" onclick="openReviewerForm(${r.id})">Edit</button>`:''}${isAdmin()?`<button class="btn g del" onclick="admDelReviewer(${r.id})">Delete</button>`:''}</div>
<div class="prev">Document preview area<br>Needs Supabase Storage plus a PDF viewer. Not connected in this demo.</div>
${r.topics.length?`<h2>Topics covered</h2>${r.topics.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}`:''}<p class="mt sm">${r.by?'Uploaded by '+esc(r.by)+' on ':'Uploaded on '}${esc(r.date)} · ${esc(r.type)}${r.size?' · '+esc(r.size):''}</p>
${rel.length?`<h2>You may also need</h2><div class="grid">${rel.map(rc).join('')}</div>`:''}`;
};

/* ---------- mock exams list ---------- */
V.exams=()=>{
  app.innerHTML=`<div class="ah"><h2 style="margin:0">Mock Exams</h2>${isStaff()?'<button class="btn" onclick="openExamForm()">Create exam</button>':''}</div><div class="grid" style="margin-top:16px">${E.length?E.map(e=>`<div class="card"><div class="ct"><h3>${esc(e.title)}</h3><div class="ca">${isStaff()?`<button class="bm ed" aria-label="Edit exam" title="Edit exam" onclick="openExamForm(${e.id})">${ICON_EDIT}</button>`:''}${isAdmin()?`<button class="bm del" aria-label="Delete exam" title="Delete exam" onclick="admDelExam(${e.id})">${ICON_TRASH}</button>`:''}</div></div><div class="mt sm">${esc(e.subject)}</div><div class="mt sm">${e.q.length} questions · ${e.mins} min · Passing ${e.pass}%</div><div style="margin:8px 0"><span class="tag">${esc(e.diff)}</span></div><a class="btn" href="#exam/${e.id}">Start</a></div>`).join(''):'<div class="card mt">No mock exams yet.</div>'}</div>`;
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
  app.innerHTML=`${me&&!courseOK(me.course)?'<div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="grow"><b>Choose your course</b><div class="mt sm">Pick your course and year to see your own subjects and chat room.</div></div><a class="btn" href="#settings">Open settings</a></div>':''}<section class="card dh"><div><div class="mt sm">${d.toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}${schoolName()?' · '+esc(schoolName()):''}</div>
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


/* ---------- my course page ---------- */
V.course=()=>{
  if(!me)return location.hash='#login';
  const c=courseOK(me.course)?me.course:'';
  if(!c){app.innerHTML=`<div class="card" style="max-width:560px;margin:40px auto;text-align:center"><div class="big" style="font-size:44px">◈</div><h2>Choose your course</h2><p class="mt">Pick your course and year in Settings. Then you land here, with the subjects, reviewers and chat room for your course.</p><div class="row" style="justify-content:center"><a class="btn" href="#settings">Open settings</a></div></div>`;return}
  const y=me.year||me.year_level||1,rows=CS.filter(x=>x.course==c);
  const sub=new Set(rows.map(x=>x.subject)),nr=R.filter(r=>sub.has(r.subject)).length,ne=E.filter(e=>sub.has(e.subject)).length;
  const card=s=>{const a=R.filter(r=>r.subject==s).length,b=E.filter(e=>e.subject==s),ex=b[0];
    return `<div class="card subc"><h3>${esc(s)}</h3><div class="mt sm">${a} reviewer${a==1?'':'s'} · ${b.length} mock exam${b.length==1?'':'s'}</div><div class="row" style="margin:10px 0 0"><button class="btn" data-s="${esc(s)}" onclick="goSub(this.dataset.s)">Reviewers</button>${ex?`<a class="btn g" href="#exam/${ex.id}">Mock exam</a>`:''}</div></div>`};
  const years=[...new Set(rows.map(x=>x.year))].sort(yearOrder(y));
  app.innerHTML=`<section class="card ch2"><div><div class="mt sm">My course${schoolName()?' · '+esc(schoolName()):''}</div><h1 class="greet2" style="font-size:clamp(24px,3.4vw,38px)">${esc(c)}</h1>
<div class="row" style="margin:6px 0 0"><span class="tag">${yr(y)}</span>${me.section?`<span class="tag">${esc(me.section)}</span>`:''}<a class="chip" href="#settings">Change</a><button class="chip" data-c="${esc(c)}" onclick="CH.room=this.dataset.c;location.hash='#chat'">Course chat</button></div></div>
<div class="cst"><div><b class="stat">${rows.length}</b><span>Subjects</span></div><div><b class="stat">${nr}</b><span>Reviewers</span></div><div><b class="stat">${ne}</b><span>Mock exams</span></div></div></section>
${years.length?years.map(g=>{const items=rows.filter(x=>x.year==g).map(x=>x.subject).sort();
return `<div class="gh"><h2>${g?yr(g):'All years'}</h2>${g==y?'<span class="tag">Your year</span>':''}<span class="mt sm">${items.length} subject${items.length==1?'':'s'}</span></div><div class="grid">${items.map(card).join('')}</div>`}).join(''):`<div class="card mt" style="margin-top:16px">No subjects are assigned to this course yet.${isStaff()?' <button class="btn" style="margin-left:8px" onclick="admTab=\'courses\';location.hash=\'#admin\'">Assign subjects</button>':''}</div>`}`;
};

/* ---------- settings ---------- */
V.settings=()=>{
  if(!me)return location.hash='#login';
  const y=me.year||me.year_level||1;
  app.innerHTML=`<h2 style="margin-top:0">Settings</h2>
<div class="card" style="max-width:600px"><h3>Study details</h3><p class="mt sm">Your course decides the subjects, reviewers and chat room you see.</p>
<label class="fl sm mt" for="st_c">Course</label><select id="st_c"><option value="">Choose your course</option>${COURSES.map(c=>`<option value="${esc(c)}" ${c==me.course?'selected':''}>${esc(c)}</option>`).join('')}</select><div class="err" id="e_st_c"></div>
<div class="f2"><div><label class="fl sm mt" for="st_y">Year level</label><select id="st_y">${[1,2,3,4].map(n=>`<option value="${n}" ${n==y?'selected':''}>${yr(n)}</option>`).join('')}</select></div>
<div><label class="fl sm mt" for="st_s">Section</label><input id="st_s" maxlength="20" value="${esc(me.section||'')}" placeholder="e.g. BSIS-II201" autocomplete="off"><div class="err" id="e_st_s"></div></div></div>
<div class="row"><button class="btn" id="st_ok">Save</button></div></div>
<div class="card" style="max-width:600px;margin-top:16px"><h3>Account</h3>${schoolName()?`<div class="mt sm">School</div><b>${esc(schoolName())}</b><div style="height:10px"></div>`:''}<div class="mt sm">Code name</div><b>${esc(me.code_name||'Not set')}</b>
<div class="mt sm" style="margin-top:10px">Email</div><b>${esc(me.email||'')}</b><div style="margin:10px 0"><span class="tag">${esc(me.role||'student')}</span></div>
<div class="row">${isStaff()?'<a class="btn g" href="#admin">Admin panel</a>':''}<button class="btn g" onclick="confirmLogout()">Sign out</button></div></div>`;
  $('#st_ok').onclick=async()=>{
    const course=$('#st_c').value,yv=+$('#st_y').value,sec=$('#st_s').value.trim().toUpperCase();
    fe('e_st_s','');if(!/^[A-Z0-9 \-]{0,20}$/.test(sec))return fe('e_st_s','Use letters, numbers, spaces or dashes only.');
    const b=$('#st_ok');b.disabled=true;
    if(await saveStudy({course,year:yv,section:sec})){toast('Saved');location.hash=course?'#course':'#settings';if(!course)V.settings()}else b.disabled=false;
  };
};

/* ---------- chat ---------- */
const CH={room:'',msgs:[],ch:null,last:0};
const DEMO_CHAT=[{id:1,course:null,author:'Head Archivist',author_role:'admin',body:'Welcome to the global chat! Keep it kind and study-related.',created_at:new Date(Date.now()-36e5).toISOString()}];
function chatMsg(m){
  const own=me&&(m.user_id?m.user_id===me.id:m.author===(me.code_name||me.name));
  const t=new Date(m.created_at),today=new Date().toDateString()==t.toDateString();
  const time=t.toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'})+(today?'':' · '+t.toLocaleDateString('en',{month:'short',day:'numeric'}));
  const badge=m.author_role&&m.author_role!='student'?`<span class="rb">${esc(m.author_role)}</span>`:'';
  const del=own||isStaff()?`<button class="cd" aria-label="Delete message" title="Delete" onclick="chatDel(${m.id})">${ICON_TRASH}</button>`:'';
  return `<div class="cmr ${own?'own':''}"><div class="cb"><div class="cu"><b>${esc(m.author)}</b>${badge}<span>${esc(time)}</span>${del}</div><div class="ctx">${esc(m.body)}</div></div></div>`;
}
function drawChat(stick){
  const el=document.getElementById('cm');if(!el)return;
  const near=el.scrollHeight-el.scrollTop-el.clientHeight<90;
  el.innerHTML=CH.msgs.length?CH.msgs.map(chatMsg).join(''):'<div class="mt" style="padding:28px;text-align:center;margin:auto">No messages yet. Say hi!</div>';
  if(stick||near)el.scrollTop=el.scrollHeight;
}
function addMsg(m){if(!m||(m.course||'')!==CH.room||CH.msgs.some(x=>x.id==m.id))return;CH.msgs.push(m);if(CH.msgs.length>200)CH.msgs.shift();drawChat()}
function chatUnsub(){if(CH.ch&&live())sb.removeChannel(CH.ch);CH.ch=null}
function chatSub(){
  chatUnsub();if(!live())return;
  CH.ch=sb.channel('chat-'+Date.now())
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{if(location.hash=='#chat')addMsg(p.new)})
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'messages'},p=>{const id=p.old&&p.old.id;if(id!=null){CH.msgs=CH.msgs.filter(m=>m.id!=id);drawChat()}})
    .subscribe();
}
addEventListener('hashchange',()=>{if(location.hash!='#chat')chatUnsub()});
async function chatLoad(){
  const room=CH.room;CH.msgs=[];drawChat();
  if(!live()){CH.msgs=DEMO_CHAT.filter(m=>(m.course||'')==room).slice(-60);drawChat(true);return}
  let q=sb.from('messages').select('*').order('created_at',{ascending:false}).limit(60);
  q=room?q.eq('course',room):q.is('course',null);if(HAS_SCH)q=q.eq('school_id',SCH);
  const {data,error}=await q;
  if(room!==CH.room||!document.getElementById('cm'))return;
  if(error){document.getElementById('cm').innerHTML='<div class="mt" style="padding:28px;text-align:center;margin:auto">'+esc(/relation|schema cache/i.test(error.message)?'Chat is not set up yet. Run courses_chat.sql in Supabase.':error.message)+'</div>';return}
  CH.msgs=data.reverse();drawChat(true);chatSub();
}
function chatRoom(r){CH.room=r||'';V.chat()}
async function chatSend(e){
  e.preventDefault();const i=$('#ci'),body=i.value.trim();if(!body||Date.now()-CH.last<700)return;CH.last=Date.now();i.value='';
  if(!live()){const m={id:nextId(DEMO_CHAT),course:CH.room||null,author:me.code_name||me.name,author_role:me.role,body,created_at:new Date().toISOString()};DEMO_CHAT.push(m);addMsg(m);return}
  const {data,error}=await sb.from('messages').insert({course:CH.room||null,body,...sc()}).select().single();
  if(error){i.value=body;toast(/relation|schema cache/i.test(error.message)?'Run courses_chat.sql first.':/row-level|polic/i.test(error.message)?'You cannot post in this room.':error.message);return}
  addMsg(data);
}
async function chatDel(id){
  if(live()){const {data,error}=await sb.from('messages').delete().eq('id',id).select();if(error||!data||!data.length){toast('Could not delete that message.');return}}
  else{const i=DEMO_CHAT.findIndex(m=>m.id==id);if(i>=0)DEMO_CHAT.splice(i,1)}
  CH.msgs=CH.msgs.filter(m=>m.id!=id);drawChat();
}
V.chat=()=>{
  if(!me)return location.hash='#login';
  const mine=courseOK(me.course)?me.course:'';
  if(CH.room&&!isStaff()&&CH.room!==mine)CH.room='';
  const other=isStaff()?COURSES.filter(c=>c!==mine):[];
  app.innerHTML=`<div class="ah"><h2 style="margin:0">Chat</h2><span class="mt sm">${CH.room?'Only students of '+esc(CH.room)+' can read this room':'Everyone signed in can read this room'}</span></div>
<div class="chips"><button class="chip ${!CH.room?'on':''}" onclick="chatRoom('')">Global</button>${mine?`<button class="chip ${CH.room==mine?'on':''}" data-c="${esc(mine)}" onclick="chatRoom(this.dataset.c)">${esc(mine)}</button>`:'<a class="chip" href="#settings">Set your course to join your course chat</a>'}
${other.length?`<select id="ch_c" aria-label="Other course rooms" style="width:auto;min-width:200px"><option value="">Other course rooms…</option>${other.map(c=>`<option value="${esc(c)}" ${c==CH.room?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}</div>
<div class="card chat"><div class="cm" id="cm" aria-live="polite"></div><form class="cf" id="cf" autocomplete="off"><input id="ci" maxlength="500" placeholder="${CH.room?'Message '+esc(CH.room):'Message everyone'}" aria-label="Message"><button class="btn" type="submit">Send</button></form></div>`;
  $('#cf').onsubmit=chatSend;
  const sel=$('#ch_c');if(sel)sel.onchange=e=>{if(e.target.value)chatRoom(e.target.value)};
  chatLoad();
  if(!(window.matchMedia&&window.matchMedia('(max-width:900px)').matches))$('#ci').focus();
};
