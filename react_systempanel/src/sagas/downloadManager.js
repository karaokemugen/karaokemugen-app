import { delay, eventChannel } from 'redux-saga';
import pick from 'lodash/pick';
import equal from 'fast-deep-equal';
import {
	put,
	takeLatest,
	takeEvery,
	select,
	call,
	fork,
	take
} from 'redux-saga/effects';
import openSocket from 'socket.io-client';
import {
	KARAS_FILTER_ONLINE,
	loadOnlineKaras,
	setIsSearching,
	KARAS_DOWNLOAD_ADD_TO_QUEUE,
	KARAS_LOAD_DOWNLOAD_QUEUE,
	KARAS_DOWNLOAD_PROGRESS_UPDATE
} from '../actions/karas';
import { getDownloadQueue, postToDownloadQueue } from '../api/local';
import { getRecentKaras, getKarasBySearchString } from '../api/online';
import { fetchLocalKara, fetchDownloadQueue } from '../reducers/karas';

function downloadQueueChannel() {
	return eventChannel(emit => {
		const iv = setInterval(async () => {
			const res = await getDownloadQueue();
			emit(res);
		}, 1000);
		return () => clearInterval(iv);
	});
}

function downloadProgressChannel() {
	return eventChannel(emit => {
		const downloadSocket = openSocket('http://localhost:1337');
		downloadSocket.on('downloadProgress', data => {
			emit(data);
		});
		downloadSocket.on('downloadBatchProgress', data => {});
		return () => {
			downloadSocket.close();
		};
	});
}
/***************************** Subroutines ************************************/

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
		onlineKaras = [];
	}

	onlineKaras.forEach(k => {
		k.name = k.subfile.replace('.ass', '');
	});

	yield put(setIsSearching(false));
	yield put(loadOnlineKaras(onlineKaras));
}

function* watchDownloadQueue() {
	// TODO: Should use/separate a redux selector
	const channel = yield call(downloadQueueChannel);
	while (true) {
		const latestQueue = yield take(channel);
		for (let dlItem of latestQueue) {
			const kara = yield select(fetchLocalKara, dlItem.name);
			if (kara) {
				dlItem.title = kara.title;
			} else {
				dlItem.title = dlItem.name;
			}
		}
		const currentQueue = yield select(state => state.karas.downloadQueue);
		const latestPkIds = latestQueue.map(i => i.pk_id_download);
		const currentPkIds = currentQueue.map(i => i.pk_id_download);
		const areAllDone = !latestQueue.some(i => i.status !== 'DL_DONE');
		const sameItems = equal(latestPkIds, currentPkIds);
		if (!sameItems || (sameItems && areAllDone)) {
			yield put({
				type: KARAS_LOAD_DOWNLOAD_QUEUE,
				payload: latestQueue
			});
		}
	}
}

function* watchDownloadProgressUpdates() {
	const channel = yield call(downloadProgressChannel);
	while (true) {
		yield delay(500);
		const downloadProgress = yield take(channel);
		const { value, total: t } = downloadProgress;
		const total = parseInt(t);
		// For now using this to determine whether to show progress in redux
		// if (total > 30000) {
		const downloadQueue = yield select(fetchDownloadQueue);
		const updatedDownloadQueue = [...downloadQueue];
		const indexOfUpdate = updatedDownloadQueue.findIndex(
			dlItem => dlItem.name === downloadProgress.id
		);
		updatedDownloadQueue[indexOfUpdate] = {
			...updatedDownloadQueue[indexOfUpdate],
			progress: {
				total,
				current: value
			}
		};
		yield put({
			type: KARAS_DOWNLOAD_PROGRESS_UPDATE,
			payload: updatedDownloadQueue
		});
		// }
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
		'seriefiles'
	]);
	downloadObject.size = kara.mediasize;
	downloadObject.name = kara.kid;
	yield call(postToDownloadQueue, 'kara.moe', [downloadObject]);

	// const latestQueue = yield call(getDownloadQueue);
	// yield put({
	// 	type: KARAS_LOAD_DOWNLOAD_QUEUE,
	// 	payload: latestQueue
	// });
}

export default function* downloadManager() {
	yield fork(watchDownloadQueue);
	yield fork(watchDownloadProgressUpdates);
	yield takeLatest(KARAS_FILTER_ONLINE, filterOnlineKaras);
	yield takeEvery(KARAS_DOWNLOAD_ADD_TO_QUEUE, addToDownloadQueue);
}
