/* Main views. Uses the real school data already loaded by content.js (R, E, SUBJ, COURSES, CS). */

/* ---------- shared filter logic: course -> subjects -> year ---------- */
const subjectsFor=c=>c?[...new Set(CS.filter(x=>x.course==c).map(x=>x.subject))].filter(s=>SUBJ.includes(s)).sort():SUBJ.slice().sort();
function yearOK(subject,course,y){
  const rows=CS.filter(x=>x.subject==subject&&(!course||x.course==course));
  return rows.length?rows.some(x=>x.year==y||x.year==0):!course;     // a subject nobody placed in a year stays visible
}
const coursesOf=s=>[...new Set(CS.filter(x=>x.subject==s).map(x=>x.course))].sort();
const ssSet=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ssGet=(k,d)=>{try{return Object.assign({},d,JSON.parse(sessionStorage.getItem(k))||{})}catch(e){return d}};
let XF=ssGet('mip_xf',{q:'',course:'',sub:'',yr:''});
AF=ssGet('mip_af',AF);AF.course=AF.course||'';
const subLink=s=>'#subject/'+encodeURIComponent(s);
window.goSub=s=>{location.hash=subLink(s)};

function filterBar(o){
  return `<section class="card fbar" aria-label="Filters"><label class="f-search">${icon('search',18)}<input id="${o.id}q" type="search" placeholder="${esc(o.ph)}" value="${esc(o.st.q)}" aria-label="${esc(o.ph)}" autocomplete="off"></label>
<div class="f-grid"><div class="f-f"><label for="${o.id}c">Course</label><select id="${o.id}c"><option value="">All courses</option>${COURSES.map(c=>`<option value="${esc(c)}" ${c==o.st.course?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
<div class="f-f"><label>Subject</label>${sddHTML(o.id+'s','All subjects')}</div>
<div class="f-f"><label for="${o.id}y">Year level</label><select id="${o.id}y"><option value="">All years</option>${[1,2,3,4].map(n=>`<option value="${n}" ${n==o.st.yr?'selected':''}>${yr(n)}</option>`).join('')}</select></div>${o.extra||''}</div>
<div class="f-foot"><span class="f-count" id="${o.id}n" role="status" aria-live="polite"></span><button type="button" class="btn g sm" id="${o.id}x">Clear filters</button></div></section>`;
}
/* hooks the bar up; st is the state object, change() re-runs the list, reset() clears everything */
function wireFilters(o,change,reset){
  const st=o.st,q=document.getElementById(o.id+'q'),c=document.getElementById(o.id+'c'),y=document.getElementById(o.id+'y');
  q.oninput=()=>{st.q=q.value;change()};
  c.onchange=()=>{st.course=c.value;if(st.sub&&!subjectsFor(st.course).includes(st.sub)){st.sub='';document.getElementById(o.id+'s')._sdd.set('')}change()};
  y.onchange=()=>{st.yr=y.value;change()};
  sddInit(o.id+'s',{options:()=>subjectsFor(st.course),value:st.sub,all:'All subjects',onChange:v=>{st.sub=v;change()}});
  document.getElementById(o.id+'x').onclick=reset;
}

/* ---------- reviewer card ---------- */
window.rc=function(r){
  if(!r)return '';
  const href='#r/'+r.id;
  return `<article class="card rcard x-${String(r.exam).replace(/\W/g,'')}" data-href="${href}"><div class="ct"><div class="rc-t">${fileBadge(r.type)}<h3><a href="${href}">${esc(r.title)}</a></h3></div>
<div class="ca"><button class="bm ${bm.has(r.id)?'on':''}" aria-label="${bm.has(r.id)?'Remove bookmark':'Bookmark'}" aria-pressed="${bm.has(r.id)}" onclick="toggleBm(${r.id})">★</button>${isStaff()?`<button class="bm ed" aria-label="Edit reviewer" title="Edit reviewer" onclick="openReviewerForm(${r.id})">${ICON_EDIT}</button>`:''}${isAdmin()?`<button class="bm del" aria-label="Delete reviewer" title="Delete reviewer" onclick="admDelReviewer(${r.id})">${ICON_TRASH}</button>`:''}</div></div>
<a class="rc-link" href="${subLink(r.subject)}">${icon('book',14)} ${esc(r.subject)}</a>
<div class="rc-tags"><span class="tag">${esc(r.exam)}</span><span class="tag">${yr(r.year)}</span><span class="tag">Sem ${r.sem}</span>${r.section?`<span class="tag">${esc(r.section)}</span>`:''}</div>
<div class="ann-meta"><span>${icon('clock',14)} ${esc(fmtDate(r.date))}</span>${r.size?`<span>${esc(r.size)}</span>`:''}${r.dl?`<span>${icon('download',14)} ${r.dl}</span>`:''}</div>
<div class="row" style="margin:10px 0 0"><a class="btn g" href="${href}">${icon('eye',16)} Preview</a><button class="btn" onclick="dl(${r.id})">${icon('download',16)} Download</button></div></article>`;
};
const miniCard=r=>`<a class="card mini" href="#r/${r.id}">${fileBadge(r.type)}<b class="tr2">${esc(r.title)}</b><span class="tr">${esc(r.subject)}</span><small>${esc(fmtDate(r.date))}</small></a>`;
const examCard=e=>{const cs=coursesOf(e.subject);
  return `<article class="card ecard" data-href="#exam/${e.id}"><div class="ct"><h3><a href="#exam/${e.id}">${esc(e.title)}</a></h3><div class="ca">${isStaff()?`<button class="bm ed" aria-label="Edit exam" title="Edit exam" onclick="openExamForm(${e.id})">${ICON_EDIT}</button>`:''}${isAdmin()?`<button class="bm del" aria-label="Delete exam" title="Delete exam" onclick="admDelExam(${e.id})">${ICON_TRASH}</button>`:''}</div></div>
<a class="rc-link" href="${subLink(e.subject)}">${icon('book',14)} ${esc(e.subject)}</a>
<div class="rc-tags"><span class="tag">${esc(e.diff)}</span>${cs.slice(0,2).map(c=>`<span class="tag">${esc(c)}</span>`).join('')}${cs.length>2?`<span class="tag">+${cs.length-2}</span>`:''}</div>
<div class="ann-meta"><span>${icon('exams',14)} ${e.q.length} question${e.q.length==1?'':'s'}</span><span>${icon('clock',14)} ${e.mins} min</span><span>Pass ${e.pass}%</span></div>
<div class="row" style="margin:10px 0 0"><a class="btn" href="#exam/${e.id}">Start exam</a></div></article>`};

/* ---------- Mock Exams ---------- */
function examMatches(){
  const q=XF.q.trim().toLowerCase();
  return E.filter(e=>(!XF.sub||e.subject==XF.sub)&&(!XF.course||CS.some(x=>x.course==XF.course&&x.subject==e.subject))&&(!XF.yr||yearOK(e.subject,XF.course,+XF.yr))&&(!q||(e.title+' '+e.subject).toLowerCase().includes(q)));
}
const xActive=()=>!!(XF.q||XF.course||XF.sub||XF.yr);
function examRun(){
  const L=examMatches(),n=document.getElementById('xn'),res=document.getElementById('xres');if(!n||!res)return;
  ssSet('mip_xf',XF);
  n.textContent=xActive()?`${L.length} of ${E.length} mock exam${E.length==1?'':'s'}`:`${E.length} mock exam${E.length==1?'':'s'}`;
  document.getElementById('xx').disabled=!xActive();
  res.innerHTML=L.length?L.map(examCard).join(''):emptyState('exams',E.length?'No mock exams match your filters':'No mock exams yet',E.length?'Try another course, subject or year level, or clear the filters.':'Mock exams will appear here once they are created.',E.length?'<button class="btn" onclick="examClear()">Clear filters</button>':(isStaff()?'<button class="btn" onclick="openExamForm()">Create mock exam</button>':''));
}
function examClear(){XF={q:'',course:'',sub:'',yr:''};ssSet('mip_xf',XF);V.exams()}
V.exams=()=>{
  if(!me)return location.hash='#login';
  if(XF.course&&!COURSES.includes(XF.course))XF.course='';
  if(XF.sub&&!subjectsFor(XF.course).includes(XF.sub))XF.sub='';
  app.innerHTML=pageHead('Mock Exams','Practice with timed exams, then review the correct answers.',[['Mock Exams']],isStaff()?`<button class="btn" onclick="openExamForm()">${icon('plus',16)} Create exam</button>`:'')+
    filterBar({id:'x',st:XF,ph:'Search exams by title or subject'})+`<div id="xres" class="grid"></div>`;
  wireFilters({id:'x',st:XF},examRun,examClear);examRun();
};

/* ---------- Archive ---------- */
const aActive=()=>!!(AF.q||AF.course||AF.sub||AF.yr||AF.exam||AF.sem||AF.sec);
function archMatches(){
  const q=AF.q.toLowerCase().trim();
  return R.filter(r=>(!AF.sub||r.subject==AF.sub)&&(!AF.course||CS.some(x=>x.course==AF.course&&x.subject==r.subject))&&(!AF.exam||r.exam==AF.exam)&&(!AF.yr||yr(r.year)==AF.yr||(AF.yr&&String(AF.yr).length==1&&r.year==+AF.yr))&&(!AF.sem||'Sem '+r.sem==AF.sem)&&(!AF.sec||r.section==AF.sec)&&(!q||(r.title+' '+r.subject+' '+r.section+' '+r.topics.join(' ')).toLowerCase().includes(q)));
}
window.archRun=function(){
  const L=archMatches(),res=document.getElementById('res'),n=document.getElementById('an');if(!res||!n)return;
  ssSet('mip_af',AF);
  L.sort((a,b)=>AF.sort=='dl'?b.dl-a.dl:AF.sort=='az'?a.title.localeCompare(b.title):(b.date||'').localeCompare(a.date||'')||b.id-a.id);
  n.textContent=aActive()?`${L.length} of ${R.length} reviewer${R.length==1?'':'s'}`:`${R.length} reviewer${R.length==1?'':'s'}`;
  const clr=document.getElementById('ax');if(clr)clr.disabled=!aActive();
  const rec=document.getElementById('arec');if(rec)rec.hidden=aActive()||R.length<5;
  res.innerHTML=L.length?L.map(rc).join(''):emptyState('archive',R.length?'No reviewers match your filters':'No reviewers yet',R.length?'Try another course, subject, exam period or search term.':'Reviewers will appear here once they are uploaded.',R.length?'<button class="btn" onclick="archClear()">Clear filters</button>':(isStaff()?'<button class="btn" onclick="openReviewerForm()">Upload reviewer</button>':''));
};
window.archExam=x=>{AF.exam=x=='All'?'':x;document.querySelectorAll('#aperiod .chip').forEach(c=>{const on=c.dataset.x==x;c.classList.toggle('on',on);c.setAttribute('aria-pressed',on)});archRun()};
window.archClear=()=>{AF={q:'',course:'',sub:'',exam:'',yr:'',sem:'',sec:'',sort:'new'};ssSet('mip_af',AF);V.archive()};
V.archive=()=>{
  if(!me)return location.hash='#login';
  if(pend){AF.sub=pend;pend=null}
  if(pq){AF.q=pq;pq=''}
  if(pendX){AF.exam=pendX=='All'?'':pendX;pendX=null}
  if(pmine&&me){AF.yr=String(me.year||me.year_level||1);pmine=false}
  if(AF.yr&&!/^[1-4]$/.test(String(AF.yr))){const i=[1,2,3,4].find(n=>yr(n)==AF.yr);AF.yr=i?String(i):''}
  if(AF.course&&!COURSES.includes(AF.course))AF.course='';
  if(AF.sub&&!subjectsFor(AF.course).includes(AF.sub))AF.sub='';
  const secs=[...new Set(R.map(r=>r.section).filter(Boolean))].sort(),recent=[...R].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id).slice(0,6);
  const extra=`<div class="f-f"><label for="asem">Semester</label><select id="asem"><option value="">Both</option><option ${AF.sem=='Sem 1'?'selected':''}>Sem 1</option><option ${AF.sem=='Sem 2'?'selected':''}>Sem 2</option></select></div>
${secs.length?`<div class="f-f"><label for="asec">Section</label><select id="asec"><option value="">All sections</option>${secs.map(s=>`<option ${s==AF.sec?'selected':''}>${esc(s)}</option>`).join('')}</select></div>`:''}
<div class="f-f"><label for="asrt">Sort by</label><select id="asrt"><option value="new">Newest</option><option value="dl">Most downloaded</option><option value="az">A to Z</option></select></div>`;
  app.innerHTML=pageHead('Archive','Find reviewers by course, subject, exam period or topic.',[['Archive']],isStaff()?`<button class="btn" onclick="openReviewerForm()">${icon('upload',16)} Upload reviewer</button>`:'')+
    `<div class="tabs-scroll" id="aperiod" role="group" aria-label="Exam period">${['All','Prelim','Midterm','Semi-Final','Final'].map(x=>`<button type="button" class="chip ${(AF.exam||'All')==x?'on':''}" data-x="${x}" aria-pressed="${(AF.exam||'All')==x}" onclick="archExam('${x}')">${x}</button>`).join('')}</div>`+
    filterBar({id:'a',st:AF,ph:'Search titles, subjects, topics or sections',extra})+
    (recent.length?`<section id="arec" class="rec"><div class="ch">${icon('clock',18)}<span>Recently uploaded</span></div><div class="strip">${recent.map(miniCard).join('')}</div></section>`:'')+
    `<div id="res" class="grid"></div>`;
  $('#asrt').value=AF.sort||'new';
  [['asem','sem'],['asec','sec'],['asrt','sort']].forEach(p=>{const el=document.getElementById(p[0]);if(el)el.onchange=()=>{AF[p[1]]=el.value;archRun()}});
  wireFilters({id:'a',st:AF},archRun,archClear);archRun();
};

/* ---------- Subject page: reviewers, mock exams and courses in one place ---------- */
V.subject=id=>{
  if(!me)return location.hash='#login';
  const s=decodeURIComponent(id||'');
  if(!SUBJ.includes(s)){toast('That subject was not found.','err');return location.hash='#archive'}
  const rv=R.filter(r=>r.subject==s).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id),ex=E.filter(e=>e.subject==s),cs=coursesOf(s);
  const mine=courseOK(me.course)&&CS.some(x=>x.course==me.course&&x.subject==s);
  const crumbs=mine?[['My Course','#course'],[s]]:[['Archive','#archive'],[s]];
  app.innerHTML=pageHead(s,`${rv.length} reviewer${rv.length==1?'':'s'} · ${ex.length} mock exam${ex.length==1?'':'s'}`,crumbs,
    isStaff()?`<button class="btn" data-s="${esc(s)}" onclick="openReviewerForm(null,this.dataset.s)">${icon('upload',16)} Upload reviewer</button>`:'')+
    (cs.length?`<div class="rc-tags" style="margin:0 0 6px">${cs.map(c=>`<span class="tag">${esc(c)}</span>`).join('')}</div>`:'')+
    `<div class="ch" style="margin-top:20px">${icon('file',18)}<span>Reviewers</span><a href="#archive" data-s="${esc(s)}" onclick="AF.sub=this.dataset.s;AF.course=''">Open in archive</a></div>`+
    (rv.length?`<div class="grid">${rv.map(rc).join('')}</div>`:emptyState('file','No reviewers for this subject yet','Reviewers uploaded for this subject will appear here.',isStaff()?`<button class="btn" data-s="${esc(s)}" onclick="openReviewerForm(null,this.dataset.s)">Upload reviewer</button>`:''))+
    `<div class="ch" style="margin-top:26px">${icon('exams',18)}<span>Mock exams</span><a href="#exams" data-s="${esc(s)}" onclick="XF.sub=this.dataset.s;XF.course='';XF.q='';XF.yr='';ssSet('mip_xf',XF)">Open in mock exams</a></div>`+
    (ex.length?`<div class="grid">${ex.map(examCard).join('')}</div>`:emptyState('exams','No mock exams for this subject yet','Check back later, or browse all mock exams.','<a class="btn g" href="#exams">All mock exams</a>'));
};

/* ---------- About Us (public: also reachable before signing in) ---------- */
V.about=()=>{
  const home=me?'#home':'#login',hl=me?'Home':'Sign in';
  app.innerHTML=`<header class="pgh"><div class="bc" role="navigation" aria-label="Breadcrumb"><ol><li><a href="${home}">${hl}</a></li><li aria-current="page"><span>About Us</span></li></ol></div>
<div class="pgh-row"><div class="pgh-t"><h1>About ${esc(SITE.name)}</h1><p>${esc(SITE.tagline)}</p></div><div class="pgh-a"><a class="btn" href="${home}">${icon('left',16)} ${me?'Back to Home':'Back to sign in'}</a></div></div></header>
<div class="card legal about">${legalHTML('about').replace(/<h3>.*?<\/h3>/,'')}<p><a href="#" onclick="openLegal('privacy');return false">Read our Privacy Policy</a></p></div>`;
};

/* ---------- Home: a useful starting point ---------- */
const byDate=(a,b)=>(b.date||'').localeCompare(a.date||'')||b.id-a.id;
V.home=()=>{
  if(!me)return location.hash='#login';
  annEnsure();
  const first=String(me.name||me.full_name||'').trim().split(/\s+/)[0]||me.code_name||'there',own=courseOK(me.course)?me.course:'',yv=me.year||me.year_level||1;
  const hr=new Date().getHours(),gr=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  const rows=own?CS.filter(x=>x.course==own).sort((a,b)=>yearOrder(yv)(a.year,b.year)||a.subject.localeCompare(b.subject)):[],mySubs=new Set(rows.map(x=>x.subject));
  const newest=[...R].sort(byDate).slice(0,4),cont=recentList().map(id=>R.find(r=>r.id==id)).filter(Boolean).slice(0,3);
  const exams=[...E].sort((a,b)=>(mySubs.has(b.subject)-mySubs.has(a.subject))||b.id-a.id).slice(0,3);
  const un=(typeof CH!='undefined'&&((CH.unread['']||0)+(own?(CH.unread[own]||0):0)))||0,an=(typeof annUnread=='function'&&ANN_OK)?annUnread().length:0;
  const tile=(h,ic,l,b)=>`<a class="sc" href="${h}">${icon(ic,22)}<span>${l}</span>${b?`<i class="nb">${b>99?'99+':b}</i>`:''}</a>`;
  const admin=isAdmin()||isStaff()?`<section class="card adm-home" aria-label="Manage content"><div class="ch">${icon('admin',18)}<span>Manage content</span>${isAdmin()?'<a href="#admin">Admin Panel</a>':''}</div>
<div class="qa-grid">${quickItems().map(i=>`<button type="button" class="qa" onclick="${i.fn}()">${icon(i.icon,20)}<span><b>${esc(i.label)}</b><small>${esc(i.desc)}</small></span></button>`).join('')}</div>
<div class="mini-stats"><div><b>${R.length}</b><span>Reviewers</span></div><div><b>${E.length}</b><span>Mock exams</span></div><div><b>${SUBJ.length}</b><span>Subjects</span></div><div><b>${COURSES.length}</b><span>Courses</span></div></div></section>`:'';
  app.innerHTML=`<section class="card hero-home"><div><div class="mt sm">${esc(new Date().toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'}))}${schoolName()?' · '+esc(schoolName()):''}</div>
<h1>${gr}, <span>${esc(first)}</span></h1>
<div class="rc-tags">${own?`<span class="tag">${esc(own)}</span><span class="tag">${yr(yv)}</span>`:''}${me.section?`<span class="tag">${esc(me.section)}</span>`:''}</div>
<div class="row">${own?`<a class="btn" href="#course">${icon('course',16)} Open my course</a>`:`<a class="btn" href="#settings">Choose your course</a>`}<a class="btn g" href="#archive">${icon('archive',16)} Browse archive</a></div></div></section>
<div class="sc-grid" role="navigation" aria-label="Shortcuts">${tile('#archive','archive','Archive')}${tile('#exams','exams','Mock Exams')}${tile('#chat','chat','Chat',un)}${tile('#announcements','megaphone','Announcements',an)}${tile('#dash','dash','Dashboard')}</div>
${admin}
<div class="home-grid"><div class="home-main">
<section class="card" id="ann-home" aria-label="Announcements">${annHomeHTML()}</section>
${cont.length?`<section class="card"><div class="ch">${icon('clock',18)}<span>Continue studying</span></div><div class="strip">${cont.map(miniCard).join('')}</div></section>`:''}
<section class="card"><div class="ch">${icon('upload',18)}<span>Recently uploaded</span><a href="#archive">View all</a></div>${newest.length?newest.map(r=>`<div class="li"><div class="grow">${fileBadge(r.type)} <a href="#r/${r.id}"><b class="tr">${esc(r.title)}</b></a><div class="mt sm tr">${esc(r.subject)} · ${esc(fmtDate(r.date))}</div></div>${isStaff()?`<button class="btn g sbtn" aria-label="Edit ${esc(r.title)}" onclick="openReviewerForm(${r.id})">${icon('edit',15)}</button>`:''}<button class="btn g sbtn" aria-label="Download ${esc(r.title)}" onclick="dl(${r.id})">${icon('download',15)}</button></div>`).join(''):`<p class="mt">No reviewers yet.${isStaff()?' Use Upload reviewer to add the first one.':''}</p>`}</section>
</div><aside class="home-side">
<section class="card"><div class="ch">${icon('course',18)}<span>${own?'My subjects':'Subjects'}</span><a href="${own?'#course':'#archive'}">${own?'My Course':'Archive'}</a></div>
${(own?[...new Set(rows.map(x=>x.subject))]:SUBJ.slice(0,8)).slice(0,8).map(s=>`<a class="chip-link" href="${subLink(s)}">${icon('book',15)}<span class="tr">${esc(s)}</span>${icon('chev',14)}</a>`).join('')||'<p class="mt">No subjects yet.</p>'}</section>
<section class="card"><div class="ch">${icon('exams',18)}<span>Available mock exams</span><a href="#exams">View all</a></div>${exams.length?exams.map(e=>`<div class="li"><div class="grow"><a href="#exam/${e.id}"><b class="tr">${esc(e.title)}</b></a><div class="mt sm tr">${esc(e.subject)} · ${e.q.length} questions · ${e.mins} min</div></div><a class="btn g sbtn" href="#exam/${e.id}">Start</a></div>`).join(''):'<p class="mt">No mock exams yet.</p>'}</section></aside></div>`;
};

/* titles + descriptions for pages that kept their own markup */
const _vSettings=V.settings;V.settings=()=>{_vSettings();const h=app.querySelector('h2');if(h)h.outerHTML=pageHead('Settings','Update your course, year level and section.',[['Settings']])};
const _vDash=V.dash;V.dash=()=>{_vDash();app.insertAdjacentHTML('afterbegin',pageHead('Dashboard','Your study overview and activity.',[['Dashboard']]))};
const _vCourse=V.course;V.course=()=>{_vCourse();app.insertAdjacentHTML('afterbegin',`<div class="bc" role="navigation" aria-label="Breadcrumb"><ol><li><a href="#home">Home</a></li><li aria-current="page"><span>My Course</span></li></ol></div>`)};
const _vr0=V.r;V.r=id=>{
  _vr0(id);const r=R.find(x=>x.id==id);if(!r)return;recentAdd(r.id);
  const h=app.querySelector('a.mt[href="#archive"]');
  const bc=`<div class="bc" role="navigation" aria-label="Breadcrumb"><ol><li><a href="#home">Home</a></li><li><a href="#archive">Archive</a></li><li><a href="${subLink(r.subject)}">${esc(r.subject)}</a></li><li aria-current="page"><span>${esc(annExcerpt(r.title,40))}</span></li></ol></div>`;
  if(h)h.outerHTML=bc;else app.insertAdjacentHTML('afterbegin',bc);
};
