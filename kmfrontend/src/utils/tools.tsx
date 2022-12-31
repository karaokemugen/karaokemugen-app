import { EventEmitter } from 'events';
import i18next from 'i18next';
import { createElement, Dispatch, ReactNode } from 'react';
import { toast, ToastPosition, TypeOptions } from 'react-toastify';
import { DBKara } from '../../../src/lib/types/database/kara';

import { Criteria } from '../../../src/lib/types/playlist';
import nanamiCryPNG from '../assets/nanami-cry.png';
import nanamiCryWebP from '../assets/nanami-cry.webp';
import nanamiSingPng from '../assets/nanami-sing.png';
import nanamiSingWebP from '../assets/nanami-sing.webp';
import nanamiThinkPng from '../assets/nanami-think.png';
import nanamiThinkWebP from '../assets/nanami-think.webp';
import nanamiUmuPng from '../assets/nanami-umu.png';
import nanamiUmuWebP from '../assets/nanami-umu.webp';
import { showModal } from '../store/actions/modal';
import { GlobalContextInterface } from '../store/context';
import { ShowModal } from '../store/types/modal';
import { SettingsStoreData } from '../store/types/settings';
import Modal from './components/Modal';
import { getTagInLocale, getTitleInLocale } from './kara';
import { commandBackend } from './socket';

let is_touch = window.outerWidth <= 1023;
let is_large = window.outerWidth <= 1860;
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
			const newKey = current ? current + '.' + key : key; // joined key with dot
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				recurse(value, newKey); // it's a nested object, so do it again
			} else {
				res[newKey] = value; // it's not an object, so set the property
			}
		}
	}
	recurse(obj);
	return res;
}

/* format seconds to Hour Minute Second */
export function secondsTimeSpanToHMS(s: number, format: '24h' | 'dhm' | 'ms' | 'hm' | 'mm:ss') {
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

export function hmsToSecondsOnly(str: string) {
	const p = str.split(':');
	let s = 0;
	let m = 1;

	while (p.length > 0) {
		s += m * parseInt(p.pop(), 10);
		m *= 60;
	}

	return s;
}

const chibis = new Map<TypeOptions, ReactNode>([
	[
		'error',
		<picture>
			<source type="image/webp" srcSet={nanamiCryWebP} />
			<source type="image/png" srcSet={nanamiCryPNG} />
			<img src={nanamiCryPNG} alt="Nanami is crying :c" />
		</picture>,
	],
	[
		'warning',
		<picture>
			<source type="image/webp" srcSet={nanamiThinkWebP} />
			<source type="image/png" srcSet={nanamiThinkPng} />
			<img src={nanamiThinkPng} alt="Nanami is confused :/" />
		</picture>,
	],
	[
		'success',
		<picture>
			<source type="image/webp" srcSet={nanamiUmuWebP} />
			<source type="image/png" srcSet={nanamiUmuPng} />
			<img src={nanamiUmuPng} alt="Nanami is UmU" />
		</picture>,
	],
]);

export function displayMessage(
	type: TypeOptions,
	message: any,
	time = 3500,
	position: ToastPosition = 'top-left',
	id?: string | number
) {
	let item;
	if (typeof message === 'string') {
		item = (
			<div className="toast-with-img">
				{chibis.has(type) ? chibis.get(type) : null}
				<span>{message}</span>
			</div>
		);
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
	showModal(
		dispatch,
		createElement(Modal, {
			type,
			title,
			message,
			callback,
			placeholder,
			forceSmall,
			abortCallback,
		})
	);
}

export const nonStandardPlaylists = {
	favorites: 'efe3687f-9e0b-49fc-a5cc-89df25a17e94',
	library: '524de79d-10b2-49dc-90b1-597626d0cee8',
	animelist: 'f3f1d49c-b701-4ac7-8209-cbcaa64c2985',
};

export function isNonStandardPlaylist(plaid: string) {
	return Object.values(nonStandardPlaylists).includes(plaid);
}

export function isModifiable(context: GlobalContextInterface, repoName: string): boolean {
	const repo = context.globalState.settings.data.config.System.Repositories.find(r => r.Name === repoName);
	return repo && (repo.MaintainerMode || !repo.Online);
}

export function isRepoOnline(context: GlobalContextInterface, repoName: string): boolean {
	const repo = context.globalState.settings.data.config.System.Repositories.find(r => r.Name === repoName);
	return repo.Online;
}

export async function decodeCriteriaReason(settings: SettingsStoreData, criteria: Criteria) {
	const args: [string, Record<string, string>] = ['', {}];
	switch (criteria.type) {
		case 0:
			args[0] = 'YEAR';
			args[1] = { year: criteria.value };
			break;
		case 1001:
			args[0] = 'KID';
			break;
		case 1002:
			args[0] = 'LONGER';
			args[1] = { time: criteria.value };
			break;
		case 1003:
			args[0] = 'SHORTER';
			args[1] = { time: criteria.value };
			break;
		default:
			args[0] = 'TAG';
			const tag = await commandBackend('getTag', { tid: criteria.value });
			args[1] = {
				tag: getTagInLocale(settings, tag).i18n,
				verb: i18next.t(`CRITERIA.LABEL.TAG_VERBS.${criteria.type}`),
			};
			break;
	}
	args[0] = `CRITERIA.LABEL.${args[0]}`;
	return i18next.t(...args);
}

export function PLCCallback(response, context: GlobalContextInterface, kara: DBKara) {
	if (response && response.code && response.data?.plc) {
		let message;
		if (response.data?.plc.time_before_play) {
			const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
			message = (
				<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, {
						song: getTitleInLocale(
							context.globalState.settings.data,
							kara.titles,
							kara.titles_default_language
						),
					})}
					<br />
					{i18next.t('KARA_DETAIL.TIME_BEFORE_PLAY', {
						time: beforePlayTime,
						date: playTimeDate,
					})}
				</>
			);
		} else {
			message = (
				<>
					{i18next.t(`SUCCESS_CODES.${response.code}`, {
						song: getTitleInLocale(
							context.globalState.settings.data,
							kara.titles,
							kara.titles_default_language
						),
					})}
				</>
			);
		}
		displayMessage(
			'success',
			<div className="toast-with-img">
				<picture>
					<source type="image/webp" srcSet={nanamiSingWebP} />
					<source type="image/png" srcSet={nanamiSingPng} />
					<img src={nanamiSingPng} alt="Nanami is singing!" />
				</picture>
				<span>
					{message}
					<br />
					<button
						className="btn"
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
								.then(() => {
									toast.dismiss(response.data.plc.plcid);
									displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
								})
								.catch(() => {
									toast.dismiss(response.data.plc.plcid);
								});
						}}
					>
						{i18next.t('CANCEL')}
					</button>
				</span>
			</div>,
			10000,
			'top-left',
			response.data.plc.plcid
		);
	}
}
