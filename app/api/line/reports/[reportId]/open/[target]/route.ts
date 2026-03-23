import { NextResponse } from "next/server";
import { env } from "@/src/lib/env";
import { ReportRepository } from "@/src/repositories/reportRepository";
import { isLineResultLinkTarget } from "@/src/services/line/lineFlexMessage";

type RouteContext = {
  params: Promise<{
    reportId: string;
    target: string;
  }>;
};

function resolveReportOpenUrl(
  target: "pdf" | "purchase",
  report: {
    resultPdfUrl: string;
    purchaseUrl: string;
  }
): string | null {
  if (target === "pdf") {
    return report.resultPdfUrl || null;
  }

  return report.purchaseUrl || env.PURCHASE_LINK_DEFAULT || null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { reportId, target } = await context.params;

    if (!isLineResultLinkTarget(target)) {
      return NextResponse.json({ ok: false, message: "invalid target" }, { status: 404 });
    }

    const reportRepository = new ReportRepository();
    const report = await reportRepository.findById(reportId);

    if (!report) {
      return NextResponse.json({ ok: false, message: "report not found" }, { status: 404 });
    }

    const destinationUrl = resolveReportOpenUrl(target, report);
    if (!destinationUrl) {
      return NextResponse.json({ ok: false, message: "destination URL is missing" }, { status: 409 });
    }

    try {
      if (target === "pdf") {
        await reportRepository.markPdfClicked(report.id);
      } else {
        await reportRepository.markUrlClicked(report.id);
      }
    } catch {
      // Tracking failure should not block the redirect from LINE.
    }

    return NextResponse.redirect(destinationUrl, 307);
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
