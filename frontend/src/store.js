import EventEmmiter from 'events';
import axios from 'axios';
import { readCookie, parseJwt, createCookie, eraseCookie} from './components/tools';

let filterValue1 = '';
let filterValue2 = '';
let posPlaying = undefined;
let timer;
let tuto;
let config = {};
let logInfos;

if (!logInfos) {
	var token = readCookie('mugenToken');
	var onlineToken = readCookie('mugenTokenOnline');
	if (token) {
		logInfos = parseJwt(token);
		logInfos.token = token;
		if (onlineToken) {
			logInfos.onlineToken = onlineToken;
		}
	} else {
		logInfos = {};
	}
}

class Store extends EventEmmiter {

	emitChange(event, data) {
		this.emit(event, data);
	}

	addChangeListener(event, callback) {
		this.on(event, callback);
	}

	removeChangeListener(event, callback) {
		this.removeListener(event, callback);
	}

	setFilterValue(value, side, idPlaylist) {
		clearTimeout(timer);
		timer = setTimeout(() => {
			this.emitChange('playlistContentsUpdated', idPlaylist);
		}, 1000);
		if (side === 1) {
			filterValue1 = value;
		} else {
			filterValue2 = value;
		}
	}

	getFilterValue(side) {
		if (side === 1) {
			return filterValue1;
		} else {
			return filterValue2;
		}
	}

	getPosPlaying() {
		return posPlaying;
	}

	setPosPlaying(pos) {
		posPlaying = pos;
	}
    
	getTuto() {
		return tuto;
	}

	setTuto(newTuto) {
		tuto = newTuto;
	}

	getConfig() {
		return config;
	}

	setConfig(conf) {
		config = conf;
	}

	getLogInfos() {
		return logInfos;
	}

	setLogInfos(data) {
		logInfos = parseJwt(data.token);
		createCookie('mugenToken', data.token, -1);
		if (data.onlineToken) {
			createCookie('mugenTokenOnline', data.onlineToken, -1);
		} else if (!logInfos.username.includes('@')) {
			eraseCookie('mugenTokenOnline');
		}

		logInfos.token = data.token;
		logInfos.onlineToken = data.onlineToken;
		axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		store.emitChange('loginUpdated');
	}

	logOut() {
		eraseCookie('mugenToken');
		eraseCookie('mugenTokenOnline');
		logInfos = {};
		axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		store.emitChange('loginUpdated');
	}
}
const store = new Store();
export default store;
