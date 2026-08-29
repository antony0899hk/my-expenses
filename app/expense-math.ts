export type SplitShare = { memberId: string; amount: number };

export type MonthlyExpenseInput = { hkdAmount: number; date: string; categoryId: string };
export type MonthlyCategoryInput = { id: string; name: string };
export type MonthlySummary = {
  total: number;
  previousTotal: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  topCategory: { id: string; name: string; amount: number; percent: number } | null;
  largestExpense: MonthlyExpenseInput | null;
  averageDaily: number;
  noSpendDays: number;
  previousNoSpendDays: number | null;
  tips: string[];
};

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function previousMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlySummary(month: string, current: MonthlyExpenseInput[], previous: MonthlyExpenseInput[], categories: MonthlyCategoryInput[]): MonthlySummary {
  const total = current.reduce((sum, expense) => sum + expense.hkdAmount, 0);
  const previousTotalValue = previous.reduce((sum, expense) => sum + expense.hkdAmount, 0);
  const previousTotal = previous.length && previousTotalValue > 0 ? previousTotalValue : null;
  const categoryTotals = new Map<string, number>();
  current.forEach(expense => categoryTotals.set(expense.categoryId, (categoryTotals.get(expense.categoryId) || 0) + expense.hkdAmount));
  const topEntry = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = topEntry ? {
    id: topEntry[0],
    name: categories.find(category => category.id === topEntry[0])?.name || "其他",
    amount: topEntry[1],
    percent: total ? topEntry[1] / total * 100 : 0,
  } : null;
  const activeDays = new Set(current.map(expense => expense.date)).size;
  const previousActiveDays = new Set(previous.map(expense => expense.date)).size;
  const noSpendDays = Math.max(0, daysInMonth(month) - activeDays);
  const previousNoSpendDays = previous.length ? Math.max(0, daysInMonth(previousMonthKey(month)) - previousActiveDays) : null;
  const tips: string[] = [];
  if (topCategory) tips.push(`${topCategory.name}佔本月支出 ${topCategory.percent.toFixed(0)}%，是支出最高的分類。`);
  if (topCategory && previous.length) {
    const previousCategory = previous.filter(expense => expense.categoryId === topCategory.id).reduce((sum, expense) => sum + expense.hkdAmount, 0);
    const difference = topCategory.amount - previousCategory;
    if (previousCategory > 0 && Math.abs(difference) >= 1) tips.unshift(`${topCategory.name}支出比上月${difference >= 0 ? "增加" : "減少"} HK$${Math.abs(difference).toFixed(0)}（${Math.abs(difference / previousCategory * 100).toFixed(0)}%）。`);
  }
  if (tips.length < 2 && previousNoSpendDays != null && noSpendDays !== previousNoSpendDays) tips.push(`本月有 ${noSpendDays} 日沒有支出，比上月${noSpendDays > previousNoSpendDays ? "多" : "少"} ${Math.abs(noSpendDays - previousNoSpendDays)} 日。`);
  return {
    total,
    previousTotal,
    changeAmount: previousTotal == null ? null : total - previousTotal,
    changePercent: previousTotal == null ? null : (total - previousTotal) / previousTotal * 100,
    topCategory,
    largestExpense: current.length ? current.reduce((largest, expense) => expense.hkdAmount > largest.hkdAmount ? expense : largest) : null,
    averageDaily: total / daysInMonth(month),
    noSpendDays,
    previousNoSpendDays,
    tips: tips.slice(0, 2),
  };
}

export function newestSnapshot<T extends { updatedAt: number }>(database: T | null, local: T | null): T | null {
  if (!database) return local;
  if (!local) return database;
  return local.updatedAt > database.updatedAt ? local : database;
}

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
