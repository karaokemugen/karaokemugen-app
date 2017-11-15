var fs = require('fs-extra');
var path = require('path');
const logger = require('winston');
const exec = require('child_process');
const L = require('lodash');
const sizeOf = require('image-size');
const jingles = require('./jingles.js');

var displayingInfo = false;

function loadBackground(mode) {	
	if (!mode) mode = 'replace';
	// Default background
	var backgroundFiles = [];	
	var backgroundDirs = module.exports.SETTINGS.PathBackgrounds.split('|');

	var backgroundImageFile = path.join(__dirname,'assets/background.jpg');
	if (!L.isEmpty(module.exports.SETTINGS.PlayerBackground)) {
		backgroundImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathBackgrounds,module.exports.SETTINGS.PlayerBackground);	if (!fs.existsSync(backgroundImageFile)) {
			// Background provided in config file doesn't exist, reverting to default one provided.
			logger.warn('[Player] Unable to find background file '+backgroundImageFile+', reverting to default one');
			if (!fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'))) fs.copySync(path.join(__dirname,'assets/background.jpg'),path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'));
			backgroundFiles.push(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'));
		} 				
	} else {
		// PlayerBackground is empty, thus we search through all backgrounds paths and pick one at random
		
		backgroundDirs.forEach((backgroundDir) => {			
			var backgroundFilesTemp = fs.readdirSync(path.resolve(module.exports.SYSPATH,backgroundDir));
			backgroundFilesTemp.forEach((backgroundFileTemp,index) => {
				backgroundFilesTemp[index] = path.resolve(module.exports.SYSPATH,backgroundDir,backgroundFileTemp);
			});
			backgroundFiles.push.apply(backgroundFiles,backgroundFilesTemp);
		});
		// If backgroundFiles is empty, it means no file was found in the directories scanned.
		// Reverting to original, supplied background :
		if (backgroundFiles.length === 0) {
			if (!fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'))) fs.copySync(path.join(__dirname,'assets/background.jpg'),path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'));
			backgroundFiles.push(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'default.jpg'));
		}
	}
	//Deleting non image files
	for(var indexToRemove = backgroundFiles.length - 1; indexToRemove >= 0; indexToRemove--) {
		if((!backgroundFiles[indexToRemove].endsWith('.jpg') &&
			!backgroundFiles[indexToRemove].endsWith('.jpeg') &&
			!backgroundFiles[indexToRemove].endsWith('.png') &&
			!backgroundFiles[indexToRemove].endsWith('.gif')) ||
			backgroundFiles[indexToRemove].startsWith('.')) {
			backgroundFiles.splice(indexToRemove, 1);
		}
	}
	backgroundImageFile = L.sample(backgroundFiles);
	logger.debug('[Player] Background : '+backgroundImageFile);
	var videofilter = '';
	if (module.exports.SETTINGS.EngineDisplayConnectionInfoQRCode != 0 && 
		module.exports.SETTINGS.EngineDisplayConnectionInfo != 0) {
				
		var dimensions = sizeOf(backgroundImageFile);
		var QRCodeWidth,QRCodeHeight;
		QRCodeWidth = QRCodeHeight = Math.floor(dimensions.width*0.10);

		var posX = Math.floor(dimensions.width*0.015);
		var posY = Math.floor(dimensions.height*0.015);
		var qrCode = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'qrcode.png');
		qrCode = qrCode.replace(/\\/g,'/');
		videofilter = 'lavfi-complex="movie=\\\''+qrCode+'\\\'[logo]; [logo][vid1]scale2ref='+QRCodeWidth+':'+QRCodeHeight+'[logo1][base];[base][logo1] overlay='+posX+':'+posY+'[vo]"';
	} 
	module.exports._player.load(backgroundImageFile,mode,videofilter)
		.then(() => {
			if (mode === 'replace') {
				module.exports.displayInfo();
			}
		})
		.catch((err) => {
			logger.error('[Player] Unable to load background in '+mode+' mode : '+JSON.stringify(err));
		});
}

module.exports = {
	playing:false,
	playerstatus:'stop',
	_playing:false, // internal delay flag
	_player:null,
	_states:null,
	BINPATH:null,
	SETTINGS:null,
	SYSPATH:null,
	frontend_port:null,	
	timeposition:0,
	duration:0,
	mutestatus:false,
	subtext:'',
	volume:100,
	currentSongInfos:null,
	videoType:null,
	showsubs:true,
	stayontop:false,
	fullscreen:false,	
	status:{},
	init:function(){
		// Building jingles list
		jingles.SETTINGS = module.exports.SETTINGS;
		jingles.SYSPATH = module.exports.SYSPATH;
		jingles.buildList();
		//Copying jingle data to currentjinglefiles which will be used by the player		

		// Building QR Code with URL to connect to
		var pGenerateQRCode = new Promise((resolve,reject) => {
			var qrCode = require('./qrcode.js');
			qrCode.SYSPATH = module.exports.SYSPATH;
			qrCode.SETTINGS = module.exports.SETTINGS;
			var url = 'http://'+module.exports.SETTINGS.osHost+':'+module.exports.frontend_port;
			qrCode.build(url)
				.then(function(){
					logger.debug('[Player] QRCode generated');
					resolve();
				})
				.catch(function(err){
					logger.error('[Player] QRCode generation error : '+err);
					reject(err);
				});				
		});

		if (!module.exports.SETTINGS.isTest) {
			Promise.all([pGenerateQRCode]).then(function() {
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
	play:function(video,subtitle,gain,infos){
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
				videoFile = module.exports.SETTINGS.PathVideosHTTP+'/'+encodeURIComponent(video);	
				logger.info('[Player] Trying to play video directly from the configured http source : '+module.exports.SETTINGS.PathVideosHTTP);
			} else {
				logger.error('[Player] No other source available for this video.');
			}			
		}
		if(videoFile !== undefined) {
			logger.debug('[Player] Audio gain adjustment : '+gain);
			logger.info('[Player] Loading video : '+videoFile);
			if (gain == undefined || gain == null) gain = 0;			
			module.exports._player.load(videoFile,'replace',['replaygain-fallback='+gain])
				.then(() => {					
					module.exports.videoType = 'song';
					module.exports._player.play();
					module.exports.playerstatus = 'play';
					if (subtitle) {
						module.exports._player.addSubtitles('memory://'+subtitle);
					}
					
					// Displaying infos about current song on screen.					
					module.exports.displaySongInfo(infos);
					module.exports.currentSongInfos = infos;
					//logger.profile('StartPlaying');
					loadBackground('append');
					module.exports._playing = true;
				})
				.catch((err) => {
					logger.error('[Player] Error loading video '+video+' ('+JSON.stringify(err)+')');
				});
		} else {			
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
		loadBackground();
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
		module.exports.volume = volume;
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
				module.exports.displayInfo();
			},duration);
		}
	},
	displaySongInfo: function(infos){
		displayingInfo = true;
		var command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an1}'+infos,
				8000,
			]
		};
		module.exports._player.freeCommand(JSON.stringify(command));
		setTimeout(() => {
			displayingInfo = false;
		},8000);
	},
	displayInfo: function(duration){
		if (!duration) duration = 100000000;
		var text = '';
		if (module.exports.SETTINGS.EngineDisplayConnectionInfo != 0) {
			var url = 'http://'+module.exports.SETTINGS.osHost+':'+module.exports.frontend_port;
			text = __('GO_TO')+' '+url+' !';	
			if (module.exports.SETTINGS.EngineDisplayConnectionInfoMessage != '') {
				text = module.exports.SETTINGS.EngineDisplayConnectionInfoMessage + ' - ' + text;
			}
		}

		var version = 'Karaoke Mugen '+module.exports.SETTINGS.VersionNo+' '+module.exports.SETTINGS.VersionName+' - http://mugen.karaokes.moe';
		var message = '{\\fscx80}{\\fscy80}'+text+'\\N{\\fscx30}{\\fscy30}{\\i1}'+version+'{\\i0}';
		var command = {
			command: [
				'expand-properties',
				'show-text',
				'${osd-ass-cc/0}{\\an1}'+message,
				duration,
			]
		};
		module.exports._player.freeCommand(JSON.stringify(command));
	},
	onStatusChange:function(){},
	onEnd:function(){},
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
				'--volume='+module.exports.volume,
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
				module.exports.fullscreen = true;
			}
			if(module.exports.SETTINGS.PlayerStayOnTop==1) {
				module.exports.stayontop = true;
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
					loadBackground();
					module.exports._player.observeProperty('sub-text',13);
					module.exports._player.observeProperty('volume',14);
					module.exports._player.on('statuschange',function(status){
						// si on affiche une image il faut considérer que c'est la pause d'après chanson
						module.exports.status = status;
						if(module.exports._playing && status && status.filename && status.filename.match(/\.(png|jp.?g|gif)/i)) {
							// immediate switch to Playing = False to avoid multiple trigger
							module.exports.playing = false;
							module.exports._playing = false;
							module.exports.playerstatus = 'stop';
							module.exports._player.pause();
							module.exports.videoType = 'background';
							module.exports.onEnd();							
						}

						module.exports.mutestatus = status.mute;
						module.exports.duration = status.duration;
						module.exports.subtext = status['sub-text'];
						module.exports.volume = status['volume'];
						module.exports.fullscreen = status.fullscreen;
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
						// Display informations if timeposition is 8 seconds before end of song
						if (position >= (module.exports.duration - 8) && 
							displayingInfo == false &&
							module.exports.videoType == 'song')						
							module.exports.displaySongInfo(module.exports.currentSongInfos);
						if (Math.floor(position) == Math.floor(module.exports.duration / 2) && displayingInfo == false && module.exports.videoType == 'song') module.exports.displayInfo(8000);
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
	playJingle:function(){
		module.exports.playing = true;
		module.exports.videoType = 'jingle';
		if (jingles.currentjinglefiles.length > 0) {
			logger.info('[Player] Jingle time !');
			var jingle = L.sample(jingles.currentjinglefiles);
			//Let's remove the jingle we just selected so it won't be picked again next time.
			L.remove(jingles.currentjinglefiles, (j) => {	
				return j.file === jingle.file;
			});
			//If our current jingle files list is empty after the previous removal
			//Fill it again with the original list.
			if (jingles.currentjinglefiles.length == 0) {
				jingles.currentjinglefiles = Array.prototype.concat(jingles.jinglefiles);	
			}
			logger.debug('[Player] Playing jingle '+jingle.file);
			if (jingle != undefined) {
				module.exports._player.load(jingle.file,'replace',['replaygain-fallback='+jingle.gain])
					.then(() => {
						module.exports._player.play();						
						module.exports.displayInfo();
						module.exports.playerstatus = 'play';
						loadBackground('append');
						module.exports._playing = true;
					})
					.catch((err) => {
						logger.error('[Player] Unable to load jingle file '+jingle.file+' with gain modifier '+jingle.gain+' : '+JSON.stringify(err));
					});
			} else {				
				module.exports.playerstatus = 'play';
				loadBackground();
				module.exports.displayInfo();
				module.exports._playing = true;
			}
		} else {
			module.exports.playerstatus = 'play';
			loadBackground();
			module.exports.displayInfo();
			module.exports._playing = true;
		}
	},
};