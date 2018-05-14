import {uuidRegexp} from './constants';
import {getStats} from '../_dao/database';
import {ASSToLyrics} from '../_common/utils/ass';
import {getConfig} from '../_common/utils/config';
import {findUserByID, findUserByName} from '../_services/user';
import {resolve} from 'path';
import {now} from 'unix-timestamp';
import logger from 'winston';
import deburr from 'lodash.deburr';
import isEmpty from 'lodash.isempty';
import sample from 'lodash.sample';
import shuffle from 'lodash.shuffle';
import langs from 'langs';
import {getLanguage} from 'iso-countries-languages';
import {emitWS} from '../_webapp/frontend';
import {emit} from '../_common/utils/pubsub';
const blcDB = require('../_dao/blacklist');
const tagDB = require('../_dao/tag');
const wlDB = require('../_dao/whitelist');
const karaDB = require('../_dao/kara');
const plDB = require('../_dao/playlist');


function emitPlayingUpdated() {
	emit('playingUpdated');
}

export function getPlayingPos(playlist) {
	// Function to run in array.some of a playlist to check if a kara is a flag_playing one, and get its position.
	let PLCIDPlayingPos;
	let indexPlaying;
	const isASongFlagPlaying = playlist.some((element,index) => {
		if (element.flag_playing === 1) {
			PLCIDPlayingPos = element.pos;
			indexPlaying = index;
			return true;
		}
		return false;		
	});
	if (isASongFlagPlaying) {
		return {
			plc_id_pos: PLCIDPlayingPos,
			index: indexPlaying
		};
	}
	return undefined;	
}

export async function freePLC(plc_id) {
	return await plDB.setPLCFree(plc_id);
}

export async function freePLCBeforePos(pos, playlist_id) {
	await plDB.setPLCFreeBeforePos(pos, playlist_id);	
}

export async function updateSongsLeft(user_id,playlist_id) {
	const conf = getConfig();
	const user = await findUserByID(user_id);	
	let songsLeft;
	if (!playlist_id) {
		if (conf.EnginePrivateMode === 1) {
			playlist_id = await isACurrentPlaylist();				
		} else {
			playlist_id = await isAPublicPlaylist();
		}
	}			
	if (user.flag_admin === 0) {
		const count = await karaDB.getSongCountForUser(playlist_id,user_id);
		songsLeft = conf.EngineSongsPerUser - count.count;
	} else {
		songsLeft = -1;
	}
	logger.debug(`[User] Updating songs left for ${user.login} : ${songsLeft}`);
	emitWS('songsAvailableUpdated', {
		username: user.login,
		songsLeft: songsLeft
	});		
}

export async function isUserAllowedToAddKara(playlist_id,requester) {
	const limit = getConfig().EngineSongsPerUser;
	try {
		const user = await findUserByName(requester);
		const count = await karaDB.getSongCountForUser(playlist_id,user.id);	
		if (count.count >= limit) {
			logger.info(`[PLC] User ${requester} tried to add more songs than he/she was allowed (${limit})`);
			return false;
		} else {
			return true;
		}
	} catch (err) {
		throw err;
	}
}

export async function isCurrentPlaylist(playlist_id) {
	if (await isPlaylist(playlist_id)) {
		const res = await plDB.findCurrentPlaylist();
		const pl_id = parseInt(playlist_id, 10);
		return res.playlist_id === pl_id;
	}
	return false;
}
					
export async function isPublicPlaylist(playlist_id) {
	if (await isPlaylist(playlist_id)) {
		const res = await plDB.findPublicPlaylist();		
		const pl_id = parseInt(playlist_id, 10);
		return res.playlist_id === pl_id;
	}
	return false;
}


export async function isACurrentPlaylist() {
	const res = await plDB.findCurrentPlaylist();
	if (res) {
		return res.playlist_id;
	}
	return false;	
}

export async function isAPublicPlaylist() {
	const res = await plDB.findPublicPlaylist();
	if (res) {
		return res.playlist_id;
	} 
	return false;	
}

async function setPlaying(plc_id,playlist_id) {	
	await plDB.unsetPlaying(playlist_id);
	if (plc_id) await plDB.setPlaying(plc_id);		
	emitWS('playingUpdated',{
		playlist_id: playlist_id,
		plc_id: plc_id,
	});
	await updatePlaylistDuration(playlist_id);
	return true;							
}

async function getPLCIDByDate (playlist_id,date_added) {
	return await plDB.getPLCByDate(playlist_id,date_added);	
}
			
async function generateBlacklist() {
	return await blcDB.generateBlacklist();
}				

async function BLCgetTagName(blcList) {
	for (const index in blcList) {
		const res = await tagDB.getTag(blcList[index].blcvalue);
		if (res) blcList[index].blcuniquevalue = res.name;
	}
	return blcList;	
}

async function BLCGetKID(blcList) {
	for (const index in blcList) {
		const res = await karaDB.getKara(blcList[index].blcvalue);
		if (res) blcList[index].blcuniquevalue = res.kid;
	}
	return blcList;	
}

export async function addBlacklistCriteria(blctype, blcvalues) {
	let blcList = [];
	blcvalues.forEach(function(blcvalue){
		blcList.push({
			blcvalue: blcvalue,
			blctype: parseInt(blctype, 10)
		});				
	});	
	if (blctype < 0 && blctype > 1004) throw `Incorrect BLC type (${blctype})`;
	if (blctype > 0 && blctype < 1000) blcList = await BLCgetTagName(blcList);
	if (+blctype === 1001) blcList = await BLCGetKID(blcList);
	if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && blcvalues.some(isNaN)) {
		let err = 'Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!';
		logger.error('[PLC] '+err);
		throw err;
	} else {
		await blcDB.addBlacklistCriteria(blcList);
		await generateBlacklist();
		return true;
	}
}

async function isAllKaras(karas) {	
	let err;
	for (const kara_id of karas) {
		if (!await isKara(kara_id)) err = true;
	}		
	if (err) {
		return false;
	} else {
		return true;
	}
}

export async function addKaraToWhitelist(karas) {	
	const karasInWhitelist = await getWhitelistContents();
	if (!await isAllKaras(karas)) throw 'One of the karaokes does not exist.';
	const karaList = isAllKarasInPlaylist(karas,karasInWhitelist);
	if (karaList.length === 0) throw 'No karaoke could be added, all are in whitelist already';
	await karaDB.addKaraToWhitelist(karaList,now());
	await generateBlacklist();
	return karaList;
}

export async function getKaraLyrics(kara_id) {
	if (!await isKara(kara_id)) throw `Kara ${kara_id} unknown`;
	const ASS = await getASS(kara_id);
	if (ASS) return ASSToLyrics(ASS);
	return 'Lyrics not available for this song';		
}

async function getASS(kara_id) {
	const ASS = await karaDB.getASS(kara_id);
	if (ASS) return ASS.ass;
	return false;
}

export async function deleteBlacklistCriteria(blc_id) {
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	await blcDB.deleteBlacklistCriteria(blc_id);
	await generateBlacklist();
}

export async function editBlacklistCriteria(blc_id, blctype, blcvalue) {
	if (!await isBLCriteria(blc_id)) throw `BLC ID ${blc_id} unknown`;
	if (blctype < 0 && blctype > 1004) throw `Blacklist criteria type error : ${blctype} is incorrect`;
	if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && (isNaN(blcvalue))) throw `Blacklist criteria type mismatch : type ${blctype} must have a numeric value!`;		
	await blcDB.editBlacklistCriteria({
		id: blc_id,
		type: blctype,
		value: blcvalue
	});
	await generateBlacklist();	
}

export async function isPlaylist(playlist_id,seenFromUser) {
	return await plDB.findPlaylist(playlist_id,seenFromUser);	
}

async function isPlaylistFlagPlaying(playlist_id) {
	return await plDB.findPlaylistFlagPlaying(playlist_id);	
}

async function isKara(kara_id) {	
	return await karaDB.isKara(kara_id);	
}


async function isBLCriteria(blc_id) {
	return await blcDB.isBLCriteria(blc_id);
}

async function isKaraInPlaylist(kara_id,playlist_id) {
	return await karaDB.isKaraInPlaylist(kara_id,playlist_id);
}

export async function trimPlaylist(playlist_id,duration) {
	const durationSecs = duration * 60;
	let durationPL = 0;
	let lastPos = 1;
	const pl = await getPlaylistContentsMini(playlist_id);
	const needsTrimming = pl.some((kara) => {
		lastPos = kara.pos;
		durationPL = durationPL + kara.duration;
		if (durationPL > durationSecs) return true;
		return false;
	});
	if (needsTrimming) await plDB.trimPlaylist(playlist_id,lastPos);
	await Promise.all([updatePlaylistLastEditTime(playlist_id),
		updatePlaylistDuration(playlist_id),
		updatePlaylistKaraCount(playlist_id)
	]);
}

export async function setCurrentPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (pl.flag_public === 1) throw 'A current playlist cannot be set to public. Set another playlist to current first.';
	if (pl.flag_favorite === 1) throw 'A favorite playlist cannot be set to public.';
	await unsetCurrentAllPlaylists();
	await Promise.all([
		plDB.setCurrentPlaylist(playlist_id),
		updatePlaylistLastEditTime(playlist_id)
	]);	
}

export async function setVisiblePlaylist(playlist_id) {
	
	const pl = await getPlaylistInfo(playlist_id);
	if (pl.flag_favorite === 1) throw 'A favorite playlist cannot be set to visible.';
	await Promise.all([
		plDB.setVisiblePlaylist(playlist_id),
		updatePlaylistLastEditTime(playlist_id)
	]);
}

export async function unsetVisiblePlaylist(playlist_id) {
	await Promise.all([
		plDB.unsetVisiblePlaylist(playlist_id),
		updatePlaylistLastEditTime(playlist_id)
	]);
	
}

export async function setPublicPlaylist(playlist_id) {
	const pl = await getPlaylistInfo(playlist_id);
	if (pl.flag_current === 1) throw 'A public playlist cannot be set to current. Set another playlist to public first.';
	if (pl.flag_favorite === 1) throw 'A favorite playlist cannot be set to current.';
	await unsetPublicAllPlaylists();
	await Promise.all([
		plDB.setPublicPlaylist(playlist_id),
		updatePlaylistLastEditTime(playlist_id)
	]);	
}

export async function deletePlaylist(playlist_id, opt) {
	if (!opt) opt = {};
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	if (await isPublicPlaylist(playlist_id)) throw `Playlist ${playlist_id} is public. Unable to delete it`;
	if (await isCurrentPlaylist(playlist_id)) throw `Playlist ${playlist_id} is current. Unable to delete it`;
	const pl = await getPlaylistInfo(playlist_id,false,'admin');
	if (!opt.force && pl.flag_favorites === 1) throw `Playlist ${playlist_id} is a favorites list. Unable to delete it.`;	
	await plDB.deletePlaylist(playlist_id);
}

export async function emptyPlaylist(playlist_id) {
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	await plDB.emptyPlaylist(playlist_id);
	await Promise.all([
		updatePlaylistLastEditTime(playlist_id),
		updatePlaylistDuration(playlist_id)
	]);
	
}

export async function emptyWhitelist() {
	await wlDB.emptyWhitelist();
	await generateBlacklist();
}

export async function emptyBlacklistCriterias() {
	await blcDB.emptyBlacklistCriterias();
	await generateBlacklist();
}

export async function editPlaylist(playlist_id,name,flag_visible) {
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	await plDB.editPlaylist({
		id: playlist_id,
		name: name,
		NORM_name: deburr(name),
		modified_at: now(),
		flag_visible: flag_visible
	});
}				

export async function createPlaylist(name,flag_visible,flag_current,flag_public,flag_favorites,username) {
	if (flag_current && flag_public) throw 'A playlist cannot be current and public at the same time!';
	if (flag_favorites && (flag_public || flag_public)) throw 'A playlist cannot be favorite and current/public at the same time!';	
	if (flag_public) await unsetPublicAllPlaylists();
	if (flag_current) await unsetCurrentAllPlaylists();	
	const pl = await plDB.createPlaylist({
		name: name,
		NORM_name: deburr(name),
		created_at: now(),
		modified_at: now(),
		flag_visible: flag_visible,
		flag_current: flag_current,
		flag_public: flag_public,
		flag_favorites: flag_favorites,
		username: username
	});
	return pl.lastID;
}

export async function getPlaylistInfo(playlist_id) {
	return await plDB.getPlaylistInfo(playlist_id);
}

export async function getPlaylists(seenFromUser,username) {
	return await plDB.getPlaylists(seenFromUser,username);
}

async function unsetPublicAllPlaylists() {
	return await plDB.unsetPublicPlaylist();
}

async function unsetCurrentAllPlaylists() {
	return await plDB.unsetCurrentPlaylist();
}

async function updatePlaylistKaraCount(playlist_id) {
	const count = await plDB.countKarasInPlaylist(playlist_id);	
	await plDB.updatePlaylistKaraCount(playlist_id,count.karaCount);
}

async function updatePlaylistLastEditTime(playlist_id) {
	await plDB.updatePlaylistLastEditTime(playlist_id,now());
}

async function updatePlaylistDuration(playlist_id) {
	await plDB.updatePlaylistDuration(playlist_id);
}

export async function getPlaylistContentsMini(playlist_id) {	
	return await plDB.getPlaylistContentsMini(playlist_id);
}

export async function getPlaylistContents(playlist_id,token) {	
	return await plDB.getPlaylistContents(playlist_id,token.username);
}

async function getPlaylistPos(playlist_id) {
	return await plDB.getPlaylistPos(playlist_id);
}

async function getPlaylistKaraNames(playlist_id) {
	return await plDB.getPlaylistKaraNames(playlist_id);
}

export async function getKaraFromPlaylist(plc_id,token) {
	let seenFromUser = false;
	if (token.role === 'user') seenFromUser = true;
	const kara = await plDB.getPLCInfo(plc_id, seenFromUser, token.username);
	if (kara) return [kara];
	throw 'PLCID unknown!';
}

export async function getWhitelistContents() {
	return await wlDB.getWhitelistContents();
}

export async function getBlacklistContents() {
	return await blcDB.getBlacklistContents();
}

export async function getBlacklistCriterias() {
	return await blcDB.getBlacklistCriterias();
}

export async function getAllKaras(username) {
	return await karaDB.getAllKaras(username);
}

export async function getRandomKara(playlist_id, filter) {
	// Get karaoke list	
	let karas = await getAllKaras();
	if (filter) karas = filterPlaylist(karas, filter);
	// Strip list to just kara IDs
	karas.forEach((elem,index) => {
		karas[index] = elem.kara_id;
	});
	//Now, get current playlist's contents.
	const pl = await getPlaylistContentsMini(playlist_id);
	//Strip playlist to just kara IDs
	pl.forEach((elem,index) => {
		pl[index] = elem.kara_id;
	});
	let allKarasNotInCurrentPlaylist = [];
	allKarasNotInCurrentPlaylist = karas.filter((el) => {
		return pl.indexOf(el) < 0;
	});
	return sample(allKarasNotInCurrentPlaylist);									
}

export async function getKara(kara_id, username) {
	return await karaDB.getKara(kara_id, username);	
}

export async function getKaraMini(kara_id) {
	return await karaDB.getKaraMini(kara_id);
}

export async function getPLCByKID(kid,playlist_id) {
	return await plDB.getPLCByKID(kid,playlist_id);
}

export function filterPlaylist(playlist,searchText) {
	function cleanStr(string) {
		return string.toLowerCase().replace('\'','');
	}
	function textSearch(kara) {
		searchText = deburr(searchText);
		searchText = cleanStr(searchText);
		let searchOK = [];
		const searchWords = searchText.split(' ');
		let searchWordID = 0;
		searchWords.forEach((searchWord) => {
			searchOK[searchWordID] = false;					
			if (!isEmpty(kara.NORM_title)) {
				if (cleanStr(kara.NORM_title).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_author)) {
				if (cleanStr(kara.NORM_author).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_serie)) {
				if (cleanStr(kara.NORM_serie).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_serie_altname)) {
				if (cleanStr(kara.NORM_serie_altname).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_singer)) {
				if (cleanStr(kara.NORM_singer).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_songwriter)) {
				if (cleanStr(kara.NORM_songwriter).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.NORM_creator)) {
				if (cleanStr(kara.NORM_creator).includes(searchWord)) searchOK[searchWordID] = true;
			}					
			if (!isEmpty(kara.songtype_i18n_short)) {
				if (cleanStr(kara.songtype_i18n_short).includes(searchWord)) searchOK[searchWordID] = true;
				//Allows searches for "OP1", "OP2", and such to work.
				let songorder = kara.songorder;
				if (songorder === 0) songorder = '';
				if ((cleanStr(kara.songtype_i18n_short)+songorder).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.misc_i18n)) {
				if (cleanStr(kara.misc_i18n).includes(searchWord)) searchOK[searchWordID] = true;
			}
			if (!isEmpty(kara.language_i18n)) {						
				if (cleanStr(deburr(kara.language_i18n)).includes(searchWord)) searchOK[searchWordID] = true;						
			}
			searchWordID++;
		});
		if (searchOK.indexOf(false) > -1 ) {
			return false;
		} else {
			return true;
		}
	}
	return playlist.filter(textSearch);
}

function isAllKarasInPlaylist(karas, karasToRemove) {
	return karas.filter(k => !karasToRemove.map(ktr => ktr.kara_id).includes(k.kara_id));
}

export async function addKaraToPlaylist(karas,requester,playlist_id,pos) {
	if (!await isPlaylist(playlist_id)) throw {code: 1, msg: `Playlist ${playlist_id} unknown`};	
	let karaList = [];	
	const user = await findUserByName(requester);	
	if (!user) throw {code: 2, msg: 'User does not exist'};
	const date_add = now();			
	karas.forEach((kara_id) => {
		karaList.push({
			kara_id: parseInt(kara_id, 10),
			username: requester,
			pseudo_add: user.nickname,
			NORM_pseudo_add: deburr(user.nickname),
			playlist_id: parseInt(playlist_id, 10),
			created_at: date_add,				
		});				
	});
	const [userMaxPosition,
		numUsersInPlaylist,
		playlistMaxPos] =
	await Promise.all([
		plDB.getMaxPosInPlaylistForPseudo(playlist_id, user.id),
		plDB.countPlaylistUsers(playlist_id),
		plDB.getMaxPosInPlaylist(playlist_id)
	]);
	if (!await isAllKaras(karas)) throw {code: 3, msg: 'One of the karaokes does not exist'};
	const pl = await plDB.getPlaylistKaraIDs(playlist_id);	
	karaList = isAllKarasInPlaylist(karaList,pl);
	if (karaList.length === 0) throw {code: 4, msg: `No karaoke could be added, all are in destination playlist already (PLID : ${playlist_id})`};
	// If pos is provided, we need to update all karas above that and add 
	// karas.length to the position
	// If pos is not provided, we need to get the maximum position in the PL
	// And use that +1 to set our playlist position.
	// If pos is -1, we must add it after the currently flag_playing karaoke.
	const conf = getConfig();
	const playingObject = getPlayingPos(pl);
	const playingPos = playingObject ? playingObject.plc_id_pos : 0;
	// Position management here :
	if (conf.EngineSmartInsert === 1 && user.flag_admin === 0) {
		if (userMaxPosition === null) {
			// No songs yet from that user, they go first.
			pos = -1;			
		} else if (userMaxPosition < playingPos){
			// No songs enqueued in the future, they go first.
			pos = -1;			
		} else {
			// Everyone is in the queue, we will leave an empty spot for each user and place ourselves next.
			pos = Math.min(playlistMaxPos.maxpos + 1, userMaxPosition.maxpos + numUsersInPlaylist);
		}
	}
	if (pos === -1) {
		// Find out position of currently playing karaoke
		// If no flag_playing is found, we'll add songs at the end of playlist.
		pos = playingPos + 1;
	}
	if (pos) {
		await plDB.shiftPosInPlaylist(playlist_id,pos,karas.length);
		karaList.forEach((kara,index) => {
			karaList[index].pos = pos+index;
		});
	} else {		
		const startpos = playlistMaxPos.maxpos + 1.0;
		karaList.forEach((kara,index) => {
			karaList[index].pos = startpos+index;
		});
	}		
	await karaDB.addKaraToPlaylist(karaList);
	await updatePlaylistLastEditTime(playlist_id);
	// Checking if a flag_playing is present inside the playlist.					
	// If not, we'll have to set the karaoke we just added as the currently playing one. updatePlaylistDuration is done by setPlaying already.
	if (!await isPlaylistFlagPlaying(playlist_id)) {
		const plcid = await getPLCIDByDate(playlist_id,date_add);
		await setPlaying(plcid,playlist_id);
	} else {
		await updatePlaylistDuration(playlist_id);				
	}
	await updatePlaylistKaraCount(playlist_id);
	let karaAdded = [];
	karaList.forEach(function(kara) {
		karaAdded.push(kara.kara_id);
	});
	updateSongsLeft(requester, playlist_id);
	return karaAdded;
}

export async function getPLCInfo(plc_id) {
	return await plDB.getPLCInfo(plc_id);
}

export async function getPLCInfoMini(plc_id) {
	return await plDB.getPLCInfoMini(plc_id);
}

async function checkPLCandKaraInPlaylist(plcList,playlist_id) {
	let plcToAdd = [];
	for (const index in plcList) {		
		const plcData = await plDB.getPLCInfoMini(plcList[index].plc_id);
		if (!plcData) throw `PLC ${plcList[index].plc_id} does not exist`;
		//We got a hit!
		// Let's check if the kara we're trying to add is 
		// already in the playlist we plan to copy it to.
		if (!await isKaraInPlaylist(plcData.kara_id,playlist_id)) {
			plcList[index].kara_id = plcData.kara_id;
			plcList[index].pseudo_add = plcData.pseudo_add;
			plcList[index].NORM_pseudo_add = plcData.NORM_pseudo_add;
			plcList[index].created_at = now();
			plcList[index].username = plcData.username;
			plcList[index].playlist_id = playlist_id;
			plcToAdd.push(plcList[index]);
		}
	}
	return plcToAdd;	
}

export async function copyKaraToPlaylist(plcs,playlist_id,pos) {
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;	
	// plcs is an array of plc_ids.		
	const date_add = now();
	let plcList = [];
	plcs.forEach(function(plc_id){
		plcList.push({
			plc_id: plc_id,
			playlist_id: playlist_id,
			date_add: date_add,				
		});				
	});
	plcList = await checkPLCandKaraInPlaylist(plcList, playlist_id);
	// If pos is provided, we need to update all karas above that and add 
	// karas.length to the position
	// If pos is not provided, we need to get the maximum position in the PL
	// And use that +1 to set our playlist position.				
	if (pos) {
		await plDB.shiftPosInPlaylist(playlist_id,pos,plcs.length);
	} else {
		const res = await plDB.getMaxPosInPlaylist(playlist_id);
		let startpos = res.maxpos + 1.0;
		let index = 0;
		plcList.forEach(() => {
			plcList[index].pos = startpos + index;
			index++;
		});
	}								
	await karaDB.addKaraToPlaylist(plcList);
	await Promise.all([
		updatePlaylistLastEditTime(playlist_id),
		updatePlaylistDuration(playlist_id),
		updatePlaylistKaraCount(playlist_id)
	]);
}

export async function deleteKaraFromPlaylist(plcs,playlist_id,opt) {
	if (!opt) opt = {};
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	// Removing karaoke here.
	await karaDB.removeKaraFromPlaylist(plcs,playlist_id);
	if (!opt.sortBy) opt.sortBy = 'pos';	
	await Promise.all([
		updatePlaylistDuration(playlist_id),
		updatePlaylistKaraCount(playlist_id),
		updatePlaylistLastEditTime(playlist_id),		
		reorderPlaylist(playlist_id, opt)
	]);
	return playlist_id;
}

export async function editKaraFromPlaylist(plc_id,pos,flag_playing) {
	if (flag_playing === 0) throw 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one';
	const kara = await plDB.getPLCInfoMini(plc_id);
	if (!kara) throw 'PLCID unknown!';
	const playlist_id = kara.playlist_id;
	const playlist = await getPlaylistInfo(playlist_id);	
	if (playlist.flag_favorites === 1) throw 'Karaokes in favorite playlists cannot be modified';
	if (flag_playing) {
		await setPlaying(plc_id,playlist_id);
		if (await isCurrentPlaylist(playlist_id)) emitPlayingUpdated();
	} 
	if (pos) {
		await raisePosInPlaylist(pos,playlist_id);
		await plDB.setPos(plc_id,pos);
		await reorderPlaylist(playlist_id);		
	}
	await updatePlaylistLastEditTime(playlist_id);
	return playlist_id;
}

export async function deleteKaraFromWhitelist(wlcs) {
	let karaList = [];
	wlcs.forEach((wlc_id) => {
		karaList.push({
			wlc_id: wlc_id
		});				
	});
	await karaDB.removeKaraFromWhitelist(karaList);
	await generateBlacklist();
}

async function raisePosInPlaylist(pos,playlist_id) {
	await plDB.raisePosInPlaylist(pos,playlist_id);	
}

function sortByPos(a, b) {
	return a.pos - b.pos;
}

export async function reorderPlaylist(playlist_id, opt) {
	let pl;	
	if (!opt) opt = {};
	switch (opt.sortBy) {
	case 'name':
		pl = await getPlaylistKaraNames(playlist_id);
		break;
	default:
	case 'pos':
		pl = await getPlaylistPos(playlist_id);
		pl.sort(sortByPos);		
	}
	let newpos = 0;
	let arraypos = 0;
	pl.forEach(() => {
		newpos++;
		pl[arraypos].pos = newpos;
		arraypos++;
	});
	await plDB.reorderPlaylist(playlist_id,pl);
	return pl;	
}

export async function exportPlaylist(playlist_id) {
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	const plContents = await getPlaylistContentsMini(playlist_id);
	const plInfo = await getPlaylistInfo(playlist_id);
	let pl = {};
	plInfo.playlist_id = undefined;
	plInfo.num_karas = undefined;
	plInfo.flag_current = undefined;
	plInfo.flag_public = undefined;
	plInfo.flag_favorites = undefined;
	plInfo.length = undefined;
	plInfo.fk_id_user = undefined;
	let plcFiltered = [];
	plContents.forEach((plc) => {
		let plcObject = {};
		plcObject.kid = plc.kid;
		plcObject.pseudo_add = plc.pseudo_add;
		plcObject.created_at = plc.created_at;
		plcObject.pos = plc.pos;
		plcObject.username = plc.username;
		if (plc.flag_playing === 1) plcObject.flag_playing = 1;
		plcFiltered.push(plcObject);
	});
	pl.Header = {
		version: 3,
		description: 'Karaoke Mugen Playlist File',
	};
	pl.PlaylistInformation = plInfo;
	pl.PlaylistContents = plcFiltered;						
	return pl;							
}

async function getKaraByKID(kid) {
	return await karaDB.getKaraByKID(kid);
}

async function checkImportedKIDs(playlist) {
	let karasToImport = [];
	let karasUnknown = [];
	for (const kara in playlist) {
		const karaFromDB = await getKaraByKID(playlist[kara].kid);
		if (karaFromDB) {
			playlist[kara].kara_id = karaFromDB.kara_id;
			karasToImport.push(playlist[kara]);			
		} else {
			logger.warn(`[PLC] importPlaylist : KID ${kara.kid} unknown`);
			karasUnknown.push(kara.kid);			
		}
	}
	return { 
		karasToImport: karasToImport, 
		karasUnknown: karasUnknown 
	};	
}

export async function importPlaylist(playlist,username) {
	// Check if format is valid :
	// Header must contain :
	// description = Karaoke Mugen Playlist File
	// version <= 3
	// 
	// PlaylistContents array must contain at least one element.
	// That element needs to have at least kid. flag_playing is optional
	// kid must be uuid
	// Test each element for those.
	//
	// PlaylistInformation must contain :
	// - flag_visible : (0 / 1)
	// - name : playlist name
	//
	// If all tests pass, then add playlist, then add karas
	// Playlist can end up empty if no karaokes are found in database				
	let playingKara;
	if (playlist.Header === undefined) throw 'No Header section';
	if (playlist.Header.description !== 'Karaoke Mugen Playlist File') throw 'Not a .kmplaylist file';
	if (playlist.Header.version > 3) throw `Cannot import this version (${playlist.Header.version})`;
	if (playlist.PlaylistContents === undefined) throw 'No PlaylistContents section';
	if (playlist.PlaylistInformation === undefined) throw 'No PlaylistInformation section';
	if (isNaN(playlist.PlaylistInformation.created_at)) throw 'Creation time is not valid';
	if (isNaN(playlist.PlaylistInformation.modified_at)) throw 'Modification time is not valid';
	if (playlist.PlaylistInformation.flag_visible !== 0 && 
		playlist.PlaylistInformation.flag_visible !== 1) throw 'Visible flag must be boolean';
	if (isEmpty(playlist.PlaylistInformation.name)) throw 'Playlist name must not be empty';
	let flag_playingDetected = false;
	if (playlist.PlaylistContents !== undefined) {
		playlist.PlaylistContents.forEach((kara,index) => {
			if (!(new RegExp(uuidRegexp).test(kara.kid))) throw 'KID is not a valid UUID!';
			if (isNaN(kara.created_at)) throw 'Karaoke added time is not a number';
			if (!isNaN(kara.flag_playing)) {
				if (kara.flag_playing !== 1) throw 'flag_playing must be 1 or not present!';
				if (flag_playingDetected) throw 'Playlist contains more than one currently playing marker';
				flag_playingDetected = true;
				playingKara = kara.kid;
			}
			if (isNaN(kara.pos)) throw 'Position must be a number';
			if (isEmpty(kara.pseudo_add)) throw 'All karaokes must have a nickname associated with them';
			playlist.PlaylistContents[index].NORM_pseudo_add = deburr(kara.pseudo_add);
			const user = findUserByName(kara.username);
			if (!user) playlist.PlaylistContents[index].username = 'admin';			
		});
	}

	// Validations done. First creating playlist.
	try {
		const playlist_id = await createPlaylist(playlist.PlaylistInformation.name,playlist.PlaylistInformation.flag_visible,0,0,0,username);

		const ret = await checkImportedKIDs(playlist.PlaylistContents);	
		playlist.PlaylistContents = ret.karasToImport;	
		playlist.PlaylistContents.forEach((kara,index) => {
			playlist.PlaylistContents[index].playlist_id = playlist_id;
		});
		await karaDB.addKaraToPlaylist(playlist.PlaylistContents);
		if (playingKara) {
			const plcPlaying = await getPLCByKID(playingKara,playlist_id);				
			await setPlaying(plcPlaying.playlistcontent_id,playlist_id);
		}
		return {
			playlist_id: playlist_id,
			karasUnknown: ret.karasUnknown
		};
	} catch(err) {
		throw err;
	}
}			

export function translateKaraInfo(karalist, lang) {
	const conf = getConfig();
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = conf.EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_common/locales'),
	});
	i18n.setLocale(lang);

	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	// If the kara list provided is not an array (only a single karaoke)
	// Put it into an array first
	let karas;
	if (karalist.constructor !== Array) {
		karas = [];
		karas[0] = karalist;
	} else {
		karas = karalist;
	}

	karas.forEach(function(kara,index) {
		karas[index].songtype_i18n = i18n.__(kara.songtype);
		karas[index].songtype_i18n_short = i18n.__(kara.songtype+'_SHORT');

		if (kara.language != null) {
			const karalangs = kara.language.split(',');
			let languages = [];
			let langdata;
			karalangs.forEach(karalang => {
				// Special case : und
				// Undefined language
				// In this case we return something different.
				// Special case 2 : mul
				// mul is for multilanguages, when a karaoke has too many languages to list.
				switch (karalang) {
				case 'und':
					languages.push(i18n.__('UNDEFINED_LANGUAGE'));
					break;
				case 'mul':
					languages.push(i18n.__('MULTI_LANGUAGE'));						
					break;
				default:
					// We need to convert ISO639-2B to ISO639-1 to get its language
					langdata = langs.where('2B',karalang);
					if (langdata === undefined) {
						languages.push(__('UNKNOWN_LANGUAGE'));
					} else {
						languages.push(getLanguage(detectedLocale[1],langdata[1]));
					}
					break;
				}				
			});
			karas[index].language_i18n = languages.join();
		}
		// Let's do the same with tags, without language stuff
		if (kara.misc != null) {
			let tags = [];
			const karatags = kara.misc.split(',');
			karatags.forEach(function(karatag){
				tags.push(i18n.__(karatag));
			});
			karas[index].misc_i18n = tags.join();
		} else {
			karas[index].misc_i18n = null;
		}
	});
	return karas;
}


export async function translateBlacklistCriterias(blcs, lang) {
	const blcList = blcs;
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getConfig().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_common/locales'),
	});
	i18n.setLocale(lang);
	// We need to read the detected locale in ISO639-1
	for (const i in blcList) {
		if (blcList[i].type === 1) {
			// We just need to translate the tag name if there is a translation
			if (typeof blcList[i].value !== 'string') throw `BLC value is not a string : ${blcList[i].value}`;
			if (blcList[i].value.startsWith('TAG_')) {
				blcList[i].value_i18n = i18n.__(blcList[i].value);
			} else {
				blcList[i].value_i18n = blcList[i].value;
			}
		}			
		if (blcList[i].type >= 2 && blcList[i].type <= 999) {
			// We need to get the tag name and then translate it if needed
			const tag = await tagDB.getTag(blcList[i].value);
			if (typeof tag.name !== 'string') throw 'Tag name is not a string : '+JSON.stringify(tag);
			if (tag.name.startsWith('TAG_')) {
				blcList[i].value_i18n = i18n.__(tag.name);
			} else {
				blcList[i].value_i18n = tag.name;
			}										
		}								
		if (blcList[i].type === 1001) {
			// We have a kara ID, let's get the kara itself and append it to the value
			const kara = await karaDB.getKara(blcList[i].value);
			const karaTranslated = translateKaraInfo(kara,lang);
			blcList[i].value = karaTranslated;										
		}
		// No need to do anything, values have been modified if necessary			
	}
	return blcList;				
}

export function translateTags(taglist,lang) {
	const conf = getConfig();
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = conf.EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_common/locales'),
	});
	i18n.setLocale(lang);
	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	taglist.forEach((tag, index) => {
		if (tag.type >= 2 && tag.type <= 999 && tag.type !== 5) {
			if (tag.name.startsWith('TAG_') || tag.name.startsWith('TYPE_')) {
				taglist[index].name_i18n = i18n.__(tag.name);
			} else {
				taglist[index].name_i18n = tag.name;
			}							
		}
		// Special case for languages
		if (tag.type === 5) {
			if (tag.name === 'und') {
				taglist[index].name_i18n = i18n.__('UNDEFINED_LANGUAGE');
			} else {
				// We need to convert ISO639-2B to ISO639-1 to get its language
				var langdata = langs.where('2B',tag.name);
				if (langdata === undefined) {
					taglist[index].name_i18n = i18n.__('UNKNOWN_LANGUAGE');
				} else {
					taglist[index].name_i18n = (getLanguage(detectedLocale[1],langdata[1]));
				}
			}					
		}	
	});
	return taglist;	
}

export async function shufflePlaylist(playlist_id) {
	if (!await isPlaylist(playlist_id)) throw `Playlist ${playlist_id} unknown`;
	// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
	// the part after the song currently being played.
	let playlist = await getPlaylistContentsMini(playlist_id);
	if (!await isCurrentPlaylist(playlist_id)) {
		playlist = shuffle(playlist);
	} else {
		// If it's current playlist, we'll make two arrays out of the playlist :
		// - One before (and including) the current song being played (flag_playing = 1)
		// - One after.
		// We'll shuffle the one after then concatenate the two arrays.
		let BeforePlaying = [];
		let AfterPlaying = [];
		let ReachedPlaying = false;
		playlist.forEach((kara) => {
			if (!ReachedPlaying) {
				BeforePlaying.push(kara);
				if (kara.flag_playing === 1) {
					ReachedPlaying = true;
				}
			} else {
				AfterPlaying.push(kara);
			}
		});
		AfterPlaying = shuffle(AfterPlaying);
		playlist = BeforePlaying.concat(AfterPlaying);
		// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
		if (!ReachedPlaying) {
			playlist = shuffle(playlist);
		}
	}
	let newpos = 0;
	let arraypos = 0;
	playlist.forEach(() => {
		newpos++;
		playlist[arraypos].pos = newpos;
		arraypos++;
	});
	await updatePlaylistLastEditTime(playlist_id);
	await plDB.reorderPlaylist(playlist_id,playlist);
}
	
export async function prev() {
	const playlist_id = await isACurrentPlaylist();
	const playlist = await getPlaylistContentsMini(playlist_id);
	if (playlist.length === 0) throw 'Playlist is empty!';
	let readpos = 0;
	playlist.forEach((kara, index) => {
		if (kara.flag_playing) readpos = index - 1;
	});
	// If readpos ends up being -1 then we're at the beginning of the playlist and can't go to the previous song
	if (readpos < 0) throw 'Current position is first song!';
	const kara = playlist[readpos];
	if (!kara) throw 'Karaoke received is empty!';
	await setPlaying(kara.playlistcontent_id,playlist_id);
}

export async function next() {
	const conf = getConfig();
	const playlist_id = await isACurrentPlaylist();
	const playlist = await getPlaylistContentsMini(playlist_id);
	if (playlist.length === 0) throw 'Playlist is empty!';
	let readpos = 0;
	playlist.forEach((kara, index) => {
		if (kara.flag_playing) readpos = index + 1;
	});
	// Test if we're at the end of the playlist and if RepeatPlaylist is set.
	if (readpos >= playlist.length && conf.EngineRepeatPlaylist === 0) {
		logger.debug('[PLC] End of playlist.');	
		await setPlaying(null,playlist_id);
		throw 'Current position is last song!';
	} else {
		// If we're here, it means either we're beyond the length of the playlist
		// OR that EngineRepeatPlaylist is set to 1. 
		// We test again if we're at the end of the playlist. If so we go back to first song.
		if (readpos >= playlist.length) readpos = 0;
		const kara = playlist[readpos];
		if (!kara) throw 'Karaoke received is empty!';
		await setPlaying(kara.playlistcontent_id,playlist_id);
	}
}

async function getCurrentPlaylist() {
	// Returns current playlist contents and where we're at.
	const playlist_id = await isACurrentPlaylist();
	const playlist = await getPlaylistContentsMini(playlist_id);
	// Setting readpos to 0. If no flag_playing is found in current playlist
	// Then karaoke will begin at the first element of the playlist (0)
	let readpos = 0;
	playlist.forEach((kara, index) => {
		if(kara.flag_playing) readpos = index;
	});							
	return {
		id: playlist_id,
		content: playlist,
		index: readpos
	};
}

export async function playCurrentSong() {
	const conf = getConfig();
	const playlist = await getCurrentPlaylist();	
	// Search for currently playing song
	let readpos = false;
	playlist.content.forEach((kara, index) => {
		if (kara.flag_playing)
			readpos = index;
	});
	let updatePlayingKara = false;
	if (!readpos) {
		readpos = 0;
		updatePlayingKara = true;
	}
	const kara = playlist.content[readpos];	
	if (!kara) throw 'No karaoke found in playlist object';
	// If there's no kara with a playing flag, we set the first one in the playlist
	if (updatePlayingKara) await setPlaying(kara.playlistcontent_id,playlist.id);
	// Let's add details to our object so the player knows what to do with it.
	kara.playlist_id = playlist.id;	
	let requester;								
	if (conf.EngineDisplayNickname) {
		// When a kara has been added by admin/import, do not display it on screen.
		// Escaping {} because it'll be interpreted as ASS tags below.
		kara.pseudo_add = kara.pseudo_add.replace(/[\{\}]/g,'');				
		requester = __('REQUESTED_BY')+' '+kara.pseudo_add;
	} else {									
		requester = '';
	}								
	if (!isEmpty(kara.title)) kara.title = ' - '+kara.title;
	// If series is empty, pick singer information instead
	let series = kara.serie;
	if (isEmpty(kara.serie)) series = kara.singer; 
	// If song order is 0, don't display it (we don't want things like OP0, ED0...)
	if (kara.songorder === 0) kara.songorder = '';
	// Construct mpv message to display.
	kara.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}'+__(kara.songtype+'_SHORT')+kara.songorder+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;		
	const ass = await getASS(kara.kara_id);
	kara.path = {
		video: kara.videofile,
		subtitle: ass
	};		
	return kara;
}

export async function buildDummyPlaylist(playlist_id) {
	const stats = await getStats();
	let karaCount = stats.totalcount;
	// Limiting to 5 sample karas to add if there's more. 
	if (karaCount > 5) karaCount = 5;
	if (karaCount > 0) {
		logger.info(`[PLC] Dummy Plug : Adding ${karaCount} karas into current playlist`);
		for (let i = 1; i <= karaCount; i++) {
			const kara_id = await getRandomKara(playlist_id);
			await addKaraToPlaylist([kara_id],'admin',playlist_id);
		}
		logger.info(`[PLC] Dummy Plug : Activation complete. The current playlist has now ${karaCount} sample songs in it.`);
		return true;		
	} else {
		logger.warn('[PLC] Dummy Plug : your database has no songs! Maybe you should try to regenerate it?');
		return true;
	}				
}
