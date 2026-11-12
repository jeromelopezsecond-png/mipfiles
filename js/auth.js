/* Supabase auth layer. Keys live in js/config.js */
const HASH0=location.hash;
const LIVE=typeof SUPABASE_URL!=='undefined'&&!SUPABASE_URL.startsWith('PASTE')&&!SUPABASE_ANON_KEY.startsWith('PASTE')&&!!window.supabase;
let sb=null,recov=false,confirmed=/type=(signup|email)/.test(HASH0),lastEmail='';
if(LIVE){try{sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY)}catch(e){console.error(e);sb=null}}
if(sb){
setTimeout(()=>{if(!ready){ready=true;route()}},5000);
if(/error_code=otp_expired|error=access_denied/.test(HASH0))setTimeout(()=>toast('That confirmation link expired or was already used. Sign in, or register again.'),800);
const _l=V.login,back=()=>location.origin+location.pathname;
const panel=(ic,t,s,b)=>`${stage()}<div class="card" style="max-width:440px;margin:60px auto;text-align:center"><div class="big" style="font-size:44px">${ic}</div><h2>${t}</h2><p class="mt">${s}</p>${b}</div>`;
function resetView(){app.innerHTML=`<div class="card" style="max-width:420px;margin:30px auto"><h2 style="margin-top:0">Set a new password</h2>${recov?'':'<p class="mt sm">Open the reset link from your email to continue.</p>'}<form novalidate onsubmit="event.preventDefault();doReset()"><label class="fl sm mt" for="pw">New password</label><input id="pw" type="password" autocomplete="new-password"><div class="err" id="e_pw"></div><label class="fl sm mt" for="pw2">Confirm password</label><input id="pw2" type="password" autocomplete="new-password"><div class="err" id="e_pw2"></div><button class="btn" style="width:100%;margin-top:6px">Update password</button></form></div>`}
V.login=t=>{
if(t=='reset')return resetView();
if(t=='confirmed'&&me){app.innerHTML=panel('\u2713','Email confirmed',`Your account is active. Welcome to MIPMIP Files, ${esc(me.name)}.`,`<button class="btn" onclick="confirmed=false;location.hash='#dash'">Continue</button>`);return}
if(t=='check'){app.innerHTML=panel('\u2709','Check your email',`We sent a confirmation link to <b>${esc(lastEmail)}</b>. Click it to activate your account.`,`<div class="row" style="justify-content:center"><button class="btn g" onclick="resend()">Resend email</button><a class="btn g" href="#login">Back to sign in</a></div>`);return}
_l(t);const b=app.querySelector('.banner');if(b)b.remove()};
window.resend=async()=>{if(!lastEmail)return;const {error}=await sb.auth.resend({type:'signup',email:lastEmail,options:{emailRedirectTo:back()}});
toast(error?(/rate|seconds/i.test(error.message)?'Please wait a minute before resending.':error.message):'Confirmation email sent again.')};
window.doLogin=async()=>{const e=$('#em').value.trim().toLowerCase(),p=$('#pw').value;fe('e_em','');fe('e_pw','');let ok=true;
if(!emRe.test(e)){fe('e_em','Enter a valid email address.');ok=false}if(!p){fe('e_pw','Enter your password.');ok=false}if(!ok)return;
const {error}=await sb.auth.signInWithPassword({email:e,password:p});
if(!error)return;
if(/confirm/i.test(error.message)){lastEmail=e;$('#e_pw').innerHTML='Please confirm your email first. <a href="#" style="text-decoration:underline" onclick="resend();return false">Resend link</a>';return}
fe('e_pw',/invalid login/i.test(error.message)?'Incorrect email or password.':error.message)};
window.doReg=async()=>{const n=$('#nm').value.trim(),u=$('#un').value.trim(),cn=$('#cn').value.trim(),e=$('#em').value.trim().toLowerCase(),p=$('#pw').value,p2=$('#pw2').value;
const E={sch:($('#schw')&&!$('#schw').hidden&&!$('#sch').value)?'Choose your school.':'',nm:n.length<2?'Enter your full name.':'',cn:/^[\w '\-]{2,24}$/.test(cn)?'':'Use 2 to 24 letters or numbers for your code name.',un:!/^[a-z0-9_]{3,20}$/i.test(u)?'Use 3 to 20 letters, numbers or underscores.':'',em:!emRe.test(e)?'Enter a valid email address.':'',pw:pwErr(p),pw2:p!=p2?'Passwords do not match.':''};
Object.keys(E).forEach(k=>fe('e_'+k,E[k]));if(Object.values(E).some(Boolean))return;
const {data:free}=await sb.rpc('username_available',{u:u});if(free===false)return fe('e_un','That username is taken.');
const {data,error}=await sb.auth.signUp({email:e,password:p,options:{emailRedirectTo:back(),data:{full_name:n.slice(0,40),username:u.toLowerCase(),code_name:cn,school_id:($('#sch')&&$('#sch').value)?+$('#sch').value:null,year_level:+$('#yr').value}}});
if(error)return fe('e_em',error.message);
if(data.user&&data.user.identities&&!data.user.identities.length)return fe('e_em','That email is already registered.');
if(!data.session){lastEmail=e;location.hash='#login/check'}};
window.doForgot=async()=>{const e=$('#em').value.trim().toLowerCase();fe('e_em','');if(!emRe.test(e))return fe('e_em','Enter a valid email address.');
const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:back()});const m=$('#e_em');
if(error)return fe('e_em',/rate|seconds/i.test(error.message)?'Please wait a minute before trying again.':error.message);
m.style.color='var(--ok)';fe('e_em','If that email is registered, a reset link is on its way.')};
window.doReset=async()=>{const p=$('#pw').value,p2=$('#pw2').value;fe('e_pw','');fe('e_pw2','');const pe=pwErr(p);if(pe)return fe('e_pw',pe);if(p!=p2)return fe('e_pw2','Passwords do not match.');
const {error}=await sb.auth.updateUser({password:p});if(error)return fe('e_pw',error.message);recov=false;toast('Password updated');location.hash='#dash'};
window.logout=async()=>{await sb.auth.signOut();bm=new Set();hist=[];toast('Signed out');location.hash='#home'};
async function loadProfile(s){if(!s){me=null;user=null;setUser();return}
const {data}=await sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle();
if(data&&data.suspended){await sb.auth.signOut();toast('This account is suspended.');return}
me=data?{...data,name:data.full_name}:{name:s.user.email,email:s.user.email,role:'student'};user=me.name;setUser()}
sb.auth.onAuthStateChange((ev,s)=>{if(ev=='PASSWORD_RECOVERY')recov=true;
setTimeout(async()=>{try{await loadProfile(s);if(me&&typeof loadContent=='function')await loadContent()}catch(e){console.error(e)}ready=true;
if(recov){location.hash=='#login/reset'?route():location.hash='#login/reset';return}
if(confirmed&&me&&(ev=='SIGNED_IN'||ev=='INITIAL_SESSION')){location.hash=='#login/confirmed'?route():location.hash='#login/confirmed';return}
if(me&&location.hash.startsWith('#login')&&!location.hash.startsWith('#login/confirmed')){const n=next||('#'+landing());next=null;location.hash=n;return}
route()},0)});
}else{ready=true;route();console.info('MIPMIP: Supabase not active, running in demo mode.');if(LIVE)toast('Supabase setup error. Check the URL and key.')}
