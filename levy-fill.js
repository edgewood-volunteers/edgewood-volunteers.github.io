/* Edgewood Volunteer Hub – Levy packet filler.
 * Copyright (c) 2026 NE Prints & Design, LLC. All rights reserved.
 * Stamps a volunteer's answers and signature onto Levy's own packet PDF (2026 "Annual NPO-Temp-Subcon Training &
 * Policy Signoffs", 16 pages, 612x792). Coordinates are PDF points from the bottom-left, mapped from that file.
 * If Levy issues a new packet, LEVY_MAP.check fails and the e-form steps aside (people download the PDF instead)
 * until the map is redone. Needs pdf-lib (window.PDFLib). */
(function () {
  'use strict';
  var LEVY_MAP = {
    check: { pages: 16, w: 612, h: 792 },
    me: [   // the volunteer
      { p: 1, t: 'name', x: 132, y: 406, size: 12 }, { p: 1, t: 'date', x: 354, y: 406, size: 12 },
      { p: 2, t: 'initials', x: 476, y: 271, size: 12 },
      { p: 5, t: 'sig', x: 96, y: 338 }, { p: 5, t: 'date', x: 428, y: 343 },
      { p: 7, t: 'sig', x: 106, y: 145 }, { p: 7, t: 'name', x: 112, y: 115 }, { p: 7, t: 'date', x: 82, y: 86 },
      { p: 8, t: 'unit', x: 42, y: 716, size: 8, maxW: 130, wrap: 2 }, { p: 8, t: 'name', x: 181, y: 711, size: 9 }, { p: 8, t: 'date', x: 487, y: 711, size: 9 },
      { p: 12, t: 'name', x: 70, y: 92 }, { p: 12, t: 'sig', x: 255, y: 89 }, { p: 12, t: 'date', x: 470, y: 92 },
      { p: 13, t: 'sig', x: 102, y: 183 }, { p: 13, t: 'date', x: 82, y: 153 },
      { p: 14, t: 'name', x: 135, y: 151 }, { p: 14, t: 'sig', x: 126, y: 106 }, { p: 14, t: 'date', x: 424, y: 109 },
      { p: 15, t: 'name', x: 240, y: 110 }, { p: 15, t: 'sig', x: 200, y: 83 }, { p: 15, t: 'date', x: 428, y: 87 },
      { p: 16, t: 'name', x: 84, y: 380 }, { p: 16, t: 'sig', x: 76, y: 323 }, { p: 16, t: 'date', x: 426, y: 328 },
      { p: 16, t: 'unit', x: 110, y: 168, size: 10, maxW: 410 }
    ],
    mgr: [  // manager / stand lead: stamped by the liaison on approval
      { p: 8, t: 'name', x: 329, y: 711, size: 9 },
      { p: 15, t: 'name', x: 210, y: 63 }, { p: 15, t: 'sig', x: 170, y: 39 }, { p: 15, t: 'date', x: 428, y: 65 }, { p: 15, t: 'date', x: 428, y: 43 },
      { p: 16, t: 'name', x: 186, y: 130 }, { p: 16, t: 'sig', x: 180, y: 87 }, { p: 16, t: 'date', x: 438, y: 92 }
    ],
    // Health interview (p8): circle the answer and X its box. [x of the word Yes, x of the word No, baseline y]
    health: {
      diarrhea: [258, 317, 346], fever: [258, 317, 331], vomiting: [258, 317, 316], jaundice: [258, 317, 302],
      throat: [258, 317, 287], boils: [257, 316, 251], past: [384, 425, 222], hr1: [501, 534, 172], hr2: [489, 522, 160], hr3: [165, 196, 136]
    },
    boilsExplain: { p: 8, x: 410, y: 247, size: 8, maxW: 160 },
    pastDetail: { p: 8, x: 302, y: 212, size: 8, maxW: 250 }
  };
  var HEALTH_QS = [
    ['diarrhea', 'Diarrhea?'], ['fever', 'Fever?'], ['vomiting', 'Vomiting?'], ['jaundice', 'Jaundice (yellow skin or eyes)?'],
    ['throat', 'Sore throat with fever?'], ['boils', 'Boils or infected wounds containing pus on hands, wrists, arms or other exposed skin?']
  ];
  var HEALTH_PAST = ['past', 'Have you ever been diagnosed as being ill with a foodborne illness?'];
  var HEALTH_HR = [
    ['hr1', 'Have you been exposed to or suspected of causing a confirmed outbreak of foodborne illness?'],
    ['hr2', 'Do you live in the same household as a person currently diagnosed with a foodborne illness?'],
    ['hr3', 'Do you have a household member attending or working in a setting where there is a current confirmed outbreak of foodborne illness?']
  ];

  function fit(font, text, size, maxW) { text = String(text || ''); if (!maxW) return { text: text, size: size };
    while (size > 5 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5; return { text: text, size: size }; }

  /** v = { name, date, initials, unit, sig (PNG bytes), health: {key: true|false}, boilsExplain, pastDetail }
   *  mgr (optional) = { name, date, sig (PNG bytes) }. Returns the stamped PDF bytes. */
  async function fillPacket(templateBytes, v, mgr) {
    var L = window.PDFLib, doc = await L.PDFDocument.load(templateBytes, { ignoreEncryption: true });
    var pages = doc.getPages(), c = LEVY_MAP.check;
    if (pages.length !== c.pages || Math.round(pages[0].getWidth()) !== c.w || Math.round(pages[0].getHeight()) !== c.h) throw new Error('LEVY_PACKET_CHANGED');
    pages.forEach(function (pg) {   // drop leftover review comments / highlights in Levy's file; keep links
      var an = pg.node.lookup(L.PDFName.of('Annots')); if (!an || !an.asArray) return;
      var keep = an.asArray().filter(function (ref) { var o = doc.context.lookup(ref), st = o && o.get && o.get(L.PDFName.of('Subtype')); return !st || String(st) === '/Link'; });
      if (keep.length) pg.node.set(L.PDFName.of('Annots'), doc.context.obj(keep)); else pg.node.delete(L.PDFName.of('Annots'));
    });
    var font = await doc.embedFont(L.StandardFonts.Helvetica), ink = L.rgb(0.05, 0.1, 0.35);
    async function stamp(list, val) {
      var img = val.sig ? await doc.embedPng(val.sig) : null;
      list.forEach(function (f) {
        var pg = pages[f.p - 1];
        if (f.t === 'sig') { if (!img) return; var h = f.h || 20, w = Math.min(img.width * h / img.height, f.maxW || 170); pg.drawImage(img, { x: f.x, y: f.y - 2, width: w, height: w * img.height / img.width }); return; }
        var txt = String(val[f.t] || ''); if (!txt) return;
        if (f.wrap && font.widthOfTextAtSize(txt, f.size) > f.maxW) {   // break onto a second line at a space
          var words = txt.split(' '), l1 = '';
          while (words.length && font.widthOfTextAtSize((l1 ? l1 + ' ' : '') + words[0], f.size) <= f.maxW) l1 = (l1 ? l1 + ' ' : '') + words.shift();
          var a1 = fit(font, l1, f.size, f.maxW), a2 = fit(font, words.join(' '), f.size, f.maxW);
          pg.drawText(a1.text, { x: f.x, y: f.y, size: a1.size, font: font, color: ink });
          pg.drawText(a2.text, { x: f.x, y: f.y - f.size - 1, size: a2.size, font: font, color: ink }); return;
        }
        var s = fit(font, txt, f.size || 11, f.maxW);
        pg.drawText(s.text, { x: f.x, y: f.y, size: s.size, font: font, color: ink });
      });
    }
    await stamp(LEVY_MAP.me, v);
    var hp = pages[7];
    Object.keys(LEVY_MAP.health).forEach(function (k) {
      if (v.health[k] !== true && v.health[k] !== false) return;
      var a = LEVY_MAP.health[k], yes = v.health[k], x = yes ? a[0] : a[1], cx = x + (yes ? 7.5 : 6), bx = x + (yes ? 19 : 17.5), cy = a[2] + 3;
      hp.drawEllipse({ x: cx, y: cy, xScale: yes ? 10 : 8.5, yScale: 6.5, borderColor: ink, borderWidth: 1.1 });
      hp.drawLine({ start: { x: bx - 3.5, y: cy - 3.5 }, end: { x: bx + 3.5, y: cy + 3.5 }, thickness: 1.2, color: ink });
      hp.drawLine({ start: { x: bx - 3.5, y: cy + 3.5 }, end: { x: bx + 3.5, y: cy - 3.5 }, thickness: 1.2, color: ink });
    });
    [['boilsExplain', v.health.boils], ['pastDetail', v.health.past]].forEach(function (z) {
      var f = LEVY_MAP[z[0]]; if (!z[1] || !v[z[0]]) return; var s = fit(font, v[z[0]], f.size, f.maxW);
      pages[f.p - 1].drawText(s.text, { x: f.x, y: f.y, size: s.size, font: font, color: ink });
    });
    if (mgr) await stamp(LEVY_MAP.mgr, mgr);
    doc.setTitle('Levy packet – ' + v.name); doc.setProducer('Edgewood Volunteer Hub');
    return await doc.save();
  }
  window.LevyFill = { fillPacket: fillPacket, HEALTH_QS: HEALTH_QS, HEALTH_PAST: HEALTH_PAST, HEALTH_HR: HEALTH_HR, MAP: LEVY_MAP };
})();
