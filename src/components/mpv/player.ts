import i18n from 'i18next';
import retry from 'p-retry';
import { resolve } from 'path';
import randomstring from 'randomstring';
import { from } from 'rxjs';
import { concatMap, first, throttleTime } from 'rxjs/operators';
import { graphics } from 'systeminformation';

import { getConfig, resolvedPath } from '../../lib/utils/config.js';
import { date, time } from '../../lib/utils/date.js';
import logger from '../../lib/utils/logger.js';
import { emit } from '../../lib/utils/pubsub.js';
import { playerEnding } from '../../services/karaEngine.js';
import { next, pausePlayer, playPlayer, prev } from '../../services/player.js';
import { notificationNextSong } from '../../services/playlist.js';
import { endPoll } from '../../services/poll.js';
import { getCurrentSongTimers } from '../../services/quiz.js';
import { MpvOptions } from '../../types/player.js';
import { editSetting } from '../../utils/config.js';
import { isMpvGreaterThan39 } from '../../utils/hokutoNoCode.js';
import sentry from '../../utils/sentry.js';
import { getState } from '../../utils/state.js';
import { isShutdownInProgress } from '../engine.js';
import { emitPlayerState, Players, playerState } from '../mpv.js';
import MpvIPC from './mpvIPC.js';
import { MpvState } from './mpvState.js';

export class Player {
	private readonly log: logger.Logger;
	private mpvState: MpvState;

	mpv: MpvIPC;

	configuration: any;

	logFile: string;

	options: MpvOptions;

	control: Players;

	constructor(options: MpvOptions, players: Players) {
		this.options = options;
		this.control = players;
		this.log = logger.child({ service: `mpv.Player.${this.options.monitor ? 'monitor' : 'main'}` });
	}

	async init() {
		this.mpvState?.[Symbol.dispose]();
		// Generate the configuration
		this.configuration = await this.genConf(this.options);
		// Instantiate mpv
		this.mpv = new MpvIPC(this.configuration[0], this.configuration[1], this.configuration[2]);
		this.mpvState = new MpvState(this.mpv);
	}

	async play(mediaFile: string, options: Record<string, any>) {
		const cmd = { command: ['loadfile', mediaFile, 'replace', '0', options] };
		this.log.debug(`mpv command: ${JSON.stringify(cmd)}}`);
		await this.mpv.send(cmd);
		this.mpvState.playbackTime$
			.pipe(
				first(t => t > 0),
				concatMap(_ => from(this.setSid(options.sid)))
			)
			.subscribe({ error: e => this.log.error(JSON.stringify(e)) });
	}

	async setSid(sid: string) {
		return await this.mpv.send({ command: ['set', 'sid', sid] });
	}

	private async genConf(options: MpvOptions) {
		const conf = getConfig();
		const state = getState();
		const today = date();
		const now = time().replaceAll(':', '.');
		this.logFile = `mpv${options.monitor ? '-monitor' : ''}.${today}.${now}.log`;
		const mpvArgs = [
			'--keep-open=always',
			'--osd-level=0',
			`--log-file=${resolve(resolvedPath('Logs'), this.logFile)}`,
			`--hwdec=${conf.Player.HardwareDecoding}`,
			`--volume=${+conf.Player.Volume}`,
			`--audio-delay=${(conf.Player.AudioDelay && +conf.Player.AudioDelay / 1000) || 0}`,
			'--autoload-files=no',
			`--config-dir=${resolvedPath('Temp')}`,
			`--sub-fonts-dir=${resolvedPath('Fonts')}`,
			'--sub-visibility',
			isMpvGreaterThan39() ? '--sub-ass-use-video-data=none' : '--sub-ass-vsfilter-aspect-compat=no',
			'--loop-file=no',
			`--title=${options.monitor ? '[MONITOR] ' : ''}\${force-media-title} - Karaoke Mugen Player`,
			'--force-media-title=Loading...',
			`--audio-device=${conf.Player.AudioDevice}`,
			`--screenshot-directory=${resolve(state.dataPath)}`,
			'--screenshot-format=png',
			'--no-osc',
			'--no-osd-bar',
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
			this.log.warn('Cannot get a target res, defaulting to 480 (25% of 1080p display)', {
				obj: { screen, PIPSize: [conf.Player.PIP.Size, typeof conf.Player.PIP.Size] },
			});
			targetResX = 480;
		}
		const targetResolution = `${Math.round(targetResX)}x${Math.round(targetResX * 0.5625)}`;
		// By default, center.
		let positionX = 50;
		let positionY = 50;
		if (conf.Player.PIP.PositionX === 'Left') positionX = 1;
		if (conf.Player.PIP.PositionX === 'Center') positionX = 50;
		if (conf.Player.PIP.PositionX === 'Right') positionX = -1;
		if (conf.Player.PIP.PositionY === 'Top') positionY = 1;
		if (conf.Player.PIP.PositionY === 'Center') positionY = 50;
		if (conf.Player.PIP.PositionY === 'Bottom') positionY = -1;
		if (options.monitor) {
			if (positionX >= 0) positionX += 10;
			else positionX -= 10;
			if (positionY >= 0) positionY += 10;
			else positionY -= 10;
		}
		mpvArgs.push(
			`--geometry=${targetResolution}${positionX > 0 ? `+${positionX}` : positionX}%${positionY > 0 ? `+${positionY}` : positionY}%`
		);

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

		this.log.debug(`options:`, { obj: { options: mpvOptions, args: mpvArgs } });
		return [state.binPath.mpv, socket, mpvArgs];
	}

	private debounceTimePosition(position: number) {
		// Returns the position in seconds in the current song
		if (playerState.mediaType === 'song' && playerState.currentSong?.duration) {
			playerState.timeposition = position;
			playerState.quiz = getCurrentSongTimers();
			const conf = getConfig();
			// Send notification to frontend if timeposition is 15 seconds before end of song
			if (
				position >= playerState.currentSong.duration - 15 &&
				playerState.mediaType === 'song' &&
				!playerState.nextSongNotifSent &&
				!getState().quiz.running
			) {
				playerState.nextSongNotifSent = true;
				notificationNextSong();
			}
			if (getState().quiz.running) {
				const game = getState().quiz;
				if (game.running && game.currentSong.state === 'answer') {
					this.control.displaySongInfo(playerState.currentSong.infos);
				} else {
					this.control.displayInfo();
				}
			} else if (
				// Display informations if timeposition is 8 seconds before end of song
				position >= playerState.currentSong.duration - 8 &&
				playerState.mediaType === 'song' &&
				!getState().quiz.running
			) {
				this.control.displaySongInfo(playerState.currentSong.infos);
			} else if (position <= 8 && playerState.mediaType === 'song' && !getState().quiz.running) {
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
			emit('playerPositionUpdated', position);
			emitPlayerState();
		}
	}

	private bindEvents() {
		if (!this.options.monitor) {
			this.mpvState.on('property-change', status => {
				this.log.debug('mpv status', { obj: status });
				playerState[status.name] = status.data;
				if (status.name === 'fullscreen') {
					const fullScreen = !!status.data;
					editSetting({ Player: { FullScreen: fullScreen } });
					if (fullScreen) {
						this.log.info('Player going to full screen');
						this.control.messages.addMessage('fsTip', `{\\an7\\i1\\fs20}${i18n.t('FULLSCREEN_TIP')}`, 3000);
					} else {
						this.log.info('Player going to windowed mode');
						this.control.messages.removeMessage('fsTip');
					}
				}
				emitPlayerState();
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
				}
			});
		}
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
					} else if (message.args[0] === 'pause' && playerState.playerStatus !== 'stop') {
						if (playerState.playerStatus === 'pause') {
							playPlayer();
						} else {
							pausePlayer();
						}
					} else if (message.args[0] === 'subs') {
						this.control.setSubs(!playerState.showSubs);
					}
				} catch (err) {
					this.log.warn('Cannot handle mpv script command');
					// Non fatal, do not report to Sentry.
				}
			}
		});
		// Handle manual exits/crashes
		this.mpv.once('close', () => {
			this.log.debug('mpv closed (?)');
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
		if (isShutdownInProgress()) return;
		this.bindEvents();
		await retry(
			async () => {
				try {
					await this.mpv.start();
					const promises = [];
					promises.push(this.mpv.observeProperty('pause'));
					if (!this.options.monitor) {
						this.mpvState.playbackTime$
							.pipe(throttleTime(125))
							.subscribe(time => this.debounceTimePosition(time));
						promises.push(this.mpv.observeProperty('eof-reached'));
						promises.push(this.mpv.observeProperty('mute'));
						promises.push(this.mpv.observeProperty('volume'));
						promises.push(this.mpv.observeProperty('fullscreen'));
					}
					await Promise.all(promises);
					return true;
				} catch (err) {
					if (err.message === 'MPV is already running') {
						// It's already started!
						this.log.warn('A start command was executed, but the player is already running. Not normal.');
						return;
					}
					throw err;
				}
			},
			{
				retries: 3,
				onFailedAttempt: error => {
					this.log.warn(
						`Failed to start mpv, attempt ${error.attemptNumber}, trying ${error.retriesLeft} more times...`,
						{ obj: error }
					);
				},
			}
		).catch(err => {
			this.log.error('Cannot start MPV', { obj: err });
			sentry.error(err, 'fatal');
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
			this.log.error('mpvAPI (recreate)', { obj: err });
			throw err;
		}
	}

	async destroy() {
		try {
			await this.mpv.stop();
			return true;
		} catch (err) {
			this.log.error('mpvAPI (quit)', { obj: err });
			throw err;
		}
	}

	get isRunning() {
		return !!this.mpv?.isRunning;
	}
}
