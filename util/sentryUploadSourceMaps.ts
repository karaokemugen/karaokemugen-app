import execa from "execa";
import {version} from "../src/version";

const sentry = execa.command(`yarn sentry-cli --auth-token ${process.env.SENTRYTOKEN} releases --org karaoke-mugen -p karaoke-mugen-app files ${version.number} upload-sourcemaps --no-rewrite --url-prefix 'app:///dist/' dist/`);
sentry.stdout.pipe(process.stdout);
sentry.stderr.pipe(process.stderr);