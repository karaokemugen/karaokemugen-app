import { execaCommand, execaSync } from 'execa';
import { promises as fs } from 'node:fs';

const { version } = JSON.parse(await fs.readFile('package.json'));

// Create the release if it doesn't exists
execaSync(
	`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app new ${version}`,
	{ stdout: 'inherit', stderr: 'inherit' }
);

execaCommand(
	`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app files ${version} upload-sourcemaps --no-rewrite --url-prefix app:///dist/ dist/`,
	{ stdout: 'inherit', stderr: 'inherit' }
);

execaCommand(
	`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app files ${version} upload-sourcemaps --no-rewrite --url-prefix ~/static/js kmfrontend/build/static/js`,
	{ stdout: 'inherit', stderr: 'inherit' }
);

execaCommand(
	`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app set-commits --commit Karaoke\\ Mugen\\ /\\ Karaoke\\ Mugen\\ Application@${process.env.CI_COMMIT_SHA} ${version}`,
	{ stdout: 'inherit', stderr: 'inherit' }
);

// If tagged, deploy release
if (process.env.CI_COMMIT_TAG) {
	execaCommand(
		`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app deploys ${version} new -e release`,
		{ stdout: 'inherit', stderr: 'inherit' }
	);
}
