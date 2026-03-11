export type UserStatus = "active";

export type SerialStatus = "unused" | "used" | "invalid";

export type AuthResult = "success" | "invalid" | "used" | "error";

export type LineSendStatus = "mock_sent" | "skipped" | "failed";

export type UserEntity = {
  id: string;
  lineUserId: string;
  lineAccountKey: string;
  displayName: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SerialEntity = {
  id: string;
  userId: string;
  serialCode: string;
  status: SerialStatus;
  resultImageUrl: string;
  purchaseLink: string;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthLogEntity = {
  id: string;
  userId: string;
  serialCode: string;
  result: AuthResult;
  message: string;
  lineSendStatus: LineSendStatus;
  createdAt: Date;
};
