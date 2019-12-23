import EventEmmiter from 'events';
import axios from 'axios';
import { readCookie, parseJwt, createCookie, eraseCookie} from './components/tools';
import { Token } from '../../src/lib/types/user';
import { Config } from '../../src/types/config';
import { Version } from './types/version';

let filterValue1:string = '';
let filterValue2:string = '';
let posPlaying:number;
let timer:NodeJS.Timeout;
let tuto:any;
let config:Config;
let logInfos:Token|undefined;
let version:Version;
let modePlaylistID:number;

if (!logInfos) {
	var token = readCookie('mugenToken');
	var onlineToken = readCookie('mugenTokenOnline');
	if (token) {
		logInfos = parseJwt(token) as Token;
		logInfos.token = token;
		if (onlineToken) {
			logInfos.onlineToken = onlineToken;
		}
	} else {
		logInfos = undefined;
	}
}

class Store extends EventEmmiter {

	emitChange(event:any, data?:any) {
		this.emit(event, data);
	}

	addChangeListener(event:any, callback:any) {
		this.on(event, callback);
	}

	removeChangeListener(event:any, callback:any) {
		this.removeListener(event, callback);
	}

	setFilterValue(value:string, side:number, idPlaylist:number) {
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

	getFilterValue(side:number) {
		if (side === 1) {
			return filterValue1;
		} else {
			return filterValue2;
		}
	}

	getPosPlaying() {
		return posPlaying;
	}

	setPosPlaying(pos:number) {
		posPlaying = pos;
	}
    
	getTuto() {
		return tuto;
	}

	setTuto(newTuto:any) {
		tuto = newTuto;
	}

	getConfig() {
		return config;
	}

	setConfig(conf:Config) {
		config = conf;
	}

	getVersion() {
		return version;
	}

	setVersion(ver:Version) {
		version = ver;
	}

	getModePlaylistID() {
		return modePlaylistID;
	}

	setModePlaylistID(modePlaylist:number) {
		modePlaylistID = modePlaylist;;
	}

	getLogInfos() {
		return logInfos;
	}

	setLogInfos(data:{token: string, onlineToken:string}) {
		logInfos = parseJwt(data.token) as Token;
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
		logInfos = undefined;
		axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, '$1');
		store.emitChange('loginUpdated');
	}
}
const store = new Store();
export default store;
