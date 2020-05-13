import {notStrictEqual, strictEqual} from 'assert';
const supertest = require('supertest');
let port = 1337;
let SETTINGS;
const request = supertest(`http://localhost:${port}`);
const usernameAdmin = 'adminTest';
const passwordAdmin = 'ceciestuntest';
let token;
let current_playlist_id;
let current_plc_id;

describe('Auth', function() {
	it('Login / Sign in (as guest)', function() {
		var data = {
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
	it('Login / Sign in (as guest) Error 500', function() {
		var data = {
			fingerprint: '999'
		};
		return request
			.post('/api/auth/login/guest')
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.body.code, 'NO_MORE_GUESTS_AVAILABLE');
				strictEqual(response.body.message, null);
			});
	});

	it('Login / Sign in', function() {
		var data = {
			username: usernameAdmin,
			password: passwordAdmin
		};
		return request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				token = response.body.token;
				strictEqual(response.body.username,data.username);
				strictEqual(response.body.role, 'admin');
			});
	});

	it('Login / Sign in Error 401', function() {
		var data = {
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

describe('Blacklist', function() {
	it('Add a blacklist criteria', function() {
		var data = {
			'blcriteria_type': '1001',
			'blcriteria_value': '5737c5b2-7ea4-414f-8c92-143838a402f6'
		};
		return request
			.post('/api/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(response => {
				strictEqual(response.text,'BLC_ADDED');
			});
	});

	var blc_id;
	it('Get list of blacklist criterias', function() {
		return request
			.get('/api/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				blc_id = response.body[0].blcriteria_id.toString();
				strictEqual(response.body.length >= 1,true);
			});
	});

	it('Get blacklist', function() {
		return request
			.get('/api/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length >= 1,true);
			});
	});

	it('Delete a blacklist criteria', function() {
		return request
			.delete('/api/blacklist/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'BLC_DELETED');
			});
	});

	it('Empty list of blacklist criterias', function() {
		return request
			.put('/api/blacklist/criterias/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'BLC_EMPTIED');
			});
	});
});

describe('Favorites', function() {
	it('Add karaoke to your favorites', function() {
		var data = {
			kid: ['a6108863-0ae9-48ad-adb5-cb703651f6bf']
		};
		return request
			.post('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'FAVORITES_ADDED');
			});
	});

	let favoritesExport;
	it('Export favorites', function() {
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

	it('View own favorites', function() {
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

	it('Generate a automix playlist', function() {
		var data = {
			users: 'adminTest',
			duration: 5
		};
		return request
			.post('/api/automix')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(201)
			.then(response => {
				strictEqual(response.text, 'AUTOMIX_CREATED');
			});
	});

	it('Delete karaoke from your favorites', function() {
		var data = {
			kid: ['a6108863-0ae9-48ad-adb5-cb703651f6bf']
		};
		return request
			.delete('/api/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'FAVORITES_DELETED');
			});
	});


	it('Import favorites', function() {
		var data = {
			favorites: JSON.stringify(favoritesExport)
		};
		return request
			.post('/api/favorites/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'FAVORITES_IMPORTED');
			});
	});
});

describe('Karas information', function() {
	it('Get a random karaoke ID', function() {
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

	it('Get complete list of karaokes with Dragon Ball in their name', function() {
		return request
			.get('/api/karas?filter=Dragon%20Ball')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content[0].serie, 'Dragon Ball Z');
			});
	});

	it('Get song info from database', function() {
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

	it('Get song lyrics', function() {
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

describe('Series and year', function() {

	it('Get series list', function() {
		return request
			.get('/api/series	')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length>=1, true);
				strictEqual(response.body.infos.count, 6);
			});
	});

	it('Get year list', function() {
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

describe('Player', function() {
	it('Get player status', function() {
		return request
			.get('/api/player')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

describe('Playlists', function() {
	var playlistExport;
	var new_playlist_id;
	var new_playlist_current_id;
	var new_playlist_public_id;
	var plc_id;
	var playlist = 1;
	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf to playlist '+playlist, function() {
		var data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(response => {
				strictEqual(response.body.code,'PL_SONG_ADDED');
			});
	});

	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf again to playlist '+playlist+' to see if it fails', function() {
		var data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_ADD_SONG_ERROR');
			});
	});

	it('Add an unknown karaoke to playlist 1 to see if it fails', function() {
		var data = {
			'kid': 'c28c8739-da02-49b4-889e-b15d1e9b2132',
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_ADD_SONG_ERROR');
			});
	});

	it('Add karaoke a6108863-0ae9-48ad-adb5-cb703651f6bf to an unknown playlist to see if it fails', function() {
		var data = {
			'kid': ['a6108863-0ae9-48ad-adb5-cb703651f6bf'],
			'requestedby': 'Test'
		};
		return request
			.post('/api/playlists/10000/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_ADD_SONG_ERROR');
			});
	});

	it('Get list of karaokes in a playlist', function() {
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

	it('Create a playlist', function() {
		var playlist = {
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
				strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_id = response.body.data.toString();
			});
	});

	it('Create a CURRENT playlist', function() {
		var playlist_current = {
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
				strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_current_id = response.body.data;
			});
	});

	it('Create a PUBLIC playlist', function() {
		var playlist_public = {
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
				strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_public_id = response.body.data.toString();
			});
	});

	it('Copy karaokes to another playlist', function() {
		var data = {
			plc_id: plc_id.toString()
		};
		return request
			.patch('/api/playlists/'+new_playlist_id+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(response => {
				strictEqual(response.text, 'PL_SONG_MOVED');
			});
	});

	it('Add karaoke to current/public playlist', function() {
		return request
			.post('/api/karas/495e2635-38a9-42db-bdd0-df4d27329c87')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(response => {
				strictEqual(response.body.code,'PLAYLIST_MODE_SONG_ADDED');
				strictEqual(response.body.data.kid[0], '495e2635-38a9-42db-bdd0-df4d27329c87');
			});
	});

	it('Delete a CURRENT playlist (should fail)', function() {
		return request
			.delete('/api/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_DELETE_ERROR');
			});
	});

	it('Delete a PUBLIC playlist (should fail)', function() {
		return request
			.delete('/api/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_DELETE_ERROR');
			});
	});

	it('Delete karaokes from playlist', function() {
		var data = {
			'plc_id': plc_id
		};
		return request
			.delete('/api/playlists/2/karas/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_SONG_DELETED');
			});
	});

	it('Shuffle playlist 1', function() {
		return request
			.put('/api/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_SHUFFLED');
			});
	});

	it('Export a playlist', function() {
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

	it('Import a playlist', function() {
		var data = {
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
				strictEqual(response.body.data.message,'Playlist imported');
				strictEqual(response.body.data.unknownKaras.length, 0);
			});
	});

	it('Import a playlist Error 500', function() {
		var data = {
			playlist: playlistExport.PlaylistContents
		};
		return request
			.post('/api/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.text,'PL_IMPORT_ERROR');
			});
	});

	it('Update a playlist\'s information', function() {
		var data = {
			name: 'new_playlist',
			flag_visible: true,
			pl_id: playlist
		};
		return request
			.put('/api/playlists/'+playlist)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_UPDATED');
			});
	});

	it('Get list of playlists', function() {
		return request
			.get('/api/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.length >= 2, true);
				response.body.forEach(playlist => {
					if (playlist.flag_current) current_playlist_id = playlist.playlist_id;
				});
			});
	});

	it('Get current playlist information', function() {
		return request
			.get('/api/playlists/' + current_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});


	it('List contents from current playlist', function() {
		return request
			.get('/api/playlists/' + current_playlist_id + '/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body.content[response.body.content.length-1].playlistcontent_id;
				current_plc_id = plc_id.toString();
				strictEqual(response.body.content.length >= 1, true);
			});
	});


	it('Edit karaoke from playlist : flag_playing', function() {
		var data = {
			flag_playing: true
		};
		return request
			.put('/api/playlists/'+current_playlist_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_CONTENT_MODIFIED');
			});
	});

	it('Edit karaoke from playlist : position', function() {
		var data = {
			pos: 1
		};
		return request
			.put('/api/playlists/'+current_playlist_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_CONTENT_MODIFIED');
			});
	});

	it('Get playlist information', function() {
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

	it('List public playlist contents', function() {
		return request
			.get('/api/playlists/' + new_playlist_public_id + '/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Set playlist to current', function() {
		return request
			.put('/api/playlists/'+playlist+'/setCurrent')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text, 'PL_SET_CURRENT');
			});
	});

	it('Set playlist to public', function() {
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/setPublic')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text, 'PL_SET_PUBLIC');
			});
	});

	it('Up/downvote a song in public playlist Error 500', function() {
		return request
			.post('/api/playlists/'+new_playlist_public_id+'/karas/'+current_plc_id+'/vote')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(response => {
				strictEqual(response.text, 'UPVOTE_FAILED');
			});
	});

	it('Empty playlist', function() {
		return request
			.put('/api/playlists/'+new_playlist_public_id+'/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_EMPTIED');
			});
	});

	it('Delete a playlist', function() {
		return request
			.delete('/api/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'PL_DELETED');
			});
	});

});

describe('Song Poll', function() {
	it('Get current poll status', function() {
		return request
			.get('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(response => {
				strictEqual(response.text, 'POLL_NOT_ACTIVE');
			});
	});

	it('Get current poll status', function() {
		var data = {
			index: 1
		};
		return request
			.post('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(500)
			.then(response => {
				strictEqual(response.text, 'POLL_NOT_ACTIVE');
			});
	});

});

describe('Tags', function() {
	it('Get tag list', function() {
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

describe('Users', function() {
	it('Create a new user', function() {
		var data = {
			login: 'BakaToTest',
			password: 'ilyenapas'
		};
		return request
			.post('/api/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'USER_CREATED');
			});
	});

	it('Create new user (as admin)', function() {
		var data = {
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
				strictEqual(response.text,'USER_CREATED');
			});
	});

	it('Edit your own account', function() {
		var data = {
			nickname: 'toto'
		};
		return request
			.put('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'USER_UPDATED');
			});
	});

	it('List users', function() {
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

	it('View own user details', function() {
		return request
			.get('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.nickname, 'toto');
			});
	});

	it('View user details', function() {
		return request
			.get('/api/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.type, 1);
			});
	});

	it('Delete an user', function() {
		return request
			.delete('/api/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text, 'USER_DELETED');
			});
	});
});

describe('Whitelist', function() {
	it('Add song to whitelist', function() {
		var data = {
			'kid': '495e2635-38a9-42db-bdd0-df4d27329c87',
			'reason': 'Because reasons'
		};
		return request
			.post('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(response => {
				strictEqual(response.text,'WL_SONG_ADDED');
			});
	});

	it('Get whitelist', function() {
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

	it('Delete whitelist item', function() {
		var data = {
			kid: '495e2635-38a9-42db-bdd0-df4d27329c87'
		};
		return request
			.delete('/api/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'WL_SONG_DELETED');
			});
	});

	it('Empty whitelist', function() {
		return request
			.put('/api/whitelist/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.text,'WL_EMPTIED');
			});
	});
});

describe('Main', function() {
	it('Get settings', function() {
		return request
			.get('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response =>{
				strictEqual(response.body.config.Frontend.Port, port);
				SETTINGS = response.body;
			});
	});

	it('Get statistics', function() {
		return request
			.get('/api/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Update settings', function() {
		var data = SETTINGS;
		data.Frontend = { Permissions: {AllowViewWhitelist: false }};
		return request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

/* Since tests are called from the app this is like suicide now.
describe('Main - Shutdown', function() {
	it('Shutdown the entire application', function() {
		return request
			.post('/api/shutdown')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response =>{
				strictEqual(response.text,'Shutdown in progress');
			});
	});
});
*/