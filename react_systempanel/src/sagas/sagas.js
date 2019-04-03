import { all, call } from 'redux-saga/effects';
import localKarasSaga from './localKaras';
import downloadManagerSaga from './downloadManager';

export default function* root() {
	//yield all([call(localKarasSaga), call(downloadManagerSaga)]);
}
