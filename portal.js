/* Edgewood Volunteer Hub – volunteer portal, leave-the-list page, admin view.
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Talks to the Hub (Apps Script) through window.HUB_API. Holds no data, codes or settings itself;
 * a volunteer's own code is remembered only in their own browser (localStorage). */
(function () {
  'use strict';
  var API = window.HUB_API, ENV = window.HUB_ENV || 'LIVE';
  var LIAISON = 'edgewood.hs.volunteers+liaison@gmail.com';
  var root = document.getElementById('hub');
  var KEY = 'hubCodes', ACTIVE = 'hubActive';
  var state = { data: null, admin: false, adminData: null, view: 'home', cal: null };

  // ---------- helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function normCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function fmtCode(c) { c = normCode(c); return c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function codes() { return store(KEY) || []; }
  function saveCode(code, first) {
    var list = codes().filter(function (x) { return x.code !== code; });
    list.unshift({ code: code, first: first || '' }); store(KEY, list.slice(0, 8)); store(ACTIVE, code);
  }
  function dropCode(code) { store(KEY, codes().filter(function (x) { return x.code !== code; })); if (store(ACTIVE) === code) store(ACTIVE, (codes()[0] || {}).code || null); }
  function activeCode() { var a = store(ACTIVE), list = codes(); return list.some(function (x) { return x.code === a; }) ? a : (list[0] || {}).code || null; }
  /** Links the Hub builds point at the web app until Public site URL is set; keep people on this site. */
  function toSite(u) {
    if (!u) return '';
    var base = location.origin + location.pathname;
    if (API && u.indexOf(API) === 0) return base + u.slice(API.length).replace(/^\/?/, '');
    return u;
  }
  function call(action, body) {
    body = body || {}; body.action = action;
    return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Something went wrong.');
      return j.result;
    });
  }
  function h(html) { root.innerHTML = html; window.scrollTo(0, 0); }
  function spinner(msg) { h('<div class="card center"><div class="spin"></div><p class="muted">' + esc(msg || 'Loading…') + '</p></div>'); }
  function on(sel, ev, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) { el.addEventListener(ev, fn); }); }
  function telLink(p, kind) { var d = String(p || '').replace(/[^\d+]/g, ''); return d ? (kind === 'sms' ? 'sms:' : 'tel:') + d : ''; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function sameDay(t) { return dayKey(t) === dayKey(Date.now()); }

  // ---------- routing
  var qs = new URLSearchParams(location.search);
  var view = qs.get('view');
  if (view === 'leave') return leavePage(qs.get('email') || '');
  if (qs.get('code') && view === 'home') {   // a personal portal link: remember the code on this device, then clean the address bar
    var c0 = normCode(qs.get('code')); if (c0.length >= 6) saveCode(c0, '');
    history.replaceState(null, '', location.pathname);
  }
  home();

  // ---------- portal home
  function home() {
    var code = activeCode();
    if (!code) return signIn();
    spinner('Loading your page…');
    call('portal', { code: code }).then(function (d) {
      state.data = d; saveCode(code, d.me.first);
      renderHome(d, false);
    }).catch(function (e) {
      if (/couldn't find that code/i.test(e.message)) { dropCode(code); return signIn('That saved code no longer works. Enter your current code.'); }
      h('<div class="card"><p class="err">' + esc(e.message) + '</p><button class="btn" id="retry">Try again</button></div>'); on('#retry', 'click', home);
    });
  }

  function signIn(note) {
    h(header('', false) +
      '<div class="card"><h2>Your volunteer page</h2>' +
      '<p class="muted">Enter the volunteer code from your Hub email (it looks like K7Q4-M9XD). This device will remember it.</p>' +
      (note ? '<p class="err">' + esc(note) + '</p>' : '') +
      '<input id="code" autocomplete="off" autocapitalize="characters" placeholder="ABCD-1234">' +
      '<button class="btn primary" id="go">Open my page</button><p class="err" id="msg"></p></div>' +
      '<div class="card"><a class="btn" href="?view=coverage">See open spots</a></div>' + footer());
    var go = function () {
      var c = normCode(document.getElementById('code').value), msg = document.getElementById('msg');
      if (c.length < 6) { msg.textContent = 'That code looks too short. It is 8 letters and numbers.'; return; }
      msg.textContent = '';
      call('portal', { code: c }).then(function (d) { saveCode(c, d.me.first); state.data = d; renderHome(d, false); })
        .catch(function (e) { msg.textContent = e.message; });
    };
    on('#go', 'click', go);
    on('#code', 'keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  function header(first, isAdmin) {
    var list = codes(), act = activeCode();
    var pills = list.map(function (x) {
      return '<button class="pill' + (x.code === act && !state.admin ? ' on' : '') + '" data-code="' + esc(x.code) + '">' + esc(x.first || fmtCode(x.code)) + '</button>';
    }).join('') + (list.length ? '<button class="pill add" id="addp" title="Add another person on this device">+</button>' : '');
    return '<header><div><div class="title">Edgewood Volunteer Hub</div><div class="sub">' + (first ? 'Hi, ' + esc(first) : 'Volunteer pages') + '</div></div>' +
      '<div class="pills">' + pills + (isAdmin ? '<button class="pill admin' + (state.admin ? ' on' : '') + '" id="adm">Admin</button>' : '') + '</div></header>';
  }
  function wireHeader() {
    on('.pill[data-code]', 'click', function () { state.admin = false; store(ACTIVE, this.getAttribute('data-code')); home(); });
    on('#addp', 'click', function () { state.admin = false; store(ACTIVE, null); var keep = codes(); signIn(); store(KEY, keep); });
    on('#adm', 'click', function () { state.admin = !state.admin; state.admin ? adminSearch() : renderHome(state.data, false); });
  }
  function footer() {
    return '<footer>Questions about shifts, stands or paperwork: <a href="mailto:' + LIAISON + '">email the IU liaison</a>.<br>© 2026 NE Prints &amp; Design, LLC' +
      (ENV !== 'LIVE' ? ' · ' + esc(ENV) : '') + '</footer>';
  }

  function renderHome(d, asAdmin) {
    var me = d.me, sh = d.shifts || {}, up = sh.upcoming || [], next = up[0];
    var out = asAdmin ? adminBar(d) : header(me.first, d.isAdmin);
    if (asAdmin) out += adminCard(d);
    if (!me.active) out += '<div class="card warn">' + esc(me.first) + ' is not on the volunteer list right now. Signing up for a shift adds you back automatically.</div>';

    // Game day
    (d.standToday || []).forEach(function (s) {
      out += '<div class="card gameday"><div class="tag">Today · you\'re the stand lead</div><div class="big">' + esc(s.stand) + (s.event ? ' · ' + esc(s.event) : '') + '</div>' +
        (s.link ? '<a class="btn primary" href="' + esc(toSite(s.link)) + '">Log your stand\'s hours</a>' : '<p class="muted">Stand link (admin view hides it).</p>') + '</div>';
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
    out += '</ul>' + (!asAdmin && d.links.upload ? '<a class="btn" href="' + esc(toSite(d.links.upload)) + '">Upload paperwork</a>' : '') + '</div>';

    // Spots needing names
    (d.spots || []).forEach(function (s) {
      out += '<div class="card warn"><b>' + esc(s.date) + (s.event ? ' · ' + esc(s.event) : '') + '</b><div class="small">Spots under your name still need a name for who\'s working them.</div>' +
        (s.link ? '<a class="btn" href="' + esc(toSite(s.link)) + '">Name my spots</a>' : '') + '</div>';
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

    if (!asAdmin) out += '<div class="center small"><a href="#" id="leave">Leave the volunteer list</a> · <a href="#" id="signout">Sign out on this device</a></div>';
    out += footer();
    h(out);
    if (!asAdmin) wireHeader(); else wireAdminBar();
    on('#cal', 'click', function () { calendar(d, asAdmin); });
    on('#hist', 'click', function () { history_(d, asAdmin); });
    on('#leave', 'click', function (e) { e.preventDefault(); leaveFlow({ code: activeCode() }, function () { renderHome(d, false); }); });
    on('#signout', 'click', function (e) { e.preventDefault(); dropCode(activeCode()); home(); });
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
      '<div class="card"><div class="row"><button class="btn sm" id="back">← Back</button><b>My shifts</b><span></span></div>' +
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
          if (who.code) dropCode(who.code);
        }).catch(function (e) { document.getElementById('msg').textContent = e.message; btn.disabled = false; });
      });
    }).catch(function (e) { h('<div class="card"><p class="err">' + esc(e.message) + '</p></div>' + footer()); });
  }
  function leavePage(email) {
    if (email) return leaveFlow({ email: email });
    var c = activeCode();
    h(header('', false) + '<div class="card"><h2>Leave the volunteer list</h2><p class="muted">Enter the email address Hub emails come to.</p>' +
      '<input id="em" type="email" placeholder="you@example.com"><button class="btn primary" id="go">Continue</button>' +
      (c ? '<p class="small">Or <a href="#" id="usecode">continue as the volunteer saved on this device</a>.</p>' : '') + '<p class="err" id="msg"></p></div>' + footer());
    on('#go', 'click', function () { var v = document.getElementById('em').value.trim(); if (!/@/.test(v)) { document.getElementById('msg').textContent = 'Enter an email address.'; return; } leaveFlow({ email: v }); });
    on('#usecode', 'click', function (e) { e.preventDefault(); leaveFlow({ code: c }); });
  }

  // ---------- admin
  function adminBar() {
    return '<header class="adminhdr"><div><div class="title">Admin view</div><div class="sub">Read-only. Every lookup is logged.</div></div>' +
      '<div class="pills"><button class="pill" id="adms">Search</button><button class="pill" id="admx">Exit admin</button></div></header>';
  }
  function wireAdminBar() {
    on('#adms', 'click', adminSearch);
    on('#admx', 'click', function () { state.admin = false; renderHome(state.data, false); });
  }
  function adminSearch() {
    h(adminBar() + '<div class="card"><h2>Look up a volunteer</h2><input id="q" placeholder="Name, email, or phone number"><button class="btn primary" id="go">Search</button><p class="err" id="msg"></p><div id="res"></div></div>' + footer());
    wireAdminBar();
    var go = function () {
      var q = document.getElementById('q').value.trim(), msg = document.getElementById('msg'), res = document.getElementById('res');
      msg.textContent = ''; res.innerHTML = '<div class="spin"></div>';
      call('adminSearch', { code: activeCode(), q: q }).then(function (r) {
        if (!r.hits.length) { res.innerHTML = '<p class="muted">No matches.</p>'; return; }
        res.innerHTML = r.hits.map(function (x) {
          return '<button class="hit" data-id="' + esc(x.personId) + '"><b>' + esc(x.name) + '</b>' + (x.minor ? ' <span class="small muted">(minor)</span>' : '') +
            '<div class="small muted">' + esc(x.email) + (x.phone ? ' · ' + esc(x.phone) : '') + ' · ' + esc(x.status) + '</div></button>';
        }).join('') + (r.more ? '<p class="small muted">' + r.more + ' more. Narrow the search.</p>' : '');
        on('.hit', 'click', function () { adminView(this.getAttribute('data-id')); });
      }).catch(function (e) { res.innerHTML = ''; msg.textContent = e.message; });
    };
    on('#go', 'click', go); on('#q', 'keydown', function (e) { if (e.key === 'Enter') go(); });
  }
  function adminView(pid) {
    spinner('Loading volunteer…');
    call('adminView', { code: activeCode(), personId: pid }).then(function (d) { state.adminData = d; renderHome(d, true); })
      .catch(function (e) { h(adminBar() + '<div class="card"><p class="err">' + esc(e.message) + '</p></div>'); wireAdminBar(); });
  }
  function adminCard(d) {
    var a = d.adminView || {};
    return '<div class="card admincard"><div class="big">' + esc(a.name) + '</div>' +
      '<div class="small">' + esc(a.email) + '</div>' +
      '<div class="small">' + (a.phone ? '<a href="' + telLink(a.phone) + '">' + esc(a.phone) + '</a>' : '<span class="muted">no phone</span>') + (a.parentPhone ? ' · parent ' + esc(a.parentPhone) : '') + '</div>' +
      '<div class="small">Status: <b>' + esc(a.status) + '</b>' + (a.inactiveReason ? ' — ' + esc(a.inactiveReason) : '') + '</div>' +
      '<div class="small muted">Shirt ' + esc(a.shirt || '—') + ' · Groups ' + esc(a.groups || '—') + ' · Students ' + esc(a.students || '—') + '</div></div>';
  }
})();
