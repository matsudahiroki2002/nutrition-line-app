import { NextResponse } from "next/server";
import { z } from "zod";
import { VerifySerialUseCase } from "@/src/usecases/verifySerialUseCase";

const requestSchema = z.object({
  serialId: z.string().regex(/^[A-Za-z0-9]{6}$/, "serialId must be 6 alphanumeric chars"),
  lineUserId: z.string().min(1, "lineUserId is required"),
  userName: z.string().trim().min(1, "userName is required").max(80)
});

export async function POST(request: Request) {
  try {
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

    const useCase = new VerifySerialUseCase();
    const output = await useCase.execute({
      serialId: parsed.data.serialId,
      lineUserId: parsed.data.lineUserId,
      userName: parsed.data.userName
    });

    if (output.result !== "success") {
      const status = output.result === "invalid" ? 400 : 409;
      return NextResponse.json(
        {
          ok: false,
          result: output.result,
          message: output.message,
          reportId: output.reportId
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      reportId: output.reportId,
      result: output.result,
      message: output.message
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server error";
    return NextResponse.json(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}
