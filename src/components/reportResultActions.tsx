"use client";

type ReportResultActionsProps = {
  reportId: string;
  pdfUrl: string;
  purchaseUrl: string;
};

type ReportEventType = "pdf_clicked" | "url_clicked";

function trackReportEvent(reportId: string, event: ReportEventType) {
  void fetch(`/api/reports/${encodeURIComponent(reportId)}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ event }),
    keepalive: true
  }).catch(() => {
    // Tracking failure should not block user navigation.
  });
}

export function ReportResultActions({ reportId, pdfUrl, purchaseUrl }: ReportResultActionsProps) {
  const canShowPdf = Boolean(pdfUrl);
  const canShowPurchase = Boolean(purchaseUrl);

  return (
    <>
      {canShowPdf && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="outlineBtn"
          onClick={() => trackReportEvent(reportId, "pdf_clicked")}
        >
          PDFを開く
        </a>
      )}
      {canShowPurchase && (
        <a
          href={purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="linkButton"
          onClick={() => trackReportEvent(reportId, "url_clicked")}
        >
          おすすめサプリを確認する
        </a>
      )}
    </>
  );
}
