
import logger from 'winston';
import {resolve} from 'path';
import {asyncCopy, asyncExists, asyncMkdirp, asyncReadDir, asyncRemove} from '../_common/utils/files';

process.on('uncaughtException', function (exception) {
	console.log(exception); // to see your exception details in the console
	// if you are on production, maybe you can send the exception details to your
	// email as well ?
});
process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// application specific logging, throwing an error, or other logic here
});


/*
Usage

var generator = require('generate_karasdb.js');
generator.SYSPATH = './'; // set the base path of toyunda app here
generator.run().then(function(response){
	// do whatever you want on script end
});
*/

var path = require('path');
var sqlite = require('sqlite');
var fs = require('fs-extra');
var ini = require('ini');
var timestamp = require('unix-timestamp');
var probe = require('../_common/modules/node-ffprobe');
var L = require('lodash');
var async = require('async');
const uuidV4 = require('uuid/v4');
var csv = require('csv-string');			
const exec = require('child_process');
const langsModule = require('langs');
const crypto = require('crypto');

function checksum (str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}


async function emptyDatabase(db) {
	await db.run('DELETE FROM kara_tag;');
	await db.run('DELETE FROM kara_serie;');
	await db.run('DELETE FROM ass;');
	await db.run('DELETE FROM tag;');
	await db.run('DELETE FROM serie;');
	await db.run('DELETE FROM kara;');
	await db.run('DELETE FROM settings;');
	await db.run('DELETE FROM sqlite_sequence;');
	await db.run('VACUUM;');
}

async function backupDir(directory) {
	const backupDir = directory + '_backup';
	if (await asyncExists(backupDir)) {
		logger.debug('[Gen] Removing backup dir ' + backupDir);
		await asyncRemove(backupDir);
	}
	logger.debug('[Gen] Creating backup dir ' + backupDir);
	await asyncMkdirp(backupDir);
	await asyncCopy(
		directory,
		backupDir,
		{
			overwrite: true,
			preserveTimestamps: true
		}
	);
}

async function backupKaraDirs(config) {
	const backupPromises = [];
	for (const pathKara of config.PathKaras.split('|')) {
		const resolvedPath = resolve(config.appPath, pathKara);
		backupPromises.push(backupDir(resolvedPath));
	}
	await Promise.all(backupPromises);
}

async function extractKaraFiles(karaDir) {
	const karaFiles = [];
	const dirListing = await asyncReadDir(karaDir);
	for (const file of dirListing) {
		if (file.endsWith('.kara') && !file.startsWith('.')) {
			karaFiles.push(resolve(karaDir, file));
		}
	}
	return karaFiles;
}

async function extractAllKaraFiles(config) {
	let karaFiles = [];
	for (const pathKara of config.PathKaras.split('|')) {
		const resolvedPath = resolve(config.appPath, pathKara);
		karaFiles = karaFiles.concat(await extractKaraFiles(resolvedPath));
	}
	return karaFiles;
}

module.exports = {
	db:null,
	userdb:null,
	SYSPATH: null,
	SETTINGS: null,
	run: function() {
		/*
		 * Reconstruction temporaire de l'objet config le temps du refactoring. A terme, cet objet sera
		 * transformé en un paramètre de la méthode run(), SYSPATH et SETTINGS étant supprimés.
		 */
		const config = module.exports.SETTINGS;
		config.appPath = module.exports.SYSPATH;
		
		// These are not resolved : they will be later on when extracting / reading ASS
		const lyricsdirslist = module.exports.SETTINGS.PathSubs;	
		const tmpdir = module.exports.SETTINGS.PathTemp;
		const karas_dbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBKarasFile);
		const karas_userdbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBUserFile);
		const series_altnamesfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathAltname);
		
		const karasdirslist = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathKaras);
		const videosdirslist = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathVideos);

		module.exports.onLog('success', 'Starting database generation');
		module.exports.onLog('success', 'GENERATING DATABASE CAN TAKE A WHILE, PLEASE WAIT.');
		return new Promise(function(resolve, reject) {
			if (module.exports.SYSPATH == null) {
				module.exports.onLog('error', 'SYSPATH is not defined');
				reject();
			}
			
			// Deleting karasdb first to start over.
			
			var sqlInsertKaras = [];
			var sqlInsertSeries = [];
			var sqlInsertTags = [];
			var sqlInsertKarasTags = [];
			var sqlInsertKarasSeries = [];
			var sqlUpdateSeriesAltNames = [];
			var karas = [];
			var series = [];
			var tags = [];
			var karas_series = [];
			var karas_tags = [];
			var doUpdateSeriesAltNames = false;
			logger.profile('CreateDatabase');
			Promise.all([
				sqlite.open(karas_dbfile, { verbose: true, Promise }),
				sqlite.open(karas_userdbfile, { verbose: true, Promise })
			]).then(([db,userdb]) => {
				module.exports.onLog('success', 'Karaoke databases created');
				module.exports.db = db;
				module.exports.userdb = userdb;

				emptyDatabase(db)
					.then(() => {
						var pCreateKaraArrays = new Promise((resolve, reject) => {

							backupKaraDirs(config)
								.then(() => extractAllKaraFiles(config))
								.then((karafiles) => {
									/**
									 * First analyze .kara
									 * Then add UUID for each karaoke inside if it isn't there already
									 * Then build karas table in one transaction.
									 */
									var pAddToKaras = new Promise((resolve,reject) => {				
										logger.profile('AddKara');
										async.eachLimit(karafiles, 5, function(kara, callback){
											addKara(kara)
												.then(function(){
													module.exports.onLog('success', 'Added : '+kara);										
													callback();
												})
												.catch(function(err){
													callback(err);
												});
										},function(err){
											if (err) {
												reject(err);
											} else {
												logger.profile('AddKara');
												module.exports.onLog('success', 'Karaoke count : '+karas.length);
												resolve();
											}
										});
									});
									Promise.all([pAddToKaras])
										.then(function(){									
											/**
								 * Push to array sqlInsertKaras for sql statements from karas.
								 */
											var pPushSqlInsertKaras = new Promise((resolve) => {
												karas.forEach(function(kara, index) {
													index++;
													var titlenorm = L.deburr(kara['title']);
													sqlInsertKaras.push({
														$id_kara : index,
														$kara_KID : kara['KID'],
														$kara_title : kara['title'],
														$titlenorm : titlenorm,
														$kara_year : kara['year'],
														$kara_songorder : kara['songorder'],
														$kara_videofile : kara['videofile'],			
														$kara_dateadded : kara['dateadded'],
														$kara_datemodif : kara['datemodif'],
														$kara_rating : kara['rating'],
														$kara_viewcount : kara['viewcount'],
														$kara_gain : kara['gain'],
														$kara_videolength : kara['videolength'],
														$kara_checksum : kara.checksum	
													});
												});										
												resolve();
											});
											/**
								 * Create arrays for series
								 */
											var pCreateSeries = new Promise((resolve,reject) => {
												/**
									 * Extracting series.
									 */
												var pAddToSeries = new Promise((resolve,reject) => {
													async.eachOf(karas, function(kara, index, callback){
														index++;											
														addSeries(kara, index)
															.then(function(serie){
																//module.exports.onLog('success', 'Added series : '+serie);
																callback();
															})
															.catch(function(err){
																callback(err);
															});
													},function(err){
														if (err) {
															reject(err);
														}
														module.exports.onLog('success', 'Series count : '+series.length+' ('+karas_series.length+' links)');
														resolve();
													});
												});
												Promise.all([pAddToSeries])
													.then(function(){
														/**
											 * Push to array sqlInsertSeries for sql statements from series.
											 */
														var pPushSqlInsertSeries = new Promise((resolve) => {
															series.forEach(function(serie, index) {
																index++;
																var serienorm = L.deburr(serie);
																sqlInsertSeries.push({
																	$id_serie : index,
																	$serie : serie,
																	$serienorm : serienorm,
																});
															});
															resolve();
														});
														/**
											 * Push to array sqlInsertKarasSeries for sql statements from karas_series.
											 */
														var pPushSqlInsertKarasSeries= new Promise((resolve) => {
															karas_series.forEach(function(karaserie) {
																karaserie = karaserie.split(',');
																var id_serie = karaserie[0];
																var id_kara = karaserie[1];
																sqlInsertKarasSeries.push({
																	$id_serie : id_serie,
																	$id_kara : id_kara,
																});
															});
															resolve();
														});

														/**
											 * Working on altnerative names of series.
											 */
														var pCreateSeriesAltNames= new Promise((resolve) => {
															if (fs.existsSync(series_altnamesfile)) {
																doUpdateSeriesAltNames = true;
																var series_altnamesfilecontent = fs.readFileSync(series_altnamesfile);
																// !!! non native forEach (here "csv" is a csv-string handler)
																csv.forEach(series_altnamesfilecontent.toString(), ':', function(serie) {
																	var serie_name = serie[0];
																	var serie_altnames = serie[1];
																	if (!L.isEmpty(serie_altnames) || !L.isEmpty(serie_name)) {
																		var serie_altnamesnorm = L.deburr(serie[1]);
																		sqlUpdateSeriesAltNames.push({
																			$serie_altnames : serie_altnames,
																			$serie_altnamesnorm : serie_altnamesnorm,
																			$serie_name : serie_name,
																		});
																		if (serie_altnames) {
																			module.exports.onLog('success', 'Added alt. names "'+serie_altnames+'" to '+serie);
																		}
																	}
																});
																module.exports.onLog('success', 'Alternative series name file found');
															} else {
																doUpdateSeriesAltNames = false;
																module.exports.onLog('warning', 'No alternative series name file found, ignoring');
															}
															resolve();
														});


														Promise.all([pPushSqlInsertSeries, pPushSqlInsertKarasSeries, pCreateSeriesAltNames])
															.then(function(){
																resolve();
															})
															.catch(function(err){
																reject(err);
															});
													})
													.catch(function(err){
														reject(err);
													});
											});								
											/**
									 * Create arrays for series
									 */
											var pCreateTags = new Promise((resolve,reject) => {
												/**
									 * Extracting tags.
									 */
												var pAddToTags = new Promise((resolve,reject) => {
													async.eachOf(karas, function(kara, index, callback){
														index++;
														addTags(kara, index)
															.then(function(taglist){
																//module.exports.onLog('success', 'Added tags "'+taglist+'" to '+kara);
																callback();
															})
															.catch(function(err){

																callback(err);
															});
													},function(err){
														if (err) {
															reject(err);
														}
														module.exports.onLog('success', 'Tags count : '+tags.length+' ('+karas_tags.length+' links)');
														resolve();
													});
												});

												Promise.all([pAddToTags])
													.then(function(){
														/**
											 * Push to array sqlInsertTags for sql statements from tags.
											 */
														var pPushSqlInsertTags = new Promise((resolve) => {
															tags.forEach(function(tag, index) {
																index++;
																tag = tag.split(',');
																var tagname = tag[0];
																var tagnamenorm = L.deburr(tagname);
																var tagtype = tag[1];
																sqlInsertTags.push({
																	$id_tag : index,
																	$tagtype : tagtype,
																	$tagname : tagname,
																	$tagnamenorm : tagnamenorm,
																});
															});
															resolve();
														});

														/**
											 * Push to array sqlInsertKarasTags for sql statements from karas_tags.
											 */
														var pPushSqlInsertKarasTags = new Promise((resolve) => {
															karas_tags.forEach(function(karatag) {
																karatag = karatag.split(',');
																var id_tag = karatag[0];
																var id_kara = karatag[1];
																sqlInsertKarasTags.push({
																	$id_tag : id_tag,
																	$id_kara : id_kara,
																});
															});
															resolve();
														});

														Promise.all([pPushSqlInsertTags, pPushSqlInsertKarasTags])
															.then(function(){
																resolve();
															})
															.catch(function(err){
																reject(err);
															});
													})
													.catch(function(err){
														reject(err);
													});
											});

											Promise.all([pPushSqlInsertKaras, pCreateSeries, pCreateTags])
												.then(function(){
													resolve();
												})
												.catch(function(err){
													reject(err);
												});
										})
										.catch(function(err){
											reject(err);
										});
								})
								.catch(function(err){
									reject(err);
								});
						});

						Promise.all([pCreateKaraArrays])
							.then(function(){
								insertIntoDatabaseWowWow()
									.then(function(){
										module.exports.checkUserdbIntegrity()
											.then(function(){
												closeDatabaseConnection()
													.then(function(){
														//Generation is finished, cleaning up backup karas dir
														var karasdirs = karasdirslist.split('|');
														karasdirs.forEach((karasdir) => {
															if (fs.existsSync(karasdir+'_backup')) {
																fs.removeSync(karasdir+'_backup');
															}	
														});
														resolve();
													})
													.catch(function(err){
														reject(err);
													});
											})
											.catch(function(err){
												module.exports.onLog('error', err);
												closeDatabaseConnection()
													.then(function(){
														reject(err);
													})
													.catch(function(err){
														reject(err);
													});
											});
									})
									.catch(function(err){
										module.exports.onLog('error', err);
										closeDatabaseConnection()
											.then(function(){
												reject(err);
											})
											.catch(function(err){
												reject(err);
											});
									});
							})
							.catch(function(err){
								module.exports.onLog('error', err);
								closeDatabaseConnection()
									.then(function(){
										reject(err);
									})
									.catch(function(err){
										reject(err);
									});
							});
					})
					.catch((err) => {
						module.exports.onLog('error', 'Failed deleting database content');
						reject(err);
					});
			}).catch((err) => {
				module.exports.onLog('error', 'Failed opening karaoke database');
				reject(err);
			});

			

			
			/**
			 * Insert into database
			 */
			function insertIntoDatabaseWowWow() {
				return new Promise((resolve,reject) => {
					/*
						* Now working with a transaction to bulk-add data.
						*/
					sqlite.open(karas_dbfile, {verbose: true})
						.then((db) => {
							module.exports.db = db;
							module.exports.db.run('begin transaction')
								.then(() => {
								/*
								* Building SQL queries for insertion
								*/
								
									var pInsertKaras = new Promise((resolve,reject) => {
										module.exports.db.prepare('INSERT INTO kara(pk_id_kara, kid, title, NORM_title, year, songorder, videofile, created_at, modified_at, rating, viewcount, gain, videolength,checksum) VALUES(  $id_kara, $kara_KID, $kara_title, $titlenorm, $kara_year, $kara_songorder, $kara_videofile, $kara_dateadded, $kara_datemodif, $kara_rating, $kara_viewcount, $kara_gain, $kara_videolength, $kara_checksum);')
											.then((stmt) => {
												async.each(sqlInsertKaras,function(data,callback){
													stmt.run(data)
														.then(() => {
															callback();
														})
														.catch((err) => {
															callback(err);
														});										
												},function(err){
													if (err) {
														reject(err);
													} else {
														module.exports.onLog('success', 'Karaokes table filled');
														stmt.finalize();
														resolve();
													}
												});									
											})
											.catch((err) => {
												reject(err);
											});
									});
			

									var pInsertASS = new Promise((resolve,reject) => {
										logger.profile('ASSFill');
										module.exports.db.prepare('INSERT INTO ass (fk_id_kara,ass,checksum) VALUES ($id_kara, $ass, $checksum);')
											.then((stmt) => {
												async.eachOf(karas,function(kara,index,callback){
													index++;
													// If we have an empty ass data set, we're not adding it to the statement.
													if (kara.ass !== '') {
														var data = {
															$id_kara: index,
															$ass: kara.ass,
															$checksum: kara.ass_checksum
														};
														stmt.run(data)
															.then(() => {
																callback();
															})
															.catch((err) => {
																callback(err);
															});								
													} else {
														callback();
													}						
												},function(err){
													if (err) {
														reject(err);
													} else {
														logger.profile('ASSFill');
														module.exports.onLog('success', 'ASS table filled');
														stmt.finalize();
														resolve();
													}
												});
											})
											.catch((err) => {
												reject(err);
											});
									});

									var pInsertSeries = new Promise((resolve,reject) => {
										module.exports.db.prepare('INSERT INTO serie(pk_id_serie,name,NORM_name) VALUES( $id_serie, $serie, $serienorm );')
											.then((stmt) => {
												async.each(sqlInsertSeries,function(data,callback){
													stmt.run(data)
														.then(() => {
															callback();
														})
														.catch((err) => {
															callback(err);
														});										
												},function(err){
													if (err) {
														reject(err);
													} else {
														module.exports.onLog('success', 'Series table filled');
														stmt.finalize();
														resolve();
													}
												});
											})
											.catch((err) => {
												reject(err);
											});
									});
									var pInsertTags = new Promise((resolve,reject) => {
										module.exports.db.prepare('INSERT INTO tag(pk_id_tag,tagtype,name,NORM_name) VALUES( $id_tag, $tagtype, $tagname, $tagnamenorm );')
											.then((stmt) => {
												async.each(sqlInsertTags,function(data,callback){
													stmt.run(data)
														.then(() => {
															callback();
														})
														.catch((err) => {
															callback(err);
														});										
												},function(err){
													if (err) {
														reject(err);
													} else {
														module.exports.onLog('success', 'Tags table filled');
														stmt.finalize();
														resolve();
													}
												});
											})
											.catch((err) => {
												reject(err);
											});								
									});
									var pInsertKarasTags = new Promise((resolve,reject) => {
										module.exports.db.prepare('INSERT INTO kara_tag(fk_id_tag,fk_id_kara) VALUES( $id_tag, $id_kara );')
											.then((stmt) => {
												async.each(sqlInsertKarasTags,function(data,callback){
													stmt.run(data)
														.then(() => {
															callback();
														})
														.catch((err) => {
															callback(err);
														});										
												},function(err){
													if (err) {
														reject(err);
													} else {
														module.exports.onLog('success', 'Karaokes/tags table filled');
														stmt.finalize();
														resolve();
													}
												});
											})
											.catch((err) => {
												reject(err);
											});								
									});
									var pInsertKarasSeries = new Promise((resolve,reject) => {
										module.exports.db.prepare('INSERT INTO kara_serie(fk_id_serie,fk_id_kara) VALUES( $id_serie, $id_kara);')
											.then((stmt) => {
												async.each(sqlInsertKarasSeries,function(data,callback){
													stmt.run(data)
														.then(() => {
															callback();
														})
														.catch((err) => {
															callback(err);
														});										
												},function(err){
													if (err) {
														reject(err);
													} else {
														module.exports.onLog('success', 'Karaokes/series table filled');
														stmt.finalize();
														resolve();
													}
												});
											})
											.catch((err) => {
												reject(err);
											});								
									});
													
									Promise.all([pInsertASS,pInsertKaras,pInsertKarasSeries,pInsertKarasTags,pInsertSeries,pInsertTags])
										.then(() => {
											var pUpdateSeries = new Promise((resolve,reject) => {
												if (doUpdateSeriesAltNames) {
													module.exports.db.prepare('UPDATE serie SET altname = $serie_altnames , NORM_altname = $serie_altnamesnorm WHERE name= $serie_name ;')
														.then((stmt) => {
															async.eachSeries(sqlUpdateSeriesAltNames,function(data,callback){
																stmt.run(data)
																	.then(() => {
																		callback();
																	})
																	.catch((err) => {
																		callback(err);
																	});										
															},function(err){
																if (err) {
																	reject(err);
																} else {
																	module.exports.onLog('success', 'Series table updated with alternative names');
																	stmt.finalize();
															
																	resolve();
																}
															});
														})
														.catch((err) => {
															reject(err);
														});
												} else {
													resolve();
												}
											});
											Promise.all([pUpdateSeries])
												.then(() => {
													module.exports.onLog('success', 'Database generation successful!');
													module.exports.db.run('commit').then(() => resolve());
												})
												.catch((err) => {
													module.exports.onLog('error', 'Update series alternative names failed');
													reject(err);
												});
										})
										.catch((err) => {
											module.exports.onLog('error', 'Database generation failed :( '+err);
											reject(err);
										});					

								});

						})
						.catch((err) => {
							reject(err);
						});							
								
				});
			}

			/**
			 * close database connection
			 */
			function closeDatabaseConnection() {
				return new Promise((resolve,reject) => {
					module.exports.db.close()
						.then(module.exports.userdb.close())
						.then(resolve())
						.catch((err) => {
							module.exports.onLog('error', err);
							reject(err);
						});					
				});
			}

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
			function getvideoduration(videofile) {
				return new Promise((resolve,reject) => {
					var videolength = 0;					
					probe(module.exports.SETTINGS.BinffprobePath, videofile, function(err, videodata) {
						if (err) {
							module.exports.onLog('error', 'Video '+videofile+' probe error : '+err);
							reject(err);
						} else {
							videolength = Math.floor(videodata.format.duration);
							resolve(videolength);
						}
					});
				});
			}

			function addSeries(karadata, id_kara) {
				return new Promise((resolve,reject) => {
					var karaWOExtension = karadata.karafile.substr(0, karadata.karafile.lastIndexOf('.'));
					var karaInfos = karaWOExtension.split(/\s+\-\s+/);
					var karaType = karaInfos[2];
					var serieslist = [];
					if (karaType === 'LIVE' || karaType === 'MV') {						
						if (L.isEmpty(karadata.serie)) {
							// Don't do anything. No series is added.
						} else {
							serieslist = karadata.serie.split(',');
						}
					} else {
						if (L.isEmpty(karaInfos[1])) {
							// Reject because we absolutely need a series if it's neither MV or LIVE.
							reject('Karaoke series cannot be detected!');
						} else {
							serieslist.push(karaInfos[1]);
						}									
					}
					serieslist.forEach(function(serie) {
						serie = serie.trimLeft();
						if (series.indexOf(serie) == -1) {
							series.push(serie);
						}
						// Let's get our new index.
						var seriesIDX = series.indexOf(serie);
						seriesIDX++;
						karas_series.push(seriesIDX + ',' + id_kara);
					});
					resolve(serieslist);						
				});
			}

			function addTags(karadata, id_kara) {
				return new Promise((resolve,reject) => {
					var karaWOExtension = karadata.karafile.substr(0, karadata.karafile.lastIndexOf('.'));
					var karaInfos = karaWOExtension.split(/\s+\-\s+/);
					var karaSerie = karaInfos[1];
					var karaType = karaInfos[2];
					var taglist = [];
					var singers;
					//Filling taglist, and let's go.
					if (karaSerie.includes(' OAV') || karaSerie.includes(' OVA') || karaType.includes('OAV')) {
						if (taglist.indexOf('TAG_OVA,7') == -1) {
							taglist.push('TAG_OVA,7');
						}
					}
					if (karaType == 'LIVE' || karaType == 'MV') {
						//If LIVE or MV, we add the series as artist.
						singers = karaSerie.split(',');
						singers.forEach(function(singer) {
							var tag = singer.trimLeft();
							if (taglist.indexOf(tag + ',2') == -1) {
								taglist.push(tag + ',2');
							}
						});
					}
					if (!L.isEmpty(karadata.singer)) {
						singers = karadata.singer.split(',');
						singers.forEach(function(singer) {
							var tag = singer.trimLeft();
							if (taglist.indexOf(tag + ',2') == -1) {
								taglist.push(tag + ',2');
							}
						});
					}
					if (!L.isEmpty(karadata.author)) {
						var authors = karadata.author.split(',');
						authors.forEach(function(author) {
							var tag = author.trimLeft();
							if (taglist.indexOf(tag + ',6') == -1) {
								taglist.push(tag + ',6');
							}
						});
					}					
					if (!L.isEmpty(karadata.tags)) {
						var misctags = karadata.tags.split(',');
						misctags.forEach(function(misctag) {
							var tag = misctag.trimLeft();
							if (taglist.indexOf(tag + ',7') == -1) {
								taglist.push(tag + ',7');
							}
						});
					}
					if (!L.isEmpty(karadata.creator)) {
						var creators = karadata.creator.split(',');
						creators.forEach(function(creator) {
							var tag = creator.trimLeft();
							if (taglist.indexOf(tag + ',4') == -1) {
								taglist.push(tag + ',4');
							}
						});
					}
					if (!L.isEmpty(karadata.songwriter)) {
						var songwriters = karadata.songwriter.split(',');
						songwriters.forEach(function(songwriter) {
							var tag = songwriter.trimLeft();
							if (taglist.indexOf(tag + ',8') == -1) {
								taglist.push(tag + ',8');
							}
						});
					}
					karadata.lang = L.trim(karadata.lang,'"');							
					if (!L.isEmpty(karadata.lang)) {
						var langs = karadata.lang.split(',');
						langs.forEach(function(lang) {
							var tag = lang.trimLeft();
							if (!langsModule.has('2B',tag) && tag !== 'und') {
								reject('Unknown language : '+tag);
							} else {
								if (taglist.indexOf(tag + ',5') == -1) {
									taglist.push(tag + ',5');
								}
							}									
						});
					}
					// Check du type de song
					var typeDetected = false;
					if (karaType.includes('AMV') && taglist.indexOf('TYPE_AMV,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_AMV,3');
					}
					if (karaType.includes('CM') && taglist.indexOf('TYPE_CM,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_CM,3');
					}
					if (karaType.includes('ED') && taglist.indexOf('TYPE_ED,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_ED,3');
					}
					if (karaType.includes('GAME') && taglist.indexOf('TAG_VIDEOGAME,7') == -1) {
						typeDetected = true;
						taglist.push('TAG_VIDEOGAME,7');
					}
					if (karaType.includes('GC') && taglist.indexOf('TAG_GAMECUBE,7') == -1) {
						typeDetected = true;
						taglist.push('TAG_GAMECUBE,7');
					}
					if (karaType.includes('IN') && taglist.indexOf('TYPE_INSERTSONG,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_INSERTSONG,3');
					}
					if (karaType.includes('LIVE') && taglist.indexOf('TYPE_LIVE,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_LIVE,3');
					}
					if (karaType.includes('MOVIE') && taglist.indexOf('TAG_MOVIE,7') == -1) {
						taglist.push('TAG_MOVIE,7');
					}
					if (karaType.includes('OAV') && taglist.indexOf('TAG_OVA,7') == -1) {
						taglist.push('TAG_OVA,7');
					}
					if (karaType.includes('OP') && taglist.indexOf('TYPE_OP,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_OP,3');
					}
					if (karaType.startsWith('MV') && taglist.indexOf('TYPE_MUSIC,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_MUSIC,3');
					}
					if (karaType.includes('OT') && taglist.indexOf('TYPE_OTHER,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_OTHER,3');
					}
					if (karaType.includes('PS3') && taglist.indexOf('TAG_PS3,7') == -1) {
						taglist.push('TAG_PS3,7');
					}
					if (karaType.includes('PS2') && taglist.indexOf('TAG_PS2,7') == -1) {
						taglist.push('TAG_PS2,7');
					}
					if (karaType.includes('PSV') && taglist.indexOf('TAG_PSV,7') == -1) {
						taglist.push('TAG_PSV,7');
					}
					if (karaType.includes('PSX') && taglist.indexOf('TAG_PSX,7') == -1) {
						taglist.push('TAG_PSX,7');
					}
					if (karaType.includes('PV') && taglist.indexOf('TYPE_PV,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_PV,3');
					}
					if (karaType.includes('R18') && taglist.indexOf('TAG_R18,7') == -1) {
						taglist.push('TAG_R18,7');
					}
					if (karaType.includes('REMIX') && taglist.indexOf('TAG_REMIX,7') == -1) {
						taglist.push('TAG_REMIX,7');
					}
					if (karaType.includes('SPECIAL') && taglist.indexOf('TAG_SPECIAL,7') == -1) {
						taglist.push('TAG_SPECIAL,7');
					}
					if (karaType.includes('VOCA') && taglist.indexOf('TAG_VOCALOID,7') == -1) {
						taglist.push('TAG_VOCALOID,7');
					}
					if (karaType.includes('XBOX360') && taglist.indexOf('TAG_XBOX360,7') == -1) {
						taglist.push('TAG_XBOX360,7');
					}
					if (!typeDetected) {
						reject('Karaoke type cannot be detected! Got : '+karaType);
					}
					taglist.forEach(function(tag) {
						tag = tag.trimLeft();
						if (tags.indexOf(tag) == -1) {
							tags.push(tag);
						}
						// Let's get our new index.
						var tagsIDX = tags.indexOf(tag);
						tagsIDX++;
						karas_tags.push(tagsIDX + ',' + id_kara);
					});
					resolve(taglist);					
				});
			}

			function addKara(karafile) {
				return new Promise(function(resolve, reject) {
					fs.readFile(karafile, 'utf-8', function(err,data){
						if (err) {
							reject(err);
						} else {
							var isKaraModified = false;
							var karadata = ini.parse(data);
							var kara = [];							
							if (karadata.KID) {
								kara['KID'] = karadata.KID;
							} else {
								isKaraModified = true;
								var KID = uuidV4();
								karadata.KID = KID;
								kara['KID'] = karadata.KID;
							}
							if (karadata.dateadded) {
								kara.dateadded = karadata.dateadded;
							} else {
								isKaraModified = true;
								timestamp.round = true;							
								kara.dateadded = timestamp.now();
								karadata.dateadded = kara.dateadded;
							}
							kara['datemodif'] = kara['dateadded'];
							// Take out .kara from the filename							
							var karaWOExtension = karafile.substr(0, karafile.lastIndexOf('.'));
							// Cut name into different fields.
							var karaInfos = karaWOExtension.split(/\s+\-\s+/);
							if (karaInfos[3] == undefined) {
								karaInfos[3] = '';
							}
							kara['title'] = karaInfos[3];
							kara['year'] = karadata.year;
							// Songorder : find it after the songtype
							var karaOrder;
							var karaType = karaInfos[2];
							if (L.isEmpty(karaType)) {
								reject('Karaoke type is empty! Karaoke : '+karafile);
							}
							karaOrder = karaType.match(/([a-zA-Z]{2,10})(\d*)/);
							if (karaOrder[2]) {
								karaOrder = karaOrder[2];
							} else {
								karaOrder = 0;
							}
														
							kara['songorder'] = karaOrder;							
							if (L.isEmpty(karadata.videofile)) {
								reject('Karaoke video file empty! Karaoke '+karafile+' / data : '+karadata);
							} else {
								kara['videofile'] = karadata.videofile;	
							}
							
							if (L.isEmpty(karadata.subfile)){
								reject('Karaoke sub file empty! Karaoke '+karafile+' / data : '+karadata);
							} else {
								kara['subfile'] = karadata.subfile;
							}
							

							//Calculate size,gain,and get ASS file
							//First we need to search for our video
							var videosdirs = videosdirslist.split('|');
							var lyricsdirs = lyricsdirslist.split('|');
							var videoFound = false;
							var pGetVideoDuration;
							var pGetVideoGain;
							videosdirs.forEach((videosdir) => {
								if (fs.existsSync(videosdir + '/' + kara['videofile'])) {
									videoFound = true;
									//Reading ASS file directly
									//or extract it from the video
									//Testing if the subfile provided is dummy.ass
									//In which case we will work with either an empty ass file or
									// the one provided by the mkv or mp4 file.							
									var pathToSubFiles;
									var tmpsubfile;												if (kara['subfile'] === 'dummy.ass') {
										
										if (kara.videofile.toLowerCase().includes('.mkv') || kara.videofile.toLowerCase().includes('.mp4')) {	
											var proc = exec.spawnSync(module.exports.SETTINGS.BinffmpegPath, ['-y', '-i', path.resolve(videosdir,kara.videofile), path.resolve(module.exports.SYSPATH,tmpdir,'kara_extract.'+kara.KID+'.ass')], { encoding : 'utf8' }),
												ffmpegData = [],
												errData = [],
												exitCode = null,
												start = Date.now();

											if (proc.error) {
												err = 'Failed to extract ASS file : '+proc.error;
												module.exports.onLog('error', err);
												reject(err);
											}
											// We test if the subfile exists. If it doesn't, it means ffmpeg didn't extract anything, so we replace it with nothing.
											tmpsubfile = 'kara_extract.'+kara.KID+'.ass';
											pathToSubFiles = tmpdir;
											if (!fs.existsSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,tmpsubfile))){
												tmpsubfile = '';							
											} 
										} else {
										// if no .mkv or .mp4 detected, we return no ass.
										// Videofile is most probably a hardsubbed video.
											tmpsubfile = '';
											pathToSubFiles = '';
										}
									} else {
									// Checking if subFile exists. Abort if not.			
										var lyricsFound = false;
										lyricsdirs.forEach((lyricsdir) => {
											if(fs.existsSync(path.resolve(module.exports.SYSPATH,lyricsdir,kara.subfile))) {
												tmpsubfile = kara.subfile;
												pathToSubFiles = lyricsdir;
												lyricsFound = true;
											}	
										});
										if (!lyricsFound) {
											err = 'ASS file not found : '+tmpsubfile+' (for karaoke '+kara.videofile;
											module.exports.onLog('error', err);
											reject(err);
										}
									}
									//Let's read our ASS and get it into a variable
									if (tmpsubfile !== '' && tmpsubfile !== undefined) {
										kara.ass = fs.readFileSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,tmpsubfile), 'utf-8');
										kara.ass_checksum = checksum(kara.ass);
										if (tmpsubfile === 'kara_extract.'+kara.KID+'.ass') {
											fs.unlinkSync(path.resolve(module.exports.SYSPATH,pathToSubFiles,tmpsubfile));
										}
									} else {
										// No subfile. kara.ass will be empty.
										kara.ass = '';
									}
										
																	
									var videostats = fs.statSync(videosdir + '/' + kara['videofile']);							
									if (videostats.size != karadata.videosize) {
									//Probe file for duration
									//Calculate gain
									// write duration and gain to .kara
										isKaraModified = true;
										pGetVideoGain = new Promise ((resolve,reject) => {
											getvideogain(path.resolve(module.exports.SYSPATH,videosdir,karadata.videofile))
												.then(function(gain){												
													kara['gain'] = gain;
													karadata.videogain = gain;
													resolve();
												})
												.catch(function(err){
													kara['gain'] = 0;
													reject(err);
												});
										});

										pGetVideoDuration = new Promise ((resolve,reject) => {
											getvideoduration(path.resolve(module.exports.SYSPATH,videosdir,karadata.videofile))
												.then(function(videolength){
													kara['videolength'] = videolength;
													karadata.videoduration = videolength;
													resolve();
												})
												.catch(function(err){
													kara['videolength'] = 0;
													reject(err);
												});
										});

										karadata.videosize = videostats.size;
									} else {
										kara['gain'] = karadata.videogain;
										kara['videolength'] = karadata.videoduration;
									}
								}
							});
							
							if (!videoFound) {
								module.exports.onLog('warning', 'Video file not found : '+kara['videofile']);
								kara['gain'] = 0;
								kara['size'] = 0;
								kara['videolength'] = 0;
								kara.ass = '';
							}

							kara['rating'] = 0;
							kara['viewcount'] = 0;
							kara['karafile'] = karafile;
							kara['tags'] = karadata.tags;
							kara['lang'] = karadata.lang;
							kara['singer'] = karadata.singer;
							kara['songwriter'] = karadata.songwriter;
							kara['creator'] = karadata.creator;
							kara['author'] = karadata.author;
							kara['serie'] = karadata.series;							
							kara.checksum = checksum(ini.stringify(karadata));
							Promise.all([pGetVideoDuration,pGetVideoGain])
								.then(function(){
									karas.push(kara);
									if (isKaraModified) {
										fs.writeFile(karafile, ini.stringify(karadata), function(err) {
											if (err) {
												module.exports.onLog('error', 'Error writing .kara file '+karafile+' : '+err);
												reject(err);
											} else {
												kara.checksum = checksum(ini.stringify(karadata));
												resolve();
											}											
										});
									} else {										
										resolve();
									}
									
								})
								.catch(function(err){
									reject(err);
								});
						}
					});
				});
			}
		});
	},
	/**
	* @function run_userdb_integrity_checks
	* Get all karas from all_karas view
	* Get all karas in playlist_content, blacklist, rating, viewcount, whitelist
	* Parse karas in playlist_content, search for the KIDs in all_karas
	* If id_kara is different, write a UPDATE query.
	*/
	checkUserdbIntegrity:function(uuid) {
		return new Promise(function(resolve,reject){
			if (!uuid) uuid = uuidV4();
			const karas_dbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBKarasFile);
			const karas_userdbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBUserFile);		
			module.exports.onLog('info', 'Running user database integrity checks');
			var AllKaras = [];
			var AllTags = [];
			var PlaylistKaras = [];
			var WhitelistKaras = [];
			var RatingKaras = [];
			var ViewcountKaras = [];
			var BlacklistKaras = [];
			var BLCKaras = [];
			var BLCTags = [];
					
			var sqlUpdateUserDB = 'BEGIN TRANSACTION;';
			Promise.all([
				sqlite.open(karas_dbfile, { Promise }),
				sqlite.open(karas_userdbfile, { Promise })
			]).then(([db,userdb]) => {
				module.exports.db = db;
				module.exports.userdb = userdb;

				var pGetAllTags = new Promise((resolve,reject) => {
					var sqlGetAllTags = 'SELECT pk_id_tag AS id_tag, tagtype, name FROM tag;';
					module.exports.db.all(sqlGetAllTags)
						.then((tags) => {
							AllTags = tags;
							resolve();
						})
						.catch((err) => {
							reject('Error getting all tags : '+err);
						});						
				});
				var pGetAllKaras = new Promise((resolve,reject) => {
					var sqlGetAllKaras = 'SELECT kara_id AS id_kara, kid FROM all_karas;';
					module.exports.db.all(sqlGetAllKaras)
						.then((playlist) => {
							AllKaras = playlist;
							resolve();
						})
						.catch((err) => {
							reject('Error getting all karaokes : '+err);
						});						
				});
				var pGetPlaylistKaras = new Promise((resolve,reject) => {
					var sqlGetPlaylistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM playlist_content;';
					module.exports.userdb.all(sqlGetPlaylistKaras)
						.then((playlist) => {
							if (playlist) {
								PlaylistKaras = playlist;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from playlists : '+err);
						});
				});
				var pGetWhitelistKaras = new Promise((resolve,reject) => {
					var sqlGetWhitelistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM whitelist;';
					module.exports.userdb.all(sqlGetWhitelistKaras)
						.then((playlist) => {
							if (playlist) {
								WhitelistKaras = playlist;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from whitelist : '+err);
						});
				});
				var pGetBlacklistKaras = new Promise((resolve,reject) => {
					var sqlGetBlacklistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM blacklist;';
					module.exports.userdb.all(sqlGetBlacklistKaras)
						.then((playlist) => {
							if (playlist) {
								BlacklistKaras = playlist;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from blacklist : '+err);
						});							
				});
				var pGetBLCKaras = new Promise((resolve,reject) => {
					var sqlGetBLCKaras = 'SELECT value AS id_kara, uniquevalue AS kid FROM blacklist_criteria WHERE type = 1001;';
					module.exports.userdb.all(sqlGetBLCKaras)
						.then((kids) => {
							if (kids) {
								BLCKaras = kids;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from blacklist : '+err);
						});							
				});
				var pGetBLCTags = new Promise((resolve,reject) => {
					var sqlGetBLCTags = 'SELECT type, value AS id_tag, uniquevalue AS tagname FROM blacklist_criteria WHERE type > 0 AND type < 1000;';
					module.exports.userdb.all(sqlGetBLCTags)
						.then((tags) => {
							if (tags) {
								BLCTags = tags;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from blacklist : '+err);
						});							
				});
				var pGetRatingKaras = new Promise((resolve,reject) => {
					var sqlGetRatingKaras = 'SELECT fk_id_kara AS id_kara, kid FROM rating;';
					module.exports.userdb.all(sqlGetRatingKaras)
						.then((playlist) => {
							if (playlist) {
								RatingKaras = playlist;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from ratings : '+err);
						});
				});
				var pGetViewcountKaras = new Promise((resolve,reject) => {
					var sqlGetViewcountKaras = 'SELECT fk_id_kara AS id_kara, kid FROM viewcount;';
					module.exports.userdb.all(sqlGetViewcountKaras)
						.then((playlist) => {
							if (playlist) {
								ViewcountKaras = playlist;
								resolve();
							} else {
								resolve();
							}
						})
						.catch((err) => {
							reject('Error getting all karaokes from viewcounts : '+err);
						});
				});

				Promise.all([pGetViewcountKaras,pGetRatingKaras,pGetWhitelistKaras,pGetBlacklistKaras,pGetPlaylistKaras,pGetAllKaras,pGetAllTags,pGetBLCKaras,pGetBLCTags])
					.then(function() {
						// We've got all of our lists, let's compare !
						var KaraFound = false;
						var TagFound = false;
						var UpdateNeeded = false;
						if (WhitelistKaras != []) {
							WhitelistKaras.forEach(function(WLKara){
								KaraFound = false;
								AllKaras.forEach(function(Kara){
									if (Kara.kid == WLKara.kid){
										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != WLKara.id_kara){
											sqlUpdateUserDB += 'UPDATE whitelist SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + WLKara.kid + '\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								//If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {
									sqlUpdateUserDB += 'DELETE FROM whitelist WHERE kid = \'' + WLKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+WLKara.kid+' from whitelist');
									UpdateNeeded = true;
								}
							});
						}
						logger.profile('ICCompareWL');
						logger.profile('ICCompareBLCK');
						if (BLCKaras != []) {
							BLCKaras.forEach(function(BLCKara){
								KaraFound = false;
								AllKaras.forEach(function(Kara){
									if (Kara.kid == BLCKara.kid){
										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != BLCKara.id_kara){
											sqlUpdateUserDB += 'UPDATE blacklist_criteria SET value = ' + Kara.id_kara
													+ ' WHERE uniquevalue = \'' + BLCKara.kid + '\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								//If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {
									sqlUpdateUserDB += 'DELETE FROM blacklist_criteria WHERE uniquevalue = \'' + BLCKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+BLCKara.kid+' from blacklist criteria (type 1001)');
									UpdateNeeded = true;
								}
							});
						}
						if (BLCTags != []) {
							BLCTags.forEach(function(BLCTag){
								TagFound = false;
								AllTags.forEach(function(Tag){
									if (Tag.name == BLCTag.tagname && Tag.tagtype == BLCTag.type){
										// Found a matching Tagname, checking if id_tags are the same
										if (Tag.id_tag != BLCTag.id_tag){
											sqlUpdateUserDB += 'UPDATE blacklist_criteria SET value = ' + Tag.id_tag
													+ ' WHERE uniquevalue = \'' + BLCTag.tagname + '\' AND type = ' + BLCTag.type+';';
											UpdateNeeded = true;
										}
										TagFound = true;
									}
								});
								//If No Tag with this name and type was found in the AllTags table, delete the Tag
								if (!TagFound) {
									sqlUpdateUserDB += 'DELETE FROM blacklist_criteria WHERE uniquevalue = \'' + BLCTag.tagname + '\' AND type = ' + BLCTag.type + ';';
									module.exports.onLog('warn', 'Deleted Tag '+BLCTag.tagname+' from blacklist criteria (type '+BLCTag.type+')');
									UpdateNeeded = true;
								}
							});
						}
						if (BlacklistKaras != []) {
							BlacklistKaras.forEach(function(BLKara){
								KaraFound = false;
								AllKaras.forEach(function(Kara){
									if (Kara.kid == BLKara.kid){
										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != BLKara.id_kara){
											sqlUpdateUserDB += 'UPDATE blacklist SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + BLKara.kid+'\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								// If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {
									sqlUpdateUserDB += 'DELETE FROM blacklist WHERE kid = \'' + BLKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+BLKara.kid+' from blacklist');
									UpdateNeeded = true;
								}
							});
						}
						if (RatingKaras != []) {
							RatingKaras.forEach(function(RKara){
								KaraFound = false;
								AllKaras.forEach(function(Kara){
									if (Kara.kid == RKara.kid){
										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != RKara.id_kara){
											sqlUpdateUserDB += 'UPDATE rating SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + RKara.kid+'\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								// If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {
									sqlUpdateUserDB += 'DELETE FROM rating WHERE kid = \'' + RKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+RKara.kid+' from ratings');
									UpdateNeeded = true;
								}
							});
						}
						if (ViewcountKaras != []) {
							ViewcountKaras.forEach(function(VKara){
								KaraFound = false;
								AllKaras.forEach(function(Kara){
									if (Kara.kid == VKara.kid){
										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != VKara.id_kara){
											sqlUpdateUserDB += 'UPDATE viewcount SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + VKara.kid + '\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								// If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {
									sqlUpdateUserDB += 'DELETE FROM viewcount WHERE kid = \'' + VKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+VKara.kid+' from viewcounts');
									UpdateNeeded = true;
								}
							});
						}
						if (PlaylistKaras != []) {
							PlaylistKaras.forEach(function(PLKara){
								KaraFound = false;

								AllKaras.forEach(function(Kara){
									if (Kara.kid == PLKara.kid){

										// Found a matching KID, checking if id_karas are the same
										if (Kara.id_kara != PLKara.id_kara){
											sqlUpdateUserDB += 'UPDATE playlist_content SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + PLKara.kid + '\';';
											UpdateNeeded = true;
										}
										KaraFound = true;
									}
								});
								//If No Karaoke with this KID was found in the AllKaras table, delete the KID
								if (!KaraFound) {

									sqlUpdateUserDB += 'DELETE FROM playlist_content WHERE kid = \'' + PLKara.kid + '\';';
									module.exports.onLog('warn', 'Deleted Karaoke ID '+PLKara.kid+' from playlists');
									UpdateNeeded = true;
								}
							});
						}
						var sqlUpdateDBUUID = fs.readFileSync(path.join(__dirname,'../_common/db/update_userdb_uuid.sql'),'utf-8');
						module.exports.userdb.run(sqlUpdateDBUUID,
							{
								$uuid: uuid
							})
							.catch((err) => {
								logger.error('[DBI] Unable to update user database UUID :'+err);
								reject(err);
							});						
						module.exports.db.run(sqlUpdateDBUUID,
							{
								$uuid: uuid
							})
							.catch((err) => {
								logger.error('[DBI] Unable to update database UUID :'+err);
								reject(err);
							});
						if (UpdateNeeded) {
							// Disabling constraints check for this procedure 
							// Since we'll be renumbering some karas which might have switched places, two entries might have, for a split second, the same number.
							sqlUpdateUserDB += 'COMMIT;';
							logger.debug('[Gen] Userdata Update SQL : '+sqlUpdateUserDB);
							logger.profile('ICRunUpdates');
							module.exports.userdb.run('PRAGMA foreign_keys = OFF;')
								.then(() => {
									module.exports.userdb.exec(sqlUpdateUserDB)
										.then(() => {
											module.exports.onLog('success', 'Database updated due to integrity checks');				
											logger.profile('ICRunUpdates');
											resolve();									
										})
										.catch((err) => {
											module.exports.onLog('error', 'Error updating database : '+err);								reject(err);
										});											
								})
								.catch((err) => {
									reject(err);
								});
						} else {
							module.exports.onLog('success', 'No update needed to user database');
							module.exports.onLog('success', 'Integrity checks complete!');								
							resolve();	
						}								
					})
					.catch(function(err) {
						module.exports.onLog('error', 'Error during integrity checks : '+err);
						reject(err);
					});
			})
				.catch((err) => {
					reject(err);
				});
		});
	},

	onLog: function() {}
};