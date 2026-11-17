/* "Active now" (presence), People, Friends and Profile.
   Backend: community_v9.sql. People appear by CODE NAME only (never real name or email) and only within the same school.
   Online status uses Supabase Realtime Presence plus a last-seen heartbeat. Anyone can switch it off in Settings > Privacy. */
let ONLINE=new Set(),PRES=null,BEAT=null,FR={incoming:0,list:[]},PP={tab:'friends',q:'',res:[],state:'idle',err:''};
const seenRecent=s=>!!s&&Date.now()-new Date(s)<150000;
const isOnline=(u,s)=>(u&&me&&u===me.id)?(prefs().showStatus&&!!live()):(ONLINE.has(u)||seenRecent(s));
const statusText=(u,s)=>isOnline(u,s)?'Online now':(s?'Last seen '+relTime(s):'');
const presDot=(u,s)=>`<i class="pdot ${isOnline(u,s)?'on':''}" data-u="${esc(u||'')}" data-s="${esc(s||'')}" title="${esc(statusText(u,s))||'Offline'}"></i>`;
const avatar=(name,u,s,cls='')=>`<span class="av2 ${cls}" aria-hidden="true">${initial(name)}${presDot(u,s)}</span>`;
const sErr=e=>{const m=(e&&e.message)||String(e||'');return /relation|schema cache|does not exist|function .* not/i.test(m)?'Run community_v9.sql in Supabase first.':/Failed to fetch|network/i.test(m)?'Connection problem. Try again.':m};
async function rpc(n,a){const r=await sb.rpc(n,a||{});if(r.error)throw r.error;return r.data}
const sid=()=>HAS_SCH?SCH:null;

/* ---------- presence ---------- */
function paintDots(){
  document.querySelectorAll('.pdot[data-u]').forEach(d=>{const on=isOnline(d.dataset.u,d.dataset.s);d.classList.toggle('on',on);d.title=statusText(d.dataset.u,d.dataset.s)||'Offline'});
  const n=ONLINE.size,el=document.getElementById('cp-on');if(el){el.hidden=!n;el.innerHTML=`<i class="pdot on"></i> ${n} online`}
  const po=document.getElementById('pp-online');if(po)po.textContent=n?`${n} online now`:'';
}
async function seenBeat(){if(live()&&me&&me.id&&prefs().showStatus&&!document.hidden)try{await sb.rpc('touch_seen')}catch(e){}}
function presStart(){
  if(!live()||!me||!me.id||PRES)return;const s=me.school_id||SCH;if(!s)return;
  PRES=sb.channel('presence-'+s,{config:{presence:{key:me.id}}});
  PRES.on('presence',{event:'sync'},()=>{ONLINE=new Set(Object.keys(PRES.presenceState()));paintDots()})
    .subscribe(async st=>{if(st==='SUBSCRIBED'&&prefs().showStatus)try{await PRES.track({at:Date.now()})}catch(e){}});
  seenBeat();BEAT=setInterval(seenBeat,60000);
}
function presStop(){if(BEAT)clearInterval(BEAT);BEAT=null;if(PRES&&live())sb.removeChannel(PRES);PRES=null;ONLINE=new Set()}
async function socialStatusChanged(v){
  if(!live()||!me)return;
  try{if(PRES){v?await PRES.track({at:Date.now()}):await PRES.untrack()}}catch(e){}
  if(me.id)sb.from('profiles').update({show_status:v}).eq('id',me.id).then(()=>{},()=>{});
  paintDots();
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)seenBeat()});
const _suSoc=window.setUser;
window.setUser=function(){_suSoc();if(me&&live()){presStart();frRefresh()}else{presStop();FR={incoming:0,list:[]};frBadge()}};

/* ---------- friends ---------- */
function frBadge(){const b=document.getElementById('nb-people');if(b){b.textContent=FR.incoming>99?'99+':(FR.incoming?String(FR.incoming):'');b.hidden=!FR.incoming}}
async function frRefresh(){if(!live()||!me)return;try{FR.list=await rpc('friends_overview',{sid:sid()});FR.incoming=FR.list.filter(f=>f.status=='received').length;frBadge()}catch(e){}}
async function friendAct(kind,id,name){
  try{
    if(kind=='add'){const r=await rpc('friend_request',{target:id});toast(r=='friends'?'You are now friends with '+name:'Friend request sent to '+name)}
    else if(kind=='accept'){await rpc('friend_respond',{fid:id,accept:true});toast('You are now friends with '+name)}
    else if(kind=='decline'){await rpc('friend_respond',{fid:id,accept:false});toast('Request declined')}
    else if(kind=='cancel'){await rpc('friend_remove',{target:id});toast('Request cancelled')}
    await frRefresh();socialRefresh();
  }catch(e){toast(sErr(e),'err')}
}
function friendRemoveAsk(id,name){ask('Remove friend?',esc(name)+' will be removed from your friends. You can add each other again later.','Remove',()=>friendAct('cancel',id,name))}
function socialRefresh(){const h=location.hash.slice(1).split('/');if(h[0]=='people')peopleLoad();else if(h[0]=='profile')V.profile(h[1])}
function friendBtn(p){
  const id=p.person_id,n=esc(p.code_name),st=p.friend_status||p.status;
  if(st=='me')return '';
  if(st=='friends')return `<button class="btn g sm" data-i="${id}" data-n="${n}" onclick="friendRemoveAsk(this.dataset.i,this.dataset.n)">${icon('check',15)} Friends</button>`;
  if(st=='sent')return `<button class="btn g sm" data-i="${id}" data-n="${n}" onclick="friendAct('cancel',this.dataset.i,this.dataset.n)">Requested · Cancel</button>`;
  if(st=='received'){const f=p.friendship_id;return `<button class="btn sm" data-f="${f}" data-n="${n}" onclick="friendAct('accept',+this.dataset.f,this.dataset.n)">Accept</button><button class="btn g sm" data-f="${f}" data-n="${n}" onclick="friendAct('decline',+this.dataset.f,this.dataset.n)">Decline</button>`}
  return `<button class="btn sm" data-i="${id}" data-n="${n}" onclick="friendAct('add',this.dataset.i,this.dataset.n)">${icon('plus',15)} Add friend</button>`;
}
function personRow(p){
  const id=p.person_id,seen=p.last_seen,meta=[p.course,p.year_level?yr(p.year_level):''].filter(Boolean).map(esc).join(' · '),st=statusText(id,seen);
  return `<div class="prow card">${avatar(p.code_name,id,seen)}<div class="grow"><a href="#profile/${id}"><b class="tr">${esc(p.code_name)}</b></a><div class="mt sm tr">${meta||'&nbsp;'}</div>${st?`<div class="pst ${isOnline(id,seen)?'on':''}">${esc(st)}</div>`:''}</div><div class="pact">${friendBtn(p)}</div></div>`;
}

/* ---------- People page ---------- */
async function peopleLoad(){
  const box=document.getElementById('pp-body');if(!box)return;
  PP.state='loading';box.innerHTML=skel(3);
  try{
    if(PP.tab=='find'){PP.res=await rpc('people_search',{q:PP.q,lim:40,sid:sid()});PP.res.sort((a,b)=>isOnline(b.person_id,b.last_seen)-isOnline(a.person_id,a.last_seen))}
    else{FR.list=await rpc('friends_overview',{sid:sid()});FR.incoming=FR.list.filter(f=>f.status=='received').length;frBadge()}
    PP.state='ready';
  }catch(e){PP.state='error';PP.err=sErr(e)}
  peopleDraw();
}
function peopleDraw(){
  const box=document.getElementById('pp-body');if(!box)return;
  if(PP.state=='error'){box.innerHTML=errorState(PP.err,'peopleLoad()');return}
  if(PP.state!='ready')return;
  const norm=f=>({...f,friend_status:f.status});
  if(PP.tab=='find'){box.innerHTML=PP.res.length?`<div class="pgrid">${PP.res.map(personRow).join('')}</div>`:emptyState('users',PP.q?'No one found':'No one here yet',PP.q?'Try a different code name.':'People from your school will appear here once they join.');}
  else if(PP.tab=='requests'){const r=FR.list.filter(f=>f.status=='received'||f.status=='sent').map(norm);box.innerHTML=r.length?`<div class="pgrid">${r.map(personRow).join('')}</div>`:emptyState('users','No pending requests','Friend requests you send or receive show up here.','<button class="btn" onclick="PP.tab=\'find\';V.people()">Find people</button>')}
  else{const r=FR.list.filter(f=>f.status=='friends').map(norm).sort((a,b)=>isOnline(b.person_id,b.last_seen)-isOnline(a.person_id,a.last_seen));box.innerHTML=r.length?`<div class="pgrid">${r.map(personRow).join('')}</div>`:emptyState('users','No friends yet','Find classmates and send a friend request.','<button class="btn" onclick="PP.tab=\'find\';V.people()">Find people</button>')}
  paintDots();
}
V.people=()=>{
  if(!me)return location.hash='#login';
  if(!live()){app.innerHTML=pageHead('People','Find classmates, see who is online and manage friends.',[['People']])+emptyState('users','People needs a live connection','Friends and online status work once the site is connected to Supabase.');return}
  const inc=FR.list.filter(f=>f.status=='received').length,tab=(k,l,n)=>`<button type="button" role="tab" aria-selected="${PP.tab==k}" class="chip ${PP.tab==k?'on':''}" onclick="PP.tab='${k}';V.people()">${l}${n?` <i class="nb" style="margin-left:4px">${n}</i>`:''}</button>`;
  app.innerHTML=pageHead('People','Find classmates, see who is online and manage friends.',[['People']],`<span class="pp-on" id="pp-online"></span><a class="btn g" href="#profile">${icon('user',16)} My profile</a>`)+
    `<div class="tabs-scroll" role="tablist">${tab('friends','Friends',0)}${tab('requests','Requests',inc)}${tab('find','Find people',0)}</div>`+
    (PP.tab=='find'?`<label class="f-search" style="margin-bottom:14px">${icon('search',18)}<input id="ppq" type="search" placeholder="Search by code name" value="${esc(PP.q)}" aria-label="Search people" autocomplete="off"></label>`:'')+`<div id="pp-body"></div>`;
  const q=document.getElementById('ppq');if(q){let t=0;q.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{PP.q=q.value;peopleLoad()},300)}}
  peopleLoad();paintDots();
};

/* ---------- Profile ---------- */
V.profile=async id=>{
  if(!me)return location.hash='#login';
  if(!live()){app.innerHTML=pageHead('Profile','',[['People','#people'],['Profile']])+emptyState('user','Profiles need a live connection','This works once the site is connected to Supabase.');return}
  const uid=id||me.id;app.innerHTML=pageHead('Profile','',[['People','#people'],['Profile']])+skel(2,'tall');
  let p;try{const r=await rpc('person_get',{uid,sid:sid()});p=r&&r[0]}catch(e){app.innerHTML=pageHead('Profile','',[['People','#people'],['Profile']])+errorState(sErr(e),`V.profile('${id||''}')`);return}
  if(location.hash.slice(1).split('/')[0]!='profile')return;
  if(!p){app.innerHTML=pageHead('Profile','',[['People','#people'],['Profile']])+emptyState('user','Profile not found','This person may be in another school or no longer active.','<a class="btn" href="#people">Back to People</a>');return}
  const seen=p.last_seen,own=p.is_me,meta=[p.course,p.year_level?yr(p.year_level):''].filter(Boolean).map(esc).join(' · ');
  app.innerHTML=pageHead(p.code_name,own?'This is how classmates see you.':'',[['People','#people'],[p.code_name]])+
`<section class="card prof"><div class="prof-h">${avatar(p.code_name,p.person_id,seen,'xl')}<div class="grow"><h2>${esc(p.code_name)} ${p.role!='student'?`<span class="cs gold">${esc(p.role)}</span>`:''}</h2><div class="mt">${meta||'No course set yet'}</div><div class="pst ${isOnline(p.person_id,seen)?'on':''}">${esc(statusText(p.person_id,seen)||(own?'':'Offline'))}</div></div><div class="pact">${friendBtn(p)}</div></div>
<div class="prof-b">${own?`<label class="fl sm" for="pbio">Bio</label><textarea id="pbio" rows="3" maxlength="160" placeholder="Tell classmates a little about you (optional)">${esc(p.bio||'')}</textarea><div class="mt sm" style="display:flex;justify-content:space-between;margin-top:4px"><span id="pbioe" class="err" style="min-height:0"></span><span id="pbioc"></span></div><div class="row"><button class="btn" id="pbios">Save bio</button><a class="btn g" href="#settings">Preferences</a></div>`:`<p class="bio">${p.bio?esc(p.bio):'<span class="mt">No bio yet.</span>'}</p>`}</div>
<div class="prof-s"><div><b>${p.post_count}</b><span>Forum posts</span></div><div><b>${esc(fmtDate(p.joined))}</b><span>Joined</span></div></div></section>`;
  paintDots();
  if(own){const t=document.getElementById('pbio'),c=document.getElementById('pbioc'),cnt=()=>c.textContent=t.value.length+'/160';t.oninput=cnt;cnt();
    document.getElementById('pbios').onclick=async e=>{const b=e.target;b.disabled=true;const bio=t.value.trim()||null;
      const r=await sb.from('profiles').update({bio}).eq('id',me.id);b.disabled=false;
      if(r.error){document.getElementById('pbioe').textContent=r.error.message;toast(r.error.message,'err')}else{me.bio=bio;toast('Bio saved')}}}
};
