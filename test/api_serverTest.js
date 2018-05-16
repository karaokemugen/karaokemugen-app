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
describe('Test public API', function() {
	it('Create a new user', function() {
		var data = {
			login: 'BakaToTest',
			password: 'ilyenapas'
		};
		return request
			.post('/api/v1/public/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'USER_CREATED');
				assert.equal(response.body.data, true);
			});
	});

	it('connect with a user', function() {
		var data = {
			username: usernameAdmin,
			password: passwordAdmin
		};
		return request
			.post('/api/v1/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(function(response) {
				token = response.body.token;
				assert.equal(response.body.username,data.username);
				assert.equal(response.body.role, 'admin');
			});
	});

	it('get user informations', function() {
		return request
			.get('/api/v1/public/users/')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(function(response) {
				response.body.data.forEach(element => {
					if (element.login === 'BakaToTest') {
						assert.equal(element.type, 1);
						assert.equal(element.flag_admin, 0);
					}
				});
			});
	});

	it('delete a user', function() {
		return request
			.delete('/api/v1/admin/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)	
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.args,'BakaToTest');
				assert.equal(response.body.code, 'USER_DELETED');
			});
	});
	
	it('List songs with Dragon Ball in their name', function() {
		return request
			.get('/api/v1/public/karas?filter=Dragon%20Ball&lang=fr')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.data.content[0].serie, 'Dragon Ball');
			});
	});
	
	it('Get one karaoke song by ID', function() {
		return request
			.get('/api/v1/public/karas/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.data.length, 1);
			});
	});
	
	it('Get one karaoke song\'s lyrics', function() {
		return request
			.get('/api/v1/public/karas/1/lyrics')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
	it('Get stats', function() {
		return request
			.get('/api/v1/public/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
	it('List public playlist information', function() {
		return request
			.get('/api/v1/public/playlists/public')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
	it('List current playlist information', function() {
		return request
			.get('/api/v1/public/playlists/current')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				current_playlist_id = response.body.data.playlist_id;				
			});
	});
	it('List public playlist contents', function() {
		return request
			.get('/api/v1/public/playlists/public/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
	
	it('Add karaoke 6 to playlist depending on mode', function() {
		return request
			.post('/api/v1/public/karas/6')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code,'PLAYLIST_MODE_SONG_ADDED');
				assert.equal(response.body.data.kara_id,6);
			});
	});
	var plc_id;
	
	it('List contents from current playlist', function() {
		return request
			.get('/api/v1/public/playlists/current/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body.data.content[response.body.data.content.length-1].playlistcontent_id;
				current_plc_id = plc_id;
				var result = false;
				if (response.body.data.content.length >= 1) result = true;
				assert.equal(result, true);
			});
	});

	it('Delete karaoke 6 from playlist 1', function() {
		var data = {
			'plc_id': plc_id
		};
		return request
			.delete('/api/v1/admin/playlists/1/karas/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type',  /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_SONG_DELETED');
			});
	});
});


describe('Player tests', function() {
	it('Read player status', function() {
		return request
			.get('/api/v1/public/player')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

describe('Managing karaokes in playlists', function() {
	var playlist = 1;
	it('Add karaoke 6 to playlist 1', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code,'PL_SONG_ADDED');
			});
	});
	
	var plc_id;
	it('List contents from playlist 1', function() {
		return request
			.get('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body.data.content[response.body.data.content.length-1].playlistcontent_id;
				var result = false;
				if (response.body.data.content.length >= 1) result = true;
				assert.equal(result, true);
			});
	});
	
	it('Add karaoke 6 again to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body.code,'PL_ADD_SONG_ERROR');	
				assert.equal(response.body.message,'No karaoke could be added,'+
				' all are in destination playlist already (PLID : '+playlist+')');
			});
	});
	
	it('Add an unknown karaoke to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 10000,
			'requestedby': 'Test'
		};
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body.code,'PL_ADD_SONG_ERROR');
				assert.equal(response.body.message,'One of the karaokes does not exist');
			});
	});
	
	it('Add karaoke 6 to an unknown playlist to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		};
		return request
			.post('/api/v1/admin/playlists/10000/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body.code,'PL_ADD_SONG_ERROR');
				// FIXME
				//assert.equal(response.body,'Playlist 10000 unknown');
			});
	});
	
	it('Edit karaoke from current playlist : flag_playing', function() {
		var data = {
			flag_playing: '1'
		};
		return request
			.put('/api/v1/admin/playlists/'+current_playlist_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {				
				assert.equal(response.body.code,'PL_CONTENT_MODIFIED');
				assert.equal(response.body.data, current_plc_id);
			});			
	});
	
	it('Edit karaoke from current playlist : position', function() {
		var data = {
			pos: '1'
		};
		return request
			.put('/api/v1/admin/playlists/'+current_playlist_id+'/karas/'+current_plc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_CONTENT_MODIFIED');
				assert.equal(response.body.data, current_plc_id);
			});			
	});
	
	it('Shuffle playlist 1', function() {
		return request
			.put('/api/v1/admin/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_SHUFFLED');
				assert.equal(response.body.data, 1);
			});
	});
	
	it('Delete karaoke 6 from playlist 1', function() {
		var data = {
			'plc_id': plc_id
		};
		return request
			.delete('/api/v1/admin/playlists/1/karas/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type',  /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_SONG_DELETED');
			});
	});
	
});

describe('Managing settings', function(){
	it('Read settings', function() {
		return request
			.get('/api/v1/admin/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				SETTINGS = response.body;
			});
	});
	
	it('Update settings', function() {
		var data = toString(SETTINGS);
		return request
			.put('/api/v1/admin/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data.data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.equal(response.body.data.isTest,'true');
			});
	});
});

describe('Managing whitelist', function() {
	it('Add karaoke 1 to whitelist', function() {
		var data = {
			'kara_id': 1,
			'reason': 'Because reasons'
		};
		return request
			.post('/api/v1/admin/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code,'WL_SONG_ADDED');
				assert.equal(response.body.data.kara_id, data.kara_id);
				assert.equal(response.body.data.reason, data.reason);
			});
	});
		
	var wlc_id;
	it('List whitelist', function() {
		return request
			.get('/api/v1/admin/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				wlc_id = response.body.data.content[0].whitelist_id;
			});
	});
	
	it('Delete karaoke 1 from whitelist', function() {
		var data = {
			'wlc_id': wlc_id,
		};
		return request
			.delete('/api/v1/admin/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'WL_SONG_DELETED');
				assert.equal(response.body.data, wlc_id);
			});
	});
});
describe('Managing blacklist', function() {
	it('Add a single karaoke to blacklist criterias', function() {
		var data = {
			'blcriteria_type': 1001,
			'blcriteria_value': 1
		};
		return request
			.post('/api/v1/admin/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code,'BLC_ADDED');
				assert.equal(response.body.data.blcriteria_type,data.blcriteria_type);
				assert.equal(response.body.data.blcriteria_value,data.blcriteria_value);
			});
	});
	
	var blc_id;
	it('List blacklist criterias', function() {
		return request
			.get('/api/v1/admin/blacklist/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				blc_id = response.body.data[0].blcriteria_id;
				var result = false;
				if (response.body.data.length >= 1) result = true;
				assert.equal(result,true);
			});
	});
	
	it('Edit blacklist criteria', function() {
		var data = {
			blcriteria_type: 1001,
			blcriteria_value: 2
		};
		return request
			.put('/api/v1/admin/blacklist/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'BLC_UPDATED');
				assert.equal(response.body.data.blcriteria_type,data.blcriteria_type);
				assert.equal(response.body.data.blcriteria_value,data.blcriteria_value);
			});
	});
	
	it('List blacklist', function() {
		return request
			.get('/api/v1/admin/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				var result = false;
				if (response.body.data.content.length >= 1) result = true;
				assert.equal(result,true);
			});
	});
	
	it('Delete blacklist criteria', function() {
		return request
			.delete('/api/v1/admin/blacklist/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'BLC_DELETED');
				assert.equal(response.body.data,blc_id);
			});
	});
	
});
describe('Managing playlists', function() {
	var playlist = {
		name:'new_playlist',
		flag_visible:'true',
		flag_public:'false',
		flag_current:'false',
	};
	var playlist_current = {
		name:'new_playlist',
		flag_visible:'true',
		flag_public:'false',
		flag_current:'true'
	};
	var playlist_public = {
		name:'new_playlist',
		flag_visible:'true',
		flag_public:'true',
		flag_current:'false'
	};
	var new_playlist_id;
	var new_playlist_current_id;
	var new_playlist_public_id;
	it('List all playlists', function() {
		return request
			.get('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				var result = false;
				if (response.body.data.length >= 2) result = true;
				assert.equal(result, true);
			});
	});
	
	it('List single playlist information', function() {
		return request
			.get('/api/v1/admin/playlists/1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.data.playlist_id, 1);
			});
	});

	it('Create a new playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code, 'PL_CREATED');
				new_playlist_id = response.body.data;
			});
	});
	
	it('Create a new CURRENT playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code, 'PL_CREATED');
				new_playlist_current_id = response.body.data;
			});
	});
	it('Create a new PUBLIC playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(playlist_public)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body.code, 'PL_CREATED');
				new_playlist_public_id = response.body.data;
			});
	});
	var edit_playlist = {
		name:'new_playlist',
		flag_visible: 'true',
		pl_id:'new_playlist_id'
	};
	
	it('Edit a playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(edit_playlist)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_UPDATED');
				assert.equal(response.body.data,new_playlist_id);
			});
	});

	it('Try to delete a CURRENT playlist (should fail)', function() {
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body.code,'PL_DELETE_ERROR');
				assert.equal(response.body.message,'Playlist '+new_playlist_current_id+' is current. Unable to delete it');
			});
	});

	it('Try to delete a PUBLIC playlist (should fail)', function() {
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body.code,'PL_DELETE_ERROR');
				assert.equal(response.body.message,'Playlist '+new_playlist_public_id+' is public. Unable to delete it');
			});
	});
	
	it('Delete a playlist', function() {
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_DELETED');
				assert.equal(response.body.data,new_playlist_id);
			});
	});
	
	it('Empty playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_public_id+'/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.code,'PL_EMPTIED');
				assert.equal(response.body.data,new_playlist_public_id);
			});
	});
});
/*
describe('Ending tests', function() {
	it('Sending shutdown command', function() {
		return request
			.post('/api/v1/admin/shutdown')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response){
				assert.equal(response.body,'Shutdown in progress.');
			})
	});
});*/