import logger from 'winston';
import {resolvedPathBackgrounds, getConfig} from '../_common/utils/config';
import {resolve, join} from 'path';
import {resolveFileInDirs, isImageFile, asyncReadDir, asyncCopy, asyncExists} from '../_common/utils/files';
import remove from 'lodash.remove';
import sample from 'lodash.sample';
import isEmpty from 'lodash.isempty';
import {emit,on} from '../_common/utils/pubsub';
import sizeOf from 'image-size';
import {buildJinglesList} from './jingles';
import {buildQRCode} from './qrcode';
import {spawn} from 'child_process';
import {exit} from '../_services/engine';
import mpv from 'node-mpv';
import {promisify} from 'util';

const sleep = promisify(setTimeout);
let currentJinglesList = [];
let jinglesList = [];
let displayingInfo = false;
let player;
let state = {};

state.player = {
	volume: 100,
	playing: false,
	playerstatus: 'stop',
	_playing: false, // internal delay flag
	timeposition: 0,
	duration: 0,
	mutestatus: false,
	subtext: null,
	currentSongInfos: null,
	videoType: 'background',
	showsubs: true,
	stayontop: false,
	fullscreen: false,
	ready: false,
	url: null
};

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];	
});

on('playerStatusChange', (newstate) => {
	state.player = newstate[0];	
});

on('jinglesReady', (list) => {
	jinglesList = Array.prototype.concat(list[0]);	
	currentJinglesList = Array.prototype.concat(jinglesList); 
});

function emitPlayerState() {
	emit('playerStatusChange',state.player);
}

function emitPlayerEnd() {
	emit('playerEnd');
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
	if (!isEmpty(conf.PlayerBackground)) {
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
	if (conf.EngineDisplayConnectionInfoQRCode !== 0 && 
		conf.EngineDisplayConnectionInfo !== 0) {			
		const dimensions = sizeOf(backgroundImageFile);
		let QRCodeWidth;
		let QRCodeHeight;
		QRCodeWidth = QRCodeHeight = Math.floor(dimensions.width*0.10);

		const posX = Math.floor(dimensions.width*0.015);
		const posY = Math.floor(dimensions.height*0.015);
		const qrCode = resolve(conf.appPath,conf.PathTemp,'qrcode.png').replace(/\\/g,'/');
		videofilter = `lavfi-complex="movie=\\'${qrCode}\\'[logo]; [logo][vid1]scale2ref=${QRCodeWidth}:${QRCodeHeight}[logo1][base];[base][logo1] overlay=${posX}:${posY}[vo]"`;
	} 
	try {
		await player.load(backgroundImageFile,mode,videofilter);
		if (mode === 'replace') displayInfo();
	} catch(err) {
		logger.error(`[Player] Unable to load background in ${mode} mode : ${JSON.stringify(err)}`);
	}
}

function configureURL() {
	const conf = getConfig();	
	if (!isEmpty(conf.EngineConnectionInfoHost)) {
		state.player.url = `http://${conf.EngineConnectionInfoHost}`;
	} else {
		if (state.engine.url) {
			state.player.url = state.engine.url;
		} else {
			if (state.engine.frontendPort === 80) {
				state.player.url = `http://${conf.osHost}`;
			} else {
				state.player.url = `http://${conf.osHost}:${state.engine.frontendPort}`;
			}			
		}		
	}	
}

export async function initPlayerSystem(initialState) {
	const conf = getConfig();
	state.player.fullscreen = initialState.fullscreen;
	state.player.stayontop = initialState.ontop;
	state.engine = initialState;
	buildJinglesList();
	configureURL();
	await buildQRCode(state.player.url);
	logger.debug('[Player] QRCode generated');
	if (!conf.isTest) await startmpv();
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
			//FIXME : test if output.spit(' ')[1] is actually a valid version number
			// using the semver format.
			resolve (output.split(' ')[1]);			
		});
	});
}

async function startmpv() {
	const conf = getConfig();
	let mpvOptions = [
		'--keep-open=yes',
		'--fps=60',
		'--no-border',
		'--osd-level=0',
		'--sub-codepage=UTF-8-BROKEN',
		'--volume='+state.player.volume,
		'--input-conf='+resolve(conf.appPath,conf.PathTemp,'input.conf'),
	];
	if (conf.PlayerPIP) {
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
	if (!isEmpty(conf.mpvVideoOutput)) {
		mpvOptions.push(`--vo=${conf.mpvVideoOutput}`);
	} else {
		//Force direct3d for Windows users
		if (conf.os === 'win32') mpvOptions.push('--vo=direct3d');
	}
	if (!isEmpty(conf.PlayerScreen)) {
		mpvOptions.push(`--screen=${conf.PlayerScreen}`);
		mpvOptions.push(`--fs-screen=${conf.PlayerScreen}`);
	}
	// Fullscreen is disabled if pipmode is set.
	if (conf.PlayerFullscreen === 1 && !conf.PlayerPIP) {
		mpvOptions.push('--fullscreen');
		state.player.fullscreen = true;		
	}
	if (conf.PlayerStayOnTop === 1) {
		state.player.stayontop = true;
		mpvOptions.push('--ontop');
	}
	if (conf.PlayerNoHud === 1) mpvOptions.push('--no-osc');
	if (conf.PlayerNoBar === 1) mpvOptions.push('--no-osd-bar');			
	//On all platforms, check if we're using mpv at least version 0.20 or abort saying the mpv provided is too old. 
	//Assume UNKNOWN is a compiled version, and thus the most recent one.
	const mpvVersion = await getmpvVersion(conf.BinmpvPath);
	const mpvVersionSplit = mpvVersion.split('.');
	logger.debug(`[Player] mpv version : ${mpvVersion}`);	
	
	//If we're on macOS, add --no-native-fs to get a real
	// fullscreen experience on recent macOS versions.
	if (parseInt(mpvVersionSplit[1], 10) < 25) {
		// Version is too old. Abort.
		logger.error(`[Player] mpv version detected is too old (${mpvVersion}). Upgrade your mpv from http://mpv.io to at least version 0.25`);
		logger.error(`[Player] mpv binary : ${conf.BinmpvPath}`);
		logger.error('[Player] Exiting due to obsolete mpv version');
		exit(1);
	}
	if (conf.os === 'darwin' && parseInt(mpvVersionSplit[1], 10) > 26) mpvOptions.push('--no-native-fs');
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
	// Starting up mpv
	try {
		await player.start();		
	} catch(err) {
		logger.error(`[Player] mpvAPI : ${err}`);
		throw err;
	}
	await loadBackground();	
	player.observeProperty('sub-text',13);
	player.observeProperty('volume',14);
	player.on('statuschange',(status) => {
		// si on affiche une image il faut considérer que c'est la pause d'après chanson
		if (state.player._playing && status && status.filename && status.filename.match(/\.(png|jp.?g|gif)/i)) {
			// immediate switch to Playing = False to avoid multiple trigger
			state.player.playing = false;
			state.player._playing = false;
			state.player.playerstatus = 'stop';
			player.pause();
			state.player.videoType = 'background';
			emitPlayerEnd();
		}
		state.player.mutestatus = status.mute;
		state.player.duration = status.duration;
		state.player.subtext = status['sub-text'];
		state.player.volume = status.volume;
		state.player.fullscreen = status.fullscreen;
		emitPlayerState();		
	});
	player.on('paused',() => {
		logger.debug('[Player] Paused event triggered');
		state.player.playing = false;
		state.player.playerstatus = 'pause';
		emitPlayerState();		
	});
	player.on('resumed',() => {
		logger.debug('[Player] Resumed event triggered');
		state.player.playing = true;
		state.player.playerstatus = 'play';
		emitPlayerState();		
	});
	player.on('timeposition',(position) => {
		// Returns the position in seconds in the current song
		state.player.timeposition = position;						
		emitPlayerState();		
		// Display informations if timeposition is 8 seconds before end of song
		if (position >= (state.player.duration - 8) && 
						!displayingInfo &&
						state.player.videoType === 'song')						
			displaySongInfo(state.player.currentSongInfos);
		if (Math.floor(position) === Math.floor(state.player.duration / 2) && !displayingInfo && state.player.videoType === 'song') displayInfo(8000);
	});
	logger.debug('[Player] mpv initialized successfully');
	state.player.ready = true;	
	return true;
}

export async function play(videodata) {
	const conf = getConfig();
	logger.debug('[Player] Play event triggered');		
	state.player.playing = true;
	//Search for video file in the different PathVideos
	const PathsVideos = conf.PathVideos.split('|');
	let videoFile;
	try {
		videoFile = await resolveFileInDirs(videodata.video,PathsVideos);
	} catch (err) {
		logger.debug(`[Player] Error while resolving video path : ${err}`);
		logger.warn(`[Player] Video NOT FOUND : ${videodata.video}`);
		if (conf.PathVideosHTTP) {
			videoFile = `${conf.PathVideosHTTP}/${encodeURIComponent(videodata.video)}`;
			logger.info(`[Player] Trying to play video directly from the configured http source : ${conf.PathVideosHTTP}`);
		} else {
			throw `No video source for ${videodata.video} (tried in ${PathsVideos.toString()} and HTTP source)`;
		}
	}	
	logger.debug(`[Player] Audio gain adjustment : ${videodata.gain}`);
	logger.debug(`[Player] Loading video : ${videoFile}`);		
	try { 
		await player.load(videoFile,'replace',[`replaygain-fallback=${videodata.gain}`]);
		state.player.videoType = 'song';
		player.play();
		state.player.playerstatus = 'play';
		if (videodata.subtitle) player.addSubtitles(`memory://${videodata.subtitle}`);
		// Displaying infos about current song on screen.					
		displaySongInfo(videodata.infos);
		state.player.currentSongInfos = videodata.infos;
		loadBackground('append');
		state.player._playing = true;
		emitPlayerState();
	} catch(err) {
		logger.error(`[Player] Error loading video ${videodata.video} : ${JSON.stringify(err)}`);
	}	
}

export function setFullscreen(fsState) {
	state.player.fullscreen = fsState;
	if(fsState) {
		player.fullscreen();
	} else {
		player.leaveFullscreen();
	}
	return state;
}

export function toggleOnTop() {
	state.player.stayontop = !state.player.stayontop;
	player.command('keypress',['T']);
	return state.player.stayontop;
}

export function stop() {
	// on stop do not trigger onEnd event
	// => setting internal playing = false prevent this behavior
	logger.debug('[Player] Stop event triggered');
	state.player.playing = false;
	state.player.timeposition = 0;
	state.player._playing = false;
	state.player.playerstatus = 'stop';
	loadBackground();
	return state;
}

export function pause() {
	logger.debug('[Player] Pause event triggered');
	player.pause();
	state.playerstatus = 'pause';
	return state;
}

export function resume() {
	logger.debug('[Player] Resume event triggered');
	player.play();
	state.player.playing = true;
	state.player._playing = true;
	state.player.playerstatus = 'play';
	return state;
}

export function seek(delta) {
	return player.seek(delta);
}

export function goTo(pos) {
	return player.goToPosition(pos);
}

export function mute() {
	return player.mute();
}

export function unmute() {
	return player.unmute();
}

export function setVolume(volume) {
	state.player.volume = volume;
	player.volume(volume);
	return state;
}

export function hideSubs() {
	player.hideSubtitles();
	state.player.showsubs = false;
	return state;
}

export function showSubs() {
	player.showSubtitles();
	state.player.showsubs = true;
	return state;
}

export async function message(message, duration) {
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
	if (state.player.playing === false) {
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
	await sleep(8000);
	displayingInfo = false;		
}

export function displayInfo(duration) {
	const conf = getConfig();
	if (!duration) duration = 100000000;
	let text = '';
	if (conf.EngineDisplayConnectionInfo !== 0) {
		text = __('GO_TO')+' '+state.player.url+' !';	
		if (!isEmpty(conf.EngineDisplayConnectionInfoMessage)) text = conf.EngineDisplayConnectionInfoMessage + ' - ' + text;
	}

	const version = `Karaoke Mugen ${conf.VersionNo} (${conf.VersionName}) - http://mugen.karaokes.moe`;
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
	state.player.ready = false;	
	return true;
}

export async function skip() {

}

export async function playJingle() {
	state.player.playing = true;
	state.player.videoType = 'jingle';
	if (currentJinglesList.length > 0) {
		logger.info('[Player] Jingle time !');
		const jingle = sample(currentJinglesList);
		//Let's remove the jingle we just selected so it won't be picked again next time.
		remove(currentJinglesList, (j) => {	
			return j.file === jingle.file;
		});
		//If our current jingle files list is empty after the previous removal
		//Fill it again with the original list.
		if (currentJinglesList.length === 0) {
			currentJinglesList = Array.prototype.concat(jinglesList);	
		}
		logger.debug('[Player] Playing jingle '+jingle.file);
		if (!isEmpty(jingle)) {
			try { 
				await player.load(jingle.file,'replace',[`replaygain-fallback=${jingle.gain}`]);
				player.play();						
				displayInfo();
				state.player.playerstatus = 'play';
				loadBackground('append');
				state.player._playing = true;
				emitPlayerState();
			} catch(err) {
				logger.error(`[Player] Unable to load jingle file ${jingle.file} with gain modifier ${jingle.gain} : ${JSON.stringify(err)}`);				
			}			
		} else {				
			state.player.playerstatus = 'play';
			loadBackground();
			displayInfo();
			state._playing = true;
			emitPlayerState();
		}
	} else {
		logger.debug('[Jingle] No jingle to play.');
		state.player.playerstatus = 'play';
		loadBackground();
		displayInfo();
		state.player._playing = true;
		emitPlayerState();
	}
}

