import execa from 'execa';
import i18n from 'i18next';
import { debounce, sample } from 'lodash';
import { Promise as id3, Tags } from 'node-id3';
import retry from 'p-retry';
import { resolve } from 'path';
import randomstring from 'randomstring';
import semver from 'semver';
import { graphics } from 'systeminformation';
import { setTimeout as sleep } from 'timers/promises';
import logger from 'winston';

import { setProgressBar } from '../electron/electron';
import { errorStep } from '../electron/electronLogger';
import { getConfig, resolvedPath, resolvedPathRepos, setConfig } from '../lib/utils/config';
import { getAvatarResolution } from '../lib/utils/ffmpeg';
import { fileExists, replaceExt, resolveFileInDirs } from '../lib/utils/files';
import { playerEnding } from '../services/karaEngine';
import { next, prev } from '../services/player';
import { notificationNextSong } from '../services/playlist';
import { getSingleMedia } from '../services/playlistMedias';
import { endPoll } from '../services/poll';
import { MediaType } from '../types/medias';
import { MpvCommand } from '../types/mpvIPC';
import { MpvOptions, PlayerState } from '../types/player';
import { CurrentSong } from '../types/playlist';
import { initializationCatchphrases, mpvRegex, requiredMPVVersion } from '../utils/constants';
import { setDiscordActivity } from '../utils/discordRPC';
import MpvIPC from '../utils/mpvIPC';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { exit } from './engine';
import Timeout = NodeJS.Timeout;
import { DBKaraTag } from '../lib/types/database/kara';
import HTTP from '../lib/utils/http';
import { convert1LangTo2B } from '../lib/utils/langs';
import { profile } from '../lib/utils/logger';
import { getBackgroundAndMusic } from '../services/backgrounds';
import { getSongSeriesSingers, getSongTitle } from '../services/kara';
import { getTagNameInLanguage } from '../services/tag';
import { BackgroundType } from '../types/backgrounds';
import { editSetting } from '../utils/config';

type PlayerType = 'main' | 'monitor';

const playerState: PlayerState = {
	volume: 100,
	playing: false,
	playerStatus: 'stop',
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
};

async function resolveMediaURL(file: string, repo: string): Promise<string> {
	const conf = getConfig();
	let up = false;
	let mediaFile = `${conf.Online.MediasHost}/${encodeURIComponent(file)}`;
	// We test if the MediasHost allows us to reach a file. If not we try the song's repository.
	if (conf.Online.MediasHost) {
		if (await HTTP.head(mediaFile)) up = true;
	} else {
		mediaFile = `https://${repo}/downloads/medias/${encodeURIComponent(file)}`;
		if (await HTTP.head(mediaFile)) up = true;
	}
	if (up) {
		logger.info(`Playing media from external source : ${mediaFile}`, { service: 'Player' });
		return mediaFile;
	}
	// If all else fails, throw up
	throw up;
}

async function waitForLockRelease() {
	if (playerState.isOperating) logger.debug('Waiting for lock...', { service: 'Player' });
	while (playerState.isOperating) {
		await sleep(100);
	}
}

async function acquireLock() {
	await waitForLockRelease();
	logger.debug('Lock acquired', { service: 'Player' });
	playerState.isOperating = true;
	return true;
}

function releaseLock() {
	logger.debug('Lock released', { service: 'Player' });
	playerState.isOperating = false;
	return true;
}

function needsLock() {
	return (
		target: any,
		_propertyKey: string,
		descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>
	) => {
		const originFunc = descriptor.value;
		descriptor.value = async (...params) => {
			await acquireLock();
			return originFunc.call(target, ...params).then(releaseLock);
		};
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
	setState({ player: quickDiff() });
}

export function switchToPollScreen() {
	playerState.mediaType = 'poll';
	emitPlayerState();
}

/* List mpv audio output devices */
export async function getMpvAudioOutputs(): Promise<string[][]> {
	try {
		const output = await execa(getState().binPath.mpv, ['--audio-device=help']);
		const audioRegex = /'([^\n]+)' \(([^\n]+)\)/g;
		const results = [];
		let arr: any;
		while ((arr = audioRegex.exec(output.stdout)) !== null) {
			results.push([arr[1], arr[2]]);
		}
		return results;
	} catch (err) {
		logger.error('Unable to get sound devices from mpv', { service: 'Player', obj: err });
		return [[]];
	}
}

async function checkMpv() {
	const state = getState();
	// On all platforms, check if we're using at least the required mpv version or abort saying the mpv provided is too old.
	// Assume UNKNOWN is a compiled version, and thus the most recent one.
	let mpvVersion: string;
	try {
		const output = await execa(state.binPath.mpv, ['--version']);
		logger.debug(`mpv stdout: ${output.stdout}`, { service: 'Player' });
		const mpv = semver.valid(mpvRegex.exec(output.stdout)[1]);
		mpvVersion = mpv.split('-')[0];
		logger.debug(`mpv version: ${mpvVersion}`, { service: 'Player' });
	} catch (err) {
		logger.warn('Unable to determine mpv version. Will assume this is a recent one', {
			service: 'Player',
			obj: err,
		});
		return;
	}
	if (!semver.satisfies(mpvVersion, requiredMPVVersion)) {
		logger.error(
			`mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version ${requiredMPVVersion}`,
			{ service: 'Player' }
		);
		logger.error(`mpv binary: ${state.binPath.mpv}`, { service: 'Player' });
		logger.error('Exiting due to obsolete mpv version', { service: 'Player' });
		await exit(1);
	}
}

class Player {
	mpv: MpvIPC;

	configuration: any;

	options: MpvOptions;

	control: Players;

	constructor(options: MpvOptions, players: Players) {
		this.options = options;
		this.control = players;
	}

	async init() {
		// Generate the configuration
		this.configuration = await this.genConf(this.options);
		// Instantiate mpv
		this.mpv = new MpvIPC(this.configuration[0], this.configuration[1], this.configuration[2]);
	}

	private async genConf(options: MpvOptions) {
		const conf = getConfig();
		const state = getState();

		const mpvArgs = [
			'--keep-open=always',
			'--osd-level=0',
			`--log-file=${resolve(state.dataPath, 'logs/', 'mpv.log')}`,
			`--hwdec=${conf.Player.HardwareDecoding}`,
			`--volume=${+conf.Player.Volume}`,
			'--no-config',
			'--autoload-files=no',
			`--input-conf=${resolve(resolvedPath('Temp'), 'input.conf')}`,
			'--sub-visibility',
			'--sub-ass-vsfilter-aspect-compat=no',
			'--loop-file=no',
			`--title=${options.monitor ? '[MONITOR] ' : ''}\${force-media-title} - Karaoke Mugen Player`,
			'--force-media-title=Loading...',
			`--audio-device=${conf.Player.AudioDevice}`,
			`--screenshot-directory=${resolve(state.dataPath)}`,
			'--screenshot-format=png',
		];

		if (options.monitor) {
			mpvArgs.push('--mute=yes', '--reset-on-next-file=pause,loop-file,audio-files,aid,sid,mute', '--ao=null');
		} else {
			mpvArgs.push('--reset-on-next-file=pause,loop-file,audio-files,aid,sid');
			if (!conf.Player.Borders) mpvArgs.push('--no-border');
			if (conf.Player.FullScreen) {
				mpvArgs.push('--fullscreen');
			}
		}

		if (conf.Player.Screen) {
			mpvArgs.push(`--screen=${conf.Player.Screen}`, `--fs-screen=${conf.Player.Screen}`);
		}

		if (conf.Player.StayOnTop) {
			mpvArgs.push('--ontop');
		}

		// We want a 16/9
		const screens = await graphics();
		// Assume 1080p screen if systeminformation can't find the screen
		const screen = (conf.Player.Screen
			? screens.displays[conf.Player.Screen] || screens.displays[0]
			: screens.displays[0]) || { currentResX: 1920, resolutionX: 1920 };
		let targetResX = (screen.resolutionX || screen.currentResX) * (conf.Player.PIP.Size / 100);
		if (isNaN(targetResX) || targetResX === 0) {
			logger.warn('Cannot get a target res, defaulting to 480 (25% of 1080p display)', {
				service: 'Player',
				obj: { screen, PIPSize: [conf.Player.PIP.Size, typeof conf.Player.PIP.Size] },
			});
			targetResX = 480;
		}
		const targetResolution = `${Math.round(targetResX)}x${Math.round(targetResX * 0.5625)}`;
		// By default, center.
		let positionX = 50;
		let positionY = 50;
		if (conf.Player.PIP.PositionX === 'Left') positionX = 5;
		if (conf.Player.PIP.PositionX === 'Center') positionX = 50;
		if (conf.Player.PIP.PositionX === 'Right') positionX = -5;
		if (conf.Player.PIP.PositionY === 'Top') positionY = 5;
		if (conf.Player.PIP.PositionY === 'Center') positionY = 50;
		if (conf.Player.PIP.PositionY === 'Bottom') positionY = -5;
		if (options.monitor) {
			if (positionX >= 0) positionX += 10;
			else positionX -= 10;
			if (positionY >= 0) positionY += 10;
			else positionY -= 10;
		}
		mpvArgs.push(
			`--geometry=${targetResolution}${positionX > 0 ? `+${positionX}` : positionX}%${
				positionY > 0 ? `+${positionY}` : positionY
			}%`
		);

		if (conf.Player.NoHud) mpvArgs.push('--no-osc');
		if (conf.Player.NoBar) mpvArgs.push('--no-osd-bar');

		if (conf.Player.mpvVideoOutput) {
			mpvArgs.push(`--vo=${conf.Player.mpvVideoOutput}`);
		}

		// Testing if string exists or is not empty
		if (conf.Player.ExtraCommandLine?.length > 0) {
			conf.Player.ExtraCommandLine.split(' ').forEach(e => mpvArgs.push(e));
		}

		let socket: string;
		// Name socket file accordingly depending on OS.
		const random = randomstring.generate({
			length: 3,
			charset: 'numeric',
		});
		state.os === 'win32'
			? (socket = `\\\\.\\pipe\\mpvsocket${random}`)
			: (socket = `/tmp/km-node-mpvsocket${random}`);

		const mpvOptions = {
			binary: state.binPath.mpv,
			socket,
		};

		logger.debug(`mpv${this.options.monitor ? ' monitor' : ''} options:`, {
			obj: [mpvOptions, mpvArgs],
			service: 'Player',
		});

		return [state.binPath.mpv, socket, mpvArgs];
	}

	private debounceTimePosition(position: number) {
		// Returns the position in seconds in the current song
		if (playerState.mediaType === 'song' && playerState.currentSong?.duration) {
			playerState.timeposition = position;
			emitPlayerState();
			const conf = getConfig();
			if (conf.Player.ProgressBarDock) {
				playerState.mediaType === 'song'
					? setProgressBar(position / playerState.currentSong.duration)
					: setProgressBar(-1);
			}
			// Send notification to frontend if timeposition is 15 seconds before end of song
			if (
				position >= playerState.currentSong.duration - 15 &&
				playerState.mediaType === 'song' &&
				!playerState.nextSongNotifSent
			) {
				playerState.nextSongNotifSent = true;
				notificationNextSong();
			}
			// Display informations if timeposition is 8 seconds before end of song
			if (position >= playerState.currentSong.duration - 8 && playerState.mediaType === 'song') {
				this.control.displaySongInfo(playerState.currentSong.infos);
			} else if (position <= 8 && playerState.mediaType === 'song') {
				// Display informations if timeposition is 8 seconds after start of song
				this.control.displaySongInfo(
					playerState.currentSong.infos,
					-1,
					false,
					playerState.currentSong?.warnings
				);
			} else if (
				position >= Math.floor(playerState.currentSong.duration / 2) - 4 &&
				// Display KM's banner if position reaches halfpoint in the song
				position <= Math.floor(playerState.currentSong.duration / 2) + 4 &&
				playerState.mediaType === 'song' &&
				!getState().songPoll
			) {
				this.control.displayInfo();
			} else {
				this.control.messages.removeMessage('DI');
			}
			// Stop poll if position reaches 10 seconds before end of song
			if (
				Math.floor(position) >= Math.floor(playerState.currentSong.duration - 10) &&
				playerState.mediaType === 'song' &&
				conf.Karaoke.Poll.Enabled &&
				!playerState.songNearEnd
			) {
				playerState.songNearEnd = true;
				endPoll();
			}
		}
	}

	// Time position happens very often so we don't update it as often, hence the debouncing.
	debouncedTimePosition = debounce(this.debounceTimePosition, 125, { maxWait: 250, leading: true });

	private bindEvents() {
		if (!this.options.monitor) {
			this.mpv.on('property-change', status => {
				if (status.name !== 'playback-time') {
					logger.debug('mpv status', { service: 'Player', obj: status });
					playerState[status.name] = status.data;
				}
				if (status.name === 'fullscreen') {
					const FullScreen = !!status.data;
					editSetting({ Player: { FullScreen } });
					if (FullScreen) {
						this.control.messages.addMessage('fsTip', `{\\an7\\i1\\fs20}${i18n.t('FULLSCREEN_TIP')}`, 3000);
					} else {
						this.control.messages.removeMessage('fsTip');
					}
				}
				// If we're displaying an image, it means it's the pause inbetween songs
				if (
					!playerState.isOperating &&
					playerState.mediaType !== 'stop' &&
					playerState.mediaType !== 'pause' &&
					playerState.mediaType !== 'poll' &&
					status.name === 'eof-reached' &&
					status.data === true
				) {
					// Do not trigger 'pause' event from mpv
					playerState._playing = false;
					// Load up the next song
					playerEnding();
				} else if (status.name === 'playback-time') {
					this.debouncedTimePosition(status.data);
				}
			});
		}
		// Handle pause/play via external ways
		this.mpv.on('property-change', status => {
			if (
				status.name === 'pause' &&
				playerState.playerStatus !== 'stop' &&
				(playerState._playing === status.data ||
					playerState.mediaType === 'stop' ||
					playerState.mediaType === 'pause' ||
					playerState.mediaType === 'poll')
			) {
				logger.debug(
					`${status.data ? 'Paused' : 'Resumed'} event triggered on ${
						this.options.monitor ? 'monitor' : 'main'
					}`,
					{ service: 'Player' }
				);
				playerState._playing = !status.data;
				playerState.playing = !status.data;
				playerState.playerStatus = status.data ? 'pause' : 'play';
				this.control.exec(
					{ command: ['set_property', 'pause', status.data] },
					null,
					this.options.monitor ? 'main' : 'monitor'
				);
				emitPlayerState();
			}
		});
		// Handle client messages (skip/go-back)
		this.mpv.on('client-message', async message => {
			if (typeof message.args === 'object') {
				try {
					if (message.args[0] === 'skip') {
						await next();
					} else if (message.args[0] === 'go-back') {
						await prev();
					} else if (message.args[0] === 'seek') {
						await this.control.seek(+message.args[1]);
					}
				} catch (err) {
					logger.warn('Cannot handle mpv script command', { service: 'mpv' });
					// Non fatal, do not report to Sentry.
				}
			}
		});
		// Handle manually exits/crashes
		this.mpv.once('close', () => {
			logger.debug('mpv closed (?)', { service: `mpv${this.options.monitor ? ' monitor' : ''}` });
			// We set the state here to prevent the 'paused' event from triggering (because it will restart mpv at the same time)
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerStatus = 'stop';
			this.control.exec(
				{ command: ['set_property', 'pause', true] },
				null,
				this.options.monitor ? 'main' : 'monitor'
			);
			this.recreate();
			emitPlayerState();
		});
	}

	async start() {
		if (!this.configuration) {
			await this.init();
		}
		this.bindEvents();
		await retry(
			async () => {
				try {
					await this.mpv.start();
					const promises = [];
					promises.push(this.mpv.observeProperty('pause'));
					if (!this.options.monitor) {
						promises.push(this.mpv.observeProperty('eof-reached'));
						promises.push(this.mpv.observeProperty('playback-time'));
						promises.push(this.mpv.observeProperty('mute'));
						promises.push(this.mpv.observeProperty('volume'));
						promises.push(this.mpv.observeProperty('fullscreen'));
					}
					await Promise.all(promises);
					return true;
				} catch (err) {
					if (err.message === 'MPV is already running') {
						// It's already started!
						logger.warn('A start command was executed, but the player is already running. Not normal.', {
							service: 'Player',
						});
						return;
					}
					throw err;
				}
			},
			{
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(
						`Failed to start mpv, attempt ${error.attemptNumber}, trying ${error.retriesLeft} more times...`,
						{ service: 'Player', obj: error }
					);
				},
			}
		).catch(err => {
			logger.error('Cannot start MPV', { service: 'Player', obj: err });
			sentry.error(err, 'Fatal');
			throw err;
		});
		return true;
	}

	async recreate(options?: MpvOptions, restart = false) {
		try {
			if (this.isRunning) {
				try {
					await this.destroy();
				} catch (err) {
					// Non-fatal, should be already destroyed. Probably.
				}
			}
			// Set options if supplied
			if (options) this.options = options;
			// Re-init the player
			await this.init();
			if (restart) await this.start();
		} catch (err) {
			logger.error('mpvAPI (recreate)', { service: 'Player', obj: err });
			throw err;
		}
	}

	async destroy() {
		try {
			await this.mpv.stop();
			return true;
		} catch (err) {
			logger.error('mpvAPI (quit)', { service: 'Player', obj: err });
			throw err;
		}
	}

	get isRunning() {
		return !!this.mpv?.isRunning;
	}
}

class Players {
	players: {
		main: Player;
		monitor?: Player;
	};

	messages: MessageManager;

	comments: CommentHandler;

	/** Define lavfi-complex commands when we need to display stuff on screen or adjust audio volume. And it's... complex. */
	private static async genLavfiComplex(song: CurrentSong): Promise<string> {
		// Loudnorm normalization scheme: https://ffmpeg.org/ffmpeg-filters.html#loudnorm
		let audio: string;
		if (song.loudnorm) {
			const [input_i, input_tp, input_lra, input_thresh, target_offset] = song.loudnorm.split(',');
			audio = `[aid1]loudnorm=measured_i=${input_i}:measured_tp=${input_tp}:measured_lra=${input_lra}:measured_thresh=${input_thresh}:linear=true:offset=${target_offset}:lra=20[ao]`;
		} else if (song.gain) {
			audio = `[aid1]volume=${song.gain}dB[ao]`;
		} else {
			audio = '';
		}

		// Avatar
		const shouldDisplayAvatar =
			song.avatar && getConfig().Player.Display.SongInfo && getConfig().Player.Display.Avatar;
		const cropRatio = shouldDisplayAvatar ? Math.floor((await getAvatarResolution(song.avatar)) * 0.5) : 0;
		let avatar = '';
		if (shouldDisplayAvatar) {
			// Again, lavfi-complex expert @nah comes to the rescue!
			avatar = [
				`movie=\\'${song.avatar.replaceAll(
					'\\',
					'/'
				)}\\',format=yuva420p,geq=lum='p(X,Y)':a='if(gt(abs(W/2-X),W/2-${cropRatio})*gt(abs(H/2-Y),H/2-${cropRatio}),if(lte(hypot(${cropRatio}-(W/2-abs(W/2-X)),${cropRatio}-(H/2-abs(H/2-Y))),${cropRatio}),255,0),255)'[logo]`,
				'[logo][vid1]scale2ref=w=(ih*.128):h=(ih*.128)[logo1][base]',
				`[base][logo1]overlay=x='if(between(t,0,8)+between(t,${song.duration - 8},${
					song.duration
				}),W-(W*29/300),NAN)':y=H-(H*29/200)[vo]`,
			]
				.filter(x => !!x)
				.join(';');
		}
		return [audio, avatar || '[vid1]null[vo]'].filter(x => !!x).join(';');
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
						logger.info(`Restarting ${onlyOn} player`, { service: 'Player' });
						loads.push(this.players[onlyOn].recreate(null, true));
					}
				} else {
					// Fail silently on non-existing player (monitor disabled)
					return -1;
				}
			} else if (this.players) {
				for (const player in this.players) {
					if (!this.players[player].isRunning) {
						logger.info(`Restarting ${player} player`, { service: 'Player' });
						loads.push(this.players[player].recreate(null, true));
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

	async exec(cmd: string | MpvCommand, args: any[] = [], onlyOn?: PlayerType, ignoreLock = false) {
		try {
			const mpv = typeof cmd === 'object';
			// ensureRunning returns -1 if the player does not exist (eg. disabled monitor)
			// ensureRunning isn't needed on non-mpv commands
			if (mpv && (await this.ensureRunning(onlyOn, ignoreLock)) === -1) return;
			if (!(typeof cmd !== 'string' && cmd?.command[1] === 'osd-overlay')) {
				logger.debug(`${mpv ? 'mpv ' : ''}command: ${JSON.stringify(cmd)}, ${JSON.stringify(args)}`, {
					service: 'Player',
				});
				logger.debug(`Running it for players ${JSON.stringify(onlyOn || Object.keys(this.players))}`, {
					service: 'Player',
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
			logger.error('mpvAPI (send)', { service: 'Player', obj: err });
			throw new Error(JSON.stringify(err));
		}
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
	private tickProgressBar(nextTick: number, ticked: number, DI: string) {
		// 10 ticks
		if (ticked <= 10 && getState().streamerPause) {
			if (this.progressBarTimeout) clearTimeout(this.progressBarTimeout);
			let progressBar = '';
			for (const _nothing of Array(ticked)) {
				progressBar += '■';
			}
			for (const _nothing of Array(10 - ticked)) {
				progressBar += '□';
			}
			this.messages.addMessage('DI', `${DI}\\N\\N{\\fscx70\\fscy70\\fsp-3}${progressBar}`, 'infinite');
			this.progressBarTimeout = setTimeout(() => {
				this.tickProgressBar(nextTick, ticked + 1, DI);
			}, nextTick);
		}
	}

	private progressBar(duration: number, DI: string) {
		// * 1000 / 10
		this.tickProgressBar(Math.round(duration * 100), 1, DI);
	}

	private async loadBackground(type: BackgroundType) {
		const background = await getBackgroundAndMusic(type);
		logger.debug(
			`Background selected : ${background.pictures[0]}${background.music[0] ? ` (${background.music[0]})` : ''}`,
			{ service: 'Player' }
		);
		try {
			playerState.mediaType = type as MediaType;
			playerState.playerStatus = 'stop';
			playerState.currentSong = undefined;
			playerState.currentMedia = undefined;
			playerState._playing = false;
			playerState.playing = false;
			emitPlayerState();
			if (background.music[0]) {
				await this.exec({
					command: [
						'loadfile',
						background.pictures[0],
						'replace',
						{
							'force-media-title': 'Background',
							'audio-files-set': background.music[0],
							aid: '1',
							'loop-file': 'inf',
							pause: 'yes',
						},
					],
				});
			} else {
				await this.exec({
					command: ['loadfile', background.pictures[0], 'replace', { 'force-media-title': 'Background' }],
				});
			}
		} catch (err) {
			logger.error('Unable to load background', { service: 'Player', obj: err });
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
		logger.debug(`Players: ${JSON.stringify(Object.keys(this.players))}`, { service: 'Player' });
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
			logger.error('Unable to start player', { service: 'Player', obj: err });
			sentry.error(err, 'Fatal');
			throw err;
		}
	}

	@needsLock()
	async quit() {
		if (this.players.main.isRunning || this.players.monitor?.isRunning) {
			// needed to wait for lock release
			// eslint-disable-next-line no-return-await
			return this.exec('destroy').catch(err => {
				// Non fatal. Idiots sometimes close mpv instead of KM, this avoids an uncaught exception.
				logger.warn('Failed to quit mpv', { service: 'Player', obj: err });
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
				await this.exec('destroy', null, 'monitor', true).catch(() => {
					// Non-fatal, it probably means it's destroyed.
				});
				delete this.players.monitor;
			}
		}
		await this.exec('recreate', [null, true], undefined, true).catch(err => {
			logger.error('Cannot restart mpv', { service: 'Player', obj: err });
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

	async play(song: CurrentSong): Promise<PlayerState> {
		logger.debug('Play event triggered', { service: 'Player' });
		playerState.playing = true;
		profile('mpvPlay');
		let mediaFile: string;
		let subFile: string;
		const options: any = {
			'force-media-title': getSongTitle(song),
		};
		let onlineMedia = false;
		const loadPromises = [
			Players.genLavfiComplex(song)
				.then(res => (options['lavfi-complex'] = res))
				.catch(err => {
					logger.error('Cannot compute lavfi-complex filter, disabling avatar display', {
						service: 'Player',
						obj: err,
					});
					// At least, loudnorm
					options['lavfi-complex'] = '[aid1]loudnorm[ao]';
				}),
			resolveFileInDirs(song.subfile, resolvedPathRepos('Lyrics', song.repository))
				.then(res => (subFile = res[0]))
				.catch(err => {
					logger.debug('Error while resolving subs path', { service: 'Player', obj: err });
					logger.warn(`Subs NOT FOUND : ${song.subfile}`, { service: 'Player' });
					subFile = '';
				}),
			resolveFileInDirs(song.mediafile, resolvedPathRepos('Medias', song.repository))
				.then(res => (mediaFile = res[0]))
				.catch(async err => {
					logger.debug('Error while resolving media path', { service: 'Player', obj: err });
					logger.warn(`Media NOT FOUND : ${song.mediafile}`, { service: 'Player' });
					await resolveMediaURL(song.mediafile, song.repository)
						.then(res => {
							onlineMedia = true;
							mediaFile = res;
						})
						.catch(error => {
							mediaFile = '';
							throw new Error(
								`No media source for ${song.mediafile} (tried in ${resolvedPathRepos(
									'Medias',
									song.repository
								).toString()} and HTTP source): ${error}`
							);
						});
				}),
		];
		await Promise.all<Promise<any>>(loadPromises);
		logger.debug(`Loading media: ${mediaFile}${subFile ? ` with ${subFile}` : ''}`, { service: 'Player' });
		if (subFile) {
			options['sub-file'] = subFile;
			options.sid = '1';
		} else {
			options['sub-file'] = '';
			options.sid = 'none';
		}
		let id3tags: Tags;
		if (mediaFile.endsWith('.mp3') && !onlineMedia) {
			id3tags = await id3.read(mediaFile);
		}
		if (!id3tags?.image) {
			const defaultImageFile = resolve(resolvedPath('Temp'), 'default.jpg');
			options['external-file'] = defaultImageFile.replaceAll('\\', '/');
			options['force-window'] = 'yes';
			options['image-display-duration'] = 'inf';
			options.vid = '1';
		}
		// Load all those files into mpv and let's go!
		try {
			playerState.currentSong = song;
			playerState.mediaType = 'song';
			playerState.currentMedia = null;
			if (this.messages) this.messages.removeMessage('poll');
			await retry(() => this.exec({ command: ['loadfile', mediaFile, 'replace', options] }), {
				retries: 3,
				onFailedAttempt: error => {
					logger.warn(
						`Failed to play song, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`,
						{ service: 'Player' }
					);
				},
			}).catch(err => {
				logger.error('Unable to load media', { service: 'Player', obj: err });
				throw err;
			});
			logger.debug(`File ${mediaFile} loaded`, { service: 'Player' });
			// Loaded!
			playerState.songNearEnd = false;
			playerState.nextSongNotifSent = false;
			playerState.playing = true;
			playerState._playing = true;
			playerState.currentMedia = undefined;
			playerState.playerStatus = 'play';
			emitPlayerState();
			setDiscordActivity('song', {
				title: getSongTitle(song),
				source: getSongSeriesSingers(song) || i18n.t('UNKNOWN_ARTIST'),
			});
			return playerState;
		} catch (err) {
			logger.error('Unable to load', { service: 'Player', obj: err });
			sentry.addErrorInfo('mediaData', JSON.stringify(song, null, 2));
			sentry.error(err);
			throw err;
		} finally {
			profile('mpvPlay');
		}
	}

	async playMedia(mediaType: MediaType): Promise<PlayerState> {
		const conf = getConfig();
		const media = getSingleMedia(mediaType);
		if (media) {
			logger.debug(`Playing ${mediaType}: ${media.filename}`, { service: 'Player' });
			const options: any = {
				'force-media-title': mediaType,
				af: 'loudnorm',
			};
			const subFile = replaceExt(media.filename, '.ass');
			logger.debug(`Searching for ${subFile}`, { service: 'Player' });
			if (await fileExists(subFile)) {
				options['sub-file'] = subFile;
				options.sid = '1';
				logger.debug(`Loading ${subFile}`, { service: 'Player' });
			} else {
				logger.debug('No subtitles to load (not found for media)', { service: 'Player' });
			}
			try {
				playerState.currentSong = undefined;
				playerState.mediaType = mediaType;
				playerState.currentMedia = media;
				await retry(() => this.exec({ command: ['loadfile', media.filename, 'replace', options] }), {
					retries: 3,
					onFailedAttempt: error => {
						logger.warn(
							`Failed to play ${mediaType}, attempt ${error.attemptNumber}, trying ${error.retriesLeft} times more...`,
							{ service: 'Player' }
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
				this.messages.removeMessage('poll');
				emitPlayerState();
				return playerState;
			} catch (err) {
				logger.error(`Error loading media ${mediaType}: ${media.filename}`, { service: 'Player', obj: err });
				sentry.error(err);
				throw err;
			}
		} else {
			logger.debug(`No ${mediaType} to play.`, { service: 'Player' });
			playerState.playerStatus = 'play';
			await this.loadBackground('stop');
			logger.debug('No jingle DI', { service: 'Player' });
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
		logger.debug('Stop event triggered', { service: 'Player' });
		playerState.playing = false;
		playerState.timeposition = 0;
		playerState._playing = false;
		// This will be set to false by mpv, meanwhile the eof-reached event is simulated to trigger correctly other
		// parts of the code
		playerState['eof-reached'] = true;
		playerState.playerStatus = 'stop';
		await this.loadBackground(type);
		logger.debug('Stop DI', { service: 'Player' });
		this.displayInfo();
		emitPlayerState();
		setProgressBar(-1);
		setDiscordActivity('idle');
		this.messages.removeMessage('poll');
		return playerState;
	}

	async pause(): Promise<PlayerState> {
		logger.debug('Pause event triggered', { service: 'Player' });
		try {
			playerState._playing = false; // This prevents the play/pause event to be triggered
			await this.exec({ command: ['set_property', 'pause', true] });
			playerState.playing = false;
			playerState.playerStatus = 'pause';
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to pause', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async resume(): Promise<PlayerState> {
		logger.debug('Resume event triggered', { service: 'Player' });
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
			playerState.playing = true;
			playerState.playerStatus = 'play';
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to resume', { service: 'Player', obj: err });
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
			// Workaround for audio-only files: disable the lavfi-complex filter
			if (
				playerState.currentSong?.mediafile.endsWith('.mp3') &&
				playerState.currentSong?.avatar &&
				getConfig().Player.Display.Avatar
			) {
				await this.exec({ command: ['set_property', 'lavfi-complex', '[aid1]loudnorm[ao];[vid1]null[vo]'] });
			}
			await this.exec({ command: ['seek', delta] });
		} catch (err) {
			logger.error('Unable to seek', { service: 'Player', obj: err });
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
			// Workaround for audio-only files: disable the lavfi-complex filter
			if (
				playerState.currentSong?.mediafile.endsWith('.mp3') &&
				playerState.currentSong?.avatar &&
				getConfig().Player.Display.Avatar
			) {
				await this.exec({ command: ['set_property', 'lavfi-complex', '[aid1]loudnorm[ao];[vid1]null[vo]'] });
			}
			await this.exec({ command: ['seek', pos, 'absolute'] });
		} catch (err) {
			logger.error('Unable to go to position', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setMute(mute: boolean): Promise<PlayerState> {
		try {
			await this.exec({ command: ['set_property', 'mute', mute] });
			return playerState;
		} catch (err) {
			logger.error('Unable to toggle mute', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setAudioDevice(device: string) {
		try {
			await this.exec({ command: ['set_property', 'audio-device', device] });
		} catch (err) {
			logger.error('Unable to set volume', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setVolume(volume: number): Promise<PlayerState> {
		try {
			await this.exec({ command: ['set_property', 'volume', volume] });
			playerState.volume = volume;
			emitPlayerState();
			return playerState;
		} catch (err) {
			logger.error('Unable to set volume', { service: 'Player', obj: err });
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
			logger.error(`Unable to ${showSubs ? 'show' : 'hide'} subs: ${JSON.stringify(err)}`, { service: 'Player' });
			sentry.error(err);
			throw err;
		}
	}

	async toggleFullscreen(): Promise<boolean> {
		try {
			await this.exec({ command: ['set_property', 'fullscreen', !playerState.fullscreen] });
			playerState.fullscreen = !playerState.fullscreen;
			emitPlayerState();
			return playerState.fullscreen;
		} catch (err) {
			logger.error('Unable to toggle fullscreen', { service: 'Player', obj: err });
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
			logger.error('Unable to toggle ontop', { service: 'Player', obj: err });
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
			logger.error('Unable to toggle ontop', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async setHwDec(method: string) {
		await this.exec({ command: ['set_property', 'hwdec', method] }).catch(err => {
			logger.error('Unable to set hwdec method', { service: 'Player', obj: err });
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
			logger.warn('Unable to tick display', { service: 'Player', obj: err });
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
			logger.error('Unable to display message', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async displaySongInfo(infos: string, duration = -1, nextSong = false, warnings?: DBKaraTag[]) {
		try {
			let warningString = '';
			let nextSongString = '';
			let position = '';
			if (getConfig().Player.Display.SongInfo) {
				if (warnings?.length > 0) {
					const lang =
						getConfig().Player.Display.SongInfoLanguage ||
						convert1LangTo2B(getState().defaultLocale) ||
						'eng';
					const warningArr = warnings.map(t => {
						return getTagNameInLanguage(t, lang, 'eng');
					});
					warningString = `{\\fscx80}{\\fscy80}{\\b1}{\\c&H0808E8&}⚠ WARNING: ${warningArr.join(
						', '
					)} ⚠{\\b0}\\N{\\c&HFFFFFF&}`;
				}
				nextSongString = nextSong ? `${i18n.t('NEXT_SONG')}\\N\\N` : '';
				position = nextSong ? '{\\an5}' : '{\\an1}';
				this.messages.addMessage(
					'DI',
					position + warningString + nextSongString + infos,
					duration === -1 ? 'infinite' : duration
				);
			}
			if (nextSong) {
				playerState.mediaType = 'pause';
				try {
					this.startBackgroundMusic();
				} catch (err) {
					logger.warn('Unable to start background music during a pause', { service: 'Player', obj: err });
					// Non fatal.
				}
				emitPlayerState();
				if (getState().streamerPause && getConfig().Karaoke.StreamerMode.PauseDuration > 0) {
					this.progressBar(
						getConfig().Karaoke.StreamerMode.PauseDuration,
						position + warningString + nextSongString + infos
					);
				}
			}
		} catch (err) {
			logger.error('Unable to display song info', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	async displayInfo(duration = -1) {
		try {
			const conf = getConfig();
			const state = getState();
			const ci = conf.Player.Display.ConnectionInfo;
			let text = '';
			const catchphrase =
				playerState.mediaType !== 'song' && conf.Player.Display.RandomQuotes
					? sample(initializationCatchphrases)
					: '';
			if (ci.Enabled) text = `${ci.Message} ${i18n.t('GO_TO')} ${state.osURL} !`; // TODO: internationalize the exclamation mark
			const version = `Karaoke Mugen ${state.version.number} (${state.version.name}) - http://karaokes.moe`;
			const message = `{\\an1}{\\fscx80}{\\fscy80}${text}\\N{\\fscx60}{\\fscy60}{\\i1}${version}{\\i0}\\N{\\fscx40}{\\fscy40}${catchphrase}`;
			this.messages?.addMessage('DI', message, duration === -1 ? 'infinite' : duration);
		} catch (err) {
			logger.error('Unable to display infos', { service: 'Player', obj: err });
			sentry.error(err);
			throw err;
		}
	}

	displayAddASong() {
		if (getState().randomPlaying) {
			try {
				this.message(i18n.t('ADD_A_SONG_TO_PLAYLIST_SCREEN_MESSAGE'), 1000, 5, 'addASong');
			} catch (err) {
				logger.warn('Unable to display Add A Song message', { service: 'Player', obj: err });
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
