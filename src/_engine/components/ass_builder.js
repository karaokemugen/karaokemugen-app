var path = require('path');
var fs = require('fs');
var assParser = require('ass-parser');
var assStringify = require('ass-stringify');
var S = require('string');
var i18n = require("i18n");
const uuidv4 = require('uuid/v4');
const exec = require('child_process');
const MatroskaSubtitles = require('matroska-subtitles')
const moment = require('moment');
require("moment-duration-format");
const ffmpegPath = require('ffmpeg-downloader').path

module.exports = function(pathToSubFiles, pathToVideoFiles, subFile, videoFile, outputFolder, title, series, songType, songOrder, requester, kara_id, playlist_id){
		var uuid = uuidv4();;
		/*
		// Parameters examples :
		var subFile = 'app/data/lyrics/Mahoromatic - AMV - Derniere danse 2010.ass';
		var subFile = 'dummy.ass';
		var videoFile = 'xeno.mkv';
		var outputFolder = 'app/temp/';
		var title = 'Dernière Danse';
		var series = 'Mahoromatic';
		var songType = 'AMV'
		var songOrder = '';
		var requester = 'Axel';
		var kara_id = 1200;
		*/

			return new Promise(function(resolve, reject){
				
			//Testing if video file exists and which extension it has.
			
			if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile))) 
			{
					reject(__('VIDEO_NOT_FOUND',videoFile));
			}	

			//Testing if the subfile provided is dummy.ass
			//In which case we will work with either an empty ass file or
			// the one provided by the mkv or mp4 file.
			if (subFile == 'dummy.ass')
			{			
				if (S(videoFile.toLowerCase()).contains('.mkv') || S(videoFile.toLowerCase()).contains('.mp4'))
				{			
					// Extract .ass from mkv
					/* Using matroska-subtitles parser
					// NOT WORKING RIGHT NOW.
					// Lacks an event 'on end'.
					var script = undefined;
					var tracknumber = undefined;
					var parser = new MatroskaSubtitles()

					parser.once('tracks', function (tracks) {
					
						tracks.forEach(function(track){
							if (track.type == 'ass') {
								tracknumber = track.number;
								script = track.header;
							}
						})
					})
					parser.on('subtitle', function (subtitle) {
					var text = subtitle.text;
					var begin = subtitle.time;
					var layer = subtitle.layer;
					var style = subtitle.style;
					var name = subtitle.name;
					var marginL = subtitle.marginL;
					var marginR = subtitle.marginR;
					var marginV = subtitle.marginV;
					var effect = subtitle.effect;
					var duration = subtitle.duration;
					var begintime = moment.duration(begin).format('h[:]mm[:]ss',2,{trim:false});
					var endtime = moment.duration(begin).add(duration).format('h[:]mm[:]ss',2,{trim:false});

					script += '\r\nDialogue: '+layer+','+begintime+','+endtime+','+style+','+name+','+effect+','+text;
					
					})

					var mkv = fs.createReadStream(videofile).pipe(parser);
					*/
					
					// Using ffmpeg 
				
					var proc = exec.spawnSync(ffmpegPath, ['-y', '-i', path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile), outputFolder+'/kara_extract.'+uuid+'.ass'], { encoding : 'utf8' }),
								ffmpegData = [],
								errData = [],
								exitCode = null,
								start = Date.now();

					pathToSubFiles = outputFolder;
					subFile = 'kara_extract.'+uuid+'.ass';

					if (proc.error) {
						logger.error(proc.error);
						reject(__('EXTRACTING_ASS_FAILED'));
					}					
				} else {
					// No .mkv or .mp4 detected, so we create a .ass from vide.ass
					// Videofile is most probably a hardsubbed video.
					subFile = 'vide.ass';			
					pathToSubFiles = 'src/_player/assets/'
				}
			} else {
				// Checking if subFile exists. Abort if not.
				//console.log(pathToSubFiles);				
				if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile))) 
				{
					reject(__('ASS_UNABLE_TO_FIND',subFile));
				}	
			}							
			// Parsing the subFile provided, either vide.ass, the associated .ass file or the extracted .ass file from
			// a .mkv/.mp4
			//console.log('1 '+module.exports.SYSPATH);
			//console.log('2 '+pathToSubFiles);
			//console.log('3 '+subFile);
			var assdata = fs.readFileSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile), 'utf-8');
			var script = assParser(assdata, { comments: true });
			// Contents of script array :
			// script[0] = Header
			// script[1] = Styles
			// script[2] = Time
			// Note, if there's another section present, the array will be shifted.
			// We need to test which is which.

			var StylesSection = 1;
			var DialogueSection = 2;
			script.forEach(function(ASSSection,index){
				if (ASSSection.section == 'V4+ Styles') StylesSection = index;
				if (ASSSection.section == 'Events') DialogueSection = index;
			})

			// Calculate font size to use for Credits and Nickname
			// Based on size of first Style encountered.
						
			/* Old method using PlayResX.

			var CreditsSize = 15;
			var NickSize = 8;
			var PlayResXDetected = false;

			script[0].body.forEach(function(param){
				if (param.key = 'PlayResX') {
					if (param.value = 1920) {
						CreditsSize = 50;
						NickSize = 25;
						PlayResXDetected = true;
					}
					if (param.value = 1280) {
						CreditsSize = 40;
						NickSize = 20;
						PlayResXDetected = true;
					}
				}
			})
			*/

			var styleFontSize = undefined;

			// Using .some to stop after the first occurence of style Default is encountered.
			
			// First we search for a default style. 
			// In most cases, the style of an ASS is called Default.
			
			script[StylesSection].body.some(function(param){    
				if (param.key == 'Style' && param.value.Name == 'Default') 
				{					
					styleFontSize = param.value.Fontsize;
					return true;
				}
			});

			// If we don't find it, styleFontSize will still be undefined, so we'll
			// find the first occurence of a Style and decide the size based on it
			// It's a last resort behavior.
			if (styleFontSize == undefined) 
			{
				script[StylesSection].body.some(function(param){    
					if (param.key == 'Style') 
					{					
						styleFontSize = param.value.Fontsize;
						return true;
					}
				});	
			}
			

			// Reducing sizes of font style by 25% and 30% respectively.
			var CreditsSize = styleFontSize - Math.floor((25 / 100) * styleFontSize);
			var NickSize = styleFontSize - Math.floor((30 / 100) * styleFontSize);

			// Defining the ASS Styles we're going to push.
			var StyleCredits = { key: 'Style',
						value:
						{ Name: 'Credits',
						Fontname: 'Arial',
						Fontsize: CreditsSize,
						PrimaryColour: '&H00FFFFFF',
						SecondaryColour: '&H000000FF',
						OutlineColour: '&H00000000',
						BackColour: '&H00000000',
						Bold: '-1',
						Italic: '0',
						Underline: '0',
						StrikeOut: '0',
						ScaleX: '90',
						ScaleY: '100',
						Spacing: '0',
						Angle: '0',
						BorderStyle: '1',
						Outline: '0.7',
						Shadow: '0',
						Alignment: '1',
						MarginL: '15',
						MarginR: '10',
						MarginV: '15',
						Encoding: '1' } };
			var StyleNickname = { key: 'Style',
						value:
						{ Name: 'Pseudo',
						Fontname: 'Arial',
						Fontsize: NickSize,
						PrimaryColour: '&H00FFFFFF',
						SecondaryColour: '&H000000FF',
						OutlineColour: '&H64000000',
						BackColour: '&H64000000',
						Bold: '0',
						Italic: '0',
						Underline: '0',
						StrikeOut: '0',
						ScaleX: '100',
						ScaleY: '100',
						Spacing: '0',
						Angle: '0',
						BorderStyle: '3',
						Outline: '3',
						Shadow: '0',
						Alignment: '3',
						MarginL: '15',
						MarginR: '10',
						MarginV: '15',
						Encoding: '1' } };
			
			// Pushing the styles into the ASS script's Styles section.
			script[StylesSection].body.push(StyleCredits);
			script[StylesSection].body.push(StyleNickname);

			// Doing the same with the subs we're adding.
			// 8 seconds is enough to display the name of the video and who requested it.
			var DialogueCredits = { key: 'Dialogue',
									value: {
										Layer: '0',
										Start: '0:00:00.00',
										End: '0:00:08.00',
										Style: 'Credits',
										Name: '',
										MarginL: '0',
										MarginR: '0',
										MarginV: '0',
										Effect: '',
										Text: '{\\fad(800,250)\\i1}'+series+'{\\i0}\\N{\\u0}'+i18n.__(songType+'_SHORT')+songOrder+' - '+title+'{\\u1}'
									}};
			var DialogueNickname = { key: 'Dialogue',
									value: {
										Layer: '0',
										Start: '0:00:00.00',
										End: '0:00:08.00',
										Style: 'Pseudo',
										Name: '',
										MarginL: '0',
										MarginR: '0',
										MarginV: '0',
										Effect: '',
										Text: '{\\fad(800,250)\\i1}'+__('REQUESTED_BY')+'{\\i0}\\N{\\u0}'+requester+'{\\u1}'
									}}
			
			script[DialogueSection].body.push(DialogueCredits);
			script[DialogueSection].body.push(DialogueNickname);

			// Writing to the final ASS, which is the karaoke's ID.ass
			// If writing is successfull, we return the path to the ASS file.
			var outputFile = outputFolder+'/'+kara_id+'.'+playlist_id+'.ass';
			fs.writeFile(outputFile, assStringify(script), function(err, rep) {
								if (err) {
									reject(__('WRITING_ASS_FAILED',err.stringify()));
								} else {
									resolve(outputFile)
								}
			});
		
		});		
	
	}
