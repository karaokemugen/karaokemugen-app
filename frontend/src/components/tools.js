import axios from 'axios';
import io from 'socket.io-client';
import Modal from './modals/Modal';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';

const socket = io();

export function getSocket() {
	return socket;
}

export function parseJwt(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
};

export function createCookie(name, value, days) {
	var expires;
	if (days) {
		var date = new Date();
		if (days === -1) days = 365 * 15;
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = '; expires=' + date.toGMTString();
	} else expires = '';
	document.cookie = name + '=' + value + expires + '; path=/';
};

export function readCookie(name) {
	var nameEQ = name + '=';
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
};

export function eraseCookie(name) {
	createCookie(name, '', -1);
};

export function is_touch_device() {
	var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
	var mq = function (query) {
		return window.matchMedia(query).matches;
	};

	if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
		return true;
	}

	// include the 'heartz' as a way to have a non matching MQ to help terminate the join
	// https://git.io/vznFH
	var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
	return mq(query);
};


export function expand(str, val) {
	return str.split('.').reduceRight((acc, currentValue) => {
		return { [currentValue]: acc };
	}, val);
};

export function dotify(obj) {
	//Code from the package node-dotify
	let res = {};
	function recurse(obj, current) {
		for (var key in obj) {
			let value = obj[key];
			let newKey = (current ? current + '.' + key : key);  // joined key with dot
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				recurse(value, newKey);  // it's a nested object, so do it again
			} else {
				res[newKey] = value;  // it's not an object, so set the property
			}
		}
	}
	recurse(obj);
	return res;
};

/* format seconds to Hour Minute Second */
export function secondsTimeSpanToHMS(s, format) {
	var d = Math.floor(s / (3600 * 24));
	if (format === '24h' || format === 'dhm') {
		s -= d * 3600 * 24;
	}
	var h = Math.floor(s / 3600);
	if (format !== 'ms') {
		s -= h * 3600;
	}
	var m = Math.floor(s / 60);
	s -= m * 60;

	var result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm' + (s < 10 ? '0' + s : s) + 's';
	if (format === 'ms') result = (m > 0 ? m + 'm' : '') + (s < 10 && m > 0 ? '0' + s : s) + 's';
	if (format === 'hm') result = (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	if (format === 'dhm') {
		result = (d > 0 ? d + 'd' : '') + (h > 0 ? h + 'h' : '') + (m < 10 ? '0' + m : m) + 'm';
	}
	return result;
};

export function startIntro(scope) {
	if (scope === 'admin') {
		axios.put('/api/admin/settings', JSON.stringify({ 'setting': { 'App': { 'FirstRun': false } } }));
	} else {
		createCookie('publicTuto', 'true');
	}
};


/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @return {String} the title
*/
export function buildKaraTitle(data) {
	var isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
	if (data.langs && isMulti) {
		data.langs = [isMulti];
	}
	var limit = window.innerWidth < 1025 ? 35 : 50;
	var serieText = data.serie ? data.serie : data.singers.map(e => e.name).join(', ');
	serieText = serieText.length <= limit ? serieText : serieText.substring(0, limit) + '…';
	var titleArray = [
		data.langs.map(e => e.name).join(', ').toUpperCase(),
		serieText,
		(data.songtypes[0].short ? + data.songtypes[0].short : data.songtypes[0].name) + (data.songorder > 0 ? ' ' + data.songorder : '')
	];
	var titleClean = titleArray.map(function (e, k) {
		return titleArray[k] ? titleArray[k] : '';
	});

	var separator = '';
	if (data.title) {
		separator = ' - ';
	}
	return titleClean.join(' - ') + separator + data.title;
};


/* display a fading message, useful to show success or errors */
export function displayMessage (type, title, message, time) {
	var transition = is_touch_device() ? 300 : 500;
	if (!time) time = 3500;
	var messageDiv = $('<div nb="' + 0 + '" class="toastMessage alert alert-' + type + '">');
	messageDiv.html('<strong>' + title + '</strong> ' + message);
	messageDiv.appendTo($('.toastMessageContainer'));
	setTimeout(function(){
		messageDiv.css('opacity', '1');
	}, 0);
	
	setTimeout(function(){
		if( window.getSelection().focusNode == null || window.getSelection().focusNode.parentNode != messageDiv[0]) {
			messageDiv.addClass('dismiss');
		} else {
			transition += 7000;
		}
		setTimeout(function(){
			messageDiv.remove();
		}, transition);
		
	}, time);

	messageDiv.click( function() {
		if( window.getSelection().focusNode == null  || window.getSelection().focusNode.parentNode != messageDiv[0]) {
			messageDiv.addClass('dismiss');
		} else {
			transition += 7000;
		}
		setTimeout(function(){
			messageDiv.remove();
		}, transition);
		
	});
};

export function callModal(type, title, message, callback, placeholder) {
	ReactDOM.render(<Suspense fallback={<div>loading...</div>}><Modal type={type} title={title} message={message}
		callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('modal'));
}