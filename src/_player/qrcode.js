import {toFile} from 'qrcode';
import {getConfig} from '../_common/utils/config.js';
import {resolve} from 'path';
const logger = require('winston');

export async function build(url) {
	const conf = getConfig();
	logger.debug('[Background] Entered background builder');	
	let qrcodeImageFile = resolve(conf.appPath,conf.PathTemp,'qrcode.png');
	logger.debug('[Background] URL detected : '+url);
	toFile(qrcodeImageFile, url, {}, (err) => {
		if (err) {
			logger.error('[Background] Error generating QR Code : '+err);
			throw err;
		} else {
			return true;
		}
	});
}



