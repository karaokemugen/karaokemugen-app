export function isElectron() {
	// Renderer process
	if (typeof window !== 'undefined' && typeof window.process === 'object' && (window.process as any).type === 'renderer') {
		return true;
	}

	// Main process
	if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!(process.versions as any).electron) {
		return true;
	}

	// Detect the user agent when the `nodeIntegration` option is set to true
	if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
		return true;
	}

	return false;
}

export function parseJwt(token:string) {
	let base64Url = token.split('.')[1];
	let base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
};

if (isElectron()) {
	addListener();
}

export function addListener() {
	document.addEventListener('drop', drop);
	document.addEventListener('dragover', dragOver);
}

export function removeListener() {
	document.removeEventListener('drop', drop);
	document.removeEventListener('dragover', dragOver);
}

export function drop(event) {
	event.preventDefault();
	event.stopPropagation();
	const token = localStorage.getItem('kmToken');
	const username = token
		? parseJwt(token).username
		: 'admin'
	const { ipcRenderer } = window.require("electron");
	ipcRenderer.send('droppedFiles', {
		username: username,
		files: Array.from(event.dataTransfer.files).map(file  => (file as any).path)
	});
}

export function dragOver(e) {
	e.preventDefault();
	e.stopPropagation();
}