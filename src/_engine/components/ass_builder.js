const logger = require('../../_common/utils/logger.js');
var path = require('path');
var fs = require('fs');
var assParser = require('ass-parser');
var assStringify = require('ass-stringify');
var S = require('../../_common/utils/string');
var i18n = require('i18n');
const uuidv4 = require('uuid/v4');
const exec = require('child_process');
const moment = require('moment');
require('moment-duration-format');
const ffmpegPath = require('ffmpeg-downloader').path;

module.exports = {
	getLyrics:function(pathToSubFiles, pathToVideoFiles, subFile, videoFile){
		return new Promise(function(resolve,reject){
			var lyrics = [];			
			if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile))) {
				var err = 'Video not found : '+videofile
				logger.error('[ASS] getLyrics : '+err)
				reject(err);
			} else {
				//Testing if the subfile provided is dummy.ass
				//In which case we will work with either an empty ass file or
				// the one provided by the mkv or mp4 file.
				if (subFile == 'dummy.ass') {
					if (S(videoFile.toLowerCase()).contains('.mkv') || S(videoFile.toLowerCase()).contains('.mp4')) {
				
						// Using ffmpeg

						var proc = exec.spawnSync(ffmpegPath, ['-y', '-i', path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile), outputFolder+'/kara_extract.'+uuid+'.ass'], { encoding : 'utf8' }),
							ffmpegData = [],
							errData = [],
							exitCode = null,
							start = Date.now();

						pathToSubFiles = outputFolder;
						subFile = 'kara_extract.'+uuid+'.ass';

						if (proc.error) {
							err = 'Failed to extract ASS file : '+proc.error;
							logger.error('[ASS] getLyrics : '+err);
							reject(err);						
						}
					} else {
						// No .mkv or .mp4 detected, so we create a .ass from vide.ass
						// Videofile is most probably a hardsubbed video.
						subFile = 'vide.ass';
						pathToSubFiles = 'src/_player/assets/';
					}
				} else {
					// Checking if subFile exists. Abort if not.
					//console.log(pathToSubFiles);
					if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile))) {
						var err = ('Unable to find ASS file : '+subfile);
						logger.error('[ASS] getLyrics : '+err)
						reject(err);
					}
				}
				// Parsing the subFile provided, either vide.ass, the associated .ass file or the extracted .ass file from
				// a .mkv/.mp4
				var assdata = fs.readFileSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile), 'utf-8');
				var script = assParser(assdata, { comments: true });
				script.forEach(function(ASSSection,index){
					if (ASSSection.section == 'Events') {
						DialogueSection = index;
					}
				});
				script[DialogueSection].body.forEach(function(param,index){
						if (param.key == 'Dialogue') {
							lyrics.push(param.value.Text.replace(/\{(?:.|\n)*?\}/gm, ''));
						}
				});
				resolve(lyrics);
			}
		})
	},
	toggleDisplayNickname:function(karalist,displayNickname,tempFolder){
		return new Promise(function(resolve,reject){		
			// If DisplayNickname is true, then try to add the requested by bit to the ASS again if it's not there already
			// If it's false then find the Dialogue with the Pseudo style and delete it. 		
			karalist.forEach(function(kara){			
				//Open the .ass
				var assFile = tempFolder+'/'+kara.playlistcontent_id+'.ass';
				var assData = fs.readFileSync(path.resolve(module.exports.SYSPATH,assFile), 'utf-8');
				var script = assParser(assData, { comments: true });			
				script.forEach(function(ASSSection,index){
					if (ASSSection.section == 'Events') {
						DialogueSection = index;
					}
				});
				var dialogueIndex = undefined;
				script[DialogueSection].body.some(function(param,index){
					if (param.key == 'Dialogue' && param.value.Style == 'Pseudo') {
						dialogueIndex = index;
						return true;
					}
				});
				if (displayNickname) {
					// Check if the Dialogue bit of the .ass exists.
					// If it doesn't, add it.
					if (dialogueIndex === undefined) {
						var DialogueNickname = {
							key: 'Dialogue',
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
								Text: '{\\fad(800,250)\\i1}'+__('REQUESTED_BY')+'{\\i0}\\N{\\u0}'+kara.pseudo_add+'{\\u1}'
							}
						};
						script[DialogueSection].body.push(DialogueNickname);
						var outputFile = tempFolder+'/'+kara.playlistcontent_id+'.ass';
						fs.writeFileSync(outputFile, assStringify(script));					
					} 				
				} else {
					// Check if the Dialogue bit of the .ass exists.
					// If it does, delete it.
					// We leave the style as it doesn't pose a threat.
					if (dialogueIndex !== undefined) {
						script[DialogueSection].body.splice(dialogueIndex,1);
						var outputFile = tempFolder+'/'+kara.playlistcontent_id+'.ass';
						fs.writeFileSync(outputFile, assStringify(script));
					}				
				}			
			});
			resolve();		
		});
	},
	build:function(pathToSubFiles, pathToVideoFiles, subFile, videoFile, outputFolder, title, series, songType, songOrder, requester, kara_id, playlist_id){
		var uuid = uuidv4();
		logger.debug(module.exports.SYSPATH+' - '+pathToVideoFiles);
		logger.debug('[ASS] args = '+JSON.stringify(arguments));
		return new Promise(function(resolve, reject){

			//Testing if video file exists and which extension it has.

			if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile))) {
				var err = 'Video not found : '+videoFile
				logger.error('[ASS] build : '+err)
				reject(err);
			} else {
				//Testing if the subfile provided is dummy.ass
				//In which case we will work with either an empty ass file or
				// the one provided by the mkv or mp4 file.
				if (subFile == 'dummy.ass') {
					if (S(videoFile.toLowerCase()).contains('.mkv') || S(videoFile.toLowerCase()).contains('.mp4')) {
						// Using ffmpeg

						var proc = exec.spawnSync(ffmpegPath, ['-y', '-i', path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile), outputFolder+'/kara_extract.'+uuid+'.ass'], { encoding : 'utf8' }),
							ffmpegData = [],
							errData = [],
							exitCode = null,
							start = Date.now();

						pathToSubFiles = outputFolder;
						subFile = 'kara_extract.'+uuid+'.ass';

						if (proc.error) {
							err = 'Failed to extract ASS file : '+proc.error;
							logger.error('[ASS] build : '+err);
							reject(err);
						}
					} else {
						// No .mkv or .mp4 detected, so we create a .ass from vide.ass
						// Videofile is most probably a hardsubbed video.
						subFile = 'vide.ass';
						pathToSubFiles = 'src/_player/assets/';
					}
				} else {
					// Checking if subFile exists. Abort if not.
					//console.log(pathToSubFiles);
					if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile))) {
						var err = 'ASS file not found : '+subFile
						logger.error('[ASS] build : '+err)
						reject(err);
					}
				}
				// Parsing the subFile provided, either vide.ass, the associated .ass file or the extracted .ass file from
				// a .mkv/.mp4
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
					if (ASSSection.section == 'V4+ Styles') {
						StylesSection = index;
					}
					if (ASSSection.section == 'Events') {
						DialogueSection = index;
					}
				});

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
					if (param.key == 'Style' && param.value.Name == 'Default') {
						styleFontSize = param.value.Fontsize;
						return true;
					}
				});

				// If we don't find it, styleFontSize will still be undefined, so we'll
				// find the first occurence of a Style and decide the size based on it
				// It's a last resort behavior.
				if (styleFontSize == undefined) {
					script[StylesSection].body.some(function(param){
						if (param.key == 'Style') {
							styleFontSize = param.value.Fontsize;
							return true;
						}
					});
				}


				// Reducing sizes of font style by 25% and 30% respectively.
				var CreditsSize = styleFontSize - Math.floor((25 / 100) * styleFontSize);
				var NickSize = styleFontSize - Math.floor((30 / 100) * styleFontSize);

				// Defining the ASS Styles we're going to push.
				var StyleCredits = {
					key: 'Style',
					value:
					{
						Name: 'Credits',
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
						Encoding: '1'
					}
				};
				var StyleNickname = {
					key: 'Style',
					value:
					{
						Name: 'Pseudo',
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
						Encoding: '1'
					}
				};

				// Pushing the styles into the ASS script's Styles section.
				script[StylesSection].body.push(StyleCredits);
				script[StylesSection].body.push(StyleNickname);

				// If title is empty, do not display - after songtype and order
				if (!S(title).isEmpty()) {
					title = ' - '+title;
				}
				// Doing the same with the subs we're adding.
				// 8 seconds is enough to display the name of the video and who requested it.
				var DialogueCredits = {
					key: 'Dialogue',
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
						Text: '{\\fad(800,250)\\i1}'+series+'{\\i0}\\N{\\u0}'+i18n.__(songType+'_SHORT')+songOrder+title+'{\\u1}'
					}};
				var DialogueNickname = {
					key: 'Dialogue',
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
					}
				};

				script[DialogueSection].body.push(DialogueCredits);
				script[DialogueSection].body.push(DialogueNickname);

				// Writing to the final ASS, which is the karaoke's ID.ass
				// If writing is successfull, we return the path to the ASS file.
				var outputFile = outputFolder+'/'+kara_id+'.'+playlist_id+'.ass';
				fs.writeFile(outputFile, assStringify(script), function(err, rep) {
					if (err) {
						var err = 'Failed to write ASS file : '+err;
						logger.error('[ASS] build : '+err);
						reject(err);
					} else {
						resolve(outputFile);
					}
				});
			}

			
		});
	}
}