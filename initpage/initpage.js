const ipcRenderer = require('electron').ipcRenderer
ipcRenderer.on('initStep', (event, data)=> {
	let message =document.querySelector('.ip--message');
	let dots =document.querySelector('.ip--loading-dots');

	message.innerHTML = data.message;
	dots.innerHTML += "<span></span>";

	let nanamiSD =document.querySelector('.ip--nanami');
	if (data.lastEvent) {
		nanamiSD.innerHTML = "<img src='./public/nanami-XD.png' />";
	} else {
		nanamiSD.innerHTML = "<img src='./public/nanami-hehe2.png' />";
	}
});
ipcRenderer.on('log', (event, data)=> {
	let div =document.querySelector(".ip--logs");
	div.innerHTML += "<li>" + data.message + "</li>"
})
ipcRenderer.on('error', (event, data)=> {
	if (!buttonLogsStatus) clickButton();
	let div =document.querySelector('.ip--message');
	div.innerHTML = "<div>" + data.message + "</div>";
	let nanamiSD =document.querySelector('.ip--nanami');
	nanamiSD.innerHTML = "<img src='./public/nanami-surpris.png' />";
})

let buttonLogsStatus = false;
document.querySelector(".ip--button-logs").onclick = clickButton;

function clickButton () {
	let wrapper = document.querySelector(".initpage--wrapper");
	let displayLog = wrapper.getAttribute('data-display-log')==="true";
	wrapper.setAttribute('data-display-log', displayLog ? "false":"true");
}

ipcRenderer.send('initPageReady');