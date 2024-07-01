// This code doesn't know it yet but it's already dead.
// More seriously, we're centralizing all code bound to be removed at some point due to various migrations through KM's versions.
//
// When removing code here, remember to go see if all functions called are still useful.

import i18next from 'i18next';
import semver from 'semver';

import { insertCriteria, insertKaraIntoPlaylist, insertPlaylist } from '../dao/playlist.js';
import { db } from '../lib/dao/database.js';
import { editRepo, getRepo } from '../services/repo.js';
import { updateAllSmartPlaylists } from '../services/smartPlaylist.js';
import { Repository } from '../lib/types/repo.js';
import { getState } from './state.js';

/** Remove when we drop support for mpv <0.38.0 */
export function mpvIsRecentEnough() {
	const mpvVersion = getState().player?.version;
	if (mpvVersion && !semver.satisfies(mpvVersion, '>=0.38.0')) {
		return false;
	}
	return true;
}

/** Remove in KM 10.0 */
export function updateKaraMoeSecureConfig() {
	let repo: Repository;
	try {
		repo = getRepo('kara.moe');
	} catch (err) {
		// No repository found. It's daijoubou.
		return;
	}
	if (repo && repo.Secure === undefined) {
		repo.Secure = true;
		editRepo('kara.moe', repo, false, false);
	}
}

/** Remove in KM 9.0 */
export function updateKaraMoeRepoConfig() {
	// Because we're idiots who didn't push the default Update=true to kara.moe repository (it's in the default for new installs but not for existing ones)
	// Also, we're idiots for not realizing BaseDir might be missing
	let repo: Repository;
	try {
		repo = getRepo('kara.moe');
	} catch (err) {
		// No repository found. It's daijoubou.
		return;
	}
	if (repo && repo.Update === undefined) {
		repo.Update = true;
		editRepo('kara.moe', repo, false, false);
	}
	if (repo && !repo.BaseDir) {
		repo.BaseDir = process.platform === 'win32' ? 'repos\\kara.moe\\json' : 'repos/kara.moe/json';
		editRepo('kara.moe', repo, false, false);
	}
}
