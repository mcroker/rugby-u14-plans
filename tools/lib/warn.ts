/**
 * Build warnings. The build exits non-zero if any were raised, so a missing
 * diagram or a run-sheet the parser could not read fails loudly rather than
 * quietly publishing a broken page.
 */
const warnings: string[] = [];

export function warn(msg: string): void {
  warnings.push(msg);
  process.stderr.write(`WARNING: ${msg}\n`);
}

export function allWarnings(): readonly string[] {
  return warnings;
}

/**
 * Something worth saying but not worth failing over — a rewrite rule that no
 * longer matches, say. A broken page must fail the build; a stale line in
 * someone's config must not, or the first reworded sentence in a fork stops
 * the site from publishing at all.
 */
export function note(msg: string): void {
  console.log(`note: ${msg}`);
}
