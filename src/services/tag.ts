import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { addTagToStore, editKaraInStore,editTagInStore, getStoreChecksum, removeTagInStore, sortKaraStore, sortTagsStore } from '../dao/dataStore';
import { deleteTag, insertTag, selectAllTags, selectTagByNameAndType, updateKaraTagsTID, updateTag } from '../dao/tag';
import { removeTagInKaras } from '../dao/tagfile';
import { saveSetting } from '../lib/dao/database';
import { refreshKarasUpdate } from '../lib/dao/kara';
import { refreshTags, updateTagSearchVector } from '../lib/dao/tag';
import { formatTagFile, getDataFromTagFile, removeTagFile, writeTagFile } from '../lib/dao/tagfile';
import {DBKara, DBKaraTag} from '../lib/types/database/kara';
import { DBTag, DBTagMini } from '../lib/types/database/tag';
import { IDQueryResult, Kara } from '../lib/types/kara';
import { Tag,TagParams } from '../lib/types/tag';
import { resolvedPathRepos } from '../lib/utils/config';
import { tagTypes } from '../lib/utils/constants';
import { resolveFileInDirs, sanitizeFile } from '../lib/utils/files';
import logger, {profile} from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getKaras } from './kara';
import { editKara } from './karaCreation';
import { refreshKarasAfterDBChange } from './karaManagement';
import { getRepo } from './repo';

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
	const tags = await selectAllTags(params);
	const count = tags.length > 0 ? tags[0].count : 0;
	const ret = formatTagList(tags, params.from || 0, count);
	profile('getTags');
	return ret;
}

export async function addTag(tagObj: Tag, opts = {silent: false, refresh: true}): Promise<Tag> {
	let task: Task;
	if (!opts.silent) task = new Task({
		text: 'CREATING_TAG_IN_PROGRESS',
		subtext: tagObj.name
	});
	try {
		if (!tagObj.tid) tagObj.tid = uuidV4();
		if (!tagObj.tagfile) tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tagObj.tid.substring(0, 8)}.tag.json`;
		const tagfile = tagObj.tagfile;
		// Modified_at is not provided if tag is new. if tag data comes from an already known tag, we're not going to modify it
		if (!tagObj.modified_at) tagObj.modified_at = new Date().toISOString();

		const promises = [
			insertTag(tagObj),
			writeTagFile(tagObj, resolvedPathRepos('Tags', tagObj.repository)[0])
		];
		await Promise.all(promises);
		emitWS('statsRefresh');
		const tagData = formatTagFile(tagObj).tag;
		tagData.tagfile = tagfile;
		const newTagFiles = await resolveFileInDirs(tagObj.tagfile, resolvedPathRepos('Tags', tagObj.repository));
		await addTagToStore(newTagFiles[0]);
		sortTagsStore();
		saveSetting('baseChecksum', getStoreChecksum());

		if (opts.refresh) {
			await updateTagSearchVector();
			refreshTags();
		}
		return tagObj;
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		if (!opts.silent) task.end();
	}
}

/** Takes any number of arguments to comply with KM Server's multi-argument getTag */
export async function getTag(tid: string, ..._: any) {
	const tags = await selectAllTags({tid: tid});
	return tags[0];
}

export async function getOrAddTagID(tagObj: Tag): Promise<IDQueryResult> {
	const tag = await selectTagByNameAndType(tagObj.name, tagObj.types[0]);
	if (tag) return {id: tag.tid, new: false};
	// This modifies tagObj.
	// I hate mutating objects.
	await addTag(tagObj, {silent: false, refresh: false});
	return {id: tagObj.tid, new: true};
}

export function getTagNameInLanguage(tag: DBKaraTag, mainLanguage: string, fallbackLanguage: string): string {
	if (tag.i18n) {
		return tag.i18n[mainLanguage] ? tag.i18n[mainLanguage] :
			(tag.i18n[fallbackLanguage] ? tag.i18n[fallbackLanguage] : tag.name);
	} else {
		return tag.name;
	}
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
		if (!tag1 || !tag2) throw {code: 404};
		task.update({
			subtext: `${tag1.name} + ${tag2.name}`
		});
		let types = [].concat(tag1.types, tag2.types);
		let aliases = [].concat(tag1.aliases, tag2.aliases);
		//Remove duplicates after we concatenated everything.
		types = types.filter((e, pos) => types.indexOf(e) === pos);
		aliases = aliases.filter((e, pos) => aliases.indexOf(e) === pos);
		if (aliases[0] === null) aliases = null;
		const i18n = {...tag2.i18n, ...tag1.i18n};
		const tid = uuidV4();
		let tagObj: Tag = {
			tid: tid,
			name: tag1.name,
			types: types,
			i18n: i18n,
			short: tag1.short,
			aliases: aliases,
			repository: tag1.repository,
			problematic: tag1.problematic || tag2.problematic,
			noLiveDownload: tag1.noLiveDownload || tag2.noLiveDownload,
			karafile_tag: tag1.karafile_tag || tag2.karafile_tag,
			priority: tag1.priority
		};
		tagObj = await addTag(tagObj, {silent: true, refresh: false});
		const newTagFiles = resolve(resolvedPathRepos('Tags', tagObj.repository)[0], tagObj.tagfile);
		await addTagToStore(newTagFiles);
		sortTagsStore();
		await updateKaraTagsTID(tid1, tagObj.tid);
		// We're not asyncing these because after the first one passes, if the new TID already has the same songs registered in the kara_tag table, it'll break the unique constraint on the table and destroy the universe.
		// So we don't do that.
		// The query updates only rows where KIDs aren't already listed as belonging to the new TID.
		// The remaining rows will disappear thanks to the removal of the old TIDs just after, thanks to ON DELETE CASCADE.
		await updateKaraTagsTID(tid1, tagObj.tid);
		await updateKaraTagsTID(tid2, tagObj.tid);
		await Promise.all([
			deleteTag([tid1, tid2]),
			removeTagFile(tag1.tagfile, tag1.repository),
			removeTagFile(tag2.tagfile, tag2.repository),
			removeTagInStore(tid1),
			removeTagInStore(tid2)
		]);
		const karas = await getKarasWithTags([tag1, tag2, tagObj as any]);
		const modifiedKaras = await replaceTagInKaras(tid1, tid2, tagObj, karas);
		for (const kara of modifiedKaras) {
			await editKaraInStore(kara);
		}
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
		await updateTagSearchVector();
		await refreshKarasUpdate(karas.map(k => k.kid));
		refreshTags();
		return tagObj;
	} catch(err) {
		logger.error(`Error merging tag ${tid1} and ${tid2}`, {service: 'Tags', obj: err});
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function editTag(tid: string, tagObj: Tag, opts = { silent: false, refresh: true, repoCheck: true }) {
	let task: Task;
	if (!opts.silent) task = new Task({
		text: 'EDITING_TAG_IN_PROGRESS',
		subtext: tagObj.name
	});
	try {
		profile('editTag');
		const oldTag = await getTag(tid);
		if (!oldTag) throw {code: 404, msg: 'Tag ID unknown'};
		if (opts.repoCheck && oldTag.repository !== tagObj.repository) throw {code: 409, msg: 'Tag repository cannot be modified. Use copy function instead'};
		tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tid.substring(0, 8)}.tag.json`;
		tagObj.modified_at = new Date().toISOString();
		// Try to find old tag
		let oldTagFiles = [];
		let oldTagPath: string;
		try {
			oldTagFiles = await resolveFileInDirs(oldTag.tagfile, resolvedPathRepos('Tags', oldTag.repository));
			oldTagPath = dirname(oldTagFiles[0]);
		} catch(err) {
			// Non fatal, couldn't find old tag file. We're just goign to update it and write the new one.
			oldTagPath = resolvedPathRepos('Tags', oldTag.repository)[0];
		}
		await Promise.all([
			updateTag(tagObj),
			writeTagFile(tagObj, oldTagPath)
		]);
		const newTagFiles = await resolveFileInDirs(tagObj.tagfile, resolvedPathRepos('Tags', tagObj.repository));
		// Here we only compare the filename, not the full path.
		// If it has been modified (name field modified) we need to remove the old one.
		if (oldTag.tagfile !== tagObj.tagfile) {
			try {
				await fs.unlink(oldTagFiles[0]);
			} catch(err) {
				//Non fatal. Can be triggered if the tag file has already been removed.
			}
		}
		// If the old and new paths are different, it means we copied it to a new repository
		if (oldTagFiles[0] && oldTagFiles[0] !== newTagFiles[0]) {
			await addTagToStore(newTagFiles[0]);
			removeTagInStore(oldTagFiles[0]);
		} else {
			await editTagInStore(newTagFiles[0]);
		}
		sortTagsStore();
		saveSetting('baseChecksum', getStoreChecksum());
		if (opts.refresh) {
			const karasToUpdate = await getKarasWithTags([oldTag]);
			await updateTagSearchVector();
			await refreshKarasAfterDBChange('UPDATE', karasToUpdate);
			refreshTags();
		}
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	} finally {
		profile('editTag');
		if (!opts.silent) task.end();
	}
}

async function getKarasWithTags(tags: DBTagMini[]): Promise<DBKara[]> {
	let karasToReturn = [];
	const karaPromises = [];
	for (const tag of tags) {
		for (const type of tag.types) {
			karaPromises.push(getKaras({
				q: `t:${tag.tid}~${type}`
			}));
		}
	}
	const karas = await Promise.all(karaPromises);
	for (const karaList of karas) {
		karasToReturn = [].concat(karasToReturn, karaList.content);
	}
	return karasToReturn;
}

export async function removeTag(tids: string[], opt = {
	refresh: true, removeTagInKaras: true, deleteFile: true
}) {
	const tags: DBTagMini[] = [];
	for (const tid of tids) {
		const tag = await getTag(tid);
		if (tag) tags.push(tag);
	}
	let karasToRemoveTagIn: DBKara[];
	if (opt.removeTagInKaras) {
		karasToRemoveTagIn = await getKarasWithTags(tags);
	}
	if (tags.length === 0) throw {code: 404, msg: 'Tag ID unknown'};
	const removes = [];
	for (const tag of tags) {
		if (opt.deleteFile) removes.push(removeTagFile(tag.tagfile, tag.repository));
		if (opt.removeTagInKaras) removes.push(removeTagInKaras(tag, karasToRemoveTagIn));
	}
	await Promise.all(removes).catch(err => {
		logger.warn('Failed to remove tag files / tag from kara', {service: 'Tag', obj: err});
		// Non fatal
	});
	for (const tag of tags) {
		removeTagInStore(tag.tid);
	}
	saveSetting('baseChecksum', getStoreChecksum());
	await deleteTag(tags.map(tag => tag.tid));
	emitWS('statsRefresh');
	if (opt.refresh) {
		if (karasToRemoveTagIn.length > 0) await refreshKarasUpdate(karasToRemoveTagIn.map(k => k.kid));
		refreshTags();
	}
}

export async function integrateTagFile(file: string, refresh = true): Promise<string> {
	const tagFileData = await getDataFromTagFile(file);
	if (!tagFileData) return null;
	try {
		const tagDBData = await getTag(tagFileData.tid);
		if (tagDBData) {
			if (tagDBData.repository === tagFileData.repository && tagDBData.modified_at.toISOString() !== tagFileData.modified_at) {
				// Only edit if repositories are the same and modified_at are different.
				// Also refresh is always disabled for editing tags.
				await editTag(tagFileData.tid, tagFileData, { silent: true, refresh: false, repoCheck: true });
			}
			return tagFileData.name;
		} else {
			await addTag(tagFileData, { silent: true, refresh: refresh });
			return tagFileData.name;
		}
	} catch(err) {
		logger.error(`Error integrating tag file ${file}`, {service: 'Tags', obj: err});
	}
}


export async function consolidateTagsInRepo(kara: Kara) {
	profile('consolidateTagsInRepo');
	const copies = [];
	for (const tagType of Object.keys(tagTypes)) {
		if (kara[tagType]) {
			for (const karaTag of kara[tagType]) {
				const tag = await getTag(karaTag.tid);
				if (!tag) continue;
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
	}
	await Promise.all(copies);
	profile('consolidateTagsInRepo');
}

export async function copyTagToRepo(tid: string, repoName: string) {
	try {
		const tag = await getTag(tid);
		if (!tag) throw {code: 404};
		const repo = getRepo(repoName);
		if (!repo) throw {code: 404};
		tag.repository = repoName;
		const destDir = resolvedPathRepos('Tags', repoName)[0];
		await writeTagFile(tag, destDir);
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

async function replaceTagInKaras(oldTID1: string, oldTID2: string, newTag: Tag, karas: DBKara[]): Promise<string[]> {
	logger.info(`Replacing tag ${oldTID1} and ${oldTID2} by ${newTag.tid} in .kara.json files`, {service: 'Kara'});
	const modifiedKaras: string[] = [];
	for (const kara of karas) {
		kara.modified_at = new Date();
		for (const type of Object.keys(tagTypes)) {
			if (kara[type]?.find((t: DBTag) => t.tid === oldTID1) || kara[type]?.find((t: DBTag) => t.tid === oldTID2)) {
				kara[type] = kara[type].filter((t: any) => t.tid !== oldTID1 && t.tid !== oldTID2);
				kara[type].push(newTag);
			}
		}
		await editKara(kara, false);
	}
	return modifiedKaras;
}
