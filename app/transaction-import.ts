export const TRANSACTION_CURRENCIES = ["HKD","CNY","TWD","JPY","KRW","THB","IDR","SGD","MYR","USD","EUR","GBP","CAD","AUD","NZD","PHP","VND"] as const;

export type TransactionCurrency = (typeof TRANSACTION_CURRENCIES)[number];

export type ParsedTransactionMessage = {
  bank:string;
  cardLast4:string;
  amount:number;
  currency:TransactionCurrency;
  merchant:string;
  date:string;
  categoryHints:string[];
  fingerprint:string;
};

const DAY_MS=24*60*60*1000;
const normalize=(value:string)=>value.normalize("NFKC").replace(/\s+/g," ").trim();
const pad=(value:number)=>String(value).padStart(2,"0");

function inferDate(month:number,day:number,now:Date){
  let year=now.getFullYear();
  let candidate=new Date(year,month-1,day,12);
  if(candidate.getTime()-now.getTime()>45*DAY_MS){year-=1;candidate=new Date(year,month-1,day,12)}
  if(candidate.getMonth()!==month-1||candidate.getDate()!==day)return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

function hash(value:string){
  let result=2166136261;
  for(let index=0;index<value.length;index++){result^=value.charCodeAt(index);result=Math.imul(result,16777619)}
  return (result>>>0).toString(36);
}

export function transactionFingerprint(input:{date:string;currency:string;amount:number;cardLast4?:string;merchant?:string}){
  const key=[input.date,input.currency.toUpperCase(),input.amount.toFixed(2),input.cardLast4||"",normalize(input.merchant||"").toLocaleLowerCase("en-HK")].join("|");
  return `tx-${hash(key)}`;
}

function categoryHints(merchant:string){
  const value=merchant.toLocaleLowerCase("zh-HK");
  if(["taobao","淘寶"].some(keyword=>value.includes(keyword)))return ["淘寶","網購","日常消費","其他"];
  if(["惠康","wellcome","fusion","百佳","parknshop","park n shop","market place","city'super","aeon"].some(keyword=>value.includes(keyword)))return ["買餸","日常消費","其他"];
  if(["mtr","港鐵","kmb","九巴","citybus","城巴","uber","taxi","的士"].some(keyword=>value.includes(keyword)))return ["交通費","其他"];
  return ["日常消費","其他"];
}

export function parseTransactionMessage(raw:string,now=new Date()):ParsedTransactionMessage|null{
  const message=normalize(raw);
  if(!message)return null;
  const amountMatch=message.match(/\b(HKD|CNY|TWD|JPY|KRW|THB|IDR|SGD|MYR|USD|EUR|GBP|CAD|AUD|NZD|PHP|VND)\s*\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const cardMatch=message.match(/(?:信用卡)?(?:結尾|尾號|尾數|ending(?: in)?)[\s:#-]*([0-9]{4})/i);
  const dateMatch=message.match(/(?:^|\D)(\d{1,2})月\s*(\d{1,2})日/);
  if(!amountMatch||!cardMatch||!dateMatch)return null;
  const currency=amountMatch[1].toUpperCase() as TransactionCurrency;
  const amount=Number(amountMatch[2].replaceAll(",",""));
  const date=inferDate(Number(dateMatch[1]),Number(dateMatch[2]),now);
  if(!Number.isFinite(amount)||amount<=0||!date)return null;
  const transactionMerchant=message.match(/(?:交易|簽賬|消費)\s*[（(]([^）)]+)[）)]/i)?.[1];
  const merchant=normalize(transactionMerchant||"").replace(/[。；;]+$/g,"")||"未辨認商戶";
  const bank=/匯豐|HSBC/i.test(message)?"HSBC":/恒生|Hang Seng/i.test(message)?"恒生":/中銀|BOC/i.test(message)?"中銀":/渣打|Standard Chartered/i.test(message)?"渣打":"銀行交易";
  const cardLast4=cardMatch[1];
  return {bank,cardLast4,amount,currency,merchant,date,categoryHints:categoryHints(merchant),fingerprint:transactionFingerprint({date,currency,amount,cardLast4,merchant})};
}
