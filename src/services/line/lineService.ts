export type SendResultBundleInput = {
  serialCode: string;
  lineUserId: string;
  resultImageUrl: string;
  purchaseLink: string;
};

export type LineSendResult = {
  ok: boolean;
  provider: "mock" | "line";
  status: "mock_sent" | "sent" | "failed";
  message: string;
  lineErrorCode?: string;
  lineRequestId?: string;
};

export interface LineService {
  sendResultBundle(input: SendResultBundleInput): Promise<LineSendResult>;
}
