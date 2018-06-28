import logger from 'winston';
import {resolve, extname, basename} from 'path';

import {
	resolveFileInDirs, asyncExists, asyncReadDir, asyncRemove, asyncStat
} from '../_common/utils/files';
import {
	getConfig, resolvedPathPreviews, resolvedPathMedias
} from '../_common/utils/config';
import {createPreview} from '../_common/utils/ffmpeg';

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
			size: await asyncStat(video)
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

async function compareVideosPreviews(videofiles,previewfiles) {
	const previewFilesToCreate = [];
	for (const videofile of videofiles) {
		let addPreview = true;
		const previewfileWOExt = basename(videofile.file, extname(videofile.file));
		const previewfilename = resolvedPathPreviews()+`/${previewfileWOExt}.${videofile.size}.mp4`;
		if (previewfiles.length > 0) {
			for (const previewfile of previewfiles) {
				const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);
				const size = previewparts[2];
				if (basename(previewparts[1]).toLowerCase() === (basename(videofile.file).toLowerCase().replace(/\.[^.]+$/, ''))) {
					if (size !== videofile.size)  {
					//If it's different, remove previewfile and create a new one
						logger.debug(`[Previews] Preview ${previewfile} is different in size. V: ${videofile.size} P: ${size}`);
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
	const videofilename = await resolveFileInDirs(videofile, resolvedPathMedias());
	let videoStats;
	if (await asyncExists(videofilename)) {
		videoStats = await asyncStat(videofilename);		
	} else {
		logger.debug(`[Previews] Main videofile does not exist : ${videofilename}`);
		return undefined;
	}	
	const previewfileWOExt = basename(videofilename, extname(videofilename));
	const previewfilename = resolvedPathPreviews()+`/${previewfileWOExt}.${videoStats.size}.mp4`;	
	if (await asyncExists(previewfilename)) {
		return basename(previewfilename);
	} else {
		return undefined;
	}
}
export async function createPreviews(config) {
	try {
		const conf = config || getConfig();		
		logger.debug('[Previews] Starting preview generation');
		const videoFiles = await extractVideoFiles(resolve(conf.appPath,conf.PathMedias));
		logger.debug('[Previews] Number of videos '+videoFiles.length);
		const previewFiles = await extractPreviewFiles(resolvedPathPreviews());		
		logger.debug('[Previews] Number of previews '+previewFiles.length);
		const videoFilesToPreview = await compareVideosPreviews(videoFiles,previewFiles);
		logger.debug('[Previews] Number of previews to generate '+videoFilesToPreview.length);
		for (const videoPreview of videoFilesToPreview) {
			await createPreview(videoPreview);
			logger.debug(`[Previews] Generated preview for ${videoPreview.videofile}`);
		}
		
		if (videoFilesToPreview.length > 0) {
			logger.info(`[Previews] Finished generating ${videoFilesToPreview.length} previews`);
		} else {
			logger.debug('[Previews] No preview to generate');
		}
	} catch (err) {
		logger.error(err);
	}
}