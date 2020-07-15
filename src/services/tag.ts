import { dirname, resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { addTagToStore, editKaraInStore,editTagInStore, getStoreChecksum, removeTagInStore, sortTagsStore } from '../dao/dataStore';
import {getAllTags, insertTag, removeTag, selectDuplicateTags, selectTag, selectTagByNameAndType, selectTagMini,updateKaraTagsTID, updateTag} from '../dao/tag';
import { saveSetting } from '../lib/dao/database';
import { refreshKaras } from '../lib/dao/kara';
import { replaceTagInKaras } from '../lib/dao/karafile';
import { writeSeriesFile } from '../lib/dao/seriesfile';
import { refreshKaraTags,refreshTags } from '../lib/dao/tag';
import { formatTagFile, getDataFromTagFile,removeTagFile, removeTagInKaras, writeTagFile } from '../lib/dao/tagfile';
import { DBTag } from '../lib/types/database/tag';
import { IDQueryResult, Kara } from '../lib/types/kara';
import { Tag,TagParams } from '../lib/types/tag';
import { resolvedPathRepos } from '../lib/utils/config';
import { tagTypes } from '../lib/utils/constants';
import { asyncUnlink,resolveFileInDirs, sanitizeFile } from '../lib/utils/files';
import logger, {profile} from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getAllKaras } from './kara';

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
		const error = new Error(err);
		sentry.error(error);
		throw error;
	} finally {
		task.end();
	}
}

export async function refreshTagsAfterDBChange() {
	logger.debug('Refreshing DB after tag change', {service: 'DB'});
	await refreshTags();
	refreshKaraTags();
	refreshKaras();
	logger.debug('Done refreshing DB after tag change', {service: 'DB'});
}

export function getTag(tid: string) {
	return selectTag(tid);
}

export function getTagMini(tid: string) {
	return selectTagMini(tid);
}

export async function getOrAddTagID(tagObj: Tag): Promise<IDQueryResult> {
	const tag = await selectTagByNameAndType(tagObj.name, tagObj.types[0]);
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
			getTagMini(tid1),
			getTagMini(tid2)
		]);
		if (!tag1 || !tag2) throw {code: 404};
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
		logger.error(`Error merging tag ${tid1} and ${tid2}`, {service: 'Tags', obj: err});
		sentry.error(new Error(err));
		throw err;
	} finally {
		task.end();
	}
}

export async function editTag(tid: string, tagObj: Tag, opts = { silent: false, refresh: true }) {
	let task: Task;
	if (!opts.silent) task = new Task({
		text: 'EDITING_TAG_IN_PROGRESS',
		subtext: tagObj.name
	});
	try {
		const oldTag = await getTagMini(tid);
		if (!oldTag) throw {code: 404, msg: 'Tag ID unknown'};
		tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tid.substring(0, 8)}.tag.json`;
		tagObj.modified_at = new Date().toISOString();
		// Try to find old tag
		const oldTagFiles = await resolveFileInDirs(oldTag.tagfile, resolvedPathRepos('Tags', oldTag.repository));
		const oldTagPath = dirname(oldTagFiles[0]);
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
		sentry.error(new Error(err));
		throw err;
	} finally {
		if (!opts.silent) task.end();
	}
}

export async function deleteTag(tid: string, opt = {refresh: true}) {
	const task = new Task({
		text: 'DELETING_TAG_IN_PROGRESS'
	});
	try {
		const tag = await getTagMini(tid);
		if (!tag) throw {code: 404, msg: 'Tag ID unknown'};
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
		sentry.error(new Error(err));
		throw err;
	} finally {
		task.end();
	}
}

export async function integrateTagFile(file: string): Promise<string> {
	const tagFileData = await getDataFromTagFile(file);
	if (!tagFileData) return null;
	try {
		const tagDBData = await getTagMini(tagFileData.tid);
		if (tagDBData) {
			if (tagDBData.repository === tagFileData.repository) {
				// Only edit if repositories are the same.
				await editTag(tagFileData.tid, tagFileData, { silent: true, refresh: false });
			}
			return tagFileData.name;
		} else {
			await addTag(tagFileData, { refresh: false });
			return tagFileData.name;
		}
	} catch(err) {
		logger.error(`Error integrating tag file ${file}`, {service: 'Tags', obj: err});
	}
}


export async function consolidateTagsInRepo(kara: Kara) {
	const copies = [];
	for (const tagType of Object.keys(tagTypes)) {
		for (const karaTag of kara[tagType]) {
			const tag = await getTagMini(karaTag.tid);
			if (tag.repository !== kara.repository) {
				// This might need to be copied
				tag.repository = kara.repository;
				const tagObj: Tag = {
					...tag,
					modified_at: tag.modified_at.toISOString()
				};
				const destPath = resolvedPathRepos('Tags', tag.repository);
				const tagFile = `${sanitizeFile(tagObj.name)}.${tagObj.tid.substring(0, 8)}.tag.json`;
				try {
					await resolveFileInDirs(tagFile, destPath);
				} catch {
					// File doe snot exist, let's write it.
					copies.push(writeTagFile(tagObj, destPath[0]));
				}
			}
		}
	}
	await Promise.all(copies);
}
