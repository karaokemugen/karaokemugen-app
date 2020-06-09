/* eslint-env browser */

// https://github.com/bryanwoods/autolink-js
(function() {
	let autoLink,
		slice = [].slice;

	autoLink = function() {
		let callback, k, linkAttributes, option, options, pattern, v;
		options = 1 <= arguments.length ? slice.call(arguments, 0) : [];
		pattern = /(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026@#/%=~()_|])/gi;
		if (!(options.length > 0)) {
			return this.replace(pattern, '$1<a href="$2">$2</a>');
		}
		option = options[0];
		callback = option['callback'];
		linkAttributes = ((function() {
			let results;
			results = [];
			for (k in option) {
				v = option[k];
				if (k !== 'callback') {
					results.push(' ' + k + '=\'' + v + '\'');
				}
			}
			return results;
		})()).join('');
		return this.replace(pattern, function(match, space, url) {
			const link = (typeof callback === 'function' ? callback(url) : void 0) || ('<a href=\'' + url + '\'' + linkAttributes + '>' + url + '</a>');
			return '' + space + link;
		});
	};

	String.prototype['autoLink'] = autoLink;

}).call(this);

const ipcRenderer = require('electron').ipcRenderer;
ipcRenderer.on('initStep', (event, data) => {
	const message = document.querySelector('.ip--message');
	const dots = document.querySelector('.ip--loading-dots');

	message.innerHTML = data.message;
	dots.innerHTML += '<span></span>';

	const nanamiSD =document.querySelector('.ip--nanami > img');
	if (data.lastEvent) {
		nanamiSD.src = './public/nanami-XD.png';
	} else {
		nanamiSD.src = './public/nanami-hehe2.png';
	}
});
ipcRenderer.on('log', (event, data) => {
	const div = document.querySelector('.ip--logs');
	div.innerHTML += '<li>' + data.message + '</li>';
});
ipcRenderer.on('error', (event, data) => {
	if (!buttonLogsStatus) clickButton();
	const div = document.querySelector('.ip--message');
	div.innerHTML = '<div>' + data.message + '</div>';
	const nanamiSD = document.querySelector('.ip--nanami > img');
	nanamiSD.src = './public/nanami-surpris.png';
	const tip = document.querySelector('.ip--protip');
	tip.className = 'ip--protip ip--error';
});
ipcRenderer.on('tip', (event, data) => {
	const tipbox = document.querySelector('.ip--protip');
	tipbox.innerHTML = data.message.autoLink({target: '_blank'});
});
ipcRenderer.on('tasksUpdated', (event, data) => {
	console.log(data);
	if (Object.keys(data).length > 0) {
		const task = data[Object.keys(data)[0]];
		if (task?.text === 'GENERATING') {
			setProgressBar(task.percentage, task.subtext);
		}
	}
});


const buttonLogsStatus = false;
document.querySelector('.ip--button-logs').onclick = clickButton;

function clickButton () {
	const wrapper = document.querySelector('.initpage--wrapper');
	const displayLog = wrapper.dataset.displayLog === 'true';
	wrapper.dataset.displayLog = displayLog ? 'false':'true';
}

function setProgressBar(pct, text) {
	const container = document.querySelector('.ip--progress-bar-container');
	const bar = document.querySelector('.ip--progress-bar');
	const textEl = document.querySelector('.ip--progress-text');
	if (pct < 100) {
		container.dataset.showBar = 'true';
	} else {
		container.dataset.showBar = 'false';
	}
	bar.style.width = `${pct}%`;
	textEl.innerHTML = text;
}

ipcRenderer.send('initPageReady');