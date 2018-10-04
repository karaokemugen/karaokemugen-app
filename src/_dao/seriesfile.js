import {asyncWriteFile, asyncReadFile, resolveFileInDirs, } from '../_common/utils/files';
import testJSON from 'is-valid-json';
import {resolvedPathSeries, getConfig} from '../_common/utils/config';
import {resolve} from 'path';
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
	const seriesFile = resolve(conf.appPath, conf.PathAltname);
	const seriesData = {
		header: header,
		series: series
	};
	//Remove useless data
	seriesData.series.forEach((s, i) => {
		if (s.aliases.length === 0) delete seriesData.series[i].aliases;
		delete seriesData.series[i].NORM_i18n_name;
	});
	// Sort data by series.name before writing it
	seriesData.series.sort((a,b) => {
		return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);
	});
	return await asyncWriteFile(seriesFile, JSON.stringify(seriesData, null, 2), {encoding: 'utf8'});
}