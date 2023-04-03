/**
 * Datastore is used to inventory all tags and kara files to determine if the files have changed and we need to re-generate database.
 */

import { promises as fs } from 'fs';
import parallel from 'p-map';

import { checksum, listAllFiles } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import sentry from '../utils/sentry.js';

const service = 'Store';

const dataStore = {
	karas: new Map(),
	tags: new Map(),
};

export async function addKaraToStore(file: string) {
	const stats = await fs.stat(file);
	dataStore.karas.set(file, stats.mtimeMs);
}

export async function addTagToStore(file: string) {
	const stats = await fs.stat(file);
	dataStore.tags.set(file, stats.mtimeMs);
}

export function sortKaraStore() {
	dataStore.karas = new Map([...dataStore.karas.entries()].sort());
}

export function sortTagsStore() {
	dataStore.tags = new Map([...dataStore.tags.entries()].sort());
}

export function getStoreChecksum() {
	const store = JSON.stringify(
		{
			karas: [...dataStore.karas.entries()],
			tags: [...dataStore.tags.entries()],
		},
		null,
		2
	);
	return checksum(store);
}

export async function editKaraInStore(file: string) {
	const stats = await fs.stat(file);
	dataStore.karas.set(file, stats.mtimeMs);
}

export function removeKaraInStore(file: string) {
	dataStore.karas.delete(file);
}

export async function editTagInStore(file: string) {
	const stats = await fs.stat(file);
	dataStore.tags.set(file, stats.mtimeMs);
}

export function removeTagInStore(tid: string) {
	dataStore.tags.delete(tid);
}

async function processDataFile(file: string, task?: Task) {
	if (file.endsWith('kara.json')) await addKaraToStore(file);
	if (file.endsWith('tag.json')) await addTagToStore(file);
	task.incr();
}

export async function baseChecksum(): Promise<string> {
	profile('baseChecksum');
	logger.info('Comparing files and database data', { service });
	try {
		const [karaFiles, tagFiles] = await Promise.all([listAllFiles('Karaokes'), listAllFiles('Tags')]);
		const fileCount = karaFiles.length + tagFiles.length;
		if (karaFiles.length === 0) return null;
		logger.info(`Found ${karaFiles.length} karas and ${tagFiles.length} tags`, { service });
		const task = new Task({
			text: 'DATASTORE_UPDATE',
			value: 0,
			total: fileCount,
		});
		const files = [].concat(karaFiles, tagFiles);
		dataStore.karas.clear();
		dataStore.tags.clear();
		const mapper = async (file: string) => {
			return processDataFile(file, task);
		};
		await parallel(files, mapper, {
			stopOnError: false,
			concurrency: 32,
		});
		sortKaraStore();
		sortTagsStore();
		task.end();
		const storeSum = getStoreChecksum();
		logger.debug(`Store checksum : ${storeSum}`, { service });
		// Use this only when debugging store
		/**
		  	const store = JSON.stringify({
			karas: [...dataStore.karas.entries()],
			tags: [...dataStore.tags.entries()]
		}, null, 2);
		await fs.writeFile(resolve(getState().dataPath, `store-${Date.now()}.json`), store, 'utf-8');
		*/
		return storeSum;
	} catch (err) {
		logger.warn('Unable to browse through your data files', { service, obj: err });
		sentry.error(err, 'warning');
	} finally {
		profile('baseChecksum');
	}
}
