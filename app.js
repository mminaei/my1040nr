/* My1040NR web shell for the Form 8843 flow. All state lives in this page's
   memory only. No storage, no cookies, and no network calls with
   user data. Reloading or closing the tab erases everything. */
'use strict';
const d = { statusChanged: 'no', line12: 'no', line13: 'no', income: 'no', taxYear: TAX_YEAR };
let step = 0;
let addrErr = '', addrWarn = '';
const app = document.getElementById('app');
const bar = document.getElementById('bar');
function taxYear() { return parseInt(d.taxYear, 10) || TAX_YEAR; }
function priorYears() { const out = []; for (let y = taxYear() - 6; y <= taxYear() - 1; y++) out.push(String(y)); return out; }
function yearOpts() { return availableYears().map(function (y) { return [String(y), String(y)]; }); }
function firstYearOpts() { const out = []; for (let y = taxYear(); y >= taxYear() - 6; y--) out.push([String(y), y === taxYear() - 6 ? y + ' or earlier' : String(y)]); return out; }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function field(label, id, val, type, ph) {
  return '<label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '" placeholder="' + (ph || '') + '">';
}
function area(label, id, val, ph) {
  return '<label for="' + id + '">' + label + '</label><textarea id="' + id + '" rows="3" placeholder="' + (ph || '') + '">' + esc(val) + '</textarea>';
}
function sel(label, id, val, opts) {
  let o = opts.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === val ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
  return '<label for="' + id + '">' + label + '</label><select id="' + id + '">' + o + '</select>';
}
function radios(name, val, opts) {
  return opts.map(function (x) {
    return '<label class="radio"><input type="radio" name="' + name + '" value="' + x[0] + '"' + (x[0] === val ? ' checked' : '') + '> ' + x[1] + '</label>';
  }).join('');
}
function grab(ids) { ids.forEach(function (id) { const el = document.getElementById(id); if (el) d[id] = el.value; }); }
function grabRadio(name, key) { const el = document.querySelector('input[name="' + name + '"]:checked'); if (el) d[key] = el.value; }
function nav(back, nextLabel) {
  return '<div class="btnrow">' + (back ? '<button class="btn2" onclick="go(-1)">Back</button>' : '') +
    '<button class="btn" onclick="go(1)">' + (nextLabel || 'Continue') + '</button></div>';
}
function render() {
  bar.style.width = Math.round((step / 8) * 100) + '%';
  let h = '';
  if (step === 0) {
    h = '<h2>Before we start: two quick checks</h2>' +
      '<p class="body">Form 8843 is the yearly statement most international students and scholars must send to the IRS, even with no income at all.</p>' +
      sel('Tax year', 'taxYear', String(d.taxYear), yearOpts()) +
      '<p class="small">New tax years appear here as the IRS publishes their final forms.</p>' +
      '<fieldset><legend>Did you have any income from a U.S. source in ' + taxYear() + '?</legend>' +
      '<p class="small">A campus job, assistantship pay, OPT work, or a taxable scholarship counts. Rent from a U.S. property counts too.</p>' +
      radios('income', d.income, [['no', 'No, I had no U.S. income in ' + taxYear()], ['yes', 'Yes, I had U.S. income in ' + taxYear()]]) + '</fieldset>' +
      '<div id="incomeNote"></div>' +
      sel('In what calendar year did you first come to the U.S. on an F or J visa (for study or an exchange program)?', 'firstYear', d.firstYear || String(taxYear()),
        firstYearOpts()) +
      field('How many calendar years BEFORE that first year were you in the U.S. on an F or J visa? Most students: 0', 'priorYears', d.priorYears || '0', 'number') +
      '<div id="resNote"></div>' + nav(false);
  }
  if (step === 1) {
    h = '<h2>Your name</h2>' +
      field('First name and middle initial (as on your passport)', 'firstName', d.firstName) +
      field('Last name (family name)', 'lastName', d.lastName) + nav(true);
  }
  if (step === 2) {
    h = (addrErr ? '<div class="note">' + addrErr + '</div>' : '') + '<h2>Your addresses</h2><p class="small">These are printed on the form because you are filing Form 8843 by itself.</p>' +
      area('Your address in the United States (street, apartment, city, state, ZIP)', 'addrUS', d.addrUS, '4500 College Ave, Apt 12, Austin, TX 78705') +
      area('Your address in your home country (street, city, postal code, country)', 'addrAbroad', d.addrAbroad, '14 MG Road, Pune 411001, India') + nav(true);
  }
  if (step === 3) {
    h = (addrWarn ? '<div class="note">' + addrWarn + '</div>' : '') + '<h2>Your visa and passport</h2>' +
      sel('Type of U.S. visa you entered on', 'visaType', d.visaType || 'F-1',
        [['F-1','F-1 (student)'],['F-2','F-2 (family of F-1)'],['J-1','J-1 (exchange visitor)'],['J-2','J-2 (family of J-1)'],['M-1','M-1 (vocational student)'],['Q-1','Q-1 (cultural exchange)']]) +
      field('Date you entered the United States on this stay', 'entryDate', d.entryDate, 'date') +
      '<fieldset><legend>Has your immigration status changed since you entered?</legend>' +
      radios('statusChanged', d.statusChanged, [['no', 'No, it is the same'], ['yes', 'Yes, it changed']]) + '</fieldset>' +
      '<div id="chg"></div>' +
      sel('Country of citizenship', 'citizenship', d.citizenship, [['', 'Choose a country']].concat(countryOpts())) +
      sel('Second country of citizenship (only if you hold two)', 'citizenship2', d.citizenship2, [['', 'I hold only one citizenship']].concat(countryOpts())) +
      sel('Country that issued your passport', 'passportCountry', d.passportCountry, [['', 'Choose a country']].concat(countryOpts())) +
      field('Passport number', 'passportNo', d.passportNo) + nav(true);
  }
  if (step === 4) {
    const Y4 = taxYear();
    if (!d.daysExcluded && d['days' + Y4]) d.daysExcluded = d['days' + Y4];
    h = '<h2>Your days in the United States</h2><p class="small">Count every day you were physically in the U.S., even one day of a trip. Your I-94 travel history at i94.cbp.dhs.gov lists your entries and exits.</p>' +
      field('Days you were in the U.S. in ' + Y4, 'days' + Y4, d['days' + Y4], 'number') +
      field('Days you were in the U.S. in ' + (Y4 - 1), 'days' + (Y4 - 1), d['days' + (Y4 - 1)], 'number') +
      field('Days you were in the U.S. in ' + (Y4 - 2), 'days' + (Y4 - 2), d['days' + (Y4 - 2)], 'number') +
      field('Of your ' + Y4 + ' days, how many were days as a student or exchange visitor that should not count toward residency? For most students this is the same as your ' + Y4 + ' days above.', 'daysExcluded', d.daysExcluded, 'number') + nav(true);
  }
  if (step === 5) {
    h = '<h2>Your school</h2>' +
      area('Name, address, and telephone number of the school you attended in ' + taxYear(), 'school', d.school, 'University of Texas at Austin, Austin, TX, (512) 555-0100') +
      area('Name, address, and telephone number of the director of your academic program (your department or program office)', 'director', d.director, 'Dr. Jane Smith, Office of International Programs, (512) 555-0101') + nav(true);
  }
  if (step === 6) {
    const cnt = studentYearCount(d);
    d.line12 = cnt > 5 ? 'yes' : 'no';
    let vh = priorYears().map(function (y) {
      return sel('Visa type you held in ' + y + ' (leave as "I was not in the U.S." if you were not here)', 'visa' + y, d['visa' + y] || 'none',
        [['none', 'I was not in the U.S. / no F, J, M, or Q visa'], ['F', 'F'], ['J', 'J'], ['M', 'M'], ['Q', 'Q']]);
    }).join('');
    h = '<h2>Your earlier years, and two yes or no questions</h2>' + vh +
      '<fieldset><legend>Counting your answers, you have been a student or exchange visitor in <strong>' + cnt + ' calendar years</strong>. Form 8843 asks: were you in that status for any part of more than 5 calendar years?</legend>' +
      radios('line12', d.line12, [['no', 'No (5 years or fewer)'], ['yes', 'Yes (more than 5 years)']]) +
      '<p class="small">If yes, the IRS asks for facts on an attached statement showing you do not intend to reside permanently in the U.S. You can add that statement yourself before mailing.</p></fieldset>' +
      '<fieldset><legend>In ' + taxYear() + ', did you apply for a green card (lawful permanent resident status), or take any step toward one, or do you have an application pending?</legend>' +
      radios('line13', d.line13, [['no', 'No'], ['yes', 'Yes']]) + '</fieldset>' +
      '<div id="l14"></div>' + nav(true);
  }
  if (step === 7) {
    h = '<h2>Last step: your U.S. taxpayer number, if you have one</h2>' +
      '<div class="ok">This is the only place we ask for it, right before your PDF is made. It is typed into the form on your device and never sent anywhere. If you have never been given a Social Security number or an ITIN, leave this blank. Many students filing Form 8843 have neither.</div>' +
      '<label for="tin">Social Security number or ITIN (optional)</label><input id="tin" type="password" autocomplete="off" value="' + esc(d.tin) + '" placeholder="Leave blank if you have none">' +
      '<h3 style="margin-top:22px">Check your answers</h3><div class="card"><p class="body">' +
      esc(d.firstName) + ' ' + esc(d.lastName) + ' | ' + esc(d.visaType) + ', entered ' + esc(fmtDate(d.entryDate)) +
      '<br>Citizenship: ' + esc(d.citizenship + (d.citizenship2 ? ', ' + d.citizenship2 : '')) + ' | Days in the U.S.: ' + taxYear() + ': ' + esc(d['days' + taxYear()]) + ', ' + (taxYear() - 1) + ': ' + esc(d['days' + (taxYear() - 1)]) + ', ' + (taxYear() - 2) + ': ' + esc(d['days' + (taxYear() - 2)]) +
      '<br>School: ' + esc((d.school || '').split('\n')[0]) + '</p></div>' +
      '<div class="btnrow"><button class="btn2" onclick="go(-1)">Back</button>' +
      '<button class="btn" onclick="generate()">Make my PDF</button></div>' +
      '<p class="small">Your PDF will be: page 1 mailing slip, page 2 what to do next, then your filled Form 8843 (official IRS form) ready to sign and mail.</p>';
  }
  if (step === 8) {
    h = '<h2>Your PDF is downloading</h2>' +
      '<div class="ok">Print it, sign Form 8843 on its page 2 where it says "Sign here", and mail it to the address on the slip by <strong>' + rulesFor(d.taxYear).deadlines.form8843 + '</strong>' + (d.income === 'yes' ? '. Remember: because you had U.S. income, you must also file Form 1040-NR by ' + rulesFor(d.taxYear).deadlines.federal + '; Form 8843 by itself is not enough' : '') + '.</div>' +
      '<p class="body">Nothing about you was sent to anyone or stored anywhere. This tab still holds your answers in its memory.</p>' +
      '<div class="btnrow"><button class="btn" onclick="eraseAll()">Erase everything now</button></div>';
  }
  app.innerHTML = h;
  wire();
}
function wire() {
  if (step === 0) {
    document.querySelectorAll('input[name="income"]').forEach(function (r) {
      r.addEventListener('change', function () {
        grabRadio('income', 'income');
        document.getElementById('incomeNote').innerHTML = d.income === 'yes'
          ? '<div class="notice"><strong>Important:</strong> Form 8843 alone is not your whole filing when you have U.S. income. You also need Form 1040-NR; use the <a href="nr.html">Form 1040-NR preparer</a>. You can still prepare your 8843 here, and your slip will remind you of the ' + rulesFor(d.taxYear).deadlines.federal + ' deadline.</div>' : '';
      });
    });
  }
  if (step === 3) {
    document.querySelectorAll('input[name="statusChanged"]').forEach(function (r) {
      r.addEventListener('change', function () {
        grabRadio('statusChanged', 'statusChanged');
        document.getElementById('chg').innerHTML = d.statusChanged === 'yes'
          ? field('Your new (current) status, for example F-1 or H-1B', 'currentStatus', d.currentStatus) +
            field('Date your status changed', 'changeDate', d.changeDate, 'date') +
            field('Your previous status', 'prevStatus', d.prevStatus) : '';
      });
    });
  }
  if (step === 6) {
    document.querySelectorAll('input[name="line13"]').forEach(function (r) {
      r.addEventListener('change', function () {
        grabRadio('line13', 'line13');
        document.getElementById('l14').innerHTML = d.line13 === 'yes'
          ? area('Explain the step you took (Form 8843 line 14)', 'line14', d.line14) : '';
      });
    });
  }
}
function collect() {
  if (step === 0) { grabRadio('income', 'income'); grab(['taxYear', 'firstYear', 'priorYears']); }
  if (step === 1) grab(['firstName', 'lastName']);
  if (step === 2) grab(['addrUS', 'addrAbroad']);
  if (step === 3) { grab(['visaType', 'entryDate', 'citizenship', 'citizenship2', 'passportCountry', 'passportNo', 'currentStatus', 'changeDate', 'prevStatus']); grabRadio('statusChanged', 'statusChanged'); if (d.statusChanged !== 'yes') d.currentStatus = d.visaType; }
  if (step === 4) grab(['days' + taxYear(), 'days' + (taxYear() - 1), 'days' + (taxYear() - 2), 'daysExcluded']);
  if (step === 5) grab(['school', 'director']);
  if (step === 6) { priorYears().forEach(function (y) { grab(['visa' + y]); }); grabRadio('line12', 'line12'); grabRadio('line13', 'line13'); grab(['line14']); }
  if (step === 7) grab(['tin']);
}
function parseBlobUS(text) {
  var m = String(text || '').match(/(\d{5})(-\d{4})?\s*$/);
  var st = String(text || '').match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\s*$/);
  return { zip: m ? m[1] : '', state: st ? st[1].toUpperCase() : '' };
}
function go(dir) {
  collect();
  if (dir > 0 && step === 2) {
    addrErr = ''; addrWarn = '';
    if (String(d.addrUS || '').trim()) {
      var a = parseBlobUS(d.addrUS);
      if (!a.zip) { addrErr = 'We could not find a ZIP code at the end of your US address. Write it like: 4500 College Ave, Apt 12, Austin, TX 78705.'; render(); window.scrollTo(0, 0); return; }
      if (a.state) { var chk = checkUSAddress({ zip: a.zip, state: a.state }); if (chk.warn) addrWarn = chk.warn; }
      else addrWarn = 'We could not spot a two letter state code before the ZIP in your US address. Check it looks like: Austin, TX 78705.';
    }
  }
  step = Math.max(0, Math.min(8, step + dir));
  render();
  window.scrollTo(0, 0);
}
async function generate() {
  collect();
  const btn = document.querySelector('button.btn');
  try {
    const res = await fetch(rulesFor(d.taxYear).forms.f8843);
    const formBytes = await res.arrayBuffer();
    const bytes = await buildPackage(window.PDFLib, formBytes, d);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'My1040NR-Form-8843-' + taxYear() + '.pdf';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    step = 8; render(); window.scrollTo(0, 0);
  } catch (e) {
    alert('Something went wrong making your PDF. Your answers are still on this page. Please try again.');
  }
}
function eraseAll() { location.reload(); }
render();
