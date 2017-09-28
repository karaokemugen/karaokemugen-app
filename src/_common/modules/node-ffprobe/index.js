var ffprobe = require('./lib/ffprobe.js');

module.exports = {
	ffprobePath: null,
	get:function(args){
		var exit = function(code, msg) {
			process.nextTick(function() {
				process.exit(code); 
			});

			if(code !== 0) console.error(msg);
			else console.log(msg);
		};
		
		if(args.length === 0) return exit(1);

		!function probeFile(file) {
			if(!file) return exit(0, 'Finished probing all files');
			file = '"'+file+'"';
			ffprobe.ffprobePath = module.exports.ffprobePath;
			ffprobe.launch(file, function(err, results) {
				console.log('%s\n========================================\n%s\n\n', file, err || JSON.stringify(results, null, '   '));

				probeFile(args.shift());
			});
		}(args.shift());
	}
};

	
