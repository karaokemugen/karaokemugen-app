var assert = require('assert');
require('../src/index.js');
var playlist_controller = require('../src/_engine/components/playlist_controller.js');

describe(' Update playlist s number of karas', function() {
	it('should return 1', function() {
		playlist_controller.updatePlaylistNumOfKaras(1)
			.then(function(num_karas){
				assert.equal(num_karas, 1);
			})
			.catch(function(err){
				assert.fail(err);
			});
	});
});
