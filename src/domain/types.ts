export type UserStatus = "active";

export type SerialStatus = "unused" | "used" | "invalid";

export type AuthResult = "success" | "invalid" | "used" | "error";

export type LineSendStatus = "sent" | "skipped" | "failed";

export type UserEntity = {
  id: string;
  userUuid: string;
  lineUserId?: string | null;
  name: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SerialEntity = {
  id: string;
  serialCode: string;
  status: SerialStatus;
  resultPdfUrl: string;
  purchaseLink: string;
  targetUserUuid?: string | null;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthLogEntity = {
  id: string;
  userId?: string | null;
  lineUserId?: string | null;
  serialCode: string;
  result: AuthResult;
  message: string;
  lineSendStatus: LineSendStatus;
  lineErrorCode?: string | null;
  lineRequestId?: string | null;
  createdAt: Date;
};