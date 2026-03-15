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
    className: "ok"
  },
  invalid: {
    title: "認証できませんでした",
    className: "danger"
  },
  used: {
    title: "このシリアルは使用済みです",
    className: "danger"
  },
  error: {
    title: "処理中にエラーが発生しました",
    className: "danger"
  }
} as const;

function resolveDescription(result: keyof typeof statusMap, lineSendStatus: string): string {
  if (result === "success" && lineSendStatus === "failed") {
    return "認証は完了しましたが、LINE通知の送信に失敗しました。時間をおいて再度お試しください。";
  }

  if (result === "success") {
    return "診断結果PDFを確認できます。必要に応じておすすめ商品の詳細もご覧ください。";
  }

  if (result === "invalid") {
    return "氏名またはシリアルIDが一致しません。入力内容をご確認ください。";
  }

  if (result === "used") {
    return "このシリアルIDはすでに認証済みです。";
  }

  return "通信環境をご確認のうえ、時間をおいて再度お試しください。";
}

export default async function ResultPage({ params }: PageProps) {
  const { logId } = await params;

  const logRepository = new AuthLogRepository();
  const serialRepository = new SerialRepository();

  const log = await logRepository.findById(logId);

  if (!log) {
    notFound();
  }

  const serial = await serialRepository.findByCode(log.serialCode);

  const statusView = statusMap[log.result];
  const description = resolveDescription(log.result, log.lineSendStatus);
  const canShowPdf = log.result === "success" && Boolean(serial?.resultPdfUrl);
  const canShowPurchase = log.result === "success" && Boolean(serial?.purchaseLink);

  return (
    <main className="main">
      <div className="card stack">
        <span className="badge">Step 2</span>
        <h2>{statusView.title}</h2>
        <p className={`status ${statusView.className}`}>{description}</p>

        {canShowPdf && (
          <div className="stack">
            <p>診断結果PDF</p>
            <iframe
              src={serial?.resultPdfUrl ?? ""}
              title="診断結果PDF"
              className="resultPdfFrame"
            />
            <a
              href={serial?.resultPdfUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="outlineBtn"
            >
              PDFを開く
            </a>
          </div>
        )}

        {log.result === "success" && !canShowPdf && (
          <p className="subtle">診断結果PDFの表示準備中です。しばらくしてから再度お試しください。</p>
        )}

        {canShowPurchase && (
          <a href={serial?.purchaseLink ?? "#"} target="_blank" rel="noopener noreferrer" className="linkButton">
            おすすめサプリを確認する
          </a>
        )}

        <div className="footerLinks">
          <Link href="/serial" className="outlineBtn">
            もう一度入力する
          </Link>
        </div>
      </div>
    </main>
  );
}
