#!/usr/bin/env bun
import { readdirSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = "/Users/peter.kloss/Dev/ACMElabs/skills";
const DOCS = join(PROJECT_ROOT, "docs");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && entry.name.endsWith(".md")) yield p;
  }
}

// Strip basic-memory collision suffix `-1` or `-2` from permalink lines.
// Important: only single-digit suffixes (-1/-2) are stripped; -001/-002 (3-digit) are
// legitimate slug components and must be preserved.
let edited = 0;
let stripped = 0;
for (const filePath of walk(DOCS)) {
  const original = await Bun.file(filePath).text();
  let next = original;

  next = next.replace(/^(permalink:\s*\S+)-([12])$/gm, (_full, head: string) => {
    stripped++;
    return head;
  });

  if (next !== original) {
    await Bun.write(filePath, next);
    edited++;
  }
}

console.log(`Files edited: ${edited}`);
console.log(`Permalink suffixes stripped: ${stripped}`);
