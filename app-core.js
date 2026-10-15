/* My1040NR core: Form 8843 (2025) preparation. Shell-agnostic: runs in the
   browser today, inside the desktop shell later. No network calls are made
   with user data. Nothing is stored: all state lives in page memory. */
'use strict';
const RULES_VERSION = '2025.1.0';
const TAX_YEAR = 2025;
const P1 = 'topmostSubform[0].Page1[0].';
const FIELD = {
  firstName: P1 + 'f1_04[0]', lastName: P1 + 'f1_05[0]', tin: P1 + 'f1_06[0]',
  addrAbroad: P1 + 'f1_07[0]', addrUS: P1 + 'f1_08[0]',
  visaEntry: P1 + 'f1_09[0]', status: P1 + 'f1_10[0]',
  citizenship: P1 + 'f1_11[0]', passportCountry: P1 + 'f1_12[0]', passportNo: P1 + 'f1_13[0]',
  days2025: P1 + 'f1_14[0]', days2024: P1 + 'f1_15[0]', days2023: P1 + 'f1_16[0]',
  daysExcluded: P1 + 'f1_17[0]',
  school: P1 + 'f1_26[0]', director: P1 + 'f1_27[0]',
  visa2019: P1 + 'f1_28[0]', visa2020: P1 + 'f1_29[0]', visa2021: P1 + 'f1_30[0]',
  visa2022: P1 + 'f1_31[0]', visa2023: P1 + 'f1_32[0]', visa2024: P1 + 'f1_33[0]',
  line14: P1 + 'f1_34[0]'
};
const CHECK = {
  line12yes: P1 + 'c1_2[0]', line12no: P1 + 'c1_2[1]',
  line13yes: P1 + 'c1_3[0]', line13no: P1 + 'c1_3[1]'
};
function fmtDate(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p[1] + '/' + p[2] + '/' + p[0];
}
/* Count calendar years in which the person was a student visa holder for any
   part of the year, from their first F/J year through 2025, plus any earlier
   F/J years they reported. Used for Form 8843 line 12 (more than 5 years). */
function studentYearCount(d) {
  let years = new Set();
  if (d.firstYear) {
    for (let y = parseInt(d.firstYear, 10); y <= TAX_YEAR; y++) years.add(y);
  }
  ['2019','2020','2021','2022','2023','2024'].forEach(function (y) {
    const v = d['visa' + y];
    if (v && v !== 'none') years.add(parseInt(y, 10));
  });
  return years.size + (parseInt(d.priorYears || '0', 10) || 0);
}
function setText(form, name, value) {
  if (value === undefined || value === null || value === '') return;
  try { form.getTextField(name).setText(String(value)); } catch (e) { /* field absent */ }
}
async function fill8843(PDFLib, formBytes, d) {
  const doc = await PDFLib.PDFDocument.load(formBytes);
  const form = doc.getForm();
  setText(form, FIELD.firstName, d.firstName);
  setText(form, FIELD.lastName, d.lastName);
  setText(form, FIELD.tin, d.tin);
  setText(form, FIELD.addrAbroad, d.addrAbroad);
  setText(form, FIELD.addrUS, d.addrUS);
  let entry = d.visaType + (d.entryDate ? ', entered ' + fmtDate(d.entryDate) : '');
  setText(form, FIELD.visaEntry, entry);
  let status = d.currentStatus || d.visaType;
  if (d.statusChanged === 'yes') {
    status += ', changed ' + fmtDate(d.changeDate) + ' from ' + d.prevStatus;
  }
  setText(form, FIELD.status, status);
  setText(form, FIELD.citizenship, d.citizenship);
  setText(form, FIELD.passportCountry, d.passportCountry);
  setText(form, FIELD.passportNo, d.passportNo);
  setText(form, FIELD.days2025, d.days2025);
  setText(form, FIELD.days2024, d.days2024);
  setText(form, FIELD.days2023, d.days2023);
  setText(form, FIELD.daysExcluded, d.daysExcluded);
  setText(form, FIELD.school, d.school);
  setText(form, FIELD.director, d.director);
  ['2019','2020','2021','2022','2023','2024'].forEach(function (y) {
    const v = d['visa' + y];
    if (v && v !== 'none') setText(form, FIELD['visa' + y], v);
  });
  try {
    if (d.line12 === 'yes') form.getCheckBox(CHECK.line12yes).check();
    else form.getCheckBox(CHECK.line12no).check();
    if (d.line13 === 'yes') {
      form.getCheckBox(CHECK.line13yes).check();
      setText(form, FIELD.line14, d.line14);
    } else form.getCheckBox(CHECK.line13no).check();
  } catch (e) { /* checkbox naming differs */ }
  form.flatten();
  return doc;
}
function wrapText(text, max) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  words.forEach(function (w) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  });
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
async function makeFrontPages(PDFLib, d) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 54;
  function draw(page, text, x, y, size, f) {
    page.drawText(String(text), { x: x, y: y, size: size || 11, font: f || font });
  }
  /* Page 1: mailing slip */
  let p = doc.addPage([W, H]);
  let y = H - 56;
  draw(p, 'Mailing slip: not an IRS form', M, y, 10, bold); y -= 26;
  draw(p, 'Print this page and keep it on top of your papers until the envelope is sealed.', M, y, 10); y -= 34;
  draw(p, 'FROM (you)', M, y, 11, bold); y -= 17;
  wrapText((d.firstName + ' ' + d.lastName).toUpperCase() + '\n' + d.addrUS, 60).forEach(function (l) { draw(p, l, M, y, 11); y -= 15; });
  y -= 14;
  draw(p, 'MAIL TO', M, y, 11, bold); y -= 24;
  draw(p, 'Department of the Treasury', M, y, 17, bold); y -= 21;
  draw(p, 'Internal Revenue Service', M, y, 17, bold); y -= 21;
  draw(p, 'Austin, TX 73301-0215', M, y, 17, bold); y -= 20;
  draw(p, 'This is the IRS address printed in the Form 8843 instructions for a', M, y, 10); y -= 14;
  draw(p, 'Form 8843 filed by itself, with no payment enclosed.', M, y, 10); y -= 30;
  draw(p, 'IN THE ENVELOPE', M, y, 11, bold); y -= 17;
  draw(p, '[ ] Form 8843 (signed and dated on page 2)', M, y, 11); y -= 26;
  draw(p, 'BEFORE YOU SEAL IT', M, y, 11, bold); y -= 17;
  ['Sign and date Form 8843 on page 2, where it says "Sign here".',
   'Keep a copy or a clear photo of everything you mail.',
   'Mail it in time: for a Form 8843 filed by itself, the deadline is June 15, 2026.',
   'If you also had U.S. income in 2025, you must also file Form 1040-NR,',
   'and that package is due April 15, 2026.'].forEach(function (l) { draw(p, l, M, y, 11); y -= 15; });
  y -= 18;
  draw(p, 'Cut out and tape to your envelope:', M, y, 10); y -= 8;
  const ly = y - 74;
  p.drawRectangle({ x: M, y: ly, width: 340, height: 74, borderWidth: 1, borderColor: PDFLib.rgb(0, 0, 0), borderDashArray: [5, 4] });
  draw(p, 'Department of the Treasury', M + 12, ly + 54, 11, bold);
  draw(p, 'Internal Revenue Service', M + 12, ly + 39, 11, bold);
  draw(p, 'Austin, TX 73301-0215', M + 12, ly + 24, 11, bold);
  draw(p, 'From My1040NR.com. Your information was never sent to us or stored.', M, 44, 9);
  draw(p, 'Prepared with My1040NR rules ' + RULES_VERSION, M, 32, 9);
  /* Page 2: what to do next */
  p = doc.addPage([W, H]); y = H - 56;
  draw(p, 'Your Form 8843 is ready: what to do next', M, y, 15, bold); y -= 26;
  ['1. Print the pages after this one (the mailing slip, then Form 8843).',
   '2. Sign and date Form 8843 on its page 2, where it says "Sign here".',
   '3. Put the signed Form 8843 in an envelope. Keep the mailing slip',
   '    instructions for yourself, or place the slip on top.',
   '4. Address the envelope to the IRS address on the mailing slip.',
   '5. Mail it by June 15, 2026. At the post office, ask for proof of mailing',
   '    (a certificate of mailing) and keep it with your copy.',
   '',
   'My1040NR prepared this form only. We did not file or send anything',
   'for you, and we never received or stored your information: this PDF',
   'was made on your own device.',
   '',
   'Prepared with My1040NR rules ' + RULES_VERSION + ' for tax year 2025.'].forEach(function (l) { draw(p, l, M, y, 11); y -= 16; });
  return doc;
}
async function buildPackage(PDFLib, formBytes, d) {
  const front = await makeFrontPages(PDFLib, d);
  const filled = await fill8843(PDFLib, formBytes, d);
  const out = await PDFLib.PDFDocument.create();
  const fp = await out.copyPages(front, [0, 1]);
  fp.forEach(function (pg) { out.addPage(pg); });
  const gp = await out.copyPages(filled, [0, 1]);
  gp.forEach(function (pg) { out.addPage(pg); });
  return await out.save();
}
if (typeof module !== 'undefined') {
  module.exports = { buildPackage, fill8843, studentYearCount, RULES_VERSION, FIELD, CHECK };
}
