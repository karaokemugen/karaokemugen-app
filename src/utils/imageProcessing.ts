import configure from '@jimp/custom';
import png from '@jimp/png';
import jpeg from '@jimp/jpeg';
import circle from '@jimp/plugin-circle';
import { convertAvatar } from '../lib/utils/ffmpeg';

import { replaceExt } from '../lib/utils/files';
import sentry from '../utils/sentry';

const j = configure({
	plugins: [circle],
	types: [png, jpeg]
});

export async function createCircleAvatar(file: string) {
	try {
		const convertedFile = await convertAvatar(file);
		// Load the png converted file
		const image = await j.read(convertedFile);
		await image.circle().writeAsync(replaceExt(file, '.circle.png'));
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
}
