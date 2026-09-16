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

const TOTAL_WORDS = /(?:總額|總數|合計|應付|實付|付款|折後|grand\s*total|total|amount\s*paid)/i;
const IGNORE_ITEM_WORDS = /(?:總額|合計|應付|實付|付款|找續|折扣|小計|稅項|八達通|信用卡|visa|master|現金|total|subtotal|change|discount|tax)/i;

function moneyFromLine(line: string) {
  const values = [...line.matchAll(/(?:HK\$|[$¥￥₩])?\s*([0-9]{1,6}(?:[,.][0-9]{2})?)/gi)]
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.at(-1);
}

function cleanName(line: string) {
  return line
    .replace(/(?:HK\$|[$¥￥₩])?\s*[0-9]{1,6}(?:[,.][0-9]{2})?\s*$/i, "")
    .replace(/^\s*[0-9]{5,}\s+/, "")
    .replace(/[|_*]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stockDetails(line: string): Omit<OcrStockItem, "name"> {
  const size = line.match(/(\d+(?:\.\d+)?)\s*(ml|毫升|l|公升|g|克|kg|公斤)(?=\s|[x×*]|$)/i);
  const count = line.match(/(?:[x×]\s*(\d+)|(?:數量|qty)\s*[:x×]?\s*(\d+)|(\d+)\s*(?:盒|件|包|枝|支|樽|瓶))/i);
  const rawUnit = size?.[2]?.toLowerCase();
  const unit = rawUnit === "l" || rawUnit === "公升" ? "L" : rawUnit === "kg" || rawUnit === "公斤" ? "kg" : rawUnit === "g" || rawUnit === "克" ? "g" : rawUnit ? "ml" : "件";
  return { quantity: count?.[1] || count?.[2] || count?.[3] || "1", size: size?.[1] || "", unit };
}

export function parseReceiptText(text: string): ReceiptOcrResult {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const merchant = lines.slice(0, 8).find((line) => /[A-Za-z\u3400-\u9fff]{2,}/.test(line) && !TOTAL_WORDS.test(line) && !/^receipt$/i.test(line)) || "";
  const totalLine = [...lines].reverse().find((line) => TOTAL_WORDS.test(line) && moneyFromLine(line));
  const amount = totalLine ? moneyFromLine(totalLine) : undefined;
  const items = lines.flatMap((line) => {
    if (IGNORE_ITEM_WORDS.test(line) || moneyFromLine(line) === undefined) return [];
    const name = cleanName(line);
    if (name.length < 2 || !/[A-Za-z\u3400-\u9fff]/.test(name)) return [];
    return [{ name, ...stockDetails(line) }];
  }).slice(0, 20);
  return { merchant, amount: amount ? String(amount) : "", items };
}
