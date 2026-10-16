/* My1040NR document extraction (Section 12 of the product spec).
   Reads a W-2 or 1042-S PDF entirely on the student's device with pdf.js.
   Nothing is uploaded anywhere: the file is parsed in this tab only.
   Extraction produces CANDIDATE values with the rectangle they came from,
   so the review screen can show each value next to its source. A value is
   never used until the student confirms it on the review screen. */
(function () {
  'use strict';
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.js';
  }
  var STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function isMoney(s) {
    var t = String(s || '').trim();
    if (!/^\$?\d{1,3}(,\d{3})*(\.\d{2})$/.test(t) && !/^\$?\d+\.\d{2}$/.test(t)) return false;
    return true;
  }
  function moneyVal(s) { return parseFloat(String(s).replace(/[$,]/g, '')); }
  function isIntMoney(s) {
    var t = String(s || '').trim();
    if (!/^\$?\d{1,3}(,\d{3})*$/.test(t)) return false;
    var v = moneyVal(t);
    return v >= 100 && !(v >= 1900 && v <= 2100);
  }
  function itemRect(it, pageH) {
    /* pdf.js reports item.width and item.height already in page points. */
    var x = it.transform[4], yTop = pageH - (it.transform[5] + it.height);
    return { x: x, y: yTop, w: Math.max(it.width, 6), h: Math.max(it.height, 8) };
  }

  /* Load a File: parse text items and render each page to a canvas. */
  function loadFile(file) {
    return file.arrayBuffer().then(function (buf) {
      return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (pdf) {
      var doc = { name: file.name, numPages: pdf.numPages, pages: [], text: '', type: 'unknown', fields: {}, anyText: false };
      var chain = Promise.resolve();
      var pageNums = [];
      for (var i = 1; i <= pdf.numPages; i++) pageNums.push(i);
      pageNums.forEach(function (n) {
        chain = chain.then(function () {
          return pdf.getPage(n).then(function (page) {
            var base = page.getViewport({ scale: 1 });
            var scale = 900 / base.width;
            var vp = page.getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            var ctx = canvas.getContext('2d');
            return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
              return page.getTextContent();
            }).then(function (tc) {
              var items = [];
              tc.items.forEach(function (it) {
                var s = norm(it.str);
                if (s) doc.anyText = true;
                items.push({ str: s, raw: it.str, rect: itemRect(it, base.height), page: n - 1 });
                doc.text += s + '\n';
              });
              doc.pages.push({ canvas: canvas, w: base.width, h: base.height, items: items });
            });
          });
        });
      });
      return chain.then(function () { analyze(doc); return doc; });
    });
  }

  function detectType(text) {
    if (/1042-S/.test(text)) return 's1042';
    if (/W-2\b/.test(text) || /Wage and Tax Statement/.test(text)) return 'w2';
    return 'unknown';
  }

  function allItems(doc) {
    var out = [];
    doc.pages.forEach(function (p) { p.items.forEach(function (it) { out.push(it); }); });
    return out;
  }
  function findLabel(items, patterns) {
    for (var i = 0; i < items.length; i++) {
      for (var j = 0; j < patterns.length; j++) {
        if (patterns[j].test(items[i].str)) return items[i];
      }
    }
    return null;
  }
  /* Amount for a label: inline trailing money first, else the nearest
     unclaimed money item on the same row to the right, else below. */
  function amountFor(items, label, claimed) {
    var m = label.str.match(/(\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\d+\.\d{2})\s*$/);
    if (m && isMoney(m[1])) return { value: moneyVal(m[1]), item: label, inline: true };
    var sameRowBest = null, sameRowScore = Infinity;
    var belowBest = null, belowScore = Infinity;
    items.forEach(function (it) {
      if (it === label || claimed.indexOf(it) >= 0 || it.page !== label.page) return;
      var v = null;
      if (isMoney(it.str)) v = moneyVal(it.str);
      else if (isIntMoney(it.str)) v = moneyVal(it.str);
      if (v === null) return;
      /* rect.y is measured from the top of the page: a candidate BELOW the
         label has a larger y. Same-row candidates win over below candidates. */
      var dy = it.rect.y - label.rect.y;
      var dx = it.rect.x - label.rect.x;
      var score = null;
      if (Math.abs(dy) <= 7 && dx >= -4) {
        score = Math.abs(dx) + Math.abs(dy) * 3;
        if (score < sameRowScore) { sameRowScore = score; sameRowBest = { value: v, item: it, inline: false }; }
      } else if (dy >= 4 && dy <= 50 && dx >= -34) {
        score = 200 + dy + Math.max(0, -dx);
        if (score < belowScore) { belowScore = score; belowBest = { value: v, item: it, inline: false }; }
      }
    });
    var best = sameRowBest || belowBest;
    if (best) claimed.push(best.item);
    return best;
  }
  function setField(doc, key, found) {
    if (!found) return;
    doc.fields[key] = {
      value: String(found.value),
      page: found.item.page,
      rect: { x: found.item.rect.x - 3, y: found.item.rect.y - 2, w: found.item.rect.w + 6, h: found.item.rect.h + 4 }
    };
  }

  function extractW2(doc) {
    var items = allItems(doc), claimed = [];
    var defs = [
      ['wagesW2', [/^1\b.*wages,?\s*tips/i, /wages,?\s*tips,?\s*other compensation/i]],
      ['fedWithheldW2', [/^2\b.*federal income tax withheld/i, /federal income tax withheld/i]],
      ['ssTaxW2', [/^4\b.*social security tax withheld/i, /social security tax withheld/i]],
      ['medTaxW2', [/^6\b.*medicare tax withheld/i, /medicare tax withheld/i]]
    ];
    defs.forEach(function (df) {
      var label = findLabel(items, df[1]);
      if (label) setField(doc, df[0], amountFor(items, label, claimed));
    });
    /* State row: label "15 State..." then code, then labels 16 and 17. */
    var l15 = findLabel(items, [/^15\b.*state/i, /^15\b/]);
    if (l15) {
      var codeM = l15.str.match(/\b([A-Z]{2})\b\s*$/);
      var code = null, codeItem = null;
      if (codeM && STATES.indexOf(codeM[1]) >= 0) { code = codeM[1]; codeItem = l15; }
      if (!code) {
        var bestC = null, bestD = Infinity;
        items.forEach(function (it) {
          if (it.page !== l15.page || STATES.indexOf(it.str) < 0) return;
          var dx = it.rect.x - l15.rect.x, dy = it.rect.y - l15.rect.y;
          if (Math.abs(dy) <= 34 && dx >= -10 && dx <= 120) {
            var dd = Math.abs(dx) + Math.abs(dy);
            if (dd < bestD) { bestD = dd; bestC = it; }
          }
        });
        if (bestC) { code = bestC.str; codeItem = bestC; }
      }
      if (code) doc.fields.stCode = { value: code, page: codeItem.page, rect: { x: codeItem.rect.x - 3, y: codeItem.rect.y - 2, w: codeItem.rect.w + 6, h: codeItem.rect.h + 4 } };
      var l16 = findLabel(items, [/^16\b.*state wages/i, /state wages,?\s*tips/i]);
      if (l16) setField(doc, 'stWages', amountFor(items, l16, claimed));
      var l17 = findLabel(items, [/^17\b.*state income tax/i, /state income tax/i]);
      if (l17) setField(doc, 'stWithheld', amountFor(items, l17, claimed));
    }
  }

  function extract1042(doc) {
    var items = allItems(doc), claimed = [];
    var gross = findLabel(items, [/^2\b.*gross income/i, /gross income/i]);
    if (gross) setField(doc, 'wages1042', amountFor(items, gross, claimed));
    var wh = findLabel(items, [/^7a\b.*federal tax withheld/i, /federal tax withheld/i]);
    if (wh) setField(doc, 'withheld1042', amountFor(items, wh, claimed));
  }

  function analyze(doc) {
    doc.type = detectType(doc.text);
    if (doc.type === 'w2') extractW2(doc);
    else if (doc.type === 's1042') extract1042(doc);
    return doc;
  }

  window.DocExtract = { loadFile: loadFile, analyze: analyze, STATES: STATES };
})();
