import { ReportRepository, isValidSerialId } from "@/src/repositories/reportRepository";
import { getLineService } from "@/src/services/line";
import { env } from "@/src/lib/env";
import type { AuthResult } from "@/src/domain/types";

export type VerifySerialInput = {
  serialId: string;
  lineUserId: string;
  userName: string;
};

export type VerifySerialOutput = {
  result: AuthResult;
  message: string;
  reportId?: string;
};

function normalizeSerialId(serialId: string): string {
  return serialId.trim();
}

function normalizeUserId(lineUserId: string): string {
  return lineUserId.trim();
}

function normalizeUserName(userName: string): string {
  return userName.trim();
}

export class VerifySerialUseCase {
  private reportRepository = new ReportRepository();

  async execute(input: VerifySerialInput): Promise<VerifySerialOutput> {
    const lineUserId = normalizeUserId(input.lineUserId);
    const serialId = normalizeSerialId(input.serialId);
    const userName = normalizeUserName(input.userName);

    if (!lineUserId || !serialId || !userName) {
      throw new Error("lineUserId, serialId and userName are required");
    }

    if (!isValidSerialId(serialId)) {
      return {
        result: "invalid",
        message: "シリアルIDの形式が不正です。英数字6文字で入力してください。"
      };
    }

    const reports = await this.reportRepository.findByUserNameAndSerialId({ userName, serialId });

    if (reports.length === 0) {
      return {
        result: "invalid",
        message: "氏名またはシリアルIDが無効です。"
      };
    }

    if (reports.length > 1) {
      return {
        result: "error",
        message:
          "同一の氏名とシリアルIDのレコードが複数存在します。サポートへお問い合わせください。（duplicate userName + serialId）"
      };
    }

    const report = reports[0];
    const bindResult = await this.reportRepository.bindLineUserIdOnFirstAuth({
      reportId: report.id,
      lineUserId
    });

    if (bindResult.kind === "not_found") {
      return {
        result: "error",
        message: "対象レポートが見つかりません。時間をおいて再度お試しください。"
      };
    }

    if (bindResult.kind === "line_user_conflict") {
      return {
        result: "invalid",
        message: "このレポートは別のLINEアカウントに紐づいているため利用できません。"
      };
    }

    const resolvedPurchaseUrl = report.purchaseUrl || env.PURCHASE_LINK_DEFAULT || "";
    if (!report.resultPdfUrl || !resolvedPurchaseUrl) {
      return {
        result: "error",
        message: "診断結果データが不足しています。運営へお問い合わせください。"
      };
    }

    const lineService = getLineService();
    const lineResult = await lineService.sendResultBundle({
      serialId,
      lineUserId,
      resultPdfUrl: report.resultPdfUrl,
      purchaseUrl: resolvedPurchaseUrl
    });

    if (!lineResult.ok) {
      return {
        result: "error",
        message: `認証は完了しましたが通知送信に失敗しました: ${lineResult.message}`,
        reportId: report.id
      };
    }

    await this.reportRepository.markPdfSent(report.id);

    return {
      result: "success",
      message: "認証が完了しました。診断結果をご確認ください。",
      reportId: report.id
    };
  }
}
