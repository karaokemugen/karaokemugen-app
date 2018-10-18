import {delay} from 'redux-saga';
import { put, takeLatest, takeEvery } from 'redux-saga/effects';
import { KARAS_FILTER_LOCAL, loadLocalKaras, KARAS_FILTER_ONLINE, loadOnlineKaras } from '../actions/karas';
import axios from 'axios';

/****************************** API Calls *************************************/

/**
 * I'll be naming api requests with the first word being the http method.
 * ex. getSomeThing || postSomething || ...etc
 */

// GET karas with/without filter.
async function getLocalKaras() {
	try {
		const res = await axios.get('/api/karas');
		return res.data.content;
	} catch (e) {
		console.log('Error from downloadManager.js:fetchLocalKaras()');
		throw e;
	}
}

// GET recent karas from kara.moe
async function getRecentKaras() {
	try {
		const res = await axios.get('http://kara.moe/api/karas/recent');
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(`Error from downloadManager.js:getRecentKaras() - ${e.response.status}`);
		throw e;
	}
}

async function getKarasBySearchString(searchString) {
	try {
		const res = await axios.get(`http://kara.moe/api/karas?filter=${searchString}`);
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(`Error from downloadManager.js:getKarasBySearchString() - ${e.response.status}`);
		throw e;
	}
}

/***************************** Subroutines ************************************/
function* filterLocalKaras(action) {
	// TODO: Pass in the filter object
	const localKaras = yield getLocalKaras();
	yield put(loadLocalKaras(localKaras));
}

// Runs a get request to kara.moe's recent songs then loads it into the store
function* filterOnlineKaras(action) {
	yield delay(500);
	const filter = action.payload;
	let onlineKaras;
	if (filter === 'RECENT') {
		onlineKaras = yield getRecentKaras();
	} else {
		const {searchString} = filter;
		if (searchString) {
			onlineKaras = yield getKarasBySearchString(searchString);
		} else {
			onlineKaras = yield getRecentKaras(); // TODO Not yet the cleanest implementation
		}
	}
	yield put(loadOnlineKaras(onlineKaras));
}

export default function* downloadManager() {
	yield takeLatest(KARAS_FILTER_LOCAL, filterLocalKaras);
	yield takeLatest(KARAS_FILTER_ONLINE, filterOnlineKaras);
}
