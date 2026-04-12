export interface SocrataFetchOptions {
  datasetId: string;
  where?: string;
  order?: string;
  select?: string;
  limit?: number;
  maxRows?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Paginated Socrata API fetcher.
 * Reads NYC_OPENDATA_APP_TOKEN from env for the X-App-Token header.
 * Retries up to 3 times on HTTP 429 with 2s backoff.
 */
export async function fetchSocrataAll<T>(options: SocrataFetchOptions): Promise<T[]> {
  const {
    datasetId,
    where,
    order,
    select,
    limit = 1000,
    maxRows = 50_000,
  } = options;

  const baseUrl = `https://data.cityofnewyork.us/resource/${datasetId}.json`;
  const appToken = process.env.NYC_OPENDATA_APP_TOKEN ?? "";

  const headers: Record<string, string> = {};
  if (appToken) {
    headers["X-App-Token"] = appToken;
  }

  const allRows: T[] = [];
  let offset = 0;
  let page = 0;

  while (allRows.length < maxRows) {
    const params = new URLSearchParams();
    params.set("$limit", String(limit));
    params.set("$offset", String(offset));
    if (where) params.set("$where", where);
    if (order) params.set("$order", order);
    if (select) params.set("$select", select);

    const url = `${baseUrl}?${params.toString()}`;
    let response: Response | null = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      response = await fetch(url, { headers });

      if (response.status === 429 && retries < maxRetries) {
        retries += 1;
        console.warn(`[socrata] rate-limited on dataset ${datasetId}, retry ${retries}/${maxRetries} after 2s`);
        await sleep(2000 * retries);
        continue;
      }

      break;
    }

    if (!response || !response.ok) {
      throw new Error(`[socrata] HTTP ${response?.status ?? "unknown"} fetching dataset ${datasetId}`);
    }

    const rows = (await response.json()) as T[];
    page += 1;
    console.log(`[socrata] fetched page ${page} (${rows.length} rows) for dataset ${datasetId}`);

    allRows.push(...rows);
    offset += limit;

    if (rows.length < limit) {
      break;
    }
  }

  return allRows.slice(0, maxRows);
}
