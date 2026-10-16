import test from "node:test";
import assert from "node:assert/strict";
import {parseTransactionMessage,transactionFingerprint} from "../app/transaction-import.ts";

test("parses HSBC WeChat Pay message",()=>{
  const parsed=parseTransactionMessage("#HSBCnotice 匯豐：10月10日信用卡結尾6079有HKD39.02交易（WECHAT PAY HONG KONG）。如懷疑電(852)2233 3000",new Date("2026-10-16T12:00:00Z"));
  assert.deepEqual(parsed&&{bank:parsed.bank,cardLast4:parsed.cardLast4,amount:parsed.amount,currency:parsed.currency,merchant:parsed.merchant,date:parsed.date},{bank:"HSBC",cardLast4:"6079",amount:39.02,currency:"HKD",merchant:"WECHAT PAY HONG KONG",date:"2026-10-10"});
  assert.equal(parsed?.categoryHints[0],"日常消費");
});

test("recognises Taobao inside AlipayHK",()=>{
  const parsed=parseTransactionMessage("匯豐：10月10日信用卡結尾6079有HKD239.67交易（AlipayHK Taobao.com）。",new Date("2026-10-16T12:00:00Z"));
  assert.equal(parsed?.merchant,"AlipayHK Taobao.com");
  assert.equal(parsed?.categoryHints[0],"淘寶");
});

test("rejects messages missing a card tail or transaction amount",()=>{
  assert.equal(parseTransactionMessage("你的驗證碼是 6079"),null);
});

test("fingerprint is stable and changes across cards",()=>{
  const base={date:"2026-10-10",currency:"HKD",amount:39.02,merchant:"WECHAT PAY HONG KONG"};
  assert.equal(transactionFingerprint({...base,cardLast4:"6079"}),transactionFingerprint({...base,cardLast4:"6079"}));
  assert.notEqual(transactionFingerprint({...base,cardLast4:"6079"}),transactionFingerprint({...base,cardLast4:"1234"}));
});
