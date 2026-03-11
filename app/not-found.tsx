import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="main">
      <div className="card stack">
        <h2>結果が見つかりませんでした</h2>
        <p>URLが正しいか確認して、もう一度お試しください。</p>
        <Link href="/" className="linkButton">
          入口ページへ戻る
        </Link>
      </div>
    </main>
  );
}
