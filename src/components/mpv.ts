import { execa } from 'execa';
import fs from 'fs/promises';
import i18n from 'i18next';
import { sample } from 'lodash';
import { Promise as id3, Tags } from 'node-id3';
import retry from 'p-retry';
import { dirname, resolve } from 'path';
import semver from 'semver';
import { setTimeout as sleep } from 'timers/promises';

import { errorStep } from '../electron/electronLogger.js';
import { APIMessage } from '../lib/services/frontend.js';
import { DBKaraTag } from '../lib/types/database/kara.js';
import { PlaylistMediaType } from '../lib/types/playlistMedias.js';
import { getConfig, resolvedPath, resolvedPathRepos, setConfig } from '../lib/utils/config.js';
import { supportedFiles } from '../lib/utils/constants.js';
import { Timer } from '../lib/utils/date.js';
import { getAvatarResolution } from '../lib/utils/ffmpeg.js';
import { fileExists, replaceExt, resolveFileInDirs } from '../lib/utils/files.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import { convert1LangTo2B } from '../lib/utils/langs.js';
import logger, { profile } from '../lib/utils/logger.js';
import { emitWS } from '../lib/utils/ws.js';
import { getBackgroundAndMusic } from '../services/backgrounds.js';
import { playerEnding } from '../services/karaEngine.js';
import { getPromoMessage, next } from '../services/player.js';
import { getSingleMedia } from '../services/playlistMedias.js';
import { BackgroundType } from '../types/backgrounds.js';
import { MpvCommand } from '../types/mpvIPC.js';
import { PlayerState, SongModifiers } from '../types/player.js';
import { CurrentSong } from '../types/playlist.js';
import {
	FFmpegRegex,
	initializationCatchphrases,
	mpvRegex,
	requiredMPVFFmpegMasterVersion,
	requiredMPVFFmpegVersion,
	requiredMPVVersion,
} from '../utils/constants.js';
import { setDiscordActivity } from '../utils/discordRPC.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { isShutdownInProgress } from './engine.js';
import Timeout = NodeJS.Timeout;
import { getSongSeriesSingers, getSongTitle } from '../lib/services/kara.js';
import { getRepoManifest } from '../lib/services/repo.js';
import { getTagNameInLanguage } from '../lib/services/tag.js';
import { getRepo } from '../services/repo.js';
import { writeStreamFiles } from '../utils/streamerFiles.js';
import { Player } from './mpv/player.js';

type PlayerType = 'main' | 'monitor';

type ProgressType = 'bar' | 'countdown';

const service = 'mpv';

export const playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerStatus: null,
	_playing: false, // internal delay flag
	timeposition: 0,
	mute: false,
	currentSong: null,
	mediaType: 'stop',
	showSubs: true,
	onTop: false,
	fullscreen: false,
	border: false,
	url: null,
	monitorEnabled: false,
	songNearEnd: false,
	nextSongNotifSent: false,
	isOperating: false,
	quiz: {
		guessTime: 0,
		quickGuess: 0,
		revealTime: 0,
	},
	pitch: 0,
	speed: 100,
	currentVideoTrack: 1,
};

async function resolveMediaURL(file: string, repoName: string): Promise<string> {
	const conf = getConfig();
	const repo = getRepo(repoName);
	let up = false;
	let mediaFile = `${conf.Online.MediasHost}/${fixedEncodeURIComponent(file)}`;
	// We test if the MediasHost allows us to reach a file. If not we try the song's repository.
	if (conf.Online.MediasHost) {
		if (await HTTP.head(mediaFile)) up = true;
	} else {
		mediaFile = `${repo.Secure ? 'https' : 'http'}://${repoName}/downloads/medias/${fixedEncodeURIComponent(file)}`;
		if (await HTTP.head(mediaFile)) up = true;
	}
	if (up) {
		logger.info(`Playing media from external source : ${mediaFile}`, { service });
		return mediaFile;
	}
	// If all else fails, throw up
	throw up;
}

async function waitForLockRelease() {
	if (playerState.isOperating) logger.debug('Waiting for lock...', { service });
	while (playerState.isOperating) {
		await sleep(100);
	}
}

async function acquireLock() {
	await waitForLockRelease();
	logger.debug('Lock acquired', { service });
	playerState.isOperating = true;
	return true;
}

function releaseLock() {
	logger.debug('Lock released', { service });
	playerState.isOperating = false;
	return true;
}

function needsLock() {
	return (
		_target: any,
		_propertyKey: string,
		descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>
	) => {
		const originFunc = descriptor.value;
		descriptor.value = async function descriptorFunc(...params) {
			await acquireLock();
			return originFunc.apply(this, params).then(releaseLock);
		};
		return descriptor;
	};
}

class Comment {
	updateTime: number;

	speed: number;

	pos: number;

	ypos: number;

	message: string;

	getText() {
		this.pos -= this.speed;
		return `{\\pos(${this.pos}, ${this.ypos})}  ${this.message}`;
	}
}

class CommentHandler {
	// TODO: change comment array to Map <Comment,string>, in a similar way to MessageManager?
	comments: Comment[];

	intervalId: Timeout;

	isRunning: boolean;

	tickFn: () => void;

	constructor(tickFn: () => void) {
		this.comments = [];
		this.tickFn = tickFn;
	}

	getRandomInRange(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	addComment(message: string) {
		if (!this.isRunning) {
			this.isRunning = true;
			/* //TODO: test code, remove this
			for(let i = 0; i < 1000; i++) {
				this.addComment(`test${i}`);
			} */
			// TODO: Test if this causes screen tearing? How to time this so it doesn't if so?
			this.intervalId = setInterval(this.tick.bind(this), 16);
		}

		const comment = new Comment();
		comment.ypos = this.getRandomInRange(200, 600);
		comment.pos = 1000;
		comment.message = message;
		comment.speed = this.getRandomInRange(1, 6);
		this.comments.push(comment);
	}

	getText() {
		let txt = '';
		for (const line of this.comments) {
			txt += `${line.getText()}\n`;
		}
		return txt;
	}

	tick() {
		// remove comments that are out of bounds
		// TODO: Could this be better as a set timeout based on speed instead of checking pos every tick?
		for (const i in this.comments) {
			if (this.comments[i].pos < -100) {
				this.comments.splice(+i, 1);
			}
		}
		// disable Interval if comments array is empty
		if (this.comments.length === 0) {
			clearInterval(this.intervalId);
			this.isRunning = false;
		}
		this.tickFn();
	}
}

class MessageManager {
	messages: Map<string, string>;

	timeouts: Map<string, Timeout>;

	tickFn: () => void;

	cache: string;

	constructor(tickFn: () => void) {
		this.messages = new Map();
		this.timeouts = new Map();
		this.tickFn = tickFn;
		this.cache = '';
	}

	private tick() {
		const str = this.getText();
		if (str !== this.cache) {
			this.cache = str;
			this.tickFn();
		}
	}

	addMessage(type: string, message: string, duration: number | 'infinite' = 'infinite') {
		this.messages.set(type, message);
		if (this.timeouts.has(type)) {
			clearTimeout(this.timeouts.get(type));
			this.timeouts.delete(type);
		}
		if (duration !== 'infinite') {
			this.timeouts.set(type, setTimeout(this.messages.delete.bind(this.messages, type), duration).unref());
		}
		this.tick();
	}

	removeMessage(type: string) {
		this.messages.delete(type);
		if (this.timeouts.has(type)) {
			clearTimeout(this.timeouts.get(type));
			this.timeouts.delete(type);
		}
		this.tick();
	}

	removeMessages(types: string[]) {
		types.forEach(e => this.removeMessage(e));
	}

	getText() {
		let txt = '';
		for (const line of this.messages.values()) {
			txt += `${line}\n`;
		}
		return txt;
	}

	clearMessages() {
		this.messages.clear();
		for (const timeout of this.timeouts.values()) {
			clearTimeout(timeout);
		}
		this.timeouts.clear();
		this.tick();
	}
}

// Compute a quick diff for state
function quickDiff() {
	const oldState = getState().player;
	const diff: Partial<PlayerState> = {};
	for (const key of Object.keys(playerState)) {
		switch (key) {
			case 'currentSong':
				if (oldState.currentSong?.kid !== playerState.currentSong?.kid) {
					diff[key] = playerState[key];
				}
				break;
			case 'currentMedia':
				if (oldState.currentMedia?.filename !== playerState.currentMedia?.filename) {
					diff[key] = playerState[key];
				}
				break;
			case 'quiz':
				if (
					oldState.quiz?.guessTime !== playerState.quiz?.guessTime ||
					oldState.quiz?.quickGuess !== playerState.quiz?.quickGuess ||
					oldState.quiz?.revealTime !== playerState.quiz?.revealTime
				) {
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

export function emitPlayerState() {
	setState({ player: quickDiff() });
	writeStreamFiles('player_status');
}

export function defineMPVEnv() {
	// On Linux we bundle some libs so we need to add our mpv's folder to LD_LIBRARY_PATH.
	const env = { ...process.env };
	if (process.platform === 'linux') {
		const state = getState();
		env.LD_LIBRARY_PATH = dirname(state.binPath.mpv);
	}
	return env;
}

export function switchToPollScreen() {
	playerState.mediaType = 'poll';
	emitPlayerState();
}

/* List mpv audio output devices */
export async function getMpvAudioOutputs(): Promise<string[][]> {
	try {
		const output = await execa(getState().binPath.mpv, ['--audio-device=help'], { env: defineMPVEnv() });
		const audioRegex = /'([^\n]+)' \(([^\n]+)\)/g;
		const results = [];
		let arr: any;
		while ((arr = audioRegex.exec(output.stdout)) !== null) {
			results.push([arr[1], arr[2]]);
		}
		return results;
	} catch (err) {
		logger.error('Unable to get sound devices from mpv', { service, obj: err });
		return [[]];
	}
}

async function checkMpv() {
	const state = getState();
	// On all platforms, check if we're using at least the required mpv version or abort saying the mpv provided is too old.
	// Assume UNKNOWN is a compiled version, and thus the most recent one.
	let mpvVersion: string;
	try {
		const output = await execa(state.binPath.mpv, ['--version'], { env: defineMPVEnv() });
		logger.debug(`mpv stdout: ${output.stdout}`, { service });
		const mpv = semver.valid(mpvRegex.exec(output.stdout)[1]);
		mpvVersion = mpv.split('-')[0];

		const ffmpegVersion = FFmpegRegex.exec(output.stdout)[1];
		setState({ player: { ...getState().player, version: mpvVersion, ffmpegVersion } });
		playerState.version = mpvVersion;
		playerState.ffmpegVersion = ffmpegVersion;
		logger.debug(`mpv version: ${mpvVersion}`, { service });
		logger.debug(`ffmpeg version in mpv: ${ffmpegVersion}`, { service });
	} catch (err) {
		logger.warn('Unable to determine mpv version. Will assume this is a recent one', {
			service,
			obj: err,
		});
		return;
	}
	if (mpvVersion !== 'UNKNOWN' && !semver.satisfies(mpvVersion, requiredMPVVersion)) {
		logger.error(
			`mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version ${requiredMPVVersion}`,
			{ service }
		);
		logger.error(`mpv binary: ${state.binPath.mpv}`, { service });
		logger.error('Not starting due to obsolete mpv version', { service });
		throw new Error('Obsolete mpv version');
	}
}

/* is the scale ffmpeg lavfi-complex option available? */
function isScaleAvailable(): boolean {
	// Either it's a semver or a N-xxxxx-xxxx version number
	if (playerState.ffmpegVersion.startsWith('N')) {
		return parseInt(playerState.ffmpegVersion.split('-')[1]) >= requiredMPVFFmpegMasterVersion;
	} else {
		return semver.satisfies(semver.coerce(playerState.ffmpegVersion), requiredMPVFFmpegVersion);
	}
}

export class Players {
	players: {
		main: Player;
		monitor?: Player;
	};

	messages: MessageManager;

	comments: CommentHandler;

	/** Define lavfi-complex commands when we need to display stuff on screen or adjust audio volume. And it's... complex. */
	private static async genLavfiComplex(song: CurrentSong, showVideo = true): Promise<string> {
		const isMP3 = supportedFiles.audio.some(extension => song.mediafile.endsWith(extension));
		// Loudnorm normalization scheme: https://ffmpeg.org/ffmpeg-filters.html#loudnorm
		let audio: string;
		if (song.loudnorm) {
			const [input_i, input_tp, input_lra, input_thresh, target_offset] = song.loudnorm.split(',');
			audio = `[aid1]loudnorm=measured_i=${input_i}:measured_tp=${input_tp}:measured_lra=${input_lra}:measured_thresh=${input_thresh}:linear=true:offset=${target_offset}:lra=15:i=-15[ao]`;
		} else {
			audio = '';
		}

		// Avatar
		const shouldDisplayAvatar =
			// Does not work on macOS at the moment (November 2024) due to mpv versions not including a good ffmpeg.
			process.platform !== 'darwin' &&
			showVideo &&
			song.avatar &&
			getConfig().Player.Display.SongInfo &&
			getConfig().Player.Display.Avatar &&
			!(playerState.ffmpegVersion.includes('.') && semver.satisfies(playerState.ffmpegVersion, '7.0.x'));
		const cropRatio = shouldDisplayAvatar ? Math.floor((await getAvatarResolution(song.avatar)) * 0.5) : 0;

		let avatar = `[vid${playerState.currentVideoTrack}]null[vo]`;

		if (shouldDisplayAvatar) {
			// Checking if ffmpeg's version in mpv is either a semver or a version revision and if it's better or not than the required versions we have.
			// This is a fix for people using mpvs with ffmpeg < 7.1 or a certain commit version.
			const scaleAvailable = isScaleAvailable();

			// Again, lavfi-complex expert @nah comes to the rescue!
			avatar = [
				`movie=\\'${song.avatar.replaceAll(
					'\\',
					'/'
				)}\\',format=yuva420p,geq=lum='p(X,Y)':a='if(gt(abs(W/2-X),W/2-${cropRatio})*gt(abs(H/2-Y),H/2-${cropRatio}),if(lte(hypot(${cropRatio}-(W/2-abs(W/2-X)),${cropRatio}-(H/2-abs(H/2-Y))),${cropRatio}),255,0),255)'[logo]`,
				scaleAvailable ? `[vid${playerState.currentVideoTrack}]split[v_in1][base]` : '',
				isMP3 ? `nullsrc=size=1x1:duration=${song.duration}[emp]` : undefined,
				isMP3 ? '[base][emp]overlay[ovrl]' : undefined,
				scaleAvailable
					? '[logo][v_in1]scale=w=(rh*.128):h=(rh*.128)[logo1]'
					: `[logo][vid${playerState.currentVideoTrack}]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]`,
				`[${isMP3 ? 'ovrl' : 'base'}][logo1]overlay=x='if(between(t,0,8)+between(t,${song.duration - 8},${
					song.duration
				}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`,
			]
				.filter(x => !!x)
				.join(';');
		}
		return [audio, avatar].filter(x => !!x).join(';');
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
						logger.info(`Restarting ${onlyOn} player`, { service });
						loads.push(this.players[onlyOn].recreate(null, true));
					}
				} else {
					// Fail silently on non-existing player (monitor disabled)
					return -1;
				}
			} else if (this.players) {
				for (const player in this.players) {
					if (!this.players[player].isRunning) {
						logger.info(`Restarting ${player} player`, { service });
						loads.push(this.players[player as PlayerType].recreate(null, true));
					}
				}
			} else {
				loads.push(this.initPlayerSystem());
			}
			await Promise.all(loads);
			if (loads.length > 0) return 1;
			return 0;
		} catch (err) {
			sentry.error(err);
			throw err;
		}
	}

	async getmpvLog(type: PlayerType) {
		try {
			const logData = await fs.readFile(resolve(resolvedPath('Logs'), this.players[type].logFile), 'utf-8');
			return logData.split('\n').slice(-100);
		} catch (err) {
			logger.error('Unable to get mpv log', { service, obj: err });
			// Do not throw, we're already throwing up anyway
		}
	}

	async exec(cmd: string | MpvCommand, args: any[] = [], onlyOn?: PlayerType, ignoreLock = false, shutdown = false) {
		try {
			const mpv = typeof cmd === 'object';
			if (await this.abortExec(mpv, onlyOn, ignoreLock, shutdown)) return;
			if (!(typeof cmd !== 'string' && cmd?.command[1] === 'osd-overlay')) {
				logger.debug(`${mpv ? 'mpv ' : ''}command: ${JSON.stringify(cmd)}, ${JSON.stringify(args)}`, {
					service,
				});
				logger.debug(`Running it for players ${JSON.stringify(onlyOn || Object.keys(this.players))}`, {
					service,
				});
			}
			const loads = [];
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
			await this.notifyAndThrow(err);
		}
	}

	private async playOnPlayers(mediaFile: string, options: Record<string, any>) {
		try {
			if (await this.abortExec(true)) return;
			const loads = [];
			for (const player in this.players) {
				loads.push(this.players[player].play(mediaFile, options));
			}
			await Promise.all(loads);
		} catch (err) {
			await this.notifyAndThrow(err);
		}
	}

	private async abortExec(mpv: boolean, onlyOn?: PlayerType, ignoreLock = false, shutdown = false) {
		// ensureRunning returns -1 if the player does not exist (eg. disabled monitor)
		// ensureRunning isn't needed on non-mpv commands
		return (!shutdown && isShutdownInProgress()) || (mpv && (await this.ensureRunning(onlyOn, ignoreLock)) === -1);
	}

	private async notifyAndThrow(err: any) {
		logger.error('mpvAPI (send)', { service, obj: err });
		sentry.addErrorInfo('mpvLog', (await this.getmpvLog('main'))?.join('\n'));
		if (this.players.monitor) sentry.addErrorInfo('mpvLog', (await this.getmpvLog('monitor'))?.join('\n'));
		throw new Error(JSON.stringify(err));
	}

	private startBackgroundMusic(tries = 0): void {
		if (playerState.mediaType === 'pause' || playerState.mediaType === 'poll' || tries < 40) {
			// mpv does return loadfile commands when in reality the file is not yet fully loaded
			// so this function is called when the audio file or the background hasn't fully loaded
			// we workaround this by waiting the eof-reached property to be false again
			if (playerState['eof-reached'] === false) {
				this.exec({ command: ['set_property', 'pause', false] }).catch(() => {});
			} else {
				setTimeout(() => {
					this.startBackgroundMusic(tries + 1);
				}, 50);
			}
		}
	}

	progressBarTimeout: NodeJS.Timeout;

	/** Progress bar on pause screens inbetween songs */
	private tickProgressBar(nextTick: number, ticked: number, position: string) {
		// 10 ticks
		if (ticked <= 10 && ((getState().streamerPause && getState().pauseInProgress) || getState().quiz.running)) {
			if (this.progressBarTimeout) clearTimeout(this.progressBarTimeout);
			let progressBar = '';
			for (const _nothing of Array(ticked)) {
				progressBar += '■';
			}
			for (const _nothing of Array(10 - ticked)) {
				progressBar += '□';
			}
			this.messages.addMessage('pauseScreen', `${position}{\\fscx70\\fscy70\\fsp-3}${progressBar}`, 'infinite');
			this.progressBarTimeout = setTimeout(() => {
				this.tickProgressBar(nextTick, ticked + 1, position);
			}, nextTick);
		}
	}

	countdownTimer: Timer;

	/** Countdown */
	private tickCountdown(position: string) {
		if ((getState().streamerPause && getState().pauseInProgress) || getState().quiz.running) {
			if (this.progressBarTimeout) clearTimeout(this.progressBarTimeout);
			const timeLeft = Math.ceil(this.countdownTimer.getTimeLeft() / 1000);
			this.messages.addMessage('countdown', `${position}{\\fscx250\\fscy250}${timeLeft}`, 'infinite');
			this.progressBarTimeout = setTimeout(() => {
				this.tickCountdown(position);
			}, 1000);
		}
		if (this.countdownTimer.getTimeLeft() === 0) {
			clearTimeout(this.progressBarTimeout);
			this.countdownTimer = null;
			this.messages.clearMessages();
		}
	}

	private progressBar(duration: number, position: string, type: ProgressType = 'bar') {
		// * 1000 / 10
		if (type === 'bar') {
			this.tickProgressBar(Math.round(duration * 100), 1, position);
		} else if (type === 'countdown') {
			this.countdownTimer = new Timer(duration * 1000);
			this.tickCountdown(position);
		}
	}

	private genLavfiComplexQRCode(): string {
		// Disable this for mpvs with ffmpeg version 7.0
		// Also disable for macOS as of November 2024 no mpv version seems to work with this.
		if (
			process.platform === 'darwin' ||
			(playerState.ffmpegVersion.includes('.') && semver.satisfies(playerState.ffmpegVersion, '7.0.x'))
		)
			return '';
		const scaleAvailable = isScaleAvailable();
		return [
			`movie=\\'${resolve(resolvedPath('Temp'), 'qrcode.png').replaceAll('\\', '/')}\\'[logo]`,
			scaleAvailable ? `[vid${playerState.currentVideoTrack}]split[v_in1][base]` : '',
			scaleAvailable
				? '[logo][v_in1]scale=w=(rh*.256):h=(rh*.256)[logo1]'
				: `[logo][vid${playerState.currentVideoTrack}]scale2ref=w=(ih*.256):h=(ih*.256)[logo1][base]`,
			'[base][logo1]overlay=x=W-(W*50/300):y=H*20/300[vo]',
		]
			.filter(x => !!x)
			.join(';');
	}

	async displayQRCode() {
		await this.exec({ command: ['set_property', 'lavfi-complex', this.genLavfiComplexQRCode()] });
	}

	async hideQRCode() {
		if (playerState.playerStatus !== 'play') {
			await this.exec({
				command: ['set_property', 'lavfi-complex', `[vid${playerState.currentVideoTrack}]null[vo]`],
			});
		}
	}

	private async loadBackground(type: BackgroundType) {
		const background = await getBackgroundAndMusic(type);
		logger.debug(
			`Background selected : ${background.pictures[0]}${background.music[0] ? ` (${background.music[0]})` : ''}`,
			{ service }
		);
		try {
			playerState.mediaType = type;
			playerState.playerStatus = 'stop';
			playerState.currentSong = null;
			playerState.currentMedia = null;
			playerState._playing = false;
			playerState.playing = false;
			playerState.currentVideoTrack = 1;
			emitPlayerState();
			const conf = getConfig();
			const options = ['loadfile', background.pictures[0]];
			const qrCode =
				conf.Player.Display.ConnectionInfo.Enabled && conf.Player.Display.ConnectionInfo.QRCode
					? {
							'lavfi-complex': this.genLavfiComplexQRCode(),
						}
					: {};
			if (background.music[0]) {
				await this.exec({
					command: [
						...options,
						'replace',
						'0',
						{
							'force-media-title': 'Background',
							'audio-files-set': background.music[0],
							aid: '1',
							'loop-file': 'inf',
							...qrCode,
						},
					],
				});
			} else {
				await this.exec({
					command: [
						...options,
						'replace',
						'0',
						{
							'force-media-title': 'Background',
							'loop-file': 'inf',
							...qrCode,
						},
					],
				});
			}

			setState({
				backgrounds: {
					music: background.music[0],
					picture: background.pictures[0],
				},
			});
		} catch (err) {
			logger.error('Unable to load background', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	@needsLock()
	private async bootstrapPlayers() {
		await checkMpv();
		this.messages = new MessageManager(this.tickDisplay.bind(this));
		this.comments = new CommentHandler(this.tickCommentDisplay.bind(this));
		this.players = {
			main: new Player({ monitor: false }, this),
		};
		if (playerState.monitorEnabled) this.players.monitor = new Player({ monitor: true }, this);
		logger.debug(`Players: ${JSON.stringify(Object.keys(this.players))}`, { service });
		await this.exec('start');
	}

	async initPlayerSystem() {
		const conf = getConfig();
		playerState.fullscreen = conf.Player.FullScreen;
		playerState.onTop = conf.Player.StayOnTop;
		playerState.border = conf.Player.Borders;
		playerState.volume = conf.Player.Volume;
		playerState.monitorEnabled = conf.Player.Monitor;
		const audioDevices = await getMpvAudioOutputs();
		const audioDevicesList = audioDevices.map(ad => ad[0]);
		if (!audioDevicesList.includes(getConfig().Player.AudioDevice)) {
			setConfig({ Player: { AudioDevice: 'auto' } });
		}
		emitPlayerState();
		try {
			await this.bootstrapPlayers();
			await this.loadBackground('stop');
			this.displayInfo();
		} catch (err) {
			errorStep(i18n.t('ERROR_START_PLAYER'));
			logger.error('Unable to start player', { service, obj: err });
			sentry.error(err, 'fatal');
			throw err;
		}
	}

	@needsLock()
	async quit() {
		if (this.players.main.isRunning || this.players.monitor?.isRunning) {
			// needed to wait for lock release

			return this.exec('destroy', undefined, undefined, true, true).catch(err => {
				// Non fatal. Idiots sometimes close mpv instead of KM, this avoids an uncaught exception.
				logger.warn('Failed to quit mpv', { service, obj: err });
			});
		}
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
				this.players.monitor = new Player({ monitor: true }, this);
			} else {
				// Monitor needs to be destroyed
				await this.exec('destroy', [null], 'monitor', true, true).catch(() => {
					// Non-fatal, it probably means it's destroyed.
				});
				delete this.players.monitor;
			}
		}
		await this.exec('recreate', [null, true], undefined, true).catch(err => {
			logger.error('Cannot restart mpv', { service, obj: err });
		});
		if (
			playerState.playerStatus === 'stop' ||
			playerState.mediaType === 'stop' ||
			playerState.mediaType === 'pause' ||
			playerState.mediaType === 'poll'
		) {
			setImmediate(this.loadBackground.bind(this));
		}
	}

	async play(song: CurrentSong, modifiers?: SongModifiers, start = 0): Promise<PlayerState> {
		logger.debug('Play event triggered', { service });
		await this.ensureRunning();
		playerState.playing = true;
		if (getConfig().Player.AudioOnlyExperience) {
			// In case of audio-only experience we switch video track to 2 (still image)
			playerState.currentVideoTrack = 2;
		}
		profile('mpvPlay');
		let mediaFile: string;
		let subFile: string;
		const options: Record<string, any> = {
			'force-media-title': getState().quiz.running
				? 'Quiz!'
				: getSongTitle(song, getConfig().Player.Display.SongInfoLanguage),
		};
		let onlineMedia = false;
		const showVideo = !modifiers || (modifiers && modifiers.Blind === '');
		playerState.modifiers = modifiers;
		const loadPromises = [
			Players.genLavfiComplex(song, showVideo)
				.then(res => (options['lavfi-complex'] = res))
				.catch(err => {
					logger.error('Cannot compute lavfi-complex filter, disabling avatar display', {
						service,
						obj: err,
					});
					// At least, loudnorm
					options['lavfi-complex'] = '[aid1]loudnorm[ao]';
				}),
			resolveFileInDirs(song.lyrics_infos[0]?.filename, resolvedPathRepos('Lyrics', song.repository))
				.then(res => (subFile = res[0]))
				.catch(err => {
					if (song.lyrics_infos[0]?.filename) {
						// No need to log if there's no subfile to begin with, not an error.
						logger.debug('Error while resolving subs path', { service, obj: err });
						logger.warn(`Subs NOT FOUND : ${song.lyrics_infos[0].filename}`, { service });
					}
					subFile = '';
				}),
			resolveFileInDirs(song.mediafile, resolvedPathRepos('Medias', song.repository))
				.then(res => (mediaFile = res[0]))
				.catch(async err => {
					logger.debug('Error while resolving media path', { service, obj: err });
					logger.warn(`Media NOT FOUND : ${song.mediafile}`, { service });
					await resolveMediaURL(song.mediafile, song.repository)
						.then(res => {
							onlineMedia = true;
							mediaFile = res;
						})
						.catch(error => {
							mediaFile = '';
							emitWS(
								'operatorNotificationError',
								APIMessage('NOTIFICATION.OPERATOR.ERROR.PLAYER_NO_ONLINE_MEDIA')
							);
							throw new Error(
								`No media source for ${song.mediafile} (tried in ${resolvedPathRepos(
									'Medias',
									song.repository
								).toString()} and HTTP source): ${error}`
							);
						});
				}),
		];
		await Promise.all(loadPromises);
		logger.debug(`Loading media: ${mediaFile}${subFile ? ` with ${subFile}` : ''}`, { service });
		const config = getConfig();
		if (subFile) {
			options['sub-file'] = subFile;
			options.sid = '1';
		} else {
			options['sub-file'] = '';
			options.sid = 'no';
		}
		let id3tags: Tags;
		if (mediaFile.endsWith('.mp3') && !onlineMedia) {
			id3tags = await id3.read(mediaFile);
		}

		// We load default background for audio-only experience(tm) so it's always switchable at run-time.
		const defaultImageFile = (await getBackgroundAndMusic('pause')).pictures[0];
		options['external-file'] = defaultImageFile.replaceAll('\\', '/');

		if (id3tags && !id3tags.image) {
			options['force-window'] = 'yes';
			options['image-display-duration'] = 'inf';
			options.vid = '1';
			// Redefine the lavfi-complex filter because we're currently running on video track 2 if audio-only experience is enabled
			if (getConfig().Player.AudioOnlyExperience) {
				playerState.currentVideoTrack = 1;
				options['lavfi-complex'] = await Players.genLavfiComplex(song, showVideo);
			}
		}
		options.start = start.toString();
		if (config.Player.BlurVideoOnWarningTag === true || playerState.blurVideo === true) {
			// Set blur if enabled in settings and kara has warning
			// Or reset if blur currently enabled and new kara plays
			await this.setBlur(config.Player.BlurVideoOnWarningTag && song.warnings.length > 0);
		}
		// Load all those files into mpv and let's go!
		try {
			playerState.currentSong = song;
			playerState.mediaType = 'song';
			playerState.currentMedia = null;
			if (this.messages) {
				this.messages.removeMessages(['poll', 'pauseScreen', 'quizRules']);
				if (!getState().quiz.running) this.displaySongInfo(song.infos, -1, false, song.warnings);
			}
			await retry(() => this.playOnPlayers(mediaFile, options), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(
						`Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`,
						{ service }
					);
				},
			}).catch(err => {
				logger.error('Unable to load media', { service, obj: err });
				throw err;
			});
			logger.debug(`File ${mediaFile} loaded`, { service });
			// Loaded!
			playerState.songNearEnd = false;
			playerState.nextSongNotifSent = false;
			playerState.playing = true;
			playerState._playing = true;
			playerState.currentMedia = null;
			playerState.playerStatus = 'play';
			if (modifiers) this.setModifiers(modifiers);
			emitPlayerState();
			const lang = getConfig().Player.Display.SongInfoLanguage;
			setDiscordActivity('song', {
				title: getSongTitle(song, lang),
				source: getSongSeriesSingers(song, lang) || i18n.t('UNKNOWN_ARTIST'),
			});
			if (getState().quiz.running) {
				this.progressBar(getState().quiz.settings.TimeSettings.GuessingTime, '{\\an5}', 'countdown');
			}
			return playerState;
		} catch (err) {
			logger.error('Unable to load', { service, obj: err });
			sentry.addErrorInfo('mediaData', JSON.stringify(song, null, 2));
			sentry.error(err);
			throw err;
		} finally {
			profile('mpvPlay');
		}
	}

	private async findSubfile(mediaFile: string): Promise<string> {
		for (const ext of supportedFiles.mpvlyrics) {
			const subfile = replaceExt(mediaFile, `.${ext}`);
			if (await fileExists(subfile)) return subfile;
		}
		return null;
	}

	/* Function playing playlist medias (jingles, intros, etc.) */
	async playMedia(mediaType: PlaylistMediaType): Promise<PlayerState> {
		const conf = getConfig();
		const media = getSingleMedia(mediaType);
		if (media) {
			logger.debug(`Playing ${mediaType}: ${media.filename}`, { service });
			const options: any = {
				'force-media-title': mediaType,
				af: 'loudnorm',
			};
			const subFile = await this.findSubfile(media.filename);
			logger.debug(`Searching for ${subFile}`, { service });
			if (subFile) {
				options['sub-file'] = subFile;
				options.sid = '1';
				logger.debug(`Loading ${subFile}`, { service });
			} else {
				logger.debug('No subtitles to load (not found for media)', { service });
			}
			try {
				playerState.currentSong = null;
				playerState.mediaType = mediaType;
				playerState.currentMedia = media;
				playerState.currentVideoTrack = 1;
				await retry(() => this.exec({ command: ['loadfile', media.filename, 'replace', '0', options] }), {
					retries: 3,
					onFailedAttempt: error => {
						logger.warn(
							`Failed to play ${mediaType}, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`,
							{ service }
						);
					},
				});
				playerState.playerStatus = 'play';
				playerState._playing = true;
				mediaType === 'Jingles' || mediaType === 'Sponsors'
					? this.displayInfo()
					: conf.Playlist.Medias[mediaType].Message
						? this.message(conf.Playlist.Medias[mediaType].Message, -1, 5, 'DI')
						: this.messages.removeMessage('DI');
				this.messages.removeMessages(['poll', 'pauseScreen']);
				emitPlayerState();
				return playerState;
			} catch (err) {
				logger.error(`Error loading media ${mediaType}: ${media.filename}`, { service, obj: err });
				sentry.error(err);
				throw err;
			}
		} else {
			logger.debug(`No ${mediaType} to play.`, { service });
			playerState.playerStatus = 'play';
			await this.loadBackground('stop');
			logger.debug('No jingle DI', { service });
			await this.displayInfo();
			playerState._playing = true;
			emitPlayerState();
			playerEnding();
			return playerState;
		}
	}

	async stop(type: BackgroundType): Promise<PlayerState> {
		// on stop do not trigger onEnd event
		// => setting internal playing = false prevent this behavior
		logger.debug('Stop event triggered', { service });
		playerState.playing = false;
		playerState.timeposition = 0;
		playerState.quiz = { guessTime: 0, quickGuess: 0, revealTime: 0 };
		playerState._playing = false;
		// This will be set to false by mpv, meanwhile the eof-reached event is simulated to trigger correctly other
		// parts of the code
		playerState['eof-reached'] = true;
		playerState.playerStatus = 'stop';
		await this.loadBackground(type);
		this.messages.clearMessages();
		logger.debug('Stop DI', { service });
		await this.displayInfo();
		emitPlayerState();
		setDiscordActivity('idle');
		return playerState;
	}

	async pause(): Promise<PlayerState> {
		logger.debug('Pause event triggered', { service });
		try {
			playerState._playing = false; // This prevents the play/pause event to be triggered
			await this.exec({ command: ['set_property', 'pause', true] });
			if (getState().quiz.running) {
				const game = getState().quiz;
				if (game.running && game.currentSong) {
					[
						game.currentSong.quickGuessTimer,
						game.currentSong.guessTimer,
						game.currentSong.revealTimer,
					].forEach(timer => timer.pause());
				}
				if (this.countdownTimer) {
					this.countdownTimer.pause();
				}
			}
			playerState.playing = false;
			playerState.playerStatus = 'pause';
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to pause', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async resume(): Promise<PlayerState> {
		logger.debug('Resume event triggered', { service });
		try {
			// If one of the players is down, we need to reload the media
			let restartNeeded: boolean;
			for (const player in this.players) {
				if (!this.players[player].isRunning) restartNeeded = true;
			}
			if (restartNeeded) {
				return await this.play(playerState.currentSong);
			}
			playerState._playing = true; // This prevents the play/pause event to be triggered
			await this.exec({ command: ['set_property', 'pause', false] });
			if (getState().quiz.running) {
				const game = getState().quiz;
				if (game.running && game.currentSong) {
					[
						game.currentSong.quickGuessTimer,
						game.currentSong.guessTimer,
						game.currentSong.revealTimer,
					].forEach(timer => {
						// If the timer was ever started
						if (timer.started) timer.start();
					});
				}
			}
			if (this.countdownTimer?.started) {
				this.countdownTimer.start();
			}
			playerState.playing = true;
			playerState.playerStatus = 'play';
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to resume', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async seek(delta: number) {
		try {
			// Skip the song if we try to seek after the end of the song
			if (
				playerState.mediaType === 'song' &&
				playerState.timeposition + delta > playerState.currentSong.duration
			) {
				return await next();
			}
			await this.exec({ command: ['seek', delta] });
		} catch (err) {
			logger.error('Unable to seek', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async goTo(pos: number) {
		try {
			// Skip the song if we try to go after the end of the song
			if (playerState.mediaType === 'song' && pos > playerState.currentSong.duration) {
				return await next();
			}
			await this.exec({ command: ['seek', pos, 'absolute'] });
		} catch (err) {
			logger.error('Unable to go to position', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setMute(mute: boolean): Promise<PlayerState> {
		try {
			await this.exec({ command: ['set_property', 'mute', mute] });
			// Mute property is observed, so we don't have to handle playerState
			return playerState;
		} catch (err) {
			logger.error('Unable to toggle mute', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setAudioDevice(device: string) {
		try {
			await this.exec({ command: ['set_property', 'audio-device', device] });
		} catch (err) {
			logger.error('Unable to set volume', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setBlurPercentage(blurPercentage: number) {
		try {
			await this.exec({
				command: ['set_property', 'vf', blurPercentage > 0 ? `gblur=sigma=${blurPercentage}:steps=3` : ''],
			});
			playerState.blurVideo = blurPercentage > 0;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to set blur', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setBlur(enabled: boolean) {
		this.setBlurPercentage(enabled ? 90 : 0);
		if (!playerState.modifiers) playerState.modifiers = { Blind: 'blur' };
		emitPlayerState();
	}

	async setBlind(blind: boolean) {
		try {
			await this.exec({ command: ['set_property', 'vf', blind ? 'geq=0:128:128' : ''] });
			if (blind) {
				playerState.blurVideo = false;
				if (!playerState.modifiers) playerState.modifiers = { Blind: 'black' };
				emitPlayerState();
			}
		} catch (err) {
			logger.error('Unable to toggle blind', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setVolume(volume: number): Promise<PlayerState> {
		try {
			await this.exec({ command: ['set_property', 'volume', volume] });
			// Volume property is observed, so we don't have to handle playerState
			return playerState;
		} catch (err) {
			logger.error('Unable to set volume', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setAudioDelay(delayMs = 0) {
		try {
			await this.exec({ command: ['set_property', 'audio-delay', (delayMs && delayMs / 1000) || 0] });
		} catch (err) {
			logger.error('Unable to set audio delay', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setModifiers(options: SongModifiers) {
		try {
			logger.info(
				`Setting modifiers: Mute ${options.Mute} - NoLyrics ${options.NoLyrics} - Blind type: ${options.Blind}`,
				{ service }
			);

			if (typeof options.Mute === 'boolean') this.setMute(options.Mute);
			if (typeof options.NoLyrics === 'boolean') this.setSubs(!options.NoLyrics);

			if (options.Blind === 'black') this.setBlind(true);
			else if (options.Blind === 'blur') this.setBlur(true);
			else {
				this.setBlind(false);
				this.setBlur(false);
			}

			if (typeof options.Speed === 'number' && typeof options.Pitch === 'number') {
				throw new Error("Pitch and speed can't currently be set at the same time");
			}
			if (typeof options.Pitch === 'number') {
				const paramSpeed = 1.0 + options.Pitch / 16.0;
				await this.exec({ command: ['set_property', 'audio-pitch-correction', 'no'] });
				await this.exec({ command: ['set_property', 'af', `scaletempo:scale=1/${paramSpeed}`] });
				await this.exec({ command: ['set_property', 'speed', paramSpeed] });
				options.Speed = 100; // Reset speed
			} else if (typeof options.Speed === 'number') {
				await this.exec({ command: ['set_property', 'audio-pitch-correction', 'yes'] });
				await this.exec({ command: ['set_property', 'speed', options.Speed / 100] });
				options.Pitch = 0; // Reset pitch
			}
			if (typeof options.Pitch === 'number' || typeof options.Speed === 'number') {
				playerState.pitch = options.Pitch || playerState.pitch;
				playerState.speed = options.Speed || playerState.speed;
				logger.info(`Set audio modifiers to: pitch ${playerState.pitch}, speed ${playerState.speed}`, {
					service,
				});
			}
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to set modifiers', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setSubs(showSubs: boolean): Promise<PlayerState> {
		try {
			await this.exec({ command: ['set_property', 'sub-visibility', showSubs] });
			playerState.showSubs = showSubs;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error(`Unable to ${showSubs ? 'show' : 'hide'} subs: ${JSON.stringify(err)}`, { service });
			sentry.error(err);
			throw err;
		}
	}

	async toggleFullscreen(): Promise<void> {
		try {
			await this.exec({ command: ['set_property', 'fullscreen', !playerState.fullscreen] });
		} catch (err) {
			logger.error('Unable to toggle fullscreen', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async toggleAudioOnlyExperience() {
		try {
			if (playerState.currentVideoTrack === 1) {
				playerState.currentVideoTrack = 2;
			} else {
				playerState.currentVideoTrack = 1;
			}
			/* This code is disabled for now: this is not working properly. See #1708 for more details.
			if (playerState.currentSong) {
				const showVideo =
					!playerState.modifiers || (playerState.modifiers && playerState.modifiers.Blind === '');
				const lavfiComplex = await Players.genLavfiComplex(playerState.currentSong, showVideo);
				await this.exec({ command: ['set_property', 'lavfi-complex', lavfiComplex] });
				emitPlayerState();
			}
			*/
		} catch (err) {
			logger.error('Unable to toggle audio only experience', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async toggleBorders(): Promise<boolean> {
		try {
			await this.exec({ command: ['set_property', 'border', !playerState.border] });
			playerState.border = !playerState.border;
			emitPlayerState();
			return playerState.border;
		} catch (err) {
			logger.error('Unable to toggle ontop', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async toggleOnTop(): Promise<boolean> {
		try {
			await this.exec({ command: ['set_property', 'ontop', !playerState.onTop] });
			playerState.onTop = !playerState.onTop;
			emitPlayerState();
			return playerState.onTop;
		} catch (err) {
			logger.error('Unable to toggle ontop', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setHwDec(method: string) {
		await this.exec({ command: ['set_property', 'hwdec', method] }).catch(err => {
			logger.error('Unable to set hwdec method', { service, obj: err });
			sentry.error(err);
			throw err;
		});
		return playerState;
	}

	tickDisplay() {
		this.exec({
			command: ['expand-properties', 'osd-overlay', 1, 'ass-events', this.messages?.getText() || ''],
		}).catch(err => {
			// Non-fatal. Maybe. Don't sue me.
			logger.warn('Unable to tick display', { service, obj: err });
		});
	}

	tickCommentDisplay() {
		this.exec({ command: ['expand-properties', 'osd-overlay', 2, 'ass-events', this.comments?.getText() || ''] });
	}

	async message(message: string, duration = -1, alignCode = 5, forceType = 'admin') {
		try {
			const alignCommand = `{\\an${alignCode}}`;
			this.messages.addMessage(forceType, alignCommand + message, duration === -1 ? 'infinite' : duration);
			if (duration !== -1 && playerState.playing === false && !getState().songPoll) {
				await sleep(duration);
				this.displayInfo();
			}
		} catch (err) {
			logger.error('Unable to display message', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	getMessagePosition(): number {
		// Returns a number from 1 to 9 depending on the position on screen. 1 is bottom left, 9 is top right.
		let pos = 9;
		// No song playing
		if (!playerState.currentSong) return 1;
		// Song playing
		const manifest = getRepoManifest(playerState.currentSong.repository);
		const X =
			playerState.currentSong.lyrics_infos[0]?.announce_position_x ??
			manifest?.rules?.lyrics?.defaultAnnouncePositionX ??
			'Left';
		const Y =
			playerState.currentSong.lyrics_infos[0]?.announce_position_y ??
			manifest?.rules?.lyrics?.defaultAnnouncePositionY ??
			'Bottom';

		// We lower pos if X pos isn't right or Y pos isn't top since 9 is top right already.
		if (X === 'Center') pos -= 1;
		if (X === 'Left') pos -= 2;
		if (Y === 'Center') pos -= 3;
		if (Y === 'Bottom') pos -= 6;
		return pos;
	}

	async displaySongInfo(infos: string, duration = -1, nextSong = false, warnings?: DBKaraTag[], visible = true) {
		try {
			const nextSongString = nextSong ? `${i18n.t('NEXT_SONG')}\\N\\N` : '';
			const position = nextSong ? '{\\an5}' : `{\\an${this.getMessagePosition()}}`;
			let warningString = '';
			if (warnings?.length > 0) {
				const langs = [
					getConfig().Player.Display.SongInfoLanguage,
					convert1LangTo2B(getState().defaultLocale),
					'eng',
				];
				const warningArr = warnings.map(t => {
					return getTagNameInLanguage(t, langs);
				});
				warningString = `{\\fscx80}{\\fscy80}{\\b1}{\\c&H0808E8&}⚠ WARNING: ${warningArr.join(
					', '
				)} ⚠{\\b0}\\N{\\c&HFFFFFF&}`;
			}
			if (getConfig().Player.Display.SongInfo && visible) {
				this.messages.addMessage(
					'DI',
					position + warningString + nextSongString + infos,
					duration === -1 ? 'infinite' : duration
				);
			} else {
				this.messages.removeMessage('DI'); // not sure if this is needed
			}
			if (nextSong) {
				playerState.mediaType = 'pause';
				try {
					this.startBackgroundMusic();
				} catch (err) {
					logger.warn('Unable to start background music during a pause', { service, obj: err });
					// Non fatal.
				}
				emitPlayerState();
				if (
					getState().streamerPause &&
					getState().pauseInProgress &&
					getConfig().Karaoke.StreamerMode.PauseDuration > 0
				) {
					this.progressBar(getConfig().Karaoke.StreamerMode.PauseDuration, position);
				}
			}
		} catch (err) {
			logger.error('Unable to display song info', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async displayInfo(duration = -1) {
		try {
			const conf = getConfig();
			const state = getState();
			const text = getPromoMessage();
			const catchphrase =
				playerState.mediaType !== 'song' && conf.Player.Display.RandomQuotes
					? sample(initializationCatchphrases)
					: '';
			const version = `Karaoke Mugen ${state.version.number} (${state.version.name}) - https://karaokes.moe`;
			const message = `{\\an${this.getMessagePosition()}}{\\fscx80}{\\fscy80}${text}\\N{\\fscx60}{\\fscy60}{\\i1}${version}{\\i0}\\N{\\fscx40}{\\fscy40}${catchphrase}`;
			this.messages?.addMessage('DI', message, duration === -1 ? 'infinite' : duration);
		} catch (err) {
			logger.error('Unable to display infos', { service, obj: err });
			sentry.error(err);
			throw err;
		}
	}

	displayAddASong() {
		if (getState().randomPlaying) {
			try {
				this.message(i18n.t('ADD_A_SONG_TO_PLAYLIST_SCREEN_MESSAGE'), 1000, 5, 'addASong');
			} catch (err) {
				logger.warn('Unable to display Add A Song message', { service, obj: err });
				// Non fatal
			}
		}
	}

	intervalIDAddASong: NodeJS.Timeout;

	/** Initialize start displaying the "Add a song to the list" */
	initAddASongMessage() {
		if (!this.intervalIDAddASong) this.intervalIDAddASong = setInterval(this.displayAddASong.bind(this), 2000);
	}

	/** Stop displaying the Add a song to the list */
	stopAddASongMessage() {
		if (this.intervalIDAddASong) clearInterval(this.intervalIDAddASong);
		this.intervalIDAddASong = undefined;
	}
}

export default Players;
