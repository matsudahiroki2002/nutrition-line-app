import { NextResponse } from "next/server";
import { z } from "zod";
import { VerifySerialUseCase } from "@/src/usecases/verifySerialUseCase";

const requestSchema = z.object({
  serialCode: z.string().min(1, "serialCode is required"),
  lineUserId: z.string().min(1, "lineUserId is required"),
  name: z.string().trim().min(1, "name is required").max(80)
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
      serialCode: parsed.data.serialCode,
      lineUserId: parsed.data.lineUserId,
      name: parsed.data.name
    });

    return NextResponse.json({
      ok: true,
      logId: output.logId
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
