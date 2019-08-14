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
	karas: new Map(),
	series: new Map(),
	tags: new Map()
};

export function addKaraToStore(kara: KaraFileV4) {
	dataStore.karas.set(kara.data.kid, kara);
}

export function addSeriesToStore(series: Series) {
	dataStore.series.set(series.sid, series);
}

export function addTagToStore(tag: Tag) {
	dataStore.tags.set(tag.tid, tag);
}

export function sortKaraStore() {
	dataStore.karas = new Map([...dataStore.karas.entries()].sort());
}

export function sortSeriesStore() {
	dataStore.series = new Map([...dataStore.series.entries()].sort());
}

export function sortTagsStore() {
	dataStore.tags = new Map([...dataStore.tags.entries()].sort());
}

export function getStoreChecksum() {
	const store = JSON.stringify({
		karas: [...dataStore.karas.entries()],
		tags: [...dataStore.tags.entries()],
		series: [...dataStore.series.entries()]
	}, null, 2);
	return checksum(store);
}

export function editKaraInStore(kid: string, kara: KaraFileV4) {
	dataStore.karas.set(kid, kara);
}

export function removeKaraInStore(kid: string) {
	dataStore.karas.delete(kid);
}

export function editSeriesInStore(sid: string, series: Series) {
	dataStore.series.set(sid, series);
}

export function editTagInStore(tid: string, tag: Tag) {
	dataStore.tags.set(tid, tag);
}

export function removeTagInStore(tid: string) {
	dataStore.tags.delete(tid);
}

export function removeSeriesInStore(sid: string) {
	dataStore.series.delete(sid);
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
	const checksum = getStoreChecksum();
	logger.debug(`[Store] Store checksum : ${checksum}`);
	profile('baseChecksum');
	return checksum;
}