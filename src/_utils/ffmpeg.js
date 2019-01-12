import execa from 'execa';
import logger from 'winston';
import {asyncRequired} from './files';
import {getConfig} from './config';
import {timeToSeconds} from './date';

export async function extractSubtitles(videofile, extractfile) {
	await execa(getConfig().BinffmpegPath, ['-y', '-i', videofile, extractfile], {encoding: 'utf8'});

	// Verify if the subfile exists. If it doesn't, it means ffmpeg didn't extract anything
	return await asyncRequired(extractfile);
}

export async function createPreview(videopreview) {
	try {
		return await execa(getConfig().BinffmpegPath, ['-y', '-i', videopreview.videofile, '-ss', '0', '-c:v' , 'libx264', '-preset', 'ultrafast', '-tune', 'animation', '-vf', 'scale=-2:240', '-crf', '35', '-c:a', 'aac', '-b:a', '96k', '-threads', '1', '-t', '15', videopreview.previewfile], {encoding: 'utf8'});
	} catch(err) {
		logger.error(`[ffmpeg] Video ${videopreview.videofile} not generated : ${err.code} (${err.message}`);
		logger.error(`[ffmpeg] STDOUT: ${err.stdout}`);
		logger.error(`[ffmpeg] STDERR: ${err.stderr}`);
		throw err;
	}
}

export async function getMediaInfo(mediafile) {
	try {
		const result = await execa(getConfig().BinffmpegPath, ['-i', mediafile, '-vn', '-af', 'replaygain', '-f','null', '-'], { encoding : 'utf8' });
		const outputArray = result.stderr.split(' ');
		const indexTrackGain = outputArray.indexOf('track_gain');
		const indexDuration = outputArray.indexOf('Duration:');
		let audiogain = 0;
		let duration = 0;
		let error = false;
		if (indexTrackGain > -1) {
			let gain = parseFloat(outputArray[indexTrackGain + 2]);
			audiogain = gain.toString();
		} else {
			error = true;
		}

		if (indexDuration > -1) {
			duration = outputArray[indexDuration + 1].replace(',','');
			duration = timeToSeconds(duration);
		} else {
			error = true;
		}

		return {
			duration: duration,
			audiogain: audiogain,
			error: error
		};
	} catch(err) {
		console.log(err);
		logger.warn(`[ffmpeg] Video '${mediafile}' probe error : '${err.code}'`);
		return { duration: 0, audiogain: 0, error: true };
	}
}