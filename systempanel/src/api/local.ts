import axios from 'axios';

/**
 * I'll be naming api requests with the first word being the http method.
 * ex. getSomeThing || postSomething || ...etc
 */

// GET karas with/without filter.
export async function getLocalKaras() {
	try {
		const res = await axios.get('/api/system/karas');
		return res.data.content;
	} catch (e) {
		console.log('Error from /api/local.js:getLocalKaras()');
		throw e;
	}
}

// START karas download queue
export async function putToDownloadQueueStart() {
	try {
		const res = await axios.put('/api/system/downloads/start');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:putToDownloadQueueStart');
		throw e;
	}
}

// PAUSE karas download queue
export async function putToDownloadQueuePause() {
	try {
		const res = await axios.put('/api/system/downloads/pause');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:putToDownloadQueuePause');
		throw e;
	}
}

// GET karas download queue
export async function getDownloadQueue() {
	try {
		const res = await axios.get('/api/system/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:getDownloadQueue');
		throw e;
	}
}

// DELETE all karas download queue
export async function deleteDownloadQueue() {
	try {
		const res = await axios.delete('/api/system/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:deleteDownloadQueue');
		throw e;
	}
}

// DELETE s pecific karas download queue
export async function deleteKAraFromDownloadQueue(kid) {
	try {
		const res = await axios.delete('/api/system/downloads/'+kid);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:deleteKAraFromDownloadQueue');
		throw e;
	}
}

// POST (add) items to download queue
export async function postToDownloadQueue(repo = 'kara.moe', downloads) {
	try {
		const dl = {
			repository: repo,
			downloads
		};
		await axios.post('/api/system/downloads', dl);
	} catch (e) {
		console.log('Error from /api/local.js:postToDownloadQueue');
		throw e;
	}
}

// UPDATE ALL karas
export async function updateAllToDownloadQueue(repo = 'kara.moe') {
	try {
		const data = {
			repository: repo
		};
		const res = await axios.post('/api/system/downloads/update', data);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:updateAllToDownloadQueue');
		throw e;
	}
}

export async function deleteKaraByLocalId(karaId) {
	try {
		const response = await axios.delete(`/api/system/karas/${karaId}`);
		return response.status === 200;
	} catch (e) {
		console.log('Error from /api/local.js:deleteKaraByLocalId');
		throw e;
	}
}