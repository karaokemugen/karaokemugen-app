import {getAllTags, selectTagByNameAndType, insertTag, selectTag, updateTag, removeTag, updateKaraTagsTID} from '../dao/tag';
import logger, {profile} from '../lib/utils/logger';
import { TagParams, Tag } from '../lib/types/tag';
import { DBTag } from '../lib/types/database/tag';
import uuidV4 from 'uuid/v4';
import { resolvedPathTags } from '../lib/utils/config';
import { addTagToStore, sortTagsStore, getStoreChecksum, editTagInStore, removeTagInStore } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import { sanitizeFile, asyncUnlink, resolveFileInDirs } from '../lib/utils/files';
import { writeTagFile, formatTagFile, removeTagFile, removeTagInKaras, getDataFromTagFile } from '../lib/dao/tagfile';
import { refreshTags, refreshKaraTags } from '../lib/dao/tag';
import { refreshKaras } from '../lib/dao/kara';
import { getAllKaras, getKaras } from './kara';
import { writeKara } from '../lib/dao/karafile';

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

export async function addTag(tagObj: Tag, opts = {refresh: true}): Promise<Tag> {
	const tag = await selectTagByNameAndType(tagObj.name, tagObj.types[0]);
	if (tag) {
		logger.warn(`[Tag] Tag original name already exists "${tagObj.name} and ${tagObj.types}"`);
		return tag;
	}
	if (!tagObj.tid) tagObj.tid = uuidV4();
	if (!tagObj.tagfile) tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tagObj.tid.substring(0, 7)}.tag.json`;
	const tagfile = tagObj.tagfile;

	const promises = [
		insertTag(tagObj),
		writeTagFile(tagObj, resolvedPathTags()[0])
	]
	await Promise.all(promises);

	const tagData = formatTagFile(tagObj).tag;
	tagData.tagfile = tagfile;
	addTagToStore(tagData);
	sortTagsStore();
	saveSetting('baseChecksum', getStoreChecksum());

	if (opts.refresh) {
		await refreshTagsAfterDBChange();
	}
	return tagObj;
}

export async function refreshTagsAfterDBChange() {
	await refreshTags();
	refreshKaraTags().then(() => refreshKaras());
}

export async function getTag(tid: string) {
	return await selectTag(tid);
}

export async function mergeTags(tid1: string, tid2: string) {
	try {
		const [tag1, tag2] = await Promise.all([
			getTag(tid1),
			getTag(tid2)
		]);
		const types = [].concat(tag1.types, tag2.types);
		const aliases = [].concat(tag1.aliases, tag2.aliases);
		const i18n = {...tag1.i18n, ...tag2.i18n};
		const tagObj: Tag = {
			tid: uuidV4(),
			name: tag1.name,
			types: types,
			i18n: i18n,
			short: tag1.short,
			aliases: aliases
		};
		await insertTag(tagObj);
		await Promise.all([
			updateKaraTagsTID(tid1, tagObj.tid),
			updateKaraTagsTID(tid2, tagObj.tid)
		]);
		const affectedKaras = await getKaras({mode: 'search', modeValue: `t:${tagObj.tid}`, admin: true});
		const karaEdits = [refreshTagsAfterDBChange()];
		affectedKaras.content.forEach(kara => karaEdits.push(writeKara(kara.karafile, kara)));
		await Promise.all(karaEdits);
		return tagObj;
	} catch(err) {
		logger.error(`[Tags] Error merging tag ${tid1} and ${tid2} : ${err}`);
	}
}

export async function editTag(tid: string, tagObj: Tag, opts = { refresh: true }) {
	const oldTag = await getTag(tid);
	if (!oldTag) throw 'Tag ID unknown';
	if (oldTag.name !== tagObj.name) await removeTagFile(oldTag.tagfile);
	tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tid.substring(0, 8)}.tag.json`;
	const tagfile = tagObj.tagfile;
	await Promise.all([
		updateTag(tagObj),
		writeTagFile(tagObj, resolvedPathTags()[0])
	]);
	const tagData = formatTagFile(tagObj).tag;
	tagData.tagfile = tagfile;
	editTagInStore(tid, tagData);
	saveSetting('baseChecksum', getStoreChecksum());
	if (opts.refresh) await refreshTagsAfterDBChange();
}

export async function deleteTag(tid: string) {
	const tag = await getTag(tid);
	if (!tag) throw 'Tag ID unknown';
	await removeTag(tid);
	await Promise.all([
		refreshTags(),
		removeTagFile(tag.tagfile),
		removeTagInKaras(tid, await getAllKaras()),
	]);
	// Refreshing karas is done asynchronously
	removeTagInStore(tid);
	saveSetting('baseChecksum', getStoreChecksum());
	refreshKaraTags().then(() => refreshKaras());
}

export async function integrateTagFile(file: string): Promise<string> {
	const tagFileData = await getDataFromTagFile(file);
	try {
		const tagDBData = await getTag(tagFileData.tid);
		if (tagDBData) {
			await editTag(tagFileData.tid, tagFileData, { refresh: false });
			if (tagDBData.name !== tagFileData.name) try {
					await asyncUnlink(await resolveFileInDirs(tagDBData.tagfile, resolvedPathTags()));
				} catch(err) {
					logger.warn(`[Tags] Could not remove old tag file ${tagDBData.tagfile}`);
				}
			return tagFileData.name;
		} else {
			await addTag(tagFileData, { refresh: false });
			return tagFileData.name;
		}
	} catch(err) {
		logger.error(`[Tags] Error integrating tag file "${file} : ${err}`);
	}
}
