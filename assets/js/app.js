const SUPABASE_URL = 'https://mvftxnzvmmlzyrrqhitx.supabase.co';
const SUPABASE_ANON = '';
let _sb = null;
let currentRole = 'organizer';
let loggedIn = false;
let currentVendorEmail = '';

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

const DEMO_VENDOR = {
  business_name: 'Demo Vendor Booth',
  contact_name: 'Demo Contact',
  email: 'vendor@example.com',
  category: 'Food & Beverage',
  description: 'Demo vendor selling food, drinks, and event-friendly products.',
  application_status: 'approved',
  payment_status: 'deposit_due',
  payment_amount: 300,
  amount_paid: 0,
  balance_due: 300,
  payment_due_date: '2026-06-15',
  payment_link: '#',
  booth_number: 'B-12',
  booth_size: '10x10',
  placement_zone: 'Food Court Row B',
  setup_time: '8:00 AM',
  load_in_time: '7:30 AM - 9:00 AM',
  load_in_location: 'Vendor Gate 2',
  parking_location: 'Vendor Parking Lot A',
  active_days_label: 'SAT + SUN',
  document_status: 'needed',
  needs_power: true,
  is_food_vendor: true,
  vendor_public_notes: 'Bring extension cord, tent weights, printed permit copy, and arrive during assigned load-in window.',
  checklist_payment_complete: false,
  checklist_permit_uploaded: false,
  checklist_insurance_uploaded: false,
  checklist_menu_confirmed: false,
  checklist_setup_confirmed: false,
  checklist_shared_flyer: false,
  checklist_rules_acknowledged: false
};

function $(id) { return document.getElementById(id); }
function money(n) { return '$' + Number(n || 0).toLocaleString(); }
function titleCase(s) { return String(s || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function getSB() {
  if (!_sb && window.supabase && SUPABASE_ANON) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

function go(id, btn) {
  const page = $(id);
  if (!page) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function regBtn() {
  return Array.from(document.querySelectorAll('.nav-btn')).find(b => b.querySelector('i.ti-ticket') || b.textContent.trim().toLowerCase().includes('register'));
}

function goDash(btn) {
  go(loggedIn ? 'dashPage' : 'loginPage', btn || $('dashNavBtn'));
}

function setRole(role, btn) {
  currentRole = role;
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const hint = $('demoHint');
  if (hint) hint.innerHTML = '<b>Email:</b> ' + role + ' account email';
  const err = $('lErr');
  if (err) err.textContent = '';
}

function togglePw(id, btn) {
  const input = $(id);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  const icon = btn && btn.querySelector('i');
  if (icon) icon.className = showing ? 'ti ti-eye' : 'ti ti-eye-off';
}

function doLogin() {
  loggedIn = true;
  buildDash(currentRole || 'organizer');
  go('dashPage', $('dashNavBtn'));
}

function doLogout() {
  loggedIn = false;
  go('loginPage', $('dashNavBtn'));
}

function showForgotPassword() {
  alert('Enter your email address first, then use Supabase Auth password reset when connected.');
}

function roleBadge(role) {
  const labels = { organizer: 'Organizer', staff: 'Staff', sponsor: 'Sponsor', vendor: 'Vendor' };
  return labels[role] || 'Organizer';
}

function buildDash(role) {
  const sidebar = $('dashSidebar');
  const main = $('dashMain');
  if (!sidebar || !main) return;

  if (role === 'vendor') {
    sidebar.innerHTML = `<div class="sb-sec">Vendor</div>
      <button class="ni active" onclick="sp('v-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('v-payment',this)"><i class="ti ti-credit-card"></i><span>Payment</span></button>
      <button class="ni" onclick="sp('v-placement',this)"><i class="ti ti-map-pin"></i><span>Placement</span></button>
      <button class="ni" onclick="sp('v-checklist',this)"><i class="ti ti-list-check"></i><span>Checklist</span></button>`;
    main.innerHTML = vendorDashboardHTML(DEMO_VENDOR, true);
    updateVendorChecklistProgress();
    return;
  }

  if (role === 'staff') {
    sidebar.innerHTML = `<div class="sb-sec">Staff</div>
      <button class="ni active" onclick="sp('s-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('s-checkin',this)"><i class="ti ti-qrcode"></i><span>Check-In</span></button>`;
    main.innerHTML = `<div id="s-overview" class="dpanel active"><div class="ptitle">Staff Dashboard</div><div class="dcrd2"><h3>Event Operations</h3><p>Staff check-in and waiver tools will connect to Eventbrite/Supabase next.</p></div></div><div id="s-checkin" class="dpanel"><div class="ptitle">Check-In</div><div class="dcrd2"><h3>Check-In Pending</h3><p>Eventbrite attendee sync is not connected yet.</p></div></div>`;
    return;
  }

  if (role === 'sponsor') {
    sidebar.innerHTML = `<div class="sb-sec">Sponsor</div>
      <button class="ni active" onclick="sp('p-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
      <button class="ni" onclick="sp('p-deliverables',this)"><i class="ti ti-star"></i><span>Deliverables</span></button>`;
    main.innerHTML = `<div id="p-overview" class="dpanel active"><div class="ptitle">Sponsor Dashboard</div><div class="dcrd2"><h3>Woodforest National Bank</h3><p>Confirmed sponsor dashboard. CRA documentation and deliverables tracking will connect next.</p></div></div><div id="p-deliverables" class="dpanel"><div class="ptitle">Deliverables</div><div class="dcrd2"><h3>Deliverables</h3><p>Sponsor benefits and reporting status will appear here.</p></div></div>`;
    return;
  }

  sidebar.innerHTML = `<div class="sb-sec">Main</div>
    <button class="ni active" onclick="sp('o-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>
    <button class="ni" onclick="sp('o-eventbrite',this)"><i class="ti ti-ticket"></i><span>Eventbrite Links</span></button>
    <button class="ni" onclick="sp('o-vendors',this)"><i class="ti ti-store"></i><span>Vendors</span></button>
    <button class="ni" onclick="sp('o-settings',this)"><i class="ti ti-settings"></i><span>Settings</span></button>`;
  main.innerHTML = `<div id="o-overview" class="dpanel active"><div class="ptitle">Organizer Dashboard</div><div class="dcrd2"><h3>Dashboard Status</h3><p>Event pages, vendor dashboard, and Eventbrite links are ready for next integration steps.</p></div></div><div id="o-eventbrite" class="dpanel"><div class="ptitle">Eventbrite Registration Links</div>${eventbriteSettingsHTML()}</div><div id="o-vendors" class="dpanel"><div class="ptitle">Vendors</div><div class="dcrd2"><h3>Vendor Tracking</h3><p>Vendor records are ready in Supabase. Next step is connecting vendor login to vendor_dashboard_view.</p></div></div><div id="o-settings" class="dpanel"><div class="ptitle">Settings</div><div class="dcrd2"><h3>Integration Settings</h3><p>Keep public IDs and URLs here. Private API keys belong in Cloudflare/Supabase secrets.</p></div></div>`;
  setTimeout(loadEventbriteSettings, 50);
}

function sp(id, btn) {
  const panel = $(id);
  if (!panel) return;
  document.querySelectorAll('#dashMain .dpanel').forEach(p => p.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll('#dashSidebar .ni').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function eventbriteSettingsHTML() {
  return `<div class="api-dash-card"><h3><i class="ti ti-ticket"></i>Eventbrite IDs & Links</h3><p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px;">Defaults are embedded for the four provided Eventbrite pages. Paste overrides only when needed.</p>${EVENTBRITE_EVENTS.map(e => `<div class="api-field" style="background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;margin-bottom:10px;"><label style="display:block;margin-bottom:8px;"><i class="ti ti-ticket"></i> ${e.day} — ${e.name}</label><div class="api-row" style="grid-template-columns:minmax(160px,.7fr) minmax(220px,1.3fr);gap:10px;"><div class="api-input-wrap"><input type="text" id="eb-id-${e.key}" placeholder="Eventbrite Event ID"></div><div class="api-input-wrap"><input type="text" id="eb-url-${e.key}" placeholder="Full Eventbrite URL"></div></div></div>`).join('')}<button class="api-save" onclick="saveEventbriteSettings()">Save Eventbrite Links</button><div class="api-saved" id="ebSaved">Eventbrite links saved</div></div>`;
}

function loadEventbriteSettings() {
  EVENTBRITE_EVENTS.forEach(e => {
    const id = $('eb-id-' + e.key);
    const url = $('eb-url-' + e.key);
    if (id) id.value = localStorage.getItem('cbp_eb_id_' + e.key) || '';
    if (url) url.value = localStorage.getItem('cbp_eb_url_' + e.key) || '';
  });
}

function saveEventbriteSettings() {
  EVENTBRITE_EVENTS.forEach(e => {
    const id = $('eb-id-' + e.key)?.value.trim() || '';
    const url = $('eb-url-' + e.key)?.value.trim() || '';
    id ? localStorage.setItem('cbp_eb_id_' + e.key, id) : localStorage.removeItem('cbp_eb_id_' + e.key);
    url ? localStorage.setItem('cbp_eb_url_' + e.key, url) : localStorage.removeItem('cbp_eb_url_' + e.key);
  });
  const saved = $('ebSaved');
  if (saved) { saved.style.display = 'block'; setTimeout(() => saved.style.display = 'none', 2200); }
}

function getEventbriteUrl(key) {
  const url = localStorage.getItem('cbp_eb_url_' + key);
  const id = localStorage.getItem('cbp_eb_id_' + key);
  if (url && url.startsWith('http')) return url;
  if (id) return 'https://www.eventbrite.com/e/' + encodeURIComponent(id);
  return DEFAULT_EVENTBRITE_URLS[key] || '';
}

function openEventbriteDashboard() { window.open('https://www.eventbrite.com/organizations/events', '_blank', 'noopener'); }

function loadEventbriteWidgetScript(cb) {
  if (window.EBWidgets) { cb(); return; }
  const old = document.querySelector('script[data-eb-widgets="true"]');
  if (old) { old.addEventListener('load', cb, { once: true }); return; }
  const sc = document.createElement('script');
  sc.src = 'https://www.eventbrite.com/static/widgets/eb_widgets.js';
  sc.async = true;
  sc.dataset.ebWidgets = 'true';
  sc.onload = cb;
  document.head.appendChild(sc);
}

function createEventbriteCheckout(eventId, containerId, height = 425) {
  const c = $(containerId);
  if (!c) return;
  c.innerHTML = '<div style="padding:28px;text-align:center;color:#111;font-family:Arial,sans-serif;font-weight:700;">Loading secure Eventbrite checkout…</div>';
  loadEventbriteWidgetScript(() => {
    if (!window.EBWidgets) return;
    c.innerHTML = '';
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

function sponsorCardsFor(data) {
  const src = typeof SPONSOR_DATA !== 'undefined' ? SPONSOR_DATA : {};
  const keys = data.sponsors || ['general'];
  let html = '';
  const seen = new Set();
  keys.forEach(k => (src[k] || []).forEach(sp => {
    if (seen.has(sp.name)) return;
    seen.add(sp.name);
    html += sp.available
      ? `<div class="ep-sponsor-card ep-sponsor-avail" onclick="go('sponsors',document.querySelectorAll('.nav-btn')[2])"><div class="ep-spon-logo" style="background:rgba(255,0,160,.12);color:var(--pink)">${sp.logo}</div><div class="ep-spon-body"><div class="ep-spon-tier" style="color:var(--pink)">${sp.tier}</div><div class="ep-spon-name">${sp.name}</div><div class="ep-spon-tagline">${sp.tagline}</div><div class="ep-spon-deal">${sp.deal}</div></div><button class="ep-spon-cta avail-cta">${sp.cta} →</button></div>`
      : `<div class="ep-sponsor-card"><div class="ep-spon-logo" style="background:${sp.color};color:${sp.textColor}">${sp.logo}</div><div class="ep-spon-body"><div class="ep-spon-tier" style="color:${sp.textColor}">${sp.tier}</div><div class="ep-spon-name">${sp.name}</div><div class="ep-spon-tagline">${sp.tagline}</div><div class="ep-spon-deal">${sp.deal}</div></div><span class="ep-spon-badge">Sponsor</span></div>`;
  }));
  return html;
}

function registrationSectionFor(key, data) {
  const url = getEventbriteUrl(key);
  const eventId = EVENTBRITE_EVENT_IDS[key];
  if (key === 'thu-mixer' && eventId) {
    return `<div class="ep-eb-frame" style="background:#fff;border-radius:14px;overflow:hidden;min-height:425px;border:1px solid rgba(255,255,255,.12);"><div id="eventbrite-widget-container-${eventId}"></div></div><div id="eb-order-complete-${eventId}" style="display:none;margin-top:12px;padding:11px 13px;border-radius:12px;background:rgba(0,255,106,.12);border:1px solid rgba(0,255,106,.25);color:var(--green);font-size:13px;font-weight:800;">Order complete — check your email for confirmation.</div><a href="${url}" target="_blank" rel="noopener" class="ep-reg-btn" style="display:flex;justify-content:center;text-decoration:none;margin-top:14px;">Open Secure Eventbrite Checkout →</a>`;
  }
  if (url) return `<div class="ep-eb-frame"><iframe src="${url}" title="Register for ${data.title}" loading="lazy" style="width:100%;min-height:580px;border:none;border-radius:12px;"></iframe></div><a href="${url}" target="_blank" rel="noopener" class="ep-reg-btn" style="display:flex;justify-content:center;text-decoration:none;margin-top:14px;">Open Secure Eventbrite Checkout →</a>`;
  return `<div class="ep-eb-placeholder"><div style="font-size:40px;margin-bottom:12px">🎟️</div><div class="ep-eb-ph-title">Eventbrite Registration</div><p class="ep-eb-ph-body">This Eventbrite link has not been connected yet.</p></div>`;
}

function openEventPage(key) {
  const src = typeof EVENT_DATA !== 'undefined' ? EVENT_DATA : {};
  const data = src[key];
  if (!data) { alert('Event details are not connected yet.'); return; }
  const sponsorCards = sponsorCardsFor(data);
  const activities = (data.activities || []).map(a => `<div class="ep-activity"><div class="ep-act-icon">${a.icon}</div><div><div class="ep-act-name">${a.name}</div><div class="ep-act-desc">${a.desc}</div></div></div>`).join('');
  const highlights = (data.highlights || []).map(h => `<div class="ep-highlight"><i class="ti ti-check"></i>${h}</div>`).join('');
  const eb = registrationSectionFor(key, data);
  const page = $('eventDetailPage');
  if (!page) return;
  page.innerHTML = `<div class="ep-hero" style="--ep-color:${data.color};--ep-dim:${data.colorDim}"><div class="ep-hero-bg"></div><button class="ep-back" onclick="closeEventPage()"><i class="ti ti-arrow-left"></i> Back to Register</button><div class="ep-hero-content"><div class="ep-day-badge" style="color:${data.color};border-color:${data.color}">${data.day} · ${data.date}</div><div class="ep-hero-emoji">${data.emoji}</div><h1 class="ep-title">${data.title}</h1><p class="ep-tagline" style="color:${data.color}">${data.tagline}</p><div class="ep-meta-row"><span><i class="ti ti-clock"></i> ${data.time}</span><span><i class="ti ti-map-pin"></i> Lovejoy, GA</span><span><i class="ti ti-users"></i> All Ages Welcome</span></div></div></div><div class="ep-body"><div class="ep-layout"><div class="ep-left"><div class="ep-section"><div class="ep-sec-label">About This Event</div><p class="ep-desc">${data.description}</p><div class="ep-highlights">${highlights}</div></div><div class="ep-section"><div class="ep-sec-label">What's Inside</div><div class="ep-activities">${activities}</div></div><div class="ep-section"><div class="ep-sec-label" style="display:flex;align-items:center;justify-content:space-between"><span>Event Sponsors</span><button class="ep-become-spon" onclick="go('sponsors',document.querySelectorAll('.nav-btn')[2])">Become a Sponsor →</button></div><div class="ep-sponsors">${sponsorCards || '<div class="ep-no-spon">No sponsors listed yet</div>'}</div></div></div><div class="ep-right"><div class="ep-reg-panel"><div class="ep-reg-header"><div class="ep-reg-title">Register for This Event</div><div class="ep-reg-sub">Secure checkout powered by Eventbrite</div></div>${eb}<div class="ep-trust-row"><span><i class="ti ti-lock" style="color:var(--green)"></i> SSL Secured</span><span><i class="ti ti-shield-check" style="color:var(--green)"></i> Safe Checkout</span><span><i class="ti ti-refresh" style="color:var(--green)"></i> Instant Confirmation</span></div></div></div></div></div>`;
  go('eventDetailPage', regBtn() || null);
  if (key === 'thu-mixer') setTimeout(() => createEventbriteCheckout('1991029263123', 'eventbrite-widget-container-1991029263123', 425), 150);
}

function closeEventPage() { go('registration', regBtn() || document.querySelectorAll('.nav-btn')[3]); }
function openReg(key) { openEventPage(key); }
function closeReg() { const s = $('ebEmbedSection'), i = $('ebIframe'); if (s) s.style.display = 'none'; if (i) i.src = ''; }

function showEvt(day, btn) {
  document.querySelectorAll('.evt-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.reg-card').forEach(c => { c.style.display = (day === 'all' || c.dataset.day === day || c.dataset.day === 'all') ? 'flex' : 'none'; });
}

function showVendorTab(tab, btn) {
  document.querySelectorAll('.vendor-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.vp-tab').forEach(t => t.classList.remove('active'));
  const panel = $('vendor-' + tab);
  if (panel) panel.style.display = 'block';
  if (btn) btn.classList.add('active');
}

function toggleDayChip(input, id) {
  const chip = $(id);
  if (chip) chip.classList.toggle('selected', !!input.checked);
}

function selectSize(id) {
  document.querySelectorAll('.vp-size-chip').forEach(c => c.classList.remove('active-size'));
  const chip = $(id);
  if (chip) chip.classList.add('active-size');
  const hidden = $('v-size');
  if (hidden) hidden.value = id.replace('size-', '').replace('1010', '10x10').replace('1020', '10x20');
}

function submitVendorApp() {
  const biz = $('v-bizname')?.value.trim();
  const email = $('v-email')?.value.trim();
  const cat = $('v-cat')?.value;
  if (!biz || !email || !cat) { alert('Please complete business name, email, and category.'); return; }
  const vendor = {
    ...DEMO_VENDOR,
    business_name: biz,
    contact_name: $('v-name')?.value.trim() || 'Vendor Contact',
    email,
    phone: $('v-phone')?.value.trim() || '',
    category: cat,
    description: $('v-desc')?.value.trim() || '',
    application_status: 'pending',
    payment_status: 'not_sent',
    payment_amount: 0,
    amount_paid: 0,
    balance_due: 0,
    booth_number: 'TBA',
    placement_zone: 'Pending assignment',
    active_days_label: 'Pending approval',
    setup_time: 'TBA'
  };
  saveVendorLocal(vendor);
  const success = $('vendor-success');
  if (success) success.style.display = 'flex';
}

function vendorStorageKey(email) { return 'cbp_vendor_' + String(email || 'vendor@example.com').toLowerCase().replace(/[^a-z0-9]/g, '_'); }
function saveVendorLocal(vendor) { localStorage.setItem(vendorStorageKey(vendor.email), JSON.stringify(vendor)); }
function getVendorLocal(email) { try { return JSON.parse(localStorage.getItem(vendorStorageKey(email))) || null; } catch (e) { return null; } }

function statusBadge(status) {
  const s = String(status || 'pending');
  const l = s.toLowerCase();
  const color = l.includes('paid') || l.includes('approved') || l.includes('complete') ? 'var(--green)' : l.includes('due') || l.includes('pending') || l.includes('needed') ? 'var(--gold)' : 'var(--sky)';
  return `<span class="vp-track-badge" style="color:${color};border-color:${color}">${titleCase(s)}</span>`;
}

function vendorDashboardHTML(vendor, standalone) {
  const balance = Number(vendor.balance_due ?? (Number(vendor.payment_amount || 0) - Number(vendor.amount_paid || 0)));
  return `<div id="${standalone ? 'v-overview' : 'vendor-dash-content'}" class="dpanel active">
    ${standalone ? '<div class="ptitle">Vendor Dashboard</div>' : ''}
    <div class="vp-dash-header">
      <div class="vp-dash-avatar"><i class="ti ti-building-store"></i></div>
      <div style="flex:1"><div class="vp-dash-name" id="vd-name">${vendor.business_name}</div><div class="vp-dash-meta">Booth #<span id="vd-booth">${vendor.booth_number || 'TBA'}</span> &middot; <span id="vd-cat">${vendor.category || 'Vendor'}</span></div></div>
      <button onclick="vendorLogout()" class="vp-logout-btn"><i class="ti ti-logout"></i> Logout</button>
    </div>
    <div class="vp-track-grid">
      <div class="vp-track-card"><div class="vp-track-label">Application</div><div class="vp-track-value">${statusBadge(vendor.application_status)}</div><div class="vp-track-note">Organizer review status</div></div>
      <div class="vp-track-card"><div class="vp-track-label">Payment</div><div class="vp-track-value">${statusBadge(vendor.payment_status)}</div><div class="vp-track-note">Balance: ${money(balance)}</div></div>
      <div class="vp-track-card"><div class="vp-track-label">Placement</div><div class="vp-track-value">${vendor.booth_number || 'TBA'}</div><div class="vp-track-note">${vendor.placement_zone || 'Pending assignment'}</div></div>
      <div class="vp-track-card"><div class="vp-track-label">Active Days</div><div class="vp-track-value">${vendor.active_days_label || 'Pending'}</div><div class="vp-track-note">Setup: ${vendor.setup_time || 'TBA'}</div></div>
    </div>
    <div class="vp-dash-notice"><i class="ti ti-info-circle" style="color:var(--sky);font-size:15px;flex-shrink:0"></i><div>${vendor.vendor_public_notes || 'Your vendor packet, map, and final setup notes will appear here when assigned.'}</div></div>
    <div class="vp-vendor-two">
      <div class="vp-vendor-panel"><div class="vp-panel-title"><i class="ti ti-list-check"></i> Vendor Checklist</div><div class="vp-progress-wrap"><div class="vp-progress-top"><span>Readiness</span><span id="vp-progress-text">0/7 complete</span></div><div class="vp-progress-track"><div id="vp-progress-bar" class="vp-progress-bar"></div></div></div><div class="vp-check-list">
        ${vendorCheck('checklist_payment_complete','Payment complete',vendor.checklist_payment_complete)}
        ${vendorCheck('checklist_permit_uploaded','Permit or license uploaded',vendor.checklist_permit_uploaded)}
        ${vendorCheck('checklist_insurance_uploaded','Insurance uploaded if required',vendor.checklist_insurance_uploaded)}
        ${vendorCheck('checklist_menu_confirmed','Menu/products confirmed',vendor.checklist_menu_confirmed)}
        ${vendorCheck('checklist_setup_confirmed','Setup needs confirmed',vendor.checklist_setup_confirmed)}
        ${vendorCheck('checklist_shared_flyer','Shared event flyer',vendor.checklist_shared_flyer)}
        ${vendorCheck('checklist_rules_acknowledged','Vendor rules acknowledged',vendor.checklist_rules_acknowledged)}
      </div></div>
      <div class="vp-vendor-panel"><div class="vp-panel-title"><i class="ti ti-map-pin"></i> Placement Details</div><div class="vp-mini-table">
        <div><strong>Booth Size</strong><span>${vendor.booth_size || '10x10'}</span></div>
        <div><strong>Booth Number</strong><span>${vendor.booth_number || 'TBA'}</span></div>
        <div><strong>Zone</strong><span>${vendor.placement_zone || 'Pending'}</span></div>
        <div><strong>Load-In</strong><span>${vendor.load_in_time || 'TBA'}</span></div>
        <div><strong>Gate</strong><span>${vendor.load_in_location || 'TBA'}</span></div>
        <div><strong>Parking</strong><span>${vendor.parking_location || 'TBA'}</span></div>
      </div><div class="vp-action-list"><button class="vp-action-btn" onclick="toggleVendorPaid()"><i class="ti ti-cash"></i> Toggle Payment Demo</button><button class="vp-action-btn" onclick="alert('Vendor packet link will connect when uploaded.')"><i class="ti ti-file-download"></i> Download Vendor Packet</button><button class="vp-action-btn" onclick="alert('Messaging organizer will connect next.')"><i class="ti ti-message"></i> Message Organizer</button></div></div>
    </div>
  </div>
  ${standalone ? '<div id="v-payment" class="dpanel"><div class="ptitle">Payment</div><div class="dcrd2"><h3>Payment Tracking</h3><p>Status: '+titleCase(vendor.payment_status)+'<br>Amount: '+money(vendor.payment_amount)+'<br>Paid: '+money(vendor.amount_paid)+'<br>Balance: '+money(balance)+'</p></div></div><div id="v-placement" class="dpanel"><div class="ptitle">Placement</div><div class="dcrd2"><h3>Booth Placement</h3><p>Booth '+(vendor.booth_number||'TBA')+' · '+(vendor.placement_zone||'Pending assignment')+'</p></div></div><div id="v-checklist" class="dpanel"><div class="ptitle">Checklist</div><div class="dcrd2"><h3>Checklist</h3><p>Use the checklist on Overview to track readiness.</p></div></div>' : ''}`;
}

function vendorCheck(key, label, checked) { return `<label class="vp-check-item"><input type="checkbox" data-vendor-check="${key}" ${checked ? 'checked' : ''} onchange="saveVendorChecklist()"><span>${label}</span></label>`; }

function vendorLogin() {
  const email = $('vl-email')?.value.trim().toLowerCase();
  const pass = $('vl-pass')?.value.trim();
  const err = $('vl-err');
  if (err) err.textContent = '';
  if (!email) { if (err) err.textContent = 'Enter the vendor email address.'; return; }
  if (!pass) { if (err) err.textContent = 'Enter the vendor password.'; return; }
  currentVendorEmail = email;
  let vendor = getVendorLocal(email);
  if (!vendor) {
    vendor = { ...DEMO_VENDOR, email, business_name: titleCase(email.split('@')[0]) + ' Vendor Booth' };
    saveVendorLocal(vendor);
  }
  const dash = $('vendor-dashboard');
  if (dash) { dash.innerHTML = vendorDashboardHTML(vendor, false); dash.style.display = 'block'; }
  const form = $('vl-form');
  if (form) form.style.display = 'none';
  updateVendorChecklistProgress();
}

function vendorLogout() {
  currentVendorEmail = '';
  const dash = $('vendor-dashboard');
  const form = $('vl-form');
  if (dash) dash.style.display = 'none';
  if (form) form.style.display = 'block';
  const err = $('vl-err');
  if (err) err.textContent = '';
}

function saveVendorChecklist() {
  if (!currentVendorEmail) return;
  const vendor = getVendorLocal(currentVendorEmail) || { ...DEMO_VENDOR, email: currentVendorEmail };
  document.querySelectorAll('[data-vendor-check]').forEach(input => { vendor[input.dataset.vendorCheck] = input.checked; });
  saveVendorLocal(vendor);
  updateVendorChecklistProgress();
}

function updateVendorChecklistProgress() {
  const checks = Array.from(document.querySelectorAll('[data-vendor-check]'));
  if (!checks.length) return;
  const done = checks.filter(c => c.checked).length;
  const pct = Math.round((done / checks.length) * 100);
  const bar = $('vp-progress-bar');
  const text = $('vp-progress-text');
  if (bar) bar.style.width = pct + '%';
  if (text) text.textContent = done + '/' + checks.length + ' complete';
}

function toggleVendorPaid() {
  if (!currentVendorEmail) return;
  const vendor = getVendorLocal(currentVendorEmail) || { ...DEMO_VENDOR, email: currentVendorEmail };
  const paid = vendor.payment_status === 'paid';
  vendor.payment_status = paid ? 'deposit_due' : 'paid';
  vendor.amount_paid = paid ? 0 : Number(vendor.payment_amount || 0);
  vendor.balance_due = Math.max(Number(vendor.payment_amount || 0) - Number(vendor.amount_paid || 0), 0);
  vendor.checklist_payment_complete = !paid;
  saveVendorLocal(vendor);
  const dash = $('vendor-dashboard');
  if (dash) dash.innerHTML = vendorDashboardHTML(vendor, false);
  updateVendorChecklistProgress();
}

function pickTier(card, name) { document.querySelectorAll('.tier').forEach(c => c.classList.remove('sel')); if (card) card.classList.add('sel'); const m = $('sponModal'); if (m) m.classList.add('open'); }
function submitSpon() { const m = $('sponModal'); if (m) m.classList.remove('open'); alert('Thank you! Our team will reach out with the sponsorship packet.'); }

const CHAT_RESPONSES = { ticket: ['Open each event page to register through Eventbrite.', 'The Small Business Mixer has embedded Eventbrite checkout on the event page.'], vendor: ['Use the Vendors page to apply or log in to track booth placement, payment, and checklist.'], sponsor: ['Visit Sponsors to request a package.'], schedule: ['The event runs July 3–6, 2026 in Lovejoy, GA.'], default: ['I can help with tickets, vendors, sponsors, schedule, waivers, and event questions.'] };
function getResponseKey(msg) { const m = String(msg).toLowerCase(); if (/ticket|register|buy|pass/.test(m)) return 'ticket'; if (/vendor|booth|apply/.test(m)) return 'vendor'; if (/sponsor|partner|cra/.test(m)) return 'sponsor'; if (/schedule|when|time/.test(m)) return 'schedule'; return 'default'; }
function toggleChat() { const w = $('chatWindow'), i = $('chatIcon'), b = $('chatBadge'); if (!w) return; const open = w.style.display === 'none' || !w.style.display; w.style.display = open ? 'block' : 'none'; if (i) i.className = open ? 'ti ti-x' : 'ti ti-message-circle'; if (b) b.style.display = 'none'; }
function addChatMsg(text, type) { const msgs = $('chatMessages'); if (!msgs) return; const d = document.createElement('div'); d.className = 'chat-msg ' + type; d.innerHTML = '<div class="chat-bubble">' + String(text).replace(/\n/g, '<br>') + '</div><div class="chat-time">Just now</div>'; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; }
function showTyping() { const msgs = $('chatMessages'); if (!msgs) return null; const d = document.createElement('div'); d.className = 'chat-msg bot'; d.id = 'chatTyping'; d.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>'; msgs.appendChild(d); return d; }
function sendChatMessage() { const input = $('chatInput'); if (!input) return; const msg = input.value.trim(); if (!msg) return; input.value = ''; addChatMsg(msg, 'user'); const t = showTyping(); setTimeout(() => { if (t) t.remove(); const r = CHAT_RESPONSES[getResponseKey(msg)] || CHAT_RESPONSES.default; addChatMsg(r[Math.floor(Math.random() * r.length)], 'bot'); }, 500); }
function sendQuick(msg) { const i = $('chatInput'); if (i) i.value = msg; sendChatMessage(); }
function chatKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }

function injectMobileStyles() {
  if ($('event-mobile-fix')) return;
  const s = document.createElement('style');
  s.id = 'event-mobile-fix';
  s.textContent = `@media(max-width:900px){.page{padding-top:64px}nav{height:auto;min-height:58px;padding:8px 10px;gap:8px;align-items:center}.nav-logo{font-size:13px;max-width:145px;line-height:1.05}.nav-links{position:fixed;left:0;right:0;bottom:0;z-index:1000;background:rgba(8,8,16,.98);border-top:1px solid rgba(255,0,160,.32);display:grid;grid-template-columns:repeat(6,1fr);gap:0;padding:6px 4px env(safe-area-inset-bottom)}.nav-btn{font-size:10px;letter-spacing:.3px;flex-direction:column;gap:1px;padding:6px 2px;border-radius:8px}.nav-btn i{font-size:17px}.nav-cta{font-size:11px;padding:8px 10px;letter-spacing:1px}.ep-hero{min-height:auto;padding:48px 16px 34px}.ep-title{font-size:clamp(38px,14vw,64px)!important;line-height:.95}.ep-tagline{font-size:clamp(20px,7vw,34px)!important}.ep-meta-row{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:16px}.ep-body{padding:22px 12px 92px}.ep-layout{display:flex!important;flex-direction:column!important;gap:18px!important}.ep-left,.ep-right{width:100%!important;max-width:100%!important}.ep-right{position:static!important;order:-1}.ep-reg-panel{position:static!important;border-radius:20px!important;padding:14px!important}.ep-highlights,.ep-activities,.ep-sponsors{grid-template-columns:1fr!important}.ep-sponsor-card{grid-template-columns:46px 1fr!important}.vp-vendor-two{grid-template-columns:1fr!important}.vp-track-grid{grid-template-columns:1fr 1fr!important}.chat-msg .chat-bubble{max-width:100%}#chatWidget{right:12px!important;bottom:78px!important}#chatWindow{width:min(92vw,340px)!important;right:0!important}}@media(max-width:480px){.nav-cta{display:none}.vp-track-grid{grid-template-columns:1fr!important}.ep-title{font-size:clamp(34px,16vw,54px)!important}}`;
  document.head.appendChild(s);
}

function injectVendorStyles() {
  if ($('vendor-dashboard-fix')) return;
  const s = document.createElement('style');
  s.id = 'vendor-dashboard-fix';
  s.textContent = `.vp-track-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:16px 0}.vp-track-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:13px}.vp-track-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.42);margin-bottom:6px}.vp-track-value{font-family:'Teko',sans-serif;font-size:24px;font-weight:800;text-transform:uppercase;line-height:1;color:#fff}.vp-track-note{font-size:12px;color:rgba(255,255,255,.48);line-height:1.35;margin-top:5px}.vp-track-badge{display:inline-flex;border:1px solid;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}.vp-vendor-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.8fr);gap:12px;margin-top:14px}.vp-vendor-panel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:15px}.vp-panel-title{font-family:'Teko',sans-serif;font-size:22px;font-weight:800;text-transform:uppercase;display:flex;align-items:center;gap:8px;margin-bottom:12px;color:var(--gold)}.vp-progress-top{display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,.55);margin-bottom:6px}.vp-progress-track{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.vp-progress-bar{height:100%;width:0;background:linear-gradient(90deg,var(--pink),var(--green));border-radius:999px;transition:width .25s}.vp-check-list{display:flex;flex-direction:column;gap:8px}.vp-check-item{display:flex;gap:9px;align-items:flex-start;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:9px 10px;font-size:13px;color:rgba(255,255,255,.72);cursor:pointer}.vp-check-item input{accent-color:#00FF6A;margin-top:2px}.vp-action-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}.vp-action-btn{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.11);border-radius:11px;color:#fff;padding:10px 12px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;gap:8px}.vp-mini-table{margin-top:12px;border-top:1px solid rgba(255,255,255,.08)}.vp-mini-table div{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}.vp-mini-table strong{color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px}.vp-mini-table span{color:rgba(255,255,255,.8);text-align:right}`;
  document.head.appendChild(s);
}

function fixBrokenInlineVendorHandlers() {
  const tabs = [ ['vtab-apply', 'apply'], ['vtab-login', 'login'], ['vtab-info', 'info'] ];
  tabs.forEach(([id, tab]) => { const el = $(id); if (el) el.onclick = function () { showVendorTab(tab, this); }; });
  document.querySelectorAll('.vp-day-chip input').forEach(input => {
    input.onchange = function () { toggleDayChip(this, this.closest('.vp-day-chip')?.id); };
  });
  const sizes = ['size-1010', 'size-1020', 'size-truck'];
  sizes.forEach(id => { const el = $(id); if (el) el.onclick = function () { selectSize(id); }; });
}

function addVendorToPortalLogin() {
  const tabs = document.querySelector('.role-tabs');
  if (!tabs || $('role-vendor-tab')) return;
  const btn = document.createElement('button');
  btn.className = 'rtab';
  btn.id = 'role-vendor-tab';
  btn.type = 'button';
  btn.textContent = 'Vendor';
  btn.onclick = function () { setRole('vendor', this); };
  tabs.appendChild(btn);
}

function initApp() {
  injectMobileStyles();
  injectVendorStyles();
  fixBrokenInlineVendorHandlers();
  addVendorToPortalLogin();
  const b = $('jsCheck');
  if (b) { b.style.display = 'block'; setTimeout(() => b.style.display = 'none', 2200); }
  $('lEmail')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('lPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('vl-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') vendorLogin(); });
  $('vl-pass')?.addEventListener('keydown', e => { if (e.key === 'Enter') vendorLogin(); });
}

document.addEventListener('DOMContentLoaded', initApp);
