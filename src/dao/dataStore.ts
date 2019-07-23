import { KaraFileV4 } from "../lib/types/kara";
import { Series } from "../lib/types/series";
import { checksum } from "../lib/utils/files";
import logger, { profile } from "../lib/utils/logger";
import { extractAllKaraFiles, extractAllSeriesFiles, extractAllTagFiles } from "../lib/services/generation";
import Bar from "../lib/utils/bar";
import { parseKara } from "../lib/dao/karafile";
import { getDataFromSeriesFile } from "../lib/dao/seriesfile";
import { Tag } from "../lib/types/tag";
import { getDataFromTagFile } from "../lib/dao/tagfile";
import parallel from 'async-await-parallel';

let dataStore = {
	karas: [],
	series: [],
	tags: []
};

function findKaraInStore(kid: string) {
	return dataStore.karas.find(k => k.kid === kid);
}

function findSeriesInStore(sid: string) {
	return dataStore.series.find(s => s.sid === sid);
}

function findTagInStore(tid: string) {
	return dataStore.tags.find(t => t.tid === tid);
}

export function addKaraToStore(kara: KaraFileV4) {
	if (!findKaraInStore(kara.data.kid)) dataStore.karas.push(kara);
}

export function addSeriesToStore(series: Series) {
	if (!findSeriesInStore(series.sid)) dataStore.series.push(series);
}

export function addTagToStore(tag: Tag) {
	if (!findTagInStore(tag.tid)) dataStore.tags.push(tag);
}

export function sortKaraStore() {
	dataStore.karas = dataStore.karas.sort((a, b) => {
		if (a.data.kid > b.data.kid) return 1;
		if (a.data.kid < b.data.kid) return -1;
		if (a.data.kid === b.data.kid) return 0;
	});
}

export function sortSeriesStore() {
	dataStore.series = dataStore.series.sort((a, b) => {
		if (a.sid > b.sid) return 1;
		if (a.sid < b.sid) return -1;
		if (a.sid === b.sid) return 0;
	});
}

export function sortTagsStore() {
	dataStore.tags = dataStore.tags.sort((a, b) => {
		if (a.tid > b.tid) return 1;
		if (a.tid < b.tid) return -1;
		if (a.tid === b.tid) return 0;
	});
}

export function getStoreChecksum() {
	const store = JSON.stringify(dataStore, null, 2);
	return checksum(store);
}

export function editKaraInStore(kid: string, kara: KaraFileV4) {
	const i = dataStore.karas.find(e => e.data.kid === kid);
	dataStore.karas[i] = kara;
	getStoreChecksum();
}

export function removeKaraInStore(kid: string) {
	dataStore.karas = dataStore.karas.filter(e => e.data.kid !== kid);
	getStoreChecksum();
}

export function editSeriesInStore(sid: string, series: Series) {
	const i = dataStore.series.find(e => e.sid === sid);
	dataStore.series[i] = series;
	getStoreChecksum();
}

export function editTagInStore(tid: string, tag: Tag) {
	const i = dataStore.tags.find(e => e.tid === tid);
	dataStore.tags[i] = tag;
	getStoreChecksum();
}

export function removeTagInStore(tid: string) {
	dataStore.tags = dataStore.tags.filter(e => e.tid !== tid);
	getStoreChecksum();
}

export function removeSeriesInStore(sid: string) {
	dataStore.series = dataStore.series.filter(e => e.sid !== sid);
	getStoreChecksum();
}

async function processDataFile(file: string, silent?: boolean, bar?: any) {
	if (file.endsWith('kara.json')) addKaraToStore(await parseKara(file));
	if (file.endsWith('series.json')) addSeriesToStore(await getDataFromSeriesFile(file));
	if (file.endsWith('tag.json')) addTagToStore(await getDataFromTagFile(file));
	if (!silent) bar.incr();
}

export async function baseChecksum(silent?: boolean) {
	profile('baseChecksum');
	 let bar: any;
	const [karaFiles, seriesFiles, tagFiles] = await Promise.all([
		extractAllKaraFiles(),
		extractAllSeriesFiles(),
		extractAllTagFiles()
	]);
	const fileCount = karaFiles.length + seriesFiles.length + tagFiles.length
	if (karaFiles.length === 0) return null;
	logger.info(`[Store] Found ${karaFiles.length} kara files, ${seriesFiles.length} series files and ${tagFiles.length} tag files`)
	if (!silent) bar = new Bar({
		message: 'Checking files...    '
	}, fileCount);
	const files = [].concat(karaFiles, seriesFiles, tagFiles);
	const promises = [];
	files.forEach(f => promises.push(() => processDataFile(f, silent, bar)));
	await parallel(promises, 32);
	sortKaraStore();
	sortSeriesStore();
	sortTagsStore();
	if (!silent) bar.stop();
	profile('baseChecksum');
	return getStoreChecksum();
}