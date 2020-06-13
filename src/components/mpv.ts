import execa from 'execa';
import i18n from 'i18next';
import sample from 'lodash.sample';
import mpv from 'node-mpv';
import retry from 'p-retry';
import {extname,resolve} from 'path';
import randomstring from 'randomstring';
import semver from 'semver';
import {promisify} from 'util';
import logger from 'winston';

import { setProgressBar } from '../electron/electron';
import { errorStep } from '../electron/electronLogger';
import {getConfig, resolvedPathBackgrounds, resolvedPathRepos,resolvedPathTemp} from '../lib/utils/config';
import { imageFileTypes } from '../lib/utils/constants';
import {asyncExists, asyncReadDir, isImageFile, replaceExt,resolveFileInDirs} from '../lib/utils/files';
import sentry from '../utils/sentry';
import { getSingleMedia } from '../services/medias';
import {playerEnding} from '../services/player';
import { notificationNextSong } from '../services/playlist';
import {endPoll} from '../services/poll';
import { MediaType } from '../types/medias';
import {MediaData, mpvStatus,PlayerState} from '../types/player';
import { initializationCatchphrases } from '../utils/constants';
import { setDiscordActivity } from '../utils/discordRPC';
import {getID3} from '../utils/id3tag';
import {getState, setState} from '../utils/state';
import {exit} from './engine';

const sleep = promisify(setTimeout);

let displayingInfo = false;
let player: any;
let playerMonitor: any;
let monitorEnabled = false;
let songNearEnd = false;
let nextSongNotifSent = false;

const playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerstatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	duration: 0,
	mute: false,
	subtext: null,
	currentSongInfos: null,
	mediaType: 'background',
	showsubs: true,
	stayontop: false,
	fullscreen: false,
	url: null
};

function emitPlayerState() {
	setState({player: playerState});
}

async function ensureRunning() {
	try {
		if (!player?.isRunning()) {
			if (monitorEnabled && !playerMonitor?.isRunning()) await playerMonitor.quit();
			await startmpv();
		}
	} catch(err) {
		sentry.error(err);
		throw err;
	}
}

async function extractAllBackgroundFiles(): Promise<string[]> {
	let backgroundFiles = [];
	for (const resolvedPath of resolvedPathBackgrounds()) {
		backgroundFiles = backgroundFiles.concat(await extractBackgroundFiles(resolvedPath));
	}
	// Return only files which have an extension included in the imageFileTypes array
	return backgroundFiles.filter(f => imageFileTypes.includes(extname(f).substring(1)));
}

async function extractBackgroundFiles(backgroundDir: string): Promise<string[]> {
	const backgroundFiles = [];
	const dirListing = await asyncReadDir(backgroundDir);
	for (const file of dirListing) {
		if (isImageFile(file)) backgroundFiles.push(resolve(backgroundDir, file));
	}
	return backgroundFiles;
}

export async function loadBackground() {
	await ensureRunning().catch(err => {
		throw err;
	});
	const conf = getConfig();
	// Default background
	let backgroundFiles = [];
	const defaultImageFile = resolve(resolvedPathTemp(), 'default.jpg');
	let backgroundImageFile = defaultImageFile;
	if (conf.Player.Background) {
		backgroundImageFile = resolve(resolvedPathBackgrounds()[0], conf.Player.Background);
		if (!await asyncExists(backgroundImageFile)) {
			// Background provided in config file doesn't exist, reverting to default one provided.
			logger.warn(`[Player] Unable to find background file ${backgroundImageFile}, reverting to default one`);
			backgroundFiles.push(defaultImageFile);
		} else {
			backgroundFiles.push(backgroundImageFile);
		}
	} else {
		// PlayerBackground is empty, thus we search through all backgrounds paths and pick one at random
		backgroundFiles = await extractAllBackgroundFiles();
		// If backgroundFiles is empty, it means no file was found in the directories scanned.
		// Reverting to original, supplied background :
		if (backgroundFiles.length === 0) backgroundFiles.push(defaultImageFile);
	}
	backgroundImageFile = sample(backgroundFiles);
	logger.debug(`[Player] Background selected : ${backgroundImageFile}`);
	try {
		const loads = [
			player.load(backgroundImageFile, 'replace')
		];
		if (monitorEnabled) loads.push(playerMonitor.load(backgroundImageFile, 'replace'));
		await Promise.all(loads);
		playerState.mediaType = 'background';
		emitPlayerState();
	} catch(err) {
		const errStr = `Unable to load background : ${JSON.stringify(err)}`;
		logger.error(`[Player] ${errStr}`);
		sentry.error(err);
		throw err;
	}
}

export async function initPlayerSystem() {
	const state = getState();
	playerState.fullscreen = state.fullscreen;
	playerState.stayontop = state.ontop;
	try {
		await startmpv();
		emitPlayerState();
		logger.debug('[Player] Player is READY');
	} catch(err) {
		errorStep(i18n.t('ERROR_START_PLAYER'));
		logger.error(`[Player] Unable to start player : ${err}`);
		sentry.error(err, 'Fatal');
		throw err;
	}
}

async function getmpvVersion(path: string): Promise<string> {
	const output = await execa(path,['--version']);
	return semver.valid(output.stdout.split(' ')[1]);
}

async function startmpv() {
	try {
		const conf = getConfig();
		const state = getState();

		monitorEnabled = conf.Player.Monitor;

		let mpvOptions = [
			'--keep-open=yes',
			'--fps=60',
			'--no-border',
			'--osd-level=0',
			'--sub-codepage=UTF-8-BROKEN',
			`--log-file=${resolve(state.dataPath, 'logs/', 'mpv.log')}`,
			`--volume=${+playerState.volume}`,
			`--input-conf=${resolve(resolvedPathTemp(),'input.conf')}`,
			'--autoload-files=no'
		];

		if (conf.Player.PIP.Enabled) {
			mpvOptions.push(`--autofit=${conf.Player.PIP.Size}%x${conf.Player.PIP.Size}%`);
			// By default, center.
			let positionX = 50;
			let positionY = 50;
			if (conf.Player.PIP.PositionX === 'Left') positionX = 1;
			if (conf.Player.PIP.PositionX === 'Center') positionX = 50;
			if (conf.Player.PIP.PositionX === 'Right') positionX = 99;
			if (conf.Player.PIP.PositionY === 'Top') positionY = 5;
			if (conf.Player.PIP.PositionY === 'Center') positionY = 50;
			if (conf.Player.PIP.PositionY === 'Bottom') positionY = 99;
			mpvOptions.push(`--geometry=${positionX}%:${positionY}%`);
		}

		if (conf.Player.mpvVideoOutput) mpvOptions.push(`--vo=${conf.Player.mpvVideoOutput}`);

		if (conf.Player.Screen) {
			mpvOptions.push(`--screen=${conf.Player.Screen}`);
			mpvOptions.push(`--fs-screen=${conf.Player.Screen}`);
		}

		if (conf.Player.FullScreen && !conf.Player.PIP.Enabled) {
			mpvOptions.push('--fullscreen');
			playerState.fullscreen = true;
		}
		if (conf.Player.StayOnTop) {
			playerState.stayontop = true;
			mpvOptions.push('--ontop');
		}
		if (conf.Player.NoHud) mpvOptions.push('--no-osc');
		if (conf.Player.NoBar) mpvOptions.push('--no-osd-bar');

		//On all platforms, check if we're using mpv at least version 0.25 or abort saying the mpv provided is too old.
		//Assume UNKNOWN is a compiled version, and thus the most recent one.
		let mpvVersion = await getmpvVersion(state.binPath.mpv);
		mpvVersion = mpvVersion.split('-')[0];
		logger.debug(`[Player] mpv version : ${mpvVersion}`);

		//If we're on macOS, add --no-native-fs to get a real
		// fullscreen experience on recent macOS versions.
		if (!semver.satisfies(mpvVersion, '>=0.25.0')) {
			logger.error(`[Player] mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`);
			logger.error(`[Player] mpv binary : ${state.binPath.mpv}`);
			logger.error('[Player] Exiting due to obsolete mpv version');
			await exit(1);
		}

		if (state.os === 'darwin' && semver.gte(mpvVersion, '0.27.0')) mpvOptions.push('--no-native-fs');

		logger.debug(`[Player] mpv options : ${mpvOptions}`);
		logger.debug(`[Player] mpv binary : ${state.binPath.mpv}`);

		let socket: string;
		// Name socket file accordingly depending on OS.
		const random = randomstring.generate({
			length: 3,
			charset: 'numeric'
		});
		state.os === 'win32'
			? socket = '\\\\.\\pipe\\mpvsocket' + random
			: socket = '/tmp/km-node-mpvsocket' + random;

		player = new mpv(
			{
				ipc_command: '--input-ipc-server',
				auto_restart: true,
				audio_only: false,
				binary: state.binPath.mpv,
				socket: socket,
				time_update: 1,
				verbose: false,
				debug: false,
			},
			mpvOptions
		);
		if (monitorEnabled) {
			mpvOptions = [
				'--keep-open=yes',
				'--fps=60',
				'--osd-level=0',
				'--sub-codepage=UTF-8-BROKEN',
				'--ontop',
				'--no-osc',
				'--no-osd-bar',
				'--geometry=1%:99%',
				`--autofit=${conf.Player.PIP.Size}%x${conf.Player.PIP.Size}%`,
				'--autoload-files=no'
			];
			if (conf.Player.mpvVideoOutput) {
				mpvOptions.push(`--vo=${conf.Player.mpvVideoOutput}`);
			} else {
				//Force direct3d for Windows users
				if (state.os === 'win32') mpvOptions.push('--vo=direct3d');
			}
			playerMonitor = new mpv(
				{
					ipc_command: '--input-ipc-server',
					auto_restart: true,
					audio_only: false,
					binary: state.binPath.mpv,
					socket: `${socket}2`,
					time_update: 1,
					verbose: false,
					debug: false,
				},
				mpvOptions
			);
		}

		// Starting up mpv
		try {
			const promises = [
				player.start()
			];
			if (monitorEnabled) promises.push(playerMonitor.start());
			await Promise.all(promises);
			logger.info('[Player] Player started up successfully');
		} catch(err) {
			logger.error(`[Player] mpvAPI : ${JSON.stringify(err)}`);
			throw err;
		}

		await loadBackground();
		logger.debug('[Player] Initial DI');
		displayInfo();
		player.observeProperty('sub-text');
		player.observeProperty('playtime-remaining');
		player.observeProperty('eof-reached');
		player.on('status', (status: mpvStatus) => {
			// If we're displaying an image, it means it's the pause inbetween songs
			playerState[status.property] = status.value;
			if (playerState._playing && playerState.mediaType !== 'background' &&
				(status.property === 'playtime-remaining' && status.value === 0) ||
				(status.property === 'eof-reached' && status.value === true && playerState['playtime-remaining'])
			) {
				// immediate switch to Playing = False to avoid multiple trigger
				playerState.playing = false;
				playerState._playing = false;
				playerState.playerstatus = 'stop';
				player.pause();
				if (monitorEnabled) playerMonitor.pause();
				playerEnding();
			}
			emitPlayerState();
		});
		player.on('paused',() => {
			logger.debug( '[Player] Paused event triggered');
			playerState.playing = false;
			playerState.playerstatus = 'pause';
			if (monitorEnabled) playerMonitor.pause();
			emitPlayerState();
		});
		player.on('resumed',() => {
			logger.debug( '[Player] Resumed event triggered');
			playerState.playing = true;
			playerState.playerstatus = 'play';
			if (monitorEnabled) playerMonitor.play();
			emitPlayerState();
		});
		player.on('timeposition', (position: number) => {
			const conf = getConfig();
			// Returns the position in seconds in the current song
			playerState.timeposition = position;
			if (conf.Player.ProgressBarDock) {
				playerState.mediaType === 'song'
					? setProgressBar(position / playerState.duration)
					: setProgressBar(-1);
			}
			emitPlayerState();
			// Send notification to frontend if timeposition is 15 seconds before end of song
			if (position >= (playerState.duration - 15) && playerState.mediaType === 'song' && !nextSongNotifSent) {
				nextSongNotifSent = true;
				notificationNextSong();
			}
			// Display informations if timeposition is 8 seconds before end of song
			if (position >= (playerState.duration - 8) &&
				!displayingInfo &&
				playerState.mediaType === 'song')
				displaySongInfo(playerState.currentSongInfos);
			// Display KM's banner if position reaches halfpoint in the song
			if (Math.floor(position) === Math.floor(playerState.duration / 2) &&
			!displayingInfo &&
			playerState.mediaType === 'song' && !getState().songPoll) {
				logger.debug('[Player] Middle of song DI');
				displayInfo(8000);
			}
			// Stop poll if position reaches 10 seconds before end of song
			if (Math.floor(position) >= Math.floor(playerState.duration - 10) &&
			playerState.mediaType === 'song' &&
			conf.Karaoke.Poll.Enabled &&
			!songNearEnd) {
				songNearEnd = true;
				endPoll();
			}
		});
		logger.debug('[Player] mpv initialized successfully');
		return true;
	} catch(err) {
		const error = new Error(err);
		sentry.error(error, 'Fatal');
		throw error;
	}
}

export async function play(mediadata: MediaData) {
	await ensureRunning().catch(err => {
		throw err;
	});
	const conf = getConfig();
	logger.debug('[Player] Play event triggered');
	playerState.playing = true;
	//Search for media file in the different Pathmedias
	let mediaFile: string;
	let subFile: string;
	try {
		const mediaFiles = await resolveFileInDirs(mediadata.media, resolvedPathRepos('Medias', mediadata.repo));
		mediaFile = mediaFiles[0];
	} catch (err) {
		logger.debug(`[Player] Error while resolving media path : ${err}`);
		logger.warn(`[Player] Media NOT FOUND : ${mediadata.media}`);
		if (conf.Online.MediasHost) {
			mediaFile = `${conf.Online.MediasHost}/${encodeURIComponent(mediadata.media)}`;
			logger.info(`[Player] Trying to play media directly from the configured http source : ${conf.Online.MediasHost}`);
		} else {
			throw `No media source for ${mediadata.media} (tried in ${resolvedPathRepos('Medias', mediadata.repo).toString()} and HTTP source)`;
		}
	}
	try {
		if (mediadata.subfile) subFile = (await resolveFileInDirs(mediadata.subfile, resolvedPathRepos('Lyrics', mediadata.repo)))[0];
	} catch(err) {
		logger.debug(`[Player] Error while resolving subs path : ${err}`);
		logger.warn(`[Player] Subs NOT FOUND : ${mediadata.subfile}`);
	}
	logger.debug(`[Player] Audio gain adjustment : ${mediadata.gain}`);
	logger.debug(`[Player] Loading media : ${mediaFile}`);
	try {
		let options = [];
		options.push(`replaygain-fallback=${mediadata.gain}`) ;

		if (mediaFile.endsWith('.mp3')) {
			// Lavfi-complex argument to have cool visualizations on top of an image during mp3 playback
			// Courtesy of @nah :)
			if (conf.Player.VisualizationEffects) {
				options = fillVisualizationOptions(options, mediadata, (mediadata.avatar && conf.Karaoke.Display.Avatar));
			} else if (mediadata.avatar && conf.Karaoke.Display.Avatar) {
				const subOptions = [
					'lavfi-complex=',
					`nullsrc=size=1x1:duration=${mediadata.duration}[emp];`,
					'[vid1]scale=-2:1080[vidInp];',
					'[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc];',
					`movie=\\'${mediadata.avatar.replace(/\\/g,'/')}\\'[logo];`,
					'[logo][vpoc]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];',
					'[base][emp]overlay[ovrl];',
					`[ovrl][logo1]overlay=x='if(between(t,0,8)+between(t,${mediadata.duration - 7},${mediadata.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`
				];
				options.push(subOptions.join(''));
			}

			const id3tags = await getID3(mediaFile);
			if (!id3tags.image) {
				const defaultImageFile = resolve(resolvedPathTemp(), 'default.jpg');
				options.push(`external-file=${defaultImageFile.replace(/\\/g,'/')}`);
				options.push('force-window=yes');
				options.push('image-display-duration=inf');
				options.push('vid=1');
			}
		} else {
			// If video, display avatar if it's defined.
			// Again, lavfi-complex expert @nah comes to the rescue!
			if (mediadata.avatar && conf.Karaoke.Display.Avatar) options.push(`lavfi-complex=movie=\\'${mediadata.avatar.replace(/\\/g,'/')}\\'[logo];[logo][vid1]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediadata.duration - 7},${mediadata.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
		}
		await retry(() => load(mediaFile, 'replace', options), {
			retries: 3,
			onFailedAttempt: error => {
				logger.warn(`[Player] Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
			}
		});
		logger.debug(`[Player] File ${mediaFile} loaded`);
		playerState.mediaType = 'song';
		await player.play();
		if (monitorEnabled) {
			playerMonitor.play();
			playerMonitor.mute();
		}
		playerState.playerstatus = 'play';
		if (subFile) try {
			const subs = [player.addSubtitles(subFile)];
			if (monitorEnabled) subs.push(playerMonitor.addSubtitles(subFile));
			await Promise.all(subs);
		} catch(err) {
			logger.error(`[Player] Unable to load subtitles : ${JSON.stringify(err)}`);
			throw err;
		}
		// Displaying infos about current song on screen.
		displaySongInfo(mediadata.infos, 8000, false, mediadata.spoiler);
		playerState.currentSongInfos = mediadata.infos;
		playerState._playing = true;
		emitPlayerState();
		songNearEnd = false;
		nextSongNotifSent = false;
		setDiscordActivity('song', {
			title: mediadata.currentSong.title,
			singer: mediadata.currentSong.singers?.map(s => s.name).join(', ') || i18n.t('UNKNOWN_ARTIST')
		});
	} catch(err) {
		logger.error(`[Player] Error loading media ${mediadata.media} : ${JSON.stringify(err)}`);
		sentry.addErrorInfo('mediaData', JSON.stringify(mediadata, null, 2));
		sentry.error(err);
		throw err;
	}
}

/**
 * Fill up options object with visualization-specific options
 * @param options Options object to fill up
 * @param mediadata MediaData object
 * @param withAvatar Please use both MediaData and conf object to check if Avatar is required
 */
function fillVisualizationOptions(options: string[], mediadata: MediaData, withAvatar:boolean): string[] {
	const subOptions = [
		'lavfi-complex=[aid1]asplit[ao][a]',
		'[a]showcqt=axis=0[vis]',
		'[vis]scale=600:400[vecPrep]',
		`nullsrc=size=1920x1080:duration=${mediadata.duration}[nl]`,
		'[nl]setsar=1,format=rgba[emp]',
		'[emp][vecPrep]overlay=main_w-overlay_w:main_h-overlay_h:x=0[visu]',
		'[vid1]scale=-2:1080[vidInp]',
		'[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc]',
	];
	if (withAvatar) {
		subOptions.push('[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[ovrl]');
		subOptions.push(`movie=\\'${mediadata.avatar.replace(/\\/g,'/')}\\'[logo]`);
		subOptions.push('[logo][ovrl]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]');
		subOptions.push(`[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediadata.duration - 7},${mediadata.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
	} else {
		subOptions.push('[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[vo]');
	}
	options.push(subOptions.join(';'));
	return options;
}

export async function setFullscreen(fsState: boolean): Promise<boolean> {
	playerState.fullscreen = fsState;
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		if (fsState) {
			await player.fullscreen();
		} else {
			await player.leaveFullscreen();
		}
	} catch(err) {
		logger.error(`[Player] Unable to toggle fullscreen : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
	return fsState;
}

export async function toggleOnTop(): Promise<boolean> {
	await ensureRunning().catch(err => {
		throw err;
	});
	playerState.stayontop = !playerState.stayontop;
	try {
		await player.command('keypress',['T']);
		return playerState.stayontop;
	} catch(err) {
		logger.error(`[Player] Unable to toggle ontop : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function stop(): Promise<PlayerState> {
	// on stop do not trigger onEnd event
	// => setting internal playing = false prevent this behavior
	logger.debug('[Player] Stop event triggered');
	playerState.playing = false;
	playerState.timeposition = 0;
	playerState._playing = false;
	playerState.playerstatus = 'stop';
	await ensureRunning().catch(err => {
		throw err;
	});
	await loadBackground();
	logger.debug('[Player] Stop DI');
	if (!getState().songPoll) displayInfo();
	setState({player: playerState});
	setProgressBar(-1);
	setDiscordActivity('idle');
	return playerState;
}

export async function pause(): Promise<PlayerState> {
	logger.debug('[Player] Pause event triggered');
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		player.pause();
		if (monitorEnabled) playerMonitor.pause();
		playerState.status = 'pause';
		setState({player: playerState});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to pause : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function resume(): Promise<PlayerState> {
	logger.debug('[Player] Resume event triggered');
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		await player.play();
		if (monitorEnabled) playerMonitor.play();
		playerState.playing = true;
		playerState._playing = true;
		playerState.playerstatus = 'play';
		setState({player: playerState});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to resume : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function seek(delta: number) {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		if (monitorEnabled) playerMonitor.seek(delta);
		player.seek(delta);
	} catch(err) {
		logger.error(`[Player] Unable to seek : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function goTo(pos: number) {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		if (monitorEnabled) await playerMonitor.goToPosition(pos);
		await player.goToPosition(pos);
	} catch(err) {
		logger.error(`[Player] Unable to go to position : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function mute() {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		return await player.mute(true);
	} catch(err) {
		logger.error(`[Player] Unable to toggle mute : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function unmute() {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		return await player.mute(false);
	} catch(err) {
		logger.error(`[Player] Unable to toggle mute : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function setVolume(volume: number): Promise<PlayerState> {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		playerState.volume = volume;
		await player.volume(volume);
		setState({player: playerState});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to set volume : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function hideSubs(): Promise<PlayerState> {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		await player.hideSubtitles();
		if (monitorEnabled) await playerMonitor.hideSubtitles();
		playerState.showsubs = false;
		setState({player: playerState});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to hide subs : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function showSubs(): Promise<PlayerState> {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		await player.showSubtitles();
		if (monitorEnabled) await playerMonitor.showSubtitles();
		playerState.showsubs = true;
		setState({player: playerState});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to show subs : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function message(message: string, duration = 10000, alignCode = 5) {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		const alignCommand = `{\\an${alignCode}}`;
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}' + alignCommand + message,
				duration,
			]
		};
		await player.freeCommand(JSON.stringify(command));
		if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
		if (playerState.playing === false && !getState().songPoll) {
			await sleep(duration);
			logger.debug('[Player] AfterMessage DI');
			displayInfo();
		}
	} catch(err) {
		logger.error(`[Player] Unable to display message : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function displaySongInfo(infos: string, duration = 8000, nextSong = false, spoilerAlert = false) {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		displayingInfo = true;
		const spoilerString = spoilerAlert ? '{\\fscx80}{\\fscy80}{\\b1}{\\c&H0808E8&}⚠ SPOILER WARNING ⚠{\\b0}\\N{\\c&HFFFFFF&}' : '';
		const nextSongString = nextSong ? `{\\u1}${i18n.t('NEXT_SONG')}{\\u0}\\N` : '';
		const position = nextSong ? '{\\an5}' : '{\\an1}';
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}'+position+spoilerString+nextSongString+infos,
				duration,
			]
		};
		await player.freeCommand(JSON.stringify(command));
		if (monitorEnabled) await playerMonitor.freeCommand(JSON.stringify(command));
		await sleep(duration);
		displayingInfo = false;
	} catch(err) {
		logger.error(`[Player] Unable to display song info : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function displayInfo(duration = 10000000) {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		const conf = getConfig();
		const ci = conf.Karaoke.Display.ConnectionInfo;
		let text = '';
		const catchphrase = playerState.mediaType !== 'song'
			? sample(initializationCatchphrases)
			: '';
		if (ci.Enabled) text = `${ci.Message} ${i18n.t('GO_TO')} ${getState().osURL} !`;
		const version = `Karaoke Mugen ${getState().version.number} (${getState().version.name}) - http://karaokes.moe`;
		const message = '{\\fscx80}{\\fscy80}'+text+'\\N{\\fscx60}{\\fscy60}{\\i1}'+version+'{\\i0}\\N{\\fscx40}{\\fscy40}'+catchphrase;
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an1}'+message,
				duration,
			]
		};
		await player.freeCommand(JSON.stringify(command));
		if (monitorEnabled) await playerMonitor.freeCommand(JSON.stringify(command));
	} catch(err) {
		logger.error(`[Player] Unable to display infos : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function clearText() {
	await ensureRunning().catch(err => {
		throw err;
	});
	try {
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'',
				10,
			]
		};
		await player.freeCommand(JSON.stringify(command));
		if (monitorEnabled) await playerMonitor.freeCommand(JSON.stringify(command));
	} catch(err) {
		logger.error(`[Player] Unable to clear text : ${JSON.stringify(err, null, 2)}`);
		sentry.error(err);
		throw err;
	}
}

export async function restartmpv() {
	await quitmpv();
	logger.debug('[Player] Stopped mpv (restarting)');
	emitPlayerState();
	await startmpv();
	logger.debug('[Player] Restarted mpv');
	emitPlayerState();
}

export async function quitmpv() {
	logger.debug('[Player] Quitting mpv');
	try {
		if (player?.isRunning()) {
			await player.quit();
			if (playerMonitor) await playerMonitor.quit();
		}
	} catch(err) {
		//Non fatal. Idiots sometimes close mpv instead of KM, this avoids an uncaught exception.
		logger.warn(`[Player] Failed to quit mpv : ${err}`);
	}
}

export async function playMedia(mediaType: MediaType) {
	await ensureRunning().catch(err => {
		throw err;
	});
	playerState.playing = true;
	playerState.mediaType = mediaType;
	const media = getSingleMedia(mediaType);
	if (media) {
		try {
			setState({currentlyPlayingKara: mediaType});
			const conf = getConfig();
			logger.debug(`[Player] Playing ${mediaType} : ${media.file}`);
			const options = [`replaygain-fallback=${media.gain}`];
			await retry(() => load(media.file, 'replace', options), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(`[Player] Failed to play ${mediaType}, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
				}
			});
			await player.play();
			if (monitorEnabled) await playerMonitor.play();
			const subFile = replaceExt(media.file, '.ass');
			if (await asyncExists(subFile)) {
				player.addSubtitles(subFile);
				if (monitorEnabled) playerMonitor.addSubtitles(subFile);
			}
			mediaType === 'Jingles' || mediaType === 'Sponsors'
				? displayInfo()
				: conf.Playlist.Medias[mediaType].Message
					? message(conf.Playlist.Medias[mediaType].Message, 1000000)
					: clearText();
			playerState.playerstatus = 'play';
			playerState._playing = true;
			emitPlayerState();
		} catch(err) {
			logger.error(`[Player] Error loading media ${mediaType} : ${media.file} : ${JSON.stringify(err)}`);
			sentry.error(err);
			throw err;
		}
	} else {
		logger.debug(`[Player] No ${mediaType} to play.`);
		playerState.playerstatus = 'play';
		loadBackground();
		logger.debug('[Player] No jingle DI');
		displayInfo();
		playerState._playing = true;
		emitPlayerState();
		playerEnding();
	}
}

async function load(file: string, mode: string, options: string[]) {
	try {
		await player.load(file, mode, options);
	} catch(err) {
		logger.error(`[mpv] Error loading file ${file} : ${JSON.stringify(err)}`);
		throw Error(err);
	}
	if (monitorEnabled) try {
		await playerMonitor.load(file, mode, options);
	} catch(err) {
		logger.error(`[mpv Monitor] Error loading file ${file} : ${err}`);
		throw Error(err);
	}
}
