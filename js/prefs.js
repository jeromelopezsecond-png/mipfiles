/* Preferences: theme (dark / light / auto), mock exam behaviour, online-status privacy.
   Theme and exam settings are kept on this device. The "show when I'm online" switch is also saved on the account. */
const PREF_KEY='mip_prefs',PREF_DEF={theme:'dark',instant:true,autoNext:true,delay:2,showStatus:true};
let PREFS=(()=>{try{return {...PREF_DEF,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch(e){return {...PREF_DEF}}})();
const prefs=()=>PREFS;
function applyTheme(){
  let t=PREFS.theme;if(t==='auto')t=window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  document.documentElement.setAttribute('data-theme',t);
  let m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m)}
  m.content=t==='light'?'#f6efe4':'#171513';
}
function setPref(k,v){
  PREFS[k]=v;try{localStorage.setItem(PREF_KEY,JSON.stringify(PREFS))}catch(e){}
  if(k==='theme')applyTheme();
  if(k==='showStatus'&&typeof socialStatusChanged=='function')socialStatusChanged(v);
}
applyTheme();
if(window.matchMedia)matchMedia('(prefers-color-scheme: light)').addEventListener&&matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(PREFS.theme==='auto')applyTheme()});

const sw=(id,label,desc,on)=>`<label class="sw-row" for="${id}"><span><b>${label}</b><small>${desc}</small></span><input type="checkbox" role="switch" id="${id}" ${on?'checked':''}><i class="sw" aria-hidden="true"></i></label>`;
const _vSettingsP=V.settings;
V.settings=()=>{
  _vSettingsP();
  const P=prefs(),seg=(v,l,ic)=>`<button type="button" class="seg-b ${P.theme==v?'on':''}" data-t="${v}" role="radio" aria-checked="${P.theme==v}">${icon(ic,18)}<span>${l}</span></button>`;
  const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',moon='<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',auto='<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>';
  IC.sun=sun;IC.moon=moon;IC.auto=auto;
  const cards=`<div class="card pref-card" style="max-width:600px;margin-top:16px"><h3>Appearance</h3><p class="mt sm">Choose how MIPMIP Files looks on this device.</p>
<div class="seg" role="radiogroup" aria-label="Theme">${seg('dark','Dark','moon')}${seg('light','Light','sun')}${seg('auto','Auto','auto')}</div></div>
<div class="card pref-card" style="max-width:600px;margin-top:16px"><h3>Mock exams</h3>
${sw('pf_instant','Show the answer right away','See if you were right, plus the explanation, as soon as you answer.',P.instant)}
${sw('pf_auto','Go to the next question automatically','Moves on after a short pause. You can always tap Next to skip the wait.',P.autoNext)}
<div class="pf-delay"><label for="pf_delay"><b>Pause before the next question</b><small>Wrong answers get a little extra time to read the explanation.</small></label><select id="pf_delay">${[1,2,3,4,5].map(n=>`<option value="${n}" ${P.delay==n?'selected':''}>${n} second${n>1?'s':''}</option>`).join('')}</select></div></div>
<div class="card pref-card" style="max-width:600px;margin-top:16px"><h3>Privacy</h3>
${sw('pf_status','Show when I am online','Classmates in your school can see a green dot when you are active. Turn this off to appear offline.',P.showStatus)}
<p class="mt sm" style="margin:10px 0 0">${icon('user',14)} <a href="#profile">View and edit my profile</a></p></div>`;
  const first=app.querySelector('.card');if(first)first.insertAdjacentHTML('beforebegin','');
  app.insertAdjacentHTML('beforeend',cards);
  app.querySelectorAll('.seg-b').forEach(b=>b.onclick=()=>{setPref('theme',b.dataset.t);app.querySelectorAll('.seg-b').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on)});toast('Theme set to '+b.dataset.t)});
  document.getElementById('pf_instant').onchange=e=>{setPref('instant',e.target.checked);toast(e.target.checked?'Answers will show right away':'Answers will show at the end')};
  document.getElementById('pf_auto').onchange=e=>{setPref('autoNext',e.target.checked);toast(e.target.checked?'Auto-next is on':'Auto-next is off')};
  document.getElementById('pf_delay').onchange=e=>{setPref('delay',+e.target.value);toast('Pause set to '+e.target.value+' s')};
  document.getElementById('pf_status').onchange=e=>{setPref('showStatus',e.target.checked);toast(e.target.checked?'People can see when you are online':'You now appear offline')};
};
