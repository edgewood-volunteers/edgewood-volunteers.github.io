/* Edgewood Volunteer Hub – sign the minor release online (?view=release).
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Levy Exhibit G. The student signs (with their volunteer code), then a parent/guardian signs either on the same
 * device or from their own link (?view=release&p=<token>). The browser stamps Levy's PDF (release-fill.js +
 * pdf-lib); the Hub files it like an upload once both have signed. */
(function () {
  'use strict';
  var API = window.HUB_API, ENV = window.HUB_ENV || 'LIVE', PFX = ENV === 'LIVE' ? '' : 'sbx_';
  var FORM_URL = 'https://drive.google.com/file/d/1gM9vNGuflJMvWBBLo_PJYRq9nPA_Yf4T/view';
  var root = document.getElementById('hub'), home = location.pathname;
  var st = { info: null, tpl: null, pads: {} };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function normCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function call(action, body) {
    body = body || {}; body.action = action;
    return fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Something went wrong.'); return j.result;
    });
  }
  function today() { var d = new Date(); return (d.getMonth() + 1 + '').padStart(2, '0') + '/' + (d.getDate() + '').padStart(2, '0') + '/' + d.getFullYear(); }
  function niceDate(iso) { var m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? (+m[2]) + '/' + (+m[3]) + '/' + m[1] : ''; }
  function b64(bytes) { var s = '', n = 0x8000; for (var i = 0; i < bytes.length; i += n) s += String.fromCharCode.apply(null, bytes.subarray(i, i + n)); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function $(id) { return document.getElementById(id); }
  function hdr(sub) { return '<header><div><a class="title" href="' + home + '" style="color:inherit;text-decoration:none">Edgewood Volunteer Hub</a><div class="sub">' + esc(sub) + '</div></div>' +
    (tok ? '' : '<div class="pills"><a class="pill" href="' + home + '" style="text-decoration:none">&larr; My dashboard</a></div>') + '</header>'; }
  function page(html) { var i = st.info; root.innerHTML = hdr('Minor release' + (i ? ' · ' + (i.goesBy || i.first) + ' ' + i.last : '')) + html + '<footer>© 2026 NE Prints &amp; Design, LLC' + (ENV !== 'LIVE' ? ' · ' + esc(ENV) : '') + '</footer>'; window.scrollTo(0, 0); }

  // Who: ?p= (a parent's link) or the student's volunteer code (?code= or the person active on this device)
  var qs = new URLSearchParams(location.search), tok = String(qs.get('p') || '').replace(/\W/g, ''), code = normCode(qs.get('code'));
  if (code) history.replaceState(null, '', home + '?view=release');
  if (!tok && !code) {
    var list = store(PFX + 'hubCodes') || [], act = store(PFX + 'hubActive');
    var e = list.filter(function (x) { return (x.id || x.code) === act; })[0] || list[0];
    code = e && e.code ? normCode(e.code) : '';
  }
  if (!tok && !code) {
    page('<div class="card"><h2>Sign the minor release</h2><p>To sign, open this from your volunteer page or the personal link in your Hub email, so we know who is signing.</p>' +
      '<a class="btn primary" href="' + home + '">Open my volunteer page</a></div>');
    return;
  }
  page('<div class="card center"><div class="spin"></div><p class="muted">Getting the form ready…</p></div>');
  call('releaseStart', tok ? { p: tok } : { code: code }).then(function (r) { st.info = r; st.tpl = unb64(r.template.b64); if (r.role === 'parent') parentForm(); else studentForm(); })
    .catch(function (e) { page('<div class="card"><p class="err">' + esc(e.message) + '</p>' + (tok ? '' : '<a class="btn" href="' + home + '">Back to my dashboard</a>') + '</div>'); });

  // ---------- shared pieces
  function padHtml(id, label) {
    return '<p class="small muted">' + esc(label) + '</p><canvas id="' + id + '" style="width:100%;height:130px;border:1px dashed #94a3b8;border-radius:8px;touch-action:none;background:#fff"></canvas>' +
      '<div class="row"><span class="small muted">' + esc(today()) + '</span><button class="btn sm" type="button" data-clear="' + id + '">Clear</button></div>';
  }
  function wirePad(id) {
    var pad = $(id), r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, P = st.pads[id] = { el: pad, drawn: false };
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(130 * dpr); var ctx = pad.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f5a'; P.ctx = ctx;
    var down = false, last = null;
    function pt(e) { var b = pad.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    pad.addEventListener('pointerdown', function (e) { down = true; last = pt(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
    pad.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; P.drawn = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { pad.addEventListener(ev, function () { down = false; }); });
    root.querySelector('[data-clear="' + id + '"]').addEventListener('click', function () { ctx.clearRect(0, 0, pad.width, pad.height); P.drawn = false; });
  }
  function sigPng(id) {   // trim to the ink so it sits on the line at a sensible size
    var P = st.pads[id]; if (!P || !P.drawn) return null;
    var pad = P.el, w = pad.width, h = pad.height, d = pad.getContext('2d').getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    var c = document.createElement('canvas'); c.width = x1 - x0 + 8; c.height = y1 - y0 + 8;
    c.getContext('2d').drawImage(pad, x0 - 4, y0 - 4, c.width, c.height, 0, 0, c.width, c.height);
    return unb64(c.toDataURL('image/png').split(',')[1]);
  }
  function shirtHtml() { return st.info.needShirt ? '<label class="lbl">Student\'s shirt size</label><select id="shirt"><option value="">Pick one</option>' +
    ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' : ''; }
  function parentHtml(n) {
    var i = st.info;
    return '<label class="lbl">Parent or guardian\'s full name</label><input id="pnm" value="' + esc(tok ? '' : i.parent) + '" autocomplete="name">' +
      '<label class="chk"><input type="checkbox" id="age16"> I certify that ' + esc((i.goesBy || i.first) + ' ' + i.last) + ' is at least 16 years old.</label>' +
      '<p class="small">I have read this Minor Indemnity and Release and consent to its terms on behalf of my student. <a href="' + FORM_URL + '" target="_blank" rel="noopener">Read the full form (PDF)</a></p>' +
      padHtml('ppad', 'Parent or guardian: sign with your finger or mouse.') +
      '<label class="chk"><input type="checkbox" id="pesig"> I agree that my signature above, placed on this form, is the same as signing it by hand.</label>';
  }
  function parentVals() {
    var name = $('pnm').value.trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 2) throw new Error('Enter the parent or guardian\'s first and last name.');
    if (!$('age16').checked) throw new Error('Levy\'s release is only for students 16 or older. Check the box to confirm the student\'s age.');
    var sig = sigPng('ppad'); if (!sig) throw new Error('The parent or guardian needs to sign in the box.');
    if (!$('pesig').checked) throw new Error('Check the box under the parent or guardian\'s signature.');
    if ($('shirt') && !$('shirt').value) throw new Error('Pick the student\'s shirt size.');
    return { name: name, date: today(), sig: sig, minor: (st.info.first + ' ' + st.info.last).trim() };
  }
  function failMsg(e) {
    if (e.message === 'RELEASE_FORM_CHANGED') { call('clientError', { msg: 'Release e-form: form changed, field map needs updating', page: 'release' }).catch(function () {});
      return 'Levy has a new version of this form that this page can\'t fill yet. Please download it from the paperwork page and upload a signed copy instead. (Tech support has been told.)'; }
    return e.message;
  }
  function preview(bytes) {
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); window.open(url, '_blank', 'noopener'); return url;
  }
  function upload(bytes, name) { return call('upload', { file: { b64: b64(new Uint8Array(bytes)), type: 'application/pdf', name: name } }); }
  function fileName() { return 'Minor-Release-' + (st.info.first + '-' + st.info.last).replace(/[^\w]+/g, '-') + '.pdf'; }

  // ---------- the student's page
  function studentForm() {
    var i = st.info, name = (i.first + ' ' + i.last).trim();
    if (!i.minor) {
      page('<div class="card"><h2>Minor release</h2><p>This form is only for volunteers under 18, and your record isn\'t marked as a minor, so you don\'t need it.</p>' +
        '<p class="small">If you are under 18, tell the IU liaison so they can fix your record.</p><a class="btn" href="' + home + '">Back to my dashboard</a></div>');
      return;
    }
    page(
      '<div class="card"><h2>Sign the minor release online</h2><p class="small">Levy requires this for volunteers under 18 (Levy Exhibit G). You sign first, then a parent or guardian signs, ' +
        'either right here on this device or from a link we send them. It covers ' + esc(niceDate(i.start)) + ' through ' + esc(niceDate(i.end)) + '.</p>' +
        '<p class="small"><a href="' + FORM_URL + '" target="_blank" rel="noopener">Read the full form (PDF)</a></p></div>' +
      '<div class="card"><b>1. You (the student)</b><label class="lbl">Your printed name</label><input id="snm" value="' + esc(name) + '">' + shirtHtml() +
        padHtml('spad', 'Sign with your finger or mouse.') +
        '<label class="chk"><input type="checkbox" id="sesig"> I have read this release and agree to it. My signature above, placed on this form, is the same as signing it by hand.</label></div>' +
      '<div class="card"><b>2. Your parent or guardian</b>' +
        '<label class="chk"><input type="radio" name="how" value="here"> They\'re here with me now</label>' +
        '<label class="chk"><input type="radio" name="how" value="send"> Send it to them to sign on their own phone</label>' +
        '<div id="here" style="display:none;margin-top:10px">' + parentHtml() + '</div>' +
        '<div id="send" style="display:none;margin-top:10px"><p class="small">We\'ll make a link for them. You can text it from your phone on the next screen' +
          (i.parentPhone ? ' (to ' + esc(i.parentPhone) + ')' : '') + ', and we can also email it:</p>' +
          '<label class="lbl">Parent\'s email <span class="muted">(optional)</span></label><input id="pem" type="email" autocomplete="off" placeholder="parent@example.com"></div></div>' +
      '<div class="card"><p class="err" id="msg"></p><button class="btn" id="prev" type="button">Preview</button><button class="btn primary" id="go" type="button">Sign and submit</button></div>');
    wirePad('spad');
    root.addEventListener('change', function (e) {
      if (e.target.name !== 'how') return;
      var here = e.target.value === 'here'; $('here').style.display = here ? 'block' : 'none'; $('send').style.display = here ? 'none' : 'block';
      $('go').textContent = here ? 'Sign and submit' : 'Sign and send to my parent';
      if (here && !st.pads.ppad) wirePad('ppad');
    });
    $('prev').addEventListener('click', function () { run(true); });
    $('go').addEventListener('click', function () { run(false); });
  }
  function studentVals() {
    var name = $('snm').value.trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 2) throw new Error('Enter your first and last name in step 1.');
    var sig = sigPng('spad'); if (!sig) throw new Error('Sign in the box in step 1.');
    if (!$('sesig').checked) throw new Error('Check the box under your signature in step 1.');
    var how = root.querySelector('input[name=how]:checked'); if (!how) throw new Error('In step 2, choose how your parent or guardian will sign.');
    if (how.value === 'here' && $('shirt') && !$('shirt').value) throw new Error('Pick your shirt size in step 1.');
    return { name: name, date: today(), sig: sig, start: st.info.start, end: st.info.end, group: st.info.group, how: how.value };
  }
  function run(isPreview) {
    var msg = $('msg'), go = $('go'), pv = $('prev'); msg.className = 'err'; msg.textContent = '';
    var s, p = null;
    try { s = studentVals(); if (s.how === 'here') p = parentVals(); } catch (e) { msg.textContent = e.message; return; }
    if (s.how === 'send') { var em = $('pem').value.trim(); if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = 'That email address doesn\'t look right.'; return; } }
    go.disabled = pv.disabled = true; msg.className = 'muted'; msg.textContent = isPreview ? 'Building the form…' : 'Signing…';
    var F = window.ReleaseFill;
    F.fill(st.tpl.slice(), 'student', s).then(function (b1) { return p ? F.fill(b1, 'parent', p) : b1; }).then(function (bytes) {
      if (isPreview) { preview(bytes); msg.textContent = 'The preview opened in a new tab.'; go.disabled = pv.disabled = false; return; }
      msg.textContent = 'Uploading…';
      return upload(bytes, fileName()).then(function (fid) {
        if (p) { msg.textContent = 'Filing it with your paperwork…';
          return call('releaseSubmit', { code: code, file: fid, parentName: p.name, start: s.start, end: s.end, shirt: $('shirt') ? $('shirt').value : '', submitId: 'rel-' + Math.random().toString(36).slice(2, 12) })
            .then(function () { done(bytes, false); }); }
        msg.textContent = 'Making your parent\'s link…';
        return call('releaseSend', { code: code, file: fid, studentName: s.name, studentDate: s.date, start: s.start, end: s.end, email: $('pem').value.trim() })
          .then(function (r) { sent(r); });
      });
    }).catch(function (e) { msg.className = 'err'; msg.textContent = failMsg(e); go.disabled = pv.disabled = false; });
  }
  function sent(r) {
    var i = st.info, ph = String(i.parentPhone || '').replace(/\D/g, ''), txt = 'Hi! Can you sign my IU concessions minor release? It takes about a minute: ' + r.link;
    page('<div class="card center"><h2>Your part is signed ✅</h2><p>Now your parent or guardian needs to sign. ' + (r.sent ? 'We emailed the link to <b>' + esc(r.sent) + '</b>. ' : '') +
      'You can also text it to them:</p>' +
      '<a class="btn primary" href="sms:' + ph + '?&body=' + encodeURIComponent(txt) + '">Text the link' + (ph ? ' to ' + esc(i.parentPhone) : '') + '</a>' +
      '<button class="btn" id="cp" type="button">Copy the link</button><p class="small muted" id="cpm"></p>' +
      '<p class="small">The link works for 14 days. Your release is filed as soon as they sign.</p><a class="btn" href="' + home + '">Back to my dashboard</a></div>');
    $('cp').addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(r.link) : Promise.reject()).then(function () { $('cpm').textContent = 'Copied.'; }, function () { $('cpm').textContent = r.link; });
    });
  }

  // ---------- the parent's page (from their link)
  function parentForm() {
    var i = st.info, kid = (i.goesBy || i.first) + ' ' + i.last;
    page(
      '<div class="card"><h2>Sign ' + esc(kid) + '\'s minor release</h2><p class="small">' + esc(kid) + ' signed Levy\'s minor release' + (i.studentDate ? ' on ' + esc(i.studentDate) : '') +
        ' to volunteer at IU Athletics concessions with ' + esc(i.group) + '. Levy also needs a parent or guardian\'s signature. It covers ' + esc(niceDate(i.start)) + ' through ' + esc(niceDate(i.end)) + '.</p>' +
        '<button class="btn" id="see" type="button">See what ' + esc(i.goesBy || i.first) + ' signed</button></div>' +
      '<div class="card"><b>Parent or guardian</b>' + parentHtml() + shirtHtml() + '</div>' +
      '<div class="card"><p class="err" id="msg"></p><button class="btn" id="prev" type="button">Preview</button><button class="btn primary" id="go" type="button">Sign and submit</button></div>');
    wirePad('ppad');
    $('see').addEventListener('click', function () { preview(st.tpl); });
    $('prev').addEventListener('click', function () { prun(true); });
    $('go').addEventListener('click', function () { prun(false); });
  }
  function prun(isPreview) {
    var msg = $('msg'), go = $('go'), pv = $('prev'); msg.className = 'err'; msg.textContent = '';
    var p; try { p = parentVals(); } catch (e) { msg.textContent = e.message; return; }
    go.disabled = pv.disabled = true; msg.className = 'muted'; msg.textContent = isPreview ? 'Building the form…' : 'Signing…';
    window.ReleaseFill.fill(st.tpl.slice(), 'parent', p).then(function (bytes) {
      if (isPreview) { preview(bytes); msg.textContent = 'The preview opened in a new tab.'; go.disabled = pv.disabled = false; return; }
      msg.textContent = 'Uploading…';
      return upload(bytes, fileName()).then(function (fid) {
        msg.textContent = 'Filing it…';
        return call('releaseSubmit', { p: tok, file: fid, parentName: p.name, shirt: $('shirt') ? $('shirt').value : '', submitId: 'rel-' + Math.random().toString(36).slice(2, 12) });
      }).then(function () { done(bytes, true); });
    }).catch(function (e) { msg.className = 'err'; msg.textContent = failMsg(e); go.disabled = pv.disabled = false; });
  }
  function done(bytes, isParent) {
    var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    page('<div class="card center"><h2>Signed and filed ✅</h2><p>The minor release is with ' + esc(st.info.goesBy || st.info.first) + '\'s paperwork. The IU liaison will check it.</p>' +
      '<a class="btn" href="' + url + '" download="' + esc(fileName()) + '">Download a signed copy</a>' + (isParent ? '' : '<a class="btn primary" href="' + home + '">Back to my dashboard</a>') + '</div>');
  }
})();
