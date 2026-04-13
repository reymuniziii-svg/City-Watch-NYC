import "dotenv/config";
import path from "node:path";
import { PUBLIC_DATA_DIR } from "./lib/constants";
import { fileExists, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { HearingSummary } from "../src/lib/types";

export interface HearingVectorChunk {
  hearingId: string;
  chunkIndex: number;
  text: string;
  speaker: string;
  chapterUrl: string;
  embedding: number[];
}

interface EmbedContentResponse {
  embedding?: {
    values?: number[];
  };
  error?: {
    code?: number;
    message?: string;
  };
}

interface TextChunk {
  hearingId: string;
  chunkIndex: number;
  text: string;
  speaker: string;
  chapterUrl: string;
}

const ENRICHMENT_PATH = path.join(PUBLIC_DATA_DIR, "hearing-enrichment.json");
const OUTPUT_PATH = path.join(PUBLIC_DATA_DIR, "hearing-vectors.json");
const EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
const CHUNK_TARGET_SIZE = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function chunkText(text: string, targetSize: number): string[] {
  if (text.length <= targetSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > targetSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }

    current += (current.length > 0 ? " " : "") + sentence;
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

function buildChunks(hearings: HearingSummary[]): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const hearing of hearings) {
    let chunkIndex = 0;

    // Chunk overview
    const overviewParts = chunkText(hearing.overview, CHUNK_TARGET_SIZE);
    for (const part of overviewParts) {
      chunks.push({
        hearingId: hearing.id,
        chunkIndex,
        text: part,
        speaker: "",
        chapterUrl: hearing.cityMeetingsUrl,
      });
      chunkIndex += 1;
    }

    // Chunk takeaways as a combined block
    if (hearing.takeaways.length > 0) {
      const takeawayText = hearing.takeaways.join(". ");
      const takeawayParts = chunkText(takeawayText, CHUNK_TARGET_SIZE);
      for (const part of takeawayParts) {
        chunks.push({
          hearingId: hearing.id,
          chunkIndex,
          text: part,
          speaker: "",
          chapterUrl: hearing.cityMeetingsUrl,
        });
        chunkIndex += 1;
      }
    }

    // Each quote as its own chunk
    for (const quote of hearing.quotes) {
      const quoteText = `${quote.speaker}: ${quote.quote}`;
      const quoteParts = chunkText(quoteText, CHUNK_TARGET_SIZE);
      for (const part of quoteParts) {
        chunks.push({
          hearingId: hearing.id,
          chunkIndex,
          text: part,
          speaker: quote.speaker,
          chapterUrl: quote.chapterUrl,
        });
        chunkIndex += 1;
      }
    }
  }

  return chunks;
}

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: {
        parts: [{ text }],
      },
    }),
  });

  const payload = (await response.json()) as EmbedContentResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Embedding request failed with status ${response.status}`);
  }

  const values = payload.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Embedding API returned no values");
  }

  return values;
}

export async function buildHearingVectors(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.log("[build-hearing-vectors] GEMINI_API_KEY not set, skipping");
    return;
  }

  const enrichmentExists = await fileExists(ENRICHMENT_PATH);
  if (!enrichmentExists) {
    console.log("[build-hearing-vectors] hearing-enrichment.json not found, skipping");
    return;
  }

  const hearings = await readJsonFile<HearingSummary[]>(ENRICHMENT_PATH);
  const textChunks = buildChunks(hearings);

  console.log(
    `[build-hearing-vectors] generating embeddings for ${textChunks.length} chunks from ${hearings.length} hearings`,
  );

  const vectorChunks: HearingVectorChunk[] = [];
  let processedCount = 0;

  for (const chunk of textChunks) {
    try {
      const embedding = await embedText(chunk.text, apiKey);
      vectorChunks.push({
        hearingId: chunk.hearingId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        speaker: chunk.speaker,
        chapterUrl: chunk.chapterUrl,
        embedding,
      });
    } catch (error) {
      console.error(`[build-hearing-vectors] failed to embed chunk ${chunk.hearingId}:${chunk.chunkIndex}:`, error);
    }

    processedCount += 1;
    if (processedCount % 20 === 0 || processedCount === textChunks.length) {
      console.log(`[build-hearing-vectors] ${processedCount}/${textChunks.length} embedded`);
    }

    // Rate limiting between API calls
    await sleep(100);
  }

  await writeJsonFile(OUTPUT_PATH, vectorChunks);
  console.log(
    `[build-hearing-vectors] wrote ${vectorChunks.length} vector chunks to hearing-vectors.json`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHearingVectors().catch((error) => {
    console.error("[build-hearing-vectors] failed", error);
    process.exitCode = 1;
  });
}
