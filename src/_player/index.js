var fs = require('fs');
var path = require('path');
const logger = require('../_common/utils/logger.js');
const dl = require('request-progress');
var ProgressBar = require('progress');
var http = require('http');
var extract = require('extract-zip')

module.exports = {
	background:path.join(__dirname,'assets/background.jpg'), // default background
	playing:false,
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
	init:function(){

		var pIsmpvAvailable = new Promise((resolve,reject) =>
		{
			
			if (module.exports.SETTINGS.os == 'win32') 
			{
				mpvBinary = module.exports.BINPATH+'/mpv.exe';
				mpvHTTP = '/mpv.exe';
			}
			if (module.exports.SETTINGS.os == 'darwin') 
			{
				mpvBinary = module.exports.BINPATH+'/mpv.app/Contents/MacOS/mpv';
				mpvHTTP = '/mpv-osx.zip';
			}
			console.log(mpvHTTP);
			if (module.exports.SETTINGS.os == 'linux') mpvBinary = '/usr/bin/mpv';
			
			if(!fs.existsSync(mpvBinary)){				
				logger.warn(__('MPV_NOT_FOUND',module.exports.BINPATH));
				if (process.platform == 'linux') 
				{
					logger.warn(__('MPV_LINUX_DL'));
					process.exit();
				}

				logger.warn(__('MPV_MANUAL_DL',module.exports.BINPATH));				
				logger.warn(__('MPV_DL'));

				var mpvFile = fs.createWriteStream(module.exports.BINPATH+'/mpvtemp');
				var req = http.request({
				host: 'toyundamugen.shelter.moe',
				port: 80,
				path: '/'+mpvHTTP
				});

				req.on('response', function(res){
					var len = parseInt(res.headers['content-length'], 10);

					console.log();
					var bar = new ProgressBar(__('DOWNLOADING')+' [:bar] :percent :etas', {
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
										  logger.error(__('RENAME_MPV_FAILED',err))
										  reject();
									  } else {
										  logger.info(__('DOWNLOADED_MPV'));
										  resolve();
									  }
									
							})
						}
						if (module.exports.SETTINGS.os == 'darwin') {
							logger.info(__('MPV_EXTRACTING'));
							extract(module.exports.BINPATH+'/mpvtemp', {dir: module.exports.BINPATH}, function (err) {
								if (err) {
									logger.error(__('MPV_EXTRACT_ERROR',err.stringify()));
									reject();
								}
								fs.unlinkSync(module.exports.BINPATH+'/mpvtemp')							
								logger.info(__('MPV_EXTRACT_COMPLETE'));
								resolve();
							});
						}
					});
					res.pipe(mpvFile);
				});
				req.on('error',function(err){
					reject(err);
				})
				req.end();
			} else {
				resolve();
			}
		})

		Promise.all([pIsmpvAvailable]).then(function()
		{
			var mpvOptions = [
				"--keep-open=yes",
				"--idle=yes",
				"--fps=60",
				'--no-border',
				'--osd-level=0',
				"--sub-codepage=UTF-8-BROKEN",
			];
			if(module.exports.screen!==null) mpvOptions.push('--screen='+module.exports.screen)
			if(module.exports.screen!==null) mpvOptions.push('--fs-screen='+module.exports.screen)
			if(module.exports.fullscreen==1) mpvOptions.push('--fullscreen')
			if(module.exports.stayontop==1) mpvOptions.push('--ontop')
			if(module.exports.nohud==1) mpvOptions.push('--no-osc')
			if(module.exports.nobar==1) mpvOptions.push('--no-osd-bar')

			//console.log(mpvOptions);

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

		
			module.exports._player.on('statuschange',function(status){
				// si on affiche une image il faut considérer que c'est la pause d'après chanson
				if(module.exports._playing && status && status.filename && status.filename.match(/\.(png|jp?g|gif)/i))
				{
					// immediate switch to Playing = False to avoid multiple trigger
					module.exports.playing = false;
					module.exports._playing = false;
					module.exports._player.pause();
					module.exports.onEnd(module.exports._ref);
					module.exports._ref = null;
				}
			});
			logger.info(__('PLAYER_READY'));
		})
		.catch(function(err) {
			logger.error(__('PLAYER_NOT_READY',err));
			fs.unlink(module.exports.BINPATH+'/mpvtemp.exe', (err) => {
  				if (err) throw err;
  				logger.debug(__('BINDIR_CLEANED_UP'));
				process.exit();
			});
		});
	},
	play: function(video,subtitle,reference){
		module.exports.playing = true;
		if(fs.existsSync(video)){
			logger.info(__('VIDEO_PLAYING',video));
			module.exports._ref = reference;
			module.exports._player.loadFile(video);
			module.exports._player.volume(70);
			module.exports._player.play();
			// video may need some delay to play
			setTimeout(function(){
				module.exports._playing = true;
				if(subtitle)
				{
					if(fs.existsSync(subtitle)){
						logger.info(__('SUBTITLE',subtitle));
						module.exports._player.addSubtitles(subtitle);//, flag, title, lang)
					}
					else
					{
						logger.error(__('SUBTITLE_NOT_FOUND',subtitle));
					}
				}
				else
				{
					logger.info(__('NO_SUBTITLE'));
				}
				module.exports._player.loadFile(module.exports.background,'append');
			},500);
		}
		else {
			module.exports.playing = false;
			logger.error(__('VIDEO_NOT_FOUND',video))
		}
	},
	setFullscreen:function(fsState){
		module.exports.fullscreen==fsState

		if(fsState)
			module.exports._player.fullscreen();
		else
			module.exports._player.leaveFullscreen();
	},
	toggleOnTop:function(){
		module.exports.stayontop = !module.exports.stayontop;
		module.exports._player.command("keypress",["T"]);
		return module.exports.stayontop;
	},
	stop:function()
	{
		// on stop do not trigger onEnd event
		// => setting internal playing = false prevent this behavior
		module.exports.playing = false;
		module.exports._playing = false;
		module.exports._player.loadFile(module.exports.background);
	},
	pause: function(){
		//console.log(module.exports._player);
		module.exports._player.pause();
	},
	resume: function(){
		module.exports._player.play();
	},
	onEnd:function(ref){
		// événement émis pour quitter l'application
		logger.error('_player/index.js :: onEnd not set')
	},
};