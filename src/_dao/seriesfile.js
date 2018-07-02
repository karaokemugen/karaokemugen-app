import {asyncWriteFile, asyncExists, asyncReadFile} from '../_common/utils/files';
import testJSON from 'is-valid-json';
import logger from 'winston';
import sortBy from 'lodash.sortby';
import {getConfig} from '../_common/utils/config';
import {resolve} from 'path';

export async function readSeriesFile() {
	const conf = getConfig();
	const seriesFile = resolve(conf.appPath, conf.PathAltname);
	if (!await asyncExists(seriesFile)) {
		logger.error('[Series] No alternative series names file found!');		
		throw 'No series file found';
	}
	let seriesData = await asyncReadFile(seriesFile, 'utf-8');
	if (!testJSON(seriesData)) {
		logger.error('[Series] Alternative series names file contains errors!');	
		throw 'Syntax error in series.json';		
	}
	return JSON.parse(seriesData);
}

export function findSeries(serie, seriesFile) {
	return seriesFile.series.find(s => {
		return s.name === serie;
	});
}

export async function writeSeriesFile(seriesData) {
	const conf = getConfig();
	const seriesFile = resolve(conf.appPath, conf.PathAltname);	
	 return await asyncWriteFile(seriesFile, JSON.stringify(seriesData, null, 2), {encoding: 'utf8'});
}

export function deleteSeriesData(name, seriesData) {
	seriesData.series = seriesData.series.filter(serie => serie.name !== name);
	return seriesData;
}

export function addSeriesData(serie, seriesData) {
	seriesData.series.push(serie);
	const series = seriesData.series;
	seriesData.series = sortBy(series, ['name']);
	return seriesData;
}