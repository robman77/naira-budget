(function () {
  'use strict';

  let STORE_KEY = 'naira-budget-v1';
  let NG = window.NGTax;

  let BOTH = ['worker', 'student'];
  let CATEGORIES = [
    { id: 'rent', name: 'Rent', note: 'Annual rent divided by 12', kind: 'need', linked: true, roles: ['worker'] },
    { id: 'hostel', name: 'Hostel fee', note: 'Session fee spread over the months it covers', kind: 'need', linked: true, roles: ['student'] },
    { id: 'electricity', name: 'Electricity', note: 'Prepaid tokens or bills', kind: 'need', roles: ['worker'] },
    { id: 'fuel', name: 'Generator fuel', note: 'Petrol or diesel', kind: 'need', roles: ['worker'] },
    { id: 'water', name: 'Water', note: 'Bills and delivery', kind: 'need', roles: ['worker'] },
    { id: 'gas', name: 'Cooking gas', note: 'Refills', kind: 'need', roles: ['worker'] },
    { id: 'food', name: 'Food', note: 'Groceries and eating out', kind: 'need', roles: BOTH },
    { id: 'transport', name: 'Transport', note: 'Fares and fuel', kind: 'need', roles: BOTH },
    { id: 'data', name: 'Data and airtime', note: 'Monthly total', kind: 'need', roles: BOTH },
    { id: 'materials', name: 'School materials', note: 'Books, printing, handouts, projects', kind: 'need', roles: ['student'] },
    { id: 'toiletries', name: 'Toiletries and laundry', note: 'Soap, detergent, laundry service', kind: 'need', roles: ['student'] },
    { id: 'basics', name: 'Other basics', note: 'Toiletries, repairs, school, health', kind: 'need', roles: ['worker'] },
    { id: 'family', name: 'Family support', note: 'Money you send or give regularly', kind: 'need', roles: ['worker'] },
    { id: 'wants', name: 'Wants and fun', note: 'Outings, subscriptions, clothes, gifts', kind: 'want', roles: BOTH },
    { id: 'savings', name: 'Savings', note: 'Set aside each month', kind: 'savings', roles: BOTH }
  ];

  let state;
  let viewMonth;
  let rowRefs = {};

  

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    let node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toNum(text) {
    let digits = String(text).replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  function fmtNum(n) { return Math.round(n).toLocaleString('en-NG'); }
  function fmt(n) {
    let r = Math.round(n);
    return (r < 0 ? '−' : '') + '₦' + fmtNum(Math.abs(r));
  }
  function fmtShort(n) { return n >= 1e6 ? '₦' + (n / 1e6) + 'M' : fmt(n); }
  function pct(x) { return x.toFixed(1) + '%'; }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function catById(id) {
    for (let i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }
  function isActive(cat) { return !!cat && cat.roles.indexOf(state.role) > -1; }
  function hostelMonthly() {
    return state.hostelMonths > 0 ? state.hostelFee / state.hostelMonths : 0;
  }

  

  function workerSample() {
    let now = new Date();
    let yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    let first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      touched: false,
      job: '',
      mode: 'exact',
      period: 'year',
      gross: 6000000,
      btt: 4200000,
      rent: 1200000,
      other: 0,
      pensionOn: true,
      base: {
        electricity: 25000, fuel: 18000, water: 5000, gas: 8000,
        food: 60000, transport: 35000, data: 12000, basics: 15000,
        family: 10000, wants: 20000, savings: 60000
      },
      entries: [
        { id: 'e1', date: isoDate(now), cat: 'food', note: 'Lunch', amount: 3500 },
        { id: 'e2', date: isoDate(yesterday), cat: 'transport', note: 'Bus fare to work', amount: 1200 },
        { id: 'e3', date: isoDate(first), cat: 'food', note: 'Market, weekly foodstuff', amount: 12000 }
      ],
      goal: { target: 1000000, saved: 150000 }
    };
  }

  function sampleState(role) {
    let s = workerSample();
    s.role = 'worker';
    s.allowance = 0;
    s.sideIncome = 0;
    s.hostelFee = 0;
    s.hostelMonths = 10;
    if (role !== 'student') return s;

    let d0 = s.entries[0].date;
    let d1 = s.entries[1].date;
    let d2 = s.entries[2].date;
    s.role = 'student';
    s.gross = 0; s.btt = 0; s.rent = 0;
    s.allowance = 70000;
    s.sideIncome = 20000;
    s.hostelFee = 150000;
    s.hostelMonths = 10;
    s.base = {
      electricity: 0, fuel: 0, water: 0, gas: 0, basics: 0, family: 0,
      food: 30000, transport: 8000, data: 6000, materials: 5000, toiletries: 5000,
      wants: 6000, savings: 8000
    };
    s.entries = [
      { id: 'e1', date: d0, cat: 'food', note: 'Lunch at the cafeteria', amount: 1500 },
      { id: 'e2', date: d1, cat: 'transport', note: 'Bus fare to campus', amount: 400 },
      { id: 'e3', date: d2, cat: 'materials', note: 'Photocopy handouts', amount: 1200 }
    ];
    s.goal = { target: 100000, saved: 15000 };
    return s;
  }

  function emptyState(role) {
    let s = sampleState(role);
    s.touched = true;
    s.gross = 0; s.btt = 0; s.rent = 0; s.other = 0;
    s.allowance = 0; s.sideIncome = 0; s.hostelFee = 0;
    Object.keys(s.base).forEach(function (k) { s.base[k] = 0; });
    s.entries = [];
    s.goal = { target: 0, saved: 0 };
    return s;
  }

  function loadState() {
    let base = sampleState();
    try {
      let raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      let saved = JSON.parse(raw);
      let merged = Object.assign({}, base, saved);
      merged.base = Object.assign({}, base.base, saved.base);
      merged.goal = Object.assign({}, base.goal, saved.goal);
      merged.entries = Array.isArray(saved.entries) ? saved.entries : base.entries;
      return merged;
    } catch (err) {
      return base;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      
    }
  }

  function touch() { state.touched = true; }

  

  function compute() {
    let tax;
    if (state.role === 'student') {
      
      let income = state.allowance + state.sideIncome;
      tax = {
        gross: income * 12, estimate: false, pensionBase: 0, pensionRate: 0, pension: 0,
        rentPaid: 0, rentRelief: 0, otherDeductions: 0, chargeable: 0, bands: [],
        tax: 0, takeHome: income * 12, effectiveRate: 0
      };
    } else {
      let factor = state.period === 'month' ? 12 : 1;
      tax = NG.calculateTax({
        mode: state.mode,
        grossAnnual: state.gross * factor,
        pensionBaseAnnual: state.btt * factor,
        rentAnnual: state.rent * factor,
        otherDeductionsAnnual: state.other * factor,
        pensionOn: state.pensionOn
      });
    }

    let logged = {};
    state.entries.forEach(function (e) {
      if (String(e.date).slice(0, 7) === viewMonth) {
        logged[e.cat] = (logged[e.cat] || 0) + e.amount;
      }
    });

    let needs = 0;
    let wants = 0;
    let savings = 0;
    let rows = CATEGORIES.filter(isActive).map(function (cat) {
      let base = cat.id === 'rent' ? tax.rentPaid / 12
        : cat.id === 'hostel' ? hostelMonthly()
        : (state.base[cat.id] || 0);
      let extra = logged[cat.id] || 0;
      let total = base + extra;
      if (cat.kind === 'savings') savings += total;
      else if (cat.kind === 'want') wants += total;
      else needs += total;
      return { cat: cat, base: base, logged: extra, total: total };
    });

    let takeHome = tax.takeHome / 12;
    return {
      tax: tax,
      rows: rows,
      needs: needs,
      wants: wants,
      savings: savings,
      spent: needs + wants + savings,
      takeHome: takeHome,
      left: takeHome - needs - wants - savings
    };
  }

  

  function tableRow(cls, cells) {
    let row = el('div', 'trow ' + cls);
    row.setAttribute('role', 'row');
    let role = cls.indexOf('head') > -1 ? 'columnheader' : 'cell';
    cells.forEach(function (text) {
      let cell = el('span', '', text);
      cell.setAttribute('role', role);
      row.appendChild(cell);
    });
    return row;
  }

  function bandLabel(band, index) {
    if (band.to === Infinity) return 'Above ' + fmtShort(band.from);
    let low = index === 0 ? '₦0' : fmt(band.from + 1);
    return low + ' to ' + fmtShort(band.to);
  }

  function renderStats(c) {
    let t = c.tax;
    let student = state.role === 'student';
    $('stat-pension').hidden = student;
    $('stats').classList.toggle('stats--three', student);
    if (student) {
      $('s-gross-label').textContent = 'Allowance';
      $('s-gross').textContent = fmt(state.allowance);
      $('s-gross-sub').textContent = 'from family or a sponsor';
      $('s-tax-label').textContent = 'Other income';
      $('s-tax').textContent = fmt(state.sideIncome);
      $('s-tax-sub').textContent = 'bursary, side work';
      $('s-take-label').textContent = 'Available to spend';
      $('s-take').textContent = fmt(t.takeHome / 12);
      $('s-take-sub').textContent = 'a month, with no tax taken';
      return;
    }
    $('s-gross-label').textContent = 'Gross salary';
    $('s-tax-label').textContent = 'PAYE tax';
    $('s-take-label').textContent = 'Take-home pay';
    $('s-gross').textContent = fmt(t.gross / 12);
    $('s-gross-sub').textContent = fmt(t.gross) + ' a year';
    $('s-tax').textContent = fmt(t.tax / 12);
    $('s-tax-sub').textContent = fmt(t.tax) + ' a year · ' + pct(t.effectiveRate * 100) + ' of gross';
    $('s-pension').textContent = fmt(t.pension / 12);
    $('s-pension-sub').textContent = t.pension > 0 ? fmt(t.pension) + ' a year' : 'Not deducted';
    $('s-take').textContent = fmt(t.takeHome / 12);
    $('s-take-sub').textContent = t.otherDeductions > 0
      ? 'after tax, pension and other deductions'
      : 'after tax and pension';
  }

  function renderTax(c) {
    if (state.role === 'student') return;
    let t = c.tax;

    let steps = $('tax-steps');
    steps.textContent = '';
    steps.appendChild(tableRow('trow--head', ['', 'A year', 'A month']));
    steps.appendChild(tableRow('', ['Gross salary', fmt(t.gross), fmt(t.gross / 12)]));
    if (t.pension > 0) {
      let rate = Math.round(t.pensionRate * 100);
      let label = t.estimate
        ? 'Pension (' + rate + '% of an estimated ' + fmt(t.pensionBase) + ')'
        : 'Pension (' + rate + '% of ' + fmt(t.pensionBase) + ')';
      steps.appendChild(tableRow('', [label, '− ' + fmt(t.pension), '− ' + fmt(t.pension / 12)]));
    }
    steps.appendChild(tableRow('', [
      'Rent relief (20% of rent, max ₦500,000)',
      '− ' + fmt(t.rentRelief),
      '− ' + fmt(t.rentRelief / 12)
    ]));
    if (t.otherDeductions > 0) {
      steps.appendChild(tableRow('', [
        'Other deductions',
        '− ' + fmt(t.otherDeductions),
        '− ' + fmt(t.otherDeductions / 12)
      ]));
    }
    steps.appendChild(tableRow('trow--strong', ['Chargeable income', fmt(t.chargeable), fmt(t.chargeable / 12)]));

    let bands = $('tax-bands');
    bands.textContent = '';
    bands.appendChild(tableRow('trow--head trow--bands', ['Band', 'Rate', 'Taxed', 'Tax']));
    let reached = 0;
    t.bands.forEach(function (band, i) {
      if (band.taxed > 0) {
        reached = i + 1;
        bands.appendChild(tableRow('trow--bands', [
          bandLabel(band, i),
          Math.round(band.rate * 100) + '%',
          fmt(band.taxed),
          fmt(band.tax)
        ]));
      }
    });
    if (reached === 0) {
      bands.appendChild(el('div', 'trow trow--plain', 'No tax due at this income.'));
    } else if (reached < t.bands.length) {
      let next = Math.round(t.bands[reached].rate * 100);
      let top = Math.round(t.bands[t.bands.length - 1].rate * 100);
      let range = next === top ? next + '%' : next + '% to ' + top + '%';
      bands.appendChild(el('div', 'trow trow--plain', 'Higher bands (' + range + ') are not reached at this income.'));
    }

    let total = $('tax-total');
    total.textContent = '';
    total.appendChild(tableRow('trow--strong', ['PAYE tax', fmt(t.tax), fmt(t.tax / 12)]));
    total.appendChild(tableRow('trow--strong', ['Take-home pay', fmt(t.takeHome), fmt(t.takeHome / 12)]));
  }

  function renderAllocation(c) {
    let th = c.takeHome;
    let tk = state.role === 'student' ? 'income' : 'take-home';
    let over = c.left < 0;
    let np = th > 0 ? c.needs / th * 100 : 0;
    let wp = th > 0 ? c.wants / th * 100 : 0;
    let sp = th > 0 ? c.savings / th * 100 : 0;
    let nw, ww, sw, lw;

    if (th <= 0 || c.spent <= 0) {
      nw = 0; ww = 0; sw = 0; lw = 100;
    } else if (over) {
      nw = c.needs / c.spent * 100;
      ww = c.wants / c.spent * 100;
      sw = c.savings / c.spent * 100;
      lw = 0;
    } else {
      nw = np; ww = wp; sw = sp; lw = Math.max(0, 100 - nw - ww - sw);
    }
    $('seg-needs').style.width = nw + '%';
    $('seg-wants').style.width = ww + '%';
    $('seg-savings').style.width = sw + '%';
    $('seg-left').style.width = lw + '%';

    $('lg-needs').textContent = 'Needs ' + fmt(c.needs) + ' · ' + pct(np);
    $('lg-wants').textContent = 'Wants ' + fmt(c.wants) + ' · ' + pct(wp);
    $('lg-savings').textContent = 'Savings ' + fmt(c.savings) + ' · ' + pct(sp);
    $('lg-left').textContent = over
      ? 'Over by ' + fmt(-c.left)
      : 'Left over ' + fmt(c.left) + ' · ' + pct(th > 0 ? c.left / th * 100 : 0);

    let big = null;
    c.rows.forEach(function (r) {
      if (r.cat.kind !== 'savings' && (!big || r.total > big.total)) big = r;
    });
    let bigText = big && big.total > 0 && th > 0
      ? 'Your biggest cost is ' + big.cat.name.toLowerCase() + ', at ' + pct(big.total / th * 100) + ' of ' + tk + '.'
      : '';

    let advice;
    let advice2 = '';
    if (th <= 0) {
      advice = state.role === 'student'
        ? 'Enter your allowance to see where your money goes.'
        : 'Enter your salary to see where your money goes.';
    } else if (over) {
      advice = 'You are spending ' + fmt(-c.left) + ' more than you have each month.';
      advice2 = bigText;
    } else {
      advice = 'Needs take ' + pct(np) + ' of your ' + tk + ', wants ' + pct(wp) + ' and savings ' + pct(sp) + '.';
      advice2 = 'The common 50/30/20 guide aims for 50% needs, 30% wants and 20% savings. ' + bigText;
    }
    $('advice').textContent = advice;
    $('advice-2').textContent = advice2;

    let pill = $('left-pill');
    pill.textContent = over ? 'Over budget by ' + fmt(-c.left) : 'Left over ' + fmt(c.left);
    pill.className = over ? 'pill pill--over' : 'pill';
  }

  function renderRows(c) {
    let th = c.takeHome;
    CATEGORIES.forEach(function (cat) { rowRefs[cat.id].li.hidden = !isActive(cat); });
    c.rows.forEach(function (r) {
      let refs = rowRefs[r.cat.id];
      let share = th > 0 ? r.total / th * 100 : 0;
      refs.amount.textContent = fmt(r.total);
      refs.pct.textContent = pct(share);
      refs.bar.style.width = clamp(share, 0, 100) + '%';
      if (r.logged > 0) {
        refs.logged.hidden = false;
        refs.logged.textContent = 'incl. ' + fmt(r.logged) + ' logged';
      } else {
        refs.logged.hidden = true;
      }
    });
    $('total-spent').textContent = fmt(c.spent);
  }

  function renderEntries() {
    let list = $('entries');
    list.textContent = '';
    let items = state.entries.filter(function (e) {
      return String(e.date).slice(0, 7) === viewMonth && isActive(catById(e.cat));
    }).sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    if (items.length === 0) {
      let empty = el('li', 'empty', 'No entries this month. Add a food or transport expense above.');
      list.appendChild(empty);
      return;
    }

    items.forEach(function (e) {
      let cat = catById(e.cat);
      let parts = String(e.date).split('-');
      let when = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      let li = el('li', 'entry');
      let main = el('div', 'entry__main');
      main.appendChild(el('strong', '', e.note || (cat ? cat.name : 'Expense')));
      main.appendChild(el('span', 'entry__meta', when + ' · ' + (cat ? cat.name : 'Other')));
      li.appendChild(main);
      li.appendChild(el('span', 'entry__amount', fmt(e.amount)));

      let remove = el('button', 'entry__remove', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Remove entry: ' + (e.note || (cat ? cat.name : 'Expense')) + ', ' + fmt(e.amount));
      remove.addEventListener('click', function () {
        state.entries = state.entries.filter(function (x) { return x.id !== e.id; });
        touch();
        update();
      });
      li.appendChild(remove);
      list.appendChild(li);
    });
  }

  function renderGoal(c) {
    let target = state.goal.target;
    let saved = state.goal.saved;
    let monthly = c.savings;
    let share = target > 0 ? clamp(saved / target * 100, 0, 100) : 0;
    $('goal-bar').style.width = share + '%';

    let text;
    let date = '';
    if (target <= 0) {
      text = 'Enter a goal amount to see your progress.';
    } else if (saved >= target) {
      text = 'Goal reached. You have saved ' + fmt(saved) + '.';
    } else {
      let remaining = target - saved;
      text = fmt(saved) + ' of ' + fmt(target) + ' saved (' + Math.round(share) + '%). ' + fmt(remaining) + ' to go.';
      if (monthly > 0) {
        let months = Math.ceil(remaining / monthly);
        let now = new Date();
        let when = new Date(now.getFullYear(), now.getMonth() + months, 1)
          .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        date = months + (months === 1 ? ' month' : ' months') + ' at ' + fmt(monthly) + ' a month. Around ' + when + '.';
      } else {
        date = 'Add a monthly savings amount to see a date.';
      }
    }
    $('goal-text').textContent = text;
    $('goal-date').textContent = date;
  }

  function update() {
    let c = compute();
    renderStats(c);
    renderTax(c);
    renderAllocation(c);
    renderRows(c);
    renderEntries();
    renderGoal(c);
    $('example-note').hidden = state.touched;
    let job = state.role === 'student' ? 'Student' : state.job.trim();
    $('job-label').hidden = !job;
    $('job-label').textContent = job;
    saveState();
  }

  

  function bindMoney(input, onChange) {
    input.addEventListener('input', function () {
      if (onChange) {
        onChange(toNum(input.value));
        touch();
        update();
      }
    });
    input.addEventListener('blur', function () {
      input.value = input.value.trim() === '' ? '' : fmtNum(toNum(input.value));
    });
  }

  function setMoney(input, value) {
    input.value = value ? fmtNum(value) : '';
  }

  function buildRows() {
    let list = $('rows');
    list.textContent = '';
    CATEGORIES.forEach(function (cat) {
      let li = el('li', cat.kind === 'savings' ? 'row row--savings' : cat.kind === 'want' ? 'row row--want' : 'row');

      let name = el('div', 'row__name');
      name.appendChild(el('strong', '', cat.name));
      name.appendChild(el('span', 'row__note', cat.note));
      li.appendChild(name);

      let inputCell = el('div', 'row__input');
      if (cat.linked) {
        inputCell.appendChild(el('span', 'row__linked', cat.id === 'hostel' ? 'From your hostel fee' : 'From your salary details'));
      } else {
        let label = el('label', 'sr-only', cat.name + ', typical monthly amount');
        label.htmlFor = 'base-' + cat.id;
        let wrap = el('span', 'money');
        let input = document.createElement('input');
        input.id = 'base-' + cat.id;
        input.type = 'text';
        input.setAttribute('inputmode', 'numeric');
        input.autocomplete = 'off';
        input.placeholder = '0';
        wrap.appendChild(input);
        inputCell.appendChild(label);
        inputCell.appendChild(wrap);
        (function (id) {
          bindMoney(input, function (v) { state.base[id] = v; });
        })(cat.id);
      }
      li.appendChild(inputCell);

      let total = el('div', 'row__total');
      let amount = el('strong', '', '₦0');
      let share = el('span', 'row__sub', '');
      let logged = el('span', 'row__sub', '');
      logged.hidden = true;
      total.appendChild(amount);
      total.appendChild(share);
      total.appendChild(logged);
      li.appendChild(total);

      let barWrap = el('div', 'row__bar');
      let bar = el('span', 'bar');
      bar.setAttribute('aria-hidden', 'true');
      let fill = el('span', 'bar__fill');
      bar.appendChild(fill);
      barWrap.appendChild(bar);
      li.appendChild(barWrap);

      list.appendChild(li);
      rowRefs[cat.id] = { li: li, amount: amount, pct: share, logged: logged, bar: fill };
    });
  }

  function buildCategorySelect() {
    let select = $('entry-cat');
    select.textContent = '';
    CATEGORIES.forEach(function (cat) {
      if (cat.linked || !isActive(cat)) return;
      let option = el('option', '', cat.name);
      option.value = cat.id;
      select.appendChild(option);
    });
    select.value = 'food';
  }

  function setInputs() {
    $('job').value = state.job;
    setPeriodUi(state.period);
    setMoney($('gross'), state.gross);
    setMoney($('btt'), state.btt);
    setMoney($('rent'), state.rent);
    setMoney($('other'), state.other);
    setMoney($('allowance'), state.allowance);
    setMoney($('side-income'), state.sideIncome);
    setMoney($('hostel-fee'), state.hostelFee);
    $('hostel-months').value = state.hostelMonths ? String(state.hostelMonths) : '';
    $('pension-on').checked = state.pensionOn;
    setMode(state.mode);
    applyRole();
    CATEGORIES.forEach(function (cat) {
      if (!cat.linked) setMoney($('base-' + cat.id), state.base[cat.id]);
    });
    setMoney($('goal-target'), state.goal.target);
    setMoney($('goal-saved'), state.goal.saved);
    $('month').value = viewMonth;
    $('entry-date').value = isoDate(new Date());
  }

  function setMode(mode) {
    state.mode = mode;
    $('no-split').checked = mode === 'estimate';
    $('btt-field').hidden = mode === 'estimate';
    $('estimate-note').hidden = mode !== 'estimate';
  }

  
  function applyRole() {
    let student = state.role === 'student';
    $('role-worker').setAttribute('aria-pressed', String(!student));
    $('role-student').setAttribute('aria-pressed', String(student));
    $('worker-fields').hidden = student;
    $('student-fields').hidden = !student;
    $('tax').hidden = student;
    $('nav-tax').hidden = student;
    $('salary-title').textContent = student ? 'Your income' : 'Your salary';
    $('nav-salary').textContent = student ? 'Income' : 'Salary';
    $('alloc-title').textContent = student ? 'Where your money goes' : 'Where your take-home goes';
    $('intro-text').textContent = student
      ? 'What you have to spend each month, and where it goes. Amounts are monthly.'
      : 'What you take home after tax and pension, and where it goes. Amounts are monthly unless stated.';
    $('spending-note').textContent = 'Enter what you spend in a typical month. Daily entries for the selected month are added on top. Percentages are shares of your ' +
      (student ? 'income.' : 'take-home.');
    buildCategorySelect();
  }

  function setRole(next) {
    if (next === state.role) return;
    
    if (!state.touched) {
      replaceState(sampleState(next));
      return;
    }
    state.role = next;
    applyRole();
    update();
  }

  function setPeriodUi(period) {
    $('period-month').setAttribute('aria-pressed', String(period === 'month'));
    $('period-year').setAttribute('aria-pressed', String(period === 'year'));
  }

  function setPeriod(next) {
    if (next === state.period) return;
    let factor = next === 'month' ? 1 / 12 : 12;
    ['gross', 'btt', 'rent', 'other'].forEach(function (key) {
      state[key] = Math.round(state[key] * factor);
    });
    state.period = next;
    setPeriodUi(next);
    setMoney($('gross'), state.gross);
    setMoney($('btt'), state.btt);
    setMoney($('rent'), state.rent);
    setMoney($('other'), state.other);
    touch();
    update();
  }

  function showMessage(text, isError) {
    let msg = $('entry-msg');
    msg.textContent = text;
    msg.className = isError ? 'form-msg is-error' : 'form-msg';
  }

  
  
  function twoStep(btn, armedText, action) {
    let idleText = btn.textContent;
    let timer = null;
    function disarm() {
      delete btn.dataset.armed;
      btn.textContent = idleText;
      clearTimeout(timer);
    }
    btn.addEventListener('click', function () {
      if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = armedText;
        timer = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      action();
    });
  }

  function replaceState(next) {
    state = next;
    viewMonth = isoDate(new Date()).slice(0, 7);
    setInputs();
    showMessage('', false);
    update();
  }

  function bindStatic() {
    $('job').addEventListener('input', function () {
      state.job = this.value;
      touch();
      update();
    });

    $('role-worker').addEventListener('click', function () { setRole('worker'); });
    $('role-student').addEventListener('click', function () { setRole('student'); });

    bindMoney($('allowance'), function (v) { state.allowance = v; });
    bindMoney($('side-income'), function (v) { state.sideIncome = v; });
    bindMoney($('hostel-fee'), function (v) { state.hostelFee = v; });
    bindMoney($('hostel-months'), function (v) { state.hostelMonths = clamp(v, 0, 24); });

    $('period-month').addEventListener('click', function () { setPeriod('month'); });
    $('period-year').addEventListener('click', function () { setPeriod('year'); });

    $('no-split').addEventListener('change', function () {
      setMode(this.checked ? 'estimate' : 'exact');
      touch();
      update();
    });

    bindMoney($('gross'), function (v) { state.gross = v; });
    bindMoney($('btt'), function (v) { state.btt = v; });
    bindMoney($('rent'), function (v) { state.rent = v; });
    bindMoney($('other'), function (v) { state.other = v; });
    bindMoney($('goal-target'), function (v) { state.goal.target = v; });
    bindMoney($('goal-saved'), function (v) { state.goal.saved = v; });
    $('goal-update').addEventListener('click', function () {
      state.goal.target = toNum($('goal-target').value);
      state.goal.saved = toNum($('goal-saved').value);
      setMoney($('goal-target'), state.goal.target);
      setMoney($('goal-saved'), state.goal.saved);
      touch();
      update();
    });
    bindMoney($('entry-amount'), null);

    $('pension-on').addEventListener('change', function () {
      state.pensionOn = this.checked;
      touch();
      update();
    });

    $('month').addEventListener('change', function () {
      if (/^\d{4}-\d{2}$/.test(this.value)) {
        viewMonth = this.value;
        update();
      }
    });

    twoStep($('reset'), 'Click again to replace your data', function () { replaceState(sampleState(state.role)); });
    twoStep($('clear'), 'Click again to clear everything', function () { replaceState(emptyState(state.role)); });

    $('entry-form').addEventListener('submit', function (event) {
      event.preventDefault();
      let amount = toNum($('entry-amount').value);
      let date = $('entry-date').value || isoDate(new Date());
      if (!amount) {
        showMessage('Enter an amount greater than zero.', true);
        $('entry-amount').focus();
        return;
      }
      let cat = $('entry-cat').value;
      state.entries.push({
        id: 'e' + Date.now(),
        date: date,
        cat: cat,
        note: $('entry-note').value.trim(),
        amount: amount
      });
      touch();
      if (date.slice(0, 7) !== viewMonth) {
        viewMonth = date.slice(0, 7);
        $('month').value = viewMonth;
      }
      $('entry-amount').value = '';
      $('entry-note').value = '';
      showMessage('Added ' + fmt(amount) + ' to ' + catById(cat).name + '.', false);
      update();
      $('entry-amount').focus();
    });
  }

  function init() {
    state = loadState();
    viewMonth = isoDate(new Date()).slice(0, 7);
    buildRows();
    buildCategorySelect();
    bindStatic();
    setInputs();
    update();
  }

  init();
})();
