import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { build, context } from 'esbuild';
import { execa } from 'execa';
import { rimraf } from 'rimraf';

const buildOptions = {
	outfile: 'dist/index.mjs',
	entryPoints: ['src/index.ts'],
	platform: 'node',
	target: 'node24',
	format: 'esm',
	bundle: true,
	sourcemap: true,
	external: ['cpu-features', 'electron', 'pg-native', 'fsevents'],
	legalComments: 'external',
	color: true,
	logLevel: 'info',
	banner: {
		js: `
import { createRequire as _createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = _createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);
`.trim(),
	},
};

let edited = true;

console.log('Clearing dist/');
await rimraf('dist/');

try {
	await build(buildOptions);
} catch (err) {
	console.error('Build failed:', err);
	process.exit(1);
}
