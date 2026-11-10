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
  var ADMIN = PFX + 'hubAdmin';

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
      var raw = document.getElementById('code').value.trim(), msg = document.getElementById('msg');
      msg.textContent = '';
      if (/@/.test(raw)) {
        var em = raw.toLowerCase();
        call('portal', { email: em }).then(function (d) {
          if (d.pick) return pickPerson(em, d.pick);
          saveEntry({ email: em, personId: d.me.personId, first: d.me.first, limited: true }); state.data = d; renderHome(d, false);
        }).catch(function (e) { msg.textContent = e.message; });
        return;
      }
      var c = normCode(raw);
      if (c.length < 6) { msg.textContent = 'Enter your email address, or the 8-letter code from your Hub email.'; return; }
      call('portal', { code: c }).then(function (d) { saveCode(c, d.me.first, d.me.personId); state.data = d; renderHome(d, false); })
        .catch(function (e) { msg.textContent = e.message; });
    };
    on('#go', 'click', go);
    on('#code', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    gsi('gbtn', function (cred) {
      var msg = document.getElementById('msg'); msg.textContent = '';
      state.page = 'Portal (Google)';
      call('portalGoogle', { credential: cred }).then(function (r) {
        if (r.people && r.people.length) { r.people.slice().reverse().forEach(function (p) { saveCode(p.code, p.first, p.personId); }); return home(); }
        googleNew(r, cred);
      }).catch(function (e) { msg.textContent = e.message; });
    });
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
      call('portalGoogleLink', { credential: cred, code: c }).then(function (p) { saveCode(p.code, p.first, p.personId); home(); })
        .catch(function (e) { msg.textContent = /confirm that sign-in/i.test(e.message) ? 'Your Google sign-in timed out. Tap Back and sign in with Google again.' : e.message; });
    };
    on('#link', 'click', go); on('#lcode', 'keydown', function (e) { if (e.key === 'Enter') go(); });
    on('#back', 'click', function (e) { e.preventDefault(); signIn(); });
  }

  function pickPerson(email, list) {
    h(header('', false) + '<div class="card"><h2>Who are you?</h2><p class="muted">More than one volunteer uses this email.</p>' +
      list.map(function (p) { return '<button class="btn" data-pid="' + esc(p.personId) + '">' + esc(p.first) + '</button>'; }).join('') + '<p class="err" id="msg"></p></div>' + footer());
    on('[data-pid]', 'click', function () {
      var pid = this.getAttribute('data-pid');
      call('portal', { email: email, personId: pid }).then(function (d) {
        saveEntry({ email: email, personId: pid, first: d.me.first, limited: true }); state.data = d; renderHome(d, false);
      }).catch(function (e) { document.getElementById('msg').textContent = e.message; });
    });
  }

  function header(first, isAdmin) {
    var list = codes(), act = (activeEntry() || {}).id;
    var pills = list.map(function (x) {
      return '<button class="pill' + (x.id === act && !state.admin ? ' on' : '') + '" data-code="' + esc(x.id) + '">' + esc(x.first || (x.code ? fmtCode(x.code) : x.email)) + '</button>';
    }).join('') + (list.length ? '<button class="pill add" id="addp" title="Add another person on this device">+</button>' : '');
    return '<header><div><a class="title" href="' + location.pathname + '" style="color:inherit;text-decoration:none">Edgewood Volunteer Hub</a><div class="sub">' + (first ? 'Hi, ' + esc(first) : 'Volunteer pages') + '</div></div>' +
      '<div class="pills">' + pills + (isAdmin ? '<button class="pill admin' + (state.admin ? ' on' : '') + '" id="adm">Admin</button>' : '') + '</div></header>';
  }
  function wireHeader() {
    on('.pill[data-code]', 'click', function () { state.admin = false; store(ACTIVE, this.getAttribute('data-code')); home(); });
    on('#addp', 'click', function () { state.admin = false; signIn(); });
    on('#adm', 'click', function () { if (state.admin) { state.admin = false; renderHome(state.data, false); } else adminStart(); });
  }
  function footer() {
    var help = (state.data && state.data.help) || window.HUB_HELP || '';
    return '<footer>' + (help ? '<a href="' + esc(help) + '" target="_blank" rel="noopener">Help and how-to guides</a><br>' : '') +
      'Questions about shifts, stands or paperwork: <a href="mailto:' + LIAISON + '">email the IU liaison</a>.<br>' +
      'Website or technical problems: <a href="mailto:' + TECH + '">Nick Ely, tech support</a>.<br>' +
      '<a href="#" id="admLogin">Admin sign-in</a> · © 2026 NE Prints &amp; Design, LLC' + (ENV !== 'LIVE' ? ' · ' + esc(ENV) : '') + '</footer>';
  }
  function wireFooter() { on('#admLogin', 'click', function (e) { e.preventDefault(); adminStart(); }); }

  function renderHome(d, asAdmin) {
    var me = d.me, sh = d.shifts || {}, up = sh.upcoming || [], next = up[0];
    state.page = asAdmin ? 'Portal admin view' : d.limited ? 'Portal (email)' : 'Portal (code)';
    var out = (asAdmin ? adminBar(d) : header(me.first, d.isAdmin)) + '<div class="cols">';
    if (asAdmin) out += adminCard(d);
    if (d.limited && !asAdmin) out += '<div class="card wide"><b>Signed in with your email.</b><div class="small">You can see your shifts, hours and paperwork. For your personal links (paperwork page, naming your spots, logging stand hours), enter the code from your Hub email.</div><button class="btn" id="usecode">Enter my code</button></div>';
    if (!me.active) out += '<div class="card warn wide">' + esc(me.first) + ' is not on the volunteer list right now. Signing up for a shift adds you back automatically.</div>';

    // Game day
    (d.standToday || []).forEach(function (s) {
      out += '<div class="card gameday wide"><div class="tag">Today · you\'re the stand lead</div><div class="big">' + esc(s.stand) + (s.event ? ' · ' + esc(s.event) : '') + '</div>' +
        (s.link ? '<a class="btn primary" href="' + esc(toSite(s.link)) + '">Log your stand\'s hours</a>' : s.act ? '<a class="btn primary" href="' + esc(toSite(s.act)) + '">Open this stand\'s time sheet (as admin)</a>' : '<p class="small muted">' + (asAdmin ? 'Admin view hides the stand link.' : 'Your stand link is in your Hub email, or enter your code above to open it here.') + '</p>') +
        (d.techPhone ? '<a class="btn" href="' + telLink(d.techPhone, 'sms') + '">Page not working? Text tech support (Nick)</a>' : '') + '</div>';
    });

    // Paperwork
    var docs = me.docs || [], miss = (me.missing || []).concat(me.permitMissing || []);
    var bad = miss.length + docs.filter(function (x) { return x.fix || (x.days != null && x.days < 30); }).length;
    out += '<div class="card"><div class="row"><b>Paperwork</b>' + (bad ? '<span class="err small">' + bad + ' need' + (bad > 1 ? '' : 's') + ' attention</span>' : '<span class="ok small">All set</span>') + '</div><ul class="list">';
    docs.forEach(function (x) {
      var warn = x.fix || (x.days != null && x.days < 30);
      out += '<li><span>' + (warn ? '⚠️ ' : '✅ ') + esc(x.label) + (x.pending ? ' <em class="muted">(being checked)</em>' : '') + '</span><span class="' + (warn ? 'err' : 'muted') + ' small">' +
        (x.fix ? 'needs a fix' : x.exp ? 'to ' + esc(x.exp) : '') + '</span></li>';
    });
    miss.forEach(function (m) { out += '<li><span>⚠️ ' + esc(m) + '</span></li>'; });
    // Levy packet missing, needing a fix or expiring soon: offer to sign it online (needs a code on this device, not an email sign-in)
    var levyDue = miss.some(function (m) { return /levy packet/i.test(m); }) || docs.some(function (x) { return /levy packet/i.test(x.label) && !x.pending && (x.fix || (x.days != null && x.days < 30)); });
    var levyBtn = !asAdmin && !d.limited && levyDue && (activeEntry() || {}).code ? '<a class="btn primary" href="?view=levy">Sign the Levy packet online</a>' : '';
    out += '</ul>' + levyBtn + (!asAdmin && d.links.upload ? '<a class="btn' + (bad && !levyBtn ? ' primary' : '') + '" href="' + esc(toSite(d.links.upload)) + '">Upload paperwork</a>' : '') + '</div>';

    // Spots needing names
    (d.spots || []).forEach(function (s) {
      out += '<div class="card warn"><b>' + esc(s.date) + (s.event ? ' · ' + esc(s.event) : '') + '</b><div class="small">Spots under your name still need a name for who\'s working them.</div>' +
        (s.link ? '<a class="btn primary" href="' + esc(toSite(s.link)) + '">Name my spots</a>' : s.act ? '<a class="btn primary" href="' + esc(toSite(s.act)) + '">Name spots for them (as admin)</a>' : (asAdmin ? '' : '<div class="small muted">Use the link in your Hub email, or enter your code to open it here.</div>')) + '</div>';
    });

    // Next shift
    out += '<div class="card"><b>Next shift</b>';
    if (!next) out += '<p class="muted">No upcoming shifts. <a href="?view=coverage">See open spots</a>.</p>';
    else {
      out += '<div class="big">' + esc(next.date) + (next.event ? ' · ' + esc(next.event) : '') + '</div><div>' + esc(next.stand) + (next.start ? ' · ' + esc(next.start) + (next.end ? '–' + esc(next.end) : '') : '') + '</div>';
      if (next.youLead) out += '<div class="small">You\'re the stand lead.</div>';
      else if (next.lead) {
        out += '<div class="small">Stand lead: ' + esc(next.lead);
        if (next.leadPhone) out += ' · <a href="' + telLink(next.leadPhone) + '">Call</a> · <a href="' + telLink(next.leadPhone, 'sms') + '">Text</a>';
        else if (next.phoneLater) out += ' <span class="muted">(call/text buttons show ' + esc(sh.showH || 48) + ' hours before)</span>';
        out += '</div>';
      }
      if (sh.callH) out += '<div class="small muted">Running late or can\'t make it within ' + esc(sh.callH) + ' hours of your shift? Call or text your stand lead. Please clock in no more than ' + esc(sh.early || 15) + ' minutes early.</div>';
    }
    if (up.length || (sh.rows || []).length) out += '<button class="btn" id="cal">See all my shifts (' + up.length + ' upcoming)</button>';
    out += '</div>';

    // Hours
    var studs = (sh.students || []).map(function (s) { return esc(s.name); }).join(', ');
    out += '<div class="grid2"><div class="stat"><div class="small muted">Hours this season</div><div class="num">' + esc(sh.hours || 0) + '</div></div>' +
      '<div class="stat"><div class="small muted">Credited to</div><div>' + (studs || '<span class="muted">—</span>') + '</div></div></div>';

    // Quick links
    out += '<div class="grid2">' +
      '<a class="btn" href="?view=coverage">Open spots</a>' +
      '<button class="btn" id="hist">Hours history</button>' +
      (!asAdmin && d.links.upload ? '<a class="btn" href="' + esc(toSite(d.links.upload)) + '">Update my info</a>' : '') +
      '<a class="btn" href="mailto:' + LIAISON + '">Contact the liaison</a></div>';

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
      o += '<div class="hrow"><div><b>' + esc(x.date) + '</b> ' + esc(x.event || '') + '<div class="small muted">' + esc(x.stand || '') + '</div></div><div class="right small muted">waiting for approval</div></div>';
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
      document.getElementById('msg').textContent = '';
      call('adminGoogle', { credential: cred }).then(function (a) { store(ADMIN, a); adminSearch(); })
        .catch(function (e) { var m = document.getElementById('msg'); if (m) m.textContent = e.message; });
    });
  }
  function adminBar() {
    var a = adminSess() || {};
    return '<header class="adminhdr"><div><div class="title">Admin view</div><div class="sub">' + esc(a.name || '') + ' · every lookup and change is logged</div></div>' +
      '<div class="pills"><a class="pill" href="' + location.pathname + '" style="text-decoration:none">My dashboard</a><button class="pill" id="adms">Search</button><button class="pill" id="admx">Exit admin</button><button class="pill" id="admo">Sign out</button></div></header>';
  }
  function wireAdminBar() {
    on('#adms', 'click', adminSearch);
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
