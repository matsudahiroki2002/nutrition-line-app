import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "栄養診断レポート受け取り",
  description: "氏名とシリアルIDで認証し、診断結果を確認できます。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
