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
} from '../dao/dataStore.js';
import { deleteTag, insertTag, selectAllTags, selectKarasUsingTag, updateKaraTagsTID, updateTag } from '../dao/tag.js';
import { removeTagInKaras } from '../dao/tagfile.js';
import { saveSetting } from '../lib/dao/database.js';
import { refreshKarasUpdate } from '../lib/dao/kara.js';
import { formatKaraV4 } from '../lib/dao/karafile.js';
import { setDefaultCollections } from '../lib/dao/repo.js';
import { convertToDBTag, refreshTags, updateTagSearchVector } from '../lib/dao/tag.js';
import { defineTagFilename, getDataFromTagFile, removeTagFile, trimTagData, writeTagFile } from '../lib/dao/tagfile.js';
import { refreshKarasAfterDBChange } from '../lib/services/karaManagement.js';
import { DBKara, DBKaraTag } from '../lib/types/database/kara.js';
import { DBTag } from '../lib/types/database/tag.js';
import { Tag, TagFile, TagParams } from '../lib/types/tag.js';
import { getConfig, resolvedPathRepos } from '../lib/utils/config.js';
import { getTagTypeName, tagTypes } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import { listAllFiles, resolveFileInDirs } from '../lib/utils/files.js';
import HTTP from '../lib/utils/http.js';
import logger, { profile } from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { isUUID } from '../lib/utils/validators.js';
import { emitWS } from '../lib/utils/ws.js';
import sentry from '../utils/sentry.js';
import { getKaras } from './kara.js';
import { editKara } from './karaCreation.js';
import { getRepoMetadata, getRepos } from './repo.js';
import { applyTagHooks } from '../lib/dao/hook.js';

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
	try {
		profile('getTags');
		const tags = await selectAllTags(params);
		const count = tags.length > 0 ? tags[0].count : 0;
		const ret = formatTagList(tags, params.from || 0, count);
		return ret;
	} catch (err) {
		logger.error(`Error getting tags : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAGS_LIST_ERROR');
	} finally {
		profile('getTags');
	}
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
		if (!tagObj.tagfile) tagObj.tagfile = defineTagFilename(tagObj);
		const tagfile = tagObj.tagfile;
		await applyTagHooks(tagObj);
		const promises = [insertTag(tagObj), writeTagFile(tagObj, resolvedPathRepos('Tags', tagObj.repository)[0])];
		await Promise.all(promises);
		emitWS('statsRefresh');
		const newTagFiles = await resolveFileInDirs(tagfile, resolvedPathRepos('Tags', tagObj.repository));
		await addTagToStore(newTagFiles[0]);
		sortTagsStore();
		saveSetting('baseChecksum', getStoreChecksum());

		if (opts.refresh) {
			await updateTagSearchVector();
			refreshTags();
		}
		// Re-add tagfile since it's been removed by writeTagFile
		tagObj.tagfile = tagfile;
		return tagObj;
	} catch (err) {
		logger.error(`Error creating tag : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAG_CREATE_ERROR');
	} finally {
		if (!opts.silent) task.end();
	}
}

export async function getTag(tid: string, throwOnMissingTag = true) {
	try {
		const tags = await selectAllTags({ tid });
		if (!tags[0]) throw new ErrorKM('UNKNOWN_TAG', 404, false);
		return tags[0];
	} catch (err) {
		if (!throwOnMissingTag) return;
		logger.error(`Error getting tags : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAG_GET_ERROR');
	}
}

export async function mergeTags(tid1: string, tid2: string) {
	const task = new Task({
		text: 'MERGING_TAGS_IN_PROGRESS',
	});
	try {
		if (!isUUID(tid1) || !isUUID(tid2)) throw new ErrorKM('INVALID_DATA', 400, false);
		const [tag1, tag2] = await Promise.all([getTag(tid1), getTag(tid2)]);
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
		const tagObj: Tag = {
			tid: tag1.tid,
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
				!tag1.external_database_ids && !tag2.external_database_ids
					? null
					: { ...tag1.external_database_ids, ...tag2.external_database_ids },
		};
		await editTag(tag1.tid, tagObj, { silent: true, refresh: false, repoCheck: false, writeFile: true });
		const tagFile = await resolveFileInDirs(tag1.tagfile, resolvedPathRepos('Tags', tag1.repository));
		await editTagInStore(tagFile[0]);
		sortTagsStore();
		// We're not asyncing these because after the first one passes, if the new TID already has the same songs registered in the kara_tag table, it'll break the unique constraint on the table and destroy the universe.
		// So we don't do that.
		// The query updates only rows where KIDs aren't already listed as belonging to the new TID.
		// The remaining rows will disappear thanks to the removal of the old TIDs just after, thanks to ON DELETE CASCADE.
		let karas = await getKarasWithTags([tag2]);
		await updateKaraTagsTID(tid2, tagObj.tid);
		await Promise.all([deleteTag([tid2]), removeTagFile(tag2.tagfile, tag2.repository), removeTagInStore(tid2)]);
		if (karas.length > 0) {
			await replaceTagInKaras(tid2, tagObj, karas);
			karas = await getKarasWithTags([tagObj]);
			for (const kara of karas) {
				const karafile = await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository));
				await editKaraInStore(karafile[0]);
			}
			sortKaraStore();
			saveSetting('baseChecksum', getStoreChecksum());
		}
		await refreshTags();
		return tagObj;
	} catch (err) {
		logger.error(`Error getting tags : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAGS_MERGED_ERROR');
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
		if (!isUUID(tid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const oldTag = await getTag(tid);
		if (opts.repoCheck && oldTag.repository !== tagObj.repository) {
			throw new ErrorKM('TAG_REPOSITORY_INVALID_CHANGE', 400, false);
		}
		tagObj = trimTagData(tagObj);
		tagObj.tagfile = defineTagFilename(tagObj, oldTag);
		await applyTagHooks(tagObj);
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
			const tagfile = tagObj.tagfile;
			promises.push(writeTagFile(tagObj, oldTagPath));
			if (oldTag.tagfile !== tagfile) {
				promises.push(
					fs.unlink(oldTagFiles[0]).catch(() => {
						// Non fatal. Can be triggered if the tag file has already been removed.
					})
				);
			}
			await Promise.all(promises);
			const newTagFiles = await resolveFileInDirs(tagfile, resolvedPathRepos('Tags', tagObj.repository));
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
		logger.error(`Error editing tag ${tid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAG_EDIT_ERROR');
	} finally {
		profile('editTag');
		if (!opts.silent) task.end();
	}
}

async function getKarasWithTags(tags: DBTag[]): Promise<DBKara[]> {
	let tagsWithTypes = '';
	for (const tag of tags) {
		for (const type of tag.types) {
			tagsWithTypes = `${tagsWithTypes},${tag.tid}~${type}`;
		}
	}
	const karas = await getKaras({
		q: `at:${tagsWithTypes}`,
		ignoreCollections: true,
	});
	return karas.content;
}

export async function removeTag(
	tids: string[],
	opt = {
		refresh: true,
		removeTagInKaras: true,
		deleteFile: true,
	}
) {
	try {
		const tags: DBTag[] = [];
		for (const tid of tids) {
			const tag = await getTag(tid);
			tags.push(tag);
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
	} catch (err) {
		logger.error(`Error deleting tags : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAG_DELETE_ERROR');
	}
}

export async function integrateTagFile(file: string, refresh = true): Promise<string> {
	const tagFileData = await getDataFromTagFile(file);
	if (!tagFileData) return null;
	try {
		logger.debug(`Integrating tag ${tagFileData.tid} (${tagFileData.name})`, { service });
		// This is allowed to fail
		const tagDBData = await getTag(tagFileData.tid, false);
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

export async function copyTagToRepo(tid: string, repoName: string) {
	try {
		if (!isUUID(tid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const tag = await getTag(tid);
		tag.repository = repoName;
		const destDir = resolvedPathRepos('Tags', repoName)[0];
		await writeTagFile(tag, destDir);
	} catch (err) {
		logger.error(`Error copying tag ${tid} to ${repoName} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('TAG_COPIED_ERROR');
	}
}

async function replaceTagInKaras(oldTID: string, newTag: Tag, karas: DBKara[]) {
	logger.info(`Replacing tag ${oldTID} by ${newTag.tid} in kara(s) ${karas.map(k => k.kid).join(', ')}`, { service });
	for (const kara of karas) {
		kara.modified_at = new Date();
		for (const type of Object.keys(tagTypes)) {
			if (kara[type]?.find((t: DBTag) => t.tid === oldTID)) {
				kara[type] = kara[type].filter((t: any) => t.tid !== oldTID);
				if (!kara[type].find((t: DBTag) => t.tid === newTag.tid)) kara[type].push(newTag);
			}
		}
		await editKara(
			{
				kara: formatKaraV4(kara),
			},
			false
		);
	}
	await refreshKarasAfterDBChange(
		'UPDATE',
		karas.map(k => formatKaraV4(k).data)
	);
}

export async function syncTagsFromRepo(repoSourceName: string, repoDestName: string) {
	try {
		const repos = getConfig().System.Repositories;
		const repoSource = repos.find(r => r.Name === repoSourceName);
		const repoDest = repos.find(r => r.Name === repoDestName);
		if (!repoSource || !repoDest) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
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
	} catch (err) {
		logger.error(`Error syncing tags for repo ${repoSourceName} to ${repoDestName} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('REPO_SYNC_TAGS_ERROR');
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
	try {
		const availableCollections: DBTag[] = [];
		for (const repo of getRepos()) {
			if (repo.Enabled) {
				if (repo.Online && internet) {
					try {
						const [tags, manifest] = await Promise.all([
							HTTP.get(
								`${repo.Secure ? 'https' : 'http'}://${repo.Name}/api/karas/tags?type=${
									tagTypes.collections
								}`
							),
							getRepoMetadata(repo),
						]);
						for (const tag of tags.data.content) {
							if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
						}
						setDefaultCollections(manifest.Manifest);
					} catch (err) {
						// Fallback to what the repository has locally
						const tags = await getTags({ type: [tagTypes.collections] });
						for (const tag of tags.content) {
							if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
						}
					}
				} else {
					const tags = await getTags({ type: [tagTypes.collections] });
					for (const tag of tags.content) {
						if (!availableCollections.find(t => t.tid === tag.tid)) availableCollections.push(tag);
					}
				}
			}
		}
		return availableCollections;
	} catch (err) {
		logger.error(`Error getting collections : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('COLLECTIONS_GET_ERROR');
	}
}

export async function getKarasUsingTag(tid: string) {
	const tids = await selectKarasUsingTag(tid);
	return tids.rows;
}