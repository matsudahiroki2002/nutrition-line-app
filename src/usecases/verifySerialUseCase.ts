import { AuthLogRepository } from "@/src/repositories/authLogRepository";
import { SerialRepository } from "@/src/repositories/serialRepository";
import type { ConsumeSerialResult } from "@/src/repositories/serialRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { getLineService } from "@/src/services/line";
import { env } from "@/src/lib/env";

export type VerifySerialInput = {
  serialCode: string;
  lineUserId: string;
};

export type VerifySerialOutput = {
  logId: string;
};

function normalizeSerialCode(serialCode: string): string {
  return serialCode.trim().toUpperCase();
}

function normalizeUserId(lineUserId: string): string {
  return lineUserId.trim();
}

function isResultDataMissing(consumeResult: ConsumeSerialResult): boolean {
  if (consumeResult.kind !== "consumed") {
    return false;
  }

  const imageUrl = consumeResult.serial.resultImageUrl;
  const purchaseLink = consumeResult.serial.purchaseLink || env.PURCHASE_LINK_DEFAULT;

  return !imageUrl || !purchaseLink;
}

export class VerifySerialUseCase {
  private serialRepository = new SerialRepository();
  private authLogRepository = new AuthLogRepository();
  private userRepository = new UserRepository();

  async execute(input: VerifySerialInput): Promise<VerifySerialOutput> {
    const userId = normalizeUserId(input.lineUserId);
    const serialCode = normalizeSerialCode(input.serialCode);

    if (!userId || !serialCode) {
      throw new Error("lineUserId and serialCode are required");
    }

    await this.userRepository.upsertActiveUser({
      userId,
      lineUserId: userId,
      displayName: null
    });

    const consumeResult = await this.serialRepository.consumeIfUnused(userId, serialCode);

    if (consumeResult.kind === "not_found" || consumeResult.kind === "invalid") {
      const logId = await this.authLogRepository.create({
        userId,
        serialCode,
        result: "invalid",
        message: "シリアルIDが無効です",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (consumeResult.kind === "used") {
      const logId = await this.authLogRepository.create({
        userId,
        serialCode,
        result: "used",
        message: "このシリアルIDは既に使用済みです",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (isResultDataMissing(consumeResult)) {
      const logId = await this.authLogRepository.create({
        userId,
        serialCode,
        result: "error",
        message: "診断結果の設定が不足しています。運営へお問い合わせください",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    const lineService = getLineService();
    const resolvedPurchaseLink = consumeResult.serial.purchaseLink || env.PURCHASE_LINK_DEFAULT || "";
    const lineResult = await lineService.sendResultBundle({
      serialCode,
      lineUserId: userId,
      resultImageUrl: consumeResult.serial.resultImageUrl,
      purchaseLink: resolvedPurchaseLink
    });

    if (!lineResult.ok) {
      const logId = await this.authLogRepository.create({
        userId,
        serialCode,
        result: "error",
        message: `認証は完了しましたが通知送信に失敗しました: ${lineResult.message}`,
        lineSendStatus: "failed",
        lineErrorCode: lineResult.lineErrorCode,
        lineRequestId: lineResult.lineRequestId
      });

      return { logId };
    }

    const logId = await this.authLogRepository.create({
      userId,
      serialCode,
      result: "success",
      message: "認証が完了しました。診断結果をご確認ください",
      lineSendStatus: lineResult.status,
      lineRequestId: lineResult.lineRequestId
    });

    return { logId };
  }
}
