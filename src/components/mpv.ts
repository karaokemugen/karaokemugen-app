import execa from 'execa';
import i18n from 'i18next';
import debounce from 'lodash.debounce';
import sample from 'lodash.sample';
import {Promise as id3} from 'node-id3';
import retry from 'p-retry';
import {extname, resolve} from 'path';
import randomstring from 'randomstring';
import semver from 'semver';
import {promisify} from 'util';
import logger from 'winston';

import {setProgressBar} from '../electron/electron';
import {errorStep} from '../electron/electronLogger';
import {getConfig, resolvedPathBackgrounds, resolvedPathRepos, resolvedPathTemp} from '../lib/utils/config';
import {imageFileTypes} from '../lib/utils/constants';
import {asyncExists, asyncReadDir, isImageFile, replaceExt, resolveFileInDirs} from '../lib/utils/files';
import { playerEnding } from '../services/karaokeEngine';
import {getSingleMedia} from '../services/medias';
import {next, prev} from '../services/player';
import {notificationNextSong} from '../services/playlist';
import {endPoll} from '../services/poll';
import {MediaType} from '../types/medias';
import {MpvCommand} from '../types/MpvIPC';
import {MediaData, MpvOptions, PlayerState} from '../types/player';
import {initializationCatchphrases} from '../utils/constants';
import {setDiscordActivity} from '../utils/discordRPC';
import MpvIPC from '../utils/MpvIPC';
import sentry from '../utils/sentry';
import {getState, setState} from '../utils/state';
import {exit} from './engine';

const sleep = promisify(setTimeout);

type PlayerType = 'main' | 'monitor';

const playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerStatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	mute: false,
	currentSong: null,
	mediaType: 'background',
	showSubs: true,
	stayontop: false,
	fullscreen: false,
	url: null,
	monitorEnabled: false,
	songNearEnd: false,
	nextSongNotifSent: false,
	displayingInfo: false,
	isOperating: false
};

async function waitForLockRelease() {
	if (playerState.isOperating) logger.debug('Waiting for lock...', {service: 'Player'});
	while (playerState.isOperating) {
		await sleep(100);
	}
	return;
}

async function acquireLock() {
	await waitForLockRelease();
	logger.debug('Lock acquired', {service: 'Player'});
	playerState.isOperating = true;
	return true;
}

function releaseLock() {
	logger.debug('Lock released', {service: 'Player'});
	playerState.isOperating = false;
	return true;
}

function needsLock() {
	return function (target: any, _propertyKey: string, descriptor: TypedPropertyDescriptor<(... params: any[])=> Promise<any>>) {
		const originFunc = descriptor.value;
		descriptor.value = async (...params) => {
			await acquireLock();
			return originFunc.call(target, ...params).then(releaseLock);
		};
	};
}

// Compute a quick diff for state
function quickDiff() {
	const oldState = getState().player;
	const diff: Partial<PlayerState> = {};
	for (const key of Object.keys(playerState)) {
		switch (key) {
		case 'currentSong':
			if (oldState.currentSong?.currentSong.kid !== playerState.currentSong?.currentSong.kid) {
				diff[key] = playerState[key];
			}
			break;
		case 'currentMedia':
			if (oldState.currentMedia?.filename !== playerState.currentMedia?.filename) {
				diff[key] = playerState[key];
			}
			break;
		default:
			if (oldState[key] !== playerState[key]) {
				diff[key] = playerState[key];
			}
			break;
		}
	}
	return diff;
}

function emitPlayerState() {
	setState({player: quickDiff()});
}

async function checkMpv() {
	const state = getState();

	//On all platforms, check if we're using mpv at least version 0.25 or abort saying the mpv provided is too old.
	//Assume UNKNOWN is a compiled version, and thus the most recent one.
	let mpvVersion: string;
	try {
		const output = await execa(state.binPath.mpv,['--version']);
		logger.debug(`mpv stdout: ${output.stdout}`, {service: 'Player'});
		const mpv = semver.valid(output.stdout.split(' ')[1]);
		mpvVersion = mpv.split('-')[0];
		logger.debug(`mpv version: ${mpvVersion}`, {service: 'Player'});
	} catch(err) {
		logger.warn('Unable to determine mpv version. Will assume this is a recent one', {service: 'Player', obj: err});
		return;
	}
	if (!semver.satisfies(mpvVersion, '>=0.25.0')) {
		logger.error(`mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`, {service: 'Player'});
		logger.error(`mpv binary: ${state.binPath.mpv}`, {service: 'Player'});
		logger.error('Exiting due to obsolete mpv version', {service: 'Player'});
		await exit(1);
	}
}

class Player {
	mpv: MpvIPC
	configuration: any
	options: MpvOptions
	state: PlayerState
	control: Players

	constructor(options: MpvOptions, players: Players) {
		// Generate node mpv options
		this.options = options;
		this.configuration = this.genConf(options);
		this.control = players;
		// Instantiate mpv
		this.mpv = new MpvIPC(this.configuration[0], this.configuration[1], this.configuration[2]);
	}

	private genConf(options: MpvOptions) {
		const conf = getConfig();
		const state = getState();

		const NodeMPVArgs = [
			'--keep-open=yes',
			'--osd-level=0',
			`--log-file=${resolve(state.dataPath, 'logs/', 'mpv.log')}`,
			`--hwdec=${conf.Player.HardwareDecoding}`,
			`--volume=${+conf.Player.Volume}`,
			'--no-config',
			'--autoload-files=no',
			`--input-conf=${resolve(resolvedPathTemp(),'input.conf')}`,
			'--sub-visibility',
			'--loop-file=no'
		];

		if (options.monitor) {
			NodeMPVArgs.push(
				'--mute=yes',
				'--reset-on-next-file=pause,loop-file,mute',
				'--ao=null');
		} else {
			NodeMPVArgs.push(
				'--no-border',
				'--reset-on-next-file=pause,loop-file');

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
			if (options.monitor) {
				if (positionX <= 10) positionX += 10;
				else positionX -= 10;
				if (positionY <= 10) positionY += 10;
				else positionY -= 10;
			}
			NodeMPVArgs.push(`--geometry=${+positionX}%:${+positionY}%`);
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

		let socket: string;
		// Name socket file accordingly depending on OS.
		const random = randomstring.generate({
			length: 3,
			charset: 'numeric'
		});
		state.os === 'win32'
			? socket = '\\\\.\\pipe\\mpvsocket' + random
			: socket = '/tmp/km-node-mpvsocket' + random;

		const NodeMPVOptions = {
			binary: state.binPath.mpv,
			socket: socket
		};

		logger.debug(`mpv${this.options.monitor ? ' monitor':''} options:`, {obj: [NodeMPVOptions, NodeMPVArgs], service: 'Player'});

		return [state.binPath.mpv, socket, NodeMPVArgs];
	}

	private debounceTimePosition(position) {
		// Returns the position in seconds in the current song
		playerState.timeposition = position;
		emitPlayerState();
		const conf = getConfig();
		if (playerState?.currentSong?.duration) {
			if (conf.Player.ProgressBarDock) {
				playerState.mediaType === 'song'
					? setProgressBar(position / playerState.currentSong.duration)
					: setProgressBar(-1);
			}
			// Send notification to frontend if timeposition is 15 seconds before end of song
			if (position >= (playerState.currentSong.duration - 15) && playerState.mediaType === 'song' && !playerState.nextSongNotifSent) {
				playerState.nextSongNotifSent = true;
				notificationNextSong();
			}
			// Display informations if timeposition is 8 seconds before end of song
			if (position >= (playerState.currentSong.duration - 8) &&
				!playerState.displayingInfo &&
				playerState.mediaType === 'song')
				this.control.displaySongInfo(playerState.currentSong.infos);
			// Display informations if timeposition is 8 seconds after start of song
			if (position <= 8 &&
				!playerState.displayingInfo &&
				playerState.mediaType === 'song')
				this.control.displaySongInfo(playerState.currentSong.infos, 8000, false, playerState.currentSong.spoiler);
			// Display KM's banner if position reaches halfpoint in the song
			if (Math.floor(position) === Math.floor(playerState.currentSong.duration / 2) &&
				!playerState.displayingInfo &&
				playerState.mediaType === 'song' && !getState().songPoll) {
				logger.debug('Middle of song DI', {service: 'Player'});
				this.control.displayInfo(8000);
			}
			// Stop poll if position reaches 10 seconds before end of song
			if (Math.floor(position) >= Math.floor(playerState.currentSong.duration - 10) &&
				playerState.mediaType === 'song' &&
				conf.Karaoke.Poll.Enabled &&
				!playerState.songNearEnd) {
				playerState.songNearEnd = true;
				endPoll();
			}
		}
	}

	debouncedTimePosition = debounce(this.debounceTimePosition, 125, {maxWait: 250, leading: true});

	private bindEvents() {
		if (!this.options.monitor) {
			this.mpv.on('property-change', (status) => {
				if (status.name !== 'playback-time') {
					logger.debug('mpv status', {service: 'Player', obj: status});
					playerState[status.name] = status.data;
				}
				// If we're displaying an image, it means it's the pause inbetween songs
				if (/*playerState._playing && */!playerState.isOperating && playerState.mediaType !== 'background' &&
					(
						/*(status.name === 'playback-time' && status.data > playerState?.currentSong?.duration + 0.9) ||*/
						(status.name === 'eof-reached' && status.data === true)
					)
				) {
					// Do not trigger 'pause' event from mpv
					playerState._playing = false;
					playerEnding();
					emitPlayerState();
				} else if (status.name === 'playback-time') {
					this.debouncedTimePosition(status.data);
				}
			});
		}
		// Handle pause/play via external ways
		this.mpv.on('property-change', (status) => {
			if (status.name === 'pause' && playerState.playerStatus !== 'stop' && (
				playerState._playing === status.data || playerState.mediaType === 'background'
			)) {
				logger.debug(`${status.data ? 'Paused':'Resumed'} event triggered on ${this.options.monitor ? 'monitor':'main'}`, {service: 'Player'});
				playerState._playing = !status.data;
				playerState.playing = !status.data;
				playerState.playerStatus = status.data ? 'pause':'play';
				this.control.exec({command: ['set_property', 'pause', status.data]}, null, this.options.monitor ? 'main':'monitor');
				emitPlayerState();
			}
		});
		// Handle client messages (skip/go-back)
		this.mpv.on('client-message', async (message) => {
			if (typeof message.args === 'object') {
				try {
					if (message.args[0] === 'skip') {
						await next();
					} else if (message.args[0] === 'go-back') {
						await prev();
					}
				} catch(err) {
					logger.warn('Cannot handle mpv script command', {service: 'mpv'});
					// Non fatal, do not report to Sentry.
				}
			}
		});
		// Handle manually exits/crashes
		this.mpv.once('shutdown', () => {
			logger.debug('mpv closed', {service: `mpv${this.options.monitor ? ' monitor':''}`});
			// We set the state here to prevent the 'paused' event to trigger (because it will restart mpv in the same time)
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerStatus = 'stop';
			this.control.exec({command: ['set_property', 'pause', true]}, null, this.options.monitor ? 'main':'monitor');
			this.recreate();
			emitPlayerState();
		});
		this.mpv.once('crashed', () => {
			logger.warn('mpv crashed', {service: `mpv${this.options.monitor ? ' monitor':''}`});
			// We set the state here to prevent the 'paused' event to trigger (because it will restart mpv in the same time)
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerStatus = 'stop';
			this.control.exec({command: ['set_property', 'pause', true]}, null, this.options.monitor ? 'main':'monitor');
			// In case of a crash, restart immediately
			this.recreate(null, true);
			emitPlayerState();
		});
	}

	async start() {
		this.bindEvents();
		await retry(async () => {
			await this.mpv.start().catch(err => {
				if (err.message === 'MPV is already running') {
					// It's already started!
					logger.warn('A start command was executed, but the player is already running. Not normal.', {service: 'Player'});
					sentry.error(err, 'Warning');
					return;
				}
				throw err;
			});
			if (!this.options.monitor) {
				this.mpv.observeProperty('eof-reached');
				this.mpv.observeProperty('playback-time');
				this.mpv.observeProperty('mute');
				this.mpv.observeProperty('volume');
			}
			this.mpv.observeProperty('pause');
			return true;
		}, {
			retries: 3,
			onFailedAttempt: error => {
				logger.warn(`Failed to start mpv, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`, {service: 'Player', obj: error});
			}
		}).catch(err => {
			logger.error('Cannot start MPV', {service: 'Player', obj: err});
			sentry.error(err, 'Fatal');
			throw err;
		});
		return true;
	}

	async recreate(options?: MpvOptions, restart = false) {
		try {
			if (this.isRunning) await this.destroy();
			// Set options if supplied
			if (options) this.options = options;
			// Regen config
			this.configuration = this.genConf(this.options);
			// Recreate mpv
			this.mpv = new MpvIPC(this.configuration[0], this.configuration[1], this.configuration[2]);
			if (restart) await this.start();
		} catch (err) {
			logger.error('mpvAPI (recreate)', {service: 'Player', obj: err});
			throw err;
		}
	}

	async destroy() {
		try {
			await this.mpv.stop();
			return true;
		} catch (err) {
			logger.error('mpvAPI(quit)', {service: 'Player', obj: err});
			throw err;
		}
	}

	get isRunning() {
		return this.mpv.isRunning;
	}
}

class Players {
	players: {
		main: Player,
		monitor?: Player
	};

	private static fillVisualizationOptions(mediaData: MediaData, withAvatar: boolean): string {
		const subOptions = [
			'[aid1]asplit[ao][a]',
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

	private static avatarFilter(mediaData: MediaData) {
		const subOptions = [
			`nullsrc=size=1x1:duration=${mediaData.duration}[emp]`,
			'[vid1]scale=-2:1080[vidInp]',
			'[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc]',
			`movie=\\'${mediaData.avatar.replace(/\\/g,'/')}\\'[logo]`,
			'[logo][vpoc]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]',
			'[base][emp]overlay[ovrl]',
			`[ovrl][logo1]overlay=x='if(between(t,0,8)+between(t,${mediaData.duration - 7},${mediaData.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`
		];
		return subOptions.join(';');
	}

	private async extractAllBackgroundFiles(): Promise<string[]> {
		let backgroundFiles = [];
		for (const resolvedPath of resolvedPathBackgrounds()) {
			backgroundFiles = backgroundFiles.concat(await Players.extractBackgroundFiles(resolvedPath));
		}
		// Return only files which have an extension included in the imageFileTypes array
		return backgroundFiles.filter(f => imageFileTypes.includes(extname(f).substring(1)));
	}

	private static async extractBackgroundFiles(backgroundDir: string): Promise<string[]> {
		const backgroundFiles = [];
		const dirListing = await asyncReadDir(backgroundDir);
		for (const file of dirListing) {
			if (isImageFile(file)) backgroundFiles.push(resolve(backgroundDir, file));
		}
		return backgroundFiles;
	}

	isRunning() {
		for (const player in this.players) {
			if (this.players[player].isRunning) {
				return true;
			}
		}
		return false;
	}

	async ensureRunning(onlyOn?: PlayerType, ignoreLock = false) {
		try {
			if (!ignoreLock) await waitForLockRelease();
			const loads = [];
			if (onlyOn) {
				if (this.players[onlyOn]) {
					if (!this.players[onlyOn].isRunning) {
						logger.info(`Restarting ${onlyOn} player`, {service: 'Player'});
						loads.push(this.players[onlyOn].recreate(null, true));
					}
				} else {
					// Fail silently on non-existing player (monitor disabled)
					return -1;
				}
			} else {
				if (this.players) {
					for (const player in this.players) {
						if (!this.players[player].isRunning) {
							logger.info(`Restarting ${player} player`, {service: 'Player'});
							loads.push(this.players[player].recreate(null, true));
						}
					}
				} else {
					loads.push(this.initPlayerSystem());
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

	async exec(cmd: string|MpvCommand, args?: any[], onlyOn?: PlayerType, ignoreLock = false) {
		try {
			const mpv = typeof cmd === 'object';
			// ensureRunning returns -1 if the player does not exist (eg. disabled monitor)
			// ensureRunning isn't needed on non-mpv commands
			if (mpv && await this.ensureRunning(onlyOn, ignoreLock) === -1) return;
			logger.debug(`${mpv ? 'mpv ': ''}command: ${JSON.stringify(cmd)}, ${JSON.stringify(args)}`, {service: 'Player'});
			logger.debug(`Running it for players ${JSON.stringify(onlyOn ? onlyOn:Object.keys(this.players))}`, {service: 'Player'});
			const loads = [];
			if (!args) args = [];
			if (onlyOn) {
				if (mpv) loads.push(this.players[onlyOn].mpv.send(cmd as MpvCommand));
				else loads.push(this.players[onlyOn][cmd as string](...args));
			} else {
				for (const player in this.players) {
					if (mpv) loads.push(this.players[player].mpv.send(cmd));
					else loads.push(this.players[player][cmd](...args));
				}
			}
			await Promise.all(loads);
		} catch (err) {
			logger.error('mpvAPI (send)', {service: 'Player', obj: err});
			throw new Error(JSON.stringify(err));
		}
	}

	private async loadBackground() {
		const conf = getConfig();
		// Default background
		let backgroundFiles = [];
		const defaultImageFile = resolve(resolvedPathTemp(), 'default.jpg');
		let backgroundImageFile = defaultImageFile;
		if (conf.Player.Background) {
			backgroundImageFile = resolve(resolvedPathBackgrounds()[0], conf.Player.Background);
			if (!await asyncExists(backgroundImageFile)) {
				// Background provided in config file doesn't exist, reverting to default one provided.
				logger.warn(`Unable to find background file ${backgroundImageFile}, reverting to default one`, {service: 'Player'});
				backgroundFiles.push(defaultImageFile);
			} else {
				backgroundFiles.push(backgroundImageFile);
			}
		} else {
			// PlayerBackground is empty, thus we search through all backgrounds paths and pick one at random
			backgroundFiles = await this.extractAllBackgroundFiles();
			// If backgroundFiles is empty, it means no file was found in the directories scanned.
			// Reverting to original, supplied background :
			if (backgroundFiles.length === 0) backgroundFiles.push(defaultImageFile);
		}
		backgroundImageFile = sample(backgroundFiles);
		logger.debug(`Background selected : ${backgroundImageFile}`, {service: 'Player'});
		try {
			playerState.mediaType = 'background';
			playerState.playerStatus = 'stop';
			playerState.currentSong = null;
			playerState._playing = false;
			playerState.playing = false;
			emitPlayerState();
			await this.exec({command: ['loadfile', backgroundImageFile, 'replace', {title: 'Karaoke Mugen Player'}]});
		} catch(err) {
			logger.error('Unable to load background', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	@needsLock()
	private async bootstrapPlayers() {
		await checkMpv();
		this.players = {
			main: new Player({monitor: false}, this)
		};
		if (playerState.monitorEnabled) this.players.monitor = new Player({monitor: true}, this);
		logger.debug(`Players: ${JSON.stringify(Object.keys(this.players))}`, {service: 'Player'});
		return this.exec('start');
	}

	async initPlayerSystem() {
		const conf = getConfig();
		const state = getState();
		playerState.fullscreen = state.fullscreen;
		playerState.stayontop = state.ontop;
		playerState.volume = conf.Player.Volume;
		playerState.monitorEnabled = conf.Player.Monitor;
		emitPlayerState();
		try {
			await this.bootstrapPlayers();
			await this.loadBackground();
			this.displayInfo();
		} catch (err) {
			errorStep(i18n.t('ERROR_START_PLAYER'));
			logger.error('Unable to start player', {service: 'Player', obj: err});
			sentry.error(err, 'Fatal');
			throw err;
		}
	}

	@needsLock()
	quit() {
		return this.exec('destroy').catch(err => {
			// Non fatal. Idiots sometimes close mpv instead of KM, this avoids an uncaught exception.
			logger.warn('Failed to quit mpv', {service: 'Player', obj: err});
		});
	}

	// Lock
	@needsLock()
	async restart() {
		// Check change in monitor setting
		if (playerState.monitorEnabled !== getConfig().Player.Monitor) {
			// Determine if we have to destroy the monitor or create it.
			// Refresh monitor setting
			playerState.monitorEnabled = getConfig().Player.Monitor;
			if (playerState.monitorEnabled) {
				// Monitor needs to be created
				await checkMpv();
				this.players.monitor = new Player({monitor: true}, this);
			} else {
				// Monitor needs to be destroyed
				await this.exec('destroy', null, 'monitor');
				delete this.players.monitor;
			}
		}
		await this.exec('recreate', [null, true]).catch(err => {
			logger.error('Cannot restart mpv', {service: 'Player', obj: err});
		});
		if (playerState.playerStatus === 'stop' || playerState.mediaType === 'background') {
			await this.loadBackground();
		}
	}

	async play(mediaData: MediaData): Promise<PlayerState> {
		const conf = getConfig();
		logger.debug('Play event triggered', {service: 'Player'});
		playerState.playing = true;
		//Search for media file in the different PathMedias
		let mediaFile: string;
		const mediaFiles: string[]|void = await resolveFileInDirs(mediaData.media, resolvedPathRepos('Medias', mediaData.repo))
			.catch(err => {
				logger.debug('Error while resolving media path', {service: 'Player', obj: err});
				logger.warn(`Media NOT FOUND : ${mediaData.media}`, {service: 'Player'});
				if (conf.Online.MediasHost) {
					mediaFile = `${conf.Online.MediasHost}/${encodeURIComponent(mediaData.media)}`;
					logger.info(`Trying to play media directly from the configured http source : ${conf.Online.MediasHost}`, {service: 'Player'});
				} else {
					throw Error(`No media source for ${mediaData.media} (tried in ${resolvedPathRepos('Medias', mediaData.repo).toString()} and HTTP source)`);
				}
			});
		mediaFile = mediaFiles[0];
		logger.debug(`Audio gain adjustment: ${mediaData.gain}`, {service: 'Player'});
		logger.debug(`Loading media: ${mediaFile}`, {service: 'Player'});
		const options: any = {
			'replaygain-fallback': typeof mediaData.gain === 'number' ? mediaData.gain.toString() : '0',
			title: `${mediaData.currentSong.title} - Karaoke Mugen Player`
		};
		const subFiles = await resolveFileInDirs(mediaData.subfile, resolvedPathRepos('Lyrics', mediaData.repo))
			.catch(err => {
				logger.debug('Error while resolving subs path', {service: 'Player', obj: err});
				logger.warn(`Subs NOT FOUND : ${mediaData.subfile}`, {service: 'Player'});
			}) || []; // Empty array
		if (subFiles[0]) {
			options['sub-file'] = subFiles[0];
			options.sid = '1';
		} else {
			options['sub-file'] = '';
			options.sid = 'none';
		}
		if (mediaFile.endsWith('.mp3')) {
			// Lavfi-complex argument to have cool visualizations on top of an image during mp3 playback
			// Courtesy of @nah :)
			if (conf.Player.VisualizationEffects) {
				options['lavfi-complex'] = Players.fillVisualizationOptions(mediaData, (mediaData.avatar && conf.Karaoke.Display.Avatar));
			} else if (mediaData.avatar && conf.Karaoke.Display.Avatar) {
				options['lavfi-complex'] = Players.avatarFilter(mediaData);
			}

			const id3tags = await id3.read(mediaFile);
			if (!id3tags.image) {
				const defaultImageFile = resolve(resolvedPathTemp(), 'default.jpg');
				options['external-file'] = defaultImageFile.replace(/\\/g,'/');
				options['force-window'] = 'yes';
				options['image-display-duration'] = 'inf';
				options.vid = '1';
			}
		} else {
			// If video, display avatar if it's defined.
			// Again, lavfi-complex expert @nah comes to the rescue!
			if (mediaData.avatar && conf.Karaoke.Display.Avatar) options['lavfi-complex'] = `movie=\\'${mediaData.avatar.replace(/\\/g,'/')}\\'[logo];[logo][vid1]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base];[base][logo1]overlay=x='if(between(t,0,8)+between(t,${mediaData.duration - 7},${mediaData.duration}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`;
		}
		// Load all thoses files into mpv and let's go!
		try {
			playerState.currentSong = mediaData;
			playerState.mediaType = 'song';
			playerState.currentMedia = null;
			await retry(() => this.exec({command: ['loadfile', mediaFile, 'replace', options]}), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(`Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`, {service: 'Player'});
				}
			}).catch(err => {
				logger.error('Unable to load media', {service: 'Player', obj: err});
				throw err;
			});
			logger.debug(`File ${mediaFile} loaded`, {service: 'Player'});
			// Loaded!
			// Subtitles load is handled by `file-loaded` event on the Player class
			playerState.songNearEnd = false;
			playerState.nextSongNotifSent = false;
			playerState.playing = true;
			playerState._playing = true;
			playerState.playerStatus = 'play';
			this.clearText();
			emitPlayerState();
			setDiscordActivity('song', {
				title: mediaData.currentSong.title,
				singer: mediaData.currentSong.singers?.map(s => s.name).join(', ') || i18n.t('UNKNOWN_ARTIST')
			});
			return playerState;
		} catch(err) {
			logger.error('Unable to load', {service: 'Player', obj: err});
			sentry.addErrorInfo('mediaData', JSON.stringify(mediaData, null, 2));
			sentry.error(err);
			throw err;
		}
	}

	async playMedia(mediaType: MediaType): Promise<PlayerState> {
		const conf = getConfig();
		const media = getSingleMedia(mediaType);
		if (media) {
			setState({currentlyPlayingKara: mediaType});
			logger.debug(`Playing ${mediaType}: ${media.filename}`, {service: 'Player'});
			const options: any = {
				'replaygain-fallback': media.audiogain.toString(),
				title: `${mediaType} - Karaoke Mugen Player`
			};
			const subFile = replaceExt(media.filename, '.ass');
			logger.debug(`Searching for ${subFile}`, {service: 'Player'});
			if (await asyncExists(subFile)) {
				options['sub-file'] = subFile;
				options['sid'] = '1';
				logger.debug(`Loading ${subFile}`, {service: 'Player'});
			} else {
				logger.debug('No subtitles to load (not found for media)', {service: 'Player'});
			}
			try {
				playerState.currentSong = null;
				playerState.mediaType = mediaType;
				playerState.currentMedia = media;
				await retry(() => this.exec({command: ['loadfile', media.filename, 'replace', options]}), {
					retries: 3,
					onFailedAttempt: error => {
						logger.warn(`Failed to play ${mediaType}, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`, {service: 'Player'});
					}
				});
				playerState.playerStatus = 'play';
				playerState._playing = true;
				// Subtitles load is handled by `file-loaded` event on the Player class
				(mediaType === 'Jingles' || mediaType === 'Sponsors')
					? this.displayInfo()
					: conf.Playlist.Medias[mediaType].Message
						? this.message(conf.Playlist.Medias[mediaType].Message, 1000000)
						: this.clearText();
				emitPlayerState();
				return playerState;
			} catch (err) {
				logger.error(`Error loading media ${mediaType}: ${media.filename}`, {service: 'Player', obj: err});
				sentry.error(err);
				throw err;
			}
		} else {
			logger.debug(`No ${mediaType} to play.`, {service: 'Player'});
			playerState.playerStatus = 'play';
			await this.loadBackground();
			logger.debug('No jingle DI', {service: 'Player'});
			await this.displayInfo();
			playerState._playing = true;
			emitPlayerState();
			playerEnding();
			return playerState;
		}
	}

	async stop(): Promise<PlayerState> {
		// on stop do not trigger onEnd event
		// => setting internal playing = false prevent this behavior
		logger.debug('Stop event triggered', {service: 'Player'});
		playerState.playing = false;
		playerState.timeposition = 0;
		playerState._playing = false;
		playerState.playerStatus = 'stop';
		await this.loadBackground();
		logger.debug('Stop DI', {service: 'Player'});
		if (!getState().songPoll) this.displayInfo();
		emitPlayerState();
		setProgressBar(-1);
		setDiscordActivity('idle');
		return playerState;
	}

	async pause(): Promise<PlayerState> {
		logger.debug('Pause event triggered', {service: 'Player'});
		try {
			playerState._playing = false; // This prevents the play/pause event to be triggered
			await this.exec({command: ['set_property', 'pause', true]});
			playerState.playing = false;
			playerState.playerStatus = 'pause';
			emitPlayerState();
			return playerState;
		} catch(err) {
			logger.error('Unable to pause', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async resume(): Promise<PlayerState> {
		logger.debug('Resume event triggered', {service: 'Player'});
		try {
			// If one of the players is down, we need to reload the media
			let restartNeeded: boolean;
			for (const player in this.players) {
				if (!this.players[player].isRunning) restartNeeded = true;
			}
			if (restartNeeded) {
				return await this.play(playerState.currentSong);
			} else {
				playerState._playing = true; // This prevents the play/pause event to be triggered
				await this.exec({command: ['set_property', 'pause', false]});
				playerState.playing = true;
				playerState.playerStatus = 'play';
				emitPlayerState();
				return playerState;
			}
		} catch(err) {
			logger.error('Unable to resume', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async seek(delta: number) {
		try {
			// Workaround for audio-only files: disable the lavfi-complex filter
			if (playerState.currentSong.media.endsWith('.mp3') && playerState.currentSong.avatar && getConfig().Karaoke.Display.Avatar) {
				await this.exec({command: ['set_property', 'lavfi-complex', '[vid1]null[vo]']});
			}
			await this.exec({command: ['seek', delta]});
		} catch(err) {
			logger.error('Unable to seek', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async goTo(pos: number) {
		try {
			// Workaround for audio-only files: disable the lavfi-complex filter
			if (playerState.currentSong?.media.endsWith('.mp3') && playerState.currentSong?.avatar && getConfig().Karaoke.Display.Avatar) {
				await this.exec({command: ['set_property', 'lavfi-complex', '[vid1]null[vo]']});
			}
			await this.exec({command: ['seek', pos, 'absolute']});
		} catch(err) {
			logger.error('Unable to go to position', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async setMute(mute: boolean): Promise<PlayerState> {
		try {
			await this.exec({command: ['set_property', 'mute', mute]});
			return playerState;
		} catch(err) {
			logger.error('Unable to toggle mute', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async setVolume(volume: number): Promise<PlayerState> {
		try {
			await this.exec({command: ['set_property', 'volume', volume]});
			return playerState;
		} catch(err) {
			logger.error('Unable to set volume', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async setSubs(showSubs: boolean): Promise<PlayerState> {
		try {
			await this.exec({command: ['set_property', 'sub-visibility', showSubs]});
			playerState.showSubs = showSubs;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error(`Unable to ${showSubs ? 'show':'hide'} subs: ${JSON.stringify(err)}`, {service: 'Player'});
			sentry.error(err);
			throw err;
		}
	}

	async setFullscreen(fsState: boolean): Promise<PlayerState> {
		try {
			await this.exec({command: ['set_property', 'fullscreen', fsState]});
			playerState.fullscreen = fsState;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to toggle fullscreen', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async toggleOnTop(): Promise<boolean> {
		try {
			await this.exec({command: ['set_property', 'ontop', !playerState.stayontop]});
			playerState.stayontop = !playerState.stayontop;
			emitPlayerState();
			return playerState.stayontop;
		} catch (err) {
			logger.error('Unable to toggle ontop', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async setPiPSize(pct: number) {
		await this.exec({command: ['set_property', 'autofit', `${pct}%x${pct}%`]}).catch(err => {
			logger.error('Unable to set PiP size', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		});
		return playerState;
	}

	async setHwDec(method: string) {
		await this.exec({command: ['set_property', 'hwdec', method]}).catch(err => {
			logger.error('Unable to set hwdec method', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		});
		return playerState;
	}

	async message(message: string, duration = 10000, alignCode = 5) {
		try {
			const alignCommand = `{\\an${alignCode}}`;
			const command = {
				command: [
					'expand-properties',
					'show-text',
					'${osd-ass-cc/0}' + alignCommand + message,
					duration
				]
			};
			await this.exec(command);
			if (playerState.playing === false && !getState().songPoll) {
				await sleep(duration);
				this.displayInfo();
			}
		} catch(err) {
			logger.error('Unable to display message', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async displaySongInfo(infos: string, duration = 8000, nextSong = false, spoilerAlert = false) {
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
			await this.exec(command);
			await sleep(duration);
			playerState.displayingInfo = false;
		} catch(err) {
			logger.error('Unable to display song info', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	async displayInfo(duration = 10000000) {
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
			await this.exec(command);
			await sleep(duration);
			playerState.displayingInfo = false;
		} catch(err) {
			logger.error('Unable to display infos', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		}
	}

	static displayAddASong(thisArg: Players) {
		if (!playerState.displayingInfo && getState().randomPlaying) thisArg.message(i18n.t('ADD_A_SONG_TO_PLAYLIST_SCREEN_MESSAGE'), 1000);
	}

	clearText() {
		const command = {
			command: [
				'expand-properties',
				'show-text',
				'',
				10,
			]
		};
		return this.exec(command).then(() => {
			playerState.displayingInfo = false;
		}).catch(err => {
			logger.error('Unable to clear text', {service: 'Player', obj: err});
			sentry.error(err);
			throw err;
		});
	}

	intervalIDAddASong: NodeJS.Timeout;

	/** Initialize start displaying the "Add a song to the list" */
	initAddASongMessage() {
		const thisArg = this;
		if (!this.intervalIDAddASong && getState().randomPlaying) this.intervalIDAddASong = setInterval(Players.displayAddASong, 2000, thisArg);
	}

	/** Stop displaying the Add a song to the list */
	stopAddASongMessage() {
		if (this.intervalIDAddASong) clearInterval(this.intervalIDAddASong);
		this.intervalIDAddASong = undefined;
	}
}

export default Players;
