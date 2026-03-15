import { AuthLogRepository } from "@/src/repositories/authLogRepository";
import { SerialRepository } from "@/src/repositories/serialRepository";
import type { ConsumeSerialResult } from "@/src/repositories/serialRepository";
import { UserRepository } from "@/src/repositories/userRepository";
import { normalizeJapaneseName } from "@/src/lib/nameNormalizer";
import { getLineService } from "@/src/services/line";
import { env } from "@/src/lib/env";

export type VerifySerialInput = {
  serialCode: string;
  lineUserId: string;
  name: string;
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

function normalizeInputName(name: string): string {
  return normalizeJapaneseName(name);
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
    const lineUserId = normalizeUserId(input.lineUserId);
    const serialCode = normalizeSerialCode(input.serialCode);
    const name = input.name.trim();
    const normalizedInputName = normalizeInputName(name);

    if (!lineUserId || !serialCode || !normalizedInputName) {
      throw new Error("lineUserId, serialCode and name are required");
    }

    const boundUser = await this.userRepository.findByLineUserId(lineUserId);

    const serial = await this.serialRepository.findByCode(serialCode);

    if (!serial) {
      const logId = await this.authLogRepository.create({
        lineUserId,
        serialCode,
        result: "invalid",
        message: "シリアルIDが無効です",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (!serial.targetUserUuid) {
      const logId = await this.authLogRepository.create({
        lineUserId,
        serialCode,
        result: "error",
        message: "シリアルに対象ユーザーが設定されていません。運営へお問い合わせください。",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    const targetUser = await this.userRepository.findById(serial.targetUserUuid);

    if (!targetUser) {
      const logId = await this.authLogRepository.create({
        lineUserId,
        serialCode,
        result: "error",
        message: "シリアルに紐づくユーザーが見つかりません。運営へお問い合わせください。",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    const normalizedStoredName = targetUser.name ? normalizeInputName(targetUser.name) : "";

    if (!normalizedStoredName || normalizedStoredName !== normalizedInputName) {
      const logId = await this.authLogRepository.create({
        userId: targetUser.userUuid,
        lineUserId,
        serialCode,
        result: "invalid",
        message: "氏名またはシリアルIDが無効です",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (boundUser && boundUser.userUuid !== targetUser.userUuid) {
      const logId = await this.authLogRepository.create({
        userId: boundUser.userUuid,
        lineUserId,
        serialCode,
        result: "invalid",
        message: "このLINEアカウントは別のユーザーに紐づいています",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    let user = boundUser;

    if (!user) {
      const bindResult = await this.userRepository.bindLineUserIdOnFirstAuth({
        userUuid: targetUser.userUuid,
        lineUserId
      });

      if (bindResult.kind === "not_found" || bindResult.kind === "line_user_conflict") {
        const logId = await this.authLogRepository.create({
          userId: targetUser.userUuid,
          lineUserId,
          serialCode,
          result: "invalid",
          message: "LINEアカウントの紐付けに失敗しました。運営へお問い合わせください。",
          lineSendStatus: "skipped"
        });

        return { logId };
      }

      user = bindResult.user;
    }

    const consumeResult = await this.serialRepository.consumeIfUnused(serialCode);

    if (consumeResult.kind === "not_found" || consumeResult.kind === "invalid") {
      const logId = await this.authLogRepository.create({
        userId: user.userUuid,
        lineUserId,
        serialCode,
        result: "invalid",
        message: "シリアルIDが無効です",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (consumeResult.kind === "used") {
      const logId = await this.authLogRepository.create({
        userId: user.userUuid,
        lineUserId,
        serialCode,
        result: "used",
        message: "このシリアルIDは既に使用済みです",
        lineSendStatus: "skipped"
      });

      return { logId };
    }

    if (isResultDataMissing(consumeResult)) {
      const logId = await this.authLogRepository.create({
        userId: user.userUuid,
        lineUserId,
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
      lineUserId,
      resultImageUrl: consumeResult.serial.resultImageUrl,
      purchaseLink: resolvedPurchaseLink
    });

    if (!lineResult.ok) {
      const logId = await this.authLogRepository.create({
        userId: user.userUuid,
        lineUserId,
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
      userId: user.userUuid,
      lineUserId,
      serialCode,
      result: "success",
      message: "認証が完了しました。診断結果をご確認ください",
      lineSendStatus: lineResult.status,
      lineRequestId: lineResult.lineRequestId
    });

    return { logId };
  }
}
