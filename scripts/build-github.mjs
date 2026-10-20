import { spawnSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";

// O HTML inicial usa a mesma leitura validada que o navegador consulta.
copyFileSync("public/data/calendar.json", "lib/calendar-seed.json");

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, GITHUB_PAGES_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.status !== 0) process.exit(result.status || 1);
writeFileSync("out/.nojekyll", "");
