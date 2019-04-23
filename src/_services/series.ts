import {removeSeriesFile, writeSeriesFile} from '../_dao/seriesfile';
import {refreshSeries, insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries, refreshKaraSeries} from '../_dao/series';
import {profile} from '../_utils/logger';
import {removeSerieInKaras, replaceSerieInKaras} from '../_dao/karafile';
import uuidV4 from 'uuid/v4';
import { sanitizeFile } from '../_utils/files';
import { refreshKaras } from '../_dao/kara';
import {compareKarasChecksum} from '../_dao/database';
import {Series} from '../_types/series';
import { KaraParams } from '../_types/kara';

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
	const sid = await addSerie(serieObj);
	return sid;
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
	compareKarasChecksum(true);
	await refreshKaraSeries();
	refreshKaras();
}

export async function addSerie(serieObj: Series) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const serie = await selectSerieByName(serieObj.name);
	if (serie) throw 'Series original name already exists';
	serieObj.sid = uuidV4();
	serieObj.seriefile = `${sanitizeFile(serieObj.name)}.series.json`;
	await Promise.all([
		insertSerie(serieObj),
		insertSeriei18n(serieObj),
		writeSeriesFile(serieObj)
	]);
	compareKarasChecksum(true);
	await refreshSeries();
	// Workaround for TS type bug.
	let nextRefresh: any = () => refreshKaras();
	refreshKaraSeries().then(nextRefresh());

	return serieObj.sid;
}

export async function editSerie(sid: string, serieObj: Series) {
	if (serieObj.name.includes(',')) throw 'Commas not allowed in series name';
	const oldSerie = await getSerie(sid);
	if (!oldSerie) throw 'Series ID unknown';
	if (oldSerie.name !== serieObj.name) {
		await replaceSerieInKaras(oldSerie.name, serieObj.name);
		await removeSeriesFile(oldSerie.name);
	}
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	await Promise.all([
		updateSerie(serieObj),
		writeSeriesFile(serieObj)
	]);
	compareKarasChecksum(true);
	await refreshSeries();
	// Workaround for TS type bug.
	let nextRefresh: any = () => refreshKaras();
	refreshKaraSeries().then(nextRefresh());
}
