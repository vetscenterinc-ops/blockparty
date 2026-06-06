/* ============================================================
   The Collective Block Party — Clean Button Handler Script
   Purpose: navigation, dashboard settings, Eventbrite links,
   Gravity Forms placeholders, vendor tools, chat, and event pages.
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

const DEFAULT_EVENTBRITE_URLS = {
  'thu-mixer': 'https://www.eventbrite.com/e/small-business-kickoff-mixer-the-collective-block-party-weekend-tickets-1991029263123?aff=oddtdtcreator',
  'fri-taste': 'https://www.eventbrite.com/e/taste-of-lovejoy-the-collective-block-party-weekend-tickets-1991129970341?aff=oddtdtcreator',
  'sat-main': 'https://www.eventbrite.com/e/cars-bikes-bikes-the-collective-block-party-weekend-tickets-1991032727485?aff=oddtdtcreator',
  'sun-skate': 'https://www.eventbrite.com/e/lets-skate-day-party-finale-the-collective-block-party-weekend-tickets-1991245469803?aff=oddtdtcreator'
};

const EVENTBRITE_EVENT_IDS = {
  'thu-mixer': '1991029263123',
  'fri-taste': '1991129970341',
  'sat-main': '1991032727485',
  'sun-skate': '1991245469803'
};

const EVENTBRITE_EVENTS = [
  { key: 'thu-mixer', day: 'THU July 3', name: 'Small Business Kickoff Mixer' },
  { key: 'thu-workshop', day: 'THU July 3', name: 'Financial Literacy Workshop' },
  { key: 'fri-taste', day: 'FRI July 4', name: 'Taste of Lovejoy' },
  { key: 'fri-kids', day: 'FRI July 4', name: 'Kids Carnival & Games' },
  { key: 'sat-main', day: 'SAT July 5', name: 'Cars, Bikes, & Bikes' },
  { key: 'sat-slides', day: 'SAT July 5', name: 'Water Slides & Bubbles' },
  { key: 'sat-gamers', day: 'SAT July 5', name: 'Gamers Lounge + Laser Tag' },
  { key: 'sun-skate', day: 'SUN July 6', name: "Let's Skate Day Party Finale" },
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
      <div id="dash-empty-state" class="dcrd2"><h3>Dashboard Status</h3><p>Small Business Mixer now uses the official embedded Eventbrite checkout widget on its event page.</p></div>
      <div id="dash-live-data" style="display:none;"><div class="sg" id="dash-stats-grid"></div><div class="int-row" id="dash-int-row"></div></div>
      <div class="dcrd2"><h3>Quick Actions</h3><div class="act-row"><button class="act-btn primary" onclick="sp('o-eventbrite',document.querySelectorAll('#dashSidebar .ni')[5])">Manage Eventbrite Links</button><button class="act-btn" onclick="openEventbriteDashboard()">Open Eventbrite</button></div></div>
    </div>
    <div id="o-regs" class="dpanel"><div class="ptitle">Registrations</div><div class="dcrd2"><h3>Eventbrite Registrations</h3><p>Customers register through Eventbrite. API sync comes later.</p></div></div>
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
  const rows = EVENTBRITE_EVENTS.map(e => {
    const defaultUrl = DEFAULT_EVENTBRITE_URLS[e.key] || '';
    return `
    <div class="api-field" style="background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;margin-bottom:10px;">
      <label style="display:block;margin-bottom:8px;"><i class="ti ti-ticket"></i> ${e.day} — ${e.name}</label>
      <div class="api-row" style="grid-template-columns:minmax(160px,0.7fr) minmax(220px,1.3fr);gap:10px;">
        <div class="api-input-wrap"><input type="text" id="eb-id-${e.key}" placeholder="Eventbrite Event ID"></div>
        <div class="api-input-wrap"><input type="text" id="eb-url-${e.key}" placeholder="Full Eventbrite URL${defaultUrl ? ' already embedded' : ''}"></div>
      </div>
      ${defaultUrl ? `<div style="font-size:10px;color:rgba(0,255,106,.75);margin-top:6px;">Default link embedded. Paste a new URL above only if you want to override it.</div>` : `<div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:6px;">No default URL yet. Paste the Eventbrite link when ready.</div>`}
    </div>`;
  }).join('');

  return `
    <div class="api-dash-card">
      <h3><i class="ti ti-ticket"></i>Eventbrite IDs & Links</h3>
      <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px;">Small Business Mixer uses the official Eventbrite checkout widget. Other events can be upgraded the same way as you provide embed code.</p>
      ${rows}
      <button class="api-save" onclick="saveEventbriteSettings()"><i class="ti ti-device-floppy"></i> Save Eventbrite Links</button>
      <button class="act-btn" onclick="clearEventbriteSettings()" style="margin-left:8px;">Clear Custom Overrides</button>
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
  if (!confirm('Clear custom Eventbrite IDs and URLs? Built-in default links will remain.')) return;
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
  const defaultUrl = DEFAULT_EVENTBRITE_URLS[cardKey];
  const globalUrl = localStorage.getItem('cbp_key_eburl');
  if (specificUrl && specificUrl.startsWith('http')) return specificUrl;
  if (specificId) return 'https://www.eventbrite.com/e/' + encodeURIComponent(specificId);
  if (defaultUrl) return defaultUrl;
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
    <div class="sc"><div class="sl">Eventbrite Links</div><div class="sv" style="color:var(--green)">${linkedCount}/${EVENTBRITE_EVENTS.length}</div><div class="ss">Default + saved links</div></div>
    <div class="sc"><div class="sl">Kickoff Widget</div><div class="sv" style="color:var(--gold)">Embedded</div><div class="ss">Official checkout widget</div></div>
    <div class="sc"><div class="sl">Forms</div><div class="sv" style="color:var(--sky)">Gravity</div><div class="ss">Embed next</div></div>`;
  if (intRow) intRow.innerHTML = `
    <div class="itile"><div style="font-size:20px">🎟️</div><div class="iname">Registration Pages</div><div class="ist">${linkedCount} Eventbrite links configured</div><div class="icnt">${linkedCount}/${EVENTBRITE_EVENTS.length}</div></div>
    <div class="itile"><div style="font-size:20px">💼</div><div class="iname">Small Business Mixer</div><div class="ist">Official Eventbrite widget installed</div><div class="icnt">Live</div></div>`;
}

function openEventbriteDashboard() {
  window.open('https://www.eventbrite.com/organizations/events', '_blank', 'noopener');
}

function loadEventbriteWidgetScript(callback) {
  if (window.EBWidgets) { callback(); return; }
  const existing = document.querySelector('script[data-eb-widgets="true"]');
  if (existing) {
    existing.addEventListener('load', callback, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://www.eventbrite.com/static/widgets/eb_widgets.js';
  script.async = true;
  script.dataset.ebWidgets = 'true';
  script.onload = callback;
  script.onerror = () => console.warn('Eventbrite widget script could not be loaded.');
  document.head.appendChild(script);
}

function createEventbriteCheckout(eventId, containerId, height = 425) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '<div style="padding:22px;text-align:center;color:rgba(255,255,255,.55);font-size:13px;">Loading secure Eventbrite checkout…</div>';
  loadEventbriteWidgetScript(() => {
    if (!window.EBWidgets) return;
    container.innerHTML = '';
    window.EBWidgets.createWidget({
      widgetType: 'checkout',
      eventId,
      iframeContainerId: containerId,
      iframeContainerHeight: height,
      onOrderComplete: function () {
        console.log('Order complete!');
        const done = $('eb-order-complete-' + eventId);
        if (done) done.style.display = 'block';
      }
    });
  });
}

function smallBusinessMixerPageHTML() {
  const url = getEventbriteUrl('thu-mixer');
  return `
    <div style="min-height:100vh;background:radial-gradient(circle at top left,rgba(0,207,255,.18),transparent 35%),radial-gradient(circle at bottom right,rgba(255,10,160,.14),transparent 42%),#080810;padding:88px 20px 56px;">
      <div style="max-width:1120px;margin:0 auto;">
        <button onclick="closeEventPage()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:9px 16px;border-radius:999px;cursor:pointer;margin-bottom:22px;display:inline-flex;align-items:center;gap:7px;"><i class="ti ti-arrow-left"></i> Back to Registration</button>

        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,440px);gap:22px;align-items:start;">
          <div style="background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);border-radius:26px;padding:clamp(22px,4vw,40px);box-shadow:0 24px 80px rgba(0,0,0,.42);backdrop-filter:blur(18px);position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,207,255,.13),transparent 36%,rgba(255,10,160,.1));pointer-events:none;"></div>
            <div style="position:relative;z-index:1;">
              <div style="display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:var(--sky);background:rgba(0,207,255,.12);border:1px solid rgba(0,207,255,.28);padding:7px 12px;border-radius:999px;margin-bottom:16px;"><i class="ti ti-briefcase"></i> Thursday • July 3 • 5PM–11PM</div>
              <h1 style="font-family:'Permanent Marker',cursive,fantasy;font-size:clamp(42px,7vw,86px);line-height:.95;margin-bottom:12px;background:linear-gradient(135deg,var(--sky),var(--gold),var(--pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Small Business<br>Kickoff Mixer</h1>
              <div style="font-family:'Teko',sans-serif;font-size:clamp(22px,3.5vw,36px);font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:18px;">Network. Grow. Vibe.</div>
              <p style="font-size:16px;color:rgba(255,255,255,.68);line-height:1.8;max-width:720px;margin-bottom:22px;">Kick off The Collective Block Party Weekend with entrepreneurs, vendors, community builders, sponsors, and resource partners. This is the business networking night that sets the tone for the whole weekend.</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:20px;">
                ${['Local brand showcases','Resource tables','Live DJ + food vendors','VIP networking lounge','Pitch corner for entrepreneurs'].map(item => `<div style="background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 14px;color:rgba(255,255,255,.72);font-size:13px;"><i class="ti ti-check" style="color:var(--green);margin-right:6px;"></i>${item}</div>`).join('')}
              </div>
            </div>
          </div>

          <div class="eventbrite-glass-card" style="background:rgba(14,14,28,.78);border:1px solid rgba(0,207,255,.22);border-radius:26px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 34px rgba(0,207,255,.08);backdrop-filter:blur(18px);position:sticky;top:78px;overflow:hidden;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle at top,rgba(0,207,255,.16),transparent 42%),radial-gradient(circle at bottom right,rgba(255,10,160,.11),transparent 45%);pointer-events:none;"></div>
            <div style="position:relative;z-index:1;">
              <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--green);font-weight:900;margin-bottom:6px;display:flex;align-items:center;gap:6px;"><i class="ti ti-lock"></i> Secure Eventbrite Registration</div>
              <h3 style="font-family:'Teko',sans-serif;font-size:30px;line-height:1;text-transform:uppercase;margin-bottom:6px;">Register for the Mixer</h3>
              <p style="font-size:13px;color:rgba(255,255,255,.58);line-height:1.55;margin-bottom:14px;">Complete your official Eventbrite checkout below. You will receive confirmation directly from Eventbrite.</p>
              <div style="border-radius:18px;overflow:hidden;background:#fff;border:1px solid rgba(255,255,255,.14);min-height:425px;">
                <div id="eventbrite-widget-container-1991029263123"></div>
              </div>
              <div id="eb-order-complete-1991029263123" style="display:none;margin-top:12px;padding:11px 13px;border-radius:12px;background:rgba(0,255,106,.12);border:1px solid rgba(0,255,106,.25);color:var(--green);font-size:13px;font-weight:800;">Order complete — check your email for confirmation.</div>
              <a href="${url}" target="_blank" rel="noopener" class="btn-hot" style="width:100%;justify-content:center;margin-top:14px;text-decoration:none;"><i class="ti ti-external-link"></i> Open Secure Eventbrite Checkout</a>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function openSmallBusinessMixerPage() {
  const page = $('eventDetailPage');
  if (!page) { openReg('thu-mixer'); return; }
  page.innerHTML = smallBusinessMixerPageHTML();
  const regBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.querySelector('i.ti-ticket') || b.textContent.trim().toLowerCase().includes('register'));
  go('eventDetailPage', regBtn || null);
  window.setTimeout(() => createEventbriteCheckout('1991029263123', 'eventbrite-widget-container-1991029263123', 425), 150);
}

function eventbriteFallbackHTML(title, url) {
  return `
    <div style="padding:38px 24px;text-align:center;background:radial-gradient(circle at top,rgba(255,10,160,.16),transparent 42%),rgba(8,8,16,.94);">
      <div style="font-size:44px;margin-bottom:12px;">🎟️</div>
      <div style="font-family:'Permanent Marker',cursive,fantasy;font-size:clamp(24px,4vw,38px);line-height:1.05;background:linear-gradient(135deg,var(--pink),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">${title}</div>
      <p style="font-size:14px;color:rgba(255,255,255,.62);max-width:520px;margin:0 auto 20px;line-height:1.7;">Secure registration is powered by Eventbrite. If the checkout box does not load inside this page, use the button below to open the official Eventbrite registration page.</p>
      <a href="${url}" target="_blank" rel="noopener" class="btn-hot" style="display:inline-flex;text-decoration:none;align-items:center;gap:8px;"><i class="ti ti-external-link"></i> Open Secure Eventbrite Checkout</a>
    </div>`;
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
    if (placeholder) {
      placeholder.style.display = 'block';
      placeholder.innerHTML = eventbriteFallbackHTML(title, url);
    }
    if (iframe) {
      iframe.src = url;
      iframe.style.display = 'block';
      iframe.style.minHeight = '720px';
      iframe.style.background = '#fff';
    }
    if (directLink) {
      directLink.href = url;
      directLink.textContent = 'Open Secure Eventbrite Checkout →';
    }
  } else {
    if (iframe) iframe.style.display = 'none';
    if (placeholder) {
      placeholder.style.display = 'block';
      placeholder.innerHTML = '<div style="padding:48px 32px;text-align:center;"><div style="font-size:48px;margin-bottom:16px;">🎟️</div><div style="font-family:Teko,sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Eventbrite Link Needed</div><div style="font-size:14px;color:rgba(255,255,255,.55);max-width:440px;margin:0 auto 20px;line-height:1.6;">Log in as Organizer, open Eventbrite Links, and paste the Eventbrite URL for this event.</div></div>';
    }
    if (directLink) {
      directLink.href = 'https://www.eventbrite.com';
      directLink.textContent = 'Register on Eventbrite';
    }
  }
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openEventPage(cardKey) {
  if (cardKey === 'thu-mixer') {
    openSmallBusinessMixerPage();
    return;
  }
  if (typeof window.openOriginalEventPage === 'function') {
    window.openOriginalEventPage(cardKey);
    return;
  }
  openReg(cardKey);
}

function closeEventPage() {
  const regBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.querySelector('i.ti-ticket') || b.textContent.trim().toLowerCase().includes('register'));
  go('registration', regBtn || document.querySelectorAll('.nav-btn')[3]);
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
  ticket: ['Click Register or Get Tickets. The Small Business Mixer now uses an embedded Eventbrite checkout widget.', 'Tickets are handled through Eventbrite. Open each event page to register.'],
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
