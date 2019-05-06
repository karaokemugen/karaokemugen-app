import { KaraFile } from "../types/kara";
import { Series } from "../types/series";
import { checksum } from "../utils/files";
import { profile } from "../utils/logger";
import { extractAllKaraFiles, extractAllSeriesFiles } from "../services/generation";
import Bar from "../utils/bar";
import { parseKara } from "./karafile";
import { getDataFromSeriesFile } from "./seriesfile";

let dataStore = {
	karas: [],
	series: []
};

export function addKaraToStore(kara: KaraFile) {
	dataStore.karas.push(kara);
}

export function addSeriesToStore(series: Series) {
	dataStore.series.push(series);
}

export function sortKaraStore() {
	dataStore.karas = dataStore.karas.sort((a, b) => {
		if (a.KID > b.KID) return 1;
		if (a.KID < b.KID) return -1;
		if (a.KID === b.KID) return 0;
	});
}

export function sortSeriesStore() {
	dataStore.series = dataStore.series.sort((a, b) => {
		if (a.sid > b.sid) return 1;
		if (a.sid < b.sid) return -1;
		if (a.sid === b.sid) return 0;
	});
}

export function getStoreChecksum() {
	return checksum(JSON.stringify(dataStore));
}

export function editKaraInStore(kid: string, kara: KaraFile) {
	const i = dataStore.karas.find(e => e.KID === kid);
	dataStore.karas[i] = kara;
	getStoreChecksum();
}

export function removeKaraInStore(kid: string) {
	dataStore.karas = dataStore.karas.filter(e => e.KID !== kid);
	getStoreChecksum();
}

export function editSeriesInStore(sid: string, series: Series) {
	const i = dataStore.series.find(e => e.sid === sid);
	dataStore.series[i] = series;
	getStoreChecksum();
}

export function removeSeriesInStore(sid: string) {
	dataStore.series = dataStore.series.filter(e => e.sid !== sid);
	getStoreChecksum();
}

export async function baseChecksum(silent?: boolean) {
	profile('baseChecksum');
	let bar: any;
	const [karaFiles, seriesFiles] = await Promise.all([
		extractAllKaraFiles(),
		extractAllSeriesFiles()
	]);
	if (karaFiles.length === 0) return null;
	if (!silent) bar = new Bar({
		message: 'Checking .karas...   '
	}, karaFiles.length);
	for (const karaFile of karaFiles) {
		const data = await parseKara(karaFile);
		addKaraToStore(data);
		if (!silent) bar.incr();
	}
	sortKaraStore();
	if (!silent) bar.stop();
	if (!silent) bar = new Bar({
		message: 'Checking series...   '
	}, seriesFiles.length);
	for (const seriesFile of seriesFiles) {
		const data = await getDataFromSeriesFile(seriesFile);
		addSeriesToStore(data);
		if (!silent) bar.incr();
	}
	sortSeriesStore();
	if (!silent) bar.stop();
	profile('baseChecksum');
	return getStoreChecksum();
}