(function (root) {
  'use strict';

  let NG_TAX_RULES = {
    country: 'Nigeria',
    currency: 'NGN',
    taxYear: 2026,

    
    
    bands: [
      { upTo: 800000, rate: 0 },
      { upTo: 3000000, rate: 0.15 },
      { upTo: 12000000, rate: 0.18 },
      { upTo: 25000000, rate: 0.21 },
      { upTo: 50000000, rate: 0.23 },
      { upTo: Infinity, rate: 0.25 }
    ],

    
    pensionRate: 0.08,

    
    rentRelief: { rate: 0.2, cap: 500000 },

    
    
    estimatePensionBaseShare: 0.75
  };

  function num(value) {
    let n = Number(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  
  function calculateTax(input, rules) {
    rules = rules || NG_TAX_RULES;
    input = input || {};

    let gross = num(input.grossAnnual);
    let estimate = input.mode === 'estimate';

    let pensionBase = estimate
      ? gross * rules.estimatePensionBaseShare
      : Math.min(gross, num(input.pensionBaseAnnual));
    let pension = input.pensionOn === false ? 0 : pensionBase * rules.pensionRate;

    let rentPaid = num(input.rentAnnual);
    let rentRelief = Math.min(rentPaid * rules.rentRelief.rate, rules.rentRelief.cap);

    let otherDeductions = num(input.otherDeductionsAnnual);

    let chargeable = Math.max(0, gross - pension - rentRelief - otherDeductions);

    let lower = 0;
    let remaining = chargeable;
    let totalTax = 0;
    let bands = [];

    for (let i = 0; i < rules.bands.length; i++) {
      let band = rules.bands[i];
      let taxed = Math.min(remaining, band.upTo - lower);
      let bandTax = taxed * band.rate;
      bands.push({
        from: lower,
        to: band.upTo,
        rate: band.rate,
        taxed: taxed,
        tax: round2(bandTax)
      });
      totalTax += bandTax;
      remaining -= taxed;
      lower = band.upTo;
    }

    totalTax = round2(totalTax);

    return {
      gross: gross,
      estimate: estimate,
      pensionBase: pensionBase,
      pensionRate: input.pensionOn === false ? 0 : rules.pensionRate,
      pension: pension,
      rentPaid: rentPaid,
      rentRelief: rentRelief,
      otherDeductions: otherDeductions,
      chargeable: chargeable,
      bands: bands,
      tax: totalTax,
      takeHome: gross - totalTax - pension - otherDeductions,
      effectiveRate: gross > 0 ? totalTax / gross : 0
    };
  }

  let api = { rules: NG_TAX_RULES, calculateTax: calculateTax };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.NGTax = api;
})(typeof window !== 'undefined' ? window : globalThis);
