const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const stagingDir = path.join(os.tmpdir(), "Sentinel-build");
const artifactName = `Sentinel-${require("./package.json").version}-Windows-x64.exe`;
const build = spawnSync(
  process.execPath,
  [
    require.resolve("electron-builder/cli.js"),
    "--win",
    "portable",
    "--x64",
    `--config.directories.output=${stagingDir}`,
  ],
  { cwd: __dirname, stdio: "inherit" }
);

if (build.error) {
  throw build.error;
}
if (build.status !== 0) {
  process.exitCode = build.status || 1;
} else {
  const artifactPath = path.join(stagingDir, artifactName);
  const outputDir = path.join(__dirname, "dist");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.copyFileSync(artifactPath, path.join(outputDir, artifactName));
  console.log(`Created ${path.join(outputDir, artifactName)}`);
}
