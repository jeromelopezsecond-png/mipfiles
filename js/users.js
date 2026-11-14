/* Admin Panel > Users.
   Reads and writes the real `profiles` table. The database (RLS + guard trigger) decides what an admin may change:
   only admins of that school (or platform admins) can edit people, and nobody except a platform admin can move someone to another school. */
let USERS=[],USR={state:'idle',err:'',q:'',role:'',yr:'',status:'',limit:60};
const U_ROLES=['student','moderator','admin'];
const uStatus=u=>u.suspended?'suspended':'active';
const isSelf=u=>!!me&&((u.id&&u.id===me.id)||(u.email&&me.email&&u.email.toLowerCase()===String(me.email).toLowerCase()));
const uSchool=u=>{const s=SCHOOLS.find(x=>x.id==u.school_id);return s?s.name:(u.school_id?'School #'+u.school_id:'All schools (platform)')};
const uErr=e=>{const m=(e&&e.message)||String(e||'');
  return /username_key|profiles_username|duplicate key|unique/i.test(m)?'That username is already taken.':/Not allowed to change role|Only a platform admin/i.test(m)?'Only admins can change roles and account status.':/Not allowed to change school/i.test(m)?'Only a platform admin can change someone’s school.':/row-level|polic|permission|multiple \(or no\) rows/i.test(m)?'You are not allowed to change this account.':/violates check|check constraint/i.test(m)?'One of the values is not valid.':/foreign key|profiles_school_course/i.test(m)?'That course does not belong to this school.':m};

async function usersLoad(force){
  if(USR.state=='loading')return;
  USR.state='loading';usersDraw();
  if(!live()){
    USERS=(typeof users!='undefined'?users:[]).map(u=>({id:u.id||u.email,email:u.email,full_name:u.name,username:u.username||'',role:u.role,suspended:!!u.suspended,year_level:u.year||u.year_level||null,course:u.course||null,section:u.section||null,school_id:u.school_id||null,_demo:u}));
    USR.state='ready';usersDraw();return;
  }
  let q=sb.from('profiles').select('id,email,full_name,username,role,suspended,year_level,course,section,school_id,created_at').order('created_at',{ascending:false}).limit(1000);
  if(HAS_SCH&&SCH!=null)q=q.eq('school_id',SCH);
  const {data,error}=await q;
  if(error){USR.state='error';USR.err=uErr(error);usersDraw();return}
  USERS=data||[];USR.state='ready';usersDraw();
}
function usersFiltered(){
  const q=USR.q.trim().toLowerCase();
  return USERS.filter(u=>(!USR.role||u.role==USR.role)&&(!USR.yr||(USR.yr=='none'?!u.year_level:String(u.year_level)==USR.yr))&&(!USR.status||uStatus(u)==USR.status)&&(!q||[u.full_name,u.username,u.email].join(' ').toLowerCase().includes(q)));
}
const roleChip=r=>`<span class="cs ${r=='admin'?'gold':r=='moderator'?'ok':''}">${esc(r)}</span>`;
const statusChip=u=>`<span class="cs ${u.suspended?'bad':'ok'}"><i class="sdot"></i>${u.suspended?'Suspended':'Active'}</span>`;

function admUsers(){
  const box=document.getElementById('adm');if(!box)return;
  if(USR.state=='idle'||USR.state=='error'&&!USERS.length){usersLoad();}
  box.innerHTML=`<div id="u-stats"></div>
<section class="card fbar" aria-label="Filter users"><label class="f-search">${icon('search',18)}<input id="uq" type="search" placeholder="Search by name, username or email" value="${esc(USR.q)}" aria-label="Search users" autocomplete="off"></label>
<div class="f-grid"><div class="f-f"><label for="ur">Role</label><select id="ur"><option value="">All roles</option>${U_ROLES.map(r=>`<option value="${r}" ${USR.role==r?'selected':''}>${r[0].toUpperCase()+r.slice(1)}</option>`).join('')}</select></div>
<div class="f-f"><label for="uy">Year level</label><select id="uy"><option value="">All years</option>${[1,2,3,4].map(n=>`<option value="${n}" ${USR.yr==String(n)?'selected':''}>${yr(n)}</option>`).join('')}<option value="none" ${USR.yr=='none'?'selected':''}>No year set</option></select></div>
<div class="f-f"><label for="us">Status</label><select id="us"><option value="">All statuses</option><option value="active" ${USR.status=='active'?'selected':''}>Active</option><option value="suspended" ${USR.status=='suspended'?'selected':''}>Suspended</option></select></div></div>
<div class="f-foot"><span class="f-count" id="un" role="status" aria-live="polite"></span><button type="button" class="btn g sm" id="ux">Clear filters</button></div></section>
<div id="u-list"></div>`;
  const on=(id,k)=>{document.getElementById(id).oninput=document.getElementById(id).onchange=e=>{USR[k]=e.target.value;USR.limit=60;usersList()}};
  on('uq','q');on('ur','role');on('uy','yr');on('us','status');
  document.getElementById('ux').onclick=()=>{USR.q=USR.role=USR.yr=USR.status='';USR.limit=60;admUsers()};
  usersDraw();
}
function usersDraw(){
  const st=document.getElementById('u-stats'),list=document.getElementById('u-list');if(!st||!list)return;
  if(USR.state=='loading'||USR.state=='idle'){st.innerHTML='';list.innerHTML=skel(4,'tall');return}
  if(USR.state=='error'){st.innerHTML='';list.innerHTML=errorState(USR.err||'Could not load users.',"usersLoad(true)");return}
  const act=USERS.filter(u=>!u.suspended).length,sus=USERS.length-act,by=r=>USERS.filter(u=>u.role==r).length;
  st.innerHTML=`<div class="u-stats"><div class="card"><i>${icon('users',20)}</i><div><b>${USERS.length}</b><span>Total users</span><small>${by('student')} students · ${by('moderator')} moderators · ${by('admin')} admins</small></div></div>
<div class="card"><i class="ok">${icon('check',20)}</i><div><b>${act}</b><span>Active</span></div></div>
<div class="card"><i class="bad">${icon('alert',20)}</i><div><b>${sus}</b><span>Suspended</span></div></div></div>`;
  usersList();
}
function usersList(){
  const list=document.getElementById('u-list'),n=document.getElementById('un');if(!list)return;
  const L=usersFiltered(),shown=L.slice(0,USR.limit),active=!!(USR.q||USR.role||USR.yr||USR.status);
  if(n)n.textContent=active?`${L.length} of ${USERS.length} users`:`${USERS.length} user${USERS.length==1?'':'s'}`;
  const clr=document.getElementById('ux');if(clr)clr.disabled=!active;
  if(!L.length){list.innerHTML=emptyState('users',USERS.length?'No users match your filters':'No users yet',USERS.length?'Try a different name, role, year level or status.':'People who sign up for this school will appear here.',USERS.length?'<button class="btn" onclick="document.getElementById(\'ux\').click()">Clear filters</button>':'');return}
  const me_=isSelf;
  list.innerHTML=`<div class="utable-wrap card"><table class="utable"><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Year</th><th scope="col">Status</th><th scope="col"><span class="vh">Actions</span></th></tr></thead><tbody>${shown.map(u=>`<tr><td><div class="u-id"><span class="ms-av">${initial(u.full_name)}</span><div class="u-n"><b>${esc(u.full_name)}${me_(u)?' <em>(you)</em>':''}</b><span>@${esc(u.username||'—')} · ${esc(u.email)}</span></div></div></td><td>${roleChip(u.role)}</td><td>${u.year_level?esc(yr(u.year_level)):'<span class="mt">—</span>'}</td><td>${statusChip(u)}</td><td class="r"><button type="button" class="btn g sm" onclick="openUser('${esc(u.id)}')" aria-label="Manage ${esc(u.full_name)}">Manage</button></td></tr>`).join('')}</tbody></table></div>
<div class="ucards">${shown.map(u=>`<article class="card ucard"><div class="u-id"><span class="ms-av">${initial(u.full_name)}</span><div class="u-n"><b>${esc(u.full_name)}${me_(u)?' <em>(you)</em>':''}</b><span>@${esc(u.username||'—')}</span><span>${esc(u.email)}</span></div>${statusChip(u)}</div><div class="rc-tags">${roleChip(u.role)}<span class="tag">${u.year_level?esc(yr(u.year_level)):'No year'}</span>${u.course?`<span class="tag">${esc(u.course)}</span>`:''}</div><button type="button" class="btn g" onclick="openUser('${esc(u.id)}')" aria-label="Manage ${esc(u.full_name)}">Manage</button></article>`).join('')}</div>
${L.length>shown.length?`<div class="more"><button type="button" class="btn g" onclick="USR.limit+=60;usersList()">Show more (${L.length-shown.length} left)</button></div>`:''}`;
}

/* ---------- Manage: modal on desktop, bottom sheet on phones ---------- */
function openUser(id){
  const u=USERS.find(x=>String(x.id)==String(id));if(!u)return;
  const self=isSelf(u),courses=COURSES.slice();if(u.course&&!courses.includes(u.course))courses.push(u.course);
  modal(`<div class="sheet-h"><span class="ms-av big">${initial(u.full_name)}</span><div class="u-n"><h3 id="u_title">${esc(u.full_name)}</h3><div class="rc-tags" id="u_chips">${roleChip(u.role)}${statusChip(u)}</div></div></div>
<div class="f2"><div><label class="fl sm mt" for="u_n">Full name</label><input id="u_n" maxlength="40" value="${esc(u.full_name)}" autocomplete="off"></div>
<div><label class="fl sm mt" for="u_u">Username</label><input id="u_u" maxlength="20" value="${esc(u.username||'')}" autocomplete="off" autocapitalize="off"></div></div>
<label class="fl sm mt" for="u_e">Email</label><input id="u_e" value="${esc(u.email)}" readonly aria-describedby="u_eh"><div class="mt sm" id="u_eh">The email is tied to the sign-in account and cannot be changed here.</div>
<label class="fl sm mt" for="u_s">School</label><input id="u_s" value="${esc(uSchool(u))}" readonly>
<div class="f2"><div><label class="fl sm mt" for="u_c">Course</label><select id="u_c"><option value="">No course</option>${courses.map(c=>`<option value="${esc(c)}" ${c==u.course?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
<div><label class="fl sm mt" for="u_y">Year level</label><select id="u_y"><option value="">Not set</option>${[1,2,3,4].map(n=>`<option value="${n}" ${n==u.year_level?'selected':''}>${yr(n)}</option>`).join('')}</select></div>
<div><label class="fl sm mt" for="u_sec">Section</label><input id="u_sec" maxlength="20" value="${esc(u.section||'')}" autocomplete="off"></div>
<div><label class="fl sm mt" for="u_r">Account role</label><select id="u_r" ${self?'disabled':''}>${U_ROLES.map(r=>`<option value="${r}" ${r==u.role?'selected':''}>${r[0].toUpperCase()+r.slice(1)}</option>`).join('')}</select></div></div>
<div class="u-status"><div><b>Account status</b><span id="u_st">${u.suspended?'Suspended. This person cannot use the platform.':'Active. This person can sign in and use the platform.'}</span></div>
<button type="button" class="btn ${u.suspended?'':'g del'}" id="u_sus" ${self?'disabled':''}>${u.suspended?'Reactivate account':'Suspend account'}</button></div>
${self?'<div class="mt sm" id="u_self">You cannot change your own role or suspend your own account.</div>':''}
<div class="err" id="e_u" role="alert"></div>
<div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Close</button><button class="btn" id="u_ok" disabled>Save changes</button></div>`,{sheet:true});
  const val=()=>({full_name:$('#u_n').value.trim(),username:$('#u_u').value.trim().toLowerCase(),course:$('#u_c').value||null,year_level:$('#u_y').value?+$('#u_y').value:null,section:$('#u_sec').value.trim().toUpperCase()||null,role:$('#u_r').value});
  const orig={full_name:u.full_name,username:(u.username||'').toLowerCase(),course:u.course||null,year_level:u.year_level||null,section:(u.section||'').toUpperCase()||null,role:u.role};
  const dirty=()=>JSON.stringify(val())!==JSON.stringify(orig);
  const sync=()=>{$('#u_ok').disabled=!dirty();MD.dirty=dirty()};
  ['u_n','u_u','u_c','u_y','u_sec','u_r'].forEach(i=>{const el=document.getElementById(i);el.addEventListener('input',sync);el.addEventListener('change',sync)});
  const persist=async patch=>{
    if(!live()){Object.assign(u,patch);if(u._demo){const d=u._demo;if('full_name' in patch)d.name=patch.full_name;if('username' in patch)d.username=patch.username;if('role' in patch)d.role=patch.role;if('suspended' in patch)d.suspended=patch.suspended;if('year_level' in patch)d.year=d.year_level=patch.year_level;if('course' in patch)d.course=patch.course;if('section' in patch)d.section=patch.section}return true}
    const {data,error}=await sb.from('profiles').update(patch).eq('id',u.id).select().single();
    if(error){fe('e_u',uErr(error));toast(uErr(error),'err');return false}
    Object.assign(u,data);return true;
  };
  const save=async()=>{
    const v=val();fe('e_u','');
    if(v.full_name.length<2||v.full_name.length>40)return fe('e_u','Full name must be 2 to 40 characters.');
    if(!/^[a-z0-9_]{3,20}$/.test(v.username))return fe('e_u','Username must be 3 to 20 letters, numbers or underscores.');
    if(v.section&&!/^[A-Z0-9 \-]{1,20}$/.test(v.section))return fe('e_u','Section can only use letters, numbers, spaces and dashes.');
    const go=async()=>{
      const b=$('#u_ok');b.disabled=true;b.textContent='Saving…';
      const patch={};Object.keys(v).forEach(k=>{if(v[k]!==orig[k])patch[k]=v[k]});
      if(self)delete patch.role;
      if(await persist(patch)){closeModal(true);toast('Changes saved to '+u.full_name+'’s account');usersDraw()}
      else{b.disabled=false;b.textContent='Save changes'}
    };
    if(v.role!==orig.role&&!self)ask('Change account role?',esc(u.full_name)+' will change from <b>'+esc(orig.role)+'</b> to <b>'+esc(v.role)+'</b>. This changes what they can do on the platform.','Change role',go);
    else go();
  };
  $('#u_ok').onclick=save;
  $('#u_sus').onclick=()=>{
    if(self)return;const to=!u.suspended;
    ask(to?'Suspend this account?':'Reactivate this account?',to?esc(u.full_name)+' will lose access to MIPMIP Files until you reactivate the account.':esc(u.full_name)+' will be able to sign in and use MIPMIP Files again.',to?'Suspend':'Reactivate',async()=>{
      if(await persist({suspended:to})){toast(u.full_name+(to?' was suspended':' was reactivated'));closeModal(true);usersDraw();openUser(u.id)}
    });
  };
  $('#u_n').focus();
}
