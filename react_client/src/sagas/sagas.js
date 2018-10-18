import {all, fork} from 'redux-saga/effects';
import downloadManagerSaga from './downloadManager';

export default function* root() {
	yield all([
		fork(downloadManagerSaga)
	]);
}