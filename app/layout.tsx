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
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          // 浏览器兼容性检测
          (function() {
            try {
              eval('const test = (x) => x');
              if (!window.fetch || !window.Promise || !window.localStorage) throw new Error();
            } catch (e) {
              document.addEventListener('DOMContentLoaded', function() {
                document.body.innerHTML = '<div style="text-align:center;padding:50px 20px;font-family:sans-serif;"><h2 style="color:#1a2940;">浏览器版本过低</h2><p style="font-size:16px;color:#65748a;line-height:1.8;">请使用以下浏览器打开：</p><p style="font-size:15px;color:#315deb;">• 微信内置浏览器<br>• Safari / Chrome / Edge<br>• 或复制链接用手机默认浏览器打开</p><p style="margin-top:30px;font-size:14px;color:#8591a5;">当前浏览器不支持现代网页技术</p></div>';
              });
              throw new Error('不支持的浏览器');
            }

            // 加载超时提示
            var loadTimer = setTimeout(function() {
              if (!document.querySelector('.app-shell') && !document.querySelector('.loading-page')) {
                document.body.innerHTML = '<div style="text-align:center;padding:50px 20px;font-family:sans-serif;"><h2 style="color:#1a2940;">加载超时</h2><p style="font-size:16px;color:#65748a;line-height:1.8;margin:20px 0;">可能是网络问题，建议：</p><p style="font-size:15px;color:#315deb;">1. 切换到WiFi网络<br>2. 用微信或Safari打开<br>3. 关闭后重新打开</p><button onclick="location.reload()" style="margin-top:25px;padding:12px 24px;background:#315deb;color:white;border:none;border-radius:10px;font-size:15px;cursor:pointer;">重新加载</button></div>';
              }
            }, 15000);

            window.addEventListener('load', function() {
              clearTimeout(loadTimer);
            });
          })();
        `}} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
