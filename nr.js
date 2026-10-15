/* My1040NR Form 1040-NR shell. Same privacy model as the 8843 shell:
   state lives only in this page's memory; the TIN is asked last. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var d = {
    visaNow: 'F-1', days: { 2023: '', 2024: '', 2025: '' }, fjYears: '1', greenCard: 'no',
    firstName: '', middleInitial: '', lastName: '', status: 'single', digitalAssets: 'no',
    addrWhere: 'us', addrUS: {}, addrAbroad: {},
    wagesW2: '', fedWithheldW2: '', ssTaxW2: '', medTaxW2: '',
    wages1042: '', withheld1042: '', scholarshipTaxable: '',
    treatyCountry: '', citizenship: '', taxResidence: '', treatyMonthsPrior: '0',
    tripsText: '', appliedGreenCard: 'no', everGreenCard: 'no', changedStatus: 'no',
    changeDetail: '', filedBefore: 'no', priorFiling: '', treatyForeignTaxed: 'no', tin: ''
  };
  var step = 0, residency = null, calc = null, pdfUrl = null;

  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function field(label, name, val, opts) {
    opts = opts || {};
    return '<label class="field"><span>' + label + '</span><input name="' + name + '" value="' +
      String(val == null ? '' : val).replace(/"/g, '&quot;') + '"' +
      (opts.type ? ' type="' + opts.type + '"' : '') +
      (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') +
      (opts.placeholder ? ' placeholder="' + opts.placeholder + '"' : '') + '></label>';
  }
  function sel(label, name, val, options) {
    var o = options.map(function (x) {
      return '<option value="' + x[0] + '"' + (String(val) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>';
    }).join('');
    return '<label class="field"><span>' + label + '</span><select name="' + name + '">' + o + '</select></label>';
  }
  function grab(form) {
    var fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k.indexOf('addrUS.') === 0) d.addrUS[k.slice(7)] = v;
      else if (k.indexOf('addrAbroad.') === 0) d.addrAbroad[k.slice(11)] = v;
      else if (k.indexOf('days.') === 0) d.days[k.slice(5)] = v;
      else d[k] = v;
    });
  }
  function shell(title, bodyHtml, back) {
    app.innerHTML = '';
    var wrap = el('<section class="card"></section>');
    wrap.appendChild(el('<h2>' + title + '</h2>'));
    var form = el('<form></form>');
    form.innerHTML = bodyHtml;
    var nav = el('<div class="row"></div>');
    if (back) { var b = el('<button type="button" class="btn secondary">Back</button>'); b.onclick = function () { step--; render(); }; nav.appendChild(b); }
    nav.appendChild(el('<button class="btn" type="submit">Continue</button>'));
    form.appendChild(nav);
    form.onsubmit = function (e) { e.preventDefault(); grab(form); next(); };
    wrap.appendChild(form);
    app.appendChild(wrap);
    var first = form.querySelector('input,select,textarea'); if (first) first.focus();
  }
  function message(title, html, buttonText, onClick) {
    app.innerHTML = '';
    var wrap = el('<section class="card"></section>');
    wrap.appendChild(el('<h2>' + title + '</h2>'));
    wrap.appendChild(el('<div>' + html + '</div>'));
    if (buttonText) { var b = el('<button class="btn">' + buttonText + '</button>'); b.onclick = onClick; wrap.appendChild(b); }
    app.appendChild(wrap);
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function next() {
    if (step === 0) step = 1;
    else if (step === 1) {
      residency = residency2025({
        visaNow: d.visaNow, greenCard: d.greenCard === 'yes',
        days: { 2023: num(d.days[2023]), 2024: num(d.days[2024]), 2025: num(d.days[2025]) },
        fjYearsThrough2025: parseInt(d.fjYears, 10) || 0
      });
      if (residency.resident) {
        message('You file a different form for 2025',
          '<p>' + residency.why + '</p><p>Resident aliens file Form 1040, not Form 1040-NR, and this preparer stops here on purpose. Free options for residents include IRS Free File and FreeTaxUSA. If you also had F or J days in earlier years, talk to your campus tax advisor before filing, because dual-status years are tricky.</p>',
          null, null);
        return;
      }
      step = 2;
    }
    else if (step === 2) step = 3;
    else if (step === 3) {
      if (num(d.wagesW2) + num(d.wages1042) + num(d.scholarshipTaxable) <= 0) {
        message('No income to report?',
          '<p>You entered no wages and no taxable scholarship. If you truly had no US income in 2025, you most likely only need <a href="prepare.html">Form 8843</a>, not a 1040-NR. If you did have income, go back and copy the numbers from your W-2 or 1042-S.</p>',
          'Back to documents', function () { step = 3; render(); });
        return;
      }
      step = 4;
    }
    else if (step === 4) {
      d.trips = d.tripsText.split('\n').map(function (ln) {
        var p = ln.split(',').map(function (s) { return s.trim(); });
        return p.length === 2 && p[0] ? { enter: p[0], exit: p[1] } : null;
      }).filter(Boolean);
      calc = computeNR(d);
      step = 5;
    }
    else if (step === 5) step = 6;
    else if (step === 6) { generate(); return; }
    render();
  }

  function render() {
    if (step === 0) {
      shell('Before you start', '' +
        '<p>This preparer covers the most common student situation for 2025:</p>' +
        '<ul><li>You are a nonresident alien (we check this together in the next step).</li>' +
        '<li>Your US income is wages on a W-2 and/or a 1042-S, and/or a taxable scholarship or fellowship.</li>' +
        '<li>You file as single, or married filing separately, with no dependents.</li></ul>' +
        '<p>It does not cover investment income (dividends, capital gains), self-employment, or rental income. If those apply, use a preparer that supports Schedule NEC or talk to a tax professional.</p>' +
        '<p class="note">Deadline for this return: <strong>April 15, 2026</strong>. Need more time? Form 4868 extends the filing deadline to October 15, 2026 (it never extends the deadline to pay). No account, nothing saved: if you close this tab, everything is gone.</p>',
        false);
    }
    if (step === 1) {
      shell('Step 1 of 5: your residency for 2025',
        '<p class="note">' + 'We never ask if you were "exempt". We work it out from your visa and your years, the way the IRS rules do.' + '</p>' +
        sel('Your visa type on December 31, 2025', 'visaNow', d.visaNow, [['F-1', 'F-1 student'], ['F-2', 'F-2'], ['J-1', 'J-1 exchange visitor'], ['J-2', 'J-2'], ['other', 'Something else']]) +
        sel('Do you have a green card (or one pending that was approved)?', 'greenCard', d.greenCard, [['no', 'No'], ['yes', 'Yes']]) +
        field('Days you were in the US in 2025', 'days.2025', d.days[2025], { type: 'number', inputmode: 'numeric' }) +
        field('Days you were in the US in 2024', 'days.2024', d.days[2024], { type: 'number', inputmode: 'numeric' }) +
        field('Days you were in the US in 2023', 'days.2023', d.days[2023], { type: 'number', inputmode: 'numeric' }) +
        sel('In how many calendar years, counting 2025, have you held F or J status for any part of the year?', 'fjYears', d.fjYears,
          [['0', '0 (never F or J)'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6 or more']]),
        false);
    }
    if (step === 2) {
      var us = d.addrWhere === 'us';
      shell('Step 2 of 5: about you',
        field('First name and middle initial', 'firstName', d.firstName) +
        field('Last name (family name)', 'lastName', d.lastName) +
        sel('Filing status', 'status', d.status, [['single', 'Single'], ['mfs', 'Married filing separately']]) +
        sel('Did you have any digital assets (crypto and similar) activity in 2025?', 'digitalAssets', d.digitalAssets, [['no', 'No'], ['yes', 'Yes']]) +
        sel('Where should the IRS mail you?', 'addrWhere', d.addrWhere, [['us', 'A US address'], ['abroad', 'An address outside the US']]) +
        (us
          ? field('US street address', 'addrUS.street', d.addrUS.street) + field('Apartment (optional)', 'addrUS.apt', d.addrUS.apt) +
            field('City', 'addrUS.city', d.addrUS.city) + field('State (2 letters)', 'addrUS.state', d.addrUS.state) + field('ZIP code', 'addrUS.zip', d.addrUS.zip)
          : field('Street address abroad', 'addrAbroad.street', d.addrAbroad.street) + field('City', 'addrAbroad.city', d.addrAbroad.city) +
            field('Province or region', 'addrAbroad.region', d.addrAbroad.region) + field('Postal code', 'addrAbroad.postal', d.addrAbroad.postal) +
            field('Country', 'addrAbroad.country', d.addrAbroad.country)),
        true);
      var aw = app.querySelector('select[name="addrWhere"]');
      if (aw) aw.onchange = function () { d.addrWhere = aw.value; render(); };
    }
    if (step === 3) {
      shell('Step 3 of 5: your documents',
        '<p class="note">Copy the numbers from your forms. If you have several W-2s, add their boxes together. Leave a section at zero if you do not have that form.</p>' +
        '<h3>Form W-2 (add up all of them)</h3>' +
        field('Box 1: wages, tips, other compensation', 'wagesW2', d.wagesW2, { inputmode: 'decimal' }) +
        field('Box 2: federal income tax withheld', 'fedWithheldW2', d.fedWithheldW2, { inputmode: 'decimal' }) +
        field('Box 4: Social Security tax withheld', 'ssTaxW2', d.ssTaxW2, { inputmode: 'decimal' }) +
        field('Box 6: Medicare tax withheld', 'medTaxW2', d.medTaxW2, { inputmode: 'decimal' }) +
        '<h3>Form 1042-S (if you received one)</h3>' +
        field('Gross income from the 1042-S (wages or scholarship paid under a treaty setup)', 'wages1042', d.wages1042, { inputmode: 'decimal' }) +
        field('Federal tax withheld on the 1042-S', 'withheld1042', d.withheld1042, { inputmode: 'decimal' }) +
        '<h3>Scholarship or fellowship</h3>' +
        field('Taxable scholarship amount (the part used for living costs, not tuition or books)', 'scholarshipTaxable', d.scholarshipTaxable, { inputmode: 'decimal' }),
        true);
    }
    if (step === 4) {
      shell('Step 4 of 5: treaty and Schedule OI details',
        sel('Your tax treaty country (residence country with a US treaty claim)', 'treatyCountry', d.treatyCountry,
          [['', 'No treaty claim'], ['China', 'China (students: $5,000 of wages exempt)'], ['India', 'India (students: standard deduction allowed)'], ['other', 'Another country (not covered yet)']]) +
        field('Months you claimed this treaty benefit in earlier years (0 if none)', 'treatyMonthsPrior', d.treatyMonthsPrior, { type: 'number', inputmode: 'numeric' }) +
        field('Country or countries of citizenship', 'citizenship', d.citizenship) +
        field('Country where you claim tax residence', 'taxResidence', d.taxResidence) +
        '<label class="field"><span>Your trips in and out of the US during 2025, one per line: entry date, exit date (MM/DD/YYYY). Leave blank if you never left.</span>' +
        '<textarea name="tripsText" rows="4" placeholder="01/04/2025, 12/18/2025">' + String(d.tripsText || '').replace(/</g, '&lt;') + '</textarea></label>' +
        sel('Have you ever applied to become a green card holder?', 'appliedGreenCard', d.appliedGreenCard, [['no', 'No'], ['yes', 'Yes']]) +
        sel('Have you ever held a green card before?', 'everGreenCard', d.everGreenCard, [['no', 'No'], ['yes', 'Yes']]) +
        sel('Did you change visa type or immigration status at any point?', 'changedStatus', d.changedStatus, [['no', 'No'], ['yes', 'Yes']]) +
        field('If yes, the date and what changed (optional)', 'changeDetail', d.changeDetail) +
        sel('Did you file a US tax return in an earlier year?', 'filedBefore', d.filedBefore, [['no', 'No'], ['yes', 'Yes']]) +
        field('If yes, the latest year and form (for example: 2024, Form 1040-NR)', 'priorFiling', d.priorFiling),
        true);
    }
    if (step === 5) {
      var rows = [
        ['Total wages (line 1a)', money(calc.line1a)],
        ['Treaty-exempt wages (line 1k)', money(calc.line1k)],
        ['Taxable scholarship (line 8)', money(calc.line8)],
        ['Total income (line 9)', money(calc.line9)],
        ['Deduction (line 12)', money(calc.line12)],
        ['Taxable income (line 15)', money(calc.line15)],
        ['Tax (line 24)', money(calc.line24)],
        ['Already withheld (line 33)', money(calc.line33)]
      ].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td></tr>'; }).join('');
      var verdict = calc.refund > 0
        ? '<p class="verdict good">Estimated refund: ' + money(calc.refund) + '</p>'
        : (calc.owed > 0 ? '<p class="verdict bad">Estimated amount you owe: ' + money(calc.owed) + '</p>'
          : '<p class="verdict">No refund and nothing owed. You still have to file.</p>');
      var fica = calc.ficaFlag
        ? '<p class="note"><strong>Possible extra refund:</strong> your W-2 shows ' + money(calc.ficaWithheld) + ' of Social Security and Medicare tax. Most F-1 and J-1 nonresident students do not owe those taxes. First ask your employer to refund them. If the employer will not, you can claim them from the IRS with Form 843 and Form 8316. This return does not claim them, and they are not in the numbers above.</p>' : '';
      shell('Step 5 of 5: your result for 2025',
        '<p class="note">' + residency.why + '</p>' +
        '<table class="lines">' + rows + '</table>' + verdict + fica +
        '<p class="note">Check the numbers against your W-2 and 1042-S before you continue. One step left: your SSN or ITIN, asked only now, used only inside the PDF made on this device.</p>',
        true);
    }
    if (step === 6) {
      shell('Last step: your SSN or ITIN',
        '<p class="note">Asked last, on purpose. It is typed into the PDF on this device only.</p>' +
        '<label class="field"><span>SSN or ITIN</span><input name="tin" type="password" inputmode="numeric" autocomplete="off" value=""></label>',
        true);
    }
  }

  async function generate() {
    message('Building your PDF', '<p>One moment. This happens entirely on your device.</p>', null, null);
    try {
      var PDFLib = window.PDFLib;
      var docs = [];
      docs.push(await buildReturnSlip(PDFLib, d, calc));
      docs.push(await buildSummary(PDFLib, d, calc, residency));
      var bNR = await (await fetch('assets/f1040nr.pdf')).arrayBuffer();
      docs.push(await fill1040NR(PDFLib, bNR, d, calc));
      var bOI = await (await fetch('assets/f1040nro.pdf')).arrayBuffer();
      docs.push(await fillScheduleOI(PDFLib, bOI, d, calc));
      if (calc.line8 > 0) {
        var bS1 = await (await fetch('assets/f1040s1.pdf')).arrayBuffer();
        docs.push(await fillSchedule1(PDFLib, bS1, d, calc));
      }
      var out = await PDFLib.PDFDocument.create();
      for (var i = 0; i < docs.length; i++) {
        var pages = await out.copyPages(docs[i], docs[i].getPageIndices());
        pages.forEach(function (p) { out.addPage(p); });
      }
      var bytes = await out.save();
      var blob = new Blob([bytes], { type: 'application/pdf' });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = URL.createObjectURL(blob);
      var owedNote = calc.owed > 0
        ? '<p>Your slip sends this return to the IRS office in Charlotte because a payment goes with it. Pay online at irs.gov/payments if you prefer, and still mail the signed return.</p>'
        : '<p>Your slip sends this return to the IRS office in Austin, Texas.</p>';
      app.innerHTML = '';
      var wrap = el('<section class="card"></section>');
      wrap.appendChild(el('<h2>Your 1040-NR package is ready</h2>'));
      wrap.appendChild(el('<div><p>The PDF has your mailing slip first, then a summary, then the filled Form 1040-NR and Schedule OI' +
        (calc.line8 > 0 ? ', plus Schedule 1 for your scholarship' : '') + '.</p>' + owedNote +
        '<p><strong>Print it, sign and date page 2 of the 1040-NR, attach Copy B of each W-2 and Copy C of each 1042-S behind the return, and mail it by April 15, 2026.</strong> Keep a copy of everything.</p></div>'));
      var a = el('<a class="btn" download="my1040nr-1040nr-2025.pdf">Download your PDF</a>');
      a.href = pdfUrl;
      wrap.appendChild(a);
      var erase = el('<button class="btn secondary" style="margin-left:.5rem">Erase everything now</button>');
      erase.onclick = function () { location.reload(); };
      wrap.appendChild(erase);
      app.appendChild(wrap);
    } catch (err) {
      message('Something went wrong', '<p>The PDF could not be built. Your answers are still on this page: go back and try again. If it keeps failing, the offline copy from GitHub runs the same code.</p>', 'Back', function () { step = 6; render(); });
    }
  }

  function textPage(PDFLib, title, lines) {
    return PDFLib.PDFDocument.create().then(function (doc) {
      var font = doc.embedFont(PDFLib.StandardFonts.Helvetica);
      var bold = doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      var page = doc.addPage([612, 792]);
      var y = 740;
      page.drawText(title, { x: 56, y: y, size: 16, font: bold }); y -= 28;
      lines.forEach(function (ln) {
        if (ln === '') { y -= 10; return; }
        var isHead = ln.charAt(0) === '#';
        page.drawText(isHead ? ln.slice(1) : ln, { x: 56, y: y, size: isHead ? 12 : 10.5, font: isHead ? bold : font, maxWidth: 500, lineHeight: 14 });
        y -= isHead ? 22 : 16;
      });
      page.drawText('Prepared with My1040NR, rules version ' + NR_RULES_VERSION + '. Free and open source: my1040nr.com', { x: 56, y: 48, size: 8.5, font: font });
      return doc;
    });
  }
  function buildReturnSlip(PDFLib, d, c) {
    var owed = c.owed > 0;
    return textPage(PDFLib, 'Mailing slip: Form 1040-NR (2025)', [
      '#FROM',
      d.firstName + ' ' + d.lastName,
      owed ? '' : '',
      '#MAIL THIS PACKAGE TO',
      owed ? 'Internal Revenue Service, P.O. Box 1303, Charlotte, NC 28201-1303' : 'Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215',
      owed ? '(Use this address because a payment is enclosed or owed.)' : '(Use this address when no payment is enclosed.)',
      '',
      '#DEADLINE',
      'Postmark by April 15, 2026. An extension (Form 4868) moves filing to October 15, 2026, never the duty to pay.',
      '',
      '#IN THIS ENVELOPE',
      '1. This slip (not an IRS form, just your guide).',
      '2. Form 1040-NR pages 1 and 2, signed and dated.',
      '3. Schedule OI (required with the return).',
      c.line8 > 0 ? '4. Schedule 1 (for your taxable scholarship).' : '',
      '5. Copy B of every W-2 and Copy C of every 1042-S, attached behind the return.',
      owed ? '6. A check or money order payable to "United States Treasury" with your SSN and "2025 Form 1040-NR" written on it, or pay online and write "paid online" here.' : '',
      '',
      '#BEFORE YOU SEAL IT',
      'Sign and date page 2 of Form 1040-NR. An unsigned return is not filed.',
      'Write your SSN or ITIN at the top of every page after page 1.',
      'Photograph or scan the whole package for your records.',
      'Use USPS and keep the postmark receipt. This slip is not an IRS form.'
    ].filter(function (x) { return x !== ''; }));
  }
  function buildSummary(PDFLib, d, c, res) {
    return textPage(PDFLib, 'Your 2025 summary (not an IRS form)', [
      '#RESULT',
      c.refund > 0 ? 'Estimated refund: ' + money(c.refund) : (c.owed > 0 ? 'Amount owed: ' + money(c.owed) : 'No refund, nothing owed.'),
      '',
      '#HOW IT WAS COMPUTED',
      'Total wages: ' + money(c.line1a) + (c.line1k ? ' (treaty-exempt part: ' + money(c.line1k) + ', ' + d.treatyCountry + ' treaty)' : ''),
      'Taxable scholarship: ' + money(c.line8),
      'Total income: ' + money(c.line9) + '. Deduction: ' + money(c.line12) + '. Taxable income: ' + money(c.line15) + '.',
      'Tax: ' + money(c.line24) + '. Withheld: ' + money(c.line33) + '.',
      '',
      '#RESIDENCY',
      res.why,
      '',
      c.ficaFlag ? '#FICA NOTE' : '',
      c.ficaFlag ? 'Your W-2 withheld ' + money(c.ficaWithheld) + ' of Social Security and Medicare tax. As an F or J nonresident you likely did not owe it. Ask your employer for it back first; if they refuse, file Form 843 with Form 8316 to claim it from the IRS. It is separate from this return.' : '',
      '',
      '#STATE TAXES',
      'This package is federal only. Many students also owe a state return: check the free state checker at my1040nr.com/states.',
      '',
      '#A COPY FOR YOU',
      'Keep this summary and a copy of the signed return for at least 3 years.'
    ]);
  }

  render();
})();
