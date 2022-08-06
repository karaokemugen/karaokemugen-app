import { expect } from 'chai';

import { FavExport } from '../src/types/favorites.js';
import { commandBackend, getToken } from './util/util.js';

describe('Favorites', () => {
	const favoriteKID = 'a6108863-0ae9-48ad-adb5-cb703651f6bf';
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add karaoke to your favorites', async () => {
		const data = {
			kids: [favoriteKID],
		};
		await commandBackend(token, 'addFavorites', data);
	});

	let favoritesExport: FavExport;
	it('Export favorites', async () => {
		const data = await commandBackend(token, 'exportFavorites');
		favoritesExport = data;
		expect(favoritesExport.Header.description).to.be.equal('Karaoke Mugen Favorites List File');
		expect(favoritesExport.Favorites).to.have.lengthOf(1);
		expect(favoritesExport.Favorites[0].kid).to.be.equal(favoriteKID);
	});

	it('View own favorites', async () => {
		const data = await commandBackend(token, 'getFavorites');
		expect(data.content).to.have.lengthOf(1);
		expect(data.infos.count).to.be.equal(1);
		expect(data.content[0].kid).to.be.equal(favoriteKID);
	});

	let automixID: number;

	it('Generate a automix playlist', async () => {
		const data = {
			filters: {
				years: [2000],
			},
			limitType: 'duration',
			limitNumber: 20,
		};
		const body = await commandBackend(token, 'createAutomix', data);
		expect(body.plaid).to.not.be.NaN;
		expect(body.playlist_name).to.include('AutoMix');
		automixID = body.plaid;
	});

	it('Verify automix exists and has one song', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', { plaid: automixID });
		expect(data.content).to.have.lengthOf(1);
		expect(data.infos.count).to.be.greaterThanOrEqual(1);
		expect(data.content[0].kid).to.be.equal(favoriteKID);
	});

	it('Delete karaoke from your favorites', async () => {
		const data = {
			kids: [favoriteKID],
		};
		await commandBackend(token, 'deleteFavorites', data);
	});

	it('View own favorites AFTER delete', async () => {
		return requestFavorites(0);
	});

	it('Import favorites', async () => {
		const data = {
			favorites: favoritesExport,
		};
		await commandBackend(token, 'importFavorites', data);
	});

	it('View own favorites AFTER import', async () => {
		return requestFavorites(1);
	});

	async function requestFavorites(numFaves: number) {
		const data = await commandBackend(token, 'getFavorites');
		expect(data.content).to.have.lengthOf(numFaves);
		expect(data.infos.count).to.be.equal(numFaves);
		if (numFaves) expect(data.content[0].kid).to.be.equal(favoriteKID);
	}
});
