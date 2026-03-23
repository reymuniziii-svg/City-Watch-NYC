import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureDir, fileExists } from "./lib/fs-utils";
import { RAW_DIR, RAW_UPSTREAM_DIR } from "./lib/constants";

const execFileAsync = promisify(execFile);
const UPSTREAM_REPO = "https://github.com/jehiah/nyc_legislation.git";

async function runGit(args: string[]) {
  await execFileAsync("git", args, { maxBuffer: 1024 * 1024 * 50 });
}

async function run() {
  await ensureDir(RAW_DIR);

  const hasGit = await fileExists(`${RAW_UPSTREAM_DIR}/.git`);

  if (!hasGit) {
    console.log("[sync-upstream] cloning upstream data repository...");
    await runGit(["clone", "--depth", "1", UPSTREAM_REPO, RAW_UPSTREAM_DIR]);
    return;
  }

  console.log("[sync-upstream] pulling latest upstream data...");
  await runGit(["-C", RAW_UPSTREAM_DIR, "pull", "--ff-only", "origin", "master"]);
}

run().catch((error) => {
  console.error("[sync-upstream] failed", error);
  process.exitCode = 1;
});
