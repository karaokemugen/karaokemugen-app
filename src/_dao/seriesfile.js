import {asyncExists, asyncReadFile} from '../_common/utils/files';
import testJSON from 'is-valid-json';
import logger from 'winston';

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
		throw 'No file found';
	}
}

export function isSeriesKnown(serie, altSeriesFile) {
	return altSeriesFile.series.find(s => {
		return s.name === serie;
	});
}