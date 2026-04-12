export interface HearingVectorChunk {
  hearingId: string;
  chunkIndex: number;
  text: string;
  speaker: string;
  chapterUrl: string;
  embedding: number[];
}

export interface HearingSearchResult {
  hearingId: string;
  chunkIndex: number;
  text: string;
  speaker: string;
  chapterUrl: string;
  similarity: number;
}

let cachedVectors: HearingVectorChunk[] | null = null;

export async function loadVectors(): Promise<HearingVectorChunk[]> {
  if (cachedVectors) return cachedVectors;

  const response = await fetch('/data/hearing-vectors.json');
  if (!response.ok) {
    throw new Error(`Failed to load hearing vectors: ${response.status}`);
  }

  cachedVectors = (await response.json()) as HearingVectorChunk[];
  return cachedVectors;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

export function semanticSearch(
  queryEmbedding: number[],
  topK = 10,
): HearingSearchResult[] {
  if (!cachedVectors || cachedVectors.length === 0) return [];

  const scored = cachedVectors.map((chunk) => ({
    hearingId: chunk.hearingId,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    speaker: chunk.speaker,
    chapterUrl: chunk.chapterUrl,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
