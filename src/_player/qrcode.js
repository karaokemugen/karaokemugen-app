const qrcode = require('qrcode');
const path = require('path');
const logger = require('../_common/utils/logger.js');

module.exports = {
	SYSPATH:null,
	build:function(url){
		logger.debug('[Background] Entered background builder');
		return new Promise(function(resolve,reject){
			var PathTemp = 'app/temp';
			var qrcodeImageFile = path.resolve(module.exports.SYSPATH,PathTemp,'qrcode.png');
			
			
			logger.debug('[Background] URL detected : '+url);

			qrcode.toFile(qrcodeImageFile, url, {}, function (err) {
				if (err) {
					logger.error('[Background] Error generating QR Code : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
};


