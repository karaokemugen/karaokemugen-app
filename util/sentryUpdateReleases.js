import { promises as fs } from 'node:fs';
import SentryCli from '@sentry/cli';

const { version } = JSON.parse(await fs.readFile('package.json', 'utf-8'));

const sentry = new SentryCli(null, {
	authToken: process.env.SENTRYTOKEN,
	org: 'karaoke-mugen',
});

const dist = process.env.CI_COMMIT_SHORT_SHA;

await sentry.releases.new(version, { projects: ['km-app'] });
await sentry.releases.uploadSourceMaps(version, {
	rewrite: false,
	urlPrefix: 'app:///dist/',
	include: ['dist/'],
	projects: ['km-app'],
	ext: ['.cjs', '.map'],
	dist,
});
await sentry.releases.uploadSourceMaps(version, {
	rewrite: false,
	urlPrefix: '~/static/js',
	include: ['kmfrontend/build/static/js'],
	projects: ['km-app'],
});
await sentry.releases.setCommits(version, {
	repo: 'Karaoke Mugen / Karaoke Mugen Application',
	commit: process.env.CI_COMMIT_SHA,
});

if (process.env.CI_COMMIT_TAG) {
	await sentry.releases.newDeploy(version, {
		env: 'release',
	});
}
