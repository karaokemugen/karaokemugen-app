import {getAllTags, selectTagByNameAndType, insertTag, selectTag, updateTag, removeTag, updateKaraTagsTID, selectDuplicateTags} from '../dao/tag';
import logger, {profile} from '../lib/utils/logger';
import { TagParams, Tag } from '../lib/types/tag';
import { v4 as uuidV4 } from 'uuid';
import { addTagToStore, sortTagsStore, getStoreChecksum, editTagInStore, removeTagInStore, editKaraInStore } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import { sanitizeFile, resolveFileInDirs, asyncUnlink } from '../lib/utils/files';
import { writeTagFile, formatTagFile, removeTagFile, removeTagInKaras, getDataFromTagFile } from '../lib/dao/tagfile';
import { refreshTags, refreshKaraTags } from '../lib/dao/tag';
import { refreshKaras } from '../lib/dao/kara';
import { getAllKaras } from './kara';
import { replaceTagInKaras } from '../lib/dao/karafile';
import { IDQueryResult } from '../lib/types/kara';
import { resolvedPathRepos } from '../lib/utils/config';
import { dirname, resolve } from 'path';
import { emitWS } from '../lib/utils/ws';
import { DBTag } from '../lib/types/database/tag';
import { writeSeriesFile } from '../lib/dao/seriesfile';
import Task from '../lib/utils/taskManager';

export function formatTagList(tagList: DBTag[], from: number, count: number) {
	return {
		infos: {
			count: count,
			from: from,
			to: from + tagList.length
		},
		content: tagList
	};
}

export async function getTags(params: TagParams) {
	profile('getTags');
	const tags = await getAllTags(params);
	const ret = formatTagList(tags.slice(params.from || 0, (params.from || 0) + params.size || 999999999), params.from || 0, tags.length);
	profile('getTags');
	return ret;
}

export async function getDuplicateTags() {
	const tags = await selectDuplicateTags();
	return formatTagList(tags, 0, tags.length);
}

export async function addTag(tagObj: Tag, opts = {refresh: true}): Promise<Tag> {
	const task = new Task({
		text: 'CREATING_TAG_IN_PROGRESS',
		subtext: tagObj.name
	});
	try {
		const tag = await selectTagByNameAndType(tagObj.name, tagObj.types[0]);
		if (tag) {
			// Doing this because DBTag has a Date object for modified_at while Tag has a string.
			// Kill me please.
			const tagObj: any = tag
			logger.debug(`[Tag] Tag original name already exists "${tagObj.name} and ${tagObj.types}"`);
			return tagObj;
		}
		if (!tagObj.tid) tagObj.tid = uuidV4();
		if (!tagObj.tagfile) tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tagObj.tid.substring(0, 8)}.tag.json`;
		const tagfile = tagObj.tagfile;
		tagObj.modified_at = new Date().toISOString();

		const promises = [
			insertTag(tagObj),
			writeTagFile(tagObj, resolvedPathRepos('Tags', tagObj.repository)[0])
		];
		await Promise.all(promises);
		emitWS('statsRefresh');
		const tagData = formatTagFile(tagObj).tag;
		tagData.tagfile = tagfile;
		const newTagFiles = await resolveFileInDirs(tagObj.tagfile, resolvedPathRepos('Tags', tagObj.repository));
		addTagToStore(newTagFiles[0]);
		sortTagsStore();
		saveSetting('baseChecksum', getStoreChecksum());

		if (opts.refresh) {
			await refreshTags();
		}
		if (tagObj.types.includes(1)) {
			// Spreading object to keep writeSeriesFile from modifying it
			await writeSeriesFile({...tagObj}, resolvedPathRepos('Series', tagObj.repository)[0]);
		}
		return tagObj;
	} catch(err) {
		throw err;
	} finally {
		task.end();
	}
}

export async function refreshTagsAfterDBChange() {
	logger.debug('[DB] Refreshing DB after tag change');
	await refreshTags();
	refreshKaraTags();
	refreshKaras();
	logger.debug('[DB] Done refreshing DB after tag change');
}

export async function getTag(tid: string) {
	return await selectTag(tid);
}

export async function getOrAddTagID(tagObj: Tag): Promise<IDQueryResult> {
	let tag = await selectTagByNameAndType(tagObj.name, tagObj.types[0]);
	if (tag) return {id: tag.tid, new: false};
	// This modifies tagObj.
	// I hate mutating objects.
	await addTag(tagObj, {refresh: false});
	return {id: tagObj.tid, new: true};
}


export async function mergeTags(tid1: string, tid2: string) {
	const task = new Task({
		text: 'MERGING_TAGS_IN_PROGRESS'
	});
	try {
		const [tag1, tag2] = await Promise.all([
			getTag(tid1),
			getTag(tid2)
		]);
		task.update({
			subtext: `${tag1.name} + ${tag2.name}`
		});
		let types = [].concat(tag1.types, tag2.types);
		let aliases = [].concat(tag1.aliases, tag2.aliases);
		types = types.filter((e, pos) => types.indexOf(e) === pos);
		aliases = aliases.filter((e, pos) => aliases.indexOf(e) === pos);
		if (aliases[0] === null) aliases = null;
		const i18n = {...tag2.i18n, ...tag1.i18n};
		const tid = uuidV4();
		const tagObj: Tag = {
			tid: tid,
			name: tag1.name,
			types: types,
			i18n: i18n,
			short: tag1.short,
			aliases: aliases,
			modified_at: new Date().toISOString(),
			tagfile: `${tag1.name}.${tid.substring(0, 8)}.tag.json`,
			repository: tag1.repository
		};
		await insertTag(tagObj);
		await writeTagFile(tagObj, resolvedPathRepos('Tags', tagObj.repository)[0]);
		const newTagFiles = resolve(resolvedPathRepos('Tags', tagObj.repository)[0], tagObj.tagfile);
		await addTagToStore(newTagFiles);
		sortTagsStore();
		await Promise.all([
			updateKaraTagsTID(tid1, tagObj.tid),
			updateKaraTagsTID(tid2, tagObj.tid)
		]);
		await Promise.all([
			removeTag(tid1),
			removeTag(tid2),
			removeTagFile(tag1.tagfile, tag1.repository),
			removeTagFile(tag2.tagfile, tag2.repository),
			removeTagInStore(tid1),
			removeTagInStore(tid2)
		]);
		const karas = await getAllKaras();
		const modifiedKaras = await replaceTagInKaras(tid1, tid2,tagObj.tid, karas);
		for (const kara of modifiedKaras) {
			await editKaraInStore(kara);
		}
		saveSetting('baseChecksum', getStoreChecksum());
		await refreshTagsAfterDBChange();
		return tagObj;
	} catch(err) {
		logger.error(`[Tags] Error merging tag ${tid1} and ${tid2} : ${err}`);
	} finally {
		task.end();
	}
}

export async function editTag(tid: string, tagObj: Tag, opts = { refresh: true }) {
	const task = new Task({
		text: 'EDITING_TAG_IN_PROGRESS',
		subtext: tagObj.name
	});
	try {
		const oldTag = await getTag(tid);
		if (!oldTag) throw 'Tag ID unknown';
		tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tid.substring(0, 8)}.tag.json`;
		tagObj.modified_at = new Date().toISOString();
		// Try to find old tag
		let oldTagPath: string;
		const oldTagFiles = await resolveFileInDirs(oldTag.tagfile, resolvedPathRepos('Tags', oldTag.repository));
		oldTagPath = dirname(oldTagFiles[0]);
		await Promise.all([
			updateTag(tagObj),
			writeTagFile(tagObj, oldTagPath)
		]);
		const newTagFiles = await resolveFileInDirs(tagObj.tagfile, resolvedPathRepos('Tags', tagObj.repository));
		if (oldTag.tagfile !== tagObj.tagfile) {
			try {
				await asyncUnlink(resolve(oldTagPath, oldTag.tagfile));
				await addTagToStore(newTagFiles[0]);
				removeTagInStore(oldTagFiles[0]);
				sortTagsStore();
			} catch(err) {
				//Non fatal. Can be triggered if the tag file has already been removed.
			}
		} else {
			await editTagInStore(newTagFiles[0]);
		}
		saveSetting('baseChecksum', getStoreChecksum());
		if (tagObj.types.includes(1)) {
			await writeSeriesFile(tagObj, resolvedPathRepos('Series', tagObj.repository)[0]);
		}
		if (opts.refresh) {
			await refreshTagsAfterDBChange();
		}
	} catch(err) {
		throw err;
	} finally {
		task.end();
	}
}

export async function deleteTag(tid: string, opt = {refresh: true}) {
	const task = new Task({
		text: 'DELETING_TAG_IN_PROGRESS'
	});
	try {
		const tag = await getTag(tid);
		if (!tag) throw 'Tag ID unknown';
		task.update({
			subtext: tag.name
		});
		await removeTag(tid);
		emitWS('statsRefresh');
		const removes = [
			removeTagFile(tag.tagfile, tag.repository),
			removeTagInKaras(tid, await getAllKaras())
		];
		await Promise.all(removes);
		removeTagInStore(tid);
		saveSetting('baseChecksum', getStoreChecksum());
		if (opt.refresh) {
			await refreshTagsAfterDBChange();
		}
	} catch(err) {
		throw err;
	} finally {
		task.end();
	}
}

export async function integrateTagFile(file: string): Promise<string> {
	const tagFileData = await getDataFromTagFile(file);
	if (!tagFileData) return null;
	try {
		const tagDBData = await getTag(tagFileData.tid);
		if (tagDBData) {
			await editTag(tagFileData.tid, tagFileData, { refresh: false });
			return tagFileData.name;
		} else {
			await addTag(tagFileData, { refresh: false });
			return tagFileData.name;
		}
	} catch(err) {
		logger.error(`[Tags] Error integrating tag file "${file} : ${err}`);
	}
}
