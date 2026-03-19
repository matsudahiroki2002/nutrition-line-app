import { NextResponse } from "next/server";
import { z } from "zod";
import { ReportRepository } from "@/src/repositories/reportRepository";

const requestSchema = z.object({
  event: z.enum(["pdf_clicked", "url_clicked"])
});

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? "invalid request"
        },
        { status: 400 }
      );
    }

    const reportRepository = new ReportRepository();
    if (parsed.data.event === "pdf_clicked") {
      await reportRepository.markPdfClicked(reportId);
    } else {
      await reportRepository.markUrlClicked(reportId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    const status = message === "report not found" ? 404 : 500;
    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status }
    );
  }
}
