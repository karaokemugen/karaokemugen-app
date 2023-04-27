import electron from 'electron';
import { build, buildSync } from 'esbuild';
import { execa } from 'execa';
import { rimraf } from 'rimraf';

const buildOptions = {
	outfile: 'dist/index.cjs',
	entryPoints: ['src/index.ts'],
	platform: 'node',
	target: 'node16',
	format: 'cjs',
	bundle: true,
	sourcemap: true,
	conditions: ['module'],
	external: ['electron', 'pg-native', 'fsevents'],
	legalComments: 'external',
	color: true,
	logLevel: 'info',
};

let edited = true;

console.log('Clearing dist/');
await rimraf('dist/');

if (process.argv[2] === 'watch') {
	console.log('Launching esbuild');
	const builder = await build({
		...buildOptions,
		watch: {
			onRebuild: err => {
				edited = !err;
			},
		},
		minify: false,
	});
	console.log('Electron watch, close the app to rerun after edits, close without edits to quit');
	while (edited) {
		edited = false;
		await execa(electron, ['.'], { stdio: 'inherit' });
	}
	builder.stop();
} else {
	buildSync(buildOptions);
}
