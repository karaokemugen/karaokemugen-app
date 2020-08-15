import { expect } from 'chai';
import sample from 'lodash.sample';

import { uuidRegexp } from '../src/lib/utils/constants';
import { DBPL, DBPLC } from '../src/types/database/playlist';
import {PlaylistExport} from '../src/types/playlist';
import { allKIDs,getToken, request, testKara } from './util/util';

describe('Playlists', () => {
	let playlistExport: PlaylistExport;
	let newPlaylistID: number;
	let newCurrentPlaylistID: number;
	let newPublicPlaylistID: number;
	let currentPlaylistID: number;
	let PLCID: number;
	const KIDToAdd = sample(allKIDs);
	const KIDToAdd2 = sample(allKIDs.filter((kid: string) => kid !== KIDToAdd));
	const playlistID = 1;
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it(`Add all songs to playlist ${playlistID}`, () => {
		const data = {
			kid: allKIDs,
			requestedby: 'Test'
		};
		return request
			.post(`/api/playlists/${playlistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it(`Add karaoke ${KIDToAdd} again to playlist ${playlistID} to see if it fails`, async () => {
		const data = {
			kid: [KIDToAdd],
			requestedby: 'Test'
		};
		return request
			.post(`/api/playlists/${playlistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(409)
			.then(response => {
				expect(response.body.code).to.be.equal('PL_ADD_SONG_ERROR');
			});
	});

	it(`Add an unknown karaoke to playlist ${playlistID} to see if it fails`, async () => {
		const data = {
			kid: ['c28c8739-da02-49b4-889e-b15d1e9b2132'],
			requestedby: 'Test'
		};
		return request
			.post(`/api/playlists/${playlistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(404)
			.then(response => {
				expect(response.body.code).to.be.equal('PL_ADD_SONG_ERROR');
			});
	});

	it(`Add karaoke ${KIDToAdd} to an unknown playlist to see if it fails`, async () => {
		const data = {
			kid: [KIDToAdd],
			requestedby: 'Test'
		};
		return request
			.post('/api/playlists/10000/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(404)
			.then(response => {
				expect(response.body.code).to.be.equal('PL_ADD_SONG_ERROR');
			});
	});

	it('Get list of karaokes in a playlist', async () => {
		return request
			.get(`/api/playlists/${playlistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content.length).to.be.at.least(1);
				for (const plc of res.body.content) {
					testKara(plc, {tagDetails: 'short', plc: true});
				}
				PLCID = res.body.content[0].playlistcontent_id;
			});
	});

	it('Get specific karaoke in a playlist', async () => {
		return request
			.get(`/api/playlists/${playlistID}/karas/1`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				testKara(res.body, {tagDetails: 'full', plcDetail: true, plc: true});
			});
	});

	it('Create a playlist', async () => {
		const playlist = {
			name:'new_playlist',
			flag_visible: true,
			flag_public: false,
			flag_current: false,
		};
		return request
			.post('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(res => {
				newPlaylistID = +res.text;
			});
	});

	it('Test findPlaying without any playing song set', async () => {
		return request
			.get(`/api/playlists/${newPlaylistID}/findPlaying`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.index).to.be.equal(-1);
			});
	});

	it('Create a CURRENT playlist', async () => {
		const playlist_current = {
			name:'new_current_playlist',
			flag_visible: true,
			flag_public: false,
			flag_current: true
		};
		return request
			.post('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(res => {
				newCurrentPlaylistID = +res.text;
			});
	});

	it('Create a PUBLIC playlist', async () => {
		const playlist_public = {
			name:'new_public_playlist',
			flag_visible: true,
			flag_public: true,
			flag_current: false
		};
		return request
			.post('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_public)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(res => {
				newPublicPlaylistID = +res.text;
			});
	});

	it('Create a CURRENT+PUBLIC playlist', async () => {
		const playlist_current = {
			name:'new_current_public_playlist',
			flag_visible: true,
			flag_public: true,
			flag_current: true
		};
		return request
			.post('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(res => {
				newCurrentPlaylistID = +res.text;
				newPublicPlaylistID = +res.text;
			});
	});

	it('Copy karaokes to another playlist', () => {
		const data = {
			plc_id: [PLCID]
		};
		return request
			.patch(`/api/playlists/${newPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Add karaoke to public playlist', async () => {
		return request
			.post(`/api/karas/${KIDToAdd2}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(res => {
				expect(res.body.code).to.be.equal('PL_SONG_ADDED');
				expect(res.body.data.kid[0]).to.be.equal(KIDToAdd2);
			});
	});

	it('Delete a CURRENT playlist (should fail)', async () => {
		return request
			.delete(`/api/playlists/${newCurrentPlaylistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(409)
			.then(res => {
				expect(res.body.code).to.be.equal('PL_DELETE_ERROR');
			});
	});

	it('Delete a PUBLIC playlist (should fail)', async () => {
		return request
			.delete(`/api/playlists/${newPublicPlaylistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(409)
			.then(res => {
				expect(res.body.code).to.be.equal('PL_DELETE_ERROR');
			});
	});

	it('Delete karaokes from playlist', () => {
		const data = {
			plc_id: [PLCID]
		};
		return request
			.delete(`/api/playlists/${newPlaylistID}/karas/`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Shuffle playlist 1', async () => {
		// First get playlist as is
		let playlist: DBPLC[];
		await request
			.get('/api/playlists/1/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				playlist = res.body.content;
			});
		await request
			.put('/api/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
		// Re-getting playlist to see if order changed
		return request
			.get('/api/playlists/1/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				const shuffledPlaylist = res.body.content;
				expect(JSON.stringify(shuffledPlaylist)).to.not.be.equal(JSON.stringify(playlist));
			});
	});

	it('Export a playlist', async () => {
		return request
			.get('/api/playlists/1/export')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.Header.description).to.be.equal('Karaoke Mugen Playlist File');
				expect(res.body.PlaylistContents.length).to.be.at.least(1);
				for (const plc of res.body.PlaylistContents) {
					expect(plc.created_at).to.be.a('string');
					expect(plc.kid).to.be.a('string').and.match(new RegExp(uuidRegexp));
					expect(plc.username).to.be.a('string');
					expect(plc.nickname).to.be.a('string');
					expect(plc.pos).to.be.a('number');
					if (plc.flag_playing) expect(plc.flag_playing).to.be.a('boolean');
				}
				expect(res.body.PlaylistInformation.created_at).to.be.a('string');
				expect(res.body.PlaylistInformation.flag_visible).to.be.a('boolean');
				expect(res.body.PlaylistInformation.modified_at).to.be.a('string');
				expect(res.body.PlaylistInformation.name).to.be.a('string');
				playlistExport = res.body;
			});
	});

	it('Import a playlist', async () => {
		const data = {
			playlist: JSON.stringify(playlistExport)
		};
		return request
			.post('/api/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('PL_IMPORTED');
				expect(res.body.data.unknownKaras).to.have.lengthOf(0);
			});
	});

	it('Import a playlist Error 500', async () => {
		const data = {
			playlist: playlistExport.PlaylistContents
		};
		return request
			.post('/api/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(res => {
				expect(res.body.code).to.be.equal('PL_IMPORT_ERROR');
			});
	});

	it('Update a playlist\'s information', () => {
		const data = {
			name: 'new_playlist',
			flag_visible: true,
			pl_id: playlistID
		};
		return request
			.put(`/api/playlists/${playlistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Get list of playlists', async () => {
		return request
			.get('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.length).to.be.at.least(2);
				const playlist = res.body.find((pl: DBPL) => pl.flag_current === true);
				const playlists: DBPL[] = res.body;
				currentPlaylistID = playlist.playlist_id;
				for (const pl of playlists) {
					expect(pl.created_at).to.be.a('string');
					expect(pl.modified_at).to.be.a('string');
					expect(pl.duration).to.be.a('number').and.at.least(0);
					expect(pl.flag_current).to.be.a('boolean');
					expect(pl.flag_visible).to.be.a('boolean');
					expect(pl.flag_public).to.be.a('boolean');
					expect(pl.karacount).to.be.a('number').and.at.least(0);
					expect(pl.name).to.be.a('string');
					expect(pl.playlist_id).to.be.a('number').and.at.least(0);
					expect(pl.plcontent_id_playing).to.be.a('number').and.at.least(0);
					expect(pl.time_left).to.be.a('number').and.at.least(0);
					expect(pl.username).to.be.a('string');
				}
			});
	});

	it('Get current playlist information', async () => {
		return request
			.get(`/api/playlists/${currentPlaylistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.flag_current).to.be.true;
			});
	});

	let currentPLCID: number;

	it('List contents from public playlist', async () => {
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				// We get the PLC_ID of our last karaoke, the one we just added
				currentPLCID = res.body.content[res.body.content.length-1].playlistcontent_id;
				expect(res.body.content.length).to.be.at.least(1);
			});
	});


	it('Edit karaoke from playlist : flag_playing', () => {
		const data = {
			flag_playing: true
		};
		return request
			.put(`/api/playlists/${newPublicPlaylistID}/karas/${currentPLCID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Test findPlaying after a playing flag is set', async () => {
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/findPlaying`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.index).to.be.at.least(0);
			});
	});

	it('Edit karaoke from playlist : position', () => {
		const data = {
			pos: 1
		};
		return request
			.put(`/api/playlists/${newPublicPlaylistID}/karas/${currentPLCID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('List contents from public playlist AFTER position change', async () => {
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				// Our PLCID should be in first position now
				expect(res.body.content[0].playlistcontent_id).to.be.equal(currentPLCID);
				expect(res.body.content[0].flag_playing).to.be.true;
			});
	});

	it('Get playlist information AFTER new flag_playing', async () => {
		return request
			.get(`/api/playlists/${newPublicPlaylistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.plcontent_id_playing).to.be.equal(currentPLCID);
			});
	});

	it('Set playlist to current', () => {
		return request
			.put(`/api/playlists/${playlistID}/setCurrent`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Set playlist to public', () => {
		return request
			.put(`/api/playlists/${newPublicPlaylistID}/setPublic`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Get list of playlists AFTER setting new current/public PLs', async () => {
		return request
			.get('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.length).to.be.at.least(2);
				const playlist = res.body.find((pl: DBPL) => pl.flag_current === true);
				const playlists: DBPL[] = res.body;
				currentPlaylistID = playlist.playlist_id;
				for (const pl of playlists) {
					if (pl.playlist_id === playlistID) expect(pl.flag_current).to.be.true;
					if (pl.playlist_id === newPublicPlaylistID) expect(pl.flag_public).to.be.true;
				}
			});
	});

	it('Up/downvote a song in public playlist Error 403', async () => {
		return request
			.post(`/api/playlists/${newPublicPlaylistID}/karas/${currentPLCID}/vote`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(403)
			.then(res => {
				expect(res.body.code).to.be.equal('UPVOTE_NO_SELF');
			});
	});

	it('Upvote a song in public playlist', async () => {
		const token = await getToken('adminTest2');
		return request
			.post(`/api/playlists/${newPublicPlaylistID}/karas/${currentPLCID}/vote`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('List contents from public playlist AFTER upvote', async () => {
		const token = await getToken('adminTest2');
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				// Our PLCID should be in first position now
				const plc: DBPLC = res.body.content.find(plc => plc.playlistcontent_id === currentPLCID);
				expect(plc.upvotes).to.be.at.least(1);
				expect(plc.flag_upvoted).to.be.true;
			});
	});

	it('Downvote a song in public playlist', async () => {
		const token = await getToken('adminTest2');
		return request
			.post(`/api/playlists/${newPublicPlaylistID}/karas/${currentPLCID}/vote`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({downvote: true})
			.expect(200);
	});

	it('List contents from public playlist AFTER downvote', async () => {
		const token = await getToken('adminTest2');
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				// Our PLCID should be in first position now
				const plc: DBPLC = res.body.content.find(plc => plc.playlistcontent_id === currentPLCID);
				expect(plc.upvotes).to.be.at.below(1);
				expect(plc.flag_upvoted).to.be.false;
			});
	});

	it('Empty playlist', () => {
		return request
			.put(`/api/playlists/${newPublicPlaylistID}/empty`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('List contents from public playlist AFTER empty', async () => {
		return request
			.get(`/api/playlists/${newPublicPlaylistID}/karas`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(0);
			});
	});

	it('Delete a playlist', () => {
		return request
			.delete(`/api/playlists/${newPlaylistID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it(`Get list of playlists AFTER deleting playlist ${newPlaylistID}`, async () => {
		return request
			.get('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const plIDs = res.body.map(pl => pl.playlist_id);
				expect(plIDs).to.not.include(newPlaylistID);
			});
	});
});
