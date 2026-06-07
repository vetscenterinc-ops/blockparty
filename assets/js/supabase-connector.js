/* ============================================================
   Supabase Connector — The Collective Block Party
   Uses the browser-safe publishable/anon key only.
   Do not put database passwords or service_role keys in this file.
   ============================================================ */

(function () {
  const SUPABASE_URL = 'https://mvftxnzvmmlzyrrqhitx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_DjzMKwD8boqxPHDUUDA4vA_8pBFp5FD';
  let client = null;

  function $(id) { return document.getElementById(id); }
  function titleCase(s) { return String(s || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve();
      const existing = document.querySelector('script[data-supabase-js="true"]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.dataset.supabaseJs = 'true';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (client) return client;
    await loadSupabaseScript();
    if (!window.supabase) throw new Error('Supabase library did not load.');
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return client;
  }

  function getSelectedVendorDays() {
    const days = [];
    document.querySelectorAll('.vp-day-chip input:checked').forEach(input => days.push(input.value || input.name || input.id));
    return days;
  }

  function showMessage(id, text, good) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.style.display = 'flex';
    el.style.color = good ? 'var(--green)' : 'var(--gold)';
  }

  function normalizeVendor(row) {
    if (!row) return null;
    const paymentAmount = Number(row.payment_amount || 0);
    const amountPaid = Number(row.amount_paid || 0);
    return {
      ...row,
      application_status: row.application_status || row.status || 'pending',
      payment_amount: paymentAmount,
      amount_paid: amountPaid,
      balance_due: Number(row.balance_due ?? Math.max(paymentAmount - amountPaid, 0)),
      business_name: row.business_name || 'Vendor Booth',
      booth_number: row.booth_number || 'TBA',
      booth_size: row.booth_size || '10x10',
      placement_zone: row.placement_zone || 'Pending assignment',
      setup_time: row.setup_time || 'TBA',
      active_days_label: row.active_days_label || row.days || 'Pending approval'
    };
  }

  async function submitVendorApplicationToSupabase() {
    const sb = await getClient();
    const businessName = $('v-bizname')?.value.trim();
    const contactName = $('v-name')?.value.trim();
    const email = $('v-email')?.value.trim().toLowerCase();
    const phone = $('v-phone')?.value.trim();
    const category = $('v-cat')?.value;
    const description = $('v-desc')?.value.trim();
    const boothSize = $('v-size')?.value || '10x10';
    const requestedDays = getSelectedVendorDays();

    if (!businessName || !email || !category) {
      alert('Please complete business name, email, and category.');
      return;
    }

    const payload = {
      business_name: businessName,
      contact_name: contactName,
      email,
      phone,
      category,
      description,
      booth_size: boothSize,
      requested_days: requestedDays,
      days: requestedDays.join(', '),
      status: 'pending',
      payment_status: 'not_sent',
      document_status: 'needed',
      booth_number: 'TBA',
      placement_zone: 'Pending assignment',
      active_days_label: 'Pending approval',
      setup_time: 'TBA'
    };

    const { error } = await sb.from('vendor_applications').insert(payload);
    if (error) {
      console.error('Vendor insert failed:', error);
      alert('Vendor application did not save: ' + error.message);
      return;
    }

    showMessage('vendor-success', 'Application submitted successfully. Check your email for next steps.', true);
  }

  async function loginVendorWithSupabase() {
    const email = $('vl-email')?.value.trim().toLowerCase();
    const password = $('vl-pass')?.value.trim();
    const err = $('vl-err');
    if (err) err.textContent = '';

    if (!email) { if (err) err.textContent = 'Enter the vendor email address.'; return; }
    if (!password) { if (err) err.textContent = 'Enter the vendor password.'; return; }

    const sb = await getClient();
    const auth = await sb.auth.signInWithPassword({ email, password });
    if (auth.error) {
      if (err) err.textContent = 'Login failed: ' + auth.error.message;
      return;
    }

    const userId = auth.data.user?.id;
    const { data, error } = await sb
      .from('vendor_dashboard_view')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (err) err.textContent = 'Vendor lookup failed: ' + error.message;
      return;
    }

    if (!data) {
      if (err) err.textContent = 'Login worked, but no vendor dashboard is linked to this account yet.';
      return;
    }

    const vendor = normalizeVendor(data);
    window.currentVendorEmail = email;
    window.currentVendorSource = 'supabase';

    const dash = $('vendor-dashboard');
    const form = $('vl-form');
    if (dash && typeof window.vendorDashboardHTML === 'function') {
      dash.innerHTML = window.vendorDashboardHTML(vendor, false);
      dash.style.display = 'block';
    }
    if (form) form.style.display = 'none';
    if (typeof window.updateVendorChecklistProgress === 'function') window.updateVendorChecklistProgress();
  }

  async function loginPortalWithSupabase() {
    const role = window.currentRole || 'organizer';
    if (role !== 'vendor') {
      if (typeof window.buildDash === 'function') {
        window.loggedIn = true;
        window.buildDash(role);
        if (typeof window.go === 'function') window.go('dashPage', $('dashNavBtn'));
      }
      return;
    }

    const email = $('lEmail')?.value.trim().toLowerCase();
    const password = $('lPass')?.value.trim();
    const err = $('lErr');
    if (err) err.textContent = '';
    if (!email || !password) { if (err) err.textContent = 'Enter vendor email and password.'; return; }

    const sb = await getClient();
    const auth = await sb.auth.signInWithPassword({ email, password });
    if (auth.error) { if (err) err.textContent = 'Login failed: ' + auth.error.message; return; }

    const userId = auth.data.user?.id;
    const { data, error } = await sb.from('vendor_dashboard_view').select('*').eq('user_id', userId).maybeSingle();
    if (error) { if (err) err.textContent = 'Vendor lookup failed: ' + error.message; return; }
    if (!data) { if (err) err.textContent = 'No vendor dashboard is linked to this login yet.'; return; }

    const vendor = normalizeVendor(data);
    const sidebar = $('dashSidebar');
    const main = $('dashMain');
    if (sidebar) sidebar.innerHTML = `<div class="sb-sec">Vendor</div><button class="ni active" onclick="sp('v-overview',this)"><i class="ti ti-layout-dashboard"></i><span>Overview</span></button>`;
    if (main && typeof window.vendorDashboardHTML === 'function') main.innerHTML = window.vendorDashboardHTML(vendor, true);
    if (typeof window.go === 'function') window.go('dashPage', $('dashNavBtn'));
    if (typeof window.updateVendorChecklistProgress === 'function') window.updateVendorChecklistProgress();
  }

  window.CBP_SUPABASE = {
    getClient,
    submitVendorApplicationToSupabase,
    loginVendorWithSupabase,
    loginPortalWithSupabase
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.submitVendorApp = function () {
      submitVendorApplicationToSupabase().catch(err => {
        console.error(err);
        alert('Vendor application failed: ' + err.message);
      });
    };

    window.vendorLogin = function () {
      loginVendorWithSupabase().catch(err => {
        console.error(err);
        const el = $('vl-err');
        if (el) el.textContent = 'Vendor login failed: ' + err.message;
      });
    };

    window.doLogin = function () {
      loginPortalWithSupabase().catch(err => {
        console.error(err);
        const el = $('lErr');
        if (el) el.textContent = 'Login failed: ' + err.message;
      });
    };
  });
})();
