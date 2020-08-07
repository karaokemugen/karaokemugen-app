import {notStrictEqual, strictEqual} from 'assert';
import supertest from 'supertest';

import {Config} from '../src/types/config';
import { getToken } from './util/util';

let config: Config;

export function getConfig(): Config {
	return config;
}

export function setConfig(newConfig: Config) {
	config = newConfig;
}


const request = supertest('http://localhost:1337');
const usernameAdmin = 'adminTest';
const passwordAdmin = 'ceciestuntest';

let currentPlaylistID: number;
let currentPLCID: number;

describe('Auth', () => {
	it('Login / Sign in (as guest)', () => {
		const data = {
			fingerprint: '666'
		};
		return request
			.post('/api/auth/login/guest')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				notStrictEqual(response.body.token, '');
				notStrictEqual(response.body.username, '');
				notStrictEqual(response.body.role, 'user');
			});
	});
	it('Login / Sign in', () => {
		const data = {
			username: usernameAdmin,
			password: passwordAdmin
		};
		return request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.username,data.username);
				strictEqual(response.body.role, 'admin');
			});
	});

	it('Login / Sign in Error 401', () => {
		const data = {
			username: '',
			password: ''
		};
		return request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.then(response => {
				strictEqual(response.status, 401);
			  });
	});
});


describe('Blacklist', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add a blacklist criteria', () => {
		const data = {
			'blcriteria_type': '1001',
			'blcriteria_value': '5737c5b2-7ea4-414f-8c92-143838a402f6'
		};
		return request
			.post('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	let blc_id;
	it('Get list of blacklist criterias', () => {
		return request
			.get('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				blc_id = response.body[0].blcriteria_id.toString();
				strictEqual(response.body.length >= 1,true);
			});
	});

	it('Get blacklist', () => {
		return request
			.get('/api/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length === 1,true);
			});
	});

	it('Delete a blacklist criteria', () => {
		return request
			.delete('/api/blacklist/set/1/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Empty list of blacklist criterias', () => {
		return request
			.put('/api/blacklist/set/1/criterias/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});
});

describe('Favorites', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add karaoke to your favorites', () => {
		const data = {
			kid: ['a6108863-0ae9-48ad-adb5-cb703651f6bf']
		};
		return request
			.post('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});

	let favoritesExport;
	it('Export favorites', () => {
		return request
			.get('/api/favorites/export')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				favoritesExport = response.body;
				strictEqual(response.body.Header.description,'Karaoke Mugen Favorites List File');
				strictEqual(response.body.Favorites.length, 1);
			});
	});

	it('View own favorites', () => {
		return request
			.get('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length, 1);
				strictEqual(response.body.infos.count, 1);
			});
	});

	it('Generate a automix playlist', () => {
		const data = {
			users: ['adminTest'],
			duration: 5
		};
		return request
			.post('/api/automix')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(201);
	});

	it('Delete karaoke from your favorites', () => {
		const data = {
			kid: ['a6108863-0ae9-48ad-adb5-cb703651f6bf']
		};
		return request
			.delete('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});


	it('Import favorites', () => {
		const data = {
			favorites: JSON.stringify(favoritesExport)
		};
		return request
			.post('/api/favorites/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'FAVORITES_IMPORTED');
			});
	});
});

describe('Karas information', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get a random karaoke ID', () => {
		return request
			.get('/api/karas?random=1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				notStrictEqual(response.body.content, null);
			});
	});

	it('Get complete list of karaokes with Dragon Ball in their name', () => {
		return request
			.get('/api/karas?filter=Dragon%20Ball')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content[0].series[0].name, 'Dragon Ball Z');
			});
	});

	it('Get song info from database', () => {
		return request
			.get('/api/karas/a6108863-0ae9-48ad-adb5-cb703651f6bf')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.kid, 'a6108863-0ae9-48ad-adb5-cb703651f6bf');
			});
	});

	it('Get song lyrics', () => {
		return request
			.get('/api/karas/a6108863-0ae9-48ad-adb5-cb703651f6bf/lyrics')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.length>=1, true);
			});
	});

});

describe('year', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get year list', () => {
		return request
			.get('/api/years')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length>=1, true);
				strictEqual(response.body.infos.count, 6);
			});
	});
});

describe('Player', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get player status', () => {
		return request
			.get('/api/player')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

describe('Playlists', () => {
	let playlistExport;
	let new_playlist_id;
	let new_playlist_current_id;
	let new_playlist_public_id;
	let plc_id;
	const playlist = 1;
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf to playlist '+playlist, () => {
		const data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf again to playlist '+playlist+' to see if it fails', () => {
		const data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(409)
			.then(response => {
				strictEqual(response.body.code,'PL_ADD_SONG_ERROR');
			});
	});

	it('Add an unknown karaoke to playlist 1 to see if it fails', () => {
		const data = {
			'kid': 'c28c8739-da02-49b4-889e-b15d1e9b2132',
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(404)
			.then(response => {
				strictEqual(response.body.code,'PL_ADD_SONG_ERROR');
			});
	});

	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf to an unknown playlist to see if it fails', () => {
		const data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/10000/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(404)
			.then(response => {
				strictEqual(response.body.code,'PL_ADD_SONG_ERROR');
			});
	});

	it('Get list of karaokes in a playlist', () => {
		return request
			.get('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				plc_id = response.body.content[response.body.content.length-1].playlistcontent_id.toString();
				strictEqual(response.body.content.length >= 1, true);
			});
	});

	it('Create a playlist', () => {
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
			.then(response => {
				new_playlist_id = response.text.toString();
			});
	});

	it('Create a CURRENT playlist', () => {
		const playlist_current = {
			name:'new_playlist',
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
			.then(response => {
				new_playlist_current_id = response.text.toString();
			});
	});

	it('Create a PUBLIC playlist', () => {
		const playlist_public = {
			name:'new_playlist',
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
			.then(response => {
				new_playlist_public_id = response.text.toString();
			});
	});

	it('Copy karaokes to another playlist', () => {
		const data = {
			plc_id: [plc_id]
		};
		return request
			.patch('/api/playlists/'+new_playlist_id+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Add karaoke to public playlist', () => {
		return request
			.post('/api/karas/495e2635-38a9-42db-bdd0-df4d27329c87')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(response => {
				strictEqual(response.body.code,'PL_SONG_ADDED');
				strictEqual(response.body.data.kid[0], '495e2635-38a9-42db-bdd0-df4d27329c87');
			});
	});

	it('Delete a CURRENT playlist (should fail)', () => {
		return request
			.delete('/api/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(409)
			.then(response => {
				strictEqual(response.body.code,'PL_DELETE_ERROR');
			});
	});

	it('Delete a PUBLIC playlist (should fail)', () => {
		return request
			.delete('/api/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(409)
			.then(response => {
				strictEqual(response.body.code,'PL_DELETE_ERROR');
			});
	});

	it('Delete karaokes from playlist', () => {
		const data = {
			'plc_id': [plc_id]
		};
		return request
			.delete('/api/playlists/2/karas/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Shuffle playlist 1', () => {
		return request
			.put('/api/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Export a playlist', () => {
		return request
			.get('/api/playlists/1/export')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				playlistExport = response.body;
				strictEqual(response.body.Header.description,'Karaoke Mugen Playlist File');
				notStrictEqual(response.body.PlaylistContents.length, 0);
			});
	});

	it('Import a playlist', () => {
		const data = {
			playlist: JSON.stringify(playlistExport)
		};
		return request
			.post('/api/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'PL_IMPORTED');
				strictEqual(response.body.data.unknownKaras.length, 0);
			});
	});

	it('Import a playlist Error 500', () => {
		const data = {
			playlist: playlistExport.PlaylistContents
		};
		return request
			.post('/api/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.body.code,'PL_IMPORT_ERROR');
			});
	});

	it('Update a playlist\'s information', () => {
		const data = {
			name: 'new_playlist',
			flag_visible: true,
			pl_id: playlist
		};
		return request
			.put('/api/playlists/'+playlist)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Get list of playlists', () => {
		return request
			.get('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.length >= 2, true);
				response.body.forEach(playlist => {
					if (playlist.flag_current) currentPlaylistID = playlist.playlist_id;
				});
			});
	});

	it('Get current playlist information', () => {
		return request
			.get('/api/playlists/' + currentPlaylistID)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});


	it('List contents 	from public playlist', () => {
		return request
			.get('/api/playlists/' + new_playlist_public_id + '/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body.content[response.body.content.length-1].playlistcontent_id;
				currentPLCID = plc_id.toString();
				strictEqual(response.body.content.length >= 1, true);
			});
	});


	it('Edit karaoke from playlist : flag_playing', () => {
		const data = {
			flag_playing: true
		};
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/karas/'+currentPLCID)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Edit karaoke from playlist : position', () => {
		const data = {
			pos: 1
		};
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/karas/'+currentPLCID)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Get playlist information', () => {
		return request
			.get('/api/playlists/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.playlist_id, 1);
			});
	});

	it('List public playlist contents', () => {
		return request
			.get('/api/playlists/' + new_playlist_public_id + '/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Set playlist to current', () => {
		return request
			.put('/api/playlists/'+playlist+'/setCurrent')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Set playlist to public', () => {
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/setPublic')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Up/downvote a song in public playlist Error 403', () => {
		return request
			.post('/api/playlists/'+new_playlist_public_id+'/karas/'+currentPLCID+'/vote')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(403)
			.then(response => {
				strictEqual(response.body.code, 'UPVOTE_NO_SELF');
			});
	});

	it('Empty playlist', () => {
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Delete a playlist', () => {
		return request
			.delete('/api/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

});

describe('Song Poll', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get current poll status', () => {
		return request
			.get('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(425)
			.then(response => {
				strictEqual(response.body.code, 'POLL_NOT_ACTIVE');
			});
	});

	it('set poll', () => {
		const data = {
			index: 1
		};
		return request
			.post('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(425)
			.then(response => {
				strictEqual(response.body.code, 'POLL_NOT_ACTIVE');
			});
	});

});

describe('Tags', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get tag list', () => {
		return request
			.get('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length>=1, true);
				strictEqual(response.body.infos.count>=1, true);
			});
	});
});

describe('Users', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Create a new user', () => {
		const data = {
			login: 'BakaToTest',
			password: 'ilyenapas'
		};
		return request
			.post('/api/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_CREATED');
			});
	});

	it('Create new user (as admin)', () => {
		const data = {
			login: 'BakaToTest2',
			password: 'ilyenapas2',
			role: 'admin'
		};
		return request
			.post('/api/users')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_CREATED');
			});
	});

	it('Edit your own account', () => {
		const data = {
			nickname: 'toto'
		};
		return request
			.put('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_EDITED');
			});
	});

	it('List users', () => {
		return request
			.get('/api/users/')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				response.body.forEach(element => {
					if (element.login === 'BakaToTest') {
						strictEqual(element.type, 1);
					}
				});
			});
	});

	it('View own user details', () => {
		return request
			.get('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.nickname, 'toto');
			});
	});

	it('View user details', () => {
		return request
			.get('/api/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.type, 1);
			});
	});

	it('Delete an user', () => {
		return request
			.delete('/api/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code, 'USER_DELETED');
			});
	});
});

describe('Whitelist', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add song to whitelist', () => {
		const data = {
			'kid': ['495e2635-38a9-42db-bdd0-df4d27329c87'],
			'reason': 'Because reasons'
		};
		return request
			.post('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Get whitelist', () => {
		return request
			.get('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length, 1);
			});
	});

	it('Delete whitelist item', () => {
		const data = {
			kid: ['495e2635-38a9-42db-bdd0-df4d27329c87']
		};
		return request
			.delete('/api/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Empty whitelist', () => {
		return request
			.put('/api/whitelist/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});
});

describe('Main', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get settings', () => {
		return request
			.get('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response =>{
				strictEqual(response.body.config.Frontend.Port, 1337);
				setConfig(response.body);
			});
	});

	it('Get statistics', () => {
		return request
			.get('/api/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Update settings', () => {
		const data = getConfig();
		data.Frontend.Permissions.AllowViewWhitelist = true;
		return request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

