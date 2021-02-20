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
	const base64Url = token.split('.')[1];
	const base64 = base64Url.replace('-', '+').replace('_', '/');
	return JSON.parse(window.atob(base64));
}

addListener();

export function addListener() {
	if (isElectron()) {
		document.addEventListener('drop', drop);
		document.addEventListener('dragover', dragOver);
	}
}

export function removeListener() {
	if (isElectron()) {
		document.removeEventListener('drop', drop);
		document.removeEventListener('dragover', dragOver);
	}
}

export function drop(event) {
	event.preventDefault();
	event.stopPropagation();
	const token = localStorage.getItem('kmToken');
	const onlineToken = localStorage.getItem('kmOnlineToken');
	const username = token
		? parseJwt(token).username
		: 'admin';
	sendIPC('droppedFiles', {
		username: username,
		onlineToken,
		files: Array.from(event.dataTransfer.files).map(file => (file as any).path)
	});
}

export function sendIPC(command: string, content?: any) {
	const { ipcRenderer } = window.require('electron');
	ipcRenderer.send(command, content);
}

export function dragOver(e) {
	e.preventDefault();
	e.stopPropagation();
}
