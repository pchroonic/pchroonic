#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const baseFromEvent = process.env.HANDOFF_BASE;
const head = process.env.HANDOFF_HEAD || "HEAD";
const isZeroSha = (value) => /^0+$/.test(value || "");

let range;
if (process.env.GITHUB_BASE_REF) {
  range = `origin/${process.env.GITHUB_BASE_REF}...${head}`;
} else if (baseFromEvent && !isZeroSha(baseFromEvent)) {
  range = `${baseFromEvent}...${head}`;
} else {
  range = `${head}^...${head}`;
}

let changedFiles;
try {
  changedFiles = execFileSync("git", ["diff", "--name-only", range], {
    encoding: "utf8",
  })
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
} catch (error) {
  console.error(`Unable to inspect changed files for ${range}.`);
  process.exit(1);
}

const documentationOnly = (file) =>
  file === "AGENTS.md" ||
  file === "CLAUDE.md" ||
  file === "README.md" ||
  file.startsWith("docs/") ||
  file.startsWith(".github/") ||
  file === "scripts/check-ai-handoff.mjs";

const productChanges = changedFiles.filter((file) => !documentationOnly(file));

if (productChanges.length === 0) {
  console.log("No product-source changes require a continuity update.");
  process.exit(0);
}

const required = [
  "docs/AI_START.md",
  "docs/AI_HANDOFF.md",
  "docs/PROJECT_STATUS.md",
];
const missing = required.filter((file) => !changedFiles.includes(file));

if (missing.length > 0) {
  console.error("Product-source changes were detected:");
  productChanges.forEach((file) => console.error(`- ${file}`));
  console.error("\nUpdate these continuity files in the same change:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Namdar fast-resume, technical handoff and project-status files were updated with the product change.");
