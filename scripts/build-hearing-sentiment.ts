import path from "node:path";
import { PUBLIC_DATA_DIR } from "./lib/constants";
import { generateStructuredJson } from "./lib/ai";
import { fileExists, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { HearingSummary } from "../src/lib/types";

export interface HearingSentimentData {
  overall: "supportive" | "hostile" | "mixed" | "neutral";
  score: number;
  speakerStances: {
    speaker: string;
    stance: "supportive" | "critical" | "neutral" | "mixed";
    quote: string;
  }[];
}

const SENTIMENT_SCHEMA = {
  type: "object",
  properties: {
    overall: {
      type: "string",
      enum: ["supportive", "hostile", "mixed", "neutral"],
    },
    score: {
      type: "number",
      description: "Sentiment score from -1 (hostile) to 1 (supportive)",
    },
    speakerStances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string" },
          stance: {
            type: "string",
            enum: ["supportive", "critical", "neutral", "mixed"],
          },
          quote: { type: "string" },
        },
        required: ["speaker", "stance", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["overall", "score", "speakerStances"],
  additionalProperties: false,
} as const;

const ENRICHMENT_PATH = path.join(PUBLIC_DATA_DIR, "hearing-enrichment.json");
const OUTPUT_PATH = path.join(PUBLIC_DATA_DIR, "hearing-sentiment.json");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function classifySentiment(hearing: HearingSummary): Promise<HearingSentimentData | null> {
  const quotesBlock = hearing.quotes
    .map((q) => `[${q.speaker}]: "${q.quote}"`)
    .join("\n");

  const result = await generateStructuredJson<HearingSentimentData>({
    scope: "hearing-sentiment",
    systemInstruction:
      "You are an analyst classifying the sentiment of NYC City Council hearings. " +
      "Given a hearing overview and notable quotes, classify the overall sentiment and each speaker's stance. " +
      "Return JSON with overall sentiment (supportive/hostile/mixed/neutral), a score from -1 to 1, " +
      "and each speaker's stance with a short representative quote.",
    userPrompt: `Hearing overview:\n${hearing.overview}\n\nQuotes:\n${quotesBlock}`,
    responseJsonSchema: SENTIMENT_SCHEMA,
    maxOutputTokens: 600,
    temperature: 0,
  });

  return result;
}

export async function buildHearingSentiment(): Promise<void> {
  const enrichmentExists = await fileExists(ENRICHMENT_PATH);
  if (!enrichmentExists) {
    console.log("[build-hearing-sentiment] hearing-enrichment.json not found, skipping");
    return;
  }

  const hearings = await readJsonFile<HearingSummary[]>(ENRICHMENT_PATH);
  const hearingsWithQuotes = hearings.filter((h) => h.quotes.length > 0);

  console.log(
    `[build-hearing-sentiment] processing ${hearingsWithQuotes.length} hearings with quotes (${hearings.length} total)`,
  );

  const sentimentMap: Record<string, HearingSentimentData> = {};
  let processedCount = 0;

  for (const hearing of hearingsWithQuotes) {
    try {
      const sentiment = await classifySentiment(hearing);
      if (sentiment) {
        // Clamp score to [-1, 1]
        sentiment.score = Math.max(-1, Math.min(1, sentiment.score));
        sentimentMap[hearing.id] = sentiment;
      }
    } catch (error) {
      console.error(`[build-hearing-sentiment] failed for ${hearing.id}:`, error);
    }

    processedCount += 1;
    if (processedCount % 5 === 0 || processedCount === hearingsWithQuotes.length) {
      console.log(`[build-hearing-sentiment] ${processedCount}/${hearingsWithQuotes.length} processed`);
    }

    // Rate limiting between API calls
    await sleep(100);
  }

  await writeJsonFile(OUTPUT_PATH, sentimentMap);
  console.log(
    `[build-hearing-sentiment] wrote ${Object.keys(sentimentMap).length} sentiment records to hearing-sentiment.json`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearingSentiment().catch((error) => {
    console.error("[build-hearing-sentiment] failed", error);
    process.exitCode = 1;
  });
}
