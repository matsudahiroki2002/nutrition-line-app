import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <div className="card stack">
        <span className="badge">Nutrition Diagnosis MVP</span>
        <h1>診断結果の受け取り手続きを始めましょう</h1>
        <p>
          チラシに記載されたシリアルIDを入力すると、認証後に詳細診断結果とおすすめ商品の案内を受け取れます。
        </p>
        <Link href="/serial" className="linkButton">
          シリアルIDを入力する
        </Link>
        <p className="subtle">
          本ページはMVP版です。診断は健康管理の参考情報であり、医療行為ではありません。
        </p>
      </div>
    </main>
  );
}
