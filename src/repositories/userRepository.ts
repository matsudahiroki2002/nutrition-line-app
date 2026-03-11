import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import type { UserEntity, UserStatus } from "@/src/domain/types";

const COLLECTION_NAME = "users";

type UserDoc = {
  lineUserId: string;
  lineAccountKey: string;
  displayName: string | null;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function toUserEntity(id: string, doc: UserDoc): UserEntity {
  return {
    id,
    lineUserId: doc.lineUserId,
    lineAccountKey: doc.lineAccountKey,
    displayName: doc.displayName,
    status: doc.status,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate()
  };
}

export class UserRepository {
  private db = getDb();

  async upsertActiveUser(input: {
    userId: string;
    lineUserId: string;
    lineAccountKey: string;
    displayName?: string | null;
  }): Promise<void> {
    const ref = this.db.collection(COLLECTION_NAME).doc(input.userId);

    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const common = {
        lineUserId: input.lineUserId,
        lineAccountKey: input.lineAccountKey,
        displayName: input.displayName ?? null,
        status: "active",
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

  async findById(userId: string): Promise<UserEntity | null> {
    const snapshot = await this.db.collection(COLLECTION_NAME).doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    return toUserEntity(snapshot.id, snapshot.data() as UserDoc);
  }
}
