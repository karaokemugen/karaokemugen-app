import internet from 'internet-available';
import { getConfig } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { getState } from '../utils/state';
import got from 'got';
import semver from 'semver';

export async function checkForUpdates(): Promise<string> {
	const conf = getConfig();
	if (!conf.Online.Updates) return null;
	try {
		await internet()
	} catch(err) {
		logger.warn(`[AppUpdate] Not connected to the internets, cannot check for updates : ${err}`)
		return null;
	}
	try {
		const currentVersion = getState().version.number;
		const res = await got.get('http://mugen.karaokes.moe/downloads/latest');
		const latestVersion = res.body;
		if (semver.gt(
			semver.valid(semver.coerce(latestVersion)),
			semver.valid(semver.coerce(currentVersion))
		)) return latestVersion;
	} catch(err) {
		logger.warn(`[AppUpdate] Unable to fetch latest version : ${err}`)
		return null;
	}
}