import axios from 'axios';
import {KaraDownloadRequest} from '../../../src/types/download';

/**
 * I'll be naming api requests with the first word being the http method.
 * ex. getSomeThing || postSomething || ...etc
 */

// GET karas with/without filter.
export async function getLocalKaras() {
	try {
		const res = await axios.get('/api/karas');
		return res.data.content;
	} catch (e) {
		console.log('Error from /api/local.js:getLocalKaras()');
		throw e;
	}
}

// START karas download queue
export async function putToDownloadQueueStart() {
	try {
		const res = await axios.put('/api/downloads/start');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:putToDownloadQueueStart');
		throw e;
	}
}

// PAUSE karas download queue
export async function putToDownloadQueuePause() {
	try {
		const res = await axios.put('/api/downloads/pause');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:putToDownloadQueuePause');
		throw e;
	}
}

// GET karas download queue
export async function getDownloadQueue() {
	try {
		const res = await axios.get('/api/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:getDownloadQueue');
		throw e;
	}
}

// DELETE all karas download queue
export async function deleteDownloadQueue() {
	try {
		const res = await axios.delete('/api/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:deleteDownloadQueue');
		throw e;
	}
}

// DELETE s pecific karas download queue
export async function deleteKAraFromDownloadQueue(kid) {
	try {
		const res = await axios.delete('/api/downloads/'+kid);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:deleteKAraFromDownloadQueue');
		throw e;
	}
}

// POST (add) items to download queue
export async function postToDownloadQueue(repo:string = 'kara.moe', downloads:KaraDownloadRequest[]) {
	try {
		const dl = {
			repository: repo,
			downloads
		};
		await axios.post('/api/downloads', dl);
	} catch (e) {
		console.log('Error from /api/local.js:postToDownloadQueue');
		throw e;
	}
}

// DOWNLOAD ALL karas
export async function postAllToDownloadQueue(repo = 'kara.moe') {
	try {
		const data = {
			repository: repo
		};
		const res = await axios.post('/api/downloads/all', data);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:downloadAllToDownloadQueue');
		throw e;
	}
}

// UPDATE ALL karas
export async function postUpdateToDownloadQueue(repo = 'kara.moe') {
	try {
		const data = {
			repository: repo
		};
		const res = await axios.post('/api/downloads/update', data);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:updateAllToDownloadQueue');
		throw e;
	}
}

// Remove all local karas not on remote repositories
export async function postCleanToDownloadQueue(repo = 'kara.moe') {
	try {
		const data = {
			repository: repo
		};
		const res = await axios.post('/api/downloads/clean ', data);
		return res.data;
	} catch (e) {
		console.log('Error from /api/local.js:postCleanToDownloadQueue');
		throw e;
	}
}

export async function deleteKaraByLocalId(karaId) {
	try {
		const response = await axios.delete(`/api/karas/${karaId}`);
		return response.status === 200;
	} catch (e) {
		console.log('Error from /api/local.js:deleteKaraByLocalId');
		throw e;
	}
}