import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import { normalizeJapaneseName } from "@/src/lib/nameNormalizer";
import type { UserEntity, UserStatus } from "@/src/domain/types";

const COLLECTION_NAME = "users";

type UserDoc = {
  userUuid?: string;
  lineUserId: string;
  name?: string;
  normalizedName?: string;
  displayName?: string | null;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function toUserEntity(id: string, doc: UserDoc): UserEntity {
  const name = doc.name ?? doc.displayName ?? "";

  return {
    id,
    userUuid: doc.userUuid ?? id,
    lineUserId: doc.lineUserId,
    name,
    status: doc.status,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate()
  };
}

export class UserRepository {
  private db = getDb();

  async upsertActiveUser(input: {
    lineUserId: string;
    name: string;
  }): Promise<UserEntity> {
    const ref = this.db.collection(COLLECTION_NAME).doc(input.lineUserId);

    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const now = new Date();
      const normalizedLineUserId = input.lineUserId.trim();
      const name = input.name.trim();
      const normalizedName = normalizeJapaneseName(name);

      if (!snapshot.exists) {
        const userUuid = randomUUID();
        transaction.set(ref, {
          userUuid,
          lineUserId: normalizedLineUserId,
          name,
          normalizedName,
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        return {
          id: normalizedLineUserId,
          userUuid,
          lineUserId: normalizedLineUserId,
          name,
          status: "active",
          createdAt: now,
          updatedAt: now
        };
      }

      const current = snapshot.data() as UserDoc;
      const userUuid = current.userUuid ?? randomUUID();
      const common = {
        userUuid,
        lineUserId: normalizedLineUserId,
        name,
        normalizedName,
        status: "active",
        updatedAt: FieldValue.serverTimestamp()
      };

      transaction.set(ref, common, { merge: true });

      return {
        id: snapshot.id,
        userUuid,
        lineUserId: normalizedLineUserId,
        name: common.name,
        status: "active",
        createdAt: current.createdAt.toDate(),
        updatedAt: now
      };
    });
  }

  async findByLineUserId(lineUserId: string): Promise<UserEntity | null> {
    const normalizedLineUserId = lineUserId.trim();
    return this.findById(normalizedLineUserId);
  }

  normalizeName(name: string): string {
    return normalizeJapaneseName(name);
  }

  async findById(userId: string): Promise<UserEntity | null> {
    const snapshot = await this.db.collection(COLLECTION_NAME).doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    return toUserEntity(snapshot.id, snapshot.data() as UserDoc);
  }
}
