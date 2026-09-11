// Build and validate in isolation before replacing live outputs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishContent } from './publish.mjs';
try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry')) throw new Error('Usage: node ship.mjs [--dry]');
  publishContent({
    projectRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    dry: args.includes('--dry'), tsxCli: process.env.HOBAT_TSX_CLI,
  });
} catch (error) {
  console.error(`NOT SHIPPING: ${error.message}`);
  process.exitCode = 1;
}
