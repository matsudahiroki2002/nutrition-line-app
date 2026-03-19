export type SendResultBundleInput = {
  serialId: string;
  lineUserId: string;
  resultPdfUrl: string;
  purchaseUrl: string;
};

export type LineSendResult = {
  ok: boolean;
  provider: "line";
  status: "sent" | "failed";
  message: string;
  lineErrorCode?: string;
  lineRequestId?: string;
};

export interface LineService {
  sendResultBundle(input: SendResultBundleInput): Promise<LineSendResult>;
}
