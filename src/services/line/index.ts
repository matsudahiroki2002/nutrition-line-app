import { env } from "@/src/lib/env";
import type { LineService } from "@/src/services/line/lineService";
import { MockLineService } from "@/src/services/line/mockLineService";

let service: LineService | null = null;

export function getLineService(): LineService {
  if (service) {
    return service;
  }

  if (env.LINE_SERVICE_MODE === "line") {
    // 本番LINE接続時の差し替えポイント:
    // LineMessagingApiService を実装してここで返す。
    service = new MockLineService();
    return service;
  }

  service = new MockLineService();
  return service;
}
