import got from 'got';

// GET recent karas from kara.moe
export async function getRecentKaras() {
	try {
		const res = await got(
			'https://kara.moe/api/karas/recent',
			{ json : true }
		);
		return res.body.content ? res.body.content : [];
	} catch (e) {
		console.log(
			`Error from downloadManager.js:getRecentKaras() - ${e.response.status}`
		);
		throw e;
		return [];
	}
}

export async function getKarasBySearchString(searchString) {
	try {
		const res = await got(
			`https://kara.moe/api/karas?filter=${searchString}`,
			{ json : true }
		);
		return res.body.content ? res.body.content : [];
	} catch (e) {
		console.log(
			`Error from downloadManager.js:getKarasBySearchString() - ${e.response.status}`
		);
		throw e;
		return [];
	}
}