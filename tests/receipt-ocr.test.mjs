import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptText } from "../app/receipt/ocr.ts";

test("extracts a labelled receipt total, merchant and stock details", () => {
  const parsed = parseReceiptText(`惠康超級市場
鮮奶 236 ml x 3  $25.50
麵包 1 件  $12.00
合計 HK$37.50`);
  assert.equal(parsed.merchant, "惠康");
  assert.equal(parsed.amount, "37.5");
  assert.deepEqual(parsed.items[0], { name: "鮮奶 236 ml x 3", quantity: "3", size: "236", unit: "ml" });
});

test("does not guess a total from unlabelled numbers", () => {
  const parsed = parseReceiptText(`淘寶
訂單付款成功
商品 A ¥18.00
¥36.00`);
  assert.equal(parsed.merchant, "淘寶");
  assert.equal(parsed.amount, "");
  assert.equal(parsed.items.length, 1);
});

test("recognises Chinese size and quantity units", () => {
  const parsed = parseReceiptText(`店舖
純牛奶 1 公升 × 2盒 44.00
總額 44.00`);
  assert.deepEqual(parsed.items[0], { name: "純牛奶 1 公升 × 2盒", quantity: "2", size: "1", unit: "L" });
});

test("Fusion receipt uses payment, not remaining Octopus balance or card number", () => {
  const parsed = parseReceiptText(`fusion\n清涼純淨水 3 $15.00\nBuy 3 Save $5 -$5.00\n3 小計 $10.00\nOctopus $10.00\n找續 $0.00\n卡號 66319473\n結餘 $149.30`);
  assert.equal(parsed.merchant, "Fusion");
  assert.equal(parsed.amount, "10");
});

test("checkout screen balance due may follow its amount", () => {
  assert.equal(parseReceiptText(`fusion\nCOOL PURIFIED WATER $5.00\nBuy 3 Save $5 -5.00\n$10.00\nBalance Due`).amount, "10");
});

test("subtotal is recognised without guessing the largest number", () => {
  assert.equal(parseReceiptText(`小計 $10.00\n結餘 $149.30`).amount, "10");
  assert.equal(parseReceiptText(`3 小 計 $10.00\n八 達 通 號 碼 5C1148\n結 餘 $149.30`).amount, "10");
});

test("conflicting totals remain blank", () => {
  assert.equal(parseReceiptText(`Total $10.00\nBalance Due $12.00`).amount, "");
});

test("thousands separators and discounts are handled", () => {
  assert.equal(parseReceiptText(`Subtotal $1,250.00\nDiscount -50.00\nTotal HK$1,200.00`).amount, "1200");
});
