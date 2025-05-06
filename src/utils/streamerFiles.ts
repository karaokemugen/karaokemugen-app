import { promises as fs } from 'fs';
import i18next from 'i18next';
import { debounce } from 'lodash';
import { resolve } from 'path';

import { getConfig, resolvedPath } from '../lib/utils/config.js';
import { asyncCheckOrMkdir } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import { getNextSong, getPlaylistInfo } from '../services/playlist.js';
import { StreamFileType } from '../types/streamerFiles.js';
import sentry from './sentry.js';
import { getState } from './state.js';

const service = 'StreamerFiles';

async function writeCurrentSong() {
	let output: string;
	const song = getState().player.currentSong;
	const media = getState().player.currentMedia;
	if (song) {
		output = song.songname;
	} else if (media) {
		output = getState().player.mediaType;
	} else {
		output = i18next.t('NO_KARA_PLAYING');
	}
	await fs.writeFile(resolve(resolvedPath('StreamFiles'), 'song_name.txt'), output, 'utf-8');
}

async function writeRequester() {
	const song = getState().player.currentSong;
	await fs.writeFile(resolve(resolvedPath('StreamFiles'), 'requester.txt'), song?.nickname || '', 'utf-8');
}

async function writeNextSongAndRequester() {
	try {
		const song = await getNextSong();
		await fs.writeFile(
			resolve(resolvedPath('StreamFiles'), 'next_song_name.txt'),
			song ? song.songname : '',
			'utf-8'
		);
		await fs.writeFile(resolve(resolvedPath('StreamFiles'), 'next_requester.txt'), song?.nickname || '', 'utf-8');
	} catch (err) {
		// Not fatal
	}
}

async function writePlayerStatus() {
	await fs.writeFile(
		resolve(resolvedPath('StreamFiles'), 'player_status.txt'),
		getState().player?.playerStatus || 'stopped',
		'utf-8'
	);
}

async function writeURL() {
	await fs.writeFile(resolve(resolvedPath('StreamFiles'), 'km_url.txt'), getState().osURL, 'utf-8');
}

async function writeFrontendStatus() {
	let output: string;
	switch (getConfig().Frontend.Mode) {
		case 2:
			output = 'INTERFACE_OPENED';
			break;
		case 1:
			output = 'INTERFACE_RESTRICTED';
			break;
		case 0:
		default:
			output = 'INTERFACE_CLOSED';
			break;
	}
	await fs.writeFile(resolve(resolvedPath('StreamFiles'), 'frontend_status.txt'), i18next.t(output), 'utf-8');
}

async function writeKarasInPublicPL() {
	const pl = await getPlaylistInfo(getState().publicPlaid);
	await fs.writeFile(
		resolve(resolvedPath('StreamFiles'), 'public_kara_count.txt'),
		pl?.karacount?.toString(),
		'utf-8'
	);
}

/* format seconds to Hour Minute Second */
function secondsTimeSpanToHMS(s: number, format: string) {
	const d = Math.floor(s / (3600 * 24));
	if (format === '24h' || format === 'dhm') {
		s -= d * 3600 * 24;
	}
	const h = Math.floor(s / 3600);
	if (format !== 'ms') {
		s -= h * 3600;
	}
	const m = Math.floor(s / 60);
	s -= m * 60;

	let result = `${(h > 0 ? `${h}h` : '') + (m < 10 ? `0${m}` : m)}m${s < 10 ? `0${s}` : s}s`;
	if (format === 'ms') result = `${(m > 0 ? `${m}m` : '') + (s < 10 && m > 0 ? `0${s}` : s)}s`;
	if (format === 'hm') result = `${(h > 0 ? `${h}h` : '') + (m < 10 ? `0${m}` : m)}m`;
	if (format === 'dhm') result = `${(d > 0 ? `${d}d` : '') + (h > 0 ? `${h}h` : '') + (m < 10 ? `0${m}` : m)}m`;
	if (format === 'mm:ss') result = `${m}:${s < 10 ? `0${s}` : s}`;
	return result;
}

async function writePlaylistInfo() {
	const currentPlaidInfo = await getPlaylistInfo(getState().currentPlaid);
	if (currentPlaidInfo) {
		await Promise.all([
			fs.writeFile(
				resolve(
					getState().dataPath,
					getConfig().System.Path.StreamFiles,
					'time_remaining_in_current_playlist.txt'
				),
				secondsTimeSpanToHMS(currentPlaidInfo.time_left, 'hm'),
				'utf-8'
			),
			fs.writeFile(
				resolve(
					getState().dataPath,
					getConfig().System.Path.StreamFiles,
					'time_played_in_current_playlist.txt'
				),
				secondsTimeSpanToHMS(currentPlaidInfo.time_played, 'hm'),
				'utf-8'
			),
			fs.writeFile(
				resolve(getState().dataPath, getConfig().System.Path.StreamFiles, 'time_total_in_current_playlist.txt'),
				secondsTimeSpanToHMS(currentPlaidInfo.duration, 'hm'),
				'utf-8'
			),
			fs.writeFile(
				resolve(getState().dataPath, getConfig().System.Path.StreamFiles, 'curent_kara_count.txt'),
				`${currentPlaidInfo.karacount}`,
				'utf-8'
			),
			fs.writeFile(
				resolve(getState().dataPath, getConfig().System.Path.StreamFiles, 'songs_left_in_current_playlist.txt'),
				`${currentPlaidInfo.songs_left}`,
				'utf-8'
			),
			fs.writeFile(
				resolve(
					getState().dataPath,
					getConfig().System.Path.StreamFiles,
					'songs_played_in_current_playlist.txt'
				),
				`${currentPlaidInfo.songs_played}`,
				'utf-8'
			),
		]);
	}
}

const debounceSettings: [number, { maxWait: number; leading: boolean }] = [1500, { maxWait: 3000, leading: true }];
const fnMap: Map<StreamFileType, () => Promise<void>> = new Map([
	['song_name', debounce(writeCurrentSong, ...debounceSettings)],
	['requester', debounce(writeRequester, ...debounceSettings)],
	['next_song_name_and_requester', debounce(writeNextSongAndRequester, ...debounceSettings)],
	['km_url', debounce(writeURL, ...debounceSettings)],
	['frontend_state', debounce(writeFrontendStatus, ...debounceSettings)],
	['public_kara_count', debounce(writeKarasInPublicPL, ...debounceSettings)],
	['current_playlist_info', debounce(writePlaylistInfo, ...debounceSettings)],
	['player_status', debounce(writePlayerStatus, ...debounceSettings)],
]);

export async function writeStreamFiles(only?: StreamFileType): Promise<void> {
	if (!getState().ready || !getState().DBReady) return;
	try {
		await asyncCheckOrMkdir(resolvedPath('StreamFiles'));
		if (only) {
			await fnMap.get(only)();
		} else {
			const promises: Promise<void>[] = [];
			for (const fn of fnMap.values()) {
				promises.push(fn());
			}
			await Promise.all(promises);
		}
	} catch (err) {
		logger.warn('Cannot write stream files', { service, obj: err });
		sentry.error(err, 'warning');
	}
}
