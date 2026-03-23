import path from "node:path";
import { DISTRICT_DATASET_URL, CONTENT_DIR, PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { DistrictRecord } from "../src/lib/types";

interface DistrictFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      coundist: string;
      shape_leng: string;
      shape_area: string;
    };
  }>;
}

interface SupplementalRow {
  slug: string | null;
  districtNumber: number;
  displayName: string;
}

export async function buildDistricts(): Promise<void> {
  const headers: Record<string, string> = {
    Accept: "application/geo+json, application/json",
  };

  if (process.env.NYC_OPENDATA_APP_TOKEN) {
    headers["X-App-Token"] = process.env.NYC_OPENDATA_APP_TOKEN;
  }

  const response = await fetch(DISTRICT_DATASET_URL, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to download district geometry: ${response.status}`);
  }

  const map = (await response.json()) as DistrictFeatureCollection;
  const supplemental = await readJsonFile<SupplementalRow[]>(path.join(CONTENT_DIR, "member-supplemental.json"));

  const supplementalByDistrict = new Map<number, SupplementalRow>();
  for (const row of supplemental) {
    supplementalByDistrict.set(row.districtNumber, row);
  }

  const districtsIndex: DistrictRecord[] = [];

  for (let districtNumber = 1; districtNumber <= 51; districtNumber += 1) {
    const supplementalRow = supplementalByDistrict.get(districtNumber);
    districtsIndex.push({
      districtNumber,
      memberSlug: supplementalRow?.slug ?? null,
      occupancyStatus: supplementalRow?.slug ? "seated" : "vacant",
      memberName: supplementalRow?.displayName ?? null,
    });
  }

  await ensureDir(PROCESSED_DIR);
  await ensureDir(PUBLIC_DATA_DIR);

  await writeJsonFile(path.join(PROCESSED_DIR, "district-map.geojson"), map);
  await writeJsonFile(path.join(PROCESSED_DIR, "districts-index.json"), districtsIndex);

  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "district-map.geojson"), map);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "districts-index.json"), districtsIndex);

  console.log(`[build-districts] wrote district map with ${map.features.length} features`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildDistricts().catch((error) => {
    console.error("[build-districts] failed", error);
    process.exitCode = 1;
  });
}
