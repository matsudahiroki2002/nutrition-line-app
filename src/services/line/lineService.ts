export type SendResultBundleInput = {
  serialCode: string;
  lineUserId: string;
  resultImageUrl: string;
  purchaseLink: string;
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
