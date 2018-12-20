import logger from 'winston';
import {resolvedPathBackgrounds, getConfig} from '../_utils/config';
import {resolve} from 'path';
import {resolveFileInDirs, isImageFile, asyncReadDir, asyncExists} from '../_utils/files';
import sample from 'lodash.sample';
import sizeOf from 'image-size';
import {getSingleJingle, buildJinglesList} from './jingles';
import {buildQRCode} from './qrcode';
import {spawn} from 'child_process';
import {exit} from '../_services/engine';
import {playerEnding} from '../_services/player';
import {getID3} from './id3tag';
import mpv from 'node-mpv';
import {promisify} from 'util';
import {endPoll} from '../_services/poll';
import {getState, setState} from '../_utils/state';


const sleep = promisify(setTimeout);

let displayingInfo = false;
let player;
let playerMonitor;
let monitorEnabled = false;
let songNearEnd = false;

let playerState = {
	volume: 100,
	playing: false,
	playerstatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	duration: 0,
	mutestatus: false,
	subtext: null,
	currentSongInfos: null,
	mediaType: 'background',
	showsubs: true,
	stayontop: false,
	fullscreen: false,
	ready: false,
	url: null
};

function emitPlayerState() {
	setState({player: playerState});
}

async function extractAllBackgroundFiles() {
	let backgroundFiles = [];
	for (const resolvedPath of resolvedPathBackgrounds()) {
		backgroundFiles = backgroundFiles.concat(await extractBackgroundFiles(resolvedPath));
	}
	return backgroundFiles;
}

async function extractBackgroundFiles(backgroundDir) {
	const backgroundFiles = [];
	const dirListing = await asyncReadDir(backgroundDir);
	for (const file of dirListing) {
		if (isImageFile(file)) {
			backgroundFiles.push(resolve(backgroundDir, file));
		}
	}
	return backgroundFiles;
}

async function loadBackground(mode) {
	const conf = getConfig();
	if (!mode) mode = 'replace';
	// Default background
	let backgroundFiles = [];
	const defaultImageFile = resolve(conf.appPath,conf.PathTemp,'default.jpg');
	let backgroundImageFile = defaultImageFile;
	if (conf.PlayerBackground) {
		backgroundImageFile = resolve(conf.appPath,conf.PathBackgrounds,conf.PlayerBackground);
		if (await asyncExists(backgroundImageFile)) {
			// Background provided in config file doesn't exist, reverting to default one provided.
			logger.warn(`[Player] Unable to find background file ${backgroundImageFile}, reverting to default one`);
			backgroundFiles.push(defaultImageFile);
		}
	} else {
		// PlayerBackground is empty, thus we search through all backgrounds paths and pick one at random
		backgroundFiles = await extractAllBackgroundFiles();
		// If backgroundFiles is empty, it means no file was found in the directories scanned.
		// Reverting to original, supplied background :
		if (backgroundFiles.length === 0) backgroundFiles.push(defaultImageFile);
	}
	backgroundImageFile = sample(backgroundFiles);
	logger.debug('[Player] Background : '+backgroundImageFile);
	let videofilter = '';
	if (+conf.EngineDisplayConnectionInfoQRCode &&
		+conf.EngineDisplayConnectionInfo ) {
		const dimensions = sizeOf(backgroundImageFile);
		let QRCodeWidth;
		let QRCodeHeight;
		QRCodeWidth = QRCodeHeight = Math.floor(dimensions.width*0.10);

		const posX = Math.floor(dimensions.width*0.015);
		const posY = Math.floor(dimensions.height*0.015);
		const qrCode = resolve(conf.appPath,conf.PathTemp,'qrcode.png').replace(/\\/g,'/');
		videofilter = `lavfi-complex=movie=\\'${qrCode}\\'[logo];[logo][vid1]scale2ref=${QRCodeWidth}:${QRCodeHeight}[logo1][base];[base][logo1]overlay=${posX}:${posY}[vo]`;
	}
	try {
		logger.debug(`[Player] videofilter : ${videofilter}`);
		let loads = [
			player.load(backgroundImageFile,mode,[videofilter])
		];
		if (monitorEnabled) loads.push(playerMonitor.load(backgroundImageFile,mode,videofilter));
		await Promise.all(loads);
		if (mode === 'replace') displayInfo();
	} catch(err) {
		logger.error(`[Player] Unable to load background in ${mode} mode : ${JSON.stringify(err)}`);
	}
}

export async function initPlayerSystem() {
	const state = getState();
	playerState.fullscreen = state.fullscreen;
	playerState.stayontop = state.ontop;
	buildJinglesList();
	const conf = getConfig();
	await buildQRCode(conf.osURL);
	logger.debug('[Player] QRCode generated');
	await startmpv();
	emitPlayerState();
	logger.debug('[Player] Player is READY');
}

function getmpvVersion(path) {
	return new Promise((resolve) => {
		const proc = spawn(path,['--version'], {encoding: 'utf8'});
		let output = '';
		proc.stdout.on('data',(data) => {
			output += data.toString();
		});
		proc.on('close', () => {
			//FIXME : test if output.split(' ')[1] is actually a valid version number
			// using the semver format.
			resolve (output.split(' ')[1]);
		});
	});
}

async function startmpv() {
	const conf = getConfig();
	if (+conf.PlayerMonitor) {
		monitorEnabled = true;
	} else {
		monitorEnabled = false;
	}
	let mpvOptions = [
		'--keep-open=yes',
		'--fps=60',
		'--no-border',
		'--osd-level=0',
		'--sub-codepage=UTF-8-BROKEN',
		'--log-file='+resolve(conf.appPath,'mpv.log'),
		'--volume='+playerState.volume,
		'--input-conf='+resolve(conf.appPath,conf.PathTemp,'input.conf'),
		'--autoload-files=no'
	];
	if (+conf.PlayerPIP) {
		mpvOptions.push(`--autofit=${conf.PlayerPIPSize}%x${conf.PlayerPIPSize}%`);
		// By default, center.
		let positionX = 50;
		let positionY = 50;
		if (conf.PlayerPIPPositionX === 'Left') positionX = 1;
		if (conf.PlayerPIPPositionX === 'Center') positionX = 50;
		if (conf.PlayerPIPPositionX === 'Right') positionX = 99;
		if (conf.PlayerPIPPositionY === 'Top') positionY = 5;
		if (conf.PlayerPIPPositionY === 'Center') positionY = 50;
		if (conf.PlayerPIPPositionY === 'Bottom') positionY = 99;
		mpvOptions.push(`--geometry=${positionX}%:${positionY}%`);
	}
	if (conf.mpvVideoOutput) {
		mpvOptions.push(`--vo=${conf.mpvVideoOutput}`);
	} else {
		//Force direct3d for Windows users
		//This is an issue with mpv's recent versions as direct3d bugs out some videos
		//and backgrounds
		//This is not a problem with the bundled 0.27 version, but is with 0.28
		//FIXME : Remove this if a fixed mpv for windows is released and direct3d works great again
		if (conf.os === 'win32') mpvOptions.push('--vo=direct3d');
	}
	if (conf.PlayerScreen) {
		mpvOptions.push(`--screen=${conf.PlayerScreen}`);
		mpvOptions.push(`--fs-screen=${conf.PlayerScreen}`);
	}
	// Fullscreen is disabled if pipmode is set.
	if (+conf.PlayerFullscreen && !+conf.PlayerPIP) {
		mpvOptions.push('--fullscreen');
		playerState.fullscreen = true;
	}
	if (+conf.PlayerStayOnTop) {
		playerState.stayontop = true;
		mpvOptions.push('--ontop');
	}
	if (+conf.PlayerNoHud) mpvOptions.push('--no-osc');
	if (+conf.PlayerNoBar) mpvOptions.push('--no-osd-bar');
	//On all platforms, check if we're using mpv at least version 0.20 or abort saying the mpv provided is too old.
	//Assume UNKNOWN is a compiled version, and thus the most recent one.
	const mpvVersion = await getmpvVersion(conf.BinmpvPath);
	logger.debug(`[Player] mpv version : ${mpvVersion}`);

	//If we're on macOS, add --no-native-fs to get a real
	// fullscreen experience on recent macOS versions.
	if (parseInt(mpvVersion.split('.')[1], 10) < 25) {
		// Version is too old. Abort.
		logger.error(`[Player] mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`);
		logger.error(`[Player] mpv binary : ${conf.BinmpvPath}`);
		logger.error('[Player] Exiting due to obsolete mpv version');
		exit(1);
	}
	if (conf.os === 'darwin' && parseInt(mpvVersion.split('.')[1], 10) > 26) mpvOptions.push('--no-native-fs');
	logger.debug(`[Player] mpv options : ${mpvOptions}`);
	logger.debug(`[Player] mpv binary : ${conf.BinmpvPath}`);
	let socket;
	if (conf.os === 'win32') socket = '\\\\.\\pipe\\mpvsocket';
	if (conf.os === 'darwin' || conf.os === 'linux') socket = '/tmp/km-node-mpvsocket';
	player = new mpv(
		{
			ipc_command: '--input-ipc-server',
			auto_restart: true,
			audio_only: false,
			binary: conf.BinmpvPath,
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
			`--autofit=${conf.PlayerPIPSize}%x${conf.PlayerPIPSize}%`,
			'--autoload-files=no'
		];
		if (conf.mpvVideoOutput) {
			mpvOptions.push(`--vo=${conf.mpvVideoOutput}`);
		} else {
			//Force direct3d for Windows users
			if (conf.os === 'win32') mpvOptions.push('--vo=direct3d');
		}
		playerMonitor = new mpv(
			{
				ipc_command: '--input-ipc-server',
				auto_restart: true,
				audio_only: false,
				binary: conf.BinmpvPath,
				socket: socket+'2',
				time_update: 1,
				verbose: false,
				debug: false,
			},
			mpvOptions
		);
	}

	// Starting up mpv
	try {
		let promises = [
			player.start()
		];
		if (monitorEnabled) promises.push(playerMonitor.start());
		await Promise.all(promises);
	} catch(err) {
		logger.error(`[Player] mpvAPI : ${err}`);
		throw err;
	}
	await loadBackground();
	player.observeProperty('sub-text',13);
	player.observeProperty('volume',14);
	player.observeProperty('duration',15);
	player.on('statuschange',(status) => {
		// If we're displaying an image, it means it's the pause inbetween songs
		if (playerState._playing && status && status.filename && status.filename.match(/\.(png|jp.?g|gif)/i)) {
			// immediate switch to Playing = False to avoid multiple trigger
			playerState.playing = false;
			playerState._playing = false;
			playerState.playerstatus = 'stop';
			player.pause();
			if (monitorEnabled) playerMonitor.pause();
			playerState.mediaType = 'background';
			playerEnding();
		}
		playerState.mutestatus = status.mute;
		playerState.duration = status.duration;
		playerState.subtext = status['sub-text'];
		playerState.volume = status.volume;
		playerState.fullscreen = status.fullscreen;
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
	player.on('timeposition',(position) => {
		// Returns the position in seconds in the current song
		playerState.timeposition = position;
		emitPlayerState();
		// Display informations if timeposition is 8 seconds before end of song
		if (position >= (playerState.duration - 8) &&
						!displayingInfo &&
						playerState.mediaType === 'song')
			displaySongInfo(playerState.currentSongInfos);
		// Display KM's banner if position reaches halfpoint in the song
		if (Math.floor(position) === Math.floor(playerState.duration / 2) && !displayingInfo && playerState.mediaType === 'song') displayInfo(8000);
		const conf = getConfig();
		// Stop poll if position reaches 10 seconds before end of song
		if (Math.floor(position) >= Math.floor(playerState.duration - 10) && playerState.mediaType === 'song' &&
		+conf.EngineSongPoll &&
		!songNearEnd) {
			songNearEnd = true;
			endPoll();
		}
	});
	logger.debug('[Player] mpv initialized successfully');
	playerState.ready = true;
	return true;
}

export async function play(mediadata) {
	const conf = getConfig();
	logger.debug('[Player] Play event triggered');
	playerState.playing = true;
	//Search for media file in the different Pathmedias
	const PathsMedias = conf.PathMedias.split('|');
	const PathsSubs = conf.PathSubs.split('|');
	let mediaFile;
	let subFile;
	try {
		mediaFile = await resolveFileInDirs(mediadata.media,PathsMedias);
	} catch (err) {
		logger.debug(`[Player] Error while resolving media path : ${err}`);
		logger.warn(`[Player] Media NOT FOUND : ${mediadata.media}`);
		if (conf.PathMediasHTTP) {
			mediaFile = `${conf.PathMediasHTTP}/${encodeURIComponent(mediadata.media)}`;
			logger.info(`[Player] Trying to play media directly from the configured http source : ${conf.PathMediasHTTP}`);
		} else {
			throw `No media source for ${mediadata.media} (tried in ${PathsMedias.toString()} and HTTP source)`;
		}
	}
	try {
		if (mediadata.subfile !== 'dummy.ass') subFile = await resolveFileInDirs(mediadata.subfile,PathsSubs);
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
			options.push('lavfi-complex=[aid1]asplit[ao][a]; [a]showcqt[vis];[vis]scale=1920:1080[visu];[vid1]scale=-2:1080[vidInp];[vidInp]pad=1920:1080:(ow-iw)/2:(oh-ih)/2[vpoc];[vpoc][visu]blend=shortest=0:all_mode=overlay:all_opacity=1[vo]');
			const id3tags = await getID3(mediaFile);
			if (!id3tags.image) {
				const defaultImageFile = resolve(conf.appPath,conf.PathTemp,'default.jpg');
				options.push(`external-file=${defaultImageFile.replace(/\\/g,'/')}`);
				options.push('force-window=yes');
				options.push('image-display-duration=inf');
				options.push('vid=1');
			}
		}
		let loads = [player.load(mediaFile,'replace', options)];
		if (monitorEnabled) loads.push(playerMonitor.load(mediaFile,'replace', options));
		await Promise.all(loads);
		playerState.mediaType = 'song';
		player.play();
		if (monitorEnabled) {
			playerMonitor.play();
			playerMonitor.mute();
		}
		playerState.playerstatus = 'play';
		if (subFile) try {
			let subs = [player.addSubtitles(subFile)];
			if (monitorEnabled) subs.push(playerMonitor.addSubtitles(subFile));
			await Promise.all(subs);
		} catch(err) {
			logger.error(`[Player] Unable to load subtitles : ${err}`);
		}
		// Displaying infos about current song on screen.
		displaySongInfo(mediadata.infos);
		playerState.currentSongInfos = mediadata.infos;
		loadBackground('append');
		playerState._playing = true;
		emitPlayerState();
		songNearEnd = false;
	} catch(err) {
		logger.error(`[Player] Error loading media ${mediadata.media} : ${JSON.stringify(err)}`);
	}
}

export function setFullscreen(fsState) {
	playerState.fullscreen = fsState;
	if(fsState) {
		player.fullscreen();
	} else {
		player.leaveFullscreen();
	}
	return playerState.fullscreen;
}

export function toggleOnTop() {
	playerState.stayontop = !playerState.stayontop;
	player.command('keypress',['T']);
	return playerState.stayontop;
}

export function stop() {
	// on stop do not trigger onEnd event
	// => setting internal playing = false prevent this behavior
	logger.debug('[Player] Stop event triggered');
	playerState.playing = false;
	playerState.timeposition = 0;
	playerState._playing = false;
	playerState.playerstatus = 'stop';
	loadBackground();
	setState({player: playerState});
	return playerState;
}

export function pause() {
	logger.debug('[Player] Pause event triggered');
	player.pause();
	if (monitorEnabled) playerMonitor.pause();
	playerState.status = 'pause';
	setState({player: playerState});
	return playerState;
}

export function resume() {
	logger.debug('[Player] Resume event triggered');
	player.play();
	if (monitorEnabled) playerMonitor.play();
	playerState.playing = true;
	playerState._playing = true;
	playerState.playerstatus = 'play';
	setState({player: playerState});
	return playerState;
}

export function seek(delta) {
	if (monitorEnabled) playerMonitor.seek(delta);
	return player.seek(delta);
}

export function goTo(pos) {
	if (monitorEnabled) playerMonitor.goToPosition(pos);
	return player.goToPosition(pos);
}

export function mute() {
	return player.mute();
}

export function unmute() {
	return player.unmute();
}

export function setVolume(volume) {
	playerState.volume = volume;
	player.volume(volume);
	setState({player: playerState});
	return playerState;
}

export function hideSubs() {
	player.hideSubtitles();
	if (monitorEnabled) playerMonitor.hideSubtitles();
	playerState.showsubs = false;
	setState({player: playerState});
	return playerState;
}

export function showSubs() {
	player.showSubtitles();
	if (monitorEnabled) playerMonitor.showSubtitles();
	playerState.showsubs = true;
	setState({player: playerState});
	return playerState;
}

export async function message(message, duration) {
	if (!getState().player.ready) throw '[Player] Player is not ready yet!';
	logger.info(`[Player] I have a message from another time... : ${message}`);
	if (!duration) duration = 10000;
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an5}'+message,
			duration,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
	if (playerState.playing === false) {
		await sleep(duration);
		displayInfo();
	}
}

export async function displaySongInfo(infos) {
	displayingInfo = true;
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an1}'+infos,
			8000,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
	await sleep(8000);
	displayingInfo = false;
}

export function displayInfo(duration) {
	const conf = getConfig();
	if (!duration) duration = 100000000;
	let text = '';
	if (+conf.EngineDisplayConnectionInfo) text = `${conf.EngineDisplayConnectionInfoMessage} ${__('GO_TO')} ${conf.osURL} !`;
	const version = `Karaoke Mugen ${conf.VersionNo} (${conf.VersionName}) - http://karaokes.moe`;
	const message = '{\\fscx80}{\\fscy80}'+text+'\\N{\\fscx70}{\\fscy70}{\\i1}'+version+'{\\i0}';
	const command = {
		command: [
			'expand-properties',
			'show-text',
			'${osd-ass-cc/0}{\\an1}'+message,
			duration,
		]
	};
	player.freeCommand(JSON.stringify(command));
	if (monitorEnabled) playerMonitor.freeCommand(JSON.stringify(command));
}

export async function restartmpv() {
	await quitmpv();
	logger.debug('[Player] Stopped mpv (restarting)');
	emitPlayerState();
	await startmpv();
	logger.debug('[Player] restarted mpv');
	emitPlayerState();
	return true;
}

export async function quitmpv() {
	logger.debug('[Player] Quitting mpv');
	player.quit();
	// Destroy mpv instance.
	player = null;
	if (playerMonitor) {
		playerMonitor.quit();
		playerMonitor = null;
	}
	playerState.ready = false;
	return true;
}

export async function playJingle() {
	playerState.playing = true;
	playerState.mediaType = 'jingle';
	const jingle = getSingleJingle();
	if (jingle) {
		try {
			logger.debug(`[Player] Playing jingle ${jingle.file}`);
			let loads = [
				player.load(jingle.file,'replace',[`replaygain-fallback=${jingle.gain}`])
			];
			if (monitorEnabled) loads.push(playerMonitor.load(jingle.file,'replace',[`replaygain-fallback=${jingle.gain}`]));
			await Promise.all(loads);
			player.play();
			if (monitorEnabled) playerMonitor.play();
			displayInfo();
			playerState.playerstatus = 'play';
			loadBackground('append');
			playerState._playing = true;
			emitPlayerState();
		} catch(err) {
			logger.error(`[Player] Unable to load jingle file ${jingle.file} : ${JSON.stringify(err)}`);
		}
	} else {
		logger.debug('[Jingles] No jingle to play.');
		playerState.playerstatus = 'play';
		loadBackground();
		displayInfo();
		playerState._playing = true;
		emitPlayerState();
	}
}

