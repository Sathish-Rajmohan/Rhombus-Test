import { spawnSync } from 'child_process';
import * as path from 'path';

// Resolve to Rhombus-Test/data-validation/validate_output.py from ui-tests/helpers.
const VALIDATOR_SCRIPT = path.resolve(
  __dirname,
  '..',
  '..',
  'data-validation',
  'validate_output.py',
);

// PYTHON env var lets CI pin a specific interpreter (e.g. venv path).
// Defaults to 'python' which is on PATH on Windows and on GH Actions runners
// after actions/setup-python@v5.
const PYTHON_CMD: string = process.env.PYTHON || 'python';

export interface ValidatorResult {
  ok: boolean;
  message: string;
}

/**
 * Run the Python data validator against a CSV produced by the live UI flow.
 * Returns { ok, message } so callers can feed `message` straight into an
 * `expect(ok, message).toBe(true)` assertion without triggering ESLint's
 * no-conditional-in-test rule.
 */
export function runDataValidator(outputPath: string, inputPath: string): ValidatorResult {
  const result = spawnSync(
    PYTHON_CMD,
    [VALIDATOR_SCRIPT, '--output', outputPath, '--input', inputPath],
    { encoding: 'utf-8' },
  );
  const stdout: string = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr: string = typeof result.stderr === 'string' ? result.stderr : '';
  const exitCode: number | null = result.status;
  const ok: boolean = exitCode === 0;
  const message: string = [
    `Data validator (${PYTHON_CMD} ${VALIDATOR_SCRIPT}):`,
    `  artifact: ${outputPath}`,
    `  exit: ${String(exitCode)}`,
    `  stdout:`,
    stdout,
    `  stderr:`,
    stderr,
  ].join('\n');

  return { ok, message };
}
