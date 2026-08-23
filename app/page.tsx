"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Currency = "HKD" | "CNY" | "TWD" | "JPY" | "KRW" | "THB" | "IDR";
type Category = { id: string; name: string; subcategories?: string[] };
type Expense = {
  id: string; amount: number; currency: Currency; hkdAmount: number;
  rate: number; categoryId: string; subcategory?: string; date: string; note: string; createdAt: number;
};
type Tab = "dashboard" | "records" | "categories" | "settings";
type AppData = {
  version: 2; expenses: Expense[]; categories: Category[];
  rates: Record<Currency, number>; settings: { baseCurrency: "HKD"; rateUpdated: string };
};

const DEFAULT_CATEGORIES: Category[] = ["交通費", "早餐", "午餐", "晚餐", "買餸", "日常消費", "睇戲", "電話費", "上網費", "其他"].map((name, i) => ({ id: `cat-${i + 1}`, name, ...(name === "交通費" ? { subcategories: ["巴士", "的士", "地鐵"] } : {}) }));
const DEFAULT_RATES: Record<Currency, number> = { HKD: 1, CNY: 1.08, TWD: 0.245, JPY: 0.052, KRW: 0.0055, THB: 0.235, IDR: 0.00047 };
const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "HKD", label: "港幣" }, { code: "CNY", label: "人民幣" },
  { code: "TWD", label: "新台幣" },
  { code: "JPY", label: "日圓" }, { code: "KRW", label: "韓圜" },
  { code: "THB", label: "泰銖" }, { code: "IDR", label: "印尼盾" },
];

const today = () => new Date().toLocaleDateString("en-CA");
const monthKey = (d: string) => d.slice(0, 7);
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const wholeUnitCurrency = (currency: Currency) => currency === "KRW" || currency === "JPY" || currency === "IDR";
const money = (n: number, currency: Currency = "HKD") => new Intl.NumberFormat("en-HK", { style: "currency", currency, maximumFractionDigits: wholeUnitCurrency(currency) ? 0 : 2 }).format(n);
const originalMoney = (n: number, currency: Currency) => `${currency} ${new Intl.NumberFormat("en-HK", { maximumFractionDigits: wholeUnitCurrency(currency) ? 0 : 2 }).format(n)}`;
const shortDate = (d: string) => new Intl.DateTimeFormat("zh-HK", { month: "short", day: "numeric" }).format(new Date(`${d}T12:00:00`));
const monthTitle = (m: string) => { const [y, mo] = m.split("-"); return `${y}年 ${Number(mo)}月`; };
const DB_NAME = "antony-expenses-db";
const DB_STORE = "app-data";
const DB_KEY = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readDatabase(): Promise<AppData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
async function writeDatabase(data: AppData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(data, DB_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function readLegacyData(): AppData | null {
  try {
    const storedExpenses = localStorage.getItem("antony-expenses");
    const storedCategories = localStorage.getItem("antony-categories");
    const storedRates = localStorage.getItem("antony-rates");
    if (!storedExpenses && !storedCategories && !storedRates) return null;
    return {
      version: 2,
      expenses: storedExpenses ? JSON.parse(storedExpenses) : [],
      categories: storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES,
      rates: storedRates ? JSON.parse(storedRates) : DEFAULT_RATES,
      settings: { baseCurrency: "HKD", rateUpdated: localStorage.getItem("antony-rate-updated") || "預設參考匯率" },
    };
  } catch { return null; }
}
function mirrorToLocalStorage(data: AppData) {
  try {
    localStorage.setItem("antony-expenses", JSON.stringify(data.expenses));
    localStorage.setItem("antony-categories", JSON.stringify(data.categories));
    localStorage.setItem("antony-rates", JSON.stringify(data.rates));
    localStorage.setItem("antony-rate-updated", data.settings.rateUpdated);
  } catch { /* IndexedDB remains the primary store */ }
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [rateUpdated, setRateUpdated] = useState<string>("預設參考匯率");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [categoryModal, setCategoryModal] = useState<Category | null | "new">(null);
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let saved: AppData | null = null;
      try { saved = await readDatabase(); } catch { /* fall back to legacy storage */ }
      if (!saved) {
        saved = readLegacyData();
        if (saved) try { await writeDatabase(saved); } catch { /* localStorage remains available */ }
      }
      if (active && saved) {
        setCategories(saved.categories.map(c => c.id === "cat-1" && !c.subcategories ? { ...c, subcategories: ["巴士", "的士", "地鐵"] } : c));
        setExpenses(saved.expenses);
        setRates(saved.rates);
        setRateUpdated(saved.settings?.rateUpdated || "預設參考匯率");
      }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const data: AppData = { version: 2, expenses, categories, rates, settings: { baseCurrency: "HKD", rateUpdated } };
    mirrorToLocalStorage(data);
    writeDatabase(data).catch(() => notify("資料庫暫時未能寫入，已保存後備副本"));
  }, [expenses, categories, rates, rateUpdated, ready]);

  const monthExpenses = useMemo(() => expenses.filter(e => monthKey(e.date) === month).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [expenses, month]);
  const total = monthExpenses.reduce((s, e) => s + e.hkdAmount, 0);
  const breakdown = useMemo(() => categories.map(c => ({ ...c, total: monthExpenses.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.hkdAmount, 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total), [categories, monthExpenses]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2200); }
  function openNew() { setEditing(null); setEditorOpen(true); }
  function saveExpense(data: Omit<Expense, "id" | "createdAt">) {
    if (editing) setExpenses(v => v.map(e => e.id === editing.id ? { ...e, ...data } : e));
    else setExpenses(v => [{ ...data, id: makeId(), createdAt: Date.now() }, ...v]);
    setEditorOpen(false); notify(editing ? "支出已更新" : "支出已儲存");
  }
  function deleteExpense(id: string) {
    if (confirm("確定刪除這筆支出？")) { setExpenses(v => v.filter(e => e.id !== id)); setEditorOpen(false); notify("支出已刪除"); }
  }
  function shiftMonth(delta: number) { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  async function refreshRates() {
    notify("正在更新匯率…");
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/HKD");
      const data = await response.json();
      if (!data?.rates) throw new Error();
      const next = { HKD: 1, CNY: 1 / data.rates.CNY, TWD: 1 / data.rates.TWD, JPY: 1 / data.rates.JPY, KRW: 1 / data.rates.KRW, THB: 1 / data.rates.THB, IDR: 1 / data.rates.IDR };
      setRates(next); setRateUpdated(`更新於 ${new Date().toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}`); notify("自動匯率已更新");
    } catch { notify("未能連線，繼續使用現有匯率"); }
  }
  function exportData() {
    const backup = { app: "My Expenses", exportedAt: new Date().toISOString(), currencies: CURRENCIES, data: { version: 2, expenses, categories, rates, settings: { baseCurrency: "HKD", rateUpdated } } };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `my-expenses-backup-${today()}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("備份檔案已匯出");
  }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed?.data || parsed;
      if (!Array.isArray(data.expenses) || !Array.isArray(data.categories) || !data.rates) throw new Error();
      const restored: AppData = { version: 2, expenses: data.expenses, categories: data.categories, rates: { ...DEFAULT_RATES, ...data.rates }, settings: { baseCurrency: "HKD", rateUpdated: data.settings?.rateUpdated || "從備份還原" } };
      await writeDatabase(restored); mirrorToLocalStorage(restored);
      setExpenses(restored.expenses); setCategories(restored.categories); setRates(restored.rates); setRateUpdated(restored.settings.rateUpdated);
      setMonth(today().slice(0, 7)); notify("所有資料已完整還原");
    } catch { notify("備份檔案格式不正確"); }
  }

  if (!ready) return <main className="loading">My Expenses</main>;
  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div><p className="eyebrow">MY EXPENSES</p><h1>{tab === "dashboard" ? "你好" : tab === "records" ? "支出記錄" : tab === "categories" ? "支出分類" : "設定"}</h1></div>
          <div className="avatar">$</div>
        </header>

        {tab === "dashboard" && <Dashboard month={month} total={total} expenses={monthExpenses} categories={categories} breakdown={breakdown} shiftMonth={shiftMonth} edit={e => { setEditing(e); setEditorOpen(true); }} />}
        {tab === "records" && <Records expenses={expenses} categories={categories} edit={e => { setEditing(e); setEditorOpen(true); }} />}
        {tab === "categories" && <Categories categories={categories} expenses={expenses} open={setCategoryModal} />}
        {tab === "settings" && <Settings rates={rates} updated={rateUpdated} setRates={setRates} refresh={refreshRates} exportData={exportData} importData={() => importRef.current?.click()} />}

        <nav className="bottom-nav" aria-label="主要導覽">
          <NavButton active={tab === "dashboard"} icon="▦" label="總覽" onClick={() => setTab("dashboard")} />
          <NavButton active={tab === "records"} icon="≡" label="記錄" onClick={() => setTab("records")} />
          <button className="add-button" onClick={openNew} aria-label="新增支出">＋</button>
          <NavButton active={tab === "categories"} icon="◫" label="分類" onClick={() => setTab("categories")} />
          <NavButton active={tab === "settings"} icon="⚙" label="設定" onClick={() => setTab("settings")} />
        </nav>
      </div>
      {editorOpen && <ExpenseEditor categories={categories} rates={rates} expense={editing} recent={expenses} onClose={() => setEditorOpen(false)} onSave={saveExpense} onDelete={editing ? () => deleteExpense(editing.id) : undefined} />}
      {categoryModal && <CategoryEditor value={categoryModal === "new" ? null : categoryModal} onClose={() => setCategoryModal(null)} onSave={(name, subcategories) => { if (categoryModal === "new") setCategories(v => [...v, { id: makeId(), name, subcategories }]); else setCategories(v => v.map(c => c.id === categoryModal.id ? { ...c, name, subcategories } : c)); setCategoryModal(null); notify("分類已儲存"); }} onDelete={categoryModal === "new" ? undefined : () => { if (expenses.some(e => e.categoryId === categoryModal.id)) return notify("此分類仍有支出，不能刪除"); setCategories(v => v.filter(c => c.id !== categoryModal.id)); setCategoryModal(null); notify("分類已刪除"); }} />}
      <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importData} aria-label="選擇備份檔案" />
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

type BreakdownItem = Category & { total: number };
function Dashboard({ month, total, expenses, categories, breakdown, shiftMonth, edit }: { month: string; total: number; expenses: Expense[]; categories: Category[]; breakdown: BreakdownItem[]; shiftMonth: (delta: number) => void; edit: (expense: Expense) => void }) {
  return <section className="content">
    <div className="month-switch"><button onClick={() => shiftMonth(-1)} aria-label="上個月">‹</button><strong>{monthTitle(month)}</strong><button onClick={() => shiftMonth(1)} aria-label="下個月">›</button></div>
    <article className="total-card"><span>本月總支出</span><strong>{money(total)}</strong><small>{expenses.length} 筆支出 · 全部已換算港幣</small><div className="soft-orb" /></article>
    <div className="section-title"><h2>分類支出</h2><span>{breakdown.length} 個分類</span></div>
    <article className="card category-summary">
      {breakdown.length ? breakdown.map((c, i: number) => <div className="category-row" key={c.id}><div className={`category-icon tone-${i % 4}`}>{c.name.slice(0, 1)}</div><div className="category-data"><div><strong>{c.name}</strong><span>{money(c.total)}</span></div><div className="bar"><i style={{ width: `${total ? c.total / total * 100 : 0}%` }} /></div><small>{total ? (c.total / total * 100).toFixed(1) : 0}%</small></div></div>) : <Empty text="今個月未有支出" />}
    </article>
    <div className="section-title"><h2>最近支出</h2></div>
    <article className="card record-list">{expenses.slice(0, 5).map((e: Expense) => <ExpenseRow key={e.id} e={e} category={categories.find((c: Category) => c.id === e.categoryId)} onClick={() => edit(e)} />)}{!expenses.length && <Empty text="撳下面 ＋ 新增第一筆支出" />}</article>
  </section>;
}

function Records({ expenses, categories, edit }: { expenses: Expense[]; categories: Category[]; edit: (e: Expense) => void }) {
  const groups = expenses.slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt-a.createdAt).reduce<Record<string, Expense[]>>((o,e) => { (o[e.date] ||= []).push(e); return o; },{});
  return <section className="content records-page">{Object.entries(groups).map(([date, list]) => <div key={date}><div className="day-heading"><strong>{date === today() ? "今日" : shortDate(date)}</strong><span>{money(list.reduce((s,e)=>s+e.hkdAmount,0))}</span></div><article className="card record-list">{list.map(e => <ExpenseRow key={e.id} e={e} category={categories.find(c => c.id === e.categoryId)} onClick={() => edit(e)} />)}</article></div>)}{!expenses.length && <article className="card"><Empty text="暫時未有支出記錄" /></article>}</section>;
}

function Categories({ categories, expenses, open }: { categories: Category[]; expenses: Expense[]; open: (c: Category | "new") => void }) {
  return <section className="content"><p className="page-lead">管理分類及其細分類。</p><article className="card manage-list">{categories.map(c => <button key={c.id} onClick={() => open(c)}><span className="category-icon">{c.name.slice(0,1)}</span><span><strong>{c.name}</strong><small>{c.subcategories?.length ? `${c.subcategories.join(" · ")} · ` : ""}{expenses.filter(e => e.categoryId === c.id).length} 筆記錄</small></span><b>›</b></button>)}</article><button className="secondary-action" onClick={() => open("new")}>＋ 新增分類</button></section>;
}

function Settings({ rates, updated, setRates, refresh, exportData, importData }: { rates: Record<Currency,number>; updated: string; setRates: React.Dispatch<React.SetStateAction<Record<Currency, number>>>; refresh: () => void; exportData: () => void; importData: () => void }) {
  return <section className="content"><article className="card settings-card"><div className="setting-title"><div><h2>匯率</h2><p>1 單位外幣可兌換的港幣</p></div><button onClick={refresh}>自動更新</button></div>{CURRENCIES.filter(c=>c.code!=="HKD").map(c => <label className="rate-line" key={c.code}><span><strong>{c.code}</strong><small>{c.label}</small></span><div><input type="number" step="0.0001" value={rates[c.code]} onChange={e => setRates(v=>({...v,[c.code]:Number(e.target.value)}))}/><em>HKD</em></div></label>)}<small className="updated">{updated} · 可手動修改</small></article><article className="card about-card"><h2>資料備份</h2><p>匯出會包含全部支出、分類、貨幣、匯率及設定。可在另一個瀏覽器匯入同一個檔案。</p><div className="backup-actions"><button onClick={exportData}>匯出備份</button><button onClick={importData}>匯入還原</button></div></article><article className="card about-card"><h2>資料保存</h2><p>資料使用這部裝置瀏覽器的 IndexedDB 保存，並建立 localStorage 後備副本。清除 Safari 網站資料會同時刪除記錄。</p></article><article className="card about-card"><h2>Base Currency</h2><p>HKD 港幣 · 所有統計均以港幣顯示</p></article></section>;
}

function ExpenseEditor({ categories, rates, expense, recent, onClose, onSave, onDelete }: { categories: Category[]; rates: Record<Currency,number>; expense: Expense|null; recent: Expense[]; onClose:()=>void; onSave:(e:Omit<Expense,"id"|"createdAt">)=>void; onDelete?:()=>void }) {
  const [amount,setAmount]=useState(expense?.amount.toString()||""); const [currency,setCurrency]=useState<Currency>(expense?.currency||"HKD"); const [rate,setRate]=useState(expense?.rate||rates.HKD); const [categoryId,setCategoryId]=useState(expense?.categoryId||""); const [subcategory,setSubcategory]=useState(expense?.subcategory||""); const [date,setDate]=useState(expense?.date||today()); const [note,setNote]=useState(expense?.note||"");
  const popular = [...new Set(recent.map(e=>e.categoryId))].map(id=>categories.find(c=>c.id===id)).filter(Boolean).slice(0,4) as Category[];
  const ordered = [...popular, ...categories.filter(c=>!popular.some(p=>p.id===c.id))];
  const hkd=(Number(amount)||0)*rate;
  function submit(e:FormEvent){e.preventDefault(); if(!amount||Number(amount)<=0||!categoryId)return; onSave({amount:Number(amount),currency,hkdAmount:hkd,rate,categoryId,subcategory:subcategory||undefined,date,note:note.trim()});}
  const selectedCategory=categories.find(c=>c.id===categoryId);
  return <div className="modal-backdrop"><form className="sheet" onSubmit={submit}><div className="sheet-handle"/><div className="sheet-head"><button type="button" onClick={onClose}>取消</button><h2>{expense?"編輯支出":"新增支出"}</h2><button type="submit" disabled={!amount||!categoryId}>儲存</button></div><div className="amount-entry"><select value={currency} onChange={e=>{const next=e.target.value as Currency;setCurrency(next);if(!expense)setRate(rates[next]);}} aria-label="貨幣">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select><input autoFocus inputMode="decimal" type="number" min="0" step="any" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="金額"/><small>≈ {money(hkd)} HKD</small></div>{currency!=="HKD"&&<label className="form-line"><span>匯率</span><div className="inline-rate"><input type="number" step="0.000001" value={rate} onChange={e=>setRate(Number(e.target.value))}/><small>HKD / {currency}</small></div></label>}<div className="form-block"><span>分類</span><div className="category-chips">{ordered.map((c,i)=><button type="button" className={categoryId===c.id?"selected":""} key={c.id} onClick={()=>{setCategoryId(c.id);setSubcategory("");}}>{i<popular.length&&<i>常用</i>}{c.name}</button>)}</div></div>{selectedCategory?.subcategories?.length ? <div className="form-block"><span>細分類 <small>選填</small></span><div className="category-chips"><button type="button" className={!subcategory?"selected":""} onClick={()=>setSubcategory("")}>不指定</button>{selectedCategory.subcategories.map(s=><button type="button" className={subcategory===s?"selected":""} key={s} onClick={()=>setSubcategory(s)}>{s}</button>)}</div></div>:null}<label className="form-line"><span>日期</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label><label className="form-block"><span>備註 <small>選填</small></span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="例如：韓國旅行晚餐" /></label>{onDelete&&<button className="delete-button" type="button" onClick={onDelete}>刪除這筆支出</button>}</form></div>;
}

function CategoryEditor({value,onClose,onSave,onDelete}:{value:Category|null;onClose:()=>void;onSave:(n:string,s:string[])=>void;onDelete?:()=>void}){const [name,setName]=useState(value?.name||"");const [subs,setSubs]=useState<string[]>(value?.subcategories||[]);const [newSub,setNewSub]=useState("");function addSub(){const s=newSub.trim();if(s&&!subs.includes(s)){setSubs(v=>[...v,s]);setNewSub("");}}return <div className="modal-backdrop"><form className="mini-sheet" onSubmit={e=>{e.preventDefault();if(name.trim())onSave(name.trim(),subs)}}><div className="sheet-head"><button type="button" onClick={onClose}>取消</button><h2>{value?"編輯分類":"新增分類"}</h2><button disabled={!name.trim()}>儲存</button></div><label>分類名稱<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="輸入分類名稱"/></label><div className="subcategory-editor"><strong>細分類</strong><div className="subcategory-add"><input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="例如：巴士"/><button type="button" onClick={addSub}>加入</button></div><div className="subcategory-list">{subs.map((s,i)=><span key={`${s}-${i}`}>{s}<button type="button" aria-label={`刪除 ${s}`} onClick={()=>setSubs(v=>v.filter((_,index)=>index!==i))}>×</button></span>)}</div></div>{onDelete&&<button type="button" className="delete-button" onClick={onDelete}>刪除分類</button>}</form></div>}
function ExpenseRow({e,category,onClick}:{e:Expense;category?:Category;onClick:()=>void}){return <button className="expense-row" onClick={onClick}><span className="category-icon">{category?.name.slice(0,1)||"其"}</span><span className="expense-main"><strong>{category?.name||"其他"}{e.subcategory?` · ${e.subcategory}`:""}</strong><small>{shortDate(e.date)}{e.note?` · ${e.note}`:""}</small></span><span className="expense-money"><strong>{money(e.hkdAmount)}</strong>{e.currency!=="HKD"&&<small>{originalMoney(e.amount,e.currency)}</small>}</span></button>}
function NavButton({active,icon,label,onClick}:{active:boolean;icon:string;label:string;onClick:()=>void}){return <button className={active?"active":""} onClick={onClick}><i>{icon}</i><span>{label}</span></button>}
function Empty({text}:{text:string}){return <div className="empty"><div>✓</div><p>{text}</p></div>}
