import { EventEmitter } from 'events';
import React, { Dispatch } from 'react';
import ReactDOM from 'react-dom';
import { toast, TypeOptions } from 'react-toastify';

import Tutorial from '../frontend/components/modals/Tutorial';
import { showModal } from '../store/actions/modal';
import { ShowModal } from '../store/types/modal';
import useGlobalState from '../store/useGlobalState';
import Modal from './components/Modal';

let is_touch = window.outerWidth <= 1023;
let is_large = window.outerWidth <= 1860;
let tuto:any;
export let lastLocation = '';

export function setLastLocation(location) {
	lastLocation = location;
}

class Event extends EventEmitter {
	emitChange(event:any, data?:any) {
		this.emit(event, data);
	}

	addChangeListener(event:any, callback:any) {
		this.on(event, callback);
	}

	removeChangeListener(event:any, callback:any) {
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

export function displayMessage(type: TypeOptions, message: any, time = 3500) {
	if (!document.hidden) {
		toast(message, { type: type, autoClose: time, position: 'top-left', pauseOnFocusLoss: false });
	}
}

export function callModal(dispatch: Dispatch<ShowModal>, type: string, title: any, message: any, callback?: any, placeholder?: string, forceSmall?: boolean) {
	showModal(dispatch,
		React.createElement(Modal,
			{ type: type, title: title, message: message, callback: callback, placeholder: placeholder, forceSmall: forceSmall })
	);
}
