/* Edgewood Volunteer Hub – minor release filler (Levy Exhibit G).
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Stamps the student's and the parent's parts onto Levy's own "Exhibit G Minor Indemnity and Release" PDF
 * (2026 file, 3 pages, 612x792). Coordinates are PDF points from the bottom-left, measured from that file.
 * The student part and the parent part can be stamped at different times (parent signs later from a link).
 * If Levy issues a new form, the check fails and the e-form steps aside. Needs pdf-lib (window.PDFLib). */
(function () {
  'use strict';
  var MAP = {
    check: { pages: 3, w: 612, h: 792 },
    // p1: "made as of the ___ day of ______, 2026 through the ___ day of ______, 2027, by the undersigned ... for ______ ("Group")"
    p1: { startDay: { x: 96, y: 669, maxW: 54 }, startMonth: { x: 194, y: 669, maxW: 72 }, startYear: { x: 268, y: 668, w: 24 },
          endDay: { x: 352, y: 669, maxW: 90 }, endMonth: { x: 449, y: 669, maxW: 72 }, endYear: { x: 90, y: 655, w: 24 },
          group: { x: 403, y: 656, maxW: 118, size: 10 } },
    student: [ { p: 2, t: 'name', x: 128, y: 221, maxW: 144 }, { p: 2, t: 'sig', x: 292, y: 220, maxW: 138 }, { p: 2, t: 'date', x: 452, y: 221, maxW: 48, size: 10 } ],
    parent: [ { p: 2, t: 'name', x: 134, y: 163, maxW: 140 }, { p: 2, t: 'minor', x: 396, y: 163, maxW: 90 },
              { p: 2, t: 'sig', x: 130, y: 82, maxW: 175 }, { p: 2, t: 'date', x: 382, y: 82, maxW: 110 } ]
  };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function parts(iso) { var m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function fit(font, text, size, maxW) { text = String(text || ''); if (!maxW) return { text: text, size: size };
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5; return { text: text, size: size }; }

  /** who: 'student' (also fills page 1) or 'parent'. v = { name, date, sig (PNG bytes), start, end, group, minor } */
  async function fill(bytes, who, v) {
    var L = window.PDFLib, doc = await L.PDFDocument.load(bytes, { ignoreEncryption: true });
    var pages = doc.getPages(), c = MAP.check;
    if (pages.length !== c.pages || Math.round(pages[0].getWidth()) !== c.w || Math.round(pages[0].getHeight()) !== c.h) throw new Error('RELEASE_FORM_CHANGED');
    pages.forEach(function (pg) {   // drop Levy's yellow highlight boxes and comments; keep links
      var an = pg.node.lookup(L.PDFName.of('Annots')); if (!an || !an.asArray) return;
      var keep = an.asArray().filter(function (ref) { var o = doc.context.lookup(ref), st = o && o.get && o.get(L.PDFName.of('Subtype')); return !st || String(st) === '/Link'; });
      if (keep.length) pg.node.set(L.PDFName.of('Annots'), doc.context.obj(keep)); else pg.node.delete(L.PDFName.of('Annots'));
    });
    var font = await doc.embedFont(L.StandardFonts.Helvetica), ink = L.rgb(0.05, 0.1, 0.35), white = L.rgb(1, 1, 1);
    function text(pg, f, s) { var a = fit(font, s, f.size || 11, f.maxW); if (a.text) pg.drawText(a.text, { x: f.x, y: f.y, size: a.size, font: font, color: ink }); }
    if (who === 'student') {
      var p1 = pages[0], P = MAP.p1, s = parts(v.start), e = parts(v.end);
      if (s) { text(p1, P.startDay, ord(s.d)); text(p1, P.startMonth, MONTHS[s.m - 1]);
        if (s.y !== 2026) { p1.drawRectangle({ x: P.startYear.x, y: P.startYear.y - 2, width: P.startYear.w, height: 11, color: white }); p1.drawText(String(s.y), { x: P.startYear.x, y: P.startYear.y, size: 11, font: font, color: ink }); } }
      if (e) { text(p1, P.endDay, ord(e.d)); text(p1, P.endMonth, MONTHS[e.m - 1]);
        if (e.y !== 2027) { p1.drawRectangle({ x: P.endYear.x, y: P.endYear.y - 2, width: P.endYear.w, height: 11, color: white }); p1.drawText(String(e.y), { x: P.endYear.x, y: P.endYear.y, size: 11, font: font, color: ink }); } }
      text(p1, P.group, v.group);
    }
    var img = v.sig ? await doc.embedPng(v.sig) : null;
    MAP[who].forEach(function (f) {
      var pg = pages[f.p - 1];
      if (f.t === 'sig') { if (!img) return; var h = 20, w = Math.min(img.width * h / img.height, f.maxW); pg.drawImage(img, { x: f.x, y: f.y - 2, width: w, height: w * img.height / img.width }); return; }
      text(pg, f, v[f.t]);
    });
    doc.setTitle('Minor release – ' + (who === 'student' ? v.name : v.minor)); doc.setProducer('Edgewood Volunteer Hub');
    return await doc.save();
  }
  window.ReleaseFill = { fill: fill, MAP: MAP };
})();
