"use client";

import { ChangeEvent, useMemo, useState } from "react";

type ReceiptItem = {
  id: string;
  original: string;
  translated: string;
  category: string;
  amount: number;
};

const demoItems: ReceiptItem[] = [
  { id: "1", original: "น้ำมะพร้าว", translated: "椰子水", category: "飲品", amount: 45 },
  { id: "2", original: "ยาสีฟัน", translated: "牙膏", category: "日常消費", amount: 159 },
  { id: "3", original: "มะม่วงอบแห้ง", translated: "芒果乾", category: "小食 / 手信", amount: 189 },
  { id: "4", original: "กาแฟ", translated: "咖啡豆", category: "咖啡 / 手信", amount: 615 },
];

const categories = ["飲品", "早餐", "午餐", "晚餐", "交通費", "日常消費", "小食 / 手信", "咖啡 / 手信", "其他"];

export default function ReceiptBetaPage() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [showTranslation, setShowTranslation] = useState(true);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("尚未掃描");
  const [saved, setSaved] = useState(false);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);

  function loadDemo(name = "Thailand-receipt-demo.jpg") {
    setFileName(name);
    setStatus("已偵測泰文 · Demo 辨識完成");
    setItems(demoItems.map((item) => ({ ...item })));
    setSaved(false);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    loadDemo(file.name);
  }

  function updateItem(id: string, patch: Partial<ReceiptItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setSaved(false);
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.topbar}>
          <a href="/" style={styles.back}>‹ My Expenses</a>
          <span style={styles.beta}>RECEIPT AI · BETA</span>
        </div>

        <header style={styles.header}>
          <p style={styles.eyebrow}>MY EXPENSES LAB</p>
          <h1 style={styles.title}>掃描收據</h1>
          <p style={styles.lead}>先測試流程：影相 / 上載 → 原文辨識 → 中文翻譯 → 自動分類 → 逐項確認。今版未接真正 OCR 或 AI API，所以唔會產生額外費用。</p>
        </header>

        <article style={styles.card}>
          <div style={styles.cardTitleRow}>
            <div>
              <h2 style={styles.h2}>1. 加入收據</h2>
              <p style={styles.muted}>iPhone 可以直接用相機；桌面版可揀相片。</p>
            </div>
            <span style={styles.status}>{status}</span>
          </div>
          <label style={styles.upload}>
            <span style={{ fontSize: 30 }}>🧾</span>
            <strong>影相 / 選擇收據</strong>
            <small style={styles.muted}>JPG、PNG、HEIC · Beta 版會用示範資料模擬辨識</small>
            <input type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
          </label>
          <button type="button" onClick={() => loadDemo()} style={styles.secondaryButton}>直接試泰國收據 Demo</button>
          {fileName && <p style={styles.fileName}>目前檔案：{fileName}</p>}
        </article>

        {items.length > 0 && (
          <>
            <article style={styles.card}>
              <div style={styles.cardTitleRow}>
                <div>
                  <h2 style={styles.h2}>2. 翻譯與逐項確認</h2>
                  <p style={styles.muted}>原文保留；翻譯只係幫你睇明張單，正式入帳前仍可逐項改。</p>
                </div>
                <label style={styles.toggleLabel}>
                  <input type="checkbox" checked={showTranslation} onChange={(event) => setShowTranslation(event.target.checked)} /> 中文翻譯
                </label>
              </div>

              <div style={styles.list}>
                {items.map((item) => (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemHead}>
                      <div>
                        <strong style={styles.original}>{item.original}</strong>
                        {showTranslation && <div style={styles.translation}>{item.translated}</div>}
                      </div>
                      <button type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} style={styles.remove}>刪除</button>
                    </div>
                    <div style={styles.grid}>
                      <label style={styles.label}>中文名稱
                        <input value={item.translated} onChange={(event) => updateItem(item.id, { translated: event.target.value })} style={styles.input} />
                      </label>
                      <label style={styles.label}>分類
                        <select value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })} style={styles.input}>
                          {categories.map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </label>
                      <label style={styles.label}>金額（THB）
                        <input inputMode="decimal" type="number" min="0" step="any" value={item.amount} onChange={(event) => updateItem(item.id, { amount: Number(event.target.value) })} style={styles.input} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article style={styles.card}>
              <h2 style={styles.h2}>3. 入帳前總檢查</h2>
              <div style={styles.summaryRow}><span>辨識項目</span><strong>{items.length} 項</strong></div>
              <div style={styles.summaryRow}><span>原幣</span><strong>THB</strong></div>
              <div style={styles.summaryRow}><span>收據總額</span><strong style={{ fontSize: 24 }}>{total.toLocaleString("en-HK")} THB</strong></div>
              <div style={styles.notice}>正式版會喺呢一步再比你揀「逐項入帳」或者「只記總額」，並沿用 My Expenses 現有旅程、匯率、分類及分帳設定。</div>
              <button type="button" onClick={() => setSaved(true)} style={styles.primaryButton}>{saved ? "✓ Demo 已確認" : "確認並準備入帳"}</button>
              {saved && <p style={styles.success}>Beta 版暫時唔會寫入正式資料庫，避免測試資料混入你現有支出。</p>}
            </article>
          </>
        )}

        <article style={styles.card}>
          <h2 style={styles.h2}>之後正式接駁</h2>
          <p style={styles.muted}>下一階段先接真正 OCR + 翻譯，再將確認後項目送入現有 Expense save flow。咁平時開 App 唔會載入 OCR 模型，速度唔會因為呢個功能明顯變慢。</p>
        </article>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f4f2", color: "#151515", padding: "18px 14px 70px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif" },
  shell: { maxWidth: 720, margin: "0 auto" },
  topbar: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 },
  back: { color: "#151515", textDecoration: "none", fontWeight: 700 },
  beta: { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", padding: "6px 9px", border: "1px solid #d8d8d2", borderRadius: 999, background: "white" },
  header: { marginBottom: 18 },
  eyebrow: { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "#747474" },
  title: { margin: "4px 0 8px", fontSize: 34, lineHeight: 1.05 },
  lead: { margin: 0, color: "#666", lineHeight: 1.55, fontSize: 14 },
  card: { background: "white", border: "1px solid #deded8", borderRadius: 20, padding: 16, margin: "12px 0", boxShadow: "0 4px 18px rgba(0,0,0,.03)" },
  cardTitleRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  h2: { fontSize: 18, margin: "0 0 5px" },
  muted: { color: "#777", fontSize: 12, lineHeight: 1.45, margin: 0 },
  status: { fontSize: 11, borderRadius: 999, padding: "6px 8px", background: "#efefe9", whiteSpace: "nowrap" },
  upload: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "1.5px dashed #bdbdb4", borderRadius: 16, padding: "24px 14px", margin: "14px 0 10px", cursor: "pointer", background: "#fafaf8", textAlign: "center" },
  secondaryButton: { width: "100%", border: 0, borderRadius: 13, padding: "11px 12px", background: "#ecece8", color: "#111", fontWeight: 750, cursor: "pointer" },
  fileName: { margin: "10px 0 0", fontSize: 12, color: "#666" },
  toggleLabel: { fontSize: 12, whiteSpace: "nowrap", display: "flex", gap: 6, alignItems: "center" },
  list: { display: "grid", gap: 10, marginTop: 14 },
  itemCard: { border: "1px solid #e3e3dc", borderRadius: 15, padding: 12, background: "#fcfcfa" },
  itemHead: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  original: { fontSize: 16 },
  translation: { fontSize: 13, color: "#666", marginTop: 2 },
  remove: { border: 0, background: "transparent", color: "#9b3f3f", fontWeight: 700, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9, marginTop: 11 },
  label: { fontSize: 11, fontWeight: 700, color: "#666", display: "grid", gap: 5 },
  input: { width: "100%", border: "1px solid #d8d8d2", borderRadius: 11, padding: "9px 10px", background: "white", color: "#111", fontSize: 14 },
  summaryRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #eee" },
  notice: { marginTop: 12, padding: "11px 12px", background: "#fff3d8", borderRadius: 12, fontSize: 12, lineHeight: 1.5 },
  primaryButton: { width: "100%", border: 0, borderRadius: 14, padding: "13px 14px", marginTop: 12, background: "#111", color: "white", fontWeight: 800, cursor: "pointer" },
  success: { margin: "10px 0 0", padding: "10px 12px", borderRadius: 12, background: "#e8f5ea", color: "#2e6741", fontSize: 12, lineHeight: 1.45 },
};
