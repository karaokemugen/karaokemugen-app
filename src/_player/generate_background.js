const qrcode = require('qrcode');
const ip = require('ip');
const jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');
const sizeOf = require('image-size');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	frontend_port:null,
	build:function(){
		logger.debug('[Background] Entered background builder');
		return new Promise(function(resolve,reject){
			var PathTemp = 'app/temp';
			var qrcodeImageFile = path.resolve(module.exports.SYSPATH,PathTemp,'qrcode.png');
			var backgroundImageFile = path.resolve(module.exports.SYSPATH,PathTemp,'background.jpg');
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
			var origBackgroundFile = path.join(__dirname,'assets/background.jpg');
			if (module.exports.SETTINGS.PlayerBackground !== '' && 
				module.exports.SETTINGS.PlayerBackground !== undefined &&
				module.exports.SETTINGS.PlayerBackground !== null
			) {
				origBackgroundFile = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathBackgrounds,module.exports.SETTINGS.PlayerBackground);			
				if (!fs.existsSync(origBackgroundFile)) {
				// Background provided in config file doesn't exist, reverting to default one provided.
					logger.warn('[Background] Unable to find background file '+origBackgroundFile+', reverting to default one');
					origBackgroundFile = path.join(__dirname,'assets/background.jpg');
				} 
				
			}
			

			// Get dimensions of background image
			var dimensions = sizeOf(origBackgroundFile);

			var p1 = jimp.read(origBackgroundFile);
			var p2 = jimp.read(qrcodeImageFile);


			Promise.all([p1,p2])
				.then(images => {
					var QRCodeWidth = Math.floor(dimensions.width*0.10);
					var QRCodeHeight = QRCodeWidth;
					
					images[1].resize(QRCodeWidth,QRCodeHeight);
					images[0].composite(images[1], Math.floor(dimensions.width*0.015), Math.floor(dimensions.height*0.70));
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


