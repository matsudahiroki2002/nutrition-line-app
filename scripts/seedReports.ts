import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

type SeedReportRow = {
  birthday: string;
  userName: string;
  serialId: string;
  purchaseUrl: string;
  storagePath: string;
  resultPdfUrl: string;
  lineRegistrationFlag?: boolean;
  pdfSendFlag?: boolean;
  lineUserId?: string | null;
  pdfClickedFlag?: boolean;
  urlClickedFlag?: boolean;
};

async function main() {
  const { ReportRepository } = await import("../src/repositories/reportRepository");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/seedReports.json");
  const raw = await readFile(dataPath, "utf-8");
  const reports = JSON.parse(raw) as SeedReportRow[];

  const reportRepository = new ReportRepository();

  for (const report of reports) {
    await reportRepository.upsertSeed(report);
    console.log(`seeded report: ${report.userName} (${report.serialId})`);
  }

  console.log(`done: ${reports.length} reports`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
