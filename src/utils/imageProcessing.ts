import jimp from 'jimp';
import circle from '@jimp/plugin-circle';
import configure from '@jimp/custom';
import { replaceExt } from '../lib/utils/files';

const j = configure({
	plugins: [circle ]
}, jimp);

export async function createCircleAvatar(file: string) {
	try {
		const image = await j.read(file);
		await image.circle().resize(256, 256).quality(20).writeAsync(replaceExt(file, '.circle.png'), );
	} catch(err) {
		throw err;
	}
}