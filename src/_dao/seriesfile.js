import {asyncUnlink, sanitizeFile, asyncWriteFile, asyncReadFile, resolveFileInDirs, } from '../_common/utils/files';
import testJSON from 'is-valid-json';
import {resolvedPathSeries, getConfig} from '../_common/utils/config';
import {basename, resolve} from 'path';
import { check, initValidators } from '../_common/utils/validators';

const header = {
	version: 2,
	description: 'Karaoke Mugen Series File'
};

const seriesConstraintsV2 = {
	name: {presence: {allowEmpty: false}},
	aliases: {seriesAliasesValidator: true},
	i18n: {seriesi18nValidator: true}
};

export async function readSeriesFile(seriesFile) {
	let file;
	try {
		file = resolveFileInDirs(seriesFile, resolvedPathSeries());
	} catch(err) {
		throw `No series file found ${seriesFile}`;
	}
	return await getDataFromSeriesFile(file);
}

export async function getDataFromSeriesFile(file) {
	const seriesFileData = await asyncReadFile(file, 'utf-8');
	if (!testJSON(seriesFileData)) throw `Syntax error in file ${file}`;
	const seriesData = JSON.parse(seriesFileData);
	if (header > +seriesData.header) throw `Series file is too old (version found: ${seriesData.header.version}, expected version: ${header.version})`;
	const validationErrors = seriesDataValidationErrors(seriesData.series);
	if (validationErrors) {
		throw `Series data is not valid: ${JSON.stringify(validationErrors)}`;
	}
	seriesData.series.seriefile = basename(file);
	return seriesData.series;
}

export function seriesDataValidationErrors(seriesData) {
	initValidators();
	return check(seriesData, seriesConstraintsV2);
}

export function findSeries(serie, seriesData) {
	return seriesData.find(s => {
		return s.name === serie;
	});
}

export async function writeSeriesFile(series) {
	const conf = getConfig();
	const seriesFile = resolve(conf.appPath, conf.PathSeries.split('|')[0], `${sanitizeFile(series.name)}.series.json`);
	const seriesData = {
		header: header,
		series: series
	};
	//Remove useless data
	if (series.aliases && series.aliases.length === 0) delete seriesData.series.aliases;
	delete seriesData.series.NORM_i18n_name;
	delete seriesData.series.serie_id;
	delete seriesData.series.i18n_name;
	delete seriesData.series.seriefile;
	return await asyncWriteFile(seriesFile, JSON.stringify(seriesData, null, 2), {encoding: 'utf8'});
}

export async function removeSeriesFile(name) {
	try {
		const filename = await resolveFileInDirs(`${sanitizeFile(name)}.series.json`, resolvedPathSeries());
		await asyncUnlink(filename);
	} catch(err) {
		throw `Could not remove series file ${name} : ${err}`;
	}
}