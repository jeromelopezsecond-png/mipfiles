/* About Us + Privacy Policy (Philippines, Data Privacy Act of 2012 / RA 10173).
   EDIT THE BLOCK BELOW. Everything in the pages is filled in from these values.
   This is a template, not legal advice. Have it reviewed (a lawyer or your school's data protection office) before you rely on it. */
const SITE={
  name:'MIPMIP Files',
  tagline:'Mastery in Progress',
  owner:'Jerome Adler',                      // shown in the footer and the policy
  dpo:'Jerome Adler',                        // Data Protection Officer (person who answers privacy requests)
  email:'jeromelopezsecond@gmail.com',            // <-- CHANGE: where people send privacy requests and questions
  address:'Philippines',                     // <-- CHANGE: your address or city, if you want to show it
  hosting:'Cloudflare',                      // where the website is hosted
  backend:'Supabase',                        // where accounts, files and chat are stored
  updated:'12 November 2026',                // <-- change when you edit the policy
  retention:'30 days'                        // how long until a deleted account is fully removed
};

function legalHTML(kind){
  const e=esc,S=SITE;
  if(kind=='about')return `<h3>About ${e(S.name)}</h3>
<p class="mt"><b>${e(S.tagline)}.</b> ${e(S.name)} is a free study hub made by a student, for students. It keeps reviewers, mock exams and study materials in one place so you spend less time searching and more time learning.</p>
<h4>What you can do here</h4>
<ul><li><b>Reviewers:</b> find files by subject, exam period, year level and section, and download or preview them.</li>
<li><b>Mock exams:</b> practice with timed exams, then see the correct answers and explanations.</li>
<li><b>Your course:</b> pick your course and year, and see the subjects that matter to you.</li>
<li><b>Chat:</b> talk with your school (global room) and with students in your own course. Type @ to mention someone.</li></ul>
<h4>Every school has its own space</h4>
<p>Each school has its own separate subjects, courses, reviewers, exams, chat and students. One school cannot see another school's data. You can use a code name so your identity stays private in chat.</p>
<h4>Who makes it</h4>
<p>${e(S.name)}™ is made by <b>${e(S.owner)}</b> and kept running by students, teachers and moderators who share reviewers. Want to contribute materials? Ask the admin or a moderator of your school.</p>
<h4>Contact</h4>
<p>Questions, feedback or a problem? Email <b>${e(S.email)}</b>.</p>`;

  return `<h3>Privacy Policy</h3>
<p class="mt sm">Last updated: ${e(S.updated)}</p>
<p>Your privacy matters to us. This policy explains what personal data ${e(S.name)} collects, why, who can see it, and what your rights are. We follow the <b>Data Privacy Act of 2012 (Republic Act No. 10173)</b>, its Implementing Rules and Regulations, and the issuances of the <b>National Privacy Commission (NPC)</b> of the Philippines.</p>

<h4>1. Who is responsible for your data</h4>
<p>The personal information controller is <b>${e(S.owner)}</b> (${e(S.name)}), ${e(S.address)}. Our Data Protection Officer is <b>${e(S.dpo)}</b>. You can reach us at <b>${e(S.email)}</b>.</p>

<h4>2. What we collect</h4>
<ul><li><b>Account details:</b> full name, email address, username, code name, school, course, year level and section.</li>
<li><b>Password:</b> handled by our authentication provider and stored only as a secure hash. We cannot read it.</li>
<li><b>Content you create:</b> chat messages you send (shown with your code name).</li>
<li><b>Technical data:</b> basic information such as IP address and browser type, which our service providers record to keep the service working and secure.</li></ul>
<p>We do not ask for government IDs, financial information, or sensitive personal information as defined by the Data Privacy Act (for example health, religion or political views). Please do not share these in chat.</p>

<h4>3. Why we use your data, and our legal basis</h4>
<p>We process your data based on your <b>consent</b> (Section 12(a) of the Data Privacy Act), which you give when you create your account, and to protect the security of the service. We use it to:</p>
<ul><li>create and manage your account and confirm your email;</li>
<li>show you the reviewers, exams and subjects for your school, course and year;</li>
<li>run the chat, including showing your code name and letting others @mention you;</li>
<li>keep the service safe, prevent abuse, and handle reports;</li>
<li>contact you about your account (for example email confirmation or a password reset).</li></ul>
<p>We do <b>not</b> sell your personal data, and we do not use it for advertising.</p>

<h4>4. Who can see your data</h4>
<ul><li><b>Other students</b> in your school can see your <b>code name</b> (not your email) in chat. Course rooms are visible only to students of that course.</li>
<li><b>Admins and moderators of your school</b> can see your name, email, course, year and section so they can manage accounts.</li>
<li><b>Other schools cannot</b> see your data.</li>
<li><b>Service providers</b> that run the service for us: ${e(S.backend)} (accounts, database, file storage) and ${e(S.hosting)} (website hosting). They may only process data on our instructions.</li>
<li>We disclose data when the law requires it, for example a lawful order from a court or government agency.</li></ul>

<h4>5. Where your data is stored</h4>
<p>Our providers may store data on servers outside the Philippines. We take reasonable steps so that your data stays protected, as required by the Data Privacy Act.</p>

<h4>6. How long we keep it</h4>
<p>We keep your data while your account is active. Chat messages stay until they are deleted. If you ask us to delete your account, we remove or anonymize your personal data within ${e(S.retention)}, except where we must keep something to comply with the law or to resolve a dispute. Backups are overwritten on a regular schedule.</p>

<h4>7. How we protect it</h4>
<ul><li>Connections use HTTPS (encrypted in transit).</li>
<li>Passwords are stored as hashes.</li>
<li>Access is limited by role (student, moderator, admin) and each school's data is separated by database-level security rules.</li>
<li>Files are stored privately and shared only through short-lived links.</li></ul>
<p>No online service is 100% secure. If a personal data breach happens that requires notification, we will notify the NPC and the affected users within <b>72 hours</b> of knowing about it, as required by NPC rules.</p>

<h4>8. Your rights as a data subject</h4>
<p>Under Section 16 of the Data Privacy Act you have the right to:</p>
<ul><li><b>be informed</b> about how your data is processed;</li>
<li><b>access</b> the personal data we hold about you;</li>
<li><b>object</b> to processing, or withdraw your consent;</li>
<li><b>correct</b> inaccurate data (you can edit your course, year and section in Settings);</li>
<li><b>erase or block</b> your data from our system;</li>
<li><b>data portability</b>, which means getting a copy of your data in a common format;</li>
<li><b>be indemnified</b> for damages caused by inaccurate, false, unlawfully obtained or unauthorized use of your data;</li>
<li><b>file a complaint</b> with the National Privacy Commission (<b>privacy.gov.ph</b>).</li></ul>
<p>To use any of these rights, email <b>${e(S.email)}</b>. We may need to confirm it is really you before we act on a request.</p>

<h4>9. Minors</h4>
<p>${e(S.name)} is made for students. If you are under 18, please ask your parent or guardian before creating an account. By creating an account, you confirm that you are allowed to give this consent.</p>

<h4>10. Cookies and browser storage</h4>
<p>We use your browser's storage only to keep you signed in and remember simple settings (for example your onboarding progress). We do not use advertising or tracking cookies.</p>

<h4>11. Changes to this policy</h4>
<p>We may update this policy. The date at the top shows the latest version. If a change is important, we will ask for your consent again.</p>

<h4>12. Contact</h4>
<p>${e(S.dpo)}, Data Protection Officer, ${e(S.name)} &middot; ${e(S.email)}</p>`;
}

function openLegal(kind){
  closeLegal();
  const d=document.createElement('div');d.className='mdl form';d.id='lg';
  d.innerHTML=`<div class="mc" role="dialog" aria-modal="true"><div class="legal">${legalHTML(kind)}</div><div class="row" style="justify-content:flex-end"><button class="btn" data-x>Close</button></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('mousedown',e=>{if(e.target===d)closeLegal()});
  d.querySelector('[data-x]').onclick=closeLegal;
  addEventListener('keydown',legalKey);
  d.querySelector('[data-x]').focus();
}
function legalKey(e){if(e.key=='Escape')closeLegal()}
function closeLegal(){const d=document.getElementById('lg');if(d)d.remove();removeEventListener('keydown',legalKey)}

/* Existing users who signed up before the policy existed are asked to review and accept it once */
function ensureConsent(){
  if(typeof live!='function'||!live()||!me||!('privacy_accepted_at' in me)||me.privacy_accepted_at||document.getElementById('consent'))return;
  const d=document.createElement('div');d.className='mdl form';d.id='consent';
  d.innerHTML=`<div class="mc" role="dialog" aria-modal="true"><div class="legal">${legalHTML('privacy')}</div>
<p class="mt sm">By choosing "I agree" you consent to the processing of your personal data as described above.</p>
<div class="row" style="justify-content:flex-end"><button class="btn g" id="cs_no">Decline and sign out</button><button class="btn" id="cs_ok">I agree</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector('#cs_ok').onclick=async()=>{
    const b=d.querySelector('#cs_ok');b.disabled=true;const now=new Date().toISOString();
    const {error}=await sb.from('profiles').update({privacy_accepted_at:now}).eq('id',me.id);
    if(error){b.disabled=false;toast(error.message);return}
    me.privacy_accepted_at=now;d.remove();
  };
  d.querySelector('#cs_no').onclick=()=>{d.remove();logout()};
}
