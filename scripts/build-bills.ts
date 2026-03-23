import { promises as fs } from "node:fs";
import path from "node:path";
import { CONTENT_DIR, PROCESSED_DIR, PUBLIC_DATA_DIR, RAW_UPSTREAM_DIR, SESSION_YEARS } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { toBillRecord, type RawBill } from "./lib/legislation";
import type { BillRecord } from "../src/lib/types";

interface TranscriptLink {
  billId: string;
  url: string;
}

function fallbackSummary(raw: RawBill): string {
  const committee = raw.BodyName ? ` It is currently assigned to ${raw.BodyName}.` : "";
  return `${raw.TypeName} ${raw.File} addresses: ${raw.Name}.${committee} Status: ${raw.StatusName}.`;
}

async function loadTranscriptMap(): Promise<Map<string, string>> {
  const filePath = path.join(CONTENT_DIR, "transcript-links.json");
  try {
    const values = await readJsonFile<TranscriptLink[]>(filePath);
    return new Map(values.map((entry) => [entry.billId, entry.url]));
  } catch {
    return new Map();
  }
}

function toIndexRecord(bill: BillRecord) {
  return {
    billId: bill.billId,
    session: bill.session,
    number: bill.number,
    introNumber: bill.introNumber,
    title: bill.title,
    summary: bill.summary,
    statusName: bill.statusName,
    statusBucket: bill.statusBucket,
    committee: bill.committee,
    actionDate: bill.actionDate,
    introDate: bill.introDate,
    sponsorCount: bill.sponsorCount,
    leadSponsorSlug: bill.leadSponsorSlug,
    route: `/bill/${bill.session}/${bill.number}`,
  };
}

export async function buildBills(): Promise<BillRecord[]> {
  const transcriptMap = await loadTranscriptMap();
  const bills: BillRecord[] = [];

  for (const year of SESSION_YEARS) {
    const yearDir = path.join(RAW_UPSTREAM_DIR, "introduction", String(year));
    let files: string[] = [];

    try {
      files = (await fs.readdir(yearDir)).filter((name) => name.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      const fullPath = path.join(yearDir, file);
      const raw = await readJsonFile<RawBill>(fullPath);
      const bill = toBillRecord(raw, fallbackSummary(raw), "fallback");
      if (!bill) {
        continue;
      }

      bill.transcriptUrl = transcriptMap.get(bill.billId) ?? null;
      bills.push(bill);
    }
  }

  bills.sort((a, b) => {
    const aDate = a.actionDate || a.introDate;
    const bDate = b.actionDate || b.introDate;
    return bDate.localeCompare(aDate);
  });

  const billsDir = path.join(PROCESSED_DIR, "bills");
  await ensureDir(billsDir);

  for (const bill of bills) {
    const outputPath = path.join(billsDir, String(bill.session), `${bill.number}.json`);
    await writeJsonFile(outputPath, bill);
  }

  const index = bills.map(toIndexRecord);
  await writeJsonFile(path.join(PROCESSED_DIR, "bills-index.json"), index);
  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "bills-index.json"), index);

  console.log(`[build-bills] wrote ${bills.length} bill detail files`);
  return bills;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildBills().catch((error) => {
    console.error("[build-bills] failed", error);
    process.exitCode = 1;
  });
}
