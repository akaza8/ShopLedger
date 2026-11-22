# ShopLedger

## Stack

- Node.js with CommonJS, Express 4, and body-parser for JSON requests.
- Static HTML, CSS, and browser JavaScript in `public/`.
- Synchronous JSON-file persistence in `data/db.json`.

## Module map

- `routes/customers.js` — Lists Khata customers and settlements and records repayments.
- `routes/orders.js` — Lists, retrieves, places, and cancels orders.
- `routes/products.js` — Lists products and active coupons.
- `routes/reports.js` — Serves dashboard and GST reconciliation reports, pricing previews, and database export.
- `lib/coupons.js` — Normalizes coupon codes, validates eligibility, and calculates discounts.
- `lib/dates.js` — Formats dates, normalizes date keys, and calculates fiscal years.
- `lib/inventory.js` — Finds products, checks sellable stock, updates stock or reservations, and summarizes inventory.
- `lib/invoice.js` — Recomputes invoice figures and renders printable HTML.
- `lib/ledger.js` — Manages Khata balances, credit-limit checks, reversals, and settlements.
- `lib/orders.js` — Adds, retrieves, filters, and cancels stored orders.
- `lib/pricing.js` — Calculates checkout totals with proportionally allocated discounts and per-line GST.
- `lib/reports.js` — Summarizes dashboard metrics and compares saved order and invoice figures.
- `lib/store.js` — Reads and writes the JSON store and appends audit entries.
- `lib/tax.js` — Resolves item GST rates and splits GST into CGST and SGST.

## Commands

- Start the app from the repo root with `node server.js`.
- Run tests with `node --test`. The repo currently has no test files, and the package test script is a failing placeholder.

## Rules

1. Write characterization tests before changing behaviour.
2. Change only the module(s) the ticket is about.
3. Tests must use in-memory data and must never read or write `data/db.json`.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket

The invoice total and GST breakdown do not match what the customer was billed. Checkout saves billed totals, while the printable invoice recalculates GST and discounts independently.

Allowed files for the fix — `lib/invoice.js` and `lib/tax.js` only if truly needed.
