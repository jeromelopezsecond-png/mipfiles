/* Admin panel: upload / replace / delete reviewer files, and manage users.
   Staff (moderator + admin) can upload and replace files. Only admin can delete files and manage users.
   Real permissions are enforced by Supabase (storage.sql + setup.sql). This UI only hides buttons. */
const isStaff=()=>!!me&&['moderator','admin'].includes(me.role);
const isAdmin=()=>!!me&&me.role==='admin';
const MAXMB=50,fmtSize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
let admTab='files',admId=null;

/* Add an "Admin" link to the sidebar and the mobile tab bar for staff */
function injectAdminLinks(){
  document.querySelectorAll('[data-adm]').forEach(e=>e.remove());
  if(!isStaff())return;
  const h=document.querySelector('#side a[href="#home"]');
  if(h)h.insertAdjacentHTML('afterend','<a data-adm href="#admin">Admin panel</a>');
  const out=document.querySelector('#tabs a[onclick]');
  if(out)out.insertAdjacentHTML('beforebegin','<a data-adm href="#admin"><b>&#9881;</b>Admin</a>');
}
const _setUser=window.setUser;
window.setUser=function(){_setUser();injectAdminLinks()};
injectAdminLinks();

V.admin=()=>{
  if(!isStaff()){toast('Staff only');return location.hash='#dash'}
  if(!isAdmin())admTab='files';
  app.innerHTML=`<h2 style="margin-top:0">Admin panel</h2>${sb?'':'<div class="banner">Demo mode: Supabase is not connected, so uploads and user changes will not work.</div>'}
<div class="chips"><button class="chip ${admTab=='files'?'on':''}" onclick="admGo('files')">Files</button>${isAdmin()?`<button class="chip ${admTab=='users'?'on':''}" onclick="admGo('users')">Users</button>`:''}</div>
<input type="file" id="adm_f" hidden accept=".pdf,.docx,.pptx" onchange="admUpload(this)"><div id="adm"></div>`;
  admTab=='users'&&isAdmin()?admUsers():admFiles();
};
function admGo(t){admTab=t;V.admin()}

/* ---------- Files ---------- */
async function admFiles(){
  const box=$('#adm');
  if(!sb){box.innerHTML='<div class="card mt">Add your keys in js/config.js to manage files.</div>';return}
  box.innerHTML='<div class="mt">Loading files…</div>';
  const {data,error}=await sb.storage.from(BUCKET).list('',{limit:1000});
  if(error){box.innerHTML='<div class="card">Could not read the "'+BUCKET+'" bucket: '+esc(error.message)+'<br><span class="mt sm">Run storage.sql in the SQL Editor first.</span></div>';return}
  const have={};(data||[]).forEach(f=>have[f.name]=f);
  const n=R.filter(r=>have[filePath(r)]).length;
  box.innerHTML=`<p class="mt sm">${n} of ${R.length} reviewers have a file. Name rule: id.extension (for example 1.pdf).</p><div class="grid">${R.map(r=>{
    const p=filePath(r),f=have[p],sz=f&&f.metadata&&f.metadata.size?fmtSize(f.metadata.size):'';
    return `<div class="card"><h3>${esc(r.title)}</h3><div class="mt sm">${esc(r.subject)}</div>
<div style="margin:8px 0"><span class="tag">${esc(p)}</span><span class="tag" ${f?'style="color:var(--ok)"':''}>${f?'Uploaded'+(sz?' · '+sz:''):'No file yet'}</span></div>
<div class="row" style="margin:10px 0 0"><button class="btn" onclick="admPick(${r.id})">${f?'Replace':'Upload'}</button>${f?`<button class="btn g" onclick="dl(${r.id})">Test download</button>`:''}${f&&isAdmin()?`<button class="btn g" style="color:var(--bad)" onclick="admDel(${r.id})">Delete</button>`:''}</div></div>`}).join('')}</div>`;
}
function admPick(id){admId=id;$('#adm_f').click()}
async function admUpload(inp){
  const f=inp.files[0];inp.value='';
  if(!f||!admId||!sb)return;
  const r=R.find(x=>x.id==admId),ext=(f.name.split('.').pop()||'').toLowerCase();
  if(ext!==r.type.toLowerCase())return toast('This reviewer needs a .'+r.type.toLowerCase()+' file.');
  if(f.size>MAXMB*1048576)return toast('File is over '+MAXMB+' MB.');
  toast('Uploading…');
  const {error}=await sb.storage.from(BUCKET).upload(filePath(r),f,{upsert:true,contentType:f.type||undefined});
  if(error)return toast(/row-level|polic/i.test(error.message)?'Not allowed. Check your role and run storage.sql.':error.message);
  toast('Uploaded');admFiles();
}
function admDel(id){
  const r=R.find(x=>x.id==id);
  ask('Delete file?','This permanently removes '+esc(filePath(r))+' from storage. Students will not be able to download it anymore.','Delete',async()=>{
    const {data,error}=await sb.storage.from(BUCKET).remove([filePath(r)]);
    if(error)return toast(error.message);
    if(!data||!data.length)return toast('Nothing deleted. Only admins can delete files.');
    toast('Deleted');admFiles();
  });
}

/* ---------- Users (admin only) ---------- */
async function admUsers(){
  const box=$('#adm');
  if(!sb){box.innerHTML='<div class="card mt">Add your keys in js/config.js to manage users.</div>';return}
  box.innerHTML='<div class="mt">Loading users…</div>';
  const {data,error}=await sb.from('profiles').select('id,email,full_name,username,role,suspended,course,year_level').order('created_at',{ascending:false});
  if(error){box.innerHTML='<div class="card">Could not load users: '+esc(error.message)+'</div>';return}
  box.innerHTML=`<p class="mt sm">${data.length} account${data.length==1?'':'s'}. You cannot change your own role or suspend yourself.</p><div class="grid">${data.map(u=>{
    const self=u.id===me.id;
    return `<div class="card"><h3>${esc(u.full_name)} ${u.suspended?'<span class="tag" style="color:var(--bad)">Suspended</span>':''}</h3>
<div class="mt sm">${esc(u.email)}${u.username?' · @'+esc(u.username):''}</div><div class="mt sm">${esc(u.course||'No course')} · ${u.year_level?yr(u.year_level):'No year'}</div>
<div class="row" style="margin:10px 0 0;flex-wrap:nowrap"><select ${self?'disabled':''} style="width:auto;flex:1" aria-label="Role" onchange="admRole('${u.id}',this.value)">${['student','moderator','admin'].map(x=>`<option ${x==u.role?'selected':''}>${x}</option>`).join('')}</select>
<button class="btn g" ${self?'disabled':''} onclick="admSus('${u.id}',${!u.suspended})">${u.suspended?'Unsuspend':'Suspend'}</button></div></div>`}).join('')}</div>`;
}
async function admRole(id,role){
  const {error}=await sb.from('profiles').update({role}).eq('id',id);
  toast(error?error.message:'Role updated');admUsers();
}
async function admSus(id,v){
  const {error}=await sb.from('profiles').update({suspended:v}).eq('id',id);
  toast(error?error.message:(v?'Account suspended':'Account restored'));admUsers();
}
