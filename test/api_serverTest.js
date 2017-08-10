var assert = require('assert');
const supertest = require('supertest');
require('../src/index.js');
var request = supertest('http://localhost:1339');

describe('GET /api/v1/public/', function() {
	it('should return Hello Word', function(done) {
		request
			.get('/api/v1/public/')
			.set('Accept', 'application/json')
			.expect('Content-Type', 'text/html; charset=utf-8')
			.expect(200, done);
	});
});

describe('GET /api/v1/public/karas?filter=Inspecteur', function() {
	it('get a kara should return inspecteur gadget', function() {
		return request
			.get('/api/v1/public/karas?filter=Inspecteur')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body[0].NORM_serie, 'Inspecteur Gadget');
			});
	});
});

describe('GET /api/v1/admin/playlists', function() {
	it('should return 2 playlists', function() {
		return request
			.get('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', 'shami')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body.length, 2);
				assert.equal(response.body[0].name, 'Liste de lecture publique');
			});
	});
});

describe('POST / DELETE /api/v1/admin/playlists ', function() {
	var playlist = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':false,
		'flag_current':false
	};
	var new_playlist_id;
	it('POST a new playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', 'shami')
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_id = response.body.new_playlist_id;
			});
	});

	it('DELETE the new playlist ', function() {
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.auth('admin', 'shami')
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				assert.equal(response.body, 'Deleted '+new_playlist_id)
			});
	});
});