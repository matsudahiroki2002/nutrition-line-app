import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import type { ReportEntity } from "@/src/domain/types";

const REPORTS_COLLECTION = "reports";
const SERIAL_ID_PATTERN = /^[A-Za-z0-9]{6}$/;

type ReportDoc = {
  createdAt: Timestamp;
  birthday: string;
  userName: string;
  serialId: string;
  purchaseUrl: string;
  storagePath: string;
  resultPdfUrl: string;
  lineRegistrationFlag?: boolean;
  pdfSendFlag?: boolean;
  lineUserId?: string | null;
  pdfClickedFlag?: boolean;
  urlClickedFlag?: boolean;
  updatedAt: Timestamp;
};

export type BindLineUserIdResult =
  | { kind: "bound"; report: ReportEntity }
  | { kind: "already_bound"; report: ReportEntity }
  | { kind: "line_user_conflict"; report: ReportEntity }
  | { kind: "not_found" };

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return fallback;
}

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function toReportEntity(id: string, doc: Partial<ReportDoc>): ReportEntity {
  const now = new Date();

  return {
    id,
    createdAt: toDate(doc.createdAt, now),
    birthday: sanitizeString(doc.birthday),
    userName: sanitizeString(doc.userName),
    serialId: sanitizeString(doc.serialId),
    purchaseUrl: sanitizeString(doc.purchaseUrl),
    storagePath: sanitizeString(doc.storagePath),
    resultPdfUrl: sanitizeString(doc.resultPdfUrl),
    lineRegistrationFlag: doc.lineRegistrationFlag === true,
    pdfSendFlag: doc.pdfSendFlag === true,
    lineUserId: sanitizeString(doc.lineUserId) || null,
    pdfClickedFlag: doc.pdfClickedFlag === true,
    urlClickedFlag: doc.urlClickedFlag === true,
    updatedAt: toDate(doc.updatedAt, now)
  };
}

function normalizeUserName(userName: string): string {
  return userName.trim();
}

function normalizeSerialId(serialId: string): string {
  return serialId.trim();
}

export function isValidSerialId(serialId: string): boolean {
  return SERIAL_ID_PATTERN.test(serialId.trim());
}

export class ReportRepository {
  private db = getDb();

  async findById(reportId: string): Promise<ReportEntity | null> {
    const normalizedId = reportId.trim();
    if (!normalizedId) {
      return null;
    }

    const snapshot = await this.db.collection(REPORTS_COLLECTION).doc(normalizedId).get();

    if (!snapshot.exists) {
      return null;
    }

    return toReportEntity(snapshot.id, snapshot.data() as ReportDoc);
  }

  async findByUserNameAndSerialId(input: { userName: string; serialId: string }): Promise<ReportEntity[]> {
    const userName = normalizeUserName(input.userName);
    const serialId = normalizeSerialId(input.serialId);

    if (!userName || !serialId) {
      return [];
    }

    const snapshot = await this.db
      .collection(REPORTS_COLLECTION)
      .where("userName", "==", userName)
      .where("serialId", "==", serialId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => toReportEntity(doc.id, doc.data() as ReportDoc));
  }

  async bindLineUserIdOnFirstAuth(input: { reportId: string; lineUserId: string }): Promise<BindLineUserIdResult> {
    const reportId = input.reportId.trim();
    const lineUserId = input.lineUserId.trim();

    if (!reportId || !lineUserId) {
      return { kind: "not_found" };
    }

    const reportRef = this.db.collection(REPORTS_COLLECTION).doc(reportId);

    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reportRef);

      if (!snapshot.exists) {
        return { kind: "not_found" as const };
      }

      const current = toReportEntity(snapshot.id, snapshot.data() as ReportDoc);
      const currentLineUserId = current.lineUserId?.trim() || null;
      const now = new Date();

      if (!currentLineUserId) {
        transaction.set(
          reportRef,
          {
            lineUserId,
            lineRegistrationFlag: true,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return {
          kind: "bound" as const,
          report: {
            ...current,
            lineUserId,
            lineRegistrationFlag: true,
            updatedAt: now
          }
        };
      }

      if (currentLineUserId !== lineUserId) {
        return {
          kind: "line_user_conflict" as const,
          report: current
        };
      }

      if (!current.lineRegistrationFlag) {
        transaction.set(
          reportRef,
          {
            lineRegistrationFlag: true,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return {
          kind: "already_bound" as const,
          report: {
            ...current,
            lineRegistrationFlag: true,
            updatedAt: now
          }
        };
      }

      return {
        kind: "already_bound" as const,
        report: current
      };
    });
  }

  async markPdfSent(reportId: string): Promise<void> {
    await this.updateFlags(reportId, { pdfSendFlag: true });
  }

  async markPdfClicked(reportId: string): Promise<void> {
    await this.updateFlags(reportId, { pdfClickedFlag: true });
  }

  async markUrlClicked(reportId: string): Promise<void> {
    await this.updateFlags(reportId, { urlClickedFlag: true });
  }

  async upsertSeed(report: {
    birthday: string;
    userName: string;
    serialId: string;
    purchaseUrl: string;
    storagePath: string;
    resultPdfUrl: string;
    lineRegistrationFlag?: boolean;
    pdfSendFlag?: boolean;
    lineUserId?: string | null;
    pdfClickedFlag?: boolean;
    urlClickedFlag?: boolean;
  }): Promise<void> {
    const birthday = report.birthday.trim();
    const userName = normalizeUserName(report.userName);
    const serialId = normalizeSerialId(report.serialId);
    const lineUserId = report.lineUserId?.trim() || null;

    if (!birthday || !userName || !serialId || !isValidSerialId(serialId)) {
      throw new Error("Invalid report seed row: birthday, userName and serialId(6 alphanumeric chars) are required");
    }

    const matches = await this.findByUserNameAndSerialId({ userName, serialId });
    if (matches.length > 1) {
      throw new Error(`Duplicate userName+serialId already exists in reports: ${userName}/${serialId}`);
    }

    const payload = {
      birthday,
      userName,
      serialId,
      purchaseUrl: report.purchaseUrl.trim(),
      storagePath: report.storagePath.trim(),
      resultPdfUrl: report.resultPdfUrl.trim(),
      lineRegistrationFlag: report.lineRegistrationFlag ?? Boolean(lineUserId),
      pdfSendFlag: report.pdfSendFlag ?? false,
      lineUserId,
      pdfClickedFlag: report.pdfClickedFlag ?? false,
      urlClickedFlag: report.urlClickedFlag ?? false,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (matches.length === 1) {
      await this.db.collection(REPORTS_COLLECTION).doc(matches[0].id).set(payload, { merge: true });
      return;
    }

    await this.db.collection(REPORTS_COLLECTION).add({
      ...payload,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  private async updateFlags(
    reportId: string,
    flags: Partial<Pick<ReportDoc, "pdfSendFlag" | "pdfClickedFlag" | "urlClickedFlag">>
  ): Promise<void> {
    const normalizedId = reportId.trim();
    if (!normalizedId) {
      throw new Error("reportId is required");
    }

    const reportRef = this.db.collection(REPORTS_COLLECTION).doc(normalizedId);
    const snapshot = await reportRef.get();

    if (!snapshot.exists) {
      throw new Error("report not found");
    }

    await reportRef.set(
      {
        ...flags,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }
}
