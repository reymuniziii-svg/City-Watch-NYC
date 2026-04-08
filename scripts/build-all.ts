import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir } from "./lib/fs-utils";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { buildDistricts } from "./build-districts";
import { buildBills } from "./build-bills";
import { generateSummaries } from "./generate-summaries";
import { buildHearings } from "./build-hearings";
import { buildHearingEnrichment } from "./build-hearing-enrichment";
import { buildFinance, buildFinanceIndex } from "./build-finance";
import { buildInfluenceMap, buildConflictAlerts } from "./build-influence-map";
import { buildMetrics } from "./build-metrics";
import { buildMembers } from "./build-members";
import { buildSearchIndex } from "./build-search-index";
import { buildTranscriptIndex } from "./build-transcript-index";

async function publishHearingEnrichment(): Promise<void> {
  const src = path.join(PROCESSED_DIR, "hearing-enrichment.json");
  const dest = path.join(PUBLIC_DATA_DIR, "hearing-enrichment.json");
  await ensureDir(PUBLIC_DATA_DIR);
  await fs.copyFile(src, dest);
  console.log("[build-all] published hearing-enrichment.json to public/data");
}

export async function buildAll(): Promise<void> {
  await ensureDir(PROCESSED_DIR);

  await buildDistricts();
  await buildBills();
  await generateSummaries();
  await buildHearings();
  await buildHearingEnrichment();
  await publishHearingEnrichment();
  await buildFinance();
  await buildMetrics();
  await buildMembers();
  await buildFinanceIndex();
  await buildInfluenceMap();
  await buildConflictAlerts();
  await buildSearchIndex();
  await buildTranscriptIndex();

  console.log("[build-all] completed");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch((error) => {
    console.error("[build-all] failed", error);
    process.exitCode = 1;
  });
}
