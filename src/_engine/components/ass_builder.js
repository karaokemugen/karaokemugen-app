const logger = require('../../_common/utils/logger.js');
var path = require('path');
var fs = require('fs');
var assParser = require('ass-parser');
var assStringify = require('ass-stringify');
var L = require('lodash');
var i18n = require('i18n');
const uuidv4 = require('uuid/v4');
const exec = require('child_process');
const ffmpegPath = require('ffmpeg-downloader').path;

module.exports = {
	getLyrics:function(pathToSubFiles, pathToVideoFiles, subFile, videoFile, outputFolder){
		return new Promise(function(resolve,reject){	
			var uuid = uuidv4();		
			var lyrics = [];			
			if(!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToVideoFiles,videoFile))) {
				var err = 'Video not found : '+videoFile;
				logger.error('[ASS] getLyrics : '+err);
				reject(err);
			} else {
				//Testing if the subfile provided is dummy.ass
				//In which case we will work with either an empty ass file or
				// the one provided by the mkv or mp4 file.
				if (subFile == 'dummy.ass') {
					if (videoFile.toLowerCase().includes('.mkv') || videoFile.toLowerCase().includes('.mp4')) {
				
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
							logger.debug('[ASS] ffmpegData : '+ffmpegData);
							logger.debug('[ASS] errData : '+errData);
							logger.debug('[ASS] exitCode : '+exitCode);
							logger.debug('[ASS] start : '+start);
							reject(err);						
						}
						if (!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile))){
							subFile = 'vide.ass';
							pathToSubFiles = 'src/_player/assets/';
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
						err = ('Unable to find ASS file : '+subFile);
						logger.error('[ASS] getLyrics : '+err);
						reject(err);
					}
				}
				// Parsing the subFile provided, either vide.ass, the associated .ass file or the extracted .ass file from
				// a .mkv/.mp4
				var assdata = fs.readFileSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,subFile), 'utf-8');
				var script = assParser(assdata, { comments: true });
				var DialogueSection;
				script.forEach(function(ASSSection,index){
					if (ASSSection.section == 'Events') {
						DialogueSection = index;
					}
				});
				script[DialogueSection].body.forEach(function(param){
					if (param.key == 'Dialogue') {
						lyrics.push(param.value.Text.replace(/\{(?:.|\n)*?\}/gm, ''));
					}
				});
				resolve(lyrics);
			}
		});
	},
	build:function(ass, title, series, songType, songOrder, requester){
		logger.debug('[ASS] args = '+JSON.stringify(arguments));
		return new Promise(function(resolve){
					
			var script = assParser(ass, { comments: true });
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

			// If requester isn't set, don't add the nickname section in the
			// bottom right corner.
			// Requester isn't set if EngineDisplayNickname is false.
			if (requester) {
				script[StylesSection].body.push(StyleNickname);
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
				script[DialogueSection].body.push(DialogueNickname);
			}

			script[StylesSection].body.push(StyleCredits);
			
			// If title is empty, do not display - after songtype and order
			if (!L.isEmpty(title)) {
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
			
			script[DialogueSection].body.push(DialogueCredits);

			// Writing the final ASS.			
			resolve(assStringify(script));
		});
	}
};