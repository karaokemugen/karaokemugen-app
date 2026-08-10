import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { build, context } from 'esbuild';
import { execa } from 'execa';
import { rimraf } from 'rimraf';
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";

const buildOptions = {
	outfile: 'dist/index.mjs',
	entryPoints: ['src/index.ts'],
	plugins: process.env.SENTRY_AUTH_TOKEN && process.env.CI_COMMIT_TAG && process.env.CI_JOB_STAGE !== 'test' ? [
    // Put the Sentry esbuild plugin after all other plugins
    sentryEsbuildPlugin({
			authToken: process.env.SENTRY_AUTH_TOKEN,
			org: "karaoke-mugen",
			project: "km-app",
			release: {
				name: process.env.CI_COMMIT_TAG,
				dist: process.env.CI_COMMIT_SHORT_SHA,
				setCommits: {
					repo: 'Karaoke Mugen / Code / Karaoke Mugen Application',
					commit: process.env.CI_COMMIT_SHA,
				},
				...(process.env.CI_COMMIT_TAG ? { deploy: { env: 'release' } } : {}),				
			}
		}),
  	] : [],
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
