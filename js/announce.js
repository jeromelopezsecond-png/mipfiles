/* Announcements.
   Backend: announcements + announcement_reads tables (announcements_v8.sql). Visibility and permissions are enforced by the database;
   this file only draws what the database returns. Without Supabase (local preview) it keeps announcements in memory. */
let ANN=[],ANN_READ=new Set(),ANN_OK=true,ANN_STATE='idle',ANN_ERR='',ANN_AT=0,ANN_TAB='current',ANN_USER=null,ANN_FILTER='all';

const annStatus=a=>{const n=Date.now();if(!a.published)return 'draft';if(new Date(a.publish_at)>n)return 'scheduled';if(a.expires_at&&new Date(a.expires_at)<=n)return 'expired';return 'live'};
/* what students (and everyone on the student-facing pages) may see */
const annPublic=()=>ANN.filter(a=>a.published&&new Date(a.publish_at)<=Date.now()&&(!a.course||a.course==(me&&me.course)||isStaff()));
const annSort=l=>l.slice().sort((a,b)=>(annStatus(b)=='live'&&b.pinned)-(annStatus(a)=='live'&&a.pinned)||new Date(b.publish_at)-new Date(a.publish_at)||b.id-a.id);
const annLive=()=>annSort(annPublic().filter(a=>annStatus(a)=='live'));
const annPrev=()=>annSort(annPublic().filter(a=>annStatus(a)=='expired'));
const annUnread=()=>annLive().filter(a=>!ANN_READ.has(a.id));
const annExcerpt=(t,n)=>{const s=String(t||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s};

function updateAnnBadge(){
  const n=ANN_OK?annUnread().length:0,b=document.getElementById('nb-ann'),bell=document.getElementById('bell');
  if(b){b.textContent=n>99?'99+':String(n);b.hidden=!n}
  if(bell){bell.hidden=!(me&&ANN_OK);bell.setAttribute('aria-label',n?`Announcements, ${n} new`:'Announcements')}
}

/* ---------- loading ---------- */
async function loadAnn(force){
  if(!me)return;
  if(!force&&ANN_STATE=='ready'&&Date.now()-ANN_AT<60000)return;
  ANN_STATE='loading';
  if(!live()){ANN_STATE='ready';ANN_AT=Date.now();updateAnnBadge();return}
  let q=sb.from('announcements').select('*').order('publish_at',{ascending:false}).limit(200);
  if(HAS_SCH&&SCH!=null)q=q.eq('school_id',SCH);
  const [a,r]=await Promise.all([q,sb.from('announcement_reads').select('announcement_id')]);
  if(a.error){
    if(/relation|schema cache|does not exist/i.test(a.error.message)){ANN_OK=false;ANN_STATE='ready'}
    else{ANN_STATE='error';ANN_ERR=a.error.message}
    ANN_AT=Date.now();updateAnnBadge();return;
  }
  ANN_OK=true;ANN=a.data||[];ANN_READ=new Set((r.data||[]).map(x=>x.announcement_id));ANN_STATE='ready';ANN_AT=Date.now();updateAnnBadge();
}
function annEnsure(){
  if(ANN_STATE=='loading')return;
  if(ANN_STATE=='idle'||ANN_STATE=='error'||Date.now()-ANN_AT>60000)loadAnn(true).then(annRefreshViews);
}
function annRetry(){ANN_STATE='idle';annRefreshViews();annEnsure()}
function annRefreshViews(){
  updateAnnBadge();
  const p=location.hash.slice(1).split('/'),h=p[0]||'home';
  if(h=='announcements')V.announcements();
  else if(h=='announcement')V.announcement(p[1]);
  else if(h=='home'&&typeof annRenderHome=='function')annRenderHome();
  else if(h=='admin'&&typeof admTab!='undefined'&&admTab=='announcements')admAnnouncements();
}
/* when the school changes or the user changes, start clean */
const _lcAnn=loadContent;
window.loadContent=async function(){await _lcAnn();ANN_STATE='idle';ANN_AT=0;if(me)await loadAnn(true)};
const _suAnn=window.setUser;
window.setUser=function(){
  _suAnn();
  const id=me?(me.id||me.email):null;
  if(id!==ANN_USER){ANN=[];ANN_READ=new Set();ANN_STATE='idle';ANN_AT=0;ANN_USER=id;ANN_OK=true}
  updateAnnBadge();
};

/* ---------- reading state ---------- */
async function annMarkRead(ids){
  ids=(Array.isArray(ids)?ids:[ids]).filter(i=>!ANN_READ.has(i));if(!ids.length)return;
  ids.forEach(i=>ANN_READ.add(i));updateAnnBadge();
  if(live()&&me&&me.id)await sb.from('announcement_reads').upsert(ids.map(i=>({user_id:me.id,announcement_id:i})),{onConflict:'user_id,announcement_id',ignoreDuplicates:true});
}
function annMarkAll(){const ids=annUnread().map(a=>a.id);if(!ids.length)return;annMarkRead(ids);toast('All announcements marked as read');annRefreshViews()}

/* ---------- admin operations ---------- */
const annErr=e=>{const m=(e&&e.message)||String(e);return /expiry_after_start/i.test(m)?'The expiry date must be after the publish date.':/row-level|polic|permission|multiple \(or no\) rows/i.test(m)?'Only admins of this school can do that.':/relation|schema cache/i.test(m)?'Run announcements_v8.sql in Supabase first.':/foreign key|violates/i.test(m)?'That course no longer exists.':m};
async function annSave(o,id){
  if(!live()){
    if(id){Object.assign(ANN.find(x=>x.id==id),o,{updated_at:new Date().toISOString()})}
    else ANN.unshift({id:nextId(ANN),school_id:SCH,author:myName?myName():'Admin',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...o});
    updateAnnBadge();return true;
  }
  const r=id?await sb.from('announcements').update(o).eq('id',id).select().single():await sb.from('announcements').insert({...sc(),...o}).select().single();
  if(r.error){toast(annErr(r.error),'err');return false}
  const i=ANN.findIndex(x=>x.id==r.data.id);i>=0?ANN[i]=r.data:ANN.unshift(r.data);updateAnnBadge();return true;
}
async function annToggle(id,field){
  const a=ANN.find(x=>x.id==id);if(!a)return;
  if(!await annSave({[field]:!a[field]},id))return;
  toast(field=='pinned'?(a.pinned?'Announcement pinned':'Announcement unpinned'):(a.published?'Announcement published':'Announcement unpublished (now a draft)'));
  annRefreshViews();
}
function annDelete(id){
  const a=ANN.find(x=>x.id==id);if(!a)return;
  ask('Delete announcement?','"'+esc(a.title)+'" will be permanently deleted for everyone. This cannot be undone.','Delete',async()=>{
    if(live()){const {data,error}=await sb.from('announcements').delete().eq('id',id).select();
      if(error||!data||!data.length){toast(error?annErr(error):'Could not delete. Only admins of this school can delete announcements.','err');return}}
    ANN=ANN.filter(x=>x.id!=id);ANN_READ.delete(id);updateAnnBadge();toast('Announcement deleted');
    location.hash.startsWith('#announcement/')?location.hash='#announcements':annRefreshViews();
  });
}

/* ---------- cards ---------- */
const STAT={live:['Live','ok'],scheduled:['Scheduled','warn'],draft:['Draft','mute'],expired:['Expired','mute']};
function annCard(a,o={}){
  const st=annStatus(a),isNew=!o.admin&&st=='live'&&!ANN_READ.has(a.id),pin=a.pinned&&st=='live';
  return `<article class="card ann ${pin?'pin':''} ${isNew?'new':''} ${st=='expired'?'old':''}" data-href="#announcement/${a.id}">
<div class="ann-top">${pin?`<span class="cs gold">${icon('pin',13)} Pinned</span>`:''}${isNew?'<span class="cs new">New</span>':''}${o.admin?`<span class="cs ${STAT[st][1]}">${STAT[st][0]}${a.pinned&&!pin?' · pinned':''}</span>`:''}<span class="cs">${a.course?esc(a.course):'Whole school'}</span></div>
<h3><a href="#announcement/${a.id}">${esc(a.title)}</a></h3>
<p class="ann-ex">${esc(annExcerpt(a.body,o.compact?110:200))}</p>
<div class="ann-meta"><span>${icon('clock',14)} ${esc(fmtDate(a.publish_at))}</span>${a.author&&!o.compact?`<span>by ${esc(a.author)}</span>`:''}${a.expires_at?`<span>${st=='expired'?'Ended':'Until'} ${esc(fmtDate(a.expires_at))}</span>`:''}${o.compact?'':`<span class="ann-more">Read more ${icon('chev',14)}</span>`}</div>
${o.admin?`<div class="ann-act">${annActions(a)}</div>`:''}</article>`;
}
function annActions(a){
  return `<button class="btn g sm" onclick="openAnnForm(${a.id})">${icon('edit',15)} Edit</button><button class="btn g sm" onclick="annToggle(${a.id},'published')">${a.published?'Unpublish':'Publish'}</button><button class="btn g sm" onclick="annToggle(${a.id},'pinned')">${icon('pin',15)} ${a.pinned?'Unpin':'Pin'}</button><button class="btn g sm del" onclick="annDelete(${a.id})">${icon('trash',15)} Delete</button>`;
}

/* ---------- student pages ---------- */
function annBody(){
  if(!ANN_OK)return emptyState('megaphone','Announcements are not set up yet',isAdmin()?'Run announcements_v8.sql in the Supabase SQL Editor to turn them on.':'Check back soon.');
  if(ANN_STATE=='error')return errorState(ANN_ERR||'We could not load announcements.','annRetry()');
  if(ANN_STATE!='ready')return skel(3,'tall');
  const cur=annLive(),prev=annPrev(),list=ANN_TAB=='previous'?prev:cur;
  const tabs=`<div class="tabs-scroll" role="tablist"><button role="tab" aria-selected="${ANN_TAB!='previous'}" class="chip ${ANN_TAB!='previous'?'on':''}" onclick="ANN_TAB='current';V.announcements()">Current (${cur.length})</button><button role="tab" aria-selected="${ANN_TAB=='previous'}" class="chip ${ANN_TAB=='previous'?'on':''}" onclick="ANN_TAB='previous';V.announcements()">Previous (${prev.length})</button>${annUnread().length?`<button class="chip mark" onclick="annMarkAll()">${icon('check',15)} Mark all as read</button>`:''}</div>`;
  return tabs+(list.length?`<div class="ann-list">${list.map(a=>annCard(a)).join('')}</div>`:emptyState('megaphone',ANN_TAB=='previous'?'No previous announcements':'No announcements right now',ANN_TAB=='previous'?'Announcements that have ended will appear here.':'When your school posts something, it will show up here.',isAdmin()?'<button class="btn" onclick="openAnnForm()">New announcement</button>':''));
}
V.announcements=()=>{
  if(!me)return location.hash='#login';
  annEnsure();
  app.innerHTML=pageHead('Announcements','News and notices from your school. Pinned announcements stay at the top.',[['Announcements']],isAdmin()&&ANN_OK?`<button class="btn" onclick="openAnnForm()">${icon('plus',16)} New announcement</button>`:'')+`<div id="ann-page">${annBody()}</div>`;
};
V.announcement=id=>{
  if(!me)return location.hash='#login';
  annEnsure();
  const a=ANN.find(x=>x.id==id);
  if(!a){
    app.innerHTML=pageHead('Announcement','',[['Announcements','#announcements'],['Announcement']])+(ANN_STATE=='ready'?emptyState('megaphone','This announcement is not available','It may have been removed or is not meant for your course.','<a class="btn" href="#announcements">Back to announcements</a>'):skel(2,'tall'));return;
  }
  const st=annStatus(a);
  if(a.published&&st!='scheduled')annMarkRead(a.id);
  app.innerHTML=pageHead(a.title,'',[['Announcements','#announcements'],[annExcerpt(a.title,40)]])+
`<article class="card ann-full ${a.pinned&&st=='live'?'pin':''}"><div class="ann-top">${a.pinned?`<span class="cs gold">${icon('pin',13)} Pinned</span>`:''}${isAdmin()?`<span class="cs ${STAT[st][1]}">${STAT[st][0]}</span>`:(st=='expired'?'<span class="cs mute">Ended</span>':'')}<span class="cs">${a.course?esc(a.course):'Whole school'}</span></div>
<div class="ann-meta big"><span>${icon('clock',14)} Published ${esc(fmtDateTime(a.publish_at))}</span>${a.expires_at?`<span>${st=='expired'?'Ended':'Until'} ${esc(fmtDateTime(a.expires_at))}</span>`:''}${a.author?`<span>by ${esc(a.author)}</span>`:''}</div>
<div class="ann-body">${esc(a.body)}</div>
${isAdmin()?`<div class="ann-act">${annActions(a)}</div>`:''}</article><p><a class="btn g" href="#announcements">${icon('left',16)} All announcements</a> <a class="btn g" href="#home">Back to Home</a></p>`;
  updateAnnBadge();
};

/* Home card */
function annHomeHTML(){
  if(!ANN_OK)return '';
  const n=annUnread().length;
  const body=ANN_STATE=='error'?errorState(ANN_ERR||'We could not load announcements.','annRetry()'):ANN_STATE!='ready'?skel(2):(annLive().length?`<div class="ann-list compact">${annLive().slice(0,3).map(a=>annCard(a,{compact:true})).join('')}</div>`:`<p class="mt" style="margin:6px 0">No announcements right now.</p>`);
  return `<div class="ch">${icon('megaphone',18)}<span>Announcements</span>${n?`<span class="cs new" style="margin-left:6px">${n} new</span>`:''}<a href="#announcements">View all</a></div>${body}`;
}
function annRenderHome(){const el=document.getElementById('ann-home');if(el)el.innerHTML=annHomeHTML()}

/* ---------- admin: form ---------- */
const toLocalInput=i=>{const d=new Date(i),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
function openAnnForm(id){
  if(!isAdmin())return toast('Only admins can manage announcements.','err');
  const a=id!=null?ANN.find(x=>x.id==id):null;
  modal(`<h3>${a?'Edit announcement':'New announcement'}</h3><p class="mt sm">Students of your school see it once it is published and its publish date has arrived.</p>
<label class="fl sm mt" for="an_t">Title</label><input id="an_t" maxlength="120" placeholder="e.g. Midterm schedule is out" autocomplete="off" value="${a?esc(a.title):''}"><div class="err" id="e_an_t"></div>
<label class="fl sm mt" for="an_b">Message</label><textarea id="an_b" rows="6" maxlength="4000" placeholder="Write the full announcement…">${a?esc(a.body):''}</textarea><div class="mt sm" style="display:flex;justify-content:space-between"><span class="err" id="e_an_b" style="min-height:0"></span><span id="an_cnt"></span></div>
<div class="f2"><div><label class="fl sm mt" for="an_c">Audience</label><select id="an_c"><option value="">Whole school</option>${COURSES.map(c=>`<option value="${esc(c)}" ${a&&a.course==c?'selected':''}>${esc(c)} only</option>`).join('')}</select></div>
<div><label class="fl sm mt" for="an_s">Status</label><select id="an_s"><option value="1" ${!a||a.published?'selected':''}>Published</option><option value="0" ${a&&!a.published?'selected':''}>Draft (hidden)</option></select></div>
<div><label class="fl sm mt" for="an_p">Publish date</label><input id="an_p" type="datetime-local" value="${toLocalInput(a?a.publish_at:new Date())}"></div>
<div><label class="fl sm mt" for="an_e">Expiry (optional)</label><input id="an_e" type="datetime-local" value="${a&&a.expires_at?toLocalInput(a.expires_at):''}"></div></div>
<div class="err" id="e_an_d"></div>
<label class="ck" style="margin-top:6px"><input type="checkbox" id="an_pin" ${a&&a.pinned?'checked':''}><span>Pin this announcement to the top</span></label>
<div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Cancel</button><button class="btn" id="an_ok">${a?'Save changes':'Save announcement'}</button></div>`);
  const cnt=()=>{$('#an_cnt').textContent=$('#an_b').value.length+'/4000'};$('#an_b').addEventListener('input',cnt);cnt();
  $('#an_ok').onclick=async()=>{
    const t=$('#an_t').value.trim(),b=$('#an_b').value.trim(),p=$('#an_p').value,e=$('#an_e').value;
    fe('e_an_t',t.length<3?'Enter a title (at least 3 characters).':'');fe('e_an_b',b?'':'Write the announcement message.');
    const pd=p?new Date(p):null,ed=e?new Date(e):null;
    fe('e_an_d',!pd||isNaN(pd)?'Choose a publish date.':(ed&&ed<=pd?'The expiry date must be after the publish date.':''));
    if(t.length<3||!b||!pd||isNaN(pd)||(ed&&ed<=pd))return;
    const btn=$('#an_ok');btn.disabled=true;btn.textContent='Saving…';
    const o={title:t,body:b,course:$('#an_c').value||null,published:$('#an_s').value=='1',pinned:$('#an_pin').checked,publish_at:pd.toISOString(),expires_at:ed?ed.toISOString():null};
    if(await annSave(o,a?a.id:null)){closeModal(true);toast(a?'Announcement updated':(o.published?'Announcement saved':'Saved as draft'));annRefreshViews();if(!a&&location.hash=='#announcements'){/* already refreshed */}}
    else{btn.disabled=false;btn.textContent=a?'Save changes':'Save announcement'}
  };
  $('#an_t').focus();
}

/* ---------- admin: panel tab ---------- */
function admAnnouncements(){
  const box=document.getElementById('adm');if(!box)return;
  annEnsure();
  if(!ANN_OK){box.innerHTML=emptyState('megaphone','Announcements are not set up yet','Run announcements_v8.sql in the Supabase SQL Editor, then reload.');return}
  if(ANN_STATE=='error'){box.innerHTML=errorState(ANN_ERR,'annRetry()');return}
  if(ANN_STATE!='ready'){box.innerHTML=skel(3,'tall');return}
  const counts={all:ANN.length};['live','scheduled','draft','expired'].forEach(s=>counts[s]=ANN.filter(a=>annStatus(a)==s).length);
  const list=annSort(ANN).filter(a=>ANN_FILTER=='all'||annStatus(a)==ANN_FILTER);
  box.innerHTML=`<div class="row" style="margin-top:0"><button class="btn" onclick="openAnnForm()">${icon('plus',16)} New announcement</button></div>
<div class="tabs-scroll" role="tablist">${[['all','All'],['live','Live'],['scheduled','Scheduled'],['draft','Drafts'],['expired','Expired']].map(f=>`<button role="tab" aria-selected="${ANN_FILTER==f[0]}" class="chip ${ANN_FILTER==f[0]?'on':''}" onclick="ANN_FILTER='${f[0]}';admAnnouncements()">${f[1]} (${counts[f[0]]})</button>`).join('')}</div>
${list.length?`<div class="ann-list">${list.map(a=>annCard(a,{admin:true})).join('')}</div>`:emptyState('megaphone','Nothing here yet',ANN_FILTER=='all'?'Create your first announcement to keep students informed.':'No announcements with this status.',ANN_FILTER=='all'?'<button class="btn" onclick="openAnnForm()">New announcement</button>':'')}`;
}
