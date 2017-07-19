var path = require('path');
var fs = require('fs');
var assParser = require('ass-parser');
var assStringify = require('ass-stringify');
var S = require('string');
var i18n = require("i18n");

const exec = require('child_process');

const MatroskaSubtitles = require('matroska-subtitles')
const moment = require('moment');
require("moment-duration-format");

i18n.configure({
    locales:['fr'],
    directory: path.resolve(__dirname,'../../_common/locales')
});
i18n.setLocale('fr');

module.exports = function(pathToSubFiles, pathToVideoFiles, subFile, videoFile, outputFolder, title, series, songType, songOrder, requester, kara_id, playlist_id, pathToFFmpeg){
	
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
			
			if(!fs.existsSync(path.resolve(__dirname,'../../../',pathToVideoFiles,videoFile))) 
			{
					reject('Video file does not exist!');
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
				
					var proc = exec.spawnSync(pathToFFmpeg, ['-y', '-i', videoFile, outputFolder+'/kara_extract.ass'], { encoding : 'utf8' }),
								ffmpegData = [],
								errData = [],
								exitCode = null,
								start = Date.now();

					subFile = outputFolder+'/kara_extract.ass';
					if (proc.error) {
						reject('Unable to extract karaoke from video file!');
					}					
				} else {
					// No .mkv or .mp4 detected, so we create a .ass from vide.ass
					// Videofile is most probably a hardsubbed video.
					subFile = 'vide.ass';			
					pathToSubFiles = 'src/_player/assets/'
				}
			} else {
				// Checking if subFile exists. Abort if not.
				console.log(pathToSubFiles);				
				if(!fs.existsSync(path.resolve(__dirname,'../../../',pathToSubFiles,subFile))) 
				{
					reject('ASS file not found : '+subFile);
				}	
			}							
			// Parsing the subFile provided, either vide.ass, the associated .ass file or the extracted .ass file from
			// a .mkv/.mp4
			var assdata = fs.readFileSync(subFile, 'utf-8');
			var script = assParser(assdata, { comments: true });
			// Contents of script array :
			// script[0] = Header
			// script[1] = Styles
			// script[2] = Time
						
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

			// Using .some to stop after the first occurence of style is encountered.
			script[1].body.some(function(param){    
				if (param.key == 'Style') 
				{					
					styleFontSize = param.value.Fontsize;
					return true;
				}
			})

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
			script[1].body.push(StyleCredits);
			script[1].body.push(StyleNickname);

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
										Text: '{\\fad(800,250)\\i1}'+i18n.__('REQUESTED_BY')+'{\\i0}\\N{\\u0}'+requester+'{\\u1}'
									}}
			
			script[2].body.push(DialogueCredits);
			script[2].body.push(DialogueNickname);

			// Writing to the final ASS, which is the karaoke's ID.ass
			// If writing is successfull, we return the path to the ASS file.
			var outputFile = outputFolder+'/'+kara_id+'.'+playlist_id+'.ass';
			fs.writeFile(outputFile, assStringify(script), function(err, rep) {
								if (err) {
									reject('Error writing output ASS file : '+err)
								} else {
									resolve(outputFile)
								}
			});
		
		});		
	
	}
