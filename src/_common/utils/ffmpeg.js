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

export async function createPreview(videofile, previewfile, config) {

	const conf = config || getConfig();

	spawnSync(conf.BinffmpegPath, ['-y', '-ss', '0', '-i', videofile, '-c:v' , 'libx264', '-preset', 'ultrafast', '-tune', 'animation', '-vf', 'scale=-1:240', '-crf', '35', '-c:a', 'aac', '-b:a', '96k', '-t', '15', previewfile], {encoding: 'utf8'});

	// Verify if the video exists. If it doesn't it means ffmpeg didn't encode anything.
	await asyncRequired(previewfile);
}

export function getVideoGain(videofile, config) {

	const conf = config || getConfig();

	return new Promise((resolve) => {
		const proc = spawn(conf.BinffmpegPath, ['-i', videofile, '-vn', '-af', 'replaygain', '-f','null', '-'], { encoding : 'utf8' });

		let output = '';

		proc.stderr.on('data',(data) => {
			output += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				logger.error('Video ' + videofile + ' gain calculation error : ' + code);
				resolve(0);
			} else {
				const outputArray = output.split(' ');
				const index = outputArray.indexOf('track_gain');
				if (index > -1) {
					let audioGain = parseFloat(outputArray[index + 2]);
					if (typeof audioGain === 'number') {
						resolve(audioGain.toString());
					} else {
						resolve(0);
					}
				} else {
					resolve(0);
				}
			}
		});
	});
}

export function getVideoDuration(videofile, config) {

	const conf = config || getConfig();

	return new Promise((resolve) => {
		probe(conf.BinffprobePath, videofile, function(err, videodata) {
			if (err) {
				logger.error('Video ' + videofile + ' probe error : ' + err);
				resolve(0);
			} else {
				resolve(Math.floor(videodata.format.duration));
			}
		});
	});
}