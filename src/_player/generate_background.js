const qrcode = require('qrcode');
const ip = require('ip');
const jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	build:function(){
		logger.debug('[Background] Entered background builder');
		return new Promise(function(resolve,reject){
			var qrcodeImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'qrcode.png');
			var backgroundImageFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'background.jpg');
			if (fs.existsSync(qrcodeImageFile)) fs.unlinkSync(qrcodeImageFile);
			if (fs.existsSync(backgroundImageFile)) fs.unlinkSync(backgroundImageFile);

			var url = 'http://'+ip.address()+':'+module.exports.frontend_port;
			logger.debug('[Background] URL detected : '+url);

			qrcode.toFile(qrcodeImageFile, url, {}, function (err) {
				if (err) {
					logger.error('[Background] Error generating QR Code : '+err);
					reject(err);
				}
			});

			var origBackgroundFile = path.resolve(module.exports.SYSPATH,'src/_player/assets/background.jpg');

			var p1 = jimp.read(origBackgroundFile);
			var p2 = jimp.read(qrcodeImageFile);


			Promise.all([p1,p2])
				.then(images => {

					images[1].resize(255,255);
					images[0].composite(images[1], 20, 900);
					fs.unlink(qrcodeImageFile,function(err){
						if (err) {
							logger.warn('[Player] Could not delete QR code image');
						} else {
							logger.debug('[Player] Deleted QR code image');
						}
					});
					images[0].write(backgroundImageFile);

					resolve();
				})
				.catch(function(err){
					logger.error('[Player] Error reading images : '+err);
					reject(err);
				});
		});
	}
};


