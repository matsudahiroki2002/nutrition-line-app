import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthLogRepository } from "@/src/repositories/authLogRepository";
import { SerialRepository } from "@/src/repositories/serialRepository";

type PageProps = {
  params: Promise<{
    logId: string;
  }>;
};

const statusMap = {
  success: {
    title: "認証が完了しました",
    className: "ok",
    fallbackMessage: "詳細診断結果をご確認ください。"
  },
  invalid: {
    title: "シリアルIDが無効です",
    className: "danger",
    fallbackMessage: "入力内容をご確認の上、再度お試しください。"
  },
  used: {
    title: "このシリアルは使用済みです",
    className: "danger",
    fallbackMessage: "すでに認証済みのシリアルIDです。"
  },
  error: {
    title: "処理中にエラーが発生しました",
    className: "danger",
    fallbackMessage: "時間をおいて再度お試しください。"
  }
} as const;

export default async function ResultPage({ params }: PageProps) {
  const { logId } = await params;

  const logRepository = new AuthLogRepository();
  const serialRepository = new SerialRepository();

  const log = await logRepository.findById(logId);

  if (!log) {
    notFound();
  }

  const serial = await serialRepository.findByCode(log.userId, log.serialCode);

  const statusView = statusMap[log.result];
  const canShowImage = log.result === "success" && Boolean(serial?.resultImageUrl);
  const canShowPurchase = log.result === "success" && Boolean(serial?.purchaseLink);

  return (
    <main className="main">
      <div className="card stack">
        <span className="badge">Step 2</span>
        <h2>{statusView.title}</h2>
        <p className={`status ${statusView.className}`}>{log.message || statusView.fallbackMessage}</p>

        <div className="stack" style={{ gap: 8 }}>
          <p className="subtle">LINE User ID: {log.userId || "-"}</p>
          <p className="subtle">シリアルID: {log.serialCode || "-"}</p>
          <p className="subtle">送信ステータス: {log.lineSendStatus}</p>
        </div>

        {canShowImage && (
          <div className="stack">
            <p>詳細診断結果</p>
            {/* MVPでは公開URL画像をそのまま表示。Storage署名URLに差し替え可能。 */}
            <img src={serial?.resultImageUrl ?? ""} alt="診断結果画像" className="resultImage" />
          </div>
        )}

        {canShowPurchase && (
          <a href={serial?.purchaseLink ?? "#"} target="_blank" rel="noopener noreferrer" className="linkButton">
            おすすめサプリを確認する
          </a>
        )}

        <div className="footerLinks">
          <Link href="/serial" className="outlineBtn">
            別のシリアルを入力する
          </Link>
          <Link href="/" className="outlineBtn">
            入口ページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
