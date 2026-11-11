/* Edgewood Volunteer Hub – volunteer portal, leave-the-list page, admin view.
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Talks to the Hub (Apps Script) through window.HUB_API. Holds no data, codes or settings itself;
 * a volunteer's own code is remembered only in their own browser (localStorage). */
(function () {
  'use strict';
  var API = window.HUB_API, ENV = window.HUB_ENV || 'LIVE';
  var LIAISON = 'edgewood.hs.volunteers+liaison@gmail.com', TECH = 'edgewood.hs.volunteers+help@gmail.com';
  var root = document.getElementById('hub');
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
    var p0 = qs.get('p'); history.replaceState(null, '', location.pathname);
    if (adminSess()) { state.admin = true; return p0 ? adminView(p0) : adminSearch(); }
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
    call('portal', reqOf(ent)).then(function (d) {
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
      '<button class="btn primary" id="go">Open my page</button><p class="err" id="msg"></p></div>' +
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
      '<button class="btn" id="back">Try a different email or code</button></div>' + footer());
    on('#new', 'click', function () {
      try { sessionStorage.setItem('hubNewEmail', em); } catch (x) {}
      location.href = location.pathname + '?view=form';
    });
    on('#back', 'click', function () { signIn(); var c = document.getElementById('code'); if (c) c.value = em; });
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
      '<input id="lcode" autocomplete="off" placeholder="ABCD-1234"><button class="btn" id="link">Link my Google account</button><p class="err" id="msg"></p></div>' +
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
  }

  function pickPerson(email, list) {
    h(header('', false) + '<div class="card"><h2>Who are you?</h2><p class="muted">More than one volunteer uses this email.</p>' +
      list.map(function (p) { return '<button class="btn" data-pid="' + esc(p.personId) + '">' + esc(p.first) + '</button>'; }).join('') + '<p class="err" id="msg"></p></div>' + footer());
    on('[data-pid]', 'click', function () {
      var pid = this.getAttribute('data-pid'); if (this.disabled) return; var undo = busy(this);
      call('portal', { email: email, personId: pid }).then(function (d) {
        saveEntry({ email: email, personId: pid, first: d.me.first, limited: true }); state.data = d; renderHome(d, false);
      }).catch(function (e) { undo(); document.getElementById('msg').textContent = e.message; });
    });
  }

  function header(first, isAdmin) {
    var list = codes(), act = (activeEntry() || {}).id;
    var pills = list.map(function (x) {
      return '<button class="pill' + (x.id === act && !state.admin ? ' on' : '') + '" data-code="' + esc(x.id) + '">' + esc(x.first || (x.code ? fmtCode(x.code) : x.email)) + '</button>';
    }).join('') + (list.length ? '<button class="pill add" id="addp" title="Add another person on this device">+ Add</button>' : '');
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
    // Levy packet missing, needing a fix or expiring soon: offer to sign it online (needs a code on this device, not an email sign-in)
    var levyDue = miss.some(function (m) { return /levy packet/i.test(m); }) || docs.some(function (x) { return /levy packet/i.test(x.label) && !x.pending && (x.fix || (x.days != null && x.days < 30)); });
    var levyBtn = !asAdmin && !d.limited && levyDue && (activeEntry() || {}).code ? '<a class="btn primary" href="?view=levy">Sign the Levy packet online</a>' : '';
    // Minor release missing, needing a fix or expiring soon: sign it online with a parent (same device or a link for them)
    var relDue = miss.some(function (m) { return /minor release/i.test(m); }) || docs.some(function (x) { return /minor release/i.test(x.label) && !x.pending && (x.fix || (x.days != null && x.days < 30)); });
    var relBtn = !asAdmin && !d.limited && relDue && (activeEntry() || {}).code ? '<a class="btn' + (!levyBtn ? ' primary' : '') + '" href="?view=release">Sign the minor release online</a>' : '';
    out += '</ul>' + levyBtn + relBtn + (!asAdmin && d.links.upload && bad ? '<a class="btn' + (!levyBtn && !relBtn ? ' primary' : '') + '" href="' + esc(toSite(d.links.upload)) + '">Upload paperwork</a>' : '') + '</div>';
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
    if (!asAdmin) wireHeader(); else wireAdminBar();
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
    on('#cancelAdm', 'click', function () { state.admin = false; state.data ? renderHome(state.data, false) : home(); });
    if (!cid) return;
    gsi('gbtn', function (cred) {
      spinner('Signing you in with Google…');
      call('adminGoogle', { credential: cred }).then(function (a) { store(ADMIN, a); adminSearch(); })
        .catch(function (e) { adminStart(e.message); });
    });
  }
  function adminBar() {
    var a = adminSess() || {};
    return '<header class="adminhdr"><div><div class="title">Admin view</div><div class="sub">' + esc(a.name || '') + ' · every lookup and change is logged</div></div>' +
      '<div class="pills"><a class="pill" href="' + location.pathname + '" style="text-decoration:none">My dashboard</a><button class="pill" id="adms">Search</button><button class="pill" id="admd">Directory</button><button class="pill" id="admx">Exit admin</button><button class="pill" id="admo">Sign out</button></div></header>';
  }
  function wireAdminBar() {
    on('#adms', 'click', adminSearch);
    on('#admd', 'click', function () { dirView(); });
    on('#admx', 'click', function () { state.admin = false; state.page = 'Portal'; state.data ? renderHome(state.data, false) : home(); });
    on('#admo', 'click', function () {
      var a = adminSess(); try { localStorage.removeItem(ADMIN); } catch (x) {}
      if (a) call('adminSignOut', { adminSession: a.session }).catch(function () {});
      state.admin = false; state.page = 'Portal'; state.data ? renderHome(state.data, false) : home();
    });
  }
  function adminSearch() {
    h(adminBar() + '<div class="cols"><div class="card"><h2>Look up a volunteer</h2><input id="q" placeholder="Name, email, or phone number"><button class="btn primary" id="go">Search</button><p class="err" id="msg"></p><div id="res"></div></div>' +
      '<div class="card"><h2>Stands (last 3 days)</h2><div id="stands"><div class="spin"></div></div></div>' +
      '<div class="card wide"><h2>Hub games</h2><p class="small muted">Rosters: move, remove, add or hand off. Every change is stamped and logged.</p><div id="hubgames"><div class="spin"></div></div></div></div>' + footer());
    wireAdminBar();
    adminHubList();
    call('adminStands', adminReq({})).then(function (r) {
      var el = document.getElementById('stands'); if (!el) return;
      if (!r.stands.length) { el.innerHTML = '<p class="muted">No stands today or in the last 2 days.</p>'; return; }
      var day = '';
      el.innerHTML = r.stands.map(function (x) {
        var head = x.date !== day ? '<div class="small muted" style="margin-top:8px"><b>' + (x.today ? 'Today · ' : '') + esc(x.date) + '</b></div>' : ''; day = x.date;
        return head + '<div class="hrow"><span><b>' + esc(x.stand) + '</b>' + (x.event ? ' · ' + esc(x.event) : '') +
          '<div class="small muted">' + (x.chair ? 'Lead ' + esc(x.chair) + ' · ' : '') + esc(x.status) + (x.submittedBy ? ' · by ' + esc(x.submittedBy) : '') + '</div></span>' +
          (x.act ? '<a class="btn sm" href="' + esc(toSite(x.act)) + '">Time sheet</a>' : '<span class="small muted">approved</span>') + '</div>';
      }).join('');
    }).catch(function (e) { var el = document.getElementById('stands'); if (/expired|sign in with google/i.test(e.message)) return adminFail(e); if (el) el.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
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
  }
  // ---------- admin: Hub game rosters (section 24d on the Hub). Move / Remove / Add / Hand off; every action is stamped and logged.
  function adminHubList() {
    var el = document.getElementById('hubgames'); if (!el) return;
    call('adminHubGames', adminReq({})).then(function (r) {
      if (!r.games.length) { el.innerHTML = '<p class="muted">No upcoming Hub games.</p>'; return; }
      el.innerHTML = r.games.map(function (g) {
        return '<div class="hrow"><span><b>' + esc(g.name) + '</b><div class="small muted">' + esc(g.day) + ' · ' + g.f + ' of ' + g.q + ' filled · ' +
          ({ open: 'open', locked: 'locked', notyet: 'not open yet' }[g.state] || g.state) + (g.canceled ? ' · ' + g.canceled + ' stand(s) canceled' : '') + '</div></span>' +
          '<button class="btn sm rost" data-src="' + esc(g.src) + '" data-date="' + esc(g.date) + '">Roster</button></div>';
      }).join('');
      on('.rost', 'click', function () { adminRoster(this.getAttribute('data-src'), this.getAttribute('data-date')); });
    }).catch(function (e) { if (/expired|sign in with google/i.test(e.message)) return adminFail(e); el.innerHTML = '<p class="err">' + esc(e.message) + '</p>'; });
  }
  var ROSTER = null;
  function adminRoster(src, date, flash) {
    state.page = 'Portal admin roster'; spinner('Loading roster…');
    call('adminHubRoster', adminReq({ src: src, date: date })).then(function (r) {
      ROSTER = r;
      var o = adminBar() + '<div class="card"><div class="row"><button class="btn sm" id="rback">← Back</button><b>' + esc(r.name) + ' · ' + esc(r.day) + '</b><span class="small muted">' +
        ({ open: 'Open', locked: 'Locked', notyet: 'Not open yet' }[r.state] || r.state) + '</span></div>' + (r.lockLabel ? '<p class="small muted">Sign-up closes ' + esc(r.lockLabel) + '</p>' : '') +
        (flash ? '<p class="ok" style="color:#1e7e34;font-weight:bold">' + esc(flash) + '</p>' : '') + '<div id="act"></div></div>';
      r.stands.forEach(function (st) {
        o += '<div class="card"><h2>' + esc(st.code) + (st.canceled ? ' <span class="err">canceled' + (st.why ? ': ' + esc(st.why) : '') + '</span>' : '') + '</h2>';
        st.positions.forEach(function (p) {
          o += '<div style="margin:10px 0 4px"><b>' + esc(p.task.replace(/^\([^)]*\)\s*/, '')) + '</b> <span class="small muted">' + esc(p.time) + ' · ' + p.people.length + ' of ' + p.q +
            (p.permit ? ' · permit' : '') + (p.lead ? ' · lead' : '') + '</span></div>';
          p.people.forEach(function (x) {
            o += '<div class="hrow"><span>' + esc(x.name) + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
              '<div class="small muted">' + (x.phone ? '<a href="' + telLink(x.phone) + '">' + esc(x.phone) + '</a> · ' : '') + esc(x.credit || 'credit on file') + (x.program ? ' · ' + esc(x.program) : '') +
              (x.hand ? ' · handing off to ' + esc(x.hand) : '') + (x.by ? ' · by ' + esc(x.by) : '') + '</div></span>' +
              (st.canceled ? '' : '<span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm rop" data-op="move" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Move</button>' +
              '<button class="btn sm rop" data-op="hand" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Hand off</button>' +
              '<button class="btn sm rop" data-op="remove" data-key="' + esc(x.key) + '" data-name="' + esc(x.name) + '">Remove</button></span>') + '</div>';
          });
          if (p.wait.length) o += '<div class="small muted">Waitlist: ' + p.wait.map(esc).join(', ') + '</div>';
          if (!st.canceled) o += '<button class="btn sm rop" data-op="add" data-task="' + esc(p.task) + '" style="margin-top:4px">+ Add someone</button>';
        });
        o += '</div>';
      });
      h(o + footer()); wireAdminBar();
      on('#rback', 'click', adminSearch);
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
    call('directory', { adminSession: s.session }).then(function (r) { state.dir = r; state.dirF = state.dirF || {}; dirRender(); })
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
    spinner('Loading volunteer…');
    call('adminView', adminReq({ personId: pid })).then(function (d) { state.adminData = d; renderHome(d, true); }).catch(adminFail);
  }
  function adminCard(d) {
    var a = d.adminView || {};
    return '<div class="card admincard wide"><div class="big">' + esc(a.name) + '</div>' +
      '<div class="small">' + esc(a.email) + '</div>' +
      '<div class="small">' + (a.phone ? '<a href="' + telLink(a.phone) + '">' + esc(a.phone) + '</a>' : '<span class="muted">no phone</span>') + (a.parentPhone ? ' · parent ' + esc(a.parentPhone) : '') + '</div>' +
      '<div class="small">Status: <b>' + esc(a.status) + '</b>' + (a.inactiveReason ? ' — ' + esc(a.inactiveReason) : '') + '</div>' +
      '<div class="small muted">Shirt ' + esc(a.shirt || '—') + ' · Groups ' + esc(a.groups || '—') + ' · Students ' + esc(a.students || '—') + '</div>' +
      (a.actInfo ? '<a class="btn" href="' + esc(toSite(a.actInfo)) + '">Update their info / paperwork (as admin)</a>' : '') +
      '<div class="small muted">Admin links work while you\'re signed in. Anything you submit is stamped "Admin – your name".</div></div>';
  }
})();
