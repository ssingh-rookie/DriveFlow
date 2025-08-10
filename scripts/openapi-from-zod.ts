// Produces packages/contracts/openapi.json from Zod schemas.
// Run via: pnpm gen:openapi
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const contractsPath = resolve(process.cwd(), 'packages/contracts/src/index.ts');
  const contracts = await import(pathToFileURL(contractsPath).toString());
  const doc = (contracts as any).openApiDoc;

  if (!doc) {
    console.error('❌ Expected packages/contracts/src/index.ts to export openApiDoc');
    process.exit(1);
  }

  const out = resolve(process.cwd(), 'packages/contracts/openapi.json');
  writeFileSync(out, JSON.stringify(doc, null, 2));
  console.log(`✅ Wrote OpenAPI to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
