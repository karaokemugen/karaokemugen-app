import { EventEmitter } from 'events';
import i18next from 'i18next';
import React, { Dispatch, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { toast, ToastPosition, TypeOptions } from 'react-toastify';

import nanamiCryPNG from '../assets/nanami-cry.png';
import nanamiCryWebP from '../assets/nanami-cry.webp';
import nanamiThinkPng from '../assets/nanami-think.png';
import nanamiThinkWebP from '../assets/nanami-think.webp';
import nanamiUmuPng from '../assets/nanami-umu.png';
import nanamiUmuWebP from '../assets/nanami-umu.webp';
import Tutorial from '../frontend/components/modals/Tutorial';
import { showModal } from '../store/actions/modal';
import { GlobalContextInterface } from '../store/context';
import { ShowModal } from '../store/types/modal';
import { SettingsStoreData } from '../store/types/settings';
import Modal from './components/Modal';
import { getTagInLocale } from './kara';
import { commandBackend } from './socket';

let is_touch = window.outerWidth <= 1023;
let is_large = window.outerWidth <= 1860;
let tuto: any;
export let lastLocation = '';

export function setLastLocation(location) {
	lastLocation = location;
}

class Event extends EventEmitter {
	emitChange(event: any, data?: any) {
		this.emit(event, data);
	}

	addChangeListener(event: any, callback: any) {
		this.on(event, callback);
	}

	removeChangeListener(event: any, callback: any) {
		this.removeListener(event, callback);
	}
}
export const eventEmitter = new Event();

export function is_touch_device() {
	if (!document.hidden) {
		is_touch = window.outerWidth <= 1023;
		return is_touch;
	} else {
		return is_touch;
	}
}

export function is_large_device() {
	if (!document.hidden) {
		is_large = window.outerWidth <= 1860;
		return is_large;
	} else {
		return is_large;
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

export function startIntro() {
	tuto = ReactDOM.render(React.createElement(Tutorial), document.getElementById('tuto'));
	return tuto;
}

const chibis = new Map<TypeOptions, ReactNode>([
	[
		'error',
		(<picture>
			<source type="image/webp" srcSet={nanamiCryWebP} />
			<source type="image/png" srcSet={nanamiCryPNG} />
			<img src={nanamiCryPNG} alt="Nanami is crying :c" />
		</picture>)
	],
	[
		'warning',
		(<picture>
			<source type="image/webp" srcSet={nanamiThinkWebP} />
			<source type="image/png" srcSet={nanamiThinkPng} />
			<img src={nanamiThinkPng} alt="Nanami is confused :/" />
		</picture>)
	],
	[
		'success',
		(<picture>
			<source type="image/webp" srcSet={nanamiUmuWebP} />
			<source type="image/png" srcSet={nanamiUmuPng} />
			<img src={nanamiUmuPng} alt="Nanami is UmU" />
		</picture>)
	]
]);

export function displayMessage(type: TypeOptions, message: any, time = 3500, position: ToastPosition = 'top-left', id?: string | number) {
	let item;
	if (typeof message === 'string') {
		item = (<div className="toast-with-img">
			{chibis.has(type) ? chibis.get(type) : null}
			<span>{message}</span>
		</div>);
	} else item = message;
	if (!document.hidden) {
		toast(item, { type: type, autoClose: time ? time : false, position, pauseOnFocusLoss: false, toastId: id });
	}
}

export function callModal(
	dispatch: Dispatch<ShowModal>,
	type: string,
	title: any,
	message: any,
	callback?: any,
	placeholder?: string,
	forceSmall?: boolean,
	abortCallback?: boolean
) {
	showModal(dispatch, React.createElement(Modal, {
		type,
		title,
		message,
		callback,
		placeholder,
		forceSmall,
		abortCallback
	}));
}

export const nonStandardPlaylists = {
	blacklist: '4398bed2-e272-47f5-9dd9-db7240e8557e', // -2
	blc: '91a9961a-8863-48a5-b9d0-fc4c1372a11a', // -4
	whitelist: '4c5dbb18-278b-448e-9a1f-8cf5f1e24dc7', // -3
	favorites: 'efe3687f-9e0b-49fc-a5cc-89df25a17e94', // -5
	library: '524de79d-10b2-49dc-90b1-597626d0cee8' // -1
};

export function isNonStandardPlaylist(plaid: string) {
	return Object.values(nonStandardPlaylists).includes(plaid);
}

export function isModifiable(context: GlobalContextInterface, repoName: string): boolean {
	const repo = context.globalState.settings.data.config.System.Repositories.find(r => r.Name === repoName);
	return repo.MaintainerMode || !repo.Online;
}

export async function decodeBlacklistingReason(settings: SettingsStoreData, reason: string) {
	const parts = reason.split(':');
	const args: [string, Record<string, string>] = [parts[0], {}];
	switch (parts[0]) {
		case 'TAG':
			if (parts.length === 3) {
				const tid = parts[1];
				const type = parts[2];
				const tag = await commandBackend('getTag', { tid });
				args[1] = {
					tag: getTagInLocale(settings, tag),
					verb: i18next.t(`BLACKLIST.LABEL.TAG_VERBS.${type}`)
				};
			}
			break;
		case 'YEAR':
			if (parts.length === 2) {
				const year = parts[1];
				args[1] = { year };
			}
			break;
		case 'KID':
			break;
		case 'LONGER':
		case 'SHORTER':
			if (parts.length === 2) {
				const time = parts[1];
				args[1] = { time };
			}
			break;
		case 'TITLE':
		case 'TAG_NAME':
			if (parts.length >= 2) {
				const [type, ...titleParts] = parts;
				const title = titleParts.join(':');
				args[1] = { title };
			}
			break;
		default:
			args[0] = 'UNKNOWN';
			args[1] = {};
	}
	args[0] = `BLACKLIST.LABEL.${args[0]}`;
	return i18next.t(...args);
}
