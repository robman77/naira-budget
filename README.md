# Naira Budget

A budget calculator for Nigeria. It works out PAYE tax and take-home pay for workers
(Nigeria Tax Act, in force from 1 January 2026), or the monthly budget of a student
living in a hostel. Plain HTML, CSS and JavaScript. No install, no server.

## Run it

Open `index.html` in any browser. Your entries are saved in that browser only.

## Files

- `index.html` : the page
- `css/style.css` : the look (colours and fonts are the tokens at the top)
- `js/nigeria-tax.js` : the tax rules and the tax calculator
- `js/app.js` : the page logic (forms, spending, saving, student mode)
- `tests/tax.test.js` : checks for the tax calculator

## Change the tax rules

All the rules are in `NG_TAX_RULES` at the top of `js/nigeria-tax.js`: the bands,
the pension rate, the rent relief rate and cap. Update them when the law changes,
then run the tests:

    node tests/tax.test.js


## Notes

- Estimates only. Check a payslip or the Nigeria Revenue Service for exact figures.
- The student view skips tax, because allowances and gifts are not taxed.
