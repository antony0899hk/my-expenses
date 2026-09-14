"use client";

import { useEffect, useMemo, useState } from "react";

type Expense = { id:string; amount:number; currency:string; categoryId:string; subcategory?:string; date:string; note:string; expenseType?:string };
type Category = { id:string; name:string };
type Snapshot = { expenses?:Expense[]; categories?:Category[] };

type PurchaseEvent = {
  type:"purchase.confirmed";
  eventVersion:1;
  eventId:string;
  expenseId:string;
  productName:string;
  purchaseDate:string;
  amount:number;
  currency:string;
  category?:string;
  subcategory?:string;
  source:"my-expenses-user-confirmed";
  confidence:1;
  createdAt:string;
};

const SNAPSHOT_KEY="antony-app-data-v5";
const RADAR_URL_KEY="cego-price-radar-url";
const makeId=()=>`purchase-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export default function RadarBridge(){
  const [snapshot,setSnapshot]=useState<Snapshot>({});
  const [radarUrl,setRadarUrl]=useState("");
  const [editing,setEditing]=useState<Expense|null>(null);
  const [productName,setProductName]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    try{
      const raw=localStorage.getItem(SNAPSHOT_KEY);
      if(raw)setSnapshot(JSON.parse(raw));
      setRadarUrl(localStorage.getItem(RADAR_URL_KEY)||"");
    }catch{/* keep bridge usable even if old storage is malformed */}
  },[]);

  const categories=useMemo(()=>new Map((snapshot.categories||[]).map(c=>[c.id,c.name])),[snapshot.categories]);
  const recent=useMemo(()=>(snapshot.expenses||[]).filter(e=>e.expenseType!=="travel").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20),[snapshot.expenses]);

  function begin(expense:Expense){
    setEditing(expense);
    setProductName((expense.note||expense.subcategory||categories.get(expense.categoryId)||"").trim());
    setMessage("");
  }

  function saveRadarUrl(value:string){
    setRadarUrl(value);
    try{localStorage.setItem(RADAR_URL_KEY,value.trim())}catch{}
  }

  function confirm(){
    if(!editing||!productName.trim())return;
    const event:PurchaseEvent={
      type:"purchase.confirmed",eventVersion:1,eventId:makeId(),expenseId:editing.id,
      productName:productName.trim(),purchaseDate:editing.date,amount:Number(editing.amount)||0,
      currency:editing.currency||"HKD",category:categories.get(editing.categoryId),subcategory:editing.subcategory,
      source:"my-expenses-user-confirmed",confidence:1,createdAt:new Date().toISOString()
    };
    const encoded=encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(event)))));
    const base=radarUrl.trim().replace(/\/$/,"");
    if(base){
      localStorage.setItem(RADAR_URL_KEY,base);
      window.location.href=`${base}/expenses-bridge.html#event=${encoded}`;
      return;
    }
    navigator.clipboard?.writeText(JSON.stringify(event,null,2)).then(()=>setMessage("已建立 purchase.confirmed；設定 Radar 網址後可以一鍵送過去。"));
  }

  return <main style={{maxWidth:760,margin:"0 auto",padding:"24px 16px 80px",fontFamily:"-apple-system,BlinkMacSystemFont,'PingFang HK',sans-serif"}}>
    <p style={{fontSize:12,fontWeight:800,color:"#2f8f66",letterSpacing:1}}>MY EXPENSES × C•E•GO</p>
    <h1 style={{margin:"6px 0",fontSize:28}}>🧾 → 📡 購買確認 Bridge</h1>
    <p style={{color:"#6f7c75",lineHeight:1.6}}>搜尋唔代表買咗。只有你喺呢度確認一筆真正支出係某件貨，先會送 <b>purchase.confirmed</b> 去 Price Radar。</p>

    <section style={{background:"white",border:"1px solid #e5ece7",borderRadius:18,padding:16,margin:"18px 0"}}>
      <label style={{display:"block",fontWeight:750,fontSize:13}}>Price Radar 網址（只需設定一次）</label>
      <input value={radarUrl} onChange={e=>saveRadarUrl(e.target.value)} placeholder="https://你的-price-radar-網址" style={{width:"100%",marginTop:8,padding:12,border:"1px solid #dfe7e1",borderRadius:12}} />
      <small style={{display:"block",marginTop:8,color:"#7b8981"}}>兩個 App 保持獨立；只用 URL fragment 傳送你明確確認嘅單一購買事件，唔會傳整份支出紀錄。</small>
    </section>

    <h2 style={{fontSize:18}}>最近日常支出</h2>
    <div style={{display:"grid",gap:10}}>{recent.length?recent.map(e=><button key={e.id} onClick={()=>begin(e)} style={{textAlign:"left",background:"white",border:"1px solid #e5ece7",borderRadius:16,padding:14,cursor:"pointer"}}>
      <strong>{categories.get(e.categoryId)||"未分類"}{e.subcategory?` · ${e.subcategory}`:""}</strong>
      <div style={{marginTop:5,color:"#66736c",fontSize:13}}>{e.date} · {e.currency} {Number(e.amount).toLocaleString()} {e.note?`· ${e.note}`:""}</div>
      <div style={{marginTop:8,color:"#2f8f66",fontWeight:750,fontSize:12}}>確認呢筆包含常買貨品 →</div>
    </button>):<p style={{color:"#7b8981"}}>暫時讀唔到日常支出。</p>}</div>

    {editing&&<div style={{position:"fixed",inset:0,background:"#10201888",display:"flex",alignItems:"end",justifyContent:"center",zIndex:20}}>
      <div style={{width:"100%",maxWidth:760,background:"#f7faf8",borderRadius:"24px 24px 0 0",padding:"20px 18px 28px"}}>
        <h2 style={{marginTop:0}}>確認真正買咗乜</h2>
        <p style={{fontSize:13,color:"#66736c"}}>{editing.date} · {editing.currency} {Number(editing.amount).toLocaleString()}</p>
        <label style={{fontSize:13,fontWeight:750}}>貨品名稱／規格</label>
        <input autoFocus value={productName} onChange={e=>setProductName(e.target.value)} placeholder="例如：維記鮮奶 946ml" style={{width:"100%",margin:"8px 0 14px",padding:13,border:"1px solid #dce5df",borderRadius:12}} />
        <button onClick={confirm} disabled={!productName.trim()} style={{width:"100%",border:0,borderRadius:14,padding:14,background:"#2f8f66",color:"white",fontWeight:800}}>✓ 確認已買，送去 Price Radar</button>
        <button onClick={()=>setEditing(null)} style={{width:"100%",border:0,background:"transparent",padding:13,color:"#66736c"}}>取消</button>
        {message&&<p style={{fontSize:12,color:"#2f8f66"}}>{message}</p>}
      </div>
    </div>}
  </main>;
}
