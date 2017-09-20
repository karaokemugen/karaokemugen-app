var fs = require('fs');
var path = require('path');
const logger = require('../_common/utils/logger.js');
var ProgressBar = require('progress');
var http = require('http');
var extract = require('extract-zip');
const ip = require('ip');

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
	vo: null,
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
	pipmode:null,
	pipsize:null,
	pippositionx:null,
	pippositiony:null,
	init:function(){
		var mpvBinary;
		var mpvHTTP;
		var pGenerateBackground = new Promise((resolve,reject) => {
			var generateBackground = require('./generate_background.js');
			generateBackground.SYSPATH = module.exports.SYSPATH;
			generateBackground.SETTINGS = module.exports.SETTINGS;
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
					reject('mpv not installed!');
				}

				logger.warn('[Player] You can download it manually from http://mpv.io and place it in '+module.exports.BINPATH);
				logger.info('[Player] Downloading mpv from Shelter...');

				var mpvFile = fs.createWriteStream(module.exports.BINPATH+'/mpvtemp');
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
								fs.unlinkSync(module.exports.BINPATH+'/mpvtemp');
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

		Promise.all([pIsmpvAvailable,pGenerateBackground]).then(function() {
			logger.debug('[Player] mpv is available');
			var mpvOptions = [
				'--keep-open=yes',
				'--fps=60',
				'--no-border',
				'--osd-level=0',
				'--sub-codepage=UTF-8-BROKEN',
				'--volume=100',					
			];			
			if (module.exports.pipmode) {
				mpvOptions.push('--autofit='+module.exports.pipsize+'%x'+module.exports.pipsize+'%');
				// By default, center.
				var positionX = 50;
				var positionY = 50;
				switch(module.exports.pippositionx){
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
				switch(module.exports.pippositiony){
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
			if(module.exports.vo!==null && module.exports.vo !== '' && module.exports.vo !== undefined) {
				mpvOptions.push('--vo='+module.exports.vo);
			}
			if(module.exports.screen!==null) {
				mpvOptions.push('--screen='+module.exports.screen);
				mpvOptions.push('--fs-screen='+module.exports.screen);
			}
			// Fullscreen is disabled if pipmode is set. 
			if(module.exports.fullscreen==1 && !module.exports.pipmode) {
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
			//If we're on macOS, add --no-native-fs to get a real
			// fullscreen experience on recent macOS versions.
			if(module.exports.SETTINGS.os === 'darwin') {
				mpvOptions.push('--no-native-fs');
			}
			logger.debug('[Player] mpv options : '+mpvOptions);
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
					binary: mpvBinary,
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
				})
				.catch((err) => {
					logger.error('[Player] mpvAPI : '+err);
				});
			
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
			logger.info('[Player] Player interface is READY');
		})
			.catch(function(err) {				
				logger.error('[Player] Player interface is NOT READY : '+err);
				if (fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'mpvtemp.exe'))) {
					fs.unlinkSync(path.resolve(module.exports.SYSPATH,module.exports.BINPATH,'mpvtemp.exe'));
				}
				process.exit();									
			});
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
					module.exports._player.addSubtitles('memory://'+subtitle);					
					// video may need some delay to play
					// Resetting text displayed on screen			
					var command = {
						command: [
							'expand-properties',
							'show-text',
							'${osd-ass-cc/0}{\\an1}'+infos,
							8000,
						]
					};	
					module.exports._player.freeCommand(JSON.stringify(command));			
					logger.profile('StartPlaying');												
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
};