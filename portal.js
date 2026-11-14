/* Edgewood Volunteer Hub – volunteer portal, leave-the-list page, admin view.
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Talks to the Hub (Apps Script) through window.HUB_API. Holds no data, codes or settings itself;
 * a volunteer's own code is remembered only in their own browser (localStorage). */
(function () {
  'use strict';
  var API = window.HUB_API, ENV = window.HUB_ENV || 'LIVE';
  var LIAISON = 'edgewood.hs.volunteers+liaison@gmail.com', TECH = 'edgewood.hs.volunteers+help@gmail.com';
  var root = document.getElementById('hub');
  // Nov 14: "Refresh now" on remembered screens: forget everything and reload (the address bar already says which screen)
  if (root) root.addEventListener('click', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('memore')) { e.preventDefault(); try { window.__hubHomeC = {}; } catch (x) {} location.reload(); } });
  var PFX = ENV === 'LIVE' ? '' : 'sbx_';   // live and test sites share this address, so they keep separate saved codes and admin sign-ins
  var KEY = PFX + 'hubCodes', ACTIVE = PFX + 'hubActive';
  var state = { data: null, admin: false, adminData: null, view: 'home', cal: null, page: 'Portal' };
  var SID = (function () { try { var x = sessionStorage.getItem('hubSid'); if (!x) { x = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('hubSid', x); } return x; } catch (e) { return ''; } })();
  var ADMIN = PFX + 'hubAdmin', DIR = PFX + 'hubDir';

  // ---------- look (Nov 10, 2026: app-style restyle; scoped to #hub.portal so the loader's other pages are untouched)
  (function () {
    if (document.getElementById('hubv2css')) return;
    var f = document.createElement('link'); f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap';
    document.head.appendChild(f);
    var P = '#hub.portal ', css = [
      'body{background:#EEF2F7}',
      P + '{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0F172A}',
      P + 'header{display:block;background:#0B2545;padding:22px 18px 18px;border-radius:0 0 22px 22px}',
      P + 'header.adminhdr{background:#7c2d12}',
      P + '.hx-top{display:flex;justify-content:space-between;align-items:center;gap:8px}',
      P + '.eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#F5B700;text-decoration:none}',
      P + '.hello{font-family:"Space Grotesk",Inter,sans-serif;font-size:30px;font-weight:700;line-height:1.05;margin:10px 0 14px;color:#fff}',
      P + '.avatar{flex:none;width:34px;height:34px;border-radius:50%;background:#F5B700;color:#0B2545;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}',
      P + '.pills{gap:8px}',
      P + '.pill{min-height:34px;padding:6px 15px;border:0;background:rgba(255,255,255,.14);color:#fff;font:600 14px Inter,sans-serif}',
      P + '.pill.on{background:#fff;color:#0B2545;font-weight:700}',
      P + '.pill.add{background:transparent;border:1px dashed rgba(255,255,255,.55)}',
      P + '.pill.admin{background:transparent;border:1px solid #F5B700;color:#F5B700}' + P + '.pill.admin.on{background:#F5B700;color:#0B2545}',
      P + '.card{border:0;border-radius:18px;padding:16px;margin:12px 14px;box-shadow:0 1px 2px rgba(15,23,42,.08)}',
      P + '.card.warn{border:1px solid #fca5a5}' + P + '.card.gameday{border:1px solid #fcd34d}' + P + '.card.admincard{border:1px solid #fdba74}',
      P + '.kicker{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#475569}',
      P + '.status{display:flex;gap:12px;align-items:center}',
      P + '.ico{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center}',
      P + '.ico.good{background:#DCFCE7}' + P + '.ico.bad{background:#FEF3C7}' + P + '.ico.wait{background:#E0E7FF}',
      P + '.st-title{font-size:16px;font-weight:700}' + P + '.st-sub{font-size:13px;color:#475569}',
      P + '.docs{list-style:none;margin:12px 0 0;padding:12px 0 0;border-top:1px solid #EEF2F7}',
      P + '.docs li{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0 8px;padding:5px 0;font-size:14px}',
      P + '.docs .nm{display:flex;align-items:center;gap:8px}',
      P + '.tagp{display:inline-block;padding:2px 8px;border-radius:99px;background:#E0E7FF;color:#1E3A8A;font-size:11px;font-weight:600}',
      P + '.btn{min-height:44px;border-radius:12px;font:600 14px Inter,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px}',
      P + 'a.btn{display:flex;border-radius:12px;font-weight:600;min-height:44px;box-sizing:border-box}',
      P + '.btn.primary,' + P + 'a.btn.primary{background:#0B2545;border-color:#0B2545;color:#fff}',
      P + '.btn.sm{min-height:34px;display:inline-flex}',
      P + '.shift{display:flex;gap:14px;align-items:center;margin-top:10px}',
      P + '.dtile{flex:none;width:56px;height:60px;border-radius:14px;background:#0B2545;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      P + '.dtile .dw{font-size:11px;font-weight:700;letter-spacing:.08em;color:#F5B700}',
      P + '.dtile .dd{font-family:"Space Grotesk",Inter,sans-serif;font-size:24px;font-weight:700;line-height:1}',
      P + '.ev{font-size:17px;font-weight:700;line-height:1.2}' + P + '.ev-sub{font-size:14px;color:#475569}',
      P + '.lead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding:10px 12px;background:#F4F6FA;border-radius:12px;font-size:14px}',
      P + '.lead .acts{display:flex;gap:6px}',
      P + '.lead .acts a{min-height:34px;padding:0 14px;border-radius:99px;background:#0B2545;color:#fff;font-weight:700;font-size:13px;text-decoration:none;display:flex;align-items:center}',
      P + '.lead .acts a.light{background:#E0E7FF;color:#1E3A8A}',
      P + '.note{margin-top:10px;font-size:12.5px;color:#475569;line-height:1.45}',
      P + '.hrs{display:flex;align-items:baseline;gap:6px;margin-top:6px}',
      P + '.hrs .n{font-family:"Space Grotesk",Inter,sans-serif;font-size:38px;font-weight:700;line-height:1;color:#0B2545}',
      P + '.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:#E2E8F0;margin-top:12px}',
      P + '.legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:#334155}',
      P + '.legend span{display:flex;align-items:center;gap:6px}' + P + '.legend i{width:9px;height:9px;border-radius:2px;display:inline-block}',
      P + '.cta{background:#0B2545;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      P + '.cta .t{font-size:16px;font-weight:700}' + P + '.cta .s{font-size:13px;color:#CBD5E1}',
      P + '.cta a.go{flex:none;min-height:44px;padding:0 16px;border-radius:12px;background:#F5B700;color:#0B2545;font-weight:800;font-size:14px;text-decoration:none;display:flex;align-items:center}',
      P + '.links{padding:4px 0}',
      P + '.links .li{display:flex;width:100%;align-items:center;justify-content:space-between;min-height:52px;padding:0 16px;box-sizing:border-box;border:0;border-top:1px solid #EEF2F7;background:none;color:#0F172A;font:600 15px Inter,sans-serif;text-decoration:none;cursor:pointer;text-align:left}',
      P + '.links .li:first-child{border-top:0}',
      P + '.links .li svg{flex:none}',
      P + '.links .li .l{display:flex;align-items:center;gap:12px}',
      P + 'footer{color:#64748B}',
      P + 'footer a,' + P + '.center a{color:#1E3A8A}',
      P + '.stat{background:#fff;border-radius:18px}',
      P + '.pend{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 12px;border-radius:12px;background:#FEF3C7;color:#78350F;font-size:13.5px}',
      P + '.pend .dot{flex:none;width:8px;height:8px;border-radius:50%;background:#D97706}',
      P + '.pend .muted{color:#92400E}'
    ].join('\n');
    var s = document.createElement('style'); s.id = 'hubv2css'; s.textContent = css; document.head.appendChild(s);
  })();
  var ICON = {
    ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bad: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 6v8M12 18.5v.01"/></svg>',
    wait: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    sOk: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    sBad: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2545" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2545" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2545" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2545" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
  };

  // ---------- helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function normCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function fmtCode(c) { c = normCode(c); return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  /** People remembered on this device. Full: {id, code}. Email only (limited): {id, email, personId, limited}. */
  function codes() { return (store(KEY) || []).map(function (x) { if (!x.id) x.id = x.code; return x; }); }
  function saveEntry(e) {
    e.id = e.code || ('E:' + e.email + '|' + (e.personId || ''));
    var list = codes().filter(function (x) { return x.id !== e.id && !(e.code && x.limited && x.personId === e.personId); });   // a code replaces the same person's email sign-in
    list.unshift(e); store(KEY, list.slice(0, 8)); store(ACTIVE, e.id);
  }
  function saveCode(code, first, personId) { saveEntry({ code: code, first: first || '', personId: personId || '' }); }
  function dropEntry(id) { store(KEY, codes().filter(function (x) { return x.id !== id; })); if (store(ACTIVE) === id) store(ACTIVE, (codes()[0] || {}).id || null); }
  function activeEntry() { var a = store(ACTIVE), list = codes(); return list.filter(function (x) { return x.id === a; })[0] || list[0] || null; }
  function activeCode() { var e = activeEntry(); return e && e.code ? e.code : null; }
  function reqOf(e) { return e.code ? { code: e.code } : { email: e.email, personId: e.personId }; }
  /** Links the Hub builds point at the web app until Public site URL is set; keep people on this site. */
  function toSite(u) {
    if (!u) return '';
    var base = location.origin + location.pathname;
    if (API && u.indexOf(API) === 0) return base + u.slice(API.length).replace(/^\/?/, '');
    return u;
  }
  function call(action, body) {
    body = body || {}; body.action = action;
    if (!/^(portal|visit|clientError|directory|dirGoogle|leaveInfo|admin(HubGames|SuGames|Stands|Search|View|HubRoster|SuRoster|Tools|Health|Google|NoShows|Family|StandForm|CancelOptions|DocFile|DocQueue|LogStands|SheetList|WalkInStands))$/.test(action)) { try { window.__hubHomeC = {}; } catch (e) {} }   // Nov 14: any change (anything that isn't a read) clears the remembered screens
    body._c = { page: state.page, ua: navigator.userAgent, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), scr: screen.width + 'x' + screen.height, lang: navigator.language || '', sid: SID };
    return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Something went wrong.');
      return j.result;
    });
  }
  function h(html) { root.innerHTML = html; window.scrollTo(0, 0); if (typeof wireFooter === 'function') wireFooter(); }
  /** Button shows a small spinner and a working label while a request runs; returns a function that puts it back. */
  function busy(btn, label) {
    if (!btn) return function () {};
    var html = btn.innerHTML; btn.disabled = true;
    btn.innerHTML = '<span class="bspin"></span>' + esc(label || 'Opening your page…');
    return function () { btn.disabled = false; btn.innerHTML = html; };
  }
  function spinner(msg) { h('<div class="card center"><div class="spin"></div><p class="muted">' + esc(msg || 'Loading…') + '</p></div>'); }
  function on(sel, ev, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) { el.addEventListener(ev, fn); }); }
  function telLink(p, kind) { var d = String(p || '').replace(/[^\d+]/g, ''); return d ? (kind === 'sms' ? 'sms:' : 'tel:') + d : ''; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function sameDay(t) { return dayKey(t) === dayKey(Date.now()); }

  // ---------- routing
  var qs = new URLSearchParams(location.search);
  var view = qs.get('view');
  if (view === 'leave') return leavePage(qs.get('email') || '');
  if (view === 'admin') {   // "Back to admin portal" from an admin-opened page (p = the volunteer they were working on)
    // Nov 12: the address bar keeps where the admin is (search, a volunteer, a roster), so a refresh reopens the same screen.
    var p0 = qs.get('p'), r0 = qs.get('hub'), s0 = qs.get('su'), d0 = qs.get('d') || '';
    if (adminSess()) {
      state.admin = true;
      if (p0) return adminView(p0);
      var t0 = qs.get('tool'), T0 = { home: adminToolsHome, review: toolReview, family: toolFamily, cancel: toolCancel, sheets: toolSheets, logs: toolLogs, noshows: toolNoShows, walkin: toolWalkIn, health: toolHealth };
      if (t0 && T0[t0]) return T0[t0]();
      if (qs.get('ms')) { state.canManage = adminLevel() >= 3; return adminManage(qs.get('ev') || '', d0); }
      if (r0 && d0) return adminRoster(r0, d0);
      if (s0 && d0) return adminSuRoster(s0, d0);
      if (qs.get('day')) return adminDay(qs.get('day'));
      if (qs.get('find')) return adminFind();
      return adminSearch();
    }
    return adminStart();
  }
  if (view === 'directory') { history.replaceState(null, '', location.pathname + '?view=directory'); return dirStart(); }   // section 26 on the Hub
  if (qs.get('code') && view === 'home') {   // a personal portal link: remember the code on this device, then clean the address bar
    var c0 = normCode(qs.get('code')); if (c0.length >= 6) saveCode(c0, '');
    history.replaceState(null, '', location.pathname);
  }
  home();

  // ---------- portal home
  function home() {
    var ent = activeEntry();
    if (!ent) return signIn();
    spinner('Loading your page…');
    var rq = reqOf(ent);
    memoCall('portal', rq, JSON.stringify(rq)).then(function (d) {   // switching between people on this device is instant after the first look
      if (d.pick) return pickPerson(ent.email, d.pick);
      state.data = d; ent.first = d.me.first; ent.personId = d.me.personId; saveEntry(ent);
      renderHome(d, false);
    }).catch(function (e) {
      if (/couldn't find that/i.test(e.message)) { dropEntry(ent.id); return signIn('That saved sign-in no longer works. Enter your current code or email.'); }
      if (/signs in with Google/i.test(e.message) && ent.limited) { dropEntry(ent.id); return signIn(e.message); }   // email sign-in no longer allowed for this email
      h('<div class="card"><p class="err">' + esc(e.message) + '</p><button class="btn" id="retry">Try again</button></div>'); on('#retry', 'click', home);
    });
  }

  function signIn(note) {
    h(header('', false) +
      '<div class="card"><h2>Your volunteer page</h2>' +
      (note ? '<p class="err">' + esc(note) + '</p>' : '') +
      (window.HUB_GOOGLE_CLIENT_ID ? '<div id="gbtn" class="gbtn"></div><p class="small muted">New volunteer? Sign in with Google to get started.</p><div class="or"><span>or</span></div>' : '') +
      '<p class="muted">Enter the volunteer code from your Hub email (it looks like K7Q4-M9XD) for everything, or your email address to see your shifts, hours and paperwork. This device will remember it.</p>' +
      '<input id="code" autocomplete="off" placeholder="ABCD-1234 or you@example.com">' +
      '<button class="btn primary" id="go">Open my page</button><p class="err" id="msg"></p>' +
      '<p class="small center" style="margin-top:10px"><a href="#" id="getcode">Don\'t have your code? Email it to me</a></p></div>' +
      '<div class="card"><a class="btn" href="?view=coverage">See open spots</a></div>' + footer());
    var go = function () {
      var raw = document.getElementById('code').value.trim(), msg = document.getElementById('msg'), btn = document.getElementById('go');
      msg.textContent = '';
      if (btn.disabled) return;   // already working (Enter pressed twice)
      if (/@/.test(raw)) {
        var em = raw.toLowerCase(), undo = busy(btn);
        call('portal', { email: em }).then(function (d) {
          if (d.pick) return pickPerson(em, d.pick);
          saveEntry({ email: em, personId: d.me.personId, first: d.me.first, limited: true }); state.data = d; renderHome(d, false);
        }).catch(function (e) { undo(); if (/couldn't find that email/i.test(e.message)) return newEmail(em); msg.textContent = e.message; });
        return;
      }
      var c = normCode(raw);
      if (c.length < 6) { msg.textContent = 'Enter your email address, or the 8-letter code from your Hub email.'; return; }
      var undo2 = busy(btn);
      call('portal', { code: c }).then(function (d) { saveCode(c, d.me.first, d.me.personId); state.data = d; renderHome(d, false); })
        .catch(function (e) { undo2(); msg.textContent = e.message; });
    };
    on('#go', 'click', go);
    on('#code', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    on('#getcode', 'click', function (e) { e.preventDefault(); var v = document.getElementById('code').value.trim(); codeEmail(/@/.test(v) ? v : ''); });
    gsi('gbtn', function (cred) {
      state.page = 'Portal (Google)';
      spinner('Signing you in with Google…');   // the Hub check takes a few seconds; show it right away
      call('portalGoogle', { credential: cred }).then(function (r) {
        if (r.people && r.people.length) { r.people.slice().reverse().forEach(function (p) { saveCode(p.code, p.first, p.personId); }); return home(); }
        googleNew(r, cred);
      }).catch(function (e) { signIn(); var m = document.getElementById('msg'); if (m) m.textContent = e.message; });
    });
  }

  /** Nov 10: a typed email that isn't on the volunteer list. Offer sign-up (the paperwork form, email filled in) instead of a dead end.
   *  The email goes to the form through sessionStorage (same site), not the address bar. Nothing is saved on the device until they finish. */
  function newEmail(em) {
    state.page = 'Portal (email, new)';
    h(header('', false) +
      '<div class="card"><h2>Welcome!</h2>' +
      '<p class="muted">We don\'t have <b>' + esc(em) + '</b> on the volunteer list yet.</p>' +
      '<button class="btn primary" id="new">I\'m new: sign me up</button>' +
      '<p class="small muted">Opens the volunteer form with your email filled in. When you finish, tap <b>Open my volunteer page</b>.</p></div>' +
      '<div class="card"><h2>Already a volunteer?</h2><p class="muted">Use the email your Hub emails come to, or the code from your Hub email (it looks like K7Q4-M9XD).</p>' +
      '<button class="btn" id="back">Try a different email or code</button>' +
      '<button class="btn" id="getcode">Email me my code</button></div>' + footer());
    on('#new', 'click', function () {
      try { sessionStorage.setItem('hubNewEmail', em); } catch (x) {}
      location.href = location.pathname + '?view=form';
    });
    on('#back', 'click', function () { signIn(); var c = document.getElementById('code'); if (c) c.value = em; });
    on('#getcode', 'click', function () { codeEmail(''); });
  }

  /** Nov 12: "Email me my code". The Hub emails the code(s) on file for that address, only to that address (section 30);
   *  the code never comes back to the page. Not on file: says so right away, like the sign-in page does. */
  function codeEmail(prefill, back) {
    state.page = 'Portal (email my code)';
    back = back || function () { signIn(); };
    h(header('', false) +
      '<div class="card"><h2>Email me my code</h2>' +
      '<p class="muted">Enter the email your Hub emails come to. We\'ll send your volunteer code and a button that opens your page. Family sharing one email? Everyone\'s code comes in the same email.</p>' +
      '<input id="cem" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(prefill || '') + '">' +
      '<button class="btn primary" id="csend">Email my code</button><p class="err" id="msg"></p><div id="cres"></div></div>' +
      '<div class="center small"><a href="#" id="back">Back</a></div>' + footer());
    var go = function () {
      var em = document.getElementById('cem').value.trim().toLowerCase(), msg = document.getElementById('msg'), res = document.getElementById('cres'), btn = document.getElementById('csend');
      msg.textContent = ''; res.innerHTML = '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg.textContent = 'Enter the email address your Hub emails come to.'; return; }
      if (btn.disabled) return;
      var undo = busy(btn, 'Sending…');
      call('sendCode', { email: em }).then(function (r) {
        undo();
        if (!r.found) {
          res.innerHTML = '<p class="err">We couldn\'t find that email.</p><p class="small muted">Try the email your Hub emails come to. New to volunteering?</p>' +
            '<button class="btn" id="cnew">I\'m new: sign me up</button>';
          on('#cnew', 'click', function () { try { sessionStorage.setItem('hubNewEmail', em); } catch (x) {} location.href = location.pathname + '?view=form'; });
          var i = document.getElementById('cem'); if (i) { i.focus(); i.select(); }
          return;
        }
        var t = r.sent ? '<b>Sent!</b> Check <b>' + esc(em) + '</b> for ' + (r.count > 1 ? 'your family\'s codes' : 'your code') + '. It usually arrives in a minute or two. Not there? Check your spam folder.'
          : r.recent ? 'We already sent it to <b>' + esc(em) + '</b> in the last few minutes. Check your inbox and your spam folder.'
          : r.limit ? 'We\'ve already sent your code to <b>' + esc(em) + '</b> several times today. Check your inbox and spam folder, or <a href="mailto:' + LIAISON + '">email the IU liaison</a>.'
          : 'We couldn\'t send email right now. Try again later, or <a href="mailto:' + LIAISON + '">email the IU liaison</a>.';
        res.innerHTML = '<div style="margin-top:12px;padding:12px 14px;border-radius:12px;line-height:1.45;font-size:14px;' +
          (r.sent ? 'background:#DCFCE7;color:#14532D' : 'background:#FEF3C7;color:#78350F') + '">' + t + '</div>';
      }).catch(function (e) { undo(); msg.textContent = /unknown request/i.test(e.message) ? 'This isn\'t ready yet. Please email the IU liaison for your code.' : e.message; });
    };
    on('#csend', 'click', go); on('#cem', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    on('#back', 'click', function (e) { e.preventDefault(); back(); });
  }

  /** Google sign-in button (the same Google client as admin sign-in). */
  function gsi(elId, onCred) {
    var cid = window.HUB_GOOGLE_CLIENT_ID, el = document.getElementById(elId); if (!cid || !el) return;
    var draw = function () {
      google.accounts.id.initialize({ client_id: cid, auto_select: false, callback: function (r) { onCred(r.credential); } });
      google.accounts.id.renderButton(document.getElementById(elId), { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill' });
    };
    if (window.google && google.accounts && google.accounts.id) return draw();
    var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = draw;
    sc.onerror = function () { el.textContent = 'Google sign-in could not load. Use your code or email instead.'; };
    document.head.appendChild(sc);
  }

  /** Signed in with Google, but that email is not on the volunteer list: sign up, or link it once with the code. */
  function googleNew(r, cred) {
    state.page = 'Portal (Google, new)';
    h(header('', false) +
      '<div class="card"><h2>Welcome' + (r.first ? ', ' + esc(r.first) : '') + '!</h2>' +
      '<p class="muted">We don\'t have <b>' + esc(r.email) + '</b> on the volunteer list yet.</p>' +
      '<a class="btn primary" href="' + esc(toSite(r.newLink)) + '">I\'m new: sign me up</a>' +
      '<p class="small muted">Opens the volunteer form with your name and email filled in. Your page opens as soon as you finish.</p></div>' +
      '<div class="card"><h2>Already a volunteer?</h2><p class="muted">Enter the code from your Hub email once. After that, this Google account opens your page. Your Hub emails keep going where they go now.</p>' +
      '<input id="lcode" autocomplete="off" placeholder="ABCD-1234"><button class="btn" id="link">Link my Google account</button><p class="err" id="msg"></p>' +
      '<p class="small center" style="margin-top:10px"><a href="#" id="getcode">Don\'t have your code? Email it to me</a></p></div>' +
      '<div class="center small"><a href="#" id="back">Back</a></div>' + footer());
    var go = function () {
      var c = normCode(document.getElementById('lcode').value), msg = document.getElementById('msg'); msg.textContent = '';
      if (c.length < 6) { msg.textContent = 'Enter the 8-letter code from your Hub email.'; return; }
      var lb = document.getElementById('link'); if (lb.disabled) return; var undo = busy(lb, 'Linking…');
      call('portalGoogleLink', { credential: cred, code: c }).then(function (p) { saveCode(p.code, p.first, p.personId); home(); })
        .catch(function (e) { undo(); msg.textContent = /confirm that sign-in/i.test(e.message) ? 'Your Google sign-in timed out. Tap Back and sign in with Google again.' : e.message; });
    };
    on('#link', 'click', go); on('#lcode', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    on('#back', 'click', function (e) { e.preventDefault(); signIn(); });
    on('#getcode', 'click', function (e) { e.preventDefault(); codeEmail('', function () { googleNew(r, cred); }); });
  }

  function pickPerson(email, list) {
    h(header('', false) + '<div class="card"><h2>Who are you?</h2><p class="muted">More than one volunteer uses this email.</p>' +
      list.map(function (p) { return '<button class="btn" data-pid="' + esc(p.personId) + '">' + esc(p.first) + '</button>'; }).join('') + '<p class="err" id="msg"></p></div>' + footer());
    on('[data-pid]', 'click', function () {
      var pid = this.getAttribute('data-pid'); if (this.disabled) return; var undo = busy(this);
      memoCall('portal', { email: email, personId: pid }, JSON.stringify({ email: email, personId: pid })).then(function (d) {
        saveEntry({ email: email, personId: pid, first: d.me.first, limited: true }); state.data = d; renderHome(d, false);
      }).catch(function (e) { undo(); document.getElementById('msg').textContent = e.message; });
    });
  }

  function header(first, isAdmin) {
    var list = codes(), act = (activeEntry() || {}).id;
    var pills = list.map(function (x) {
      return '<button class="pill' + (x.id === act && !state.admin ? ' on' : '') + '" data-code="' + esc(x.id) + '">' + esc(x.first || (x.code ? fmtCode(x.code) : x.email)) + '</button>';
    }).join('');
    // Nov 11: others on the same email (the Hub sends them only to a code sign-in): one tap adds them to this device
    var d0 = state.data || {}, have = {};
    list.forEach(function (x) { if (x.personId) have[x.personId] = 1; if (x.code) have[normCode(x.code)] = 1; });
    state.houseAdd = (!state.admin && !d0.limited && d0.house || []).filter(function (p) { return p && p.code && !have[p.personId] && !have[normCode(p.code)]; });
    pills += state.houseAdd.map(function (p, i) { return '<button class="pill add" data-house="' + i + '" title="Shares your email. Add to this device">+ ' + esc(p.first) + '</button>'; }).join('');
    pills += (list.length ? '<button class="pill add" id="addp" title="Add another person on this device">+ Add</button>' : '');
    var ini = String(first || '').trim().charAt(0).toUpperCase();
    return '<header><div class="hx-top"><a class="eyebrow" href="' + location.pathname + '">Edgewood Volunteer Hub</a>' + (ini ? '<div class="avatar" aria-hidden="true">' + esc(ini) + '</div>' : '') + '</div>' +
      '<div class="hello">' + (first ? 'Hi, ' + esc(first) : 'Volunteer pages') + '</div>' +
      '<div class="pills">' + pills + headerRoles(isAdmin) + '</div></header>';
  }
  /** Admin / Directory buttons: only for people the Hub says are allowed (their code's People row), or who already signed in for it on this device. */
  function headerRoles(isAdmin) {
    var d = state.data || {}, full = d && !d.limited;
    var adm = (isAdmin && full) || !!adminSess(), dir = adm || (full && d.isDir) || !!dirSess();
    return (adm ? '<button class="pill admin' + (state.admin ? ' on' : '') + '" id="adm">Admin</button>' : '') +
      (dir ? '<button class="pill admin" id="dirp">Directory</button>' : '');
  }
  function wireHeader() {
    on('.pill[data-code]', 'click', function () { state.admin = false; store(ACTIVE, this.getAttribute('data-code')); home(); });
    on('#addp', 'click', function () { state.admin = false; signIn(); });
    on('.pill[data-house]', 'click', function () { var p = (state.houseAdd || [])[+this.getAttribute('data-house')]; if (!p) return; saveCode(p.code, p.first, p.personId); state.admin = false; home(); });
    on('#adm', 'click', function () { if (state.admin) { state.admin = false; renderHome(state.data, false); } else adminStart(); });
    on('#dirp', 'click', function () { dirStart(); });
  }
  function footer() {
    var help = (state.data && state.data.help) || window.HUB_HELP || '';
    return '<footer>' + (help ? '<a href="' + esc(help) + '" target="_blank" rel="noopener">Help and how-to guides</a><br>' : '') +
      'Questions about shifts, stands or paperwork: <a href="mailto:' + LIAISON + '">email the IU liaison</a>.<br>' +
      'Website or technical problems: <a href="mailto:' + TECH + '">Nick Ely, tech support</a>.<br>' +
      '© 2026 NE Prints &amp; Design, LLC' + (ENV !== 'LIVE' ? ' · ' + esc(ENV) : '') + '</footer>';
  }
  function wireFooter() {
  }

  function renderHome(d, asAdmin) {
    var me = d.me, sh = d.shifts || {}, up = sh.upcoming || [], next = up[0];
    state.page = asAdmin ? 'Portal admin view' : d.limited ? 'Portal (email)' : 'Portal (code)';
    var out = (asAdmin ? adminBar(d) : header(me.first, d.isAdmin)) + '<div class="cols">';
    if (asAdmin) out += adminCard(d);
    if (d.limited && !asAdmin) out += '<div class="card wide"><b>Signed in with your email.</b><div class="small">You can see your shifts, hours and paperwork. For your personal links (paperwork page, naming your spots, logging stand hours), enter the code from your Hub email.</div><button class="btn" id="usecode">Enter my code</button></div>';
    if (!me.active) out += '<div class="card warn wide">' + esc(me.first) + ' is not on the volunteer list right now. Signing up for a shift adds you back automatically.</div>';

    // Game day
    (d.standToday || []).forEach(function (s) {
      out += '<div class="card gameday wide"><div class="tag">' + (s.late ? esc(s.date || '') + ' · stand sheet not submitted yet' : 'Today · you\'re the stand lead') + '</div><div class="big">' + esc(s.stand) + (s.event ? ' · ' + esc(s.event) : '') + '</div>' +
        (s.link ? '<a class="btn primary" href="' + esc(toSite(s.link)) + '">Log your stand\'s hours</a>' : s.act ? '<a class="btn primary" href="' + esc(toSite(s.act)) + '">Open this stand\'s time sheet (as admin)</a>' : '<p class="small muted">' + (asAdmin ? 'Admin view hides the stand link.' : 'Your stand link is in your Hub email, or enter your code above to open it here.') + '</p>') +
        (d.techPhone ? '<a class="btn" href="' + telLink(d.techPhone, 'sms') + '">Page not working? Text tech support (Nick)</a>' : '') + '</div>';
    });

    // Paperwork (status first: cleared / being checked / needs attention)
    var docs = me.docs || [], miss = (me.missing || []).concat(me.permitMissing || []);
    // A document already shown as "needs a fix" also comes back as "<label> needs to be redone": count and show it once
    var fixed = docs.filter(function (x) { return x.fix; }).map(function (x) { return String(x.label || '').toLowerCase(); });
    miss = miss.filter(function (m) { var t = String(m).toLowerCase(); return !fixed.some(function (l) { return l && t.indexOf(l) === 0 && /redone|fix/.test(t); }); });
    var bad = miss.length + docs.filter(function (x) { return x.fix || (x.days != null && x.days < 30); }).length;
    var pend = docs.some(function (x) { return x.pending; });
    var lastExp = docs.map(function (x) { return x.exp; }).filter(Boolean)[0] || '';
    var stIco = bad ? 'bad' : pend ? 'wait' : 'good';
    var stTitle = bad ? bad + (bad > 1 ? ' things need' : ' thing needs') + ' attention' : pend ? 'Paperwork received' : 'You\'re cleared to work';
    var stSub = bad ? 'Fix these before your next shift.' : pend ? 'The liaison is checking it now.' : (lastExp ? 'Good through ' + esc(lastExp) : 'Everything is on file.');
    out += '<div class="card"><div class="status"><div class="ico ' + stIco + '">' + ICON[stIco === 'good' ? 'ok' : stIco] + '</div>' +
      '<div><div class="kicker">Paperwork</div><div class="st-title">' + stTitle + '</div><div class="st-sub">' + stSub + '</div></div></div><ul class="docs">';
    docs.forEach(function (x) {
      var warn = x.fix || (x.days != null && x.days < 30);
      out += '<li><span class="nm">' + (warn ? ICON.sBad : ICON.sOk) + esc(x.label) + '</span><span>' +
        (x.pending ? '<span class="tagp">being checked</span>' : '<span class="' + (warn ? 'err' : 'muted') + ' small">' + (x.fix ? (x.rejected ? 'not accepted' : 'needs a fix') : x.exp ? 'to ' + esc(x.exp) : '') + '</span>') + '</span>' +
        (x.fix && x.reason ? '<div class="small err" style="flex-basis:100%;margin:2px 0 0 22px">Why: ' + esc(x.reason) + '</div>' : '') + '</li>';
    });
    miss.forEach(function (m) { out += '<li><span class="nm">' + ICON.sBad + esc(m) + '</span></li>'; });
    // Nov 12: people kept trying to upload the ATC application/receipt. The permit itself comes by email after the ATC approves it.
    var atcDue = miss.some(function (m) { return /atc permit/i.test(m); });
    var atcNote = atcDue ? '<div style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:10px;padding:10px 12px;margin:10px 0;color:#78350F">' +
      '<b>⏳ ATC permit: it comes by email, and not right away.</b> <span class="small">(Only needed for alcohol spots.)</span><div class="small" style="margin-top:4px">After you apply, the ATC reviews your application and emails your permit once it\'s approved. That can take a few days. ' +
      'Upload the permit from that email (the full page or the wallet card). The application or payment receipt isn\'t the permit.</div></div>' : '';
    // Levy packet missing, needing a fix or expiring soon: offer to sign it online (needs a code on this device, not an email sign-in)
    var levyDue = miss.some(function (m) { return /levy packet/i.test(m); }) || docs.some(function (x) { return /levy packet/i.test(x.label) && !x.pending && (x.fix || (x.days != null && x.days < 30)); });
    var levyBtn = !asAdmin && !d.limited && levyDue && (activeEntry() || {}).code ? '<a class="btn primary" href="?view=levy">Sign the Levy packet online</a>' : '';
    // Minor release missing, needing a fix or expiring soon: sign it online with a parent (same device or a link for them)
    var relDue = miss.some(function (m) { return /minor release/i.test(m); }) || docs.some(function (x) { return /minor release/i.test(x.label) && !x.pending && (x.fix || (x.days != null && x.days < 30)); });
    var relBtn = !asAdmin && !d.limited && relDue && (activeEntry() || {}).code ? '<a class="btn' + (!levyBtn ? ' primary' : '') + '" href="?view=release">Sign the minor release online</a>' : '';
    out += '</ul>' + atcNote + levyBtn + relBtn + (!asAdmin && d.links.upload && bad ? '<a class="btn' + (!levyBtn && !relBtn ? ' primary' : '') + '" href="' + esc(toSite(d.links.upload)) + '">Upload paperwork</a>' : '') + '</div>';
    // Spots needing names
    (d.spots || []).forEach(function (s) {
      out += '<div class="card warn"><b>' + esc(s.date) + (s.event ? ' · ' + esc(s.event) : '') + '</b><div class="small">Spots under your name still need a name for who\'s working them.</div>' +
        (s.link ? '<a class="btn primary" href="' + esc(toSite(s.link)) + '">Name my spots</a>' : s.act ? '<a class="btn primary" href="' + esc(toSite(s.act)) + '">Name spots for them (as admin)</a>' : (asAdmin ? '' : '<div class="small muted">Use the link in your Hub email, or enter your code to open it here.</div>')) + '</div>';
    });

    // Next shift
    out += '<div class="card"><div class="kicker">' + (next ? 'Your next shift' : 'Shifts') + '</div>';
    if (!next) out += '<p class="muted" style="margin:8px 0 0">No upcoming shifts yet.</p>';
    else {
      var nd = next.t ? new Date(next.t) : null;
      out += '<div class="shift">' + (nd ? '<div class="dtile"><div class="dw">' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][nd.getDay()] + '</div><div class="dd">' + nd.getDate() + '</div></div>' : '') +
        '<div><div class="ev">' + esc(next.event || next.date) + '</div><div class="ev-sub">' + esc(nd ? next.date : '') + (nd && next.stand ? ' · ' : '') + esc(next.stand || '') + '</div>' +
        (next.start ? '<div class="ev-sub">' + esc(next.start) + (next.end ? ' – ' + esc(next.end) : '') + '</div>' : '') + '</div></div>';
      if (next.youLead) out += '<div class="lead"><span><b>You\'re the stand lead.</b></span></div>';
      else if (next.lead) {
        out += '<div class="lead"><span><span class="muted small">Stand lead</span><br><b>' + esc(next.lead) + '</b></span>';
        if (next.leadPhone) out += '<span class="acts"><a class="light" href="' + telLink(next.leadPhone) + '">Call</a><a href="' + telLink(next.leadPhone, 'sms') + '">Text</a></span>';
        else if (next.phoneLater) out += '<span class="muted small" style="text-align:right">Call/text shows<br>' + esc(sh.showH || 48) + ' h before</span>';
        out += '</div>';
      }
      if (sh.callH) out += '<div class="note">Running late or can\'t make it within ' + esc(sh.callH) + ' hours of your shift? Call or text your stand lead. Please clock in no more than ' + esc(sh.early || 15) + ' minutes early.</div>';
    }
    if (up.length || (sh.rows || []).length) out += '<button class="btn" id="cal">' + ICON.cal + 'See all my shifts (' + up.length + ' upcoming)</button>';
    out += '</div>';

    // Open spots
    out += '<div class="card cta"><div><div class="t">' + (next ? 'Pick up another shift' : 'Find a shift') + '</div><div class="s">Tap an open spot and you\'re on.</div></div><a class="go" href="?view=coverage">Open spots</a></div>';

    // Hours, split by the student each shift credited
    var byStud = {}, order = [];
    (sh.rows || []).forEach(function (x) { var k = x.student || ''; if (!k) return; if (!(k in byStud)) { byStud[k] = 0; order.push(k); } byStud[k] += Number(x.hours) || 0; });
    var tot = order.reduce(function (a, k) { return a + byStud[k]; }, 0), COL = ['#0B2545', '#F5B700', '#3B82F6', '#14B8A6', '#94A3B8'];
    var studs = (sh.students || []).map(function (s) { return esc(s.name); }).join(', ');
    out += '<div class="card"><div class="row" style="margin:0"><span class="kicker">Hours this season</span><span class="small muted">' + esc(sh.shifts || 0) + ' game' + (Number(sh.shifts) === 1 ? '' : 's') + '</span></div>' +
      '<div class="hrs"><span class="n">' + esc(sh.hours || 0) + '</span><span class="small muted" style="font-weight:600">hours</span></div>';
    if (tot > 0) {
      out += '<div class="bar">' + order.map(function (k, i) { return '<div style="width:' + (100 * byStud[k] / tot).toFixed(1) + '%;background:' + COL[i % COL.length] + '"></div>'; }).join('') + '</div>' +
        '<div class="legend">' + order.map(function (k, i) { return '<span><i style="background:' + COL[i % COL.length] + '"></i>' + esc(k) + ' <b>' + esc(Math.round(byStud[k] * 100) / 100) + '</b></span>'; }).join('') + '</div>';
    } else out += '<div class="small muted" style="margin-top:8px">Credited to: ' + (studs || '—') + (sh.unpaid ? ' · ' + esc(sh.unpaid) + ' not paid out yet' : '') + '</div>';
    // Student totals from everyone credited to them (families split shifts). Restored Nov 11: the old My shifts page had this per student.
    (sh.students || []).filter(function (s) { return Number(s.hours) > 0; }).forEach(function (s) {
      var n = Number(s.people) || 1, h = Math.round(Number(s.hours) * 100) / 100, u = Math.round(Number(s.unpaid) * 100) / 100;
      out += '<div class="stutot" style="margin-top:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px"><b>' + esc(s.name) + '\u2019s total from everyone: ' + esc(h) + ' hours</b>' +
        '<div class="small muted">' + (u ? esc(u) + ' not paid out yet · ' : '') + 'from ' + esc(n) + (n === 1 ? ' volunteer' : ' volunteers') + '</div></div>';
    });
    if (sh.unpaid && tot > 0) out += '<div class="small muted" style="margin-top:6px">' + esc(sh.unpaid) + ' not paid out yet</div>';
    var pq = (sh.pending || []).concat(sh.awaiting || []), pH = pq.reduce(function (a, x) { return a + (Number(x.hours) || 0); }, 0);
    if (pq.length) out += '<div class="pend"><span class="dot"></span><span><b>' + (pH ? esc(Math.round(pH * 100) / 100) + (Number(sh.hours) ? ' more' : '') + ' hour' + (pH === 1 ? '' : 's') : pq.length + (Number(sh.hours) ? ' more' : '') + ' shift' + (pq.length > 1 ? 's' : '')) + '</b> pending review' +
      (pH ? ' <span class="muted">(' + pq.length + ' shift' + (pq.length > 1 ? 's' : '') + ')</span>' : '') + '</span></div>';
    out += '</div>';

    // Quick links
    out += '<div class="card links">' +
      '<button class="li" id="hist"><span class="l">' + ICON.clock + 'Hours history</span>' + ICON.chev + '</button>' +
      (!asAdmin && d.links.upload ? '<a class="li" href="' + esc(toSite(d.links.upload)) + '"><span class="l">' + ICON.user + 'Update my info &amp; paperwork</span>' + ICON.chev + '</a>' : '') +
      '<a class="li" href="mailto:' + LIAISON + '"><span class="l">' + ICON.mail + 'Contact the liaison</span>' + ICON.chev + '</a></div>';

    out += '</div>';
    if (!asAdmin) out += '<div class="center small"><a href="#" id="leave">Leave the volunteer list</a> · <a href="#" id="signout">Forget me on this device</a>' +
      (codes().length > 1 ? ' · <a href="#" id="forgetall">Forget everyone on this device</a>' : '') + '</div>';
    out += footer();
    h(out);
    if (!asAdmin) wireHeader(); else { wireAdminBar(); toolPersonWire(d.adminView || {}); }
    on('#cal', 'click', function () { calendar(d, asAdmin); });
    on('#hist', 'click', function () { history_(d, asAdmin); });
    on('#leave', 'click', function (e) { e.preventDefault(); var en = activeEntry() || {}; leaveFlow(en.code ? { code: en.code } : { email: en.email }, function () { renderHome(d, false); }); });
    on('#signout', 'click', function (e) {
      e.preventDefault(); var en = activeEntry() || {};
      if (!confirm('Forget ' + (en.first || 'this person') + ' on this device? You will need your code or email to sign in again.')) return;
      dropEntry(en.id); home();
    });
    on('#forgetall', 'click', function (e) {
      e.preventDefault();
      if (!confirm('Forget everyone saved on this device?')) return;
      try { localStorage.removeItem(KEY); localStorage.removeItem(ACTIVE); } catch (x) {} home();
    });
    on('#usecode', 'click', function () { signIn(); });
  }

  // ---------- calendar of my shifts
  function calendar(d, asAdmin) {
    var sh = d.shifts || {}, items = [];
    (sh.upcoming || []).forEach(function (x) { items.push({ t: x.t, label: (x.stand || '') + (x.start ? ' ' + x.start : ''), up: true, x: x }); });
    (sh.rows || []).forEach(function (x) { if (x.t) items.push({ t: x.t, label: (x.stand || '') + ' ' + (x.hours || 0) + 'h', up: false, x: x }); });
    var first = items.length ? new Date(Math.min.apply(null, items.filter(function (i) { return i.up; }).map(function (i) { return i.t; }).concat([Date.now()]))) : new Date();
    var m = state.cal || new Date(first.getFullYear(), first.getMonth(), 1);
    state.cal = m;
    var y = m.getFullYear(), mo = m.getMonth(), start = new Date(y, mo, 1), pad = start.getDay(), days = new Date(y, mo + 1, 0).getDate();
    var byDay = {}; items.forEach(function (i) { (byDay[dayKey(i.t)] = byDay[dayKey(i.t)] || []).push(i); });
    var cells = '';
    for (var b = 0; b < pad; b++) cells += '<div class="cell empty"></div>';
    for (var dd = 1; dd <= days; dd++) {
      var k = y + '-' + (mo + 1) + '-' + dd, list = byDay[k] || [], today = k === dayKey(Date.now());
      cells += '<div class="cell' + (today ? ' today' : '') + '"><div class="dn">' + dd + '</div>' + list.map(function (i, n) {
        return '<button class="chip' + (i.up ? '' : ' past') + '" data-k="' + k + '" data-n="' + n + '">' + esc(i.label) + '</button>';
      }).join('') + '</div>';
    }
    var name = m.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    h((asAdmin ? adminBar(state.adminData) : header(d.me.first, d.isAdmin)) +
      '<div class="card calcard"><div class="row"><button class="btn sm" id="back">← Back</button><b>My shifts</b><span></span></div>' +
      '<div class="row"><button class="btn sm" id="prev">‹</button><b>' + esc(name) + '</b><button class="btn sm" id="next">›</button></div>' +
      '<div class="cal"><div class="wd">Sun</div><div class="wd">Mon</div><div class="wd">Tue</div><div class="wd">Wed</div><div class="wd">Thu</div><div class="wd">Fri</div><div class="wd">Sat</div>' + cells + '</div>' +
      '<p class="small muted">Blue = upcoming · grey = worked. Tap a shift for details.</p><div id="det"></div></div>' + footer());
    if (!asAdmin) wireHeader(); else wireAdminBar();
    on('#back', 'click', function () { state.cal = null; renderHome(d, asAdmin); });
    on('#prev', 'click', function () { state.cal = new Date(y, mo - 1, 1); calendar(d, asAdmin); });
    on('#next', 'click', function () { state.cal = new Date(y, mo + 1, 1); calendar(d, asAdmin); });
    on('.chip', 'click', function () {
      var i = byDay[this.getAttribute('data-k')][+this.getAttribute('data-n')], x = i.x, o = '<div class="card inner"><b>' + esc(x.date) + (x.event ? ' · ' + esc(x.event) : '') + '</b><div>' + esc(x.stand) + '</div>';
      if (i.up) {
        o += '<div>' + esc(x.start || '') + (x.end ? '–' + esc(x.end) : '') + '</div>';
        if (x.youLead) o += '<div class="small">You\'re the stand lead.</div>';
        else if (x.lead) o += '<div class="small">Stand lead: ' + esc(x.lead) + (x.leadPhone ? ' · <a href="' + telLink(x.leadPhone) + '">Call</a> · <a href="' + telLink(x.leadPhone, 'sms') + '">Text</a>' : x.phoneLater ? ' <span class="muted">(call/text show closer to the shift)</span>' : '') + '</div>';
      } else {
        o += '<div>' + esc(x.start || '') + (x.end ? '–' + esc(x.end) : '') + ' · ' + esc(x.hours) + ' hours' + (x.student ? ' · credited to ' + esc(x.student) : '') + '</div><div class="small muted">' + esc(x.status || '') + '</div>';
      }
      document.getElementById('det').innerHTML = o + '</div>';
    });
  }

  // ---------- hours history
  function history_(d, asAdmin) {
    var sh = d.shifts || {}, rows = (sh.rows || []).slice().sort(function (a, b) { return b.t - a.t; });
    var o = (asAdmin ? adminBar(state.adminData) : header(d.me.first, d.isAdmin)) + '<div class="card"><div class="row"><button class="btn sm" id="back">← Back</button><b>Hours history</b><span></span></div>';
    o += '<p class="small muted">' + esc(sh.hours || 0) + ' hours over ' + esc(sh.shifts || 0) + ' games' + (sh.unpaid ? ' · ' + esc(sh.unpaid) + ' not paid out yet' : '') + '</p>';
    if (!rows.length) o += '<p class="muted">No hours on file yet.</p>';
    rows.forEach(function (x) {
      o += '<div class="hrow"><div><b>' + esc(x.date) + '</b> ' + esc(x.event || x.sport || '') + '<div class="small muted">' + esc(x.stand) + (x.start ? ' · ' + esc(x.start) + '–' + esc(x.end) : '') + (x.student ? ' · ' + esc(x.student) : '') + '</div></div>' +
        '<div class="right"><b>' + esc(x.hours) + 'h</b><div class="small muted">' + esc(x.status || '') + '</div></div></div>';
    });
    (sh.pending || []).concat(sh.awaiting || []).forEach(function (x) {
      o += '<div class="hrow"><div><b>' + esc(x.date) + '</b> ' + esc(x.event || '') + '<div class="small muted">' + esc(x.stand || '') + '</div></div><div class="right">' + (Number(x.hours) ? '<b>' + esc(x.hours) + 'h</b>' : '') + '<div class="small" style="color:#B45309">pending review</div></div></div>';
    });
    h(o + '</div>' + footer());
    if (!asAdmin) wireHeader(); else wireAdminBar();
    on('#back', 'click', function () { renderHome(d, asAdmin); });
  }

  // ---------- leave the list (portal and standalone page share this)
  function leaveFlow(who, onCancel) {
    spinner();
    call('leaveInfo', who).then(function (info) {
      var o = '<div class="card"><h2>Leave the volunteer list</h2>' +
        '<p class="small">This stops Hub emails about shifts and paperwork. It does not change any fundraising-shift requirement for your family; the IU liaison and treasurer handle that. If you sign up for a shift again later, you\'re added back automatically.</p>';
      if (!info.people.length) o += '<p class="err">No volunteers found for that email.</p>';
      info.people.forEach(function (p) {
        var busy = (p.upcoming || []).length;
        o += '<label class="chk' + (busy ? ' dim' : '') + '"><input type="checkbox" value="' + esc(p.personId) + '"' + (busy || !p.active ? ' disabled' : (info.people.length === 1 ? ' checked' : '')) + '> ' + esc(p.first) +
          (busy ? ' <span class="small err">— still signed up for ' + esc(p.upcoming.join(', ')) + '. Cancel on SignUp.com first.</span>' : !p.active ? ' <span class="small muted">— already off the list</span>' : '') + '</label>';
      });
      o += '<label class="lbl">Why are you leaving?</label><select id="why"><option value="">Choose one…</option>' +
        info.reasons.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select>' +
        '<textarea id="other" placeholder="Tell us a little more" style="display:none"></textarea>' +
        '<button class="btn danger" id="doLeave" disabled>Leave the list</button> <button class="btn" id="cancel">Cancel</button><p class="err" id="msg"></p></div>';
      h(o + footer());
      var why = document.getElementById('why'), other = document.getElementById('other'), btn = document.getElementById('doLeave');
      var check = function () {
        var picked = root.querySelectorAll('.chk input:checked').length, isOther = /^other/i.test(why.value);
        other.style.display = isOther ? 'block' : 'none';
        btn.disabled = !picked || !why.value || (isOther && other.value.trim().length < 3);
      };
      on('.chk input', 'change', check); why.addEventListener('change', check); other.addEventListener('input', check);
      on('#cancel', 'click', function () { onCancel ? onCancel() : home(); });
      btn.addEventListener('click', function () {
        var ids = Array.prototype.map.call(root.querySelectorAll('.chk input:checked'), function (x) { return x.value; });
        btn.disabled = true; document.getElementById('msg').textContent = '';
        call('leave', { code: who.code || '', email: info.email, ids: ids, reason: why.value, other: other.value }).then(function (r) {
          h('<div class="card center"><h2>You\'re off the list</h2><p>' + esc((r.names || []).join(' and ')) + ' will no longer get Hub emails. A confirmation is on its way.</p>' +
            (r.kept && r.kept.length ? '<p class="small err">Not removed (still signed up): ' + esc(r.kept.join('; ')) + '</p>' : '') + '<p class="muted">Thank you for volunteering.</p></div>' + footer());
          var en = activeEntry(); if (en && ((who.code && en.code === who.code) || (who.email && en.email === who.email))) dropEntry(en.id);
        }).catch(function (e) { document.getElementById('msg').textContent = e.message; btn.disabled = false; });
      });
    }).catch(function (e) { h('<div class="card"><p class="err">' + esc(e.message) + '</p></div>' + footer()); });
  }
  function leavePage(email) {
    state.page = 'Leave the list';
    if (email) return leaveFlow({ email: email });
    var c = activeCode();
    h(header('', false) + '<div class="card"><h2>Leave the volunteer list</h2><p class="muted">Enter the email address Hub emails come to.</p>' +
      '<input id="em" type="email" placeholder="you@example.com"><button class="btn primary" id="go">Continue</button>' +
      (c ? '<p class="small">Or <a href="#" id="usecode">continue as the volunteer saved on this device</a>.</p>' : '') + '<p class="err" id="msg"></p></div>' + footer());
    on('#go', 'click', function () { var v = document.getElementById('em').value.trim(); if (!/@/.test(v)) { document.getElementById('msg').textContent = 'Enter an email address.'; return; } leaveFlow({ email: v }); });
    on('#usecode', 'click', function (e) { e.preventDefault(); leaveFlow({ code: c }); });
  }

  // ---------- admin (Google sign-in; the Hub checks the account against Lists › Portal admins)
  function adminSess() { var a = store(ADMIN); return a && a.session && a.expires > Date.now() ? a : null; }
  /** Admin level (section 33 on the Hub): 1 Viewer, 2 Coordinator, 3 Manager, 4 Full. Older Hubs send none = Full. The Hub enforces it; this only hides buttons. */
  function adminLevel() { var a = adminSess() || {}; return a.level || 4; }
  function adminLevelSet(r) { if (!r || !r.level) return; var a = adminSess(); if (a && (a.level !== r.level || a.levelName !== r.levelName)) { a.level = r.level; a.levelName = r.levelName; store(ADMIN, a); var e = document.getElementById('admlvl'); if (e) e.textContent = r.levelName; } }
  /** Put the current admin screen in the address bar (replace, not a new history entry). extra = { p } or { hub, d } or { su, d }. */
  function adminUrl(extra) {
    var q = new URLSearchParams({ view: 'admin' }); for (var k in (extra || {})) if (extra[k]) q.set(k, extra[k]);
    try { history.replaceState(null, '', location.pathname + '?' + q.toString()); } catch (e) {}
  }
  function adminLeaveUrl() { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  function adminReq(extra) { var a = adminSess() || {}, o = { adminSession: a.session }; for (var k in extra) o[k] = extra[k]; return o; }
  function adminFail(e) {
    if (/expired|sign in with google/i.test(e.message)) { try { localStorage.removeItem(ADMIN); } catch (x) {} return adminStart('Your admin sign-in expired. Sign in again.'); }
    h(adminBar() + '<div class="card"><p class="err">' + esc(e.message) + '</p></div>' + footer()); wireAdminBar();
  }
  function adminStart(note) {
    state.admin = true; state.page = 'Portal admin';
    if (adminSess()) return adminSearch();
    var cid = window.HUB_GOOGLE_CLIENT_ID;
    h(header('', false) + '<div class="card"><h2>Admin sign-in</h2><p class="muted">Sign in with the Google account that is on the Portal admins list.</p>' +
      (note ? '<p class="err">' + esc(note) + '</p>' : '') + (cid ? '<div id="gbtn"></div>' : '<p class="err">Admin sign-in is not set up yet.</p>') +
      '<p class="err" id="msg"></p><button class="btn" id="cancelAdm">Cancel</button></div>' + footer());
    on('#cancelAdm', 'click', function () { adminLeaveUrl(); state.admin = false; state.data ? renderHome(state.data, false) : home(); });
    if (!cid) return;
    gsi('gbtn', function (cred) {
      spinner('Signing you in with Google…');
      call('adminGoogle', { credential: cred }).then(function (a) { store(ADMIN, a); adminSearch(); })
        .catch(function (e) { adminStart(e.message); });
    });
  }
  function adminBar() {
    var a = adminSess() || {};
    return '<header class="adminhdr"><div><div class="title">Admin view</div><div class="sub">' + esc(a.name || '') + (a.levelName ? ' · <span id="admlvl">' + esc(a.levelName) + '</span>' : '') + ' · every lookup and change is logged</div></div>' +
      '<div class="pills"><a class="pill" href="' + location.pathname + '" style="text-decoration:none">My dashboard</a><button class="pill" id="adms">Admin home</button><button class="pill" id="admf">Find a volunteer</button><button class="pill" id="admt">Hub tools</button><button class="pill" id="admd">Directory</button><button class="pill" id="admx">Exit admin</button><button class="pill" id="admo">Sign out</button></div></header>';
  }
  function wireAdminBar() {
    on('#adms', 'click', adminSearch);
    on('#admf', 'click', function () { adminFind(); });
    on('#admt', 'click', adminToolsHome);
    on('#admd', 'click', function () { try { history.replaceState(null, '', location.pathname + '?view=directory'); } catch (e) {} dirView(); });
    on('#admx', 'click', function () { homeC(true); adminLeaveUrl(); state.admin = false; state.page = 'Portal'; state.data ? renderHome(state.data, false) : home(); });
    on('#admo', 'click', function () {
      var a = adminSess(); try { localStorage.removeItem(ADMIN); } catch (x) {}
      if (a) call('adminSignOut', { adminSession: a.session }).catch(function () {});
      homeC(true); adminLeaveUrl(); state.admin = false; state.page = 'Portal'; state.data ? renderHome(state.data, false) : home();
    });
  }
  /** Nov 14 (Nick): the admin home's lists come back instantly. Each list's answer is kept for 2 minutes; going back to the
   *  admin home within that time redraws from memory instead of asking the Hub again. "Refresh" on the home forces a reload. */
  // A function, not a var: the router near the top returns before a var placed here would be set.
  function homeC(clear) { if (clear || !window.__hubHomeC) window.__hubHomeC = {}; return window.__hubHomeC; }
  function homeCall(action) { return memoCall(action, adminReq({}), ''); }
  /** Nov 14: same 2-minute memory for the volunteer dashboard (switching people), a volunteer's admin page, rosters,
   *  Whole day and the directory. Copies go in and out so a screen that changes its data can't change the memory. */
  function memoCall(action, body, key, ttl) {
    var k = action + '|' + (key || ''), c = homeC()[k];
    if (c && Date.now() - c.at < (ttl || 120000)) return Promise.resolve(JSON.parse(c.j));
    return call(action, body).then(function (r) { try { homeC()[k] = { j: JSON.stringify(r), at: Date.now() }; } catch (e) {} return r; });
  }
  /** People search on its own screen (was a card on the admin home). */
  function adminFind(q0) {
    adminUrl({ find: '1' }); state.page = 'Portal admin find';
    h(adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="fback">← Admin home</button><b>Find a volunteer</b><span></span></div>' +
      '<input id="q" placeholder="Name, email, or phone number" autocomplete="off"><button class="btn primary" id="go">Search</button><p class="err" id="msg"></p><div id="res"></div></div>' + footer());
    wireAdminBar(); on('#fback', 'click', adminSearch);
    var go = function () {
      var q = document.getElementById('q').value.trim(), msg = document.getElementById('msg'), res = document.getElementById('res');
      msg.textContent = ''; res.innerHTML = '<div class="spin"></div>';
      call('adminSearch', adminReq({ q: q })).then(function (r) {
        if (!r.hits.length) { res.innerHTML = '<p class="muted">No matches.</p>'; return; }
        res.innerHTML = r.hits.map(function (x) {
          return '<button class="hit" data-id="' + esc(x.personId) + '"><b>' + esc(x.name) + '</b>' + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
            '<div class="small muted">' + esc(x.email) + (x.phone ? ' · ' + esc(x.phone) : '') + ' · ' + esc(x.status) + '</div></button>';
        }).join('') + (r.more ? '<p class="small muted">' + r.more + ' more. Narrow the search.</p>' : '');
        on('.hit', 'click', function () { adminView(this.getAttribute('data-id')); });
      }).catch(function (e) { res.innerHTML = ''; if (/expired|sign in with google/i.test(e.message)) return adminFail(e); msg.textContent = e.message; });
    };
    on('#go', 'click', go); on('#q', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    var qi = document.getElementById('q'); if (q0) { qi.value = q0; go(); } else { try { qi.focus(); } catch (e) {} }
  }
  function adminSearch() {
    adminUrl();
    h(adminBar() + '<div class="cols"><div class="card"><h2>Find a volunteer</h2><p class="small muted">Look someone up by name, email, or phone number.</p><button class="btn primary" id="gofind">Find a volunteer</button>' +
      '<p class="small muted" style="margin-top:10px">Lists below are kept for 2 minutes so this page comes back fast. <a href="#" id="homerefresh">Refresh now</a></p></div>' +
      '<div class="card"><h2>Stands (last 3 days)</h2><div id="stands"><div class="spin"></div></div></div>' +
      '<div class="card wide"><h2>Hub games</h2><p class="small muted">Rosters: move, remove, add or hand off. Every change is stamped and logged.</p><div id="hubgames"><div class="spin"></div></div></div>' +
      '<div class="card wide"><h2>SignUp.com games</h2><p class="small muted">Who is working each stand, with group-text buttons. Changes still happen on SignUp.com.</p><div id="sugames"><div class="spin"></div></div></div></div>' + footer());
    wireAdminBar();
    on('#gofind', 'click', function () { adminFind(); });
    on('#homerefresh', 'click', function (e) { e.preventDefault(); homeC(true); adminSearch(); });
    adminHubList();
    adminSuList();
    homeCall('adminStands').then(function (r) {
      var el = document.getElementById('stands'); if (!el) return;
      if (!r.stands.length) { el.innerHTML = '<p class="muted">No stands today or in the last 2 days.</p>'; return; }
      var day = '';
      el.innerHTML = r.stands.map(function (x) {
        var head = x.date !== day ? '<div class="small muted" style="margin-top:8px"><b>' + (x.today ? 'Today · ' : '') + esc(x.date) + '</b></div>' : ''; day = x.date;
        return head + '<div class="hrow"><span><b>' + esc(x.stand) + '</b>' + (x.event ? ' · ' + esc(x.event) : '') +
          '<div class="small muted">' + (x.chair ? 'Lead ' + esc(x.chair) + ' · ' : '') + esc(x.status) + (x.submittedBy ? ' · by ' + esc(x.submittedBy) : '') + '</div></span>' +
          (x.act ? '<a class="btn sm" href="' + esc(toSite(x.act)) + '">Time sheet</a>' : x.view ? '' : '<span class="small muted">approved</span>') + '</div>';
      }).join('');
    }).catch(function (e) { var el = document.getElementById('stands'); if (/expired|sign in with google/i.test(e.message)) return adminFail(e); if (el) el.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  // ---------- admin: Hub tools (section 34 on the Hub). Menu jobs from the Hub spreadsheet, by admin level.
  var TOOLS = null;
  function toolErr(el, e) { if (/expired|sign in with google/i.test(e.message)) return adminFail(e); if (el) { el.textContent = e.message; el.className = 'err'; } }
  function toolHead(title, sub) {
    return adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="tback">← Back</button><b>' + esc(title) + '</b><span></span></div>' +
      (sub ? '<p class="small muted">' + sub + '</p>' : '') + '<p id="tmsg" class="ok" style="font-weight:700;white-space:pre-line"></p></div>';
  }
  function toolWire() { wireAdminBar(); on('#tback', 'click', adminToolsHome); }
  function toolMsg(t, c) { var m = document.getElementById('tmsg'); if (!m) return; m.textContent = t || ''; m.className = c || 'ok'; m.style.fontWeight = '700'; }
  /** Two taps for anything that sends email or can't be undone. */
  function twoTap(btn, label, go) {
    if (btn.getAttribute('data-arm')) { btn.removeAttribute('data-arm'); btn.textContent = btn.getAttribute('data-was'); go(); return; }
    btn.setAttribute('data-arm', '1'); btn.setAttribute('data-was', btn.textContent); btn.textContent = label;
    setTimeout(function () { if (btn.getAttribute('data-arm')) { btn.removeAttribute('data-arm'); btn.textContent = btn.getAttribute('data-was'); } }, 5000);
  }
  /** Nov 14 (Nick): Hub tools is its own screen, opened from the "Hub tools" pill in the admin bar. */
  function adminToolsHome() {
    adminUrl({ tool: 'home' }); state.page = 'Portal admin tools';
    h(adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="tback">← Back</button><b>Hub tools</b><span></span></div>' +
      '<p class="small muted">Jobs from the Hub spreadsheet\'s menu. You see the ones your admin level can use. Counts are kept 2 minutes; <a href="#" id="toolsrefresh">refresh now</a>.</p><div id="htools"><div class="spin"></div></div></div>' + footer());
    wireAdminBar(); on('#tback', 'click', adminSearch);
    adminToolsCard();
    on('#toolsrefresh', 'click', function (e) { e.preventDefault(); homeC(true); adminToolsHome(); });
  }
  /** The list of tools this admin's level can use (on the Hub tools screen). */
  function adminToolsCard() {
    var el = document.getElementById('htools'); if (!el) return;
    homeCall('adminTools').then(function (r) {   // Nov 14: kept 2 minutes like the admin home lists; any admin change clears it
      TOOLS = r; adminLevelSet(r);
      var L = r.level || 4, b = [];
      var add = function (lv, id, label, n, sub) { if (L >= lv) b.push('<button class="hit" id="' + id + '"><b>' + label + (n ? ' <span style="background:#b91c1c;color:#fff;border-radius:10px;padding:1px 8px;font-size:12px">' + n + '</span>' : '') + '</b><div class="small muted">' + sub + '</div></button>'); };
      add(3, 'tl_review', 'Paperwork to review', r.review, 'Check new documents: OK, needs fix, or rejected');
      add(3, 'tl_logs', 'Approve stand logs', r.logs, 'Send checked time sheets to the hours database');
      add(3, 'tl_noshows', 'No-show decisions', r.noshows, 'NCNS, excused, or they worked');
      add(3, 'tl_family', 'Family manager requests', r.family, 'Approve or decline');
      add(2, 'tl_sheets', 'Send stand sheets', 0, 'Email stand leads their stand link and sign-in sheet');
      add(2, 'tl_walkin', 'Add a worker by hand', 0, 'Someone working a stand who isn\'t signed up');
      add(3, 'tl_cancel', 'Cancel a stand or game', 0, 'Weather, IU or Levy changes; emails who is signed up');
      add(4, 'tl_health', 'Hub health', r.health, r.health ? 'Things to look at' : 'Safety breakers, email, daily checks');
      if (!b.length) { el.innerHTML = '<p class="muted">Your admin level doesn\'t include any Hub tools.</p>'; return; }
      el.innerHTML = b.join('');
      on('#tl_review', 'click', function () { toolReview(); });
      on('#tl_family', 'click', toolFamily);
      on('#tl_logs', 'click', toolLogs);
      on('#tl_noshows', 'click', toolNoShows);
      on('#tl_sheets', 'click', toolSheets);
      on('#tl_walkin', 'click', toolWalkIn);
      on('#tl_cancel', 'click', toolCancel);
      on('#tl_health', 'click', toolHealth);
    }).catch(function (e) {
      if (/expired|sign in with google/i.test(e.message)) return adminFail(e);
      el.innerHTML = '<p class="muted">Hub tools aren\'t available on this Hub yet.</p>';   // an older Hub without section 34
    });
  }
  // --- paperwork review
  var REV = null;
  function toolReview(flash) {
    adminUrl({ tool: 'review' }); spinner('Loading paperwork to review…');
    call('adminDocQueue', adminReq({})).then(function (r) {
      REV = r;
      var o = toolHead('Paperwork to review', r.docs.length + ' waiting, oldest first. The volunteer sees your decision (and the reason) on their page.');
      o += '<div class="card">' + (r.docs.length ? r.docs.map(function (x, i) {
        return '<button class="hit rv" data-i="' + i + '"><b>' + esc(x.person) + '</b>' + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
          '<div class="small muted">' + esc(x.type || 'Type not set') + ' · ' + esc(x.source) + ' · ' + esc(x.added) + '</div></button>';
      }).join('') : '<p class="muted">Nothing waiting. Nice.</p>') + '</div>';
      h(o + footer()); toolWire(); if (flash) toolMsg(flash);
      on('.rv', 'click', function () { toolReviewOne(Number(this.getAttribute('data-i'))); });
    }).catch(adminFail);
  }
  function toolReviewOne(i) {
    var x = REV.docs[i]; if (!x) return toolReview();
    adminUrl({ tool: 'review' });
    var types = REV.types.map(function (t) { return '<option' + (t === x.type ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    var o = toolHead(x.person, esc(x.source) + ' · received ' + esc(x.added) + (x.note ? '<br>' + esc(x.note) : ''));
    o += '<div class="card"><h2>The file</h2>' + (x.files.length ? x.files.map(function (f) { return '<button class="btn rf" data-n="' + f.n + '">Show file' + (x.files.length > 1 ? ' ' + f.n : '') + '</button>'; }).join('') : '<p class="err">No file came with this one.</p>') +
      '<div id="rprev" style="margin-top:8px"></div></div>' +
      '<div class="card"><h2>Check the details</h2><label class="small">Document type<select id="rtype"><option value="">Pick…</option>' + types + '</select></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="small">Date (signed or completed)<input type="date" id="rdate" value="' + esc(x.date) + '"></label>' +
      '<label class="small">Expires<input type="date" id="rexp" value="' + esc(x.expires) + '"></label></div>' +
      '<label class="small">Permit number (ATC permit only)<input id="rnum" value="' + esc(x.number) + '" placeholder="VB…"></label>' +
      '<p class="small muted">Levy documents get Levy\'s contract date if Expires is blank.</p>' +
      '<button class="btn primary" id="rok" style="background:#15803d;border-color:#15803d">OK: it counts</button>' +
      '<label class="small" style="display:block;margin-top:12px">Reason (needed for Needs fix or Rejected; the volunteer sees it)<textarea id="rwhy" maxlength="300" placeholder="Signature missing on page 8"></textarea></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" id="rfix">Needs fix</button><button class="btn" id="rrej" style="color:#b91c1c;border-color:#b91c1c">Rejected</button></div>' +
      '<p id="rmsg" class="small"></p>' + (i + 1 < REV.docs.length ? '<button class="btn sm" id="rskip" style="margin-top:6px">Skip to the next one</button>' : '') + '</div>';
    h(o + footer()); wireAdminBar(); on('#tback', 'click', function () { toolReview(); });
    on('.rf', 'click', function () {
      var b = this, pv = document.getElementById('rprev'); b.disabled = true; pv.innerHTML = '<div class="spin"></div>';
      call('adminDocFile', adminReq({ id: x.id, n: Number(b.getAttribute('data-n')) })).then(function (f) {
        b.disabled = false;
        if (f.big) { pv.innerHTML = '<p class="small">Too big to show here. <a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open it in Drive</a></p>'; return; }
        var bin = atob(f.data), u8 = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        var url = URL.createObjectURL(new Blob([u8], { type: f.mime }));
        pv.innerHTML = (/^image\//.test(f.mime) ? '<img src="' + url + '" style="width:100%;border:1px solid #e2e8f0;border-radius:8px">' :
          /pdf/.test(f.mime) ? '<iframe src="' + url + '" style="width:100%;height:70vh;border:1px solid #e2e8f0;border-radius:8px"></iframe>' : '') +
          '<p class="small"><a href="' + url + '" target="_blank" rel="noopener">Open full size</a> · <a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open in Drive</a> · ' + esc(f.name) + '</p>';
      }).catch(function (e) { b.disabled = false; pv.innerHTML = ''; toolErr(document.getElementById('rmsg'), e); });
    });
    var send = function (act, btn) {
      var m = document.getElementById('rmsg'); m.className = 'small'; m.textContent = 'Saving…'; btn.disabled = true;
      call('adminDocReview', adminReq({ id: x.id, review: act, reason: document.getElementById('rwhy').value, type: document.getElementById('rtype').value,
        date: document.getElementById('rdate').value, expires: document.getElementById('rexp').value, number: document.getElementById('rnum').value })).then(function (r) {
        REV.docs.splice(i, 1);
        var t = x.person + ': ' + (x.type || document.getElementById('rtype').value) + ' marked ' + r.word + '.';
        if (REV.docs[i]) { toolReviewOne(i); toolMsg(t); } else if (REV.docs.length) { toolReviewOne(0); toolMsg(t); } else toolReview(t);
      }).catch(function (e) { btn.disabled = false; toolErr(m, e); });
    };
    on('#rok', 'click', function () { send('ok', this); });
    on('#rfix', 'click', function () { send('fix', this); });
    on('#rrej', 'click', function () { send('rejected', this); });
    on('#rskip', 'click', function () { toolReviewOne(i + 1); });
  }
  // --- family manager requests
  function toolFamily(flash) {
    adminUrl({ tool: 'family' }); spinner('Loading requests…');
    call('adminFamily', adminReq({})).then(function (r) {
      var o = toolHead('Family manager requests', 'A family manager will decide how the family\'s share of volunteer credit is split between their students when payouts start. One per family.');
      o += '<div class="card">' + (r.requests.length ? r.requests.map(function (x) {
        return '<div class="hrow" style="flex-wrap:wrap"><span><b>' + esc(x.name) + '</b><div class="small muted">' + esc(x.email) + '</div><div class="small">Students: ' + esc(x.students || '(none listed)') + '</div>' +
          '<div class="small muted">' + esc(x.request) + '</div></span><span style="display:flex;gap:6px"><button class="btn sm primary fy" data-p="' + esc(x.pid) + '">Approve</button>' +
          '<button class="btn sm fn" data-p="' + esc(x.pid) + '">Decline</button></span></div>';
      }).join('') : '<p class="muted">No open requests.</p>') + '<p id="fmsg" class="small"></p></div>';
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      var go = function (pid, yes, btn) {
        btn.disabled = true;
        call('adminFamilyDo', adminReq({ pid: pid, approve: yes })).then(function (x) { toolFamily(x.text); })
          .catch(function (e) { btn.disabled = false; toolErr(document.getElementById('fmsg'), e); });
      };
      on('.fy', 'click', function () { go(this.getAttribute('data-p'), true, this); });
      on('.fn', 'click', function () { var b = this; twoTap(b, 'Tap again to decline', function () { go(b.getAttribute('data-p'), false, b); }); });
    }).catch(adminFail);
  }
  // --- cancel a stand or game
  function toolCancel(flash) {
    adminUrl({ tool: 'cancel' }); spinner('Loading games…');
    call('adminCancelOptions', adminReq({})).then(function (r) {
      var o = toolHead('Cancel a stand or game', 'Canceled shifts are logged as Excused, so they never count against anyone.');
      o += '<div class="card"><label class="small">Game<select id="cg"><option value="">Pick a game…</option>' + r.games.map(function (g, i) { return '<option value="' + i + '">' + esc(g.label) + '</option>'; }).join('') + '</select></label>' +
        '<div id="cst"></div></div>';
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      on('#cg', 'change', function () {
        var g = r.games[Number(this.value)], box = document.getElementById('cst'); if (!g) { box.innerHTML = ''; return; }
        box.innerHTML = '<p class="small muted" style="margin-top:10px">Pick the stands. Pick them all to cancel the whole game.</p>' + g.stands.map(function (s) {
          return '<label class="chk"><input type="checkbox" class="cx" value="' + esc(s.id) + '"' + (s.canceled ? ' data-c="1"' : '') + '> <b>' + esc(s.name) + '</b> <span class="small muted">' +
            (s.chair ? 'lead ' + esc(s.chair) + ' · ' : '') + s.workers + ' worker' + (s.workers === 1 ? '' : 's') + (s.canceled ? ' · <span class="err">canceled</span>' : '') + '</span></label>';
        }).join('') +
          '<label class="small">Reason<select id="cr"><option value="">Pick…</option>' + r.reasons.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
          '<label class="small">Note (optional; goes in the email)<input id="cn" maxlength="200"></label>' +
          '<label class="chk"><input type="checkbox" id="cm" checked> Email the people signed up</label>' +
          '<button class="btn danger" id="cgo" style="width:100%">Cancel the checked stands</button>' +
          '<button class="btn" id="crs">Reinstate the checked stands</button><p id="cmsg" class="small" style="white-space:pre-line"></p>';
        var ids = function () { return Array.prototype.map.call(root.querySelectorAll('.cx:checked'), function (c) { return c.value; }); };
        var run = function (restore, btn) {
          var m = document.getElementById('cmsg'); m.className = 'small'; m.textContent = 'Working…'; btn.disabled = true;
          call('adminCancel', adminReq({ p: { ids: ids(), reason: document.getElementById('cr').value, note: document.getElementById('cn').value, notify: document.getElementById('cm').checked, restore: restore } }))
            .then(function (x) { toolCancel(x.text); }).catch(function (e) { btn.disabled = false; toolErr(m, e); });
        };
        on('#cgo', 'click', function () { var b = this; if (!ids().length) return toolErr(document.getElementById('cmsg'), new Error('Check at least one stand.')); twoTap(b, 'Tap again to cancel ' + ids().length + ' stand(s)', function () { run(false, b); }); });
        on('#crs', 'click', function () { var b = this; if (!ids().length) return toolErr(document.getElementById('cmsg'), new Error('Check at least one stand.')); twoTap(b, 'Tap again to reinstate', function () { run(true, b); }); });
      });
    }).catch(adminFail);
  }
  // --- send stand sheets
  function toolSheets(flash) {
    adminUrl({ tool: 'sheets' }); spinner('Loading stands…');
    call('adminSheetList', adminReq({})).then(function (r) {
      var o = toolHead('Send stand sheets', 'Emails each stand lead their stand link and a printable sign-in sheet. Stands with no lead send each worker their own time log link. The Hub also sends these on its own schedule; use this to send early or again.');
      var day = '';
      o += '<div class="card">' + (r.stands.length ? r.stands.map(function (x) {
        var hd = x.when !== day ? '<div class="small muted" style="margin-top:8px"><b>' + esc(x.when) + '</b></div>' : ''; day = x.when;
        return hd + '<label class="chk"><input type="checkbox" class="sx" value="' + esc(x.id) + '"> <b>' + esc(x.stand) + '</b>' + (x.start ? ' ' + esc(x.start) : '') +
          '<div class="small muted" style="margin-left:24px">To ' + esc(x.to) + ' · ' + esc(x.status || 'Not sent') + '</div></label>';
      }).join('') + '<button class="btn primary" id="sgo">Send the checked stand sheets</button>' : '<p class="muted">No upcoming stands.</p>') + '<p id="smsg" class="small"></p></div>';
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      on('#sgo', 'click', function () {
        var b = this, ids = Array.prototype.map.call(root.querySelectorAll('.sx:checked'), function (c) { return c.value; }), m = document.getElementById('smsg');
        if (!ids.length) return toolErr(m, new Error('Check at least one stand.'));
        twoTap(b, 'Tap again to email ' + ids.length + ' stand sheet(s)', function () {
          b.disabled = true; m.className = 'small'; m.textContent = 'Sending…';
          call('adminSheetSend', adminReq({ ids: ids })).then(function (x) { toolSheets(x.text); }).catch(function (e) { b.disabled = false; toolErr(m, e); });
        });
      });
    }).catch(adminFail);
  }
  // --- add a worker by hand
  function toolWalkIn(flash) {
    adminUrl({ tool: 'walkin' }); spinner('Loading stands…');
    call('adminWalkInStands', adminReq({})).then(function (r) {
      var o = toolHead('Add a worker by hand', 'For someone working a stand who isn\'t signed up. They go on the stand\'s list and are matched to their volunteer record (or added as new).');
      o += '<div class="card"><label class="small">Stand<select id="ws">' + (r.stands.length ? r.stands.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.label) + '</option>'; }).join('') : '<option value="">No current stands</option>') + '</select></label>' +
        '<label class="small">Full name<input id="wn" maxlength="80"></label><label class="small">Email (needed for their own time log link)<input id="we" type="email"></label>' +
        '<label class="small">Phone (optional)<input id="wp" type="tel"></label>' +
        '<label class="small">Role<select id="wr"><option value="Permit">Adult with permit</option><option value="No permit">No permit (adult or student)</option><option value="Chair">Stand lead</option></select></label>' +
        '<label class="small">Hours count for (student\'s full name or General fund; optional)<input id="wc" maxlength="80"></label>' +
        '<button class="btn primary" id="wgo">Add worker</button><p id="wmsg" class="small"></p></div>';
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      on('#wgo', 'click', function () {
        var b = this, m = document.getElementById('wmsg'), v = function (i) { return document.getElementById(i).value; };
        b.disabled = true; m.className = 'small'; m.textContent = 'Adding…';
        call('adminWalkIn', adminReq({ w: { id: v('ws'), name: v('wn'), email: v('we'), phone: v('wp'), role: v('wr'), credit: v('wc') } }))
          .then(function (x) { toolWalkIn(x.text); }).catch(function (e) { b.disabled = false; toolErr(m, e); });
      });
    }).catch(adminFail);
  }
  // --- approve stand logs
  function toolLogs(flash) {
    adminUrl({ tool: 'logs' }); spinner('Loading time sheets…');
    call('adminLogStands', adminReq({})).then(function (r) {
      var o = toolHead('Approve stand logs', 'Submitted time sheets waiting to go into the hours database. Check each line against the sign-in photo. Flagged lines need a reason. No-shows go to No-show decisions instead of the database.');
      if (!r.stands.length) o += '<div class="card"><p class="muted">Nothing waiting.</p></div>';
      r.stands.forEach(function (g, gi) {
        o += '<div class="card"><h2>' + esc(g.stand) + ' · ' + esc(g.date) + '</h2><div class="small muted">' + esc(g.status || '') + (g.by ? ' · sent by ' + esc(g.by) : '') + '</div>' +
          (g.photos.length ? '<div class="small">' + g.photos.map(function (u, k) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">Sign-in sheet photo' + (g.photos.length > 1 ? ' ' + (k + 1) : '') + '</a>'; }).join(' · ') + '</div>' : '<div class="small err">No sign-in sheet photo</div>');
        g.lines.forEach(function (x) {
          o += '<div style="border-top:1px solid #e2e8f0;padding:8px 0"><label class="chk" style="padding:0"><input type="checkbox" class="lg" data-g="' + gi + '" value="' + esc(x.id) + '"' + (x.two ? ' disabled' : ' checked') + '> <b>' + esc(x.worker) + '</b> ' +
            (x.worked === 'Worked' ? esc(x.tin) + '–' + esc(x.tout) + ' · ' + x.hours + ' h' : '<span class="err">' + esc(x.worked || 'No-show') + '</span>') + '</label>' +
            '<div class="small muted" style="margin-left:24px">For ' + esc(x.student || x.credit || '(no student)') + (x.program ? ' · ' + esc(x.program) : '') + '</div>' +
            (x.two ? '<div class="small err" style="margin-left:24px">Names more than one student (' + esc(x.credit) + '). Fix "Credit to" on the Stand Log tab first.</div>' : '') +
            (x.flags && !x.two ? '<div class="small" style="margin-left:24px;color:#b45309">Flags: ' + esc(x.flags) + (x.early ? ' · early start ' + esc(x.early) : '') + '</div>' +
              '<input class="lr" data-id="' + esc(x.id) + '" placeholder="Why is this OK? (saved as the approval reason)" value="' + esc(x.reason) + '" style="margin-left:24px;width:calc(100% - 24px)">' : '') + '</div>';
        });
        o += '<button class="btn primary lgo" data-g="' + gi + '">Approve the checked lines</button><p class="small lmsg" data-g="' + gi + '"></p></div>';
      });
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      on('.lgo', 'click', function () {
        var b = this, gi = b.getAttribute('data-g'), m = root.querySelector('.lmsg[data-g="' + gi + '"]'), reasons = {};
        var ids = Array.prototype.map.call(root.querySelectorAll('.lg[data-g="' + gi + '"]:checked'), function (c) { return c.value; });
        Array.prototype.forEach.call(root.querySelectorAll('.lr'), function (i) { if (i.value.trim()) reasons[i.getAttribute('data-id')] = i.value.trim(); });
        if (!ids.length) return toolErr(m, new Error('Check at least one line.'));
        twoTap(b, 'Tap again to send ' + ids.length + ' line(s) to the hours database', function () {
          b.disabled = true; m.className = 'small'; m.textContent = 'Approving…';
          call('adminLogApprove', adminReq({ ids: ids, reasons: reasons })).then(function (x) {
            toolLogs(x.added + ' shift(s) added to the hours database' + (x.skipped ? ', ' + x.skipped + ' no-show(s) sent to No-show decisions' : '') + '.' +
              (x.left ? ' ' + x.left + ' line(s) were not approved (a flag with no reason, or two students named).' : '') + (x.notes.length ? ' ' + x.notes.join(' ') : ''));
          }).catch(function (e) { b.disabled = false; toolErr(m, e); });
        });
      });
    }).catch(adminFail);
  }
  // --- no-show decisions
  function toolNoShows(flash) {
    adminUrl({ tool: 'noshows' }); spinner('Loading no-shows…');
    call('adminNoShows', adminReq({})).then(function (r) {
      var o = toolHead('No-show decisions', 'A stand lead marked these people as no-shows. NCNS (no call, no show) counts toward the limit of ' + r.limit + ' (' + esc(r.window) + ') and emails them. Excused never counts. Mistake means they did work.');
      o += '<div class="card">' + (r.items.length ? r.items.map(function (x) {
        return '<div style="border-top:1px solid #e2e8f0;padding:8px 0"><b>' + esc(x.worker) + '</b> <span class="small muted">' + esc(x.stand) + ' · ' + esc(x.date) + (x.by ? ' · marked by ' + esc(x.by) : '') + '</span>' +
          (x.note ? '<div class="small muted">' + esc(x.note) + '</div>' : '') +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><select class="nd" data-id="' + esc(x.id) + '">' + r.decisions.map(function (d) { return '<option' + (d === x.decision ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>' +
          '<input class="nn" data-id="' + esc(x.id) + '" placeholder="Note (optional)" value="' + esc(x.dnote) + '"></div></div>';
      }).join('') : '<p class="muted">No open no-shows.</p>') + '</div>' +
        '<div class="card"><h2>What recording will do</h2><p id="npv" class="small" style="white-space:pre-line">' + esc(r.preview || 'Nothing new decided yet.') + '</p>' +
        '<button class="btn primary" id="ngo"' + (r.preview ? '' : ' disabled') + '>Record these decisions</button><p id="nmsg" class="small" style="white-space:pre-line"></p></div>';
      h(o + footer()); toolWire(); if (typeof flash === 'string') toolMsg(flash);
      var save = function () {
        var id = this.getAttribute('data-id'), sel = root.querySelector('.nd[data-id="' + id + '"]'), nt = root.querySelector('.nn[data-id="' + id + '"]'), m = document.getElementById('nmsg');
        m.className = 'small'; m.textContent = 'Saving…';
        call('adminNoShowSet', adminReq({ id: id, decision: sel.value, note: nt.value })).then(function (x) {
          m.textContent = ''; document.getElementById('npv').textContent = x.preview || 'Nothing new decided yet.'; document.getElementById('ngo').disabled = !x.preview;
        }).catch(function (e) { toolErr(m, e); });
      };
      on('.nd', 'change', save); on('.nn', 'change', save);
      on('#ngo', 'click', function () {
        var b = this, m = document.getElementById('nmsg');
        twoTap(b, 'Tap again to record (NCNS emails go out)', function () {
          b.disabled = true; m.className = 'small'; m.textContent = 'Recording…';
          call('adminNoShowRecord', adminReq({})).then(function (x) { toolNoShows(x.text); }).catch(function (e) { b.disabled = false; toolErr(m, e); });
        });
      });
    }).catch(adminFail);
  }
  // --- Hub health
  function toolHealth() {
    adminUrl({ tool: 'health' }); spinner('Checking the Hub…');
    call('adminHealth', adminReq({})).then(function (r) {
      var o = toolHead('Hub health', 'Read only. Fixes (resetting the email breaker, approving held changes) stay in the Hub spreadsheet: Admin › Health check + safety breakers.');
      o += '<div class="card"><div class="hrow"><span>Mode</span><b>' + esc(r.mode || '?') + '</b></div>' +
        '<div class="hrow"><span>Email breaker</span><b class="' + (r.breaker ? 'err' : 'ok') + '">' + esc(r.breaker || 'off (normal)') + '</b></div>' +
        '<div class="hrow"><span>Held big changes</span><b>' + r.held + '</b></div>' +
        '<div class="hrow"><span>Emails left today (Google)</span><b>' + (r.quota == null ? '?' : r.quota) + '</b></div></div>' +
        '<div class="card"><h2>Health check</h2>' + (r.issues.length ? '<ol style="padding-left:20px">' + r.issues.map(function (x) { return '<li style="margin-bottom:6px">' + esc(x) + '</li>'; }).join('') + '</ol>' : '<p class="ok">All clear.</p>') + '</div>';
      h(o + footer()); toolWire();
    }).catch(adminFail);
  }
  // --- one volunteer: fix name, email their code, new code (on their admin page)
  function toolPersonCard(a) {
    if (!a || !a.pid || !TOOLS || (TOOLS.level || 4) < 2) return '';
    return '<div class="card wide"><h2>More for this volunteer</h2>' +
      '<button class="btn" id="vname">Fix their name</button><div id="vnbox" style="display:none">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="small">First (legal)<input id="vf" value="' + esc(a.first) + '"></label><label class="small">Last<input id="vl" value="' + esc(a.last) + '"></label></div>' +
      '<label class="small">Goes by (optional)<input id="vg" value="' + esc(a.goesBy) + '"></label><button class="btn primary" id="vnsave">Save the name</button>' +
      '<p class="small muted">Their folder and files are renamed too, and the old name is kept under Also appears as.</p></div>' +
      '<button class="btn" id="vcode">Email them their code</button>' +
      '<button class="btn" id="vreset">Give them a new code</button><label class="chk"><input type="checkbox" id="vremail" checked> Email the new code to them</label>' +
      '<p class="small muted">A new code stops their old code and links right away. Use it if someone else got hold of theirs.</p><p id="vmsg" class="small"></p></div>';
  }
  function toolPersonWire(a) {
    if (!document.getElementById('vname')) return;
    var m = function () { return document.getElementById('vmsg'); }, pid = a.pid;
    on('#vname', 'click', function () { var x = document.getElementById('vnbox'); x.style.display = x.style.display === 'none' ? '' : 'none'; });
    on('#vnsave', 'click', function () {
      var b = this; b.disabled = true; m().className = 'small'; m().textContent = 'Saving…';
      call('adminFixName', adminReq({ pid: pid, first: document.getElementById('vf').value, last: document.getElementById('vl').value, goesBy: document.getElementById('vg').value }))
        .then(function (x) { b.disabled = false; m().className = 'small ok'; m().textContent = x.text; }).catch(function (e) { b.disabled = false; toolErr(m(), e); });
    });
    on('#vcode', 'click', function () {
      var b = this; twoTap(b, 'Tap again to email their code', function () {
        b.disabled = true; m().className = 'small'; m().textContent = 'Sending…';
        call('adminSendCode', adminReq({ pid: pid })).then(function (x) { b.disabled = false; m().className = 'small ok'; m().textContent = x.text; }).catch(function (e) { b.disabled = false; toolErr(m(), e); });
      });
    });
    on('#vreset', 'click', function () {
      var b = this; twoTap(b, 'Tap again: their old code stops working', function () {
        b.disabled = true; m().className = 'small'; m().textContent = 'Working…';
        call('adminResetCode', adminReq({ pid: pid, email: document.getElementById('vremail').checked })).then(function (x) { b.disabled = false; m().className = 'small ok'; m().textContent = x.text; }).catch(function (e) { b.disabled = false; toolErr(m(), e); });
      });
    });
  }
  // ---------- admin: Manage stands (section 32 on the Hub). The Manage stands dialog from the Hub spreadsheet, for phones.
  // Create a Hub game, add stands and positions (or start from a saved layout), set open / lock, notes; edit or delete it later.
  // The Hub refuses changes that would strand people already signed up.
  var MS = null;
  function msCss() {
    if (document.getElementById('mscss')) return;
    var s = document.createElement('style'); s.id = 'mscss';
    s.textContent = '.ms2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ms2 label,.mslab{display:block;font-size:13px;color:#475569;margin-top:8px}' +
      '.msst{border:1px solid #cbd5e1;border-radius:10px;padding:10px;margin:12px 0;background:#f8fafc}.msst .hd{display:flex;gap:6px;align-items:center}' +
      '.msst .code{width:80px;text-transform:uppercase;font-weight:700;margin:0}.msst .tpl{margin:0;flex:1}.msx{border:0;background:none;color:#b91c1c;font-size:20px;padding:0 6px;cursor:pointer}' +
      '.mspos{border-top:1px solid #e2e8f0;padding:8px 0 4px}.mspos .r1{display:flex;gap:6px;align-items:center}.mspos .n{margin:0;flex:1}.mspos .q{margin:0;width:64px}' +
      '.mspos .r2{display:flex;gap:14px;flex-wrap:wrap;font-size:14px;margin-top:4px}.mspos .r2 label{display:flex;align-items:center;gap:4px}.mspos .r2 input{width:auto;margin:0}' +
      '.mspos .tm{display:none;gap:6px;align-items:center;font-size:13px;margin-top:4px}.mspos .tm.on{display:flex}.mspos .tm input{margin:0}' +
      '.msck{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:15px}.msck input{width:auto;margin:0}' +
      '.msfoot{position:sticky;bottom:0;background:#fff;border-top:1px solid #e2e8f0;padding:10px 12px;margin:0 -12px -12px;border-radius:0 0 12px 12px}' +
      '.mssv{display:none;gap:6px;margin-top:6px}.mssv.on{display:flex}.mssv input{margin:0}';
    document.head.appendChild(s);
  }
  function msMin(t) { var m = String(t || '').match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  function msHm(m) { m = ((m % 1440) + 1440) % 1440; return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  function msQ(sel, el) { return (el || root).querySelector(sel); }
  function msAll(sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); }
  /** Open Manage stands. event/date (optional) opens that game for editing. */
  function adminManage(event, date, flash) {
    adminUrl({ ms: '1', ev: event || '', d: date || '' });
    state.page = 'Portal admin manage stands'; spinner('Loading Manage stands…');
    call('adminStandForm', adminReq({})).then(function (r) {
      MS = { data: r, orig: null }; msCss();
      var lockO = (r.lockOpts || []).map(function (h) { return '<option value="' + h + '">' + (h ? h + ' hours before start' : 'No lock') + '</option>'; }).join('');
      h(adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="msback">← Back</button><b>Manage stands</b><span></span></div>' +
        '<p class="small muted">Create a Hub game and its stands, or open one to change it. Every save is logged with your name.</p>' +
        '<select id="msgames"></select><button class="btn" id="msnew">+ New game</button>' +
        '<p id="msmode" style="font-weight:700;color:#0b2545;margin:12px 0 0"></p><p class="ok" id="msflash" style="font-weight:700"></p></div>' +
        '<div class="card"><h2>The game</h2><label class="mslab">Event name<input id="msev" maxlength="60" placeholder="IU Football vs Purdue"></label>' +
        '<label class="mslab">Game date<input type="date" id="msdt"></label>' +
        '<label class="msck"><input type="checkbox" id="mstbd"> Time TBD</label>' +
        '<div class="ms2"><label>Stands open<input type="time" id="msop" value="10:30"></label><label>Stands close<input type="time" id="mscl" value="16:00"></label></div>' +
        '<h2 style="margin-top:16px">Sign-up</h2><label class="msck"><input type="checkbox" id="msoa"> Open sign-up at a set time</label>' +
        '<input type="datetime-local" id="msgl" disabled>' +
        '<label class="mslab">Lock sign-up<select id="mslk">' + lockO + '</select></label>' +
        '<label class="mslab">Status<select id="msst"><option value="Auto">Auto (follow open and lock)</option><option value="Open">Open now</option><option value="Locked">Locked now</option></select></label>' +
        '<p class="small muted">Not set to open at a time = open as soon as you save. Lock = no new sign-ups or self-cancels after that (hand-offs still work). Status overrides both.</p>' +
        '<label class="mslab">Notes for this game (volunteers see them on the board)<textarea id="msnt" maxlength="5000" placeholder="Parking, where to check in, what to wear…"></textarea></label></div>' +
        '<div class="card"><h2>Stands</h2><p class="small muted" id="mshint"></p><datalist id="mspl"></datalist><div id="msstands"></div><button class="btn" id="msadd">+ Add stand</button>' +
        '<div class="msfoot"><div class="small" id="mssum" style="font-weight:700;color:#0b2545"></div><button class="btn primary" id="msgo"></button><p class="small" id="msmsg"></p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="mssend">Send updates now</button><button class="btn sm" id="msdel" style="color:#b91c1c;border-color:#b91c1c;display:none">Delete this game</button></div></div></div>' + footer());
      wireAdminBar();
      (r.positions || []).forEach(function (p) { var o = document.createElement('option'); o.value = p.name; msQ('#mspl').appendChild(o); });
      on('#msback', 'click', adminSearch);
      on('#msnew', 'click', function () { msNew(); });
      on('#msgames', 'change', function () { var i = this.value; if (i !== '') msLoad(MS.data.games[Number(i)]); });
      on('#mstbd', 'change', msTbd);
      on('#msoa', 'change', function () { msQ('#msgl').disabled = !this.checked; });
      on('#msop', 'focus', function () { this.setAttribute('data-prev', this.value); });
      on('#msop', 'change', msShift);
      on('#msadd', 'click', function () { msStand('', null, '', false); msTbd(); });
      on('#msgo', 'click', msSave); on('#mssend', 'click', msSend); on('#msdel', 'click', msDel);
      var hit = -1; (r.games || []).forEach(function (g, i) { if (event && g.event.toLowerCase() === String(event).replace(/^hub:\s*/i, '').toLowerCase() && g.date === date) hit = i; });
      if (hit >= 0) msLoad(r.games[hit]); else msNew();
      if (flash) msQ('#msflash').textContent = flash;
    }).catch(adminFail);
  }
  function msFillGames(sel) {
    var g = MS.data.games || [];
    msQ('#msgames').innerHTML = '<option value="">' + (g.length ? 'Open a Hub game…' : 'No Hub games yet') + '</option>' +
      g.map(function (x, i) { return '<option value="' + i + '">' + esc(x.label) + '</option>'; }).join('');
    msQ('#msgames').value = sel == null ? '' : String(sel);
  }
  function msMode() {
    var o = MS.orig;
    msQ('#msmode').textContent = o ? 'Editing ' + o.label : 'New game';
    msQ('#msgo').textContent = o ? 'Save changes' : 'Create the game';
    msQ('#msdel').style.display = o ? '' : 'none'; msDisarm();
    msQ('#mshint').textContent = o ? 'Saving rewrites changed positions and deletes stands you removed. People already signed up are protected: their position can grow but not shrink below them, and the name and date can\'t change.'
      : 'Each stand gets a short code (like 1W or SE) and its positions. Start from layout fills in a saved set of positions.';
  }
  function msNew() {
    MS.orig = null; msQ('#msstands').innerHTML = ''; msQ('#msmsg').textContent = '';
    msQ('#msev').value = ''; msQ('#msdt').value = ''; msQ('#msop').value = '10:30'; msQ('#mscl').value = '16:00'; msQ('#mstbd').checked = false;
    msQ('#msoa').checked = false; msQ('#msgl').value = ''; msQ('#msgl').disabled = true; msQ('#mslk').value = String(MS.data.lockDefault); msQ('#msst').value = 'Auto'; msQ('#msnt').value = '';
    msFillGames(); msStand('', null, '', true); msTbd(); msMode(); adminUrl({ ms: '1' });
  }
  function msLoad(g) {
    MS.orig = { event: g.event, date: g.date, codes: g.stands.map(function (s) { return s.code; }), label: g.label };
    msQ('#msstands').innerHTML = ''; msQ('#msmsg').textContent = '';
    msQ('#msev').value = g.event; msQ('#msdt').value = g.date; msQ('#msop').value = g.opens; msQ('#mscl').value = g.closes; msQ('#mstbd').checked = !!g.tbd;
    msQ('#msoa').checked = !!g.goesLive; msQ('#msgl').value = g.goesLive || ''; msQ('#msgl').disabled = !g.goesLive;
    msQ('#mslk').value = String(g.lockHours === '' || g.lockHours == null ? MS.data.lockDefault : g.lockHours); msQ('#msst').value = g.status || 'Auto'; msQ('#msnt').value = g.notes || '';
    g.stands.forEach(function (s) { msStand(s.code, s.positions, (g.standNotes || {})[s.code] || '', true); });
    var i = MS.data.games.indexOf(g); msFillGames(i >= 0 ? i : null);
    msTbd(); msMode(); msSum(); adminUrl({ ms: '1', ev: g.event, d: g.date });
  }
  function msTbd() {
    var t = msQ('#mstbd').checked; msQ('#msop').disabled = t; msQ('#mscl').disabled = t;
    msAll('.msst .df').forEach(function (c) { c.disabled = t; if (t) { c.checked = false; c.closest('.mspos').querySelector('.tm').classList.remove('on'); } });
  }
  function msShift() {   // positions with their own time move with the stand open time
    var e = msQ('#msop'), a = msMin(e.getAttribute('data-prev')), b = msMin(e.value); e.setAttribute('data-prev', e.value);
    if (a == null || b == null || a === b) return; var d = b - a;
    msAll('.mspos').forEach(function (p) {
      if (!p.querySelector('.df').checked) return;
      ['.ts', '.te'].forEach(function (c) { var x = p.querySelector(c), m = msMin(x.value); if (m != null) x.value = msHm(m + d); });
    });
    msMsg('Positions with their own times moved ' + (d > 0 ? d + ' min later' : (-d) + ' min earlier') + ' with the stand.', 'ok');
  }
  function msTplOpts() {
    var T = MS.data.tpl || {};
    return '<option value="">Start from layout…</option>' + Object.keys(T).map(function (k) { return '<option value="' + esc(k) + '">' + esc(T[k].name) + '</option>'; }).join('');
  }
  function msStand(code, rows, note, quiet) {
    var s = document.createElement('div'); s.className = 'msst';
    s.innerHTML = '<div class="hd"><input class="code" maxlength="6" placeholder="1W" aria-label="Stand code"><select class="tpl">' + msTplOpts() + '</select>' +
      '<button class="msx sx" title="Remove this stand (deleted when you save)">✕</button></div><div class="list"></div>' +
      '<button class="btn sm pa" style="margin-top:6px">+ Add position</button>' +
      '<textarea class="snote" maxlength="1000" placeholder="Note for this stand (optional)" style="min-height:44px"></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:6px"><button class="btn sm cp">Copy stand</button><button class="btn sm sl">Save as layout</button></div>' +
      '<div class="mssv"><input class="svn" placeholder="Layout name" maxlength="40"><button class="btn sm svg">Save</button><button class="msx svx">✕</button></div>';
    msQ('#msstands').appendChild(s);
    var list = s.querySelector('.list'), c = s.querySelector('.code');
    c.value = code || ''; c.oninput = msSum; s.querySelector('.snote').value = note || '';
    s.querySelector('.tpl').onchange = function () {
      var k = this.value; if (!k) return; var op = msMin(msQ('#msop').value), tb = msQ('#mstbd').checked;
      list.innerHTML = '';
      MS.data.tpl[k].rows.forEach(function (r) {
        var x = { name: r.name, count: r.count, permit: r.permit, lead: r.lead };
        if (!tb && op != null && r.so != null && r.eo != null) { x.diff = true; x.start = msHm(op + r.so); x.end = msHm(op + r.eo); }
        msPos(list, x);
      });
      this.value = ''; msTbd(); msSum();
    };
    s.querySelector('.sx').onclick = function () { s.remove(); msSum(); };
    s.querySelector('.pa').onclick = function () { msPos(list, {}).querySelector('.n').focus(); msTbd(); msSum(); };
    s.querySelector('.cp').onclick = function () { msStand('', msRows(list), s.querySelector('.snote').value, false); msTbd(); };
    var sv = s.querySelector('.mssv');
    s.querySelector('.sl').onclick = function () { sv.classList.add('on'); sv.querySelector('.svn').focus(); };
    s.querySelector('.svx').onclick = function () { sv.classList.remove('on'); };
    s.querySelector('.svg').onclick = function () {
      var n = sv.querySelector('.svn').value.trim(), b = this; if (!n) return msMsg('Name the layout first.', 'err');
      b.disabled = true;
      call('adminStandLayout', adminReq({ layout: { name: n, opens: msQ('#msop').value, tbd: msQ('#mstbd').checked, rows: msRows(list) } })).then(function (t) {
        b.disabled = false; MS.data.tpl = t; msAll('.msst .tpl').forEach(function (x) { x.innerHTML = msTplOpts(); }); sv.classList.remove('on');
        msMsg('Saved layout "' + n + '". It is in Start from layout on every stand now.', 'ok');
      }).catch(function (e) { b.disabled = false; if (/expired|sign in with google/i.test(e.message)) return adminFail(e); msMsg(e.message, 'err'); });
    };
    (rows && rows.length ? rows : [{ name: 'Chair', count: 1, lead: true }, { name: 'Cashier', count: 2 }]).forEach(function (r) { msPos(list, r); });
    if (!code && !quiet) c.focus();
    msSum(); return s;
  }
  function msPos(list, r) {
    var p = document.createElement('div'); p.className = 'mspos';
    p.innerHTML = '<div class="r1"><input class="n" list="mspl" maxlength="60" placeholder="Position" aria-label="Position"><input class="q" type="number" min="1" max="50" aria-label="People"><button class="msx px" title="Remove position">✕</button></div>' +
      '<div class="r2"><label><input type="checkbox" class="pm"> Permit</label><label><input type="checkbox" class="ld"> Lead</label><label><input type="checkbox" class="df"> Own time</label></div>' +
      '<div class="tm"><input type="time" class="ts"><span>to</span><input type="time" class="te"></div>';
    list.appendChild(p);
    var n = p.querySelector('.n'), q = p.querySelector('.q'), ld = p.querySelector('.ld'), df = p.querySelector('.df'), ts = p.querySelector('.ts'), te = p.querySelector('.te');
    n.value = r.name || ''; q.value = r.count || 1; p.querySelector('.pm').checked = !!r.permit; ld.checked = !!r.lead; df.checked = !!r.diff;
    ts.value = r.start || msQ('#msop').value || ''; te.value = r.end || msQ('#mscl').value || '';
    if (r.diff) p.querySelector('.tm').classList.add('on');
    ld.onchange = function () { if (ld.checked) list.querySelectorAll('.ld').forEach(function (x) { if (x !== ld) x.checked = false; }); };
    df.onchange = function () { p.querySelector('.tm').classList.toggle('on', df.checked); if (df.checked && !ts.value) { ts.value = msQ('#msop').value; te.value = msQ('#mscl').value; } };
    n.onchange = function () { var hit = (MS.data.positions || []).filter(function (x) { return x.name.toLowerCase() === n.value.trim().toLowerCase(); })[0]; if (hit && hit.lead && !ld.checked) { ld.checked = true; ld.onchange(); } };
    n.oninput = msSum; q.oninput = msSum;
    p.querySelector('.px').onclick = function () { p.remove(); msSum(); };
    return p;
  }
  function msRows(list) {
    return msAll('.mspos', list).map(function (p) {
      var d = p.querySelector('.df').checked;
      return { name: p.querySelector('.n').value.trim(), count: Number(p.querySelector('.q').value) || 0, permit: p.querySelector('.pm').checked, lead: p.querySelector('.ld').checked,
        diff: d, start: d ? p.querySelector('.ts').value : '', end: d ? p.querySelector('.te').value : '' };
    });
  }
  function msCollect() {
    var st = [], notes = {};
    msAll('.msst').forEach(function (s) {
      var code = s.querySelector('.code').value.trim().toUpperCase(), sn = s.querySelector('.snote').value.trim();
      st.push({ code: code, positions: msRows(s.querySelector('.list')) }); if (code && sn) notes[code] = sn;
    });
    var v = function (id) { return msQ(id).value.trim(); }, o = MS.orig;
    return { event: v('#msev'), date: v('#msdt'), opens: v('#msop'), closes: v('#mscl'), tbd: msQ('#mstbd').checked, openAt: msQ('#msoa').checked, goesLive: msQ('#msoa').checked ? v('#msgl') : '',
      lockHours: msQ('#mslk').value, status: msQ('#msst').value, notes: msQ('#msnt').value, standNotes: notes, stands: st,
      orig: o ? { event: o.event, date: o.date, codes: o.codes } : null };
  }
  function msSum() {
    var d = msCollect(), np = 0, seats = 0, codes = {};
    d.stands.forEach(function (s) { codes[s.code] = 1; s.positions.forEach(function (p) { if (p.name) { np++; seats += p.count; } }); });
    var gone = MS.orig ? MS.orig.codes.filter(function (c) { return !codes[c]; }) : [];
    msQ('#mssum').textContent = d.stands.length + ' stand' + (d.stands.length === 1 ? '' : 's') + ' · ' + np + ' position' + (np === 1 ? '' : 's') + ' · ' + seats + ' seats' +
      (gone.length ? ' · will delete ' + gone.join(', ') : '');
  }
  function msMsg(t, c) { var m = msQ('#msmsg'); if (!m) return; m.textContent = t; m.className = 'small ' + (c || ''); }
  function msBusy(b) { ['#msgo', '#msdel', '#mssend'].forEach(function (s) { msQ(s).disabled = b; }); }
  function msSave() {
    msBusy(true); msMsg('Saving…'); msQ('#msflash').textContent = '';
    call('adminStandSave', adminReq({ game: msCollect() })).then(function (r) {
      var t = r.event + ': ' + r.added + ' positions saved, ' + r.seats + ' seats';
      if (r.deleted) t += ', ' + r.deleted + ' old rows removed';
      if (r.promoted) t += '. ' + r.promoted + ' moved up from the waitlist';
      if (r.notified) t += '. ' + r.notified + ' signed-up shift' + (r.notified === 1 ? '' : 's') + ' got new times; their emails go out in ' + MS.data.updateWait + ' min, or tap Send updates now';
      MS.data.games = r.games || MS.data.games; msBusy(false);
      var g = MS.data.games.filter(function (x) { return x.event.toLowerCase() === String(r.eventName).toLowerCase() && x.date === r.date; })[0];
      if (g) msLoad(g); else msNew();
      msQ('#msflash').textContent = t + '.'; window.scrollTo(0, 0);
    }).catch(function (e) { msBusy(false); if (/expired|sign in with google/i.test(e.message)) return adminFail(e); msMsg(e.message, 'err'); });
  }
  function msSend() {
    msBusy(true); msMsg('Sending queued updates…');
    call('adminStandSendNow', adminReq({})).then(function (n) { msBusy(false); msMsg(n ? n + ' update email' + (n === 1 ? '' : 's') + ' sent.' : 'Nothing was waiting to send.', 'ok'); })
      .catch(function (e) { msBusy(false); if (/expired|sign in with google/i.test(e.message)) return adminFail(e); msMsg(e.message, 'err'); });
  }
  var msArm = null;
  function msDisarm() { var b = msQ('#msdel'); if (!b) return; b.classList.remove('danger'); b.style.color = '#b91c1c'; b.textContent = 'Delete this game'; clearTimeout(msArm); }
  function msDel() {
    var b = msQ('#msdel');
    if (!b.classList.contains('danger')) { b.classList.add('danger'); b.style.color = '#fff'; b.textContent = 'Tap again to delete ' + MS.orig.label; msArm = setTimeout(msDisarm, 5000); return; }
    msDisarm(); msBusy(true); msMsg('Deleting…');
    var lbl = MS.orig.label;
    call('adminStandDelete', adminReq({ event: MS.orig.event, date: MS.orig.date })).then(function (r) {
      MS.data.games = r.games || []; msBusy(false); msNew(); msQ('#msflash').textContent = 'Deleted ' + lbl + ' (' + r.deleted + ' positions).'; window.scrollTo(0, 0);
    }).catch(function (e) { msBusy(false); if (/expired|sign in with google/i.test(e.message)) return adminFail(e); msMsg(e.message, 'err'); });
  }
  // ---------- admin: Hub game rosters (section 24d on the Hub). Move / Remove / Add / Hand off; every action is stamped and logged.
  function adminHubList() {
    var el = document.getElementById('hubgames'); if (!el) return;
    homeCall('adminHubGames').then(function (r) {
      adminLevelSet(r);
      state.canManage = !!r.manage && adminLevel() >= 3;   // Hubs with section 32 (Manage stands in the admin view); Manager and up
      var mb = state.canManage ? '<button class="btn primary" id="mstands" style="margin:0 0 8px">Manage stands: create or edit a Hub game</button>' : '';
      if (!r.games.length) { el.innerHTML = mb + '<p class="muted">No upcoming Hub games.</p>'; on('#mstands', 'click', function () { adminManage(); }); return; }
      el.innerHTML = mb + r.games.map(function (g) {
        return '<div class="hrow"><span><b>' + esc(g.name) + '</b><div class="small muted">' + esc(g.day) + ' · ' + g.f + ' of ' + g.q + ' filled · ' +
          ({ open: 'open', locked: 'locked', notyet: 'not open yet' }[g.state] || g.state) + (g.canceled ? ' · ' + g.canceled + ' stand(s) canceled' : '') + '</div></span>' +
          '<button class="btn sm rost" data-src="' + esc(g.src) + '" data-date="' + esc(g.date) + '">Roster</button></div>';
      }).join('');
      on('.rost', 'click', function () { adminRoster(this.getAttribute('data-src'), this.getAttribute('data-date')); });
      on('#mstands', 'click', function () { adminManage(); });
    }).catch(function (e) { if (/expired|sign in with google/i.test(e.message)) return adminFail(e); el.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  // ---------- admin: SignUp.com games (section 29 on the Hub). Read only: who is on each stand, plus Reach out.
  function adminSuList() {
    var el = document.getElementById('sugames'); if (!el) return;
    homeCall('adminSuGames').then(function (r) {
      if (!r.games.length) { el.innerHTML = '<p class="muted">No SignUp.com games from the last 2 days on.</p>'; return; }
      var show = function (all) {
        var list = all ? r.games : r.games.slice(0, 8), per = {}, seenDay = {};
        r.games.forEach(function (g) { per[g.date] = (per[g.date] || 0) + 1; });
        el.innerHTML = list.map(function (g) {
          var dayRow = '';
          if (per[g.date] > 1 && !seenDay[g.date]) {   // Nov 13: several games on one day (e.g. HS and JH football) -> one view for all of them
            seenDay[g.date] = 1;
            dayRow = '<div class="hrow" style="background:#eef2ff;border-radius:8px;padding:6px 8px;margin-top:6px"><span><b>' + (g.today ? 'Today · ' : '') + esc(g.day) + ': ' + per[g.date] + ' games</b>' +
              '<div class="small muted">Text all the stand leads or everyone working that day at once</div></span><button class="btn sm primary sueday" data-date="' + esc(g.date) + '">Whole day</button></div>';
          }
          return dayRow + '<div class="hrow"><span><b>' + esc(g.name) + '</b><div class="small muted">' + (g.today ? 'Today · ' : '') + esc(g.day) + (g.past ? ' (past)' : '') + ' · ' + g.n + ' signed up · ' + g.stands + ' stand' + (g.stands === 1 ? '' : 's') + '</div></span>' +
            '<button class="btn sm surost" data-src="' + esc(g.src) + '" data-date="' + esc(g.date) + '">Roster</button></div>';
        }).join('') + (!all && r.games.length > 8 ? '<button class="btn sm" id="sumore" style="margin-top:6px">Show all ' + r.games.length + '</button>' : '');
        on('.surost', 'click', function () { adminSuRoster(this.getAttribute('data-src'), this.getAttribute('data-date')); });
        on('.sueday', 'click', function () { adminDay(this.getAttribute('data-date')); });
        on('#sumore', 'click', function () { show(true); });
      };
      show(false);
    }).catch(function (e) {
      if (/expired|sign in with google/i.test(e.message)) return adminFail(e);
      el.innerHTML = /unknown|not.*(found|defined)|action/i.test(e.message) ? '<p class="muted small">Not available yet: the Hub needs its web app redeployed.</p>' : '<p class="err">' + esc(e.message) + '</p>';
    });
  }
  function adminSuRoster(src, date) {
    adminUrl({ su: src, d: date });
    state.page = 'Portal admin SignUp roster'; spinner('Loading roster…');
    memoCall('adminSuRoster', adminReq({ src: src, date: date }), src + '|' + date).then(function (r) {
      var o = adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="rback">← Back</button><b>' + esc(r.name) + ' · ' + esc(r.day) + '</b><span class="small muted">SignUp.com</span></div>' + '<p class="small muted" style="margin:6px 0 0">Kept 2 minutes. <a href="#" class="memore">Refresh now</a></p>' +
        '<p class="small muted">Read only. Move or remove people on SignUp.com, or use Game Tasks › Add a worker by hand.</p></div>';
      var rc = reachOf(r);
      o += reachCard(rc, r);
      r.stands.forEach(function (st) {
        var sn = rc.byStand[st.code] || [];
        o += '<div class="card"><h2 style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + esc(st.code) + (st.canceled ? ' <span class="err">canceled</span>' : '') +
          (!st.canceled && sn.length ? '<a class="btn sm rtxt" href="#" data-stand="' + esc(st.code) + '">Text this stand (' + sn.length + ')</a>' : '') + '</h2>';
        st.positions.forEach(function (p) {
          o += '<div style="margin:10px 0 4px"><b>' + esc(p.task.replace(/^\([^)]*\)\s*/, '')) + '</b> <span class="small muted">' + p.people.length + (p.lead ? ' · lead' : '') + '</span></div>';
          p.people.forEach(function (x) {
            o += '<div class="hrow"><span>' + esc(x.name) + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
              '<div class="small muted">' + (x.phone ? '<a href="' + telLink(x.phone) + '">' + esc(x.phone) + '</a> · ' : 'no phone · ') + esc(x.credit || 'credit on file') + (x.program ? ' · ' + esc(x.program) : '') + '</div></span>' +
              (x.pid ? '<button class="btn sm suview" data-id="' + esc(x.pid) + '">Open</button>' : '') + '</div>';
          });
        });
        o += '</div>';
      });
      h(o + footer()); wireAdminBar();
      on('#rback', 'click', adminSearch);
      on('.suview', 'click', function () { adminView(this.getAttribute('data-id')); });
      wireReach(rc, r);
    }).catch(adminFail);
  }
  /** Nov 13: every game on one date (SignUp.com and Hub) in one view, so the admin can text all the stand leads, or everyone, at once.
   *  Read only. Stand names get the game's short name when there is more than one game (HS and JH both have stands). */
  function adminDay(date) {
    adminUrl({ day: date });
    state.page = 'Portal admin day'; spinner('Loading every game that day…');
    var su = homeCall('adminSuGames').then(function (r) { return r.games.filter(function (g) { return g.date === date; }); });
    var hub = homeCall('adminHubGames').then(function (r) { return r.games.filter(function (g) { return g.date === date; }); }, function () { return []; });
    Promise.all([su, hub]).then(function (lists) {
      var jobs = lists[0].map(function (g) { return memoCall('adminSuRoster', adminReq({ src: g.src, date: date }), g.src + '|' + date).then(function (r) { r.kind = 'su'; return r; }); })
        .concat(lists[1].map(function (g) { return memoCall('adminHubRoster', adminReq({ src: g.src, date: date }), g.src + '|' + date).then(function (r) { r.kind = 'hub'; return r; }); }));
      if (!jobs.length) throw new Error('No games found on that day.');
      return Promise.all(jobs);
    }).then(function (rs) {
      var shortOf = function (n) { var parts = String(n || '').split(/\s+[-–]\s+/); return parts.length > 1 ? parts.slice(1).join(' - ') : String(n || ''); };
      var many = rs.length > 1, day = rs[0].day, all = { name: 'the ' + rs.length + ' games', day: day, stands: [] };
      rs.forEach(function (r, gi) {
        r.short = many ? shortOf(r.name) : '';
        r.stands.forEach(function (st) {
          all.stands.push({ code: st.code + (many ? ' · ' + r.short : ''), canceled: st.canceled, positions: st.positions, game: gi });
        });
      });
      var rc = reachOf(all);
      var o = adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="rback">← Back</button><b>All games · ' + esc(day) + '</b><span class="small muted">' + rs.length + ' game' + (rs.length === 1 ? '' : 's') + '</span></div>' + '<p class="small muted" style="margin:6px 0 0">Kept 2 minutes. <a href="#" class="memore">Refresh now</a></p>' +
        '<p class="small muted">' + rs.map(function (r) { return esc(r.name) + (r.kind === 'hub' ? ' (Hub)' : ''); }).join(' · ') + '</p></div>';
      o += reachCard(rc, all, 'these games');
      rs.forEach(function (r, gi) {
        o += '<div class="card"><h2 style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + esc(r.name) +
          '<button class="btn sm dgo" data-k="' + r.kind + '" data-src="' + esc(r.src) + '">Full roster</button></h2>';
        all.stands.filter(function (st) { return st.game === gi; }).forEach(function (st) {
          var leads = [], n = (rc.byStand[st.code] || []).length;
          st.positions.forEach(function (p) { if (p.lead) p.people.forEach(function (x) { leads.push(x.name); }); });
          o += '<div class="hrow"><span><b>' + esc(st.code.split(' · ')[0]) + '</b>' + (st.canceled ? ' <span class="err">canceled</span>' : '') +
            '<div class="small muted">Lead: ' + (leads.length ? leads.map(esc).join(', ') : '<span class="err">none signed up</span>') + '</div></span>' +
            (!st.canceled && n ? '<a class="btn sm rtxt" href="#" data-stand="' + esc(st.code) + '">Text stand (' + n + ')</a>' : '') + '</div>';
        });
        o += '</div>';
      });
      h(o + footer()); wireAdminBar();
      on('#rback', 'click', adminSearch);
      on('.dgo', 'click', function () { var k = this.getAttribute('data-k'), sr = this.getAttribute('data-src'); if (k === 'hub') adminRoster(sr, date); else adminSuRoster(sr, date); });
      wireReach(rc, all);
    }).catch(adminFail);
  }
  var ROSTER = null;
  function adminRoster(src, date, flash) {
    adminUrl({ hub: src, d: date });
    state.page = 'Portal admin roster'; spinner('Loading roster…');
    memoCall('adminHubRoster', adminReq({ src: src, date: date }), src + '|' + date).then(function (r) {
      ROSTER = r;
      var o = adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="rback">← Back</button><b>' + esc(r.name) + ' · ' + esc(r.day) + '</b><span class="small muted">' +
        ({ open: 'Open', locked: 'Locked', notyet: 'Not open yet' }[r.state] || r.state) + '</span></div>' + (r.lockLabel ? '<p class="small muted">Sign-up closes ' + esc(r.lockLabel) + '</p>' : '') + '<p class="small muted" style="margin:6px 0 0">Kept 2 minutes. <a href="#" class="memore">Refresh now</a></p>' +
        (flash ? '<p class="ok" style="color:#1e7e34;font-weight:bold">' + esc(flash) + '</p>' : '') + '<div id="act"></div></div>';
      var rc = reachOf(r);
      o += reachCard(rc, r);
      r.stands.forEach(function (st) {
        var sn = rc.byStand[st.code] || [];
        o += '<div class="card"><h2 style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + esc(st.code) + (st.canceled ? ' <span class="err">canceled' + (st.why ? ': ' + esc(st.why) : '') + '</span>' : '') +
          (!st.canceled && sn.length ? '<a class="btn sm rtxt" href="#" data-stand="' + esc(st.code) + '">Text this stand (' + sn.length + ')</a>' : '') + '</h2>';
        st.positions.forEach(function (p) {
          o += '<div style="margin:10px 0 4px"><b>' + esc(p.task.replace(/^\([^)]*\)\s*/, '')) + '</b> <span class="small muted">' + esc(p.time) + ' · ' + p.people.length + ' of ' + p.q +
            (p.permit ? ' · permit' : '') + (p.lead ? ' · lead' : '') + '</span></div>';
          p.people.forEach(function (x) {
            o += '<div class="hrow"><span>' + esc(x.name) + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
              '<div class="small muted">' + (x.phone ? '<a href="' + telLink(x.phone) + '">' + esc(x.phone) + '</a> · ' : '') + esc(x.credit || 'credit on file') + (x.program ? ' · ' + esc(x.program) : '') +
              (x.hand ? ' · handing off to ' + esc(x.hand) : '') + (x.by ? ' · by ' + esc(x.by) : '') + '</div></span>' +
              (st.canceled || adminLevel() < 2 ? '' : '<span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm rop" data-op="move" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Move</button>' +
              '<button class="btn sm rop" data-op="hand" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Hand off</button>' +
              '<button class="btn sm rop" data-op="remove" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Remove</button></span>') + '</div>';
          });
          if (p.wait.length) o += '<div class="small muted">Waitlist: ' + p.wait.map(esc).join(', ') + '</div>';
          if (!st.canceled && adminLevel() >= 2) o += '<button class="btn sm rop" data-op="add" data-task="' + esc(p.task) + '" style="margin-top:4px">+ Add someone</button>';
        });
        o += '</div>';
      });
      h(o + footer()); wireAdminBar();
      on('#rback', 'click', adminSearch);
      if (state.canManage) {
        document.getElementById('act').insertAdjacentHTML('beforebegin', '<button class="btn sm" id="redit" style="margin-bottom:6px">Edit stands and times</button>');
        on('#redit', 'click', function () { adminManage(src.replace(/^hub:\s*/i, ''), date); });
      }
      wireReach(rc, r);
      on('.rop', 'click', function () { adminAct(this.getAttribute('data-op'), this.getAttribute('data-key'), this.getAttribute('data-name'), this.getAttribute('data-task')); });
    }).catch(adminFail);
  }
  /** The action panel at the top of the roster. */
  function adminAct(op, key, name, task) {
    var box = document.getElementById('act'), pick = { pid: '', label: '' }, targets = [];
    var title = { remove: 'Remove ' + name, move: 'Move ' + name, hand: 'Hand off ' + name + '\'s spot', add: 'Add someone to ' + (task || '').replace(/^\([^)]*\)\s*/, '') + ' (' + standOf(task) + ')' }[op];
    var needPerson = op === 'add' || op === 'hand', needSpot = op === 'move', overrides = op !== 'remove';
    var html = '<div style="border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;padding:10px;margin-top:8px"><b>' + esc(title) + '</b>';
    if (needPerson) html += '<input id="aq" placeholder="Search name, email or phone"><div id="ares"></div><div id="apick" class="small"></div>';
    if (needSpot) html += '<select id="aspot" style="width:100%;padding:8px;margin:6px 0"><option value="">Loading positions…</option></select>';
    if (op === 'add' || op === 'hand') html += '<select id="acr" style="width:100%;padding:8px;margin:6px 0"><option value="">Credit: their student on file</option><option value="General fund">Credit: General fund</option></select>';
    if (overrides) html += (op === 'hand' ? '' : '<label class="small" style="display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer"><input type="checkbox" style="width:auto;margin:0;flex:none" id="aovt"> Override open time / lock</label>') +
      '<label class="small" style="display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer"><input type="checkbox" style="width:auto;margin:0;flex:none" id="aovl"> Override lead rule (logged)</label>' +
      '<input id="arsn" placeholder="Paperwork reason (only if their paperwork is missing; logged)" style="display:none">';
    if (op === 'remove') html += '<label class="small" style="display:flex;align-items:center;gap:6px;margin:6px 0;cursor:pointer"><input type="checkbox" style="width:auto;margin:0;flex:none" id="alate"> Count as a late drop (otherwise excused)</label>';
    html += '<input id="anote" placeholder="Note (optional, goes in the log' + (op === 'remove' ? ' and their email' : '') + ')">' +
      '<div style="display:flex;gap:8px;margin-top:6px"><button class="btn primary sm" id="ago">' + esc({ remove: 'Remove', move: 'Move', hand: 'Hand off', add: 'Add' }[op]) + '</button><button class="btn sm" id="ano">Cancel</button></div>' +
      '<p class="err" id="amsg"></p><p class="small muted">Stamped "Admin – ' + esc((adminSess() || {}).name || 'you') + '", logged, and emailed to the people affected.</p></div>';
    box.innerHTML = html; box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var $ = function (id) { return document.getElementById(id); };
    $('ano').onclick = function () { box.innerHTML = ''; };
    if (needPerson) {
      var search = function () {
        var q = $('aq').value.trim(); if (q.length < 3) return;
        $('ares').innerHTML = '<div class="spin"></div>';
        call('adminSearch', adminReq({ q: q })).then(function (r) {
          $('ares').innerHTML = r.hits.slice(0, 8).map(function (x) {
            return '<button class="hit ahit" data-id="' + esc(x.personId) + '" data-n="' + esc(x.name) + '"><b>' + esc(x.name) + '</b>' + (x.minor ? ' <span class="small muted">(minor)</span>' : '') + '<div class="small muted">' + esc(x.email) + ' · ' + esc(x.status) + '</div></button>';
          }).join('') || '<p class="muted small">No matches.</p>';
          Array.prototype.forEach.call(box.querySelectorAll('.ahit'), function (b) { b.onclick = function () { pick = { pid: b.getAttribute('data-id'), label: b.getAttribute('data-n') }; $('ares').innerHTML = ''; $('apick').innerHTML = 'Picked: <b>' + esc(pick.label) + '</b>'; }; });
        }).catch(function (e) { $('ares').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
      };
      $('aq').addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });
      $('aq').addEventListener('change', search);
    }
    if (needSpot) {
      var spotOpts = function (r) {
        var s = '<optgroup label="' + esc(r.name + ' · ' + r.day) + '">';
        r.stands.forEach(function (st) { if (st.canceled) return; st.positions.forEach(function (p) {
          var open = p.q - p.people.length;
          s += '<option value="' + esc(r.src + '\u0001' + r.date + '\u0001' + p.task) + '"' + (open > 0 ? '' : ' disabled') + '>' + esc(p.task + ' · ' + (open > 0 ? open + ' open' : 'full')) + '</option>';
        }); });
        return s + '</optgroup>';
      };
      $('aspot').innerHTML = '<option value="">Move to…</option>' + spotOpts(ROSTER);   // this game: no extra calls
      $('aspot').insertAdjacentHTML('afterend', '<button class="btn sm" id="aother" style="margin-bottom:6px">Show other Hub games</button>');
      $('aother').onclick = function () {
        var ob = this; ob.disabled = true; ob.textContent = 'Loading other games…';
        call('adminHubGames', adminReq({})).then(function (g) {
          var games = g.games.filter(function (x) { return x.state !== 'past' && !(x.src === ROSTER.src && x.date === ROSTER.date); });
          return Promise.all(games.map(function (x) { return call('adminHubRoster', adminReq({ src: x.src, date: x.date })); }));
        }).then(function (rs) {
          var keep = $('aspot').value;
          $('aspot').insertAdjacentHTML('beforeend', rs.map(spotOpts).join(''));
          $('aspot').value = keep; ob.remove();
        }).catch(function (e) { ob.disabled = false; ob.textContent = 'Show other Hub games'; $('amsg').textContent = e.message; });
      };
    }
    $('ago').onclick = function () {
      var b = this, body = { op: op, note: $('anote').value };
      if (key) body.key = key;
      if (needPerson) { if (!pick.pid) { $('amsg').textContent = 'Search for and pick a volunteer.'; return; } body.pid = pick.pid; }
      if (op === 'add') { body.src = ROSTER.src; body.date = ROSTER.date; body.task = task; }
      if (needSpot) { var v = $('aspot').value; if (!v) { $('amsg').textContent = 'Pick where to move them.'; return; } v = v.split('\u0001'); body.src = v[0]; body.date = v[1]; body.task = v[2]; }
      if ($('acr')) body.credit = $('acr').value;
      if ($('aovt')) body.ovTime = $('aovt').checked;
      if ($('aovl')) body.ovLead = $('aovl').checked;
      if ($('arsn')) body.reason = $('arsn').value;
      if ($('alate')) body.late = $('alate').checked;
      b.disabled = true; b.textContent = 'Saving…'; $('amsg').textContent = '';
      call('adminHubDo', adminReq(body)).then(function (r) { adminRoster(ROSTER.src, ROSTER.date, r.text); })
        .catch(function (e) {
          b.disabled = false; b.textContent = { remove: 'Remove', move: 'Move', hand: 'Hand off', add: 'Add' }[op];
          if (/expired|sign in with google/i.test(e.message)) return adminFail(e);
          $('amsg').textContent = e.message;
          if (/Type a reason/.test(e.message) && $('arsn')) { $('arsn').style.display = ''; $('arsn').focus(); }
        });
    };
  }
  // ---------- admin: reach out to a game or a stand (Nov 12). Same group text as the stand lead's "Text everyone working",
  // opened on the admin's own phone. Nothing is sent by the Hub and nothing costs email budget.
  // Bigger group texts fail on many Android phones (MMS limit) and turn into reply-all storms. A function, not a var: the router above returns before a var here would be set.
  function groupMax() { return 20; }
  // digitsOf: the first number when several are on file ("812...; 317...").
  function digitsOf(p) { var d = String(p || '').split(/[;,\/]|\bor\b/)[0].replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d.length >= 10 ? d : ''; }
  function smsHref(nums, body) {
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent), list = nums.join(','), b = encodeURIComponent(body);
    if (nums.length > 1) return ios ? 'sms:/open?addresses=' + list + '&body=' + b : 'sms:' + list + '?body=' + b;
    return 'sms:' + list + (ios ? '&' : '?') + 'body=' + b;
  }
  function prettyPhone(d) { return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); }
  /** Unique numbers per stand, for the whole game, and for the leads. Canceled stands are left out. One number shared by a household is texted once. */
  function reachOf(r) {
    var out = { all: [], leads: [], byStand: {}, stands: [], noPhone: [] };
    r.stands.forEach(function (st) {
      if (st.canceled) return;
      var mine = [];
      st.positions.forEach(function (p) { p.people.forEach(function (x) {
        var n = digitsOf(x.phone);
        if (!n) { out.noPhone.push(x.name + ' (' + st.code + ')'); return; }
        if (mine.indexOf(n) < 0) mine.push(n);
        if (out.all.indexOf(n) < 0) out.all.push(n);
        if (p.lead && out.leads.indexOf(n) < 0) out.leads.push(n);
      }); });
      out.byStand[st.code] = mine;
      if (mine.length) out.stands.push(st.code);
    });
    // Whole game too big for one group text: groups of whole stands, each at most groupMax() numbers (a bigger stand goes alone).
    out.batches = [];
    var cur = null;
    out.stands.forEach(function (c) {
      var add = out.byStand[c].filter(function (n) { return !cur || cur.nums.indexOf(n) < 0; });
      if (!cur || cur.nums.length + add.length > groupMax()) { cur = { stands: [], nums: [] }; out.batches.push(cur); add = out.byStand[c].slice(); }
      cur.stands.push(c); add.forEach(function (n) { if (cur.nums.indexOf(n) < 0) cur.nums.push(n); });
    });
    return out;
  }
  function reachIntro(r, stand) {
    var me = String((adminSess() || {}).name || '').split(/\s+/)[0];
    return 'Hi, this is ' + (me || 'the IU concessions team') + ' with the Edgewood volunteers, about ' + r.name + ' on ' + r.day + (stand ? ' (stand ' + stand + ')' : '') + '. ';
  }
  function reachCard(rc, r, scope) {
    scope = scope || 'this game';
    if (!rc.all.length) return '<div class="card"><h2>Reach out</h2><p class="muted small">No phone numbers on this game yet.</p></div>';
    var o = '<div class="card"><h2>Reach out</h2><div style="display:flex;gap:6px;flex-wrap:wrap">';
    if (rc.all.length <= groupMax()) o += '<a class="btn primary sm rtxt" href="#" data-all="1">Text everyone at ' + scope + ' (' + rc.all.length + ')</a>';
    else rc.batches.forEach(function (b, i) {
      o += '<a class="btn primary sm rtxt" href="#" data-batch="' + i + '">Text group ' + (i + 1) + ' of ' + rc.batches.length + ': ' + esc(b.stands.join(', ')) + ' (' + b.nums.length + ')</a>';
    });
    if (rc.leads.length) o += '<a class="btn sm rtxt" href="#" data-leads="1">Text the stand leads (' + rc.leads.length + ')</a>';
    o += '<button class="btn sm" id="rcopy">Copy all ' + rc.all.length + ' numbers</button></div>';
    o += '<p class="small muted">Opens a group text on this phone with a short intro; type the rest. Everyone in a group text sees each other\'s numbers.' +
      (rc.all.length > groupMax() ? ' Over ' + groupMax() + ' people, it is split into groups of whole stands, because big group texts fail on many phones.' : '') + '</p>';
    if (rc.noPhone.length) o += '<p class="small err">No phone on file: ' + rc.noPhone.map(esc).join(', ') + '</p>';
    return o + '<p class="small" id="rcmsg"></p></div>';
  }
  function wireReach(rc, r) {
    Array.prototype.forEach.call(root.querySelectorAll('.rtxt'), function (a) {
      a.addEventListener('click', function () {
        var st = a.getAttribute('data-stand'), b = a.getAttribute('data-batch'), nums, intro;
        if (st) { nums = rc.byStand[st]; intro = reachIntro(r, st); }
        else if (b != null) { nums = rc.batches[+b].nums; intro = reachIntro(r, ''); }
        else if (a.getAttribute('data-leads')) { nums = rc.leads; intro = reachIntro(r, '').replace(/\. $/, '. To the stand leads: '); }
        else { nums = rc.all; intro = reachIntro(r, ''); }
        a.href = smsHref(nums, intro);   // set on tap, like the stand page, so the intro uses the signed-in admin
      });
    });
    var cb = document.getElementById('rcopy');
    if (cb) cb.onclick = function () {
      var txt = rc.all.map(prettyPhone).join(', '), m = document.getElementById('rcmsg');
      var done = function () { m.textContent = 'Copied ' + rc.all.length + ' numbers.'; m.style.color = '#1e7e34'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { m.textContent = txt; });
      else m.textContent = txt;
    };
  }
  function standOf(task) { var m = String(task || '').match(/^\(([^)]+)\)/); return m ? m[1] : ''; }
  // ---------- volunteer directory (section 26 on the Hub). Admins, plus Lists › Directory access. Google sign-in only. Read only.
  function dirSess() { var a = adminSess(); if (a) return a; var x = store(DIR); return x && x.session && x.expires > Date.now() ? x : null; }
  function dirStart(note) {
    state.page = 'Directory';
    if (dirSess()) return dirView();
    var cid = window.HUB_GOOGLE_CLIENT_ID;
    h(header('', false) + '<div class="card"><h2>Volunteer directory</h2><p class="muted">For chairs and admins. Sign in with the Google account on the Directory access list.</p>' +
      (note ? '<p class="err">' + esc(note) + '</p>' : '') + (cid ? '<div id="gbtn"></div>' : '<p class="err">Sign-in is not set up yet.</p>') +
      '<p class="err" id="msg"></p><button class="btn" id="cancelDir">Cancel</button></div>' + footer());
    on('#cancelDir', 'click', function () { history.replaceState(null, '', location.pathname); state.data ? renderHome(state.data, false) : home(); });
    if (!cid) return;
    gsi('gbtn', function (cred) {
      spinner('Signing you in with Google…');
      call('dirGoogle', { credential: cred }).then(function (a) { store(DIR, a); dirView(); }).catch(function (e) { dirStart(e.message); });
    });
  }
  function dirView() {
    var s = dirSess(); if (!s) return dirStart();
    state.page = 'Directory'; spinner('Loading the directory…');
    memoCall('directory', { adminSession: s.session }, '', 30 * 60000).then(function (r) { state.dir = r; state.dirF = state.dirF || {}; dirRender(); })
      .catch(function (e) {
        if (/expired|sign in with google/i.test(e.message)) { try { localStorage.removeItem(DIR); } catch (x) {} if (!adminSess()) return dirStart('Your sign-in expired. Sign in again.'); return adminFail(e); }
        h(dirBar() + '<div class="card"><p class="err">' + esc(e.message) + '</p></div>' + footer()); wireDirBar();
      });
  }
  function dirBar() {
    if (adminSess()) { state.admin = true; return adminBar(); }
    var a = dirSess() || {};
    return '<header class="adminhdr"><div><div class="title">Volunteer directory</div><div class="sub">' + esc(a.name || '') + ' · every open is logged</div></div>' +
      '<div class="pills"><a class="pill" href="' + location.pathname + '" style="text-decoration:none">My dashboard</a><button class="pill" id="diro">Sign out</button></div></header>';
  }
  function wireDirBar() {
    if (adminSess()) return wireAdminBar();
    on('#diro', 'click', function () {
      var a = store(DIR); try { localStorage.removeItem(DIR); } catch (x) {}
      if (a && a.session) call('adminSignOut', { adminSession: a.session }).catch(function () {});
      history.replaceState(null, '', location.pathname); state.data ? renderHome(state.data, false) : home();
    });
  }
  function dirProgs(x) { return String(x.programs || '').split(/\s*[;,]\s*/).filter(String); }
  function dirRender() {
    var r = state.dir, f = state.dirF, progs = {};
    r.people.forEach(function (x) { dirProgs(x).forEach(function (g) { progs[g] = 1; }); });
    var opt = function (v, t, cur) { return '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var sel = 'style="width:auto;display:inline-block;margin:4px 6px 4px 0;padding:8px"';
    h(dirBar() + '<div class="card wide"><h2>Volunteer directory</h2>' +
      '<p class="small muted">Active volunteers only. Minors show their parent or guardian contact. Every open is logged.</p>' +
      '<input id="dq" placeholder="Search name, email, phone, student or parent" value="' + esc(f.q || '') + '">' +
      '<div><select id="dprog" ' + sel + '>' + opt('', 'All programs', f.prog || '') + Object.keys(progs).sort().map(function (g) { return opt(g, g, f.prog || ''); }).join('') + '</select>' +
      '<select id="dminor" ' + sel + '>' + opt('', 'Adults and minors', f.minor || '') + opt('adult', 'Adults only', f.minor || '') + opt('minor', 'Minors only', f.minor || '') + '</select>' +
      '<select id="dpw" ' + sel + '>' + opt('', 'Any paperwork', f.pw || '') + opt('ready', 'Paperwork ready', f.pw || '') + opt('missing', 'Paperwork missing', f.pw || '') + opt('permit', 'Permit missing', f.pw || '') + '</select>' +
      '<select id="dshift" ' + sel + '>' + opt('', 'Any shifts', f.shift || '') + opt('yes', 'Has an upcoming shift', f.shift || '') + opt('no', 'No upcoming shift', f.shift || '') + '</select>' +
      '<label class="small" style="white-space:nowrap"><input type="checkbox" id="dgaps" style="width:auto;margin-right:4px"' + (f.gaps ? ' checked' : '') + '>Missing contact info</label></div>' +
      '<p class="small muted" id="dcount"></p><div id="dlist" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px"></div></div>' + footer());
    wireDirBar();
    var upd = function () {
      f.q = document.getElementById('dq').value; f.prog = document.getElementById('dprog').value; f.minor = document.getElementById('dminor').value;
      f.pw = document.getElementById('dpw').value; f.shift = document.getElementById('dshift').value; f.gaps = document.getElementById('dgaps').checked;
      dirList();
    };
    on('#dq', 'input', upd); on('#dprog,#dminor,#dpw,#dshift,#dgaps', 'change', upd);
    dirList();
  }
  function dirList() {
    var r = state.dir, f = state.dirF, q = String(f.q || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
    var list = r.people.filter(function (x) {
      if (f.prog && dirProgs(x).indexOf(f.prog) < 0) return false;
      if (f.minor === 'adult' && x.minor) return false;
      if (f.minor === 'minor' && !x.minor) return false;
      if (f.pw === 'ready' && x.missing.length) return false;
      if (f.pw === 'missing' && !x.missing.length) return false;
      if (f.pw === 'permit' && !x.permit.length) return false;
      if (f.shift === 'yes' && !x.next) return false;
      if (f.shift === 'no' && x.next) return false;
      if (f.gaps && !x.gaps.length) return false;
      if (!q) return true;
      var hay = [x.first, x.last, x.email, x.parent, x.students, x.programs].join(' ').toLowerCase();
      if (q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return true;
      return qd.length >= 4 && String((x.phone || '') + ' ' + (x.parentPhone || '')).replace(/\D/g, '').indexOf(qd) >= 0;
    });
    document.getElementById('dcount').textContent = list.length + ' of ' + r.people.length + ' active volunteers';
    // Call / Text buttons like the call tree: Call solid navy, Text outlined, greyed out when there's no number
    var acts = function (p, email) {
      var t = telLink(p), m = telLink(p, 'sms');
      return '<div class="dacts"><a href="' + (t || '#') + '"' + (t ? '' : ' class="off"') + '>Call</a>' +
        '<a href="' + (m || '#') + '" class="light' + (m ? '' : ' off') + '">Text</a>' +
        (email ? '<a href="mailto:' + esc(email) + '" class="light">Email</a>' : '') + '</div>';
    };
    document.getElementById('dlist').innerHTML = list.length ? list.map(function (x) {
      var contact = x.minor
        ? '<div class="small"><b>Parent:</b> ' + (x.parent ? esc(x.parent) : '<span class="muted">not on file</span>') + (x.parentPhone ? ' · ' + esc(x.parentPhone) : ' · <span class="muted">no phone</span>') + '</div>'
        : '<div class="small">' + (x.phone ? esc(x.phone) : '<span class="muted">No phone</span>') + (x.email ? ' · ' + esc(x.email) : '') + '</div>';
      var buttons = x.minor ? acts(x.parentPhone, '') : acts(x.phone, x.email);
      var pw = x.missing.length ? '<div class="small" style="color:#b45309">⚠ Missing: ' + esc(x.missing.join(', ')) + '</div>' : '<div class="small" style="color:#15803d">✓ Paperwork ready</div>';
      var permit = x.permit.length ? '<div class="small muted">Permit spots: missing ' + esc(x.permit.join(', ')) + '</div>' : '';
      var nx = x.next ? '<div class="small"><b>Next:</b> ' + esc(x.next.date) + ' · ' + esc(x.next.event) + (x.next.task ? ' · ' + esc(x.next.task) : '') + '</div>' : '<div class="small muted">No upcoming shift</div>';
      var gaps = x.gaps.length ? '<div class="small muted">Needs: ' + esc(x.gaps.join(', ')) + '</div>' : '';
      return '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;background:#fff">' +
        '<div><b>' + esc(x.first + ' ' + x.last) + '</b>' + (x.minor ? ' <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:1px 6px;border-radius:6px">MINOR</span>' : '') + '</div>' +
        '<div class="small muted">' + (x.programs ? esc(x.programs) : 'No program') + (x.students ? ' · Student: ' + esc(x.students) : '') + '</div>' +
        contact + pw + permit + nx + gaps + buttons +
        (r.admin && adminSess() ? '<button class="btn sm dopen" data-id="' + esc(x.id) + '" style="margin-top:6px">Open in admin</button>' : '') + '</div>';
    }).join('') : '<p class="muted">Nobody matches these filters.</p>';
    on('.dopen', 'click', function () { state.admin = true; adminView(this.getAttribute('data-id')); });
  }

  function adminView(pid) {
    adminUrl({ p: pid });
    spinner('Loading volunteer…');
    var tools = TOOLS ? Promise.resolve(TOOLS) : call('adminTools', adminReq({})).then(function (r) { TOOLS = r; adminLevelSet(r); return r; }).catch(function () { return null; });
    Promise.all([memoCall('adminView', adminReq({ personId: pid }), pid), tools]).then(function (x) { var d = x[0]; state.adminData = d; renderHome(d, true); }).catch(adminFail);
  }
  function adminCard(d) {
    var a = d.adminView || {};
    return '<div class="card admincard wide"><div class="big">' + esc(a.name) + ' <a href="#" class="memore small" style="font-size:12px;font-weight:400">Refresh</a></div>' +
      '<div class="small">' + esc(a.email) + '</div>' +
      '<div class="small">' + (a.phone ? '<a href="' + telLink(a.phone) + '">' + esc(a.phone) + '</a>' : '<span class="muted">no phone</span>') + (a.parentPhone ? ' · parent ' + esc(a.parentPhone) : '') + '</div>' +
      '<div class="small">Status: <b>' + esc(a.status) + '</b>' + (a.inactiveReason ? ' — ' + esc(a.inactiveReason) : '') + '</div>' +
      '<div class="small muted">Shirt ' + esc(a.shirt || '—') + ' · Groups ' + esc(a.groups || '—') + ' · Students ' + esc(a.students || '—') + '</div>' +
      (a.actInfo ? '<a class="btn" href="' + esc(toSite(a.actInfo)) + '">Update their info / paperwork (as admin)</a>' : '') +
      '<div class="small muted">Admin links work while you\'re signed in. Anything you submit is stamped "Admin – your name".</div></div>' + toolPersonCard(a);
  }
})();
