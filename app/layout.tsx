import type { Metadata } from "next";
import "./globals.css";
import "./enrichment.css";

export const metadata: Metadata = {
  title: "词间 · Wordlight | 四级单词，每次五分钟",
  description: "在一个小问题里，重新遇见一个单词。支持离线学习、听音辨认、造句与间隔复习。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "词间", statusBarStyle: "default" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#152947" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
