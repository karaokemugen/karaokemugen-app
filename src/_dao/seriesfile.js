import {asyncWriteFile, asyncExists, asyncReadFile} from '../_common/utils/files';
import testJSON from 'is-valid-json';
import logger from 'winston';
import sortBy from 'lodash.sortby';

export async function readSeriesFile(altSeriesFile) {
	if (await asyncExists(altSeriesFile)) {
		let altNamesFile = await asyncReadFile(altSeriesFile, 'utf-8');
		if (testJSON(altNamesFile)) {
			return JSON.parse(altNamesFile);
		} else {
			logger.error('[Series] Alternative series names file contains errors!');	throw 'Syntax error in series.json';
		}
	} else {
		logger.error('[Series] No alternative series names file found!');		
		throw 'No series file found';
	}
}

export function isSeriesKnown(serie, altSeriesFile) {
	return altSeriesFile.series.find(s => {
		return s.name === serie;
	});
}

export async function writeSeriesFile(seriesData, seriesFile) {
	 return await asyncWriteFile(seriesFile, JSON.stringify(seriesData, null, 2), {encoding: 'utf8'});
}

export function addSeries(serie, seriesData) {
	seriesData.series.push(serie);
	const series = seriesData.series;
	seriesData.series = sortBy(series, ['name']);
	return seriesData;
}