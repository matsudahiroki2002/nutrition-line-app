import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import type { SerialEntity, SerialStatus } from "@/src/domain/types";

const SERIALS_COLLECTION = "serials";

type SerialDoc = {
  serialCode: string;
  status: SerialStatus;
  resultPdfUrl: string;
  purchaseLink: string;
  targetUserUuid?: string | null;
  usedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ConsumeSerialResult =
  | { kind: "consumed"; serial: SerialEntity }
  | { kind: "not_found" }
  | { kind: "used"; serial: SerialEntity }
  | { kind: "invalid"; serial: SerialEntity };

function normalizeSerial(serialCode: string): string {
  return serialCode.trim().toUpperCase();
}

function toSerialEntity(id: string, doc: SerialDoc): SerialEntity {
  return {
    id,
    serialCode: doc.serialCode,
    status: doc.status,
    resultPdfUrl: doc.resultPdfUrl,
    purchaseLink: doc.purchaseLink,
    targetUserUuid: doc.targetUserUuid ?? null,
    usedAt: doc.usedAt?.toDate() ?? null,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate()
  };
}

export class SerialRepository {
  private db = getDb();

  private serialDocRef(serialCode: string) {
    return this.db.collection(SERIALS_COLLECTION).doc(normalizeSerial(serialCode));
  }

  async findByCode(serialCode: string): Promise<SerialEntity | null> {
    const ref = this.serialDocRef(serialCode);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return null;
    }

    return toSerialEntity(snapshot.id, snapshot.data() as SerialDoc);
  }

  async consumeIfUnused(serialCode: string): Promise<ConsumeSerialResult> {
    const ref = this.serialDocRef(serialCode);

    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        return { kind: "not_found" };
      }

      const doc = snapshot.data() as SerialDoc;
      const serial = toSerialEntity(snapshot.id, doc);

      if (doc.status === "used") {
        return { kind: "used", serial };
      }

      if (doc.status === "invalid") {
        return { kind: "invalid", serial };
      }

      transaction.update(ref, {
        status: "used",
        usedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return {
        kind: "consumed",
        serial: {
          ...serial,
          status: "used",
          usedAt: new Date(),
          updatedAt: new Date()
        }
      };
    });
  }

  async upsertSeed(
    serial: {
      serialCode: string;
      status: SerialStatus;
      resultPdfUrl: string;
      purchaseLink: string;
      targetUserUuid?: string | null;
    }
  ): Promise<void> {
    const normalized = normalizeSerial(serial.serialCode);
    const isUsed = serial.status === "used";
    const ref = this.db.collection(SERIALS_COLLECTION).doc(normalized);

    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const common = {
        serialCode: normalized,
        status: serial.status,
        resultPdfUrl: serial.resultPdfUrl,
        purchaseLink: serial.purchaseLink,
        targetUserUuid: serial.targetUserUuid ?? null,
        usedAt: isUsed ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (!snapshot.exists) {
        transaction.set(ref, {
          ...common,
          createdAt: FieldValue.serverTimestamp()
        });
        return;
      }

      transaction.set(ref, common, { merge: true });
    });
  }
}
