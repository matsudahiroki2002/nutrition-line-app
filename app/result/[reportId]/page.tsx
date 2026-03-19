import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportRepository } from "@/src/repositories/reportRepository";
import { ReportResultActions } from "@/src/components/reportResultActions";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function ResultPage({ params }: PageProps) {
  const { reportId } = await params;

  const reportRepository = new ReportRepository();
  const report = await reportRepository.findById(reportId);

  if (!report) {
    notFound();
  }

  const canShowPdf = Boolean(report.resultPdfUrl);

  return (
    <main className="main">
      <div className="card stack">
        <span className="badge">Step 2</span>
        <h2>認証が完了しました</h2>
        <p className="status ok">診断結果PDFを確認できます。必要に応じておすすめ商品の詳細もご覧ください。</p>

        {canShowPdf ? (
          <div className="stack">
            <p>診断結果PDF</p>
            <iframe
              src={report.resultPdfUrl}
              title="診断結果PDF"
              className="resultPdfFrame"
            />
          </div>
        ) : (
          <p className="subtle">診断結果PDFの表示準備中です。しばらくしてから再度お試しください。</p>
        )}

        <ReportResultActions
          reportId={report.id}
          pdfUrl={report.resultPdfUrl}
          purchaseUrl={report.purchaseUrl}
        />

        <div className="footerLinks">
          <Link href="/serial" className="outlineBtn">
            別のシリアルを確認する
          </Link>
        </div>
      </div>
    </main>
  );
}
