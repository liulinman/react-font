import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Only this dedicated, Git-ignored file is read; never load production .env files.
export async function loadCloudEnv(root) {
  try {
    const text = await readFile(resolve(root, '.env.cypress.local'), 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^(CYPRESS_PROJECT_ID|CYPRESS_RECORD_KEY)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!process.env.CYPRESS_PROJECT_ID) {
    const config = JSON.parse(await readFile(resolve(root, 'apps/english-world/cypress.cloud.json'), 'utf8'));
    process.env.CYPRESS_PROJECT_ID = config.projectId;
  }
}
