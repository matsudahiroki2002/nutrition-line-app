import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/src/lib/firebaseAdmin";
import { normalizeJapaneseName } from "@/src/lib/nameNormalizer";
import type { UserEntity, UserStatus } from "@/src/domain/types";

const COLLECTION_NAME = "users";

type UserDoc = {
  userUuid?: string;
  lineUserId?: string | null;
  name?: string;
  normalizedName?: string;
  displayName?: string | null;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type BindLineUserIdResult =
  | { kind: "bound"; user: UserEntity }
  | { kind: "already_bound"; user: UserEntity }
  | { kind: "line_user_conflict" }
  | { kind: "not_found" };

function toUserEntity(id: string, doc: UserDoc): UserEntity {
  const name = doc.name ?? doc.displayName ?? "";

  return {
    id,
    userUuid: doc.userUuid ?? id,
    lineUserId: doc.lineUserId ?? null,
    name,
    status: doc.status,
    createdAt: doc.createdAt.toDate(),
    updatedAt: doc.updatedAt.toDate()
  };
}

export class UserRepository {
  private db = getDb();

  async upsertSeedUser(input: {
    userUuid?: string;
    lineUserId?: string | null;
    name: string;
    status?: UserStatus;
  }): Promise<UserEntity> {
    const userUuid = input.userUuid?.trim() || randomUUID();
    const ref = this.db.collection(COLLECTION_NAME).doc(userUuid);

    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const now = new Date();
      const name = input.name.trim();
      const normalizedName = normalizeJapaneseName(name);
      const normalizedLineUserId = input.lineUserId?.trim() || null;
      const status = input.status ?? "active";

      const common = {
        userUuid,
        lineUserId: normalizedLineUserId,
        name,
        normalizedName,
        status,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (!snapshot.exists) {
        transaction.set(ref, {
          ...common,
          createdAt: FieldValue.serverTimestamp()
        });

        return {
          id: userUuid,
          userUuid,
          lineUserId: normalizedLineUserId,
          name,
          status,
          createdAt: now,
          updatedAt: now
        };
      }

      const current = snapshot.data() as UserDoc;
      transaction.set(ref, common, { merge: true });

      return {
        id: snapshot.id,
        userUuid,
        lineUserId: normalizedLineUserId,
        name,
        status,
        createdAt: current.createdAt.toDate(),
        updatedAt: now
      };
    });
  }

  async findById(userUuid: string): Promise<UserEntity | null> {
    const normalizedUserUuid = userUuid.trim();
    const snapshot = await this.db.collection(COLLECTION_NAME).doc(normalizedUserUuid).get();

    if (!snapshot.exists) {
      return null;
    }

    return toUserEntity(snapshot.id, snapshot.data() as UserDoc);
  }

  async findByLineUserId(lineUserId: string): Promise<UserEntity | null> {
    const normalizedLineUserId = lineUserId.trim();
    if (!normalizedLineUserId) {
      return null;
    }

    const snapshot = await this.db
      .collection(COLLECTION_NAME)
      .where("lineUserId", "==", normalizedLineUserId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return toUserEntity(doc.id, doc.data() as UserDoc);
  }

  async findActiveByNormalizedName(normalizedName: string): Promise<UserEntity[]> {
    const normalized = normalizedName.trim();
    if (!normalized) {
      return [];
    }

    const snapshot = await this.db.collection(COLLECTION_NAME).where("normalizedName", "==", normalized).get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs
      .map((doc) => toUserEntity(doc.id, doc.data() as UserDoc))
      .filter((user) => user.status === "active");
  }

  async bindLineUserIdOnFirstAuth(input: { userUuid: string; lineUserId: string }): Promise<BindLineUserIdResult> {
    const normalizedUserUuid = input.userUuid.trim();
    const normalizedLineUserId = input.lineUserId.trim();

    if (!normalizedUserUuid || !normalizedLineUserId) {
      return { kind: "not_found" };
    }

    const userRef = this.db.collection(COLLECTION_NAME).doc(normalizedUserUuid);

    return this.db.runTransaction(async (transaction) => {
      const [targetSnapshot, conflictSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(
          this.db.collection(COLLECTION_NAME).where("lineUserId", "==", normalizedLineUserId).limit(1)
        )
      ]);

      if (!targetSnapshot.exists) {
        return { kind: "not_found" };
      }

      if (!conflictSnapshot.empty && conflictSnapshot.docs[0].id !== normalizedUserUuid) {
        return { kind: "line_user_conflict" };
      }

      const current = targetSnapshot.data() as UserDoc;
      const currentLineUserId = current.lineUserId?.trim() || null;
      const now = new Date();

      if (currentLineUserId && currentLineUserId !== normalizedLineUserId) {
        return { kind: "line_user_conflict" };
      }

      if (!currentLineUserId) {
        transaction.set(
          userRef,
          {
            lineUserId: normalizedLineUserId,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        return {
          kind: "bound",
          user: {
            ...toUserEntity(targetSnapshot.id, current),
            lineUserId: normalizedLineUserId,
            updatedAt: now
          }
        };
      }

      return {
        kind: "already_bound",
        user: {
          ...toUserEntity(targetSnapshot.id, current),
          lineUserId: normalizedLineUserId
        }
      };
    });
  }
}
