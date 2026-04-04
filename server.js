import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const PORT = process.env.PORT || 5000;

// Run a shell command, streaming output to the console
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log(`[server] Running: ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, { stdio: "inherit", shell: false });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`[server] Done: ${cmd} ${args.join(" ")}`);
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
    proc.on("error", reject);
  });
}

async function syncAndBuild() {
  const startedAt = new Date().toISOString();
  console.log(`[server] Starting data refresh at ${startedAt}`);
  try {
    await runCommand("npm", ["run", "data:sync"]);
    await runCommand("npm", ["run", "build"]);
    console.log(`[server] Data refresh complete.`);
  } catch (err) {
    console.error("[server] Data refresh failed:", err.message);
  }
}

function scheduleNightlyRefresh() {
  const now = new Date();
  // Target: 3:00 AM UTC
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  const msUntilNext = next - now;
  console.log(`[server] Next data refresh scheduled in ${Math.round(msUntilNext / 1000 / 60)} minutes (at ${next.toISOString()})`);

  setTimeout(async () => {
    await syncAndBuild();
    scheduleNightlyRefresh();
  }, msUntilNext);
}

async function main() {
  // If no build exists yet, do an initial sync + build before starting the server
  if (!existsSync(DIST_DIR)) {
    console.log("[server] No build found. Running initial data sync and build...");
    await syncAndBuild();
  }

  const app = express();

  // Serve static files from the built app
  app.use(express.static(DIST_DIR));

  // For client-side routing — fall back to index.html for unmatched routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Serving on http://0.0.0.0:${PORT}`);
    scheduleNightlyRefresh();
  });
}

main().catch((err) => {
  console.error("[server] Fatal:", err);
  process.exit(1);
});
