const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const DEFAULT_RETRY_MAX = Number.parseInt(process.env.SUMMARY_RETRY_MAX ?? "4", 10);
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS ?? "60000", 10);

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

class AiRequestError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "AiRequestError";
    this.retryable = retryable;
  }
}

export interface StructuredJsonRequest {
  scope: string;
  systemInstruction: string;
  userPrompt: string;
  responseJsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiRuntimeConfig {
  provider: "gemini" | "none";
  model: string;
  retryMax: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeJsonText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  return trimmed;
}

async function requestGemini<T>(request: StructuredJsonRequest, apiKey: string, model: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: request.userPrompt }],
          },
        ],
        generationConfig: {
          candidateCount: 1,
          maxOutputTokens: request.maxOutputTokens ?? 600,
          temperature: request.temperature ?? 0,
          responseMimeType: "application/json",
          responseJsonSchema: request.responseJsonSchema,
        },
      }),
      signal: AbortSignal.timeout(Math.max(1000, DEFAULT_TIMEOUT_MS)),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError" || /timed out/i.test(error.message));
    throw new AiRequestError(
      timedOut ? `Gemini request timed out after ${DEFAULT_TIMEOUT_MS}ms` : "Gemini request failed before a response was received",
      true,
    );
  }

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new AiRequestError(
      payload.error?.message || `Gemini request failed with status ${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) {
    const blockReason = payload.promptFeedback?.blockReason;
    throw new AiRequestError(
      blockReason ? `Gemini returned no text (${blockReason})` : "Gemini returned no text",
      false,
    );
  }

  try {
    return JSON.parse(normalizeJsonText(text)) as T;
  } catch (error) {
    throw new AiRequestError(
      error instanceof Error ? `Gemini returned invalid JSON: ${error.message}` : "Gemini returned invalid JSON",
      false,
    );
  }
}

export function resolveAiRuntimeConfig(): AiRuntimeConfig {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return {
    provider: apiKey ? "gemini" : "none",
    model: DEFAULT_GEMINI_MODEL,
    retryMax: Math.max(0, DEFAULT_RETRY_MAX),
  };
}

export function buildAiCacheNamespace(scope: string): string {
  const config = resolveAiRuntimeConfig();
  return `${scope}:${config.provider}:${config.model}`;
}

export async function generateStructuredJson<T>(request: StructuredJsonRequest): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const config = resolveAiRuntimeConfig();

  if (!apiKey) {
    return null;
  }

  let attempt = 0;
  while (true) {
    try {
      return await requestGemini(request, apiKey, config.model);
    } catch (error) {
      const isRetryable = error instanceof AiRequestError ? error.retryable : false;
      if (!isRetryable || attempt >= config.retryMax) {
        throw error;
      }

      const backoffMs = 750 * 2 ** attempt;
      attempt += 1;
      await sleep(backoffMs);
    }
  }
}
