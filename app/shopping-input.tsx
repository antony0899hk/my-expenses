"use client";

import { createContext, useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ShoppingContext = createContext<File | null>(null);
export const useShoppingFile = () => useContext(ShoppingContext);

export default function ShoppingInput({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  return <ShoppingContext.Provider value={file}>{children}{pathname !== "/receipt" && <label style={{ position: "fixed", right: 16, bottom: 88, zIndex: 40, borderRadius: 999, padding: "10px 14px", background: "#173f34", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
    🧾 購物入帳
    <input aria-label="購物入帳：拍照或選擇圖片" type="file" accept="image/*" style={{ display: "none" }} onChange={event => {
      const chosen = event.target.files?.[0];
      if (!chosen) return;
      setFile(chosen);
      event.target.value = "";
      router.push("/receipt");
    }} />
  </label>}</ShoppingContext.Provider>;
}
