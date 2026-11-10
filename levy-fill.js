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
      { p: 8, t: 'unit', x: 42, y: 711, size: 7, maxW: 132 }, { p: 8, t: 'name', x: 181, y: 711, size: 9 }, { p: 8, t: 'date', x: 487, y: 711, size: 9 },
      { p: 12, t: 'name', x: 70, y: 90 }, { p: 12, t: 'sig', x: 255, y: 87 }, { p: 12, t: 'date', x: 470, y: 90 },
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
    // Health interview (p8): circle Yes or No. [Yes center x, No center x, baseline y]
    health: {
      diarrhea: [265, 323, 346], fever: [265, 323, 331], vomiting: [265, 323, 316], jaundice: [265, 323, 302],
      throat: [265, 323, 287], boils: [264, 322, 251], past: [391, 431, 222], hr1: [508, 540, 172], hr2: [496, 528, 160], hr3: [172, 202, 136]
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
    var font = await doc.embedFont(L.StandardFonts.Helvetica), ink = L.rgb(0.05, 0.1, 0.35);
    async function stamp(list, val) {
      var img = val.sig ? await doc.embedPng(val.sig) : null;
      list.forEach(function (f) {
        var pg = pages[f.p - 1];
        if (f.t === 'sig') { if (!img) return; var h = f.h || 20, w = Math.min(img.width * h / img.height, f.maxW || 170); pg.drawImage(img, { x: f.x, y: f.y - 2, width: w, height: w * img.height / img.width }); return; }
        var s = fit(font, val[f.t], f.size || 11, f.maxW); if (!s.text) return;
        pg.drawText(s.text, { x: f.x, y: f.y, size: s.size, font: font, color: ink });
      });
    }
    await stamp(LEVY_MAP.me, v);
    var hp = pages[7];
    Object.keys(LEVY_MAP.health).forEach(function (k) {
      if (v.health[k] !== true && v.health[k] !== false) return;
      var a = LEVY_MAP.health[k], x = v.health[k] ? a[0] : a[1];
      hp.drawEllipse({ x: x, y: a[2] + 3, xScale: v.health[k] ? 11 : 9, yScale: 6.5, borderColor: ink, borderWidth: 1.1 });
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
