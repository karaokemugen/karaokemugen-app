import {spawn} from 'child_process';
import {asyncRequired} from './files';
import {getConfig} from './config';

export async function extractSubtitles(videofile, extractfile, config) {

	const conf = config ? config : getConfig();

	await spawn(conf.BinffmpegPath, ['-y', '-i', videofile, extractfile], {encoding: 'utf8'});

	// Verify if the subfile exists. If it doesn't, it means ffmpeg didn't extract anything
	await asyncRequired(extractfile);
}