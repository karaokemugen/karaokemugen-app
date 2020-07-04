import languages from '@cospired/i18n-iso-languages';
import axios from 'axios';
import { EventEmitter } from 'events'; 

import { Token, User } from '../../src/lib/types/user';
import { Config } from '../../src/types/config';
import { PublicState,Version } from '../../src/types/state';
import { parseJwt} from './components/tools';

let filterValue1 = '';
let filterValue2 = '';
let posPlaying:number;
let timer:NodeJS.Timeout;
let tuto:any;
let config:Config;
let state:PublicState;
let logInfos:Token|undefined;
let version:Version;
let user:User|undefined;
const navigatorLanguage:string = languages.alpha2ToAlpha3B(navigator.languages[0].substring(0, 2));
let currentBlSet:number;

if (!logInfos) {
	const token = localStorage.getItem('kmToken');
	const onlineToken = localStorage.getItem('kmOnlineToken');
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

class Store extends EventEmitter {

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

	getCurrentBlSet() {
		return currentBlSet;
	}

	setCurrentBlSet(blset:number) {
		currentBlSet = blset;
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

	getState() {
		return state;
	}

	setState(publicState:PublicState) {
		state = publicState;
	}

	getUser() {
		return user;
	}

	getNavigatorLanguage() {
		return navigatorLanguage;
	}

	async setUser() {
		if (logInfos) {
			user = (await axios.get('/myaccount')).data;
		} else {
			user = undefined;
		}
	}

	getLogInfos() {
		return logInfos;
	}

	setLogInfos(data:{token: string, onlineToken:string}) {
		if (data.token) {
			logInfos = parseJwt(data.token) as Token;
			localStorage.setItem('kmToken', data.token);
			if (data.onlineToken) {
				localStorage.setItem('kmOnlineToken', data.onlineToken);
				logInfos.onlineToken = data.onlineToken;
			} else if (!logInfos.username.includes('@')) {
				logInfos.onlineToken = undefined;
				localStorage.removeItem('kmOnlineToken');
			}

			logInfos.token = data.token;

			axios.defaults.headers.common['authorization'] = localStorage.getItem('kmToken');
			axios.defaults.headers.common['onlineAuthorization'] = localStorage.getItem('kmOnlineToken');
			store.emitChange('loginUpdated');
		}
	}

	logOut() {
		localStorage.removeItem('kmToken');
		localStorage.removeItem('kmOnlineToken');
		logInfos = undefined;
		axios.defaults.headers.common['authorization'] = null;
		axios.defaults.headers.common['onlineAuthorization'] = null;
		store.emitChange('loginOut');
		this.setUser();
	}
}
const store = new Store();
export default store;
