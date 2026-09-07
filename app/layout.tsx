import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Expenses",
  description: "簡單、清晰的個人支出記帳 App。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <a
          href="/receipt"
          aria-label="掃描單據輸入"
          style={{
            position: "fixed",
            right: 16,
            bottom: 88,
            zIndex: 40,
            borderRadius: 999,
            padding: "10px 14px",
            background: "#173f34",
            color: "#fff",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 800,
            boxShadow: "0 8px 22px rgba(23,63,52,.22)",
          }}
        >
          🧾 掃描單據
        </a>
      </body>
    </html>
  );
}
