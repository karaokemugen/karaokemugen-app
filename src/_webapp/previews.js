import logger from 'winston';
import {resolve, extname, basename} from 'path';

import {
	resolveFileInDirs, asyncExists, asyncReadDir, asyncRemove, asyncStat
} from '../_utils/files';
import {
	getConfig, resolvedPathPreviews, resolvedPathMedias
} from '../_utils/config';
import {createPreview} from '../_utils/ffmpeg';

async function extractVideoFiles(videoDir) {
	let dirListing = [];
	for (const dir of videoDir.split('|')) {
		const files = await asyncReadDir(dir);
		files.forEach((file, index) => {
			files[index] = resolve(dir,file);
		});
		dirListing = dirListing.concat(files);
	}
	let videoFiles = [];
	dirListing = dirListing.filter(file => !file.startsWith('.') && (
		file.endsWith('.mp4') ||
			file.endsWith('.webm') ||
			file.endsWith('.avi') ||
			file.endsWith('.mkv'))
	);
	for (const video of dirListing) {
		videoFiles.push({
			file: video,
			stat: await asyncStat(video)
		});
	}
	return videoFiles;
}

async function extractPreviewFiles(previewDir) {
	const previewFiles = [];
	const dirListing = await asyncReadDir(previewDir);
	for (const file of dirListing) {
		if (!file.startsWith('.') && (!file.startsWith('output')) && file.endsWith('.mp4')) previewFiles.push(resolve(previewDir, file));
	}
	return previewFiles;
}


export async function cleanUpPreviewsFolder(config) {
	const conf = config || getConfig();
	logger.debug('[Previews] Cleaning up preview generation');
	const videofiles = await extractVideoFiles(resolve(conf.appPath,conf.PathMedias));
	const previewfiles = await extractPreviewFiles(resolvedPathPreviews());
	// Read all preview files
	// For each check if videofile exists
	// If not then delete preview file
	for (const previewfile of previewfiles) {
		let deletePreview = true;
		const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);
		const size = previewparts[2];
		const previewfileWOExt = basename(previewparts[1]);
		for (const videofile of videofiles) {
			const videofileWOExt = basename(videofile.file, extname(videofile.file));
			if (previewfileWOExt.toLowerCase() === videofileWOExt.toLowerCase()) {
				deletePreview = false;
				const videoStats = await asyncStat(videofile.file);
				if (videoStats.size !== +size) deletePreview = true;
			}
		}
		if (deletePreview) {
			asyncRemove(previewfile);
			logger.debug(`[Previews] Cleaned up ${previewfile}`);
		}
	}
}

async function compareVideosPreviews(videofiles,previewfiles) {
	const previewFilesToCreate = [];
	for (const videofile of videofiles) {
		let addPreview = true;
		const previewfileWOExt = basename(videofile.file, extname(videofile.file));
		const previewfilename = resolvedPathPreviews()+`/${previewfileWOExt}.${videofile.stat.size}.mp4`;
		if (previewfiles.length > 0) {
			for (const previewfile of previewfiles) {
				const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);
				const size = previewparts[2];
				if (basename(previewparts[1]).toLowerCase() === (basename(videofile.file).toLowerCase().replace(/\.[^.]+$/, ''))) {
					if (+size !== videofile.stat.size)  {
					//If it's different, remove previewfile and create a new one
						logger.debug(`[Previews] Preview ${previewfile} is different in size. V: ${videofile.stat.size} P: ${size}`);
						asyncRemove(previewfile);
					} else {
						addPreview = false;
					}
				}
			}
		}
		if (addPreview) {
			previewFilesToCreate.push({
				videofile: videofile.file,
				previewfile: previewfilename
			});
		}
	}
	return previewFilesToCreate;
}
export async function isPreviewAvailable(videofile) {
	try {
		const videofilename = await resolveFileInDirs(videofile, resolvedPathMedias());
		let videoStats;
		videoStats = await asyncStat(videofilename);
		const previewfileWOExt = basename(videofilename, extname(videofilename));
		const previewfilename = resolve(resolvedPathPreviews(),`${previewfileWOExt}.${videoStats.size}.mp4`);
		await asyncExists(previewfilename);
		return basename(previewfilename);
	} catch(err) {
		//This is not a fatal error.
		return undefined;
	}
}

export async function createPreviews(config) {
	const conf = config || getConfig();
	logger.debug('[Previews] Starting preview generation');
	const videoFiles = await extractVideoFiles(resolve(conf.appPath,conf.PathMedias));
	logger.debug('[Previews] Number of videos '+videoFiles.length);
	const previewFiles = await extractPreviewFiles(resolvedPathPreviews());
	logger.debug('[Previews] Number of previews '+previewFiles.length);
	await cleanUpPreviewsFolder(conf);
	const videoFilesToPreview = await compareVideosPreviews(videoFiles,previewFiles);
	logger.debug('[Previews] Number of previews to generate '+videoFilesToPreview.length);
	for (const videoPreview of videoFilesToPreview) {
		try {
			await createPreview(videoPreview);
			logger.debug(`[Previews] Generated preview for ${videoPreview.videofile}`);
		} catch (err) {
			logger.error(`[Previews] Generation error for ${videoPreview.videofile} : ${err}`);
		}
	}

	if (videoFilesToPreview.length > 0) {
		logger.info(`[Previews] Finished generating ${videoFilesToPreview.length} previews`);
	} else {
		logger.debug('[Previews] No preview to generate');
	}
}