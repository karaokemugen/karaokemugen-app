import parallel from 'async-await-parallel';
import { promises as fs } from 'fs';

import { checksum, extractAllFiles } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import sentry from '../utils/sentry';

const dataStore = {
	karas: new Map(),
	tags: new Map()
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
	const store = JSON.stringify({
		karas: [...dataStore.karas.entries()],
		tags: [...dataStore.tags.entries()]
	}, null, 2);
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
	try {
		const [karaFiles, tagFiles] = await Promise.all([
			extractAllFiles('Karaokes'),
			extractAllFiles('Tags')
		]);
		const fileCount = karaFiles.length + tagFiles.length;
		if (karaFiles.length === 0) return null;
		logger.info(`Found ${karaFiles.length} karas and ${tagFiles.length} tags`, {service: 'Store'});
		const task = new Task({
			text: 'DATASTORE_UPDATE',
			value: 0,
			total: fileCount
		});
		const files = [].concat(karaFiles, tagFiles);
		const promises = [];
		dataStore.karas.clear();
		dataStore.tags.clear();
		files.forEach(f => promises.push(() => processDataFile(f, task)));
		await parallel(promises, 32);
		sortKaraStore();
		sortTagsStore();
		task.end();
		const checksum = getStoreChecksum();
		logger.debug(`Store checksum : ${checksum}`, {service: 'Store'});
		// Use this only when debugging store
		/**
		  	const store = JSON.stringify({
			karas: [...dataStore.karas.entries()],
			tags: [...dataStore.tags.entries()]
		}, null, 2);
		await fs.writeFile(resolve(getState().dataPath, `store-${Date.now()}.json`), store, 'utf-8');
		*/
		return checksum;
	} catch(err) {
		logger.warn('Unable to browse through your data files', {service: 'Store', obj: err});
		sentry.error(err, 'Warning');
	} finally {
		profile('baseChecksum');
	}
}
