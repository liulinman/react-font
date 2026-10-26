// Preserve the existing command while using the canonical Freewing asset pipeline.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
execFileSync(process.execPath,[fileURLToPath(new URL('../../../scripts/generate-brand-assets.mjs',import.meta.url)),'--app','english-world'],{stdio:'inherit'});
