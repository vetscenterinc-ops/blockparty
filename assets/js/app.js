/* ============================================================
   The Collective Block Party — Clean Button Handler Script
   Purpose: navigation, dashboard settings, Eventbrite links,
   Gravity Forms placeholders, vendor tools, and chat.
   ============================================================ */

const SUPABASE_URL = 'https://mvftxnzvmmlzyrrqhitx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZnR4bnp2bW1senlycnFoaXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzYyNDgsImV4cCI6MjA5NjExMjI0OH0.hfaw7npVZZ_aIXBuuv1dKup0kL0l_Pp7PPf0c6kIGA0';

let _sb = null;
let currentRole = 'organizer';
let loggedIn = false;

const HINTS = {
  organizer: 'organizer account email',
  staff: 'staff account email',
  sponsor: 'sponsor account email',
  vendor: 'vendor account email'
};

const EVENTBRITE_EVENTS = [
  { key: 'thu-mixer', day: 'THU July 3', name: 'Small Business Mixer' },
  { key: 'thu-workshop', day: 'THU July 3', name: 'Financial Literacy Workshop' },
  { key: 'fri-taste', day: 'FRI July 4', name: 'Taste of Lovejoy' },
  { key: 'fri-kids', day: 'FRI July 4', name: 'Kids Carnival & Games' },
  { key: 'sat-main', day: 'SAT July 5', name: 'Cars, Bikes & Vibes' },
  { key: 'sat-slides', day: 'SAT July 5', name: 'Water Slides & Bubbles' },
  { key: 'sat-gamers', day: 'SAT July 5', name: 'Gamers Lounge + Laser Tag' },
  { key: 'sun-skate', day: 'SUN July 6', name: "Let's Skate! Day Party Finale" },
  { key: 'sun-housing', day: 'SUN July 6', name: 'Housing Counseling Fair' },
  { key: 'weekend-pass', day: 'All Weekend', name: 'Full Weekend Pass' }
];

const EVENT_NAMES = Object.fromEntries(EVENTBRITE_EVENTS.map(e => [e.key, `${e.name} — ${e.day}`]));

function getSB() {
  if (!_sb && window.supabase) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _sb;
}

function $(id) { return document.getElementById(id); }
function safeText(id, value) { const el = $(id); if (el) el.textContent = value; }
function safeValue(id, value) { const el = $(id); if (el) el.value = value; }

function go(id, btn) {
  const page = $(id);
  if (!page) { console.warn('Missing page:', id); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDashNav() {
  const nb = $('dashNavBtn');
  if (!nb) return;
  const icon = nb.querySelector('i');
  const span = nb.querySelector('span');
  if (icon) icon.className = loggedIn ? 'ti ti-layout-dashboard' : 'ti ti-lock';
  if (span) span.textContent = loggedIn ? 'Dashboard' : 'Login';
}

function goDash(btn) {
  updateDashNav();
  go(loggedIn ? 'dashPage' : 'loginPage', btn || $('dashNavBtn'));
}

function setRole(role, btn) {
  currentRole = role;
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const hint = $('demoHint');
  if (hint) hint.innerHTML = '<b>Email:</b> ' + (HINTS[role] || 'Use your Supabase login');
  safeText('lErr', '');
}

function togglePw(id, btn) {
  const inp = $(id);
  if (!inp) return;
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  const icon = btn?.querySelector('i');
  if (icon) icon.className = showing ? 'ti ti-eye' : 'ti ti-eye-off';
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
  const avatar = $('dAvatar');
  const dr = $('dRole');
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

async function doLoginSupabase() {
  const sb = getSB();
  const email = $('lEmail')?.value.trim().toLowerCase();
  const password = $('lPass')?.value;
  const err = $('lErr');
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
  updateDashNav();
  go('dashPage', $('dashNavBtn'));
}

async function doLogoutSupabase() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  loggedIn = false;
  safeValue('lEmail', '');
  safeValue('lPass', '');
  safeText('lErr', '');
  updateDashNav();
  go('loginPage', $('dashNavBtn'));
}

function doLogin() { doLoginSupabase(); }
function doLogout() { doLogoutSupabase(); }

async function resetPassword(email) {
  const sb = getSB();
  if (!sb || !email) return { message: 'Enter your email address first.' };
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/?reset=true' });
  return error;
}

function showForgotPassword() {
  const email = $('lEmail')?.value.trim();
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
  if (!data?.session) return;
  loggedIn = true;
  const role = setDashboardIdentity(data.session.user);
  buildDash(role);
  updateDashNav();
}

function buildDash(role) {
  const sidebar = $('dashSidebar');
  const main = $('dashMain');
  if (!sidebar || !main) return;

  if (role === 'staff') {
    sidebar.innerHTML = `
      <div class="sb-sec">My Tools</div>
      <button class="ni active" onclick="sp('s-checkin',this)"><i class="ti ti-qrcode"></i><span>Check-In</span></button>
      <button class="ni" onclick="sp('s-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>
      <button class="ni" onclick="sp('s-schedule',this)"><i class="ti ti-calendar"></i><span>Schedule</span></button>`;
    main.innerHTML = `
      <div id="s-checkin" class="dpanel active"><div class="ptitle">Check-In</div><div class="dcrd2"><h3>Check-In</h3><p>Eventbrite attendee sync is not connected yet.</p></div></div>
      <div id="s-waivers" class="dpanel"><div class="ptitle">Waivers</div><div class="dcrd2"><h3>Waivers</h3><p>Gravity Forms waiver sync is not connected yet.</p></div></div>
      <div id="s-schedule" class="dpanel"><div class="ptitle">Schedule</div><div class="dcrd2"><h3>Event Schedule</h3><p>Thursday through Sunday event schedule.</p></div></div>`;
    return;
  }

  if (role === 'sponsor') {
    sidebar.innerHTML = `
      <div class="sb-sec">My Sponsorship</div>
      <button class="ni active" onclick="sp('p-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('p-benefits',this)"><i class="ti ti-star"></i><span>Benefits</span></button>`;
    main.innerHTML = `
      <div id="p-overview" class="dpanel active"><div class="ptitle">Sponsor Portal</div><div class="dcrd2"><h3>Sponsor Dashboard</h3><p>Sponsor data will appear here after Supabase sync is connected.</p></div></div>
      <div id="p-benefits" class="dpanel"><div class="ptitle">Benefits</div><div class="dcrd2"><h3>Benefits</h3><p>Sponsor benefits placeholder.</p></div></div>`;
    return;
  }

  sidebar.innerHTML = `
    <div class="sb-sec">Main</div>
    <button class="ni active" onclick="sp('o-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
    <button class="ni" onclick="sp('o-regs',this)"><i class="ti ti-users"></i><span>Registrations</span></button>
    <button class="ni" onclick="sp('o-vendors',this)"><i class="ti ti-store"></i><span>Vendors</span></button>
    <button class="ni" onclick="sp('o-sponsors',this)"><i class="ti ti-building"></i><span>Sponsors</span></button>
    <button class="ni" onclick="sp('o-waivers',this)"><i class="ti ti-file-check"></i><span>Waivers</span></button>
    <button class="ni" onclick="sp('o-eventbrite',this)"><i class="ti ti-ticket"></i><span>Eventbrite Links</span></button>
    <button class="ni" onclick="sp('o-settings',this)"><i class="ti ti-settings"></i><span>Settings</span></button>`;

  main.innerHTML = `
    <div id="o-overview" class="dpanel active">
      <div class="ptitle">Overview</div>
      <div id="dash-empty-state" class="dcrd2"><h3>Dashboard Status</h3><p>Use Eventbrite Links to paste each event's Eventbrite ID and URL. Registration pages will auto-use those values.</p></div>
      <div id="dash-live-data" style="display:none;"><div class="sg" id="dash-stats-grid"></div><div class="int-row" id="dash-int-row"></div></div>
      <div class="dcrd2"><h3>Quick Actions</h3><div class="act-row"><button class="act-btn primary" onclick="sp('o-eventbrite',document.querySelectorAll('#dashSidebar .ni')[5])">Manage Eventbrite Links</button><button class="act-btn" onclick="openEventbriteDashboard()">Open Eventbrite</button></div></div>
    </div>
    <div id="o-regs" class="dpanel"><div class="ptitle">Registrations</div><div class="dcrd2"><h3>Eventbrite Registrations</h3><p>Customers will register through Eventbrite. API sync comes later; direct links work now.</p></div></div>
    <div id="o-vendors" class="dpanel"><div class="ptitle">Vendors</div><div class="dcrd2"><h3>Vendor Applications</h3><p>Gravity Forms vendor entries will show here after Supabase sync is connected.</p></div></div>
    <div id="o-sponsors" class="dpanel"><div class="ptitle">Sponsors</div><div class="dcrd2"><h3>Sponsor Leads</h3><p>Gravity Forms sponsor entries will show here after Supabase sync is connected.</p></div></div>
    <div id="o-waivers" class="dpanel"><div class="ptitle">Waivers</div><div class="dcrd2"><h3>Waiver Submissions</h3><p>Gravity Forms signature waivers will show here after Supabase sync is connected.</p></div></div>
    <div id="o-eventbrite" class="dpanel"><div class="ptitle">Eventbrite Registration Links</div>${eventbriteSettingsHTML()}</div>
    <div id="o-settings" class="dpanel"><div class="ptitle">Settings</div>${apiSettingsHTML()}</div>`;
  setTimeout(() => { loadApiKeys(); loadEventbriteSettings(); syncDashboard(); }, 100);
}

function apiSettingsHTML() {
  return `
    <div class="api-dash-card">
      <h3><i class="ti ti-key"></i>Integration Settings</h3>
      <p style="font-size:12px;color:rgba(255,255,255,.45);line-height:1.6">Testing only. Production private tokens should move to Supabase Edge Functions.</p>
      <div class="api-row">
        <div class="api-field"><label>Eventbrite Private Token</label><div class="api-input-wrap"><input type="password" id="dk-eventbrite" placeholder="Paste Eventbrite token"><button class="api-eye" onclick="togglePw('dk-eventbrite',this)" type="button"><i class="ti ti-eye"></i></button></div></div>
        <div class="api-field"><label>Mailchimp API Key</label><div class="api-input-wrap"><input type="password" id="dk-mailchimp" placeholder="Paste Mailchimp key"><button class="api-eye" onclick="togglePw('dk-mailchimp',this)" type="button"><i class="ti ti-eye"></i></button></div></div>
        <div class="api-field"><label>Supabase URL</label><div class="api-input-wrap"><input type="text" id="dk-supabase" placeholder="Supabase URL"></div></div>
        <div class="api-field"><label>Eventbrite Org ID</label><div class="api-input-wrap"><input type="text" id="dk-orgid" placeholder="Org ID"></div></div>
      </div>
      <button class="api-save" onclick="saveApiKeys()">Save Settings</button>
      <div class="api-saved" id="dkSaved">Saved successfully</div>
    </div>`;
}

function eventbriteSettingsHTML() {
  const rows = EVENTBRITE_EVENTS.map(e => `
    <div class="api-field" style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;margin-bottom:10px;">
      <label style="display:block;margin-bottom:8px;"><i class="ti ti-ticket"></i> ${e.day} — ${e.name}</label>
      <div class="api-row" style="grid-template-columns:minmax(160px,0.7fr) minmax(220px,1.3fr);gap:10px;">
        <div class="api-input-wrap"><input type="text" id="eb-id-${e.key}" placeholder="Eventbrite Event ID"></div>
        <div class="api-input-wrap"><input type="text" id="eb-url-${e.key}" placeholder="Full Eventbrite URL"></div>
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:6px;">Storage keys: cbp_eb_id_${e.key} and cbp_eb_url_${e.key}</div>
    </div>`).join('');

  return `
    <div class="api-dash-card">
      <h3><i class="ti ti-ticket"></i>Eventbrite IDs & Links</h3>
      <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px;">Paste each event's Eventbrite ID and/or full URL here. The public registration cards and registration panel will use the correct event-specific link automatically.</p>
      ${rows}
      <button class="api-save" onclick="saveEventbriteSettings()"><i class="ti ti-device-floppy"></i> Save Eventbrite Links</button>
      <button class="act-btn" onclick="clearEventbriteSettings()" style="margin-left:8px;">Clear Links</button>
      <div class="api-saved" id="ebSaved">Eventbrite links saved</div>
    </div>`;
}

function sp(panelId, btn) {
  const panel = $(panelId);
  if (!panel) { console.warn('Missing dashboard panel:', panelId); return; }
  document.querySelectorAll('#dashMain .dpanel').forEach(p => p.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll('#dashSidebar .ni').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function loadApiKeys() {
  ['eventbrite', 'mailchimp', 'supabase', 'orgid', 'eburl'].forEach(k => {
    const saved = localStorage.getItem('cbp_key_' + k) || (k === 'supabase' ? localStorage.getItem('cbp_supabase_url') : '');
    const el = $('dk-' + k);
    if (saved && el) el.value = saved;
  });
}

function saveApiKeys() {
  ['eventbrite', 'mailchimp', 'supabase', 'orgid', 'eburl'].forEach(k => {
    const el = $('dk-' + k);
    if (el && el.value.trim()) {
      localStorage.setItem('cbp_key_' + k, el.value.trim());
      if (k === 'supabase') localStorage.setItem('cbp_supabase_url', el.value.trim());
    }
  });
  const saved = $('dkSaved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2500); }
  syncDashboard();
}

function loadEventbriteSettings() {
  EVENTBRITE_EVENTS.forEach(e => {
    const idEl = $('eb-id-' + e.key);
    const urlEl = $('eb-url-' + e.key);
    const id = localStorage.getItem('cbp_eb_id_' + e.key) || '';
    const url = localStorage.getItem('cbp_eb_url_' + e.key) || '';
    if (idEl) idEl.value = id;
    if (urlEl) urlEl.value = url;
  });
}

function saveEventbriteSettings() {
  EVENTBRITE_EVENTS.forEach(e => {
    const id = $('eb-id-' + e.key)?.value.trim() || '';
    const url = $('eb-url-' + e.key)?.value.trim() || '';
    if (id) localStorage.setItem('cbp_eb_id_' + e.key, id);
    else localStorage.removeItem('cbp_eb_id_' + e.key);
    if (url) localStorage.setItem('cbp_eb_url_' + e.key, url);
    else localStorage.removeItem('cbp_eb_url_' + e.key);
  });
  updateRegistrationLinks();
  const saved = $('ebSaved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2500); }
  syncDashboard();
}

function clearEventbriteSettings() {
  if (!confirm('Clear all saved Eventbrite IDs and URLs?')) return;
  EVENTBRITE_EVENTS.forEach(e => {
    localStorage.removeItem('cbp_eb_id_' + e.key);
    localStorage.removeItem('cbp_eb_url_' + e.key);
  });
  loadEventbriteSettings();
  updateRegistrationLinks();
  syncDashboard();
}

function getEventbriteUrl(cardKey) {
  const specificUrl = localStorage.getItem('cbp_eb_url_' + cardKey);
  const specificId = localStorage.getItem('cbp_eb_id_' + cardKey);
  const globalUrl = localStorage.getItem('cbp_key_eburl');
  if (specificUrl && specificUrl.startsWith('http')) return specificUrl;
  if (specificId) return 'https://www.eventbrite.com/e/' + encodeURIComponent(specificId);
  if (globalUrl && globalUrl.startsWith('http')) return globalUrl;
  return '';
}

function updateRegistrationLinks() {
  EVENTBRITE_EVENTS.forEach(e => {
    const url = getEventbriteUrl(e.key);
    const btn = $('btn-' + e.key);
    if (btn && url) {
      btn.dataset.eventbriteUrl = url;
      btn.title = 'Opens ' + e.name + ' registration';
    }
  });
}

function syncDashboard() {
  const statsGrid = $('dash-stats-grid');
  const intRow = $('dash-int-row');
  const emptyState = $('dash-empty-state');
  const liveData = $('dash-live-data');
  const linkedCount = EVENTBRITE_EVENTS.filter(e => getEventbriteUrl(e.key)).length;
  if (emptyState) emptyState.style.display = 'none';
  if (liveData) liveData.style.display = 'block';
  if (statsGrid) statsGrid.innerHTML = `
    <div class="sc"><div class="sl">Eventbrite Links</div><div class="sv" style="color:var(--green)">${linkedCount}/${EVENTBRITE_EVENTS.length}</div><div class="ss">Saved event links</div></div>
    <div class="sc"><div class="sl">Eventbrite API</div><div class="sv" style="color:var(--gold)">Pending</div><div class="ss">Direct registration works now</div></div>
    <div class="sc"><div class="sl">Forms</div><div class="sv" style="color:var(--sky)">Gravity</div><div class="ss">Embed next</div></div>`;
  if (intRow) intRow.innerHTML = `
    <div class="itile"><div style="font-size:20px">🎟️</div><div class="iname">Registration Pages</div><div class="ist">${linkedCount} Eventbrite links configured</div><div class="icnt">${linkedCount}/${EVENTBRITE_EVENTS.length}</div></div>
    <div class="itile"><div style="font-size:20px">📝</div><div class="iname">Gravity Forms</div><div class="ist">Use iframe embed</div><div class="icnt">Ready</div></div>`;
}

function openEventbriteDashboard() {
  window.open('https://www.eventbrite.com/organizations/events', '_blank', 'noopener');
}

function openReg(cardKey) {
  const title = EVENT_NAMES[cardKey] || 'Registration';
  const url = getEventbriteUrl(cardKey);
  safeText('ebEventTitle', title);
  const section = $('ebEmbedSection');
  const iframe = $('ebIframe');
  const placeholder = $('ebPlaceholder');
  const directLink = $('ebDirectLink');
  if (section) section.style.display = 'block';
  if (url) {
    if (iframe) { iframe.src = url; iframe.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (directLink) {
      directLink.href = url;
      directLink.textContent = 'Open Secure Eventbrite Checkout →';
    }
  } else {
    if (iframe) iframe.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    if (directLink) {
      directLink.href = 'https://www.eventbrite.com';
      directLink.textContent = 'Register on Eventbrite';
    }
  }
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openEventPage(cardKey) {
  openReg(cardKey);
}

function closeEventPage() {
  closeReg();
}

function closeReg() {
  const section = $('ebEmbedSection');
  const iframe = $('ebIframe');
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

async function fetchAllEventbritePrices() { console.info('Eventbrite API sync not connected yet.'); }

function pickTier(card, name) {
  document.querySelectorAll('.tier').forEach(c => c.classList.remove('sel'));
  if (card) card.classList.add('sel');
  const modal = $('sponModal');
  if (modal) modal.classList.add('open');
  const sel = $('sponLevel');
  if (sel && name) {
    for (const o of sel.options) {
      if (o.text.toLowerCase().startsWith(String(name).toLowerCase())) { sel.value = o.value; break; }
    }
  }
}

function submitSpon() {
  const modal = $('sponModal');
  if (modal) modal.classList.remove('open');
  alert('Thank you! Our team will reach out with the sponsorship packet.');
}

function showVendorTab(tab, btn) {
  document.querySelectorAll('.vendor-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.vendor-tab').forEach(t => t.classList.remove('active'));
  const panel = $('vendor-' + tab);
  if (panel) panel.style.display = 'block';
  if (btn) btn.classList.add('active');
}

function submitVendorApp() {
  const biz = $('v-bizname')?.value.trim();
  const email = $('v-email')?.value.trim();
  const cat = $('v-cat')?.value;
  if (!biz || !email || !cat) { alert('Please fill in all required fields.'); return; }
  const success = $('vendor-success');
  if (success) success.style.display = 'block';
  ['v-bizname', 'v-name', 'v-email', 'v-phone', 'v-desc'].forEach(id => safeValue(id, ''));
}

async function vendorLogin() {
  const sb = getSB();
  const email = $('vl-email')?.value.trim().toLowerCase();
  const password = $('vl-pass')?.value;
  const errEl = $('vl-err');
  if (!sb) { if (errEl) errEl.textContent = 'Auth not loaded.'; return; }
  if (!email || !password) { if (errEl) errEl.textContent = 'Enter your email and password.'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { if (errEl) errEl.textContent = 'Incorrect email or password.'; return; }
  const meta = data.user?.user_metadata || {};
  if (meta.role !== 'vendor') { if (errEl) errEl.textContent = 'This account is not a vendor account.'; await sb.auth.signOut(); return; }
  safeText('vd-name', meta.full_name || meta.name || email.split('@')[0]);
  safeText('vd-booth', meta.booth || 'TBA');
  safeText('vd-cat', meta.category || 'Vendor');
  const form = $('vl-form');
  const dash = $('vendor-dashboard');
  if (form) form.style.display = 'none';
  if (dash) dash.style.display = 'block';
}

async function vendorLogout() {
  const sb = getSB();
  if (sb) await sb.auth.signOut();
  safeValue('vl-email', '');
  safeValue('vl-pass', '');
  const form = $('vl-form');
  const dash = $('vendor-dashboard');
  if (dash) dash.style.display = 'none';
  if (form) form.style.display = 'block';
}

const CHAT_RESPONSES = {
  ticket: ['Click Register or Get Tickets. Each event can use its own Eventbrite link.', 'Tickets will be handled through separate Eventbrite pages for each event.'],
  vendor: ['Use the Vendors page to apply. We can embed your Gravity Form there.', 'Vendor applications should be handled through Gravity Forms with email notifications.'],
  sponsor: ['Visit Sponsors to pick a package or request details.', 'Sponsor interest can be collected with Gravity Forms and synced to Mailchimp.'],
  schedule: ['The event runs July 3–6, 2026 in Lovejoy, GA.', 'Check the Events page for the full lineup.'],
  default: ['I can help with tickets, vendors, sponsors, schedule, waivers, and event questions.', 'Please check the event pages or contact the organizer for details.']
};

function getResponseKey(msg) {
  const m = String(msg).toLowerCase();
  if (/ticket|register|buy|purchase|pass|admission/.test(m)) return 'ticket';
  if (/vendor|booth|sell|apply|food truck/.test(m)) return 'vendor';
  if (/sponsor|partner|cra|donate|marketing/.test(m)) return 'sponsor';
  if (/schedule|lineup|day|when|time|hours/.test(m)) return 'schedule';
  return 'default';
}

function toggleChat() {
  const win = $('chatWindow');
  const icon = $('chatIcon');
  const badge = $('chatBadge');
  if (!win) return;
  const open = win.style.display === 'none' || !win.style.display;
  win.style.display = open ? 'block' : 'none';
  if (icon) icon.className = open ? 'ti ti-x' : 'ti ti-message-circle';
  if (badge) badge.style.display = 'none';
}

function addChatMsg(text, type) {
  const msgs = $('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  div.innerHTML = '<div class="chat-bubble">' + String(text).replace(/\n/g, '<br>') + '</div><div class="chat-time">' + now + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = $('chatMessages');
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
  const input = $('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  addChatMsg(msg, 'user');
  document.querySelectorAll('.chat-quick').forEach(b => b.parentElement?.remove());
  const typing = showTyping();
  setTimeout(() => {
    if (typing) typing.remove();
    const responses = CHAT_RESPONSES[getResponseKey(msg)] || CHAT_RESPONSES.default;
    addChatMsg(responses[Math.floor(Math.random() * responses.length)], 'bot');
  }, 500);
}

function sendQuick(msg) {
  const input = $('chatInput');
  if (input) input.value = msg;
  sendChatMessage();
}

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

function initApp() {
  if (!$('cbp-spin-style')) {
    const s = document.createElement('style');
    s.id = 'cbp-spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
  const b = $('jsCheck');
  if (b) { b.style.display = 'block'; setTimeout(() => { b.style.display = 'none'; }, 2500); }
  $('lEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('lPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  loadApiKeys();
  updateRegistrationLinks();
  restoreSession();
}

document.addEventListener('DOMContentLoaded', initApp);
