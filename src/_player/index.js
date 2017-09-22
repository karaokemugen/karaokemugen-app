var fs = require('fs');
var path = require('path');
const logger = require('../_common/utils/logger.js');
var ProgressBar = require('progress');
var http = require('http');
const ip = require('ip');

module.exports = {
	background:path.join(__dirname,'assets/background.jpg'), // default background
	playing:false,
	playerstatus:'stop',
	_playing:false, // internal delay flag
	_player:null,
	_ref:null,
	BINPATH:null,
	SETTINGS:null,
	SYSPATH:null,
	frontend_port:null,
	mpvBinary:null,
	timeposition:0,
	duration:0,
	mutestatus:false,
	subtext:'',
	volume:null,
	showsubs:true,
	status:{},
	init:function(){
		var mpvHTTP;
		var pGenerateBackground = new Promise((resolve,reject) => {
			var generateBackground = require('./generate_background.js');
			generateBackground.SYSPATH = module.exports.SYSPATH;
			generateBackground.SETTINGS = module.exports.SETTINGS;
			generateBackground.frontend_port = module.exports.frontend_port;
			generateBackground.build()
				.then(function(){
					logger.info('[Player] Background generated');
					resolve();
				})
				.catch(function(err){
					logger.error('[Player] Background generation error : '+err);
					reject(err);
				});
		});
		var pIsmpvAvailable = new Promise((resolve,reject) => {
			if (module.exports.SETTINGS.os == 'win32') {
				module.exports.mpvBinary = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerWindows);
				mpvHTTP = '/mpv.exe';
			} else if (module.exports.SETTINGS.os == 'darwin') {
				// Test first if the path provided in the settings is valid and executable.
				// If not, we'll try the different possibilities for mpv's install :
				// - Macports
				// - Homebrew
				// - Manual install
				if (fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerOSX))) {
					console.log("1")
					module.exports.mpvBinary = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerOSX);
				} else {
					// if mpv is installed with MacPorts
					module.exports.mpvBinary = '/opt/local/bin/mpv';
				}
				// if mpv is installed with Homebrew
				if (!fs.existsSync(module.exports.mpvBinary)) {
					module.exports.mpvBinary = '/usr/bin/mpv';
				}
				// if mpv is installed locally or not installed
				if (!fs.existsSync(module.exports.mpvBinary)) {
					module.exports.mpvBinary = path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'/mpv.app/Contents/MacOS/mpv');
				}
			} else if (module.exports.SETTINGS.os == 'linux') {
				module.exports.mpvBinary = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.BinPlayerLinux);
			}
			if(!fs.existsSync(module.exports.mpvBinary)){
				logger.error('[Player] mpv not found or not accessable in path : '+mpvBinary);
				if (module.exports.SETTINGS.os === 'linux') {
					console.log('\n');
					console.log('You need to have mpv installed first. Use apt-get/yum/etc. depending on your Linux distribution.');
					console.log('See http://mpv.io/installation for more details.');
					console.log('\n');
					reject('mpv not installed!');
				}
				if (module.exports.SETTINGS.os === 'darwin') {
					console.log('\n');
					console.log('You need to have mpv installed first. Use Homebrew/Macports/etc. depending on your preference.');
					console.log('See http://mpv.io/installation for more details.');
					console.log('\n');
					reject('mpv not installed!');
				}

				if (module.exports.SETTINGS.os === 'win32') {
					logger.info('[Player] Downloading mpv from Shelter...');
					logger.info('You can download it manually from http://mpv.io and place it in '+module.exports.mpvBinary+' if you dont trust the binary on Shelter.');

					var mpvFile = fs.createWriteStream(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'/mpvtemp'));
					var req = http.request({
						host: 'mugen.karaokes.moe',
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
								fs.rename(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'/mpvtemp'),
									module.exports.mpvBinary,
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
						});
						res.pipe(mpvFile);
					});
					req.on('error',function(err){
						reject(err);
					});
					req.end();
				}

			} else {
				resolve();
			}
		});

		if (!module.exports.SETTINGS.isTest) {
			Promise.all([pIsmpvAvailable,pGenerateBackground]).then(function() {
				logger.debug('[Player] mpv is available');

				module.exports.startmpv()
					.then(() => {
						logger.info('[Player] Player interface is READY');
					})
					.catch((err) => {
						logger.error('[Player] mpv is not ready : '+err);
					});

			})
				.catch(function(err) {
					logger.error('[Player] Player interface is NOT READY : '+err);
					if (fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'mpvtemp.exe'))) {
						fs.unlinkSync(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'mpvtemp.exe'));
					}
					process.exit();
				});
		}
	},
	play: function(video,subtitle,reference,gain,infos){
		logger.debug('[Player] Play event triggered');
		module.exports.playing = true;
		if(fs.existsSync(video)){
			logger.debug('[Player] Audio gain adjustment : '+gain);
			if (gain == undefined || gain == null) gain = 0;
			module.exports._ref = reference;
			module.exports._player.load(video,'replace',['replaygain-fallback='+gain])
				.then(() => {
					module.exports._player.play();
					module.exports.playerstatus = 'play';
					if (subtitle) {
						module.exports._player.addSubtitles('memory://'+subtitle);
					}
					// Displaying infos about current song on screen.
					var command = {
						command: [
							'expand-properties',
							'show-text',
							'${osd-ass-cc/0}{\\an1}'+infos,
							8000,
						]
					};
					module.exports._player.freeCommand(JSON.stringify(command));
					//logger.profile('StartPlaying');
					var backgroundImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'background.jpg');
					module.exports._player.load(backgroundImageFile,'append');
					module.exports._playing = true;
				})
				.catch((err) => {
					logger.error('[Player] Error loading video '+video+' ('+err+')');
				});
		} else {
			module.exports.playing = false;
			logger.error('[Player] Video NOT FOUND : '+video);
		}
	},
	setFullscreen:function(fsState){
		module.exports.fullscreen==fsState;

		if(fsState)
			module.exports._player.fullscreen();
		else
			module.exports._player.leaveFullscreen();
	},
	toggleOnTop:function(){
		module.exports.stayontop = !module.exports.stayontop;
		module.exports._player.command('keypress',['T']);
		return module.exports.stayontop;
	},
	stop:function() {
		// on stop do not trigger onEnd event
		// => setting internal playing = false prevent this behavior
		logger.debug('[Player] Stop event triggered');
		module.exports.playing = false;
		module.exports.timeposition = 0;
		module.exports._playing = false;
		module.exports.playerstatus = 'stop';
		var backgroundImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'background.jpg');
		module.exports._player.load(backgroundImageFile)
			.then(() => {
				module.exports.enhanceBackground();
			});
	},
	pause: function(){
		logger.debug('[Player] Pause event triggered');
		module.exports._player.pause();
		module.exports.playerstatus = 'pause';
	},
	resume: function(){
		logger.debug('[Player] Resume event triggered');
		module.exports._player.play();
		module.exports.playing = true;
		module.exports._playing = true;
		module.exports.playerstatus = 'play';
	},
	seek: function(delta) {
		module.exports._player.seek(delta);
	},
	goTo: function(seconds) {
		module.exports._player.goToPosition(seconds);
	},
	mute: function() {
		module.exports._player.mute();
	},
	unmute: function() {
		module.exports._player.unmute();
	},
	setVolume: function(volume) {
		module.exports._player.volume(volume);
	},
	hideSubs: function() {
		module.exports._player.hideSubtitles();
		module.exports.showsubs = false;
	},
	showSubs: function() {
		module.exports._player.showSubtitles();
		module.exports.showsubs = true;
	},
	message: function(message,duration) {
		if (!duration) duration = 10000;
		var command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an5}'+message,
				duration,
			]
		};
		module.exports._player.freeCommand(JSON.stringify(command));
		if (module.exports.playing === false) {
			setTimeout(function(){
				module.exports.enhanceBackground();
			},duration);
		}
	},
	enhanceBackground: function(){
		var url = 'http://'+ip.address()+':'+module.exports.frontend_port;
		var imageCaption = 'Karaoke Mugen - '+__('GO_TO')+' '+url+' !';
		var imageSign = module.exports.SETTINGS.VersionNo+' - '+module.exports.SETTINGS.VersionName+' - http://mugen.karaokes.moe';
		var message = '{\\fscx80}{\\fscy80}'+imageCaption+'\\N{\\fscx30}{\\fscy30}{\\i1}'+imageSign+'{\\i0}';
		var command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an1}'+message,
				100000000,
			]
		};
		module.exports._player.freeCommand(JSON.stringify(command));
	},
	onStatusChange:function(){},
	onEnd:function(){
		// événement émis pour quitter l'application
		logger.error('Player :: onEnd not set');
	},
	restartmpv:function(){
		return new Promise(function(resolve,reject){
			module.exports.quitmpv()
				.then(() => {
					logger.debug('[Player] Stopped mpv (restarting)');
					module.exports.startmpv()
						.then(() => {
							logger.debug('[Player] restarted mpv');
							resolve();
						})
						.catch((err) => {
							logger.error('[Player] Unable to start mpv : '+err);
							reject(err);
						});
				})
				.catch((err) => {
					logger.error('[Player] Unable to quit mpv : '+err);
					reject(err);
				});
		});
	},
	startmpv:function(){
		return new Promise(function(resolve,reject){
			var mpvOptions = [
				'--keep-open=yes',
				'--fps=60',
				'--no-border',
				'--osd-level=0',
				'--sub-codepage=UTF-8-BROKEN',
				'--volume=100',
			];
			if (module.exports.SETTINGS.PlayerPIP) {
				mpvOptions.push('--autofit='+module.exports.SETTINGS.PlayerPIPSize+'%x'+module.exports.SETTINGS.PlayerPIPSize+'%');
				// By default, center.
				var positionX = 50;
				var positionY = 50;
				switch(module.exports.SETTINGS.PlayerPIPPositionX){
				case 'Left':
					positionX = 1;
					break;
				case 'Center':
					positionX = 50;
					break;
				case 'Right':
					positionX = 99;
					break;
				}
				switch(module.exports.SETTINGS.PlayerPIPPositionY){
				case 'Top':
					positionY = 5;
					break;
				case 'Center':
					positionY = 50;
					break;
				case 'Bottom':
					positionY = 95;
					break;
				}
				mpvOptions.push('--geometry='+positionX+'%:'+positionY+'%');
			}
			if(module.exports.SETTINGS.mpvVideoOutput !== null && module.exports.SETTINGS.mpvVideoOutput !== '' && module.exports.SETTINGS.mpvVideoOutput !== undefined) {
				mpvOptions.push('--vo='+module.exports.SETTINGS.mpvVideoOutput);
			}
			if(module.exports.SETTINGS.PlayerScreen!==null) {
				mpvOptions.push('--screen='+module.exports.SETTINGS.PlayerScreen);
				mpvOptions.push('--fs-screen='+module.exports.SETTINGS.PlayerScreen);
			}
			// Fullscreen is disabled if pipmode is set.
			if(module.exports.SETTINGS.PlayerFullscreen == 1 && !module.exports.PlayerPIP) {
				mpvOptions.push('--fullscreen');
			}
			if(module.exports.SETTINGS.PlayerStayOnTop==1) {
				mpvOptions.push('--ontop');
			}
			if(module.exports.SETTINGS.PlayerNoHud==1) {
				mpvOptions.push('--no-osc');
			}
			if(module.exports.SETTINGS.PlayerNoBar==1) {
				mpvOptions.push('--no-osd-bar');
			}
			//If we're on macOS, add --no-native-fs to get a real
			// fullscreen experience on recent macOS versions.
			//if(module.exports.SETTINGS.os === 'darwin') {
			//	mpvOptions.push('--no-native-fs');
			//}

			logger.debug('[Player] mpv options : '+mpvOptions);
			logger.debug('[Player] mpv binary : '+module.exports.mpvBinary);
			var mpvAPI = require('node-mpv');
			var socket;
			switch(module.exports.SETTINGS.os) {
			case 'win32':
				socket = '\\\\.\\pipe\\mpvsocket';
				break;
			case 'darwin':
				socket = '/tmp/km-node-mpvsocket';
				break;
			case 'linux':
				socket = '/tmp/km-node-mpvsocket';
				break;
			}

			module.exports._player = new mpvAPI(
				{
					auto_restart: true,
					audio_only: false,
					binary: module.exports.mpvBinary,
					socket: socket,
					time_update: 1,
					verbose: false,
					debug: false,
				},
				mpvOptions
			);
			// Starting up mpv
			module.exports._player.start()
				.then(() => {
					var backgroundImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'background.jpg');
					// Disabled loading the background at start during dev. Or not yet.
					module.exports._player.load(backgroundImageFile)
						.then(() => {
							module.exports.enhanceBackground();
						});
					module.exports._player.observeProperty('sub-text',13);
					module.exports._player.observeProperty('volume',14);
					module.exports._player.on('statuschange',function(status){
						// si on affiche une image il faut considérer que c'est la pause d'après chanson
						module.exports.status = status;
						if(module.exports._playing && status && status.filename && status.filename.match(/\.(png|jp?g|gif)/i)) {
							// immediate switch to Playing = False to avoid multiple trigger
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
						module.exports.volume = status['volume'];
						module.exports.onStatusChange();
					});
					module.exports._player.on('paused',function(){
						logger.debug('[Player] Paused event triggered');
						module.exports.playing = false;
						module.exports.playerstatus = 'pause';
						module.exports.onStatusChange();
					});
					module.exports._player.on('resumed',function(){
						logger.debug('[Player] Resumed event triggered');
						module.exports.playing = true;
						module.exports.playerstatus = 'play';
						module.exports.onStatusChange();
					});
					module.exports._player.on('timeposition',function(position){
						// Returns the position in seconds in the current song
						module.exports.timeposition = position;
						module.exports.onStatusChange();
					});
					logger.debug('[Player] mpv initialized successfully');
					resolve();
				})
				.catch((err) => {
					logger.error('[Player] mpvAPI : '+err);
					reject();
				});
		});
	},
	quitmpv:function(){
		return new Promise(function(resolve){
			logger.debug('[Player] quitting mpv');
			module.exports._player.quit();
			// Destroy mpv instance.
			module.exports._player = null;
			resolve();
		});
	},
};