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
    stCode: '', stWages: '', stWithheld: '', livedState: '', nyForeignAcct: 'no', nyLivingQuarters: 'no',
    treatyCountry: '', citizenship: '', taxResidence: '', treatyMonthsPrior: '0',
    tripsText: '', appliedGreenCard: 'no', everGreenCard: 'no', changedStatus: 'no',
    changeDetail: '', filedBefore: 'no', priorFiling: '', treatyForeignTaxed: 'no', tin: ''
  };
  var step = 0, residency = null, calc = null, pdfUrl = null, det = null, stateRes = null, addrWarn = '';

  /* Document upload and side-by-side review (spec Section 12). Extracted
     values are candidates only: each one must be confirmed by the student
     against the picture of the form before Continue unlocks. */
  var uploads = [], activeUpload = 0, reviewing = false, selectedField = null, uploadSeq = 0;
  var W2_FIELDS = [
    ['wagesW2', 'Box 1: wages, tips, other compensation'],
    ['fedWithheldW2', 'Box 2: federal income tax withheld'],
    ['ssTaxW2', 'Box 4: Social Security tax withheld'],
    ['medTaxW2', 'Box 6: Medicare tax withheld'],
    ['stCode', 'Box 15: state (two letters)'],
    ['stWages', 'Box 16: state wages'],
    ['stWithheld', 'Box 17: state tax withheld']
  ];
  var S1042_FIELDS = [
    ['wages1042', 'Gross income (box 2)'],
    ['withheld1042', 'Federal tax withheld (box 7a)']
  ];
  function fieldDefs(kind) { return kind === 'w2' ? W2_FIELDS : S1042_FIELDS; }
  function isStateKey(kind, key) { return kind === 'w2' && (key === 'stCode' || key === 'stWages' || key === 'stWithheld'); }

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
  var US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

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
    else if (step === 2) {
      if (d.addrWhere === 'us') {
        var chk = checkUSAddress(d.addrUS);
        if (chk.error) { message('Check your US address', '<p>' + chk.error + '</p>', 'Back to the address', function () { step = 2; render(); }); return; }
        addrWarn = chk.warn || '';
      }
      step = 3;
    }
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
    else if (step === 5) {
      det = stateDetermination(d, calc);
      stateRes = det.action === 'prepare' ? stateCalc(det.state, d, calc) : null;
      step = 6;
    }
    else if (step === 6) step = 7;
    else if (step === 7) { generate(); return; }
    render();
  }

  function uploadPanelHtml() {
    return '<div class="upload-panel"><h3>Have your W-2 or 1042-S as a PDF? Let this page read it</h3>' +
      '<p>Open the PDF and the numbers are read <strong>on this device only</strong>. The file is never sent anywhere and nothing is stored. You then check every number against a picture of your own form and confirm each one before it is used. Nothing is used on extraction alone.</p>' +
      '<label class="field"><span>W-2 PDF (you can add several)</span><input type="file" data-kind="w2" accept="application/pdf" multiple></label>' +
      '<label class="field"><span>1042-S PDF</span><input type="file" data-kind="s1042" accept="application/pdf" multiple></label>' +
      '<p class="upload-status"></p></div>';
  }
  function bindUploadInputs(scope) {
    if (!scope || !window.DocExtract) return;
    var inputs = scope.querySelectorAll('input[type="file"][data-kind]');
    inputs.forEach(function (inp) {
      inp.onchange = function () {
        if (!inp.files || !inp.files.length) return;
        var status = scope.querySelector('.upload-status');
        handleFiles(inp.getAttribute('data-kind'), inp.files, status, inp);
        inp.value = '';
      };
    });
  }
  function handleFiles(kind, files, status, input) {
    var list = Array.prototype.slice.call(files);
    if (status) status.textContent = 'Reading on your device...';
    if (input) input.disabled = true;
    var chain = Promise.resolve(), added = 0, firstNew = -1;
    list.forEach(function (file) {
      chain = chain.then(function () {
        return window.DocExtract.loadFile(file).then(function (doc) {
          if (doc.type !== 'unknown' && doc.type !== kind) {
            if (status) status.textContent = 'That file looks like a ' + (doc.type === 'w2' ? 'Form W-2' : 'Form 1042-S') + ', so it was not added here. Use the other upload box for it.';
            return;
          }
          var entry = makeEntry(kind, doc);
          uploads.push(entry);
          if (firstNew < 0) firstNew = uploads.length - 1;
          added++;
        }).catch(function () {
          if (status) status.textContent = 'That file could not be read as a PDF. You can type the numbers by hand instead.';
        });
      });
    });
    chain.then(function () {
      if (input) input.disabled = false;
      if (added > 0) { reviewing = true; activeUpload = firstNew; selectedField = null; render(); }
    });
  }
  function makeEntry(kind, doc) {
    var fields = {}, found = 0;
    fieldDefs(kind).forEach(function (df) {
      var f = doc.fields[df[0]];
      if (f) found++;
      fields[df[0]] = { value: f ? f.value : '', confirmed: false, page: f ? f.page : 0, rect: f ? f.rect : null, found: !!f };
    });
    return { id: ++uploadSeq, kind: kind, name: doc.name, doc: doc, fields: fields, noStateRow: false, anyText: doc.anyText, foundCount: found };
  }
  function isFieldDone(entry, key) {
    if (isStateKey(entry.kind, key) && entry.noStateRow) return true;
    return !!entry.fields[key].confirmed;
  }
  function entryProgress(entry) {
    var defs = fieldDefs(entry.kind), done = 0;
    defs.forEach(function (df) { if (isFieldDone(entry, df[0])) done++; });
    return { done: done, total: defs.length };
  }
  function allConfirmed() {
    return uploads.length > 0 && uploads.every(function (u) { var p = entryProgress(u); return p.done === p.total; });
  }
  function totalProgress() {
    var done = 0, total = 0;
    uploads.forEach(function (u) { var p = entryProgress(u); done += p.done; total += p.total; });
    return { done: done, total: total };
  }
  function finishReview() {
    var sum = function (kind, key) {
      return uploads.filter(function (u) { return u.kind === kind; }).reduce(function (a, u) {
        return a + num(u.fields[key] ? u.fields[key].value : '');
      }, 0);
    };
    var moneyStr = function (n) { return n ? String(n) : ''; };
    d.wagesW2 = moneyStr(sum('w2', 'wagesW2'));
    d.fedWithheldW2 = moneyStr(sum('w2', 'fedWithheldW2'));
    d.ssTaxW2 = moneyStr(sum('w2', 'ssTaxW2'));
    d.medTaxW2 = moneyStr(sum('w2', 'medTaxW2'));
    d.wages1042 = moneyStr(sum('s1042', 'wages1042'));
    d.withheld1042 = moneyStr(sum('s1042', 'withheld1042'));
    var byState = {};
    uploads.filter(function (u) { return u.kind === 'w2' && !u.noStateRow; }).forEach(function (u) {
      var code = String(u.fields.stCode.value || '').toUpperCase();
      if (!code) return;
      if (!byState[code]) byState[code] = { wages: 0, withheld: 0 };
      byState[code].wages += num(u.fields.stWages.value);
      byState[code].withheld += num(u.fields.stWithheld.value);
    });
    var codes = Object.keys(byState);
    if (codes.length) {
      codes.sort(function (a, b) { return byState[b].wages - byState[a].wages; });
      d.stCode = codes[0];
      d.stWages = moneyStr(byState[codes[0]].wages);
      d.stWithheld = moneyStr(byState[codes[0]].withheld);
    } else { d.stCode = ''; d.stWages = ''; d.stWithheld = ''; }
    var sch = document.getElementById('rv-scholarship');
    if (sch) d.scholarshipTaxable = sch.value;
    reviewing = false;
    if (num(d.wagesW2) + num(d.wages1042) + num(d.scholarshipTaxable) <= 0) {
      message('No income to report?',
        '<p>You confirmed no wages and no taxable scholarship. If you truly had no US income in 2025, you most likely only need <a href="prepare.html">Form 8843</a>, not a 1040-NR. If you did have income, go back and check the numbers on your documents.</p>',
        'Back to documents', function () { step = 3; render(); });
      return;
    }
    step = 4;
    render();
  }

  function renderReview() {
    app.innerHTML = '';
    var wrap = el('<section class="card"></section>');
    wrap.appendChild(el('<h2>Step 3 of 6: check the numbers we read</h2>'));
    wrap.appendChild(el('<p>Your document is on the left and the numbers we read are on the right, in large type. Compare each number with your form. Click <strong>This matches</strong> and the number turns green. You can also fix a number first; a fixed number needs a fresh click. Continue unlocks only when every number is green.</p>'));
    var entry = uploads[activeUpload];
    if (!entry) { reviewing = false; render(); return; }
    /* document chips */
    var chips = el('<div class="doc-chips"></div>');
    uploads.forEach(function (u, i) {
      var p = entryProgress(u);
      var b = el('<button type="button" class="doc-chip' + (i === activeUpload ? ' active' : '') + '">' +
        (u.kind === 'w2' ? 'W-2' : '1042-S') + ': ' + u.name.replace(/</g, '&lt;') + ' (' + p.done + ' of ' + p.total + ' confirmed)</button>');
      b.onclick = function () { activeUpload = i; selectedField = null; renderReview(); };
      chips.appendChild(b);
      var rm = el('<button type="button" class="doc-chip remove" title="Remove this document">x</button>');
      rm.onclick = function () {
        uploads.splice(i, 1);
        if (!uploads.length) { reviewing = false; render(); return; }
        if (activeUpload >= uploads.length) activeUpload = uploads.length - 1;
        selectedField = null; renderReview();
      };
      chips.appendChild(rm);
    });
    wrap.appendChild(chips);
    if (!entry.anyText) {
      wrap.appendChild(el('<p class="note">We could not read any numbers from this file. It may be a scanned picture of the form. The picture is still shown: type each number from it and confirm every one.</p>'));
    } else if (entry.foundCount === 0) {
      wrap.appendChild(el('<p class="note">We could not match the boxes in this file to our form. Type each number from the picture and confirm every one.</p>'));
    }
    /* side by side */
    var grid = el('<div class="review-grid"></div>');
    var left = el('<div class="docview"><div class="canvas-wrap"></div></div>');
    grid.appendChild(left);
    var right = el('<div class="review-fields"></div>');
    var rowsByKey = {};
    fieldDefs(entry.kind).forEach(function (df) {
      var key = df[0], f = entry.fields[key];
      var row = el('<div class="rv-field"></div>');
      row.setAttribute('data-key', key);
      var lab = el('<label></label>');
      lab.textContent = df[1];
      row.appendChild(lab);
      var inp = el('<input inputmode="' + (key === 'stCode' ? 'text' : 'decimal') + '" autocomplete="off">');
      inp.id = 'review-' + key;
      lab.htmlFor = inp.id;
      inp.value = f.value;
      row.appendChild(inp);
      var foot = el('<div class="rv-foot"></div>');
      var chip = el('<span class="chip"></span>');
      foot.appendChild(chip);
      var btn = el('<button type="button" class="btn rv-confirm">This matches</button>');
      foot.appendChild(btn);
      row.appendChild(foot);
      var paint = function () {
        var absent = isStateKey(entry.kind, key) && entry.noStateRow;
        row.className = 'rv-field' + (absent ? ' absent' : (f.confirmed ? ' ok' : ' needs'));
        chip.className = 'chip' + (absent ? '' : (f.confirmed ? ' ok' : ' needs'));
        chip.textContent = absent ? 'No state row' : (f.confirmed ? 'Confirmed' : 'Needs review');
        inp.disabled = absent;
        btn.disabled = absent;
      };
      inp.addEventListener('input', function () {
        f.value = inp.value; f.confirmed = false; paint(); refreshChrome();
      });
      inp.addEventListener('focus', function () { selectedField = key; drawSource(); });
      row.addEventListener('click', function () { selectedField = key; drawSource(); });
      btn.onclick = function () {
        var v = String(inp.value).trim();
        if (key === 'stCode') {
          var up = v.toUpperCase();
          if (!/^[A-Z]{2}$/.test(up) || US_STATES.indexOf(up) < 0) { chip.textContent = 'Enter the two state letters'; return; }
          inp.value = up; f.value = up;
        } else if (v === '' || isNaN(num(v)) || num(v) < 0) {
          chip.textContent = 'Enter the number from your form'; return;
        }
        f.value = inp.value; f.confirmed = true; paint(); refreshChrome();
      };
      rowsByKey[key] = { paint: paint };
      paint();
      right.appendChild(row);
    });
    if (entry.kind === 'w2') {
      var ns = el('<label class="rv-nostate"><input type="checkbox"> This W-2 has no state row (boxes 15 to 17 are empty)</label>');
      var cb = ns.querySelector('input');
      cb.checked = !!entry.noStateRow;
      cb.onchange = function () {
        entry.noStateRow = cb.checked;
        ['stCode', 'stWages', 'stWithheld'].forEach(function (k) { if (rowsByKey[k]) rowsByKey[k].paint(); });
        refreshChrome();
      };
      right.appendChild(ns);
    }
    var sch = el('<label class="field"><span>Taxable scholarship that is not on these forms (optional)</span><input id="rv-scholarship" inputmode="decimal" value="' + String(d.scholarshipTaxable || '').replace(/"/g, '&quot;') + '"></label>');
    right.appendChild(sch);
    var more = el('<div class="upload-panel compact"><h3>Add another document</h3>' +
      '<label class="field"><span>W-2 PDF</span><input type="file" data-kind="w2" accept="application/pdf" multiple></label>' +
      '<label class="field"><span>1042-S PDF</span><input type="file" data-kind="s1042" accept="application/pdf" multiple></label>' +
      '<p class="upload-status"></p></div>');
    right.appendChild(more);
    grid.appendChild(right);
    wrap.appendChild(grid);
    /* progress + nav */
    var prog = el('<p class="rv-progress"></p>');
    wrap.appendChild(prog);
    var nav = el('<div class="row"></div>');
    var back = el('<button type="button" class="btn secondary">Back</button>');
    back.onclick = function () { step = 2; render(); };
    nav.appendChild(back);
    var manual = el('<button type="button" class="btn secondary">Type the numbers instead</button>');
    manual.onclick = function () { uploads = []; reviewing = false; render(); };
    nav.appendChild(manual);
    var cont = el('<button type="button" class="btn" id="rv-continue">Continue</button>');
    cont.onclick = function () { if (allConfirmed()) finishReview(); };
    nav.appendChild(cont);
    wrap.appendChild(nav);
    app.appendChild(wrap);
    bindUploadInputs(wrap);
    function drawSource() {
      var cw = left.querySelector('.canvas-wrap');
      cw.innerHTML = '';
      var f = selectedField ? entry.fields[selectedField] : null;
      var pageIdx = f && f.rect ? f.page : firstFieldPage(entry);
      var pg = entry.doc.pages[pageIdx];
      if (!pg) return;
      cw.appendChild(pg.canvas);
      if (f && f.rect && f.page === pageIdx) {
        var hl = el('<div class="hl"></div>');
        hl.style.left = (f.rect.x / pg.w * 100) + '%';
        hl.style.top = (f.rect.y / pg.h * 100) + '%';
        hl.style.width = (f.rect.w / pg.w * 100) + '%';
        hl.style.height = (f.rect.h / pg.h * 100) + '%';
        cw.appendChild(hl);
      }
    }
    function firstFieldPage(e) {
      var keys = Object.keys(e.fields);
      for (var i = 0; i < keys.length; i++) if (e.fields[keys[i]].rect) return e.fields[keys[i]].page;
      return 0;
    }
    function refreshChrome() {
      var p = totalProgress();
      prog.textContent = p.done + ' of ' + p.total + ' values confirmed.';
      cont.disabled = !allConfirmed();
      var chipBtns = chips.querySelectorAll('.doc-chip:not(.remove)');
      chipBtns.forEach(function (b, i) {
        var u = uploads[i]; if (!u) return;
        var pp = entryProgress(u);
        b.textContent = (u.kind === 'w2' ? 'W-2' : '1042-S') + ': ' + u.name + ' (' + pp.done + ' of ' + pp.total + ' confirmed)';
      });
    }
    refreshChrome();
    drawSource();
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
      shell('Step 1 of 6: your residency for 2025',
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
      shell('Step 2 of 6: about you',
        field('First name and middle initial', 'firstName', d.firstName) +
        field('Last name (family name)', 'lastName', d.lastName) +
        sel('Filing status', 'status', d.status, [['single', 'Single'], ['mfs', 'Married filing separately']]) +
        sel('Did you have any digital assets (crypto and similar) activity in 2025?', 'digitalAssets', d.digitalAssets, [['no', 'No'], ['yes', 'Yes']]) +
        sel('Where should the IRS mail you?', 'addrWhere', d.addrWhere, [['us', 'A US address'], ['abroad', 'An address outside the US']]) +
        (us
          ? field('US street address', 'addrUS.street', d.addrUS.street) + field('Apartment (optional)', 'addrUS.apt', d.addrUS.apt) +
            field('City', 'addrUS.city', d.addrUS.city) + sel('State', 'addrUS.state', d.addrUS.state, [['', 'Choose a state']].concat(US_STATES.map(function (s) { return [s, s]; }))) + field('ZIP code', 'addrUS.zip', d.addrUS.zip)
          : field('Street address abroad', 'addrAbroad.street', d.addrAbroad.street) + field('City', 'addrAbroad.city', d.addrAbroad.city) +
            field('Province or region', 'addrAbroad.region', d.addrAbroad.region) + field('Postal code', 'addrAbroad.postal', d.addrAbroad.postal) +
            field('Country', 'addrAbroad.country', d.addrAbroad.country)),
        true);
      var aw = app.querySelector('select[name="addrWhere"]');
      if (aw) aw.onchange = function () { d.addrWhere = aw.value; render(); };
    }
    if (step === 3) {
      if (reviewing) { renderReview(); return; }
      shell('Step 3 of 6: your documents', (addrWarn ? '<div class="note">' + addrWarn + '</div>' : '') +
        uploadPanelHtml() +
        '<p class="note">Or copy the numbers from your forms by hand. If you have several W-2s, add their boxes together. Leave a section at zero if you do not have that form.</p>' +
        '<h3>Form W-2 (add up all of them)</h3>' +
        field('Box 1: wages, tips, other compensation', 'wagesW2', d.wagesW2, { inputmode: 'decimal' }) +
        field('Box 2: federal income tax withheld', 'fedWithheldW2', d.fedWithheldW2, { inputmode: 'decimal' }) +
        field('Box 4: Social Security tax withheld', 'ssTaxW2', d.ssTaxW2, { inputmode: 'decimal' }) +
        field('Box 6: Medicare tax withheld', 'medTaxW2', d.medTaxW2, { inputmode: 'decimal' }) +
        '<h3>The state line on your W-2 (boxes 15 to 17)</h3>' +
        '<p class="note">Most W-2s have one state line. If yours shows two states, enter the one where you did most of your work and check the other state on the states page.</p>' +
        sel('Box 15: state', 'stCode', d.stCode, [['', 'No state line / no state tax']].concat(US_STATES.map(function (s) { return [s, s]; }))) +
        field('Box 16: state wages', 'stWages', d.stWages, { inputmode: 'decimal' }) +
        field('Box 17: state tax withheld', 'stWithheld', d.stWithheld, { inputmode: 'decimal' }) +
        '<h3>Form 1042-S (if you received one)</h3>' +
        field('Gross income from the 1042-S (wages or scholarship paid under a treaty setup)', 'wages1042', d.wages1042, { inputmode: 'decimal' }) +
        field('Federal tax withheld on the 1042-S', 'withheld1042', d.withheld1042, { inputmode: 'decimal' }) +
        '<h3>Scholarship or fellowship</h3>' +
        field('Taxable scholarship amount (the part used for living costs, not tuition or books)', 'scholarshipTaxable', d.scholarshipTaxable, { inputmode: 'decimal' }),
        true);
      bindUploadInputs(app.querySelector('form'));
    }
    if (step === 4) {
      shell('Step 4 of 6: treaty and Schedule OI details',
        sel('Your tax treaty country (residence country with a US treaty claim)', 'treatyCountry', d.treatyCountry,
          [['', 'No treaty claim'], ['China', 'China (students: $5,000 of wages exempt)'], ['India', 'India (students: standard deduction allowed)'], ['other', 'Another country (not covered yet)']]) +
        field('Months you claimed this treaty benefit in earlier years (0 if none)', 'treatyMonthsPrior', d.treatyMonthsPrior, { type: 'number', inputmode: 'numeric' }) +
        sel('Country of citizenship', 'citizenship', d.citizenship, [['', 'Choose a country']].concat(countryOpts())) +
        sel('Country where you claim tax residence', 'taxResidence', d.taxResidence, [['', 'Choose a country']].concat(countryOpts())) +
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
      shell('Step 5 of 6: your federal result for 2025',
        '<p class="note">' + residency.why + '</p>' +
        '<table class="lines">' + rows + '</table>' + verdict + fica +
        '<p class="note">Check the numbers against your W-2 and 1042-S before you continue. One step left: your SSN or ITIN, asked only now, used only inside the PDF made on this device.</p>',
        true);
    }
    if (step === 6) {
      var stBody;
      if (det.action === 'prepare') {
        var sf = STATE_FORMS[det.state];
        var verdict = stateRes.refund > 0 ? '<p class="verdict good">' + det.state + ' refund: ' + money(stateRes.refund) + '</p>'
          : (stateRes.owed > 0 ? '<p class="verdict bad">' + det.state + ' amount owed: ' + money(stateRes.owed) + '</p>' : '<p class="verdict">' + det.state + ': no refund, nothing owed.</p>');
        stBody = '<p>' + det.reason + '</p>' +
          '<table class="lines"><tr><td>' + sf.form + ' tax</td><td class="num">' + money(stateRes.tax) + '</td></tr>' +
          '<tr><td>' + det.state + ' tax already withheld</td><td class="num">' + money(stateRes.payments) + '</td></tr></table>' + verdict +
          '<p class="note">The state return goes in its OWN envelope to the state, never to the IRS. Your package includes a separate state mailing slip with the right address (' + sf.agency + ', deadline ' + sf.deadline + ').</p>' +
          (det.state === 'NY' ? sel('Do you have a bank or financial account in another country?', 'nyForeignAcct', d.nyForeignAcct, [['no', 'No'], ['yes', 'Yes']]) +
            sel('Did you keep an apartment or other living quarters in New York State during 2025?', 'nyLivingQuarters', d.nyLivingQuarters, [['no', 'No'], ['yes', 'Yes']]) +
            '<p class="note">If you kept living quarters in New York and spent 183 or more days there, New York may treat you as a resident for tax. If that is you, talk to a tax advisor before filing this nonresident return.</p>' : '');
      } else if (det.action === 'prepare-refund-only') {
        stBody = '<p>' + det.reason + '</p><p class="note">This version prepares CA, NY, MA and IL. For ' + det.state + ', use the worksheet numbers in your summary page with that state\'s own nonresident form to claim the withholding back.</p>';
      } else {
        stBody = '<p>' + det.reason + '</p>';
      }
      shell('Step 6 of 6: your state return', stBody, true);
    }
    if (step === 7) {
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
      if (det && det.action === 'prepare' && stateRes) {
        docs.push(await buildStateSlip(PDFLib, det.state, d, stateRes));
        var asset = { CA: 'assets/ca-540nr.pdf', NY: 'assets/ny-it203.pdf', MA: 'assets/ma-1nrpy.pdf', IL: 'assets/il-1040.pdf' }[det.state];
        var bSt = await (await fetch(asset)).arrayBuffer();
        if (det.state === 'CA') docs.push(await fillCA(PDFLib, bSt, d, stateRes));
        if (det.state === 'NY') docs.push(await fillNY(PDFLib, bSt, d, stateRes));
        if (det.state === 'MA') docs.push(await fillMA(PDFLib, bSt, d, stateRes));
        if (det.state === 'IL') docs.push(await fillIL(PDFLib, bSt, d, stateRes, calc));
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
        (calc.line8 > 0 ? ', plus Schedule 1 for your scholarship' : '') +
        ((det && det.action === 'prepare') ? ', and after those, your ' + det.state + ' state return behind its own mailing slip' : '') + '.</p>' + owedNote +
        ((det && det.action === 'prepare') ? '<p><strong>The state return goes in a separate envelope to the state address on its slip. Never mail it to the IRS.</strong></p>' : '') +
        '<p><strong>Print it, sign and date page 2 of the 1040-NR, attach Copy B of each W-2 and Copy C of each 1042-S behind the return, and mail it by April 15, 2026.</strong> Keep a copy of everything.</p></div>'));
      var a = el('<a class="btn" download="my1040nr-1040nr-2025.pdf">Download your PDF</a>');
      a.href = pdfUrl;
      wrap.appendChild(a);
      var erase = el('<button class="btn secondary" style="margin-left:.5rem">Erase everything now</button>');
      erase.onclick = function () { location.reload(); };
      wrap.appendChild(erase);
      app.appendChild(wrap);
    } catch (err) {
      console.error(err);
      message('Something went wrong', '<p>The PDF could not be built. Your answers are still on this page: go back and try again. If it keeps failing, the offline copy from GitHub runs the same code.</p><p class="note">Error detail: ' + String((err && err.message) || err).replace(/</g, '&lt;') + '</p>', 'Back', function () { step = 7; render(); });
    }
  }

  async function textPage(PDFLib, title, lines) {
    var doc = await PDFLib.PDFDocument.create();
    {
      var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      var bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
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
    }
  }
  function stateWorksheet(st, s) {
    if (st === 'CA') return 'California income ' + money(s.caAGI) + ' of ' + money(s.totalAll) + ' total (treaty wages added back for California).';
    if (st === 'NY') return 'New York income ' + money(s.nysAGI) + ' of ' + money(s.fedAGI) + ' federal (' + (s.pct * 100).toFixed(1) + '% allocated). Household credit not claimed.';
    if (st === 'MA') return 'Massachusetts income ' + money(s.maIncome) + ' of ' + money(s.totalIncome) + ' total; exemption prorated to ' + money(s.exemption) + (s.ficaDed ? '; FICA deduction ' + money(s.ficaDed) : '') + '.';
    if (st === 'IL') return 'Illinois income ' + money(s.ilIncome) + '; prorated exemption ' + money(s.exemption) + '; net ' + money(s.net) + ' at 4.95%. These are your Schedule NR numbers.';
    return '';
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
  function buildStateSlip(PDFLib, st, d, s) {
    var sf = STATE_FORMS[st];
    var owe = s.owed > 0;
    var notes = {
      CA: 'California does not honor the federal treaty exemption: treaty-exempt wages were added back on line 16. Schedule CA (540NR) is not attached in this version; if the FTB asks for it, your California amounts are on the summary worksheet in this package.',
      NY: 'New York household credit (up to $75 for many students) is not claimed in this version. As a New York nonresident you owe no New York City income tax.',
      MA: 'Massachusetts amounts are entered as Massachusetts source income, the way Form 1-NR/PY asks nonresidents to report. Your exemption was prorated on line 22 using the line 14g ratio. Enclose Schedule HC if it applies to you.',
      IL: 'Schedule NR is not attached in this version. Your Schedule NR numbers are on the summary worksheet in this package; if Illinois asks for the schedule, copy them in.'
    }[st];
    return textPage(PDFLib, 'State mailing slip: ' + sf.form + ' (' + st + ', 2025)', [
      '#SEPARATE ENVELOPE',
      'This state return goes in its OWN envelope to the state. Never mail it to the IRS, and never mail your federal return to the state.',
      '',
      '#MAIL THIS STATE PACKAGE TO',
      owe ? sf.addrOwe : sf.addrRefund,
      '',
      '#DEADLINE',
      'Postmark by ' + sf.deadline + '.',
      '',
      '#IN THIS ENVELOPE',
      '1. This slip (not a state form, just your guide).',
      '2. The filled ' + sf.form + ', signed and dated.',
      '3. A copy of your federal return and your W-2 (states ask for these; include copies, not originals).',
      owe ? '4. Payment: pay online at the state tax website if you can; otherwise a check payable per the form instructions, with your SSN and "2025 ' + sf.form + '" written on it.' : '',
      '',
      '#YOUR NUMBERS',
      st + ' tax: ' + money(s.tax) + '. Withheld: ' + money(s.payments) + '. ' + (s.refund > 0 ? 'Refund: ' + money(s.refund) + '.' : (s.owed > 0 ? 'You owe: ' + money(s.owed) + '.' : 'Nothing owed, no refund.')),
      '',
      '#NOTE',
      notes
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
      (det && det.action === 'prepare' && stateRes)
        ? det.state + ' return prepared in this package: tax ' + money(stateRes.tax) + ', withheld ' + money(stateRes.payments) + ', ' + (stateRes.refund > 0 ? 'refund ' + money(stateRes.refund) : (stateRes.owed > 0 ? 'owed ' + money(stateRes.owed) : 'even')) + '. Mail it separately to the state. Worksheet: ' + stateWorksheet(det.state, stateRes)
        : (det ? det.reason : 'No state determination was made.'),
      '',
      '#A COPY FOR YOU',
      'Keep this summary and a copy of the signed return for at least 3 years.'
    ]);
  }

  render();
})();
