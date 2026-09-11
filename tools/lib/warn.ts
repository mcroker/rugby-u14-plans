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
