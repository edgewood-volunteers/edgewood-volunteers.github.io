/* Edgewood Volunteer Hub – sign the Levy packet online (?view=levy).
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Fills and signs Levy's own packet PDF in the browser (levy-fill.js + pdf-lib), then files it through the Hub's
 * normal upload path, so it lands in the volunteer's folder and Documents like any upload. Signing needs the
 * person's volunteer code (saved on this device by their link or sign-in); an email sign-in can't sign. */
(function () {
  'use strict';
  var API = window.HUB_API, ENV = window.HUB_ENV || 'LIVE', PFX = ENV === 'LIVE' ? '' : 'sbx_';
  var PACKET_URL = window.HUB_LEVY_PACKET_URL || 'https://drive.google.com/file/d/1frLLXV30ZIk1UVcRXYRwarouXT4MfQVj/view';
  var LEGENDS_URL = 'https://www.brainshark.com/levy/nonlevyteammembertraining';
  var root = document.getElementById('hub'), home = location.pathname;
  var st = { info: null, tpl: null, sig: null, drawn: false, pdf: null };

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
  function b64(bytes) { var s = '', n = 0x8000; for (var i = 0; i < bytes.length; i += n) s += String.fromCharCode.apply(null, bytes.subarray(i, i + n)); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function hdr(sub) { return '<header><div><a class="title" href="' + home + '" style="color:inherit;text-decoration:none">Edgewood Volunteer Hub</a><div class="sub">' + esc(sub || 'Levy packet') + '</div></div>' +
    '<div class="pills"><a class="pill" href="' + home + '" style="text-decoration:none">&larr; My dashboard</a></div></header>'; }
  function page(html) { root.innerHTML = hdr(st.info ? 'Levy packet · ' + (st.info.goesBy || st.info.first) : '') + html + '<footer>© 2026 NE Prints &amp; Design, LLC' + (ENV !== 'LIVE' ? ' · ' + esc(ENV) : '') + '</footer>'; window.scrollTo(0, 0); }
  function $(id) { return document.getElementById(id); }

  // Who is signing: ?code= on the link, else the person active on this device (must have a code)
  var qs = new URLSearchParams(location.search), code = normCode(qs.get('code'));
  if (code) history.replaceState(null, '', home + '?view=levy');
  if (!code) {
    var list = store(PFX + 'hubCodes') || [], act = store(PFX + 'hubActive');
    var e = list.filter(function (x) { return (x.id || x.code) === act; })[0] || list[0];
    code = e && e.code ? normCode(e.code) : '';
  }
  if (!code) {
    page('<div class="card"><h2>Sign the Levy packet</h2><p>To sign, open this from your volunteer page or the personal link in your Hub email, so we know who is signing.</p>' +
      '<a class="btn primary" href="' + home + '">Open my volunteer page</a></div>');
    return;
  }

  page('<div class="card center"><div class="spin"></div><p class="muted">Getting Levy\'s packet ready…</p></div>');
  call('levyStart', { code: code }).then(function (r) { st.info = r; st.tpl = unb64(r.template.b64); form(); })
    .catch(function (e) { page('<div class="card"><p class="err">' + esc(e.message) + '</p><a class="btn" href="' + home + '">Back to my dashboard</a></div>'); });

  function yn(key, q) {
    return '<div class="yn" data-k="' + key + '"><div class="small">' + esc(q) + '</div><label class="chk" style="display:inline-block;margin-right:16px"><input type="radio" name="h_' + key + '" value="no"> No</label>' +
      '<label class="chk" style="display:inline-block"><input type="radio" name="h_' + key + '" value="yes"> Yes</label></div>';
  }
  function form() {
    var i = st.info, F = window.LevyFill, name = (i.first + ' ' + i.last).trim();
    var acks = ['Fair Treatment Policy (harassment, retaliation, bullying)', 'Payment Integrity Policy (cash handling)', 'Health Reporting Agreement',
      'Safety Pledge', 'Safety Basics and Policies', 'Policy and Training Acknowledgment'];
    page(
      '<div class="card"><h2>Sign the Levy packet online</h2><p class="small">This fills in and signs Levy\'s ' + esc((i.template.name.match(/20\d\d/) || [''])[0]) + ' volunteer packet for you, the same 16 pages you would print, ' +
        'and files it with your paperwork. About 3 minutes.</p><p class="small"><a href="' + PACKET_URL + '" target="_blank" rel="noopener">Read the full packet (PDF)</a> · ' +
        '<a href="' + LEGENDS_URL + '" target="_blank" rel="noopener">Creating Legends training</a></p></div>' +
      '<div class="card"><b>1. Your name</b><label class="lbl">Printed name (as it should appear on Levy\'s forms)</label><input id="nm" value="' + esc(name) + '">' +
        '<label class="lbl">Initials</label><input id="ini" maxlength="4" style="width:90px" value="' + esc(initials(name)) + '">' +
        (i.needShirt ? '<label class="lbl">Shirt size</label><select id="shirt"><option value="">Pick one</option>' + ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div class="card"><b>2. Policies</b><p class="small muted">Levy asks you to read and acknowledge each of these. They are in the packet linked above.</p>' +
        acks.map(function (a, n) { return '<label class="chk"><input type="checkbox" class="ack" id="ack' + n + '"> I have read and agree to the ' + esc(a) + '</label>'; }).join('') + '</div>' +
      '<div class="card"><b>3. Health interview</b> <span class="small muted">(Levy page 8)</span><p class="small"><b>Today</b>, are you suffering from any of the following? Symptoms from a chronic condition don\'t need to be reported.</p>' +
        F.HEALTH_QS.map(function (q) { return yn(q[0], q[1]); }).join('') +
        '<input id="boilsX" placeholder="If yes, explain" style="display:none">' +
        '<p class="small" style="margin-top:12px"><b>Past</b></p>' + yn(F.HEALTH_PAST[0], F.HEALTH_PAST[1]) + '<input id="pastX" placeholder="If yes, the date and type of diagnosis" style="display:none">' +
        '<p class="small" style="margin-top:12px"><b>High-risk conditions</b></p>' + F.HEALTH_HR.map(function (q) { return yn(q[0], q[1]); }).join('') +
        '<p class="small err" id="hyes" style="display:none">You can still submit. Levy requires any "Yes" to be reported to their hotline before you work, so the IU liaison will be in touch.</p></div>' +
      '<div class="card"><b>4. Sign</b><p class="small muted">Sign with your finger or mouse. Your signature goes on each signature line in the packet.</p>' +
        '<canvas id="pad" style="width:100%;height:130px;border:1px dashed #94a3b8;border-radius:8px;touch-action:none;background:#fff"></canvas>' +
        '<div class="row"><span class="small muted">' + esc(today()) + '</span><button class="btn sm" id="clr">Clear</button></div>' +
        '<label class="chk"><input type="checkbox" id="esig"> I agree that my signature above, applied to each signature line of this packet, is the same as signing it by hand.</label></div>' +
      '<div class="card"><b>5. Creating Legends certificate</b> <span class="small muted">(optional, if you have it)</span>' +
        '<p class="small">Levy\'s packet asks you to attach it. <a href="' + LEGENDS_URL + '" target="_blank" rel="noopener">Take the training</a>, then upload the certificate here (photo or PDF). You can also add it later.</p>' +
        '<input type="file" id="leg" accept="image/*,application/pdf"><label class="lbl">Date on the certificate</label><input type="date" id="legd"></div>' +
      '<div class="card"><p class="err" id="msg"></p><button class="btn" id="prev">Preview the signed packet</button><button class="btn primary" id="go">Sign and submit</button></div>');
    wirePad();
    root.addEventListener('change', function (e) {
      var t = e.target; if (!t.name || t.name.indexOf('h_') !== 0) return;
      var k = t.name.slice(2), on = t.value === 'yes';
      if (k === 'boils') $('boilsX').style.display = on ? 'block' : 'none';
      if (k === 'past') $('pastX').style.display = on ? 'block' : 'none';
      $('hyes').style.display = Array.prototype.some.call(root.querySelectorAll('input[type=radio][value=yes]'), function (x) { return x.checked; }) ? 'block' : 'none';
    });
    $('nm').addEventListener('input', function () { $('ini').value = initials(this.value); });
    $('clr').addEventListener('click', function () { clearPad(); });
    $('prev').addEventListener('click', function () { build(true); });
    $('go').addEventListener('click', function () { build(false); });
  }
  function initials(n) { return String(n || '').trim().split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase(); }).join('').slice(0, 4); }

  // ---------- signature pad
  var pad, ctx;
  function wirePad() {
    pad = $('pad'); var r = pad.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(130 * dpr); ctx = pad.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f5a';
    var down = false, last = null;
    function pt(e) { var b = pad.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    pad.addEventListener('pointerdown', function (e) { down = true; last = pt(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
    pad.addEventListener('pointermove', function (e) { if (!down) return; var p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; st.drawn = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { pad.addEventListener(ev, function () { down = false; }); });
  }
  function clearPad() { ctx.clearRect(0, 0, pad.width, pad.height); st.drawn = false; }
  function sigPng() {   // trim to the ink so it sits on the line at a sensible size
    var w = pad.width, h = pad.height, d = pad.getContext('2d').getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    var c = document.createElement('canvas'); c.width = x1 - x0 + 8; c.height = y1 - y0 + 8;
    c.getContext('2d').drawImage(pad, x0 - 4, y0 - 4, c.width, c.height, 0, 0, c.width, c.height);
    return unb64(c.toDataURL('image/png').split(',')[1]);
  }

  // ---------- build, preview, submit
  function collect() {
    var F = window.LevyFill, keys = F.HEALTH_QS.map(function (q) { return q[0]; }).concat([F.HEALTH_PAST[0]], F.HEALTH_HR.map(function (q) { return q[0]; }));
    var health = {}, missing = 0;
    keys.forEach(function (k) { var c = root.querySelector('input[name=h_' + k + ']:checked'); if (!c) missing++; else health[k] = c.value === 'yes'; });
    var name = $('nm').value.trim().replace(/\s+/g, ' ');
    if (name.split(' ').length < 2) throw new Error('Enter your first and last name.');
    if (!$('ini').value.trim()) throw new Error('Enter your initials.');
    if ($('shirt') && !$('shirt').value) throw new Error('Pick a shirt size.');
    if (root.querySelectorAll('.ack:not(:checked)').length) throw new Error('Check each policy box in step 2.');
    if (missing) throw new Error('Answer every health interview question in step 3 (' + missing + ' left).');
    if (health.boils && !$('boilsX').value.trim()) throw new Error('Explain the "Yes" for boils or wounds in step 3.');
    if (health.past && !$('pastX').value.trim()) throw new Error('Give the date and type of the past diagnosis in step 3.');
    if (!st.drawn) throw new Error('Sign in the box in step 4.');
    if (!$('esig').checked) throw new Error('Check the box under your signature in step 4.');
    var sig = sigPng(); if (!sig) throw new Error('Sign in the box in step 4.');
    return { name: name, initials: $('ini').value.trim().toUpperCase(), date: today(), unit: st.info.unit, sig: sig, health: health,
      boilsExplain: $('boilsX').value.trim(), pastDetail: $('pastX').value.trim(), healthYes: keys.some(function (k) { return health[k]; }) };
  }
  function build(preview) {
    var msg = $('msg'), go = $('go'), pv = $('prev'); msg.textContent = '';
    var v; try { v = collect(); } catch (e) { msg.textContent = e.message; return; }
    go.disabled = pv.disabled = true; msg.className = 'muted'; msg.textContent = preview ? 'Building your packet…' : 'Signing your packet…';
    window.LevyFill.fillPacket(st.tpl.slice(), v).then(function (bytes) {
      if (preview) {
        var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        window.open(url, '_blank', 'noopener'); msg.textContent = 'The preview opened in a new tab. If it didn\'t, '; var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.textContent = 'open it here'; msg.appendChild(a);
        go.disabled = pv.disabled = false; return;
      }
      return submit(v, bytes);
    }).catch(function (e) {
      msg.className = 'err'; go.disabled = pv.disabled = false;
      msg.textContent = e.message === 'LEVY_PACKET_CHANGED' ? 'Levy has a new version of the packet that this page can\'t fill yet. Please download it from the paperwork page and upload a signed copy instead. (Tech support has been told.)' : e.message;
      if (e.message === 'LEVY_PACKET_CHANGED') call('clientError', { msg: 'Levy e-form: packet changed, field map needs updating', page: 'levy' }).catch(function () {});
    });
  }
  function readFile(f) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result.split(',')[1]); }; r.onerror = no; r.readAsDataURL(f); }); }
  function submit(v, bytes) {
    var msg = $('msg'), sid = 'levy-' + Math.random().toString(36).slice(2, 12), leg = $('leg').files[0];
    var nameFile = 'Levy-Packet-' + v.name.replace(/[^\w]+/g, '-') + '.pdf';
    msg.textContent = 'Uploading your signed packet…';
    return call('upload', { file: { b64: b64(new Uint8Array(bytes)), type: 'application/pdf', name: nameFile } }).then(function (pid) {
      if (!leg) return [pid, ''];
      if (leg.size > 10 * 1024 * 1024) throw new Error('The certificate file is over 10 MB. Try a smaller photo or a PDF.');
      msg.textContent = 'Uploading your certificate…';
      return readFile(leg).then(function (d) { return call('upload', { file: { b64: d, type: leg.type || 'application/pdf', name: leg.name } }); }).then(function (lid) { return [pid, lid]; });
    }).then(function (ids) {
      msg.textContent = 'Filing it with your paperwork…';
      return call('levySubmit', { code: code, packetFile: ids[0], legendsFile: ids[1] || '', legendsDate: $('legd').value || '', healthYes: v.healthYes,
        shirt: $('shirt') ? $('shirt').value : '', submitId: sid });
    }).then(function () {
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      page('<div class="card center"><h2>Signed and filed ✅</h2><p>Your Levy packet is in your paperwork folder. The IU liaison will check it, and your dashboard shows it as "being checked" until then.</p>' +
        (v.healthYes ? '<p class="small err">You answered Yes on the health interview, so the IU liaison will contact you before your next shift.</p>' : '') +
        (leg ? '' : '<p class="small">Still need your Creating Legends certificate? <a href="' + LEGENDS_URL + '" target="_blank" rel="noopener">Take the training</a>, then upload it from your dashboard.</p>') +
        '<a class="btn" href="' + url + '" download="' + esc(nameFile) + '">Download my signed copy</a><a class="btn primary" href="' + home + '">Back to my dashboard</a></div>');
    }).catch(function (e) { var go = $('go'), pv = $('prev'); if (go) go.disabled = pv.disabled = false; msg.className = 'err'; msg.textContent = e.message; });
  }
})();
