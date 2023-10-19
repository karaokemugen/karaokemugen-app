// This code doesn't know it yet but it's already dead.
// More seriously, we're centralizing all code bound to be removed at some point due to various migrations through KM's versions.
//
// When removing code here, remember to go see if all functions called are still useful.

import i18next from 'i18next';

import { insertCriteria, insertKaraIntoPlaylist, insertPlaylist } from '../dao/playlist.js';
import { db } from '../lib/dao/database.js';
import { editRepo, getRepo } from '../services/repo.js';
import { updateAllSmartPlaylists } from '../services/smartPlaylist.js';

/** Remove in KM 9.0 */
export function updateKaraMoeRepoConfig() {
	// Because we're idiots who didn't push the default Update=true to kara.moe repository (it's in the default for new installs but not for existing ones)
	// Also, we're idiots for not realizing BaseDir might be missing
	let repo;
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

/** Remove in KM 8.0 */
export async function migrateBLWLToSmartPLs() {
	const [BLCSets, BLCs, WL] = await Promise.all([
		db().query('SELECT * FROM blacklist_criteria_set'),
		db().query('SELECT * FROM blacklist_criteria'),
		db().query('SELECT * FROM whitelist'),
	]);
	// Convert whitelist, that's the easiest part.
	if (WL.rows.length > 0) {
		const plaid = await insertPlaylist({
			name: i18next.t('WHITELIST'),
			flag_whitelist: true,
			flag_visible: true,
			created_at: new Date(),
			modified_at: new Date(),
			username: 'admin',
		});
		let pos = 0;
		const songs = WL.rows.map(s => {
			pos += 1;
			return {
				plaid,
				username: 'admin',
				nickname: 'Dummy Plug System',
				kid: s.fk_kid,
				added_at: new Date(),
				pos,
				criteria: null,
				flag_visible: true,
			};
		});
		await insertKaraIntoPlaylist(songs);
	}
	// Blacklist(s)
	for (const set of BLCSets.rows) {
		const blc = BLCs.rows.filter(e => e.fk_id_blc_set === set.pk_id_blc_set);
		// No need to import an empty BLC set.
		if (blc.length === 0) continue;
		const plaid = await insertPlaylist({
			...set,
			flag_current: false,
			flag_visible: true,
			flag_blacklist: set.flag_current,
			flag_smart: true,
			username: 'admin',
			type_smart: 'UNION',
		});
		await insertCriteria(
			blc.map(e => ({
				plaid,
				type: e.type,
				value: e.value,
			}))
		);
	}
	await updateAllSmartPlaylists();
	try {
		await db().query('DROP TABLE IF EXISTS whitelist');
		await db().query('DROP TABLE IF EXISTS blacklist_criteria');
		await db().query('DROP TABLE IF EXISTS blacklist_criteria_set');
	} catch (err) {
		// Everything is daijokay
	}
}
