import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Arena Bench",
  description: "公开大模型 API 性能测速与排行榜",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
