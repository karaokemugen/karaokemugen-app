import {spawn, spawnSync} from 'child_process';
import logger from 'winston';
import {asyncRequired} from './files';
import {getConfig} from './config';
import probe from '../modules/node-ffprobe';

export async function extractSubtitles(videofile, extractfile, config) {

	const conf = config || getConfig();

	spawnSync(conf.BinffmpegPath, ['-y', '-i', videofile, extractfile], {encoding: 'utf8'});

	// Verify if the subfile exists. If it doesn't, it means ffmpeg didn't extract anything
	await asyncRequired(extractfile);
}

export async function createPreview(videopreview, config) {

	const conf = config || getConfig();
	return new Promise((resolve) => {
		const proc = spawn(conf.BinffmpegPath, ['-y', '-ss', '0', '-i', videopreview.videofile, '-c:v' , 'libx264', '-preset', 'ultrafast', '-tune', 'animation', '-vf', 'scale=-2:240', '-crf', '35', '-c:a', 'aac', '-b:a', '96k', '-threads', '1', '-t', '15', videopreview.previewfile], {encoding: 'utf8'});
		let output = '';
		
		proc.stderr.on('data',(data) => {
			output += data.toString();
		});
		proc.on('close', (code) => {
			if (code !== 0) {
				logger.error('Video ' + videopreview.videofile + ' not generated : ' + code);
				logger.error(output);
				resolve();
			} else {
				resolve();
			}
		});		
	});

}

export function getVideoGain(videofile, config) {

	const conf = config || getConfig();
	return new Promise((resolve) => {
		const proc = spawn(conf.BinffmpegPath, ['-i', videofile, '-vn', '-af', 'replaygain', '-f','null', '-'], { encoding : 'utf8' });

		let output = '';

		proc.stderr.on('data',(data) => {
			output += data.toString();
		});
		const res = {};
		proc.on('close', (code) => {
			if (code !== 0) {
				logger.warn('Video ' + videofile + ' gain calculation error : ' + code);
				res.videogain = 0;
				res.error = true;
				resolve(res);
			} else {
				const outputArray = output.split(' ');
				const index = outputArray.indexOf('track_gain');
				if (index > -1) {
					let audioGain = parseFloat(outputArray[index + 2]);
					if (typeof audioGain === 'number') {
						res.data = audioGain.toString();
						resolve(res);
					} else {
						res.data = 0;
						res.error = true;
						resolve(res);
					}
				} else {
					res.data = 0;
					res.error = true;						
					resolve(res);
				}
			}
		});
	});
}

export function getVideoDuration(videofile, config) {

	const conf = config || getConfig();
	const res = {};
	return new Promise((resolve) => {
		probe(conf.BinffprobePath, videofile, function(err, videodata) {
			if (err) {
				logger.warn('Video ' + videofile + ' probe error : ' + err);
				res.error = true;
				res.data = 0;
				resolve(res);
			} else {
				res.data = Math.floor(videodata.format.duration);
				resolve(res);				
			}
		});
	});
}