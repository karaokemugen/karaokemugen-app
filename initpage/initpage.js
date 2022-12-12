/* eslint-env browser */

// https://github.com/bryanwoods/autolink-js
(function () {
	const slice = [].slice;

	const autoLink = function () {
		const options = 1 <= arguments.length ? slice.call(arguments, 0) : [];
		const pattern =
			/(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026@#/%=~()_|])/gi;
		if (!(options.length > 0)) {
			return this.replace(pattern, '$1<a href="$2">$2</a>');
		}
		const option = options[0];
		const callback = option['callback'];
		const linkAttributes = (function () {
			const results = [];
			for (const k in option) {
				const v = option[k];
				if (k !== 'callback') {
					results.push(' ' + k + "='" + v + "'");
				}
			}
			return results;
		})().join('');
		return this.replace(pattern, function (match, space, url) {
			const link =
				(typeof callback === 'function' ? callback(url) : void 0) ||
				"<a href='" + url + "'" + linkAttributes + '>' + url + '</a>';
			return '' + space + link;
		});
	};

	String.prototype['autoLink'] = autoLink;
}.call(this));

const ipcRenderer = require('electron').ipcRenderer;

let buttonLogsStatus = false;
let KMStarting = false;
let timeout;

ipcRenderer.on('initStep', (event, data) => {
	if (!KMStarting) KMStarting = true;
	const message = document.querySelector('.ip--message');
	const dots = document.querySelector('.ip--loading-dots');
	const nanamiSD = document.querySelector('.ip--nanami > img');
	const container = document.querySelector('.ip--progress-bar-container');

	message.innerHTML = data.message;
	dots.innerHTML += '<span></span>';
	container.dataset.showBar = 'false';
	dots.dataset.hide = 'false';

	if (data.lastEvent) {
		nanamiSD.src = './public/nanami-XD.png';
	} else {
		nanamiSD.src = './public/nanami-hehe2.png';
	}
});
ipcRenderer.on('log', (event, data) => {
	const div = document.querySelector('.ip--logs');
	div.innerHTML +=
		'<li>' +
		(data.service ? '<b>[' + data.service + ']</b> ' : '') +
		data.message +
		(data.obj && Object.keys(data.obj).length > 0 ? ' (' + JSON.stringify(data.obj, null, 2) + ')' : '') +
		'</li>';
	div.scroll(0, div.scrollHeight);
});
ipcRenderer.on('error', (event, data) => {
	if (!buttonLogsStatus) clickButton();
	const div = document.querySelector('.ip--message');
	div.innerHTML = '<div>' + data.message + '</div>';
	const nanamiSD = document.querySelector('.ip--nanami > img');
	nanamiSD.src = './public/nanami-surpris.png';
	const tip = document.querySelector('.ip--protip');
	tip.className = 'ip--protip ip--error';
	askTip();
});
ipcRenderer.on('techTip', (event, data) => {
	const tiptitle = document.querySelector('.ip--protip > .title');
	const tipbox = document.querySelector('.ip--protip > .content');
	tipbox.innerHTML = data.tip.autoLink({ target: '_blank' });
	tiptitle.innerText = data.title;
	timeout = setTimeout(askTip, data.duration);
});
ipcRenderer.on('tasksUpdated', (event, data) => {
	for (const task of data) {
		if (task?.text === 'GENERATING' || task?.text === 'MIGRATING_DATABASE') {
			setProgressBar(task.percentage, task.subtext);
		}
	}
});

document.querySelector('.ip--button-logs').addEventListener('click', clickButton);

function askTip() {
	ipcRenderer.send('tip');
}

function clickButton() {
	const wrapper = document.querySelector('.initpage--wrapper');
	buttonLogsStatus = wrapper.dataset.displayLog === 'true';
	wrapper.dataset.displayLog = buttonLogsStatus ? 'false' : 'true';
	const div = document.querySelector('.ip--logs');
	div.scroll(0, div.scrollHeight);
}

function setProgressBar(pct, text) {
	const dots = document.querySelector('.ip--loading-dots');
	const container = document.querySelector('.ip--progress-bar-container');
	const bar = document.querySelector('.ip--progress-bar');
	const textEl = document.querySelector('.ip--progress-text');
	const nanamiSD = document.querySelector('.ip--nanami > img');
	if (pct < 100) {
		container.dataset.showBar = 'true';
		dots.dataset.hide = 'true';
		// Don't apply animations to clients asking against
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			nanamiSD.src = './public/nanami-searching.gif';
		}
	} else {
		container.dataset.showBar = 'false';
		container.dataset.hide = 'false';
	}
	bar.style.width = `${pct}%`;
	textEl.innerHTML = text;
}

function panic() {
	// If, after, 5 seconds, we don't receive any feedback from IPC, panic.
	if (!KMStarting) {
		if (timeout) clearTimeout(timeout);
		if (!buttonLogsStatus) clickButton();
		const message = document.querySelector('.ip--message');
		message.innerText = 'Karaoke Mugen is not starting';
		const nanamiSD = document.querySelector('.ip--nanami > img');
		nanamiSD.src = './public/nanami-surpris.png';
		const tip = document.querySelector('.ip--protip');
		tip.className = 'ip--protip ip--error';
		const tiptitle = document.querySelector('.ip--protip > .title');
		const tipbox = document.querySelector('.ip--protip > .content');
		tipbox.innerHTML =
			"Karaoke Mugen is halting at start, something isn't right with the start process. " +
			'You can reach us on Discord for help: http://karaokes.moe/discord'.autoLink();
		tiptitle.innerText = 'Weird?';
	}
}

ipcRenderer.send('initPageReady');
setTimeout(panic, 5000);
askTip();
