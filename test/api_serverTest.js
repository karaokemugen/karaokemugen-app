const assert = require('assert');
const supertest = require('supertest');
const request = supertest('http://localhost:1337');
const fs = require('fs');
const ini = require('ini');
const extend = require('extend');

var SETTINGS = ini.parse(fs.readFileSync('config.ini.sample', 'utf-8'));
if(fs.existsSync('config.ini')) {
	// et surcharge via le contenu du fichier personnalisé si présent
	var configCustom = ini.parse(fs.readFileSync('config.ini', 'utf-8'));
	extend(true,SETTINGS,configCustom);

}

function toString(o) {
	Object.keys(o).forEach(k => {
		if (typeof o[k] === 'object') {
			return toString(o[k]);
		}

		o[k] = '' + o[k];
	});

	return o;
}

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
			.then(function(response) {
				assert.notStrictEqual(response.body.token, '');
				assert.notStrictEqual(response.body.username, '');
				assert.notStrictEqual(response.body.role, 'user');
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
			.then(function(response) {
				assert.strictEqual(response.body.code, 'NO_MORE_GUESTS_AVAILABLE');
				assert.strictEqual(response.body.message, null);
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
			.then(function(response) {
				token = response.body.token;
				assert.strictEqual(response.body.username,data.username);
				assert.strictEqual(response.body.role, 'admin');
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
			.expect(401);
	});
});

describe('Blacklist', function() {
	it('Add a blacklist criteria', function() {
		var data = {
			'blcriteria_type': '1001',
			'blcriteria_value': '1'
		};
		return request
			.post('/api/admin/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code,'BLC_ADDED');
				assert.strictEqual(response.body.data.blcriteria_type,data.blcriteria_type);
				assert.strictEqual(response.body.data.blcriteria_value,data.blcriteria_value);
			});
	});

	it('Add a blacklist criteria', function() {
		var data = {
			'blcriteria_type': '99999',
			'blcriteria_value': '1'
		};
		return request
			.post('/api/admin/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code,'BLC_ADDED');
				assert.strictEqual(response.body.data.blcriteria_type,data.blcriteria_type);
				assert.strictEqual(response.body.data.blcriteria_value,data.blcriteria_value);
			});
	});

	it('Get list of blacklist criterias (public)', function() {
		return request
			.get('/api/public/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.length >= 1,true);
			});
	});

	var blc_id;
	it('Get list of blacklist criterias', function() {
		return request
			.get('/api/admin/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				blc_id = response.body.data[0].blcriteria_id.toString();
				assert.strictEqual(response.body.data.length >= 1,true);
			});
	});

	it('Edit a blacklist criteria', function() {
		var data = {
			blcriteria_type: 1001,
			blcriteria_value: 2
		};
		return request
			.put('/api/admin/blacklist/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'BLC_UPDATED');
				assert.strictEqual(response.body.data.blcriteria_type,data.blcriteria_type);
				assert.strictEqual(response.body.data.blcriteria_value,data.blcriteria_value);
			});
	});
	
	it('Get blacklist (public)', function() {
		return request
			.get('/api/public/blacklist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length >= 1,true);
			});
	});

	it('Get blacklist', function() {
		return request
			.get('/api/admin/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length >= 1,true);
			});
	});

	it('Delete a blacklist criteria', function() {
		return request
			.delete('/api/admin/blacklist/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'BLC_DELETED');
				assert.strictEqual(response.body.data,blc_id);
			});
	});

	it('Empty list of blacklist criterias', function() {
		return request
			.put('/api/admin/blacklist/criterias/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'BLC_EMPTIED');
				assert.strictEqual(response.body.data,null);
			});
	});
});

describe('Favorites', function() {
	it('Add karaoke to your favorites', function() {
		var data = {
			kara_id: 1
		};
		return request
			.post('/api/public/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_ADDED');
				assert.strictEqual(response.body.data, null);
				assert.strictEqual(response.body.args.playlist_id, 1);
			});
	});

	var favoritesExport;
	it('Export favorites', function() {
		return request
			.get('/api/public/favorites/export')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				favoritesExport = response.body.data;
				assert.strictEqual(response.body.data.Header.description,'Karaoke Mugen Playlist File');
				assert.strictEqual(response.body.data.PlaylistContents.length, 1);
			});
	});

	it('View own favorites', function() {
		return request
			.get('/api/public/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length, 1);
				assert.strictEqual(response.body.data.infos.count, 1);
			});
	});

	it('Generate a automix playlist', function() {
		var data = {
			users: 'adminTest',
			duration: 5
		};
		return request
			.post('/api/admin/automix')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(201)
			.then(function(response) {
				assert.notStrictEqual(response.body.data.playlist_id, null);
				assert.notStrictEqual(response.body.data.playlist_name, null);
			});
	});

	it('Delete karaoke from your favorites', function() {
		var data = {
			kara_id: 1
		};
		return request
			.delete('/api/public/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_DELETED');
				assert.strictEqual(response.body.data, null);
				assert.strictEqual(response.body.args.playlist_id, 1);
			});
	});

	it('Delete karaoke from your favorites Error 500', function() {
		var data = {
			kara_id: 1
		};
		return request
			.delete('/api/public/favorites')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_DELETE_ERROR');
			});
	});

	/*
	it('Import favorites', function() {
		var data = {
			playlist: toString(favoritesExport)
		};
		return request
			.post('/api/public/favorites/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_IMPORTED');
				assert.strictEqual(response.body.data.message,'Favorites imported');
				assert.strictEqual(response.body.data.unknownKaras.length, 0);
			});
	});*/

	it('Import favorites Error 500', function() {
		var data = {
			playlist: favoritesExport.PlaylistContents
		};
		return request
			.post('/api/public/favorites/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_IMPORT_ERROR');
			});
	});
});

describe('Karaokes', function() {
	it('Get a random karaoke ID', function() {
		return request
			.get('/api/public/karas/random')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.notStrictEqual(response.body.data, null);
			});
	});
	
	it('Get complete list of karaokes with Dragon Ball in their name', function() {
		return request
			.get('/api/public/karas?filter=Dragon%20Ball')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content[0].serie, 'Dragon Ball');
			});
	});

	it('Get song info from database', function() {
		return request
			.get('/api/public/karas/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.length, 1);
			});
	});

	it('Get song lyrics', function() {
		return request
			.get('/api/public/karas/1/lyrics')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.length>=1, true);
			});
	});

	/*
	it('View Top 50 songs', function() {
		return request
			.get('/api/public/top50')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length>=1, true);
				assert.strictEqual(response.body.data.infos.count, 4);
			});
	});*/
});

describe('Karas', function() {

	it('Get series list', function() {
		return request
			.get('/api/public/series	')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length>=1, true);
				assert.strictEqual(response.body.data.infos.count, 3);
			});
	});

	it('Get year list', function() {
		return request
			.get('/api/public/years')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length>=1, true);
				assert.strictEqual(response.body.data.infos.count, 1);
			});
	});
});

/*
describe('Misc', function() {
	it('Get latest KM news', function() {
		return request
			.get('/api/public/newsfeed')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.strictEqual(response.body.length>0,true);
			});
	});
});*/

describe('Player', function() {
	it('Get player status', function() {
		return request
			.get('/api/public/player')
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
	it('Add karaoke 6 to playlist 1', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				
				assert.strictEqual(response.body.code,'PL_SONG_ADDED');
			});
	});

	it('Add karaoke 6 again to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_ADD_SONG_ERROR');	
				assert.strictEqual(response.body.message,'No karaoke could be added,'+
				' all are in destination playlist already (PLID : '+playlist+')');
			});
	});

	it('Add an unknown karaoke to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 10000,
			'requestedby': 'Test'
		};
		return request
			.post('/api/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_ADD_SONG_ERROR');
				assert.strictEqual(response.body.message,'One of the karaokes does not exist');
			});
	});

	it('Add karaoke 6 to an unknown playlist to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/admin/playlists/10000/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_ADD_SONG_ERROR');
			});
	});

	it('Get list of karaokes in a playlist', function() {
		return request
			.get('/api/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				plc_id = response.body.data.content[response.body.data.content.length-1].playlistcontent_id.toString();
				assert.strictEqual(response.body.data.content.length >= 1, true);
			});
	});

	it('Get list of karaokes in a playlist (public)', function() {
		return request
			.get('/api/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length >= 1, true);
			});
	});


	it('Create a playlist', function() {
		var playlist = {
			name:'new_playlist',
			flag_visible:'1',
			flag_public:'0',
			flag_current:'1',
		};
		return request
			.post('/api/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_id = response.body.data.toString();
			});
	});

	it('Create a CURRENT playlist', function() {
		var playlist_current = {
			name:'new_playlist',
			flag_visible:'1',
			flag_public:'0',
			flag_current:'1'
		};
		return request
			.post('/api/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_current_id = response.body.data;
			});
	});

	it('Create a PUBLIC playlist', function() {
		var playlist_public = {
			name:'new_playlist',
			flag_visible:'1',
			flag_public:'1',
			flag_current:'0'
		};
		return request
			.post('/api/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_public)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_CREATED');
				new_playlist_public_id = response.body.data.toString();
			});
	});

	it('Copy karaokes to another playlist', function() {
		var data = {
			plc_id: plc_id.toString()
		};
		return request
			.patch('/api/admin/playlists/'+new_playlist_id+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_SONG_MOVED');
			});
	});

	it('Add karaoke to current/public playlist', function() {
		return request
			.post('/api/public/karas/2')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PLAYLIST_MODE_SONG_ADDED');
				assert.strictEqual(response.body.data.kara_id,2);
			});
	});

	it('List contents from current playlist', function() {
		return request
			.get('/api/public/playlists/current/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body.data.content[response.body.data.content.length-1].playlistcontent_id;
				current_plc_id = plc_id.toString();
				assert.strictEqual(response.body.data.content.length >= 1, true);
			});
	});

	it('Delete a CURRENT playlist (should fail)', function() {
		return request
			.delete('/api/admin/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_DELETE_ERROR');
				assert.strictEqual(response.body.message,'Playlist '+new_playlist_current_id+' is current. Unable to delete it');
			});
	});

	it('Delete a PUBLIC playlist (should fail)', function() {
		return request
			.delete('/api/admin/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_DELETE_ERROR');
				assert.strictEqual(response.body.message,'Playlist '+new_playlist_public_id+' is public. Unable to delete it');
			});
	});

	it('Delete karaokes from playlist', function() {
		var data = {
			'plc_id': plc_id
		};
		return request
			.delete('/api/admin/playlists/2/karas/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type',  /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_SONG_DELETED');
			});
	});

	/*
	it('Edit karaoke from playlist : flag_playing', function() {
		var data = {
			flag_playing: '1'
		};
		return request
			.put('/api/admin/playlists/'+new_playlist_current_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_CONTENT_MODIFIED');
				assert.strictEqual(response.body.data, current_plc_id);
			});
	});

	it('Edit karaoke from playlist : position', function() {
		var data = {
			pos: '1'
		};
		return request
			.put('/api/admin/playlists/'+new_playlist_current_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_CONTENT_MODIFIED');
				assert.strictEqual(response.body.data, current_plc_id);
			});
	});
*/

	it('Shuffle playlist 1', function() {
		return request
			.put('/api/admin/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_SHUFFLED');
				assert.strictEqual(response.body.data, '1');
			});
	});

	it('Export a playlist', function() {
		return request
			.get('/api/admin/playlists/1/export')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				playlistExport = response.body.data;
				assert.strictEqual(response.body.data.Header.description,'Karaoke Mugen Playlist File');
				assert.strictEqual(response.body.data.PlaylistContents.length, 1);
			});
	});

	/*
	it('Import a playlist', function() {
		var data = {
			playlist: toString(favoritesExport)
		};
		return request
			.post('/api/admin/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'FAVORITES_IMPORTED');
				assert.strictEqual(response.body.data.message,'Favorites imported');
				assert.strictEqual(response.body.data.unknownKaras.length, 0);
			});
	});*/

	it('Import a playlist Error 500', function() {
		var data = {
			playlist: playlistExport.PlaylistContents
		};
		return request
			.post('/api/admin/playlists/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_IMPORT_ERROR');
			});
	});

	it('Update a playlist s information', function() {
		var data = {
			name:'new_playlist',
			flag_visible: '1',
			pl_id: playlist
		};
		return request
			.put('/api/admin/playlists/'+playlist)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_UPDATED');
				assert.strictEqual(response.body.data,playlist.toString());
			});
	});

	it('Get current playlist information', function() {
		return request
			.get('/api/public/playlists/current')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				current_playlist_id = response.body.data.playlist_id;
			});
	});

	it('Get list of playlists (public)', function() {
		return request
			.get('/api/public/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Get list of playlists', function() {
		return request
			.get('/api/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.length >= 2, true);
			});
	});

	it('Get playlist information (public)', function() {
		return request
			.get('/api/public/playlists/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.playlist_id, 1);
			});
	});

	it('Get playlist information', function() {
		return request
			.get('/api/admin/playlists/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.playlist_id, 1);
			});
	});

	it('List public playlist contents', function() {
		return request
			.get('/api/public/playlists/public/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Set playlist to current', function() {
		return request
			.put('/api/admin/playlists/'+playlist+'/setCurrent')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_SET_CURRENT');
			});
	});

	it('Set playlist to public', function() {
		return request
			.put('/api/admin/playlists/'+new_playlist_public_id+'/setPublic')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'PL_SET_PUBLIC');
			});
	});

	/*
	it('Up/downvote a song in public playlist', function() {
		return request
			.post('/api/public/playlists/public/karas'+plc_id+'/vote')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.code, 'UPVOTE_DONE');
			});
	});*/

	it('Empty playlist', function() {
		return request
			.put('/api/admin/playlists/'+new_playlist_public_id+'/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_EMPTIED');
				assert.strictEqual(response.body.data,new_playlist_public_id);
			});
	});

	it('Delete a playlist', function() {
		return request
			.delete('/api/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'PL_DELETED');
				assert.strictEqual(response.body.data,new_playlist_id);
			});
	});

});

describe('Song Poll', function() {
	it('Get current poll status', function() {
		return request
			.get('/api/public/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'POLL_NOT_ACTIVE');
			});
	});

	it('Get current poll status', function() {
		var data = {
			playlistcontent_id: 1
		};
		return request
			.post('/api/public/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.strictEqual(response.body.code, 'POLL_NOT_ACTIVE');
			});
	});
	
});

describe('Tags', function() {
	it('Get tag list', function() {
		return request
			.get('/api/public/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length>=1, true);
				assert.strictEqual(response.body.data.infos.count>=1, true);
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
			.post('/api/public/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'USER_CREATED');
				assert.strictEqual(response.body.data, true);
			});
	});

	it('Create new user (as admin)', function() {
		var data = {
			login: 'BakaToTest2',
			password: 'ilyenapas2'
		};
		return request
			.post('/api/public/users')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'USER_CREATED');
				assert.strictEqual(response.body.data, true);
			});
	});

	it('Edit your own account', function() {
		var data = {
			nickname: 'toto'
		};
		return request
			.put('/api/public/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'USER_UPDATED');
				assert.strictEqual(response.body.data.nickname, 'toto');
			});
	});
	
	it('List users', function() {
		return request
			.get('/api/public/users/')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				response.body.data.forEach(element => {
					if (element.login === 'BakaToTest') {
						assert.strictEqual(element.type, 1);
						assert.strictEqual(element.flag_admin, 0);
					}
				});
			});
	});

	it('View own user details', function() {
		return request
			.get('/api/public/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.nickname, 'toto');
			});
	});

	it('View user details (admin)', function() {
		return request
			.get('/api/admin/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.type, 1);
				assert.strictEqual(response.body.data.flag_admin, 0);
			});
	});

	it('View user details (public)', function() {
		return request
			.get('/api/public/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.type, 1);
				assert.strictEqual(response.body.data.flag_admin, 0);
			});
	});

	it('Delete an user', function() {
		return request
			.delete('/api/admin/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.args,'BakaToTest');
				assert.strictEqual(response.body.code, 'USER_DELETED');
			});
	});
});

describe('Whitelist', function() {
	it('Add song to whitelist', function() {
		var data = {
			'kara_id': 1,
			'reason': 'Because reasons'
		};
		return request
			.post('/api/admin/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.strictEqual(response.body.code,'WL_SONG_ADDED');
				assert.strictEqual(response.body.data.kara_id, data.kara_id);
				assert.strictEqual(response.body.data.reason, data.reason);
			});
	});

	it('Get whitelist (public)', function() {
		return request
			.get('/api/public/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length, 1);
			});
	});

	var wlc_id;
	it('Get whitelist', function() {
		return request
			.get('/api/admin/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.data.content.length, 1);
				wlc_id = response.body.data.content[0].whitelist_id;
			});
	});

	it('Delete whitelist item', function() {
		var data = {
			'wlc_id': wlc_id,
		};
		return request
			.delete('/api/admin/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'WL_SONG_DELETED');
				assert.strictEqual(response.body.data, wlc_id);
			});
	});

	it('Empty whitelist', function() {
		return request
			.put('/api/admin/whitelist/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(function(response) {
				assert.strictEqual(response.body.code,'WL_EMPTIED');
			});
	});
});

describe('Main', function() {
	it('Get settings (public)', function() {
		return request
			.get('/api/public/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.strictEqual(response.body.data.appPath, undefined);
			});
	});

	it('Get settings', function() {
		return request
			.get('/api/admin/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				SETTINGS = response.body;
			});
	});

	it('Get statistics', function() {
		return request
			.get('/api/public/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Update settings', function() {
		var data = toString(SETTINGS);
		//data.data.EngineAllowViewWhitelist=0;
		return request
			.put('/api/admin/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data.data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.strictEqual(response.body.data.isTest, 'true');
				//assert.strictEqual(response.body.data.EngineAllowViewWhitelist,0);
			});
	});
});

describe('Error case', function() {
	//TODO test error case with EngineAllowViewWhitelist
	//TODO WEBAPPMODE_CLOSED_API_MESSAGE
});

describe('Main - Shutdown', function() {
	it('Shutdown the entire application', function() {
		return request
			.post('/api/admin/shutdown')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.strictEqual(response.body,'Shutdown in progress');
			});
	});
});