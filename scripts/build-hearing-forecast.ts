import { promises as fs } from "node:fs";
import path from "node:path";
import { PUBLIC_DATA_DIR, RAW_UPSTREAM_DIR, SESSION_YEARS } from "./lib/constants";
import { readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { normalizeDate } from "../src/lib/status-timeline";
import type { RawEvent } from "./lib/legislation";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface BillIndexEntry {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  statusBucket: string;
  introDate: string;
}

interface BacklogBill {
  introNumber: string;
  title: string;
  daysSinceIntro: number;
}

interface HearingForecastEntry {
  committee: string;
  billsInQueue: number;
  historicalFrequency: number;
  predictedNextDate: string | null;
  confidence: number;
  backlogBills: BacklogBill[];
}

/* ------------------------------------------------------------------ */
/*  Build Hearing Forecast                                            */
/* ------------------------------------------------------------------ */

export async function buildHearingForecast(): Promise<void> {
  console.log("[build-hearing-forecast] starting...");

  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // 1. Load all past hearings from raw event files
  //    Track per-committee: list of hearing dates
  const committeeHearings = new Map<string, Date[]>();

  const yearsToScan = [SESSION_YEARS[0] - 1, ...SESSION_YEARS];

  for (const year of yearsToScan) {
    const eventsDir = path.join(RAW_UPSTREAM_DIR, "events", String(year));
    let files: string[] = [];

    try {
      files = (await fs.readdir(eventsDir)).filter((name) => name.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      const event = await readJsonFile<RawEvent>(path.join(eventsDir, file));
      const dateStr = normalizeDate(event.Date);
      if (!dateStr) {
        continue;
      }

      const eventDate = new Date(dateStr);
      if (Number.isNaN(eventDate.getTime()) || eventDate > now) {
        continue;
      }

      const list = committeeHearings.get(event.BodyName) ?? [];
      list.push(eventDate);
      committeeHearings.set(event.BodyName, list);
    }
  }

  console.log(`[build-hearing-forecast] found hearings for ${committeeHearings.size} committees`);

  // 2. For each committee, compute historical frequency (hearings per month over last 12 months)
  const committeeFrequency = new Map<string, number>();
  const committeeLastDate = new Map<string, Date>();

  for (const [committee, dates] of committeeHearings.entries()) {
    // Sort dates ascending
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Filter to last 12 months
    const recentDates = dates.filter((d) => d >= twelveMonthsAgo);
    const frequency = recentDates.length / 12;
    committeeFrequency.set(committee, Math.round(frequency * 100) / 100);

    // Last hearing date (from all dates, not just last 12 months)
    const lastDate = dates[dates.length - 1];
    if (lastDate) {
      committeeLastDate.set(committee, lastDate);
    }
  }

  // 3. Load bills-index, find bills still in "Committee" statusBucket
  const billsIndex = await readJsonFile<BillIndexEntry[]>(
    path.join(PUBLIC_DATA_DIR, "bills-index.json"),
  );

  const committeeBills = new Map<string, BillIndexEntry[]>();
  for (const bill of billsIndex) {
    if (bill.statusBucket !== "Committee" || !bill.committee) {
      continue;
    }
    const list = committeeBills.get(bill.committee) ?? [];
    list.push(bill);
    committeeBills.set(bill.committee, list);
  }

  // 4. Build forecast for each committee with bills in queue
  const forecast: HearingForecastEntry[] = [];

  // Gather all committees: either those with bills in queue or those with hearing history
  const allCommittees = new Set([
    ...committeeBills.keys(),
    ...committeeHearings.keys(),
  ]);

  for (const committee of allCommittees) {
    const billsInQueue = committeeBills.get(committee) ?? [];

    // Skip committees with no pending bills
    if (billsInQueue.length === 0) {
      continue;
    }

    const frequency = committeeFrequency.get(committee) ?? 0;
    const lastDate = committeeLastDate.get(committee);

    // Predict next hearing date
    let predictedNextDate: string | null = null;
    if (lastDate && frequency > 0) {
      const intervalDays = Math.round(30 / frequency);
      const predicted = new Date(lastDate);
      predicted.setDate(predicted.getDate() + intervalDays);

      // If predicted date is in the past, project forward from now
      if (predicted <= now) {
        const nextFromNow = new Date(now);
        nextFromNow.setDate(nextFromNow.getDate() + intervalDays);
        predictedNextDate = nextFromNow.toISOString();
      } else {
        predictedNextDate = predicted.toISOString();
      }
    }

    // Confidence: min(1, frequency * 0.2)
    const confidence = Math.round(Math.min(1, frequency * 0.2) * 100) / 100;

    // Backlog bills sorted by days since intro (longest waiting first)
    const backlogBills: BacklogBill[] = billsInQueue
      .map((bill) => {
        const introDate = new Date(bill.introDate);
        const daysSinceIntro = Number.isNaN(introDate.getTime())
          ? 0
          : Math.round((now.getTime() - introDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          introNumber: bill.introNumber,
          title: bill.title,
          daysSinceIntro,
        };
      })
      .sort((a, b) => b.daysSinceIntro - a.daysSinceIntro);

    forecast.push({
      committee,
      billsInQueue: billsInQueue.length,
      historicalFrequency: frequency,
      predictedNextDate,
      confidence,
      backlogBills,
    });
  }

  // Sort by billsInQueue descending
  forecast.sort((a, b) => b.billsInQueue - a.billsInQueue);

  // 5. Write output
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "hearing-forecast.json"), forecast);
  console.log(`[build-hearing-forecast] wrote ${forecast.length} entries to hearing-forecast.json`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearingForecast().catch((error) => {
    console.error("[build-hearing-forecast] failed", error);
    process.exitCode = 1;
  });
}
