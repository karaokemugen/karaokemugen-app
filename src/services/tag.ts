import { promises as fs } from 'fs';
import internetAvailable from 'internet-available';
import { basename, dirname, resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import {
	addTagToStore,
	editKaraInStore,
	editTagInStore,
	getStoreChecksum,
	removeTagInStore,
	sortKaraStore,
	sortTagsStore,
} from '../dao/dataStore';
import { deleteTag, insertTag, selectAllTags, updateKaraTagsTID, updateTag } from '../dao/tag';
import { removeTagInKaras } from '../dao/tagfile';
import { saveSetting } from '../lib/dao/database';
import { refreshKarasUpdate } from '../lib/dao/kara';
import { formatKaraV4 } from '../lib/dao/karafile';
import { convertToDBTag, refreshTags, updateTagSearchVector } from '../lib/dao/tag';
import { formatTagFile, getDataFromTagFile, removeTagFile, trimTagData, writeTagFile } from '../lib/dao/tagfile';
import { refreshKarasAfterDBChange } from '../lib/services/karaManagement';
import { DBKara, DBKaraTag } from '../lib/types/database/kara';
import { DBTag, DBTagMini } from '../lib/types/database/tag';
import { Kara, KaraFileV4 } from '../lib/types/kara.d';
import { Tag, TagFile, TagParams } from '../lib/types/tag';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { getTagTypeName, tagTypes } from '../lib/utils/constants';
import { listAllFiles, resolveFileInDirs, sanitizeFile } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getKaras } from './kara';
import { editKara } from './karaCreation';
import { getRepo, getRepos } from './repo';

const service = 'Tag';

export function formatTagList(tagList: DBTag[], from: number, count: number) {
	return {
		infos: {
			count,
			from,
			to: from + tagList.length,
		},
		content: tagList,
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

export async function addTag(tagObj: Tag, opts = { silent: false, refresh: true }): Promise<Tag> {
	let task: Task;
	if (!opts.silent) {
		task = new Task({
			text: 'CREATING_TAG_IN_PROGRESS',
			subtext: tagObj.name,
		});
	}
	try {
		tagObj = trimTagData(tagObj);
		if (!tagObj.tid) tagObj.tid = uuidV4();
		if (!tagObj.tagfile) tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tagObj.tid.substring(0, 8)}.tag.json`;
		const tagfile = tagObj.tagfile;

		const promises = [insertTag(tagObj), writeTagFile(tagObj, resolvedPathRepos('Tags', tagObj.repository)[0])];
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
	} catch (err) {
		sentry.error(err);
		throw err;
	} finally {
		if (!opts.silent) task.end();
	}
}

/** Takes any number of arguments to comply with KM Server's multi-argument getTag */
export async function getTag(tid: string, ..._: any) {
	const tags = await selectAllTags({ tid });
	return tags[0];
}

export function getTagNameInLanguage(tag: DBKaraTag, langs: string[]): string {
	let result: string;
	for (const lang of langs) {
		if (result) break;
		if (tag.i18n) {
			result = tag.i18n[lang];
		}
	}
	if (!result) result = tag.name;
	return result;
}

export async function mergeTags(tid1: string, tid2: string) {
	const task = new Task({
		text: 'MERGING_TAGS_IN_PROGRESS',
	});
	try {
		const [tag1, tag2] = await Promise.all([getTag(tid1), getTag(tid2)]);
		if (!tag1 || !tag2) throw { code: 404 };
		task.update({
			subtext: `${tag1.name} + ${tag2.name}`,
		});
		let types = [].concat(tag1.types, tag2.types);
		let aliases = [].concat(tag1.aliases, tag2.aliases);
		// Remove duplicates after we concatenated everything.
		types = types.filter((e, pos) => types.indexOf(e) === pos);
		aliases = aliases.filter((e, pos) => aliases.indexOf(e) === pos);
		if (aliases[0] === null) aliases = null;
		const i18n = { ...tag2.i18n, ...tag1.i18n };
		const tid = uuidV4();
		let tagObj: Tag = {
			tid,
			name: tag1.name,
			types,
			i18n,
			short: tag1.short,
			aliases,
			repository: tag1.repository,
			noLiveDownload: tag1.noLiveDownload || tag2.noLiveDownload,
			karafile_tag: tag1.karafile_tag || tag2.karafile_tag,
			priority: tag1.priority,
			external_database_ids:
				tag1.external_database_ids == null && tag2.external_database_ids == null
					? null
					: { ...tag1.external_database_ids, ...tag2.external_database_ids },
		};
		tagObj = await addTag(tagObj, { silent: true, refresh: false });
		const newTagFiles = resolve(resolvedPathRepos('Tags', tagObj.repository)[0], tagObj.tagfile);
		await addTagToStore(newTagFiles);
		sortTagsStore();
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
			removeTagInStore(tid2),
		]);
		let karas = await getKarasWithTags([tag1, tag2, tagObj as any]);
		await replaceTagInKaras(tid1, tid2, tagObj, karas);
		karas = await getKarasWithTags([tagObj as any]);
		const karasData: Kara[] = [];
		for (const kara of karas) {
			const karafile = await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository));
			await editKaraInStore(karafile[0]);
			karasData.push(formatKaraV4(kara).data);
		}
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
		await refreshTags();
		return tagObj;
	} catch (err) {
		logger.error(`Error merging tag ${tid1} and ${tid2}`, { service, obj: err });
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function editTag(
	tid: string,
	tagObj: Tag,
	opts = { silent: false, refresh: true, repoCheck: true, writeFile: true }
) {
	let task: Task;
	if (!opts.silent) {
		task = new Task({
			text: 'EDITING_TAG_IN_PROGRESS',
			subtext: tagObj.name,
		});
	}
	try {
		profile('editTag');
		const oldTag = await getTag(tid);
		if (!oldTag) throw { code: 404, msg: `Tag ID ${tid} unknown` };
		if (opts.repoCheck && oldTag.repository !== tagObj.repository) {
			throw { code: 409, msg: 'Tag repository cannot be modified. Use copy function instead' };
		}
		tagObj = trimTagData(tagObj);
		tagObj.tagfile = `${sanitizeFile(tagObj.name)}.${tid.substring(0, 8)}.tag.json`;
		await updateTag(tagObj);
		if (opts.writeFile) {
			// Try to find old tag
			let oldTagFiles = [];
			let oldTagPath: string;
			try {
				oldTagFiles = await resolveFileInDirs(oldTag.tagfile, resolvedPathRepos('Tags', oldTag.repository));
				oldTagPath = dirname(oldTagFiles[0]);
			} catch (err) {
				// Non fatal, couldn't find old tag file. We're just goign to update it and write the new one.
				oldTagPath = resolvedPathRepos('Tags', oldTag.repository)[0];
			}
			// FS stuff
			const promises = [];
			promises.push(writeTagFile(tagObj, oldTagPath));
			if (oldTag.tagfile !== tagObj.tagfile) {
				promises.push(
					fs.unlink(oldTagFiles[0]).catch(() => {
						// Non fatal. Can be triggered if the tag file has already been removed.
					})
				);
			}
			await Promise.all(promises);
			const newTagFiles = await resolveFileInDirs(tagObj.tagfile, resolvedPathRepos('Tags', tagObj.repository));
			// If the old and new paths are different, it means we copied it to a new repository
			if (oldTagFiles[0] && oldTagFiles[0] !== newTagFiles[0]) {
				await addTagToStore(newTagFiles[0]);
				removeTagInStore(oldTagFiles[0]);
			} else {
				await editTagInStore(newTagFiles[0]);
			}
			sortTagsStore();
			saveSetting('baseChecksum', getStoreChecksum());
		}
		if (opts.refresh) {
			const karasToUpdate = await getKarasWithTags([oldTag]);
			// We need to check if types have been removed from the new tag. If so, we edit all karas with that tag/type to remove them
			const newDBTag = convertToDBTag(tagObj);
			for (const oldType of oldTag.types) {
				const tagTypeName = getTagTypeName(oldType);
				if (!newDBTag.types.includes(oldType)) {
					const karasToRemoveTagIn = karasToUpdate.filter(k =>
						k[tagTypeName].find((t: DBKaraTag) => t.tid === newDBTag.tid)
					);
					if (karasToRemoveTagIn.length > 0) {
						for (const kara of karasToRemoveTagIn) {
							kara[tagTypeName] = kara[tagTypeName].filter((t: DBKaraTag) => t.tid !== newDBTag.tid);
							await editKara({ kara: formatKaraV4(kara) }, false);
						}
					}
				}
			}
			await updateTagSearchVector();
			const karasData = karasToUpdate.map(k => formatKaraV4(k).data);
			await refreshKarasAfterDBChange('UPDATE', karasData);
			refreshTags();
		}
	} catch (err) {
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
			karaPromises.push(
				getKaras({
					q: `t:${tag.tid}~${type}`,
					ignoreCollections: true,
				})
			);
		}
	}
	const karas = await Promise.all(karaPromises);
	for (const karaList of karas) {
		karasToReturn = [].concat(karasToReturn, karaList.content);
	}
	return karasToReturn;
}

export async function removeTag(
	tids: string[],
	opt = {
		refresh: true,
		removeTagInKaras: true,
		deleteFile: true,
	}
) {
	const tags: DBTagMini[] = [];
	for (const tid of tids) {
		const tag = await getTag(tid);
		if (tag) tags.push(tag);
	}
	let karasToRemoveTagIn: DBKara[];
	if (opt.removeTagInKaras) {
		karasToRemoveTagIn = await getKarasWithTags(tags);
	}
	if (tags.length === 0) {
		logger.error(`These tags are unknown : ${tids.toString()}`, { service });
		throw { code: 404, msg: 'Tag ID unknown' };
	}
	const removes = [];
	for (const tag of tags) {
		if (opt.deleteFile) removes.push(removeTagFile(tag.tagfile, tag.repository));
		if (opt.removeTagInKaras) removes.push(removeTagInKaras(tag, karasToRemoveTagIn));
	}
	await Promise.all(removes).catch(err => {
		logger.warn('Failed to remove tag files / tag from kara', { service, obj: err });
		// Non fatal
	});
	saveSetting('baseChecksum', getStoreChecksum());
	await deleteTag(tags.map(tag => tag.tid));
	for (const tag of tags) {
		removeTagInStore(tag.tid);
		logger.debug(`Removed tag ${tag.tid} (${tag.name})`, { service });
	}
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
		logger.debug(`Integrating tag ${tagFileData.tid} (${tagFileData.name})`, { service });
		const tagDBData = await getTag(tagFileData.tid);
		if (tagDBData) {
			if (tagDBData.repository === tagFileData.repository) {
				// Refresh always disabled for editing tags.
				await editTag(tagFileData.tid, tagFileData, {
					silent: true,
					refresh: false,
					repoCheck: true,
					writeFile: false,
				});
			}
			return tagFileData.name;
		}
		await addTag(tagFileData, { silent: true, refresh });
		return tagFileData.name;
	} catch (err) {
		logger.error(`Error integrating tag file ${file}`, { service, obj: err });
	}
}

export async function consolidateTagsInRepo(kara: KaraFileV4) {
	profile('consolidateTagsInRepo');
	const copies = [];
	for (const tagType of Object.keys(tagTypes)) {
		if (kara.data.tags[tagType]) {
			for (const karaTag of kara.data.tags[tagType]) {
				const tag = await getTag(karaTag);
				if (!tag) continue;
				if (tag.repository !== kara.data.repository) {
					// This might need to be copied
					tag.repository = kara.data.repository;
					const destPath = resolvedPathRepos('Tags', tag.repository);
					const tagFile = `${sanitizeFile(tag.name)}.${tag.tid.substring(0, 8)}.tag.json`;
					try {
						await resolveFileInDirs(tagFile, destPath);
					} catch {
						// File doe snot exist, let's write it.
						copies.push(writeTagFile(tag, destPath[0]));
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
		if (!tag) throw { code: 404 };
		const repo = getRepo(repoName);
		if (!repo) throw { code: 404 };
		tag.repository = repoName;
		const destDir = resolvedPathRepos('Tags', repoName)[0];
		await writeTagFile(tag, destDir);
	} catch (err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

async function replaceTagInKaras(oldTID1: string, oldTID2: string, newTag: Tag, karas: DBKara[]) {
	logger.info(
		`Replacing tag ${oldTID1} and ${oldTID2} by ${newTag.tid} in kara(s) ${karas.map(k => k.kid).join(', ')}`,
		{ service }
	);
	for (const kara of karas) {
		kara.modified_at = new Date();
		for (const type of Object.keys(tagTypes)) {
			if (
				kara[type]?.find((t: DBTag) => t.tid === oldTID1) ||
				kara[type]?.find((t: DBTag) => t.tid === oldTID2)
			) {
				kara[type] = kara[type].filter((t: any) => t.tid !== oldTID1 && t.tid !== oldTID2);
				kara[type].push(newTag);
			}
		}
		await editKara({
			kara: formatKaraV4(kara),
		});
	}
}

export async function syncTagsFromRepo(repoSourceName: string, repoDestName: string) {
	const repos = getConfig().System.Repositories;
	const repoSource = repos.find(r => r.Name === repoSourceName);
	const repoDest = repos.find(r => r.Name === repoDestName);
	if (!repoSource || !repoDest) throw { code: 404 };
	logger.info(`Syncing tags in repo ${repoDestName} from repo ${repoSourceName}`, { service });
	const [sourceFiles, destFiles] = await Promise.all([
		listAllFiles('Tags', repoSourceName),
		listAllFiles('Tags', repoDestName),
	]);
	const sourceTags = new Map<string, { tag: TagFile; file: string }>();
	let modifiedTags = false;
	for (const sourceFile of sourceFiles) {
		const tagData = await fs.readFile(sourceFile, 'utf-8');
		const tag: TagFile = JSON.parse(tagData);
		sourceTags.set(tag.tag.tid, {
			tag,
			file: sourceFile,
		});
	}
	for (const destFile of destFiles) {
		const tagData = await fs.readFile(destFile, 'utf-8');
		const tag: TagFile = JSON.parse(tagData);
		const sourceTag = sourceTags.get(tag.tag.tid);
		// We do this so JSON.stringifying tags later actually can return the same stuff.
		if (sourceTag) sourceTag.tag.tag.repository = repoDestName;
		if (sourceTag && JSON.stringify(tag) !== JSON.stringify(sourceTag.tag)) {
			modifiedTags = true;
			// Filename might have changed because someone thought it'd be funny to change the tag's name (cue in "this would not happen if we used UUIDS", Axel's hit song from 2021. It even won a Grammy Award, would you believe that.)
			let newDestFile = destFile;
			if (basename(destFile) !== basename(sourceTag.file)) {
				const destDir = resolvedPathRepos('Tags', repoDestName);
				newDestFile = resolve(destDir[0], basename(sourceTag.file));
				await fs.writeFile(newDestFile, JSON.stringify(sourceTag.tag, null, 2), 'utf-8');
				await fs.unlink(destFile);
				removeTagInStore(destFile);
				addTagToStore(newDestFile);
			} else {
				// No change in filename, let's just overwrite destFile
				await fs.writeFile(newDestFile, JSON.stringify(sourceTag.tag, null, 2), 'utf-8');
				editTagInStore(newDestFile);
			}
			const dbTag = await getTag(sourceTag.tag.tag.tid);
			if (dbTag.repository === repoDestName) {
				// Tag in DB is the one from our dest repository, so we're going to edit it.
				editTag(sourceTag.tag.tag.tid, await getDataFromTagFile(newDestFile), {
					silent: false,
					refresh: true,
					writeFile: false,
					repoCheck: false,
				});
			}
			logger.info(`Updated ${basename(destFile)} in repo ${repoDestName} from repo ${repoSourceName}`, {
				service,
			});
		}
	}
	if (modifiedTags) {
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
	}
}

export async function checkCollections() {
	const internet = await (async () => {
		try {
			await internetAvailable();
			return true;
		} catch (err) {
			return false;
		}
	})();
	const availableCollections: DBTag[] = [];
	for (const repo of getRepos()) {
		if (repo.Enabled) {
			if (repo.Online && internet) {
				try {
					const tags = (await HTTP.get(`https://${repo.Name}/api/karas/tags?type=${tagTypes.collections}`))
						.data;
					for (const tag of tags.content) {
						if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
					}
				} catch (err) {
					// Fallback to what the repository has locally
					const tags = await getTags({ type: tagTypes.collections });
					for (const tag of tags.content) {
						if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
					}
				}
			} else {
				const tags = await getTags({ type: tagTypes.collections });
				for (const tag of tags.content) {
					if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
				}
			}
		}
	}
	return availableCollections;
}
