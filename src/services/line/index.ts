import type { LineService } from "@/src/services/line/lineService";
import { LineMessagingApiService } from "@/src/services/line/lineMessagingApiService";

let service: LineService | null = null;

export function getLineService(): LineService {
  if (!service) {
    service = new LineMessagingApiService();
  }

  return service;
}
