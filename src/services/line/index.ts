import { env } from "@/src/lib/env";
import type { LineService } from "@/src/services/line/lineService";
import { LineMessagingApiService } from "@/src/services/line/lineMessagingApiService";
import { MockLineService } from "@/src/services/line/mockLineService";

let service: LineService | null = null;

export function getLineService(): LineService {
  if (service) {
    return service;
  }

  if (env.LINE_SERVICE_MODE === "line") {
    service = new LineMessagingApiService();
    return service;
  }

  service = new MockLineService();
  return service;
}
