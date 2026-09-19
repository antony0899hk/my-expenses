export type OcrStockItem = {
  name: string;
  quantity: string;
  size: string;
  unit: "ml" | "L" | "g" | "kg" | "件";
};

export type ReceiptOcrResult = {
  merchant: string;
  amount: string;
  items: OcrStockItem[];
};

const EXCLUDE_TOTAL = /(?:結餘|餘額|找續|找贖|折扣|交易號|卡號|號碼|balance(?!\s*due)|change|discount|card\s*(?:no|number)|transaction\s*(?:no|number))/i;

function totalPriority(line: string) {
  if (EXCLUDE_TOTAL.test(line)) return 0;
  if (/(?:總額|總數|合計|應付|實付|\bbalance\s*due\b|\bgrand\s*total\b|\bamount\s*paid\b|\btotal\b)/i.test(line)) return 3;
  if (/(?:折後|\boctopus\b|八達通|現金|付款)/i.test(line)) return 2;
  if (/(?:小計|\bsubtotal\b)/i.test(line)) return 1;
  return 0;
}
const IGNORE_ITEM_WORDS = /(?:總額|合計|應付|實付|付款|找續|折扣|小計|稅項|八達通|信用卡|visa|master|現金|total|subtotal|change|discount|tax)/i;

function moneyFromLine(line: string) {
  const values = [...line.matchAll(/(?:HK\$|[$¥￥₩])?\s*(-?(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,6})(?:\.[0-9]{2})?)(?![0-9])/gi)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.at(-1);
}

function cleanName(line: string) {
  return line
    .replace(/(?:HK\$|[$¥￥₩])?\s*[0-9]{1,6}(?:[,.][0-9]{2})?\s*$/i, "")
    .replace(/^\s*[0-9]{5,}\s+/, "")
    .replace(/\d+(?:\.\d+)?\s*(?:ml|毫升|l|公升|g|克|kg|公斤)/gi, "")
    .replace(/[x×]\s*\d+\s*(?:盒|件|包|枝|支|樽|瓶)?/gi, "")
    .replace(/\s+\d{1,3}\s*$/, "")
    .replace(/[|_*]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stockDetails(line: string): Omit<OcrStockItem, "name"> {
  const size = line.match(/(\d+(?:\.\d+)?)\s*(ml|毫升|l|公升|g|克|kg|公斤)(?=\s|[x×*]|$)/i);
  const count = line.match(/(?:[x×]\s*(\d+)|(?:數量|qty)\s*[:x×]?\s*(\d+)|(\d+)\s*(?:盒|件|包|枝|支|樽|瓶)|\s(\d{1,3})\s+(?=(?:HK\$|[$¥￥₩])))/i);
  const rawUnit = size?.[2]?.toLowerCase();
  const unit = rawUnit === "l" || rawUnit === "公升" ? "L" : rawUnit === "kg" || rawUnit === "公斤" ? "kg" : rawUnit === "g" || rawUnit === "克" ? "g" : rawUnit ? "ml" : "件";
  return { quantity: count?.[1] || count?.[2] || count?.[3] || count?.[4] || "1", size: size?.[1] || "", unit };
}

export function parseReceiptText(text: string): ReceiptOcrResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()
    .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g, "$1")).filter(Boolean);
  // Only recognised brands are auto-filled; arbitrary OCR fragments are not merchants.
  const brand = lines.slice(0, 12).join(" ").match(/\bfusion\b|\bwellcome\b|惠康|\bpark\s*n\s*shop\b|百佳|淘寶|淘宝|\btaobao\b/i);
  const merchant = brand ? (/fusion/i.test(brand[0]) ? "Fusion" : brand[0]) : "";
  const candidates = lines.flatMap((line, index) => {
    const priority = totalPriority(line);
    if (!priority) return [];
    let value = moneyFromLine(line);
    // Receipt layouts can put the label immediately below or above the amount.
    if (value === undefined) {
      const adjacent = [lines[index + 1], lines[index - 1]].filter((row): row is string => !!row && /^(?:HK\$|[$¥￥₩])?\s*\d[\d,.]*\s*$/.test(row));
      const values = [...new Set(adjacent.map(moneyFromLine).filter((n): n is number => n !== undefined))];
      if (values.length === 1) value = values[0];
    }
    return value === undefined ? [] : [{ value, priority }];
  });
  const highest = Math.max(0, ...candidates.map(row => row.priority));
  const values = [...new Set(candidates.filter(row => row.priority === highest).map(row => row.value))];
  const amount = values.length === 1 ? values[0] : undefined;
  const items = lines.flatMap((line) => {
    if (IGNORE_ITEM_WORDS.test(line) || moneyFromLine(line) === undefined) return [];
    const name = cleanName(line);
    if (name.length < 2 || !/[A-Za-z\u3400-\u9fff]/.test(name)) return [];
    return [{ name, ...stockDetails(line) }];
  }).slice(0, 20);
  return { merchant, amount: amount ? String(amount) : "", items };
}
