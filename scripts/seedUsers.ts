import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

type SeedUserRow = {
  userUuid: string;
  lineUserId?: string | null;
  name: string;
};

async function main() {
  const { UserRepository } = await import("../src/repositories/userRepository");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/seedUsers.json");
  const raw = await readFile(dataPath, "utf-8");
  const users = JSON.parse(raw) as SeedUserRow[];

  const userRepository = new UserRepository();

  for (const user of users) {
    await userRepository.upsertSeedUser(user);
    console.log(`seeded user: ${user.name} (${user.userUuid}, lineUserId=${user.lineUserId ?? "null"})`);
  }

  console.log(`done: ${users.length} users`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
