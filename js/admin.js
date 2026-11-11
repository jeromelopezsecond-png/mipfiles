/* Admin tools: the floating + button, add/delete forms, and the Admin panel.
   Staff (moderator + admin) can add and replace content. Only admin can delete and manage users.
   Real permissions are enforced by Supabase (setup.sql, storage.sql, content.sql). The UI only hides buttons. */
let admTab='files',admId=null;

/* ----- links for staff ----- */
function injectAdminLinks(){
  document.querySelectorAll('[data-adm]').forEach(e=>e.remove());
  if(!isStaff())return;
  const h=document.querySelector('#side a[href="#home"]');
  if(h)h.insertAdjacentHTML('afterend','<a data-adm href="#admin">Admin panel</a>');
  const out=document.querySelector('#tabs a[onclick]');
  if(out)out.insertAdjacentHTML('beforebegin','<a data-adm href="#admin"><b>&#9881;</b>Admin</a>');
}
const _setUser=window.setUser;
window.setUser=function(){_setUser();injectAdminLinks();mountFab()};

/* ----- floating + button ----- */
const FAB_ITEMS=[['▤','Upload reviewer','Add a file for students','openReviewerForm'],['✎','Create mock exam','Write the questions','openExamForm'],['◈','Add subject','New option in the subject list','openSubjectForm']];
function mountFab(){
  const show=isStaff()&&!/^#(exam\/|login|welcome)/.test(location.hash);
  const f=document.getElementById('fab'),m=document.getElementById('fabm');
  if(!show){if(f)f.remove();if(m)m.remove();return}
  if(f)return;
  document.body.insertAdjacentHTML('beforeend',`<div id="fabm" hidden>${FAB_ITEMS.map(i=>`<button type="button" onclick="fabClose();${i[3]}()"><i>${i[0]}</i><div><b>${i[1]}</b><span>${i[2]}</span></div></button>`).join('')}</div><button type="button" id="fab" aria-label="Add content" aria-haspopup="true" aria-expanded="false" onclick="fabToggle()">+</button>`);
}
function fabToggle(){const m=document.getElementById('fabm'),f=document.getElementById('fab');if(!m)return;const o=m.hidden;m.hidden=!o;f.classList.toggle('open',o);f.setAttribute('aria-expanded',String(o))}
function fabClose(){const m=document.getElementById('fabm'),f=document.getElementById('fab');if(m)m.hidden=true;if(f){f.classList.remove('open');f.setAttribute('aria-expanded','false')}}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#fab,#fabm'))fabClose()});
addEventListener('keydown',e=>{if(e.key=='Escape')fabClose()});
addEventListener('hashchange',()=>{fabClose();mountFab()});
mountFab();

/* ----- modal ----- */
function closeModal(){const d=document.getElementById('fm');if(d)d.remove();removeEventListener('keydown',modalKey)}
function modalKey(e){if(e.key=='Escape'&&document.getElementById('fm'))closeModal()}
function modal(html){
  closeModal();
  const d=document.createElement('div');d.className='mdl form';d.id='fm';
  d.innerHTML=`<div class="mc" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('mousedown',e=>{if(e.target===d)closeModal()});
  d.querySelectorAll('[data-n]').forEach(b=>b.onclick=closeModal);
  addEventListener('keydown',modalKey);
  return d;
}
const byName=()=>(me&&(me.code_name||me.name))||user||'Admin';

/* ----- add subject ----- */
function openSubjectForm(){
  modal(`<h3>Add subject</h3><p class="mt sm">Subjects appear in the archive filter, the sidebar and when you upload reviewers or create exams.</p>
<label class="fl sm mt" for="sj_n">Subject name</label><input id="sj_n" maxlength="80" placeholder="e.g. Operating Systems" autocomplete="off"><div class="err" id="e_sj_n"></div>
<div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Cancel</button><button class="btn" id="sj_ok">Add subject</button></div>`);
  const go=async()=>{const v=$('#sj_n').value;if(v.trim().length<2)return fe('e_sj_n','Enter a subject name (at least 2 characters).');
    $('#sj_ok').disabled=true;if(await addSubject(v)){closeModal();toast('Subject added');route()}else $('#sj_ok').disabled=false};
  $('#sj_ok').onclick=go;$('#sj_n').onkeydown=e=>{if(e.key=='Enter')go()};$('#sj_n').focus();
}

/* ----- upload reviewer ----- */
function openReviewerForm(){
  if(!SUBJ.length){toast('Add a subject first.');return openSubjectForm()}
  modal(`<h3>Upload reviewer</h3><p class="mt sm">The file is stored privately. Only signed-in students can download it.</p>
<label class="fl sm mt" for="rv_t">Title</label><input id="rv_t" maxlength="120" placeholder="e.g. Midterm Reviewer: Normalization" autocomplete="off"><div class="err" id="e_rv_t"></div>
<label class="fl sm mt">Subject</label>${sddHTML('sdd_rv','Choose a subject')}<div class="err" id="e_rv_s"></div>
<div class="f2"><div><label class="fl sm mt" for="rv_x">Exam type</label><select id="rv_x"><option>Prelim</option><option selected>Midterm</option><option>Semi-Final</option><option>Final</option></select></div>
<div><label class="fl sm mt" for="rv_y">Year level</label><select id="rv_y">${[1,2,3,4].map(n=>`<option value="${n}">${yr(n)}</option>`).join('')}</select></div>
<div><label class="fl sm mt" for="rv_m">Semester</label><select id="rv_m"><option value="1">Sem 1</option><option value="2">Sem 2</option></select></div>
<div><label class="fl sm mt" for="rv_c">Section (optional)</label><input id="rv_c" maxlength="20" placeholder="e.g. BSIS-II201" autocomplete="off"></div></div>
<label class="fl sm mt" for="rv_p">Topics (separate with commas)</label><input id="rv_p" placeholder="Joins, Normal forms, ERD" autocomplete="off">
<label class="fl sm mt" for="rv_f">File (PDF, DOCX or PPTX, up to ${MAXMB} MB)</label><input type="file" id="rv_f" accept=".pdf,.docx,.pptx"><div class="err" id="e_rv_f"></div>
<div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Cancel</button><button class="btn" id="rv_ok">Upload</button></div>`);
  sddInit('sdd_rv',{options:()=>SUBJ,value:'',onChange:()=>fe('e_rv_s','')});
  $('#rv_ok').onclick=async()=>{
    const t=$('#rv_t').value.trim(),s=sddGet('sdd_rv'),f=$('#rv_f').files[0],ext=f?f.name.split('.').pop().toLowerCase():'';
    const ferr=!f?'Choose a file to upload.':!['pdf','docx','pptx'].includes(ext)?'Only PDF, DOCX or PPTX files.':f.size>MAXMB*1048576?'File is over '+MAXMB+' MB.':'';
    fe('e_rv_t',t.length<3?'Enter a title (at least 3 characters).':'');fe('e_rv_s',s?'':'Choose a subject.');fe('e_rv_f',ferr);
    if(t.length<3||!s||ferr)return;
    const b=$('#rv_ok');b.disabled=true;b.textContent='Uploading…';
    const ok=await addReviewer({title:t,subject:s,exam:$('#rv_x').value,year:+$('#rv_y').value,sem:+$('#rv_m').value,section:$('#rv_c').value.trim(),topics:$('#rv_p').value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),by:byName()},f);
    if(ok){closeModal();toast('Reviewer added');route()}else{b.disabled=false;b.textContent='Upload'}
  };
  $('#rv_t').focus();
}

/* ----- create exam ----- */
let qn=0;
function qBlock(){
  const n=++qn;
  return `<div class="qb"><div class="ct"><b class="qno"></b><button type="button" class="bm del" aria-label="Remove question" onclick="this.closest('.qb').remove();qRenum()">${ICON_TRASH}</button></div>
<select class="qt" aria-label="Question type" onchange="qType(this)"><option value="mc">Multiple choice</option><option value="tf">True or false</option><option value="id">Identification</option></select>
<input class="qq" placeholder="Question" maxlength="300" autocomplete="off">
<div class="qmc">${['A','B','C','D'].map((l,i)=>`<div class="qo"><input type="radio" class="qr" name="qa${n}" aria-label="Correct choice ${l}" ${i==0?'checked':''}><input class="qc" placeholder="Choice ${l}" maxlength="120" autocomplete="off"></div>`).join('')}<div class="mt sm" style="margin-top:6px">Select the circle beside the correct choice.</div></div>
<div class="qtf" hidden><select class="qtfa" aria-label="Correct answer"><option>True</option><option>False</option></select></div>
<div class="qid" hidden><input class="qia" placeholder="Correct answer (not case sensitive)" maxlength="120" autocomplete="off"></div>
<input class="qe" placeholder="Explanation shown after the exam (optional)" maxlength="300" autocomplete="off"></div>`;
}
function qRenum(){document.querySelectorAll('#qs .qb .qno').forEach((e,i)=>e.textContent='Question '+(i+1))}
function qType(sel){const b=sel.closest('.qb');b.querySelector('.qmc').hidden=sel.value!='mc';b.querySelector('.qtf').hidden=sel.value!='tf';b.querySelector('.qid').hidden=sel.value!='id'}
function qAdd(){$('#qs').insertAdjacentHTML('beforeend',qBlock());qRenum();const l=document.querySelectorAll('#qs .qq');l[l.length-1].focus()}
function collectQs(){
  const out=[];let err='';
  document.querySelectorAll('#qs .qb').forEach((b,i)=>{
    const n=i+1,t=b.querySelector('.qt').value,q=b.querySelector('.qq').value.trim(),e=b.querySelector('.qe').value.trim();
    const bad=m=>{err=err||'Question '+n+': '+m};
    if(!q)return bad('write the question.');
    if(t=='mc'){const cs=[...b.querySelectorAll('.qc')].map(x=>x.value.trim()),ri=[...b.querySelectorAll('.qr')].findIndex(x=>x.checked);
      if(cs.some(c=>!c))return bad('fill in all four choices.');
      if(new Set(cs.map(c=>c.toLowerCase())).size<4)return bad('each choice must be different.');
      out.push({t:'mc',q,c:cs,a:cs[ri<0?0:ri],e})}
    else if(t=='tf')out.push({t:'tf',q,c:['True','False'],a:b.querySelector('.qtfa').value,e});
    else{const a=b.querySelector('.qia').value.trim().toLowerCase();if(!a)return bad('enter the correct answer.');out.push({t:'id',q,a,e})}
  });
  return {out,err};
}
function openExamForm(){
  if(!SUBJ.length){toast('Add a subject first.');return openSubjectForm()}
  modal(`<h3>Create mock exam</h3><p class="mt sm">Students get a timed exam with shuffled questions and see the explanations after.</p>
<label class="fl sm mt" for="ex_t">Exam title</label><input id="ex_t" maxlength="120" placeholder="e.g. Mock Midterm: Operating Systems" autocomplete="off"><div class="err" id="e_ex_t"></div>
<label class="fl sm mt">Subject</label>${sddHTML('sdd_ex','Choose a subject')}<div class="err" id="e_ex_s"></div>
<div class="f2" style="grid-template-columns:repeat(3,1fr)"><div><label class="fl sm mt" for="ex_d">Difficulty</label><select id="ex_d"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
<div><label class="fl sm mt" for="ex_m">Minutes</label><input id="ex_m" type="number" min="1" max="300" value="10"></div>
<div><label class="fl sm mt" for="ex_p">Passing %</label><input id="ex_p" type="number" min="1" max="100" value="60"></div></div>
<h3 style="margin-top:20px">Questions</h3><div id="qs"></div><button type="button" class="btn g" onclick="qAdd()">+ Add question</button><div class="err" id="e_ex_q"></div>
<div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Cancel</button><button class="btn" id="ex_ok">Save exam</button></div>`);
  sddInit('sdd_ex',{options:()=>SUBJ,value:'',onChange:()=>fe('e_ex_s','')});
  qAdd();$('#ex_t').focus();
  $('#ex_ok').onclick=async()=>{
    const t=$('#ex_t').value.trim(),s=sddGet('sdd_ex'),mins=Math.round(+$('#ex_m').value),pass=Math.round(+$('#ex_p').value),{out,err}=collectQs();
    fe('e_ex_t',t.length<3?'Enter a title (at least 3 characters).':'');fe('e_ex_s',s?'':'Choose a subject.');
    const qe=!out.length&&!err?'Add at least one question.':err;fe('e_ex_q',qe);
    if(t.length<3||!s||qe)return;
    if(!(mins>=1&&mins<=300)||!(pass>=1&&pass<=100))return fe('e_ex_q','Minutes must be 1 to 300 and passing 1 to 100.');
    const b=$('#ex_ok');b.disabled=true;b.textContent='Saving…';
    if(await addExam({title:t,subject:s,diff:$('#ex_d').value,mins,pass,q:out})){closeModal();toast('Exam created');route()}else{b.disabled=false;b.textContent='Save exam'}
  };
}

/* ----- delete (admin) ----- */
function admDelReviewer(id){const r=R.find(x=>x.id==id);if(!r)return;
  ask('Delete reviewer?','"'+esc(r.title)+'" and its file will be permanently removed. This cannot be undone.','Delete',async()=>{if(await delReviewer(id)){toast('Reviewer deleted');route()}})}
function admDelExam(id){const e=E.find(x=>x.id==id);if(!e)return;
  ask('Delete exam?','"'+esc(e.title)+'" will be permanently removed.','Delete',async()=>{if(await delExam(id)){toast('Exam deleted');route()}})}
function admDelSubject(name){
  ask('Delete subject?','"'+esc(name)+'" will be removed from the subject list. A subject that still has reviewers or exams cannot be deleted.','Delete',async()=>{if(await delSubject(name)){toast('Subject deleted');route()}})}

/* ----- Admin panel ----- */
V.admin=()=>{
  if(!isStaff()){toast('Staff only');return location.hash='#dash'}
  if(!isAdmin()&&admTab=='users')admTab='files';
  const tab=(k,l)=>`<button class="chip ${admTab==k?'on':''}" onclick="admGo('${k}')">${l}</button>`;
  app.innerHTML=`<div class="ah"><h2 style="margin:0">Admin panel</h2><div class="row" style="margin:0"><button class="btn g" onclick="openSubjectForm()">Add subject</button><button class="btn g" onclick="openExamForm()">Create exam</button><button class="btn" onclick="openReviewerForm()">Upload reviewer</button></div></div>
${live()?'':'<div class="banner" style="margin-top:14px">Demo mode: Supabase is not connected, so changes live only in this browser tab.</div>'}
<div class="chips" style="margin-top:16px">${tab('files','Files')}${tab('subjects','Subjects')}${isAdmin()?tab('users','Users'):''}</div><input type="file" id="adm_f" hidden accept=".pdf,.docx,.pptx" onchange="admUpload(this)"><div id="adm"></div>`;
  admTab=='users'&&isAdmin()?admUsers():admTab=='subjects'?admSubjects():admFiles();
};
function admGo(t){admTab=t;V.admin()}

async function admFiles(){
  const box=$('#adm');
  if(!live()){box.innerHTML='<div class="card mt">Add your keys in js/config.js to store files.</div>';return}
  box.innerHTML='<div class="mt">Loading files…</div>';
  const {data,error}=await sb.storage.from(BUCKET).list('',{limit:1000});
  if(error){box.innerHTML='<div class="card">Could not read the "'+BUCKET+'" bucket: '+esc(error.message)+'<br><span class="mt sm">Run storage.sql in the SQL Editor first.</span></div>';return}
  const have={};(data||[]).forEach(f=>have[f.name]=f);
  const n=R.filter(r=>have[filePath(r)]).length;
  box.innerHTML=`<p class="mt sm">${n} of ${R.length} reviewers have a file in storage.</p><div class="grid">${R.length?R.map(r=>{
    const p=filePath(r),f=have[p],sz=f&&f.metadata&&f.metadata.size?fmtSize(f.metadata.size):'';
    return `<div class="card"><h3>${esc(r.title)}</h3><div class="mt sm">${esc(r.subject)}</div>
<div style="margin:8px 0"><span class="tag">${esc(p)}</span><span class="tag" ${f?'style="color:var(--ok)"':''}>${f?'Uploaded'+(sz?' · '+sz:''):'No file yet'}</span></div>
<div class="row" style="margin:10px 0 0"><button class="btn" onclick="admPick(${r.id})">${f?'Replace file':'Upload file'}</button>${f?`<button class="btn g" onclick="dl(${r.id})">Test download</button>`:''}${f&&isAdmin()?`<button class="btn g del" onclick="admDel(${r.id})">Delete file</button>`:''}</div></div>`}).join(''):'<div class="card mt">No reviewers yet. Use Upload reviewer.</div>'}</div>`;
}
function admPick(id){admId=id;$('#adm_f').click()}
async function admUpload(inp){
  const f=inp.files[0];inp.value='';
  if(!f||!admId||!live())return;
  const r=R.find(x=>x.id==admId),ext=(f.name.split('.').pop()||'').toLowerCase();
  if(ext!==r.type.toLowerCase())return toast('This reviewer needs a .'+r.type.toLowerCase()+' file.');
  if(f.size>MAXMB*1048576)return toast('File is over '+MAXMB+' MB.');
  toast('Uploading…');
  const {error}=await sb.storage.from(BUCKET).upload(filePath(r),f,{upsert:true,contentType:f.type||undefined});
  if(error)return toast(/row-level|polic/i.test(error.message)?'Not allowed. Check your role and run storage.sql.':error.message);
  r.size=fmtSize(f.size);sb.from('reviewers').update({file_size:r.size}).eq('id',r.id).then(()=>{},()=>{});
  toast('Uploaded');admFiles();
}
function admDel(id){
  const r=R.find(x=>x.id==id);
  ask('Delete file?','This removes '+esc(filePath(r))+' from storage. The reviewer card stays, but students cannot download it until you upload a new file.','Delete',async()=>{
    const {data,error}=await sb.storage.from(BUCKET).remove([filePath(r)]);
    if(error)return toast(error.message);
    if(!data||!data.length)return toast('Nothing deleted. Only admins can delete files.');
    toast('File deleted');admFiles();
  });
}

function admSubjects(){
  $('#adm').innerHTML=`<div class="row" style="margin-top:0"><input id="ns" placeholder="New subject name" maxlength="80" style="flex:1;min-width:200px" autocomplete="off"><button class="btn" onclick="admAddSubject()">Add subject</button></div><div class="grid">${SUBJ.length?SUBJ.map(s=>{
    const nr=R.filter(r=>r.subject==s).length,ne=E.filter(e=>e.subject==s).length;
    return `<div class="card"><div class="ct"><h3>${esc(s)}</h3>${isAdmin()?`<button class="bm del" data-s="${esc(s)}" aria-label="Delete subject" title="Delete subject" onclick="admDelSubject(this.dataset.s)">${ICON_TRASH}</button>`:''}</div><div class="mt sm">${nr} reviewer${nr==1?'':'s'} · ${ne} exam${ne==1?'':'s'}</div></div>`}).join(''):'<div class="card mt">No subjects yet.</div>'}</div>`;
  $('#ns').onkeydown=e=>{if(e.key=='Enter')admAddSubject()};
}
async function admAddSubject(){if(await addSubject($('#ns').value)){toast('Subject added');admSubjects()}}

async function admUsers(){
  const box=$('#adm');
  if(!live()){box.innerHTML='<div class="card mt">Add your keys in js/config.js to manage users.</div>';return}
  box.innerHTML='<div class="mt">Loading users…</div>';
  const {data,error}=await sb.from('profiles').select('id,email,full_name,username,role,suspended,year_level').order('created_at',{ascending:false});
  if(error){box.innerHTML='<div class="card">Could not load users: '+esc(error.message)+'</div>';return}
  box.innerHTML=`<p class="mt sm">${data.length} account${data.length==1?'':'s'}. You cannot change your own role or suspend yourself.</p><div class="grid">${data.map(u=>{
    const self=u.id===me.id;
    return `<div class="card"><h3>${esc(u.full_name)} ${u.suspended?'<span class="tag" style="color:var(--bad)">Suspended</span>':''}</h3>
<div class="mt sm">${esc(u.email)}${u.username?' · @'+esc(u.username):''}</div><div class="mt sm">${u.year_level?yr(u.year_level):'No year set'}</div>
<div class="row" style="margin:10px 0 0;flex-wrap:nowrap"><select ${self?'disabled':''} style="width:auto;flex:1" aria-label="Role" onchange="admRole('${u.id}',this.value)">${['student','moderator','admin'].map(x=>`<option ${x==u.role?'selected':''}>${x}</option>`).join('')}</select>
<button class="btn g" ${self?'disabled':''} onclick="admSus('${u.id}',${!u.suspended})">${u.suspended?'Unsuspend':'Suspend'}</button></div></div>`}).join('')}</div>`;
}
async function admRole(id,role){const {error}=await sb.from('profiles').update({role}).eq('id',id);toast(error?error.message:'Role updated');admUsers()}
async function admSus(id,v){const {error}=await sb.from('profiles').update({suspended:v}).eq('id',id);toast(error?error.message:(v?'Account suspended':'Account restored'));admUsers()}
