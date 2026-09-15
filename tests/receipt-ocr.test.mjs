import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptText } from "../app/receipt/ocr.ts";

test("extracts a labelled receipt total, merchant and stock details", () => {
  const parsed = parseReceiptText(`惠康超級市場
鮮奶 236 ml x 3  $25.50
麵包 1 件  $12.00
合計 HK$37.50`);
  assert.equal(parsed.merchant, "惠康超級市場");
  assert.equal(parsed.amount, "37.5");
  assert.deepEqual(parsed.items[0], { name: "鮮奶 236 ml x 3", quantity: "3", size: "236", unit: "ml" });
});

test("uses the largest plausible amount when a screenshot has no total label", () => {
  const parsed = parseReceiptText(`淘寶
訂單付款成功
商品 A ¥18.00
¥36.00`);
  assert.equal(parsed.merchant, "淘寶");
  assert.equal(parsed.amount, "36");
  assert.equal(parsed.items.length, 1);
});

test("recognises Chinese size and quantity units", () => {
  const parsed = parseReceiptText(`店舖
純牛奶 1 公升 × 2盒 44.00
總額 44.00`);
  assert.deepEqual(parsed.items[0], { name: "純牛奶 1 公升 × 2盒", quantity: "2", size: "1", unit: "L" });
});
