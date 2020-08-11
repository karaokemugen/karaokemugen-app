import {expect} from 'chai';

import {FavExport} from '../src/types/favorites';
import { getToken, request, usernameAdmin } from './util/util';

describe('Favorites', () => {
	const favoriteKID = 'a6108863-0ae9-48ad-adb5-cb703651f6bf';
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add karaoke to your favorites', () => {
		const data = {
			kid: [favoriteKID]
		};
		return request
			.post('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});

	let favoritesExport: FavExport;
	it('Export favorites', async () => {
		return request
			.get('/api/favorites/export')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				favoritesExport = res.body;
				expect(res.body.Header.description).to.be.equal('Karaoke Mugen Favorites List File');
				expect(res.body.Favorites).to.have.lengthOf(1);
				expect(res.body.Favorites[0].kid).to.be.equal(favoriteKID);
			});
	});

	it('View own favorites', async () => {
		return request
			.get('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
				expect(res.body.infos.count).to.be.equal(1);
				expect(res.body.content[0].kid).to.be.equal(favoriteKID);
			});
	});

	let automixID: number;

	it('Generate a automix playlist', () => {
		const data = {
			users: [usernameAdmin],
			duration: 5
		};
		return request
			.post('/api/automix')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(201)
			.then(res => {
				expect(res.body.playlist_id).to.not.be.NaN;
				expect(res.body.playlist_name).to.include('AutoMix');
				automixID = res.body.playlist_id;
			});
	});

	it('Verify automix exists and has one song', async () => {
		return request
			.get(`/api/playlists/${automixID}/karas`)
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
				expect(res.body.infos.count).to.be.equal(1);
				expect(res.body.content[0].kid).to.be.equal(favoriteKID);
			});
	});

	it('Delete karaoke from your favorites', () => {
		const data = {
			kid: [favoriteKID]
		};
		return request
			.delete('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});

	it('View own favorites AFTER delete', async () => {
		return requestFavorites(0);
	});

	it('Import favorites', async () => {
		const data = {
			favorites: JSON.stringify(favoritesExport)
		};
		return request
			.post('/api/favorites/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});

	it('View own favorites AFTER import', async () => {
		return requestFavorites(1);
	});

	async function requestFavorites(numFaves: number) {
		return request
			.get('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(numFaves);
				expect(res.body.infos.count).to.be.equal(numFaves);
				if (numFaves) expect(res.body.content[0].kid).to.be.equal(favoriteKID);
			});
	}
});

