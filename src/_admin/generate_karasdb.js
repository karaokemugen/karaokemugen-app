import logger from 'winston';
import {resolve, extname} from 'path';
import {deburr, isEmpty, trim} from 'lodash';
import {
	asyncCopy, asyncExists, asyncMkdirp, asyncReadDir, asyncReadFile, asyncRemove, asyncStat, asyncWriteFile,
	resolveFileInDirs
} from '../_common/utils/files';
import {karaFilenameInfos, parseKara, verifyRequiredInfos} from '../_common/utils/kara';
import {resolvedPathKaras, resolvedPathSubs, resolvedPathTemp, resolvedPathVideos} from '../_common/utils/config';
import {extractSubtitles, getVideoDuration, getVideoGain} from '../_common/utils/ffmpeg';

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
const uuidV4 = require('uuid/v4');
var csv = require('csv-string');
const langsModule = require('langs');
const crypto = require('crypto');

function checksum(str, algorithm, encoding) {
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

async function extractAllKaraFiles() {
	let karaFiles = [];
	for (const resolvedPath of resolvedPathKaras()) {
		karaFiles = karaFiles.concat(await extractKaraFiles(resolvedPath));
	}
	return karaFiles;
}

async function findSubFile(videoFile, kara) {
	const videoExt = extname(videoFile);
	if (kara.subfile === 'dummy.ass') {
		if (videoExt === '.mkv' || videoExt === '.mp4') {
			const extractFile = resolve(resolvedPathTemp(), 'kara_extract.' + kara.KID + '.ass');
			try {
				return await extractSubtitles(videoFile, extractFile);
			} catch (err) {
				// Non bloquant.
				logger.debug('Could not extract subtitles from video file ' + videoFile);
			}
		}
	} else {
		// Bloquant si le fichier n'est pas trouvé. On laisse remonter l'erreur levée par 'resolveFileInDirs'.
		return await resolveFileInDirs(kara.subfile, resolvedPathSubs());
	}
	// Cas non bloquant de fichier non trouvé.
	return '';
}

async function getKara(karafile) {

	const karaData = await parseKara(karafile);
	let isKaraModified = false;

	verifyRequiredInfos(karaData);

	if (!karaData.KID) {
		isKaraModified = true;
		karaData.KID = uuidV4();
	}
	if (!karaData.dateadded) {
		isKaraModified = true;
		timestamp.round = true;
		karaData.dateadded = timestamp.now();
	}
	karaData.datemodif = karaData.dateadded;

	// On duplique karaData car on veut ajouter à l'objet kara des informations qui ne seront pas
	// écrites dans le fichier kara.
	const kara = {...karaData};

	kara.karafile = karafile;

	const karaInfos = karaFilenameInfos(karafile);
	kara.title = karaInfos.title;
	// Attention à ne pas confondre avec le champ 'series' au pluriel, provenant du fichier kara
	// et copié de l'objet 'karaData'.
	kara.serie = karaInfos.serie;
	kara.type = karaInfos.type;
	kara.songorder = karaInfos.songorder;
	kara.langFromFileName = karaInfos.lang;

	kara.lang = trim(kara.lang, '"'); // Nettoyage du champ lang du fichier kara.

	let videoFile;

	try {
		videoFile = await resolveFileInDirs(karaData.videofile, resolvedPathVideos());
	} catch (err) {
		logger.warn('Video file not found : ' + karaData.videofile);
		kara.gain = 0;
		kara.size = 0;
		kara.videolength = 0;
		kara.ass = '';
	}

	if (videoFile) {
		const subFile = await findSubFile(videoFile, kara);
		if (subFile) {
			kara.ass = await asyncReadFile(subFile, {encoding: 'utf8'});
			kara.ass_checksum = checksum(kara.ass);
			// TODO Supprimer le fichier temporaire éventuel.
		} else {
			kara.ass = '';
		}
		const videoStats = await asyncStat(videoFile);
		if (videoStats.size !== +karaData.videosize) {
			isKaraModified = true;
			karaData.videosize = videoStats.size;

			const [videogain, videoduration] = await Promise.all([getVideoGain(videoFile), getVideoDuration(videoFile)]);

			karaData.videogain = videogain;
			kara.videogain = videogain;
			karaData.videoduration = videoduration;
			kara.videoduration = videoduration;
		}

	}

	kara.rating = 0;
	kara.viewcount = 0;
	kara.checksum = checksum(ini.stringify(karaData));

	if (isKaraModified) {
		await asyncWriteFile(karafile, ini.stringify(karaData));
	}

	return kara;
}

async function getAllKaras(karafiles) {
	const karaPromises = [];
	for (const karafile of karafiles) {
		karaPromises.push(getKara(karafile));
	}
	return await Promise.all(karaPromises);
}

function prepareKaraInsertData(kara, index) {
	return {
		$id_kara: index,
		$kara_KID: kara.KID,
		$kara_title: kara.title,
		$titlenorm: deburr(kara.title),
		$kara_year: kara.year,
		$kara_songorder: kara.songorder,
		$kara_videofile: kara.videofile,
		$kara_dateadded: kara.dateadded,
		$kara_datemodif: kara.datemodif,
		$kara_rating: kara.rating,
		$kara_viewcount: kara.viewcount,
		$kara_gain: kara.videogain,
		$kara_videolength: kara.videoduration,
		$kara_checksum: kara.checksum
	};
}

function prepareAllKarasInsertData(karas) {
	// Les index JS commencent à 0.
	return karas.map((kara, index) => prepareKaraInsertData(kara, index + 1));
}

function getSeries(kara) {
	const series = new Set();

	// Série extraite du parsing du nom
	if (kara.serie && kara.serie.trim()) {
		series.add(kara.serie.trim());
	}

	// Séries extraites du fichier kara
	if (kara.series && kara.series.trim()) {
		kara.series.split(',').forEach(serie => {
			if (serie.trim()) {
				series.add(serie.trim());
			}
		});
	}

	if (isEmpty(series) && kara.type !== 'LIVE' && kara.type !== 'MV') {
		throw 'Karaoke series cannot be detected!';
	}

	return series;
}

/**
 * Renvoie une Map<String, Array>, associant une série à l'ensemble des index des karaokés concernés.
 */
function getAllSeries(karas) {
	const map = new Map();
	karas.forEach((kara, index) => {
		const karaIndex = index + 1;
		getSeries(kara).forEach(serie => {
			if (map.has(serie)) {
				map.get(serie).push(karaIndex);
			} else {
				map.set(serie, [karaIndex]);
			}
		});
	});

	return map;
}

function prepareSerieInsertData(serie, index) {
	return {
		$id_serie: index,
		$serie: serie,
		$serienorm: deburr(serie)
	};
}

function prepareAllSeriesInsertData(mapSeries) {
	const data = [];
	let index = 1;
	for (const serie of mapSeries.keys()) {
		data.push(prepareSerieInsertData(serie, index));
		index++;
	}
	return data;
}

/**
 * Attention : on itère sur les clés et non sur les 'entries' de la map pour obtenir le même ordre et donc les
 * mêmes index que la fonction prepareAllSeriesInsertData. Cette manière de procéder historique est particulièrement
 * fragile et devrait être améliorée.
 */
function prepareAllKarasSeriesInsertData(mapSeries) {
	const data = [];
	let index = 1;
	for (const serie of mapSeries.keys()) {
		mapSeries.get(serie).forEach(karaIndex => {
			data.push({
				$id_serie: index,
				$id_kara: karaIndex
			});
		});
		index++;
	}

	return data;
}

async function prepareAltSeriesInsertData(altSeriesFile) {

	const data = [];

	if (await asyncExists(altSeriesFile)) {
		const content = await asyncReadFile(altSeriesFile, { encoding: 'utf8' });
		csv.forEach(content, ':', parsedContent => {
			const serie = parsedContent[0];
			const altNames = parsedContent[1];
			if (serie && altNames) {
				data.push({
					$serie_altnames: altNames,
					$serie_altnamesnorm: deburr(altNames),
					$serie_name: serie
				});
				logger.debug('Added alt. names "' + altNames + '" to ' + serie);
			}
		});
	} else {
		logger.warn('No alternative series name file found, ignoring');
	}

	return data;
}

function getAllKaraTags(karas) {

	const allTags = [];

	const tagsByKara = new Map();

	karas.forEach((kara, index) => {
		const karaIndex = index + 1;
		tagsByKara.set(karaIndex, getKaraTags(kara, allTags));
	});

	return {
		tagsByKara: tagsByKara,
		allTags: allTags
	};
}

function getKaraTags(kara, allTags) {

	const result = new Set();

	if (kara.serie.includes(' OAV') || kara.serie.includes(' OVA') || kara.type.includes('OAV')) {
		result.add(getTagId('TAG_OVA,7', allTags));
	}

	if (kara.type === 'LIVE' || kara.type === 'MV') {
		//If LIVE or MV, we add the series as artist.
		kara.serie.split(',').forEach(singer => result.add(getTagId(singer.trim() + ',2', allTags)));
	}

	if (kara.singer) {
		kara.singer.split(',').forEach(singer => result.add(getTagId(singer.trim() + ',2', allTags)));
	}

	if (kara.author) {
		kara.author.split(',').forEach(author => result.add(getTagId(author.trim() + ',6', allTags)));
	}

	if (kara.tags) {
		kara.tags.split(',').forEach(tag => result.add(getTagId(tag.trim() + ',7', allTags)));
	}

	if (kara.creator) {
		kara.creator.split(',').forEach(creator => result.add(getTagId(creator.trim() + ',4', allTags)));
	}

	if (kara.songwriter) {
		kara.songwriter.split(',').forEach(songwriter => result.add(getTagId(songwriter.trim() + ',8', allTags)));
	}

	if (kara.lang) {
		kara.lang.split(',').forEach(lang => {
			if (lang === 'und' || langsModule.has('2B', lang)) {
				result.add(getTagId(lang.trim() + ',5', allTags));
			}
		});
	}

	getTypes(kara, allTags).forEach(type => result.add(type));
	getSpecialTags(kara, allTags).forEach(special => result.add(special));

	return result;
}

function getSpecialTags(kara, allTags) {

	const result = new Set();

	const specialTags = new Map([
		['GAME', 'TAG_VIDEOGAME,7'], ['GC', 'TAG_GAMECUBE,7'], ['MOVIE', 'TAG_MOVIE,7'], ['OAV', 'TAG_OVA,7'],
		['PS3', 'TAG_PS3,7'], ['PS2', 'TAG_PS2,7'], ['PSV', 'TAG_PSV,7'], ['PSX', 'TAG_PSX,7'], ['R18', 'TAG_R18,7'],
		['REMIX', 'TAG_REMIX,7'], ['SPECIAL', 'TAG_SPECIAL,7'], ['VOCA', 'TAG_VOCALOID,7'], ['XBOX360', 'TAG_XBOX360,7']
	]);

	specialTags.forEach((value, key) => {
		if (kara.type.includes(key)) {
			result.add(getTagId(value, allTags));
		}
	});

	return result;
}

function getTypes(kara, allTags) {
	const result = new Set();

	const types = new Map([
		['PV', 'TYPE_PV,3'], ['AMV', 'TYPE_AMV,3'], ['CM', 'TYPE_CM,3'], ['ED', 'TYPE_ED,3'], ['OP', 'TYPE_OP,3'],
		['MV', 'TYPE_MUSIC,3'], ['OT', 'TYPE_OTHER,3'], ['IN', 'TYPE_INSERTSONG,3'], ['LIVE', 'TYPE_LIVE,3']
	]);

	types.forEach((value, key) => {
		if (kara.type.includes(key)) {
			result.add(getTagId(value, allTags));
		}
	});

	if (result.size === 0) {
		throw 'Karaoke type cannot be detected: ' + kara.type;
	}

	return result;
}

function getTagId(tagName, tags) {

	const index = tags.indexOf(tagName) + 1;

	if (index > 0) {
		return index;
	}

	tags.push(tagName);
	return tags.length;
}

function prepareAllTagsInsertData(allTags) {
	const data = [];

	allTags.forEach((tag, index) => {
		const tagParts = tag.split(',');
		const tagName = tagParts[0];
		const tagType = tagParts[1];

		data.push({
			$id_tag: index + 1,
			$tagtype: tagType,
			$tagname: tagName,
			$tagnamenorm: deburr(tagName),
		});
	});

	return data;
}

function prepareTagsKaraInsertData(tagsByKara) {
	const data = [];

	tagsByKara.forEach((tags, karaIndex) => {
		tags.forEach(tagId => {
			data.push({
				$id_tag: tagId,
				$id_kara: karaIndex
			});
		});
	});

	return data;
}

const insertKaras = `INSERT INTO kara(pk_id_kara, kid, title, NORM_title, year, songorder, videofile, created_at,
	modified_at, rating, viewcount, gain, videolength,checksum)
	VALUES($id_kara, $kara_KID, $kara_title, $titlenorm, $kara_year, $kara_songorder, $kara_videofile, $kara_dateadded,
	$kara_datemodif, $kara_rating, $kara_viewcount, $kara_gain, $kara_videolength, $kara_checksum);`;

async function insertAss(db, karas) {
	const stmt = await db.prepare('INSERT INTO ass (fk_id_kara, ass, checksum) VALUES ($id_kara, $ass, $checksum);');
	const insertPromises = [];
	karas.forEach((kara, index) => {
		const karaIndex = index + 1;
		if (kara.ass) {
			insertPromises.push(stmt.run({
				$id_kara: karaIndex,
				$ass: kara.ass,
				$checksum: kara.ass_checksum
			}));
		}
	});
	await Promise.all(insertPromises);
	await stmt.finalize();
}

const insertSeries = 'INSERT INTO serie(pk_id_serie, name, NORM_name) VALUES($id_serie, $serie, $serienorm );';

const insertTags = `INSERT INTO tag(pk_id_tag, tagtype, name, NORM_name)
	VALUES($id_tag, $tagtype, $tagname, $tagnamenorm);`;

const insertKaraTags = 'INSERT INTO kara_tag(fk_id_tag, fk_id_kara) VALUES($id_tag, $id_kara);';

const insertKaraSeries = 'INSERT INTO kara_serie(fk_id_serie, fk_id_kara) VALUES($id_serie, $id_kara);';

const updateSeriesAltNames = `UPDATE serie SET altname = $serie_altnames ,NORM_altname = $serie_altnamesnorm
	WHERE name= $serie_name ;`;

async function runSqlStatementOnData(stmtPromise, data) {
	const stmt = await stmtPromise;

	const sqlPromises = data.map(sqlData => stmt.run(sqlData));
	await Promise.all(sqlPromises);
	await stmt.finalize();
}

module.exports = {
	db: null,
	userdb: null,
	SYSPATH: null,
	SETTINGS: null,
	run: function () {
		/*
		 * Reconstruction temporaire de l'objet config le temps du refactoring. A terme, cet objet sera
		 * transformé en un paramètre de la méthode run(), SYSPATH et SETTINGS étant supprimés.
		 */
		const config = module.exports.SETTINGS;
		config.appPath = module.exports.SYSPATH;

		// These are not resolved : they will be later on when extracting / reading ASS
		const karas_dbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBKarasFile);
		const karas_userdbfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBUserFile);
		const series_altnamesfile = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathAltname);

		const karasdirslist = path.resolve(module.exports.SYSPATH, module.exports.SETTINGS.PathKaras);

		module.exports.onLog('success', 'Starting database generation');
		module.exports.onLog('success', 'GENERATING DATABASE CAN TAKE A WHILE, PLEASE WAIT.');
		return new Promise(function (resolve, reject) {
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
			logger.profile('CreateDatabase');
			Promise.all([
				sqlite.open(karas_dbfile, {verbose: true, Promise}),
				sqlite.open(karas_userdbfile, {verbose: true, Promise})
			]).then(([db, userdb]) => {
				module.exports.onLog('success', 'Karaoke databases created');
				module.exports.db = db;
				module.exports.userdb = userdb;

				emptyDatabase(db)
					.then(() => {
						const pCreateKaraArrays = new Promise((resolve, reject) => {

							backupKaraDirs(config)
								.then(() => extractAllKaraFiles())
								.then((karafiles) => getAllKaras(karafiles))

								.then((kars) => {

									karas = kars;
									sqlInsertKaras = prepareAllKarasInsertData(karas);
									const seriesMap = getAllSeries(karas);
									sqlInsertSeries = prepareAllSeriesInsertData(seriesMap);
									sqlInsertKarasSeries = prepareAllKarasSeriesInsertData(seriesMap);

									const pCreateSeries = prepareAltSeriesInsertData(series_altnamesfile)
										.then(data => sqlUpdateSeriesAltNames = data);

									const tags = getAllKaraTags(karas);
									sqlInsertTags = prepareAllTagsInsertData(tags.allTags);
									sqlInsertKarasTags = prepareTagsKaraInsertData(tags.tagsByKara);

									pCreateSeries
										.then(resolve())
										.catch(function (err) {
											reject(err);
										});
								});
						});

						pCreateKaraArrays
							.then(function () {
								insertIntoDatabaseWowWow()
									.then(function () {
										module.exports.checkUserdbIntegrity()
											.then(function () {
												closeDatabaseConnection()
													.then(function () {
														//Generation is finished, cleaning up backup karas dir
														var karasdirs = karasdirslist.split('|');
														karasdirs.forEach((karasdir) => {
															if (fs.existsSync(karasdir + '_backup')) {
																fs.removeSync(karasdir + '_backup');
															}
														});
														resolve();
													})
													.catch(function (err) {
														reject(err);
													});
											})
											.catch(function (err) {
												module.exports.onLog('error', err);
												closeDatabaseConnection()
													.then(function () {
														reject(err);
													})
													.catch(function (err) {
														reject(err);
													});
											});
									})
									.catch(function (err) {
										module.exports.onLog('error', err);
										closeDatabaseConnection()
											.then(function () {
												reject(err);
											})
											.catch(function (err) {
												reject(err);
											});
									});
							})
							.catch(function (err) {
								module.exports.onLog('error', err);
								closeDatabaseConnection()
									.then(function () {
										reject(err);
									})
									.catch(function (err) {
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
				return new Promise((resolve, reject) => {
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

									const pInsertKaras = runSqlStatementOnData(
										db.prepare(insertKaras), sqlInsertKaras);
									const pInsertASS = insertAss(db, karas);
									const pInsertSeries = runSqlStatementOnData(
										db.prepare(insertSeries), sqlInsertSeries);
									const pInsertTags = runSqlStatementOnData(db.prepare(insertTags), sqlInsertTags);
									const pInsertKarasTags = runSqlStatementOnData(
										db.prepare(insertKaraTags), sqlInsertKarasTags);
									const pInsertKarasSeries = runSqlStatementOnData(
										db.prepare(insertKaraSeries), sqlInsertKarasSeries);

									Promise.all([pInsertASS, pInsertKaras, pInsertKarasSeries, pInsertKarasTags, pInsertSeries, pInsertTags])
										.then(() => {
											runSqlStatementOnData(
												db.prepare(updateSeriesAltNames), sqlUpdateSeriesAltNames
											).then(() => {
												module.exports.onLog('success', 'Database generation successful!');
												module.exports.db.run('commit').then(() => resolve());
											}).catch((err) => {
												module.exports.onLog('error', 'Update series alternative names failed');
												reject(err);
											});
										})
										.catch((err) => {
											module.exports.onLog('error', 'Database generation failed :( ' + err);
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
				return new Promise((resolve, reject) => {
					module.exports.db.close()
						.then(module.exports.userdb.close())
						.then(resolve())
						.catch((err) => {
							module.exports.onLog('error', err);
							reject(err);
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
	checkUserdbIntegrity:

		function (uuid) {
			return new Promise(function (resolve, reject) {
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
					sqlite.open(karas_dbfile, {Promise}),
					sqlite.open(karas_userdbfile, {Promise})
				]).then(([db, userdb]) => {
					module.exports.db = db;
					module.exports.userdb = userdb;

					var pGetAllTags = new Promise((resolve, reject) => {
						var sqlGetAllTags = 'SELECT pk_id_tag AS id_tag, tagtype, name FROM tag;';
						module.exports.db.all(sqlGetAllTags)
							.then((tags) => {
								AllTags = tags;
								resolve();
							})
							.catch((err) => {
								reject('Error getting all tags : ' + err);
							});
					});
					var pGetAllKaras = new Promise((resolve, reject) => {
						var sqlGetAllKaras = 'SELECT kara_id AS id_kara, kid FROM all_karas;';
						module.exports.db.all(sqlGetAllKaras)
							.then((playlist) => {
								AllKaras = playlist;
								resolve();
							})
							.catch((err) => {
								reject('Error getting all karaokes : ' + err);
							});
					});
					var pGetPlaylistKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from playlists : ' + err);
							});
					});
					var pGetWhitelistKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from whitelist : ' + err);
							});
					});
					var pGetBlacklistKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from blacklist : ' + err);
							});
					});
					var pGetBLCKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from blacklist : ' + err);
							});
					});
					var pGetBLCTags = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from blacklist : ' + err);
							});
					});
					var pGetRatingKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from ratings : ' + err);
							});
					});
					var pGetViewcountKaras = new Promise((resolve, reject) => {
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
								reject('Error getting all karaokes from viewcounts : ' + err);
							});
					});

					Promise.all([pGetViewcountKaras, pGetRatingKaras, pGetWhitelistKaras, pGetBlacklistKaras, pGetPlaylistKaras, pGetAllKaras, pGetAllTags, pGetBLCKaras, pGetBLCTags])
						.then(function () {
							// We've got all of our lists, let's compare !
							var KaraFound = false;
							var TagFound = false;
							var UpdateNeeded = false;
							if (WhitelistKaras != []) {
								WhitelistKaras.forEach(function (WLKara) {
									KaraFound = false;
									AllKaras.forEach(function (Kara) {
										if (Kara.kid == WLKara.kid) {
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != WLKara.id_kara) {
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
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + WLKara.kid + ' from whitelist');
										UpdateNeeded = true;
									}
								});
							}
							logger.profile('ICCompareWL');
							logger.profile('ICCompareBLCK');
							if (BLCKaras != []) {
								BLCKaras.forEach(function (BLCKara) {
									KaraFound = false;
									AllKaras.forEach(function (Kara) {
										if (Kara.kid == BLCKara.kid) {
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != BLCKara.id_kara) {
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
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + BLCKara.kid + ' from blacklist criteria (type 1001)');
										UpdateNeeded = true;
									}
								});
							}
							if (BLCTags != []) {
								BLCTags.forEach(function (BLCTag) {
									TagFound = false;
									AllTags.forEach(function (Tag) {
										if (Tag.name == BLCTag.tagname && Tag.tagtype == BLCTag.type) {
											// Found a matching Tagname, checking if id_tags are the same
											if (Tag.id_tag != BLCTag.id_tag) {
												sqlUpdateUserDB += 'UPDATE blacklist_criteria SET value = ' + Tag.id_tag
													+ ' WHERE uniquevalue = \'' + BLCTag.tagname + '\' AND type = ' + BLCTag.type + ';';
												UpdateNeeded = true;
											}
											TagFound = true;
										}
									});
									//If No Tag with this name and type was found in the AllTags table, delete the Tag
									if (!TagFound) {
										sqlUpdateUserDB += 'DELETE FROM blacklist_criteria WHERE uniquevalue = \'' + BLCTag.tagname + '\' AND type = ' + BLCTag.type + ';';
										module.exports.onLog('warn', 'Deleted Tag ' + BLCTag.tagname + ' from blacklist criteria (type ' + BLCTag.type + ')');
										UpdateNeeded = true;
									}
								});
							}
							if (BlacklistKaras != []) {
								BlacklistKaras.forEach(function (BLKara) {
									KaraFound = false;
									AllKaras.forEach(function (Kara) {
										if (Kara.kid == BLKara.kid) {
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != BLKara.id_kara) {
												sqlUpdateUserDB += 'UPDATE blacklist SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + BLKara.kid + '\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									// If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM blacklist WHERE kid = \'' + BLKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + BLKara.kid + ' from blacklist');
										UpdateNeeded = true;
									}
								});
							}
							if (RatingKaras != []) {
								RatingKaras.forEach(function (RKara) {
									KaraFound = false;
									AllKaras.forEach(function (Kara) {
										if (Kara.kid == RKara.kid) {
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != RKara.id_kara) {
												sqlUpdateUserDB += 'UPDATE rating SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + RKara.kid + '\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									// If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM rating WHERE kid = \'' + RKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + RKara.kid + ' from ratings');
										UpdateNeeded = true;
									}
								});
							}
							if (ViewcountKaras != []) {
								ViewcountKaras.forEach(function (VKara) {
									KaraFound = false;
									AllKaras.forEach(function (Kara) {
										if (Kara.kid == VKara.kid) {
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != VKara.id_kara) {
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
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + VKara.kid + ' from viewcounts');
										UpdateNeeded = true;
									}
								});
							}
							if (PlaylistKaras != []) {
								PlaylistKaras.forEach(function (PLKara) {
									KaraFound = false;

									AllKaras.forEach(function (Kara) {
										if (Kara.kid == PLKara.kid) {

											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != PLKara.id_kara) {
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
										module.exports.onLog('warn', 'Deleted Karaoke ID ' + PLKara.kid + ' from playlists');
										UpdateNeeded = true;
									}
								});
							}
							var sqlUpdateDBUUID = fs.readFileSync(path.join(__dirname, '../_common/db/update_userdb_uuid.sql'), 'utf-8');
							module.exports.userdb.run(sqlUpdateDBUUID,
								{
									$uuid: uuid
								})
								.catch((err) => {
									logger.error('[DBI] Unable to update user database UUID :' + err);
									reject(err);
								});
							module.exports.db.run(sqlUpdateDBUUID,
								{
									$uuid: uuid
								})
								.catch((err) => {
									logger.error('[DBI] Unable to update database UUID :' + err);
									reject(err);
								});
							if (UpdateNeeded) {
								// Disabling constraints check for this procedure
								// Since we'll be renumbering some karas which might have switched places, two entries might have, for a split second, the same number.
								sqlUpdateUserDB += 'COMMIT;';
								logger.debug('[Gen] Userdata Update SQL : ' + sqlUpdateUserDB);
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
												module.exports.onLog('error', 'Error updating database : ' + err);
												reject(err);
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
						.catch(function (err) {
							module.exports.onLog('error', 'Error during integrity checks : ' + err);
							reject(err);
						});
				})
					.catch((err) => {
						reject(err);
					});
			});
		}

	,

	onLog: function () {
	}
};