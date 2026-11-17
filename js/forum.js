/* Forum: posts, likes and comments. Backend: community_v9.sql (school-separated; course posts are only for that course).
   The database validates everything (length, spam limits, who may delete/pin). */
let FO={tab:'all',sort:'new',posts:[],more:false,state:'idle',err:'',off:0,busy:false,timer:null};
const FO_PAGE=15;
const foErr=e=>{const m=(e&&e.message)||String(e||'');return /too fast|Slow down|posting too/i.test(m)?m:/relation|schema cache|does not exist/i.test(m)?'Run community_v9.sql in Supabase first.':/row-level|polic|permission/i.test(m)?'You are not allowed to do that here.':/Failed to fetch|network/i.test(m)?'Connection problem. Try again.':m};
const foFilter=()=>FO.tab=='school'?'__school':FO.tab=='mine'&&courseOK(me.course)?me.course:null;
const likeBtn=(kind,id,liked,n)=>`<button type="button" class="lk ${liked?'on':''}" aria-pressed="${liked}" aria-label="${liked?'Unlike':'Like'} (${n})" onclick="foLike('${kind}',${id},this)">${icon('heart',17)}<span>${n}</span></button>`;
async function foLike(kind,id,btn){
  const on=btn.classList.contains('on'),n=+btn.querySelector('span').textContent;
  const set=(l,c)=>{btn.classList.toggle('on',l);btn.setAttribute('aria-pressed',l);btn.querySelector('span').textContent=c};
  set(!on,n+(on?-1:1));                                  // instant feedback, then the server decides
  try{const r=await rpc('forum_like_toggle',kind=='post'?{pid:id,cid:null}:{pid:null,cid:id});const row=Array.isArray(r)?r[0]:r;set(row.liked,row.like_count);
    const p=FO.posts.find(x=>x.id==id&&kind=='post');if(p){p.liked=row.liked;p.like_count=row.like_count}}
  catch(e){set(on,n);toast(foErr(e),'err')}
}
function postCard(p,full){
  const mine=me&&p.user_id===me.id,can=mine||isStaff(),ex=full?esc(p.body):esc(annExcerpt(p.body,220));
  return `<article class="card post ${p.pinned?'pin':''}" ${full?'':`data-href="#post/${p.id}"`}>
<div class="post-h">${avatar(p.author,p.user_id,p.author_seen)}<div class="grow"><a href="#profile/${p.user_id}"><b>${esc(p.author)}</b></a>${p.author_role!='student'?` <span class="cs gold">${esc(p.author_role)}</span>`:''}<div class="mt sm">${esc(relTime(p.created_at))}${p.course?' · '+esc(p.course):' · Whole school'}</div></div>${p.pinned?`<span class="cs gold">${icon('pin',13)} Pinned</span>`:''}</div>
<h3>${full?esc(p.title):`<a href="#post/${p.id}">${esc(p.title)}</a>`}</h3><p class="post-b ${full?'full':''}">${ex}</p>
<div class="post-f">${likeBtn('post',p.id,p.liked,p.like_count)}<a class="lk" href="#post/${p.id}" aria-label="${p.comment_count} comments">${icon('chat',17)}<span>${p.comment_count}</span></a>${isAdmin()?`<button type="button" class="lk" onclick="foPin(${p.id},${!p.pinned})">${icon('pin',17)}<span>${p.pinned?'Unpin':'Pin'}</span></button>`:''}${can?`<button type="button" class="lk del" onclick="foDelPost(${p.id})" aria-label="Delete post">${icon('trash',17)}</button>`:''}</div></article>`;
}
async function foLoad(more){
  if(FO.busy)return;FO.busy=true;
  if(!more){FO.state='loading';FO.off=0;FO.posts=[];foDraw()}
  try{const r=await rpc('forum_feed',{sid:sid(),course_filter:foFilter(),sort:FO.sort,lim:FO_PAGE+1,off:FO.off});
    FO.more=r.length>FO_PAGE;FO.posts=FO.posts.concat(r.slice(0,FO_PAGE));FO.off=FO.posts.length;FO.state='ready'}
  catch(e){FO.state='error';FO.err=foErr(e)}
  FO.busy=false;foDraw();
}
function foDraw(){
  const box=document.getElementById('fo-body');if(!box)return;
  if(FO.state=='loading')return void(box.innerHTML=skel(3,'tall'));
  if(FO.state=='error')return void(box.innerHTML=errorState(FO.err,'foLoad()'));
  box.innerHTML=FO.posts.length?FO.posts.map(p=>postCard(p)).join('')+(FO.more?'<div class="more"><button class="btn g" onclick="foLoad(true)">Load more</button></div>':''):emptyState('forum','No posts yet','Be the first to start a discussion.','<button class="btn" onclick="document.getElementById(\'fo_t\').focus()">Start a discussion</button>');
  paintDots();
}
async function foCreate(){
  const t=document.getElementById('fo_t').value.trim(),b=document.getElementById('fo_b').value.trim(),c=document.getElementById('fo_c').value;
  document.getElementById('e_fo').textContent=t.length<3?'Add a title (at least 3 characters).':!b?'Write something to share.':'';
  if(t.length<3||!b)return;
  const btn=document.getElementById('fo_ok');btn.disabled=true;btn.textContent='Posting…';
  const r=await sb.from('forum_posts').insert({...sc(),course:c||null,title:t,body:b}).select().single();
  btn.disabled=false;btn.textContent='Post';
  if(r.error){document.getElementById('e_fo').textContent=foErr(r.error);toast(foErr(r.error),'err');return}
  toast('Posted!');document.getElementById('fo_t').value='';document.getElementById('fo_b').value='';foCount();foLoad();
}
const foCount=()=>{const e=document.getElementById('fo_cnt');if(e)e.textContent=document.getElementById('fo_b').value.length+'/2000'};
function foDelPost(id){ask('Delete this post?','The post and all of its comments will be removed for everyone.','Delete',async()=>{
  const r=await sb.from('forum_posts').delete().eq('id',id).select();
  if(r.error||!r.data||!r.data.length)return toast(r.error?foErr(r.error):'You are not allowed to delete this post.','err');
  FO.posts=FO.posts.filter(p=>p.id!=id);toast('Post deleted');location.hash.startsWith('#post/')?location.hash='#forum':foDraw()})}
async function foPin(id,v){const r=await sb.from('forum_posts').update({pinned:v}).eq('id',id).select();if(r.error||!r.data.length)return toast(r.error?foErr(r.error):'Only admins can pin posts.','err');toast(v?'Post pinned':'Post unpinned');foLoad()}
V.forum=()=>{
  if(!me)return location.hash='#login';
  if(FO.timer)clearInterval(FO.timer);
  if(!live()){app.innerHTML=pageHead('Forum','Ask questions, share tips and talk with your classmates.',[['Forum']])+emptyState('forum','The forum needs a live connection','Posts, likes and comments work once the site is connected to Supabase.');return}
  const mine=courseOK(me.course),tab=(k,l)=>`<button type="button" role="tab" aria-selected="${FO.tab==k}" class="chip ${FO.tab==k?'on':''}" onclick="FO.tab='${k}';V.forum()">${l}</button>`;
  if(FO.tab=='mine'&&!mine)FO.tab='all';
  app.innerHTML=pageHead('Forum','Ask questions, share tips and talk with your classmates.',[['Forum']])+
`<section class="card fo-new"><label class="fl sm" for="fo_t">Start a discussion</label><input id="fo_t" maxlength="120" placeholder="Title" autocomplete="off"><textarea id="fo_b" rows="3" maxlength="2000" placeholder="What do you want to talk about?" style="margin-top:8px"></textarea>
<div class="fo-row"><select id="fo_c" aria-label="Audience"><option value="">Whole school</option>${mine?`<option value="${esc(me.course)}">${esc(me.course)} only</option>`:''}</select><span class="mt sm" id="fo_cnt"></span><button class="btn" id="fo_ok" onclick="foCreate()">Post</button></div><div class="err" id="e_fo" role="alert"></div></section>
<div class="fo-bar"><div class="tabs-scroll" role="tablist">${tab('all','All')}${tab('school','Whole school')}${mine?tab('mine','My course'):''}</div><select id="fo_s" aria-label="Sort"><option value="new" ${FO.sort=='new'?'selected':''}>Latest</option><option value="top" ${FO.sort=='top'?'selected':''}>Most active</option></select></div><div id="fo-body"></div>`;
  document.getElementById('fo_b').oninput=foCount;document.getElementById('fo_s').onchange=e=>{FO.sort=e.target.value;foLoad()};
  foLoad();FO.timer=setInterval(()=>{if(location.hash=='#forum'&&!document.hidden&&!FO.busy&&FO.state=='ready'&&!(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName)))foLoad(false)},60000);
};
addEventListener('hashchange',()=>{if(location.hash!='#forum'&&FO.timer){clearInterval(FO.timer);FO.timer=null}});

/* ---------- one post with its comments ---------- */
let CM={list:[],post:null};
function commentRow(c){const can=(me&&c.user_id===me.id)||isStaff();
  return `<div class="cmt" id="cm-${c.id}">${avatar(c.author,c.user_id,c.author_seen)}<div class="grow"><div class="cmt-h"><a href="#profile/${c.user_id}"><b>${esc(c.author)}</b></a>${c.author_role!='student'?` <span class="cs gold">${esc(c.author_role)}</span>`:''}<span class="mt sm">${esc(relTime(c.created_at))}</span></div><div class="cmt-b">${esc(c.body)}</div><div class="post-f">${likeBtn('comment',c.id,c.liked,c.like_count)}${can?`<button type="button" class="lk del" onclick="foDelComment(${c.id})" aria-label="Delete comment">${icon('trash',16)}</button>`:''}</div></div></div>`}
function foDelComment(id){ask('Delete this comment?','It will be removed for everyone.','Delete',async()=>{const r=await sb.from('forum_comments').delete().eq('id',id).select();
  if(r.error||!r.data.length)return toast(r.error?foErr(r.error):'You are not allowed to delete this comment.','err');
  CM.list=CM.list.filter(c=>c.id!=id);toast('Comment deleted');V.post(CM.post.id)})}
async function foComment(){
  const t=document.getElementById('cm_b'),b=t.value.trim();if(!b)return;const btn=document.getElementById('cm_ok');btn.disabled=true;
  const r=await sb.from('forum_comments').insert({post_id:CM.post.id,body:b}).select().single();btn.disabled=false;
  if(r.error){document.getElementById('e_cm').textContent=foErr(r.error);return toast(foErr(r.error),'err')}
  t.value='';document.getElementById('e_cm').textContent='';V.post(CM.post.id,true);
}
V.post=async(id,keep)=>{
  if(!me)return location.hash='#login';
  if(!live())return location.hash='#forum';
  if(!keep)app.innerHTML=pageHead('Post','',[['Forum','#forum'],['Post']])+skel(2,'tall');
  let p,cs;try{const r=await rpc('forum_post_get',{pid:+id});p=r&&r[0];if(p)cs=await rpc('forum_comments_list',{pid:+id})}
  catch(e){app.innerHTML=pageHead('Post','',[['Forum','#forum'],['Post']])+errorState(foErr(e),`V.post(${+id})`);return}
  if(location.hash.slice(1).split('/')[0]!='post')return;
  if(!p){app.innerHTML=pageHead('Post','',[['Forum','#forum'],['Post']])+emptyState('forum','This post is not available','It may have been deleted or is not meant for your course.','<a class="btn" href="#forum">Back to the forum</a>');return}
  CM={list:cs,post:p};
  app.innerHTML=pageHead(p.title,'',[['Forum','#forum'],[annExcerpt(p.title,40)]])+postCard(p,true)+
`<section class="card cm-card"><div class="ch">${icon('chat',18)}<span>${cs.length} comment${cs.length==1?'':'s'}</span></div>${cs.length?cs.map(commentRow).join(''):'<p class="mt">No comments yet. Be the first to reply.</p>'}
<div class="cm-new"><textarea id="cm_b" rows="2" maxlength="1000" placeholder="Write a comment…" aria-label="Comment"></textarea><button class="btn" id="cm_ok" disabled onclick="foComment()">Comment</button></div><div class="err" id="e_cm" role="alert"></div></section>`;
  const t=document.getElementById('cm_b');t.oninput=()=>{document.getElementById('cm_ok').disabled=!t.value.trim()};
  t.onkeydown=e=>{if(e.key=='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();foComment()}};
  paintDots();
};
