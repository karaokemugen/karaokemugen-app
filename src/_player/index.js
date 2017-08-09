var fs = require('fs');
var path = require('path');
const logger = require('../_common/utils/logger.js');
const dl = require('request-progress');
var ProgressBar = require('progress');
var http = require('http');
var extract = require('extract-zip');

module.exports = {
	background:path.join(__dirname,'assets/background.jpg'), // default background
	playing:false,
	playerstatus:'stop',
	_playing:false, // internal delay flag	
	_player:null,
	_ref:null,	
	screen: 1,
	fullscreen: 0,
	stayontop: 0,
	nohud: 0,
	nobar: 0,
	BINPATH:null,
	SETTINGS:null,
	timeposition:0,
	duration:0,
	mutestatus:false,
	subtext:'',
	status:{},
	init:function(){
		logger.debug('[Player] Entering init...');
		var mpvBinary;
		var mpvHTTP;
		var pIsmpvAvailable = new Promise((resolve,reject) => {
			logger.debug('[Player] Entering promise pIsmpvAvailable...')
			if (module.exports.SETTINGS.os == 'win32') {
				mpvBinary = module.exports.BINPATH+'/mpv.exe';
				mpvHTTP = '/mpv.exe';
			} else if (module.exports.SETTINGS.os == 'darwin') {
				// if mpv is installed with MacPorts
				mpvBinary = '/Applications/MacPorts/mpv.app/Contents/MacOS/mpv';
				// if mpv is installed with Homebrew
				if (!fs.existsSync(mpvBinary)) {
					mpvBinary = '/usr/bin/mpv';
				}
				// if mpv is installed locally or not installed
				if (!fs.existsSync(mpvBinary)) {
					mpvBinary = module.exports.BINPATH+'/mpv.app/Contents/MacOS/mpv';
					mpvHTTP = '/mpv-osx.zip';
				}
			} else if (module.exports.SETTINGS.os == 'linux') {
				mpvBinary = '/usr/bin/mpv';
			}

			if(!fs.existsSync(mpvBinary)){
				logger.warn('[Player] mpv not found in path : '+module.exports.BINPATH+' or '+mpvBinary);
				if (process.platform == 'linux') {
					logger.error('[Player] You need to have mpv installed first. Use apt-get/yum/etc. depending on your linux distribution.');
					process.exit();
				}

				logger.warn('[Player] You can download it manually from http://mpv.io and place it in '+module.exports.BINPATH);
				logger.info('[Player] Downloading mpv from Shelter...');

				var mpvFile = fs.createWriteStream(module.exports.BINPATH+'/mpvtemp');
				var req = http.request({
					host: 'toyundamugen.shelter.moe',
					port: 80,
					path: '/'+mpvHTTP
				});

				req.on('response', function(res){
					var len = parseInt(res.headers['content-length'], 10);

					console.log();
					var bar = new ProgressBar('Downloading... '+' [:bar] :percent :etas', {
						complete: '=',
						incomplete: ' ',
						width: 40,
						total: len
					});

					res.on('data', function (chunk) {
						bar.tick(chunk.length);
					});

					res.on('end', function () {
						console.log('\n');
						if (module.exports.SETTINGS.os == 'win32') {
							fs.rename(module.exports.BINPATH+'/mpvtemp',
								mpvBinary,
								function(err) {
									if (err) {
										logger.error('[Player] Unable to rename mpv : '+err);
										reject();
									} else {
										logger.info('[Player] mpv successfully downloaded');
										resolve();
									}
								});
						}
						if (module.exports.SETTINGS.os == 'darwin') {
							logger.info('[Player] Extracting mpv from its archive...');
							extract(module.exports.BINPATH+'/mpvtemp', {dir: module.exports.BINPATH}, function (err) {
								if (err) {
									logger.error('[Player] Failed to extract mpv : '+err);
									reject();
								}
								logger.debug('[Player] Unlinking temporary downloaded file')
								fs.unlinkSync(module.exports.BINPATH+'/mpvtemp');
								logger.debug('[Player] Making mpv executable via chmod')
								fs.chmodSync(module.exports.BINPATH+'/mpv.app/Contents/MacOS/mpv', '755');
								logger.info('[Player] mpv extraction complete');
								resolve();
							});
						}
					});
					res.pipe(mpvFile);
				});
				req.on('error',function(err){
					reject(err);
				});
				req.end();
			} else {
				resolve();
			}
		});

		Promise.all([pIsmpvAvailable]).then(function() {
			logger.debug('[Player] Promise success pIsmpvAvailable')
			var mpvOptions = [
				'--keep-open=yes',
				'--idle=yes',
				'--fps=60',
				'--no-border',
				'--osd-level=0',
				'--sub-codepage=UTF-8-BROKEN',
			];
			if(module.exports.screen!==null) {
				mpvOptions.push('--screen='+module.exports.screen);
			}
			if(module.exports.screen!==null) {
				mpvOptions.push('--fs-screen='+module.exports.screen);
			}
			if(module.exports.fullscreen==1) {
				mpvOptions.push('--fullscreen');
			}
			if(module.exports.stayontop==1) {
				mpvOptions.push('--ontop');
			}
			if(module.exports.nohud==1) {
				mpvOptions.push('--no-osc');
			}
			if(module.exports.nobar==1) {
				mpvOptions.push('--no-osd-bar');
			}

			logger.debug('[Player] Requiring mpv API module')
			logger.debug('[Player] mpv options : '+mpvOptions)
			var mpvAPI = require('node-mpv');
			module.exports._player = new mpvAPI(
				{
					audio_only: false,
					binary: mpvBinary,
					socket: '\\\\.\\pipe\\mpvsocket',
					time_update: 1,
					verbose: false,
					debug: false,
				},
				mpvOptions
			);

			module.exports._player.observeProperty('sub-text',13);
			
			module.exports._player.on('statuschange',function(status){
				// si on affiche une image il faut considérer que c'est la pause d'après chanson
				module.exports.status = status;
				if(module.exports._playing && status && status.filename && status.filename.match(/\.(png|jp?g|gif)/i)) {
					// immediate switch to Playing = False to avoid multiple trigger
					logger.debug('[Player] Stopped mode triggered on statuschange event')
					module.exports.playing = false;
					module.exports._playing = false;
					module.exports.playerstatus = 'stop';
					module.exports._player.pause();
					module.exports.onEnd(module.exports._ref);
					module.exports._ref = null;
				}
				module.exports.mutestatus = status.mute;
				module.exports.duration = status.duration;
				module.exports.subtext = status['sub-text'];				
			});
			module.exports._player.on('paused',function(){
				module.exports.playing = false;
				module.exports._playing = false;
				module.exports.playerstatus = 'pause';
			});			
			module.exports._player.on('timeposition',function(position){
				// Returns the position in seconds in the current song
				module.exports.timeposition = position;
			});
			logger.info('[Player] Player interface is READY');
		})
			.catch(function(err) {				
				logger.error('[Player] Player interface is NOT READY :'+err);
				fs.unlink(module.exports.BINPATH+'/mpvtemp.exe', (err) => {
					if (err) throw err;
					logger.debug('[Player] Binaries folder cleaned up');
					process.exit();
				});
			});
	},
	play: function(video,subtitle,reference){
		logger.debug('[Player] Entering play...')
		module.exports.playing = true;
		if(fs.existsSync(video)){
			logger.info('[Player] Video : '+video);
			module.exports._ref = reference;
			module.exports._player.loadFile(video);
			module.exports._player.volume(70);
			module.exports._player.play();
			module.exports.playerstatus = 'play'
			// video may need some delay to play
			setTimeout(function(){
				module.exports._playing = true;
				if(subtitle) {
					if(fs.existsSync(subtitle)){
						logger.info('[Player] Subs : '+subtitle);
						module.exports._player.addSubtitles(subtitle);//, flag, title, lang)
					} else {
						logger.error('[Player] Subs NOT FOUND : '+subtitle);
					}
				} else {
					logger.info('[Player] Subs not needed');
				}
				module.exports._player.loadFile(module.exports.background,'append');
			},500);
		} else {
			module.exports.playing = false;
			logger.error('[Player] Video NOT FOUND : '+video);
		}
	},
	setFullscreen:function(fsState){
		logger.debug('[Player] Entering setFullscreen...')
		logger.debug('[Player] fsState = '+fsState)
		module.exports.fullscreen==fsState;

		if(fsState)
			module.exports._player.fullscreen();
		else
			module.exports._player.leaveFullscreen();
	},
	toggleOnTop:function(){
		logger.debug('[Player] Entering toggleOnTop...')
		module.exports.stayontop = !module.exports.stayontop;
		module.exports._player.command('keypress',['T']);
		return module.exports.stayontop;
	},
	stop:function() {
		logger.debug('[Player] Entering stop...')
		// on stop do not trigger onEnd event
		// => setting internal playing = false prevent this behavior
		module.exports.playing = false;
		module.exports.timeposition = 0;
		module.exports._playing = false;
		module.exports.playerstatus = 'stop'
		module.exports._player.loadFile(module.exports.background);
	},
	pause: function(){		
		logger.debug('[Player] Entering pause...')
		module.exports._player.pause();
		module.exports.playerstatus = 'pause'
	},
	resume: function(){
		logger.debug('[Player] Entering resume...')
		module.exports._player.play();
		module.exports.playerstatus = 'play'
	},
	seek: function(delta) {
		logger.debug('[Player] Entering seek...')
		logger.debug('[Player] Seek delta : '+delta)
		module.exports._player.seek(delta);
	},
	reset: function() {
		logger.debug('[Player] Entering reset...')
		module.exports._player.goToPosition(0);
	},
	mute: function() {
		logger.debug('[Player] Entering mute...')
		module.exports._player.mute();
	},
	unmute: function() {
		logger.debug('[Player] Entering unmute...')
		module.exports._player.unmute();
	},
	onEnd:function(ref){
		// événement émis pour quitter l'application
		logger.error('Player :: onEnd not set');
	},
};