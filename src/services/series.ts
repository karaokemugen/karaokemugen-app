import {removeSeriesFile, writeSeriesFile, formatSeriesFile} from '../lib/dao/seriesfile';
import {insertSeriei18n, removeSerie, updateSerie, insertSerie, selectSerieByName, selectSerie, selectAllSeries, testSerie} from '../dao/series';
import {refreshSeries, refreshKaraSeries, refreshKaraSeriesLang, refreshSeriesi18n} from '../lib/dao/series';
import {profile} from '../lib/utils/logger';
import logger from 'winston';
import { v4 as uuidV4 } from 'uuid';
import { sanitizeFile, resolveFileInDirs } from '../lib/utils/files';
import { refreshKaras } from '../lib/dao/kara';
import {Series} from '../lib/types/series';
import { KaraParams, KaraList, IDQueryResult } from '../lib/types/kara';
import { removeSeriesInStore, editSeriesInStore, addSeriesToStore, sortSeriesStore, getStoreChecksum, sortKaraStore } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import {getDataFromSeriesFile} from '../lib/dao/seriesfile';
import { removeSerieInKaras, getAllKaras } from './kara';
import { resolvedPathRepos } from '../lib/utils/config';

/** Get all series */
export async function getSeries(params: KaraParams) {
	profile('getSeries');
	const series = await selectAllSeries(params);
	const ret = formatSeriesList(series.slice(params.from, params.from + params.size), params.from, series.length);
	profile('getSeries');
	return ret;
}

/** Get SID from database for a particular series name, or add it if it doesn't exist. */
export async function getOrAddSerieID(serieObj: Series): Promise<IDQueryResult> {
	const serie = await selectSerieByName(serieObj.name);
	if (serie) return {id: serie.sid, new: false};
	//Series does not exist, create it.
	await addSerie(serieObj, {refresh: false});
	return {id: serieObj.sid, new: true};
}


export function formatSeriesList(seriesList: any[], from: number, count: number): KaraList {
	return {
		infos: {
			count: count,
			from: from,
			to: from + seriesList.length
		},
		content: seriesList
	};
}

/** Get a single series */
export async function getSerie(sid: string): Promise<Series> {
	const serie = await selectSerie(sid);
	if (!serie) throw 'Series ID unknown';
	return serie;
}

/** Remove series from database and files */
export async function deleteSerie(sid: string) {
	const serie = await testSerie(sid);
	if (!serie) throw 'Series ID unknown';
	await removeSerie(sid);
	await Promise.all([
		refreshSeries(),
		removeSeriesFile(serie.seriefile),
		removeSerieInKaras(serie.name, await getAllKaras()),
	]);
	// Sorting kara data just to be sure in case it's been modified by removeSerieInKaras
	sortKaraStore();
	// Refreshing karas is done asynchronously
	const serieFiles = await resolveFileInDirs(serie.seriefile, resolvedPathRepos('Series', serie.repository));
	removeSeriesInStore(serieFiles[0]);
	saveSetting('baseChecksum', getStoreChecksum());
	refreshKaraSeries().then(() => refreshKaras());
}

/** Add a new series */
export async function addSerie(serieObj: Series, opts = {refresh: true}): Promise<string> {
	const serie = await selectSerieByName(serieObj.name);
	if (serie) {
		logger.warn(`[Series] Series original name already exists "${serieObj.name}"`);
		return serie.sid;
	}
	if (!serieObj.sid) serieObj.sid = uuidV4();
	if (!serieObj.seriefile) serieObj.seriefile = `${sanitizeFile(serieObj.name)}.series.json`;
	const seriefile = serieObj.seriefile;

	await insertSerie(serieObj);
	await Promise.all([
		insertSeriei18n(serieObj),
		writeSeriesFile(serieObj, resolvedPathRepos('Series', serieObj.repository)[0])
	]);

	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	const serieFiles = await resolveFileInDirs(seriefile, resolvedPathRepos('Series', serieObj.repository));
	await addSeriesToStore(serieFiles[0]);
	sortSeriesStore();
	saveSetting('baseChecksum', getStoreChecksum());

	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
	return serieObj.sid;
}

/** Edit series */
export async function editSerie(sid: string, serieObj: Series, opts = { refresh: true }) {
	const oldSerie = await testSerie(sid);
	if (!oldSerie) throw 'Series ID unknown';
	serieObj.seriefile = sanitizeFile(serieObj.name) + '.series.json';
	const seriefile = serieObj.seriefile;
	await Promise.all([
		updateSerie(serieObj),
		writeSeriesFile(serieObj, resolvedPathRepos('Series', serieObj.repository)[0])
	]);
	const seriesData = formatSeriesFile(serieObj).series;
	seriesData.seriefile = seriefile;
	const oldSerieFiles = await resolveFileInDirs(oldSerie.seriefile, resolvedPathRepos('Series', oldSerie.repository));
	const newSerieFiles = await resolveFileInDirs(serieObj.seriefile, resolvedPathRepos('Series', serieObj.repository));

	if (oldSerie.seriefile !== serieObj.seriefile) {
		try {
			await removeSeriesFile(oldSerie.seriefile);
			await addSeriesToStore(newSerieFiles[0]);
			removeSeriesInStore(oldSerieFiles[0]);
			sortSeriesStore();
		} catch(err) {
			//Non fatal. Can be triggered if the series file has already been removed.
		}
	} else {
		await editSeriesInStore(newSerieFiles[0]);
	}
	saveSetting('baseChecksum', getStoreChecksum());
	if (opts.refresh) {
		await refreshSeriesAfterDBChange();
	}
}

/** Refreshes materialized views for series in an async manner to avoid long pause times */
export async function refreshSeriesAfterDBChange() {
	logger.debug('[DB] Refreshing DB after series change');
	await refreshSeries();
	await refreshSeriesi18n();
	await refreshKaraSeries();
	await refreshKaras();
	await refreshKaraSeriesLang();
	logger.debug('[DB] Done refreshing DB after series change');
}

/** Integrate downloaded series file into database */
export async function integrateSeriesFile(file: string): Promise<string> {
	try {
		const seriesFileData = await getDataFromSeriesFile(file);
		const seriesDBData = await testSerie(seriesFileData.sid);
		if (seriesDBData) {
			await editSerie(seriesFileData.sid, seriesFileData, { refresh: false });
			return seriesFileData.name;
		} else {
			await addSerie(seriesFileData, { refresh: false });
			return seriesFileData.name;
		}
	} catch(err) {
		logger.error(`[Series] Error integrating series file "${file} : ${err}`);
	}
}
