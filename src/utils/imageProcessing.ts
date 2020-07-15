import configure from '@jimp/custom';
import jpeg from '@jimp/jpeg';
import circle from '@jimp/plugin-circle';
import png from '@jimp/png';

import { convertAvatar } from '../lib/utils/ffmpeg';
import { replaceExt, asyncUnlink } from '../lib/utils/files';
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
		// Delete the converted file
		await asyncUnlink(convertedFile);
	} catch(err) {
		sentry.error(err);
		throw err;
	}
}
