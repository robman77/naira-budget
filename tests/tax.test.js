
const assert = require('assert');
const { calculateTax } = require('../js/nigeria-tax.js');

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.01, label + ': expected ' + expected + ', got ' + actual);
}


let r = calculateTax({
  mode: 'exact',
  grossAnnual: 6000000,
  pensionBaseAnnual: 4200000,
  rentAnnual: 1200000,
  otherDeductionsAnnual: 0,
  pensionOn: true
});
close(r.pension, 336000, 'pension');
close(r.rentRelief, 240000, 'rent relief');
close(r.chargeable, 5424000, 'chargeable income');
close(r.tax, 766320, 'tax');
close(r.takeHome, 4897680, 'take-home');


r = calculateTax({
  mode: 'exact',
  grossAnnual: 840000,
  pensionBaseAnnual: 600000,
  rentAnnual: 0,
  pensionOn: true
});
close(r.chargeable, 792000, 'low income chargeable');
close(r.tax, 0, 'low income tax');


r = calculateTax({
  mode: 'exact',
  grossAnnual: 30000000,
  pensionBaseAnnual: 20000000,
  rentAnnual: 3000000,
  pensionOn: true
});
close(r.rentRelief, 500000, 'rent relief cap');
close(r.chargeable, 27900000, 'high income chargeable');
close(r.tax, 5347000, 'high income tax');


r = calculateTax({ mode: 'estimate', grossAnnual: 6000000, rentAnnual: 0, pensionOn: true });
close(r.pensionBase, 4500000, 'estimate pension base');
close(r.pension, 360000, 'estimate pension');


r = calculateTax({
  mode: 'exact',
  grossAnnual: 3000000,
  pensionBaseAnnual: 2000000,
  rentAnnual: 0,
  otherDeductionsAnnual: 100000,
  pensionOn: false
});
close(r.pension, 0, 'pension off');
close(r.chargeable, 2900000, 'chargeable with other deductions');
close(r.tax, 315000, 'tax with other deductions');
close(r.takeHome, 3000000 - 315000 - 100000, 'take-home with other deductions');


r = calculateTax({});
close(r.tax, 0, 'empty tax');
close(r.takeHome, 0, 'empty take-home');

console.log('All tax tests passed.');
