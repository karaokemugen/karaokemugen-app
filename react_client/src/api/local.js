import axios from 'axios';

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
		console.log('Error from downloadManager.js:getLocalKaras()');
		throw e;
	}
}

// GET karas download queue
export async function getDownloadQueue() {
	try {
		const res = await axios.get('/api/downloads');
		return res.data;
	} catch (e) {
		console.log('Error from downloadManager.js:getDownloadQueue');
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
		console.log(dl);
		await axios.post('/api/downloads', dl);
	} catch (e) {
		console.log(e);
		console.log('Error from downloadManager.js:postToDownloadQueue');
		throw e;
	}
}

export async function deleteKaraByLocalId(karaId) {
	try {
		const response = await axios.delete(`/api/karas/${karaId}`);
		console.log(response);
		return response.status === 200;
	} catch (e) {
		console.log(e);
		console.error('Error from /api/local.js:deleteKaraByLocalId');
		throw e;
	}
}