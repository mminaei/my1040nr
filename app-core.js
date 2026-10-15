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
/* pdf-lib check() does not render visibly on these IRS XFA-derived forms,
   so checked boxes are drawn as an X mark at the widget rectangle instead. */
function boxMark(doc, form, name) {
  try {
    var w = form.getCheckBox(name).acroField.getWidgets()[0];
    var rect = w.getRectangle();
    var pref = w.P();
    var idx = doc.getPages().findIndex(function (p) { return p.ref === pref; });
    return { page: idx < 0 ? 0 : idx, x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  } catch (e) { return null; }
}
async function drawMarks(PDFLib, doc, marks) {
  if (!marks.length) return;
  var font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  marks.forEach(function (m) {
    if (!m) return;
    doc.getPage(m.page).drawText('X', { x: m.x + m.w / 2 - 3.6, y: m.y + m.h / 2 - 4.2, size: 11, font: font });
  });
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
  const marks = [];
  try {
    if (d.line12 === 'yes') marks.push(boxMark(doc, form, CHECK.line12yes));
    else marks.push(boxMark(doc, form, CHECK.line12no));
    if (d.line13 === 'yes') {
      marks.push(boxMark(doc, form, CHECK.line13yes));
      setText(form, FIELD.line14, d.line14);
    } else marks.push(boxMark(doc, form, CHECK.line13no));
  } catch (e) { /* checkbox naming differs */ }
  form.flatten();
  await drawMarks(PDFLib, doc, marks);
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

/* ================= Form 1040-NR pipeline (tax year 2025) =================
   Scope v1: nonresident alien students with effectively connected income from
   Form W-2 and/or Form 1042-S (wages and taxable scholarship/fellowship),
   single or married filing separately, no dependents, no NEC income.
   Treaty table v1: TODO_VERIFY against the IRS tax treaty tables and each
   treaty text before public reliance. Sources: IRS Tax Treaties page,
   Publication 901, Form 1040-NR instructions (2025), Rev. Proc. 2024-40 as
   amended for 2025 (standard deduction $15,750 single). */

var NR_RULES_VERSION = '2025.1.0';
var STD_DED_2025 = 15750;
/* 2025 federal brackets, single and MFS (top of each bracket, rate). */
var BRACKETS_2025 = {
  single: [[11925, .10], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [626350, .35], [Infinity, .37]],
  mfs:    [[11925, .10], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [313175, .35], [Infinity, .37]]
};
var TREATY_STUDENT_2025 = {
  /* China, Article 20(c): up to $5,000 of employment income exempt. */
  'China': { exemptWages: 5000, article: '20(c)' },
  /* India, Article 21(2): students may claim the standard deduction (line 12). */
  'India': { standardDeduction: true, article: '21(2)' }
};

function bracketTax(income, status) {
  var b = BRACKETS_2025[status] || BRACKETS_2025.single, prev = 0, tax = 0;
  for (var i = 0; i < b.length; i++) {
    if (income > prev) { tax += (Math.min(income, b[i][0]) - prev) * b[i][1]; prev = b[i][0]; }
  }
  return tax;
}
/* IRS Tax Table for income under $100,000 (midpoint of the $50 range,
   $25 ranges below $3,000), otherwise the Tax Computation Worksheet. */
function taxTable2025(income, status) {
  if (income <= 0) return 0;
  if (income >= 100000) return Math.round(bracketTax(income, status));
  var step = income < 3000 ? 25 : 50;
  var mid = Math.floor(income / step) * step + step / 2;
  return Math.round(bracketTax(mid, status));
}

/* Residency for 2025. Inputs: visaNow (e.g. 'F-1'), days {2023,2024,2025},
   fjYearsThrough2025 = number of calendar years (including 2025) in which
   the person held F or J status for any part of the year, greenCard bool. */
function residency2025(d) {
  if (d.greenCard) return { resident: true, why: 'Green card test: resident alien.' };
  var isFJ = /^(F|J|M|Q)-?/.test(d.visaNow || '');
  function exemptYear(yearsThrough) { return isFJ && yearsThrough <= 5; }
  var y25 = d.fjYearsThrough2025 || 0;
  var ex25 = exemptYear(y25), ex24 = exemptYear(y25 - 1), ex23 = exemptYear(y25 - 2);
  var weighted = (ex25 ? 0 : (d.days[2025] || 0))
    + (ex24 ? 0 : (d.days[2024] || 0)) / 3
    + (ex23 ? 0 : (d.days[2023] || 0)) / 6;
  var spt = (d.days[2025] || 0) >= 31 && weighted >= 183;
  if (ex25) return { resident: false, exempt: true, weighted: weighted, why: 'Exempt individual for 2025 (F/J within the 5 calendar year limit): days do not count, nonresident alien.' };
  if (spt) return { resident: true, weighted: weighted, why: 'Substantial presence test met (' + Math.round(weighted) + ' weighted days): resident alien for 2025.' };
  return { resident: false, exempt: false, weighted: weighted, why: 'Substantial presence test not met (' + Math.round(weighted) + ' weighted days): nonresident alien.' };
}

function computeNR(d) {
  var treaty = TREATY_STUDENT_2025[d.treatyCountry] || null;
  var grossWages = num(d.wagesW2) + num(d.wages1042);
  var exemptAmt = 0;
  if (treaty && treaty.exemptWages) exemptAmt = Math.min(treaty.exemptWages, grossWages);
  var line1a = grossWages, line1k = exemptAmt, line1z = line1a - line1k;
  var line8 = num(d.scholarshipTaxable);
  var line9 = line1z + line8;
  var line12 = (treaty && treaty.standardDeduction) ? STD_DED_2025 : 0;
  var taxable = Math.max(0, line9 - line12);
  var tax = taxTable2025(taxable, d.status === 'mfs' ? 'mfs' : 'single');
  var payments = num(d.fedWithheldW2) + num(d.withheld1042);
  var ficaWithheld = num(d.ssTaxW2) + num(d.medTaxW2);
  return {
    line1a: line1a, line1k: line1k, line1z: line1z, line8: line8, line9: line9,
    line11a: line9, line12: line12, line14: line12, line15: taxable, line16: tax,
    line24: tax, line25a: num(d.fedWithheldW2), line25g: num(d.withheld1042),
    line33: payments, refund: payments > tax ? payments - tax : 0,
    owed: tax > payments ? tax - payments : 0,
    exemptAmt: exemptAmt, treatyArticle: treaty ? treaty.article : null,
    ficaWithheld: ficaWithheld,
    ficaFlag: ficaWithheld > 0 && /^(F|J)-?/.test(d.visaNow || '')
  };
}
function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

var NR = 'topmostSubform[0].Page1[0].', NR2 = 'topmostSubform[0].Page2[0].',
    OI = 'form1040-NR[0].Page1[0].', S1 = 'topmostSubform[0].Page1[0].';
async function fill1040NR(PDFLib, formBytes, d, c) {
  var doc = await PDFLib.PDFDocument.load(formBytes);
  var form = doc.getForm();
  var T = function (n, v) { if (v !== undefined && v !== null && String(v) !== '') { try { form.getTextField(n).setText(String(v)); } catch (e) {} } };
  var M = function (n, v) { if (v) T(n, Math.round(v)); };
  var marksNR = [];
  var K = function (n) { var m = boxMark(doc, form, n); if (m) marksNR.push(m); };
  T(NR + 'f1_14[0]', (d.firstName + ' ' + (d.middleInitial || '')).trim());
  T(NR + 'f1_15[0]', d.lastName);
  T(NR + 'f1_16[0]', (d.tin || '').replace(/\D/g, ''));
  if (d.addrUS) {
    T(NR + 'f1_17[0]', d.addrUS.street); T(NR + 'f1_18[0]', d.addrUS.apt);
    T(NR + 'f1_19[0]', d.addrUS.city); T(NR + 'f1_20[0]', d.addrUS.state); T(NR + 'f1_21[0]', d.addrUS.zip);
  } else if (d.addrAbroad) {
    T(NR + 'f1_17[0]', d.addrAbroad.street); T(NR + 'f1_19[0]', d.addrAbroad.city);
    T(NR + 'f1_22[0]', d.addrAbroad.country); T(NR + 'f1_23[0]', d.addrAbroad.region); T(NR + 'f1_24[0]', d.addrAbroad.postal);
  }
  if (d.status === 'mfs') K(NR + 'c1_5[1]'); else K(NR + 'c1_5[0]');
  if (d.digitalAssets === 'yes') K(NR + 'c1_6[0]'); else K(NR + 'c1_6[1]');
  M(NR + 'f1_42[0]', c.line1a); M(NR + 'Line1k_ReadOrder[0].f1_53[0]', c.line1k); M(NR + 'f1_54[0]', c.line1z);
  M(NR + 'f1_68[0]', c.line8); M(NR + 'f1_69[0]', c.line9); M(NR + 'f1_71[0]', c.line11a);
  M(NR2 + 'f2_01[0]', c.line11a); M(NR2 + 'f2_02[0]', c.line12); M(NR2 + 'f2_06[0]', c.line14);
  M(NR2 + 'f2_07[0]', c.line15); M(NR2 + 'f2_09[0]', c.line16); M(NR2 + 'f2_11[0]', c.line16);
  M(NR2 + 'f2_15[0]', c.line24); M(NR2 + 'f2_20[0]', c.line24);
  M(NR2 + 'f2_21[0]', c.line25a); M(NR2 + 'f2_27[0]', c.line25g);
  if (c.line25a || c.line25g) M(NR2 + 'f2_24[0]', c.line33);
  M(NR2 + 'f2_35[0]', c.line33);
  if (c.refund > 0) { M(NR2 + 'f2_36[0]', c.refund); M(NR2 + 'f2_37[0]', c.refund); }
  if (c.owed > 0) M(NR2 + 'f2_42[0]', c.owed);
  T(NR2 + 'f2_47[0]', 'Student');
  form.flatten();
  await drawMarks(PDFLib, doc, marksNR);
  return doc;
}
async function fillScheduleOI(PDFLib, oiBytes, d, c) {
  var doc = await PDFLib.PDFDocument.load(oiBytes);
  var form = doc.getForm();
  var T = function (n, v) { if (v) { try { form.getTextField(n).setText(String(v)); } catch (e) {} } };
  var marksOI = [];
  var K = function (n) { var m = boxMark(doc, form, n); if (m) marksOI.push(m); };
  var YN = function (base, yes) { K(OI + base + (yes ? '[0]' : '[1]')); };
  T(OI + 'f1_1[0]', d.firstName + ' ' + d.lastName);
  T(OI + 'f1_2[0]', (d.tin || '').replace(/\D/g, ''));
  T(OI + 'f1_3[0]', d.citizenship); T(OI + 'f1_4[0]', d.taxResidence || d.citizenship);
  YN('c1_1', d.appliedGreenCard === 'yes');
  YN('c1_2', false); YN('c1_3', d.everGreenCard === 'yes');
  T(OI + 'f1_5[0]', d.visaNow);
  YN('c1_4', d.changedStatus === 'yes'); if (d.changedStatus === 'yes') T(OI + 'f1_6[0]', d.changeDetail);
  var tripPaths = [];
  [1, 2, 3, 4].forEach(function (r) {
    tripPaths.push(OI + 'LineG_Table1[0].BodyRow' + r + '[0].f1_' + (5 + r * 2) + '[0]');
    tripPaths.push(OI + 'LineG_Table1[0].BodyRow' + r + '[0].f1_' + (6 + r * 2) + '[0]');
    tripPaths.push(OI + 'LineG_Table2[0].BodyRow' + r + '[0].f1_' + (13 + r * 2) + '[0]');
    tripPaths.push(OI + 'LineG_Table2[0].BodyRow' + r + '[0].f1_' + (14 + r * 2) + '[0]');
  });
  var yy = function (s) { var m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); return m ? m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3].slice(-2) : s; };
  (d.trips || []).slice(0, 8).forEach(function (t, i) {
    T(tripPaths[i * 2], yy(t.enter)); T(tripPaths[i * 2 + 1], yy(t.exit));
  });
  T(OI + 'f1_23[0]', d.days[2023]); T(OI + 'f1_24[0]', d.days[2024]); T(OI + 'f1_25[0]', d.days[2025]);
  YN('c1_6', d.filedBefore === 'yes'); if (d.filedBefore === 'yes') T(OI + 'f1_26[0]', d.priorFiling);
  YN('c1_7', false); /* J: not a trust */
  YN('c1_8', false); /* K: compensation under $250,000 in this pipeline's scope */
  if (c.exemptAmt > 0) {
    var LT = OI + 'LineL1_Table[0].BodyRow1[0].';
    T(LT + 'f1_27[0]', d.treatyCountry); T(LT + 'f1_28[0]', c.treatyArticle);
    T(LT + 'f1_29[0]', d.treatyMonthsPrior || '0'); T(LT + 'f1_30[0]', Math.round(c.exemptAmt));
    T(OI + 'f1_39[0]', Math.round(c.exemptAmt));
    YN('c1_11', d.treatyForeignTaxed === 'yes'); YN('c1_12', false);
  }
  form.flatten();
  await drawMarks(PDFLib, doc, marksOI);
  return doc;
}
async function fillSchedule1(PDFLib, s1Bytes, d, c) {
  var doc = await PDFLib.PDFDocument.load(s1Bytes);
  var form = doc.getForm();
  var T = function (n, v) { if (v) { try { form.getTextField(n).setText(String(v)); } catch (e) {} } };
  T(S1 + 'f1_01[0]', d.firstName + ' ' + d.lastName);
  T(S1 + 'f1_02[0]', (d.tin || '').replace(/\D/g, ''));
  T(S1 + 'f1_30[0]', Math.round(c.line8)); /* line 8r scholarship */
  T(S1 + 'f1_37[0]', Math.round(c.line8)); /* line 9 */
  T(S1 + 'f1_38[0]', Math.round(c.line8)); /* line 10 */
  form.flatten();
  return doc;
}
