import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { SerialStatus } from "../src/domain/types";

loadEnv({ path: ".env.local" });
loadEnv();

type SeedSerialRow = {
  serialCode: string;
  status: SerialStatus;
  resultImageUrl: string;
  purchaseLink: string;
  usedByUserUuid?: string | null;
};

async function main() {
  const { SerialRepository } = await import("../src/repositories/serialRepository");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/seedSerials.json");
  const raw = await readFile(dataPath, "utf-8");
  const serials = JSON.parse(raw) as SeedSerialRow[];

  const serialRepository = new SerialRepository();

  for (const serial of serials) {
    await serialRepository.upsertSeed(serial);
    console.log(`seeded serial: ${serial.serialCode} (${serial.status})`);
  }

  console.log(`done: ${serials.length} serials`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
