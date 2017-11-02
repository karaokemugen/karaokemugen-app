import logger from 'winston';
import {resolve, extname, basename} from 'path';

import {
	asyncExists, asyncReadDir, asyncRemove, asyncStat, resolveFileInDirs
} from '../_common/utils/files';
import {
	getConfig, resolvedPathVideos, resolvedPathPreviews
} from '../_common/utils/config';
import {createPreview} from '../_common/utils/ffmpeg';

async function extractVideoFiles(videoDir) {
	const videoFiles = [];
	const dirListing = await asyncReadDir(videoDir);
	for (const file of dirListing) {
		if (!file.startsWith('.') && (
			file.endsWith('.mp4') || 
			file.endsWith('.webm') ||
			file.endsWith('.avi') ||
			file.endsWith('.mkv'))) {
			videoFiles.push(resolve(videoDir, file));
		}
	}
	return videoFiles;
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

async function compareVideosPreviews(videofiles,previewfiles) {
	const previewFilesToCreate = [];
	for (const videofile of videofiles) {
		const videoStats = await asyncStat(videofile);		
		if (previewfiles.length == 0) {
			//Previewfiles is empty, let's create our preview
			previewFilesToCreate.push({
				videofile: videofile,
				previewfile: `${videofile}.${videoStats.size}`
			});
		} else {
			for (const previewfile of previewfiles) {
				const ext = extname(previewfile);
				const previewsize = ext.replace(/\./,'');
				if (previewfile.startsWith(videofile)) {	
					if (previewsize != videoStats.size)  {
					//If it's different, remove previewfile and create a new one
						await asyncRemove(previewfile);
						previewFilesToCreate.push({
							videofile: videofile,
							previewfile: `${videofile}.${videoStats.size}`
						});
					}
				} else {
				//No video found
					previewFilesToCreate.push({
						videofile: videofile,
						previewfile: `${videofile}.${videoStats.size}`
					});
				}
			}
		}
	}
	console.log('Previews to create : '+previewFilesToCreate);
	return previewFilesToCreate;
}
export async function createPreviews(config) {
	try {
		const conf = config || getConfig();		
		logger.info('[Previews] Starting preview generation');
		//TODO : Lire les dossiers vidéo depuis le dossier de configuration
		const videoFiles = await extractVideoFiles(resolve(conf.appPath,conf.PathVideos));
		const previewFiles = await extractPreviewFiles(resolvedPathPreviews());

		const videoFilesToPreview = await compareVideosPreviews(videoFiles,previewFiles);
		
		console.log(videoFilesToPreview);
	} catch (err) {
		logger.error(err);
	}
}