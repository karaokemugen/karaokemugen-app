import {removeSeriesFile, writeSeriesFile, formatSeriesFile} from '../dao/seriesfile';
import {refreshSeries, insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries, refreshKaraSeries} from '../dao/series';
import {profile} from '../utils/logger';
import logger from 'winston';
import {removeSerieInKaras} from '../dao/karafile';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../utils/files';
import { refreshKaras } from '../dao/kara';
import {Series} from '../types/series';
import { KaraParams } from '../types/kara';
import { removeSeriesInStore, editSeriesInStore, addSeriesToStore, sortSeriesStore, getStoreChecksum } from '../dao/dataStore';
import { saveSetting } from '../dao/database';

export async function getSeries(params: KaraParams) {
	profile('getSeries');
	const series = await selectAllSeries(params);
	const ret = formatSeriesList(series.slice(params.from, params.from + params.size), params.from, series.length);
	profile('getSeries');
	return ret;
}

export async function getOrAddSerieID(serieObj: Series) {
	const serie = await selectSerieByName(serieObj.name);
	if (serie) return serie.sid;
	//Series does not exist, create it.
	return await addSerie(serieObj);
}


export function formatSeriesList(seriesList: any[], from: number, count: number) {
	return {
		infos: {
			count: count,
			from: from,
			to: from + seriesList.length
		},
		content: seriesList
	};
}

export async function getSerie(sid: string) {
	const serie = await selectSerie(sid);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

export async function deleteSerie(sid: string) {
	const serie = await getSerie(sid);
	if (!serie) throw 'Series ID unknown';
	await removeSerie(sid);
	await Promise.all([
		refreshSeries(),
		removeSeriesFile(serie.name),
		removeSerieInKaras(serie.name),
	]);
	// Refreshing karas is done asynchronously
	removeSeriesInStore(sid);
	saveSetting('baseChecksum', getStoreChecksum());
	refreshKaraSeries().then(() => refreshKaras());
}

export async function addSerie(serieObj: Series, opts = {refresh: true}): Promise<string> {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const serie = await selectSerieByName(serieObj.name);
	if (serie) {
		logger.warn(`Series original name already exists "${serieObj.name}"`);
		return serie.sid;
	}
	if (!serieObj.sid) serieObj.sid = uuidV4();
	if (!serieObj.seriefile) serieObj.seriefile = `${sanitizeFile(serieObj.name)}.series.json`;
	const seriefile = serieObj.seriefile;

	await insertSerie(serieObj);
	await Promise.all([
		insertSeriei18n(serieObj),
		writeSeriesFile(serieObj)
	]);

	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	addSeriesToStore(seriesData);
	sortSeriesStore();
	saveSetting('baseChecksum', getStoreChecksum());

	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
	return serieObj.sid;
}

export async function editSerie(sid: string, serieObj: Series, opts = { refresh: true }) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const oldSerie = await getSerie(sid);
	if (!oldSerie) throw 'Series ID unknown';
	if (oldSerie.name !== serieObj.name) await removeSeriesFile(oldSerie.name);
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	const seriefile = serieObj.seriefile;
	await Promise.all([
		updateSerie(serieObj),
		writeSeriesFile(serieObj)
	]);
	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	editSeriesInStore(sid, seriesData);
	saveSetting('baseChecksum', getStoreChecksum());
	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
}

export async function refreshSeriesAfterDBChange() {
	await refreshSeries();
	refreshKaraSeries().then(() => refreshKaras());
}
