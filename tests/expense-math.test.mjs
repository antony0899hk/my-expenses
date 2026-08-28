import assert from "node:assert/strict";
import test from "node:test";
import { calculateExpression, newestSnapshot, settleBalances, splitAmount } from "../app/expense-math.ts";

test("newest storage snapshot wins and missing sources fall back safely", () => {
  const database = { updatedAt: 100, source: "database" };
  const local = { updatedAt: 200, source: "local" };
  assert.equal(newestSnapshot(database, local), local);
  assert.equal(newestSnapshot(local, database), local);
  assert.equal(newestSnapshot(database, null), database);
  assert.equal(newestSnapshot(null, local), local);
});

test("calculator handles arithmetic and precedence", () => {
  assert.equal(calculateExpression("28000 ÷ 3"), 28000 / 3);
  assert.equal(calculateExpression("10 + 2 × 3"), 16);
  assert.equal(calculateExpression("-5 + 2.5"), -2.5);
  assert.throws(() => calculateExpression("10 ÷ 0"), /DIV_ZERO/);
  assert.throws(() => calculateExpression("2 ++ 3"), /INVALID/);
});

test("splits deterministically and preserves total", () => {
  assert.deepEqual(splitAmount(100, ["me", "a", "b"], 0), [
    { memberId: "me", amount: 34 },
    { memberId: "a", amount: 33 },
    { memberId: "b", amount: 33 },
  ]);
  assert.equal(splitAmount(10.01, ["a", "b", "c"], 2).reduce((sum, share) => sum + share.amount, 0), 10.01);
});

test("settlement produces minimal greedy transfers", () => {
  assert.deepEqual(settleBalances([
    { memberId: "me", amount: 20000 },
    { memberId: "a", amount: -10000 },
    { memberId: "b", amount: -10000 },
  ], 0), [
    { fromMemberId: "a", toMemberId: "me", amount: 10000 },
    { fromMemberId: "b", toMemberId: "me", amount: 10000 },
  ]);
});

test("one payer and only another member sharing creates the full debt", () => {
  const shares = splitAmount(30000, ["a"], 0);
  const balances = [
    { memberId: "me", amount: 30000 },
    { memberId: "a", amount: -shares[0].amount },
  ];
  assert.deepEqual(settleBalances(balances, 0), [
    { fromMemberId: "a", toMemberId: "me", amount: 30000 },
  ]);
});

test("currencies remain independently settleable and HKD reference uses saved rates", () => {
  const krw = settleBalances([{ memberId: "me", amount: 10000 }, { memberId: "a", amount: -10000 }], 0);
  const jpy = settleBalances([{ memberId: "me", amount: -500 }, { memberId: "a", amount: 500 }], 0);
  const hkdReference = settleBalances([
    { memberId: "me", amount: 10000 * 0.0055 - 500 * 0.052 },
    { memberId: "a", amount: -(10000 * 0.0055 - 500 * 0.052) },
  ], 2);
  assert.deepEqual(krw, [{ fromMemberId: "a", toMemberId: "me", amount: 10000 }]);
  assert.deepEqual(jpy, [{ fromMemberId: "me", toMemberId: "a", amount: 500 }]);
  assert.deepEqual(hkdReference, [{ fromMemberId: "a", toMemberId: "me", amount: 29 }]);
});
