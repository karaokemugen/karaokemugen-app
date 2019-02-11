import {toFile} from 'qrcode';
import {getConfig} from '../_utils/config.js';
import {resolve} from 'path';
import logger from 'winston';

export async function buildQRCode(url) {
	const conf = getConfig();
	const qrcodeImageFile = resolve(conf.appPath,conf.PathTemp,'qrcode.png');
	logger.debug(`[QRCode] URL detected : ${url}`);
	toFile(qrcodeImageFile, url, {}, (err) => {
		if (err) {
			throw `Error generating QR Code : ${err}`;
		} else {
			return true;
		}
	});
}



