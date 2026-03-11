import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SerialStatus } from "../src/domain/types";
import { SerialRepository } from "../src/repositories/serialRepository";
import { UserRepository } from "../src/repositories/userRepository";

type SeedSerialRow = {
  serialCode: string;
  status: SerialStatus;
  resultImageUrl: string;
  purchaseLink: string;
};

type SeedUserRow = {
  userId: string;
  lineUserId: string;
  lineAccountKey?: string;
  displayName: string | null;
  serials: SeedSerialRow[];
};

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/seedSerials.json");
  const raw = await readFile(dataPath, "utf-8");
  const users = JSON.parse(raw) as SeedUserRow[];

  const userRepository = new UserRepository();
  const serialRepository = new SerialRepository();

  let serialCount = 0;

  for (const user of users) {
    await userRepository.upsertActiveUser({
      userId: user.userId,
      lineUserId: user.lineUserId,
      lineAccountKey: user.lineAccountKey ?? "temp",
      displayName: user.displayName
    });

    console.log(`seeded user: ${user.userId}`);

    for (const serial of user.serials) {
      await serialRepository.upsertSeed(user.userId, serial);
      serialCount += 1;
      console.log(`seeded serial: ${user.userId}/${serial.serialCode} (${serial.status})`);
    }
  }

  console.log(`done: ${users.length} users, ${serialCount} serials`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
