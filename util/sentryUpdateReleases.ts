import execa from 'execa';

import {version} from '../src/version';

// Create the release if it doesn't exists
execa.commandSync(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app new ${version.number}`,
	{stdout: 'inherit', stderr: 'inherit'});

execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app files ${version.number} upload-sourcemaps --no-rewrite --url-prefix app:///dist/ dist/`,
	{stdout: 'inherit', stderr: 'inherit'});

execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app files ${version.number} upload-sourcemaps --no-rewrite --url-prefix / frontend/build/`,
	{stdout: 'inherit', stderr: 'inherit'});

execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app files ${version.number} upload-sourcemaps --no-rewrite --url-prefix /system/ systempanel/build/`,
	{stdout: 'inherit', stderr: 'inherit'});

execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app set-commits --commit Karaoke\\ Mugen\\ /\\ Karaoke\\ Mugen\\ Application@${process.env.CI_COMMIT_SHA} ${version.number}`,
	{stdout: 'inherit', stderr: 'inherit'});

// If tagged, deploy release
if (process.env.CI_COMMIT_TAG) {
	execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p km-app deploys ${version.number} new -e release`,
		{stdout: 'inherit', stderr: 'inherit'});
}
