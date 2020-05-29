// https://github.com/bryanwoods/autolink-js
(function() {
	var autoLink,
		slice = [].slice;

	autoLink = function() {
		var callback, k, linkAttributes, option, options, pattern, v;
		options = 1 <= arguments.length ? slice.call(arguments, 0) : [];
		pattern = /(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
		if (!(options.length > 0)) {
			return this.replace(pattern, "$1<a href='$2'>$2</a>");
		}
		option = options[0];
		callback = option["callback"];
		linkAttributes = ((function() {
			var results;
			results = [];
			for (k in option) {
				v = option[k];
				if (k !== 'callback') {
					results.push(" " + k + "='" + v + "'");
				}
			}
			return results;
		})()).join('');
		return this.replace(pattern, function(match, space, url) {
			var link;
			link = (typeof callback === "function" ? callback(url) : void 0) || ("<a href='" + url + "'" + linkAttributes + ">" + url + "</a>");
			return "" + space + link;
		});
	};

	String.prototype['autoLink'] = autoLink;

}).call(this);

const ipcRenderer = require('electron').ipcRenderer
ipcRenderer.on('initStep', (event, data) => {
	let message = document.querySelector('.ip--message');
	let dots = document.querySelector('.ip--loading-dots');

	message.innerHTML = data.message;
	dots.innerHTML += "<span></span>";

	let nanamiSD =document.querySelector('.ip--nanami > img');
	if (data.lastEvent) {
		nanamiSD.src = "./public/nanami-XD.png";
	} else {
		nanamiSD.src = "./public/nanami-hehe2.png";
	}
});
ipcRenderer.on('log', (event, data) => {
	let div = document.querySelector(".ip--logs");
	div.innerHTML += "<li>" + data.message + "</li>"
})
ipcRenderer.on('error', (event, data) => {
	if (!buttonLogsStatus) clickButton();
	let div = document.querySelector('.ip--message');
	div.innerHTML = "<div>" + data.message + "</div>";
	let nanamiSD = document.querySelector('.ip--nanami > img');
	nanamiSD.src = "./public/nanami-surpris.png";
	let tip = document.querySelector('.ip--protip');
	tip.className = "ip--protip ip--error";
})
ipcRenderer.on('tip', (event, data) => {
	let tipbox = document.querySelector('.ip--protip');
	tipbox.innerHTML = data.message.autoLink({target: '_blank'});
});

let buttonLogsStatus = false;
document.querySelector(".ip--button-logs").onclick = clickButton;

function clickButton () {
	let wrapper = document.querySelector(".initpage--wrapper");
	let displayLog = wrapper.dataset.displayLog === "true";
	wrapper.dataset.displayLog = displayLog ? "false":"true";
}

ipcRenderer.send('initPageReady');