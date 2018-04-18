import {createPreviews, isPreviewAvailable} from '../_webapp/previews';
import {setConfig, mergeConfig, getConfig} from '../_common/utils/config';
import {initUserSystem, findUserByName} from '../_services/user';
import {initDBSystem, getStats, closeUserDatabase} from '../_dao/database';
import {initFrontend, emitWS} from '../_webapp/frontend';
import {initializationCatchphrases} from '../_services/constants';
import {initFavoritesSystem} from '../_services/favorites';
import {getAllTags} from '../_dao/tag';
import {addViewcount} from '../_dao/kara';
import {emit,on} from '../_common/utils/pubsub';
import {validateKaras} from '../_services/kara';
import {displayInfo, playJingle, quitmpv, restartmpv, toggleOnTop, setFullscreen, showSubs, hideSubs, seek, goTo, setVolume, mute, unmute, play, pause, stop, message, resume, initPlayerSystem} from '../_player/player';
import {now} from 'unix-timestamp';
import {welcomeToYoukousoKaraokeMugen} from '../_services/welcome';
import readlineSync from 'readline-sync';
import {promisify} from 'util';
import isEmpty from 'lodash.isempty';
import cloneDeep from 'lodash.clonedeep';
import sample from 'lodash.sample';
import {runBaseUpdate} from '../_updater/karabase_updater.js';
import {runKMUpdate} from '../_updater/software_updater.js';
import {openTunnel, closeTunnel} from '../_webapp/tunnel.js';
const plc = require('./playlist');
const logger = require('winston');
const sleep = promisify(setTimeout);

let publicState = {};
let state = {};

// Internal settings
let internalState = {
	currentPlaylistID: undefined,
	publicPlaylistID: undefined,
	playerNeedsRestart: false,
	currentlyPlayingKara: null,
	counterToJingle: 1
};

// Initial settings.
state.engine = {
	status: 'stop', // [stop,play,pause] // general engine status
	private: true, // [bool(true|false)] // karaoke mode
	fullscreen: false,
	ontop: true,
	frontendPort: null
};

state.player = {};

on('playingUpdated', () => {
	playingUpdated();
});

on('playerNeedsRestart', () => {
	if (state.engine.status === 'stop' && !internalState.playerNeedsRestart) {
		internalState.playerNeedsRestart = true;
		logger.info('[Engine] Player will restart in 5 seconds');
		sleep(5000).then(() => {
			restartPlayer().then(() => {
				internalState.playerNeedsRestart = false;
			});			
		});
	} else {
		internalState.playerNeedsRestart = true;	
	}	
});

on('modeUpdated', mode => {
	if (+mode === 0) setPrivate(false);
	if (+mode === 1) setPrivate(true);
});

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];
	emitPublicStatus();
});

on('publicStatusChange', () => {
	publicState = {
		playing: state.player.playing,
		private: state.engine.private,
		status: state.engine.status,
		onTop: state.engine.ontop,
		fullscreen: state.player.fullscreen,
		timePosition: state.player.timeposition,
		duration: state.player.duration,
		muteStatus: state.player.mutestatus,
		playerStatus: state.player.playerstatus,
		currentlyPlaying: state.engine.currentlyPlayingKara,
		subText: state.player.subtext,
		showSubs: state.player.showsubs,
		volume: state.player.volume,
	};
	if (state.player.ready) emitWS('playerStatus',publicState);
});

on('playerEnd', () => {
	playerEnding();
});

on('playerSkip', () => {
	next();
});

on('playerStatusChange', (states) => {
	//FIXME: Simplify this
	if (internalState.fullscreen !== states.fullscreen){
		internalState.fullscreen = states.fullscreen;
	}
	state.player = states[0];
	emitPublicStatus();
});

function emitPublicStatus() {
	emit('publicStatusChange');
}

function emitEngineStatus() {
	emit('engineStatusChange', state.engine);
}

async function restartPlayer() {
	try {
		await restartmpv();
		logger.info('[Engine] Player restart complete');
	} catch(err) {
		throw err;
	}
}

export async function initEngine() {
	const conf = getConfig();
	state.engine.frontendPort = conf.appFrontendPort;	
	state.engine.fullscreen = conf.PlayerFullScreen > 0;
	state.engine.ontop = conf.PlayerStayOnTop > 0;
	state.engine.private = conf.EnginePrivateMode > 0;
	if (conf.optValidateKaras) {
		try {
			logger.info('[Engine] Starting validation process, please wait...');
			await validateKaras();
			logger.info('[Engine] Validation completed successfully. Yayifications!');
			exit(0);
		} catch(err) {
			logger.error(`[Engine] Validation failed : ${err}`);
			exit(1);
		}
	}
	if (conf.optBaseUpdate) {		
		try {
			if (await runBaseUpdate()) setConfig({optGenerateDB: true});
			logger.info('[Updater] Done updating karaokes');
		} catch(err) {
			logger.error(`[Updater] Update failed : ${err}`);
			exit(1);
		}
	}
	if (conf.optSoftUpdate) {
		try {
			await runKMUpdate();
		} catch(err) {
			logger.error(`[Updater] Software update failed : ${err}`);
		}
	}
	//Database system is the foundation of every other system
	await initDBSystem();
	await initUserSystem();
	let inits = [];
	if (conf.EngineCreatePreviews > 0) {
		createPreviews();
	}
	if (conf.optOnline || conf.OnlineMode === 1) {
		state.engine.url = await openTunnel();		
	}
	inits.push(initPlayerSystem(state.engine));
	inits.push(initFrontend(conf.appFrontendPort));
	inits.push(initFavoritesSystem);
	//Initialize engine
	// Test if current/public playlists exist
	const currentPL_id = await plc.isACurrentPlaylist();
	if (currentPL_id) {
		internalState.currentPlaylistID = currentPL_id;
	} else {
		internalState.currentPlaylistID = await plc.createPlaylist(__('CURRENT_PLAYLIST'),1,1,0,0,'admin');
		logger.info('[Engine] Initial current playlist created');
		if (!conf.isTest) {
			inits.push(plc.buildDummyPlaylist(internalState.currentPlaylistID));
		}
	}
	const publicPL_id = await plc.isAPublicPlaylist();
	if (publicPL_id) {
		internalState.publicPlaylistID = publicPL_id;
	} else {
		internalState.publicPlaylistID = await plc.createPlaylist(__('PUBLIC_PLAYLIST'),1,0,1,0,'admin');
		logger.info('[Engine] Initial public playlist created');
	}
	await Promise.all(inits);
	let ready = 'READY';
	if (Math.floor(Math.random() * Math.floor(10)) >= 7) ready = 'LADY';
	logger.info(`[Engine] Karaoke Mugen is ${ready}`);
	const catchphrase = sample(initializationCatchphrases);
	console.log(`\n${catchphrase}\n`);
	if (!conf.isTest) welcomeToYoukousoKaraokeMugen(conf.appFrontendPort);
}

export function exit(rc) {
	logger.info('[Engine] Shutdown in progress');
	const conf = getConfig();
	//Exiting on Windows will require a keypress from the user to avoid the window immediately closing on an error.
	//On other systems or if terminal is not a TTY we exit immediately.
	// non-TTY terminals have no stdin support.
	
	if (conf.optOnline || conf.OnlineMode === 1) closeTunnel();

	if (state.player.ready) quitmpv();
	logger.info('[Engine] Player has shut down');

	closeUserDatabase().then(() => {
		logger.info('[Engine] Database closed');		
		console.log('\nMata ne !\n');
		if (process.platform !== 'win32' || !process.stdout.isTTY) process.exit(rc); 
		readlineSync.question('Press enter to exit', {hideEchoBack: true});
		process.exit(rc);	
	});
}

async function playPlayer() {
	if (state.engine.status !== 'play') {
		// Switch to playing mode and ask which karaoke to play next
		if (state.engine.status === 'pause') resume();
		if (state.engine.status === 'stop') await tryToReadKaraInPlaylist();
		state.engine.status = 'play';
		emitEngineStatus();
	}
	if (state.engine.status === 'play') {
		// resume current play if needed
		resume();
	}
}

function sendMessageToPlayer(string, duration) {
	logger.info('[Engine] I have a message from another time...');	
	message(string, duration);
}

function stopPlayer(now) {
	if (now) {
		logger.info('[Engine] Karaoke stopping NOW');
		stop();
	} else {
		plc.next();
		logger.info('[Engine] Karaoke stopping after current song');
	}
	if (state.engine.status !== 'stop') {
		state.engine.status = 'stop';
		emitEngineStatus();
	}
}

function pausePlayer() {
	pause();
	logger.info('[Engine] Karaoke paused');
	state.engine.status = 'pause';
	emitEngineStatus();
}

function mutePlayer() {
	logger.info('[Engine] Player muted');
	mute();
}

function unmutePlayer() {
	logger.info('[Engine] Player unmuted');
	unmute();
}

function seekPlayer(delta) {
	seek(delta);
}

function goToPlayer(seconds) {
	goTo(seconds);
}

function setVolumePlayer(volume) {
	setVolume(volume);
}

function showSubsPlayer() {
	logger.info('[Engine] Showing lyrics on screen');
	showSubs();
}

function hideSubsPlayer() {
	logger.info('[Engine] Hiding lyrics on screen');
	hideSubs();
}

async function prev() {
	logger.info('[Engine] Going to previous song');
	stopPlayer(true);
	try {
		await plc.prev();
		playPlayer();
	} catch(err) {
		logger.warn(`[Engine] Previous song is not available : ${err}`);
		// A failed previous means we restart the current song.
		playPlayer();
	}
}

async function next() {
	logger.info('[Engine] Going to next song');
	stopPlayer(true);
	try {
		await plc.next();
		playPlayer();
	} catch(err) {
		logger.warn(`[Engine] Next song is not available : ${err}`);
	}
}

function setPrivate(privateMode) {
	if (state.engine.private !== privateMode) {
		if (privateMode) {
			logger.info('[Engine] Karaoke mode switching to private');
		} else {
			logger.info('[Engine] Karaoke mode switching to public');
		}
	}
	state.engine.private = privateMode;	
	emitEngineStatus();
}

function toggleFullScreenPlayer() {
	state.engine.fullscreen = !state.engine.fullscreen;
	setFullscreen(state.engine.fullscreen);
	if (state.engine.fullscreen) {
		logger.info('[Engine] Player going to full screen');
	} else {
		logger.info('[Engine] Player going to windowed mode');
	}	
	emitEngineStatus();
}

function toggleOnTopPlayer() {
	state.engine.ontop = toggleOnTop();
	if (state.engine.ontop) {
		logger.info('[Engine] Player staying on top');
	} else {
		logger.info('[Engine] Player NOT staying on top');
	}
	emitEngineStatus();
}


async function playingUpdated() {
	if (state.engine.status === 'play' && state.player.playing) {
		await stopPlayer(true);
		playPlayer();
	}
}

async function playerEnding() {
	logger.debug('[Engine] Player Ending event triggered');
	if (internalState.playerNeedsRestart) {
		logger.info('[Engine] Player restarts, please wait');
		internalState.playerNeedsRestart = false;				
		await restartPlayer();
	}
	const conf = getConfig();
	logger.debug('[Jingles] Songs before next jingle : '+ (conf.EngineJinglesInterval - internalState.counterToJingle));
	if (internalState.counterToJingle >= conf.EngineJinglesInterval) {
		playJingle();
		internalState.counterToJingle = 0;
	} else {
		try {
			internalState.counterToJingle++;
			displayInfo();
			if (state.engine.status !== 'stop') {
				await plc.next();
				await tryToReadKaraInPlaylist();
			}
		} catch(err) {
			displayInfo();
			logger.warn(`[Engine] Next song is not available : ${err}`);
			stopPlayer();
		}
	}
}

async function tryToReadKaraInPlaylist() {
	if (!state.player.playing) {
		try {
			const kara = await plc.playCurrentSong();
			let karaForLogging = cloneDeep(kara);
			karaForLogging.path.subtitle = '[Not logging ASS data]';
			logger.debug('[PLC] Karaoke selected : ' + JSON.stringify(karaForLogging, null, '\n'));
			let serie = kara.serie;
			let title = kara.title;
			if (isEmpty(serie)) serie = kara.singer;
			if (isEmpty(title)) title = '';
			logger.info(`[Engine] Playing ${serie}${title}`);
			await play({
				video: kara.path.video,
				subtitle: kara.path.subtitle,
				gain: kara.gain,
				infos: kara.infos
			});
			state.engine.currentlyPlayingKara = kara.kara_id;
			emitEngineStatus();
			//Add a view to the viewcount
			addViewcountKara(kara.kara_id,kara.kid);
			//Free karaoke
			updateUserQuotas(kara);
			return true;
		} catch(err) {
			logger.error(`[Engine] Error during song playback : ${err}`);
			emitEngineStatus();
			if (state.engine.status !== 'stop') {
				logger.warn('[Player] Skipping playback due to missing video');
				next();
			} else {
				stopPlayer(true);
			}
		}
	}
}

async function updateUserQuotas(kara) {
	//If karaokes are present in the public playlist, we're marking it free.			
	//First find which KIDs are to be freed. All those before the currently playing kara 
	// are to be set free.
	let modePlaylist_id;
	if (state.engine.private) {
		modePlaylist_id = internalState.currentPlaylistID;
	} else {
		modePlaylist_id = internalState.publicPlaylistID;
	}	
	await plc.freePLCBeforePos(kara.pos, internalState.currentPlaylistID);
	// For every KID we check if it exists and add the PLC to a list
	const [publicPlaylist, currentPlaylist] = await Promise.all([
		plc.getPlaylistContentsMini(internalState.publicPlaylistID),
		plc.getPlaylistContentsMini(internalState.currentPlaylistID)
	]);	
	let freeTasks = [];
	let usersNeedingUpdate = [];
	for (const currentSong of currentPlaylist) {
		publicPlaylist.some(publicSong => {
			if (publicSong.kid === currentSong.kid && currentSong.flag_free === 1) {
				freeTasks.push(plc.freePLC(publicSong.playlistcontent_id));	
				if (!usersNeedingUpdate.includes(publicSong.user_id)) usersNeedingUpdate.push(publicSong.user_id);
				return true;
			}
			return false;
		});
	}
	await Promise.all(freeTasks);
	usersNeedingUpdate.forEach(user_id => {
		plc.updateSongsLeft(user_id,modePlaylist_id);	
	});		
}

async function addViewcountKara(kara_id, kid) {
	return await addViewcount(kara_id,kid,now());
}

function sortByRanking(a,b) {
	if (a.requested < b.requested) return -1;
	if (a.requested > b.requested) return 1;
	return 0;
}

export async function getTop50(filter,lang,from,size) {
	const karas = await getKaras(filter,lang,from,size);
	karas.sort(sortByRanking);
	return karas.slice(0,50);
}

export async function getKaras(filter,lang,from,size,token) {
	try {
		const pl = await plc.getAllKaras(token.username);
		let karalist = plc.translateKaraInfo(pl,lang);
		if (filter) karalist = plc.filterPlaylist(karalist,filter);
		return {
			infos: {
				count: karalist.length,
				from: from,
				to: from+size
			},
			content: karalist.slice(from,from+size)
		};
	} catch(err) {
		throw err;
	}
}

export async function getRandomKara(filter) {
	logger.debug('[Engine] Requesting a random song');
	return await plc.getRandomKara(internalState.currentPlaylistID,filter);
}

export async function getWL(filter,lang,from,size) {
	try {
		const pl = await plc.getWhitelistContents();
		let karalist = plc.translateKaraInfo(pl,lang);
		if (filter) karalist = plc.filterPlaylist(karalist,filter);
		return {
			infos: {
				count: karalist.length,
				from: from,
				to: from+size
			},
			content: karalist.slice(from,from+size)
		};
	} catch(err) {
		throw err;
	}
}

export async function getBL(filter,lang,from,size) {
	try {
		const pl = await plc.getBlacklistContents();
		let karalist = plc.translateKaraInfo(pl,lang);
		if (filter) karalist = plc.filterPlaylist(karalist,filter);
		return {
			infos: {
				count: karalist.length,
				from: from,
				to: from+size
			},
			content: karalist.slice(from,from+size)
		};
	} catch(err) {
		throw err;
	}
}

export async function getTags(lang) {
	const tags = await getAllTags();
	return await plc.translateTags(tags, lang);
}

export async function exportPL(playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);		
	try {
		logger.debug(`[Engine] Exporting playlist ${pl.name}`);
		return await plc.exportPlaylist(playlist_id);
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function importPL(playlist,username) {
	try {
		logger.debug(`[Engine] Importing playlist ${JSON.stringify(playlist,null,'\n')}`);
		return await plc.importPlaylist(playlist,username);
	} catch(err) {
		logger.error(err);
		throw err;
	}
}

export async function getBLC(lang) {
	const blcs = await plc.getBlacklistCriterias();
	return await plc.translateBlacklistCriterias(blcs, lang);
}

export async function addBLC(blctype, blcvalue) {
	let blcvalues;
	if (typeof blcvalue === 'string') {
		blcvalues = blcvalue.split(',');
	} else {
		blcvalues = [blcvalue];
	}
	logger.info(`[Blacklist] Adding criteria ${blctype} = ${blcvalues}`);
	return await plc.addBlacklistCriteria(blctype, blcvalues);
}

export async function deleteBLC(blc_id) {
	logger.info(`[Blacklist] Deleting criteria ${blc_id}`);
	return await plc.deleteBlacklistCriteria(blc_id);
}

export async function editBLC(blc_id, blctype, blcvalue) {
	logger.info(`[Blacklist] Editing criteria ${blc_id} : ${blctype} = ${blcvalue}`);
	return await plc.editBlacklistCriteria(blc_id, blctype, blcvalue);
}

export async function shufflePL(playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);
	try {
		await plc.shufflePlaylist(playlist_id);
		logger.info(`[Engine] Playlist ${pl.name} shuffled`);
		return pl.name;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function getKaraInfo(kara_id, lang, token) {
	const kara = await plc.getKara(kara_id, token.username);
	let output = plc.translateKaraInfo(kara, lang);
	const previewfile = await isPreviewAvailable(output[0].videofile);
	if (previewfile) output[0].previewfile = previewfile;
	return output;
}


export async function getPLCInfo(plc_id, lang, userToken) {
	const kara = await plc.getKaraFromPlaylist(plc_id, userToken);
	let output = plc.translateKaraInfo(kara, lang);
	const previewfile = await isPreviewAvailable(output[0].videofile);
	if (previewfile) output[0].previewfile = previewfile;
	return output;
}

export async function getAllPLs(token) {
	let seenFromUser = true;
	if (token.role === 'admin') seenFromUser = false;
	return await plc.getPlaylists(seenFromUser,token.username);
}

export async function createPL(playlist,username) {
	return await plc.createPlaylist(
		playlist.name,
		playlist.flag_visible,
		playlist.flag_current,
		playlist.flag_public,
		0,
		username);
}

export async function getPLInfo(playlist_id, token) {
	if (!await testPlaylistVisible(playlist_id,token)) throw `Playlist ${playlist_id} unknown`;
	return await plc.getPlaylistInfo(playlist_id);
}

export async function deletePL(playlist_id, token) {
	const pl = await plc.getPlaylistInfo(playlist_id);
	if (!pl) {
		throw {
			message: 'Playlist unknown',
			data: null
		};
	}
	try {
		logger.info(`[Engine] Deleting playlist ${pl.name} (by ${token.username})`);
		return await plc.deletePlaylist(playlist_id, token);
	} catch(err) {		
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function deleteKara(plc_ids,playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);
	let karas;
	if (typeof plc_ids === 'string') {
		karas = plc_ids.split(',');
	} else {
		karas = [plc_ids];
	}
	const plcData = await plc.getPLCInfoMini(karas[0]);
	logger.info(`[Engine] Deleting karaokes from playlist ${pl.name} : ${plcData.title}...`);	
	try {
		await plc.deleteKaraFromPlaylist(karas, playlist_id);
		return {
			pl_id: playlist_id,
			pl_name: pl.name
		};
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function deleteWLC(wlc_ids) {
	logger.info(`[Engine] Deleting karaokes from whitelist : ${wlc_ids}`);
	let karas;
	if (typeof wlc_ids === 'string') {
		karas = wlc_ids.split(',');
	} else {
		karas = [wlc_ids];
	}
	return await plc.deleteKaraFromWhitelist(karas);
}

export async function editPLC(plc_id, pos, flag_playing, token) {
	const plcData = await plc.getPLCInfoMini(plc_id);
	if (!plcData) throw 'PLC ID unknown';
	if (!await testPlaylistVisible(plcData.playlist_id,token)) throw `Playlist ${plc.playlist_id} unknown`;
	return await plc.editKaraFromPlaylist(plc_id, pos, flag_playing, token);
}

export async function updateSettings(newConfig) {	
	const conf = getConfig();
	if (!isEmpty(newConfig.EngineConnectionInfoHost)) {
		state.player.url = `http://${newConfig.EngineConnectionInfoHost}`;		
	} else {
		state.player.url = `http://${conf.osHost}:${state.engine.frontendPort}`;
	}
	emit('playerStatusChange', state.player);
	return await mergeConfig(conf, newConfig);				
}

export async function editPL(playlist_id, playlist) {
	try {
		logger.info(`[Engine] Editing playlist ${playlist_id} : ${JSON.stringify(playlist)}`);
		return await plc.editPlaylist(playlist_id,playlist.name,playlist.flag_visible);
	} catch(err) {
		const pl = await plc.getPlaylistInfo(playlist_id);
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function setCurrentPL(playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);
	try {
		logger.info(`[Engine] Playlist ${pl.name} is now current`);
		await plc.setCurrentPlaylist(playlist_id);
		emitWS('playlistInfoUpdated', internalState.currentPlaylistID);
		internalState.currentPlaylistID = playlist_id;
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function setPublicPL(playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);		
	try {
		logger.info(`[Engine] Playlist ${pl.name} is now public`);
		await plc.setPublicPlaylist(playlist_id);
		emitWS('playlistInfoUpdated', internalState.publicPlaylistID);
		internalState.publicPlaylistID = playlist_id;
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export function shutdown() {
	logger.info('[Engine] Dropping the mic, shutting down!');
	exit(0);	
}

export async function emptyPL(playlist_id) {
	const pl = await plc.getPlaylistInfo(playlist_id);		
	try {
		logger.info(`[Engine] Emptying playlist ${pl.name}`);
		await plc.emptyPlaylist(playlist_id);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function emptyBLC() {
	logger.info('[Blacklist] Wiping criterias');
	return await plc.emptyBlacklistCriterias();
}

export async function emptyWL() {
	logger.info('[Whitelist] Wiping whitelist');
	return await plc.emptyWhitelist();
}

async function testPlaylistVisible(playlist_id, token) {
	let seenFromUser = false;
	const user = await findUserByName(token.username);
	if (token.role !== 'admin' && user.favoritesPlaylistID === playlist_id) seenFromUser = true;
	if (!await plc.isPlaylist(playlist_id,seenFromUser)) return false;
	return true;
}

export async function getPLContents(playlist_id,filter,lang,token,from,size) {
	try {
		if (!await testPlaylistVisible(playlist_id,token)) throw `Playlist ${playlist_id} unknown`;
		const pl = await plc.getPlaylistContents(playlist_id,token);
		let karalist = plc.translateKaraInfo(pl,lang);
		if (filter) karalist = plc.filterPlaylist(karalist,filter);
		if (from === -1) {
			const pos = plc.getPlayingPos(karalist);
			if (!pos) {
				from = 0;
			} else {
				from = pos.index;
			}
		}
		return {
			infos: {
				count: karalist.length,
				from: from,
				to: from+size
			},
			content: karalist.slice(from,from+parseInt(size,10))
		};
	} catch(err) {
		const pl = await plc.getPlaylistInfo(playlist_id);
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function getCurrentPLInfo() {
	return await plc.getPlaylistInfo(internalState.currentPlaylistID);
}

export async function getCurrentPLContents(filter,lang,from,size) {	
	return await getPLContents(internalState.currentPlaylistID, filter, lang, true, from, size);
}

export async function getPublicPLInfo() {
	return await plc.getPlaylistInfo(internalState.publicPlaylistID);
}

export async function getPublicPLContents(filter,lang,from,size) {
	return await getPLContents(internalState.publicPlaylistID, filter, lang, true, from, size);
}

export async function addKaraToPL(playlist_id, kara_id, requester, pos) {
	let addByAdmin = true;
	const conf = getConfig();
	let errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR';
	let karas;
	if (typeof kara_id === 'string') {
		karas = kara_id.split(',');
	} else {
		karas = [kara_id];
	}
	if (!playlist_id) {
		addByAdmin = false;
		if (state.engine.private) {
			playlist_id = internalState.currentPlaylistID;
		} else {
			playlist_id = internalState.publicPlaylistID;
		}
	}
	let [pl, kara] = await Promise.all([
		plc.getPlaylistInfo(playlist_id),
		plc.getKara(parseInt(karas[0], 10))
	]);
	if (!pl) pl = {};
	if (!kara) kara = {};
	try {
		logger.info(`[Engine] Adding ${karas.length} karaokes to playlist ${pl.name || 'unknown'} by ${requester} : ${kara.title || 'unknown'}...`);
		
		if (!addByAdmin) {
			// Check user quota first
			if (!await plc.isUserAllowedToAddKara(playlist_id,requester)) {
				errorCode = 'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED';
				throw 'User quota reached';
			}
		}
		await plc.addKaraToPlaylist(karas, requester, playlist_id, pos);
		if (+conf.EngineAutoPlay === 1 &&
			+playlist_id === internalState.currentPlaylistID &&
			state.engine.status === 'stop' ) {
			playPlayer();
		}		
		if (addByAdmin) {
			return {
				playlist: pl.name
			};
		} else {
			return {
				kara: kara.title,
				playlist: pl.name,
				kara_id: parseInt(kara_id, 10),
				playlist_id: playlist_id
			};
		}
	} catch(err) {
		logger.error(`[Engine] Unable to add karaokes : ${err}`);
		throw {
			code: errorCode,
			message: err,
			data: {
				kara: karas,
				playlist: pl.name,
				user: requester
			}
		};		
	}
}

export async function copyKaraToPL(plc_id, playlist_id, pos) {
	const plcs = plc_id.split(',');
	const [plcData, pl] = await Promise.all([
		plc.getPLCInfoMini(plcs[0]),
		plc.getPlaylistInfo(playlist_id)
	]);	
	logger.info(`[Engine] Copying ${plcs.length} karaokes to playlist ${pl.name} : ${plcData.title}...`);	
	try {
		await plc.copyKaraToPlaylist(plcs, playlist_id, pos);
		return playlist_id;
	} catch(err) {
		throw {
			message: err,
			data: pl.name
		};
	}
}

export async function addKaraToWL(kara_id) {
	let karas;
	if (typeof kara_id === 'string') {
		karas = kara_id.split(',');
	} else {
		karas = [kara_id];
	}
	const kara = await plc.getKara(parseInt(karas[0], 10));	
	logger.profile(`[Whitelist] Adding ${karas.length} karaokes to whitelist : ${kara.title}...`);
	try {
		return await plc.addKaraToWhitelist(karas);
	} catch(err) {
		throw {
			message: err,
			data: karas
		};
	}
}

export function sendMessage(message, duration) {
	sendMessageToPlayer(message, duration);
}

export async function sendCommand(command, options) {
	if (!state.player.ready) throw '[Player] Player is not ready yet!';
	switch (command) {
	case 'play':
		playPlayer();
		break;
	case 'stopNow':
		stopPlayer(true);
		break;
	case 'pause':
		pausePlayer();
		break;
	case 'stopAfter':
		stopPlayer();
		await plc.next();		
		break;
	case 'skip':
		next();
		break;
	case 'prev':
		prev();
		break;
	case 'toggleFullscreen':
		toggleFullScreenPlayer();
		break;
	case 'toggleAlwaysOnTop':
		toggleOnTopPlayer();
		break;
	case 'mute':
		mutePlayer();
		break;
	case 'unmute':
		unmutePlayer();
		break;
	case 'showSubs':
		showSubsPlayer();
		break;
	case 'hideSubs':
		hideSubsPlayer();
		break;
	case 'seek':
		if (!options && typeof options !== 'undefined') options = 0;
		if (isNaN(options)) throw 'Command seek must have a numeric option value';
		seekPlayer(options);
		break;
	case 'goTo':
		if (!options && typeof options !== 'undefined') options = 0;
		if (isNaN(options)) throw 'Command goTo must have a numeric option value';
		goToPlayer(options);
		break;
	case 'setVolume':
		if (!options && typeof options !== 'undefined') throw 'Command setVolume must have a value';
		if (isNaN(options)) throw 'Command setVolume must have a numeric option value';
		setVolumePlayer(options);
		break;
	default:
		// Unknown commands are not possible, they're filtered by API's validation.
		break;
	}
}

export function getPlayerStatus() {
	return publicState;
}

export async function getKMStats() {
	return await getStats();
}

export async function getLyrics(kara_id) {
	return await plc.getKaraLyrics(kara_id);
}
