'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PDFLib = require('../../assets/pdf-lib.min.js');
const { buildPackage } = require('../../app-core.js');

test('buildPackage returns a reopenable four-page Form 8843 package', async () => {
  const formBytes = fs.readFileSync(path.join(__dirname, '../../assets/f8843-2025.pdf'));
  const fictionalInput = {
    firstName: 'Fictional',
    lastName: 'Test',
    addrUS: '123 Example Lane, Testville, ZZ 00000',
    visaType: 'F-1',
    currentStatus: 'F-1',
    entryDate: '2024-08-19',
    citizenship: 'Exampleland',
    days2025: '120',
    days2024: '0',
    days2023: '0',
    line12: 'no',
    line13: 'no'
  };

  const originalWarn = console.warn;
  let packageBytes;
  let pdf;
  try {
    console.warn = function (...args) {
      if (args.length === 1 &&
          args[0] === 'Removing XFA form data as pdf-lib does not support reading or writing XFA') {
        return;
      }
      originalWarn.apply(console, args);
    };
    packageBytes = await buildPackage(PDFLib, formBytes, fictionalInput);
    assert.ok(packageBytes.byteLength > 0);
    pdf = await PDFLib.PDFDocument.load(packageBytes);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(pdf.getPageCount(), 4);
  assert.equal(pdf.getPages().length, 4);
});
