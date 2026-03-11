import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { AuthLogEntity, AuthResult, LineSendStatus } from "@/src/domain/types";
import { getDb } from "@/src/lib/firebaseAdmin";

const COLLECTION_NAME = "authLogs";

type AuthLogDoc = {
  userId: string;
  serialCode: string;
  result: AuthResult;
  message: string;
  lineSendStatus: LineSendStatus;
  lineErrorCode?: string | null;
  lineRequestId?: string | null;
  createdAt: Timestamp;
};

function toEntity(id: string, doc: AuthLogDoc): AuthLogEntity {
  return {
    id,
    userId: doc.userId,
    serialCode: doc.serialCode,
    result: doc.result,
    message: doc.message,
    lineSendStatus: doc.lineSendStatus,
    lineErrorCode: doc.lineErrorCode ?? null,
    lineRequestId: doc.lineRequestId ?? null,
    createdAt: doc.createdAt.toDate()
  };
}

export class AuthLogRepository {
  private db = getDb();

  async create(input: {
    userId: string;
    serialCode: string;
    result: AuthResult;
    message: string;
    lineSendStatus: LineSendStatus;
    lineErrorCode?: string;
    lineRequestId?: string;
  }): Promise<string> {
    const ref = await this.db.collection(COLLECTION_NAME).add({
      userId: input.userId,
      serialCode: input.serialCode,
      result: input.result,
      message: input.message,
      lineSendStatus: input.lineSendStatus,
      lineErrorCode: input.lineErrorCode ?? null,
      lineRequestId: input.lineRequestId ?? null,
      createdAt: FieldValue.serverTimestamp()
    });

    return ref.id;
  }

  async findById(logId: string): Promise<AuthLogEntity | null> {
    const snapshot = await this.db.collection(COLLECTION_NAME).doc(logId).get();

    if (!snapshot.exists) {
      return null;
    }

    return toEntity(snapshot.id, snapshot.data() as AuthLogDoc);
  }
}
