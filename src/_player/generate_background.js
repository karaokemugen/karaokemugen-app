const qrcode = require('qrcode');
const ip = require('ip');
const jimp = require("jimp");
const fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	frontend_port:null,
	build:function(){
		logger.debug('[Background] Entered background builder');
		return new Promise(function(resolve,reject){
			var qrcodeImageFile = path.join(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'qrcode.png')
			var backgroundImageFile = path.join(module.exports.SYSPATH,module.exports.SETTINGS.PathTemp,'background.jpg')
			if (fs.existsSync(qrcodeImageFile)) fs.unlinkSync(qrcodeImageFile);
			if (fs.existsSync(backgroundImageFile)) fs.unlinkSync(backgroundImageFile);

			var url = 'http://'+ip.address()+':'+module.exports.frontend_port;			
			
			qrcode.toFile(qrcodeImageFile, url, {version: 2}, function (err) {
				if (err) {				
					logger.error('[Background] Error generating QR Code : '+err);
					reject(err);
				}	
			});

			var origBackgroundFile = 'src/_player/assets/background.jpg';			
			var imageCaption = 'Karaoke Mugen - '+__('GO_TO')+' '+url+' !';
			var imageSign = module.exports.SETTINGS.VersionNo+' - '+module.exports.SETTINGS.VersionName;
			var loadedImage;

			var p1 = jimp.read(origBackgroundFile);
			var p2 = jimp.read(qrcodeImageFile);


			Promise.all([p1,p2])
			.then(images => {
								
				images[1].resize(255,255);
				images[0].composite(images[1], 20, 900)
				var pf1 = jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(function(font){
							images[0].print(font, 20, 1270, imageSign)
							resolve();
				})				
				var pf2 = jimp.loadFont(jimp.FONT_SANS_64_WHITE).then(function(font){
							images[0].print(font, 20, 1160, imageCaption)
							resolve();
				})
				Promise.all([pf1,pf2])
				.then(function(){
					images[0].write(backgroundImageFile)				
					resolve();
				})
				.catch(function(err){
					logger.error('[Player] Text writing error on image : '+err);
				});
			})
			.catch(function(err){
				logger.error('[Player] Error reading images : '+err);
			})
		});
	}
}

	
	