/* Mock exam runner: the answer is shown right away and the exam moves on by itself (both can be turned off in Settings). */
const examOK=i=>{const q=X.qs[i],u=(X.a[i]||'').toString();return q.t=='id'?u.trim().toLowerCase()==String(q.a).toLowerCase():u==q.a};
function examGoNext(){if(!X)return;clearTimeout(X.auto);if(X.i<X.qs.length-1){X.i++;xr()}else xr()}
function examSchedule(ok){
  const P=prefs();if(!X)return;clearTimeout(X.auto);
  if(!P.autoNext||X.i>=X.qs.length-1){return}
  const ms=Math.round((P.instant?(P.delay+(ok?0:1.5)):0.6)*1000);X.autoMs=ms;X.auto=setTimeout(examGoNext,ms);
}
function pickAns(c){
  if(!X)return;const P=prefs(),i=X.i;X.lock=X.lock||{};
  if(P.instant&&X.lock[i])return;
  X.a[i]=c;if(P.instant)X.lock[i]=1;xr();
  if(P.instant||P.autoNext)examSchedule(examOK(i));
}
function checkId(){
  if(!X)return;const P=prefs(),i=X.i,el=document.getElementById('idn');if(el)X.a[i]=el.value;
  if(!String(X.a[i]||'').trim())return toast('Type your answer first.','err');
  X.lock=X.lock||{};if(P.instant)X.lock[i]=1;xr();if(P.instant||P.autoNext)examSchedule(examOK(i));
}
function xr(){
  const {qs,i,a,f,e}=X,q=qs[i],P=prefs(),locked=!!(P.instant&&X.lock&&X.lock[i]),ok=locked&&examOK(i);
  clearTimeout(X.auto);
  const last=i>=qs.length-1,pending=locked&&P.autoNext&&!last;
  const opts=q.t=='id'
    ?`<input id="idn" placeholder="Type your answer" value="${esc(a[i]||'')}" ${locked?'readonly':''} oninput="X.a[X.i]=this.value" onkeydown="if(event.key=='Enter'){event.preventDefault();${P.instant&&!locked?'checkId()':'examGoNext()'}}" autocomplete="off">${P.instant&&!locked?`<div class="row" style="margin-top:10px"><button class="btn" onclick="checkId()">Check answer</button></div>`:''}`
    :q.c.map((c,ci)=>{const picked=a[i]==c,isAns=c==q.a;
      const cls=locked?(isAns?'correct':picked?'wrong':'dim'):(picked?'sel':'');
      return `<button class="opt ${cls}" onclick="pickAns(this.dataset.v)" data-v="${esc(c)}" ${locked?'disabled':''}><kbd>${ci+1}</kbd><span class="ot">${esc(c)}</span>${locked&&isAns?`<span class="oi">${icon('check',18)}</span>`:locked&&picked?`<span class="oi">${icon('x',18)}</span>`:''}</button>`}).join('');
  const fb=locked?`<div class="fb ${ok?'good':'bad'}" role="status" aria-live="polite"><div class="fb-h">${icon(ok?'check':'x',20)}<b>${ok?'Correct!':'Not quite'}</b></div>${ok?'':`<div class="fb-a">Correct answer: <b>${esc(q.a)}</b></div>`}${q.e?`<div class="fb-e">${esc(q.e)}</div>`:''}
    <div class="fb-act">${pending?`<span class="fb-t">Next question in ${Math.max(1,Math.round((X.autoMs||((P.delay+(ok?0:1.5))*1000))/1000))}s…</span>`:''}<button class="btn ${pending?'g':''}" onclick="${last?'confirmSubmit()':'examGoNext()'}">${last?'Finish exam':'Next question'}</button></div>${pending?`<i class="fb-bar" style="animation-duration:${(P.delay+(ok?0:1.5))}s"></i>`:''}</div>`:'';
  app.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px"><b>${esc(e.title)}</b><span class="timer" id="tm"></span></div>
<div class="qn">${qs.map((_,k)=>`<button class="${a[k]!=null&&a[k]!==''?'ans':''} ${k==i?'cur':''} ${f.has(k)?'flag':''}" onclick="clearTimeout(X.auto);X.i=${k};xr()" aria-label="Question ${k+1}">${k+1}</button>`).join('')}</div>
<div class="card"><div class="mt sm">Question ${i+1} of ${qs.length}</div><h3 style="margin:8px 0 12px">${esc(q.q)}</h3>${opts}${fb}</div>
<p class="mt sm">Tip: press 1 to 4 to answer, the arrow keys to move, F to flag.</p><div class="row"><button class="btn g" onclick="clearTimeout(X.auto);X.i=Math.max(0,X.i-1);xr()">Previous</button><button class="btn g" onclick="examGoNext()">Next</button><button class="btn g" onclick="X.f.has(X.i)?X.f.delete(X.i):X.f.add(X.i);xr()">${f.has(i)?'Unflag':'Flag'}</button><button class="btn" onclick="confirmSubmit()">Submit</button></div>`;
  const s=Math.max(0,Math.round((X.end-Date.now())/1000)),t=document.getElementById('tm');if(t)t.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
