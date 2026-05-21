#!/usr/bin/env bun
import { readdirSync, renameSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const PROJECT_ROOT = "/Users/peter.kloss/Dev/ACMElabs/skills";
const DOCS = join(PROJECT_ROOT, "docs");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && entry.name.endsWith(".md")) yield p;
  }
}

const renames: Array<{ from: string; to: string }> = [];
const contentTouches: string[] = [];

// Pass 1: rewrite every .md file under docs/** that mentions TEST-REPORT
for (const filePath of walk(DOCS)) {
  const original = await Bun.file(filePath).text();
  let next = original;

  // Frontmatter title: 'TEST-REPORT-... → 'QA-...
  next = next.replace(/^title:\s*'TEST-REPORT-/m, "title: 'QA-");
  // Frontmatter type
  next = next.replace(/^type:\s*test-report\s*$/m, "type: qa");
  // Permalink (handles qa/test-report- and any test-report-)
  next = next.replace(/permalink:\s*qa\/test-report-/g, "permalink: qa/qa-");
  // Tags list: lone `- test-report` line under tags
  next = next.replace(/^- test-report$/gm, "- qa");
  // H1 heading
  next = next.replace(/^# TEST-REPORT-/m, "# QA-");
  // Inline wikilinks (with or without colon)
  next = next.replace(/\[\[TEST-REPORT-/g, "[[QA-");
  // Body / inline text refs to specific identifiers (preserve digits)
  next = next.replace(/\bTEST-REPORT-(\d{3})/g, "QA-$1");
  next = next.replace(/\btest-report-(\d{3})/g, "qa-$1");
  // Comprehensive prose pass — rename the concept everywhere (regex schemas, narrative, lists).
  // Safe because structured edits above have already renamed all proper identifiers; remaining
  // occurrences are the concept name itself, which the user is renaming TEST-REPORT → QA.
  next = next.replace(/TEST-REPORT/g, "QA");
  next = next.replace(/test-report/g, "qa");

  if (next !== original) {
    await Bun.write(filePath, next);
    contentTouches.push(filePath);
  }

  // Plan rename if filename starts with TEST-REPORT-
  const base = basename(filePath);
  if (base.startsWith("TEST-REPORT-")) {
    const newBase = base.replace(/^TEST-REPORT-/, "QA-");
    const newPath = join(dirname(filePath), newBase);
    renames.push({ from: filePath, to: newPath });
  }
}

// Pass 2: apply file renames (after content edits, before reporting)
for (const { from, to } of renames) {
  renameSync(from, to);
}

console.log(`Content edits: ${contentTouches.length} file(s)`);
console.log(`File renames: ${renames.length} file(s)`);
if (renames.length > 0) {
  console.log("\nRenamed files:");
  for (const r of renames) {
    console.log(`  ${basename(r.from)} → ${basename(r.to)}`);
  }
}
