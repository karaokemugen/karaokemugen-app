import logger from 'winston';
import {resolve, extname, basename} from 'path';

import {
	asyncExists, asyncReadDir, asyncRemove, asyncStat
} from '../_common/utils/files';
import {
	getConfig, resolvedPathPreviews, resolvedPathVideos
} from '../_common/utils/config';
import {createPreview} from '../_common/utils/ffmpeg';

async function extractVideoFiles(videoDir) {	
	const dirListing = await asyncReadDir(videoDir);
	return dirListing.filter(file => !file.startsWith('.') && (
		file.endsWith('.mp4') || 
			file.endsWith('.webm') ||
			file.endsWith('.avi') ||
			file.endsWith('.mkv'))
	).map(file => resolve(videoDir, file));
}

async function extractPreviewFiles(previewDir) {
	const previewFiles = [];
	const dirListing = await asyncReadDir(previewDir);
	for (const file of dirListing) {
		if (!file.startsWith('.') && file.endsWith('.mp4')) {
			previewFiles.push(resolve(previewDir, file));
		}
	}
	return previewFiles;
}

export async function cleanUpPreviewsFolder(config) {
	const conf = config || getConfig();		
	logger.info('[Previews] Cleaning up preview generation');
	//TODO : Lire les dossiers vidéo depuis le dossier de configuration
	const videofiles = await extractVideoFiles(resolve(conf.appPath,conf.PathVideos));
	const previewfiles = await extractPreviewFiles(resolvedPathPreviews());		
	// Read all preview files
	// For each check if videofile exists
	// If not then delete preview file
	for (const previewfile of previewfiles) {
		let deletePreview = true;
		const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);		const size = previewparts[2];				
		const previewfileWOExt = basename(previewparts[1]);
		for (const videofile of videofiles) {
			const videofileWOExt = basename(videofile, extname(videofile));
			if (previewfileWOExt == videofileWOExt) {
				deletePreview = false;
				const videoStats = await asyncStat(videofile);	
				if (videoStats.size != size) {
					deletePreview = true;
				}
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
		const videoStats = await asyncStat(videofile);		
		const previewfileWOExt = basename(videofile, extname(videofile));
		const previewfilename = resolvedPathPreviews()+`/${previewfileWOExt}.${videoStats.size}.mp4`;		
		if (previewfiles.length != 0) {
			for (const previewfile of previewfiles) {
				const previewparts = previewfile.match(/^(.+)\.([0-9]+)\.([^.]+)$/);
				const size = previewparts[2];
				if (basename(previewparts[1]) === (basename(videofile).replace(/\.[^.]+$/, ''))) {
					if (size != videoStats.size)  {
					//If it's different, remove previewfile and create a new one
						asyncRemove(previewfile);						
					} else {
						addPreview = false;
					}
				} 
			}
		}
		if (addPreview) {
			previewFilesToCreate.push({
				videofile: videofile,
				previewfile: previewfilename
			});
		}		
	}	
	return previewFilesToCreate;
}
export async function isPreviewAvailable(videofile) {
	const videofilename = resolvedPathVideos()+`/${videofile}`;
	let videoStats;
	if (await asyncExists(videofilename)) {
		videoStats = await asyncStat(videofilename);		
	} else {
		logger.debug(`[Previews] Main videofile does not exist : ${videofilename}`)
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
		logger.info('[Previews] Starting preview generation');
		//TODO : Lire les dossiers vidéo depuis le dossier de configuration
		const videoFiles = await extractVideoFiles(resolve(conf.appPath,conf.PathVideos));
		const previewFiles = await extractPreviewFiles(resolvedPathPreviews());		
		const videoFilesToPreview = await compareVideosPreviews(videoFiles,previewFiles);
		
		for (const videoPreview of videoFilesToPreview) {
			await createPreview(videoPreview);
			logger.info(`[Previews] Generated ${videoPreview.videofile}`);
		}
		
		logger.info('[Previews] Finished generating all previews.');
	} catch (err) {
		logger.error(err);
	}
}