export type SendResultBundleInput = {
  serialCode: string;
  lineUserId: string;
  resultImageUrl: string;
  purchaseLink: string;
};

export type LineSendResult = {
  ok: boolean;
  provider: "mock" | "line";
  status: "mock_sent" | "failed";
  message: string;
};

export interface LineService {
  sendResultBundle(input: SendResultBundleInput): Promise<LineSendResult>;
}
