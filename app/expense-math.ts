export type SplitShare = { memberId: string; amount: number };

const OPERATORS = new Set(["+", "-", "×", "÷"]);

function precedence(operator: string) {
  return operator === "×" || operator === "÷" ? 2 : 1;
}

export function calculateExpression(expression: string): number {
  const compact = expression.replace(/\s/g, "");
  if (!compact || compact.length > 120) throw new Error("INVALID");
  const tokens = compact.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-×÷]/g);
  if (!tokens || tokens.join("") !== compact) throw new Error("INVALID");

  const values: number[] = [];
  const operators: string[] = [];
  let expectsNumber = true;

  const apply = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!operator || left == null || right == null) throw new Error("INVALID");
    if (operator === "÷" && right === 0) throw new Error("DIV_ZERO");
    const result = operator === "+" ? left + right : operator === "-" ? left - right : operator === "×" ? left * right : left / right;
    if (!Number.isFinite(result) || Math.abs(result) > 1e15) throw new Error("TOO_LARGE");
    values.push(result);
  };

  tokens.forEach((token, index) => {
    if (OPERATORS.has(token)) {
      if (token === "-" && expectsNumber && index === 0) values.push(0);
      else if (expectsNumber) throw new Error("INVALID");
      while (operators.length && precedence(operators.at(-1)!) >= precedence(token)) apply();
      operators.push(token);
      expectsNumber = true;
    } else {
      const value = Number(token);
      if (!expectsNumber || !Number.isFinite(value)) throw new Error("INVALID");
      values.push(value);
      expectsNumber = false;
    }
    if (index === tokens.length - 1 && expectsNumber) throw new Error("INVALID");
  });
  while (operators.length) apply();
  if (values.length !== 1) throw new Error("INVALID");
  return Object.is(values[0], -0) ? 0 : values[0];
}

export function splitAmount(amount: number, memberIds: string[], fractionDigits: number): SplitShare[] {
  if (!memberIds.length || !Number.isFinite(amount)) return [];
  const scale = 10 ** fractionDigits;
  const units = Math.round(amount * scale);
  const base = Math.floor(units / memberIds.length);
  let remainder = units - base * memberIds.length;
  return memberIds.map(memberId => ({
    memberId,
    amount: (base + (remainder-- > 0 ? 1 : 0)) / scale,
  }));
}

export type Balance = { memberId: string; amount: number };
export type Transfer = { fromMemberId: string; toMemberId: string; amount: number };

export function settleBalances(balances: Balance[], fractionDigits: number): Transfer[] {
  const scale = 10 ** fractionDigits;
  const creditors = balances.map(b => ({ memberId: b.memberId, units: Math.round(b.amount * scale) })).filter(b => b.units > 0).sort((a, b) => b.units - a.units);
  const debtors = balances.map(b => ({ memberId: b.memberId, units: -Math.round(b.amount * scale) })).filter(b => b.units > 0).sort((a, b) => b.units - a.units);
  const transfers: Transfer[] = [];
  let creditor = 0;
  let debtor = 0;
  while (creditor < creditors.length && debtor < debtors.length) {
    const units = Math.min(creditors[creditor].units, debtors[debtor].units);
    if (units > 0) transfers.push({ fromMemberId: debtors[debtor].memberId, toMemberId: creditors[creditor].memberId, amount: units / scale });
    creditors[creditor].units -= units;
    debtors[debtor].units -= units;
    if (!creditors[creditor].units) creditor++;
    if (!debtors[debtor].units) debtor++;
  }
  return transfers;
}
