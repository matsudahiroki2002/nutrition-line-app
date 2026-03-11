import { env } from "@/src/lib/env";
import type { LineService, SendResultBundleInput } from "@/src/services/line/lineService";

type LinePushBody = {
  to: string;
  messages: Array<
    | {
        type: "image";
        originalContentUrl: string;
        previewImageUrl: string;
      }
    | {
        type: "text";
        text: string;
      }
  >;
};

type LineErrorResponse = {
  message?: string;
  details?: Array<{ message?: string; property?: string }>;
};

function normalizeLineErrorCode(status: number): string {
  if (status === 400) {
    return "bad_request";
  }
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status >= 500) {
    return "line_server_error";
  }

  return "line_api_error";
}

function buildPushBody(input: SendResultBundleInput): LinePushBody {
  return {
    to: input.lineUserId,
    messages: [
      {
        type: "image",
        originalContentUrl: input.resultImageUrl,
        previewImageUrl: input.resultImageUrl
      },
      {
        type: "text",
        text: `診断結果をご確認ください。\nおすすめ商品: ${input.purchaseLink}`
      }
    ]
  };
}

export class LineMessagingApiService implements LineService {
  async sendResultBundle(input: SendResultBundleInput) {
    const response = await fetch(`${env.LINE_API_BASE_URL}/v2/bot/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(buildPushBody(input))
    });

    const lineRequestId = response.headers.get("x-line-request-id") ?? undefined;

    if (!response.ok) {
      let lineMessage = `LINE Messaging API error: ${response.status}`;

      try {
        const errorBody = (await response.json()) as LineErrorResponse;
        const detailMessage = errorBody.details?.[0]?.message;
        if (detailMessage) {
          lineMessage = `${lineMessage} (${detailMessage})`;
        } else if (errorBody.message) {
          lineMessage = `${lineMessage} (${errorBody.message})`;
        }
      } catch {
        // Keep fallback message when response body is not JSON.
      }

      return {
        ok: false,
        provider: "line" as const,
        status: "failed" as const,
        message: lineMessage,
        lineErrorCode: normalizeLineErrorCode(response.status),
        lineRequestId
      };
    }

    return {
      ok: true,
      provider: "line" as const,
      status: "sent" as const,
      message: "LINE message accepted",
      lineRequestId
    };
  }
}
