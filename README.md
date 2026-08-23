# My Expenses

My Expenses 是一個以香港繁體中文介面製作的個人支出記帳 App。資料只會保存在使用者目前瀏覽器的 IndexedDB，並以 localStorage 作為後備；repository 不包含任何個人支出資料。

## 功能

- 依月份查看總支出、分類統計與最近支出
- 新增、編輯及刪除支出
- 自訂支出分類與細分類
- 支援 HKD、CNY、TWD、JPY、KRW、THB、IDR
- 自動或手動更新匯率，統一換算成港幣
- 匯出及匯入完整 JSON 備份
- IndexedDB 儲存及 localStorage 後備

## 本機開發

需求：Node.js 22.13.0 或以上。

```bash
npm ci
npm run dev
```

開啟終端輸出的本機網址即可使用。

## 建置與測試

```bash
npm run build
npm test
npm run lint
```

## 資料與私隱

- 原始碼不包含任何預載支出記錄。
- 支出資料保存在瀏覽器本機，不會上傳到 repository。
- 清除瀏覽器網站資料會移除已保存的記錄，請先使用 App 內的匯出功能備份。
- `.env`、Vercel 設定、建置產物及本機工具狀態均由 `.gitignore` 排除。

## 技術

- Next.js 16 / React 19
- Next.js App Router
- TypeScript
- Drizzle ORM（保留供可選資料庫整合）

## License

All rights reserved.
