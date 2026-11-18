const fs = require("node:fs");
const path = require("node:path");

const projectDir = __dirname;
const outputDir = path.join(projectDir, "dist", "html5");
const runtimeFiles = [
  "index.html",
  "sentinel_v1.4_recreated.css",
  "firebase-leaderboard.js",
  "protocols.js",
  "waveControl.js",
  "sentinel_v1.4_recreated.js",
  "timelineEditorIntegration.js",
  "Editor.js",
  "tutorial.js",
];
const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".svg", ".mp3", ".wav", ".ogg"]);

fs.mkdirSync(outputDir, { recursive: true });

for (const file of runtimeFiles) {
  fs.copyFileSync(path.join(projectDir, file), path.join(outputDir, file));
}

for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
  if (entry.isFile() && mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
    fs.copyFileSync(path.join(projectDir, entry.name), path.join(outputDir, entry.name));
  }
}

console.log(`Created HTML5 build at ${outputDir}`);
