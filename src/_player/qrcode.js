const qrcode = require('qrcode');
const path = require('path');
const logger = require('winston');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	build:function(url){
		logger.debug('[Background] Entered background builder');
		return new Promise(function(resolve,reject){			
			var qrcodeImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'qrcode.png');
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


