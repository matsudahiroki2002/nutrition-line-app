import type { LineService, SendResultBundleInput } from "@/src/services/line/lineService";

export class MockLineService implements LineService {
  async sendResultBundle(input: SendResultBundleInput) {
    if (input.serialCode.endsWith("FAIL")) {
      return {
        ok: false,
        provider: "mock" as const,
        status: "failed" as const,
        message: "Mock LINE send failed"
      };
    }

    return {
      ok: true,
      provider: "mock" as const,
      status: "mock_sent" as const,
      message: "Mock LINE message accepted"
    };
  }
}
