import React from 'react';
import ReactDOM from 'react-dom';
import { toast, TypeOptions } from 'react-toastify';
import io from 'socket.io-client';

import { DBKaraTag } from '../../../src/lib/types/database/kara';
import { DBPLC } from '../../../src/types/database/playlist';
import store from '../store';
import Modal from './modals/Modal';
import Tutorial from './modals/Tutorial';


const socket = io();

let is_touch = window.outerWidth <= 1023;

export function getSocket() {
	return socket;
}

export function parseJwt(token: string) {
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
}

export function is_touch_device() {
	if (!document.hidden) {
		is_touch = window.outerWidth <= 1023;
		return is_touch;
	} else {
		return is_touch;
	}
}

export function expand(str: string, val: any) {
	return str.split('.').reduceRight((acc, currentValue) => {
		return { [currentValue]: acc };
	}, val);
}

export function dotify(obj: any) {
	//Code from the package node-dotify
	const res: any = {};
	function recurse(obj: any, current?: any) {
		for (const key in obj) {
			const value = obj[key];
			const newKey = (current ? current + '.' + key : key);  // joined key with dot
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				recurse(value, newKey);  // it's a nested object, so do it again
			} else {
				res[newKey] = value;  // it's not an object, so set the property
			}
		}
	}
	recurse(obj);
	return res;
}

/* format seconds to Hour Minute Second */
export function secondsTimeSpanToHMS(s: number, format: string) {
	const d = Math.floor(s / (3600 * 24));
	if (format === '24h' || format === 'dhm') {
		s -= d * 3600 * 24;
	}
	const h = Math.floor(s / 3600);
	if (format !== 'ms') {
		s -= h * 3600;
	}
	const m = Math.floor(s / 60);
	s -= m * 60;

	let result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm' + (s < 10 ? '0' + s : s) + 's';
	if (format === 'ms') result = (m > 0 ? m + 'm' : '') + (s < 10 && m > 0 ? '0' + s : s) + 's';
	if (format === 'hm') result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	if (format === 'dhm') result = (d > 0 ? d + 'd' : '') + (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	if (format === 'mm:ss') result = m + ':' + (s < 10 ? '0' + s : s);
	return result;
}

export function startIntro(scope: string) {
	store.setTuto(ReactDOM.render(
		React.createElement(Tutorial, { scope: scope }),
		document.getElementById('tuto')
	));

	return store.getTuto();
}

/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @param {boolean} onlyText - if only text and no component
* @return {String} the title
*/
export function buildKaraTitle(data: DBPLC, onlyText?: boolean, i18nParam?: any) {
	const isMulti = data.langs ? data.langs.find(e => e.name.indexOf('mul') > -1) : false;
	if (data.langs && isMulti) {
		data.langs = [isMulti];
	}
	const serieText = (data.series && data.series.length > 0) ? data.series.slice(0, 3).map(e => getSerieLanguage(e, data.langs[0].name, i18nParam)).join(', ')
		+ (data.series.length > 3 ? '...' : '')
		: (data.singers ? data.singers.slice(0, 3).map(e => e.name).join(', ') + (data.singers.length > 3 ? '...' : '') : '');
	const langsText = data.langs.map(e => e.name).join(', ').toUpperCase();
	const songtypeText = data.songtypes.map(e => e.short ? + e.short : e.name).sort().join(' ');
	const songorderText = data.songorder > 0 ? ' ' + data.songorder : '';

	if (onlyText) {
		return `${langsText} - ${serieText} - ${songtypeText} ${songorderText} - ${data.title}`;
	} else {
		return (
			<React.Fragment>
				<div>{langsText}</div>
				<div>&nbsp;-&nbsp;</div>
				<div className="karaTitleSerie">{serieText}</div>
				<div>&nbsp;-&nbsp;</div>
				<div>{`${songtypeText} ${songorderText}`}</div>
				<div>&nbsp;-&nbsp;</div>
				<div className="karaTitleTitle">{data.title}</div>
			</React.Fragment>
		);
	}
}

export function getTagInLanguage(tag: DBKaraTag, mainLanguage: string, fallbackLanguage: string, i18nParam?: any) {
	const i18n = (i18nParam && i18nParam[tag.tid]) ? i18nParam[tag.tid] : tag.i18n;
	if (i18n) {
		return i18n[mainLanguage] ? i18n[mainLanguage] :
			(i18n[fallbackLanguage] ? i18n[fallbackLanguage] : tag.name);
	} else {
		return tag.name;
	}
}

export function getSerieLanguage(tag: DBKaraTag, karaLanguage: string, i18nParam?: any) {
	const user = store.getUser();
	let mode: number | undefined = user && user.series_lang_mode;
	if (!user || user.series_lang_mode === -1) {
		mode = store.getConfig().Frontend.SeriesLanguageMode;
	}

	if (mode === 0) {
		return tag.name;
	} else if (mode === 1) {
		return getTagInLanguage(tag, karaLanguage, 'eng', i18nParam);
	} else if (mode === 2) {
		return getTagInLanguage(tag, store.getState().defaultLocale, 'eng', i18nParam);
	} else if (mode === 3) {
		return getTagInLanguage(tag, store.getNavigatorLanguage() as string, 'eng', i18nParam);
	} else if (mode === 4) {
		if (user && user.main_series_lang && user.fallback_series_lang) {
			return getTagInLanguage(tag, user.main_series_lang, user.fallback_series_lang, i18nParam);
		} else {
			return getTagInLanguage(tag, store.getNavigatorLanguage() as string, 'eng', i18nParam);
		}
	}
	return tag.name;
}


export function displayMessage(type: TypeOptions, message: any, time?: number) {
	if (!document.hidden) {
		if (!time) time = 3500;
		toast(message, { type: type, autoClose: time, position: 'top-left', pauseOnFocusLoss: false });
	}
}

export function callModal(type: string, title: any, message: any, callback?: any, placeholder?: string, forceSmall?: boolean) {
	ReactDOM.render(
		React.createElement(Modal,
			{ type: type, title: title, message: message, callback: callback, placeholder: placeholder, forceSmall: forceSmall }),
		document.getElementById('modal')
	);
}
