import Mpv from 'node-mpv';

import retry from 'p-retry';
import {promisify} from "util";
import {MediaData, MpvOptions, mpvStatus, PlayerState} from "../types/player";
import {getConfig, resolvedPathBackgrounds, resolvedPathRepos, resolvedPathTemp} from "../lib/utils/config";
import {extname, resolve} from "path";
import semver from "semver";
import {getState, setState} from "../utils/state";
import randomstring from "randomstring";
import logger from "winston";
import execa from "execa";
import {exit} from "./engine";
import sentry from "../utils/sentry";
import i18n from "i18next";
import sample from "lodash.sample";
import {initializationCatchphrases} from "../utils/constants";
import {imageFileTypes} from "../lib/utils/constants";
import {asyncExists, asyncReadDir, isImageFile, replaceExt, resolveFileInDirs} from "../lib/utils/files";
import {errorStep} from "../electron/electronLogger";
import {setProgressBar} from "../electron/electron";
import {setDiscordActivity} from "../utils/discordRPC";
import {getID3} from "../utils/id3tag";
import {MediaType} from "../types/medias";
import {getSingleMedia} from "../services/medias";
import {playerEnding} from "../services/player";
import {notificationNextSong} from "../services/playlist";
import {endPoll} from "../services/poll";

const sleep = promisify(setTimeout);

let players: {
	main: Player,
	monitor?: Player
};

type PlayerType = 'main' | 'monitor';

const playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerStatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	duration: 0,
	mute: false,
	'sub-text': null,
	currentSong: null,
	mediaType: 'background',
	showsubs: true,
	stayontop: false,
	fullscreen: false,
	url: null,
	monitorEnabled: false,
	songNearEnd: false,
	nextSongNotifSent: false,
	displayingInfo: false
};

function emitPlayerState() {
	logger.debug(`[Player] State updated: ${JSON.stringify(JSON.stringify({playerStatus: playerState.playerStatus, playing: playerState.playing}))}`);
	setState({player: playerState});
}

async function checkMpv(): Promise<string> {
	const state = getState();

	//On all platforms, check if we're using mpv at least version 0.25 or abort saying the mpv provided is too old.
	//Assume UNKNOWN is a compiled version, and thus the most recent one.
	const output = await execa(state.binPath.mpv,['--version']);
	let mpv = semver.valid(output.stdout.split(' ')[1]);
	let mpvVersion = mpv.split('-')[0];
	logger.debug(`[Player] mpv version : ${mpvVersion}`);

	if (!semver.satisfies(mpvVersion, '>=0.25.0')) {
		logger.error(`[Player] mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`);
		logger.error(`[Player] mpv binary : ${state.binPath.mpv}`);
		logger.error('[Player] Exiting due to obsolete mpv version');
		await exit(1);
	}

	return mpvVersion;
}

class Player {
	mpv: Mpv
	configuration: any
	options: MpvOptions
	state: PlayerState
	// node-mpv is very slow to refresh isRunning
	running: boolean

	constructor(options: MpvOptions) {
		// Generate node mpv options
		this.options = options;
		this.configuration = this.genConf(options);
		// Instantiate mpv
		this.mpv = new Mpv(...this.configuration);
	}

	private genConf(options: MpvOptions) {
		const conf = getConfig();
		const state = getState();

		let NodeMPVArgs = [
			'--keep-open=yes',
			'--fps=60',
			'--osd-level=0',
			'--sub-codepage=UTF-8-BROKEN',
			`--log-file=${resolve(state.dataPath, 'logs/', 'mpv.log')}`,
			`--hwdec=${conf.Player.HardwareDecoding}`,
			`--volume=${+conf.Player.Volume}`,
			`--input-conf=${resolve(resolvedPathTemp(),'input.conf')}`,
			'--autoload-files=no'
		];

		if (options.monitor) {
			NodeMPVArgs.push(
				'--mute=yes',
				'--reset-on-next-file=mute',
				'--ao=null',
				'--geometry=1%:99%');
		} else {
			NodeMPVArgs.push('--no-border');

			if (conf.Player.FullScreen && !conf.Player.PIP.Enabled) {
				NodeMPVArgs.push('--fullscreen');
			}
		}

		if (conf.Player.Screen) {
			NodeMPVArgs.push(
				`--screen=${conf.Player.Screen}`,
				`--fs-screen=${conf.Player.Screen}`);
		}

		if (conf.Player.StayOnTop) {
			playerState.stayontop = true;
			NodeMPVArgs.push('--ontop');
		}

		if (conf.Player.PIP.Enabled) {
			NodeMPVArgs.push(`--autofit=${conf.Player.PIP.Size}%x${conf.Player.PIP.Size}%`);
			// By default, center.
			let positionX = 50;
			let positionY = 50;
			if (conf.Player.PIP.PositionX === 'Left') positionX = 1;
			if (conf.Player.PIP.PositionX === 'Center') positionX = 50;
			if (conf.Player.PIP.PositionX === 'Right') positionX = 99;
			if (conf.Player.PIP.PositionY === 'Top') positionY = 5;
			if (conf.Player.PIP.PositionY === 'Center') positionY = 50;
			if (conf.Player.PIP.PositionY === 'Bottom') positionY = 99;
			NodeMPVArgs.push(`--geometry=${positionX}%:${positionY}%`);
		}

		if (conf.Player.NoHud) NodeMPVArgs.push('--no-osc');
		if (conf.Player.NoBar) NodeMPVArgs.push('--no-osd-bar');

		if (conf.Player.mpvVideoOutput) {
			NodeMPVArgs.push(`--vo=${conf.Player.mpvVideoOutput}`);
		}

		// Testing if string exists or is not empty
		if (conf.Player.ExtraCommandLine?.length > 0) {
			conf.Player.ExtraCommandLine.split(' ').forEach(e => NodeMPVArgs.push(e));
		}

		// If we're on macOS, add --no-native-fs to get a real
		// fullscreen experience on recent macOS versions.
		if (state.os === 'darwin' && semver.gte(options.mpvVersion, '0.27.0')) NodeMPVArgs.push('--no-native-fs');

		let socket: string;
		// Name socket file accordingly depending on OS.
		const random = randomstring.generate({
			length: 3,
			charset: 'numeric'
		});
		state.os === 'win32'
			? socket = '\\\\.\\pipe\\mpvsocket' + random
			: socket = '/tmp/km-node-mpvsocket' + random;

		let NodeMPVOptions = {
			ipc_command: '--input-ipc-server',
			auto_restart: false,
			audio_only: false,
			binary: state.binPath.mpv,
			socket: socket,
			time_update: 1,
			verbose: false,
			debug: state.opt?.debug,
		};

		logger.debug(`[Player] mpv${this.options.monitor ? ' monitor':''} options : ${JSON.stringify(NodeMPVOptions)} / ${JSON.stringify(NodeMPVArgs)}`);
		logger.debug(`[Player] mpv${this.options.monitor ? ' monitor':''} binary : ${state.binPath.mpv}`);

		return [NodeMPVOptions, NodeMPVArgs];
	}

	private afterStart() {
		this.running = true;
		if (!this.options.monitor) {
			this.mpv.observeProperty('sub-text');
			this.mpv.observeProperty('playtime-remaining');
			this.mpv.observeProperty('eof-reached');
			this.mpv.on('status', (status: mpvStatus) => {
				if (status.property !== 'playtime-remaining' && status.property !== 'sub-text')
					logger.debug(`[Player] mpv status: ${JSON.stringify(status)}`);
				// If we're displaying an image, it means it's the pause inbetween songs
				playerState[status.property] = status.value;
				emitPlayerState();
				if (playerState._playing && playerState.mediaType !== 'background' &&
					(status.property === 'playtime-remaining' && status.value === 0) ||
					(status.property === 'eof-reached' && status.value === true && playerState['playtime-remaining'])
				) {
					// immediate switch to Playing = False to avoid multiple trigger
					playerState.playing = false;
					playerState._playing = false;
					emitPlayerState();
					exec('pause', null, true).then(_res => {
						return playerEnding();
					}).then(_res => {
						emitPlayerState();
					});
				}
			});
			this.mpv.on('timeposition', (position: number) => {
				const conf = getConfig();
				// Returns the position in seconds in the current song
				playerState.timeposition = position;
				if (conf.Player.ProgressBarDock) {
					playerState.mediaType === 'song'
						? setProgressBar(position / playerState.duration)
						: setProgressBar(-1);
				}
				// Send notification to frontend if timeposition is 15 seconds before end of song
				if (position >= (playerState.duration - 15) && playerState.mediaType === 'song' && !playerState.nextSongNotifSent) {
					playerState.nextSongNotifSent = true;
					notificationNextSong();
				}
				// Display informations if timeposition is 8 seconds before end of song
				if (position >= (playerState.duration - 8) &&
					!playerState.displayingInfo &&
					playerState.mediaType === 'song')
					displaySongInfo(playerState.currentSong.infos);
				// Display KM's banner if position reaches halfpoint in the song
				if (Math.floor(position) === Math.floor(playerState.duration / 2) &&
					!playerState.displayingInfo &&
					playerState.mediaType === 'song' && !getState().songPoll) {
					logger.debug('[Player] Middle of song DI');
					displayInfo(8000);
				}
				// Stop poll if position reaches 10 seconds before end of song
				if (Math.floor(position) >= Math.floor(playerState.duration - 10) &&
					playerState.mediaType === 'song' &&
					conf.Karaoke.Poll.Enabled &&
					!playerState.songNearEnd) {
					playerState.songNearEnd = true;
					endPoll();
				}
				emitPlayerState();
			});
		}
		// Handle manually exits/crashes
		this.mpv.on('quit', () => {
			logger.debug(`[mpv${this.options.monitor ? ' monitor':''}] mpv closed`);
			// We set the state here to prevent the 'paused' event to trigger (because it will restart mpv in the same time)
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerStatus = 'stop';
			exec('pause', [], true, this.options.monitor ? 'main':'monitor');
			this.isRunning = false;
			this.recreate();
			emitPlayerState();
		});
		this.mpv.on('crashed', () => {
			logger.warn(`[mpv${this.options.monitor ? ' monitor':''}] mpv crashed`);
			// We set the state here to prevent the 'paused' event to trigger (because it will restart mpv in the same time)
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerStatus = 'stop';
			exec('pause', [], true, this.options.monitor ? 'main':'monitor');
			this.isRunning = false;
			// In case of a crash, restart immediately
			this.recreate(null, true);
			emitPlayerState();
		});
		// Handle pause/play via external ways such as right-click on player
		this.mpv.on('paused',() => {
			if (!playerState._playing) return;
			logger.debug( `[Player] Paused event triggered on ${this.options.monitor ? 'monitor':'main'}`);
			playerState._playing = false;
			playerState.playing = false;
			playerState.playerStatus = 'pause';
			exec('pause', null, true, this.options.monitor ? 'main':'monitor');
			emitPlayerState();
		});
		this.mpv.on('resumed',() => {
			if (playerState._playing) return;
			logger.debug( `[Player] Resumed event triggered on ${this.options.monitor ? 'monitor':'main'}`);
			playerState._playing = true;
			playerState.playing = true;
			playerState.playerStatus = 'play';
			exec('play', null, true, this.options.monitor ? 'main':'monitor');
			emitPlayerState();
		});
	}

	async start() {
		await retry(async () => {
			await this.mpv.start().catch(err => {
				throw new Error(JSON.stringify(err));
			});
			if (!this.mpv.isRunning()) throw new Error('Sanity check failed: mpv isRunning() is false after start()');
			else return true;
		}, {
			retries: 3,
			onFailedAttempt: error => {
				logger.warn(`[Player] Failed to start mpv, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
			}
		}).catch(err => {
			logger.error(`[Player] Cannot start MPV: ${err.toString()}`);
			this.running = false;
			sentry.error(err, 'Fatal');
			throw err;
		});
		this.afterStart();
		return true;
	}

	async recreate(options?: MpvOptions, restart: boolean = false) {
		try {
			if (this.mpv.isRunning()) await this.destroy();
			// Set options if supplied
			if (options) this.options = options;
			// Regen config
			this.configuration = this.genConf(this.options);
			// Recreate mpv
			this.mpv = new Mpv(...this.configuration);
			if (restart) await this.start();
		} catch (err) {
			logger.error(`[Player] mpvAPI (recreate): ${JSON.stringify(err, null, 2)}`);
			throw err;
		}
	}

	async destroy() {
		try {
			await this.mpv.quit();
			this.running = false;
			return true;
		} catch (err) {
			const error = new Error(err);
			logger.error(`[Player] mpvAPI(quit): ${JSON.stringify(err, null, 2)}`);
			sentry.error(error, 'Fatal');
			throw err;
		}
	}

	get isRunning() {
		if (this.running === false) return this.running;
		else return this.mpv.isRunning();
	}

	set isRunning(val: boolean) {
		this.running = val;
	}
}

function fillVisualizationOptions(mediaData: MediaData, withAvatar: boolean): string {
	const subOptions = [
		'lavfi-complex=[aid1]asplit[ao][a]',
		'[a]showcqt=axis=0[vis]',
		'[vis]scale=600:400[vecPrep]',
		`nullsrc=size=1920x1080:duration=${mediaData.duration}[nl]`,
		'[nl]setsar=1,format=rgba[emp]',
		'[emp][vecPrep]overlay=main_w-overlay_w:main_h-overlay_h:x=0[visu]',
		'[vid1]scale=-2:1080[vidInp]',
		'[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc]',
	];
	if (withAvatar) {
		subOptions.push('[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[ovrl]');
		subOptions.push(`movie=\\'${mediaData.avatar.replace(/\\/g,'/')}\\'[logo]`);
		subOptions.push('[logo][ovrl]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]');
		subOptions.push(`[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediaData.duration - 7},${mediaData.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
	} else {
		subOptions.push('[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[vo]');
	}
	return subOptions.join(';');
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

async function ensureRunning(onlyOn?: PlayerType) {
	try {
		// Refresh monitor setting
		playerState.monitorEnabled = getConfig().Player.Monitor;
		const loads = [];
		if (onlyOn) {
			if (players[onlyOn]) {
				if (!players[onlyOn].isRunning) {
					logger.info(`[Player] Restarting ${onlyOn} player`);
					loads.push(players[onlyOn].recreate(null, true));
				}
			} else {
				// Fail silently on non-existing player (monitor disabled)
				return -1;
			}
		} else {
			for (let player in players) {
				if (!players[player].isRunning) {
					logger.info(`[Player] Restarting ${player} player`);
					loads.push(players[player].recreate(null, true));
				}
			}
		}
		await Promise.all(loads);
		if (loads.length > 0) return 1;
		else return 0;
	} catch(err) {
		sentry.error(err);
		throw err;
	}
}

async function exec(cmd: string, args?: any[], mpv: boolean = false, onlyOn?: PlayerType) {
	try {
		// ensureRunning returns -1 if the player does not exist (eg. disabled monitor)
		// ensureRunning isn't needed on non-mpv commands
		if (mpv && await ensureRunning(onlyOn) === -1) return;
		logger.debug(`[Player] ${mpv ? 'mpv ': ''}command: ${cmd}, ${JSON.stringify(args)}`);
		logger.debug(`[Player] Running it for players ${JSON.stringify(onlyOn ? onlyOn:Object.keys(players))}`);
		const loads = [];
		if (!args) args = [];
		if (onlyOn) {
			if (mpv) loads.push(players[onlyOn].mpv[cmd](...args));
			else loads.push(players[onlyOn][cmd](...args));
		} else {
			for (let player in players) {
				if (mpv) loads.push(players[player].mpv[cmd](...args));
				else loads.push(players[player][cmd](...args));
			}
		}
		await Promise.all(loads);
	} catch (err) {
		logger.error(`[Player] mpvAPI (send): ${JSON.stringify(err)}`);
		throw new Error(JSON.stringify(err));
	}
}

async function loadBackground() {
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
		playerState.mediaType = 'background';
		emitPlayerState();
		await exec('load', [backgroundImageFile, 'replace'], true);
	} catch(err) {
		const errStr = `Unable to load background: ${JSON.stringify(err)}`;
		logger.error(`[Player] ${errStr}`);
		sentry.error(err);
		throw err;
	}
}

export async function initPlayerSystem() {
	const conf = getConfig();
	const state = getState();
	playerState.fullscreen = state.fullscreen;
	playerState.stayontop = state.ontop;
	playerState.volume = conf.Player.Volume;
	playerState.monitorEnabled = conf.Player.Monitor;
	try {
		const mpvVersion = await checkMpv();
		players = {
			main: new Player({monitor: false, mpvVersion})
		}
		if (playerState.monitorEnabled) players.monitor = new Player({monitor: true, mpvVersion});
		logger.debug(`[Player] Players: ${JSON.stringify(Object.keys(players))}`);
		await exec('start');
		await loadBackground();
	} catch (err) {
		errorStep(i18n.t('ERROR_START_PLAYER'));
		logger.error(`[Player] Unable to start player: ${err}`);
		sentry.error(err, 'Fatal');
		throw err;
	}
}

export async function quitMpv() {
	return await exec('destroy').catch(err => {
		// Non fatal. Idiots sometimes close mpv instead of KM, this avoids an uncaught exception.
		logger.warn(`[Player] Failed to quit mpv: ${err}`);
	});
}

export async function restartMpv() {
	return await exec('recreate').catch(err => {
		logger.error(`[Player] Cannot restart mpv: ${JSON.stringify(err)}`);
	});
}

export async function play(mediaData: MediaData): Promise<PlayerState> {
	const conf = getConfig();
	logger.debug('[Player] Play event triggered');
	playerState.playing = true;
	//Search for media file in the different PathMedias
	let mediaFiles: string[]|void;
	let mediaFile: string;
	let subFiles: string[]|void;
	let subFile: string;
	mediaFiles = await resolveFileInDirs(mediaData.media, resolvedPathRepos('Medias', mediaData.repo))
		.catch(err => {
			logger.debug(`[Player] Error while resolving media path : ${err}`);
			logger.warn(`[Player] Media NOT FOUND : ${mediaData.media}`);
			if (conf.Online.MediasHost) {
				mediaFile = `${conf.Online.MediasHost}/${encodeURIComponent(mediaData.media)}`;
				logger.info(`[Player] Trying to play media directly from the configured http source : ${conf.Online.MediasHost}`);
			} else {
				throw `No media source for ${mediaData.media} (tried in ${resolvedPathRepos('Medias', mediaData.repo).toString()} and HTTP source)`;
			}
		});
	mediaFile = mediaFiles[0];
	if (mediaData.subfile) {
		subFiles = await resolveFileInDirs(mediaData.subfile, resolvedPathRepos('Lyrics', mediaData.repo))
			.catch(err => {
				logger.debug(`[Player] Error while resolving subs path : ${err}`);
				logger.warn(`[Player] Subs NOT FOUND : ${mediaData.subfile}`);
			});
		subFile = subFiles[0];
	}
	logger.debug(`[Player] Audio gain adjustment : ${mediaData.gain}`);
	logger.debug(`[Player] Loading media: ${mediaFile}${subFile ? ` with subs ${subFile}`:''}`);
	let options = [
		`replaygain-fallback=${mediaData.gain}`
	];

	if (mediaFile.endsWith('.mp3')) {
		// Lavfi-complex argument to have cool visualizations on top of an image during mp3 playback
		// Courtesy of @nah :)
		if (conf.Player.VisualizationEffects) {
			options.push(fillVisualizationOptions(mediaData, (mediaData.avatar && conf.Karaoke.Display.Avatar)));
		} else if (mediaData.avatar && conf.Karaoke.Display.Avatar) {
			const subOptions = [
				`lavfi-complex=nullsrc=size=1x1:duration=${mediaData.duration}[emp]`,
				'[vid1]scale=-2:1080[vidInp]',
				'[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc]',
				`movie=\\'${mediaData.avatar.replace(/\\/g,'/')}\\'[logo]`,
				'[logo][vpoc]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]',
				'[base][emp]overlay[ovrl]',
				`[ovrl][logo1]overlay=x='if(between(t,0,8)+between(t,${mediaData.duration - 7},${mediaData.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`
			];
			options.push(subOptions.join(';'));
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
		if (mediaData.avatar && conf.Karaoke.Display.Avatar) options.push(`lavfi-complex=movie=\\'${mediaData.avatar.replace(/\\/g,'/')}\\'[logo];[logo][vid1]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediaData.duration - 7},${mediaData.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`);
	}
	// Load all thoses files into mpv and let's go!
	try {
		await retry(() => exec('load', [mediaFile, 'replace', options], true), {
			retries: 3,
			onFailedAttempt: error => {
				logger.warn(`[Player] Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
			}
		}).catch(err => {
			logger.error(`[Player] Unable to load media: ${JSON.stringify(err)}`);
			throw err;
		});
		logger.debug(`[Player] File ${mediaFile} loaded`);
		playerState.mediaType = 'song';
		await exec('play', null, true);
		playerState.playerStatus = 'play';
		if (subFile) {
			await exec('addSubtitles', [subFile], true).catch(err => {
				logger.error(`[Player] Unable to load subtitles: ${JSON.stringify(err)}`);
				throw err;
			});
		}
		// Loaded!
		displaySongInfo(mediaData.infos, 8000, false, mediaData.spoiler);
		playerState.currentSong = mediaData;
		playerState._playing = true;
		playerState.songNearEnd = false;
		playerState.nextSongNotifSent = false;
		emitPlayerState();
		setDiscordActivity('song', {
			title: mediaData.currentSong.title,
			singer: mediaData.currentSong.singers?.map(s => s.name).join(', ') || i18n.t('UNKNOWN_ARTIST')
		});
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to load: ${JSON.stringify(err)}`);
		sentry.addErrorInfo('mediaData', JSON.stringify(mediaData, null, 2));
		sentry.error(err);
		throw err;
	}
}

export async function playMedia(mediaType: MediaType): Promise<PlayerState> {
	const conf = getConfig();
	const media = getSingleMedia(mediaType);
	if (media) {
		setState({currentlyPlayingKara: mediaType});
		logger.debug(`[Player] Playing ${mediaType} : ${media.file}`);
		const options = [`replaygain-fallback=${media.gain}`];
		try {
			await retry(() => exec('load', [media.file, 'replace', options], true), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(`[Player] Failed to play ${mediaType}, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`);
				}
			});
			await exec('play', null, true);
			const subFile = replaceExt(media.file, '.ass');
			if (await asyncExists(subFile)) {
				await exec('addSubtitles', [subFile], true);
			}
			mediaType === 'Jingles' || mediaType === 'Sponsors'
				? displayInfo()
					: conf.Playlist.Medias[mediaType].Message
						? message(conf.Playlist.Medias[mediaType].Message, 1000000)
							: clearText();
			playerState.playerStatus = 'play';
			playerState.mediaType = mediaType;
			playerState._playing = true;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error(`[Player] Error loading media ${mediaType}: ${media.file} : ${JSON.stringify(err)}`);
			sentry.error(err);
			throw err;
		}
	} else {
		logger.debug(`[Player] No ${mediaType} to play.`);
		playerState.playerStatus = 'play';
		await loadBackground();
		logger.debug('[Player] No jingle DI');
		await displayInfo();
		playerState._playing = true;
		emitPlayerState();
		playerEnding();
		return playerState;
	}
}

export async function stop(): Promise<PlayerState> {
	// on stop do not trigger onEnd event
	// => setting internal playing = false prevent this behavior
	logger.debug('[Player] Stop event triggered');
	playerState.playing = false;
	playerState.timeposition = 0;
	playerState._playing = false;
	playerState.playerStatus = 'stop';
	await loadBackground();
	logger.debug('[Player] Stop DI');
	if (!getState().songPoll) displayInfo();
	emitPlayerState();
	setProgressBar(-1);
	setDiscordActivity('idle');
	return playerState;
}

export async function pause(): Promise<PlayerState> {
	logger.debug('[Player] Pause event triggered');
	try {
		playerState._playing = false; // This prevents the play/pause event to be triggered
		await exec('pause', null, true);
		playerState.playing = false;
		playerState.playerStatus = 'pause';
		emitPlayerState();
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to pause: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function resume(): Promise<PlayerState> {
	logger.debug('[Player] Resume event triggered');
	try {
		// If one of the players is down, we need to reload the media
		let restartNeeded: boolean;
		for (let player in players) {
			if (!players[player].isRunning) restartNeeded = true;
		}
		if (restartNeeded) {
			return await play(playerState.currentSong);
		} else {
			playerState._playing = true; // This prevents the play/pause event to be triggered
			await exec('play', null, true);
			playerState.playing = true;
			playerState.playerStatus = 'play';
			emitPlayerState();
			return playerState;
		}
	} catch(err) {
		logger.error(`[Player] Unable to resume: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function seek(delta: number) {
	try {
		await exec('seek', [delta], true);
	} catch(err) {
		logger.error(`[Player] Unable to seek: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function goTo(pos: number) {
	try {
		await exec('goToPosition', [pos], true);
	} catch(err) {
		logger.error(`[Player] Unable to go to position: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function setMute(mute: boolean): Promise<PlayerState> {
	try {
		await exec('mute', [mute], true, 'main');
		playerState.mute = true;
		emitPlayerState();
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to toggle mute: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function setVolume(volume: number): Promise<PlayerState> {
	try {
		await exec('volume', [volume], true, 'main');
		playerState.volume = volume;
		emitPlayerState();
		return playerState;
	} catch(err) {
		logger.error(`[Player] Unable to toggle mute: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function setSubs(showSubs: boolean): Promise<PlayerState> {
	try {
		if (showSubs) {
			await exec('showSubtitles', null, true);
		} else {
			await exec('hideSubtitles', null, true);
		}
		playerState.showsubs = showSubs;
		emitPlayerState();
		return playerState;
	} catch (err) {
		logger.error(`[Player] Unable to ${showSubs ? 'show':'hide'} subs: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function setFullscreen(fsState: boolean): Promise<PlayerState> {
	try {
		if (fsState) {
			await exec('fullscreen', null, true, 'main');
		} else {
			await exec('leaveFullscreen', null, true, 'main');
		}
		playerState.fullscreen = fsState;
		emitPlayerState();
		return playerState;
	} catch (err) {
		logger.error(`[Player] Unable to toggle fullscreen: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function toggleOnTop(): Promise<PlayerState> {
	try {
		await exec('command', ['keypress', ['T']], true, 'main');
		playerState.stayontop = !playerState.stayontop;
		emitPlayerState();
		return playerState;
	} catch (err) {
		logger.error(`[Player] Unable to toggle ontop: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function message(message: string, duration = 10000, alignCode = 5) {
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
		await exec('freeCommand', [JSON.stringify(command)], true);
		if (playerState.playing === false && !getState().songPoll) {
			await sleep(duration);
			displayInfo();
		}
	} catch(err) {
		logger.error(`[Player] Unable to display message: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function displaySongInfo(infos: string, duration = 8000, nextSong = false, spoilerAlert = false) {
	try {
		playerState.displayingInfo = true;
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
		await exec('freeCommand', [JSON.stringify(command)], true);
		await sleep(duration);
		playerState.displayingInfo = false;
	} catch(err) {
		logger.error(`[Player] Unable to display song info: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

export async function displayInfo(duration = 10000000) {
	try {
		playerState.displayingInfo = true;
		const conf = getConfig();
		const state = getState();
		const ci = conf.Karaoke.Display.ConnectionInfo;
		let text = '';
		const catchphrase = playerState.mediaType !== 'song'
			? sample(initializationCatchphrases)
			: '';
		if (ci.Enabled) text = `${ci.Message} ${i18n.t('GO_TO')} ${state.osURL} !`; // TODO: internationalize the exclamation mark
		const version = `Karaoke Mugen ${state.version.number} (${state.version.name}) - http://karaokes.moe`;
		const message = '{\\fscx80}{\\fscy80}'+text+'\\N{\\fscx60}{\\fscy60}{\\i1}'+version+'{\\i0}\\N{\\fscx40}{\\fscy40}'+catchphrase;
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an1}'+message,
				duration,
			]
		};
		await exec('freeCommand', [JSON.stringify(command)], true);
		await sleep(duration);
		playerState.displayingInfo = false;
	} catch(err) {
		logger.error(`[Player] Unable to display infos: ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	}
}

function displayAddASong() {
	if (!playerState.displayingInfo && getState().randomPlaying) message(i18n.t('ADD_A_SONG_TO_PLAYLIST_SCREEN_MESSAGE'), 1000);
}

export async function clearText() {
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'',
			10,
		]
	};
	return await exec('freeCommand', [command], true).catch(err => {
		logger.error(`[Player] Unable to clear text : ${JSON.stringify(err)}`);
		sentry.error(err);
		throw err;
	});
}

let intervalIDAddASong: any;

/** Initialize start displaying the "Add a song to the list" */
export function initAddASongMessage() {
	if (!intervalIDAddASong && getState().randomPlaying) intervalIDAddASong = setInterval(displayAddASong, 2000);
}

/** Stop displaying the Add a song to the list */
export function stopAddASongMessage() {
	if (intervalIDAddASong) clearInterval(intervalIDAddASong);
	intervalIDAddASong = undefined;
}
