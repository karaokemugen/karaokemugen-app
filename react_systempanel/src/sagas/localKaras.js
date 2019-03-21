import { delay, eventChannel, END } from 'redux-saga';
import {
	put,
	call,
	takeLatest,
	takeEvery,
	fork,
	select,
	take
} from 'redux-saga/effects';
import equal from 'fast-deep-equal';
import {
	KARAS_FILTER_LOCAL,
	KARAS_DELETE_KARA,
	loadLocalKaras
} from '../actions/karas';
import { fetchLocalKaras, fetchLocalKara } from '../reducers/karas';
import { getLocalKaras, deleteKaraByLocalId } from '../api/local';

function localKarasChannel() {
	return eventChannel(emit => {
		setTimeout(async () => {
			const res = await getLocalKaras();
			emit(res);
		}, 1000);
		const iv = setInterval(async () => {
			const res = await getLocalKaras();
			emit(res);
		}, 10000);
		return () => clearInterval(iv);
	});
}

function* watchLocalKaras() {
	const channel = yield call(localKarasChannel);
	while (true) {
		const response = yield take(channel);
		const localKaras = yield select(fetchLocalKaras);
		if (!equal(response, localKaras)) {
			yield put(loadLocalKaras(response));
		}
	}
}

function* filterLocalKaras(action) {
	// TODO: Pass in the filter object
	const localKaras = yield getLocalKaras();
	try {
		yield put(loadLocalKaras(localKaras));
	} catch (e) {
		console.log(e);
	}
}

function* deleteKara(action) {
	const kid = action.payload;
	const kara = yield select(fetchLocalKara, kid);
	try {
		yield call(deleteKaraByLocalId, kara.kara_id);
	} catch (e) {
		console.log(e);
	}
}

export default function*() {
	// Start the watcher
	yield fork(watchLocalKaras);

	yield takeLatest(KARAS_FILTER_LOCAL, filterLocalKaras);
	yield takeEvery(KARAS_DELETE_KARA, deleteKara);
}
