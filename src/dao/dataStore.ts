import parallel from 'async-await-parallel';

import Bar from '../lib/utils/bar';
import { asyncStat,checksum, extractAllFiles } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { sentryError } from '../lib/utils/sentry';
import Task from '../lib/utils/taskManager';

const dataStore = {
	karas: new Map(),
	tags: new Map()
};

export async function addKaraToStore(file: string) {
	const stats = await asyncStat(file);
	dataStore.karas.set(file, stats.mtimeMs);
}

export async function addTagToStore(file: string) {
	const stats = await asyncStat(file);
	dataStore.tags.set(file, stats.mtimeMs);
}

export function sortKaraStore() {
	dataStore.karas = new Map([...dataStore.karas.entries()].sort());
}

export function sortTagsStore() {
	dataStore.tags = new Map([...dataStore.tags.entries()].sort());
}

export function getStoreChecksum() {
	const store = JSON.stringify({
		karas: [...dataStore.karas.entries()],
		tags: [...dataStore.tags.entries()]
	}, null, 2);
	return checksum(store);
}

export async function editKaraInStore(file: string) {
	const stats = await asyncStat(file);
	dataStore.karas.set(file, stats.mtimeMs);
}

export function removeKaraInStore(file: string) {
	dataStore.karas.delete(file);
}

export async function editTagInStore(file: string) {
	const stats = await asyncStat(file);
	dataStore.tags.set(file, stats.mtimeMs);
}

export function removeTagInStore(tid: string) {
	dataStore.tags.delete(tid);
}

async function processDataFile(file: string, silent?: boolean, bar?: Bar, task?: Task) {
	if (file.endsWith('kara.json')) await addKaraToStore(file);
	if (file.endsWith('tag.json')) await addTagToStore(file);
	if (!silent) bar.incr();
	task.incr();
}

export async function baseChecksum(silent?: boolean): Promise<string> {
	profile('baseChecksum');
	try {
		let bar: Bar;
		const [karaFiles, tagFiles] = await Promise.all([
			extractAllFiles('Karas'),
			extractAllFiles('Tags')
		]);
		const fileCount = karaFiles.length + tagFiles.length;
		if (karaFiles.length === 0) return null;
		logger.info(`[Store] Found ${karaFiles.length} karas and ${tagFiles.length} tags`);
		if (!silent) bar = new Bar({
			message: 'Checking files...    '
		}, fileCount);
		const task = new Task({
			text: 'DATASTORE_UPDATE',
			value: 0,
			total: fileCount
		});
		const files = [].concat(karaFiles, tagFiles);
		const promises = [];
		files.forEach(f => promises.push(() => processDataFile(f, silent, bar, task)));
		await parallel(promises, 32);
		sortKaraStore();
		sortTagsStore();
		if (!silent) bar.stop();
		task.end();
		const checksum = getStoreChecksum();
		logger.debug(`[Store] Store checksum : ${checksum}`);
		return checksum;
	} catch(err) {
		const errStr = `Unable to browse through your data files : ${err}`;
		logger.warn(`[Store] ${errStr}`);
		sentryError(new Error(errStr), 'Warning');
	} finally {
		profile('baseChecksum');
	}
}