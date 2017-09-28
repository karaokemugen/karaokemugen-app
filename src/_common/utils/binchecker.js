// This script is here to check for paths and to provide binary paths depending on your operating system

const path = require('path');
const fs = require('fs');
const logger = require('./logger.js');

// Check if binaries are available
// Provide their paths for runtime

module.exports = {
	SETTINGS:null,
	SYSPATH:null,
	ffmpegPath:null,
	mpvPath:null,
	ffprobePath:null,
	check:function() {
		var os;
		switch(process.platform) {
		case 'win32':
			module.exports.ffmpegPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffmpegWindows);
			module.exports.ffprobePath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffprobeWindows);
			module.exports.mpvPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerWindows);
			os = 'Windows';
			break;
		case 'darwin':
			module.exports.ffmpegPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffmpegOSX);
			module.exports.ffprobePath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffprobeOSX);
			module.exports.mpvPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerOSX);
			os = 'OSX';
			break;
		case 'linux':
			module.exports.ffmpegPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffmpegLinux);
			module.exports.ffprobePath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinffprobeLinux);
			module.exports.mpvPath = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerLinux);
			os = 'Linux';
			break;                
		}
        
		// Check if the paths are correct. If not abort.

		var binOK = true;
		var binMissing = [];

		if (!fs.existsSync(module.exports.ffmpegPath)) {
			binOK = false;
			binMissing.push('ffmpeg');
		}
		if (!fs.existsSync(module.exports.ffprobePath)) {
			binOK = false;
			binMissing.push('ffprobe');
		}
		if (!fs.existsSync(module.exports.mpvPath)) {
			binOK = false;
			binMissing.push('mpv');
		}
		
		if (!binOK) {
			logger.error('[BinCheck] One or more binaries could not be found! ('+binMissing+')');
			logger.error('[BinCheck] Paths searched : ');
			logger.error('[BinCheck] ffmpeg : '+module.exports.ffmpegPath);
			logger.error('[BinCheck] ffprobe : '+module.exports.ffprobePath);
			logger.error('[BinCheck] mpv : '+module.exports.mpvPath);
			logger.error('[BinCheck] Exiting...');
			console.log('\n');
			console.log('One or more binaries needed by Karaoke Mugen could not be found.');
			console.log('Check the paths above and make sure these are available.');
			console.log('Edit your config.ini and set Binffmpeg'+os+', Binffprobe'+os+', BinPlayer'+os+' correctly.');
			console.log('You can download mpv for your OS from http://mpv.io/');
			console.log('You can download ffmpeg for your OS from http://ffmpeg.org');
			process.exit(1);
		}		
	}
};