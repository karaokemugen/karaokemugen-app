import axios from 'axios';

const karaMoeApi = axios.create({
	baseURL: 'http://kara.moe/api'
});

// GET recent karas from kara.moe
export async function getRecentKaras() {
	try {
		const res = await axios.get('http://kara.moe/api/karas/recent');
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(
			`Error from downloadManager.js:getRecentKaras() - ${e.response.status}`
		);
		throw e;
	}
}

export async function getKarasBySearchString(searchString) {
	try {
		const res = await axios.get(
			`http://kara.moe/api/karas?filter=${searchString}`
		);
		return res.data.content;
	} catch (e) {
		console.log(e.response);
		console.log(
			`Error from downloadManager.js:getKarasBySearchString() - ${
				e.response.status
			}`
		);
		throw e;
	}
}