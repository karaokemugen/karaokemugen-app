const assert = require('assert');
const supertest = require('supertest');
const request = supertest('http://localhost:1339');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const extend = require('extend');

var SETTINGS = ini.parse(fs.readFileSync('config.ini.default', 'utf-8'));
if(fs.existsSync('config.ini')) {
	// et surcharge via le contenu du fichier personnalisé si présent
	var configCustom = ini.parse(fs.readFileSync('config.ini', 'utf-8'));
	extend(true,SETTINGS,configCustom);

}

var password = SETTINGS.AdminPassword;

describe('Test public API', function() {	
	it('should return Hello World', function(done) {
		request
			.get('/api/v1/public/')
			.set('Accept', 'application/json')
			.expect('Content-Type', 'text/html; charset=utf-8')
			.expect(200, done);
	});
});

describe('Get list of all karas with filter and language fr', function() {
	it('should return Dragon Ball as first karaoke song', function() {
		return request
			.get('/api/v1/public/karas?filter=Dragon&lang=fr')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body[0].NORM_serie, 'Dragon Ball');
			});
	});
});

describe('Get karaoke ID 1 information', function() {
	it('should return one karaoke song', function() {
		return request
			.get('/api/v1/public/karas/1')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.length, 1);
			});
	});
});


describe('List all playlists', function() {
	it('should return 2 or more playlists', function() {
		return request
			.get('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				var result = false;
				if (response.body.length >= 2) result = true;
				assert.equal(result, true);								
			});
	});
});

describe('List information from playlist 1', function() {
	it('should return info from a playlist', function() {
		return request
			.get('/api/v1/admin/playlists/1')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.id_playlist, 1);
			});
	});
});

describe('Managing karaokes in playlists', function() {
	var playlist = 1;
	it('Add karaoke 6 to playlist 1', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		}
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body,'Karaoke '+data.kara_id+' added by '+data.requestedby+' to playlist '+playlist+' at position last');
			});
	});
	var plc_id;
	it('List contents from playlist 1', function() {
		return request
			.get('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.auth('admin', password)			
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// We get the PLC_ID of our last karaoke, the one we just added
				plc_id = response.body[response.body.length-1].playlistcontent_id;
				assert.equal(response.body.length,6);
			});
	});
	it('Add karaoke 6 again to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		}
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body,'Karaoke song '+data.kara_id+' is already in playlist '+playlist);
			});
	});
	it('Add an unknown karaoke to playlist 1 to see if it fails', function() {
		var data = {
			'kara_id': 10000,
			'requestedby': 'Test'
		}
		return request
			.post('/api/v1/admin/playlists/'+playlist+'/karas')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body,'Karaoke song '+data.kara_id+' unknown');
			});
	});
	it('Add karaoke 6 to an unknown playlist to see if it fails', function() {
		var data = {
			'kara_id': 6,
			'requestedby': 'Test'
		}
		return request
			.post('/api/v1/admin/playlists/10000/karas')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(500)
			.then(function(response) {
				assert.equal(response.body,'Playlist 10000 unknown');
			});
	});
	it('Edit karaoke from playlist 1 : flag_playing', function() {
		var data = {
			flag_playing: 1
		};
		return request
			.put('/api/v1/admin/playlists/1/karas/'+plc_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'PLC '+plc_id+' edited in playlist 1');
			});
	});
	it('Edit karaoke from playlist 1 : position', function() {
		var data = {
			pos: 1
		};
		return request
			.put('/api/v1/admin/playlists/1/karas/'+plc_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'PLC '+plc_id+' edited in playlist 1');
			});
	});
	it('Shuffle playlist 1', function() {
		return request
			.put('/api/v1/admin/playlists/1/shuffle')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist 1 shuffled');
			});
	});
	it('Delete karaoke 6 from playlist 1', function() {
		return request
			.delete('/api/v1/admin/playlists/1/karas/'+plc_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Deleted PLCID '+plc_id);
			});
	});
})

describe('Managing whitelist', function() {
	it('Add karaoke 1 to whitelist', function() {
		var data = {
			'id_kara': 1,
			'reason': 'Because reasons'
		}
		return request
			.post('/api/v1/admin/whitelist')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body,'Karaoke '+data.id_kara+' added to whitelist with reason \''+data.reason+'\'');
			});
	});
	var wlc_id;
	it('List whitelist', function() {
		return request
			.get('/api/v1/admin/whitelist')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				wlc_id = response.body[0].id_whitelist;
				assert.equal(response.body.length,1);
			});
	});
	it('Edit karaoke 1 from whitelist', function() {
		var data = {
			reason: 'Because reasons.'
		}
		return request
			.put('/api/v1/admin/whitelist/'+wlc_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Whitelist item '+wlc_id+' edited with reason \''+data.reason+'\'');
			});
	});
	it('Delete karaoke 1 from whitelist', function() {
		return request
			.delete('/api/v1/admin/whitelist/'+wlc_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Deleted WLID '+wlc_id);
			});
	});
})
describe('Managing playlists', function() {
	var playlist = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':false,
		'flag_current':false,
		'newplaylist_id':61
	};
	var playlist_current = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':false,
		'flag_current':true
	};
	var playlist_public = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':true,
		'flag_current':false
	};
	var new_playlist_id;
	var new_playlist_current_id;
	var new_playlist_public_id;
	it('Create a new playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_id = response.body;
			});
	});
	it('Create a new CURRENT playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_current_id = response.body;
			});
	});
	it('Create a new PUBLIC playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist_public)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_public_id = response.body;
			});
	});
	
	it('Edit a playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist '+new_playlist_id+' updated')
			});
	});
	
	it('Edit a CURRENT playlist', function() {
		playlist.newplaylist_id = new_playlist_id;
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {				
				assert.equal(response.body,'Playlist '+new_playlist_current_id+' updated')
			})
	});
	
	it('Edit a PUBLIC playlist', function() {		
		playlist.newplaylist_id = new_playlist_current_id;
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist '+new_playlist_public_id+' updated')
			});
	});
	it('Delete a CURRENT playlist ', function() {
		var data = {
			'newplaylist_id': new_playlist_public_id
		}
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// OK
			});
	});
	it('Create a new playlist again to transfer flags to', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_id = response.body;
			});
	});
	it('Delete a PUBLIC playlist ', function() {
		var data = {
			'newplaylist_id': new_playlist_id
		}
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				// OK
			});
	});
	it('Empty playlist 2', function() {
		return request
			.put('/api/v1/admin/playlists/2/empty')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist 2 emptied');
			});
	});
});