import configure from '@jimp/custom';
import circle from '@jimp/plugin-circle';
import jimp from 'jimp';

import { replaceExt } from '../lib/utils/files';
import sentry from '../utils/sentry';

const j = configure({
	plugins: [circle ]
}, jimp);

export async function createCircleAvatar(file: string) {
	try {
		const image = await j.read(file);
		await image.circle().resize(256, 256).quality(20).writeAsync(replaceExt(file, '.circle.png'), );
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
}