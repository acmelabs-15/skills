/**
 * The name of the file the user actually invoked.
 *
 * Usage strings must not hardcode a source filename. These CLIs are authored as
 * `.ts` and shipped as bundled `.js`, so a hardcoded `decompose.ts` tells a user
 * of the installed plugin to run a file that is not there.
 *
 * Derived from `process.argv[1]` — the script path the runtime was handed — so it
 * reports `decompose.ts` under `bun src/decompose.ts` and `decompose.js` under
 * `bun dist/cli/decompose.js`, with no build-time knowledge required.
 *
 * `import.meta.file` is deliberately not used: with `splitting: true` a shared
 * module is inlined into each entry point, and its `import.meta.file` resolves to
 * the entry point that absorbed it rather than to itself. That is correct only by
 * accident when the caller happens to be the entry point, and silently wrong
 * otherwise.
 */
export function invokedName(fallback: string): string {
  const argv1 = process.argv[1];
  if (!argv1) return fallback;
  const base = argv1.split("/").pop();
  return base && base.length > 0 ? base : fallback;
}
