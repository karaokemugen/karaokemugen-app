const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const exec = require('child_process');
const logger = require('winston');


module.exports = {
	SETTINGS:null,
	SYSPATH:null,
	jinglefiles:[],
	currentjinglefiles:[],
	buildList:function(){
		// Preparing list of jingles from all jingle directories in config
		const jingledirslist = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathJingles);
		// Browsing directories
		const jingledirs = jingledirslist.split('|');
		var jinglefileslist = [];
		jingledirs.forEach((jingledir) => {
			// Browsing files in each directory
			var jinglefilestemp = fs.readdirSync(path.resolve(module.exports.SYSPATH,jingledir));
			jinglefilestemp.forEach((jinglefiletemp,index) => {
				jinglefilestemp[index] = path.resolve(module.exports.SYSPATH,jingledir,jinglefiletemp);
			});
			//Concatenate arrays
			jinglefileslist.push.apply(jinglefileslist,jinglefilestemp);					
		});
		//Get rid of all hidden files and files not ending in these extensions
		for(var indexToRemove = jinglefileslist.length - 1; indexToRemove >= 0; indexToRemove--) {
			if((!jinglefileslist[indexToRemove].endsWith('.avi') &&
					!jinglefileslist[indexToRemove].endsWith('.webm') &&
					!jinglefileslist[indexToRemove].endsWith('.mp4') &&
					!jinglefileslist[indexToRemove].endsWith('.mkv') &&
					!jinglefileslist[indexToRemove].endsWith('.mov')) || jinglefileslist[indexToRemove].startsWith('.')) {
				jinglefileslist.splice(indexToRemove, 1);
			}
		}
		// Build a new array and add gain to it.
		async.eachLimit(jinglefileslist,3,(jinglefile,callback) => {
			// Calculate gain here
			function getvideogain(videofile){
				return new Promise((resolve) => {					
					var proc = exec.spawn(module.exports.SETTINGS.BinffmpegPath, ['-i', videofile, '-vn', '-af', 'replaygain', '-f','null', '-'], { encoding : 'utf8' });

					var audioGain = undefined;
					var output = '';

					proc.stderr.on('data',(data) => {
						output += data.toString();
					});

					proc.on('close', (code) => {
						if (code !== 0) {
							module.exports.onLog('error', 'Video '+videofile+' gain calculation error : '+code);
							resolve(0);
						} else {
							var outputArray = output.split(' ');
							var index = outputArray.indexOf('track_gain');
							if ( index != -1) {
								audioGain = parseFloat(outputArray[index+2]);
							}	
							if (typeof audioGain === 'number') {
								resolve(audioGain.toString());
							} else {
								resolve(0);
							}
						}						
					});

				});
			}
			getvideogain(jinglefile)
				.then((audiogain) => {
					var jingle = 
					{ 
						file: jinglefile,
						gain: audiogain 
					};
					module.exports.jinglefiles.push(jingle);
					logger.debug('[Jingles] Computed jingle '+jinglefile+' audio gain at '+audiogain+' dB');
					callback();
				})
				.catch((err) => {
					callback(err);
				});
			
		},(err) => {
			if (err) {
				logger.error('[Jingles] Failed computing jingle audio gain data : '+err);
			} else {
				module.exports.currentjinglefiles = Array.prototype.concat(module.exports.jinglefiles);	
				logger.info('[Jingles] Finished computing jingle audio gain data');				
			}
		});

	}
};
	
