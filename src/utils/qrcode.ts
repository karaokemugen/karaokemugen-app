import { resolve } from 'path';
import { toFile } from 'qrcode';

import { resolvedPath } from '../lib/utils/config.js';

export async function createQRCodeFile(text: string) {
	return new Promise((success, _reject) => {
		toFile(
			resolve(resolvedPath('Temp'), 'qrcode.png'),
			text,
			{
				scale: 8,
			},
			() => {
				success(true);
			}
		);
	});
}
