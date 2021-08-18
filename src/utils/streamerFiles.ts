import { promises as fs } from 'fs';
import i18next from 'i18next';
import debounce from 'lodash.debounce';
import {resolve} from 'path';
import { DBReady } from '../dao/database';

import {getConfig, resolvedPathStreamFiles} from '../lib/utils/config';
import { asyncCheckOrMkdir } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import {getSongSeriesSingers, getSongVersion} from '../services/kara';
import {getPlaylistInfo} from '../services/playlist';
import {StreamFileType} from '../types/streamerFiles';
import sentry from './sentry';
import {getState} from './state';

async function writeCurrentSong() {
	let output: string;
	const song = getState().player.currentSong;
	const media = getState().player.currentMedia;
	if (song) {
		output = `${getSongSeriesSingers(song)}\n${song.songtypes.map(s => s.name).join(' ')}${(!song.songorder || song.songorder === 0) ? '':song.songorder.toString()} - ${song.title} ${getSongVersion(song)}`;
	} else if (media) {
		output = getState().player.mediaType;
	} else {
		output = i18next.t('NO_KARA_PLAYING');
	}
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'song_name.txt'), output, 'utf-8');
}

async function writeRequester() {
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'requester.txt'), getState().player.currentSong?.nickname || '', 'utf-8');
}

async function writeURL() {
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'km_url.txt'), getState().osURL, 'utf-8');
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
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'frontend_status.txt'), i18next.t(output), 'utf-8');
}

async function writeKarasInPublicPL() {
	const {karacount} = await getPlaylistInfo(getState().publicPlaid);
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'public_kara_count.txt'),
		karacount.toString(), 'utf-8');
}

async function writeKarasInCurrentPL() {
	const {karacount} = await getPlaylistInfo(getState().currentPlaid);
	await fs.writeFile(resolve(resolvedPathStreamFiles(), 'current_kara_count.txt'),
		karacount.toString(), 'utf-8');
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

	let result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm' + (s < 10 ? '0' + s : s) + 's';
	if (format === 'ms') result = (m > 0 ? m + 'm' : '') + (s < 10 && m > 0 ? '0' + s : s) + 's';
	if (format === 'hm') result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	if (format === 'dhm') result = (d > 0 ? d + 'd' : '') + (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	if (format === 'mm:ss') result = m + ':' + (s < 10 ? '0' + s : s);
	return result;
}

async function writeTimeRemaining() {
	const {time_left} = await getPlaylistInfo(getState().currentPlaid);
	await fs.writeFile(resolve(getState().dataPath, getConfig().System.Path.StreamFiles, 'time_remaining_in_current_playlist.txt'),
		secondsTimeSpanToHMS(time_left, 'hm'), 'utf-8');
}

const debounceSettings: [number, {maxWait: number, leading: boolean}] = [1500, { maxWait: 3000, leading: true }];
const fnMap: Map<StreamFileType, () => Promise<void>> = new Map([
	['song_name', debounce(writeCurrentSong, ...debounceSettings)],
	['requester', debounce(writeRequester, ...debounceSettings)],
	['km_url', debounce(writeURL, ...debounceSettings)],
	['frontend_state', debounce(writeFrontendStatus, ...debounceSettings)],
	['current_kara_count', debounce(writeKarasInCurrentPL, ...debounceSettings)],
	['public_kara_count', debounce(writeKarasInPublicPL, ...debounceSettings)],
	['time_remaining_in_current_playlist', debounce(writeTimeRemaining, ...debounceSettings)]
]);

export async function writeStreamFiles(only?: StreamFileType): Promise<void> {
	if (!getConfig().Karaoke.StreamerMode.Enabled && !getState().ready && !DBReady) return;
	try {
		await asyncCheckOrMkdir(resolvedPathStreamFiles());
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
		logger.warn('Cannot write stream files', {service: 'StreamFiles', obj: err});
		sentry.error(err, 'Warning');
	}
}
