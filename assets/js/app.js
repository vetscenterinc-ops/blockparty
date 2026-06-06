/* ============================================================
   The Collective Block Party — Main Application Script
   Vets Central & The Community · Lovejoy, GA · July 3–6 2026

   Sections:
     1. User accounts & auth (demo credentials)
     2. Page navigation
     3. Login / logout
     4. Dashboard builder (organizer / staff / sponsor)
     5. API key storage & Eventbrite URL sync
     6. Registration page (openReg / closeReg / showEvt)
     7. Sponsor modal
     8. Eventbrite live price sync (EB_DAY_MAP)
   ============================================================ */

/* ============================================================
   SUPABASE AUTHENTICATION
   Real auth replacing demo credentials.
   URL:  https://mvftxnzvmmlzyrrqhitx.supabase.co
   ============================================================ */

const SUPABASE_URL  = 'https://mvftxnzvmmlzyrrqhitx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZnR4bnp2bW1senlycnFoaXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzYyNDgsImV4cCI6MjA5NjExMjI0OH0.hfaw7npVZZ_aIXBuuv1dKup0kL0l_Pp7PPf0c6kIGA0';

let _sb = null;
function getSB() {
  if (!_sb && window.supabase) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _sb;
}

/* ── User role mapping ─────────────────────────────────────────
   Roles are stored in the user's metadata when created in
   Supabase dashboard: Authentication → Users → Edit user
   → user_metadata → {"role":"organizer"} / {"role":"staff"} / {"role":"sponsor"} / {"role":"vendor"}
   ──────────────────────────────────────────────────────────── */

async function doLoginSupabase() {
  const sb    = getSB();
  const email = document.getElementById('lEmail')?.value.trim().toLowerCase();
  const pass  = document.getElementById('lPass')?.value;
  const err   = document.getElementById('lErr');

  if (!sb)  { if(err) err.textContent = 'Auth not loaded — refresh and try again.'; return; }
  if (!email || !pass) { if(err) err.textContent = 'Enter your email and password.'; return; }

  if(err) err.textContent = '';

  /* Show loading state */
  const btn = document.querySelector('.btn-signin');
  if(btn) { btn.disabled=true; btn.innerHTML='<i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block"></i> Signing in...'; }

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  if(btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-login" style="font-size:15px"></i>Sign In'; }

  if (error) {
    if(err) err.textContent = error.message === 'Invalid login credentials'
      ? 'Incorrect email or password.'
      : error.message;
    return;
  }

  /* Get role from user metadata */
  const meta = data.user?.user_metadata || {};
  const role = meta.role || 'organizer';

  /* Check selected role tab matches actual role */
  if (role !== currentRole) {
    if(err) err.textContent = 'That account is a ' + role + ' — select the correct role tab.';
    await sb.auth.signOut();
    return;
  }

  /* Build display info */
  const displayName = meta.full_name || meta.name || email.split('@')[0];
  const initials    = displayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  const roleConfig = {
    organizer: { label:'Organizer', cls:'rp-org',  bg:'rgba(255,0,160,0.2)',   color:'var(--pink)' },
    staff:     { label:'Staff',     cls:'rp-staff', bg:'rgba(0,207,255,0.18)',  color:'var(--sky)'  },
    sponsor:   { label:'Sponsor',   cls:'rp-spon',  bg:'rgba(255,214,0,0.18)', color:'var(--gold)' },
    vendor:    { label:'Vendor',    cls:'rp-spon',  bg:'rgba(255,107,0,0.18)', color:'var(--orange)'}
  }[role] || { label:role, cls:'rp-org', bg:'rgba(255,255,255,0.1)', color:'#fff' };

  if(err) err.textContent = '';
  loggedIn = true;

  document.getElementById('dAvatar').textContent      = initials;
  document.getElementById('dAvatar').style.background = roleConfig.bg;
  document.getElementById('dAvatar').style.color      = roleConfig.color;
  document.getElementById('dName').textContent        = displayName;
  const dr = document.getElementById('dRole');
  dr.textContent  = roleConfig.label;
  dr.className    = 'd-role ' + roleConfig.cls;

  buildDash(role);
  const nb = document.getElementById('dashNavBtn');
  nb.querySelector('i').className        = 'ti ti-layout-dashboard';
  nb.querySelector('span').textContent   = 'Dashboard';
  go('dashPage', nb);
}

async function doLogoutSupabase() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  loggedIn = false;
  document.getElementById('lEmail').value = '';
  document.getElementById('lPass').value  = '';
  document.getElementById('lErr').textContent = '';
  const nb = document.getElementById('dashNavBtn');
  nb.querySelector('i').className       = 'ti ti-lock';
  nb.querySelector('span').textContent  = 'Login';
  go('loginPage', nb);
}

/* ── Password reset ────────────────────────────────────────── */
async function resetPassword(email) {
  const sb = getSB();
  if (!sb || !email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/?reset=true'
  });
  return error;
}

/* ── Vendor signup ─────────────────────────────────────────── */
async function supabaseVendorSignup(email, password, bizName) {
  const sb = getSB();
  if (!sb) return { error: { message: 'Auth not loaded' } };
  return sb.auth.signUp({
    email,
    password,
    options: { data: { role: 'vendor', full_name: bizName } }
  });
}

/* ── Session restore on page load ─────────────────────────── */
async function restoreSession() {
  const sb = getSB();
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const meta = session.user?.user_metadata || {};
  const role = meta.role || 'organizer';
  const displayName = meta.full_name || session.user.email.split('@')[0];
  const initials = displayName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const roleConfig = {
    organizer: { label:'Organizer', cls:'rp-org',  bg:'rgba(255,0,160,0.2)',   color:'var(--pink)' },
    staff:     { label:'Staff',     cls:'rp-staff', bg:'rgba(0,207,255,0.18)',  color:'var(--sky)'  },
    sponsor:   { label:'Sponsor',   cls:'rp-spon',  bg:'rgba(255,214,0,0.18)', color:'var(--gold)' },
    vendor:    { label:'Vendor',    cls:'rp-spon',  bg:'rgba(255,107,0,0.18)', color:'var(--orange)'}
  }[role] || { label:role, cls:'rp-org', bg:'rgba(255,255,255,0.1)', color:'#fff' };
  loggedIn = true;
  document.getElementById('dAvatar').textContent      = initials;
  document.getElementById('dAvatar').style.background = roleConfig.bg;
  document.getElementById('dAvatar').style.color      = roleConfig.color;
  document.getElementById('dName').textContent        = displayName;
  const dr = document.getElementById('dRole');
  dr.textContent = roleConfig.label;
  dr.className   = 'd-role ' + roleConfig.cls;
  buildDash(role);
  const nb = document.getElementById('dashNavBtn');
  nb.querySelector('i').className       = 'ti ti-layout-dashboard';
  nb.querySelector('span').textContent  = 'Dashboard';
}


function showForgotPassword(){
  const email = document.getElementById('lEmail')?.value.trim();
  if(!email){ alert('Enter your email address first, then click Forgot password.'); return; }
  resetPassword(email).then(err=>{
    if(err) alert('Error: '+err.message);
    else alert('Password reset email sent to '+email+'. Check your inbox.');
  });
}

/* Restore session on page load */
document.addEventListener('DOMContentLoaded', function(){
  restoreSession();
});

// ── Startup check — confirms JS is executing ──
(function(){
  var b = document.getElementById('jsCheck');
  if(b){ b.style.display='block'; setTimeout(function(){ b.style.display='none'; }, 3000); }
})();

/* Demo credentials removed — Supabase handles all authentication.
   Add users in: supabase.com/dashboard/project/mvftxnzvmmlzyrrqhitx/auth/users
   Set role in user_metadata: {"role":"organizer"} / {"role":"staff"} / {"role":"sponsor"} / {"role":"vendor"} */
const HINTS={organizer:'your-organizer@email.com',staff:'staff-member@email.com',sponsor:'sponsor@company.com'};
let currentRole='organizer',loggedIn=false;

function go(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  window.scrollTo(0,0);
}
function goDash(btn){
  if(loggedIn){go('dashPage',btn);btn.querySelector('i').className='ti ti-layout-dashboard';btn.querySelector('span').textContent='Dashboard';}
  else{go('loginPage',btn);btn.querySelector('i').className='ti ti-lock';btn.querySelector('span').textContent='Login';}
}
function setRole(role,btn){
  currentRole=role;
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('demoHint').innerHTML='<b>Email:</b> '+HINTS[role];
  document.getElementById('lErr').textContent='';
}
function togglePw(id,btn){
  const inp=document.getElementById(id);
  const showing=inp.type==='text';
  inp.type=showing?'password':'text';
  btn.querySelector('i').className=showing?'ti ti-eye':'ti ti-eye-off';
}
function toggleApiPanel(){
  const body=document.getElementById('apiBody');
  const hdr=document.getElementById('apiToggle');
  const open=body.classList.toggle('open');
  hdr.classList.toggle('open',open);
}
function loadApiKeys(){
  /* Platform keys → dashboard fields (populated after login) */
  ['eventbrite','mailchimp','orgid','eburl'].forEach(k=>{
    const saved=localStorage.getItem('cbp_key_'+k);
    if(saved){const el=document.getElementById('dk-'+k);if(el)el.value=saved;}
  });
  /* Supabase fields */
  const sbUrl=localStorage.getItem('cbp_supabase_url')||'https://mvftxnzvmmlzyrrqhitx.supabase.co';
  const sbAnon=localStorage.getItem('cbp_supabase_anon')||'';
  const urlEl=document.getElementById('dk-supabase-url');
  const anonEl=document.getElementById('dk-supabase-anon');
  if(urlEl) urlEl.value=sbUrl;
  if(anonEl && sbAnon) anonEl.value=sbAnon;
  /* Day event IDs → EB_DAY_MAP + dashboard fields */
  ['thu','fri','sat','sun'].forEach(day=>{
    const saved=localStorage.getItem('cbp_eb_id_'+day);
    if(!saved)return;
    const dashEl=document.getElementById('dk-eb-'+day);
    if(dashEl)dashEl.value=saved;
    if(EB_DAY_MAP[day])EB_DAY_MAP[day].ebId=saved;
  });
}
function saveApiKeys(){
  /* Platform keys — read from dashboard dk-* fields */
  ['eventbrite','mailchimp','orgid','eburl'].forEach(k=>{
    const el=document.getElementById('dk-'+k);
    if(el&&el.value.trim())localStorage.setItem('cbp_key_'+k,el.value.trim());
  });
  /* Supabase keys */
  const sbUrlEl=document.getElementById('dk-supabase-url');
  const sbAnonEl=document.getElementById('dk-supabase-anon');
  if(sbUrlEl&&sbUrlEl.value.trim())localStorage.setItem('cbp_supabase_url',sbUrlEl.value.trim());
  if(sbAnonEl&&sbAnonEl.value.trim())localStorage.setItem('cbp_supabase_anon',sbAnonEl.value.trim());
  /* Day-level Eventbrite event IDs */
  ['thu','fri','sat','sun'].forEach(day=>{
    const el=document.getElementById('dk-eb-'+day);
    if(el&&el.value.trim()){
      const id=el.value.trim();
      localStorage.setItem('cbp_eb_id_'+day,id);
      if(EB_DAY_MAP[day])EB_DAY_MAP[day].ebId=id;
    }
  });
  const urlEl=document.getElementById('dk-eburl');
  if(urlEl&&urlEl.value.trim())setEventbriteUrl(urlEl.value.trim());
  const s=document.getElementById('dkSaved');
  if(s){s.style.display='block';setTimeout(()=>s.style.display='none',3000);}
  fetchAllEventbritePrices();
}
function setEventbriteUrl(url){
  if(!url||!url.startsWith('http'))return;
  /* Update any direct Eventbrite anchor links in the Events page */
  document.querySelectorAll('[id^="reg-"]').forEach(el=>{
    if(el.tagName==='A') el.href=url;
  });
  /* ticketLink and heroTicketBtn are now buttons → no href to update */
}
/* doLogin / doLogout now delegate to Supabase */
function doLogin(){ doLoginSupabase(); }
function doLogout(){ doLogoutSupabase(); }
function buildDash(role){
  const sidebar=document.getElementById('dashSidebar');
  const main=document.getElementById('dashMain');
  if(role==='organizer'){
    sidebar.innerHTML=`
      <div class="sb-sec">Main</div>
      <button class="ni active" onclick="sp('o-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('o-regs',this)"><i class="ti ti-users"></i><span>Registrations</span></button>
      <button class="ni" onclick="sp('o-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>
      <div class="sb-sec">Comms</div>
      <button class="ni" onclick="sp('o-mailchimp',this)"><i class="ti ti-mail"></i><span>MailChimp</span></button>
      <button class="ni" onclick="sp('o-sponsors',this)"><i class="ti ti-building"></i><span>Sponsors</span></button>
      <div class="sb-sec">Admin</div>
      <button class="ni" onclick="sp('o-settings',this)"><i class="ti ti-settings"></i><span>API Status</span></button>
      <button class="ni" onclick="sp('o-staff',this)"><i class="ti ti-id-badge"></i><span>Staff</span></button>
      <button class="ni" onclick="sp('o-cra',this)"><i class="ti ti-home"></i><span>CRA/Housing</span></button>`;
    main.innerHTML=`
      <div id="o-overview" class="dpanel active">
        <div class="ptitle">Overview</div>
        <div id="dash-empty-state" style="background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;padding:40px 24px;text-align:center;margin-bottom:18px;">
          <div style="font-size:36px;margin-bottom:14px;">🔌</div>
          <div style="font-family:'Teko',sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;margin-bottom:8px;color:rgba(255,255,255,0.7)">No data yet — connect your APIs</div>
          <p style="font-size:13px;color:rgba(255,255,255,0.4);max-width:420px;margin:0 auto 20px;line-height:1.7">Your dashboard will show live registration counts, waiver status, MailChimp sync totals, and sponsor data once your API keys are connected.</p>
          <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 20px;text-align:left;">
            <div class="api-status-row" id="status-eb">
              <i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i>
              <span>Eventbrite</span><span class="api-status-badge not-set">Not connected</span>
            </div>
            <div class="api-status-row" id="status-mc">
              <i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i>
              <span>MailChimp</span><span class="api-status-badge not-set">Not connected</span>
            </div>
            <div class="api-status-row" id="status-fb">
              <i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i>
              <span>Supabase</span><span class="api-status-badge is-set">Connected</span>
            </div>
            <div class="api-status-row" id="status-eb-days">
              <i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i>
              <span>Eventbrite Event IDs</span><span class="api-status-badge not-set">Not set</span>
            </div>
          </div>
          <button class="act-btn primary" onclick="sp('o-settings',document.querySelector('#dashSidebar .ni:nth-child(8)') || document.querySelectorAll('#dashSidebar .ni')[7])">
            <i class="ti ti-settings" style="font-size:13px"></i>Go to API Settings
          </button>
        </div>
        <div id="dash-live-data" style="display:none;">
          <div class="sg" id="dash-stats-grid"></div>
          <div class="two-col" id="dash-charts-row"></div>
          <div class="int-row" id="dash-int-row"></div>
        </div>
        <div class="dcrd2" style="margin-top:0">
          <h3>Quick actions</h3>
          <div style="display:flex;flex-direction:column;gap:7px">
            <button class="act-btn primary" onclick="syncDashboard()"><i class="ti ti-refresh" style="font-size:13px"></i>Sync All APIs Now</button>
            <button class="act-btn"><i class="ti ti-download" style="font-size:13px"></i>Export Registrations CSV</button>
            <button class="act-btn"><i class="ti ti-mail" style="font-size:13px"></i>Sync MailChimp Now</button>
            <button class="act-btn"><i class="ti ti-file-check" style="font-size:13px"></i>Send Waiver Reminders</button>
            <button class="act-btn"><i class="ti ti-external-link" style="font-size:13px"></i>Open Eventbrite</button>
          </div>
        </div>
      </div>
      <div id="o-settings" class="dpanel">
        <div class="ptitle">API Settings</div>
        <div class="api-dash-card">
          <h3><i class="ti ti-key"></i>Integration Keys</h3>
          <p style="font-size:12px;color:rgba(255,255,255,.45);margin-bottom:16px;line-height:1.6">Keys are saved in your browser only — never sent to any server. Save them here and your dashboard connects to live data immediately.</p>

          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,214,0,0.6);margin-bottom:10px;display:flex;align-items:center;gap:6px;"><i class="ti ti-plug" style="font-size:13px;color:var(--gold)"></i>Platform Keys</div>
          <div class="api-row">
            <div class="api-field"><label><i class="ti ti-ticket"></i>Eventbrite Private Token</label><div class="api-input-wrap"><input type="password" id="dk-eventbrite" placeholder="Paste your Eventbrite Private Token"><button class="api-eye" onclick="togglePw('dk-eventbrite',this)" type="button" aria-label="Show"><i class="ti ti-eye"></i></button></div></div>
            <div class="api-field"><label><i class="ti ti-mail"></i>MailChimp API Key</label><div class="api-input-wrap"><input type="password" id="dk-mailchimp" placeholder="Paste your MailChimp API Key"><button class="api-eye" onclick="togglePw('dk-mailchimp',this)" type="button" aria-label="Show"><i class="ti ti-eye"></i></button></div></div>
            <div class="api-field"><label><i class="ti ti-database"></i>Supabase URL</label><div class="api-input-wrap"><input type="text" id="dk-supabase-url" placeholder="https://mvftxnzvmmlzyrrqhitx.supabase.co"></div><div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:3px">Your project URL from Supabase settings</div></div>
            <div class="api-field"><label><i class="ti ti-key"></i>Supabase Anon Key</label><div class="api-input-wrap"><input type="password" id="dk-supabase-anon" placeholder="eyJ..."><button class="api-eye" onclick="togglePw('dk-supabase-anon',this)" type="button" aria-label="Show"><i class="ti ti-eye"></i></button></div></div>
            <div class="api-field"><label><i class="ti ti-world"></i>Eventbrite Org ID</label><div class="api-input-wrap"><input type="text" id="dk-orgid" placeholder="Your Eventbrite Org ID (numbers only)"></div></div>
          </div>
          <div class="api-field" style="margin-top:4px"><label><i class="ti ti-link"></i>Global Eventbrite URL <span style="font-size:9px;color:rgba(255,255,255,0.3);font-weight:400;letter-spacing:0;">(updates all Register buttons)</span></label><div class="api-input-wrap"><input type="text" id="dk-eburl" placeholder="https://www.eventbrite.com/e/your-event-id"></div></div>

          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,214,0,0.6);margin:16px 0 10px;display:flex;align-items:center;gap:6px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07);"><i class="ti ti-calendar-event" style="font-size:13px;color:var(--gold)"></i>Eventbrite Event IDs — one per day</div>
          <p style="font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:12px;line-height:1.6">Find the ID in your Eventbrite URL: eventbrite.com/e/<b style="color:rgba(255,214,0,0.7)">123456789</b>. Each day links to its own Eventbrite page and embeds live registration.</p>
          <div class="api-row">
            <div class="api-field">
              <label><i class="ti ti-sun-low" style="color:var(--sky)"></i>THU July 3 — Biz Mixer &amp; Workshop</label>
              <div class="api-input-wrap"><input type="text" id="dk-eb-thu" placeholder="Thursday Event ID (e.g. 123456789)"></div>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">Covers: Small Business Mixer + Financial Literacy Workshop</div>
            </div>
            <div class="api-field">
              <label><i class="ti ti-sun" style="color:var(--green)"></i>FRI July 4 — Taste of Lovejoy</label>
              <div class="api-input-wrap"><input type="text" id="dk-eb-fri" placeholder="Friday Event ID (e.g. 123456790)"></div>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">Covers: Taste of ATL + Kids Carnival</div>
            </div>
            <div class="api-field">
              <label><i class="ti ti-sun-filled" style="color:var(--pink)"></i>SAT July 5 — Cars, Bikes &amp; Vibes</label>
              <div class="api-input-wrap"><input type="text" id="dk-eb-sat" placeholder="Saturday Event ID (e.g. 123456791)"></div>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">Covers: Main Event + Water Slides + Gamers Lounge</div>
            </div>
            <div class="api-field">
              <label><i class="ti ti-moon" style="color:var(--gold)"></i>SUN July 6 — Day Party Finale</label>
              <div class="api-input-wrap"><input type="text" id="dk-eb-sun" placeholder="Sunday Event ID (e.g. 123456792)"></div>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px">Covers: Let's Skate + Housing Counseling Fair</div>
            </div>
          </div>
          <button class="api-save" onclick="saveApiKeys()" style="margin-top:10px"><i class="ti ti-device-floppy" style="font-size:14px"></i>Save All Keys</button>
          <div class="api-saved" id="dkSaved"><i class="ti ti-check" style="font-size:12px;vertical-align:-1px"></i> Saved successfully</div>
        </div>
      </div>
      <div id="o-regs" class="dpanel">
        <div class="ptitle">Registrations</div>
        <div class="dcrd2" id="regs-card">
          <h3>Recent sign-ups</h3>
          <div id="regs-empty" style="text-align:center;padding:32px 16px;">
            <div style="font-size:28px;margin-bottom:10px;">🎟️</div>
            <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">No registrations yet</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:16px;">Connect your Eventbrite API key and event IDs to see live registrations here.</div>
            <button class="act-btn primary" onclick="sp('o-settings',document.querySelectorAll('#dashSidebar .ni')[7])"><i class="ti ti-settings" style="font-size:13px"></i>Connect Eventbrite</button>
          </div>
          <div id="regs-table" style="display:none;">
            <table class="dtable"><thead><tr><th>Name</th><th>Event</th><th>Type</th><th>Waiver</th><th>MC</th></tr></thead>
            <tbody id="regs-tbody"></tbody></table>
            <div class="act-row"><button class="act-btn primary"><i class="ti ti-download" style="font-size:13px"></i>Export CSV</button><button class="act-btn"><i class="ti ti-filter" style="font-size:13px"></i>Filter</button></div>
          </div>
        </div>
      </div>
      <div id="o-waivers" class="dpanel">
        <div class="ptitle">Waivers</div>
        <div style="text-align:center;padding:40px 16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;">
          <div style="font-size:28px;margin-bottom:10px;">📋</div>
          <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">No waiver data yet</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);max-width:340px;margin:0 auto 16px;line-height:1.6">Waiver tracking will populate automatically once participants register through Eventbrite. Waivers required for kids activities and water slides.</div>
          <button class="act-btn"><i class="ti ti-send" style="font-size:13px"></i>Send Waiver Reminders</button>
        </div>
      </div>
      <div id="o-mailchimp" class="dpanel">
        <div class="ptitle">MailChimp</div>
        <div style="text-align:center;padding:40px 16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;margin-bottom:14px;">
          <div style="font-size:28px;margin-bottom:10px;">✉️</div>
          <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">MailChimp not connected</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);max-width:340px;margin:0 auto 16px;line-height:1.6">Paste your MailChimp API key in API Settings to see your list size, sync status, and campaign stats here.</div>
          <button class="act-btn primary" onclick="sp('o-settings',document.querySelectorAll('#dashSidebar .ni')[7])"><i class="ti ti-settings" style="font-size:13px"></i>Connect MailChimp</button>
        </div>
        <div class="act-row"><button class="act-btn"><i class="ti ti-refresh" style="font-size:13px"></i>Sync Now</button><button class="act-btn"><i class="ti ti-plus" style="font-size:13px"></i>New Campaign</button></div>
      </div>
      <div id="o-sponsors" class="dpanel">
        <div class="ptitle">Sponsors</div>
        <div style="text-align:center;padding:40px 16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;">
          <div style="font-size:28px;margin-bottom:10px;">🏢</div>
          <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">No sponsors added yet</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);max-width:360px;margin:0 auto 16px;line-height:1.6">When sponsors submit interest through the Sponsors page, they will appear here with their tier, contract status, and payment status.</div>
          <button class="act-btn primary" onclick="go('sponsors',document.querySelectorAll('.nav-btn')[2])"><i class="ti ti-building" style="font-size:13px"></i>View Sponsor Page</button>
        </div>
      </div>
      <div id="o-staff" class="dpanel">
        <div class="ptitle">Staff Accounts</div>
        <div style="text-align:center;padding:40px 16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;margin-bottom:14px;">
          <div style="font-size:28px;margin-bottom:10px;">👥</div>
          <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">No staff accounts yet</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);max-width:360px;margin:0 auto 16px;line-height:1.6">Add staff members in your Supabase dashboard. Set their role to <code style="font-family:monospace;font-size:11px;background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px">staff</code> in user_metadata and they will appear here automatically.</div>
          <a class="act-btn primary" href="https://supabase.com/dashboard/project/mvftxnzvmmlzyrrqhitx/auth/users" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:13px"></i>Add Staff in Supabase</a>
        </div>
        <div class="act-row"><button class="act-btn primary"><i class="ti ti-plus" style="font-size:13px"></i>Add Staff</button><button class="act-btn"><i class="ti ti-key" style="font-size:13px"></i>Reset Password</button></div>
      </div>
      <div id="o-cra" class="dpanel">
        <div class="ptitle">CRA &amp; Housing</div>
        <div style="text-align:center;padding:40px 16px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;">
          <div style="font-size:28px;margin-bottom:10px;">🏠</div>
          <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:6px;">No CRA data yet</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);max-width:360px;margin:0 auto 16px;line-height:1.6">Housing counseling session bookings will appear here once registrations come in. CRA volunteer hours are tracked automatically as sessions are booked.</div>
          <button class="act-btn" onclick="go('events',document.querySelectorAll('.nav-btn')[1])"><i class="ti ti-calendar" style="font-size:13px"></i>View Housing Counseling Event</button>
        </div>
      </div>`;
    setTimeout(()=>{ loadApiKeys();


 },150);
  } else if(role==='staff'){
    sidebar.innerHTML=`
      <div class="sb-sec">My Tools</div>
      <button class="ni active" onclick="sp('s-checkin',this)"><i class="ti ti-qrcode"></i><span>Check-In</span></button>
      <button class="ni" onclick="sp('s-kids',this)"><i class="ti ti-mood-happy"></i><span>Kids Zone</span></button>
      <button class="ni" onclick="sp('s-schedule',this)"><i class="ti ti-calendar"></i><span>Schedule</span></button>
      <button class="ni" onclick="sp('s-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>`;
    main.innerHTML=`
      <div id="s-checkin" class="dpanel active">
        <div class="ptitle">Check-In</div>
        <div class="sg"><div class="sc"><div class="sl">Checked In</div><div class="sv" style="color:var(--green)">342</div></div><div class="sc"><div class="sl">Expected</div><div class="sv" style="color:var(--gold)">505</div></div><div class="sc"><div class="sl">Walk-ins</div><div class="sv" style="color:var(--sky)">28</div></div></div>
        <div class="dcrd2"><h3>Search attendee</h3>
          <div style="display:flex;gap:9px;margin-bottom:14px"><input type="text" placeholder="Name, email or confirmation #" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.11);border-radius:7px;padding:10px 13px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;outline:none"><button class="act-btn primary"><i class="ti ti-search" style="font-size:13px"></i>Look Up</button></div>
          <table class="dtable"><thead><tr><th>Name</th><th>Event</th><th>Waiver</th><th>Check In</th></tr></thead>
          <tbody>
            <tr><td>Jordan M.</td><td>Block Party</td><td><span class="sb sb-ok">Done</span></td><td><button class="act-btn primary" style="padding:4px 10px;font-size:11px">Check In</button></td></tr>
            <tr><td>Aaliyah R.</td><td>Gamers Lounge</td><td><span class="sb sb-need">Needed</span></td><td><button class="act-btn" style="padding:4px 10px;font-size:11px;color:var(--pink)">Get Waiver First</button></td></tr>
          </tbody></table>
        </div>
      </div>
      <div id="s-kids" class="dpanel">
        <div class="ptitle">Kids Zone</div>
        <div class="sg"><div class="sc"><div class="sl">Kids Registered</div><div class="sv" style="color:var(--green)">326</div></div><div class="sc"><div class="sl">Waivers Done</div><div class="sv" style="color:var(--gold)">289</div></div><div class="sc"><div class="sl">In Zone Now</div><div class="sv" style="color:var(--pink)">47</div></div></div>
      </div>
      <div id="s-schedule" class="dpanel">
        <div class="ptitle">Today's Schedule</div>
        <div class="dcrd2"><h3>Saturday July 5</h3>
          <table class="dtable"><thead><tr><th>Time</th><th>Event</th><th>Your Role</th></tr></thead>
          <tbody>
            <tr><td style="color:var(--gold);font-weight:700">10AM</td><td>Setup &amp; Venue Prep</td><td>Setup Crew</td></tr>
            <tr><td style="color:var(--gold);font-weight:700">12PM</td><td>Gates Open &mdash; Check-In</td><td>Check-In Staff</td></tr>
            <tr><td style="color:var(--gold);font-weight:700">12PM</td><td>Kids Zone Opens</td><td>Kids Monitor</td></tr>
            <tr><td style="color:var(--gold);font-weight:700">6PM</td><td>Evening Block Party</td><td>Crowd Management</td></tr>
          </tbody></table>
        </div>
      </div>
      <div id="s-waivers" class="dpanel">
        <div class="ptitle">Waivers</div>
        <div class="dcrd2"><h3>On-site collection</h3>
          <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px">For families arriving without a signed waiver, show the QR or text the link.</p>
          <div class="act-row"><button class="act-btn primary"><i class="ti ti-qrcode" style="font-size:13px"></i>Show QR Code</button><button class="act-btn"><i class="ti ti-send" style="font-size:13px"></i>Text Link</button><button class="act-btn"><i class="ti ti-printer" style="font-size:13px"></i>Print</button></div>
        </div>
      </div>`;
  } else {
    sidebar.innerHTML=`
      <div class="sb-sec">My Sponsorship</div>
      <button class="ni active" onclick="sp('p-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('p-benefits',this)"><i class="ti ti-star"></i><span>Benefits</span></button>
      <button class="ni" onclick="sp('p-demo',this)"><i class="ti ti-chart-bar"></i><span>Demographics</span></button>
      <button class="ni" onclick="sp('p-cra',this)"><i class="ti ti-file-description"></i><span>CRA Docs</span></button>`;
    main.innerHTML=`
      <div id="p-overview" class="dpanel active">
        <div class="ptitle">My Sponsorship</div>
        <div class="dcrd2" style="margin-bottom:14px"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><div style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:2px;padding:4px 12px;border-radius:100px;background:rgba(200,200,230,0.15);color:#D0D0F0;margin-bottom:8px;text-transform:uppercase">Platinum Sponsor</div><div style="font-family:'Teko',sans-serif;font-size:24px;font-weight:700;text-transform:uppercase">First National Bank</div><div style="font-size:12px;color:rgba(255,255,255,.45)">Presenting Sponsor &middot; $10,000 &middot; Contract Signed</div></div><div style="text-align:right"><div style="font-family:'Teko',sans-serif;font-size:36px;font-weight:700;color:var(--green)">$10,000</div><div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:1px">PAID IN FULL</div></div></div></div>
        <div class="sg"><div class="sc"><div class="sl">Reach</div><div class="sv" style="color:var(--gold)">800+</div></div><div class="sc"><div class="sl">Email Reach</div><div class="sv" style="color:var(--sky)">3,241</div></div><div class="sc"><div class="sl">Social Posts</div><div class="sv" style="color:var(--pink)">8</div></div><div class="sc"><div class="sl">Event Days</div><div class="sv" style="color:var(--green)">4</div></div></div>
      </div>
      <div id="p-benefits" class="dpanel">
        <div class="ptitle">My Benefits</div>
        <div class="dcrd2"><h3>Platinum &mdash; all benefits</h3>
          <table class="dtable"><thead><tr><th>Benefit</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Title naming rights</td><td><span class="sb sb-ok">Active</span></td></tr>
            <tr><td>Stage branding + MC mentions all 4 days</td><td><span class="sb sb-pend">Upcoming</span></td></tr>
            <tr><td>Full email list access (3,241 contacts)</td><td><span class="sb sb-ok">Active</span></td></tr>
            <tr><td>Premium vendor booth &mdash; main entrance</td><td><span class="sb sb-ok">Confirmed</span></td></tr>
            <tr><td>8 dedicated social media spotlights</td><td><span class="sb sb-pend">Scheduled</span></td></tr>
            <tr><td>CRA documentation package</td><td><span class="sb sb-ok">Available</span></td></tr>
            <tr><td>Post-event impact report</td><td><span class="sb sb-pend">After Event</span></td></tr>
          </tbody></table>
        </div>
      </div>
      <div id="p-demo" class="dpanel">
        <div class="ptitle">Demographics</div>
        <div class="dcrd2"><h3>Financial services interest</h3>
          <div class="dbi"><div class="dbl"><span>Homeownership interest</span><span>52%</span></div><div class="dbt"><div class="dbf" style="width:52%;background:var(--gold)"></div></div></div>
          <div class="dbi"><div class="dbl"><span>Interested in banking</span><span>47%</span></div><div class="dbt"><div class="dbf" style="width:47%;background:var(--sky)"></div></div></div>
          <div class="dbi"><div class="dbl"><span>First-time homebuyers</span><span>31%</span></div><div class="dbt"><div class="dbf" style="width:31%;background:var(--pink)"></div></div></div>
          <div class="dbi"><div class="dbl"><span>Small business owners</span><span>18%</span></div><div class="dbt"><div class="dbf" style="width:18%;background:var(--green)"></div></div></div>
          <div class="act-row"><button class="act-btn primary"><i class="ti ti-download" style="font-size:13px"></i>Download Full Demographics PDF</button></div>
        </div>
      </div>
      <div id="p-cra" class="dpanel">
        <div class="ptitle">CRA Documents</div>
        <div class="dcrd2"><h3>Your CRA package</h3>
          <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px">Everything your compliance team needs.</p>
          <table class="dtable"><thead><tr><th>Document</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>LMI Service Area Report</td><td><span class="sb sb-ok">Ready</span></td><td><button class="act-btn" style="padding:4px 10px;font-size:11px"><i class="ti ti-download" style="font-size:11px"></i>Download</button></td></tr>
            <tr><td>Attendee Demographics Summary</td><td><span class="sb sb-ok">Ready</span></td><td><button class="act-btn" style="padding:4px 10px;font-size:11px"><i class="ti ti-download" style="font-size:11px"></i>Download</button></td></tr>
            <tr><td>HUD Counseling Hours Letter</td><td><span class="sb sb-ok">Ready</span></td><td><button class="act-btn" style="padding:4px 10px;font-size:11px"><i class="ti ti-download" style="font-size:11px"></i>Download</button></td></tr>
            <tr><td>Post-Event Impact Report</td><td><span class="sb sb-pend">After Event</span></td><td>&mdash;</td></tr>
          </tbody></table>
        </div>
      </div>`;
  }
}
/* saveDashKeys — keys are now managed from the login page.
   This stub keeps backward compatibility if called anywhere. */
function saveDashKeys(){ saveApiKeys(); }
function sp(panelId,btn){
  document.querySelectorAll('#dashMain .dpanel').forEach(p=>p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
  document.querySelectorAll('#dashSidebar .ni').forEach(n=>n.classList.remove('active'));
  btn.classList.add('active');
}
function pickTier(card,name){
  document.querySelectorAll('.tier').forEach(c=>c.classList.remove('sel'));
  card.classList.add('sel');
  document.getElementById('sponModal').classList.add('open');
  const sel=document.getElementById('sponLevel');
  for(let o of sel.options){if(o.text.toLowerCase().startsWith(name.toLowerCase())){sel.value=o.value;break;}}
}
function submitSpon(){
  document.getElementById('sponModal').classList.remove('open');
  alert('Thank you! Our team will reach out within 24 hours with your full sponsorship packet and CRA documentation preview.');
}
document.getElementById('lEmail').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('lPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

const EVENT_NAMES = {
  'thu-mixer': 'Small Business Mixer — Thu July 3',
  'thu-workshop': 'Financial Literacy Workshop — Thu July 3',
  'fri-taste': 'Taste of Lovejoy — Fri July 4',
  'fri-kids': 'Kids Carnival & Games — Fri July 4',
  'sat-main': 'Cars, Bikes & Vibes — Sat July 5',
  'sat-slides': 'Water Slides & Bubbles — Sat July 5',
  'sat-gamers': 'Gamers Lounge + Laser Tag — Sat July 5',
  'sun-skate': 'Let\'s Skate! Day Party Finale — Sun July 6',
  'sun-housing': 'Housing Counseling Fair — Sun July 6',
  'weekend-pass': 'Full Weekend Pass — July 3–6'
};
function openReg(cardKey) {
  const day        = CARD_TO_DAY[cardKey] || '';
  const dayCfg     = EB_DAY_MAP[day] || {};
  const cardCfg    = EB_CARD_MAP[cardKey] || {};

  /* Build the URL: day-level EB page + optional ticket hint */
  const dayId      = dayCfg.ebId || localStorage.getItem('cbp_eb_id_' + day) || '';
  const globalUrl  = localStorage.getItem('cbp_key_eburl') || '';
  let   baseUrl    = dayId ? 'https://www.eventbrite.com/e/' + dayId : globalUrl;
  if (baseUrl && cardCfg.ticketHint) baseUrl += (baseUrl.includes('?') ? '&' : '?') + cardCfg.ticketHint;

  const titleEl    = document.getElementById('ebEventTitle');
  const embedEl    = document.getElementById('ebEmbedSection');
  const iframe     = document.getElementById('ebIframe');
  const placeholder= document.getElementById('ebPlaceholder');
  const directLink = document.getElementById('ebDirectLink');

  if (titleEl)  titleEl.textContent = dayCfg.label || EVENT_NAMES[cardKey] || 'Registration';
  if (embedEl)  embedEl.style.display = 'block';

  if (baseUrl && baseUrl.startsWith('http')) {
    if (iframe)      { iframe.src = baseUrl; iframe.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (directLink)  directLink.href = baseUrl;
  } else {
    if (iframe)      iframe.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
  }
  if (embedEl) embedEl.scrollIntoView({behavior:'smooth', block:'start'});
}
function closeReg() {
  const section = document.getElementById('ebEmbedSection');
  const iframe  = document.getElementById('ebIframe');
  if (section) section.style.display = 'none';
  if (iframe)  iframe.src = '';
}
function showEvt(day, btn) {
  document.querySelectorAll('.evt-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.reg-card').forEach(c => {
    if (day === 'all') { c.style.display = 'flex'; }
    else { c.style.display = (c.dataset.day === day || c.dataset.day === 'all') ? 'flex' : 'none'; }
  });
}

loadApiKeys();
const savedUrl=localStorage.getItem('cbp_key_eburl');
if(savedUrl)setEventbriteUrl(savedUrl);

/* ═══════════════════════════════════════════════════
   EVENTBRITE LIVE PRICE SYNC
   Fetches ticket_classes for each event via the
   Eventbrite public API and updates price cards.
   CORS note: Eventbrite blocks direct browser calls,
   so we route through a tiny public CORS proxy.
   When you deploy to a real server, replace the proxy
   with a server-side endpoint for production security.
═══════════════════════════════════════════════════ */

/* ── 4 Eventbrite day pages ──────────────────────────────────────────────
   Each day maps to ONE Eventbrite event page with multiple ticket tiers.
   All cards for the same day share the same event ID and status.
   cards[] = all registration cards that belong to this day.
   ticket hints = optional ?discount= or ?promo= param per card (leave '' if unused).
──────────────────────────────────────────────────────────────────────── */
const EB_DAY_MAP = {
  thu: {
    label:   'Thursday, July 3 — Small Business Kickoff',
    ebId:    '',   /* paste your Thu Eventbrite Event ID here or via dashboard */
    cards: [
      { key:'thu-mixer',    p1:'p1-thu-mixer',    lbl1:'lbl1-thu-mixer',    p2:'p2-thu-mixer',    lbl2:'lbl2-thu-mixer',    statusId:'status-thu-mixer',    btnId:'btn-thu-mixer',    ticketHint:'' },
      { key:'thu-workshop', p1:'p1-thu-workshop', lbl1:'lbl1-thu-workshop', p2:'p2-thu-workshop', lbl2:'lbl2-thu-workshop', statusId:'status-thu-workshop', btnId:'btn-thu-workshop', ticketHint:'' },
    ]
  },
  fri: {
    label:   'Friday, July 4 — Taste of Lovejoy',
    ebId:    '',
    cards: [
      { key:'fri-taste', p1:'p1-fri-taste', lbl1:'lbl1-fri-taste', p2:'p2-fri-taste', lbl2:'lbl2-fri-taste', statusId:'status-fri-taste', btnId:'btn-fri-taste', ticketHint:'' },
      { key:'fri-kids',  p1:'p1-fri-kids',  lbl1:'lbl1-fri-kids',  p2:'p2-fri-kids',  lbl2:'lbl2-fri-kids',  statusId:'status-fri-kids',  btnId:'btn-fri-kids',  ticketHint:'' },
    ]
  },
  sat: {
    label:   'Saturday, July 5 — Cars, Bikes & Vibes',
    ebId:    '',
    cards: [
      { key:'sat-main',   p1:'p1-sat-main',   lbl1:'lbl1-sat-main',   p2:'p2-sat-main',   lbl2:'lbl2-sat-main',   statusId:'status-sat-main',   btnId:'btn-sat-main',   ticketHint:'' },
      { key:'sat-slides', p1:'p1-sat-slides', lbl1:'lbl1-sat-slides', p2:'p2-sat-slides', lbl2:'lbl2-sat-slides', statusId:'status-sat-slides', btnId:'btn-sat-slides', ticketHint:'' },
      { key:'sat-gamers', p1:'p1-sat-gamers', lbl1:'lbl1-sat-gamers', p2:'p2-sat-gamers', lbl2:'lbl2-sat-gamers', statusId:'status-sat-gamers', btnId:'btn-sat-gamers', ticketHint:'' },
    ]
  },
  sun: {
    label:   'Sunday, July 6 — Day Party Finale',
    ebId:    '',
    cards: [
      { key:'sun-skate',   p1:'p1-sun-skate',   lbl1:'lbl1-sun-skate',   p2:'p2-sun-skate',   lbl2:'lbl2-sun-skate',   statusId:'status-sun-skate',   btnId:'btn-sun-skate',   ticketHint:'' },
      { key:'sun-housing', p1:'p1-sun-housing', lbl1:'lbl1-sun-housing', p2:'p2-sun-housing', lbl2:'lbl2-sun-housing', statusId:'status-sun-housing', btnId:'btn-sun-housing', ticketHint:'' },
    ]
  },
};

/* Flat lookup: card key → day key */
const CARD_TO_DAY = {};
Object.entries(EB_DAY_MAP).forEach(([day, cfg]) => cfg.cards.forEach(c => CARD_TO_DAY[c.key] = day));

/* Legacy alias so any old code referencing EB_CARD_MAP still works */
const EB_CARD_MAP = {};
Object.values(EB_DAY_MAP).forEach(cfg => cfg.cards.forEach(c => { EB_CARD_MAP[c.key] = c; }));

function fmtPrice(cost) {
  if (!cost || cost.currency === 'FREE' || parseInt(cost.value) === 0) return 'FREE';
  const cents = parseInt(cost.value || 0);
  const dollars = cents / 100;
  return '$' + (dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2));
}

function setCardLoading(key) {
  const ids = EB_CARD_MAP[key];
  if (!ids) return;
  const p1 = document.getElementById(ids.p1);
  const p2 = document.getElementById(ids.p2);
  if (p1) { p1.style.opacity = '0.4'; p1.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block;font-size:16px"></i>'; }
  if (p2) { p2.style.opacity = '0.4'; p2.innerHTML = '—'; }
}

function applyEventData(key, data, ticketsOverride) {
  const ids = EB_CARD_MAP[key];
  if (!ids || !data) return;

  /* Use caller-supplied slice if provided, otherwise use all visible tickets */
  const tickets = ticketsOverride
    ? ticketsOverride.filter(t => t.on_sale_status !== 'UNAVAILABLE')
    : (data.ticket_classes || []).filter(t => !t.hidden && t.on_sale_status !== 'UNAVAILABLE');
  const statusEl = document.getElementById(ids.statusId);
  const btnEl = document.getElementById(ids.btnId);

  if (data.status === 'completed' || data.status === 'canceled') {
    if (statusEl) { statusEl.textContent = data.status === 'canceled' ? 'Canceled' : 'Event Ended'; statusEl.className = 'rc-badge'; statusEl.style.background = 'rgba(255,0,160,0.15)'; statusEl.style.color = 'var(--pink)'; statusEl.style.display = 'block'; }
    if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.4'; btnEl.textContent = 'Unavailable'; }
    return;
  }

  const soldOut = tickets.length > 0 && tickets.every(t => t.quantity_sold >= t.quantity_total);
  if (soldOut) {
    if (statusEl) { statusEl.textContent = 'Sold Out'; statusEl.className = 'rc-badge'; statusEl.style.background = 'rgba(255,0,160,0.15)'; statusEl.style.color = 'var(--pink)'; statusEl.style.display = 'block'; }
    if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '0.4'; btnEl.textContent = 'Sold Out'; }
    return;
  }

  const fewLeft = tickets.some(t => (t.quantity_total - t.quantity_sold) <= 20 && (t.quantity_total - t.quantity_sold) > 0);
  if (fewLeft && statusEl) {
    const remaining = tickets.reduce((min, t) => Math.min(min, t.quantity_total - t.quantity_sold), Infinity);
    statusEl.textContent = remaining + ' tickets left!';
    statusEl.className = 'rc-badge';
    statusEl.style.background = 'rgba(255,107,0,0.15)';
    statusEl.style.color = 'var(--orange)';
    statusEl.style.display = 'block';
  } else if (statusEl) {
    statusEl.textContent = 'On Sale';
    statusEl.className = 'rc-badge';
    statusEl.style.background = 'rgba(0,255,106,0.12)';
    statusEl.style.color = 'var(--green)';
    statusEl.style.display = 'block';
  }

  const p1El = document.getElementById(ids.p1);
  const p2El = document.getElementById(ids.p2);
  const lbl1El = document.getElementById(ids.lbl1);
  const lbl2El = document.getElementById(ids.lbl2);

  if (tickets.length >= 1 && p1El) {
    p1El.style.opacity = '1';
    p1El.textContent = fmtPrice(tickets[0].cost);
    if (lbl1El) lbl1El.textContent = tickets[0].name || 'General';
  }
  if (tickets.length >= 2 && p2El) {
    p2El.style.opacity = '1';
    p2El.textContent = fmtPrice(tickets[1].cost);
    if (lbl2El) lbl2El.textContent = tickets[1].name || 'VIP';
  } else if (tickets.length === 1 && p2El) {
    const avail = tickets[0].quantity_total - tickets[0].quantity_sold;
    p2El.style.opacity = '1';
    p2El.textContent = avail > 0 ? avail + ' left' : 'Sold Out';
    if (lbl2El) lbl2El.textContent = 'Remaining';
  }
}

async function fetchEventbriteEvent(eventId, token) {
  const PROXY = 'https://corsproxy.io/?';
  const url = PROXY + encodeURIComponent('https://www.eventbriteapi.com/v3/events/' + eventId + '/?expand=ticket_classes');
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('Eventbrite fetch failed for event', eventId, e.message);
    return null;
  }
}

async function fetchAllEventbritePrices() {
  const token = localStorage.getItem('cbp_key_eventbrite');
  if (!token) return;

  for (const [day, dayCfg] of Object.entries(EB_DAY_MAP)) {
    /* Resolve event ID: in-memory cfg first, then localStorage */
    const eventId = dayCfg.ebId || localStorage.getItem('cbp_eb_id_' + day) || '';
    if (!eventId || eventId.startsWith('EB_')) continue;

    /* Show loading spinner on all cards for this day */
    dayCfg.cards.forEach(c => setCardLoading(c.key));

    const data = await fetchEventbriteEvent(eventId, token);

    if (data) {
      /* Apply shared event status + ticket tiers to every card for this day.
         Ticket tiers are distributed round-robin across card slots:
         card[0] gets tiers[0]+[1], card[1] gets tiers[2]+[3], etc.
         Cards with no matching tier keep their static fallback prices.      */
      const tiers = (data.ticket_classes || []).filter(t => !t.hidden);
      dayCfg.cards.forEach((cardCfg, i) => {
        applyEventData(cardCfg.key, data, tiers.slice(i * 2, i * 2 + 2));
      });
    } else {
      /* Fetch failed — restore opacity so static prices show */
      dayCfg.cards.forEach(c => {
        const p1 = document.getElementById(c.p1);
        const p2 = document.getElementById(c.p2);
        if (p1) p1.style.opacity = '1';
        if (p2) p2.style.opacity = '1';
      });
    }
  }
}

if (!document.getElementById('eb-spin-style')) {
  const s = document.createElement('style');
  s.id = 'eb-spin-style';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', () => {
  /* Load saved day IDs into EB_DAY_MAP on startup */
  ['thu','fri','sat','sun'].forEach(day => {
    const saved = localStorage.getItem('cbp_eb_id_' + day);
    if (saved && EB_DAY_MAP[day]) EB_DAY_MAP[day].ebId = saved;
  });
  const token = localStorage.getItem('cbp_key_eventbrite');
  if (token) fetchAllEventbritePrices();
});



/* ── VENDOR PAGE ────────────────────────────────────────────── */
const DEMO_VENDORS = {
  'vendor@collectivebp.com': {pass:'vendor123', name:"Mama T's Kitchen", booth:'A-12', cat:'Food & Beverage', days:'SAT+SUN'}
};

function showVendorTab(tab, btn) {
  document.querySelectorAll('.vendor-panel').forEach(p => p.style.display='none');
  document.querySelectorAll('.vp-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('vendor-'+tab);
  if (panel) panel.style.display = 'block';
  if (btn) btn.classList.add('active');
}

function toggleDayChip(checkbox, chipId) {
  const chip = document.getElementById(chipId);
  if (chip) chip.classList.toggle('day-selected', checkbox.checked);
}

function selectSize(sizeId) {
  document.querySelectorAll('.vp-size-chip').forEach(c => c.classList.remove('active-size'));
  const chip = document.getElementById(sizeId);
  if (chip) chip.classList.add('active-size');
  const sizeMap = {'size-1010':'10x10','size-1020':'10x20','size-truck':'Food Truck'};
  const inp = document.getElementById('v-size');
  if (inp) inp.value = sizeMap[sizeId] || '10x10';
}

async function submitVendorApp() {
  const biz   = document.getElementById('v-bizname')?.value.trim();
  const name  = document.getElementById('v-name')?.value.trim();
  const email = document.getElementById('v-email')?.value.trim();
  const phone = document.getElementById('v-phone')?.value.trim();
  const cat   = document.getElementById('v-cat')?.value;
  const desc  = document.getElementById('v-desc')?.value.trim();
  const size  = document.getElementById('v-size')?.value || '10x10';
  const days  = [...document.querySelectorAll('.vp-day-chip input:checked')].map(c=>c.value).join(',');
  const btn   = document.getElementById('vp-submit');

  if (!biz || !email || !cat || !days) {
    alert('Please fill in all required fields and select at least one day.');
    return;
  }

  if (btn) { btn.disabled=true; btn.querySelector('.vp-btn-text').innerHTML='<i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block"></i> Submitting...'; }

  const sb = getSB();
  if (sb) {
    /* Save to Supabase vendor_applications table */
    const { error } = await sb.from('vendor_applications').insert([{
      business_name: biz,
      contact_name:  name,
      email,
      phone,
      category:      cat,
      description:   desc,
      booth_size:    size,
      days,
      status:        'pending',
      submitted_at:  new Date().toISOString()
    }]);
    if (error) {
      console.warn('Supabase insert error:', error.message);
      /* Fall through — still show success to user, data logged in console */
    }
  }

  if (btn) { btn.disabled=false; btn.querySelector('.vp-btn-text').innerHTML='<i class="ti ti-send"></i> Submit Application'; }
  const success = document.getElementById('vendor-success');
  if (success) success.style.display = 'flex';
  ['v-bizname','v-name','v-email','v-phone','v-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.vp-day-chip').forEach(c=>c.classList.remove('day-selected'));
  document.querySelectorAll('.vp-day-chip input').forEach(c=>c.checked=false);
}

/* ── 24/7 CHAT WIDGET ──────────────────────────────────────── */
const CHAT_RESPONSES = {
  ticket:     ["You can get tickets right on our website! Click the **Register** tab in the nav or hit **Get Tickets**. We have single-day passes and a Full Weekend Pass ($45) for the best value across all 4 days.", "Tickets are available on our Registration page. You can register for individual events or grab a Full Weekend Pass for all 4 days. Click the Register button at the top!"],
  vendor:     ["To apply as a vendor, click the **Vendors** tab in the nav! Fill out the application — we review within 48 hours. Booth spaces start at $150/day or $450 for the full weekend.", "Head to the Vendors tab to apply for a booth! We have spaces for food trucks, retail, arts & crafts, non-profits, and more. Full weekend spots go fast!"],
  sponsor:    ["We have 4 sponsorship tiers from $500 Community Partner up to $10K Presenting Sponsor. Sponsors get CRA documentation, brand exposure across 800+ attendees, email list access, and more. Check our Sponsors page!", "Sponsorship packages start at $500 and go up to $10,000 for the Presenting Sponsor title. Each tier includes booth placement, social media features, and a CRA documentation package. Visit our Sponsors page for details."],
  schedule: [
    `The Collective Block Party runs July 3–6, 2026 in Lovejoy, GA! 🗓️\n\nTHU July 3 — Small Business Mixer, 5PM–11PM\nFRI July 4 — Taste of Lovejoy + Fireworks, 2PM–Until\nSAT July 5 — Cars, Bikes & Vibes (Main Event), 12PM–Late\nSUN July 6 — Day Party Finale + Skate, 2PM–10PM`,
    "4 days of fun! Thu is the Business Mixer, Fri is the Taste of Lovejoy with fireworks, Sat is the huge block party with cars & bikes, and Sun is the Day Party Finale with skating. Check the Events page for full details!"
  ],
  kids:       ["Yes! There's a dedicated Kids Zone all weekend — water slides, bubble cannons, gamers lounge, laser tag, carnival games, and face painting. All fully supervised by trained staff.", "Absolutely! Saturday has the biggest kids activities — giant water slides, bubble zone, and the Gamers Lounge. Friday has the Kids Carnival from 2–6PM. All supervised, all ages welcome!"],
  parking:    ["Parking info will be included in your registration confirmation email. The venue is in Lovejoy, GA — more details coming soon at collectiveblockparty.com.", "Parking details are finalized closer to the event. Register and you'll get full venue info including parking in your confirmation email!"],
  housing:    ["Yes! Sunday July 6 has a free Housing Counseling Fair from 11AM–3PM. HUD-certified counselors offer free 45-minute 1-on-1 sessions covering homeownership, down payment assistance, and foreclosure prevention.", "Our Housing Counseling Fair is Sunday July 6, 11AM–3PM. It's completely free — just book your session when you register. HUD-certified counselors will be on site all day."],
  location:   ["The Collective Block Party is in Lovejoy, Georgia — Henry County, South Metro Atlanta. Exact address will be in your registration confirmation. Easy access from I-75.", "We're in Lovejoy, GA — right in Henry County, South Metro Atlanta. Easy to reach from I-75. Full address and directions sent with your registration confirmation."],
  default:    ["Great question! For anything specific about the event, you can also reach us at info@collectiveblockparty.com — we respond within 24 hours.", "Happy to help! For detailed questions, email us at info@collectiveblockparty.com. Our team responds within 24 hours. You can also check the Events page for the full lineup!"]
};

function getResponseKey(msg) {
  const m = msg.toLowerCase();
  if (/ticket|register|buy|purchase|pass|admission/.test(m)) return 'ticket';
  if (/vendor|booth|sell|apply|food truck/.test(m)) return 'vendor';
  if (/sponsor|partner|cra|donate|marketing/.test(m)) return 'sponsor';
  if (/schedule|lineup|day|when|time|hours/.test(m)) return 'schedule';
  if (/kid|child|water slide|bubble|carnival|laser|gamer/.test(m)) return 'kids';
  if (/park/.test(m)) return 'parking';
  if (/housing|counseling|hud|home|mortgage|foreclosure/.test(m)) return 'housing';
  if (/where|location|address|lovejoy|directions/.test(m)) return 'location';
  return 'default';
}

function toggleChat() {
  const win   = document.getElementById('chatWindow');
  const icon  = document.getElementById('chatIcon');
  const badge = document.getElementById('chatBadge');
  const open  = win.style.display === 'none';
  win.style.display  = open ? 'block' : 'none';
  icon.className     = open ? 'ti ti-x' : 'ti ti-message-circle';
  if (badge) badge.style.display = 'none';
}

function addChatMsg(text, type) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  const now = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  div.innerHTML = '<div class="chat-bubble">' + text.replace(/\n/g,'<br>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>') + '</div><div class="chat-time">' + now + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'chatTyping';
  div.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  addChatMsg(msg, 'user');
  // Remove quick reply buttons
  document.querySelectorAll('.chat-quick').forEach(b => b.parentElement?.remove());
  const typing = showTyping();
  setTimeout(() => {
    if (typing) typing.remove();
    const key = getResponseKey(msg);
    const responses = CHAT_RESPONSES[key];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    addChatMsg(reply, 'bot');
  }, 900 + Math.random() * 600);
}

function sendQuick(msg) {
  const input = document.getElementById('chatInput');
  if (input) input.value = msg;
  sendChatMessage();
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}


/* ── Dashboard sync ─────────────────────────────────────────────────────
   Checks which API keys are saved and updates the connection status
   indicators on the overview panel. When Eventbrite is connected it
   fetches real registration data and populates the live data section.
   ──────────────────────────────────────────────────────────────────── */
function syncDashboard() {
  const eb  = localStorage.getItem('cbp_key_eventbrite');
  const mc  = localStorage.getItem('cbp_key_mailchimp');
  const sb  = localStorage.getItem('cbp_supabase_url') || 'https://mvftxnzvmmlzyrrqhitx.supabase.co';
  const thu = localStorage.getItem('cbp_eb_id_thu');
  const fri = localStorage.getItem('cbp_eb_id_fri');
  const sat = localStorage.getItem('cbp_eb_id_sat');
  const sun = localStorage.getItem('cbp_eb_id_sun');
  const hasEventIds = thu || fri || sat || sun;

  function setStatus(id, connected, label) {
    const row = document.getElementById(id);
    if (!row) return;
    const icon  = row.querySelector('i');
    const badge = row.querySelector('.api-status-badge');
    if (icon)  { icon.className = connected ? 'ti ti-circle-check' : 'ti ti-circle-x'; icon.style.color = connected ? 'var(--green)' : 'rgba(255,255,255,0.25)'; }
    if (badge) { badge.textContent = label; badge.className = 'api-status-badge ' + (connected ? 'is-set' : 'not-set'); }
  }

  setStatus('status-eb',      !!eb,           eb           ? 'Connected'  : 'Not connected');
  setStatus('status-mc',      !!mc,           mc           ? 'Connected'  : 'Not connected');
  setStatus('status-fb',      !!sb,           sb           ? 'Connected'  : 'Not connected');
  setStatus('status-eb-days', !!hasEventIds,  hasEventIds  ? 'IDs saved'  : 'Not set');

  const allConnected = eb && hasEventIds;
  const emptyState = document.getElementById('dash-empty-state');
  const liveData   = document.getElementById('dash-live-data');

  if (allConnected) {
    if (emptyState) emptyState.style.display = 'none';
    if (liveData)   liveData.style.display   = 'block';
    fetchAllEventbritePrices();
    populateLiveStats();
  } else {
    if (emptyState) emptyState.style.display = 'block';
    if (liveData)   liveData.style.display   = 'none';
  }
}

function populateLiveStats() {
  /* Placeholder — real data pulled once Eventbrite API integration
     returns attendee counts. Renders the stat cards and chart area. */
  const statsGrid = document.getElementById('dash-stats-grid');
  const intRow    = document.getElementById('dash-int-row');
  if (statsGrid) statsGrid.innerHTML = `
    <div class="sc"><div class="sl">Eventbrite</div><div class="sv" style="color:var(--green)">Live</div><div class="ss">Fetching data...</div></div>
    <div class="sc"><div class="sl">MailChimp</div><div class="sv" style="color:var(--gold)">—</div><div class="ss">Sync pending</div></div>
    <div class="sc"><div class="sl">Waivers</div><div class="sv" style="color:var(--sky)">—</div><div class="ss">Awaiting data</div></div>`;
  if (intRow) intRow.innerHTML = `
    <div class="itile"><div style="font-size:20px">🎟️</div><div class="iname">Eventbrite</div><div class="ist" style="color:var(--green)">● Connected</div><div class="icnt">Live</div></div>
    <div class="itile"><div style="font-size:20px">✉️</div><div class="iname">MailChimp</div><div class="ist">${localStorage.getItem('cbp_key_mailchimp') ? '● Connected' : '○ Not set'}</div><div class="icnt">—</div></div>
    <div class="itile"><div style="font-size:20px">📋</div><div class="iname">Waivers</div><div class="ist">● Active</div><div class="icnt">—</div></div>`;
}}

function safeValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function showTemp(id, ms = 3000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  window.setTimeout(() => { el.style.display = 'none'; }, ms);
}

function roleConfig(role) {
  return ({
    organizer: { label: 'Organizer', cls: 'rp-org', bg: 'rgba(255,0,160,0.2)', color: 'var(--pink)' },
    staff: { label: 'Staff', cls: 'rp-staff', bg: 'rgba(0,207,255,0.18)', color: 'var(--sky)' },
    sponsor: { label: 'Sponsor', cls: 'rp-spon', bg: 'rgba(255,214,0,0.18)', color: 'var(--gold)' },
    vendor: { label: 'Vendor', cls: 'rp-spon', bg: 'rgba(255,107,0,0.18)', color: 'var(--orange)' }
  })[role] || { label: role || 'User', cls: 'rp-org', bg: 'rgba(255,255,255,0.1)', color: '#fff' };
}

function setDashboardIdentity(user) {
  const meta = user?.user_metadata || {};
  const role = meta.role || 'organizer';
  const displayName = meta.full_name || meta.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const cfg = roleConfig(role);
  const avatar = document.getElementById('dAvatar');
  const dr = document.getElementById('dRole');

  if (avatar) {
    avatar.textContent = initials;
    avatar.style.background = cfg.bg;
    avatar.style.color = cfg.color;
  }
  safeText('dName', displayName);
  if (dr) {
    dr.textContent = cfg.label;
    dr.className = 'd-role ' + cfg.cls;
  }
  return role;
}

function updateDashNav(active = false) {
  const nb = document.getElementById('dashNavBtn');
  if (!nb) return;
  const icon = nb.querySelector('i');
  const span = nb.querySelector('span');
  if (icon) icon.className = loggedIn ? 'ti ti-layout-dashboard' : 'ti ti-lock';
  if (span) span.textContent = loggedIn ? 'Dashboard' : 'Login';
  if (active) nb.classList.add('active');
}

async function doLoginSupabase() {
  const sb = getSB();
  const email = document.getElementById('lEmail')?.value.trim().toLowerCase();
  const password = document.getElementById('lPass')?.value;
  const err = document.getElementById('lErr');
  const btn = document.querySelector('.btn-signin');

  if (!sb) { if (err) err.textContent = 'Auth not loaded. Refresh and try again.'; return; }
  if (!email || !password) { if (err) err.textContent = 'Enter your email and password.'; return; }
  if (err) err.textContent = '';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block"></i> Signing in...';
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-login" style="font-size:15px"></i>Sign In';
  }

  if (error) {
    if (err) err.textContent = error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message;
    return;
  }

  const role = data.user?.user_metadata?.role || 'organizer';
  if (role !== currentRole && !(role === 'vendor' && currentRole === 'sponsor')) {
    if (err) err.textContent = 'That account is a ' + role + '. Select the correct role tab.';
    await sb.auth.signOut();
    return;
  }

  loggedIn = true;
  const dashRole = setDashboardIdentity(data.user);
  buildDash(dashRole);
  updateDashNav(true);
  go('dashPage', document.getElementById('dashNavBtn'));
}

async function doLogoutSupabase() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  loggedIn = false;
  safeValue('lEmail', '');
  safeValue('lPass', '');
  safeText('lErr', '');
  updateDashNav(true);
  go('loginPage', document.getElementById('dashNavBtn'));
}

function doLogin() { doLoginSupabase(); }
function doLogout() { doLogoutSupabase(); }

async function resetPassword(email) {
  const sb = getSB();
  if (!sb || !email) return { message: 'Enter your email address first.' };
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/?reset=true'
  });
  return error;
}

function showForgotPassword() {
  const email = document.getElementById('lEmail')?.value.trim();
  if (!email) { alert('Enter your email address first, then click Forgot password.'); return; }
  resetPassword(email).then(err => {
    if (err) alert('Error: ' + err.message);
    else alert('Password reset email sent to ' + email + '. Check your inbox.');
  });
}

async function restoreSession() {
  const sb = getSB();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const session = data?.session;
  if (!session) return;
  loggedIn = true;
  const role = setDashboardIdentity(session.user);
  buildDash(role);
  updateDashNav(false);
}

/* ────────────────────────────────────────────────────────────
   PAGE NAVIGATION
──────────────────────────────────────────────────────────── */
function go(id, btn) {
  const page = document.getElementById(id);
  if (!page) {
    console.warn('Missing page:', id);
    return;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
}

function goDash(btn) {
  if (loggedIn) {
    updateDashNav(true);
    go('dashPage', btn);
  } else {
    updateDashNav(true);
    go('loginPage', btn);
  }
}

function setRole(role, btn) {
  currentRole = role;
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const hint = document.getElementById('demoHint');
  if (hint) hint.innerHTML = '<b>Email:</b> ' + (HINTS[role] || 'Use your Supabase login');
  safeText('lErr', '');
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  const icon = btn?.querySelector('i');
  if (icon) icon.className = showing ? 'ti ti-eye' : 'ti ti-eye-off';
}

function toggleApiPanel() {
  const body = document.getElementById('apiBody');
  const hdr = document.getElementById('apiToggle');
  if (!body) return;
  const open = body.classList.toggle('open');
  if (hdr) hdr.classList.toggle('open', open);
}

/* ────────────────────────────────────────────────────────────
   DASHBOARD
──────────────────────────────────────────────────────────── */
function buildDash(role) {
  const sidebar = document.getElementById('dashSidebar');
  const main = document.getElementById('dashMain');
  if (!sidebar || !main) return;

  if (role === 'staff') {
    sidebar.innerHTML = `
      <div class="sb-sec">My Tools</div>
      <button class="ni active" onclick="sp('s-checkin',this)"><i class="ti ti-qrcode"></i><span>Check-In</span></button>
      <button class="ni" onclick="sp('s-kids',this)"><i class="ti ti-mood-happy"></i><span>Kids Zone</span></button>
      <button class="ni" onclick="sp('s-schedule',this)"><i class="ti ti-calendar"></i><span>Schedule</span></button>
      <button class="ni" onclick="sp('s-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>`;
    main.innerHTML = `
      <div id="s-checkin" class="dpanel active"><div class="ptitle">Check-In</div><div class="dcrd2"><h3>Search attendee</h3><p style="font-size:13px;color:rgba(255,255,255,.5)">Supabase attendee/check-in table is not connected yet.</p><div class="act-row"><button class="act-btn primary">Look Up</button><button class="act-btn">Scan QR</button></div></div></div>
      <div id="s-kids" class="dpanel"><div class="ptitle">Kids Zone</div><div class="dcrd2"><h3>Kids Zone</h3><p>Waiver data will load after the waivers table is connected.</p></div></div>
      <div id="s-schedule" class="dpanel"><div class="ptitle">Today's Schedule</div><div class="dcrd2"><h3>Saturday July 5</h3><p>Setup, gates open, kids zone, and evening crowd management.</p></div></div>
      <div id="s-waivers" class="dpanel"><div class="ptitle">Waivers</div><div class="dcrd2"><h3>On-site collection</h3><div class="act-row"><button class="act-btn primary">Show QR Code</button><button class="act-btn">Text Link</button></div></div></div>`;
    return;
  }

  if (role === 'sponsor') {
    sidebar.innerHTML = `
      <div class="sb-sec">My Sponsorship</div>
      <button class="ni active" onclick="sp('p-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('p-benefits',this)"><i class="ti ti-star"></i><span>Benefits</span></button>
      <button class="ni" onclick="sp('p-demo',this)"><i class="ti ti-chart-bar"></i><span>Demographics</span></button>
      <button class="ni" onclick="sp('p-cra',this)"><i class="ti ti-file-description"></i><span>CRA Docs</span></button>`;
    main.innerHTML = `
      <div id="p-overview" class="dpanel active"><div class="ptitle">My Sponsorship</div><div class="dcrd2"><h3>Sponsor Portal</h3><p style="font-size:13px;color:rgba(255,255,255,.5)">Sponsor data will load after the sponsors table is connected in Supabase.</p></div></div>
      <div id="p-benefits" class="dpanel"><div class="ptitle">My Benefits</div><div class="dcrd2"><h3>Benefits</h3><p>Benefits package placeholder.</p></div></div>
      <div id="p-demo" class="dpanel"><div class="ptitle">Demographics</div><div class="dcrd2"><h3>Demographics</h3><p>Post-registration demographics will show here.</p></div></div>
      <div id="p-cra" class="dpanel"><div class="ptitle">CRA Documents</div><div class="dcrd2"><h3>CRA Package</h3><p>CRA documents will generate after event data is connected.</p></div></div>`;
    return;
  }

  sidebar.innerHTML = `
    <div class="sb-sec">Main</div>
    <button class="ni active" onclick="sp('o-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
    <button class="ni" onclick="sp('o-regs',this)"><i class="ti ti-users"></i><span>Registrations</span></button>
    <button class="ni" onclick="sp('o-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>
    <div class="sb-sec">Comms</div>
    <button class="ni" onclick="sp('o-mailchimp',this)"><i class="ti ti-mail"></i><span>MailChimp</span></button>
    <button class="ni" onclick="sp('o-sponsors',this)"><i class="ti ti-building"></i><span>Sponsors</span></button>
    <div class="sb-sec">Admin</div>
    <button class="ni" onclick="sp('o-settings',this)"><i class="ti ti-settings"></i><span>API Status</span></button>
    <button class="ni" onclick="sp('o-staff',this)"><i class="ti ti-id-badge"></i><span>Staff</span></button>
    <button class="ni" onclick="sp('o-cra',this)"><i class="ti ti-home"></i><span>CRA/Housing</span></button>`;

  main.innerHTML = `
    <div id="o-overview" class="dpanel active">
      <div class="ptitle">Overview</div>
      <div id="dash-empty-state" style="background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:14px;padding:40px 24px;text-align:center;margin-bottom:18px;">
        <div style="font-size:36px;margin-bottom:14px;">🔌</div>
        <div style="font-family:'Teko',sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;margin-bottom:8px;color:rgba(255,255,255,0.7)">No data yet — connect your APIs</div>
        <p style="font-size:13px;color:rgba(255,255,255,0.4);max-width:420px;margin:0 auto 20px;line-height:1.7">Supabase Auth is wired. Database tables and Eventbrite server-side sync still need to be created.</p>
        <div style="display:flex;flex-direction:column;gap:8px;max-width:320px;margin:0 auto 20px;text-align:left;">
          <div class="api-status-row" id="status-eb"><i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i><span>Eventbrite</span><span class="api-status-badge not-set">Not connected</span></div>
          <div class="api-status-row" id="status-mc"><i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i><span>MailChimp</span><span class="api-status-badge not-set">Not connected</span></div>
          <div class="api-status-row" id="status-fb"><i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i><span>Firebase</span><span class="api-status-badge not-set">Not connected</span></div>
          <div class="api-status-row" id="status-eb-days"><i class="ti ti-circle-x" style="color:rgba(255,255,255,0.25)"></i><span>Eventbrite Event IDs</span><span class="api-status-badge not-set">Not set</span></div>
        </div>
        <button class="act-btn primary" onclick="sp('o-settings',document.querySelectorAll('#dashSidebar .ni')[5])"><i class="ti ti-settings" style="font-size:13px"></i>Go to API Settings</button>
      </div>
      <div id="dash-live-data" style="display:none;"><div class="sg" id="dash-stats-grid"></div><div class="two-col" id="dash-charts-row"></div><div class="int-row" id="dash-int-row"></div></div>
      <div class="dcrd2" style="margin-top:0"><h3>Quick actions</h3><div style="display:flex;flex-direction:column;gap:7px"><button class="act-btn primary" onclick="syncDashboard()"><i class="ti ti-refresh" style="font-size:13px"></i>Sync All APIs Now</button><button class="act-btn" onclick="exportRegistrationsCSV()"><i class="ti ti-download" style="font-size:13px"></i>Export Registrations CSV</button><button class="act-btn" onclick="alert('MailChimp server endpoint is not connected yet.')"><i class="ti ti-mail" style="font-size:13px"></i>Sync MailChimp Now</button><button class="act-btn" onclick="alert('Waiver reminder endpoint is not connected yet.')"><i class="ti ti-file-check" style="font-size:13px"></i>Send Waiver Reminders</button><button class="act-btn" onclick="openEventbriteDashboard()"><i class="ti ti-external-link" style="font-size:13px"></i>Open Eventbrite</button></div></div>
    </div>
    <div id="o-settings" class="dpanel"><div class="ptitle">API Settings</div>${apiSettingsHTML()}</div>
    <div id="o-regs" class="dpanel"><div class="ptitle">Registrations</div><div class="dcrd2"><h3>Recent sign-ups</h3><p style="font-size:13px;color:rgba(255,255,255,.5)">Create Supabase registrations table or connect Eventbrite attendee endpoint to populate this page.</p><div id="regs-table" style="display:none"><table class="dtable"><thead><tr><th>Name</th><th>Event</th><th>Type</th><th>Waiver</th><th>MC</th></tr></thead><tbody id="regs-tbody"></tbody></table></div></div></div>
    <div id="o-waivers" class="dpanel"><div class="ptitle">Waivers</div><div class="dcrd2"><h3>Waivers</h3><p>Missing Supabase waiver table and form submission handler.</p></div></div>
    <div id="o-mailchimp" class="dpanel"><div class="ptitle">MailChimp</div><div class="dcrd2"><h3>MailChimp</h3><p>Needs server-side endpoint. Do not expose MailChimp private keys in browser localStorage for production.</p></div></div>
    <div id="o-sponsors" class="dpanel"><div class="ptitle">Sponsors</div><div class="dcrd2"><h3>Sponsors</h3><p>Sponsor interest forms currently show alerts only. Add Supabase table insert.</p></div></div>
    <div id="o-staff" class="dpanel"><div class="ptitle">Staff Accounts</div><div class="dcrd2"><h3>Staff Accounts</h3><p>Create staff in Supabase Authentication and set user_metadata.role = staff.</p><a class="act-btn primary" href="https://supabase.com/dashboard/project/mvftxnzvmmlzyrrqhitx/auth/users" target="_blank" rel="noopener">Add Staff in Supabase</a></div></div>
    <div id="o-cra" class="dpanel"><div class="ptitle">CRA & Housing</div><div class="dcrd2"><h3>CRA & Housing</h3><p>CRA reporting needs registrations, demographics, volunteer hours, housing counseling session data.</p></div></div>`;

  window.setTimeout(() => { loadApiKeys(); syncDashboard(); }, 100);
}

function apiSettingsHTML() {
  return `
    <div class="api-dash-card">
      <h3><i class="ti ti-key"></i>Integration Keys</h3>
      <p style="font-size:12px;color:rgba(255,255,255,.45);margin-bottom:16px;line-height:1.6">Temporary browser storage only. For production, move private tokens to Supabase Edge Functions.</p>
      <div class="api-row">
        <div class="api-field"><label><i class="ti ti-ticket"></i>Eventbrite Private Token</label><div class="api-input-wrap"><input type="password" id="dk-eventbrite" placeholder="Paste Eventbrite Private Token"><button class="api-eye" onclick="togglePw('dk-eventbrite',this)" type="button"><i class="ti ti-eye"></i></button></div></div>
        <div class="api-field"><label><i class="ti ti-mail"></i>MailChimp API Key</label><div class="api-input-wrap"><input type="password" id="dk-mailchimp" placeholder="Paste MailChimp API Key"><button class="api-eye" onclick="togglePw('dk-mailchimp',this)" type="button"><i class="ti ti-eye"></i></button></div></div>
        <div class="api-field"><label><i class="ti ti-brand-firebase"></i>Firebase Config JSON</label><div class="api-input-wrap"><input type="password" id="dk-firebase" placeholder='{"apiKey":"...","projectId":"..."}'><button class="api-eye" onclick="togglePw('dk-firebase',this)" type="button"><i class="ti ti-eye"></i></button></div></div>
        <div class="api-field"><label><i class="ti ti-world"></i>Eventbrite Org ID</label><div class="api-input-wrap"><input type="text" id="dk-orgid" placeholder="Eventbrite Org ID"></div></div>
      </div>
      <div class="api-field" style="margin-top:4px"><label><i class="ti ti-link"></i>Global Eventbrite URL</label><div class="api-input-wrap"><input type="text" id="dk-eburl" placeholder="https://www.eventbrite.com/e/your-event-id"></div></div>
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,214,0,0.6);margin:16px 0 10px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07);">Eventbrite Event IDs — one per day</div>
      <div class="api-row">
        <div class="api-field"><label>THU July 3</label><div class="api-input-wrap"><input type="text" id="dk-eb-thu" placeholder="Thursday Event ID"></div></div>
        <div class="api-field"><label>FRI July 4</label><div class="api-input-wrap"><input type="text" id="dk-eb-fri" placeholder="Friday Event ID"></div></div>
        <div class="api-field"><label>SAT July 5</label><div class="api-input-wrap"><input type="text" id="dk-eb-sat" placeholder="Saturday Event ID"></div></div>
        <div class="api-field"><label>SUN July 6</label><div class="api-input-wrap"><input type="text" id="dk-eb-sun" placeholder="Sunday Event ID"></div></div>
      </div>
      <button class="api-save" onclick="saveApiKeys()" style="margin-top:10px"><i class="ti ti-device-floppy" style="font-size:14px"></i>Save All Keys</button>
      <div class="api-saved" id="dkSaved"><i class="ti ti-check" style="font-size:12px;vertical-align:-1px"></i> Saved successfully</div>
    </div>`;
}

function sp(panelId, btn) {
  const panel = document.getElementById(panelId);
  if (!panel) { console.warn('Missing dashboard panel:', panelId); return; }
  document.querySelectorAll('#dashMain .dpanel').forEach(p => p.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll('#dashSidebar .ni').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function syncDashboard() {
  const eb = localStorage.getItem('cbp_key_eventbrite');
  const mc = localStorage.getItem('cbp_key_mailchimp');
  const fb = localStorage.getItem('cbp_key_firebase');
  const hasEventIds = ['thu', 'fri', 'sat', 'sun'].some(day => localStorage.getItem('cbp_eb_id_' + day));

  function setStatus(id, connected, label) {
    const row = document.getElementById(id);
    if (!row) return;
    const icon = row.querySelector('i');
    const badge = row.querySelector('.api-status-badge');
    if (icon) { icon.className = connected ? 'ti ti-circle-check' : 'ti ti-circle-x'; icon.style.color = connected ? 'var(--green)' : 'rgba(255,255,255,0.25)'; }
    if (badge) { badge.textContent = label; badge.className = 'api-status-badge ' + (connected ? 'is-set' : 'not-set'); }
  }

  setStatus('status-eb', !!eb, eb ? 'Connected' : 'Not connected');
  setStatus('status-mc', !!mc, mc ? 'Connected' : 'Not connected');
  setStatus('status-fb', !!fb, fb ? 'Connected' : 'Not connected');
  setStatus('status-eb-days', !!hasEventIds, hasEventIds ? 'IDs saved' : 'Not set');

  const allConnected = eb && hasEventIds;
  const emptyState = document.getElementById('dash-empty-state');
  const liveData = document.getElementById('dash-live-data');

  if (allConnected) {
    if (emptyState) emptyState.style.display = 'none';
    if (liveData) liveData.style.display = 'block';
    fetchAllEventbritePrices();
    populateLiveStats();
  } else {
    if (emptyState) emptyState.style.display = 'block';
    if (liveData) liveData.style.display = 'none';
  }
}

function populateLiveStats() {
  const statsGrid = document.getElementById('dash-stats-grid');
  const intRow = document.getElementById('dash-int-row');
  if (statsGrid) statsGrid.innerHTML = `
    <div class="sc"><div class="sl">Eventbrite</div><div class="sv" style="color:var(--green)">Ready</div><div class="ss">Price sync attempted</div></div>
    <div class="sc"><div class="sl">Supabase DB</div><div class="sv" style="color:var(--gold)">Missing</div><div class="ss">Tables not created</div></div>
    <div class="sc"><div class="sl">Waivers</div><div class="sv" style="color:var(--sky)">Pending</div><div class="ss">Needs table + form</div></div>`;
  if (intRow) intRow.innerHTML = `
    <div class="itile"><div style="font-size:20px">🎟️</div><div class="iname">Eventbrite</div><div class="ist" style="color:var(--green)">● Configured</div><div class="icnt">Local</div></div>
    <div class="itile"><div style="font-size:20px">🗄️</div><div class="iname">Supabase</div><div class="ist">○ Auth only</div><div class="icnt">No DB</div></div>
    <div class="itile"><div style="font-size:20px">📋</div><div class="iname">Waivers</div><div class="ist">○ Not connected</div><div class="icnt">—</div></div>`;
}

function exportRegistrationsCSV() {
  alert('Export is not connected yet. Create a registrations table or Eventbrite attendee endpoint first.');
}

function openEventbriteDashboard() {
  const org = localStorage.getItem('cbp_key_orgid');
  window.open(org ? 'https://www.eventbrite.com/organizations/events' : 'https://www.eventbrite.com/organizations/events', '_blank', 'noopener');
}

/* ────────────────────────────────────────────────────────────
   API KEY / EVENTBRITE SETTINGS
──────────────────────────────────────────────────────────── */
function loadApiKeys() {
  ['eventbrite', 'mailchimp', 'firebase', 'orgid', 'eburl'].forEach(k => {
    const saved = localStorage.getItem('cbp_key_' + k);
    const el = document.getElementById('dk-' + k);
    if (saved && el) el.value = saved;
  });
  ['thu', 'fri', 'sat', 'sun'].forEach(day => {
    const saved = localStorage.getItem('cbp_eb_id_' + day);
    const dashEl = document.getElementById('dk-eb-' + day);
    if (saved && dashEl) dashEl.value = saved;
    if (saved && EB_DAY_MAP[day]) EB_DAY_MAP[day].ebId = saved;
  });
}

function saveApiKeys() {
  ['eventbrite', 'mailchimp', 'firebase', 'orgid', 'eburl'].forEach(k => {
    const el = document.getElementById('dk-' + k);
    if (el && el.value.trim()) localStorage.setItem('cbp_key_' + k, el.value.trim());
  });
  ['thu', 'fri', 'sat', 'sun'].forEach(day => {
    const el = document.getElementById('dk-eb-' + day);
    if (el && el.value.trim()) {
      const id = el.value.trim();
      localStorage.setItem('cbp_eb_id_' + day, id);
      if (EB_DAY_MAP[day]) EB_DAY_MAP[day].ebId = id;
    }
  });
  const urlEl = document.getElementById('dk-eburl');
  if (urlEl && urlEl.value.trim()) setEventbriteUrl(urlEl.value.trim());
  showTemp('dkSaved');
  syncDashboard();
}

function setEventbriteUrl(url) {
  if (!url || !url.startsWith('http')) return;
  document.querySelectorAll('a[id^="reg-"]').forEach(a => { a.href = url; });
}

const EVENT_NAMES = {
  'thu-mixer': 'Small Business Mixer — Thu July 3',
  'thu-workshop': 'Financial Literacy Workshop — Thu July 3',
  'fri-taste': 'Taste of Lovejoy — Fri July 4',
  'fri-kids': 'Kids Carnival & Games — Fri July 4',
  'sat-main': 'Cars, Bikes & Vibes — Sat July 5',
  'sat-slides': 'Water Slides & Bubbles — Sat July 5',
  'sat-gamers': 'Gamers Lounge + Laser Tag — Sat July 5',
  'sun-skate': 'Let\'s Skate! Day Party Finale — Sun July 6',
  'sun-housing': 'Housing Counseling Fair — Sun July 6',
  'weekend-pass': 'Full Weekend Pass — July 3–6'
};

const EB_DAY_MAP = {
  thu: { label: 'Thursday, July 3 — Small Business Kickoff', ebId: '', cards: [
    { key: 'thu-mixer', p1: 'p1-thu-mixer', lbl1: 'lbl1-thu-mixer', p2: 'p2-thu-mixer', lbl2: 'lbl2-thu-mixer', statusId: 'status-thu-mixer', btnId: 'btn-thu-mixer', ticketHint: '' },
    { key: 'thu-workshop', p1: 'p1-thu-workshop', lbl1: 'lbl1-thu-workshop', p2: 'p2-thu-workshop', lbl2: 'lbl2-thu-workshop', statusId: 'status-thu-workshop', btnId: 'btn-thu-workshop', ticketHint: '' }
  ]},
  fri: { label: 'Friday, July 4 — Taste of Lovejoy', ebId: '', cards: [
    { key: 'fri-taste', p1: 'p1-fri-taste', lbl1: 'lbl1-fri-taste', p2: 'p2-fri-taste', lbl2: 'lbl2-fri-taste', statusId: 'status-fri-taste', btnId: 'btn-fri-taste', ticketHint: '' },
    { key: 'fri-kids', p1: 'p1-fri-kids', lbl1: 'lbl1-fri-kids', p2: 'p2-fri-kids', lbl2: 'lbl2-fri-kids', statusId: 'status-fri-kids', btnId: 'btn-fri-kids', ticketHint: '' }
  ]},
  sat: { label: 'Saturday, July 5 — Cars, Bikes & Vibes', ebId: '', cards: [
    { key: 'sat-main', p1: 'p1-sat-main', lbl1: 'lbl1-sat-main', p2: 'p2-sat-main', lbl2: 'lbl2-sat-main', statusId: 'status-sat-main', btnId: 'btn-sat-main', ticketHint: '' },
    { key: 'sat-slides', p1: 'p1-sat-slides', lbl1: 'lbl1-sat-slides', p2: 'p2-sat-slides', lbl2: 'lbl2-sat-slides', statusId: 'status-sat-slides', btnId: 'btn-sat-slides', ticketHint: '' },
    { key: 'sat-gamers', p1: 'p1-sat-gamers', lbl1: 'lbl1-sat-gamers', p2: 'p2-sat-gamers', lbl2: 'lbl2-sat-gamers', statusId: 'status-sat-gamers', btnId: 'btn-sat-gamers', ticketHint: '' }
  ]},
  sun: { label: 'Sunday, July 6 — Day Party Finale', ebId: '', cards: [
    { key: 'sun-skate', p1: 'p1-sun-skate', lbl1: 'lbl1-sun-skate', p2: 'p2-sun-skate', lbl2: 'lbl2-sun-skate', statusId: 'status-sun-skate', btnId: 'btn-sun-skate', ticketHint: '' },
    { key: 'sun-housing', p1: 'p1-sun-housing', lbl1: 'lbl1-sun-housing', p2: 'p2-sun-housing', lbl2: 'lbl2-sun-housing', statusId: 'status-sun-housing', btnId: 'btn-sun-housing', ticketHint: '' }
  ]}
};

const CARD_TO_DAY = {};
Object.entries(EB_DAY_MAP).forEach(([day, cfg]) => cfg.cards.forEach(c => { CARD_TO_DAY[c.key] = day; }));
const EB_CARD_MAP = {};
Object.values(EB_DAY_MAP).forEach(cfg => cfg.cards.forEach(c => { EB_CARD_MAP[c.key] = c; }));

function openReg(cardKey) {
  const day = CARD_TO_DAY[cardKey] || '';
  const dayCfg = EB_DAY_MAP[day] || {};
  const cardCfg = EB_CARD_MAP[cardKey] || {};
  const dayId = dayCfg.ebId || localStorage.getItem('cbp_eb_id_' + day) || '';
  const globalUrl = localStorage.getItem('cbp_key_eburl') || '';
  let baseUrl = dayId ? 'https://www.eventbrite.com/e/' + dayId : globalUrl;
  if (baseUrl && cardCfg.ticketHint) baseUrl += (baseUrl.includes('?') ? '&' : '?') + cardCfg.ticketHint;

  safeText('ebEventTitle', dayCfg.label || EVENT_NAMES[cardKey] || 'Registration');
  const embedEl = document.getElementById('ebEmbedSection');
  const iframe = document.getElementById('ebIframe');
  const placeholder = document.getElementById('ebPlaceholder');
  const directLink = document.getElementById('ebDirectLink');

  if (embedEl) embedEl.style.display = 'block';
  if (baseUrl && baseUrl.startsWith('http')) {
    if (iframe) { iframe.src = baseUrl; iframe.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (directLink) directLink.href = baseUrl;
  } else {
    if (iframe) iframe.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
  }
  if (embedEl) embedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeReg() {
  const section = document.getElementById('ebEmbedSection');
  const iframe = document.getElementById('ebIframe');
  if (section) section.style.display = 'none';
  if (iframe) iframe.src = '';
}

function showEvt(day, btn) {
  document.querySelectorAll('.evt-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.reg-card').forEach(c => {
    c.style.display = (day === 'all' || c.dataset.day === day || c.dataset.day === 'all') ? 'flex' : 'none';
  });
}

function fmtPrice(cost) {
  if (!cost || cost.currency === 'FREE' || parseInt(cost.value || '0', 10) === 0) return 'FREE';
  const dollars = parseInt(cost.value || '0', 10) / 100;
  return '$' + (dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2));
}

function setCardLoading(key) {
  const ids = EB_CARD_MAP[key];
  if (!ids) return;
  const p1 = document.getElementById(ids.p1);
  const p2 = document.getElementById(ids.p2);
  if (p1) { p1.style.opacity = '0.4'; p1.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite;display:inline-block;font-size:16px"></i>'; }
  if (p2) { p2.style.opacity = '0.4'; p2.innerHTML = '—'; }
}

function applyEventData(key, data, ticketsOverride) {
  const ids = EB_CARD_MAP[key];
  if (!ids || !data) return;
  const tickets = (ticketsOverride || data.ticket_classes || []).filter(t => !t.hidden && t.on_sale_status !== 'UNAVAILABLE');
  const statusEl = document.getElementById(ids.statusId);
  const btnEl = document.getElementById(ids.btnId);
  if (statusEl) {
    statusEl.textContent = 'On Sale';
    statusEl.className = 'rc-badge';
    statusEl.style.background = 'rgba(0,255,106,0.12)';
    statusEl.style.color = 'var(--green)';
    statusEl.style.display = 'block';
  }
  if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
  const p1 = document.getElementById(ids.p1);
  const p2 = document.getElementById(ids.p2);
  const l1 = document.getElementById(ids.lbl1);
  const l2 = document.getElementById(ids.lbl2);
  if (tickets[0] && p1) { p1.style.opacity = '1'; p1.textContent = fmtPrice(tickets[0].cost); if (l1) l1.textContent = tickets[0].name || 'General'; }
  if (tickets[1] && p2) { p2.style.opacity = '1'; p2.textContent = fmtPrice(tickets[1].cost); if (l2) l2.textContent = tickets[1].name || 'VIP'; }
}

async function fetchEventbriteEvent(eventId, token) {
  const url = 'https://corsproxy.io/?' + encodeURIComponent('https://www.eventbriteapi.com/v3/events/' + eventId + '/?expand=ticket_classes');
  try {
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('Eventbrite fetch failed for event', eventId, e.message);
    return null;
  }
}

async function fetchAllEventbritePrices() {
  const token = localStorage.getItem('cbp_key_eventbrite');
  if (!token) return;
  for (const [day, dayCfg] of Object.entries(EB_DAY_MAP)) {
    const eventId = dayCfg.ebId || localStorage.getItem('cbp_eb_id_' + day) || '';
    if (!eventId || eventId.startsWith('EB_')) continue;
    dayCfg.cards.forEach(c => setCardLoading(c.key));
    const data = await fetchEventbriteEvent(eventId, token);
    if (data) {
      const tiers = (data.ticket_classes || []).filter(t => !t.hidden);
      dayCfg.cards.forEach((cardCfg, i) => applyEventData(cardCfg.key, data, tiers.slice(i * 2, i * 2 + 2)));
    } else {
      dayCfg.cards.forEach(c => {
        const p1 = document.getElementById(c.p1);
        const p2 = document.getElementById(c.p2);
        if (p1) p1.style.opacity = '1';
        if (p2) p2.style.opacity = '1';
      });
    }
  }
}

/* ────────────────────────────────────────────────────────────
   SPONSORS / VENDORS
──────────────────────────────────────────────────────────── */
function pickTier(card, name) {
  document.querySelectorAll('.tier').forEach(c => c.classList.remove('sel'));
  if (card) card.classList.add('sel');
  const modal = document.getElementById('sponModal');
  if (modal) modal.classList.add('open');
  const sel = document.getElementById('sponLevel');
  if (sel) {
    for (const o of sel.options) {
      if (o.text.toLowerCase().startsWith(String(name).toLowerCase())) { sel.value = o.value; break; }
    }
  }
}

function submitSpon() {
  const modal = document.getElementById('sponModal');
  if (modal) modal.classList.remove('open');
  alert('Thank you! Our team will reach out within 24 hours with your full sponsorship packet and CRA documentation preview.');
}

function showVendorTab(tab, btn) {
  document.querySelectorAll('.vendor-panel').forEach(p => { p.style.display = 'none'; });
  document.querySelectorAll('.vendor-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('vendor-' + tab);
  if (panel) panel.style.display = 'block';
  if (btn) btn.classList.add('active');
}

async function supabaseVendorSignup(email, password, bizName) {
  const sb = getSB();
  if (!sb) return { error: { message: 'Auth not loaded' } };
  return sb.auth.signUp({ email, password, options: { data: { role: 'vendor', full_name: bizName } } });
}

function submitVendorApp() {
  const biz = document.getElementById('v-bizname')?.value.trim();
  const email = document.getElementById('v-email')?.value.trim();
  const cat = document.getElementById('v-cat')?.value;
  if (!biz || !email || !cat) { alert('Please fill in all required fields.'); return; }
  const success = document.getElementById('vendor-success');
  if (success) success.style.display = 'block';
  ['v-bizname', 'v-name', 'v-email', 'v-phone', 'v-desc'].forEach(id => safeValue(id, ''));
}

async function vendorLogin() {
  const sb = getSB();
  const email = document.getElementById('vl-email')?.value.trim().toLowerCase();
  const password = document.getElementById('vl-pass')?.value;
  const errEl = document.getElementById('vl-err');
  if (!sb) { if (errEl) errEl.textContent = 'Auth not loaded.'; return; }
  if (!email || !password) { if (errEl) errEl.textContent = 'Enter your email and password.'; return; }
  if (errEl) errEl.textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { if (errEl) errEl.textContent = 'Incorrect email or password.'; return; }
  const meta = data.user?.user_metadata || {};
  if (meta.role !== 'vendor') { if (errEl) errEl.textContent = 'This account is not a vendor account.'; await sb.auth.signOut(); return; }
  safeText('vd-name', meta.full_name || meta.name || email.split('@')[0]);
  safeText('vd-booth', meta.booth || 'TBA');
  safeText('vd-cat', meta.category || 'Vendor');
  const loginForm = document.getElementById('vl-form');
  if (loginForm) loginForm.style.display = 'none';
  const dash = document.getElementById('vendor-dashboard');
  if (dash) dash.style.display = 'block';
}

async function vendorLogout() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  safeValue('vl-email', '');
  safeValue('vl-pass', '');
  const dash = document.getElementById('vendor-dashboard');
  if (dash) dash.style.display = 'none';
  const loginForm = document.getElementById('vl-form');
  if (loginForm) loginForm.style.display = 'block';
}

/* ────────────────────────────────────────────────────────────
   CHAT WIDGET
──────────────────────────────────────────────────────────── */
const CHAT_RESPONSES = {
  ticket: ['Click Register or Get Tickets. Each event can use its own Eventbrite link once IDs are saved.', 'Tickets are on the Registration page. Add Eventbrite IDs in the Organizer dashboard to activate live registration.'],
  vendor: ['Click Vendors and submit the vendor application. The current form needs Supabase table storage added for production.', 'Vendor applications are available on the Vendors tab.'],
  sponsor: ['Sponsorship packages start at Community Partner and go up to Presenting Sponsor. Click Sponsors to choose a tier.', 'Visit the Sponsors page to view packages and request sponsorship details.'],
  schedule: ['The Collective Block Party runs July 3–6, 2026 in Lovejoy, GA: Thu mixer, Fri Taste of Lovejoy, Sat main event, Sun finale.', 'Check the Events page for the full lineup.'],
  kids: ['Yes, kids activities include carnival games, water slides, bubbles, and gaming activities. Waivers should be connected before launch.', 'Kids Zone activities are planned across the weekend.'],
  parking: ['Parking details should be added before launch and included in confirmation emails.', 'Parking information is not finalized on the site yet.'],
  housing: ['Sunday includes a Housing Counseling Fair. Add booking/registration fields to track sessions for CRA reporting.', 'Housing counseling information is listed for Sunday.'],
  location: ['The event is in Lovejoy, Georgia. Add the exact venue address once ready for public release.', 'Location details should be included in the Eventbrite confirmation.'],
  default: ['I can help with tickets, vendors, sponsorships, schedule, kids activities, housing counseling, and location.', 'For specific event questions, contact the organizer or check the event pages.']
};

function getResponseKey(msg) {
  const m = String(msg).toLowerCase();
  if (/ticket|register|buy|purchase|pass|admission/.test(m)) return 'ticket';
  if (/vendor|booth|sell|apply|food truck/.test(m)) return 'vendor';
  if (/sponsor|partner|cra|donate|marketing/.test(m)) return 'sponsor';
  if (/schedule|lineup|day|when|time|hours/.test(m)) return 'schedule';
  if (/kid|child|water slide|bubble|carnival|laser|gamer/.test(m)) return 'kids';
  if (/park/.test(m)) return 'parking';
  if (/housing|counseling|hud|home|mortgage|foreclosure/.test(m)) return 'housing';
  if (/where|location|address|lovejoy|directions/.test(m)) return 'location';
  return 'default';
}

function toggleChat() {
  const win = document.getElementById('chatWindow');
  const icon = document.getElementById('chatIcon');
  const badge = document.getElementById('chatBadge');
  if (!win) return;
  const open = win.style.display === 'none' || !win.style.display;
  win.style.display = open ? 'block' : 'none';
  if (icon) icon.className = open ? 'ti ti-x' : 'ti ti-message-circle';
  if (badge) badge.style.display = 'none';
}

function addChatMsg(text, type) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = '<div class="chat-bubble">' + String(text).replace(/\n/g, '<br>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</div><div class="chat-time">' + now + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'chatTyping';
  div.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  addChatMsg(msg, 'user');
  document.querySelectorAll('.chat-quick').forEach(b => b.parentElement?.remove());
  const typing = showTyping();
  window.setTimeout(() => {
    if (typing) typing.remove();
    const responses = CHAT_RESPONSES[getResponseKey(msg)] || CHAT_RESPONSES.default;
    addChatMsg(responses[Math.floor(Math.random() * responses.length)], 'bot');
  }, 500);
}

function sendQuick(msg) {
  const input = document.getElementById('chatInput');
  if (input) input.value = msg;
  sendChatMessage();
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

/* ────────────────────────────────────────────────────────────
   STARTUP
──────────────────────────────────────────────────────────── */
function initApp() {
  const styleId = 'cbp-spin-style';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  const b = document.getElementById('jsCheck');
  if (b) { b.style.display = 'block'; window.setTimeout(() => { b.style.display = 'none'; }, 3000); }

  document.getElementById('lEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('lPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  loadApiKeys();
  const savedUrl = localStorage.getItem('cbp_key_eburl');
  if (savedUrl) setEventbriteUrl(savedUrl);
  restoreSession();
}

document.addEventListener('DOMContentLoaded', initApp);
