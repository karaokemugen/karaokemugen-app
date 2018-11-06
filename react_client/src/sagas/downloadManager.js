import { delay } from 'redux-saga';
import pick from 'lodash/pick';
import equal from 'fast-deep-equal';
import { put, takeLatest, takeEvery, select, call } from 'redux-saga/effects';
import {
	KARAS_FILTER_LOCAL,
	loadLocalKaras,
	KARAS_FILTER_ONLINE,
	loadOnlineKaras,
	KARAS_TOGGLE_WATCH_DOWNLOAD,
	setIsSearching,
	KARAS_ADD_TO_DOWNLOAD_QUEUE,
	KARAS_LOAD_DOWNLOAD_QUEUE
} from '../actions/karas';
import axios from 'axios';

/****************************** API Calls *************************************/

/**
 * I'll be naming api requests with the first word being the http method.
 * ex. getSomeThing || postSomething || ...etc
 */

/**
 * LOCAL
 */

// GET karas with/without filter.
async function getLocalKaras() {
	try {
		const res = await axios.get('/api/karas');
		return res.data.content;
	} catch (e) {
		console.log('Error from downloadManager.js:getLocalKaras()');
		throw e;
	}
}

// GET karas download queue
async function getDownloadQueue() {
	try {
		const res = await axios.get('/api/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from downloadManager.js:getDownloadQueue');
		throw e;
	}
}

// POST (add) items to download queue
async function postToDownloadQueue(repo = 'kara.moe', downloads) {
	// Left of here
	try {
		const dl = {
			repository: repo,
			downloads
		};
		console.log(dl);
		await axios.post('/api/downloads', dl);
	} catch (e) {
		console.log(e);
		console.log('Error from downloadManager.js:postToDownloadQueue');
		throw e;
	}
}

/**
 * ONLINE
 */

// GET recent karas from kara.moe
async function getRecentKaras() {
	try {
		const res = await axios.get('http://kara.moe/api/karas/recent');
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(
			`Error from downloadManager.js:getRecentKaras() - ${e.response.status}`
		);
		throw e;
	}
}

async function getKarasBySearchString(searchString) {
	try {
		const res = await axios.get(
			`http://kara.moe/api/karas?filter=${searchString}`
		);
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(
			`Error from downloadManager.js:getKarasBySearchString() - ${
				e.response.status
			}`
		);
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
	yield put(setIsSearching(true));
	yield delay(500);
	const filter = action.payload;
	let onlineKaras;
	if (filter) {
		const { searchString } = filter;
		if (searchString) {
			onlineKaras = yield getKarasBySearchString(searchString);
		} else {
			onlineKaras = yield getRecentKaras(); // TODO Not yet the cleanest implementation
		}
	} else {
		onlineKaras = yield [];
	}

	onlineKaras.forEach(k => {
		k.name = k.subfile.replace('.ass', '');
	});

	yield put(setIsSearching(false));
	yield put(loadOnlineKaras(onlineKaras));
}

function* toggledKarasWatchDownload(action) {
	// TODO: Should use/separte a redux selector
	const isWatching = yield select(state => state.karas.isWatchingDownloadQueue);
	while (isWatching) {
		yield delay(1000);
		const queue = yield select(state => state.karas.downloadQueue);
		const latestQueue = yield call(getDownloadQueue);
		if (!equal(queue, latestQueue)) {
			console.log('Updated download queue');
			yield put({
				type: KARAS_LOAD_DOWNLOAD_QUEUE,
				payload: latestQueue
			});
		}
	}
}

function* addToDownloadQueue(action) {
	const kid = action.payload;
	const onlineKaras = yield select(state => state.karas.onlineKaras);
	const kara = onlineKaras.find(k => k.kid === kid);
	const downloadObject = pick(kara, [
		'mediafile',
		'subfile',
		'karafile',
		'seriefiles',
		'name'
	]);
	downloadObject.size = kara.mediasize;
	yield call(postToDownloadQueue, 'kara.moe', [downloadObject]);
}

export default function* downloadManager() {
	yield takeLatest(KARAS_FILTER_LOCAL, filterLocalKaras);
	yield takeLatest(KARAS_FILTER_ONLINE, filterOnlineKaras);
	yield takeLatest(KARAS_TOGGLE_WATCH_DOWNLOAD, toggledKarasWatchDownload);
	yield takeEvery(KARAS_ADD_TO_DOWNLOAD_QUEUE, addToDownloadQueue);
}
