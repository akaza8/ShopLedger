const test = require('node:test');
const assert = require('node:assert/strict');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const config = require('../config');

function figuresFor(order) {
  const { items, coupon } = order;
  const checkout = pricing.computeTotals(items, coupon);
  const printed = invoice.computeInvoiceFigures({
    ...order,
    subtotal: checkout.subtotal,
    discount: checkout.discount,
    tax: checkout.tax,
    total: checkout.total,
  });

  return { checkout, printed };
}

function totals({ subtotal, discount, tax, cgst, sgst, total }) {
  return { subtotal, discount, tax, cgst, sgst, total };
}

// Synthetic order lines omit gstRate where checkout saves only HSN.
test('CURRENT BEHAVIOUR: #1001 prints the 5% and 12% GST slabs', () => {
  const { checkout, printed } = figuresFor({
    id: 1001,
    coupon: '',
    items: [
      { id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 2 },
      { id: 2, name: 'Ghee', hsn: '0405', price: 300, qty: 1 },
    ],
  });

  assert.deepEqual(checkout.lines.map(({ gstPercent }) => gstPercent), [5, 12]);
  assert.deepEqual(totals(checkout), {
    subtotal: 500, discount: 0, tax: 46, cgst: 23, sgst: 23, total: 546,
  });
  assert.deepEqual(printed, {
    subtotal: 500, discount: 0, tax: 46, cgst: 23, sgst: 23, total: 546,
    rows: [
      { name: 'Rice', sku: '-', hsn: '1006', qty: 2, price: 100, gstPercent: 5, line: 200, lineTax: 10 },
      { name: 'Ghee', sku: '-', hsn: '0405', qty: 1, price: 300, gstPercent: 12, line: 300, lineTax: 36 },
    ],
  });
});

test('CURRENT BEHAVIOUR: #1002 applies SAVE10 before GST', () => {
  const { checkout, printed } = figuresFor({
    id: 1002,
    coupon: 'SAVE10',
    items: [
      { id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 5 },
    ],
  });

  assert.deepEqual(totals(checkout), {
    subtotal: 500, discount: 50, tax: 22.5, cgst: 11.25, sgst: 11.25, total: 472.5,
  });
  assert.deepEqual(printed, {
    subtotal: 500, discount: 50, tax: 22.5, cgst: 11.25, sgst: 11.25, total: 472.5,
    rows: [
      { name: 'Rice', sku: '-', hsn: '1006', qty: 5, price: 100, gstPercent: 5, line: 500, lineTax: 22.5 },
    ],
  });
});

test('CURRENT BEHAVIOUR: #1004 applies the SAVE10 cap on the invoice', () => {
  const { checkout, printed } = figuresFor({
    id: 1004,
    coupon: 'SAVE10',
    items: [
      { id: 3, name: 'Tea', hsn: '0902', price: 280, qty: 8 },
    ],
  });

  assert.deepEqual(totals(checkout), {
    subtotal: 2240, discount: 150, tax: 376.2, cgst: 188.1, sgst: 188.1, total: 2466.2,
  });
  assert.deepEqual(printed, {
    subtotal: 2240, discount: 150, tax: 376.2, cgst: 188.1, sgst: 188.1, total: 2466.2,
    rows: [
      { name: 'Tea', sku: '-', hsn: '0902', qty: 8, price: 280, gstPercent: 18, line: 2240, lineTax: 376.2 },
    ],
  });
});

test('CURRENT BEHAVIOUR: #1008 matches checkout with only 18% items and no coupon', () => {
  const { checkout, printed } = figuresFor({
    id: 1008,
    coupon: '',
    items: [
      { id: 3, name: 'Tea', hsn: '0902', price: 125, qty: 2 },
      { id: 4, name: 'Coffee', hsn: '0901', gstRate: 18, price: 350, qty: 1 },
    ],
  });

  const expectedTotals = {
    subtotal: 600, discount: 0, tax: 108, cgst: 54, sgst: 54, total: 708,
  };
  assert.deepEqual(totals(checkout), expectedTotals);
  assert.deepEqual(printed, {
    ...expectedTotals,
    rows: [
      { name: 'Tea', sku: '-', hsn: '0902', qty: 2, price: 125, gstPercent: 18, line: 250, lineTax: 45 },
      { name: 'Coffee', sku: '-', hsn: '0901', qty: 1, price: 350, gstPercent: 18, line: 350, lineTax: 63 },
    ],
  });
});

test('invoice matches checkout for mixed GST slabs and a capped SAVE10 coupon', () => {
  const order = {
    coupon: 'SAVE10',
    items: [
      { id: 1, name: 'Rice', hsn: '1006', price: 112, qty: 10 },
      { id: 2, name: 'Ghee', hsn: '0405', price: 280, qty: 4 },
    ],
  };
  const { checkout, printed } = figuresFor(order);

  assert.deepEqual(totals(printed), totals(checkout));
  assert.deepEqual(
    printed.rows.map(({ gstPercent, lineTax }) => [gstPercent, lineTax]),
    [[5, 52.25], [12, 125.4]],
  );

  const billedOrder = { ...order, ...totals(checkout) };
  const coupon = config.coupons.SAVE10;
  const wasActive = coupon.active;
  try {
    coupon.active = false;
    assert.deepEqual(invoice.computeInvoiceFigures(billedOrder), printed);
  } finally {
    coupon.active = wasActive;
  }
});
