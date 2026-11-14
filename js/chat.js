/* Chat: Global + course rooms.
   Backend: messages + chat_reads (chat_v7.sql). The database decides who may read, post and delete;
   it also validates every message (length, spam, replies). This file draws the UI and talks to it.
   Without Supabase (local preview) messages are kept in this tab only. */
const CH={room:'',msgs:[],pending:[],members:[],state:'idle',err:'',hasMore:false,loadingMore:false,conn:'ok',unread:{},busy:false,reply:null,newBelow:0,ch:null,sch:null,readT:0,leave:null};
const CHAT_PAGE=40,CHAT_KEEP=300,MEM_CHAT=[];
const EMOJI=['😀','😂','😊','😍','🥹','😎','🤔','😅','😭','😴','🙏','👍','👏','🙌','💪','🔥','✨','🎉','❤️','💯','📚','📝','✅','❌','⏰','💡','☕','🍕','😮','🤝','👀','🫡'];
const myName=()=>((me&&(me.code_name||me.name))||'').trim();
const isOwnMsg=m=>!!me&&(m.user_id?m.user_id===me.id:m.author===myName());
const reEsc=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const initial=n=>esc(String(n||'?').trim().charAt(0).toUpperCase()||'?');
const uid=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
const onChat=()=>location.hash=='#chat';
const allMsgs=()=>CH.msgs.concat(CH.pending);
const mkey=m=>m.id!=null?'i'+m.id:'c'+m.cid;
const myCourse=()=>courseOK(me&&me.course)?me.course:'';
const listEl=()=>document.getElementById('cp-list');
const nearBottom=(px=120)=>{const l=listEl();return !l||l.scrollHeight-l.scrollTop-l.clientHeight<px};
const toBottom=sm=>{const l=listEl();if(!l)return;if(l.scrollTo)l.scrollTo({top:l.scrollHeight,behavior:sm?'smooth':'auto'});else l.scrollTop=l.scrollHeight};
const finePointer=()=>!!(window.matchMedia&&window.matchMedia('(pointer:fine)').matches);

/* ---------- text: safe rendering + @mentions ---------- */
const nameList=()=>[...new Set(CH.members.map(m=>m.name).concat(allMsgs().map(m=>m.author)).filter(Boolean))];
function msgHTML(text){
  let h=esc(text);const names=nameList().sort((a,b)=>b.length-a.length);
  if(!names.length)return h;
  const re=new RegExp('@('+names.map(n=>reEsc(esc(n))).join('|')+')(?![A-Za-z0-9_])','gi'),mine=esc(myName()).toLowerCase();
  return h.replace(re,(m,n)=>`<span class="ms-at ${n.toLowerCase()==mine?'me':''}">${m}</span>`);
}
function mentionsMe(text){const n=myName();return !!n&&new RegExp('@'+reEsc(n)+'(?![A-Za-z0-9_])','i').test(text||'')}

/* ---------- rows ---------- */
function dayLabel(t){const a=new Date(),y=new Date(Date.now()-864e5);return t.toDateString()==a.toDateString()?'Today':t.toDateString()==y.toDateString()?'Yesterday':t.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}
function prevOf(m){const a=allMsgs(),i=a.indexOf(m);return i>0?a[i-1]:null}
function grouped(m,prev){
  if(!prev)return false;const t=new Date(m.created_at),p=new Date(prev.created_at);
  return t.toDateString()==p.toDateString()&&prev.author===m.author&&isOwnMsg(prev)==isOwnMsg(m)&&(t-p<3e5)&&!(m.reply_to||m.reply_excerpt);
}
function rowHTML(m,prev){
  const own=isOwnMsg(m),t=new Date(m.created_at),cont=grouped(m,prev),st=m.status||'sent';
  const time=t.toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'}),full=t.toLocaleString('en',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const badge=m.author_role&&m.author_role!='student'?`<span class="ms-role">${esc(m.author_role)}</span>`:'';
  const quote=(m.reply_author||m.reply_excerpt)?`<button type="button" class="cp-quote" ${m.reply_to?`onclick="chatJump(${m.reply_to})"`:''} aria-label="Replying to ${esc(m.reply_author||'a message')}"><b>${esc(m.reply_author||'Message')}</b><span>${esc(m.reply_excerpt||'')}</span></button>`:'';
  const acts=st=='sent'&&m.id!=null?`<div class="cp-acts"><button type="button" class="cp-act" onclick="chatReply(${m.id})" aria-label="Reply" title="Reply">${icon('reply',16)}</button>${own||isStaff()?`<button type="button" class="cp-act del" onclick="chatDelAsk(${m.id})" aria-label="Delete message" title="Delete">${icon('trash',16)}</button>`:''}</div>`:'';
  const status=st=='sending'?`<div class="cp-st">${icon('clock',12)} Sending…</div>`:st=='failed'?`<div class="cp-st bad" role="alert">${icon('alert',12)} ${esc(m.err||'Not sent')} · <button type="button" onclick="chatRetry('${m.cid}')">Retry</button> · <button type="button" onclick="chatDiscard('${m.cid}')">Remove</button></div>`:'';
  const col=`<div class="cp-col">${cont?'':`<div class="ms-meta">${own?'':`<b>${esc(m.author)}</b>${badge}`}<time datetime="${esc(m.created_at)}" title="${esc(full)}">${esc(time)}</time></div>`}${quote}<div class="cp-bub" title="${esc(full)}">${msgHTML(m.body)}</div>${status}</div>`;
  const cls=`cp-row ${own?'own':''} ${cont?'cont':''} ${!own&&mentionsMe(m.body)?'mention':''} ${st}`;
  return `<div class="${cls}" id="m-${mkey(m)}" data-k="${mkey(m)}">${own?acts+col:`<div class="ms-av ${cont?'sp':''}" aria-hidden="true">${initial(m.author)}</div>${col}${acts}`}</div>`;
}
function dayHTML(m,prev){const t=new Date(m.created_at);return !prev||new Date(prev.created_at).toDateString()!=t.toDateString()?`<div class="ms-day"><span>${esc(dayLabel(t))}</span></div>`:''}

/* ---------- drawing ---------- */
function drawAll(stick){
  const el=listEl();if(!el)return;
  if(CH.state=='loading'){el.innerHTML=`<div class="cp-skel">${'<div class="sk bub"></div><div class="sk bub r"></div>'.repeat(2)}</div>`;return}
  if(CH.state=='error'){el.innerHTML=errorState(CH.err||'Could not load messages.','chatLoad()');return}
  const a=allMsgs();
  if(!a.length){el.innerHTML=`<div class="ms-empty"><div class="empty-ic">${icon('chat',30)}</div><b>No messages yet</b><span>${CH.room?'Start the conversation with your course.':'Say hi to your school!'} Type @ to mention someone.</span></div>`;return}
  const top=CH.hasMore?`<div class="cp-top" id="cp-top">${CH.loadingMore?'Loading earlier messages…':'<button type="button" onclick="loadOlder()">Load earlier messages</button>'}</div>`:`<div class="cp-top end">Start of the conversation</div>`;
  el.innerHTML=top+a.map((m,i)=>dayHTML(m,a[i-1])+rowHTML(m,a[i-1])).join('');
  if(stick)toBottom(false);
  updateJump();
}
function appendRow(m){
  const el=listEl();if(!el)return;
  if(el.querySelector('.ms-empty')||el.querySelector('.cp-skel')||el.querySelector('.empty')){drawAll(true);return}
  const prev=prevOf(m);el.insertAdjacentHTML('beforeend',dayHTML(m,prev)+rowHTML(m,prev));
}
function updateRow(m,oldKey){
  const el=document.getElementById('m-'+(oldKey||mkey(m)));if(!el){return}
  const prev=prevOf(m),tmp=document.createElement('div');tmp.innerHTML=rowHTML(m,prev);el.replaceWith(tmp.firstElementChild);
}
function updateJump(){
  const b=document.getElementById('cp-jump'),l=listEl();if(!b||!l)return;
  const far=l.scrollHeight-l.scrollTop-l.clientHeight>260;
  b.hidden=!(far||CH.newBelow>0);
  const t=document.getElementById('cp-jumpt');if(t)t.textContent=CH.newBelow>0?`${CH.newBelow} new message${CH.newBelow>1?'s':''}`:'Jump to latest';
}
function setConn(s){
  const was=CH.conn;CH.conn=s;const c=document.getElementById('cp-conn');if(!c)return;
  if(s=='ok'){if(was!='ok'){c.hidden=false;c.className='cp-conn ok';c.textContent='Back online';setTimeout(()=>{if(CH.conn=='ok')c.hidden=true},1600)}else c.hidden=true;return}
  c.hidden=false;c.className='cp-conn '+s;c.innerHTML=s=='offline'?`${icon('alert',14)} You're offline. New messages will fail until you reconnect.`:`<span class="spin"></span> Reconnecting…`;
}

/* ---------- unread badges ---------- */
function updateChatBadges(){
  let total=0;[''].concat(myCourse()?[myCourse()]:[]).forEach(r=>total+=CH.unread[r]||0);
  ['nb-chat','nb-chat-tab'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent=total>99?'99+':String(total);b.hidden=!total}});
  document.querySelectorAll('[data-ub]').forEach(b=>{const n=CH.unread[b.getAttribute('data-ub')]||0;b.textContent=n>99?'99+':String(n);b.hidden=!n||(b.getAttribute('data-ub')===CH.room&&onChat())});
}
async function refreshUnread(){
  if(!live()||!me)return;
  const r=await sb.rpc('chat_unread',{sid:HAS_SCH?SCH:null});
  if(r.error||!r.data)return;
  const u={};r.data.forEach(x=>u[x.room_key]=x.unread_count);CH.unread=u;
  if(onChat())CH.unread[CH.room]=0;
  updateChatBadges();
}
function markReadSoon(){
  clearTimeout(CH.readT);
  CH.readT=setTimeout(async()=>{
    if(!onChat()||!nearBottom(200)||document.hidden)return;
    CH.unread[CH.room]=0;updateChatBadges();
    if(!live())return;
    const last=CH.msgs.length?CH.msgs[CH.msgs.length-1].id:null;if(!last)return;
    sb.rpc('chat_mark_read',{room_course:CH.room||null,up_to:last,sid:HAS_SCH?SCH:null}).then(()=>{},()=>{});
  },600);
}

/* ---------- realtime: ONE channel for the whole session ---------- */
function chatStart(){
  if(!live()||!me||CH.ch)return;
  CH.sch=HAS_SCH?SCH:null;
  const f=HAS_SCH&&SCH!=null?{filter:'school_id=eq.'+SCH}:{};
  CH.ch=sb.channel('chat-'+(me.id||'u')+'-'+Date.now())
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',...f},onInsert)
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'messages'},onDelete)
    .subscribe(s=>{
      if(s=='SUBSCRIBED'){const was=CH.conn;setConn(navigator.onLine===false?'offline':'ok');if(was!='ok')chatGap()}
      else if(s=='CHANNEL_ERROR'||s=='TIMED_OUT'||s=='CLOSED')setConn(navigator.onLine===false?'offline':'reconnecting');
    });
}
function chatStop(){if(CH.ch&&live())sb.removeChannel(CH.ch);CH.ch=null}
function onInsert(p){
  const m=p&&p.new;if(!m||!me)return;
  const mine=isOwnMsg(m),room=m.course||'';
  const pend=mine&&m.client_id?CH.pending.find(x=>x.cid===m.client_id):null;
  if(pend){promote(pend,m);return}
  if(onChat()&&room===CH.room&&CH.state=='ready'){
    if(CH.msgs.some(x=>x.id==m.id))return;
    const stick=mine||nearBottom();
    CH.msgs.push(m);CH.msgs.sort((a,b)=>a.id-b.id);
    if(CH.msgs.length>CHAT_KEEP&&stick){CH.msgs.splice(0,CH.msgs.length-CHAT_KEEP);CH.hasMore=true;drawAll(true)}else appendRow(m);
    if(stick){toBottom(true);markReadSoon()}else{CH.newBelow++;updateJump()}
    if(!mine&&mentionsMe(m.body))toast((m.author||'Someone')+' mentioned you','ok');
  }else if(!mine&&(room===''||room===myCourse())){
    CH.unread[room]=(CH.unread[room]||0)+1;updateChatBadges();
    if(mentionsMe(m.body))toast((m.author||'Someone')+' mentioned you in '+(room||'Global'),'ok');
  }
}
function onDelete(p){
  const id=p&&p.old&&p.old.id;if(id==null||!CH.msgs.some(m=>m.id==id))return;
  CH.msgs=CH.msgs.filter(m=>m.id!=id);if(CH.reply&&CH.reply.id==id)clearReply();if(onChat())drawAll();
}
/* after being offline / hidden: fetch the latest page once and merge (also catches deletions) */
async function chatGap(){
  if(!live()||!me)return;
  refreshUnread();
  if(!onChat()||CH.state!='ready')return;
  const room=CH.room,r=await fetchPage(room,null);
  if(room!==CH.room||r.error)return;
  const first=r.data.length?r.data[0].id:Infinity,stick=nearBottom();
  CH.msgs=CH.msgs.filter(m=>m.id<first).concat(r.data);
  CH.pending=CH.pending.filter(p=>!r.data.some(m=>m.client_id&&m.client_id===p.cid));
  drawAll(stick);if(!stick&&r.data.length){CH.newBelow=Math.max(CH.newBelow,0)}updateJump();
}
addEventListener('online',()=>{setConn(CH.ch?'reconnecting':'ok');chatGap()});
addEventListener('offline',()=>setConn('offline'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&me&&live())chatGap()});

/* ---------- loading ---------- */
async function fetchPage(room,before){
  let q=sb.from('messages').select('*').order('id',{ascending:false}).limit(CHAT_PAGE+1);
  q=room?q.eq('course',room):q.is('course',null);if(HAS_SCH)q=q.eq('school_id',SCH);if(before)q=q.lt('id',before);
  const {data,error}=await q;if(error)return {error};
  return {data:data.slice(0,CHAT_PAGE).reverse(),hasMore:data.length>CHAT_PAGE};
}
const chatFriendly=e=>{const m=(e&&e.message)||String(e||'');
  if(/relation|schema cache/i.test(m))return 'Chat is not set up yet. Run chat_v7.sql in Supabase.';
  if(/Failed to fetch|NetworkError|network|offline/i.test(m))return 'Connection problem. Check your internet and try again.';
  if(/row-level|polic|permission/i.test(m))return "You can't use this room.";
  return m||'Something went wrong.'};
async function chatLoad(){
  const room=CH.room;CH.state='loading';CH.msgs=[];CH.pending=[];CH.hasMore=false;CH.newBelow=0;drawAll();
  if(!live()){CH.msgs=MEM_CHAT.filter(m=>(m.course||'')==room).slice(-CHAT_PAGE);CH.state='ready';drawAll(true);chatMembers();return}
  const r=await fetchPage(room,null);
  if(room!==CH.room||!listEl())return;
  if(r.error){CH.state='error';CH.err=chatFriendly(r.error);drawAll();return}
  CH.msgs=r.data;CH.hasMore=r.hasMore;CH.state='ready';drawAll(true);markReadSoon();chatMembers();
}
async function loadOlder(){
  if(CH.loadingMore||!CH.hasMore||!CH.msgs.length||!live())return;
  const room=CH.room,l=listEl(),h0=l.scrollHeight,t0=l.scrollTop;CH.loadingMore=true;drawAll();
  const r=await fetchPage(room,CH.msgs[0].id);
  CH.loadingMore=false;if(room!==CH.room)return;
  if(r.error){toast(chatFriendly(r.error),'err');drawAll();return}
  CH.msgs=r.data.concat(CH.msgs);CH.hasMore=r.hasMore;drawAll();
  const l2=listEl();if(l2)l2.scrollTop=l2.scrollHeight-h0+t0;
}
async function chatMembers(){
  const room=CH.room;let list=[];
  if(!live())list=(typeof users!='undefined'?users:[]).map(u=>({name:u.code_name||u.name,role:u.role}));
  else{const r=await sb.rpc('chat_members',{room_course:room||null,sid:HAS_SCH?SCH:null});if(!r.error&&r.data)list=r.data.map(x=>({name:x.member,role:x.member_role}))}
  if(room!==CH.room)return;CH.members=list;
}

/* ---------- sending (optimistic, retry-safe) ---------- */
const sendErr=e=>{const m=(e&&e.message)||String(e||'');
  if(e&&e.offline)return 'No connection';
  if(/Slow down/i.test(m))return 'Sending too fast';
  if(/too fast|minute/i.test(m))return 'Too many messages. Wait a minute';
  if(/already sent that/i.test(m))return 'Already sent';
  if(/suspended/i.test(m))return 'Account suspended';
  if(/row-level|polic|permission/i.test(m))return "You can't post here";
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'Connection problem';
  if(/too long/i.test(m))return 'Message too long';
  return 'Not sent'};
function promote(m,row){
  const old=mkey(m);CH.pending=CH.pending.filter(x=>x!==m);
  if(!CH.msgs.some(x=>x.id==row.id)){CH.msgs.push(row);CH.msgs.sort((a,b)=>a.id-b.id)}
  const el=document.getElementById('m-'+old);
  if(el){const tmp=document.createElement('div');tmp.innerHTML=rowHTML(row,prevOf(row));el.replaceWith(tmp.firstElementChild)}
  else if(onChat()&&(row.course||'')===CH.room)appendRow(row);
}
async function deliver(m){
  m.status='sending';delete m.err;updateRow(m);CH.busy=true;updateSend();
  try{
    if(!live()){const row={...m,id:nextId(MEM_CHAT),user_id:me.id,client_id:m.cid};delete row.status;delete row.cid;MEM_CHAT.push(row);promote(m,row);return}
    if(navigator.onLine===false)throw {offline:true,message:'offline'};
    const ins=await sb.from('messages').insert({course:m.course,body:m.body,reply_to:m.reply_to,client_id:m.cid,...sc()}).select().single();
    let row=ins.data;
    if(ins.error){
      if(ins.error.code=='23505'){const ex=await sb.from('messages').select('*').eq('client_id',m.cid).maybeSingle();row=ex.data;if(!row)throw ins.error}   // it had already arrived
      else throw ins.error;
    }
    promote(m,row);
  }catch(err){m.status='failed';m.err=sendErr(err);updateRow(m);toast(chatFriendly(err.offline?{message:'offline'}:err),'err')}
  finally{CH.busy=false;updateSend()}
}
async function chatSend(e){
  if(e)e.preventDefault();
  const ta=document.getElementById('ci');if(!ta||CH.busy)return;
  const body=ta.value.trim();if(!body)return;
  if(body.length>500)return toast('Messages can be 500 characters at most.','err');
  const r=CH.reply,m={cid:uid(),course:CH.room||null,body,author:myName(),author_role:me.role,user_id:me.id,created_at:new Date().toISOString(),status:'sending',reply_to:r?r.id:null,reply_author:r?r.author:null,reply_excerpt:r?r.excerpt:null};
  ta.value='';autosize();clearReply();CH.pending.push(m);CH.newBelow=0;appendRow(m);toBottom(true);updateJump();
  await deliver(m);
}
function chatRetry(cid){const m=CH.pending.find(x=>x.cid===cid);if(m&&!CH.busy)deliver(m)}
function chatDiscard(cid){CH.pending=CH.pending.filter(x=>x.cid!==cid);const el=document.getElementById('m-c'+cid);if(el)el.remove();if(!allMsgs().length)drawAll()}

/* ---------- reply ---------- */
function chatReply(id){
  const m=CH.msgs.find(x=>x.id==id);if(!m)return;
  CH.reply={id:m.id,author:m.author,excerpt:String(m.body).replace(/\s+/g,' ').slice(0,100)};
  renderReply();const ta=document.getElementById('ci');if(ta)ta.focus();
}
function clearReply(){CH.reply=null;renderReply()}
function renderReply(){
  const b=document.getElementById('cp-reply');if(!b)return;
  if(!CH.reply){b.hidden=true;b.innerHTML='';return}
  b.hidden=false;b.innerHTML=`${icon('reply',16)}<div class="cp-rq"><b>Replying to ${esc(CH.reply.author)}</b><span>${esc(CH.reply.excerpt)}</span></div><button type="button" class="cp-ic" onclick="clearReply()" aria-label="Cancel reply">${icon('x',18)}</button>`;
  fitSoon();
}
function chatJump(id){
  const el=document.getElementById('m-i'+id);
  if(!el){toast('That message is older than what is loaded. Scroll up to load earlier messages.','ok');return}
  el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1400);
}

/* ---------- delete (confirmed; the database enforces who may delete what) ---------- */
function chatDelAsk(id){
  const m=CH.msgs.find(x=>x.id==id);if(!m)return;
  ask('Delete this message?','"'+esc(String(m.body).slice(0,80))+(m.body.length>80?'…':'')+'" will be removed for everyone in this room.','Delete',async()=>{
    if(live()){const {data,error}=await sb.from('messages').delete().eq('id',id).select();
      if(error||!data||!data.length){toast(error?chatFriendly(error):'You are not allowed to delete this message.','err');return}}
    else{const i=MEM_CHAT.findIndex(x=>x.id==id);if(i>=0)MEM_CHAT.splice(i,1)}
    CH.msgs=CH.msgs.filter(x=>x.id!=id);if(CH.reply&&CH.reply.id==id)clearReply();drawAll();toast('Message deleted');
  });
}

/* ---------- composer ---------- */
function autosize(){const ta=document.getElementById('ci');if(!ta)return;ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,132)+'px';updateSend();fitSoon()}
function updateSend(){
  const ta=document.getElementById('ci'),b=document.getElementById('cp-send'),c=document.getElementById('cp-count');if(!ta||!b)return;
  const n=ta.value.length,empty=!ta.value.trim();
  b.disabled=empty||CH.busy||n>500;b.classList.toggle('busy',CH.busy);b.setAttribute('aria-busy',CH.busy?'true':'false');
  if(c){c.textContent=n>400?n+'/500':'';c.classList.toggle('bad',n>=500)}
}
function emojiToggle(force){
  const p=document.getElementById('cp-emoji'),b=document.getElementById('cp-emojibtn');if(!p)return;
  const open=force!==undefined?force:p.hidden;
  if(open&&!p.innerHTML)p.innerHTML=EMOJI.map(e=>`<button type="button" class="em" onclick="emojiPick('${e}')" aria-label="Insert ${e}">${e}</button>`).join('');
  p.hidden=!open;if(b)b.setAttribute('aria-expanded',String(open));
}
function emojiPick(e){const ta=document.getElementById('ci');if(!ta)return;const a=ta.selectionStart==null?ta.value.length:ta.selectionStart,z=ta.selectionEnd==null?a:ta.selectionEnd;
  if((ta.value.length-(z-a)+e.length)>500)return toast('Message is at the 500 character limit.','err');
  ta.value=ta.value.slice(0,a)+e+ta.value.slice(z);ta.setSelectionRange(a+e.length,a+e.length);emojiToggle(false);autosize();ta.focus()}
document.addEventListener('mousedown',e=>{if(!e.target.closest('#cp-emoji,#cp-emojibtn'))emojiToggle(false)});

/* @mention suggestions */
CH.pop={items:[],i:0,at:-1,pos:0};
function popTok(inp){const pos=inp.selectionStart==null?inp.value.length:inp.selectionStart,m=/(?:^|\s)@([^@\n]{0,24})$/.exec(inp.value.slice(0,pos));return m?{at:pos-m[1].length-1,q:m[1],pos}:null}
function popHide(){const p=document.getElementById('ms-pop');if(p)p.hidden=true;CH.pop.items=[]}
function popUpdate(){
  const inp=document.getElementById('ci'),pop=document.getElementById('ms-pop');if(!inp||!pop)return;
  const tok=popTok(inp);if(!tok)return popHide();
  const q=tok.q.toLowerCase(),self=myName().toLowerCase(),pool=nameList().filter(n=>n.toLowerCase()!==self).sort((a,b)=>a.localeCompare(b));
  const hit=pool.filter(n=>n.toLowerCase().startsWith(q)).concat(pool.filter(n=>!n.toLowerCase().startsWith(q)&&n.toLowerCase().includes(q))).slice(0,6);
  if(!hit.length)return popHide();
  CH.pop={items:hit,i:Math.min(CH.pop.i,hit.length-1),at:tok.at,pos:tok.pos};
  pop.innerHTML=hit.map((n,k)=>{const m=CH.members.find(x=>x.name==n),rl=m&&m.role&&m.role!='student'?`<span class="ms-role">${esc(m.role)}</span>`:'';
    return `<div class="ms-pi ${k==CH.pop.i?'hi':''}" role="option" aria-selected="${k==CH.pop.i}" data-k="${k}"><span class="ms-av">${initial(n)}</span><b>${esc(n)}</b>${rl}</div>`}).join('');
  pop.hidden=false;
}
function popPick(k){
  const inp=document.getElementById('ci'),n=CH.pop.items[k];if(!inp||!n)return;
  const v=inp.value,rest=v.slice(CH.pop.pos),ins='@'+n+' ',next=v.slice(0,CH.pop.at)+ins+rest.replace(/^ /,'');
  if(next.length>500){toast('Message is at the 500 character limit.','err');return popHide()}
  inp.value=next;const c=CH.pop.at+ins.length;inp.setSelectionRange(c,c);inp.focus();popHide();autosize();
}

/* ---------- page layout that survives the mobile keyboard ---------- */
let fitT=0;
function fitSoon(){cancelAnimationFrame(fitT);fitT=requestAnimationFrame(chatFit)}
function chatFit(){
  const cp=document.getElementById('cp');if(!cp)return;
  const vv=window.visualViewport,vh=vv?vv.height:window.innerHeight;
  const top=cp.getBoundingClientRect().top+(vv?vv.offsetTop*0:0);
  const tabs=document.getElementById('tabs'),tv=tabs&&getComputedStyle(tabs).display!='none'&&!document.body.classList.contains('kb');
  const bottom=tv?tabs.offsetHeight:0;
  const l=listEl(),was=l?nearBottom(160):false;
  cp.style.height=Math.max(260,Math.floor(vh-top-bottom-(window.innerWidth>900?24:0)))+'px';
  if(l&&(CH.keep||was)){l.scrollTop=l.scrollHeight;CH.keep=false}
  updateJump();
}
function chatEnter(){
  const onResize=()=>{if(document.activeElement&&document.activeElement.id=='ci')CH.keep=nearBottom(160);fitSoon()};
  const onVV=()=>{window.scrollTo(0,0);onResize()};
  const fin=e=>{if(e.target.id=='ci'&&!finePointer()){document.body.classList.add('kb');CH.keep=true;setTimeout(fitSoon,50)}};
  const fout=e=>{if(e.target.id=='ci')setTimeout(()=>{if(!document.activeElement||document.activeElement.id!='ci'){document.body.classList.remove('kb');fitSoon()}},250)};
  window.addEventListener('resize',onResize);document.addEventListener('focusin',fin);document.addEventListener('focusout',fout);
  if(window.visualViewport){visualViewport.addEventListener('resize',onVV);visualViewport.addEventListener('scroll',onVV)}
  CH.leave=()=>{window.removeEventListener('resize',onResize);document.removeEventListener('focusin',fin);document.removeEventListener('focusout',fout);
    if(window.visualViewport){visualViewport.removeEventListener('resize',onVV);visualViewport.removeEventListener('scroll',onVV)}
    document.body.classList.remove('kb');CH.leave=null};
}
function chatLeave(){if(CH.leave)CH.leave();popHide();emojiToggle(false);refreshUnread()}
addEventListener('hashchange',()=>{if(location.hash!='#chat')chatLeave();else fitSoon()});

/* ---------- the page ---------- */
function chatRoom(r){if(CH.leave)CH.leave();CH.room=r||'';CH.reply=null;V.chat()}
V.chat=()=>{
  if(!me)return location.hash='#login';
  if(CH.leave)CH.leave();
  const mine=myCourse();
  if(CH.room&&!isStaff()&&CH.room!==mine)CH.room='';
  const other=isStaff()?COURSES.filter(c=>c!==mine):[];
  const desc=CH.room?`Only students of ${CH.room} can read this room.`:`Open to everyone at ${schoolName()||'your school'}.`;
  app.innerHTML=`<section class="cp" id="cp" aria-label="Chat">
<header class="cp-head"><div class="cp-title"><h1>Chat</h1><p class="cp-desc tr" id="cp-desc">${esc(desc)}</p></div>
<div class="cp-rooms" role="tablist" aria-label="Chat rooms">
<button type="button" role="tab" aria-selected="${!CH.room}" class="cp-tab ${!CH.room?'on':''}" onclick="chatRoom('')">${icon('school',16)}<span>Global</span><i class="nb" data-ub="" hidden></i></button>
${mine?`<button type="button" role="tab" aria-selected="${CH.room==mine}" class="cp-tab ${CH.room==mine?'on':''}" data-c="${esc(mine)}" onclick="chatRoom(this.dataset.c)" title="${esc(mine)}">${icon('course',16)}<span class="tr">${esc(mine)}</span><i class="nb" data-ub="${esc(mine)}" hidden></i></button>`:`<a class="cp-tab" href="#settings">${icon('course',16)}<span>Set your course</span></a>`}
${other.length?`<select class="cp-more ${other.includes(CH.room)?'on':''}" id="ch_c" aria-label="Other course rooms"><option value="">More rooms…</option>${other.map(c=>`<option value="${esc(c)}" ${c==CH.room?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}</div>
<div class="cp-conn" id="cp-conn" role="status" hidden></div>${live()?'':'<div class="cp-conn demo">Local preview: messages stay in this browser tab.</div>'}</header>
<div class="cp-body"><div class="cp-list" id="cp-list" tabindex="0" aria-label="Messages" aria-live="polite"></div>
<button type="button" class="cp-jump" id="cp-jump" hidden onclick="CH.newBelow=0;toBottom(false);markReadSoon();updateJump()">${icon('down',16)}<span id="cp-jumpt">Jump to latest</span></button></div>
<div class="cp-reply" id="cp-reply" hidden></div>
<form class="cp-form" id="cp-form" autocomplete="off"><div class="ms-pop" id="ms-pop" role="listbox" hidden></div><div class="cp-emoji" id="cp-emoji" hidden></div>
<button type="button" class="cp-ic" id="cp-emojibtn" aria-label="Insert emoji" aria-expanded="false" onclick="emojiToggle()">${icon('smile',22)}</button>
<div class="cp-inwrap"><textarea id="ci" rows="1" maxlength="500" placeholder="${CH.room?'Message '+esc(CH.room):'Message everyone'}" aria-label="Message" enterkeyhint="send"></textarea><span class="cp-count" id="cp-count"></span></div>
<button class="cp-send" id="cp-send" type="submit" aria-label="Send message" disabled>${icon('send',20)}<span class="spin"></span></button></form></section>`;
  const ta=document.getElementById('ci'),l=listEl();
  document.getElementById('cp-form').onsubmit=chatSend;
  /* tapping Send / emoji must not steal focus from the textarea, otherwise the keyboard closes and the layout jumps under the finger */
  document.getElementById('cp-form').addEventListener('mousedown',e=>{if(e.target.closest('.cp-send,.cp-ic'))e.preventDefault()});
  ta.oninput=()=>{autosize();popUpdate()};ta.onclick=popUpdate;ta.onkeyup=e=>{if(/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key))popUpdate()};
  ta.onkeydown=e=>{
    const n=CH.pop.items.length,open=!document.getElementById('ms-pop').hidden&&n;
    if(open){
      if(e.key=='ArrowDown'){CH.pop.i=(CH.pop.i+1)%n;popUpdate();e.preventDefault()}
      else if(e.key=='ArrowUp'){CH.pop.i=(CH.pop.i-1+n)%n;popUpdate();e.preventDefault()}
      else if(e.key=='Enter'||e.key=='Tab'){popPick(CH.pop.i);e.preventDefault()}
      else if(e.key=='Escape'){popHide();e.stopPropagation()}
      return;
    }
    if(e.key=='Enter'&&!e.shiftKey&&!e.isComposing&&finePointer()){e.preventDefault();chatSend()}
  };
  ta.onblur=()=>setTimeout(popHide,150);
  document.getElementById('ms-pop').onmousedown=e=>{e.preventDefault();const it=e.target.closest('.ms-pi');if(it)popPick(+it.dataset.k)};
  const sel=document.getElementById('ch_c');if(sel)sel.onchange=e=>{if(e.target.value)chatRoom(e.target.value)};
  let st=0;l.addEventListener('scroll',()=>{if(st)return;st=requestAnimationFrame(()=>{st=0;if(l.scrollTop<90)loadOlder();if(nearBottom(120)){if(CH.newBelow){CH.newBelow=0}markReadSoon()}updateJump()})},{passive:true});
  chatEnter();updateChatBadges();setConn(CH.conn);chatFit();chatLoad();
  if(!finePointer()===false)ta.focus();
};

/* ---------- session hooks ---------- */
const _suChat=window.setUser;
window.setUser=function(){
  _suChat();
  if(me){if(live()){if(CH.ch&&CH.sch!==(HAS_SCH?SCH:null))chatStop();chatStart();refreshUnread()}}
  else{chatStop();CH.msgs=[];CH.pending=[];CH.unread={};CH.room='';CH.state='idle';updateChatBadges()}
};
const _lcChat=window.loadContent;
window.loadContent=async function(){await _lcChat();if(me&&live()){if(CH.ch&&CH.sch!==(HAS_SCH?SCH:null)){chatStop()}chatStart();refreshUnread()}};
