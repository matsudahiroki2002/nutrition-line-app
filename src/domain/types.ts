export type AuthResult = "success" | "invalid" | "error";

export type ReportEntity = {
  id: string;
  createdAt: Date;
  birthday: string;
  userName: string;
  serialId: string;
  purchaseUrl: string;
  storagePath: string;
  resultPdfUrl: string;
  lineRegistrationFlag: boolean;
  pdfSendFlag: boolean;
  lineUserId?: string | null;
  pdfClickedFlag: boolean;
  urlClickedFlag: boolean;
  updatedAt: Date;
};
