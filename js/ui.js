/* Interactive helpers: dialogs, quick-jump palette, shortcuts, effects */
const CN_A=['Silent','Midnight','Golden','Hidden','Crimson','Quiet','Velvet','Lunar','Amber','Phantom'],CN_B=['Owl','Falcon','Scholar','Raven','Fox','Cipher','Comet','Archivist','Lynx','Quill'];
function rollCode(){const el=$('#cn');if(!el)return;let k=0;const t=setInterval(()=>{el.value=CN_A[Math.random()*CN_A.length|0]+' '+CN_B[Math.random()*CN_B.length|0];if(++k>8)clearInterval(t)},60)}
function confirmLogout(){ask('Sign out?','You will need to sign in again to keep studying.','Sign out',logout)}
function goExam(t){pendX=t;location.hash=='#archive'?route():location.hash='#archive'}
function clearF(){app.querySelectorAll('select').forEach(s=>s.value=s.id=='srt'?'new':'');$('#q').value='';setX('All')}

function ask(title,text,okLabel,onOk){const d=document.createElement('div');d.className='mdl';
d.innerHTML=`<div class="mc" role="dialog" aria-modal="true"><h3>${title}</h3><p class="mt">${text}</p><div class="row" style="justify-content:flex-end"><button class="btn g" data-n>Cancel</button><button class="btn" data-y>${okLabel}</button></div></div>`;
document.body.appendChild(d);const onKey=e=>{if(e.key=='Escape')close()},close=()=>{d.remove();removeEventListener('keydown',onKey)};
addEventListener('keydown',onKey);d.onclick=e=>{if(e.target==d)close()};d.querySelector('[data-n]').onclick=close;
d.querySelector('[data-y]').onclick=()=>{close();onOk()};d.querySelector('[data-y]').focus()}

function palette(){if(!me||document.querySelector('.pal'))return;
const items=[['Dashboard','Page','#dash'],['Archive','Page','#archive'],['Mock Exams','Page','#exams'],...R.map(r=>[r.title,r.subject,'#r/'+r.id]),...E.map(e=>[e.title,'Mock exam','#exam/'+e.id]),['Sign out','Account','#out']];
const d=document.createElement('div');d.className='mdl pal';
d.innerHTML='<div class="mc"><input id="pq" placeholder="Jump to a page, reviewer or exam" autocomplete="off"><div id="pl"></div><div class="mt sm" style="padding:8px 4px 0">Up and down to move, Enter to open, Esc to close</div></div>';
document.body.appendChild(d);let sel=0,L=[];const pq=d.querySelector('#pq'),pl=d.querySelector('#pl');
const draw=()=>{const q=pq.value.toLowerCase().trim();L=items.filter(i=>!q||(i[0]+' '+i[1]).toLowerCase().includes(q)).slice(0,8);sel=Math.min(sel,Math.max(0,L.length-1));
pl.innerHTML=L.length?L.map((i,k)=>`<div class="pi ${k==sel?'on':''}" data-k="${k}"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join(''):'<div class="mt" style="padding:14px">Nothing found.</div>'};
const go=i=>{d.remove();if(i[2]=='#out')confirmLogout();else location.hash=i[2]};
pq.oninput=()=>{sel=0;draw()};pl.onclick=e=>{const p=e.target.closest('.pi');if(p)go(L[+p.dataset.k])};
pq.onkeydown=e=>{if(e.key=='ArrowDown'){sel=Math.min(L.length-1,sel+1);draw();e.preventDefault()}else if(e.key=='ArrowUp'){sel=Math.max(0,sel-1);draw();e.preventDefault()}else if(e.key=='Enter'&&L[sel])go(L[sel]);else if(e.key=='Escape')d.remove()};
d.onclick=e=>{if(e.target==d)d.remove()};draw();pq.focus()}

addEventListener('keydown',e=>{const t=document.activeElement.tagName,typing=/INPUT|TEXTAREA|SELECT/.test(t);
if(((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()=='k')||(e.key=='/'&&!typing)){e.preventDefault();palette();return}
if(!X||typing||e.metaKey||e.ctrlKey||document.querySelector('.mdl'))return;const q=X.qs[X.i];
if(/^[1-9]$/.test(e.key)&&q.c){const c=q.c[+e.key-1];if(c){X.a[X.i]=c;xr()}}
else if(e.key=='ArrowRight'){X.i=Math.min(X.qs.length-1,X.i+1);xr()}
else if(e.key=='ArrowLeft'){X.i=Math.max(0,X.i-1);xr()}
else if(e.key.toLowerCase()=='f'){X.f.has(X.i)?X.f.delete(X.i):X.f.add(X.i);xr()}});

addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--sx',e.clientX-r.left+'px');c.style.setProperty('--sy',e.clientY-r.top+'px')}});

function confetti(){const c=['#d6a15d','#f3cd98','#b2733a','#f5efe6','#8fd19e'],w=document.createElement('div');w.className='cf';
for(let i=0;i<70;i++){const p=document.createElement('i');p.style.cssText=`left:${Math.random()*100}%;background:${c[i%5]};animation-duration:${2+Math.random()*2}s;animation-delay:${Math.random()*.6}s`;w.appendChild(p)}
document.body.appendChild(w);setTimeout(()=>w.remove(),4800)}
