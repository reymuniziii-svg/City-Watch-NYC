import path from "node:path";

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const PROCESSED_DIR = path.join(DATA_DIR, "processed");
export const PUBLIC_DATA_DIR = path.join(ROOT_DIR, "public", "data");
export const CONTENT_DIR = path.join(ROOT_DIR, "content");
export const RAW_UPSTREAM_DIR = path.join(RAW_DIR, "nyc_legislation");

export const SESSION_START_YEAR = Number.parseInt(process.env.SESSION_START_YEAR ?? "2026", 10);
export const SESSION_END_YEAR = Number.parseInt(process.env.SESSION_END_YEAR ?? "2029", 10);

export const SESSION_YEARS = Array.from({ length: SESSION_END_YEAR - SESSION_START_YEAR + 1 }, (_, idx) => SESSION_START_YEAR + idx);

export const SUMMARY_CACHE_FILE = path.join(PROCESSED_DIR, "summary-cache.json");
export const HEARING_CACHE_FILE = path.join(PROCESSED_DIR, "hearing-cache.json");

export const DISTRICT_DATASET_URL = "https://data.cityofnewyork.us/resource/872g-cjhh.geojson?$limit=6000";
export const CITYMEETINGS_COUNCIL_URL = "https://citymeetings.nyc/meetings/new-york-city-council/";
export const CFB_BASE_URL = "https://www.nyccfb.info";
export const CFB_CONTRIBUTIONS_URL = `${CFB_BASE_URL}/datalibrary/2025_Contributions.csv`;
export const CFB_EXPENDITURES_URL = `${CFB_BASE_URL}/datalibrary/2025_Expenditures.csv`;
export const CFB_FINANCIAL_ANALYSIS_URL = `${CFB_BASE_URL}/DataLibrary/EC2025_FinancialAnalysis.csv`;
export const CFB_PAYMENTS_URL = `${CFB_BASE_URL}/DataLibrary/2025_Payments.csv`;
