"use client";

import { useEffect, useMemo, useState } from "react";

type Kind = "bug" | "data" | "question" | "idea";

const kindLabels: Record<Kind,string> = {
  bug: "功能錯誤",
  data: "資料錯誤",
  question: "使用問題",
  idea: "功能建議",
};

export default function FeedbackPage(){
  const [appName,setAppName]=useState("My Expenses");
  const [kind,setKind]=useState<Kind>("bug");
  const [message,setMessage]=useState("");
  const [steps,setSteps]=useState("");
  const [contact,setContact]=useState("");
  const [pageUrl,setPageUrl]=useState("");
  const [device,setDevice]=useState("");
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const source=params.get("app");
    if(source) setAppName(source);
    setPageUrl(document.referrer || window.location.origin);
    setDevice(navigator.userAgent);
  },[]);

  const report=useMemo(()=>[
    `App：${appName}`,
    `類型：${kindLabels[kind]}`,
    `問題／建議：${message || "（未填）"}`,
    steps ? `重現步驟：${steps}` : "",
    contact ? `聯絡方式：${contact}` : "",
    `來源頁面：${pageUrl || "未知"}`,
    `裝置／瀏覽器：${device || "未知"}`,
    `時間：${new Date().toLocaleString("zh-HK")}`,
  ].filter(Boolean).join("\n");

  async function copyReport(){
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(()=>setCopied(false),1800);
  }

  function openGitHub(){
    const title=`[${appName}] ${kindLabels[kind]}：${message.slice(0,50) || "使用者回報"}`;
    const body=encodeURIComponent(report);
    const url=`https://github.com/antony0899hk/my-expenses/issues/new?title=${encodeURIComponent(title)}&body=${body}`;
    window.open(url,"_blank","noopener,noreferrer");
  }

  return <main style={{minHeight:"100vh",background:"#f7f7f3",padding:"28px 18px 48px",fontFamily:"Arial, sans-serif",color:"#173f34"}}>
    <div style={{maxWidth:640,margin:"0 auto",background:"#fff",borderRadius:24,padding:22,boxShadow:"0 12px 40px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:13,fontWeight:800,letterSpacing:1,opacity:.65}}>C•E•GO FEEDBACK HUB</div>
      <h1 style={{fontSize:28,margin:"8px 0 8px"}}>回報問題／提出建議</h1>
      <p style={{margin:"0 0 22px",lineHeight:1.6,color:"#4d665f"}}>多謝你幫我哋改善。簡單講發生咩事就得，系統會自動附上基本裝置及頁面資料。</p>

      <label style={labelStyle}>App／網站</label>
      <input value={appName} onChange={e=>setAppName(e.target.value)} style={inputStyle}/>

      <label style={labelStyle}>類型</label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:16}}>
        {(Object.keys(kindLabels) as Kind[]).map(item=><button key={item} onClick={()=>setKind(item)} type="button" style={{...choiceStyle,background:kind===item?"#173f34":"#eef3f0",color:kind===item?"#fff":"#173f34"}}>{kindLabels[item]}</button>)}
      </div>

      <label style={labelStyle}>發生咩事？*</label>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="例如：按『新增支出』之後冇反應" style={{...inputStyle,minHeight:120,resize:"vertical"}}/>

      <label style={labelStyle}>點樣可以重現？（選填）</label>
      <textarea value={steps} onChange={e=>setSteps(e.target.value)} placeholder="例如：旅行模式 → 揀日本 → 新增支出 → 儲存" style={{...inputStyle,minHeight:90,resize:"vertical"}}/>

      <label style={labelStyle}>聯絡方式（選填）</label>
      <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Email / IG / 其他" style={inputStyle}/>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:22}}>
        <button type="button" disabled={!message.trim()} onClick={openGitHub} style={{...primaryStyle,opacity:message.trim()?1:.45}}>提交回報</button>
        <button type="button" onClick={copyReport} style={secondaryStyle}>{copied?"已複製 ✓":"複製回報內容"}</button>
      </div>

      <p style={{fontSize:12,lineHeight:1.5,color:"#718079",marginTop:16}}>第一版會將整理好嘅回報帶到 GitHub Issue 頁面提交；之後可再升級成完全內置提交、截圖上載同後台統計。</p>
      <a href="/" style={{display:"inline-block",marginTop:8,color:"#173f34",fontWeight:800,textDecoration:"none"}}>← 返回 App</a>
    </div>
  </main>;
}

const labelStyle:React.CSSProperties={display:"block",fontSize:13,fontWeight:800,margin:"15px 0 7px"};
const inputStyle:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid #d8e0dc",borderRadius:14,padding:"12px 13px",fontSize:16,background:"#fbfcfb",color:"#173f34",outline:"none"};
const choiceStyle:React.CSSProperties={border:0,borderRadius:14,padding:"11px 12px",fontSize:14,fontWeight:800,cursor:"pointer"};
const primaryStyle:React.CSSProperties={border:0,borderRadius:999,padding:"12px 18px",fontSize:15,fontWeight:900,background:"#173f34",color:"#fff",cursor:"pointer"};
const secondaryStyle:React.CSSProperties={border:"1px solid #cbd8d2",borderRadius:999,padding:"12px 18px",fontSize:15,fontWeight:800,background:"#fff",color:"#173f34",cursor:"pointer"};
