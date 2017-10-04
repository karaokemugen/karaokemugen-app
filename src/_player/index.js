var fs = require('fs');
var path = require('path');
const logger = require('../_common/utils/logger.js');
const ip = require('ip');
const exec = require('child_process');

module.exports = {
	background:path.join(__dirname,'assets/background.jpg'), // default background
	playing:false,
	playerstatus:'stop',
	_playing:false, // internal delay flag
	_player:null,
	_ref:null,
	_states:null,
	BINPATH:null,
	SETTINGS:null,
	SYSPATH:null,
	frontend_port:null,	
	timeposition:0,
	duration:0,
	mutestatus:false,
	subtext:'',
	volume:null,
	showsubs:true,
	status:{},
	init:function(){
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

		if (!module.exports.SETTINGS.isTest) {
			Promise.all([pGenerateBackground]).then(function() {
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
					process.exit();
				});
		}
	},
	play: function(video,subtitle,reference,gain,infos){
		logger.debug('[Player] Play event triggered');
		module.exports.playing = true;

		//Search for video file in the different PathVideos
		var PathsVideos = module.exports.SETTINGS.PathVideos.split('|');
		var videoFile = undefined;
		PathsVideos.forEach((PathVideos) => {
			if (fs.existsSync(path.resolve(module.exports.SYSPATH,PathVideos,video))) {
				// Video found in the current path
				videoFile = path.resolve(module.exports.SYSPATH,PathVideos,video);
			}
		});
		if(videoFile == undefined) {
			logger.warn('[Player] Video NOT FOUND : '+video);
			if (module.exports.SETTINGS.PathVideosHTTP) {
				videoFile = module.exports.SETTINGS.PathVideosHTTP+'/'+encodeURIComponent(video);	logger.info('[Player] Trying to play video directly from the configured http source : '+module.exports.SETTINGS.PathVideosHTTP);
			} else {
				logger.error('[Player] No other source available for this video.');
			}			
		}
		if(videoFile !== undefined) {
			logger.debug('[Player] Audio gain adjustment : '+gain);
			logger.info('[Player] Loading video : '+videoFile);
			if (gain == undefined || gain == null) gain = 0;
			module.exports._ref = reference;
			module.exports._player.load(videoFile,'replace',['replaygain-fallback='+gain])
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
					module.exports._player.load(backgroundImageFile,'append')
						.catch((err) => {
							logger.error('[Player] Unable to load background in append mode (play) : '+err);
						});
					module.exports._playing = true;
				})
				.catch((err) => {
					logger.error('[Player] Error loading video '+video+' ('+err+')');
				});
		} else {
			console.log(module.exports._states.status);
			if (module.exports._states.status != 'stop') {
				logger.warn('[Player] Skipping playback due to missing video');
				module.exports.skip();
			} 
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
			})
			.catch((err) => {
				logger.error('[Player] Unable to load background at stop : '+err);
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
				'--input-conf='+path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'input.conf'),
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
			
			//On all platforms, check if we're using mpv at least version 0.20 or abort saying the mpv provided is too old. 
			//Assume UNKNOWN is a compiled version, and thus the most recent one.
			var resultatCmd = exec.spawnSync(module.exports.SETTINGS.BinmpvPath,['--version'], {encoding: 'utf8'});
			if (resultatCmd.stderr != '') {
				logger.error('[Player] '+resultatCmd.stderr);
				logger.error('[Player] Unable to detect mpv version, exiting.');
				process.exit(1);
			} else {
				var mpvVersion = resultatCmd.stdout.split(' ')[1];
				logger.debug('[Player] mpv version : '+mpvVersion);
				var mpvVersionSplit = mpvVersion.split('.');
			}
			//If we're on macOS, add --no-native-fs to get a real
			// fullscreen experience on recent macOS versions.
			if (parseInt(mpvVersionSplit[1]) < 25) {
				// Version is too old. Abort.
				logger.error('[Player] mpv version detected is too old ('+mpvVersion+'). Upgrade your mpv from http://mpv.io to at least version 0.25');
				logger.error('[Player] mpv binary : '+module.exports.SETTINGS.BinmpvPath);
				logger.error('[Player] Exiting due to obsolete mpv version');
				process.exit(1);
			}
			if(module.exports.SETTINGS.os === 'darwin') {
				if (parseInt(mpvVersionSplit[1]) > 26) {
					mpvOptions.push('--no-native-fs');
				}
			}


			logger.debug('[Player] mpv options : '+mpvOptions);
			logger.debug('[Player] mpv binary : '+module.exports.SETTINGS.BinmpvPath);
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
					binary: module.exports.SETTINGS.BinmpvPath,
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
						})
						.catch((err) => {
							logger.error('[Player] Unable to load background at start : '+err);
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
	skip:function(){},
};