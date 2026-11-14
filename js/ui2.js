/* Shared UI layer (design system helpers, navigation, global search).
   Loaded after content.js. Other files use: icon(), pageHead(), skel(), emptyState(), fileBadge(), fmtDate(), relTime(), openSearch(). */

/* ---------- icons (one consistent set: 24px, 2px rounded strokes) ---------- */
const IC={
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  course:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  archive:'<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  exams:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  chat:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  admin:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus:'<path d="M5 12h14M12 5v14"/>',
  megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  file:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  school:'<path d="m3 9 9-6 9 6"/><path d="M4 9v10M20 9v10M8 21V12M16 21V12M2 21h20"/>',
  pin:'<path d="M12 17v5"/><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V17h14v-1.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  reply:'<path d="m9 17-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const icon=(n,s=20,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC[n]||''}</svg>`;

/* ---------- page header with breadcrumbs ---------- */
function pageHead(title,desc,crumbs,actions){
  const list=[['Home','#home']].concat(crumbs||[]);
  const bc=crumbs&&crumbs.length?`<div class="bc" role="navigation" aria-label="Breadcrumb"><ol>${list.map((c,i)=>i==list.length-1?`<li aria-current="page"><span>${esc(c[0])}</span></li>`:`<li><a href="${esc(c[1])}">${esc(c[0])}</a></li>`).join('')}</ol></div>`:'';
  return `<header class="pgh">${bc}<div class="pgh-row"><div class="pgh-t"><h1>${esc(title)}</h1>${desc?`<p>${esc(desc)}</p>`:''}</div>${actions?`<div class="pgh-a">${actions}</div>`:''}</div></header>`;
}
const skel=(n=3,cls='')=>`<div class="sk-list ${cls}" aria-hidden="true">${'<div class="sk"></div>'.repeat(n)}</div>`;
const emptyState=(ic,title,text,action)=>`<div class="empty card"><div class="empty-ic">${icon(ic,28)}</div><h3>${esc(title)}</h3>${text?`<p>${esc(text)}</p>`:''}${action||''}</div>`;
const errorState=(msg,retry)=>`<div class="empty card err" role="alert"><div class="empty-ic">${icon('alert',28)}</div><h3>Something went wrong</h3><p>${esc(msg)}</p>${retry?`<button class="btn" onclick="${retry}">Try again</button>`:''}</div>`;

/* ---------- file type badges, dates ---------- */
const FTC={PDF:'#e07a5f',DOC:'#6f9ceb',DOCX:'#6f9ceb',PPT:'#e9a23b',PPTX:'#e9a23b',XLS:'#8fd19e',XLSX:'#8fd19e',CSV:'#8fd19e',PNG:'#c58bd9',JPG:'#c58bd9',JPEG:'#c58bd9',GIF:'#c58bd9',WEBP:'#c58bd9',SVG:'#c58bd9',MP4:'#e06c9f',MOV:'#e06c9f',WEBM:'#e06c9f',MP3:'#5fc4c0',WAV:'#5fc4c0',ZIP:'#a99b8b',RAR:'#a99b8b',TXT:'#d6a15d'};
const fileBadge=t=>{const T=String(t||'FILE').toUpperCase();return `<span class="ftb" style="--c:${FTC[T]||'#d6a15d'}" title="${esc(T)} file">${esc(T.slice(0,4))}</span>`};
const fmtDate=i=>{if(!i)return '';const d=new Date(i);return isNaN(d)?'':d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})};
const fmtDateTime=i=>{const d=new Date(i);return isNaN(d)?'':d.toLocaleString('en',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})};
function relTime(i){const d=new Date(i);if(isNaN(d))return '';const s=(Date.now()-d)/1000;
  if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';
  if(s<172800)return 'Yesterday';if(s<604800)return Math.floor(s/86400)+' days ago';return fmtDate(i)}

/* whole card clickable (links and buttons inside keep working) */
document.addEventListener('click',e=>{
  const c=e.target.closest&&e.target.closest('[data-href]');
  if(!c||e.target.closest('a,button,select,input,textarea,label,summary,.sdd'))return;
  const sel=window.getSelection&&String(window.getSelection());if(sel)return;
  location.hash=c.getAttribute('data-href');
});

/* ---------- recently viewed (real activity, kept per user in this browser) ---------- */
const recentKey=()=>'mip_recent_'+((me&&me.id)||(me&&me.email)||'x');
function recentList(){try{return JSON.parse(localStorage.getItem(recentKey())||'[]').filter(i=>R.some(r=>r.id==i))}catch(e){return []}}
function recentAdd(id){try{const l=[id].concat(recentList().filter(x=>x!=id)).slice(0,12);localStorage.setItem(recentKey(),JSON.stringify(l))}catch(e){}}

/* ---------- navigation (built once, so every page uses the same items) ---------- */
const NAV_MAIN=[['home','Home','home'],['course','My Course','course'],['dash','Dashboard','dash'],['archive','Archive','archive'],['exams','Mock Exams','exams'],['chat','Chat','chat']];
const TAB_ITEMS=[['home','Home','home'],['course','Course','course'],['archive','Archive','archive'],['exams','Exams','exams'],['chat','Chat','chat'],['settings','Me','user']];
function buildNav(){
  const side=document.getElementById('side');
  if(side){
    side.setAttribute('aria-label','Main navigation');
    side.innerHTML=`<div class="sl">General</div>${NAV_MAIN.map(n=>`<a href="#${n[0]}">${icon(n[2])}<span>${n[1]}</span>${n[0]=='chat'?'<i class="nb" id="nb-chat" hidden></i>':''}</a>`).join('')}
<div class="sl">Subjects</div><div id="sidesubs"></div>
<div class="sl">Account</div><a href="#settings">${icon('user')}<span>Settings</span></a><a href="#" onclick="confirmLogout();return false">${icon('logout')}<span>Sign out</span></a>`;
  }
  const tabs=document.getElementById('tabs');
  if(tabs){tabs.setAttribute('aria-label','Quick navigation');tabs.innerHTML=TAB_ITEMS.map(n=>`<a href="#${n[0]}">${icon(n[2],22)}<span>${n[1]}</span>${n[0]=='chat'?'<i class="nb" id="nb-chat-tab" hidden></i>':''}</a>`).join('')}
  const nav=document.querySelector('nav');
  if(nav&&!document.getElementById('srbtn')){
    const old=nav.querySelector('form.sp');if(old)old.remove();
    nav.querySelectorAll(':scope > a:not(.logo)').forEach(a=>a.remove());
    const who=document.getElementById('who');
    const html=`<button type="button" id="srbtn" class="sr-btn" onclick="openSearch('')" aria-label="Search reviewers, subjects, courses and mock exams">${icon('search',18)}<span class="sr-t">Search reviewers, subjects, courses, exams…</span><kbd>Ctrl K</kbd></button>
<button type="button" id="bell" class="bell" onclick="location.hash='#announcements'" aria-label="Announcements" title="Announcements" hidden>${icon('bell',20)}<i class="nb" id="nb-ann" hidden></i></button>`;
    who?who.insertAdjacentHTML('beforebegin',html):nav.insertAdjacentHTML('beforeend',html);
  }
}
buildNav();

/* which nav item is "on" for pages that sit under another section */
const NAVMAP={r:'archive',subject:'archive',exam:'exams',announcements:'home',announcement:'home'};
const PAGE_TITLES={home:'Home',course:'My Course',dash:'Dashboard',archive:'Archive',exams:'Mock Exams',exam:'Mock Exam',chat:'Chat',admin:'Admin Panel',settings:'Settings',about:'About Us',announcements:'Announcements',announcement:'Announcement',subject:'Subject',r:'Reviewer',login:'Sign in',welcome:'Welcome'};
function navState(){
  const h=(location.hash.slice(1)||'home').split('/')[0],key=NAVMAP[h]||h;
  document.querySelectorAll('#side a,#tabs a').forEach(a=>{const on=a.getAttribute('href')=='#'+key;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  document.body.classList.toggle('chat-open',h=='chat');
  document.title=(PAGE_TITLES[h]||'MIPMIP Files')+' · MIPMIP Files';
  const m=document.getElementById('app');if(m&&!m.hasAttribute('tabindex'))m.setAttribute('tabindex','-1');
}
addEventListener('hashchange',navState);
new MutationObserver(()=>{if(document.body.classList.contains('in')){const b=document.getElementById('bell');if(b)b.hidden=!(typeof ANN_OK!='undefined'&&ANN_OK)}}).observe(document.body,{attributes:true,attributeFilter:['class']});

/* ---------- global search (reviewers, subjects, courses, topics, mock exams, pages) ---------- */
const PAGES=()=>{const a=[['Home','#home','home'],['My Course','#course','course'],['Dashboard','#dash','dash'],['Archive','#archive','archive'],['Mock Exams','#exams','exams'],['Chat','#chat','chat'],['Announcements','#announcements','megaphone'],['Settings','#settings','user'],['About Us','#about','info']];if(typeof isAdmin=='function'&&isAdmin())a.splice(6,0,['Admin Panel','#admin','admin']);return a};
function scoreOf(text,q){const t=String(text||'').toLowerCase();if(!t)return 0;if(t==q)return 100;if(t.startsWith(q))return 70;if(t.split(/[\s:·\-_/]+/).some(w=>w.startsWith(q)))return 50;return t.includes(q)?25:0}
function searchAll(raw){
  const q=raw.trim().toLowerCase(),G=[];
  if(!q){
    const rec=recentList().map(id=>R.find(r=>r.id==id)).filter(Boolean).slice(0,4);
    if(rec.length)G.push({name:'Recently viewed',items:rec.map(r=>({ic:'file',t:r.title,s:r.subject,href:'#r/'+r.id,badge:r.type}))});
    G.push({name:'Go to',items:PAGES().map(p=>({ic:p[2],t:p[0],s:'',href:p[1]}))});
    return G;
  }
  const pick=(arr,fn,n=5)=>arr.map(x=>[fn(x),x]).filter(p=>p[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,n).map(p=>p[1]);
  const rv=pick(R,r=>Math.max(scoreOf(r.title,q),scoreOf(r.subject,q)*.8,...r.topics.map(t=>scoreOf(t,q)*.7),scoreOf(r.section,q)*.6));
  if(rv.length)G.push({name:'Reviewers',items:rv.map(r=>({ic:'file',t:r.title,s:r.subject+' · '+r.exam,href:'#r/'+r.id,badge:r.type}))});
  const ex=pick(E,e=>Math.max(scoreOf(e.title,q),scoreOf(e.subject,q)*.8));
  if(ex.length)G.push({name:'Mock exams',items:ex.map(e=>({ic:'exams',t:e.title,s:e.subject+' · '+e.q.length+' questions',href:'#exam/'+e.id}))});
  const sb=pick(SUBJ,s=>scoreOf(s,q));
  if(sb.length)G.push({name:'Subjects',items:sb.map(s=>({ic:'book',t:s,s:R.filter(r=>r.subject==s).length+' reviewers · '+E.filter(e=>e.subject==s).length+' exams',href:'#subject/'+encodeURIComponent(s)}))});
  const cs=pick(COURSES,c=>scoreOf(c,q),4);
  if(cs.length)G.push({name:'Courses',items:cs.map(c=>({ic:'course',t:c,s:CS.filter(x=>x.course==c).length+' subjects',act:()=>{AF.course=c;AF.sub='';AF.q='';location.hash=='#archive'?route():location.hash='#archive'}}))});
  const tp=pick([...new Set(R.flatMap(r=>r.topics))],t=>scoreOf(t,q),4);
  if(tp.length)G.push({name:'Topics',items:tp.map(t=>({ic:'search',t:t,s:R.filter(r=>r.topics.includes(t)).length+' reviewers',act:()=>{pq=t;location.hash=='#archive'?route():location.hash='#archive'}}))});
  const pg=pick(PAGES(),p=>scoreOf(p[0],q),3);
  if(pg.length)G.push({name:'Pages',items:pg.map(p=>({ic:p[2],t:p[0],s:'',href:p[1]}))});
  return G;
}
function closeSearch(){const d=document.getElementById('srov');if(d){d.remove();document.body.classList.remove('sr-open')}removeEventListener('keydown',srKey,true)}
function srKey(e){if(e.key=='Escape'){e.stopPropagation();closeSearch()}}
function openSearch(init){
  if(!me||document.getElementById('srov'))return;
  const d=document.createElement('div');d.id='srov';d.className='sr-ov';
  d.innerHTML=`<div class="sr-box" role="dialog" aria-modal="true" aria-label="Search"><div class="sr-in">${icon('search',20)}<input id="srq" type="search" placeholder="Search reviewers, subjects, courses, topics, exams…" autocomplete="off" aria-label="Search" aria-controls="srl" aria-autocomplete="list" enterkeyhint="search"><button type="button" class="sr-x" aria-label="Close search">${icon('x',18)}</button></div><div class="sr-l" id="srl" role="listbox" aria-live="polite"></div><div class="sr-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div>`;
  document.body.appendChild(d);document.body.classList.add('sr-open');
  const inp=d.querySelector('#srq'),list=d.querySelector('#srl');let flat=[],hi=0;
  const draw=()=>{
    const G=searchAll(inp.value);flat=[];
    list.innerHTML=G.length?G.map(g=>`<div class="sr-g">${esc(g.name)}</div>`+g.items.map(it=>{const k=flat.push(it)-1;return `<div class="sr-i ${k==hi?'hi':''}" role="option" data-k="${k}" aria-selected="${k==hi}">${icon(it.ic||'file',18)}<div class="sr-m"><b>${esc(it.t)}</b>${it.s?`<span>${esc(it.s)}</span>`:''}</div>${it.badge?fileBadge(it.badge):''}${icon('chev',16,'sr-go')}</div>`}).join('')).join('')
      :`<div class="sr-none">${icon('search',26)}<p>No results for <b>“${esc(inp.value.trim())}”</b></p><span>Try a subject name, a topic or a course.</span></div>`;
    if(inp.value.trim()&&G.length)list.insertAdjacentHTML('beforeend',`<div class="sr-g">Not what you meant?</div><div class="sr-i" role="option" data-k="all">${icon('archive',18)}<div class="sr-m"><b>Search the archive for “${esc(inp.value.trim())}”</b></div>${icon('chev',16,'sr-go')}</div>`);
    const h=list.querySelector('.hi');if(h&&h.scrollIntoView)h.scrollIntoView({block:'nearest'});
  };
  const go=it=>{
    closeSearch();
    if(it==='all'){pq=inp.value.trim();location.hash=='#archive'?route():location.hash='#archive';return}
    if(it.act)it.act();else location.hash=it.href;
  };
  inp.oninput=()=>{hi=0;draw()};
  inp.onkeydown=e=>{
    if(e.key=='ArrowDown'){hi=Math.min(flat.length-1,hi+1);draw();e.preventDefault()}
    else if(e.key=='ArrowUp'){hi=Math.max(0,hi-1);draw();e.preventDefault()}
    else if(e.key=='Enter'){e.preventDefault();if(flat[hi])go(flat[hi]);else if(inp.value.trim())go('all')}
  };
  list.onmousemove=e=>{const i=e.target.closest('.sr-i');if(i&&i.dataset.k!='all'&&+i.dataset.k!=hi){hi=+i.dataset.k;list.querySelectorAll('.sr-i').forEach(x=>{const on=x.dataset.k==String(hi);x.classList.toggle('hi',on);x.setAttribute('aria-selected',on)})}};
  list.onclick=e=>{const i=e.target.closest('.sr-i');if(!i)return;go(i.dataset.k=='all'?'all':flat[+i.dataset.k])};
  d.addEventListener('mousedown',e=>{if(e.target===d)closeSearch()});
  d.querySelector('.sr-x').onclick=closeSearch;
  addEventListener('keydown',srKey,true);
  if(init)inp.value=init;
  draw();inp.focus();
}
window.palette=()=>openSearch('');
