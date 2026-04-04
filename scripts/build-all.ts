import { ensureDir } from "./lib/fs-utils";
import { PROCESSED_DIR } from "./lib/constants";
import { buildDistricts } from "./build-districts";
import { buildBills } from "./build-bills";
import { generateSummaries } from "./generate-summaries";
import { buildHearings } from "./build-hearings";
import { buildHearingEnrichment } from "./build-hearing-enrichment";
import { buildFinance, buildFinanceIndex } from "./build-finance";
import { buildMetrics } from "./build-metrics";
import { buildMembers } from "./build-members";
import { buildSearchIndex } from "./build-search-index";

export async function buildAll(): Promise<void> {
  await ensureDir(PROCESSED_DIR);

  await buildDistricts();
  await buildBills();
  await generateSummaries();
  await buildHearings();
  await buildHearingEnrichment();
  await buildFinance();
  await buildMetrics();
  await buildMembers();
  await buildFinanceIndex();
  await buildSearchIndex();

  console.log("[build-all] completed");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch((error) => {
    console.error("[build-all] failed", error);
    process.exitCode = 1;
  });
}
