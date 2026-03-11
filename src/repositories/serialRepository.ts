import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import type { SerialEntity, SerialStatus } from "@/src/domain/types";

const USERS_COLLECTION = "users";
const SERIALS_SUBCOLLECTION = "serials";

type SerialDoc = {
  serialCode: string;
  status: SerialStatus;
  resultImageUrl: string;
  purchaseLink: string;
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

function toSerialEntity(userId: string, id: string, doc: SerialDoc): SerialEntity {
  return {
    id,
    userId,
    serialCode: doc.serialCode,
    status: doc.status,
    resultImageUrl: doc.resultImageUrl,
    purchaseLink: doc.purchaseLink,
    usedAt: doc.usedAt?.toDate() ?? null,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate()
  };
}

export class SerialRepository {
  private db = getDb();

  private serialDocRef(userId: string, serialCode: string) {
    return this.db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SERIALS_SUBCOLLECTION)
      .doc(normalizeSerial(serialCode));
  }

  async findByCode(userId: string, serialCode: string): Promise<SerialEntity | null> {
    const ref = this.serialDocRef(userId, serialCode);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return null;
    }

    return toSerialEntity(userId, snapshot.id, snapshot.data() as SerialDoc);
  }

  async consumeIfUnused(userId: string, serialCode: string): Promise<ConsumeSerialResult> {
    const ref = this.serialDocRef(userId, serialCode);

    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        return { kind: "not_found" };
      }

      const doc = snapshot.data() as SerialDoc;
      const serial = toSerialEntity(userId, snapshot.id, doc);

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
    userId: string,
    serial: {
      serialCode: string;
      status: SerialStatus;
      resultImageUrl: string;
      purchaseLink: string;
    }
  ): Promise<void> {
    const normalized = normalizeSerial(serial.serialCode);
    const isUsed = serial.status === "used";
    const ref = this.db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(SERIALS_SUBCOLLECTION)
      .doc(normalized);

    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const common = {
        serialCode: normalized,
        status: serial.status,
        resultImageUrl: serial.resultImageUrl,
        purchaseLink: serial.purchaseLink,
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
