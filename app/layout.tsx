import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "栄養診断MVP",
  description: "シリアル認証と診断結果配信のMVP"
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
