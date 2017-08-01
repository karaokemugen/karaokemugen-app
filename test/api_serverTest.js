var assert = require('assert');
const supertest = require('supertest');
require('../src/index.js');
var request = supertest('http://localhost:1339');

describe('Test /api/v1/public/', function() {
	it('should return Hello Word', function(done) {
		request
			.get('/api/v1/public/')
			.set('Accept', 'application/json')
			.expect('Content-Type', 'text/html; charset=utf-8')
			.expect(200, done);
	});
});

describe('Test get a kara', function() {
	it('should return inspecteur gadget', function() {
		return request
			.get('/api/v1/public/karas?filter=Inspecteur')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert(response.body[0].NORM_series, 'Inspecteur Gadget');
			});
	});
});
